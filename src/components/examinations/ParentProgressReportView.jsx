// src/components/examinations/ParentProgressReportView.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { formatDateDisplay } from '../../utils/dateUtils';
import ReportCardGenerator from './ReportCardGenerator';
import MultiSelectDropdown from '../MultiSelectDropdown';
import { useCanAccess } from '../portal-shared/ConditionalBlock';

/**
 * Parent view for published student examination progress reports.
 * Restricted strictly to published exam schedules and the parent's enrolled ward(s).
 */
const ParentProgressReportView = ({
  user,
  userRoles = ['parent'],
  onNavigate = null,
}) => {
  const canAccess = useCanAccess(userRoles);

  // 1. Resolve Parent's Ward(s)
  const sessionStudents = useMemo(() => {
    if (user?.students && Array.isArray(user.students) && user.students.length > 0) {
      return user.students;
    }
    if (user?.student) {
      return [user.student];
    }
    try {
      const raw = localStorage.getItem('jzv_parent_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.user?.students && Array.isArray(parsed.user.students)) return parsed.user.students;
        if (parsed.user?.student) return [parsed.user.student];
        if (parsed.student) return [parsed.student];
      }
    } catch (_) {}
    return [];
  }, [user]);

  const [selectedStudentId, setSelectedStudentId] = useState(
    sessionStudents[0]?.id || sessionStudents[0]?.admission_no || null
  );

  const [dbStudent, setDbStudent] = useState(null);
  const [publishedSchedules, setPublishedSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [paperSize, setPaperSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [loading, setLoading] = useState(true);

  // Derive initial ward from session
  const rawActiveStudent = useMemo(() => {
    return (
      sessionStudents.find(
        (s) =>
          String(s.id) === String(selectedStudentId) ||
          String(s.admission_no) === String(selectedStudentId)
      ) ||
      sessionStudents[0] ||
      null
    );
  }, [sessionStudents, selectedStudentId]);

  // Sync / fetch fresh student info from database for accurate class_id & id
  useEffect(() => {
    let isCancelled = false;
    const loadStudentDetails = async () => {
      if (!rawActiveStudent) {
        setDbStudent(null);
        return;
      }

      try {
        let query = supabase
          .from('students')
          .select('id, admission_no, student_name, father_name, class_id, blood_group, birth_date');
        if (rawActiveStudent.id) {
          query = query.eq('id', rawActiveStudent.id);
        } else if (rawActiveStudent.admission_no) {
          query = query.eq('admission_no', rawActiveStudent.admission_no);
        } else {
          setDbStudent(rawActiveStudent);
          return;
        }

        const { data, error } = await query.maybeSingle();
        if (!isCancelled) {
          if (!error && data) {
            setDbStudent(data);
          } else {
            setDbStudent(rawActiveStudent);
          }
        }
      } catch (err) {
        if (!isCancelled) setDbStudent(rawActiveStudent);
      }
    };

    loadStudentDetails();
    return () => {
      isCancelled = true;
    };
  }, [rawActiveStudent]);

  const activeStudent = dbStudent || rawActiveStudent;
  const targetClassId = activeStudent?.class_id ? String(activeStudent.class_id) : null;

  // Load published schedules only. Class / subjects / marks / rank / attendance / remarks all
  // arrive in ONE call (get_progress_report_data) made by ReportCardGenerator.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('exam_schedules')
          .select('id, name, start_date, end_date, status, is_report_published')
          .eq('is_report_published', true)
          .order('start_date', { ascending: false });
        if (!isMounted) return;
        const published = data || [];
        setPublishedSchedules(published);
        setSelectedScheduleId((prev) => {
          if (published.length === 0) return null;
          if (prev && published.some((p) => String(p.id) === String(prev))) return prev;
          return String(published[0].id);
        });
      } catch (err) {
        console.error('[ParentProgressReportView] Error loading data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedSchedule = useMemo(() => {
    return publishedSchedules.find((s) => String(s.id) === String(selectedScheduleId)) || null;
  }, [publishedSchedules, selectedScheduleId]);

  // Payload from get_progress_report_data (delivered by ReportCardGenerator, no extra calls)
  const [reportData, setReportData] = useState(null);
  const handleReportDataLoaded = useCallback((data) => setReportData(data), []);

  const studentClass = reportData?.class || null;

  const wardRankData = useMemo(() => {
    const r = activeStudent?.id ? reportData?.ranks?.[String(activeStudent.id)] : null;
    return r ? { class_rank: r.classRank, total_students: r.totalStudents } : null;
  }, [reportData, activeStudent]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div
      className="w-full flex flex-col min-h-[500px] space-y-4"
      data-feature="ward-progress-report"
    >
      {/* ── 1. HEADER SECTION (Hidden on print) ── */}
      <div className="w-full bg-white border border-light-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 print:hidden shadow-xs space-y-4">
        {/* Row 1: Title & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shadow-2xs shrink-0">
              <i className="fas fa-file-invoice" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                  Ward Progress Report
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 uppercase tracking-wide">
                  Parent Portal
                </span>
              </div>
              <p className="text-xs font-semibold text-dark-muted mt-0.5">
                Official student examination report cards and performance records
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-auto">
            {/* Multi-Ward Switcher if parent has multiple children */}
            {sessionStudents.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-dark-muted">Ward:</span>
                <select
                  value={selectedStudentId || ''}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer"
                  data-feature-filter="ward-switcher"
                >
                  {sessionStudents.map((stu) => (
                    <option key={stu.id || stu.admission_no} value={stu.id || stu.admission_no}>
                      {stu.student_name || stu.name} ({stu.class_name || `Class ${stu.class_id}`})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Examination Selector */}
            {publishedSchedules.length > 1 && (
              <div className="min-w-[180px]">
                <MultiSelectDropdown
                  label="Exam"
                  icon="fa-calendar-check"
                  singleSelect={true}
                  options={publishedSchedules.map((s) => ({
                    id: String(s.id),
                    label: s.name,
                  }))}
                  selected={selectedScheduleId}
                  onChange={(val) => setSelectedScheduleId(val)}
                  placeholder="Select Exam..."
                  fullWidth={false}
                />
              </div>
            )}

            {/* Timetable quick link if navigation is available */}
            {typeof onNavigate === 'function' && (
              <button
                type="button"
                onClick={() => onNavigate('ward-exam-timetable')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-light-border bg-white text-dark-slate hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="View Date Sheet / Timetable"
              >
                <i className="fas fa-calendar-check text-rose-500" />
                <span>Exam Timetable</span>
              </button>
            )}

            {/* Print / Download Button */}
            {publishedSchedules.length > 0 && activeStudent && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                title="Print or Save Report Card as PDF"
              >
                <i className="fas fa-print text-xs" />
                <span>Print / Save PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Secondary Controls (Paper size & orientation for printing) */}
        {publishedSchedules.length > 0 && activeStudent && (
          <div
            className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap"
            data-feature-filter="ward-progress-report-options"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-dark-muted mr-1">Display Options:</span>
              <MultiSelectDropdown
                label="Size"
                icon="fa-file"
                singleSelect={true}
                options={[
                  { id: 'a4', label: 'A4' },
                  { id: 'letter', label: 'Letter' },
                  { id: 'legal', label: 'Legal' },
                ]}
                selected={paperSize}
                onChange={setPaperSize}
                placeholder="Size..."
                fullWidth={false}
              />
              <MultiSelectDropdown
                label="Layout"
                icon="fa-repeat"
                singleSelect={true}
                options={[
                  { id: 'portrait', label: 'Portrait' },
                  { id: 'landscape', label: 'Landscape' },
                ]}
                selected={orientation}
                onChange={setOrientation}
                placeholder="Layout..."
                fullWidth={false}
              />
            </div>

            <div className="text-[11px] font-semibold text-dark-muted hidden md:flex items-center gap-1.5">
              <i className="fas fa-shield-halved text-emerald-600 text-xs" />
              <span>Verified school records for your ward</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. WARD INFORMATION BANNER (Hidden on print) ── */}
      {activeStudent && (
        <div className="bg-gradient-to-r from-indigo-50/60 via-white to-purple-50/40 p-4 rounded-2xl border border-indigo-100 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-2xs">
              {(activeStudent.student_name || activeStudent.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-extrabold text-dark-primary">
                {activeStudent.student_name || activeStudent.name}
              </p>
              <p className="text-xs text-dark-muted">
                Admission No:{' '}
                <span className="font-mono font-semibold">{activeStudent.admission_no}</span>
                <span className="mx-2 opacity-40">·</span>
                Class:{' '}
                <span className="font-bold text-indigo-700">
                  {studentClass?.name ||
                    activeStudent.class_name ||
                    (activeStudent.class_id ? `Class ${activeStudent.class_id}` : 'Unassigned')}
                </span>
              </p>
            </div>
          </div>

          {selectedSchedule && (
            <div className="flex items-center gap-3 flex-wrap">
              {wardRankData && wardRankData.class_rank && (
                <div className="hidden sm:block text-right border-r border-indigo-100 pr-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                    Class Standing
                  </span>
                  <span className="text-sm font-black text-dark-primary font-mono">
                    Rank #{wardRankData.class_rank}
                    {wardRankData.total_students ? (
                      <span className="text-xs font-semibold text-dark-muted font-sans">
                        {' '}
                        of {wardRankData.total_students}
                      </span>
                    ) : null}
                  </span>
                </div>
              )}
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-250">
                  <i className="fas fa-circle-check text-[10px]" />
                  Report Published
                </span>
                <p className="text-[11px] font-semibold text-dark-muted mt-1">
                  {selectedSchedule.name}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. MAIN CONTENT SECTION ── */}
      <div
        className="w-full flex-1 animate-in fade-in duration-200"
        data-feature="ward-progress-report-content"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-light-border">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-dark-muted">Loading progress reports...</p>
            </div>
          </div>
        ) : !activeStudent ? (
          <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-2xl mx-auto mb-4">
              <i className="fas fa-user-xmark" />
            </div>
            <h3 className="text-base font-bold text-dark-primary mb-1">Ward Account Required</h3>
            <p className="text-xs text-dark-muted max-w-md mx-auto">
              No registered student ward was found for your parent session. Please contact the
              school administration to link your student ward to this parent account.
            </p>
          </div>
        ) : !targetClassId ? (
          <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4">
              <i className="fas fa-chalkboard-user" />
            </div>
            <h3 className="text-base font-bold text-dark-primary mb-1">Class Assignment Required</h3>
            <p className="text-xs text-dark-muted max-w-md mx-auto">
              Student {activeStudent.student_name || activeStudent.name} does not have an active
              class section assigned. Report cards will appear once a class section is assigned.
            </p>
          </div>
        ) : publishedSchedules.length === 0 ? (
          <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto mb-4">
              <i className="fas fa-file-circle-exclamation" />
            </div>
            <h3 className="text-base font-bold text-dark-primary mb-1">
              No Published Progress Reports
            </h3>
            <p className="text-xs text-dark-muted max-w-md mx-auto">
              Progress reports have not yet been published by the school administration for{' '}
              <span className="font-semibold text-dark-primary">
                {activeStudent.student_name || activeStudent.name}
              </span>
              . Once the examination results are published, the official report card will be viewable
              and downloadable here.
            </p>
          </div>
        ) : !selectedScheduleId ? (
          <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-2xl mx-auto mb-4">
              <i className="fas fa-calendar-check" />
            </div>
            <h3 className="text-base font-bold text-dark-primary mb-1">Select an Examination</h3>
            <p className="text-xs text-dark-muted max-w-md mx-auto">
              Please choose an examination event from the dropdown above to view your child's
              progress report card.
            </p>
          </div>
        ) : (
          /* Render student's progress report card */
          <ReportCardGenerator
            schedules={publishedSchedules}
            classes={[]}
            subjects={[]}
            students={[activeStudent]}
            initialScheduleId={selectedScheduleId}
            initialClassId={targetClassId}
            userRoles={['parent']}
            selectedStudentIds={[String(activeStudent.id)]}
            studentSelectionMode="selected"
            hideControlBar={true}
            paperSize={paperSize}
            orientation={orientation}
            onReportDataLoaded={handleReportDataLoaded}
          />
        )}
      </div>
    </div>
  );
};

export default ParentProgressReportView;
