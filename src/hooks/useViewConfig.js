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

const VIEW_CONFIG_SESSION_KEY = 'jzv_view_config_cache_v24';

export const STATIC_MANAGED_COMPONENTS = new Set([
  'academic-calendar',
  'avc-admin-links',
  'avc-admin-manager',
  'book-planner',
  'book-planner-edit',
  'book-planner-tab-pacing',
  'book-planner-tab-targets',
  'calendar-manage-events',
  'class-schedule',
  'classes-setup',
  'dashboard',
  'dash-calendar-edit',
  'dash-tab-attention-required',
  'dash-tab-calendar-overview',
  'dash-tab-class-dashboard',
  'dash-tab-subject-heatmap',
  'dash-tab-tracker-heatmap',
  'dash-tab-weekly-trend',
  'emp-add-record',
  'emp-bulk-import',
  'emp-delete-record',
  'emp-edit-record',
  'emp-edit-roles',
  'emp-salary-increment',
  'emp-tab-records',
  'emp-tab-roles',
  'emp-tab-salary',
  'employee-management',
  'exam-analysis',
  'exam-analysis-export',
  'exam-analysis-tab-compare',
  'exam-analysis-tab-marks',
  'exam-analysis-tab-std-dev',
  'exam-attendance-edit',
  'exam-attendance-upload',
  'exam-mark-entry-tab',
  'exam-progress-report',
  'exam-progress-report-publish',
  'exam-remarks-edit',
  'exam-remarks-upload',
  'exam-results',
  'exam-results-adhoc',
  'exam-results-edit-marks',
  'exam-results-marking-scheme',
  'exam-results-quick-fill',
  'exam-results-status-override',
  'exam-results-tab-attendance',
  'exam-results-tab-remarks',
  'exam-results-tab-summary',
  'exam-sched-publish',
  'exam-sched-slot-edit',
  'exam-sched-tab-coverage',
  'exam-sched-tab-notice-print',
  'exam-sched-tab-scheduler',
  'exam-sched-tab-setup',
  'exam-sched-tab-teacher',
  'exam-schedule',
  'exam-schedule-viewer',
  'form-configurations',
  'job-applications',
  'lesson-planner',
  'manage-user-roles',
  'my-tickets',
  'personal-info',
  'registered-complaints',
  'report-card-designer',
  'report-card-designer-edit',
  'requests-exceptions',
  'salary-tracker',
  'scheduler-setup',
  'season-setup',
  'student-add-record',
  'student-delete-record',
  'student-edit-record',
  'student-fees',
  'student-fees-edit',
  'student-records',
  'student-tab-fees',
  'student-tab-records',
  'switch-teachers',
  'syl-add-daily-work',
  'syl-carry-forward-action',
  'syl-delete-log-entry',
  'syl-edit-content',
  'syl-manage-books',
  'syl-manage-subjects',
  'syl-tab-lesson-planner',
  'syl-tab-my-activity',
  'syl-tab-parent-recent',
  'syl-tab-syllabus-progress',
  'syl-tab-teacher-activity',
  'syl-tab-teacher-adherence',
  'syl-tab-upcoming-lessons',
  'syl-teacher-filter',
  'syllabus-manager',
  'syllabus-progress-tracker',
  'take-test',
  'take-test-management',
  'teacher-activity',
  'teachers-mapping',
  'timetable-json-config',
  'timetable-planner',
  'timetable-sync',
  'timetable-view',
  'timetable-viewer',
  'tv-display',
  'ward-exam-timetable',
  'ward-progress-report',
]);

const readSessionCache = (userRoles) => {
  try {
    // Clear legacy caches
    for (let i = 1; i <= 23; i++) {
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
const viewConfigCache = new Map(); // key: JSON.stringify(sorted userRoles) -> { viewConfigs, dynamicConfigs, registeredNames }
let viewConfigFetchPromise = null;

const writeSessionCache = (viewConfigs, dynamicConfigs, userRoles, registeredNames) => {
  try {
    sessionStorage.setItem(
      VIEW_CONFIG_SESSION_KEY,
      JSON.stringify({ viewConfigs, dynamicConfigs, userRoles, registeredNames })
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
  const [registeredNames, setRegisteredNames] = useState([]);
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
        setRegisteredNames(cached.registeredNames || []);
        setLoading(false);
        return;
      }

      // Check session storage cache
      const sessionCache = readSessionCache(userRoles);
      if (!forceRefresh && sessionCache) {
        viewConfigCache.set(cacheKey, {
          viewConfigs: sessionCache.viewConfigs,
          dynamicConfigs: sessionCache.dynamicConfigs,
          registeredNames: sessionCache.registeredNames || [],
        });
        setViewConfigs(sessionCache.viewConfigs);
        setDynamicConfigs(sessionCache.dynamicConfigs || []);
        setRegisteredNames(sessionCache.registeredNames || []);
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

            // Fetch all active component names to dynamically identify managed components
            let allNames = [];
            try {
              const { data: namesData, error: namesError } = await supabase
                .from('app_view_controller')
                .select('component_name')
                .eq('is_active', true);
              if (!namesError && Array.isArray(namesData)) {
                allNames = namesData.map((d) => d.component_name);
              }
            } catch (err) {
              console.warn('[useViewConfig] Failed to fetch registered component names:', err);
            }

            // Use session-cached dynamic_form_configs (fetched once per browser session per role)
            let formsData = [];
            try {
              formsData = await fetchUserDynamicFormConfigs(userRoles || []);
            } catch (dfErr) {
              console.warn('[useViewConfig] Failed to fetch dynamic_form_configs:', dfErr);
            }

            return {
              viewConfigs: avcData || [],
              dynamicConfigs: formsData || [],
              registeredNames: allNames || [],
            };
          })();
        }

        const resolvedData = await viewConfigFetchPromise;

        // Update module-level cache
        viewConfigCache.set(cacheKey, {
          viewConfigs: resolvedData.viewConfigs,
          dynamicConfigs: resolvedData.dynamicConfigs,
          registeredNames: resolvedData.registeredNames,
        });

        // Update session storage cache
        writeSessionCache(
          resolvedData.viewConfigs,
          resolvedData.dynamicConfigs,
          userRoles,
          resolvedData.registeredNames
        );

        setViewConfigs(resolvedData.viewConfigs);
        setDynamicConfigs(resolvedData.dynamicConfigs);
        setRegisteredNames(resolvedData.registeredNames);
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

      // viewConfigs from RPC are already filtered by user roles.
      // Database app_view_controller is the single source of truth for tile visibility and ordering.
      const activeTiles = viewConfigs.filter((item) => item.type === 'tile');

      // Merge with UI metadata
      const standardTiles = activeTiles.map((item) => {
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
          valid_access_roles: item.valid_access_roles || [],
          display_order: item.display_order ?? 50,
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
    [viewConfigs, dynamicConfigs]
  );

  /**
   * Check if a specific feature or component is permitted and active.
   *
   * Since the RPC functions filter by user roles, viewConfigs only contains
   * items the user has access to.
   * 1. If component is managed by app_view_controller:
   *    - In viewConfigs: access GRANTED.
   *    - NOT in viewConfigs: access DENIED (enforcing database configuration).
   * 2. Fallbacks are only applied to truly unmanaged/legacy components not in DB.
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

      // 2. If the component is registered in the database table:
      // The database RPC is the authoritative source of truth.
      // Its absence from viewConfigs means access was intentionally denied by DB permissions.
      const isPresentInDb = Array.isArray(registeredNames) && registeredNames.includes(componentName);
      if (isPresentInDb) {
        return false;
      }

      // 3. Built-in fallbacks when component is not yet registered in DB (e.g., pending migration):
      // Dashboard sub-tabs
      if (
        componentName === 'dash-tab-calendar-overview' ||
        componentName === 'dash-tab-class-dashboard' ||
        componentName === 'dash-tab-subject-heatmap' ||
        componentName === 'dash-tab-tracker-heatmap' ||
        componentName === 'dash-tab-weekly-trend'
      ) {
        if (!userRoles || userRoles.length === 0) return true;
        return userRoles.some((r) =>
          ['admin', 'management', 'coordinator', 'teacher'].includes(
            String(r).toLowerCase().trim()
          )
        );
      }

      if (
        componentName === 'dash-tab-attention-required' ||
        componentName === 'dash-calendar-edit'
      ) {
        if (!userRoles || userRoles.length === 0) return true;
        return userRoles.some((r) =>
          ['admin', 'management', 'coordinator'].includes(String(r).toLowerCase().trim())
        );
      }

      // Book Planner tile & sub-tabs
      if (
        componentName === 'book-planner' ||
        componentName === 'book-planner-tab-targets' ||
        componentName === 'book-planner-tab-pacing'
      ) {
        if (!userRoles || userRoles.length === 0) return true;
        return userRoles.some((r) =>
          ['admin', 'management', 'coordinator', 'teacher'].includes(
            String(r).toLowerCase().trim()
          )
        );
      }

      if (componentName === 'book-planner-edit') {
        if (!userRoles || userRoles.length === 0) return true;
        return userRoles.some((r) =>
          ['admin', 'management', 'coordinator'].includes(String(r).toLowerCase().trim())
        );
      }

      // Builtin fallback for syl-tab-my-activity if not yet inserted in DB
      if (componentName === 'syl-tab-my-activity') {
        return userRoles.some((r) =>
          ['teacher', 'admin', 'management'].includes(String(r).toLowerCase().trim())
        );
      }

      // Builtin fallback for exam results tabs (unmanaged)
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
        componentName === 'exam-remarks-edit' ||
        componentName === 'exam-results-edit-marks'
      ) {
        if (!userRoles || userRoles.length === 0) return true;
        return userRoles.some((r) =>
          ['admin', 'management', 'coordinator', 'teacher', 'staff', 'principal'].includes(
            String(r).toLowerCase().trim()
          )
        );
      }

      // Builtin fallback for exam schedule tabs and manager (unmanaged)
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

      // Builtin fallback for exam schedule setup and slot editing (unmanaged)
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

      // Builtin fallback for parent exam timetable and progress report (unmanaged)
      if (
        componentName === 'ward-exam-timetable' ||
        componentName === 'ward-progress-report'
      ) {
        if (!userRoles || userRoles.length === 0) return true;
        return userRoles.some((r) =>
          ['parent'].includes(String(r).toLowerCase().trim())
        );
      }

      if (componentName === 'exam-sched-tab-parent') {
        if (!userRoles || userRoles.length === 0) return true;
        return userRoles.some((r) =>
          ['parent', 'admin', 'management'].includes(String(r).toLowerCase().trim())
        );
      }

      // Builtin fallback for report-card-designer (unmanaged)
      if (
        componentName === 'report-card-designer' ||
        componentName === 'exam-report-designer' ||
        componentName === 'report-card-designer-edit'
      ) {
        return userRoles.some((r) =>
          ['admin', 'management', 'coordinator'].includes(String(r).toLowerCase().trim())
        );
      }

      // 4. Managed components with no explicit fallback and not returned by DB are denied
      const isManaged = STATIC_MANAGED_COMPONENTS.has(componentName);
      if (isManaged) {
        return false;
      }

      // 5. Fail-closed (deny) for unmanaged exam components, tabs, setups, admin, and mutation variables
      if (
        componentName.startsWith('exam-') ||
        (componentName.includes('tab') && !componentName.includes('timetable')) ||
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
    [viewConfigs, registeredNames]
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
