// src/utils/roleUtils.js
import { supabase } from './supabase';

export const SYSTEM_ROLES = [
  { id: 'admin', name: 'Administrator', label: 'Admin', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'management', name: 'Management', label: 'Management', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'teacher', name: 'Teacher', label: 'Teacher', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'staff', name: 'Staff', label: 'Staff', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'parent', name: 'Parents', label: 'Parent', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'guest', name: 'Guest', label: 'Guest', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { id: 'candidate', name: 'Candidate', label: 'Candidate', color: 'bg-teal-100 text-teal-800 border-teal-200' },
];

export const ROLE_COLOR_MAP = {
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

export const getRoleBadgeClasses = (colorName) => {
  if (!colorName) return ROLE_COLOR_MAP.purple;
  if (colorName.includes('bg-')) return colorName;
  return ROLE_COLOR_MAP[colorName.toLowerCase()] || ROLE_COLOR_MAP.purple;
};

// Safe role normalizer: returns array of string role keys
export const normalizeRoles = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((r) => String(r).toLowerCase().trim()).filter(Boolean);
  if (typeof val === 'string') {
    if (val.startsWith('[') && val.endsWith(']')) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map((r) => String(r).toLowerCase().trim()).filter(Boolean);
      } catch (e) {}
    }
    return val.split(',').map((r) => r.toLowerCase().trim()).filter(Boolean);
  }
  return [];
};

// Backwards compatibility alias for normalizeRoles
export const getRolesFromBitmask = (val) => normalizeRoles(val);

// Backwards compatibility no-op
export const getBitmaskFromRoles = () => 0;

// In-memory cache for app_roles
let cachedRoles = null;
let rolesPromise = null;

export const fetchAllAppRoles = async (forceRefresh = false) => {
  if (!forceRefresh && cachedRoles) return cachedRoles;
  if (rolesPromise && !forceRefresh) return rolesPromise;

  rolesPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('app_roles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Could not fetch app_roles from Supabase, using defaults:', error.message);
        cachedRoles = SYSTEM_ROLES;
        return SYSTEM_ROLES;
      }

      if (data && data.length > 0) {
        const formatted = data.map((r) => {
          const matchedSystem = SYSTEM_ROLES.find((sr) => sr.id === r.role_key);
          return {
            id: r.role_key,
            name: r.role_name || r.role_key,
            label: r.role_name || r.role_key,
            color: getRoleBadgeClasses(r.color),
            colorName: r.color || 'purple',
            is_system_role: !!r.is_system_role,
            description: r.description || '',
          };
        });

        // Merge any system roles not present in database
        const dbKeys = new Set(data.map((r) => r.role_key));
        const missingDefaults = SYSTEM_ROLES.filter((sr) => !dbKeys.has(sr.id));
        cachedRoles = [...formatted, ...missingDefaults];
      } else {
        cachedRoles = SYSTEM_ROLES;
      }
    } catch (err) {
      console.warn('Failed to load app_roles:', err);
      cachedRoles = SYSTEM_ROLES;
    } finally {
      rolesPromise = null;
    }
    return cachedRoles;
  })();

  return rolesPromise;
};
