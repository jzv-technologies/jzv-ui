// src/components/examinations/ExamResultsManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import ExamResultsEntryGrid from './ExamResultsEntryGrid';

const ENTRY_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: 'fa-circle' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'fa-spinner' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'fa-circle-check' },
};

const ExamResultsManager = ({ userRoles, user }) => {
  // Master data
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);

  // Exam results
  const [results, setResults] = useState([]);

  // UI state
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [activeResultId, setActiveResultId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdHocForm, setShowAdHocForm] = useState(false);
  const [adHocSubjectId, setAdHocSubjectId] = useState('');
  const [adHocMaxMarks, setAdHocMaxMarks] = useState('100');
  const [adHocPassMarks, setAdHocPassMarks] = useState('');
  const [savingAdHoc, setSavingAdHoc] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    // Load each table independently — a missing table returns [] without crashing others
    const safe = async (query) => { try { const r = await query; return r.data || []; } catch { return []; } };

    const [dbSchedules, dbClasses, dbSubjects, dbStudents, dbSlots, dbClassSubjects, dbResults] =
      await Promise.all([
        safe(supabase.from('exam_schedules').select('*').order('start_date', { ascending: false })),
        safe(supabase.from('classes').select('*').order('name')),
        safe(supabase.from('syl_subjects').select('*').order('name')),
        safe(supabase.from('students').select('id, student_name, admission_no, class_id, enrollment').order('student_name')),
        safe(supabase.from('exam_schedule_slots').select('*')),
        safe(supabase.from('class_subjects').select('*')),
        safe(supabase.from('exam_results').select('*')),
      ]);

    setSchedules(dbSchedules);
    setClasses(dbClasses);
    setSubjects(dbSubjects);
    setStudents(dbStudents);
    setSlots(dbSlots);
    setClassSubjects(dbClassSubjects);
    setResults(dbResults);

    if (!selectedScheduleId && dbSchedules.length > 0) {
      setSelectedScheduleId(String(dbSchedules[0].id));
    }
    setLoading(false);
  }, [selectedScheduleId]);

  useEffect(() => {
    loadAll();
  }, []);

  const refreshResults = useCallback(async () => {
    const { data } = await supabase.from('exam_results').select('*');
    setResults(data || []);
  }, []);

  const selectedSchedule = schedules.find((s) => String(s.id) === String(selectedScheduleId)) || null;

  // Students for the selected class (active enrollment only)
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(
      (s) => String(s.class_id) === String(selectedClassId) && s.enrollment !== 'Inactive'
    );
  }, [students, selectedClassId]);

  // Subjects that have exam_schedule_slots for this class in this schedule
  const scheduledSubjects = useMemo(() => {
    if (!selectedScheduleId || !selectedClassId) return [];
    const subjectIds = new Set(
      slots
        .filter(
          (s) =>
            String(s.schedule_id) === String(selectedScheduleId) &&
            String(s.class_id) === String(selectedClassId)
        )
        .map((s) => String(s.subject_id))
    );
    return subjects.filter((s) => subjectIds.has(String(s.id)));
  }, [slots, selectedScheduleId, selectedClassId, subjects]);

  // Results for this schedule+class
  const classResults = useMemo(() => {
    return results.filter(
      (r) =>
        String(r.schedule_id) === String(selectedScheduleId) &&
        String(r.class_id) === String(selectedClassId)
    );
  }, [results, selectedScheduleId, selectedClassId]);

  const classResultsIndex = useMemo(() => {
    const idx = {};
    classResults.forEach((r) => { idx[String(r.subject_id)] = r; });
    return idx;
  }, [classResults]);

  // Ensure result rows exist for all scheduled subjects
  const ensureResult = useCallback(async (subjectId) => {
    const existing = classResultsIndex[String(subjectId)];
    if (existing) return existing;

    const { data, error } = await supabase
      .from('exam_results')
      .insert({
        schedule_id: Number(selectedScheduleId),
        class_id: Number(selectedClassId),
        subject_id: Number(subjectId),
        max_marks: 100,
        is_from_schedule: true,
        entry_status: 'pending',
      })
      .select()
      .single();

    if (error) { showToast('Failed to initialise result record', 'error'); return null; }
    await refreshResults();
    return data;
  }, [classResultsIndex, selectedScheduleId, selectedClassId, refreshResults]);

  const handleSubjectSelect = async (subjectId) => {
    const result = await ensureResult(subjectId);
    if (result) setActiveResultId(result.id);
  };

  const handleStatusUpdate = useCallback(async (resultId, newStatus) => {
    await supabase.from('exam_results').update({ entry_status: newStatus }).eq('id', resultId);
    setResults((prev) => prev.map((r) => r.id === resultId ? { ...r, entry_status: newStatus } : r));
  }, []);

  const handleMaxMarksChange = async (resultId, newMax) => {
    await supabase.from('exam_results').update({ max_marks: Number(newMax) }).eq('id', resultId);
    setResults((prev) => prev.map((r) => r.id === resultId ? { ...r, max_marks: Number(newMax) } : r));
  };

  const handleAddAdHoc = async (e) => {
    e.preventDefault();
    if (!adHocSubjectId) return;
    setSavingAdHoc(true);
    try {
      const { error } = await supabase.from('exam_results').insert({
        schedule_id: Number(selectedScheduleId),
        class_id: Number(selectedClassId),
        subject_id: Number(adHocSubjectId),
        max_marks: Number(adHocMaxMarks) || 100,
        pass_marks: adHocPassMarks ? Number(adHocPassMarks) : null,
        is_from_schedule: false,
        entry_status: 'pending',
      });
      if (error) throw error;
      showToast('Ad-hoc subject added', 'success');
      setShowAdHocForm(false);
      setAdHocSubjectId('');
      setAdHocMaxMarks('100');
      setAdHocPassMarks('');
      await refreshResults();
    } catch (err) {
      showToast(err.message || 'Failed to add ad-hoc subject', 'error');
    } finally {
      setSavingAdHoc(false);
    }
  };

  const activeResult = results.find((r) => r.id === activeResultId) || null;
  const activeSubject = activeResult ? subjects.find((s) => String(s.id) === String(activeResult.subject_id)) : null;

  // All subjects to show in the left panel = scheduledSubjects + ad-hoc
  const adHocResults = classResults.filter((r) => !r.is_from_schedule);
  const adHocSubjects = adHocResults.map((r) => subjects.find((s) => String(s.id) === String(r.subject_id))).filter(Boolean);

  const allSubjectsToShow = useMemo(() => {
    const ids = new Set();
    const list = [];
    scheduledSubjects.forEach((s) => { ids.add(String(s.id)); list.push({ ...s, isAdHoc: false }); });
    adHocSubjects.forEach((s) => { if (!ids.has(String(s.id))) { ids.add(String(s.id)); list.push({ ...s, isAdHoc: true }); } });
    return list;
  }, [scheduledSubjects, adHocSubjects]);

  // Completion summary
  const completionStats = useMemo(() => {
    const total = allSubjectsToShow.length;
    const completed = allSubjectsToShow.filter((s) => classResultsIndex[String(s.id)]?.entry_status === 'completed').length;
    const inProgress = allSubjectsToShow.filter((s) => classResultsIndex[String(s.id)]?.entry_status === 'in_progress').length;
    return { total, completed, inProgress, pending: total - completed - inProgress };
  }, [allSubjectsToShow, classResultsIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shadow-sm">
          <i className="fas fa-clipboard-check text-emerald-600 text-xl" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-dark-deepblue">Exam Results</h1>
          <p className="text-xs text-dark-muted">Enter and manage examination marks per subject and class.</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-4 bg-white border border-light-border rounded-2xl p-4">
        <div>
          <label className="block text-[10px] font-bold text-dark-slate mb-1 uppercase tracking-wide">Exam Schedule</label>
          <select
            value={selectedScheduleId}
            onChange={(e) => { setSelectedScheduleId(e.target.value); setSelectedClassId(''); setActiveResultId(null); }}
            className="px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 min-w-[200px]"
          >
            <option value="">— Select schedule —</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-dark-slate mb-1 uppercase tracking-wide">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => { setSelectedClassId(e.target.value); setActiveResultId(null); }}
            disabled={!selectedScheduleId}
            className="px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 min-w-[140px] disabled:opacity-50"
          >
            <option value="">— Select class —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Completion summary */}
        {selectedClassId && allSubjectsToShow.length > 0 && (
          <div className="flex items-center gap-3 ml-auto">
            {[
              { label: 'Complete', value: completionStats.completed, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
              { label: 'In Progress', value: completionStats.inProgress, color: 'text-amber-600 bg-amber-50 border-amber-200' },
              { label: 'Pending', value: completionStats.pending, color: 'text-slate-600 bg-slate-50 border-slate-200' },
            ].map((stat) => (
              <div key={stat.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${stat.color}`}>
                <span>{stat.value}</span>
                <span className="font-normal">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two-panel layout */}
      {selectedScheduleId && selectedClassId ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Left: Subject list */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-white border border-light-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-light-border bg-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-dark-deepblue">Subjects</h3>
                <button
                  onClick={() => setShowAdHocForm(true)}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700"
                  title="Add ad-hoc subject not in exam schedule"
                >
                  <i className="fas fa-plus mr-0.5" />
                  Ad-hoc
                </button>
              </div>

              {allSubjectsToShow.length === 0 ? (
                <div className="text-center py-8 text-xs text-dark-muted">
                  <i className="fas fa-book text-2xl mb-2 block opacity-20" />
                  No subjects scheduled.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {allSubjectsToShow.map((sub) => {
                    const res = classResultsIndex[String(sub.id)];
                    const cfg = ENTRY_STATUS_CONFIG[res?.entry_status || 'pending'];
                    const isActive = String(res?.id) === String(activeResultId);

                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleSubjectSelect(sub.id)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                          isActive ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isActive ? 'text-emerald-700' : 'text-dark-deepblue'}`}>
                            {sub.name}
                          </p>
                          {sub.isAdHoc && (
                            <span className="text-[10px] text-amber-600 font-semibold">Ad-hoc</span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${cfg.color}`}>
                          <i className={`fas ${cfg.icon} mr-0.5`} />
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Max marks config for active result */}
            {activeResult && (
              <div className="bg-white border border-light-border rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-dark-deepblue">Marking Scheme</h4>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] text-dark-muted mb-1">Max Marks</label>
                    <input
                      type="number"
                      value={activeResult.max_marks}
                      onChange={(e) => handleMaxMarksChange(activeResult.id, e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-dark-muted mb-1">Pass Marks</label>
                    <input
                      type="number"
                      value={activeResult.pass_marks || ''}
                      onChange={(e) => supabase.from('exam_results').update({ pass_marks: e.target.value ? Number(e.target.value) : null }).eq('id', activeResult.id).then(() => refreshResults())}
                      className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Mark entry grid */}
          <div className="lg:col-span-3">
            {activeResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-dark-deepblue">
                    {activeSubject?.name}
                    <span className="ml-2 text-xs font-normal text-dark-muted">
                      · {classStudents.length} students · Max: {activeResult.max_marks}
                    </span>
                  </h2>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${ENTRY_STATUS_CONFIG[activeResult.entry_status]?.color}`}>
                    {ENTRY_STATUS_CONFIG[activeResult.entry_status]?.label}
                  </span>
                </div>
                <ExamResultsEntryGrid
                  result={activeResult}
                  students={classStudents}
                  onStatusUpdate={handleStatusUpdate}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white border border-light-border rounded-2xl">
                <i className="fas fa-hand-pointer text-3xl text-slate-300 mb-3" />
                <p className="text-sm font-bold text-dark-deepblue">Select a subject to enter marks</p>
                <p className="text-xs text-dark-muted mt-1">Click any subject from the list on the left.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-light-border rounded-2xl">
          <i className="fas fa-clipboard-list text-4xl text-slate-300 mb-4 block" />
          <p className="text-sm font-bold text-dark-deepblue">Select an exam schedule and class to begin</p>
        </div>
      )}

      {/* Ad-hoc subject modal */}
      {showAdHocForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-light-border">
              <h3 className="text-base font-bold text-dark-deepblue">Add Ad-Hoc Subject</h3>
              <p className="text-[11px] text-dark-muted mt-0.5">Add a subject outside the formal exam schedule.</p>
            </div>
            <form onSubmit={handleAddAdHoc} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1.5">Subject *</label>
                <select
                  value={adHocSubjectId}
                  onChange={(e) => setAdHocSubjectId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white"
                  required
                >
                  <option value="">— Select subject —</option>
                  {subjects
                    .filter((s) => !classResultsIndex[String(s.id)])
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1.5">Max Marks</label>
                  <input type="number" value={adHocMaxMarks} onChange={(e) => setAdHocMaxMarks(e.target.value)} className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1.5">Pass Marks</label>
                  <input type="number" value={adHocPassMarks} onChange={(e) => setAdHocPassMarks(e.target.value)} placeholder="Optional" className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingAdHoc} className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-60">Add Subject</button>
                <button type="button" onClick={() => setShowAdHocForm(false)} className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 transition-all">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamResultsManager;
