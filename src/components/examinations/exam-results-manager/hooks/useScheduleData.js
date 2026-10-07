import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../utils/supabase';
import { loadScheduleData, loadEntrySupportData } from '../utils';

/**
 * Hook to load and manage schedule-specific data (slots, results)
 */
export const useScheduleData = ({ selectedScheduleId, needsScheduleData }) => {
  const [slots, setSlots] = useState([]);
  const [results, setResults] = useState([]);
  const [scheduleDataFor, setScheduleDataFor] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const scheduleFetchSeq = useRef(0);

  const refreshResults = useCallback(async () => {
    if (!selectedScheduleId) return;
    try {
      const [slotsRes, resultsRes, schedRes] = await Promise.all([
        supabase
          .from('exam_schedule_slots')
          .select('*')
          .eq('schedule_id', Number(selectedScheduleId)),
        supabase.from('exam_results').select('*').eq('schedule_id', Number(selectedScheduleId)),
        supabase
          .from('exam_schedules')
          .select('*')
          .eq('id', Number(selectedScheduleId))
          .maybeSingle(),
      ]);
      setSlots(slotsRes.data || []);
      setResults(resultsRes.data || []);
      if (schedRes?.data) {
        // This will be handled by the parent component's schedules state
      }
      setScheduleDataFor(String(selectedScheduleId));
    } catch (err) {
      console.error('Failed to refresh schedule results:', err);
    }
  }, [selectedScheduleId]);

  // Lazy-load exam_results and exam_schedule_slots scoped to the selected schedule
  useEffect(() => {
    if (!needsScheduleData || !selectedScheduleId) return;
    if (scheduleDataFor === String(selectedScheduleId)) return;

    const currentSeq = ++scheduleFetchSeq.current;
    const fetchScheduleData = async () => {
      setScheduleLoading(true);
      try {
        const data = await loadScheduleData(supabase, selectedScheduleId);

        if (currentSeq !== scheduleFetchSeq.current) return;

        setSlots(data.slots);
        setResults(data.results);
        if (data.schedule) {
          // Parent will handle schedule update
        }
        setScheduleDataFor(String(selectedScheduleId));
      } catch (err) {
        console.error('Failed to load schedule results & slots:', err);
      } finally {
        if (currentSeq === scheduleFetchSeq.current) {
          setScheduleLoading(false);
        }
      }
    };

    fetchScheduleData();
  }, [needsScheduleData, selectedScheduleId, scheduleDataFor]);

  return {
    slots,
    setSlots,
    results,
    setResults,
    scheduleDataFor,
    setScheduleDataFor,
    scheduleLoading,
    setScheduleLoading,
    refreshResults,
  };
};