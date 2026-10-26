// src/utils/dynamicFormConfigs.js
import { supabase } from './supabase';

const SESSION_CACHE_PREFIX = 'jzv_user_dynamic_forms_v1_';
const memoryCache = new Map();
const inFlightPromises = new Map();

/**
 * Normalizes roles to a consistent cache key
 */
const getRolesKey = (userRoles = []) => {
  if (!userRoles || !Array.isArray(userRoles)) return 'guest';
  return [...userRoles].map((r) => String(r).toLowerCase().trim()).sort().join('_') || 'guest';
};

/**
 * Filter dynamic form configs by user roles (client-side fallback)
 */
export const filterFormsByRoles = (forms = [], userRoles = []) => {
  if (!Array.isArray(forms)) return [];
  const normalizedUserRoles = (userRoles || []).map((r) => String(r).toLowerCase().trim());

  return forms.filter((item) => {
    // A form whose role-based link is disabled must not appear as a portal tile.
    if (item.role_link_enabled === false) return false;
    if (!item.form_visibility || !String(item.form_visibility).trim()) return true;
    const permitted = String(item.form_visibility)
      .split(',')
      .map((r) => r.trim().toLowerCase());
    if (permitted.includes('all')) return true;
    return normalizedUserRoles.some((r) => permitted.includes(r));
  });
};

/**
 * Whether a config may be reached through the given access path.
 * Direct links are governed by `direct_link_enabled`; role-based portal links by
 * `role_link_enabled`. Missing values default to enabled for older records.
 */
const isAccessPathAllowed = (record, isDirectLink) => {
  if (!record) return false;
  if (isDirectLink) return record.direct_link_enabled !== false;
  return record.role_link_enabled !== false;
};

/**
 * Fetch dynamic form configs for user roles with session caching
 * Guarantees at most ONE fetch per browser session per role combination.
 *
 * @param {string[]} userRoles - Current user's roles
 * @param {boolean} forceRefresh - If true, ignores cache and refetches
 * @returns {Promise<Array>} Array of dynamic form configurations
 */
export const fetchUserDynamicFormConfigs = async (userRoles = [], forceRefresh = false) => {
  const rolesKey = getRolesKey(userRoles);
  const sessionKey = `${SESSION_CACHE_PREFIX}${rolesKey}`;

  // 1. Check in-memory cache
  if (!forceRefresh && memoryCache.has(rolesKey)) {
    return memoryCache.get(rolesKey);
  }

  // 2. Check sessionStorage
  if (!forceRefresh) {
    try {
      const raw = sessionStorage.getItem(sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryCache.set(rolesKey, parsed);
          return parsed;
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  // 3. Deduplicate in-flight requests
  if (inFlightPromises.has(rolesKey)) {
    return inFlightPromises.get(rolesKey);
  }

  const fetchPromise = (async () => {
    try {
      // First attempt RPC call
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_user_dynamic_form_configs',
        { p_user_roles: userRoles || [] }
      );

      let resultData = [];

      if (!rpcError && Array.isArray(rpcData)) {
        resultData = rpcData;
      } else {
        // Graceful fallback to direct table query if RPC is not present in schema cache
        const { data: tableData, error: tableError } = await supabase
          .from('dynamic_form_configs')
          .select('*');

        if (tableError) {
          console.warn('[dynamicFormConfigs] Failed to fetch forms from table:', tableError.message);
          return [];
        }

        resultData = filterFormsByRoles(tableData || [], userRoles);
      }

      // Save to memory cache
      memoryCache.set(rolesKey, resultData);

      // Save to sessionStorage
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify(resultData));
      } catch (e) {
        // Storage limit or private mode warning
      }

      return resultData;
    } finally {
      inFlightPromises.delete(rolesKey);
    }
  })();

  inFlightPromises.set(rolesKey, fetchPromise);
  return fetchPromise;
};

/**
 * Fetch a single dynamic form configuration by UUID/form_name
 * First checks existing session cache to eliminate duplicate network calls.
 *
 * @param {string} formName - Form identifier
 * @param {string[]} userRoles - Current user's roles
 * @param {boolean} isDirectLink - If true, bypasses role filtering for public direct link access (baseurl/<form_name>)
 * @returns {Promise<Object|null>} Form config object or null
 */
export const fetchUserDynamicFormConfigByUuid = async (
  formName,
  userRoles = [],
  isDirectLink = false
) => {
  if (!formName) return null;

  const rolesKey = getRolesKey(userRoles);
  const sessionKey = `${SESSION_CACHE_PREFIX}${rolesKey}`;

  // 1. Check memory cache first
  const memoryForms = memoryCache.get(rolesKey);
  if (memoryForms) {
    const match = memoryForms.find((f) => f.form_name === formName);
    if (match && isAccessPathAllowed(match, isDirectLink)) return match;
  }

  // 2. Check session cache
  try {
    const raw = sessionStorage.getItem(sessionKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const match = parsed.find((f) => f.form_name === formName);
        if (match && isAccessPathAllowed(match, isDirectLink)) return match;
      }
    }
  } catch (e) {
    // Ignore storage errors
  }

  // 3. Fallback to RPC get_user_dynamic_form_config_by_uuid (only for role-gated queries)
  if (!isDirectLink) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_user_dynamic_form_config_by_uuid',
        {
          p_form_name: formName,
          p_user_roles: userRoles || [],
        }
      );

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0 && isAccessPathAllowed(rpcData[0], false)) {
        return rpcData[0];
      }
    } catch (err) {
      // RPC failed or not found, fall through to table query
    }
  }

  // 4. Fallback to direct query
  const { data: directData, error: directError } = await supabase
    .from('dynamic_form_configs')
    .select('*')
    .eq('form_name', formName)
    .limit(1);

  if (directError) {
    console.warn('[dynamicFormConfigs] Error fetching form config:', directError.message);
    throw directError;
  }

  if (directData && directData.length > 0) {
    const record = directData[0];
    // A disabled access path behaves exactly like a missing form.
    if (!isAccessPathAllowed(record, isDirectLink)) return null;
    // If accessed directly via shared link (baseurl/<form_name>), permit access to anyone
    if (isDirectLink) {
      return record;
    }
    const filtered = filterFormsByRoles([record], userRoles);
    return filtered.length > 0 ? filtered[0] : null;
  }

  return null;
};

/**
 * Fetch a single dynamic form configuration directly for public access
 * @param {string} formName
 */
export const fetchPublicDynamicFormConfig = async (formName) => {
  return fetchUserDynamicFormConfigByUuid(formName, [], true);
};

/**
 * Invalidate all dynamic form caches (e.g. after admin updates)
 */
export const invalidateDynamicFormConfigsCache = () => {
  memoryCache.clear();
  inFlightPromises.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(SESSION_CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch (e) {
    // Ignore storage errors
  }
  // Per-form config snapshots (success message, search fields, link flags) live in
  // localStorage with a short TTL; drop them so a saved change applies immediately.
  try {
    const localKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('form_config_')) localKeys.push(key);
    }
    localKeys.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    // Ignore storage errors
  }
};
