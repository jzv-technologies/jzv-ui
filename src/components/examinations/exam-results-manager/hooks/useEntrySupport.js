import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../utils/supabase';
import { loadEntrySupportData } from '../utils';

/**
 * Hook to load and manage entry support data (teachers, class_assignments)
 */
export const useEntrySupport = ({ needsEntrySupport }) => {
  const [teachers, setTeachers] = useState([]);
  const [classAssignments, setClassAssignments] = useState([]);
  const [entrySupportReady, setEntrySupportReady] = useState(false);
  const entrySupportStarted = useRef(false);

  useEffect(() => {
    if (!needsEntrySupport || entrySupportStarted.current) return;
    entrySupportStarted.current = true;

    const fetchEntrySupport = async () => {
      try {
        const data = await loadEntrySupportData(supabase);
        setTeachers(data.teachers);
        setClassAssignments(data.classAssignments);
        setEntrySupportReady(true);
      } catch (err) {
        console.error('Failed to load entry support data (teachers & assignments):', err);
        setEntrySupportReady(true);
      }
    };

    fetchEntrySupport();
  }, [needsEntrySupport]);

  return {
    teachers,
    setTeachers,
    classAssignments,
    setClassAssignments,
    entrySupportReady,
    setEntrySupportReady,
  };
};