// src/components/admin-settings/ManagePortalUserRolesView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import MultiSelectRolesDropdown from '../employees/employee-records/MultiSelectRolesDropdown';
import { normalizeRoles } from '../../utils/roleUtils';

const formatPortalRoles = (userOrRoles) => {
  let roles = [];
  if (Array.isArray(userOrRoles)) {
    roles = userOrRoles;
  } else if (userOrRoles && typeof userOrRoles === 'object') {
    roles = userOrRoles.roles || [];
  } else {
    roles = normalizeRoles(userOrRoles);
  }

  if (!roles || roles.length === 0) {
    return <span className="text-gray-400 font-normal italic">None</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span
          key={r}
          className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-purple-50 text-purple-800 border-purple-200 capitalize"
        >
          {r}
        </span>
      ))}
    </div>
  );
};

export const ManagePortalUserRolesView = ({ currentUser, onBack }) => {
  const [authUsers, setAuthUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing row state
  const [editingAuthUser, setEditingAuthUser] = useState(null);
  const [editingRoles, setEditingRoles] = useState([]);
  const [editingEmpId, setEditingEmpId] = useState('');

  // Save role to database
  const saveUserRoleToDb = async (targetUserId, rolesArray, email = null) => {
    let success = false;
    try {
      const { error: rpcErr } = await supabase.rpc('update_user_role_admin', {
        p_user_id: targetUserId,
        p_roles: rolesArray,
        p_email: email,
      });
      if (!rpcErr) {
        success = true;
      } else {
        console.warn('update_user_role_admin RPC failed:', rpcErr.message);
      }
    } catch (e) {
      console.warn('RPC update_user_role_admin threw:', e);
    }

    if (!success) {
      const upsertPayload = {
        user_id: targetUserId,
        roles: rolesArray,
      };
      if (email) upsertPayload.email = email;

      const { error: upsertErr } = await supabase.from('user_roles').upsert(
        upsertPayload,
        { onConflict: 'user_id' }
      );

      if (!upsertErr) {
        success = true;
      } else {
        console.warn('Direct user_roles upsert failed:', upsertErr.message);
      }
    }

    return success;
  };

  // Fetch all users and employees
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch employees
      const { data: eData } = await supabase
        .from('employees')
        .select('id, name, emp_id, email, auth_id, designation, is_active')
        .order('name', { ascending: true });
      const empList = eData || [];
      setEmployees(empList);

      // 2. Fetch Auth Users & Roles
      let usersList = [];
      const { data: viewUsers, error: viewErr } = await supabase
        .from('admin_users_view')
        .select('user_id, email, full_name, roles');

      if (!viewErr && Array.isArray(viewUsers) && viewUsers.length > 0) {
        usersList = viewUsers;
      } else {
        const { data: authData, error: authErr } = await supabase.rpc(
          'get_auth_users_with_roles_secure',
          { p_auth_id: currentUser?.id || null }
        );
        if (!authErr && Array.isArray(authData) && authData.length > 0) {
          usersList = authData;
        }
      }

      usersList = usersList.map((u) => ({
        ...u,
        roles:
          Array.isArray(u.roles) && u.roles.length > 0
            ? u.roles
            : normalizeRoles(u.roles || u.role),
      }));

      setAuthUsers(usersList);
    } catch (err) {
      console.error('Failed to load user roles data:', err);
      showToast('Failed to load user roles: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map employee auth_id to employee info
  const mappedAuthUserMap = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      if (emp.auth_id) {
        map.set(String(emp.auth_id), {
          emp_id: emp.id,
          emp_code: emp.emp_id || `EMP-${emp.id}`,
          emp_name: emp.name,
        });
      }
    });
    return map;
  }, [employees]);

  // Save User Role & Employee Link
  const handleSaveUserRoleDirect = async (targetUserId, newRoles, targetEmpId) => {
    setSaving(true);
    try {
      const finalRoles = Array.isArray(newRoles) ? newRoles : normalizeRoles(newRoles);
      const targetAuth = authUsers.find((u) => String(u.user_id) === String(targetUserId));
      const email = targetAuth?.email || null;

      await saveUserRoleToDb(targetUserId, finalRoles, email);

      const prevEmpLinked = employees.find((e) => String(e.auth_id) === String(targetUserId));
      if (prevEmpLinked && String(prevEmpLinked.id) !== String(targetEmpId)) {
        await supabase.from('employees').update({ auth_id: null }).eq('id', prevEmpLinked.id);
      }

      if (targetEmpId) {
        await supabase
          .from('employees')
          .update({
            auth_id: targetUserId,
            login_allowed: true,
          })
          .eq('id', targetEmpId);
      }

      setAuthUsers((prev) =>
        prev.map((u) =>
          String(u.user_id) === String(targetUserId)
            ? { ...u, roles: finalRoles }
            : u
        )
      );

      setEditingAuthUser(null);
      await fetchData();
      showToast('Portal user role permissions updated successfully!', 'success');
    } catch (err) {
      console.error('Error updating user role:', err);
      showToast('Error updating role: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Auto-link accounts
  const handleAutoLinkAuthAccounts = async () => {
    setSaving(true);
    try {
      let linkedCount = 0;
      for (const emp of employees) {
        if (!emp.auth_id && (emp.email || emp.name)) {
          const matchedAuth = authUsers.find((u) => {
            if (emp.email && u.email && emp.email.toLowerCase() === u.email.toLowerCase()) {
              return true;
            }
            if (
              emp.name &&
              u.full_name &&
              emp.name.toLowerCase().trim() === u.full_name.toLowerCase().trim()
            ) {
              return true;
            }
            return false;
          });

          if (matchedAuth) {
            await supabase
              .from('employees')
              .update({ auth_id: matchedAuth.user_id, login_allowed: true })
              .eq('id', emp.id);
            linkedCount++;
          }
        }
      }

      await fetchData();
      showToast(
        linkedCount > 0
          ? `Auto-linked ${linkedCount} employee account(s) to auth users!`
          : 'No unlinked matching auth users found.',
        linkedCount > 0 ? 'success' : 'info'
      );
    } catch (err) {
      showToast('Auto-link error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'user', direction: 'asc' });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Filter & sort users
  const filteredUsers = useMemo(() => {
    let result = authUsers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (u) =>
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortConfig.key === 'user') {
        valA = (a.full_name || a.email || '').toLowerCase();
        valB = (b.full_name || b.email || '').toLowerCase();
      } else if (sortConfig.key === 'emp') {
        const empA = mappedAuthUserMap.get(String(a.user_id));
        const empB = mappedAuthUserMap.get(String(b.user_id));
        valA = (empA ? empA.name : '').toLowerCase();
        valB = (empB ? empB.name : '').toLowerCase();
      } else if (sortConfig.key === 'roles') {
        valA = (a.roles || []).join(',').toLowerCase();
        valB = (b.roles || []).join(',').toLowerCase();
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [authUsers, searchQuery, sortConfig, mappedAuthUserMap]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300" data-feature="manage-user-roles">
      {/* Page Header */}
      <div className="bg-white border border-light-border rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-700 text-white flex items-center justify-center text-xl shadow-md shadow-purple-200 shrink-0">
            <i className="fas fa-user-shield"></i>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-dark-primary tracking-tight">
              Manage Portal User Roles
            </h1>
            <p className="text-xs text-dark-muted font-medium mt-0.5">
              Assign role permissions for registered authentication accounts and map employee profiles
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-2 border border-light-border bg-white hover:bg-gray-100 text-dark-primary rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Back to Portal</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAutoLinkAuthAccounts}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Automatically link employees to auth users by email or name"
          >
            <i className="fas fa-link"></i>
            <span>{saving ? 'Linking...' : 'Auto-Link Accounts'}</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2 border border-light-border bg-gray-50 hover:bg-gray-100 text-dark-primary rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-light-border rounded-3xl shadow-xs overflow-hidden" data-feature="manage-user-roles-content">
        {/* Search Toolbar */}
        <div className="p-4 border-b border-light-border bg-gray-50/50 flex items-center justify-between gap-4" data-feature-filter="user-roles-search">
          <div className="relative w-full max-w-md">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search by user name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-light-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none text-dark-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-dark-muted shrink-0">
            Total Users: <span className="text-purple-700 font-extrabold">{filteredUsers.length}</span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-16 text-center">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-dark-muted font-bold">Loading registered portal users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-xs font-semibold text-gray-500 space-y-2">
            <i className="fas fa-user-shield text-3xl text-purple-300 block mb-2"></i>
            <p className="font-extrabold text-dark-primary">No registered Auth Users found</p>
            {searchQuery ? (
              <p className="text-gray-400">Try adjusting your search query.</p>
            ) : (
              <p className="text-gray-400">
                Click{' '}
                <button
                  type="button"
                  onClick={handleAutoLinkAuthAccounts}
                  className="text-purple-700 font-extrabold underline hover:text-purple-900 cursor-pointer"
                >
                  Auto-Link Accounts
                </button>{' '}
                to map existing employees.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead className="bg-gray-50/80 border-b border-light-border text-[10px] uppercase tracking-wider text-dark-muted font-bold select-none">
                <tr>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-purple-700 transition-colors"
                    onClick={() => handleSort('user')}
                  >
                    <span className="flex items-center gap-1.5">
                      User
                      <i
                        className={`fas ${
                          sortConfig.key === 'user'
                            ? sortConfig.direction === 'asc'
                              ? 'fa-sort-up text-purple-600'
                              : 'fa-sort-down text-purple-600'
                            : 'fa-sort text-gray-300'
                        } text-[10px]`}
                      />
                    </span>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-purple-700 transition-colors"
                    onClick={() => handleSort('emp')}
                  >
                    <span className="flex items-center gap-1.5">
                      Employee Link
                      <i
                        className={`fas ${
                          sortConfig.key === 'emp'
                            ? sortConfig.direction === 'asc'
                              ? 'fa-sort-up text-purple-600'
                              : 'fa-sort-down text-purple-600'
                            : 'fa-sort text-gray-300'
                        } text-[10px]`}
                      />
                    </span>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-purple-700 transition-colors"
                    onClick={() => handleSort('roles')}
                  >
                    <span className="flex items-center gap-1.5">
                      Current Portal Roles
                      <i
                        className={`fas ${
                          sortConfig.key === 'roles'
                            ? sortConfig.direction === 'asc'
                              ? 'fa-sort-up text-purple-600'
                              : 'fa-sort-down text-purple-600'
                            : 'fa-sort text-gray-300'
                        } text-[10px]`}
                      />
                    </span>
                  </th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border/60">
                {filteredUsers.map((u) => {
                  const mappedEmp = mappedAuthUserMap.get(String(u.user_id));
                  const isEditingThis = editingAuthUser === u.user_id;

                  return (
                    <tr
                      key={u.user_id}
                      className={`hover:bg-purple-50/25 transition-colors ${
                        isEditingThis ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      {/* User details */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-dark-primary text-xs flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs shrink-0">
                            <i className="fas fa-user-circle"></i>
                          </div>
                          <div>
                            <p className="leading-tight">{u.full_name || 'Portal User'}</p>
                            <p className="text-[11px] text-purple-700 font-semibold font-mono mt-0.5">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Employee link */}
                      <td className="py-3.5 px-4">
                        {isEditingThis ? (
                          <select
                            value={editingEmpId}
                            onChange={(e) => setEditingEmpId(e.target.value)}
                            className="w-full max-w-xs px-2.5 py-1.5 border rounded-xl text-xs bg-white font-bold outline-none border-purple-300 focus:ring-2 focus:ring-purple-200"
                          >
                            <option value="">-- External User (No Link) --</option>
                            {employees.map((emp) => {
                              const isOtherLinked =
                                emp.auth_id && String(emp.auth_id) !== String(u.user_id);
                              return (
                                <option key={emp.id} value={emp.id} disabled={isOtherLinked}>
                                  {emp.name} ({emp.emp_id || `EMP-${emp.id}`})
                                  {isOtherLinked ? ' 🔒 [Mapped]' : ''}
                                </option>
                              );
                            })}
                          </select>
                        ) : mappedEmp ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl text-[11px] font-black border border-emerald-200 shadow-2xs">
                            <i className="fas fa-id-badge text-emerald-600"></i>
                            <span>{mappedEmp.emp_name}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-dark-muted px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-gray-200">
                            <i className="fas fa-user-tag text-gray-500"></i> External User
                          </span>
                        )}
                      </td>

                      {/* Current Portal Roles */}
                      <td className="py-3.5 px-4">
                        {isEditingThis ? (
                          <div className="w-64">
                            <MultiSelectRolesDropdown
                              value={editingRoles}
                              onChange={(nextRoles) => setEditingRoles(nextRoles)}
                            />
                          </div>
                        ) : (
                          <div>{formatPortalRoles(u)}</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isEditingThis ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveUserRoleDirect(
                                  u.user_id,
                                  editingRoles,
                                  editingEmpId
                                )
                              }
                              disabled={saving}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAuthUser(null)}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAuthUser(u.user_id);
                              const initialRoles = Array.isArray(u.roles)
                                ? u.roles
                                : normalizeRoles(u.roles);
                              setEditingRoles(initialRoles);
                              setEditingEmpId(mappedEmp ? String(mappedEmp.emp_id) : '');
                            }}
                            className="px-3 py-1.5 bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                            title="Edit roles and employee mapping"
                          >
                            <i className="fas fa-pen text-[10px]"></i>
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagePortalUserRolesView;
