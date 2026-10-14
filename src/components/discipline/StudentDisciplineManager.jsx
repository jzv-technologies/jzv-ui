import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ConditionalBlock, useCanAccess } from '../portal-shared/ConditionalBlock';
import MultiSelectDropdown from '../MultiSelectDropdown';
import { showToast } from '../../utils/toast';
import disciplineService from '../../services/disciplineService';
import {
  computeYearProgression,
  computeWeeklyShields,
  computeMonthlyStandings,
  computeCups,
  computeBestClassOfYear,
  computeTeacherTotals,
  DEFAULT_SETTINGS,
  weekStartOf,
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
const StudentDisciplineManager = ({ userRoles = [], user = null, teacherRecord = null, fullName = '' }) => {
  const canAccess = useCanAccess(userRoles);

  const TABS = useMemo(
    () => [
      { id: 'scorecard', componentName: 'discipline-tab-scorecard', label: 'Scorecard', icon: 'fa-table-cells' },
      { id: 'teachers', componentName: 'discipline-tab-teachers', label: 'Teacher Coins', icon: 'fa-hand-holding-dollar' },
      { id: 'awards', componentName: 'discipline-tab-awards', label: 'Shields & Cups', icon: 'fa-trophy' },
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
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [programmeFilter, setProgrammeFilter] = useState('ALL');
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [chartMetric, setChartMetric] = useState('coins');
  const [teacherScope, setTeacherScope] = useState('week');
  const [stackClassId, setStackClassId] = useState(null);
  const [extraWeeks, setExtraWeeks] = useState([]);
  const [saving, setSaving] = useState(false);

  const canLog = canAccess('discipline-log-coins');
  // Only management or a coordinator may put a taken coin back.
  const canRestore = canAccess('discipline-restore-coin');
  const canDecideShield = canAccess('discipline-shield-decide');
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
      setSelectedWeek((prev) => {
        const weeks = data?.weeks || [];
        if (prev && weeks.some((w) => String(w) === String(prev))) return prev;
        return data?.current_week_start || weeks[weeks.length - 1] || null;
      });
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

  /**
   * Every week the user can pick: the weeks of this academic year, the weeks the server offers for
   * back-entry (week_options) and any past week the user typed in - so last week's coins can still
   * be entered after the fact.
   */
  const weekChoices = useMemo(() => {
    const all = [...weeks, ...(yearData?.week_options || []), ...extraWeeks];
    if (selectedWeek) all.push(selectedWeek);
    return [...new Set(all.map((w) => String(w).slice(0, 10)))].filter(Boolean).sort().reverse();
  }, [weeks, yearData, extraWeeks, selectedWeek]);

  // The weeks that take part in the running totals: the year's weeks plus whichever past week the
  // user is entering data for, so a week that has no rows yet still renders (as a full board).
  const scoringWeeks = useMemo(() => {
    const all = [...weeks, ...extraWeeks];
    if (selectedWeek) all.push(selectedWeek);
    return [...new Set(all.map((w) => String(w).slice(0, 10)))].filter(Boolean).sort();
  }, [weeks, extraWeeks, selectedWeek]);

  // Year progression: every week scored in order so previous/current totals accumulate.
  const progression = useMemo(() => {
    if (!yearData) return { yearRows: [], weeks: {} };
    return computeYearProgression({ classes, categories, weeks: scoringWeeks, coins, settings });
  }, [yearData, classes, categories, scoringWeeks, coins, settings]);

  const weekScores = useMemo(
    () => progression.weeks[String(selectedWeek)]?.rows || [],
    [progression, selectedWeek]
  );

  const visibleRows = useMemo(
    () =>
      weekScores.filter((row) => {
        if (programmeFilter !== 'ALL' && (row.programme || '') !== programmeFilter) return false;
        if (selectedClassIds.length > 0 && !selectedClassIds.includes(String(row.classId))) return false;
        return true;
      }),
    [weekScores, programmeFilter, selectedClassIds]
  );

  const shields = useMemo(
    () =>
      computeWeeklyShields(weekScores, categories, {
        settings,
        weekStart: selectedWeek,
        decisions: yearData?.shield_decisions || [],
      }),
    [weekScores, categories, settings, selectedWeek, yearData]
  );

  // The coins recorded in the selected week, for the stack popup.
  const weekCoins = useMemo(
    () => coins.filter((c) => String(c.week_start).slice(0, 10) === String(selectedWeek).slice(0, 10)),
    [coins, selectedWeek]
  );

  const stackClass = useMemo(
    () => weekScores.find((row) => String(row.classId) === String(stackClassId)) || null,
    [weekScores, stackClassId]
  );

  const monthlyCups = useMemo(
    () =>
      Object.entries(computeMonthlyStandings(progression.weeks, weeks))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, rows]) => ({ monthKey, cups: computeCups(rows, 'monthPoints') })),
    [progression, weeks]
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

  const handleDecideShield = async ({ categoryId, classIds = [], clear = false }) => {
    setSaving(true);
    try {
      if (clear) {
        await disciplineService.clearShieldDecision({ weekStart: selectedWeek, categoryId });
        showToast('Decision cleared - the criteria decide again', 'info');
      } else {
        await disciplineService.replaceShieldDecisions({
          weekStart: selectedWeek,
          categoryId,
          classIds,
        });
        showToast(
          classIds.length === 1 ? 'Shield finalised' : `${classIds.length} shields finalised`,
          'success'
        );
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
   * Jump to the week a typed date belongs to. This is the back-entry path: a week that has no coins
   * yet is added to the picker and to the scoring weeks, so its board renders as a full board and
   * coins can be taken into it.
   */
  const selectWeekFromDate = (value) => {
    const monday = weekStartOf(value);
    if (!monday) return;
    const known = [...weeks, ...(yearData?.week_options || []), ...extraWeeks].some(
      (w) => String(w).slice(0, 10) === monday
    );
    if (!known) setExtraWeeks((prev) => [...new Set([...prev, monday])]);
    setSelectedWeek(monday);
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

    const org = String(teacherRecord.organization || '').trim().toUpperCase();
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

  return (
    <div className="w-full flex flex-col min-h-[500px]" data-feature="student-discipline">
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
              Week
              <select
                value={selectedWeek || ''}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-white border border-light-border rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
                data-feature-filter="week-selector"
              >
                {weekChoices.length === 0 && <option value="">No weeks yet</option>}
                {weekChoices.map((week) => (
                  <option key={week} value={week}>
                    {formatWeekLabel(week)}
                    {week === String(yearData?.current_week_start || '').slice(0, 10)
                      ? ' · this week'
                      : ''}
                  </option>
                ))}
              </select>
            </label>

            {/* Back-entry: pick any date and the week it belongs to becomes the working week. */}
            <label
              className="flex items-center gap-1.5 text-[11px] font-bold text-dark-muted"
              title="Enter the data for a past week"
            >
              <i className="fas fa-calendar-day text-dark-soft" />
              <input
                type="date"
                onChange={(e) => selectWeekFromDate(e.target.value)}
                className="bg-white border border-light-border rounded-xl px-2 py-1.5 text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
                data-feature-filter="week-date"
              />
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

            {canLog && (
              <button
                onClick={openCoinStacks}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-500 hover:bg-amber-600 text-[11px] font-bold text-white transition-all cursor-pointer shadow-sm"
                title="Open a class's coin stacks and take a coin out of it"
                data-feature-action="discipline-take-coins"
              >
                <i className="fas fa-hand-holding-dollar text-[11px]" />
                Take coins
              </button>
            )}          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="sm:hidden relative w-full" data-feature-tab="student-discipline-mobile">
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
            data-feature-tab="student-discipline-tabs"
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
            <select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
              className="border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary bg-white outline-none focus:ring-2 focus:ring-brand-primary"
              title="Programme"
            >
              <option value="ALL">All programmes</option>
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
            )}          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT SECTION ── */}
      <div
        className="w-full p-4 sm:p-6 flex-1 animate-in fade-in duration-200"
        data-feature="student-discipline-content"
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
        ) : (
          <>
            {activeTab === 'scorecard' && (
              <ConditionalBlock name="discipline-tab-scorecard" roles={userRoles}>
                <ScorecardTab
                  categories={categories}
                  rows={visibleRows}
                  allRows={weekScores}
                  weekResults={progression.weeks}
                  weeks={weeks}
                  selectedWeek={selectedWeek}
                  shields={shields.shields}
                  winnersByCategory={shields.winnersByCategory}
                  settings={settings}
                  metric={chartMetric}
                  onMetricChange={setChartMetric}
                  onOpenClass={setStackClassId}
                  canTakeCoins={canLog}
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
                  pending={shields.pending}
                  notes={shields.notes}
                  monthlyCups={monthlyCups}
                  bestOfYear={bestOfYear}
                  selectedWeek={selectedWeek}
                  canDecide={canDecideShield}
                  saving={saving}
                  onDecide={handleDecideShield}
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

export default StudentDisciplineManager;
