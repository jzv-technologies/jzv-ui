// src/components/portals/admin/AdminLinksView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';
import ConfirmModal from '../../ConfirmModal';

const ROLES = [
  { id: 1, name: 'Guest' },
  { id: 2, name: 'Parents' },
  { id: 4, name: 'Staff' },
  { id: 8, name: 'Teacher' },
  { id: 16, name: 'Management' },
  { id: 32, name: 'Administrator' },
];

const AdminLinksView = ({ addLinkTrigger = 0, searchQuery = '' }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Inline editing state
  const [editingId, setEditingId] = useState(null); // 'new' or record id
  const [editForm, setEditForm] = useState({
    link_name: '',
    link_description: '',
    link: '',
    roles: 1,
    target: '_blank',
  });

  // Floating roles picker dropdown state
  const [rolesPicker, setRolesPicker] = useState(null); // { x: number, y: number, value: number }
  const pickerRef = useRef(null);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('useful_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (err) {
      console.error('Error loading links:', err);
      showToast('Failed to load links.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  // Listen to Add Link Trigger from parent tab header
  useEffect(() => {
    if (addLinkTrigger > 0) {
      handleOpenAdd();
    }
  }, [addLinkTrigger]);

  // Handle click outside the floating roles picker to close it
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (rolesPicker && pickerRef.current && !pickerRef.current.contains(e.target)) {
        setRolesPicker(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [rolesPicker]);

  const handleOpenAdd = () => {
    if (editingId) {
      showToast('Please save or cancel your current edits first.', 'warning');
      return;
    }
    setEditingId('new');
    setEditForm({
      link_name: '',
      link_description: '',
      link: '',
      roles: 1,
      target: '_blank',
    });
  };

  const handleOpenEdit = (link) => {
    if (editingId) {
      showToast('Please save or cancel your current edits first.', 'warning');
      return;
    }
    setEditingId(link.id);
    setEditForm({
      link_name: link.link_name,
      link_description: link.link_description || '',
      link: link.link,
      roles: link.roles,
      target: link.target || '_blank',
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setRolesPicker(null);
  };

  const handleSave = async (id) => {
    if (!editForm.link_name.trim() || !editForm.link.trim()) {
      showToast('Link Name and Link URL are required.', 'warning');
      return;
    }

    setSavingId(id);
    try {
      const payload = {
        link_name: editForm.link_name.trim(),
        link_description: editForm.link_description.trim() || null,
        link: editForm.link.trim(),
        roles: parseInt(editForm.roles, 10) || 1,
        target: editForm.target,
      };

      if (id === 'new') {
        const { error } = await supabase.from('useful_links').insert(payload);
        if (error) throw error;
        showToast('Useful link created successfully.');
      } else {
        const { error } = await supabase.from('useful_links').update(payload).eq('id', id);
        if (error) throw error;
        showToast('Useful link updated successfully.');
      }

      setEditingId(null);
      setRolesPicker(null);
      fetchLinks();
    } catch (err) {
      console.error('Error saving link:', err);
      showToast('Failed to save useful link.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = (link) => {
    setConfirmConfig({
      title: 'Delete Useful Link',
      message: `Are you sure you want to delete "${link.link_name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          const { error } = await supabase.from('useful_links').delete().eq('id', link.id);

          if (error) throw error;
          showToast('Useful link deleted successfully.');
          fetchLinks();
        } catch (err) {
          console.error('Error deleting link:', err);
          showToast('Failed to delete useful link.', 'error');
        }
      },
    });
  };

  const getRolesNames = (rolesSum) => {
    const selected = ROLES.filter((r) => (rolesSum & r.id) !== 0);
    return selected.length > 0 ? selected.map((r) => r.name).join(', ') : 'None';
  };

  const handleToggleRoleBit = (roleId) => {
    let currentSum = editForm.roles;
    let nextSum;
    if ((currentSum & roleId) !== 0) {
      nextSum = currentSum - roleId;
    } else {
      nextSum = currentSum + roleId;
    }
    setEditForm((prev) => ({ ...prev, roles: nextSum }));
    if (rolesPicker) {
      setRolesPicker((prev) => ({ ...prev, value: nextSum }));
    }
  };

  const openRolesPicker = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRolesPicker({
      x: rect.left,
      y: rect.bottom + window.scrollY,
      value: editForm.roles,
    });
  };

  // Filter links for display query search
  const filteredLinks = links.filter((l) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      l.link_name.toLowerCase().includes(query) ||
      (l.link_description && l.link_description.toLowerCase().includes(query)) ||
      l.link.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col w-full relative">
      {/* Grid Content Table (Borderless card container, matches Google Mappings table styling) */}
      {loading && links.length === 0 ? (
        <div className="p-20 text-center text-dark-muted bg-white border border-light-border rounded-2xl shadow-sm">
          <i className="fas fa-spinner fa-spin text-3xl mb-4 text-blue-600"></i>
          <p>Loading links...</p>
        </div>
      ) : (
        <div className="overflow-x-auto w-full bg-white border border-light-border rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 text-dark-deepblue uppercase text-[11px] font-extrabold tracking-wider border-b border-light-border">
                <th className="p-5 w-[20%]">Link Name</th>
                <th className="p-5 w-[25%]">Description</th>
                <th className="p-5 w-[25%]">Link URL</th>
                <th className="p-5 w-[10%]">Target</th>
                <th className="p-5 w-[10%]">Access Roles</th>
                <th className="p-5 w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border text-sm">
              {/* Inline Adding Row */}
              {editingId === 'new' && (
                <tr className="bg-blue-50/20 border-b border-blue-200">
                  <td className="p-4">
                    <input
                      type="text"
                      required
                      placeholder="Enter link name..."
                      value={editForm.link_name}
                      onChange={(e) => setEditForm({ ...editForm, link_name: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 focus:border-blue-500 rounded-xl outline-none text-xs font-bold text-dark-primary shadow-inner"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="text"
                      placeholder="Enter description..."
                      value={editForm.link_description}
                      onChange={(e) =>
                        setEditForm({ ...editForm, link_description: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-light-border focus:border-blue-500 rounded-xl outline-none text-xs font-semibold text-dark-primary shadow-sm"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="url"
                      required
                      placeholder="https://..."
                      value={editForm.link}
                      onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 focus:border-blue-500 rounded-xl outline-none text-xs font-mono text-dark-primary shadow-inner"
                    />
                  </td>
                  <td className="p-4">
                    <select
                      value={editForm.target}
                      onChange={(e) => setEditForm({ ...editForm, target: e.target.value })}
                      className="w-full px-3 py-2 border border-light-border rounded-xl focus:border-blue-500 bg-white outline-none text-xs font-bold text-dark-primary cursor-pointer shadow-sm"
                    >
                      <option value="_blank">New Tab</option>
                      <option value="_self">Current Tab</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={openRolesPicker}
                      className="w-full flex items-center justify-between px-3 py-2 bg-white border border-light-border rounded-xl focus:border-blue-500 text-xs font-bold text-dark-primary text-left shadow-sm hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      <span className="truncate pr-2">{getRolesNames(editForm.roles)}</span>
                      <i className="fas fa-chevron-down text-[8px] text-dark-muted" />
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => handleSave('new')}
                        disabled={savingId !== null}
                        className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {savingId === 'new' ? (
                          <i className="fas fa-spinner fa-spin" />
                        ) : (
                          <i className="fas fa-check" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-white border border-light-border hover:bg-light-lbg text-dark-muted px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {filteredLinks.length === 0 && editingId !== 'new' ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-dark-muted">
                    <i className="fas fa-link-slash text-3xl mb-3 text-gray-300 block"></i>
                    <p className="font-bold">No records found.</p>
                    <p className="text-xs mt-1">
                      Try refining your search query or add a new link.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => {
                  const isEditing = editingId === link.id;
                  return (
                    <tr
                      key={link.id}
                      className={`transition-colors hover:bg-gray-50/40 ${isEditing ? 'bg-blue-50/20 border-b border-blue-200' : ''}`}
                    >
                      {isEditing ? (
                        <>
                          <td className="p-4">
                            <input
                              type="text"
                              required
                              value={editForm.link_name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, link_name: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-blue-300 focus:border-blue-500 rounded-xl outline-none text-xs font-bold text-dark-primary shadow-inner"
                            />
                          </td>
                          <td className="p-4">
                            <input
                              type="text"
                              value={editForm.link_description}
                              onChange={(e) =>
                                setEditForm({ ...editForm, link_description: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-light-border focus:border-blue-500 rounded-xl outline-none text-xs font-semibold text-dark-primary shadow-sm"
                            />
                          </td>
                          <td className="p-4">
                            <input
                              type="url"
                              required
                              value={editForm.link}
                              onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                              className="w-full px-3 py-2 border border-blue-300 focus:border-blue-500 rounded-xl outline-none text-xs font-mono text-dark-primary shadow-inner"
                            />
                          </td>
                          <td className="p-4">
                            <select
                              value={editForm.target}
                              onChange={(e) => setEditForm({ ...editForm, target: e.target.value })}
                              className="w-full px-3 py-2 border border-light-border rounded-xl focus:border-blue-500 bg-white outline-none text-xs font-bold text-dark-primary cursor-pointer shadow-sm"
                            >
                              <option value="_blank">New Tab</option>
                              <option value="_self">Current Tab</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <button
                              type="button"
                              onClick={openRolesPicker}
                              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-light-border rounded-xl focus:border-blue-500 text-xs font-bold text-dark-primary text-left shadow-sm hover:bg-gray-50 transition-all cursor-pointer"
                            >
                              <span className="truncate pr-2">{getRolesNames(editForm.roles)}</span>
                              <i className="fas fa-chevron-down text-[8px] text-dark-muted" />
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => handleSave(link.id)}
                                disabled={savingId !== null}
                                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {savingId === link.id ? (
                                  <i className="fas fa-spinner fa-spin" />
                                ) : (
                                  <i className="fas fa-check" />
                                )}
                                Save
                              </button>
                              <button
                                onClick={handleCancel}
                                className="bg-white border border-light-border hover:bg-light-lbg text-dark-muted px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-5 font-bold text-dark-deepblue">{link.link_name}</td>
                          <td className="p-5 text-dark-soft text-xs">
                            {link.link_description || '—'}
                          </td>
                          <td
                            className="p-5 text-xs text-blue-600 font-mono truncate max-w-[250px]"
                            title={link.link}
                          >
                            <a
                              href={link.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {link.link}
                            </a>
                          </td>
                          <td className="p-5 text-xs font-bold text-dark-muted">
                            {link.target === '_self' ? 'Current Tab' : 'New Tab'}
                          </td>
                          <td className="p-5 text-xs font-semibold text-dark-primary">
                            {getRolesNames(link.roles)}
                          </td>
                          <td className="p-5 text-right font-medium">
                            <div className="flex justify-end items-center gap-3">
                              <button
                                onClick={() => handleOpenEdit(link)}
                                className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-green-700 transition-all flex items-center gap-1.5 shadow-md shadow-green-100 cursor-pointer"
                                title="Edit link details"
                              >
                                <i className="fas fa-edit"></i> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(link)}
                                className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-red-700 transition-all flex items-center gap-1.5 shadow-md shadow-red-100 cursor-pointer"
                                title="Delete link"
                              >
                                <i className="fas fa-trash-alt"></i> Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Viewport-relative Roles Multi-Select Popover (Avoids Div Overflow Clipping) */}
      {rolesPicker && (
        <div
          ref={pickerRef}
          className="fixed bg-white border border-light-border rounded-xl shadow-2xl z-[99999] p-3 w-56 animate-in fade-in slide-in-from-top-1 duration-100"
          style={{
            top: rolesPicker.y - window.scrollY + 4,
            left: rolesPicker.x,
          }}
        >
          <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider mb-2">
            Select Entitled Roles
          </p>
          <div className="space-y-1">
            {ROLES.map((role) => {
              const isChecked = (editForm.roles & role.id) !== 0;
              return (
                <label
                  key={role.id}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                    isChecked
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-dark-soft hover:bg-light-lbg/50 hover:text-dark-primary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleRoleBit(role.id)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-light-border cursor-pointer"
                  />
                  <span className="truncate flex-1">
                    {role.name} ({role.id})
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirm Deletion Dialog */}
      {confirmConfig && (
        <ConfirmModal
          isOpen={confirmConfig !== null}
          title={confirmConfig.title}
          message={confirmConfig.message}
          type={confirmConfig.type}
          confirmText={confirmConfig.confirmText}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
};

export default AdminLinksView;
