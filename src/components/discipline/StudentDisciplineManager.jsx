import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ConditionalBlock, useCanAccess } from '../portal-shared/ConditionalBlock';
import MultiSelectDropdown from '../MultiSelectDropdown';
import { showToast } from '../../utils/toast';
import disciplineService from '../../services/disciplineService';
import {
  computeYearProgression,
  computeShieldRecommendations,
  getStoredShieldDecisions,
  computeMonthlyStandings,
  computeCups,
  computeBestClassOfYear,
  computeTeacherTotals,
  DEFAULT_SETTINGS,
  monthKeyOf,
  weekOfMonth,
  academicMonthsForAy,
} from '../../utils/disciplineScoring';
import ScorecardTab from './tabs/ScorecardTab';
import TeacherCoinsTab from './tabs/TeacherCoinsTab';
import AwardsTab from './tabs/AwardsTab';
import ConfigTab from './tabs/ConfigTab';
import ClassCoinStackModal from './modals/ClassCoinStackModal';

/**
 * Student Discipline - weekly class discipline scorecard.
 *
 * One academic year is loaded per refresh (get_discipline_year_data) and every figure on screen is
 * derived from the stored coin counters by utils/disciplineScoring.js, so the table, the graphs and
 * the honours can never disagree with each other.
 */
const StudentDisciplineManager = ({
  userRoles = [],
  user = null,
  teacherRecord = null,
  fullName = '',
}) => {
  const canAccess = useCanAccess(userRoles);

  const TABS = useMemo(
    () => [
      {
        id: 'scorecard',
        componentName: 'discipline-tab-scorecard',
        label: 'Scorecard',
        icon: 'fa-table-cells',
      },
      {
        id: 'teachers',
        componentName: 'discipline-tab-teachers',
        label: 'Teacher Coins',
        icon: 'fa-hand-holding-dollar',
      },
      {
        id: 'awards',
        componentName: 'discipline-tab-awards',
        label: 'Shields & Cups',
        icon: 'fa-trophy',
      },
      { id: 'config', componentName: 'discipline-tab-config', label: 'Setup', icon: 'fa-gear' },
    ],
    []
  );

  const availableTabs = useMemo(
    () => TABS.filter((tab) => canAccess(tab.componentName)),
    [TABS, canAccess]
  );

  const [activeTab, setActiveTab] = useState('scorecard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [yearData, setYearData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [calendarMonths, setCalendarMonths] = useState(null);
  const [programmeFilter, setProgrammeFilter] = useState('ALL');
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [scorecardView, setScorecardView] = useState('table');
  const [chartMetric, setChartMetric] = useState('coins');
  const [teacherScope, setTeacherScope] = useState('week');
  const [stackClassId, setStackClassId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendationPicks, setRecommendationPicks] = useState({});

  const canLog = canAccess('discipline-log-coins');
  // Loading a week's coins is its own capability: it is what starts the week.
  const canRefill = canAccess('discipline-refill-week');
  // Only management or a coordinator may put a taken coin back.
  const canRestore = canAccess('discipline-restore-coin');
  const canShowRecommendation = canAccess('discipline-show-recommendation');
  const canGold = canAccess('discipline-gold-coin');
  const canConfigure = canAccess('discipline-config');

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  const loadYear = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await disciplineService.fetchDisciplineYear(null);
      setYearData(data);
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadYear();
  }, [loadYear]);

  const categories = useMemo(() => yearData?.categories || [], [yearData]);
  const settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...(yearData?.settings || {}) }),
    [yearData]
  );
  const classes = useMemo(() => yearData?.classes || [], [yearData]);
  const teachers = useMemo(() => yearData?.teachers || [], [yearData]);
  const coins = useMemo(() => yearData?.coins || [], [yearData]);
  const teacherCoins = useMemo(() => yearData?.teacher_coins || [], [yearData]);
  const weeks = useMemo(() => yearData?.weeks || [], [yearData]);
  const weekOptions = useMemo(() => yearData?.week_options || [], [yearData]);
  const weekController = useMemo(() => yearData?.week_controller || [], [yearData]);

  /** A controller row, rather than placeholder coin rows, marks a week as open for scoring. */
  const loadedWeeks = useMemo(() => {
    const list = yearData?.coin_weeks;
    if (!Array.isArray(list)) return null;
    return new Set(list.map((w) => String(w).slice(0, 10)));
  }, [yearData]);

  const isWeekLoaded = useCallback(
    (week) => {
      const key = String(week || '').slice(0, 10);
      if (!key) return false;
      // A payload from before the concept carries no list: then nothing can be gated, and every week
      // is scored exactly as it was before.
      if (!loadedWeeks) return true;
      return loadedWeeks.has(key);
    },
    [loadedWeeks]
  );

  /**
   * Every week the user can offer a coin to: the weeks of this academic year and the weeks the server
   * offers for back-entry (week_options). A week that has not started yet is never offered, because a
   * coin belongs to a week that is under way - the server refuses the rest as well.
   */
  const selectableWeeks = useMemo(() => {
    const all = [...weeks, ...weekOptions];
    const current = String(yearData?.current_week_start || '').slice(0, 10);
    return [...new Set(all.map((w) => String(w).slice(0, 10)))]
      .filter(Boolean)
      .filter((w) => !current || w <= current)
      .sort();
  }, [weeks, weekOptions, yearData]);

  // The payload carries the academic months, so the picker needs no second call; an older payload
  // does not, and then academic_calendar is read directly for the same answer.
  const payloadHasMonths = Array.isArray(yearData?.months) && yearData.months.length > 0;

  useEffect(() => {
    if (!yearData?.ay || payloadHasMonths) {
      setCalendarMonths(null);
      return undefined;
    }

    let cancelled = false;
    disciplineService.fetchAcademicMonths(yearData.ay).then((rows) => {
      if (!cancelled) setCalendarMonths(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [yearData, payloadHasMonths]);

  /**
   * The academic months of this academic year, in the sequence academic_calendar keeps them. The
   * year's own months are used first; failing that the calendar is read directly, and failing that
   * the months are derived from the `ay` label, so the picker always shows the academic year rather
   * than a sliding window of the last twelve months.
   */
  const monthOptions = useMemo(() => {
    const source = payloadHasMonths
      ? yearData.months
      : calendarMonths && calendarMonths.length > 0
        ? calendarMonths
        : academicMonthsForAy(yearData?.ay);

    const byKey = new Map();
    source.forEach((row) => {
      const year = Number(row?.year);
      const month = Number(row?.month);
      if (!Number.isFinite(year) || !(month >= 1 && month <= 12)) return;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (!byKey.has(key)) byKey.set(key, formatMonthLabel(key));
    });

    return [...byKey.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }));
  }, [payloadHasMonths, yearData, calendarMonths]);

  // The month the working week falls in - the month the picker opens on.
  const currentMonthKey = useMemo(() => monthKeyOf(yearData?.current_week_start), [yearData]);

  // The month follows the current week until the user picks another one.
  useEffect(() => {
    setSelectedMonth((prev) => {
      if (monthOptions.length === 0) return null;
      if (prev && monthOptions.some((option) => option.value === prev)) return prev;
      if (currentMonthKey && monthOptions.some((option) => option.value === currentMonthKey)) {
        return currentMonthKey;
      }
      // The current week sits in a month the calendar does not list: stay on the latest month that
      // has already begun, else on the first one.
      const started = currentMonthKey
        ? monthOptions.filter((option) => option.value <= currentMonthKey)
        : [];
      return (started[started.length - 1] || monthOptions[0]).value;
    });
  }, [monthOptions, currentMonthKey]);

  // The weeks the selected month holds, oldest first, so they read W1, W2, W3 ...
  const weeksForMonth = useMemo(
    () =>
      selectedMonth ? selectableWeeks.filter((week) => monthKeyOf(week) === selectedMonth) : [],
    [selectableWeeks, selectedMonth]
  );

  // The working week stays inside the month: picking a month moves to that month's latest week, and
  // the current week wins whenever the month holds it.
  useEffect(() => {
    setSelectedWeek((prev) => {
      const chosen = prev ? String(prev).slice(0, 10) : null;
      if (chosen && weeksForMonth.includes(chosen)) return chosen;
      if (weeksForMonth.length === 0) return null;
      const current = String(yearData?.current_week_start || '').slice(0, 10);
      if (current && weeksForMonth.includes(current)) return current;
      return weeksForMonth[weeksForMonth.length - 1];
    });
  }, [weeksForMonth, yearData]);

  // The weeks that take part in the running totals: the year's weeks plus whichever loaded week the
  // user is looking at, so a week that has no coins yet is never scored as a full board.
  const scoringWeeks = useMemo(() => {
    const all = weekController.map((controller) => controller.week_start);
    if (selectedWeek && isWeekLoaded(selectedWeek)) all.push(selectedWeek);
    return [...new Set(all.map((w) => String(w).slice(0, 10)))].filter(Boolean).sort();
  }, [weekController, selectedWeek, isWeekLoaded]);

  // Month progression follows loaded weeks; academic-year awards use a separate cumulative total.
  const progression = useMemo(() => {
    if (!yearData) return { yearRows: [], weeks: {} };
    return computeYearProgression({
      classes,
      categories,
      weeks: scoringWeeks,
      coins,
      weekControllers: weekController,
      settings,
    });
  }, [yearData, classes, categories, scoringWeeks, coins, weekController, settings]);

  const weekScores = useMemo(
    () => progression.weeks[String(selectedWeek)]?.rows || [],
    [progression, selectedWeek]
  );

  const visibleRows = useMemo(
    () =>
      weekScores.filter((row) => {
        if (programmeFilter !== 'ALL' && (row.programme || '') !== programmeFilter) return false;
        if (selectedClassIds.length > 0 && !selectedClassIds.includes(String(row.classId)))
          return false;
        return true;
      }),
    [weekScores, programmeFilter, selectedClassIds]
  );

  const selectedWeekController = useMemo(
    () =>
      weekController.find(
        (controller) => String(controller.week_start).slice(0, 10) === String(selectedWeek)
      ) || null,
    [weekController, selectedWeek]
  );
  const canEditSelectedWeek = Boolean(selectedWeekController?.allow_edits);
  const recommendations = useMemo(
    () => computeShieldRecommendations(weekScores, categories),
    [weekScores, categories]
  );
  const storedShieldResults = useMemo(
    () =>
      getStoredShieldDecisions(
        weekScores,
        categories,
        selectedWeekController,
        recommendations.pending
      ),
    [weekScores, categories, selectedWeekController, recommendations]
  );
  const shieldResults = useMemo(() => {
    if (!showRecommendation) return storedShieldResults;

    const winnersByCategory = {};
    const shields = [];
    const shieldCounts = {};
    categories
      .filter((category) => (category.coin_kind || 'discipline') === 'discipline')
      .forEach((category) => {
        const categoryKey = String(category.id);
        const proposed = recommendations.winnersByCategory[categoryKey] || [];
        const tie = recommendations.pending.find(
          (entry) => String(entry.categoryId) === categoryKey
        );
        const tieIds = new Set((tie?.tieCandidateIds || []).map(String));
        const direct = proposed.filter((winner) => !winner._rule5);
        const selectedTie = tie
          ? (recommendationPicks[categoryKey] || tie.recommendedIds)
              .map(String)
              .filter((id) => tieIds.has(id))
              .map((id) => tie.candidates.find((candidate) => String(candidate.classId) === id))
              .filter(Boolean)
              .map((candidate) => ({
                ...weekScores.find((row) => String(row.classId) === String(candidate.classId)),
                _coins: tie.coins,
                _rule5: true,
              }))
          : [];
        const winners = [...direct, ...selectedTie].filter(Boolean);
        winnersByCategory[categoryKey] = winners;
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
            rule5: Boolean(winner._rule5),
            recommendation: true,
          });
        });
      });
    return { shields, winnersByCategory, shieldCounts };
  }, [
    showRecommendation,
    storedShieldResults,
    categories,
    recommendations,
    recommendationPicks,
    weekScores,
  ]);
  const shields = shieldResults;

  useEffect(() => {
    setShowRecommendation(false);
    setRecommendationPicks({});
  }, [selectedWeek]);

  // The coins recorded in the selected week, for the stack popup.
  const weekCoins = useMemo(
    () =>
      coins.filter((c) => String(c.week_start).slice(0, 10) === String(selectedWeek).slice(0, 10)),
    [coins, selectedWeek]
  );

  const stackClass = useMemo(
    () => weekScores.find((row) => String(row.classId) === String(stackClassId)) || null,
    [weekScores, stackClassId]
  );

  /**
   * The month's cup points use only loaded weeks not marked ignore_week in the controller.
   */
  const monthlyCups = useMemo(
    () =>
      Object.entries(
        computeMonthlyStandings(
          progression.weeks,
          weekController
            .filter((controller) => !controller.ignore_week)
            .map((controller) => String(controller.week_start).slice(0, 10))
        )
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, rows]) => ({ monthKey, cups: computeCups(rows, 'monthPoints') })),
    [progression, weekController]
  );

  const bestOfYear = useMemo(
    () => computeBestClassOfYear(progression.yearRows, 'totalPoints'),
    [progression]
  );

  const teacherTotals = useMemo(
    () =>
      computeTeacherTotals(
        teacherCoins,
        teachers,
        teacherScope === 'week' && selectedWeek ? [selectedWeek] : null
      ),
    [teacherCoins, teachers, teacherScope, selectedWeek]
  );

  /** One click on a coin: take it out, or (management/coordinator only) put one back. */
  const handleStackAction = async (payload) => {
    if (!canEditSelectedWeek) {
      showToast('Coin edits are locked for this week', 'error');
      return false;
    }
    setSaving(true);
    try {
      if (payload.restore) {
        // The counters hold coins TAKEN, so putting one back is a NEGATIVE delta.
        await disciplineService.adjustCoins({
          classId: payload.classId,
          categoryId: payload.categoryId,
          delta: -1,
          teacherId: payload.teacherId,
          weekStart: payload.weekStart,
        });
        showToast('Coin put back', 'success');
      } else {
        await disciplineService.logCoins({
          classId: payload.classId,
          categoryId: payload.categoryId,
          teacherId: payload.teacherId,
          coins: 1,
          weekStart: payload.weekStart,
        });
        showToast('Coin taken', 'success');
      }
      await loadYear();
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleRecommendations = () => {
    if (showRecommendation) {
      setShowRecommendation(false);
      return;
    }

    setRecommendationPicks(
      Object.fromEntries(
        recommendations.pending.map((entry) => [
          String(entry.categoryId),
          entry.recommendedIds.map(String),
        ])
      )
    );
    setShowRecommendation(true);
  };

  const handleRecommendationSelection = (categoryId, classIds) => {
    setRecommendationPicks((current) => ({
      ...current,
      [String(categoryId)]: classIds.map(String),
    }));
  };

  const handleSaveRecommendation = async () => {
    if (!selectedWeek) return false;
    setSaving(true);
    try {
      const shieldDecision = {};
      categories
        .filter((category) => (category.coin_kind || 'discipline') === 'discipline')
        .forEach((category) => {
          const categoryKey = String(category.id);
          const winners = recommendations.winnersByCategory[categoryKey] || [];
          const tie = recommendations.pending.find(
            (entry) => String(entry.categoryId) === categoryKey
          );
          const tieIds = new Set((tie?.tieCandidateIds || []).map(String));
          const directIds = winners
            .filter((winner) => !winner._rule5)
            .map((winner) => String(winner.classId));
          const selectedTieIds = (recommendationPicks[categoryKey] || tie?.recommendedIds || [])
            .map(String)
            .filter((id) => tieIds.has(id));
          const selectedIds = [...directIds, ...selectedTieIds];
          const classNames = selectedIds
            .map((id) => weekScores.find((row) => String(row.classId) === id)?.className)
            .filter(Boolean);
          shieldDecision[category.name] = classNames;
        });

      await disciplineService.saveDisciplineRecommendation({
        weekStart: selectedWeek,
        shieldDecision,
      });
      showToast('Recommendation saved', 'success');
      await loadYear();
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategory = async (id, patch) => {
    setSaving(true);
    try {
      await disciplineService.updateCategory(id, patch);
      showToast('Discipline updated', 'success');
      await loadYear();
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (patch) => {
    setSaving(true);
    try {
      await disciplineService.updateSettings(patch);
      showToast('Settings updated', 'success');
      await loadYear();
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Open the selected week for scoring. Its controller row marks the week as loaded; missing coin
   * rows mean each class still has its full weekly entitlement.
   */
  const handleRefillWeek = async () => {
    if (!selectedWeek) return false;
    setSaving(true);
    try {
      await disciplineService.refillWeek(selectedWeek);
      showToast(`Coins loaded for ${formatWeekOptionLabel(selectedWeek)}`, 'success');
      await loadYear();
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** The entry point for taking coins: open this week's class stacks. */
  const openCoinStacks = () => {
    const target = visibleRows[0] || weekScores[0];
    if (!target) {
      showToast('No class to take a coin from in this week', 'error');
      return;
    }
    setStackClassId(String(target.classId));
  };

  const classOptions = useMemo(
    () =>
      classes.map((c) => ({
        value: String(c.id),
        label: c.programme ? `${c.name} (${c.programme})` : c.name,
      })),
    [classes]
  );

  /** The class list inside the coin-stack modal, in the order the scorecard shows the classes. */
  const stackClassOptions = useMemo(
    () =>
      (visibleRows.length > 0 ? visibleRows : weekScores).map((row) => ({
        value: String(row.classId),
        label: row.programme ? `${row.className} (${row.programme})` : row.className,
      })),
    [visibleRows, weekScores]
  );

  /**
   * The logged-in user's own staff record, matched against the teacher list the payload returns (that
   * list only contains Jamia Zaytoonah staff) so the default "submit as me" needs no lookup. Null when
   * the login is not linked to a JZV employee - then the picker takes over, and the database refuses
   * anybody else anyway.
   */
  const currentTeacher = useMemo(() => {
    if (!teacherRecord) return null;

    const org = String(teacherRecord.organization || '')
      .trim()
      .toUpperCase();
    if (org && org !== 'JZV' && org !== 'JAMIA ZAYTOONAH') return null;

    const match = teachers.find(
      (t) =>
        (teacherRecord.id && String(t.id) === String(teacherRecord.id)) ||
        (teacherRecord.emp_id && t.emp_id && String(t.emp_id) === String(teacherRecord.emp_id))
    );
    if (match) return match;
    if (!teacherRecord.id) return null;
    return {
      id: teacherRecord.id,
      name: teacherRecord.name || teacherRecord.full_name || fullName || 'Me',
      emp_id: teacherRecord.emp_id || null,
    };
  }, [teacherRecord, teachers, fullName]);

  /**
   * A week that was never loaded holds no coin rows, so it is not scored and nothing on it may be
   * highlighted - a board built out of nothing would tie every class on its full entitlement and
   * recommend a shield out of that tie. The week-dependent tabs show the loading panel instead.
   */
  const weekLoaded = Boolean(selectedWeek) && isWeekLoaded(selectedWeek);
  const tabNeedsWeek =
    activeTab === 'scorecard' ||
    activeTab === 'awards' ||
    (activeTab === 'teachers' && teacherScope === 'week');
  const showWeekGate = tabNeedsWeek && loadedWeeks !== null && !weekLoaded;

  return (
    <div className="w-full flex flex-col min-h-[500px]" data-feature="class-discipline-board">
      {/* ── HEADER SECTION ── */}
      <div className="w-full bg-white border-b border-light-border px-4 sm:px-6 py-3 print:hidden shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base shadow-2xs shrink-0">
              <i className="fas fa-coins" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                Student Discipline
              </h1>
              <p className="text-[11px] font-semibold text-dark-muted hidden sm:block">
                Weekly class discipline coins, shields and cups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-dark-muted">
              Month
              <select
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-light-border rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
                title="Academic month"
                data-feature-filter="month-selector"
              >
                {monthOptions.length === 0 && <option value="">No months yet</option>}
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-dark-muted">
              Week
              <select
                value={selectedWeek || ''}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-white border border-light-border rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
                title="Week of the selected month"
                data-feature-filter="week-selector"
              >
                {weeksForMonth.length === 0 && <option value="">No weeks this month</option>}
                {weeksForMonth.map((week) => (
                  <option key={week} value={week}>
                    {formatWeekOptionLabel(week)}
                    {week === String(yearData?.current_week_start || '').slice(0, 10)
                      ? ' · this week'
                      : ''}
                    {!isWeekLoaded(week) ? ' · not opened' : ''}
                    {isWeekLoaded(week) &&
                    weekController.find(
                      (controller) => String(controller.week_start).slice(0, 10) === week
                    )?.ignore_week
                      ? ' · ignored'
                      : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={loadYear}
              disabled={loading}
              className="p-2 rounded-xl border border-light-border bg-white text-dark-soft hover:bg-light-lbg hover:text-dark-primary transition-all cursor-pointer disabled:opacity-50"
              title="Refresh"
            >
              <i className={`fas fa-rotate ${loading ? 'fa-spin' : ''} text-sm`} />
            </button>
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl border border-light-border bg-white text-dark-soft hover:bg-light-lbg hover:text-dark-primary transition-all cursor-pointer"
              title="Print the scorecard"
            >
              <i className="fas fa-print text-sm" />
            </button>
            {canLog && weekLoaded && canEditSelectedWeek && (
              <button
                onClick={openCoinStacks}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-500 hover:bg-amber-600 text-[11px] font-bold text-white transition-all cursor-pointer shadow-sm"
                title="Open a class's coin stacks and take a coin out of it"
                data-feature-action="discipline-take-coins"
              >
                <i className="fas fa-hand-holding-dollar text-[11px]" />
                Take coins
              </button>
            )}{' '}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div
            className="sm:hidden relative w-full"
            data-feature-tab="class-discipline-board-mobile"
          >
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full appearance-none bg-white border border-light-border rounded-xl px-3.5 py-2 pr-8 text-xs font-extrabold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
            >
              {availableTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
            <i className="fas fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-dark-soft pointer-events-none" />
          </div>

          <div
            className="hidden sm:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar shrink-0"
            data-feature-tab="class-discipline-board-tabs"
          >
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className={`fas ${tab.icon} text-[10px]`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2"
            data-feature-filter={activeTab}
          >
            {activeTab === 'scorecard' && (
              <div
                className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl"
                data-feature-tab="discipline-scorecard-view"
              >
                {[
                  { id: 'table', label: 'Table', icon: 'fa-table' },
                  { id: 'graph', label: 'Graph', icon: 'fa-chart-column' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setScorecardView(option.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      scorecardView === option.id
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-dark-muted hover:text-dark-primary'
                    }`}
                  >
                    <i className={`fas ${option.icon} text-[10px]`} />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {activeTab === 'scorecard' && canShowRecommendation && weekLoaded && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleRecommendations}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    showRecommendation
                      ? 'border-amber-400 bg-amber-50 text-amber-900'
                      : 'border-light-border bg-white text-dark-primary hover:bg-light-lbg'
                  }`}
                  title="Calculate the shield recommendation for this week"
                  data-feature-action="discipline-show-recommendation"
                >
                  <i
                    className={`fas ${showRecommendation ? 'fa-eye-slash' : 'fa-wand-magic-sparkles'}`}
                  />
                  {showRecommendation ? 'Hide Recommendation' : 'Show Recommendation'}
                </button>
                {showRecommendation && (
                  <button
                    onClick={handleSaveRecommendation}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50"
                    title="Save the selected shield recommendations to the week controller"
                    data-feature-action="discipline-save-recommendation"
                  >
                    <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} />
                    Save Recommendation
                  </button>
                )}
              </div>
            )}
            {activeTab === 'scorecard' && scorecardView === 'graph' && (
              <select
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value)}
                className="border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary bg-white outline-none focus:ring-2 focus:ring-brand-primary"
                title="What the graph plots"
              >
                <option value="coins">Coins left by discipline</option>
                <option value="points">Points make-up</option>
                <option value="trend">Weekly points trend</option>
              </select>
            )}
            <select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
              className="border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary bg-white outline-none focus:ring-2 focus:ring-brand-primary"
              title="Programme"
            >
              <option value="ALL">All</option>
              <option value="PCC">PCC</option>
              <option value="GCC">GCC</option>
            </select>
            <MultiSelectDropdown
              label=""
              placeholder="All classes"
              options={classOptions}
              selected={selectedClassIds}
              onChange={setSelectedClassIds}
            />
            {activeTab === 'teachers' && (
              <select
                value={teacherScope}
                onChange={(e) => setTeacherScope(e.target.value)}
                className="border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary bg-white outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="week">This week</option>
                <option value="year">Whole year</option>
              </select>
            )}{' '}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT SECTION ── */}
      <div
        className="w-full p-4 sm:p-6 flex-1 animate-in fade-in duration-200"
        data-feature="class-discipline-board-content"
      >
        {loading && !yearData ? (
          <div className="flex items-center justify-center py-20 text-dark-muted">
            <i className="fas fa-circle-notch fa-spin text-2xl mr-3" />
            <span className="text-sm font-semibold">Loading the scorecard…</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <i className="fas fa-triangle-exclamation text-red-500 text-xl" />
            <p className="mt-2 text-sm font-bold text-red-700">{error}</p>
            <button
              onClick={loadYear}
              className="mt-3 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : showWeekGate ? (
          <div
            className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-8 sm:p-10 text-center"
            data-feature="discipline-week-not-loaded"
          >
            <i
              className={`fas ${
                selectedWeek ? 'fa-coins' : 'fa-calendar-xmark'
              } text-2xl text-amber-500`}
            />
            {selectedWeek ? (
              <>
                <p className="mt-2 text-sm font-black text-dark-primary">
                  This week has not been opened
                </p>
                <p className="mt-1 text-[11px] font-semibold text-dark-muted">
                  {formatWeekOptionLabel(selectedWeek)} ·{' '}
                  {formatMonthLabel(monthKeyOf(selectedWeek))} is not open for scoring yet.
                </p>
                {canRefill ? (
                  <button
                    onClick={handleRefillWeek}
                    disabled={saving}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-300 bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    title="Open the week for scoring"
                    data-feature-action="discipline-load-coins"
                  >
                    <i
                      className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-hand-holding-dollar'}`}
                    />
                    Open this week
                  </button>
                ) : (
                  <p className="mt-3 text-[11px] font-semibold text-dark-muted">
                    Ask the management to open this week for scoring.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mt-2 text-sm font-black text-dark-primary">No week to score</p>
                <p className="mt-1 text-[11px] font-semibold text-dark-muted">
                  {selectedMonth
                    ? `${formatMonthLabel(selectedMonth)} has no weeks available yet.`
                    : 'Choose an academic month that has already begun.'}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {activeTab === 'scorecard' && (
              <ConditionalBlock name="discipline-tab-scorecard" roles={userRoles}>
                <ScorecardTab
                  categories={categories}
                  rows={visibleRows}
                  weekResults={progression.weeks}
                  weeks={weeks}
                  selectedWeek={selectedWeek}
                  shields={shields.shields}
                  winnersByCategory={shields.winnersByCategory}
                  weekLocked={Boolean(selectedWeekController && !canEditSelectedWeek)}
                  showRecommendation={showRecommendation}
                  recommendations={recommendations.pending}
                  recommendationPicks={recommendationPicks}
                  onRecommendationSelection={handleRecommendationSelection}
                  settings={settings}
                  view={scorecardView}
                  metric={chartMetric}
                  onOpenClass={setStackClassId}
                  canTakeCoins={canLog && canEditSelectedWeek}
                />
              </ConditionalBlock>
            )}

            {activeTab === 'teachers' && (
              <ConditionalBlock name="discipline-tab-teachers" roles={userRoles}>
                <TeacherCoinsTab
                  totals={teacherTotals}
                  scope={teacherScope}
                  selectedWeek={selectedWeek}
                  onRefresh={loadYear}
                />
              </ConditionalBlock>
            )}

            {activeTab === 'awards' && (
              <ConditionalBlock name="discipline-tab-awards" roles={userRoles}>
                <AwardsTab
                  categories={categories}
                  shields={shields.shields}
                  winnersByCategory={shields.winnersByCategory}
                  shieldCounts={shields.shieldCounts}
                  notes={showRecommendation ? recommendations.notes : []}
                  monthlyCups={monthlyCups}
                  bestOfYear={bestOfYear}
                  selectedWeek={selectedWeek}
                />
              </ConditionalBlock>
            )}

            {activeTab === 'config' && (
              <ConditionalBlock name="discipline-tab-config" roles={userRoles}>
                <ConfigTab
                  categories={categories}
                  settings={settings}
                  classes={classes}
                  canConfigure={canConfigure}
                  saving={saving}
                  onSaveCategory={handleSaveCategory}
                  onSaveSettings={handleSaveSettings}
                />
              </ConditionalBlock>
            )}
          </>
        )}
      </div>

      {stackClass && (
        <ClassCoinStackModal
          open={Boolean(stackClass)}
          onClose={() => setStackClassId(null)}
          classRow={stackClass}
          classOptions={stackClassOptions}
          onChangeClass={setStackClassId}
          categories={categories}
          coins={weekCoins}
          teachers={teachers}
          currentTeacher={currentTeacher}
          weekStart={selectedWeek}
          weekLabel={formatWeekLabel(selectedWeek)}
          canRestore={canRestore}
          canGold={canGold}
          saving={saving}
          onSubmit={handleStackAction}
        />
      )}
    </div>
  );
};

const formatWeekLabel = (weekStart) => {
  if (!weekStart) return '—';
  const start = new Date(`${String(weekStart).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime())) return String(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const short = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return `${short(start)} – ${short(end)}`;
};

/** The week as the month reads it: its Monday decides the month, and its date the week of that month. */
const formatWeekOptionLabel = (weekStart) =>
  `W${weekOfMonth(weekStart)} · ${formatWeekLabel(weekStart)}`;

/** The month as the picker shows it: '2026-10' -> 'October 2026'. */
const formatMonthLabel = (monthKey) => {
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!year || !(month >= 1 && month <= 12)) return String(monthKey);
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
};

export default StudentDisciplineManager;
