// src/hooks/useDedupedQuery.js
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  cachedDedupedQuery,
  invalidateQueryCache,
  invalidateQueryCacheByPrefix,
} from '../utils/supabase';

/**
 * Custom hook for deduplicated and cached data fetching.
 *
 * @param {string} queryKey - Unique key for the query (used for caching and deduplication)
 * @param {Function} queryFn - Async function that performs the query
 * @param {Object} options - Configuration options
 * @param {number} options.ttlMs - Cache TTL in milliseconds (default: 5 minutes)
 * @param {boolean} options.enabled - Whether to execute the query (default: true)
 * @param {Array} options.deps - Dependencies that trigger refetch when changed
 * @returns {Object} { data, loading, error, refetch, invalidate }
 */
export function useDedupedQuery(queryKey, queryFn, options = {}) {
  const { ttlMs = 5 * 60 * 1000, enabled = true, deps = [] } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const queryKeyRef = useRef(queryKey);
  const queryFnRef = useRef(queryFn);

  // Update refs when key or fn changes
  useEffect(() => {
    queryKeyRef.current = queryKey;
    queryFnRef.current = queryFn;
  }, [queryKey, queryFn]);

  const executeQuery = useCallback(
    async (forceRefresh = false) => {
      if (!enabled) return;

      setLoading(true);
      setError(null);

      try {
        const result = await cachedDedupedQuery(queryKeyRef.current, queryFnRef.current, {
          ttlMs,
          forceRefresh,
        });

        if (isMountedRef.current) {
          setData(result);
          setLoading(false);
        }
        return result;
      } catch (err) {
        if (isMountedRef.current) {
          setError(err);
          setLoading(false);
        }
        throw err;
      }
    },
    [enabled, ttlMs]
  );

  // Execute on mount and when deps change
  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      executeQuery();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [enabled, ...deps, executeQuery]);

  const refetch = useCallback(() => executeQuery(true), [executeQuery]);
  const invalidate = useCallback(() => invalidateQueryCache(queryKeyRef.current), []);

  return { data, loading, error, refetch, invalidate };
}

/**
 * Hook for fetching a single item by ID with deduplication.
 * Useful for detail views, modals, etc.
 *
 * @param {string} baseKey - Base query key (e.g., 'student', 'exam')
 * @param {string|number|null} id - Item ID
 * @param {Function} queryFn - Async function that fetches the item
 * @param {Object} options - Same as useDedupedQuery
 * @returns {Object} { data, loading, error, refetch, invalidate }
 */
export function useDedupedItemQuery(baseKey, id, queryFn, options = {}) {
  const queryKey = id ? `${baseKey}:${id}` : null;
  const enabled = options.enabled !== false && id != null;

  return useDedupedQuery(queryKey, () => queryFn(id), {
    ...options,
    enabled,
    deps: [id, ...(options.deps || [])],
  });
}

/**
 * Hook for list queries with pagination support.
 *
 * @param {string} queryKey - Base query key
 * @param {Function} queryFn - Async function that fetches the list
 * @param {Object} options - Configuration
 * @param {number} options.page - Current page
 * @param {number} options.pageSize - Items per page
 * @returns {Object} { data, loading, error, refetch, invalidate, setPage }
 */
export function useDedupedListQuery(queryKey, queryFn, options = {}) {
  const { page = 1, pageSize = 50, ...restOptions } = options;
  const [currentPage, setCurrentPage] = useState(page);

  const fullQueryKey = `${queryKey}:page:${currentPage}:size:${pageSize}`;

  const result = useDedupedQuery(fullQueryKey, () => queryFn(currentPage, pageSize), {
    ...restOptions,
    deps: [currentPage, pageSize, ...(restOptions.deps || [])],
  });

  const setPage = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  return {
    ...result,
    setPage,
    currentPage,
  };
}

export { invalidateQueryCache, invalidateQueryCacheByPrefix };
