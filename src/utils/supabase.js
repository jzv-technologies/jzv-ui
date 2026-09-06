
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Restore parent mobile header immediately on module load if parent session exists
try {
  const savedParent = typeof window !== 'undefined' ? localStorage.getItem('jzv_parent_session') : null;
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
export async function fetchAllPages(tableName, selectFields = '*', configureQuery = null, pageSize = 1000) {
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

