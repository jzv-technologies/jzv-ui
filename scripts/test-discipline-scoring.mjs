/**
 * Discipline scoring tests.
 *
 * Run with:  node scripts/test-discipline-scoring.mjs
 * (Same pattern as scripts/test-i18n.js - the project has no test runner configured.)
 *
 * The expectations in "golden fixture" are transcribed from the school's reference scorecard
 * (week ending 09 Mar 2024), so this file is what proves the engine still reproduces the sheet -
 * in particular that moving the storage to weekly coin counters did not change the arithmetic.
 */

import {
  applyFilters,
  computeCategoryBalances,
  computeWeekPoints,
  scoreWeek,
  computeWeeklyShields,
  selectDisciplineShields,
  shieldWinnerIds,
  FILTER_LABELS,
  computeCups,
  computeBestClassOfYear,
  computeYearProgression,
  computeMonthlyStandings,
  computeTeacherTotals,
  weekStartOf,
  splitCategories,
} from '../src/utils/disciplineScoring.js';

let passed = 0;
let failed = 0;

const check = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}\n        expected ${e}\n        actual   ${a}`);
  }
};

// ---------------------------------------------------------------------------
// Fixtures - the category list as the database seeds it.
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { id: 1, code: 'classroom', name: 'Classroom Discipline', coin_kind: 'discipline', weekly_coins: 10, coin_points: 1, shields_count: 2, red_zone_threshold: 4, display_order: 10 },
  { id: 2, code: 'line', name: 'Line Discipline', coin_kind: 'discipline', weekly_coins: 10, coin_points: 1, shields_count: 2, red_zone_threshold: 4, display_order: 20 },
  { id: 3, code: 'sunnah', name: 'Sunnah & Etiquette', coin_kind: 'discipline', weekly_coins: 10, coin_points: 1, shields_count: 2, red_zone_threshold: 4, display_order: 30 },
  { id: 4, code: 'uniform', name: 'Uniform Discipline', coin_kind: 'discipline', weekly_coins: 10, coin_points: 1, shields_count: 2, red_zone_threshold: 4, display_order: 40 },
  { id: 5, code: 'masjid', name: 'Masjid Discipline', coin_kind: 'discipline', weekly_coins: 10, coin_points: 1, shields_count: 2, red_zone_threshold: 4, display_order: 50 },
  { id: 6, code: 'language', name: 'Language Excellence', coin_kind: 'discipline', weekly_coins: 20, coin_points: 1, shields_count: 3, red_zone_threshold: 4, display_order: 60 },
  { id: 7, code: 'silver', name: "Teacher's Appreciation", coin_kind: 'silver', weekly_coins: 0, coin_points: 1, shields_count: 0, red_zone_threshold: 0, display_order: 70 },
  { id: 8, code: 'golden', name: 'Management Appreciation', coin_kind: 'golden', weekly_coins: 0, coin_points: 1, shields_count: 0, red_zone_threshold: 0, display_order: 80 },
];

const WEEK = '2024-03-04'; // Monday of the week ending 09 Mar 2024

const SETTINGS = { silver_coin_points: 3, golden_coin_points: 30, red_zone_penalty: 5, max_shields_per_class: 2 };
// The school's live setting is 5 (below). The printed reference sheet was produced before the
// penalty applied: 1C's classroom is red (3 coins left) and the sheet still shows 40 + 15 = 55
// points, and 2C shows 46 + 18 = 64. Section 4a therefore pins the engine to the sheet at 0 and 4b
// pins the stated rule at 5, and the penalty stays a settings row
// (discipline_settings.red_zone_penalty) so the school can change it without a code change.
const SETTINGS_SHEET = { ...SETTINGS, red_zone_penalty: 0 };

// The sheet, exactly as printed: coins left per discipline, silver coins, and the three totals.
// `1A`..`2C` are placeholder class names (the real names come from the classes table).
const SHEET = [
  { id: 101, name: '1A', programme: 'PCC', strength: 20, coins: [8, 10, 10, 9, 10, 16], silver: 4, weekPoints: 75, previous: 143, total: 218 },
  { id: 102, name: '1B', programme: 'PCC', strength: 18, coins: [8, 8, 8, 9, 10, 19], silver: 8, weekPoints: 86, previous: 141, total: 227 },
  { id: 103, name: '1C', programme: 'PCC', strength: 25, coins: [3, 6, 9, 6, 7, 9], silver: 5, weekPoints: 55, previous: 121, total: 176 },
  { id: 104, name: '2A', programme: 'GCC', strength: 22, coins: [10, 10, 10, 10, 10, 19], silver: 4, weekPoints: 81, previous: 130, total: 211 },
  { id: 105, name: '2B', programme: 'GCC', strength: 24, coins: [10, 10, 9, 8, 9, 19], silver: 8, weekPoints: 89, previous: 148, total: 237 },
  { id: 106, name: '2C', programme: 'GCC', strength: 19, coins: [0, 10, 7, 10, 8, 11], silver: 6, weekPoints: 64, previous: 122, total: 186 },
];

// Turn "coins left" into the counter rows the database would hold for that class/week.
const counterRowsFor = (classRow, weekStart = WEEK) => {
  const rows = [];
  CATEGORIES.filter((c) => c.coin_kind === 'discipline').forEach((category, index) => {
    const taken = category.weekly_coins - classRow.coins[index];
    if (taken > 0) {
      rows.push({ week_start: weekStart, class_id: classRow.id, category_id: category.id, coins: taken });
    }
  });
  if (classRow.silver > 0) {
    rows.push({ week_start: weekStart, class_id: classRow.id, category_id: 7, coins: classRow.silver });
  }
  return rows;
};

const classes = SHEET.map((s) => ({
  id: s.id,
  name: s.name,
  programme: s.programme,
  strength: s.strength,
}));

const weekCoins = SHEET.flatMap((s) => counterRowsFor(s));
const previousTotals = SHEET.reduce((acc, s) => {
  acc[String(s.id)] = s.previous;
  return acc;
}, {});

const scoredWeek = (settings) =>
  scoreWeek({ classes, categories: CATEGORIES, coins: weekCoins, previousTotals, settings });

console.log('\n1. Category split (disciplines vs the two appreciation coins)');
{
  const split = splitCategories(CATEGORIES);
  check('6 disciplines', split.disciplines.length, 6);
  check('silver coin is a category row', split.silver.code, 'silver');
  check('golden coin is a category row', split.golden.code, 'golden');
}

console.log('\n2. Balances come from the counters and the weekly entitlement');
{
  const one = computeCategoryBalances(CATEGORIES, counterRowsFor(SHEET[0]));
  check('1A balances match the sheet', Object.values(one.balances), SHEET[0].coins);
  check('1A total coins', one.totalCoins, 63);
  check('1A has no red zone', one.redZones, 0);
  check('the appreciation rows are not counted as disciplines', Object.keys(one.balances).length, 6);

  const c = computeCategoryBalances(CATEGORIES, counterRowsFor(SHEET[3]));
  check('2A total coins', c.totalCoins, 69);
  check('2A is not red anywhere (all 10s and a 19)', c.redCodes, []);
}

console.log('\n3. One coin per removal, and red zones');
{
  const one = computeCategoryBalances(CATEGORIES, [
    { category_id: 1, coins: 4 },
    { category_id: 6, coins: 3 },
  ]);
  check('4 coins taken from classroom leave 6', one.balances.classroom, 6);
  check('3 coins taken from language leave 17', one.balances.language, 17);

  const red = computeCategoryBalances(CATEGORIES, [
    { category_id: 1, coins: 6 },
    { category_id: 6, coins: 16 },
  ]);
  check('4 left is a red zone', red.redCodes.includes('classroom'), true);
  check('a red zone in language too', red.redCodes.includes('language'), true);
  check('two red zones counted', red.redZones, 2);

  const notRed = computeCategoryBalances(CATEGORIES, [{ category_id: 1, coins: 4 }]);
  check('6 left is not a red zone', notRed.redCodes.includes('classroom'), false);

  const points = computeWeekPoints({ totalCoins: 60, silverCoins: 0, goldenCoins: 0, redZones: 2 }, SETTINGS);
  check('60 coins with 2 red zones = 50 points', points, 50);
}

// The school's live setting is red_zone_penalty = 5 (see 4b); this block pins the engine to the
// printed sheet as it was handed over, which was produced before the penalty applied.
console.log('\n4a. Golden fixture - the reference sheet reproduces exactly');
{
  const scored = scoredWeek(SETTINGS_SHEET);

  SHEET.forEach((sheetRow) => {
    const row = scored.byClass[String(sheetRow.id)];
    check(`${sheetRow.name} balances`, CATEGORIES.filter((c) => c.coin_kind === 'discipline').map((c) => row.balances[c.code]), sheetRow.coins);
    check(`${sheetRow.name} total coins`, row.totalCoins, sheetRow.coins.reduce((a, b) => a + b, 0));
    check(`${sheetRow.name} silver coins`, row.silverCoins, sheetRow.silver);
    check(`${sheetRow.name} golden coins (-)`, row.goldenCoins, 0);
    check(`${sheetRow.name} red zones`, row.redZones, sheetRow.coins.filter((v) => v <= 4).length);
    check(`${sheetRow.name} THIS WEEK POINTS`, row.weekPoints, sheetRow.weekPoints);
    check(`${sheetRow.name} PREVIOUS TOTAL`, row.previousTotal, sheetRow.previous);
    check(`${sheetRow.name} TOTAL POINTS`, row.totalPoints, sheetRow.total);
  });
}

console.log('\n4b. Red-zone penalty (the live setting is 5; 0 is what the printed sheet used)');
{
  const withPenalty = scoredWeek(SETTINGS);
  // 1C has one red zone (classroom 3), 2C has one (classroom 0). Every other class is clean.
  check('1C loses 5 points when the penalty is on', withPenalty.byClass['103'].weekPoints, 50);
  check('2C loses 5 points when the penalty is on', withPenalty.byClass['106'].weekPoints, 59);
  check('1A is unaffected (no red zone)', withPenalty.byClass['101'].weekPoints, 75);
  check('the penalty reduces the TOTAL POINTS too', withPenalty.byClass['103'].totalPoints, 171);
}

console.log('\n4c. Golden coins are worth 30 points each');
{
  const coins = [...weekCoins, { week_start: WEEK, class_id: 101, category_id: 8, coins: 2 }];
  const scored = scoreWeek({ classes, categories: CATEGORIES, coins, previousTotals, settings: SETTINGS_SHEET });
  check('1A reports 2 golden coins', scored.byClass['101'].goldenCoins, 2);
  check('and gains 60 points (75 + 60)', scored.byClass['101'].weekPoints, 135);
  check('without touching the other classes', scored.byClass['102'].weekPoints, 86);
}

console.log('\n5. Green cells - row maxima per discipline');
{
  const scored = scoredWeek(SETTINGS_SHEET);
  const maxima = {};
  CATEGORIES.filter((c) => c.coin_kind === 'discipline').forEach((c) => {
    maxima[c.code] = Math.max(...scored.rows.map((r) => r.balances[c.code]));
  });
  check('classroom maximum is 10', maxima.classroom, 10);
  check('language maximum is 19', maxima.language, 19);
}

console.log('\n5. Row maxima per discipline (the raw "who has most coins" reading)');
{
  const scored = scoredWeek(SETTINGS_SHEET);
  const maxima = {};
  CATEGORIES.filter((c) => c.coin_kind === 'discipline').forEach((c) => {
    maxima[c.code] = Math.max(...scored.rows.map((r) => r.balances[c.code]));
  });
  check('classroom maximum is 10', maxima.classroom, 10);
  check('language maximum is 19', maxima.language, 19);
}

console.log('\n6. Shields: each discipline awards its shields_count, and only from the top coin group');
{
  const scored = scoredWeek(SETTINGS_SHEET);
  const { shields, winnersByCategory, pending, shieldCounts } = computeWeeklyShields(
    scored.rows,
    CATEGORIES,
    { settings: SETTINGS_SHEET, weekStart: WEEK }
  );

  // 5 disciplines x 2 shields + Language Excellence x 3 = 13
  check('13 shields awarded in total', shields.length, 13);
  check('classroom awards 2', (winnersByCategory['1'] || []).length, 2);
  check('language awards 3', (winnersByCategory['6'] || []).length, 3);

  const language = (winnersByCategory['6'] || []).map((w) => w.className).sort();
  check('language shields go to the three classes on 19 coins', language, ['1B', '2A', '2B']);
  check('and each is worth 19 coins', (winnersByCategory['6'] || []).every((w) => w._coins === 19), true);

  const classroom = (winnersByCategory['1'] || []).map((w) => w.className).sort();
  check('classroom shields go to the two classes on 10 coins', classroom, ['2A', '2B']);

  check('the shield count per class is tracked', Object.keys(shieldCounts).length > 0, true);

  // Every discipline hands out every shield it owes - that is the school's rule, and the reason a
  // discipline must never end up on 1 of 2.
  CATEGORIES.filter((c) => c.coin_kind === 'discipline').forEach((category) => {
    check(
      `${category.code} awards all ${category.shields_count} shields`,
      (winnersByCategory[String(category.id)] || []).length,
      category.shields_count
    );
  });

  check(
    'every discipline hands out distinct classes, so the scorecard shows as many green cells as shields',
    CATEGORIES.filter((c) => c.coin_kind === 'discipline').every(
      (category) =>
        new Set((winnersByCategory[String(category.id)] || []).map((w) => String(w.classId))).size ===
        category.shields_count
    ),
    true
  );

  // Line's four classes on 10 coins are separated by FILTER II and then FILTER IV/V.
  check('no discipline needs a confirmation in this fixture', pending.length, 0);
  check('and nothing is left provisional', shields.filter((s) => s.provisional).length, 0);
  check(
    'line goes to the two best of the four tied classes',
    (winnersByCategory['2'] || []).map((w) => w.className).sort(),
    ['2A', '2B']
  );
}

console.log('\n6b. Winners are marked for the green cells, not the whole tied group');
{
  const scored = scoredWeek(SETTINGS_SHEET);
  const { winnersByCategory } = computeWeeklyShields(scored.rows, CATEGORIES, {
    settings: SETTINGS_SHEET,
    weekStart: WEEK,
  });

  const classroomWinners = shieldWinnerIds(winnersByCategory, 1);
  check('classroom winners are 2A and 2B', [...classroomWinners].sort(), ['104', '105']);

  // Line: four classes tie on 10 coins but only two shields are available, so exactly two are
  // winners - the green cells must not cover all four.
  const lineWinners = shieldWinnerIds(winnersByCategory, 2);
  check('only 2 of the 4 tied classes are line winners', lineWinners.size, 2);
}

console.log('\n6c. FILTER I: a class at the cap steps down, and is relaxed when that would empty the group');
{
  // Same coins, different class strength, so the filters can settle the tie (FILTER VI).
  const three = [
    { id: 1, name: 'A', programme: 'PCC', strength: 30 },
    { id: 2, name: 'B', programme: 'PCC', strength: 20 },
    { id: 3, name: 'C', programme: 'PCC', strength: 10 },
  ];
  const oneSpot = { ...CATEGORIES[0], shields_count: 1 };
  const rows = scoreWeek({ classes: three, categories: CATEGORIES, coins: [], settings: SETTINGS_SHEET })
    .rows;

  // A already holds the cap of 2, B and C do not, so A steps down and B/C are separated by strength.
  const stepped = selectDisciplineShields({
    rows,
    category: oneSpot,
    categories: CATEGORIES,
    shieldCounts: { 1: 2 },
    weekStart: WEEK,
    maxShieldsPerClass: 2,
  });
  check('a class at the cap is excluded', stepped.winners.length, 1);
  check('the strongest of the remaining classes wins', stepped.winners[0].className, 'B');
  check(
    'and the cap exclusion is reported',
    stepped.notes.some((n) => /FILTER I stood down/.test(n.text)),
    true
  );

  // Every class is at the cap: FILTER I is relaxed so the discipline still has a champion.
  const relaxed = selectDisciplineShields({
    rows,
    category: oneSpot,
    categories: CATEGORIES,
    shieldCounts: { 1: 2, 2: 2, 3: 2 },
    weekStart: WEEK,
    maxShieldsPerClass: 2,
  });
  check('FILTER I is relaxed rather than leaving no champion', relaxed.winners.length, 1);
  check('and the strongest class wins it', relaxed.winners[0].className, 'A');
  check(
    'the relaxation is reported',
    relaxed.notes.some((n) => /FILTER I relaxed/.test(n.text)),
    true
  );
}

console.log('\n6d. When the filters cannot separate the classes, the management decides');
{
  // Four identical classes, one place: every filter leaves all four standing.
  const identical = [1, 2, 3, 4].map((id) => ({
    id,
    name: `C${id}`,
    programme: 'PCC',
    strength: 10,
  }));
  const scored = scoreWeek({
    classes: identical,
    categories: CATEGORIES,
    coins: [],
    settings: SETTINGS_SHEET,
  });
  const { pending } = computeWeeklyShields(scored.rows, CATEGORIES, {
    settings: SETTINGS_SHEET,
    weekStart: WEEK,
  });

  const classroomPending = pending.find((p) => p.categoryCode === 'classroom');
  check('the tie is handed to the management', Boolean(classroomPending), true);
  check('with the classes that are tied', classroomPending.candidates.length, 4);
  check('and the filters are reported as exhausted', classroomPending.filtersExhausted, true);

  // A stored decision wins over the automatic result.
  const decided = computeWeeklyShields(scored.rows, CATEGORIES, {
    settings: SETTINGS_SHEET,
    weekStart: WEEK,
    decisions: [{ week_start: WEEK, category_id: 1, class_id: 3 }],
  });
  const classroom = decided.winnersByCategory['1'][0];
  check('a management decision picks the class', classroom.className, 'C3');
  check('and says so', classroom._reason, 'Decided by the management');

  // A decision settles ONE place: the discipline still hands out its second shield, so the class
  // the management backed keeps its shield AND the other place is filled - here by a recommendation
  // that is still waiting for confirmation.
  check('the decided class keeps its shield', classroom._provisional, undefined);
  check('the discipline still awards both shields', decided.winnersByCategory['1'].length, 2);
  check(
    'and the other place is still open for confirmation',
    decided.pending.some((p) => p.categoryCode === 'classroom'),
    true
  );

  // Decisions for every place settle the discipline completely.
  const fullyDecided = computeWeeklyShields(scored.rows, CATEGORIES, {
    settings: SETTINGS_SHEET,
    weekStart: WEEK,
    decisions: [
      { week_start: WEEK, category_id: 1, class_id: 3 },
      { week_start: WEEK, category_id: 1, class_id: 1 },
    ],
  });
  check(
    'two decisions fill both places',
    fullyDecided.winnersByCategory['1'].map((w) => w.className).sort(),
    ['C1', 'C3']
  );
  check(
    'and the discipline needs no further confirmation',
    fullyDecided.pending.some((p) => p.categoryCode === 'classroom'),
    false
  );
}

console.log('\n6d-2. A criterion that overshoots still leaves the discipline with its full shields');
{
  // Five classes on the same coins with two places. Only the first class is clean, so FILTER II
  // removes four of them in one step - fewer classes than places. The leftover place must be
  // recommended rather than silently dropped.
  const five = [1, 2, 3, 4, 5].map((id) => ({
    id,
    name: `F${id}`,
    programme: 'PCC',
    strength: 20,
  }));
  const onePlace = { ...CATEGORIES[0], shields_count: 2 };
  const coins = [2, 3, 4, 5].map((class_id) => ({
    week_start: WEEK,
    class_id,
    category_id: 5, // masjid: exhausted, so those four classes carry a red zone
    coins: 10,
  }));
  const rows = scoreWeek({ classes: five, categories: CATEGORIES, coins, settings: SETTINGS_SHEET })
    .rows;

  const result = computeWeeklyShields(rows, [onePlace], { settings: SETTINGS_SHEET, weekStart: WEEK });
  const winners = result.winnersByCategory['1'] || [];
  check('both shields are awarded', winners.length, 2);
  check('the clean class wins outright', winners[0].className, 'F1');
  check('and the second is a recommendation', winners[1]._provisional, true);
  check('with one place to confirm', result.pending[0].placesToConfirm, 1);
  check(
    'the recommendation is the best of the rest',
    result.pending[0].recommendedIds,
    [String(winners[1].classId)]
  );
}

console.log('\n6d-5. A decision is only needed when more classes tie than there are shields to award');
{
  // The school's rule: the management is asked to decide ONLY where the tie is genuinely
  // ambiguous - more classes sharing the same coin count than there are shields still to give.
  // Ties that fit the places are settled automatically, with no dialog and no provisional shield.
  //   shields 2 + 2 tied -> both awarded        | shields 2 + 3 tied -> decision
  //   shields 3 + 3 tied -> all three awarded   | shields 3 + 4 tied -> decision
  const identical = (n) =>
    Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `T${i + 1}`, programme: 'PCC', strength: 10 }));

  const run = (classCount, shields) => {
    const classes = identical(classCount);
    const category = { ...CATEGORIES[0], shields_count: shields };
    const rows = scoreWeek({
      classes,
      categories: [category],
      coins: [],
      settings: SETTINGS_SHEET,
    }).rows;
    return computeWeeklyShields(rows, [category], { settings: SETTINGS_SHEET, weekStart: WEEK });
  };

  // Two shields.
  const twoOfTwo = run(2, 2);
  check('2 classes tied for 2 shields: both are awarded', (twoOfTwo.winnersByCategory['1'] || []).length, 2);
  check('and nothing is left pending', twoOfTwo.pending.length, 0);
  check(
    'and neither award is provisional',
    (twoOfTwo.winnersByCategory['1'] || []).filter((w) => w._provisional).length,
    0
  );

  const threeOfTwo = run(3, 2);
  check('3 classes tied for 2 shields: a decision is required', threeOfTwo.pending.length, 1);
  check('with both places to confirm', threeOfTwo.pending[0].placesToConfirm, 2);

  // Three shields (Language Excellence).
  const threeOfThree = run(3, 3);
  check(
    '3 classes tied for 3 shields: all three are awarded',
    (threeOfThree.winnersByCategory['1'] || []).length,
    3
  );
  check('and nothing is left pending', threeOfThree.pending.length, 0);

  const fourOfThree = run(4, 3);
  check('4 classes tied for 3 shields: a decision is required', fourOfThree.pending.length, 1);
  check('with three places to confirm', fourOfThree.pending[0].placesToConfirm, 3);
}

console.log('\n6d-4. The shield cap is relaxed when it would leave a shield unawarded');
{
  // Three classes, a discipline with five shields and a cap of two: the coin groups run out long
  // before the shields do, so the extra places are shared out and the cap is relaxed when nobody is
  // left under it - the school's rule is to relax rather than leave a shield unawarded.
  const three = [1, 2, 3].map((id) => ({ id, name: `G${id}`, programme: 'PCC', strength: 10 + id }));
  const category = { ...CATEGORIES[0], shields_count: 5 };
  const rows = scoreWeek({ classes: three, categories: [category], coins: [], settings: SETTINGS_SHEET })
    .rows;

  const result = computeWeeklyShields(rows, [category], {
    settings: SETTINGS_SHEET,
    weekStart: WEEK,
  });
  const winners = result.winnersByCategory['1'] || [];
  check('all five shields are awarded', winners.length, 5);
  check('and none is left pending', result.pending.length, 0);
  check(
    'the extra places are shared with the next best classes',
    winners.filter((w) => w._reason === FILTER_LABELS.NEXT_BEST).length,
    2
  );
  check(
    'and spread so nobody takes more than the cap while others have room',
    Object.values(result.shieldCounts).sort().join(','),
    '1,2,2'
  );
  check(
    'with only three classes the same class has to repeat',
    new Set(winners.map((w) => String(w.classId))).size,
    3
  );

  // With enough classes the cap stands and nobody exceeds it.
  const six = [1, 2, 3, 4, 5, 6].map((id) => ({ id, name: `G${id}`, programme: 'PCC', strength: 10 + id }));
  const manyRows = scoreWeek({ classes: six, categories: [category], coins: [], settings: SETTINGS_SHEET })
    .rows;
  const many = computeWeeklyShields(manyRows, [category], {
    settings: SETTINGS_SHEET,
    weekStart: WEEK,
  });
  check('with enough classes the cap holds', Object.values(many.shieldCounts).every((n) => n <= 2), true);
  check('and all five shields are still awarded', (many.winnersByCategory['1'] || []).length, 5);
  check(
    'the extra places go to other classes, not over the cap',
    Object.values(many.shieldCounts).every((n) => n <= 2),
    true
  );
  // Two classes and six shields: at some point every class is at the cap and the remaining places can
  // only be filled by relaxing it - the school prefers a relaxed cap to an unawarded shield.
  const two = [1, 2].map((id) => ({ id, name: `H${id}`, programme: 'PCC', strength: 10 + id }));
  const manyShields = { ...CATEGORIES[0], shields_count: 6 };
  const twoRows = scoreWeek({
    classes: two,
    categories: [manyShields],
    coins: [],
    settings: SETTINGS_SHEET,
  }).rows;
  const overCap = computeWeeklyShields(twoRows, [manyShields], {
    settings: SETTINGS_SHEET,
    weekStart: WEEK,
  });
  check('six shields are awarded from two classes', (overCap.winnersByCategory['1'] || []).length, 6);
  check(
    'the cap relaxation is reported',
    (overCap.winnersByCategory['1'] || []).some((w) => w._reason === FILTER_LABELS.CAP_RELAXED),
    true
  );
}

console.log('\n6d-3. The criteria stop as soon as the open places are covered');
{
  // Four classes tied on the same coins with two places. FILTER II leaves three, and the pass must
  // then take the TWO best silver counts rather than one - narrowing below the open places is what
  // used to lose a place (and made a discipline award 1 of 2 shields).
  const tied = [1, 2, 3, 4].map((id) => ({
    classId: id,
    className: `T${id}`,
    redZones: id === 4 ? 1 : 0,
    silverCoins: id === 1 ? 9 : id === 2 ? 5 : id === 3 ? 1 : 20,
    totalCoins: 50,
    strength: 20,
    shieldsHeld: 0,
  }));
  const ctx = { maxShieldsPerClass: 2, disciplineCodes: ['classroom'] };

  const twoPlaces = applyFilters(tied, ctx, { skip: ['FILTER_I'], stopAt: 2 });
  check('the red-zone filter removes the class in a red zone', twoPlaces.applied[0], FILTER_LABELS.FILTER_II);
  check('two open places keep the two best classes', twoPlaces.surviving.length, 2);
  check('which are the two highest silver counts', twoPlaces.surviving.map((r) => r.className), ['T1', 'T2']);

  const onePlace = applyFilters(tied, ctx, { skip: ['FILTER_I'], stopAt: 1 });
  check('one open place narrows to the single best', onePlace.surviving.length, 1);
  check('which is the highest silver count', onePlace.surviving[0].className, 'T1');
}

console.log('\n6e. FILTER II - a tied class carrying a red zone is excluded');
{
  const tied = [
    { id: 201, name: 'R1', programme: 'PCC', strength: 20 },
    { id: 202, name: 'R2', programme: 'PCC', strength: 20 },
  ];
  // Both have 10 classroom coins; R2 has exhausted masjid, so R2 is in a red zone.
  const coins = [{ week_start: WEEK, class_id: 202, category_id: 5, coins: 10 }];
  const scored = scoreWeek({ classes: tied, categories: CATEGORIES, coins, settings: SETTINGS_SHEET });
  const { winnersByCategory, pending } = computeWeeklyShields(scored.rows, CATEGORIES, {
    settings: SETTINGS_SHEET,
    weekStart: WEEK,
  });

  // classroom has 2 places and a 2-class tie, so both fit - FILTER II is only needed where places
  // are contested (line: both on 10 with 2 places, again both fit). Build the contested case:
  const contested = computeWeeklyShields(scored.rows, [{ ...CATEGORIES[0], shields_count: 1 }], {
    settings: SETTINGS_SHEET,
    weekStart: WEEK,
  });
  const classroom = (contested.winnersByCategory['1'] || [])[0];
  check('the clean class takes the contested shield', classroom.className, 'R1');
  check('FILTER II is the reason', classroom._reason, FILTER_LABELS.FILTER_II);
  check('no decision needed', contested.pending.length, 0);
  check('the 2-place award is unaffected', (winnersByCategory['1'] || []).length, 2);
  check('and needs no decision either', pending.length, 0);
}

console.log('\n7. The cap holds: no class collects more than max_shields_per_class unless relaxed');
{
  const scored = scoredWeek(SETTINGS_SHEET);
  const { shieldCounts, notes } = computeWeeklyShields(scored.rows, CATEGORIES, {
    settings: SETTINGS_SHEET,
    weekStart: WEEK,
  });

  const over = Object.entries(shieldCounts).filter(([, n]) => n > 2);
  const relaxed = notes.some((n) => /FILTER I relaxed/.test(n.text));
  check(
    'any class over the cap is explained by a relaxation',
    over.length === 0 || relaxed,
    true
  );

  // With a permissive cap nobody is stopped, and the top group still wins each discipline.
  const permissive = computeWeeklyShields(scored.rows, CATEGORIES, {
    settings: SETTINGS_SHEET,
    weekStart: WEEK,
    maxShieldsPerClass: 99,
  });
  check('a higher cap still awards the same number of shields', permissive.shields.length, 13);
  check(
    'and no relaxation is reported',
    permissive.notes.some((n) => /relaxed/.test(n.text)),
    false
  );
}
console.log('\n8. Cups - cup 1 overall, cup 2 to the other programme');
{
  const scored = scoredWeek(SETTINGS_SHEET);
  const rows = scored.rows.map((r) => ({ ...r, monthPoints: r.weekPoints }));

  const cups = computeCups(rows, 'monthPoints');
  check('two cups awarded', cups.length, 2);
  check('cup 1 is the highest points (2B, 89)', cups[0].className, '2B');
  check('cup 1 is GCC', cups[0].programme, 'GCC');
  check('cup 2 goes to PCC because a GCC class took cup 1', cups[1].programme, 'PCC');
  check('cup 2 is the best PCC class (1B, 86)', cups[1].className, '1B');
}

console.log('\n9. Cumulative totals across weeks (previous total rolls forward)');
{
  const week2 = '2024-03-11';
  const weeks = [WEEK, week2];
  const coins = [
    ...weekCoins,
    { week_start: week2, class_id: 101, category_id: 1, coins: 2 },
  ];

  const { weeks: weekResults, yearRows } = computeYearProgression({
    classes,
    categories: CATEGORIES,
    weeks,
    coins,
    settings: SETTINGS_SHEET,
  });

  check('week 1 matches the sheet week points (1A 75)', weekResults[WEEK].byClass['101'].weekPoints, 75);
  check('week 1 total for 1A is its week points', weekResults[WEEK].byClass['101'].totalPoints, 75);
  check('1C week 1 (no penalty) is 55', weekResults[WEEK].byClass['103'].weekPoints, 55);

  const week2_1A = weekResults[week2].byClass['101'];
  check('week 2 starts from a fresh weekly entitlement', week2_1A.totalCoins, 68);
  check('week 2 previous total = week 1 total (75)', week2_1A.previousTotal, 75);
  check('week 2 total = 75 + 68', week2_1A.totalPoints, 143);

  // 2B had no week-2 entries, so it scores its untouched entitlement: 5x10 + 20 = 70 coins.
  const week2_2B = weekResults[week2].byClass['105'];
  check('a class with no week-2 entries scores its full entitlement', week2_2B.weekPoints, 70);
  check('and accumulates 89 + 70', week2_2B.totalPoints, 159);

  check('year leader is 2B on 159', yearRows.find((r) => String(r.classId) === '105').totalPoints, 159);
  check('weeks are walked in date order', Object.keys(weekResults), [WEEK, week2]);
}

console.log('\n10. Monthly standings, cups and best class of the year');
{
  const scored = scoredWeek(SETTINGS_SHEET);
  const standings = computeMonthlyStandings({ [WEEK]: scored }, [WEEK]);

  check('one month bucket', Object.keys(standings), ['2024-03']);
  const cups = computeCups(standings['2024-03'], 'monthPoints');
  check('month cups mirror the week (2B then a PCC class)', `${cups[0].className}/${cups[1].programme}`, '2B/PCC');

  const best = computeBestClassOfYear(scored.rows, 'totalPoints');
  check('best class of the year is 2B on 237', best.className, '2B');
  check('best class keeps the score for display', best.points, 237);
}

console.log("\n11. Teacher coin totals (counters, not events)");
{
  const teachers = [
    { id: 1, name: 'Abdul Rahman', emp_id: '106' },
    { id: 44, name: 'S. Parsana Banu', emp_id: '125' },
    { id: 7, name: 'Saleemur Rahman', emp_id: '103' },
  ];
  const teacherCoins = [
    { week_start: WEEK, teacher_id: 1, coins: 12 },
    { week_start: WEEK, teacher_id: 44, coins: 30 },
    { week_start: '2024-03-11', teacher_id: 1, coins: 8 },
  ];

  const yearTotals = computeTeacherTotals(teacherCoins, teachers);
  check('year total for teacher 1 is 12 + 8', yearTotals.find((t) => t.teacher_id === 1).coins_taken, 20);
  check('teacher 44 leads with 30', yearTotals[0].coins_taken, 30);
  check('the teacher name is joined in', yearTotals[0].name, 'S. Parsana Banu');

  const weekTotals = computeTeacherTotals(teacherCoins, teachers, [WEEK]);
  check('a single week ignores the other week', weekTotals.find((t) => t.teacher_id === 1).coins_taken, 12);
}

console.log('\n12. Week identifier');
{
  check('Monday maps to itself', weekStartOf('2024-03-04'), '2024-03-04');
  check('Sunday maps back to that Monday', weekStartOf('2024-03-10'), '2024-03-04');
  check('a mid-week date maps to its Monday', weekStartOf('2024-03-07'), '2024-03-04');
  check('the next Monday is a new week', weekStartOf('2024-03-11'), '2024-03-11');
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
