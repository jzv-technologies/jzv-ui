// src/hooks/useSyllabusTrackerData.js
import { useState, useEffect, useCallback } from 'react';
import { supabase, fetchAllPages } from '../utils/supabase';
import { cachedDedupedQuery, invalidateQueryCacheByPrefix } from '../utils/supabase';

/**
 * Custom hook for fetching syllabus tracker related data with deduplication and caching.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.lpFilterBookId - Optional book ID filter for lessons
 * @param {boolean} options.enabled - Whether to fetch data
 * @returns {Object} Data and loading states
 */
export function useSyllabusTrackerData({ lpFilterBookId, enabled = true } = {}) {
  const QUERY_PREFIX = 'syllabus-tracker';

  // Fetch all master data
  const fetchMasterData = useCallback(async () => {
    const [
      resClasses,
      resSubjects,
      resBooks,
      resClassifications,
      resBookClasses,
      resAssignments,
      resTeachers,
      resTrackers,
      resLogs,
      resLessons,
      resPlans,
      resCarryForwards,
      resAcademicEvents,
    ] = await Promise.all([
      supabase.from('classes').select('*').order('id', { ascending: true }),
      supabase.from('syl_subjects').select('*').order('name', { ascending: true }),
      supabase.from('syl_books').select('*').order('name', { ascending: true }),
      supabase.from('syl_classifications').select('*').order('name', { ascending: true }),
      supabase.from('map_class_books').select('*'),
      supabase.from('class_assignments').select('*'),
      supabase.from('teachers').select('*').order('name', { ascending: true }),
      supabase.from('trk_book_level_progress').select('*'),
      fetchAllPages(
        'trk_lesson_level_progress',
        'id, lesson_id, class_id, status, completion_percentage, revision_counter, start_date, end_date, days_taken, updated_at, book_id, replan_counter, carry_forward_counter, carry_forward_count, delay_start, delay_end'
      ),
      lpFilterBookId
        ? fetchAllPages('syl_lessons', '*', (q) =>
            q
              .eq('book_id', lpFilterBookId)
              .order('sequence', { ascending: true, nullsFirst: false })
              .order('id', { ascending: true })
          )
        : Promise.resolve({ data: [], error: null }),
      fetchAllPages(
        'trk_lesson_level_progress',
        '*, lesson:syl_lessons(*), class:classes(*), subject:syl_subjects(*), book:syl_books(*)',
        (q) => q.in('status', ['planned', 'in_progress', 'completed'])
      ),
      supabase.from('lesson_plan_carry_forwards').select('*'),
      supabase.from('academic_events').select('*').order('start_date', { ascending: true }),
    ]);

    // Check for errors
    const errors = [
      resClasses.error,
      resSubjects.error,
      resBooks.error,
      resClassifications.error,
      resBookClasses.error,
      resAssignments.error,
      resTeachers.error,
      resTrackers.error,
      resLogs.error,
      resLessons.error,
      resPlans.error,
      resCarryForwards.error,
      resAcademicEvents?.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      throw errors[0];
    }

    return {
      classes: resClasses.data || [],
      subjects: resSubjects.data || [],
      books: resBooks.data || [],
      classifications: resClassifications.data || [],
      bookClasses: resBookClasses.data || [],
      assignments: resAssignments.data || [],
      teachers: (resTeachers.data || []).map((t) => ({ ...t, id: t.teacher_id || t.id })),
      trackers: resTrackers.data || [],
      logs: resLogs.data || [],
      lessons: resLessons.data || [],
      plans: resPlans.data || [],
      carryForwards: resCarryForwards.data || [],
      academicEvents: resAcademicEvents.data || [],
    };
  }, [lpFilterBookId]);

  // Wrap with deduplication
  const getMasterData = useCallback(async () => {
    const cacheKey = lpFilterBookId
      ? `${QUERY_PREFIX}:master:book:${lpFilterBookId}`
      : `${QUERY_PREFIX}:master`;

    return cachedDedupedQuery(
      cacheKey,
      fetchMasterData,
      { ttlMs: 5 * 60 * 1000 } // 5 minutes
    );
  }, [fetchMasterData, lpFilterBookId]);

  // Invalidate all syllabus tracker cache
  const invalidateAll = useCallback(() => {
    invalidateQueryCacheByPrefix(QUERY_PREFIX);
  }, []);

  // Invalidate specific book cache
  const invalidateBook = useCallback((bookId) => {
    invalidateQueryCacheByPrefix(`${QUERY_PREFIX}:master:book:${bookId}`);
  }, []);

  return {
    getMasterData,
    invalidateAll,
    invalidateBook,
  };
}

/**
 * Hook for fetching syllabus tracker master data with automatic state management
 */
export function useSyllabusTrackerMasterData(lpFilterBookId, enabled = true) {
  const { getMasterData, invalidateAll } = useSyllabusTrackerData({
    lpFilterBookId,
    enabled,
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const masterData = await getMasterData();
      setData(masterData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [enabled, getMasterData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetch = useCallback(() => {
    invalidateAll();
    loadData();
  }, [invalidateAll, loadData]);

  return { data, loading, error, refetch };
}
