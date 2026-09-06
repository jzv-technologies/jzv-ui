// src/hooks/useViewConfig.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { TILE_METADATA_REGISTRY, FALLBACK_VIEW_CONFIGS } from '../utils/tileRegistry';
import { CARD_THEMES } from '../utils/cardTheme';

// Module-level cache to prevent repeated queries across renders and sub-components
let cachedViewConfig = null;
let cachedDynamicConfigs = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

/**
 * Manually invalidate module cache to trigger fresh fetch from Supabase.
 */
export const invalidateViewConfigCache = () => {
  cachedViewConfig = null;
  cachedDynamicConfigs = null;
  cacheTimestamp = 0;
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
  const [tableMissing, setTableMissing] = useState(false);

  const fetchConfigs = useCallback(async (forceRefresh = false) => {
    const isCacheValid =
      !forceRefresh &&
      cachedViewConfig &&
      Date.now() - cacheTimestamp < CACHE_TTL_MS;

    if (isCacheValid) {
      setViewConfigs(cachedViewConfig);
      setDynamicConfigs(cachedDynamicConfigs || []);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch app_view_controller
      const { data: avcData, error: avcError } = await supabase
        .from('app_view_controller')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      let resolvedConfigs = [];

      if (avcError) {
        if (avcError.code === '42P01' || avcError.message?.includes('does not exist')) {
          console.warn(
            '[useViewConfig] app_view_controller table does not exist in Supabase. ' +
              'Using fallback configuration. Please execute debug-files/execute-query.sql in Supabase SQL editor.'
          );
          setTableMissing(true);
          resolvedConfigs = FALLBACK_VIEW_CONFIGS.filter((c) => c.is_active);
        } else {
          console.error('[useViewConfig] Error fetching app_view_controller:', avcError);
          setError(avcError);
          resolvedConfigs = FALLBACK_VIEW_CONFIGS.filter((c) => c.is_active);
        }
      } else {
        setTableMissing(false);
        resolvedConfigs = avcData || [];
      }

      // 2. Fetch dynamic_form_configs
      let formsData = [];
      try {
        const { data: dfData, error: dfError } = await supabase
          .from('dynamic_form_configs')
          .select('*');
        if (!dfError && dfData) {
          formsData = dfData;
        }
      } catch (dfErr) {
        console.warn('[useViewConfig] Failed to fetch dynamic_form_configs:', dfErr);
      }

      cachedViewConfig = resolvedConfigs;
      cachedDynamicConfigs = formsData;
      cacheTimestamp = Date.now();

      setViewConfigs(resolvedConfigs);
      setDynamicConfigs(formsData);
    } catch (err) {
      console.error('[useViewConfig] Unexpected fetch error:', err);
      setError(err);
      setViewConfigs(FALLBACK_VIEW_CONFIGS.filter((c) => c.is_active));
    } finally {
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
      const activeTiles = viewConfigs.filter(
        (item) =>
          item.component_type === 'tile' &&
          hasAccess(item.valid_access_roles, item.default_access, userRoles)
      );

      // Merge with UI metadata
      const standardTiles = activeTiles.map((item) => {
        const meta = TILE_METADATA_REGISTRY[item.component_name] || {};
        return {
          id: item.component_name,
          component_name: item.component_name,
          component_type: item.component_type,
          group_name: item.group_name || meta.group || 'general',
          title: meta.title || item.component_name,
          titleKey: meta.titleKey || null,
          description: item.description || meta.description || '',
          descriptionKey: meta.descriptionKey || null,
          icon: meta.icon || 'fa-cubes',
          buttonColor: meta.buttonColor || 'bg-brand-primary text-white',
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
          const allowedRoles = config.form_visibility
            .split(',')
            .map((r) => r.trim().toLowerCase());
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
          else if (themeKey === 'dark' || themeKey === 'charcoal')
            shadowClass = 'shadow-gray-200';

          return {
            id: config.form_name,
            component_name: config.form_name,
            component_type: 'tile',
            group_name: 'dynamic-form',
            title: config.display_name || config.form_name,
            titleKey: null,
            description:
              config.description ||
              `Fill out the ${config.display_name || config.form_name} form.`,
            descriptionKey: null,
            icon: config.icon || 'fa-clipboard-list',
            buttonColor: theme.color
              ? `bg-${theme.color} text-white`
              : 'bg-orange-dark text-white',
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
      // 1. Search in viewConfigs loaded from DB
      const config = viewConfigs.find((c) => c.component_name === componentName);
      if (config) {
        if (!config.is_active) return false;
        return hasAccess(config.valid_access_roles, config.default_access, userRoles);
      }
      // 2. Check fallback registry
      const fallbackConfig = FALLBACK_VIEW_CONFIGS.find((c) => c.component_name === componentName);
      if (fallbackConfig) {
        if (!fallbackConfig.is_active) return false;
        return hasAccess(fallbackConfig.valid_access_roles, fallbackConfig.default_access, userRoles);
      }
      // 3. If unmanaged/not registered in view controller, allow by default
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
    tableMissing,
    refreshConfigs: () => fetchConfigs(true),
    getVisibleTiles,
    isFeatureEnabled,
    getVisibleComponents,
  };
};

export default useViewConfig;
