import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { TILE_METADATA_REGISTRY } from '../../utils/tileRegistry';
import { invalidateViewConfigCache } from '../../hooks/useViewConfig';
import ConfirmModal from '../ConfirmModal';
import Translate from '../Translate';

const HeaderMultiSelectFilter = ({
  label,
  options = [],
  selected = [],
  onChange,
  placeholder = 'All',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const count = selected.length;

  const toggleOption = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => onChange(options.map((o) => (typeof o === 'string' ? o : o.id)));
  const clearAll = () => onChange([]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center justify-between gap-1 transition-all cursor-pointer ${
          count > 0
            ? 'bg-purple-50 border-purple-300 text-purple-800'
            : 'bg-white border-light-border text-dark-muted hover:border-gray-400'
        }`}
      >
        <span className="truncate">{count === 0 ? placeholder : `${count} selected`}</span>
        <i
          className={`fas fa-chevron-down text-[8px] text-gray-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        ></i>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-light-border rounded-xl shadow-xl z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-light-border/60 text-[10px] font-bold text-purple-700">
            <span>{label}</span>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="hover:underline cursor-pointer">
                All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={clearAll}
                className="hover:underline text-gray-500 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {options.map((opt) => {
              const id = typeof opt === 'string' ? opt : opt.id;
              const text = typeof opt === 'string' ? opt : opt.label;
              const isChecked = selected.includes(id);
              return (
                <label
                  key={id}
                  className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-purple-50/60 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(id)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="truncate text-dark-primary text-[11px] font-medium">{text}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const DEFAULT_ROLES = [
  {
    id: 'admin',
    label: 'Admin',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    is_system_role: true,
  },
  {
    id: 'management',
    label: 'Management',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    is_system_role: true,
  },
  {
    id: 'teacher',
    label: 'Teacher',
    color: 'bg-green-100 text-green-800 border-green-200',
    is_system_role: true,
  },
  {
    id: 'parent',
    label: 'Parent',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    is_system_role: true,
  },
  {
    id: 'staff',
    label: 'Staff',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    is_system_role: true,
  },
  {
    id: 'candidate',
    label: 'Candidate',
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    is_system_role: true,
  },
  {
    id: 'guest',
    label: 'Guest',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    is_system_role: true,
  },
];

const PRESET_ROLE_COLORS = [
  {
    id: 'purple',
    label: 'Purple',
    bg: 'bg-purple-500',
    pill: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'indigo',
    label: 'Indigo',
    bg: 'bg-indigo-500',
    pill: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    id: 'blue',
    label: 'Blue',
    bg: 'bg-blue-500',
    pill: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    id: 'teal',
    label: 'Teal',
    bg: 'bg-teal-500',
    pill: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  {
    id: 'green',
    label: 'Green',
    bg: 'bg-green-500',
    pill: 'bg-green-100 text-green-800 border-green-200',
  },
  {
    id: 'amber',
    label: 'Amber',
    bg: 'bg-amber-500',
    pill: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'orange',
    label: 'Orange',
    bg: 'bg-orange-500',
    pill: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  {
    id: 'rose',
    label: 'Rose',
    bg: 'bg-rose-500',
    pill: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  {
    id: 'pink',
    label: 'Pink',
    bg: 'bg-pink-500',
    pill: 'bg-pink-100 text-pink-800 border-pink-200',
  },
  {
    id: 'gray',
    label: 'Gray',
    bg: 'bg-gray-500',
    pill: 'bg-gray-100 text-gray-800 border-gray-200',
  },
];

const ROLE_COLOR_MAP = {
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  teal: 'bg-teal-100 text-teal-800 border-teal-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  pink: 'bg-pink-100 text-pink-800 border-pink-200',
  rose: 'bg-rose-100 text-rose-800 border-rose-200',
  cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const getRoleBadgeClasses = (colorName) => {
  if (!colorName) return ROLE_COLOR_MAP.purple;
  if (colorName.includes('bg-')) return colorName;
  return ROLE_COLOR_MAP[colorName.toLowerCase()] || ROLE_COLOR_MAP.purple;
};

const COMPONENT_TYPES = ['tile', 'component', 'subview', 'variable'];

export const ViewControllerManager = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Column-level filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedActive, setSelectedActive] = useState('all'); // 'all' | 'active' | 'inactive'

  // Dynamic Roles state loaded from app_roles
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    role_key: '',
    role_name: '',
    description: '',
    color: 'purple',
  });
  const [roleSaving, setRoleSaving] = useState(false);

  // Role preview simulator
  const [simulatorRole, setSimulatorRole] = useState(null); // null = simulator closed

  // Edit / Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = create new
  const [formData, setFormData] = useState({
    component_name: '',
    type: 'tile',
    display_name: '',
    parent_name: 'admin-only',
    display_order: 10,
    is_active: true,
    default_access: 'none',
    valid_access_roles: ['admin'],
    description: '',
    icon: '',
    theme: '',
  });

  // Delete confirm modal
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Fetch configs from Supabase
  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_view_controller')
        .select('*')
        .order('display_order', { ascending: true })
        .order('type', { ascending: true });

      if (error) throw error;
      setConfigs(data || []);
    } catch (err) {
      console.error('Failed to load app_view_controller:', err);
      showToast('Failed to load view controller records: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dynamic roles from app_roles
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_roles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn(
          'Could not fetch app_roles from Supabase, using default roles:',
          error.message
        );
        return;
      }

      if (data && data.length > 0) {
        const formatted = data.map((r) => ({
          id: r.role_key,
          label: r.role_name || r.role_key,
          description: r.description || '',
          color: getRoleBadgeClasses(r.color),
          colorName: r.color || 'purple',
          is_system_role: !!r.is_system_role,
        }));

        // Preserve any default system role that wasn't returned in DB
        const roleKeysInDb = new Set(data.map((r) => r.role_key));
        const missingDefaults = DEFAULT_ROLES.filter((dr) => !roleKeysInDb.has(dr.id));
        setRoles([...formatted, ...missingDefaults]);
      }
    } catch (err) {
      console.warn('Failed to load app_roles:', err);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
    fetchRoles();
  }, [fetchConfigs, fetchRoles]);

  // Create custom role in app_roles
  const handleCreateRole = async (e) => {
    e.preventDefault();
    const cleanKey = newRoleForm.role_key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    const cleanName = newRoleForm.role_name.trim();

    if (!cleanKey || !cleanName) {
      showToast('Role key and display name are required.', 'error');
      return;
    }

    if (roles.some((r) => r.id === cleanKey)) {
      showToast(`Role "${cleanKey}" already exists!`, 'error');
      return;
    }

    setRoleSaving(true);
    try {
      const payload = {
        role_key: cleanKey,
        role_name: cleanName,
        description: newRoleForm.description?.trim() || null,
        color: newRoleForm.color || 'purple',
        is_system_role: false,
      };

      const { error } = await supabase.from('app_roles').insert([payload]);

      if (error) throw error;

      showToast(`Role "${cleanName}" created successfully!`, 'success');
      setNewRoleForm({
        role_key: '',
        role_name: '',
        description: '',
        color: 'purple',
      });
      await fetchRoles();
    } catch (err) {
      console.error('Failed to create role:', err);
      showToast('Failed to create role: ' + err.message, 'error');
    } finally {
      setRoleSaving(false);
    }
  };

  // Delete custom role
  const handleDeleteRole = (roleItem) => {
    if (roleItem.is_system_role) {
      showToast('System roles cannot be deleted.', 'warning');
      return;
    }
    setConfirmConfig({
      title: 'Delete Custom Role',
      message: `Are you sure you want to delete the role "${roleItem.label}" (${roleItem.id})? It will be removed from app_roles and will no longer appear in the role selector.`,
      type: 'danger',
      confirmText: 'Delete Role',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('app_roles').delete().eq('role_key', roleItem.id);

          if (error) throw error;
          showToast(`Role "${roleItem.label}" deleted.`, 'success');
          setConfirmConfig(null);
          await fetchRoles();
        } catch (err) {
          showToast('Failed to delete role: ' + err.message, 'error');
        }
      },
    });
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedTypes.length > 0 ||
    selectedGroups.length > 0 ||
    selectedRoles.length > 0 ||
    selectedActive !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    setSelectedGroups([]);
    setSelectedRoles([]);
    setSelectedActive('all');
  };

  // Filtered configs for table with column header filters
  const filteredConfigs = useMemo(() => {
    return configs.filter((item) => {
      // 1. Filter by Types (if any selected)
      if (selectedTypes.length > 0 && !selectedTypes.includes(item.type)) {
        return false;
      }

      // 2. Filter by Groups (if any selected)
      if (selectedGroups.length > 0 && !selectedGroups.includes(item.parent_name)) {
        return false;
      }

      // 3. Filter by Roles (if any selected)
      if (selectedRoles.length > 0) {
        const itemRoles = item.valid_access_roles || [];
        const hasRole = selectedRoles.some((r) => itemRoles.includes(r));
        if (!hasRole) return false;
      }

      // 4. Filter by Active status
      if (selectedActive === 'active' && !item.is_active) return false;
      if (selectedActive === 'inactive' && item.is_active) return false;

      // 5. Search component name / description / title
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const meta = TILE_METADATA_REGISTRY[item.component_name] || {};
        const titleMatch = (item.display_name || meta.title)?.toLowerCase().includes(q);
        const nameMatch = item.component_name?.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        if (!titleMatch && !nameMatch && !descMatch) return false;
      }

      return true;
    });
  }, [configs, selectedTypes, selectedGroups, selectedRoles, selectedActive, searchQuery]);

  // Available groups for filter
  const allGroups = useMemo(() => {
    const set = new Set();
    configs.forEach((c) => {
      if (c.parent_name) set.add(c.parent_name);
    });
    return Array.from(set);
  }, [configs]);

  // Instant Toggle is_active
  const handleToggleActive = async (item) => {
    const nextState = !item.is_active;
    // Optimistic update
    setConfigs((prev) => prev.map((c) => (c.id === item.id ? { ...c, is_active: nextState } : c)));

    try {
      const { error } = await supabase
        .from('app_view_controller')
        .update({ is_active: nextState })
        .eq('id', item.id);

      if (error) throw error;
      invalidateViewConfigCache();
      showToast(`"${item.component_name}" is now ${nextState ? 'Active' : 'Hidden'}`, 'success');
    } catch (err) {
      // Revert optimistic update
      setConfigs((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_active: item.is_active } : c))
      );
      showToast('Failed to update status: ' + err.message, 'error');
    }
  };

  // Instant toggle of single role permission from table
  const handleToggleRolePermission = async (item, roleId) => {
    const currentRoles = item.valid_access_roles || [];
    const hasRole = currentRoles.includes(roleId);
    const updatedRoles = hasRole
      ? currentRoles.filter((r) => r !== roleId)
      : [...currentRoles, roleId];

    // Optimistic update
    setConfigs((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, valid_access_roles: updatedRoles } : c))
    );

    try {
      const { error } = await supabase
        .from('app_view_controller')
        .update({ valid_access_roles: updatedRoles })
        .eq('id', item.id);

      if (error) throw error;
      invalidateViewConfigCache();
      showToast(`Updated roles for ${item.component_name}`, 'success');
    } catch (err) {
      setConfigs((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, valid_access_roles: currentRoles } : c))
      );
      showToast('Failed to update roles: ' + err.message, 'error');
    }
  };

  // Reorder up/down
  const handleMoveOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredConfigs.length) return;

    const currentItem = filteredConfigs[index];
    const targetItem = filteredConfigs[targetIndex];

    const currentOrder = currentItem.display_order ?? 0;
    const targetOrder = targetItem.display_order ?? 0;

    const newCurrentOrder = targetOrder;
    const newTargetOrder =
      currentOrder === targetOrder ? currentOrder + (direction === 'up' ? 10 : -10) : currentOrder;

    // Optimistic update
    setConfigs((prev) =>
      prev
        .map((c) => {
          if (c.id === currentItem.id) return { ...c, display_order: newCurrentOrder };
          if (c.id === targetItem.id) return { ...c, display_order: newTargetOrder };
          return c;
        })
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    );

    try {
      await Promise.all([
        supabase
          .from('app_view_controller')
          .update({ display_order: newCurrentOrder })
          .eq('id', currentItem.id),
        supabase
          .from('app_view_controller')
          .update({ display_order: newTargetOrder })
          .eq('id', targetItem.id),
      ]);
      invalidateViewConfigCache();
    } catch (err) {
      showToast('Failed to reorder: ' + err.message, 'error');
      fetchConfigs();
    }
  };

  // Open Create/Edit modal
  const handleOpenEditModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        component_name: item.component_name,
        type: item.type || 'tile',
        display_name: item.display_name || '',
        parent_name: item.parent_name || 'admin-only',
        display_order: item.display_order ?? 10,
        is_active: item.is_active ?? true,
        default_access: item.default_access || 'none',
        valid_access_roles: item.valid_access_roles || [],
        description: item.description || '',
        icon: item.icon || '',
        theme: item.theme || '',
      });
    } else {
      setEditingItem(null);
      const maxOrder = configs.reduce((max, c) => Math.max(max, c.display_order || 0), 0);
      setFormData({
        component_name: '',
        type: 'tile',
        display_name: '',
        parent_name: 'admin-only',
        display_order: maxOrder + 10,
        is_active: true,
        default_access: 'none',
        valid_access_roles: ['admin'],
        description: '',
        icon: '',
        theme: '',
      });
    }
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveForm = async (e) => {
    e.preventDefault();
    const cleanName = formData.component_name.trim().toLowerCase();
    if (!cleanName) {
      showToast('Component name is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        component_name: cleanName,
        type: formData.type,
        display_name: formData.display_name.trim() || null,
        parent_name: formData.parent_name.trim() || 'general',
        display_order: Number(formData.display_order) || 0,
        is_active: Boolean(formData.is_active),
        default_access: formData.default_access,
        valid_access_roles: formData.valid_access_roles,
        description: formData.description.trim() || null,
        icon: formData.icon.trim() || null,
        theme: formData.theme.trim() || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('app_view_controller')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        showToast(`Component "${cleanName}" updated.`, 'success');
      } else {
        const { error } = await supabase.from('app_view_controller').insert(payload);
        if (error) throw error;
        showToast(`Component "${cleanName}" created.`, 'success');
      }

      setIsModalOpen(false);
      invalidateViewConfigCache();
      fetchConfigs();
    } catch (err) {
      showToast('Error saving component: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete component confirmation
  const handleDeleteComponent = (item) => {
    setConfirmConfig({
      title: 'Delete Component',
      message: `Are you sure you want to permanently delete "${item.component_name}" from app_view_controller?`,
      type: 'danger',
      confirmText: 'Delete Component',
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          const { error } = await supabase.from('app_view_controller').delete().eq('id', item.id);
          if (error) throw error;
          showToast(`Deleted "${item.component_name}".`, 'success');
          invalidateViewConfigCache();
          fetchConfigs();
        } catch (err) {
          showToast('Failed to delete: ' + err.message, 'error');
        }
      },
    });
  };

  // Re-index all orders to clean numbers 10, 20, 30...
  const handleReindexOrders = async () => {
    setSaving(true);
    try {
      const updates = configs.map((cfg, i) => {
        const cleanOrder = (i + 1) * 10;
        return supabase
          .from('app_view_controller')
          .update({ display_order: cleanOrder })
          .eq('id', cfg.id);
      });
      await Promise.all(updates);
      invalidateViewConfigCache();
      showToast('Re-indexed all component display orders.', 'success');
      fetchConfigs();
    } catch (err) {
      showToast('Failed to re-index: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Simulator computed preview tiles
  const simulatedTiles = useMemo(() => {
    if (!simulatorRole) return [];
    return configs
      .filter((c) => {
        if (!c.is_active || c.type !== 'tile') return false;
        if (c.default_access === 'all') return true;
        return (c.valid_access_roles || []).includes(simulatorRole);
      })
      .sort(
        (a, b) =>
          (a.display_order ?? 0) - (b.display_order ?? 0) ||
          (a.type || '').localeCompare(b.type || '')
      );
  }, [configs, simulatorRole]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-4 animate-in fade-in duration-300">
      {/* Compact Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-light-border shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <i className="fas fa-sliders-h"></i>
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-dark-primary tracking-tight">
              View Controller & Tile Management
            </h1>
            <p className="text-[11px] text-dark-muted font-medium">
              Showing <span className="font-bold text-purple-700">{filteredConfigs.length}</span> of{' '}
              <span className="font-bold">{configs.length}</span> components
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSimulatorRole(simulatorRole ? null : 'teacher')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              simulatorRole
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
            }`}
          >
            <i className="fas fa-eye text-[11px]"></i>
            <span>{simulatorRole ? 'Exit Simulator' : 'Role Simulator'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRoleModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Manage System & Custom Roles"
          >
            <i className="fas fa-user-shield text-[11px]"></i>
            <span>Manage Roles</span>
          </button>

          <button
            type="button"
            onClick={handleReindexOrders}
            disabled={saving}
            title="Clean up display order numbers to 10, 20, 30..."
            className="px-2.5 py-1.5 rounded-xl border border-light-border bg-white hover:bg-gray-50 text-dark-muted hover:text-dark-deepblue text-xs font-semibold transition-all cursor-pointer"
          >
            <i className="fas fa-sort-numeric-down mr-1 text-[11px]"></i>
            <span>Re-index</span>
          </button>

          <button
            type="button"
            onClick={fetchConfigs}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-xl border border-light-border bg-white hover:bg-gray-50 text-dark-deepblue text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} text-[11px]`}></i>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenEditModal(null)}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fas fa-plus text-[11px]"></i>
            <span>Add Component</span>
          </button>
        </div>
      </div>

      {/* Role Simulator Panel (if open) */}
      {simulatorRole && (
        <div className="bg-gradient-to-br from-purple-900 to-indigo-950 rounded-2xl sm:rounded-3xl p-5 text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-purple-800/60">
            <div>
              <div className="flex items-center gap-2">
                <i className="fas fa-magic text-amber-400"></i>
                <h3 className="text-sm font-bold">Role View Simulator</h3>
              </div>
              <p className="text-[11px] text-purple-200 mt-0.5">
                Simulate visible dashboard tiles for selected roles
              </p>
            </div>

            {/* Role selector chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSimulatorRole(r.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    simulatorRole === r.id
                      ? 'bg-amber-400 text-purple-950 shadow-md font-extrabold'
                      : 'bg-purple-800/70 text-purple-100 hover:bg-purple-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Miniature simulator grid */}
          <div>
            <p className="text-xs font-semibold text-purple-300 mb-2">
              Visible Tiles for{' '}
              <span className="font-extrabold text-amber-300 uppercase tracking-wide">
                [{simulatorRole}]
              </span>{' '}
              ({simulatedTiles.length} tiles):
            </p>
            {simulatedTiles.length === 0 ? (
              <p className="text-xs text-purple-300 py-4 text-center">
                No tiles currently permitted for this role.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {simulatedTiles.map((tile) => {
                  const meta = TILE_METADATA_REGISTRY[tile.component_name] || {};
                  return (
                    <div
                      key={tile.id}
                      className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15 flex items-center gap-2.5 relative overflow-hidden"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center text-xs shrink-0">
                        <i className={`fas ${tile.icon || meta.icon || 'fa-cubes'}`}></i>
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-xs truncate text-white">
                          {tile.display_name || meta.title || tile.component_name}
                        </p>
                        <p className="text-[10px] text-purple-300 font-mono">
                          Order: {tile.display_order}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white border border-light-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-dark-muted font-semibold">Loading view controller data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                {/* Header Labels Row */}
                <tr className="border-b border-light-border bg-gray-50/80 text-dark-muted font-bold">
                  <th className="py-2.5 px-3 w-20 text-center">Order</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Component & Preview</th>
                  <th className="py-2.5 px-3 w-32">Type</th>
                  <th className="py-2.5 px-3 w-40">Group</th>
                  <th className="py-2.5 px-3 min-w-[220px]">
                    <span>Valid Access Roles</span>
                    <span className="ml-1 text-[10px] font-normal text-purple-600">(Toggle)</span>
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center">Active</th>
                  <th className="py-2.5 px-3 text-right w-24">Actions</th>
                </tr>

                {/* Column Filter Row */}
                <tr className="border-b border-light-border bg-purple-50/20 text-xs">
                  {/* Order column filter / Clear All */}
                  <th className="p-2 text-center">
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        title="Clear all filters"
                        className="px-1.5 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-all cursor-pointer"
                      >
                        <i className="fas fa-times mr-0.5"></i> Clear
                      </button>
                    )}
                  </th>

                  {/* Component search */}
                  <th className="p-2">
                    <div className="relative">
                      <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
                      <input
                        type="text"
                        placeholder="Search component..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-6 py-1 bg-white border border-light-border rounded-lg text-xs font-medium focus:ring-1 focus:ring-purple-400 outline-none"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] cursor-pointer"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  </th>

                  {/* Type multi-select */}
                  <th className="p-2">
                    <HeaderMultiSelectFilter
                      label="Filter by Type"
                      options={COMPONENT_TYPES}
                      selected={selectedTypes}
                      onChange={setSelectedTypes}
                      placeholder="All Types"
                    />
                  </th>

                  {/* Group multi-select */}
                  <th className="p-2">
                    <HeaderMultiSelectFilter
                      label="Filter by Group"
                      options={allGroups}
                      selected={selectedGroups}
                      onChange={setSelectedGroups}
                      placeholder="All Groups"
                    />
                  </th>

                  {/* Access Roles multi-select */}
                  <th className="p-2">
                    <HeaderMultiSelectFilter
                      label="Filter by Role"
                      options={roles.map((r) => ({ id: r.id, label: r.label }))}
                      selected={selectedRoles}
                      onChange={setSelectedRoles}
                      placeholder="All Roles"
                    />
                  </th>

                  {/* Active status dropdown */}
                  <th className="p-2">
                    <select
                      value={selectedActive}
                      onChange={(e) => setSelectedActive(e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-light-border bg-white text-[11px] font-bold text-dark-deepblue outline-none cursor-pointer"
                    >
                      <option value="all">All</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </th>

                  {/* Actions column reset */}
                  <th className="p-2 text-right">
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredConfigs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-dark-muted text-xs">
                      <i className="fas fa-search text-2xl mb-2 text-gray-300 block"></i>
                      <p className="font-bold text-dark-deepblue">No matching components found</p>
                      <p className="mt-1 text-gray-400">
                        Try clearing or adjusting your column filters.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-3 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 text-xs font-bold hover:bg-purple-200 transition-all cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredConfigs.map((item, index) => {
                    const meta = TILE_METADATA_REGISTRY[item.component_name] || {};
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-light-border/40 hover:bg-purple-50/30 transition-colors ${
                          !item.is_active ? 'opacity-60 bg-gray-50/50' : ''
                        }`}
                      >
                        {/* Order + Up/Down arrows */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-mono font-bold text-dark-deepblue w-6 text-center">
                              {item.display_order ?? 0}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleMoveOrder(index, 'up')}
                                disabled={index === 0}
                                className="text-gray-400 hover:text-purple-600 disabled:opacity-20 leading-none text-[10px]"
                                title="Move Up"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleMoveOrder(index, 'down')}
                                disabled={index === filteredConfigs.length - 1}
                                className="text-gray-400 hover:text-purple-600 disabled:opacity-20 leading-none text-[10px]"
                                title="Move Down"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Component preview & Title */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-sm shrink-0 ${
                                item.theme || meta.buttonColor || 'bg-purple-600 text-white'
                              }`}
                            >
                              <i className={`fas ${item.icon || meta.icon || 'fa-cubes'}`}></i>
                            </div>
                            <div className="max-w-xs">
                              <p className="font-bold text-dark-deepblue text-xs leading-tight">
                                {item.display_name || meta.title || item.component_name}
                              </p>
                              <p className="font-mono text-[10px] text-purple-700 truncate mt-0.5">
                                {item.component_name}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Component Type */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] uppercase">
                            {item.type}
                          </span>
                        </td>

                        {/* Group */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-dark-muted font-medium text-[11px]">
                            {item.parent_name || 'general'}
                          </span>
                        </td>

                        {/* Access roles with instant in-place toggle */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1">
                            {roles.map((r) => {
                              const isGranted = (item.valid_access_roles || []).includes(r.id);
                              return (
                                <button
                                  key={r.id}
                                  onClick={() => handleToggleRolePermission(item, r.id)}
                                  title={`Click to ${isGranted ? 'revoke' : 'grant'} ${r.label}`}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                                    isGranted
                                      ? r.color + ' shadow-xs'
                                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                                  }`}
                                >
                                  {isGranted ? (
                                    <i className="fas fa-check mr-1 text-[8px]"></i>
                                  ) : (
                                    <i className="fas fa-plus mr-1 text-[8px] opacity-40"></i>
                                  )}
                                  {r.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* Active switch */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              item.is_active ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                            title={
                              item.is_active ? 'Click to hide/deactivate' : 'Click to activate'
                            }
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                item.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center justify-center transition-colors"
                              title="Edit Component Details"
                            >
                              <i className="fas fa-pencil-alt text-xs"></i>
                            </button>
                            <button
                              onClick={() => handleDeleteComponent(item)}
                              className="w-7 h-7 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
                              title="Delete Component"
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-light-border">
              <h3 className="text-lg font-black text-dark-deepblue">
                {editingItem ? 'Edit View Controller Entry' : 'Create View Controller Entry'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-dark-muted flex items-center justify-center text-xs transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-deepblue mb-1">
                  Component Name (Unique Key) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.component_name}
                  onChange={(e) => setFormData({ ...formData, component_name: e.target.value })}
                  placeholder="e.g. syllabus-manager, student-records"
                  disabled={!!editingItem} // Key is immutable once created
                  className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs font-mono focus:outline-none focus:border-purple-500 disabled:bg-gray-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs bg-white focus:outline-none focus:border-purple-500"
                  >
                    {COMPONENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">
                    Parent Name
                  </label>
                  <input
                    type="text"
                    value={formData.parent_name}
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                    placeholder="e.g. timetable, syllabus"
                    className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">
                    Default Access
                  </label>
                  <select
                    value={formData.default_access}
                    onChange={(e) => setFormData({ ...formData, default_access: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs bg-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="none">None (Roles Required)</option>
                    <option value="all">All (Public / All Roles)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-deepblue mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Label shown on the tile"
                  className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="e.g. fa-users"
                    className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">Theme</label>
                  <input
                    type="text"
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    placeholder="e.g. bg-blue-600 text-white"
                    className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                  Permitted Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => {
                    const isSelected = formData.valid_access_roles.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            valid_access_roles: isSelected
                              ? formData.valid_access_roles.filter((role) => role !== r.id)
                              : [...formData.valid_access_roles, r.id],
                          })
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-dark-muted border-light-border hover:border-purple-300'
                        }`}
                      >
                        <i
                          className={`fas ${isSelected ? 'fa-check-circle' : 'fa-circle'} mr-1.5`}
                        ></i>
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-deepblue mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain what this component or feature is used for..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modalIsActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-light-border text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <label htmlFor="modalIsActive" className="text-xs font-bold text-dark-deepblue">
                  Active (visible on dashboard)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-light-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-light-border text-xs font-bold text-dark-muted hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-200 flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <i className="fas fa-spinner fa-spin"></i>}
                  <span>{editingItem ? 'Update Component' : 'Create Component'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-light-border">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-black">
                    <i className="fas fa-user-shield"></i>
                  </div>
                  <h3 className="text-lg font-black text-dark-deepblue">Role Management</h3>
                </div>
                <p className="text-xs text-dark-muted mt-1">
                  Manage existing user roles and configure new custom roles for view controller
                  access control
                </p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-dark-muted flex items-center justify-center text-xs transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Existing Roles Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-dark-muted">
                  Active System & Custom Roles ({roles.length})
                </h4>
                {rolesLoading && (
                  <span className="text-[11px] text-purple-600 font-semibold flex items-center gap-1">
                    <i className="fas fa-spinner fa-spin"></i> Refreshing...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {roles.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-2xl border border-light-border bg-gray-50/70 hover:bg-white hover:shadow-sm transition-all flex items-start justify-between gap-2"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${r.color}`}
                        >
                          {r.label}
                        </span>
                        {r.is_system_role ? (
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-200/70 px-1.5 py-0.5 rounded">
                            <i className="fas fa-lock mr-1 text-[9px]"></i>System
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                            <i className="fas fa-sparkles mr-1 text-[9px]"></i>Custom
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-dark-muted truncate">
                        key: <span className="font-bold text-dark-deepblue">{r.id}</span>
                      </p>
                      {r.description && (
                        <p className="text-[11px] text-dark-muted/80 line-clamp-1">
                          {r.description}
                        </p>
                      )}
                    </div>

                    {!r.is_system_role && (
                      <button
                        onClick={() => handleDeleteRole(r)}
                        className="w-7 h-7 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 flex items-center justify-center shrink-0 transition-colors"
                        title="Delete custom role"
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Create New Role Form */}
            <div className="pt-5 border-t border-light-border">
              <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-plus-circle text-purple-600 text-sm"></i>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-dark-deepblue">
                  Create New Role
                </h4>
              </div>

              <form
                onSubmit={handleCreateRole}
                className="space-y-4 bg-purple-50/40 p-4 rounded-2xl border border-purple-100"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1">
                      Role Key (lowercase, unique) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newRoleForm.role_key}
                      onChange={(e) =>
                        setNewRoleForm({
                          ...newRoleForm,
                          role_key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
                        })
                      }
                      placeholder="e.g. librarian, coordinator"
                      className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs font-mono bg-white focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newRoleForm.role_name}
                      onChange={(e) =>
                        setNewRoleForm({ ...newRoleForm, role_name: e.target.value })
                      }
                      placeholder="e.g. Librarian, Academic Coordinator"
                      className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs bg-white focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newRoleForm.description}
                    onChange={(e) =>
                      setNewRoleForm({ ...newRoleForm, description: e.target.value })
                    }
                    placeholder="Briefly describe the responsibilities or permissions of this role..."
                    className="w-full px-3.5 py-2 rounded-xl border border-light-border text-xs bg-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                    Badge Color Theme
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_ROLE_COLORS.map((c) => {
                      const isSelected = newRoleForm.color === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setNewRoleForm({ ...newRoleForm, color: c.id })}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'ring-2 ring-purple-600 ring-offset-1 border-purple-500 font-bold shadow-xs'
                              : 'border-light-border bg-white hover:bg-gray-50'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${c.bg} shrink-0`}></span>
                          <span>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Preview */}
                {newRoleForm.role_name.trim() && (
                  <div className="pt-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-dark-muted">Preview:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeClasses(
                        newRoleForm.color
                      )}`}
                    >
                      {newRoleForm.role_name}
                    </span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={roleSaving}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-200 flex items-center gap-2 disabled:opacity-50"
                  >
                    {roleSaving && <i className="fas fa-spinner fa-spin"></i>}
                    <i className="fas fa-plus"></i>
                    <span>Create Role</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </div>
  );
};

export default ViewControllerManager;
