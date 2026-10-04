// src/hooks/useExamResultsData.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { cachedDedupedQuery, invalidateQueryCacheByPrefix } from '../utils/supabase';

/**
 * Custom hook for fetching exam results related data with deduplication and caching.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.selectedScheduleId - Currently selected schedule ID
 * @param {boolean} options.enabled - Whether to fetch data
 * @returns {Object} Data and loading states
 */
export function useExamResultsData({ selectedScheduleId, enabled = true } = {}) {
  // Base query key prefix for all exam results data
  const QUERY_PREFIX = 'exam-results';

  // Fetch all master data (schedules, classes, subjects, etc.)
  const fetchMasterData = useCallback(async () => {
    const safe = async (query) => {
      try {
        const r = await query;
        return r.data || [];
      } catch {
        return [];
      }
    };

    const [
      schedules,
      classes,
      subjects,
      students,
      teachers,
      slots,
      classSubjects,
      classAssignments,
    ] = await Promise.all([
      safe(supabase.from('exam_schedules').select('*').order('start_date', { ascending: false })),
      safe(supabase.from('classes').select('*').order('name')),
      safe(supabase.from('syl_subjects').select('*').order('name')),
      safe(
        supabase
          .from('students')
          .select('id, student_name, admission_no, class_id, enrollment')
          .order('class_id', { ascending: true })
          .order('student_name', { ascending: true })
      ),
      safe(
        supabase
          .from('employees')
          .select('id, name, is_active, is_teacher')
          .eq('is_teacher', true)
          .eq('is_active', true)
          .order('name')
      ),
      safe(supabase.from('exam_schedule_slots').select('*')),
      safe(supabase.from('class_subjects').select('*')),
      safe(supabase.from('class_assignments').select('*')),
    ]);

    return {
      schedules,
      classes,
      subjects,
      students,
      teachers,
      slots,
      classSubjects,
      classAssignments,
    };
  }, []);

  // Fetch exam results for a specific schedule
  const fetchResults = useCallback(async (scheduleId) => {
    if (!scheduleId) return [];

    const { data, error } = await supabase
      .from('exam_results')
      .select('*')
      .eq('exam_schedule_id', scheduleId);

    if (error) throw error;
    return data || [];
  }, []);

  // Fetch summary entries for a schedule
  const fetchSummaryEntries = useCallback(async (scheduleId) => {
    if (!scheduleId) return [];

    const { data, error } = await supabase
      .from('exam_result_entries')
      .select('*')
      .eq('exam_schedule_id', scheduleId);

    if (error) throw error;
    return data || [];
  }, []);

  // Wrap with deduplication
  const getMasterData = useCallback(async () => {
    return cachedDedupedQuery(
      `${QUERY_PREFIX}:master`,
      fetchMasterData,
      { ttlMs: 5 * 60 * 1000 } // 5 minutes
    );
  }, [fetchMasterData]);

  const getResults = useCallback(
    async (scheduleId) => {
      if (!scheduleId) return [];
      return cachedDedupedQuery(
        `${QUERY_PREFIX}:results:${scheduleId}`,
        () => fetchResults(scheduleId),
        { ttlMs: 2 * 60 * 1000 } // 2 minutes for results (more volatile)
      );
    },
    [fetchResults]
  );

  const getSummaryEntries = useCallback(
    async (scheduleId) => {
      if (!scheduleId) return [];
      return cachedDedupedQuery(
        `${QUERY_PREFIX}:summary:${scheduleId}`,
        () => fetchSummaryEntries(scheduleId),
        { ttlMs: 2 * 60 * 1000 }
      );
    },
    [fetchSummaryEntries]
  );

  // Invalidate all exam results cache
  const invalidateAll = useCallback(() => {
    invalidateQueryCacheByPrefix(QUERY_PREFIX);
  }, []);

  // Invalidate specific schedule cache
  const invalidateSchedule = useCallback((scheduleId) => {
    invalidateQueryCacheByPrefix(`${QUERY_PREFIX}:results:${scheduleId}`);
    invalidateQueryCacheByPrefix(`${QUERY_PREFIX}:summary:${scheduleId}`);
  }, []);

  return {
    getMasterData,
    getResults,
    getSummaryEntries,
    invalidateAll,
    invalidateSchedule,
  };
}

/**
 * Hook for fetching data for a specific exam schedule with automatic caching
 */
export function useExamScheduleData(scheduleId, enabled = true) {
  const { getResults, getSummaryEntries, invalidateSchedule } = useExamResultsData({
    selectedScheduleId: scheduleId,
    enabled,
  });

  const [results, setResults] = useState([]);
  const [summaryEntries, setSummaryEntries] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!enabled || !scheduleId) return;

    setLoading(true);
    setError(null);

    try {
      const [resultsData, summaryData] = await Promise.all([
        getResults(scheduleId),
        getSummaryEntries(scheduleId),
      ]);

      setResults(resultsData);
      setSummaryEntries(summaryData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [enabled, scheduleId, getResults, getSummaryEntries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetch = useCallback(() => {
    invalidateSchedule(scheduleId);
    loadData();
  }, [invalidateSchedule, scheduleId, loadData]);

  return { results, summaryEntries, loading, error, refetch };
}
