// src/components/examinations/ExamAnalysisManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { ConditionalBlock, useCanAccess } from '../portal-shared/ConditionalBlock';
import MultiSelectDropdown from '../MultiSelectDropdown';

// Analysis Sub-Tabs
import ExamMarkDistributionTab from './analysis/ExamMarkDistributionTab';
import ExamStdDevHeatmapTab from './analysis/ExamStdDevHeatmapTab';
import ExamScheduleComparisonTab from './analysis/ExamScheduleComparisonTab';

const TABS = [
  {
    id: 'marks',
    componentName: 'exam-analysis-tab-marks',
    label: 'Mark Distribution',
    icon: 'fa-chart-column',
  },
  {
    id: 'std-dev',
    componentName: 'exam-analysis-tab-std-dev',
    label: 'Standard Deviation Heatmap',
    icon: 'fa-table-cells',
  },
  {
    id: 'compare',
    componentName: 'exam-analysis-tab-compare',
    label: 'Schedule Comparison',
    icon: 'fa-code-compare',
  },
];

const ExamAnalysisManager = ({ userRoles = [], user = null, onBack = null }) => {
  const canAccess = useCanAccess(userRoles);

  // Available tabs filtered strictly by app_view_controller permissions
  const availableTabs = useMemo(() => {
    return TABS.filter((tab) => canAccess(tab.componentName));
  }, [canAccess]);

  const [activeTab, setActiveTab] = useState(() => {
    if (canAccess('exam-analysis-tab-marks')) return 'marks';
    if (canAccess('exam-analysis-tab-std-dev')) return 'std-dev';
    if (canAccess('exam-analysis-tab-compare')) return 'compare';
    return 'marks';
  });

  // Master data
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [masterLoading, setMasterLoading] = useState(true);

  // Filter selections
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  // Schedule marks data
  const [results, setResults] = useState([]);
  const [entries, setEntries] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // 1. Load Core Master Data
  const loadMasterData = useCallback(async () => {
    setMasterLoading(true);
    try {
      const [schedRes, classRes, subRes] = await Promise.all([
        supabase.from('exam_schedules').select('*').order('start_date', { ascending: false }),
        supabase.from('classes').select('*').order('name'),
        supabase.from('syl_subjects').select('*').order('name'),
      ]);

      const dbSchedules = schedRes.data || [];
      const dbClasses = classRes.data || [];
      const dbSubjects = subRes.data || [];

      setSchedules(dbSchedules);
      setClasses(dbClasses);
      setSubjects(dbSubjects);

      if (dbSchedules.length > 0) {
        setSelectedScheduleId((prev) => prev || String(dbSchedules[0].id));
      }
    } catch (err) {
      console.error('Failed to load exam analysis master data:', err);
      showToast('Failed to load examination master data', 'error');
    } finally {
      setMasterLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Selected schedule object
  const selectedSchedule = useMemo(() => {
    return schedules.find((s) => String(s.id) === String(selectedScheduleId)) || null;
  }, [schedules, selectedScheduleId]);

  // 2. Load Results & Entries for the selected schedule
  const loadScheduleData = useCallback(async (schedId) => {
    if (!schedId) {
      setResults([]);
      setEntries([]);
      return;
    }

    setDataLoading(true);
    try {
      const { data: resData, error: resErr } = await supabase
        .from('exam_results')
        .select('id, schedule_id, class_id, subject_id, max_marks, pass_marks, entry_status')
        .eq('schedule_id', Number(schedId))
        .limit(5000);

      if (resErr) throw resErr;
      const rList = resData || [];
      setResults(rList);

      if (rList.length > 0) {
        const resIds = rList.map((r) => r.id);
        const CHUNK_SIZE = 100;
        let allEntries = [];

        for (let i = 0; i < resIds.length; i += CHUNK_SIZE) {
          const chunkIds = resIds.slice(i, i + CHUNK_SIZE);
          let from = 0;
          const PAGE_SIZE = 1000;

          while (true) {
            const { data: entData, error: entErr } = await supabase
              .from('exam_result_entries')
              .select('id, result_id, student_id, marks_obtained, is_absent, admission_no')
              .in('result_id', chunkIds)
              .range(from, from + PAGE_SIZE - 1);

            if (entErr) throw entErr;
            if (!entData || entData.length === 0) break;
            allEntries.push(...entData);
            if (entData.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
          }
        }

        setEntries(allEntries);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error('Failed to load examination results for analysis:', err);
      showToast('Failed to load examination results', 'error');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedScheduleId) {
      loadScheduleData(selectedScheduleId);
    }
  }, [selectedScheduleId, loadScheduleData]);

  // Subjects that actually have result records in this schedule
  const subjectsWithResults = useMemo(() => {
    const ids = new Set(results.map((r) => String(r.subject_id)));
    return subjects.filter((s) => ids.has(String(s.id)));
  }, [subjects, results]);

  const handleRefresh = async () => {
    if (selectedScheduleId) {
      await loadScheduleData(selectedScheduleId);
      showToast('Analysis data refreshed', 'success');
    }
  };

  if (masterLoading || canAccess.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (availableTabs.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-light-border rounded-3xl p-8 max-w-lg mx-auto my-8 shadow-xs">
        <i className="fas fa-lock text-3xl text-slate-300 mb-3 block" />
        <p className="text-sm font-bold text-dark-primary">Access Restricted</p>
        <p className="text-xs text-dark-muted mt-1">
          You do not have permission to view Examination Analysis reports.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col min-h-[500px] m-0 p-0 animate-in fade-in duration-300 print:min-h-0 print:p-0 print:m-0 print:block"
      data-feature="exam-analysis"
    >
      {/* ── 1. HEADER SECTION (Sticky / Top) ── */}
      <div className="w-full bg-white border-b border-light-border px-4 sm:px-6 py-3 print:hidden shadow-2xs space-y-3">
        {/* Row 1: Title, Subtitle, and Global Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Back to portal tiles"
              >
                <i className="fas fa-arrow-left text-xs" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-base shadow-2xs shrink-0">
              <i className="fas fa-chart-pie" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                Exam Analysis
              </h1>
              <p className="text-[11px] font-semibold text-dark-muted hidden sm:block">
                Comprehensive marks percentage distributions and standard deviation matrix heatmaps across classes.
              </p>
            </div>
          </div>

          {/* Global Actions: Refresh */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleRefresh}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 hover:text-dark-primary transition-all shadow-2xs cursor-pointer shrink-0"
              title="Refresh examination analysis data"
            >
              <i className="fas fa-sync-alt text-xs" />
            </button>
          </div>
        </div>

        {/* Row 2: Tab Navigation (LEFT) + Active Tab Contextual Filters (RIGHT) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* ── Tab Navigation ── */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0" data-feature-tab="exam-analysis-tabs">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-slate-100/90 text-dark-muted hover:text-dark-primary hover:bg-slate-200/80'
                }`}
              >
                <i className={`fas ${tab.icon} text-[10px]`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── Active Tab Filters ── */}
          <div
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 w-full lg:w-auto"
            data-feature-filter={activeTab}
          >
            {/* 1. Schedule Selector (All Tabs) */}
            <div className="min-w-[170px] max-w-[240px]">
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-dark-primary outline-none focus:ring-2 focus:ring-violet-500 shadow-2xs cursor-pointer"
              >
                <option value="">Select Exam Schedule...</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Class Multi-Select Filter */}
            <div className="min-w-[150px] max-w-[220px]">
              <MultiSelectDropdown
                label=""
                placeholder="All Classes"
                icon="fa-chalkboard-user"
                options={classes.map((c) => ({ id: String(c.id), label: c.name }))}
                selected={selectedClassIds}
                onChange={setSelectedClassIds}
                fullWidth={false}
              />
            </div>

            {/* 3. Subject Multi-Select Filter (Marks & Std Dev Tabs) */}
            {activeTab !== 'compare' && (
              <div className="min-w-[160px] max-w-[240px] col-span-2 sm:col-span-1">
                <MultiSelectDropdown
                  label=""
                  placeholder="All Subjects"
                  icon="fa-book"
                  options={(subjectsWithResults.length > 0 ? subjectsWithResults : subjects).map((sub) => ({
                    id: String(sub.id),
                    label: sub.name,
                  }))}
                  selected={selectedSubjectIds}
                  onChange={setSelectedSubjectIds}
                  fullWidth={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. MAIN CONTENT SECTION ── */}
      <div
        className="w-full p-3 sm:p-5 md:p-6 flex-1 animate-in fade-in duration-200"
        data-feature="exam-analysis-content"
      >
        {/* Tab 1: Exam Obtained Mark Analysis */}
        {activeTab === 'marks' && (
          <ConditionalBlock
            name="exam-analysis-tab-marks"
            roles={userRoles}
            fallback={
              <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs max-w-md mx-auto">
                <i className="fas fa-lock text-3xl text-slate-300 mb-3 block" />
                <p className="text-sm font-bold text-dark-primary">Access Restricted</p>
                <p className="text-xs text-dark-muted mt-1">
                  You do not have permission to view the Mark Distribution tab.
                </p>
              </div>
            }
          >
            <ExamMarkDistributionTab
              schedule={selectedSchedule}
              classes={classes}
              subjects={subjects}
              selectedClassIds={selectedClassIds}
              selectedSubjectIds={selectedSubjectIds}
              results={results}
              entries={entries}
              loading={dataLoading}
            />
          </ConditionalBlock>
        )}

        {/* Tab 2: Standard Deviation Heatmap Matrix */}
        {activeTab === 'std-dev' && (
          <ConditionalBlock
            name="exam-analysis-tab-std-dev"
            roles={userRoles}
            fallback={
              <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs max-w-md mx-auto">
                <i className="fas fa-lock text-3xl text-slate-300 mb-3 block" />
                <p className="text-sm font-bold text-dark-primary">Access Restricted</p>
                <p className="text-xs text-dark-muted mt-1">
                  You do not have permission to view the Standard Deviation Heatmap tab.
                </p>
              </div>
            }
          >
            <ExamStdDevHeatmapTab
              schedule={selectedSchedule}
              classes={classes}
              subjects={subjects}
              selectedClassIds={selectedClassIds}
              selectedSubjectIds={selectedSubjectIds}
              results={results}
              entries={entries}
              loading={dataLoading}
            />
          </ConditionalBlock>
        )}

        {/* Tab 3: Cross-Schedule Standard Deviation Comparison */}
        {activeTab === 'compare' && (
          <ConditionalBlock
            name="exam-analysis-tab-compare"
            roles={userRoles}
            fallback={
              <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs max-w-md mx-auto">
                <i className="fas fa-lock text-3xl text-slate-300 mb-3 block" />
                <p className="text-sm font-bold text-dark-primary">Access Restricted</p>
                <p className="text-xs text-dark-muted mt-1">
                  You do not have permission to view the Schedule Comparison tab.
                </p>
              </div>
            }
          >
            <ExamScheduleComparisonTab
              schedules={schedules}
              baseSchedule={selectedSchedule}
              classes={classes}
              subjects={subjects}
              selectedClassIds={selectedClassIds}
              selectedSubjectIds={selectedSubjectIds}
              baseResults={results}
              baseEntries={entries}
              userRoles={userRoles}
            />
          </ConditionalBlock>
        )}
      </div>
    </div>
  );
};

export default ExamAnalysisManager;
