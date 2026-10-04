import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Restore parent mobile header immediately on module load if parent session exists
try {
  const savedParent =
    typeof window !== 'undefined' ? localStorage.getItem('jzv_parent_session') : null;
  if (savedParent) {
    const parsed = JSON.parse(savedParent);
    const parentMobile =
      parsed.user?.parentMobile ||
      parsed.user?.student?.mobile1 ||
      parsed.user?.student?.mobile2 ||
      '';
    if (parentMobile) {
      const formattedMobile = parentMobile.replace(/\D/g, '');
      if (supabase.rest.headers && typeof supabase.rest.headers.set === 'function') {
        supabase.rest.headers.set('x-parent-mobile', formattedMobile);
      } else {
        if (!supabase.rest.headers) supabase.rest.headers = {};
        supabase.rest.headers['x-parent-mobile'] = formattedMobile;
      }
    }
  }
} catch (e) {
  // Ignore localStorage parsing errors during initial load
}

/**
 * Helper to fetch all rows from a Supabase table across multiple pages,
 * bypassing the default 1000 row PostgREST limit.
 */
export async function fetchAllPages(
  tableName,
  selectFields = '*',
  configureQuery = null,
  pageSize = 1000
) {
  let allData = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(tableName)
      .select(selectFields)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (configureQuery) {
      query = configureQuery(query);
    }

    const { data, error } = await query;
    if (error) {
      return { data: allData.length > 0 ? allData : null, error };
    }

    if (data && data.length > 0) {
      allData.push(...data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return { data: allData, error: null };
}

/**
 * In-flight request deduplication helper.
 * Prevents identical network calls when page is activated or multiple components mount.
 */
const inFlightRequests = new Map();

/**
 * Cache for query results with TTL support
 */
const queryCache = new Map();

export function dedupedQuery(queryKey, queryFn, ttlMs = 1500) {
  if (inFlightRequests.has(queryKey)) {
    return inFlightRequests.get(queryKey);
  }

  const promise = queryFn().finally(() => {
    setTimeout(() => {
      inFlightRequests.delete(queryKey);
    }, ttlMs);
  });

  inFlightRequests.set(queryKey, promise);
  return promise;
}

/**
 * Enhanced deduplication with caching support.
 * Returns cached data if available and not stale, otherwise executes query.
 *
 * @param {string} queryKey - Unique key for the query
 * @param {Function} queryFn - Async function that performs the query
 * @param {Object} options - Configuration options
 * @param {number} options.ttlMs - Time to live for cache in milliseconds (default: 5 minutes)
 * @param {number} options.dedupTtlMs - Time to keep in-flight request deduplication (default: 1500ms)
 * @param {boolean} options.forceRefresh - Force refresh bypassing cache
 * @returns {Promise<any>} Query result
 */
export async function cachedDedupedQuery(queryKey, queryFn, options = {}) {
  const {
    ttlMs = 5 * 60 * 1000, // 5 minutes default cache TTL
    dedupTtlMs = 1500,
    forceRefresh = false,
  } = options;

  // Check cache first (unless force refresh)
  if (!forceRefresh && queryCache.has(queryKey)) {
    const cached = queryCache.get(queryKey);
    const now = Date.now();
    if (now - cached.timestamp < ttlMs) {
      console.log(`[cachedDedupedQuery] Cache hit for: ${queryKey}`);
      return cached.data;
    } else {
      // Cache expired, remove it
      queryCache.delete(queryKey);
    }
  }

  // Check in-flight requests
  if (inFlightRequests.has(queryKey)) {
    console.log(`[cachedDedupedQuery] In-flight request found for: ${queryKey}`);
    return inFlightRequests.get(queryKey);
  }

  // Execute query with deduplication
  const promise = queryFn().finally(() => {
    setTimeout(() => {
      inFlightRequests.delete(queryKey);
    }, dedupTtlMs);
  });

  inFlightRequests.set(queryKey, promise);

  try {
    const result = await promise;
    // Cache successful result
    queryCache.set(queryKey, {
      data: result,
      timestamp: Date.now(),
    });
    return result;
  } catch (error) {
    // Don't cache errors
    throw error;
  }
}

/**
 * Invalidate a specific cache entry
 */
export function invalidateQueryCache(queryKey) {
  queryCache.delete(queryKey);
}

/**
 * Invalidate all cache entries matching a prefix
 */
export function invalidateQueryCacheByPrefix(prefix) {
  for (const key of queryCache.keys()) {
    if (key.startsWith(prefix)) {
      queryCache.delete(key);
    }
  }
}

/**
 * Clear all query cache
 */
export function clearQueryCache() {
  queryCache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getQueryCacheStats() {
  return {
    size: queryCache.size,
    keys: Array.from(queryCache.keys()),
    inFlight: Array.from(inFlightRequests.keys()),
  };
}
