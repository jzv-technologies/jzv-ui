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
export const getAdminConfig = async (key, defaultValue = null) => {
  if (!key) return defaultValue;

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

  return defaultValue;
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
