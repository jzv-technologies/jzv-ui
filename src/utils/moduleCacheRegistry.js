// src/utils/moduleCacheRegistry.js
/**
 * Registry for module-level data caches that hold timetable-derived data.
 *
 * These caches live outside React, so they survive subview switches and are not reachable
 * by the query cache helpers in utils/supabase.js. Screens that read timetable-derived
 * tables (for example the Lesson Planner's teacher -> class mapping, which is built from
 * class_assignments) register a clear function here, so that a timetable change can force
 * them to re-read instead of serving a snapshot taken before the change.
 */

const registry = new Map();

/**
 * Register a clear function for a cache.
 * @param {string} key - Stable cache identifier, e.g. 'lesson-manager'
 * @param {() => void} clear - Clears the cached data so the next mount re-reads
 * @returns {() => void} Unregister function
 */
export function registerModuleCache(key, clear) {
  registry.set(key, clear);
  return () => registry.delete(key);
}

/**
 * Clear registered module caches.
 * @param {string[]|null} keys - Specific keys to clear, or null for all registered caches
 * @returns {string[]} The keys that were actually cleared
 */
export function invalidateModuleCaches(keys = null) {
  const targets = keys ? keys.filter((key) => registry.has(key)) : [...registry.keys()];

  targets.forEach((key) => {
    try {
      registry.get(key)();
    } catch (err) {
      console.error(`Failed to invalidate module cache "${key}":`, err);
    }
  });

  return targets;
}

export default { registerModuleCache, invalidateModuleCaches };
