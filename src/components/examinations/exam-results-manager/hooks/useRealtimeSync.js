import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../utils/supabase';
import { setupRealtimeSubscriptions, setupBroadcastChannel, setupWindowEventListeners, setupScheduleRefresh } from '../utils';

/**
 * Hook to set up real-time synchronization for exam schedules
 */
export const useRealtimeSync = ({ selectedScheduleId, setSchedules }) => {
  // Supabase Realtime subscription on exam_schedules
  useEffect(() => {
    const cleanup = setupRealtimeSubscriptions(supabase, setSchedules);
    return cleanup;
  }, [setSchedules]);

  // Synchronize published changes across browser tabs and windows via BroadcastChannel
  useEffect(() => {
    const cleanup = setupBroadcastChannel(setSchedules);
    return cleanup;
  }, [setSchedules]);

  // Synchronize published changes from local window events
  useEffect(() => {
    const cleanup = setupWindowEventListeners(setSchedules);
    return cleanup;
  }, [setSchedules]);

  // Re-fetch selected schedule row from Supabase on tab switch, window focus, or visibility change
  useEffect(() => {
    const cleanup = setupScheduleRefresh(selectedScheduleId, setSchedules, supabase);
    return cleanup;
  }, [selectedScheduleId, setSchedules]);
};