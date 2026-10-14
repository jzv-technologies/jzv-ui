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

const fail = (error, context) => {
  throw new Error(error?.message ? `${context}: ${error.message}` : context);
};

/** Whole-year payload, used to build every tab. */
export const fetchDisciplineYear = async (ay = null) => {
  const { data, error } = await supabase.rpc('get_discipline_year_data', { p_ay: ay });
  if (error) fail(error, 'Could not load the discipline scorecard');
  return data || null;
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

/**
 * Finalise a discipline's shields for a week.
 *
 * A discipline can hand out more than one shield, so the management's choice is stored as a set: the
 * chosen classes replace whatever was stored for that discipline before (an empty list clears it and
 * hands the decision back to the criteria).
 */
export const replaceShieldDecisions = async ({ weekStart, categoryId, classIds = [], note = null }) => {
  const chosen = [...new Set((classIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)))];

  const { error: deleteError } = await supabase
    .from('discipline_shield_decisions')
    .delete()
    .eq('week_start', weekStart)
    .eq('category_id', categoryId);
  if (deleteError) fail(deleteError, 'Could not update the shield decision');

  if (chosen.length === 0) return [];

  const { data, error } = await supabase
    .from('discipline_shield_decisions')
    .insert(chosen.map((classId) => ({ week_start: weekStart, category_id: categoryId, class_id: classId, note })))
    .select();
  if (error) fail(error, 'Could not save the shield decision');
  return data || [];
};

/** A management decision for a shield the filter criteria could not settle. */
export const setShieldDecision = async ({ weekStart, categoryId, classId, note = null }) => {
  const { data, error } = await supabase
    .from('discipline_shield_decisions')
    .upsert(
      { week_start: weekStart, category_id: categoryId, class_id: classId, note },
      { onConflict: 'week_start,category_id,class_id' }
    )
    .select();
  if (error) fail(error, 'Could not save the shield decision');
  return data?.[0] || null;
};

/** Undo a management decision so the criteria decide again. */
export const clearShieldDecision = async ({ weekStart, categoryId, classId = null }) => {
  let query = supabase
    .from('discipline_shield_decisions')
    .delete()
    .eq('week_start', weekStart)
    .eq('category_id', categoryId);
  if (classId != null) query = query.eq('class_id', classId);
  const { error } = await query;
  if (error) fail(error, 'Could not clear the shield decision');
  return true;
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
  logCoins,
  adjustCoins,
  setShieldDecision,
  replaceShieldDecisions,
  clearShieldDecision,
  updateCategory,
  updateSettings,
};
