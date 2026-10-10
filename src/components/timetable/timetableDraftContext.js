// src/components/timetable/timetableDraftContext.js
/**
 * Draft-mode context for the timetable.
 * While the timetable is being worked on as a draft, consumers must not write to the live
 * Supabase tables, so mutations are suppressed rather than threading a prop through every
 * intermediate setup component.
 */

import { createContext, useContext } from 'react';

export const TimetableDraftModeContext = createContext(false);

export const useTimetableDraftMode = () => useContext(TimetableDraftModeContext);

export default TimetableDraftModeContext;
