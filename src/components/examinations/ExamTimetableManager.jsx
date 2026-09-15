// src/components/examinations/ExamTimetableManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import ExamScheduleSetup from './ExamScheduleSetup';
import ExamSchedulerGrid from './ExamSchedulerGrid';
import ExamTeacherView from './ExamTeacherView';
import ExamCoverageDashboard from './ExamCoverageDashboard';

const TABS = [
  { id: 'setup', label: 'Exam Setup', icon: 'fa-gear' },
  { id: 'scheduler', label: 'Scheduler', icon: 'fa-th-large' },
  { id: 'teacher', label: 'Teacher View', icon: 'fa-user-tie' },
  { id: 'coverage', label: 'Coverage', icon: 'fa-chart-pie' },
];

const ExamTimetableManager = ({ userRoles, user }) => {
  const [activeTab, setActiveTab] = useState('setup');

  // Master data
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);

  // Exam data
  const [schedules, setSchedules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const selectedSchedule =
    schedules.find((s) => String(s.id) === String(selectedScheduleId)) || null;

  const selectedSessions = sessions.filter(
    (s) => String(s.schedule_id) === String(selectedScheduleId)
  );

  const selectedSlots = slots.filter((s) => String(s.schedule_id) === String(selectedScheduleId));

  const loadMasterData = useCallback(async () => {
    // Load each table independently so a missing table doesn't break the others
    const safe = async (query) => {
      try {
        const r = await query;
        return r.data || [];
      } catch {
        return [];
      }
    };

    const [dbClasses, dbSubjects, dbTeachers, dbClassSubjects] = await Promise.all([
      safe(supabase.from('classes').select('*').order('name')),
      safe(supabase.from('syl_subjects').select('*').order('name')),
      safe(
        supabase
          .from('employees')
          .select('id, name, is_active, is_teacher')
          .eq('is_teacher', true)
          .eq('is_active', true)
          .order('name')
      ),
      safe(supabase.from('class_subjects').select('*')),
    ]);

    setClasses(dbClasses);
    setSubjects(dbSubjects);
    setTeachers(dbTeachers);
    setClassSubjects(dbClassSubjects);
  }, []);

  const loadExamData = useCallback(async () => {
    const safe = async (query) => {
      try {
        const r = await query;
        return r.data || [];
      } catch {
        return [];
      }
    };

    try {
      const [dbSchedules, dbSessions, dbSlots] = await Promise.all([
        safe(supabase.from('exam_schedules').select('*').order('start_date', { ascending: false })),
        safe(supabase.from('exam_sessions').select('*')),
        safe(supabase.from('exam_schedule_slots').select('*')),
      ]);

      setSchedules(dbSchedules);
      setSessions(dbSessions);
      setSlots(dbSlots);

      if (!selectedScheduleId && dbSchedules.length > 0) {
        setSelectedScheduleId(dbSchedules[0].id);
      }
    } catch (err) {
      console.error('Exam data load error:', err);
      setError('Failed to load exam data. Run the SQL migration first.');
    }
  }, [selectedScheduleId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadMasterData(), loadExamData()]);
    setLoading(false);
  }, [loadMasterData, loadExamData]);

  useEffect(() => {
    loadAll();
  }, []);

  const handleRefresh = useCallback(async () => {
    await loadExamData();
  }, [loadExamData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-red-200 p-8 max-w-xl mx-auto">
        <i className="fas fa-triangle-exclamation text-3xl text-red-500 mb-3 block" />
        <p className="text-sm font-bold text-dark-deepblue mb-2">Failed to Load Exam Data</p>
        <p className="text-xs text-red-600 mb-4">{error}</p>
        <button
          onClick={loadAll}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all"
        >
          <i className="fas fa-sync-alt mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shadow-sm">
            <i className="fas fa-file-circle-check text-rose-600 text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-dark-deepblue">Exam Schedule</h1>
            <p className="text-xs text-dark-muted">
              Schedule examinations, assign invigilators, and track subject coverage.
            </p>
          </div>
        </div>

        {/* Active schedule badge */}
        {selectedSchedule && (
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-xs font-bold text-dark-deepblue">{selectedSchedule.name}</p>
            <p className="text-[11px] text-dark-muted">
              {selectedSchedule.start_date} → {selectedSchedule.end_date}
            </p>
          </div>
        )}
      </div>

      {/* Schedule Selector (for non-setup tabs) */}
      {activeTab !== 'setup' && schedules.length > 0 && (
        <div className="bg-white border border-light-border rounded-2xl px-4 py-3 flex items-center gap-3">
          <label className="text-xs font-bold text-dark-slate whitespace-nowrap">
            Active Exam:
          </label>
          <select
            value={selectedScheduleId || ''}
            onChange={(e) => setSelectedScheduleId(e.target.value || null)}
            className="flex-1 px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300"
          >
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 transition-all"
            title="Refresh"
          >
            <i className="fas fa-sync-alt text-xs" />
          </button>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-dark-muted hover:text-dark-deepblue'
            }`}
          >
            <i className={`fas ${tab.icon} text-[11px]`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'setup' && (
          <ExamScheduleSetup
            schedules={schedules}
            sessions={sessions}
            selectedScheduleId={selectedScheduleId}
            onScheduleSelect={setSelectedScheduleId}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'scheduler' &&
          (selectedSchedule ? (
            <ExamSchedulerGrid
              schedule={selectedSchedule}
              sessions={selectedSessions}
              classes={classes}
              subjects={subjects}
              teachers={teachers}
              slots={selectedSlots}
              classSubjects={classSubjects}
              onRefresh={handleRefresh}
            />
          ) : (
            <div className="text-center py-16 bg-white border border-light-border rounded-2xl">
              <i className="fas fa-calendar-plus text-3xl text-slate-300 mb-3 block" />
              <p className="text-sm font-bold text-dark-deepblue">No exam schedule selected</p>
              <p className="text-xs text-dark-muted mt-1">
                Create a schedule in the Exam Setup tab first.
              </p>
            </div>
          ))}

        {activeTab === 'teacher' &&
          (selectedSchedule ? (
            <ExamTeacherView
              schedule={selectedSchedule}
              sessions={selectedSessions}
              classes={classes}
              subjects={subjects}
              teachers={teachers}
              slots={selectedSlots}
            />
          ) : (
            <div className="text-center py-16 bg-white border border-light-border rounded-2xl">
              <p className="text-sm text-dark-muted">
                Select an exam schedule to view teacher assignments.
              </p>
            </div>
          ))}

        {activeTab === 'coverage' &&
          (selectedSchedule ? (
            <ExamCoverageDashboard
              classes={classes}
              subjects={subjects}
              slots={selectedSlots}
              classSubjects={classSubjects}
            />
          ) : (
            <div className="text-center py-16 bg-white border border-light-border rounded-2xl">
              <p className="text-sm text-dark-muted">
                Select an exam schedule to view coverage data.
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

export default ExamTimetableManager;
