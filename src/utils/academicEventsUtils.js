// src/utils/academicEventsUtils.js
import { supabase } from './supabase';

/**
 * Normalizes any Date or ISO string to 'YYYY-MM-DD' in local/UTC date format.
 */
export const toDateKey = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
};

/**
 * Checks whether a specific date matches any non-teaching academic event.
 * @param {string|Date} dateVal - Date string or Date object
 * @param {Array} academicEvents - List of academic_events records
 * @returns {Object|null} Matching non-teaching event record or null
 */
export const getNonTeachingEventForDate = (dateVal, academicEvents = []) => {
  if (!dateVal || !Array.isArray(academicEvents) || academicEvents.length === 0) return null;
  const dStr = toDateKey(dateVal);
  if (!dStr) return null;

  for (const ev of academicEvents) {
    const isTeaching = ev.is_teaching_day === true || String(ev.is_teaching_day) === 'true';
    if (!isTeaching) {
      const start = ev.start_date ? String(ev.start_date).split('T')[0] : '';
      const end = ev.end_date ? String(ev.end_date).split('T')[0] : start;
      if (start && dStr >= start && dStr <= (end || start)) {
        return ev;
      }
    }
  }
  return null;
};

/**
 * Fetches academic events from Supabase with resilient localStorage cache fallback.
 */
export const fetchAcademicEvents = async () => {
  try {
    const { data, error } = await supabase
      .from('academic_events')
      .select('*')
      .order('start_date', { ascending: true });
    if (error) {
      console.warn('Supabase fetch notice for academic_events:', error.message);
      const cached = localStorage.getItem('jzv_academic_events_cache');
      return cached ? JSON.parse(cached) : [];
    }
    if (data) {
      try {
        localStorage.setItem('jzv_academic_events_cache', JSON.stringify(data));
      } catch (e) {
        console.error(e);
      }
    }
    return data || [];
  } catch (err) {
    console.warn('Failed to load academic_events:', err);
    try {
      const cached = localStorage.getItem('jzv_academic_events_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
};
