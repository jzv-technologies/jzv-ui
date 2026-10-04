// src/hooks/useViewConfig.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { TILE_METADATA_REGISTRY } from '../utils/tileRegistry';
import { CARD_THEMES } from '../utils/cardTheme';
import { sortRolesByPriority } from '../utils/roleUtils';
import {
  fetchUserDynamicFormConfigs,
  invalidateDynamicFormConfigsCache,
} from '../utils/dynamicFormConfigs';

const VIEW_CONFIG_SESSION_KEY = 'jzv_view_config_cache_v16';

const readSessionCache = (userRoles) => {
  try {
    // Clear legacy caches
    for (let i = 1; i <= 15; i++) {
      sessionStorage.removeItem(`jzv_view_config_cache_v${i}`);
    }
    const rawCache = sessionStorage.getItem(VIEW_CONFIG_SESSION_KEY);
    if (!rawCache) return null;
    const cachedData = JSON.parse(rawCache);
    // Cache is keyed by user roles - invalidate if roles changed
    if (
      cachedData.userRoles &&
      JSON.stringify(cachedData.userRoles.sort()) !== JSON.stringify((userRoles || []).sort())
    ) {
      sessionStorage.removeItem(VIEW_CONFIG_SESSION_KEY);
      return null;
    }
    if (!Array.isArray(cachedData.viewConfigs) || !Array.isArray(cachedData.dynamicConfigs)) {
      return null;
    }
    // Auto-invalidate only for admin/management if core components are missing
    const userRoleList = (userRoles || []).map((r) => String(r).toLowerCase().trim());
    const isAdminOrManagement =
      userRoleList.includes('admin') || userRoleList.includes('management');
    if (isAdminOrManagement) {
      const names = new Set(cachedData.viewConfigs.map((c) => c.component_name));
      if (
        !names.has('exam-schedule') ||
        !names.has('exam-results') ||
        !names.has('exam-sched-tab-setup') ||
        !names.has('exam-sched-slot-edit') ||
        (!names.has('exam-mark-entry-tab') && !names.has('exam-results-tab-entry')) ||
        !names.has('exam-results-tab-report') ||
        !names.has('student-tab-records') ||
        !names.has('emp-tab-records')
      ) {
        sessionStorage.removeItem(VIEW_CONFIG_SESSION_KEY);
        return null;
      }
    }
    return cachedData;
  } catch (error) {
    return null;
  }
};

// Module-level cache prevents duplicate queries across hook instances.
// Cache is now keyed by user roles.
const viewConfigCache = new Map(); // key: JSON.stringify(sorted userRoles) -> { viewConfigs, dynamicConfigs }
let viewConfigFetchPromise = null;

const writeSessionCache = (viewConfigs, dynamicConfigs, userRoles) => {
  try {
    sessionStorage.setItem(
      VIEW_CONFIG_SESSION_KEY,
      JSON.stringify({ viewConfigs, dynamicConfigs, userRoles })
    );
  } catch (error) {
    console.warn('[useViewConfig] Failed to cache view configuration for this session:', error);
  }
};

/**
 * Manually invalidate module cache to trigger fresh fetch from Supabase.
 */
export const invalidateViewConfigCache = () => {
  viewConfigCache.clear();
  viewConfigFetchPromise = null;
  try {
    sessionStorage.removeItem(VIEW_CONFIG_SESSION_KEY);
    invalidateDynamicFormConfigsCache();
  } catch (error) {}
};

/**
 * Custom hook to load and manage view controller configuration.
 *
 * Drives UI visibility, permissions, and tile ordering from the `app_view_controller`
 * database table, while merging UI metadata from code and custom forms from `dynamic_form_configs`.
 *
 * Now uses RPC functions for secure, role-filtered data access:
 * - get_user_view_config: Returns app_view_controller entries filtered by user roles
 * - get_user_dynamic_form_configs: Returns dynamic_form_configs filtered by user roles
 *
 * @param {string[]} userRoles - Array of user roles for role-based filtering
 */
export const useViewConfig = (userRoles = []) => {
  const [viewConfigs, setViewConfigs] = useState([]);
  const [dynamicConfigs, setDynamicConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create cache key from user roles
  const cacheKey = useMemo(() => JSON.stringify((userRoles || []).sort()), [userRoles]);

  const fetchConfigs = useCallback(
    async (forceRefresh = false) => {
      // Check module-level cache first
      const isCacheValid = !forceRefresh && viewConfigCache.has(cacheKey);

      if (isCacheValid) {
        const cached = viewConfigCache.get(cacheKey);
        setViewConfigs(cached.viewConfigs);
        setDynamicConfigs(cached.dynamicConfigs || []);
        setLoading(false);
        return;
      }

      // Check session storage cache
      const sessionCache = readSessionCache(userRoles);
      if (!forceRefresh && sessionCache) {
        viewConfigCache.set(cacheKey, {
          viewConfigs: sessionCache.viewConfigs,
          dynamicConfigs: sessionCache.dynamicConfigs,
        });
        setViewConfigs(sessionCache.viewConfigs);
        setDynamicConfigs(sessionCache.dynamicConfigs || []);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (!viewConfigFetchPromise) {
          viewConfigFetchPromise = (async () => {
            // Use RPC function for secure, role-filtered access to app_view_controller
            // This does NOT expose valid_access_roles in the response
            let avcData = [];
            const { data: rpcAvcData, error: avcError } = await supabase.rpc(
              'get_user_view_config',
              {
                p_user_roles: userRoles || [],
              }
            );

            if (!avcError && rpcAvcData) {
              avcData = rpcAvcData;
            } else {
              console.warn(
                '[useViewConfig] RPC get_user_view_config failed or not present, falling back to table query:',
                avcError?.message
              );
              const { data: directData, error: directError } = await supabase
                .from('app_view_controller')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true })
                .order('type', { ascending: true });

              if (directError) throw directError;
              avcData = (directData || []).filter((item) =>
                hasAccess(item.valid_access_roles || [], item.default_access || 'none', userRoles)
              );
            }

            // Use session-cached dynamic_form_configs (fetched once per browser session per role)
            let formsData = [];
            try {
              formsData = await fetchUserDynamicFormConfigs(userRoles || []);
            } catch (dfErr) {
              console.warn('[useViewConfig] Failed to fetch dynamic_form_configs:', dfErr);
            }

            return { viewConfigs: avcData || [], dynamicConfigs: formsData || [] };
          })();
        }

        const resolvedData = await viewConfigFetchPromise;

        // Update module-level cache
        viewConfigCache.set(cacheKey, {
          viewConfigs: resolvedData.viewConfigs,
          dynamicConfigs: resolvedData.dynamicConfigs,
        });

        // Update session storage cache
        writeSessionCache(resolvedData.viewConfigs, resolvedData.dynamicConfigs, userRoles);

        setViewConfigs(resolvedData.viewConfigs);
        setDynamicConfigs(resolvedData.dynamicConfigs);
      } catch (err) {
        console.error('[useViewConfig] Unexpected fetch error:', err);
        setError(err);
        setViewConfigs([]);
      } finally {
        viewConfigFetchPromise = null;
        setLoading(false);
      }
    },
    [cacheKey, userRoles]
  );

  // Refetch when userRoles change
  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  /**
   * Evaluates if given validRoles grant access to user's roles in priority hierarchy order:
   * admin -> management -> teacher -> staff -> custom -> parent -> candidate -> guest.
   * If top role is not eligible, falls through to check the next role and so on.
   *
   * Note: With the new RPC functions, server-side filtering is done, but this function
   * is still needed for fallback registry tiles and for checking specific component access.
   */
  const hasAccess = useCallback((validRoles = [], defaultAccess = 'none', userRoles = []) => {
    if (defaultAccess === 'all') return true;
    if (!userRoles || userRoles.length === 0) return false;
    const prioritizedRoles = sortRolesByPriority(userRoles);
    const validLower = (validRoles || []).map((r) => String(r).toLowerCase().trim());
    for (const role of prioritizedRoles) {
      if (validLower.includes(role)) {
        return true;
      }
    }
    return false;
  }, []);

  /**
   * Returns list of visible tiles for the given user roles, merged with UI metadata and dynamic forms.
   *
   * Since the RPC functions now filter by user roles server-side, the viewConfigs and dynamicConfigs
   * are already filtered. We just need to merge with UI metadata from TILE_METADATA_REGISTRY.
   */
  const getVisibleTiles = useCallback(
    (userRoles = []) => {
      if (!userRoles || userRoles.length === 0) return [];

      // viewConfigs from RPC are already filtered by user roles
      // Filter for tile types only
      const activeTiles = viewConfigs.filter((item) => {
        const isTile = item.type === 'tile' || Boolean(TILE_METADATA_REGISTRY[item.component_name]);
        return isTile;
      });

      // Include fallback tiles from TILE_METADATA_REGISTRY if not yet registered in app_view_controller
      const dbTileNames = new Set(
        viewConfigs
          .filter((c) => c.type === 'tile' || Boolean(TILE_METADATA_REGISTRY[c.component_name]))
          .map((c) => c.component_name)
      );
      const fallbackRegistryTiles = Object.entries(TILE_METADATA_REGISTRY)
        .filter(([key, meta]) => {
          if (dbTileNames.has(key)) return false;
          if (!meta.valid_access_roles) return false;
          return hasAccess(meta.valid_access_roles, 'none', userRoles);
        })
        .map(([key, meta]) => ({
          component_name: key,
          type: 'tile',
          parent_name: meta.group || 'General',
          display_name: meta.title || key,
          valid_access_roles: meta.valid_access_roles,
          display_order: meta.display_order ?? 50,
          is_active: true,
          default_access: 'none',
        }));

      const allActiveTiles = [...activeTiles, ...fallbackRegistryTiles];

      // Merge with UI metadata
      const standardTiles = allActiveTiles.map((item) => {
        const meta = TILE_METADATA_REGISTRY[item.component_name] || {};
        return {
          id: item.component_name,
          component_name: item.component_name,
          type: 'tile',
          parent_name:
            (item.parent_name
              ? String(item.parent_name)
                  .replace(/[\r\n]+/g, ' ')
                  .trim()
              : null) ||
            meta.group ||
            'General',
          title: item.display_name || meta.title || item.component_name,
          titleKey: meta.titleKey || null,
          description: item.description || meta.description || '',
          descriptionKey: meta.descriptionKey || null,
          icon: item.icon || meta.icon || 'fa-cubes',
          buttonColor: item.theme || meta.buttonColor || 'bg-brand-primary text-white',
          shadow: meta.shadow || 'shadow-brand-lbg',
          action: meta.action || 'subview',
          actionTarget: meta.actionTarget || null,
          valid_access_roles: item.valid_access_roles || meta.valid_access_roles || [],
          display_order: item.display_order ?? meta.display_order ?? 50,
          isDynamic: false,
        };
      });

      // dynamicConfigs from RPC are already filtered by user roles
      // Filter and map dynamic forms for userRoles
      const dynamicTiles = (dynamicConfigs || []).map((config) => {
        const themeKey = config.card_theme || 'orange';
        const theme = CARD_THEMES[themeKey] || CARD_THEMES.orange;
        let shadowClass = 'shadow-orange-200';
        if (themeKey.startsWith('pink')) shadowClass = 'shadow-pink-200';
        else if (themeKey.startsWith('blue')) shadowClass = 'shadow-blue-200';
        else if (themeKey.startsWith('teal')) shadowClass = 'shadow-teal-200';
        else if (themeKey === 'green') shadowClass = 'shadow-green-200';
        else if (themeKey === 'red') shadowClass = 'shadow-red-200';
        else if (themeKey === 'dark' || themeKey === 'charcoal') shadowClass = 'shadow-gray-200';

        const meta = TILE_METADATA_REGISTRY[config.form_name] || {};
        const groupName =
          meta.group ||
          (config.form_name === 'complaint' || config.display_name === 'Register Feedback'
            ? 'General'
            : 'dynamic-form');

        return {
          id: config.form_name,
          component_name: config.form_name,
          type: 'tile',
          parent_name: groupName,
          title: config.display_name || config.form_name,
          titleKey: null,
          description:
            config.description || `Fill out the ${config.display_name || config.form_name} form.`,
          descriptionKey: null,
          icon: config.icon || 'fa-clipboard-list',
          buttonColor: theme.color ? `bg-${theme.color} text-white` : 'bg-orange-dark text-white',
          shadow: shadowClass,
          action: 'open_modal',
          actionTarget: config.form_name,
          valid_access_roles: config.form_visibility
            ? config.form_visibility.split(',').map((r) => r.trim().toLowerCase())
            : [],
          display_order: 990,
          isDynamic: true,
        };
      });

      return [...standardTiles, ...dynamicTiles].sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0)
      );
    },
    [viewConfigs, dynamicConfigs, hasAccess]
  );

  /**
   * Check if a specific feature or component is permitted and active.
   *
   * Since the RPC functions filter by user roles, viewConfigs only contains
   * items the user has access to. However, this function is still needed for:
   * 1. Components not in viewConfigs (built-in fallbacks)
   * 2. Checking specific component access when viewConfigs might not have it
   */
  const isFeatureEnabled = useCallback(
    (componentName, userRoles = []) => {
      // If user has no roles or roles are not given, deny access
      if (!userRoles || userRoles.length === 0) return false;

      // 1. Search in viewConfigs loaded from DB (already filtered by RPC)
      let config = viewConfigs.find((c) => c.component_name === componentName);
      // Support alias between exam-mark-entry-tab and legacy exam-results-tab-entry
      if (!config && componentName === 'exam-mark-entry-tab') {
        config = viewConfigs.find((c) => c.component_name === 'exam-results-tab-entry');
      } else if (!config && componentName === 'exam-results-tab-entry') {
        config = viewConfigs.find((c) => c.component_name === 'exam-mark-entry-tab');
      }
      if (config) {
        // Since RPC filters by roles, if it's in viewConfigs, user has access
        // But we still check is_active for safety
        return config.is_active !== false;
      }

      // Builtin fallback for syl-tab-my-activity if not yet inserted in DB
      if (componentName === 'syl-tab-my-activity') {
        return userRoles.some((r) =>
          ['teacher', 'admin', 'management'].includes(String(r).toLowerCase().trim())
        );
      }

      // Builtin fallback for exam results tabs
      if (
        componentName === 'exam-mark-entry-tab' ||
        componentName === 'exam-results-tab-entry' ||
        componentName === 'exam-results-tab-summary' ||
        componentName === 'exam-results-tab-attendance' ||
        componentName === 'exam-results-tab-remarks' ||
        componentName === 'exam-results-tab-report' ||
        componentName === 'exam-results-import' ||
        componentName === 'exam-progress-report' ||
        componentName === 'exam-attendance-upload' ||
        componentName === 'exam-attendance-edit' ||
        componentName === 'exam-remarks-upload' ||
        componentName === 'exam-remarks-edit'
      ) {
        if (!userRoles || userRoles.length === 0) return true;
        return userRoles.some((r) =>
          ['admin', 'management', 'coordinator', 'teacher', 'staff', 'principal'].includes(
            String(r).toLowerCase().trim()
          )
        );
      }

      // Builtin fallback for exam schedule tabs and manager
      if (
        componentName === 'exam-schedule' ||
        componentName === 'exam-sched-tab-scheduler' ||
        componentName === 'exam-sched-tab-teacher' ||
        componentName === 'exam-sched-tab-coverage' ||
        componentName === 'exam-sched-tab-notice-print'
      ) {
        if (!userRoles || userRoles.length === 0) return true;
        return userRoles.some((r) =>
          ['admin', 'management', 'coordinator', 'teacher', 'staff', 'principal'].includes(
            String(r).toLowerCase().trim()
          )
        );
      }

      // Builtin fallback for exam schedule setup and slot editing
      if (
        componentName === 'exam-sched-tab-setup' ||
        componentName === 'exam-sched-slot-edit' ||
        componentName === 'exam-sched-publish' ||
        componentName === 'exam-progress-report-publish'
      ) {
        if (!userRoles || userRoles.length === 0) return true;
        return userRoles.some((r) =>
          ['admin', 'management', 'coordinator'].includes(String(r).toLowerCase().trim())
        );
      }

      // Builtin fallback for parent exam timetable and progress report
      if (
        componentName === 'ward-exam-timetable' ||
        componentName === 'ward-progress-report' ||
        componentName === 'exam-sched-tab-parent'
      ) {
        if (!userRoles || userRoles.length === 0) return true;
        return userRoles.some((r) =>
          ['parent', 'admin', 'management'].includes(String(r).toLowerCase().trim())
        );
      }

      // Builtin fallback for report-card-designer
      if (
        componentName === 'report-card-designer' ||
        componentName === 'exam-report-designer' ||
        componentName === 'report-card-designer-edit'
      ) {
        return userRoles.some((r) =>
          ['admin', 'management', 'coordinator'].includes(String(r).toLowerCase().trim())
        );
      }

      // 2. If unmanaged/not registered in view controller:
      // Fail-closed (deny) for exam components, tabs, setups, admin, and mutation variables
      if (
        componentName.startsWith('exam-') ||
        componentName.includes('tab') ||
        componentName.includes('setup') ||
        componentName.includes('admin') ||
        componentName.includes('edit') ||
        componentName.includes('publish') ||
        componentName.includes('delete') ||
        componentName.includes('action')
      ) {
        return false;
      }
      return true;
    },
    [viewConfigs]
  );

  /**
   * Returns all active components of any type accessible to the user.
   * Since RPC filters by user roles, viewConfigs is already filtered.
   */
  const getVisibleComponents = useCallback(
    (userRoles = []) => {
      // viewConfigs from RPC are already filtered by user roles
      // Just filter for active ones
      return viewConfigs.filter((c) => c.is_active !== false);
    },
    [viewConfigs]
  );

  return {
    viewConfigs,
    dynamicConfigs,
    loading,
    error,
    refreshConfigs: () => fetchConfigs(true),
    getVisibleTiles,
    isFeatureEnabled,
    getVisibleComponents,
  };
};

export default useViewConfig;
