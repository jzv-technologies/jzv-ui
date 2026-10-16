/**
 * Student Discipline - scoring engine.
 *
 * This module is the ONLY place that turns stored coin counters into scores. It is deliberately
 * pure (no Supabase, no React) so the rules can be unit tested against the school's reference
 * sheet; see scripts/test-discipline-scoring.mjs.
 *
 * What the database stores: a running total of coins taken per class x discipline x week
 *   (discipline_weekly_coins) and per teacher x week (discipline_teacher_coins), plus accepted shield
 *   recommendations from discipline_week_controller. Everything below is derived -
 * no balances, points, red zones or shields are stored.
 *
 * The two appreciation coins are rows in the category list with coin_kind 'silver' / 'golden', so
 * one table carries the disciplines and both appreciation coins.
 *
 * Rules (confirmed with the school):
 *   - Every class starts each week with `weekly_coins` per discipline (10, and 20 for Language
 *     Excellence). Taking a coin takes ONE coin - there is no per-incident amount.
 *   - Coins left are never negative, and a coin that has been taken stays taken unless a
 *     management/coordinator user puts it back.
 *   - A "red zone" is a discipline left with `red_zone_threshold` (4) coins or fewer: the cell is
 *     shown red and costs `red_zone_penalty` (5) points.
 *   - Points: coins left x coin_points, plus silver coins x silver_coin_points, plus golden coins x
 *     golden_coin_points, minus the red-zone penalty.
 *   - `previousTotal` includes only earlier, non-ignored weeks in the same month. Academic-year
 *     totals are accumulated separately for year awards.
 *   - A week is identified by its Monday, `week_start` (a plain date - there is no weeks table).
 *   - Shields: each discipline awards `shields_count` shields (2, or 3 for Language Excellence).
 */

export const DEFAULT_SETTINGS = {
  silver_coin_points: 3,
  golden_coin_points: 30,
  red_zone_penalty: 5,
  week_start_dow: 1,
  max_shields_per_class: 2,
};

export const COIN_KIND = {
  DISCIPLINE: 'discipline',
  SILVER: 'silver',
  GOLDEN: 'golden',
};

/** The week identifier: the Monday of the week containing `date`, as 'YYYY-MM-DD'. */
export const weekStartOf = (date = new Date()) => {
  const d =
    date instanceof Date ? new Date(date.getTime()) : new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const dow = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (dow - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

/**
 * The month a week belongs to, as 'YYYY-MM', taken from the week's Monday - which is what decides
 * both the month a scorecard is shown under and the month's week list.
 */
export const monthKeyOf = (weekStart) => {
  const iso = String(weekStart ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.slice(0, 7) : null;
};

/**
 * Which week of its own month a week is: the Monday on the 1st-7th is W1, the 8th-14th W2, and so
 * on. Weeks are counted from the month the Monday falls in, never from a week that straddles two.
 */
export const weekOfMonth = (weekStart) => {
  const day = Number(String(weekStart ?? '').slice(8, 10));
  if (!Number.isFinite(day) || day < 1 || day > 31) return 1;
  return Math.floor((day - 1) / 7) + 1;
};

/** The month an academic year opens in: the same June rule the academic year label is built on. */
export const ACADEMIC_START_MONTH = 6;

/**
 * The two calendar years an academic year label covers: '2026-27' -> start 2026, end 2027. Both
 * '2026-27' and a bare '2026' are accepted (the year falls back to a June-to-May span); anything
 * that is not an academic year label has no derivable span.
 */
export const academicYearSpan = (ay) => {
  const match = String(ay ?? '')
    .trim()
    .match(/^(\d{4})(?:-(\d{2}|\d{4}))?$/);
  if (!match) return null;

  const startYear = Number(match[1]);
  if (!match[2]) return { startYear, endYear: startYear + 1 };

  const endYear =
    match[2].length === 4
      ? Number(match[2])
      : Math.floor((startYear + 1) / 100) * 100 + Number(match[2]);
  return endYear > startYear ? { startYear, endYear } : { startYear, endYear: startYear + 1 };
};

/** Does a calendar month fall inside that academic year (June..December, then January..May)? */
export const isAcademicMonth = (span, year, month) => {
  if (!span) return false;
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return false;
  return (
    (y === span.startYear && m >= ACADEMIC_START_MONTH) ||
    (y === span.endYear && m < ACADEMIC_START_MONTH)
  );
};

/** Every month of an academic year, in sequence: '2026-27' -> June 2026 through May 2027. */
export const academicMonthsForAy = (ay) => {
  const span = academicYearSpan(ay);
  if (!span) return [];

  const months = [];
  for (let month = ACADEMIC_START_MONTH; month <= 12; month += 1) {
    months.push({ year: span.startYear, month });
  }
  for (let month = 1; month < ACADEMIC_START_MONTH; month += 1) {
    months.push({ year: span.endYear, month });
  }
  return months;
};

/** Split the category list into disciplines and the two appreciation coins. */
export const splitCategories = (categories = []) => ({
  disciplines: categories.filter((c) => (c.coin_kind || COIN_KIND.DISCIPLINE) === COIN_KIND.DISCIPLINE),
  silver: categories.find((c) => c.coin_kind === COIN_KIND.SILVER) || null,
  golden: categories.find((c) => c.coin_kind === COIN_KIND.GOLDEN) || null,
});

/**
 * Weekly balances for one class: what each discipline has left after its recorded deductions.
 *
 * @param {Array} categories - the full list (disciplines and appreciation coins)
 * @param {Array} rows - coin rows for this class/week: { category_id, coins }
 */
export const computeCategoryBalances = (categories, rows = []) => {
  const { disciplines } = splitCategories(categories);
  const deducted = {};
  const balances = {};
  const redCodes = [];
  let totalCoins = 0;
  let totalDeducted = 0;

  disciplines.forEach((category) => {
    const taken = rows
      .filter((r) => String(r.category_id) === String(category.id))
      .reduce((sum, r) => sum + Number(r.coins || 0), 0);

    const remaining = Math.max(0, Number(category.weekly_coins ?? 10) - taken);

    deducted[category.code] = taken;
    balances[category.code] = remaining;
    totalCoins += remaining;
    totalDeducted += taken;

    if (remaining <= Number(category.red_zone_threshold ?? 4)) {
      redCodes.push(category.code);
    }
  });

  return {
    balances,
    deducted,
    totalCoins,
    totalDeducted,
    redZones: redCodes.length,
    redCodes,
  };
};

/** Silver (teacher) and golden (management) coins recorded against a class in a week. */
export const sumAppreciationCoins = (categories, rows = []) => {
  const { silver, golden } = splitCategories(categories);
  const sumFor = (category) =>
    category
      ? rows
          .filter((r) => String(r.category_id) === String(category.id))
          .reduce((sum, r) => sum + Number(r.coins || 0), 0)
      : 0;

  return { silverCoins: sumFor(silver), goldenCoins: sumFor(golden) };
};

/**
 * Week points for one class. Mirrors the reference sheet:
 *   This Week Points = coins left + silver x silver_coin_points + golden x golden_coin_points
 *                      - red zones x red_zone_penalty
 */
export const computeWeekPoints = ({ totalCoins, silverCoins, goldenCoins, redZones }, settings) => {
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  return (
    Number(totalCoins || 0) +
    Number(silverCoins || 0) * Number(s.silver_coin_points) +
    Number(goldenCoins || 0) * Number(s.golden_coin_points) -
    Number(redZones || 0) * Number(s.red_zone_penalty)
  );
};

/**
 * Score one week for one class.
 *
 * @param {Object} args
 * @param {Object} args.classRow - { id, name, programme, strength }
 * @param {Array} args.categories
 * @param {Array} args.rows - coin rows for this class's week: { category_id, coins }
 * @param {number} args.previousTotal - accumulated points from earlier weeks
 * @param {Object} args.settings
 */
export const scoreClassWeek = ({ classRow, categories, rows = [], previousTotal = 0, settings }) => {
  const balance = computeCategoryBalances(categories, rows);
  const { silverCoins, goldenCoins } = sumAppreciationCoins(categories, rows);
  const weekPoints = computeWeekPoints(
    { totalCoins: balance.totalCoins, silverCoins, goldenCoins, redZones: balance.redZones },
    settings
  );

  return {
    classId: classRow.id,
    className: classRow.name,
    programme: classRow.programme || null,
    strength: Number(classRow.strength || 0),
    balances: balance.balances,
    deducted: balance.deducted,
    redCodes: balance.redCodes,
    totalCoins: balance.totalCoins,
    totalDeducted: balance.totalDeducted,
    silverCoins,
    goldenCoins,
    redZones: balance.redZones,
    weekPoints,
    previousTotal: Number(previousTotal || 0),
    totalPoints: Number(previousTotal || 0) + weekPoints,
  };
};

/**
 * Score every class for one week.
 *
 * @param {Object} args
 * @param {Array} args.classes
 * @param {Array} args.categories
 * @param {Array} args.coins - coin rows for this week: { class_id, category_id, coins }
 * @param {Object} args.previousTotals - { [classId]: points } accumulated before this week
 * @param {Object} args.settings
 */
export const scoreWeek = ({ classes, categories, coins = [], previousTotals = {}, settings }) => {
  const rows = (classes || []).map((classRow) =>
    scoreClassWeek({
      classRow,
      categories,
      rows: coins.filter((c) => String(c.class_id) === String(classRow.id)),
      previousTotal: previousTotals[String(classRow.id)] || 0,
      settings,
    })
  );

  return {
    rows,
    byClass: rows.reduce((acc, r) => {
      acc[String(r.classId)] = r;
      return acc;
    }, {}),
  };
};

/**
 * Best value per discipline in a week - the sheet's green cells.
 * @returns {Object} { [categoryCode]: { value, classIds } } (ties report every class)
 */
export const findRowMaxima = (rows, categories) => {
  const { disciplines } = splitCategories(categories);
  const result = {};

  disciplines.forEach((category) => {
    let best = -1;
    let classIds = [];
    (rows || []).forEach((row) => {
      const value = Number(row.balances?.[category.code] ?? 0);
      if (value > best) {
        best = value;
        classIds = [row.classId];
      } else if (value === best) {
        classIds.push(row.classId);
      }
    });
    result[category.code] = { value: best < 0 ? 0 : best, classIds };
  });

  return result;
};

export const FILTER_LABELS = {
  MAX_COINS: 'Highest coins in this discipline',
  FILTER_I: 'Filter I - class already holds more than the allowed shields this week',
  FILTER_II: 'Filter II - class has a red zone',
  FILTER_III: 'Filter III - class has 0 coins in a discipline',
  FILTER_IV: 'Filter IV - highest teacher coin count',
  FILTER_V: 'Filter V - highest total coin count',
  FILTER_VI: 'Filter VI - highest class strength',
  DECISION: 'Decided by the management',
  RECOMMENDED: 'Recommended - the criteria could not separate these classes',
  CAP_RELAXED: 'Cap relaxed - no other class is left to take the shield',
  NEXT_BEST: 'Next best class - the discipline has more shields than classes',
  FALLBACK: 'Fallback - lowest class id (all criteria equal)',
};

/** FILTER I..VI in the order the school lists them. */
export const FILTER_STEPS = [
  {
    key: 'FILTER_I',
    label: FILTER_LABELS.FILTER_I,
    test: (row, ctx) => Number(row.shieldsHeld || 0) < Number(ctx.maxShieldsPerClass),
  },
  { key: 'FILTER_II', label: FILTER_LABELS.FILTER_II, test: (row) => Number(row.redZones || 0) === 0 },
  {
    key: 'FILTER_III',
    label: FILTER_LABELS.FILTER_III,
    test: (row, ctx) =>
      ctx.disciplineCodes.every((code) => Number(row.balances?.[code] || 0) > 0),
  },
  { key: 'FILTER_IV', label: FILTER_LABELS.FILTER_IV, maxOf: (row) => Number(row.silverCoins || 0) },
  { key: 'FILTER_V', label: FILTER_LABELS.FILTER_V, maxOf: (row) => Number(row.totalCoins || 0) },
  { key: 'FILTER_VI', label: FILTER_LABELS.FILTER_VI, maxOf: (row) => Number(row.strength || 0) },
];

/**
 * Narrow a tied group with the school's filter criteria.
 *
 * The criteria act as AND conditions: each one is applied to the group still standing, so they
 * accumulate. A criterion that would eliminate every remaining class is RELAXED (skipped) rather
 * than left with nothing, and the next criterion is tried - the school always wants a champion from
 * the tie if one can be derived.
 *
 * The criteria are only tie-breakers, so the narrowing STOPS as soon as as many classes are left as
 * there are places to fill (`options.stopAt`): applying another criterion then would discard a class
 * that is entitled to a place, which is how a discipline used to award fewer shields than it owes.
 *
 * @param {Array} candidates - the tied group
 * @param {Object} context - { maxShieldsPerClass, disciplineCodes }
 * @param {Object} [options]
 * @param {Array} [options.skip] - filter keys to ignore
 * @param {number} [options.stopAt] - stop once this many candidates are left (default 1)
 * @returns {{ surviving: Array, applied: Array, relaxed: Array }}
 */
export const applyFilters = (candidates, context, options = {}) => {
  const skip = new Set(options.skip || []);
  const stopAt = Math.max(1, Number(options.stopAt ?? 1));
  let survivors = [...candidates];
  const applied = [];
  const relaxed = [];

  for (const step of FILTER_STEPS) {
    if (skip.has(step.key)) continue;
    if (survivors.length <= stopAt) break;

    if (step.maxOf) {
      // "Highest of X" keeps the best `stopAt` values rather than only the single best: with two
      // places still open there is no reason to throw the runner-up away and then have to
      // recommend it back.
      const values = [...new Set(survivors.map((row) => Number(step.maxOf(row)) || 0))].sort(
        (a, b) => b - a
      );
      const cutoff = values[Math.min(stopAt, values.length) - 1];
      const next = survivors.filter((row) => (Number(step.maxOf(row)) || 0) >= cutoff);
      // A highest-of comparison always leaves at least one class, so it can never be relaxed away.
      if (next.length < survivors.length) {
        survivors = next;
        applied.push(step.label);
      }
      continue;
    }

    const filtered = survivors.filter((row) => step.test(row, context));
    if (filtered.length === 0) {
      relaxed.push(step.label);
      continue;
    }
    if (filtered.length < survivors.length) {
      survivors = filtered;
      applied.push(step.label);
    }
  }

  return { surviving: survivors, applied, relaxed };
};

/** The classes in the running for a discipline's shields, best first. */
const rankCandidates = (rows, category) =>
  (rows || [])
    .filter((row) => row.balances?.[category.code] !== undefined)
    .map((row) => ({ row, coins: Number(row.balances[category.code] || 0) }))
    .sort((a, b) => b.coins - a.coins || Number(a.row.classId) - Number(b.row.classId));

/** The stored management decisions for one discipline and week. */
const decisionsFor = (decisions, weekStart, categoryId) =>
  (decisions || [])
    .filter(
      (d) =>
        String(d.week_start).slice(0, 10) === String(weekStart).slice(0, 10) &&
        String(d.category_id) === String(categoryId)
    )
    .sort((a, b) => Number(a.class_id) - Number(b.class_id));

/**
 * Rank a tied group by the filter criteria read as PREFERENCES rather than as filters.
 *
 * When no criterion can separate the classes the school still wants a suggestion it can confirm, so
 * the criteria become an order of merit: no red zone first, then the most silver coins, the most
 * coins overall and the largest class - and finally the lowest id, so the answer never wobbles
 * between two identical refreshes.
 */
const rankByPreference = (rows) =>
  [...rows].sort(
    (a, b) =>
      Number(a.redZones || 0) - Number(b.redZones || 0) ||
      Number(b.silverCoins || 0) - Number(a.silverCoins || 0) ||
      Number(b.totalCoins || 0) - Number(a.totalCoins || 0) ||
      Number(b.strength || 0) - Number(a.strength || 0) ||
      Number(a.classId) - Number(b.classId)
  );

/** The tie payload the UI needs to show a recommendation and take the management's call. */
const buildPending = ({
  category,
  rows,
  coins,
  placesToConfirm,
  recommendedIds,
  applied,
  relaxed,
  exhausted,
}) => ({
  categoryId: category.id,
  categoryCode: category.code,
  categoryName: category.name,
  coins,
  placesToConfirm,
  applied,
  relaxed,
  filtersExhausted: exhausted,
  recommendedIds: (recommendedIds || []).map(String),
  candidates: rankByPreference(rows).map((row) => ({
    classId: row.classId,
    className: row.className,
    coins,
    silverCoins: Number(row.silverCoins || 0),
    totalCoins: Number(row.totalCoins || 0),
    redZones: Number(row.redZones || 0),
    strength: Number(row.strength || 0),
    shieldsHeld: Number(row.shieldsHeld || 0),
  })),
});

/**
 * Award one discipline's shields.
 *
 * Every place the discipline is entitled to (shields_count) is filled: first from the management's
 * stored decisions, then by coins left, and - when a tie survives every criterion - with the
 * criteria's own recommendation, marked `_provisional`. A provisional shield IS shown and
 * highlighted, so a discipline never silently awards fewer shields than it owes, but the discipline
 * stays `pending` until a management user confirms or replaces those classes.
 */
export const selectDisciplineShields = ({
  rows,
  category,
  categories,
  shieldCounts = {},
  decisions = [],
  weekStart,
  maxShieldsPerClass = 2,
}) => {
  const places = Math.max(0, Number(category.shields_count ?? 2));
  const ranked = rankCandidates(rows, category);
  const disciplineCodes = splitCategories(categories).disciplines.map((c) => c.code);

  if (places === 0 || ranked.length === 0) {
    return { winners: [], pending: null, notes: [] };
  }

  const cap = Number(maxShieldsPerClass);
  const context = { maxShieldsPerClass: cap, disciplineCodes };
  const winners = [];
  const notes = [];
  const held = (row) => Number(shieldCounts[String(row.classId)] || 0);
  const byClassId = new Map(ranked.map((entry) => [String(entry.row.classId), entry]));

  // The management's call is placed first; the remaining places are still filled by the rules. A
  // decision settles one place, it does not switch the discipline off.
  const decidedIds = new Set();
  decisionsFor(decisions, weekStart, category.id).forEach((decision) => {
    if (decidedIds.size >= places) return;
    const key = String(decision.class_id);
    const entry = byClassId.get(key);
    if (!entry || decidedIds.has(key)) return;
    decidedIds.add(key);
    winners.push({ ...entry.row, _coins: entry.coins, _reason: FILTER_LABELS.DECISION });
  });
  if (decidedIds.size > 0) {
    notes.push({
      type: 'decision',
      text: `${category.name}: ${decidedIds.size} shield${decidedIds.size === 1 ? '' : 's'} decided by the management`,
    });
  }

  let cursor = 0;

  while (winners.length < places && cursor < ranked.length) {
    const groupCoins = ranked[cursor].coins;
    const group = [];
    let scan = cursor;
    while (scan < ranked.length && ranked[scan].coins === groupCoins) {
      group.push(ranked[scan]);
      scan += 1;
    }
    cursor = scan;

    // A class that already holds a decided shield has been placed and cannot take another.
    const eligible = group.filter((entry) => !decidedIds.has(String(entry.row.classId)));
    if (eligible.length === 0) continue;

    // FILTER I is a cap, not a tie-breaker: a class that already holds its share steps aside. If it
    // would remove EVERY class on this coin count, the filter is relaxed instead (the school's rule:
    // relax from the top down rather than end up with no champion).
    const withinCap = eligible.filter((entry) => held(entry.row) < cap);
    let pool = withinCap;
    if (pool.length === 0) {
      pool = eligible;
      notes.push({
        type: 'filter',
        text: `${category.name}: FILTER I relaxed - every class on ${groupCoins} coins already holds ${cap} shields`,
      });
    } else if (withinCap.length < eligible.length) {
      const stepped = eligible.length - withinCap.length;
      notes.push({
        type: 'filter',
        text: `${category.name}: FILTER I stood down ${stepped} class${stepped > 1 ? 'es' : ''} already holding ${cap} shields`,
      });
    }

    if (pool.length <= places - winners.length) {
      pool.forEach((entry) =>
        winners.push({ ...entry.row, _coins: entry.coins, _reason: FILTER_LABELS.MAX_COINS })
      );
      continue;
    }

    // More classes share this coin count than there are places left, so the remaining criteria
    // (FILTER II..VI, as AND conditions) must separate them. They are told how many places are open
    // so they stop as soon as that many classes are left - a criterion must never discard a class
    // that is entitled to a place, which is how a discipline used to award fewer shields than it
    // owes.
    const tied = pool.map((entry) => ({ ...entry.row, shieldsHeld: held(entry.row) }));
    const left = places - winners.length;
    const { surviving, applied, relaxed } = applyFilters(tied, context, {
      skip: ['FILTER_I'],
      stopAt: left,
    });

    applied.forEach((label) => notes.push({ type: 'filter', text: `${category.name}: ${label}` }));
    relaxed.forEach((label) =>
      notes.push({ type: 'filter', text: `${category.name}: ${label} relaxed` })
    );

    const survivorIds = new Set(surviving.map((row) => String(row.classId)));
    if (surviving.length <= left) {
      const reason = applied.length > 0 ? applied[applied.length - 1] : FILTER_LABELS.MAX_COINS;
      surviving.forEach((row) => winners.push({ ...row, _coins: groupCoins, _reason: reason }));

      // The criteria picked FEWER classes than the discipline has shields. The rest of the tie is
      // recommended so the discipline still hands out every shield it owes.
      const spilled = tied.filter((row) => !survivorIds.has(String(row.classId)));
      const recommended = rankByPreference(spilled).slice(0, places - winners.length);
      if (recommended.length === 0) continue;

      recommended.forEach((row) =>
        winners.push({
          ...row,
          _coins: groupCoins,
          _reason: FILTER_LABELS.RECOMMENDED,
          _provisional: true,
        })
      );
      notes.push({
        type: 'pending',
        text: `${category.name}: ${recommended.length} shield${recommended.length === 1 ? '' : 's'} recommended - confirm in Shields & Cups`,
      });
      return {
        winners,
        pending: buildPending({
          category,
          rows: tied,
          coins: groupCoins,
          placesToConfirm: recommended.length,
          recommendedIds: recommended.map((row) => row.classId),
          applied,
          relaxed,
          exhausted: false,
        }),
        notes,
      };
    }

    // Even after relaxing, the criteria cannot pick between them: order the tie by the criteria as
    // preferences, show the top ones as the system's recommendation, and leave the discipline
    // pending so the management can confirm or replace them.
    const recommended = rankByPreference(surviving).slice(0, left);
    recommended.forEach((row) =>
      winners.push({
        ...row,
        _coins: groupCoins,
        _reason: FILTER_LABELS.RECOMMENDED,
        _provisional: true,
      })
    );
    notes.push({ type: 'pending', text: `${category.name}: management decision needed` });

    return {
      winners,
      pending: buildPending({
        category,
        rows: tied,
        coins: groupCoins,
        placesToConfirm: left,
        recommendedIds: recommended.map((row) => row.classId),
        applied,
        relaxed,
        exhausted: surviving.length === tied.length,
      }),
      notes,
    };
  }

  // Every place is filled. When the coin groups and the shield cap run out before the discipline has
  // handed out all its shields, the remaining places go to the best of the rest - first to a class
  // with no shield in this discipline yet, then to one still under the cap, and only then by
  // relaxing the cap. The school's rule is to relax rather than end up with no champion.
  if (winners.length < places) {
    const heldNow = (row) =>
      held(row) + winners.filter((winner) => String(winner.classId) === String(row.classId)).length;
    const placedIds = new Set(winners.map((winner) => String(winner.classId)));

    const tiered = [
      ...ranked
        .filter((entry) => !placedIds.has(String(entry.row.classId)))
        .map((entry) => ({ ...entry.row, shieldsHeld: heldNow(entry.row), _tier: 0 })),
      ...ranked
        .filter((entry) => placedIds.has(String(entry.row.classId)))
        .map((entry) => ({ ...entry.row, shieldsHeld: heldNow(entry.row), _tier: 1 })),
    ];

    let awarded = 0;
    while (winners.length < places && awarded < places) {
      const preference = (a, b) =>
        // Spread the extra shields instead of piling a third on one class.
        a.shieldsHeld - b.shieldsHeld ||
        Number(a.redZones || 0) - Number(b.redZones || 0) ||
        Number(b.silverCoins || 0) - Number(a.silverCoins || 0) ||
        Number(b.totalCoins || 0) - Number(a.totalCoins || 0) ||
        Number(b.strength || 0) - Number(a.strength || 0) ||
        Number(a.classId) - Number(b.classId);

      const fresh = tiered.filter((row) => row._tier === 0).sort(preference);
      const repeats = tiered.filter((row) => row._tier === 1).sort(preference);

      // 1. a class that holds no shield in this discipline yet - even if it is already at the cap,
      //    because repeating a class here makes the scorecard show fewer shields than were awarded;
      // 2. otherwise a class that is still under the cap;
      // 3. otherwise the best repeat, with the cap relaxed.
      const next = fresh[0] || repeats.filter((row) => row.shieldsHeld < cap)[0] || repeats[0];
      if (!next) break;

      const overCap = next.shieldsHeld >= cap;
      winners.push({
        ...next,
        _coins: Number(next.balances?.[category.code] || 0),
        _reason: overCap ? FILTER_LABELS.CAP_RELAXED : FILTER_LABELS.NEXT_BEST,
      });
      next.shieldsHeld += 1;
      awarded += 1;
    }

    // Fewer classes than shields in the discipline: nothing to award, so it is reported plainly.
    if (winners.length < places) {
      notes.push({
        type: 'filter',
        text: `${category.name}: ${ranked.length} class${ranked.length === 1 ? '' : 'es'} have coins here, so ${
          places - winners.length
        } of ${places} shields cannot be awarded`,
      });
    }
  }

  return { winners, pending: null, notes };
};

/**
 * Award every discipline's shields for one week.
 *
 * Shields are awarded discipline by discipline so FILTER I can see what each class already holds.
 *
 * @param {Array} rows - scored rows for the week
 * @param {Array} categories - disciplines and the two appreciation coins
 * @param {Object} [options]
 * @param {Object} [options.settings]
 * @param {Array} [options.decisions] - stored management decisions
 * @param {string} [options.weekStart]
 * @returns {{ shields: Array, pending: Array, shieldCounts: Object, winnersByCategory: Object, notes: Array }}
 */
export const computeWeeklyShields = (rows, categories, options = {}) => {
  const { disciplines } = splitCategories(categories);
  const settings = { ...DEFAULT_SETTINGS, ...(options.settings || {}) };
  const maxShieldsPerClass = Number(
    options.maxShieldsPerClass ?? settings.max_shields_per_class ?? 2
  );

  const shields = [];
  const pending = [];
  const notes = [];
  const shieldCounts = {};
  const winnersByCategory = {};

  disciplines.forEach((category) => {
    const result = selectDisciplineShields({
      rows,
      category,
      categories,
      shieldCounts,
      decisions: options.decisions,
      weekStart: options.weekStart,
      maxShieldsPerClass,
    });

    winnersByCategory[String(category.id)] = result.winners;

    result.winners.forEach((winner) => {
      shields.push({
        categoryId: category.id,
        categoryCode: category.code,
        categoryName: category.name,
        classId: winner.classId,
        className: winner.className,
        value: winner._coins,
        filter: winner._reason,
        provisional: Boolean(winner._provisional),
      });
      shieldCounts[String(winner.classId)] = (shieldCounts[String(winner.classId)] || 0) + 1;
    });

    if (result.pending) pending.push(result.pending);
    notes.push(...result.notes);
  });

  return { shields, pending, shieldCounts, winnersByCategory, notes };
};

/**
 * Build recommendations using the rank-count rules first, then apply the cross-discipline filters
 * only to rank groups that contain more classes than open shield places.
 */
export const computeShieldRecommendations = (rows, categories) => {
  const disciplines = splitCategories(categories).disciplines
    .slice()
    .sort(
      (a, b) =>
        Number(a.display_order || 0) - Number(b.display_order || 0) ||
        Number(a.id) - Number(b.id)
    );
  const disciplineCodes = disciplines.map((category) => category.code);
  const shieldCounts = {};
  const winnersByCategory = {};
  const tieTasks = [];

  disciplines.forEach((category) => {
    const ranked = rankCandidates(rows, category);
    const places = Math.max(0, Number(category.shields_count ?? 2));
    const winners = [];
    winnersByCategory[String(category.id)] = winners;
    let cursor = 0;
    let remaining = places;

    while (remaining > 0 && cursor < ranked.length) {
      const coins = ranked[cursor].coins;
      const group = [];
      while (cursor < ranked.length && ranked[cursor].coins === coins) {
        group.push(ranked[cursor]);
        cursor += 1;
      }

      if (group.length > remaining) {
        tieTasks.push({ category, group, coins, remaining });
        break;
      }

      group.forEach(({ row }) => {
        winners.push({ ...row, _coins: coins, _rule5: false });
        const classKey = String(row.classId);
        shieldCounts[classKey] = (shieldCounts[classKey] || 0) + 1;
      });
      remaining -= group.length;
    }
  });

  const tieFrequency = {};
  tieTasks.forEach(({ group }) => {
    group.forEach(({ row }) => {
      const key = String(row.classId);
      tieFrequency[key] = (tieFrequency[key] || 0) + 1;
    });
  });

  tieTasks.sort(
    (a, b) =>
      a.group.length - b.group.length ||
      a.remaining - b.remaining ||
      Number(a.category.display_order || 0) - Number(b.category.display_order || 0) ||
      Number(a.category.id) - Number(b.category.id)
  );

  const pending = [];
  const notes = [];
  tieTasks.forEach(({ category, group, coins, remaining }) => {
    const candidates = group.map(({ row }) => ({
      ...row,
      shieldsHeld: Number(shieldCounts[String(row.classId)] || 0),
    }));
    const applied = new Set();
    const relaxed = new Set();
    const tieContext = { disciplineCodes };
    const criterionSteps = [
      {
        label: FILTER_LABELS.FILTER_I,
        filter: (candidate) => candidate.shieldsHeld <= 2,
      },
      {
        label: FILTER_LABELS.FILTER_II,
        filter: (candidate, current) => {
          const fewestRedZones = Math.min(...current.map((row) => Number(row.redZones || 0)));
          return Number(candidate.redZones || 0) === fewestRedZones;
        },
      },
      {
        label: FILTER_LABELS.FILTER_III,
        filter: (candidate, _current, context) =>
          context.disciplineCodes.every((code) => Number(candidate.balances?.[code] || 0) > 0),
      },
      {
        label: FILTER_LABELS.FILTER_IV,
        filter: (candidate, current) => {
          const highest = Math.max(...current.map((row) => Number(row.silverCoins || 0)));
          return Number(candidate.silverCoins || 0) === highest;
        },
      },
      {
        label: FILTER_LABELS.FILTER_V,
        filter: (candidate, current) => {
          const highest = Math.max(...current.map((row) => Number(row.totalCoins || 0)));
          return Number(candidate.totalCoins || 0) === highest;
        },
      },
      {
        label: FILTER_LABELS.FILTER_VI,
        filter: (candidate, current) => {
          const highest = Math.max(...current.map((row) => Number(row.strength || 0)));
          return Number(candidate.strength || 0) === highest;
        },
      },
    ];
    const chosen = [];
    const unselected = new Map(candidates.map((candidate) => [String(candidate.classId), candidate]));

    // The discipline order is by tie-group size; within it, visit live shield-count tiers low-to-high.
    while (chosen.length < remaining && unselected.size > 0) {
      const currentCandidates = [...unselected.values()].map((candidate) => ({
        ...candidate,
        shieldsHeld: Number(shieldCounts[String(candidate.classId)] || 0),
      }));
      const shieldCountLevels = [
        ...new Set(currentCandidates.map((candidate) => candidate.shieldsHeld)),
      ].sort((a, b) => a - b);
      let selected = null;

      while (!selected) {
        for (const shieldCount of shieldCountLevels) {
          let survivors = currentCandidates
            .filter((candidate) => candidate.shieldsHeld === shieldCount)
            .sort(
              (a, b) =>
                Number(tieFrequency[String(a.classId)] || 0) -
                  Number(tieFrequency[String(b.classId)] || 0) ||
                Number(a.classId) - Number(b.classId)
            );

          for (const step of criterionSteps) {
            if (relaxed.has(step.label) || survivors.length <= 1) continue;
            const filtered = survivors.filter((candidate) =>
              step.filter(candidate, survivors, tieContext)
            );
            if (filtered.length === 0) {
              survivors = [];
              break;
            }
            if (filtered.length < survivors.length) {
              survivors = filtered;
              applied.add(step.label);
            }
          }

          if (survivors.length > 0) {
            selected = survivors[0];
            break;
          }
        }

        if (selected) break;
        const nextToRelax = criterionSteps.find((step) => !relaxed.has(step.label));
        if (!nextToRelax) break;
        relaxed.add(nextToRelax.label);
      }

      if (!selected) {
        break;
      }

      chosen.push(selected);
      unselected.delete(String(selected.classId));
      const classKey = String(selected.classId);
      shieldCounts[classKey] = (shieldCounts[classKey] || 0) + 1;
    }

    const winners = winnersByCategory[String(category.id)];
    chosen.forEach((row) => {
      winners.push({ ...row, _coins: coins, _rule5: true });
    });

    pending.push({
      categoryId: category.id,
      categoryName: category.name,
      coins,
      placesToConfirm: remaining,
      rule5: true,
      applied: [...applied],
      relaxed: [...relaxed],
      recommendedIds: chosen.map((row) => String(row.classId)),
      tieCandidateIds: candidates.map((row) => String(row.classId)),
      candidates: candidates
        .slice()
        .sort(
          (a, b) =>
            Number(a.shieldsHeld || 0) - Number(b.shieldsHeld || 0) ||
            Number(tieFrequency[String(a.classId)] || 0) -
              Number(tieFrequency[String(b.classId)] || 0) ||
            Number(a.classId) - Number(b.classId)
        )
        .map((row) => ({
          classId: row.classId,
          className: row.className,
          coins,
          silverCoins: Number(row.silverCoins || 0),
          totalCoins: Number(row.totalCoins || 0),
          redZones: Number(row.redZones || 0),
          strength: Number(row.strength || 0),
          shieldsHeld: Number(row.shieldsHeld || 0),
          tieFrequency: Number(tieFrequency[String(row.classId)] || 0),
        })),
    });
    notes.push({
      type: 'recommendation',
      text: `${category.name}: Rule 5 evaluated a tie for ${remaining} shield${remaining === 1 ? '' : 's'}`,
    });
  });

  const shields = disciplines.flatMap((category) =>
    (winnersByCategory[String(category.id)] || []).map((winner) => ({
      categoryId: category.id,
      categoryCode: category.code,
      categoryName: category.name,
      classId: winner.classId,
      className: winner.className,
      value: winner._coins,
      rule5: Boolean(winner._rule5),
    }))
  );

  return { shields, pending, shieldCounts, winnersByCategory, notes };
};

/** Convert name-based decisions stored on a controller row into displayed shield winners. */
export const getStoredShieldDecisions = (rows, categories, controller, recommendations = []) => {
  const decisions = controller?.shield_decision || {};
  const byClassName = new Map((rows || []).map((row) => [String(row.className), row]));
  const winnersByCategory = {};
  const shields = [];
  const shieldCounts = {};

  (categories || [])
    .filter((category) => (category.coin_kind || 'discipline') === 'discipline')
    .forEach((category) => {
      const selected = decisions[category.name] || decisions[String(category.id)] || [];
      const rule5CandidateIds = new Set(
        (
          recommendations.find(
            (entry) => String(entry.categoryId) === String(category.id)
          )?.tieCandidateIds || []
        ).map(String)
      );
      const winners = (Array.isArray(selected) ? selected : [])
        .map((className) => byClassName.get(String(className)))
        .filter(Boolean)
        .map((row) => ({
          ...row,
          _coins: Number(row.balances?.[category.code] || 0),
          _rule5: rule5CandidateIds.has(String(row.classId)),
          _saved: true,
        }));
      winnersByCategory[String(category.id)] = winners;
      winners.forEach((winner) => {
        const classKey = String(winner.classId);
        shieldCounts[classKey] = (shieldCounts[classKey] || 0) + 1;
        shields.push({
          categoryId: category.id,
          categoryCode: category.code,
          categoryName: category.name,
          classId: winner.classId,
          className: winner.className,
          value: winner._coins,
          rule5: winner._rule5,
          saved: true,
        });
      });
    });
  return { shields, winnersByCategory, shieldCounts };
};

/**
 * The classes that hold a shield in a given discipline, as a Set of class ids. Used to paint the
 * green cells: only the class that actually received the shield is green.
 */
export const shieldWinnerIds = (winnersByCategory, categoryId) =>
  new Set(
    (winnersByCategory?.[String(categoryId)] || []).map((w) => String(w.classId))
  );

/**
 * Monthly cups. Two cups per month:
 *   - cup 1 to the highest points across all classes;
 *   - cup 2 to the highest points in the programme that did not take cup 1 (a PCC winner frees the
 *     GCC cup for the best GCC class, and vice versa).
 *
 * @param {Array} rows - scored rows carrying the metric to compare
 * @param {string} metric - key on the row holding the points, e.g. 'monthPoints'
 */
export const computeCups = (rows, metric = 'monthPoints') => {
  const ranked = (rows || [])
    .map((r) => ({ ...r, _points: Number(r[metric] || 0) }))
    .sort((a, b) => b._points - a._points || Number(a.classId) - Number(b.classId));

  if (ranked.length === 0) return [];

  const first = ranked[0];
  const cups = [
    {
      position: 1,
      classId: first.classId,
      className: first.className,
      programme: first.programme || null,
      points: first._points,
    },
  ];

  const otherProgramme = first.programme === 'PCC' ? 'GCC' : first.programme === 'GCC' ? 'PCC' : null;
  const secondPool = ranked.filter((r) => String(r.classId) !== String(first.classId));
  const preferred = otherProgramme
    ? secondPool.filter((r) => r.programme === otherProgramme)
    : secondPool;
  const second = (preferred.length > 0 ? preferred : secondPool)[0];

  if (second) {
    cups.push({
      position: 2,
      classId: second.classId,
      className: second.className,
      programme: second.programme || null,
      points: second._points,
    });
  }

  return cups;
};

/** Best class of the academic year: highest cumulative points. */
export const computeBestClassOfYear = (rows, metric = 'totalPoints') => {
  const ranked = (rows || [])
    .map((r) => ({ classId: r.classId, className: r.className, points: Number(r[metric] || 0) }))
    .sort((a, b) => b.points - a.points || Number(a.classId) - Number(b.classId));
  return ranked[0] || null;
};

/**
 * Walk the loaded weeks in order. A scorecard's previous total includes only non-ignored weeks in
 * the same month; the academic-year total remains an independent sum for year awards.
 *
 * @param {Object} args
 * @param {Array} args.classes
 * @param {Array} args.categories
 * @param {Array} args.weeks - week_start dates ('YYYY-MM-DD'), any order
 * @param {Array} args.coins - all coin rows for the year: { week_start, class_id, category_id, coins }
 * @param {Array} [args.weekControllers] - controller rows with week_start and ignore_week
 * @param {Object} args.settings
 * @returns {{yearRows: Array, weeks: Object}} per-class year totals and per-week scoreboards
 */
export const computeYearProgression = ({
  classes,
  categories,
  weeks = [],
  coins = [],
  weekControllers = [],
  settings,
}) => {
  const yearRunning = {};
  (classes || []).forEach((c) => {
    yearRunning[String(c.id)] = 0;
  });
  const controllerByWeek = new Map(
    (weekControllers || []).map((controller) => [
      String(controller.week_start).slice(0, 10),
      controller,
    ])
  );
  const monthRunning = {};

  const orderedWeeks = [
    ...new Set((weeks || []).filter(Boolean).map((w) => String(w).slice(0, 10))),
  ].sort();

  const weekResults = {};
  orderedWeeks.forEach((weekStart) => {
    const monthKey = monthKeyOf(weekStart);
    if (!monthRunning[monthKey]) {
      monthRunning[monthKey] = {};
      (classes || []).forEach((c) => {
        monthRunning[monthKey][String(c.id)] = 0;
      });
    }

    const weekCoins = (coins || []).filter((c) => String(c.week_start).slice(0, 10) === weekStart);
    const scored = scoreWeek({
      classes,
      categories,
      coins: weekCoins,
      previousTotals: monthRunning[monthKey],
      settings,
    });
    const ignored = Boolean(controllerByWeek.get(weekStart)?.ignore_week);
    if (!ignored) {
      scored.rows.forEach((row) => {
        const classKey = String(row.classId);
        monthRunning[monthKey][classKey] = row.totalPoints;
        yearRunning[classKey] = (yearRunning[classKey] || 0) + row.weekPoints;
      });
    }
    weekResults[weekStart] = scored;
  });

  const yearRows = (classes || []).map((c) => ({
    classId: c.id,
    className: c.name,
    programme: c.programme || null,
    strength: Number(c.strength || 0),
    totalPoints: yearRunning[String(c.id)] || 0,
  }));

  return { yearRows, weeks: weekResults };
};

/**
 * Month buckets ('YYYY-MM') with the points each class scored inside the month, so the monthly cups
 * can be resolved. Points come from the weekly scoreboards already computed for the year.
 */
export const computeMonthlyStandings = (weekResults, weeks) => {
  const months = {};

  (weeks || []).forEach((weekStart) => {
    const key = String(weekStart).slice(0, 10);
    const monthKey = key.slice(0, 7);
    const scored = weekResults[key];
    if (!scored) return;
    if (!months[monthKey]) months[monthKey] = {};

    scored.rows.forEach((row) => {
      const classKey = String(row.classId);
      if (!months[monthKey][classKey]) {
        months[monthKey][classKey] = {
          classId: row.classId,
          className: row.className,
          programme: row.programme,
          strength: row.strength,
          monthPoints: 0,
        };
      }
      months[monthKey][classKey].monthPoints += Number(row.weekPoints || 0);
    });
  });

  return Object.entries(months).reduce((acc, [monthKey, byClass]) => {
    acc[monthKey] = Object.values(byClass);
    return acc;
  }, {});
};

/**
 * Coins taken per teacher, summed over the weeks in `weekStarts`.
 * @param {Array} teacherCoins - { week_start, teacher_id, coins }
 * @param {Array} teachers - { id, name, emp_id }
 * @param {Array} [weekStarts] - restrict to these weeks; omit for the whole year
 */
export const computeTeacherTotals = (teacherCoins, teachers = [], weekStarts = null) => {
  const allowed = weekStarts ? new Set(weekStarts.map((w) => String(w).slice(0, 10))) : null;
  const totals = new Map();

  (teacherCoins || []).forEach((row) => {
    const week = String(row.week_start).slice(0, 10);
    if (allowed && !allowed.has(week)) return;
    const key = String(row.teacher_id);
    totals.set(key, (totals.get(key) || 0) + Number(row.coins || 0));
  });

  const byId = new Map((teachers || []).map((t) => [String(t.id), t]));

  return [...totals.entries()]
    .map(([teacherId, coins]) => {
      const teacher = byId.get(teacherId);
      return {
        teacher_id: Number(teacherId),
        name: teacher?.name || 'Unknown teacher',
        emp_id: teacher?.emp_id || null,
        coins_taken: coins,
      };
    })
    .sort((a, b) => b.coins_taken - a.coins_taken || String(a.name).localeCompare(String(b.name)));
};
