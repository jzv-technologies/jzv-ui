// src/hooks/useTimetableData.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { cachedDedupedQuery, invalidateQueryCacheByPrefix } from '../utils/supabase';

/**
 * Custom hook for fetching timetable related data with deduplication and caching.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to fetch data
 * @returns {Object} Data and loading states
 */
export function useTimetableData({ enabled = true } = {}) {
  const QUERY_PREFIX = 'timetable';

  // Fetch all master data
  const fetchMasterData = useCallback(async () => {
    const [
      resClassifications,
      resSubjects,
      resTeachers,
      resTeacherSubjects,
      resClasses,
      resAssignments,
      resSlots,
      resPeriods,
    ] = await Promise.all([
      supabase.from('syl_classifications').select('*').order('name', { ascending: true }),
      supabase.from('syl_subjects').select('*'),
      supabase
        .from('employees')
        .select('id, name, is_male, auth_id, is_active, emp_id')
        .eq('is_teacher', true)
        .order('name', { ascending: true })
        .then((res) => {
          if (!res.error && res.data && res.data.length > 0) return res;
          return supabase.from('teachers').select('*');
        }),
      supabase.from('map_teacher_subject').select('*'),
      supabase.from('classes').select('*'),
      supabase.from('class_assignments').select('*'),
      supabase.from('timetable_slots').select('*'),
      supabase.from('periods').select('*').order('period_number', { ascending: true }),
    ]);

    // Check for errors
    const errors = [
      resClassifications.error,
      resSubjects.error,
      resTeachers.error,
      resTeacherSubjects.error,
      resClasses.error,
      resAssignments.error,
      resSlots.error,
      resPeriods.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      throw errors[0];
    }

    const teacherSubjectMappings = resTeacherSubjects.data || [];

    const teachersWithSubjects = (resTeachers.data || []).map((t) => {
      const tid = t.id || t.teacher_id;
      return {
        ...t,
        id: tid,
        teacher_id: tid,
        subjects: teacherSubjectMappings
          .filter((ts) => String(ts.teacher_id) === String(tid))
          .map((ts) => ts.subject_id),
      };
    });

    return {
      classifications: resClassifications.data || [],
      subjects: resSubjects.data || [],
      teachers: teachersWithSubjects,
      classes: resClasses.data || [],
      assignments: resAssignments.data || [],
      slots: resSlots.data || [],
      periods: resPeriods.data || [],
    };
  }, []);

  // Wrap with deduplication
  const getMasterData = useCallback(async () => {
    return cachedDedupedQuery(
      `${QUERY_PREFIX}:master`,
      fetchMasterData,
      { ttlMs: 5 * 60 * 1000 } // 5 minutes
    );
  }, [fetchMasterData]);

  // Invalidate all timetable cache
  const invalidateAll = useCallback(() => {
    invalidateQueryCacheByPrefix(QUERY_PREFIX);
  }, []);

  return {
    getMasterData,
    invalidateAll,
  };
}

/**
 * Hook for fetching timetable master data with automatic state management
 */
export function useTimetableMasterData(enabled = true) {
  const { getMasterData, invalidateAll } = useTimetableData({ enabled });

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
