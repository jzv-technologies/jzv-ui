import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../utils/supabase';
import { loadSummaryEntries } from '../utils';

/**
 * Hook to load and manage summary entries for the Class Summary tab
 */
export const useSummaryEntries = ({ activeTab, selectedScheduleId, scheduleResults }) => {
  const [summaryEntries, setSummaryEntries] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Fetch all entries for summary tab across all classes in the selected schedule
  useEffect(() => {
    if (activeTab !== 'summary') return;
    if (!selectedScheduleId || scheduleResults.length === 0) {
      setSummaryEntries([]);
      setSummaryLoading(false);
      return;
    }

    let isMounted = true;
    const fetchSummaryEntries = async () => {
      setSummaryLoading(true);
      try {
        const entries = await loadSummaryEntries(supabase, scheduleResults);
        if (isMounted) {
          setSummaryEntries(entries);
        }
      } catch (err) {
        console.error('Failed to load summary entries:', err);
      } finally {
        if (isMounted) {
          setSummaryLoading(false);
        }
      }
    };

    fetchSummaryEntries();

    return () => {
      isMounted = false;
    };
  }, [activeTab, selectedScheduleId, scheduleResults]);

  return {
    summaryEntries,
    setSummaryEntries,
    summaryLoading,
    setSummaryLoading,
  };
};