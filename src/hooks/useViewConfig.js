// src/hooks/useViewConfig.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { TILE_METADATA_REGISTRY } from '../utils/tileRegistry';
import { CARD_THEMES } from '../utils/cardTheme';

const VIEW_CONFIG_SESSION_KEY = 'jzv_view_config_cache_v6';

const readSessionCache = () => {
  try {
    sessionStorage.removeItem('jzv_view_config_cache'); // Clear legacy caches
    sessionStorage.removeItem('jzv_view_config_cache_v2');
    sessionStorage.removeItem('jzv_view_config_cache_v3');
    sessionStorage.removeItem('jzv_view_config_cache_v4');
    sessionStorage.removeItem('jzv_view_config_cache_v5');
    const rawCache = sessionStorage.getItem(VIEW_CONFIG_SESSION_KEY);
    if (!rawCache) return null;
    const cachedData = JSON.parse(rawCache);
    if (!Array.isArray(cachedData.viewConfigs) || !Array.isArray(cachedData.dynamicConfigs)) {
      return null;
    }
    // Auto-invalidate if core exam components are not yet in the cached list
    const names = new Set(cachedData.viewConfigs.map((c) => c.component_name));
    if (
      !names.has('exam-schedule') ||
      !names.has('exam-results') ||
      !names.has('exam-sched-tab-setup') ||
      !names.has('exam-sched-slot-edit')
    ) {
      sessionStorage.removeItem(VIEW_CONFIG_SESSION_KEY);
      return null;
    }
    return cachedData;
  } catch (error) {
    return null;
  }
};

const initialSessionCache = typeof window === 'undefined' ? null : readSessionCache();

// Module-level cache prevents duplicate queries across hook instances.
let cachedViewConfig = initialSessionCache?.viewConfigs || null;
let cachedDynamicConfigs = initialSessionCache?.dynamicConfigs || null;
let viewConfigFetchPromise = null;

const writeSessionCache = (viewConfigs, dynamicConfigs) => {
  try {
    sessionStorage.setItem(
      VIEW_CONFIG_SESSION_KEY,
      JSON.stringify({ viewConfigs, dynamicConfigs })
    );
  } catch (error) {
    console.warn('[useViewConfig] Failed to cache view configuration for this session:', error);
  }
};

/**
 * Manually invalidate module cache to trigger fresh fetch from Supabase.
 */
export const invalidateViewConfigCache = () => {
  cachedViewConfig = null;
  cachedDynamicConfigs = null;
  viewConfigFetchPromise = null;
  try {
    sessionStorage.removeItem(VIEW_CONFIG_SESSION_KEY);
  } catch (error) {}
};

/**
 * Custom hook to load and manage view controller configuration.
 *
 * Drives UI visibility, permissions, and tile ordering from the `app_view_controller`
 * database table, while merging UI metadata from code and custom forms from `dynamic_form_configs`.
 */
export const useViewConfig = () => {
  const [viewConfigs, setViewConfigs] = useState(() => cachedViewConfig || []);
  const [dynamicConfigs, setDynamicConfigs] = useState(() => cachedDynamicConfigs || []);
  const [loading, setLoading] = useState(!cachedViewConfig);
  const [error, setError] = useState(null);

  const fetchConfigs = useCallback(async (forceRefresh = false) => {
    const isCacheValid = !forceRefresh && cachedViewConfig;

    if (isCacheValid) {
      setViewConfigs(cachedViewConfig);
      setDynamicConfigs(cachedDynamicConfigs || []);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!viewConfigFetchPromise) {
        viewConfigFetchPromise = (async () => {
          const { data: avcData, error: avcError } = await supabase
            .from('app_view_controller')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('type', { ascending: true });

          if (avcError) throw avcError;

          let formsData = [];
          try {
            const { data: dfData, error: dfError } = await supabase
              .from('dynamic_form_configs')
              .select('*');
            if (!dfError && dfData) formsData = dfData;
          } catch (dfErr) {
            console.warn('[useViewConfig] Failed to fetch dynamic_form_configs:', dfErr);
          }

          return { viewConfigs: avcData || [], dynamicConfigs: formsData };
        })();
      }

      const resolvedData = await viewConfigFetchPromise;
      cachedViewConfig = resolvedData.viewConfigs;
      cachedDynamicConfigs = resolvedData.dynamicConfigs;
      writeSessionCache(resolvedData.viewConfigs, resolvedData.dynamicConfigs);

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
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  /**
   * Evaluates if given validRoles grant access to any of the user's roles.
   */
  const hasAccess = useCallback((validRoles = [], defaultAccess = 'none', userRoles = []) => {
    if (defaultAccess === 'all') return true;
    if (!userRoles || userRoles.length === 0) return false;
    const userLower = userRoles.map((r) => String(r).toLowerCase().trim());
    return (validRoles || []).some((r) => userLower.includes(String(r).toLowerCase().trim()));
  }, []);

  /**
   * Returns list of visible tiles for the given user roles, merged with UI metadata and dynamic forms.
   */
  const getVisibleTiles = useCallback(
    (userRoles = []) => {
      if (!userRoles || userRoles.length === 0) return [];

      // Filter active tile entries permitted for userRoles
      const activeTiles = viewConfigs.filter((item) => {
        if (item.type !== 'tile') return false;
        const meta = TILE_METADATA_REGISTRY[item.component_name];
        const combinedRoles = Array.from(
          new Set([...(item.valid_access_roles || []), ...(meta?.valid_access_roles || [])])
        );
        return hasAccess(combinedRoles, item.default_access, userRoles);
      });

      // Include fallback tiles from TILE_METADATA_REGISTRY if not yet registered in app_view_controller
      const dbTileNames = new Set(viewConfigs.map((c) => c.component_name));
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
          type: item.type,
          parent_name:
            (item.parent_name
              ? String(item.parent_name)
                  .replace(/[\r\n]+/g, ' ')
                  .trim()
              : null) ||
            meta.group ||
            'general',
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

      // Filter and map dynamic forms for userRoles
      const dynamicTiles = (dynamicConfigs || [])
        .filter((config) => {
          if (!config.form_visibility) return false;
          const allowedRoles = config.form_visibility.split(',').map((r) => r.trim().toLowerCase());
          const userLower = userRoles.map((r) => String(r).toLowerCase().trim());
          return allowedRoles.includes('all') || userLower.some((r) => allowedRoles.includes(r));
        })
        .map((config) => {
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
              .split(',')
              .map((r) => r.trim().toLowerCase()),
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
   */
  const isFeatureEnabled = useCallback(
    (componentName, userRoles = []) => {
      // If user has no roles or roles are not given, deny access
      if (!userRoles || userRoles.length === 0) return false;

      // 1. Search in viewConfigs loaded from DB
      const config = viewConfigs.find((c) => c.component_name === componentName);
      if (config) {
        if (!config.is_active) return false;
        return hasAccess(config.valid_access_roles, config.default_access, userRoles);
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
    [viewConfigs, hasAccess]
  );

  /**
   * Returns all active components of any type accessible to the user.
   */
  const getVisibleComponents = useCallback(
    (userRoles = []) => {
      return viewConfigs.filter(
        (c) => c.is_active && hasAccess(c.valid_access_roles, c.default_access, userRoles)
      );
    },
    [viewConfigs, hasAccess]
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
