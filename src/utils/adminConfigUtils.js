// src/utils/adminConfigUtils.js
import { supabase } from './supabase';

/**
 * Fetch a configuration value by key strictly via RPC call (service account).
 * Falls back to localStorage cache if network is unavailable or table is offline.
 *
 * @param {string} key - Configuration key name
 * @param {*} defaultValue - Fallback value if configuration is not found
 * @returns {Promise<*>}
 */
// De-duplicates concurrent/repeat reads of the same key (e.g. the report templates are
// requested by the manager, generator and designer) into a single RPC.
const CONFIG_CACHE_TTL_MS = 60 * 1000;
const configCache = new Map(); // key -> { ts, value } | { promise }

export const getAdminConfig = async (key, defaultValue = null) => {
  if (!key) return defaultValue;

  const hit = configCache.get(key);
  if (hit) {
    if (hit.promise) {
      const v = await hit.promise;
      return v !== undefined ? v : defaultValue;
    }
    if (Date.now() - hit.ts < CONFIG_CACHE_TTL_MS) return hit.value;
  }

  const promise = fetchAdminConfig(key);
  configCache.set(key, { promise });
  const value = await promise;
  if (value !== undefined) {
    configCache.set(key, { ts: Date.now(), value });
    return value;
  }
  configCache.delete(key);
  return defaultValue;
};

// Returns the config value, or undefined when nothing could be resolved.
const fetchAdminConfig = async (key) => {
  // 1. Try RPC call
  try {
    const { data, error } = await supabase.rpc('get_admin_config', { p_key: key });
    if (!error && data !== null && data !== undefined) {
      try {
        localStorage.setItem(`jzv_config_${key}`, JSON.stringify(data));
      } catch (_) {}
      return data;
    }
  } catch (rpcErr) {
    console.warn(`[getAdminConfig] RPC call failed for key "${key}":`, rpcErr?.message);
  }

  // 2. Fallback to localStorage
  try {
    const cached = localStorage.getItem(`jzv_config_${key}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_) {}

  return undefined;
};

/**
 * Save a configuration value by key strictly via RPC call (service account).
 * Also writes to localStorage cache for resilient offline and instant reload.
 *
 * @param {string} key - Configuration key name
 * @param {*} val - JSON-serializable value to save
 * @returns {Promise<boolean>}
 */
export const saveAdminConfig = async (key, val) => {
  if (!key) return false;

  // Invalidate the read cache so the next getAdminConfig sees the new value
  configCache.delete(key);

  // 1. Always cache to localStorage first
  try {
    localStorage.setItem(`jzv_config_${key}`, JSON.stringify(val));
  } catch (_) {}

  // 2. Save via RPC call
  try {
    const { data, error } = await supabase.rpc('save_admin_config', {
      p_key: key,
      p_val: val,
    });
    if (error) {
      console.warn(`[saveAdminConfig] RPC save error for key "${key}":`, error.message);
      return false;
    }
    return Boolean(data);
  } catch (err) {
    console.warn(`[saveAdminConfig] RPC exception for key "${key}":`, err?.message);
    return false;
  }
};
