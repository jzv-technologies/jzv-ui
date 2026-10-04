// src/hooks/useReferenceData.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { cachedDedupedQuery, invalidateQueryCacheByPrefix } from '../utils/supabase';

/**
 * Custom hook for fetching common reference data with deduplication and caching.
 * This data is used across many components (classes, subjects, teachers, periods, etc.)
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to fetch data
 * @returns {Object} Data and loading states
 */
export function useReferenceData({ enabled = true } = {}) {
  const QUERY_PREFIX = 'reference-data';

  // Fetch all reference data
  const fetchAllReferenceData = useCallback(async () => {
    const [
      resClasses,
      resSubjects,
      resTeachers,
      resPeriods,
      resClassifications,
      resBooks,
      resBookClasses,
      resAssignments,
      resTeacherSubjects,
      resSlots,
    ] = await Promise.all([
      supabase.from('classes').select('*').order('name', { ascending: true }),
      supabase.from('syl_subjects').select('*').order('name', { ascending: true }),
      supabase
        .from('employees')
        .select('id, name, is_male, auth_id, is_active, emp_id, email')
        .eq('is_teacher', true)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .then((res) => {
          if (!res.error && res.data && res.data.length > 0) return res;
          return supabase.from('teachers').select('*');
        }),
      supabase.from('periods').select('*').order('period_number', { ascending: true }),
      supabase.from('syl_classifications').select('*').order('name', { ascending: true }),
      supabase.from('syl_books').select('*').order('name', { ascending: true }),
      supabase.from('map_class_books').select('*'),
      supabase.from('class_assignments').select('*'),
      supabase.from('map_teacher_subject').select('*'),
      supabase.from('timetable_slots').select('*'),
    ]);

    // Check for errors
    const errors = [
      resClasses.error,
      resSubjects.error,
      resTeachers.error,
      resPeriods.error,
      resClassifications.error,
      resBooks.error,
      resBookClasses.error,
      resAssignments.error,
      resTeacherSubjects.error,
      resSlots.error,
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
      classes: resClasses.data || [],
      subjects: resSubjects.data || [],
      teachers: teachersWithSubjects,
      periods: resPeriods.data || [],
      classifications: resClassifications.data || [],
      books: resBooks.data || [],
      bookClasses: resBookClasses.data || [],
      assignments: resAssignments.data || [],
      teacherSubjects: teacherSubjectMappings,
      slots: resSlots.data || [],
    };
  }, []);

  // Individual fetchers for specific data types
  const fetchClasses = useCallback(async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }, []);

  const fetchSubjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('syl_subjects')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }, []);

  const fetchTeachers = useCallback(async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, is_male, auth_id, is_active, emp_id, email')
      .eq('is_teacher', true)
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }, []);

  const fetchPeriods = useCallback(async () => {
    const { data, error } = await supabase
      .from('periods')
      .select('*')
      .order('period_number', { ascending: true });
    if (error) throw error;
    return data || [];
  }, []);

  const fetchClassifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('syl_classifications')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }, []);

  const fetchBooks = useCallback(async () => {
    const { data, error } = await supabase
      .from('syl_books')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }, []);

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase.from('class_assignments').select('*');
    if (error) throw error;
    return data || [];
  }, []);

  const fetchSlots = useCallback(async () => {
    const { data, error } = await supabase.from('timetable_slots').select('*');
    if (error) throw error;
    return data || [];
  }, []);

  // Wrap with deduplication
  const getAllReferenceData = useCallback(async () => {
    return cachedDedupedQuery(
      `${QUERY_PREFIX}:all`,
      fetchAllReferenceData,
      { ttlMs: 10 * 60 * 1000 } // 10 minutes for reference data (rarely changes)
    );
  }, [fetchAllReferenceData]);

  const getClasses = useCallback(async () => {
    return cachedDedupedQuery(`${QUERY_PREFIX}:classes`, fetchClasses, { ttlMs: 10 * 60 * 1000 });
  }, [fetchClasses]);

  const getSubjects = useCallback(async () => {
    return cachedDedupedQuery(`${QUERY_PREFIX}:subjects`, fetchSubjects, { ttlMs: 10 * 60 * 1000 });
  }, [fetchSubjects]);

  const getTeachers = useCallback(async () => {
    return cachedDedupedQuery(`${QUERY_PREFIX}:teachers`, fetchTeachers, { ttlMs: 10 * 60 * 1000 });
  }, [fetchTeachers]);

  const getPeriods = useCallback(async () => {
    return cachedDedupedQuery(`${QUERY_PREFIX}:periods`, fetchPeriods, { ttlMs: 10 * 60 * 1000 });
  }, [fetchPeriods]);

  const getClassifications = useCallback(async () => {
    return cachedDedupedQuery(`${QUERY_PREFIX}:classifications`, fetchClassifications, {
      ttlMs: 10 * 60 * 1000,
    });
  }, [fetchClassifications]);

  const getBooks = useCallback(async () => {
    return cachedDedupedQuery(`${QUERY_PREFIX}:books`, fetchBooks, { ttlMs: 10 * 60 * 1000 });
  }, [fetchBooks]);

  const getAssignments = useCallback(async () => {
    return cachedDedupedQuery(`${QUERY_PREFIX}:assignments`, fetchAssignments, {
      ttlMs: 5 * 60 * 1000,
    });
  }, [fetchAssignments]);

  const getSlots = useCallback(async () => {
    return cachedDedupedQuery(`${QUERY_PREFIX}:slots`, fetchSlots, { ttlMs: 5 * 60 * 1000 });
  }, [fetchSlots]);

  // Invalidate all reference data cache
  const invalidateAll = useCallback(() => {
    invalidateQueryCacheByPrefix(QUERY_PREFIX);
  }, []);

  return {
    getAllReferenceData,
    getClasses,
    getSubjects,
    getTeachers,
    getPeriods,
    getClassifications,
    getBooks,
    getAssignments,
    getSlots,
    invalidateAll,
  };
}

/**
 * Hook for fetching specific reference data with automatic state management
 */
export function useReferenceDataState(dataType, enabled = true) {
  const {
    getAllReferenceData,
    getClasses,
    getSubjects,
    getTeachers,
    getPeriods,
    getClassifications,
    getBooks,
    getAssignments,
    getSlots,
    invalidateAll,
  } = useReferenceData({ enabled });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetchFnMap = {
    all: getAllReferenceData,
    classes: getClasses,
    subjects: getSubjects,
    teachers: getTeachers,
    periods: getPeriods,
    classifications: getClassifications,
    books: getBooks,
    assignments: getAssignments,
    slots: getSlots,
  };

  const fetchFn = fetchFnMap[dataType] || getAllReferenceData;

  const loadData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [enabled, fetchFn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetch = useCallback(() => {
    invalidateAll();
    loadData();
  }, [invalidateAll, loadData]);

  return { data, loading, error, refetch };
}
