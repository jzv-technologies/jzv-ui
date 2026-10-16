/**
 * Student Discipline data access.
 *
 * The database keeps running coin counters, not events, so this module is deliberately small:
 *
 *   get_discipline_year_data()      one call per academic year (categories, settings, classes,
 *                                   teachers, week list and the coin counters)
 *   log_discipline_coins(...)       atomic increment of a class counter and the teacher counter
 *   adjust_discipline_coins(...)    correction, permission-gated, clamped at zero
 *
 * Both write functions do their own permission checks on the server, and there is no client-side
 * INSERT/UPDATE policy on the counter tables, so those counters cannot be written any other way.
 *
 * All scoring lives in utils/disciplineScoring.js.
 */

import { supabase } from '../utils/supabase';
import {
  academicYearSpan,
  isAcademicMonth,
} from '../utils/disciplineScoring';

const fail = (error, context) => {
  throw new Error(error?.message ? `${context}: ${error.message}` : context);
};

/** Whole-year payload, used to build every tab. */
export const fetchDisciplineYear = async (ay = null) => {
  const { data, error } = await supabase.rpc('get_discipline_year_data', { p_ay: ay });
  if (error) fail(error, 'Could not load the discipline scorecard');
  if (!data) return null;

  const { data: weekController, error: controllerError } = await supabase
    .from('discipline_week_controller')
    .select('week_start, week_num, month, year, allow_edits, ignore_week, shield_decision');
  if (controllerError) fail(controllerError, 'Could not load discipline week settings');

  const span = academicYearSpan(data.ay);
  const controllerRows = (weekController || []).filter(
    (row) =>
      !span ||
      isAcademicMonth(span, Number(row.year), Number(row.month))
  );
  const controllerWeeks = controllerRows.map((row) => String(row.week_start).slice(0, 10));
  return {
    ...data,
    weeks: [...new Set([...(data.weeks || []), ...controllerWeeks])].sort(),
    coin_weeks: [...new Set([...(data.coin_weeks || []), ...controllerWeeks])],
    week_controller: controllerRows,
  };
};

/**
 * Open a week for scoring. The server creates its controller row; no zero-valued coin rows are
 * inserted, so the scoring rules supply each class's full weekly entitlement by default.
 *
 * @param {string} weekStart - 'YYYY-MM-DD' Monday of the week to load
 */
export const refillWeek = async (weekStart) => {
  const { data, error } = await supabase.rpc('refill_discipline_week', { p_week_start: weekStart });
  if (error) fail(error, 'Could not open the discipline week');
  return data || null;
};

/**
 * The academic months of an academic year, read from academic_calendar. This is the fallback for a
 * get_discipline_year_data that does not carry the months yet: the picker then still lists the
 * year's own months rather than whatever weeks happen to exist. A failure here is not fatal - the
 * caller falls back further - so it returns an empty list instead of throwing.
 */
export const fetchAcademicMonths = async (ay) => {
  const span = academicYearSpan(ay);
  if (!span) return [];

  const { data, error } = await supabase
    .from('academic_calendar')
    .select('year,month')
    .in('year', [span.startYear, span.endYear]);
  if (error) return [];

  return (data || []).filter((row) => isAcademicMonth(span, row.year, row.month));
};

/**
 * Record coins. One increment per call.
 *
 * @param {Object} args
 * @param {number} args.classId
 * @param {number} args.categoryId - a discipline, or the silver/golden appreciation category
 * @param {number} [args.teacherId] - required by the server for deductions and silver coins
 * @param {number} [args.coins] - omit to use the category rule (coins_per_incident, or 1)
 * @param {string} [args.weekStart] - 'YYYY-MM-DD'; omit for the current week
 */
export const logCoins = async ({ classId, categoryId, teacherId = null, coins = null, weekStart = null }) => {
  const { data, error } = await supabase.rpc('log_discipline_coins', {
    p_class_id: classId,
    p_category_id: categoryId,
    p_teacher_id: teacherId,
    p_coins: coins,
    p_week_start: weekStart,
  });
  if (error) fail(error, 'Could not save the coins');
  return data || null;
};

/** Correct a counter (negative delta allowed, clamped at zero on the server). */
export const adjustCoins = async ({ classId, categoryId, delta, teacherId = null, weekStart = null }) => {
  const { data, error } = await supabase.rpc('adjust_discipline_coins', {
    p_class_id: classId,
    p_category_id: categoryId,
    p_delta: delta,
    p_teacher_id: teacherId,
    p_week_start: weekStart,
  });
  if (error) fail(error, 'Could not correct the coins');
  return data || null;
};

/** Persist the accepted recommendation by discipline and class names. */
export const saveDisciplineRecommendation = async ({ weekStart, shieldDecision }) => {
  const { data, error } = await supabase.rpc('save_discipline_week_recommendation', {
    p_week_start: weekStart,
    p_shield_decision: shieldDecision,
  });
  if (error) fail(error, 'Could not save the discipline recommendation');
  return data || null;
};

/** Discipline configuration (entitlement, shields per week, red-zone threshold, coin art). */
export const updateCategory = async (id, patch) => {
  const { data, error } = await supabase
    .from('discipline_categories')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  if (error) fail(error, 'Could not update the discipline');
  return data?.[0] || null;
};

/** Scoring weights and the programme overrides. */
export const updateSettings = async (patch) => {
  const { data, error } = await supabase
    .from('discipline_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select();
  if (error) fail(error, 'Could not update the settings');
  return data?.[0] || null;
};

export default {
  fetchDisciplineYear,
  fetchAcademicMonths,
  refillWeek,
  logCoins,
  adjustCoins,
  saveDisciplineRecommendation,
  updateCategory,
  updateSettings,
};
