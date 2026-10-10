// src/utils/timetablePublishSafety.js
/**
 * Pure helpers that keep destructive timetable writes from losing data.
 *
 * Two jobs:
 *  1. Work out everything that could make a write fail BEFORE anything is deleted, so a broken or
 *     stale draft can never leave the live timetable empty.
 *  2. Reconcile class_assignments without ever removing a row the draft cannot be shown to have
 *     replaced.
 *
 * Kept free of React and Supabase so the rules are unit testable.
 */

/**
 * An id that exists in the database, as opposed to one minted locally while offline.
 * NaN and blank values are rejected too: JSON has no NaN, so serialising one would send null and
 * trip a NOT NULL/FK constraint part-way through a replace.
 */
export const isRealId = (v) =>
  v !== null &&
  v !== undefined &&
  !(typeof v === 'number' && !Number.isFinite(v)) &&
  !(typeof v === 'string' && v.trim() === '') &&
  !String(v).startsWith('local-');

export const tripleKey = (classId, teacherId, subjectId) => `${classId}|${teacherId}|${subjectId}`;

/** The mapping triples a set of slots implies, i.e. the rows the timetable genuinely needs. */
export const slotTriples = (slots = []) => {
  const keys = new Set();
  slots.forEach((s) => {
    if (isRealId(s.class_id) && isRealId(s.teacher_id) && isRealId(s.subject_id)) {
      keys.add(tripleKey(s.class_id, s.teacher_id, s.subject_id));
    }
  });
  return keys;
};

/**
 * Strip database-generated columns from saved rows so they can be re-inserted to undo a failed
 * replace. Lets a failed write be a no-op instead of lost data.
 */
export const restorableRows = (rows = []) => rows.map(({ id, created_at, ...rest }) => rest);

/**
 * Replace the live timetable slots, restoring the previous rows if the insert fails.
 *
 * PostgREST cannot run a delete and an insert in one transaction, so a failed insert would leave
 * the timetable empty. The previous rows are therefore put back on failure, which makes a failed
 * replace a no-op. The client is injected so this can be tested without a database.
 *
 * @param {Object} input
 * @param {{from: Function}} input.client - Supabase client
 * @param {Array} input.slotRows - rows to write
 * @param {Array} input.previousRows - rows currently stored, used to undo a failed replace
 */
export async function replaceLiveSlots({ client, slotRows, previousRows = [] }) {
  const { error: delErr } = await client.from('timetable_slots').delete().gt('id', 0);
  if (delErr) throw new Error(`timetable_slots - ${delErr.message}`);

  const { error: insErr } = await client.from('timetable_slots').insert(slotRows);
  if (!insErr) return;

  const restoreRows = restorableRows(previousRows);
  if (restoreRows.length > 0) {
    const { error: restoreErr } = await client.from('timetable_slots').insert(restoreRows);
    if (restoreErr) {
      throw new Error(
        `timetable_slots - ${insErr.message}; the previous timetable could not be restored either (${restoreErr.message})`
      );
    }
    throw new Error(
      `timetable_slots - ${insErr.message}. The previous timetable was restored, so nothing changed.`
    );
  }

  throw new Error(
    `timetable_slots - ${insErr.message}. The table was empty before the replace, so nothing was lost.`
  );
}

/**
 * Replace one teacher's subject capability, restoring the previous rows if the insert fails.
 * Same reasoning as replaceLiveSlots: the delete and the insert are separate requests, so a
 * failure between them would otherwise leave that teacher with no subjects at all.
 *
 * @param {Object} input
 * @param {{from: Function}} input.client - Supabase client
 * @param {*} input.teacherId
 * @param {Array} input.subjectIds - subjects the teacher should end up able to teach
 * @param {Array} input.previousRows - that teacher's rows as currently stored
 */
export async function replaceTeacherSubjects({ client, teacherId, subjectIds = [], previousRows = [] }) {
  const { error: delErr } = await client.from('map_teacher_subject').delete().eq('teacher_id', teacherId);
  if (delErr) throw new Error(`map_teacher_subject - ${delErr.message}`);

  if (subjectIds.length === 0) return;

  const { error: insErr } = await client
    .from('map_teacher_subject')
    .insert(subjectIds.map((subject_id) => ({ teacher_id: teacherId, subject_id })));
  if (!insErr) return;

  const restoreRows = restorableRows(previousRows);
  if (restoreRows.length > 0) {
    const { error: restoreErr } = await client.from('map_teacher_subject').insert(restoreRows);
    if (restoreErr) {
      throw new Error(
        `map_teacher_subject - ${insErr.message}; that teacher's previous subjects could not be restored either (${restoreErr.message})`
      );
    }
    throw new Error(
      `map_teacher_subject - ${insErr.message}. That teacher's previous subjects were restored, so nothing changed.`
    );
  }

  throw new Error(
    `map_teacher_subject - ${insErr.message}. That teacher had no subjects before, so nothing was lost.`
  );
}

/**
 * Slots are unique per (class_id, day, period_id). A duplicate would abort the bulk insert after
 * the delete has already run, so collapse them first (last wins, matching the app's upsert).
 */
export function dedupeSlots(slots = []) {
  const byKey = new Map();
  slots.forEach((s) => byKey.set(`${s.class_id}|${s.day}|${s.period_id}`, s));
  return [...byKey.values()];
}

/**
 * Ids referenced by slots/assignments that no longer exist in the database.
 * @param {Object} input
 * @param {{class?:Array, subject?:Array, period?:Array, teacher?:Array}} input.existing
 * @param {Array} [input.slots] - slots being written (class_id / period_id / subject_id / teacher_id)
 * @param {Array} [input.assignments] - declared mappings (class_id / teacher_id / subject_id)
 * @param {Array} [input.declarations] - loose id references, e.g. the entity lists in an import file
 * @returns {{class: Set, subject: Set, period: Set, teacher: Set}}
 */
export function findMissingReferences({
  existing = {},
  slots = [],
  assignments = [],
  declarations = [],
} = {}) {
  const missing = { class: new Set(), subject: new Set(), period: new Set(), teacher: new Set() };
  const known = {
    class: new Set((existing.class || []).map(String)),
    subject: new Set((existing.subject || []).map(String)),
    period: new Set((existing.period || []).map(String)),
    teacher: new Set((existing.teacher || []).map(String)),
  };

  const check = (kind, value) => {
    if (!isRealId(value)) return; // local-only ids are never written to the database
    if (!known[kind].has(String(value))) missing[kind].add(String(value));
  };

  slots.forEach((s) => {
    check('class', s.class_id);
    check('period', s.period_id);
    check('subject', s.subject_id);
    check('teacher', s.teacher_id);
  });
  assignments.forEach((a) => {
    check('class', a.class_id);
    check('subject', a.subject_id);
    check('teacher', a.teacher_id);
  });
  declarations.forEach((d) => {
    check('class', d.class_id);
    check('subject', d.subject_id);
    check('period', d.period_id);
    check('teacher', d.teacher_id);
  });

  return missing;
}

/** Human-readable summary of findMissingReferences output; empty string when nothing is missing. */
export function describeMissingReferences(missing) {
  return Object.entries(missing || {})
    .filter(([, set]) => set.size > 0)
    .map(([kind, set]) => `${set.size} ${kind}(s) [${[...set].slice(0, 5).join(', ')}]`)
    .join('; ');
}

/**
 * Reconcile class_assignments with a published draft.
 *
 * `intended` is every triple the draft's slots imply plus every mapping the draft declares; those
 * are ensured (additively, so nothing is dropped).
 *
 * Deletion is deliberately narrow: only rows whose triple the SUPERSEDED live timetable itself
 * implied can be removed, and only when the draft no longer implies them. Such a row is provably
 * obsolete once that timetable is gone. A row that no slot ever implied was declared by hand, and
 * a draft's silence about it merely means the draft is older than the declaration - so it is kept.
 * That is what stops a stale draft from deleting a mapping created after its snapshot.
 *
 * @returns {{idsToDelete: Array<*>, rowsToEnsure: Array<{class_id:*,teacher_id:*,subject_id:*}>}}
 */
export function reconcileClassAssignments({
  liveAssignments = [],
  slots = [],
  declaredAssignments = [],
  previousSlots = [],
} = {}) {
  const intended = new Map();
  const add = (classId, teacherId, subjectId) => {
    if (!isRealId(classId) || !isRealId(teacherId) || !isRealId(subjectId)) return;
    const key = tripleKey(classId, teacherId, subjectId);
    if (!intended.has(key)) {
      intended.set(key, { class_id: classId, teacher_id: teacherId, subject_id: subjectId });
    }
  };

  slots.forEach((s) => add(s.class_id, s.teacher_id, s.subject_id));
  declaredAssignments.forEach((a) => add(a.class_id, a.teacher_id, a.subject_id));

  const superseded = slotTriples(previousSlots);
  const idsToDelete = liveAssignments
    .filter((row) => {
      const key = tripleKey(row.class_id, row.teacher_id, row.subject_id);
      return superseded.has(key) && !intended.has(key);
    })
    .map((row) => row.id);

  return { idsToDelete, rowsToEnsure: [...intended.values()] };
}

export default {
  isRealId,
  tripleKey,
  slotTriples,
  restorableRows,
  replaceLiveSlots,
  replaceTeacherSubjects,
  dedupeSlots,
  findMissingReferences,
  describeMissingReferences,
  reconcileClassAssignments,
};
