import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../utils/supabase';
import { loadMasterData } from '../utils';

/**
 * Hook to load and manage master data (schedules, classes, subjects, students, class_subjects)
 */
export const useMasterData = () => {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadMasterData(supabase);
      setSchedules(data.schedules);
      setClasses(data.classes);
      setSubjects(data.subjects);
      setStudents(data.students);
      setClassSubjects(data.classSubjects);

      // Auto-select first schedule if none selected
      if (data.schedules.length > 0) {
        // This will be handled by the parent component
      }
    } catch (err) {
      console.error('Failed to load master data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    schedules,
    setSchedules,
    classes,
    setClasses,
    subjects,
    setSubjects,
    students,
    setStudents,
    classSubjects,
    setClassSubjects,
    loading,
    setLoading,
    refresh: loadAll,
  };
};