// src/components/examinations/ParentExamTimetableView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';

/**
 * Parent view for upcoming published Exam Schedule.
 * Restricted strictly to published schedules applicable to the parent's selected ward.
 */
const ParentExamTimetableView = ({ user, classes = [], subjects = [] }) => {
  const studentsList = useMemo(() => {
    if (user?.students && Array.isArray(user.students) && user.students.length > 0) {
      return user.students;
    }
    if (user?.student) {
      return [user.student];
    }
    return [];
  }, [user]);

  const [selectedStudentId, setSelectedStudentId] = useState(
    studentsList[0]?.id || studentsList[0]?.admission_no || null
  );

  const activeStudent = useMemo(() => {
    return (
      studentsList.find(
        (s) =>
          String(s.id) === String(selectedStudentId) ||
          String(s.admission_no) === String(selectedStudentId)
      ) ||
      studentsList[0] ||
      null
    );
  }, [studentsList, selectedStudentId]);

  const studentClass = useMemo(() => {
    if (!activeStudent?.class_id) return null;
    return classes.find((c) => String(c.id) === String(activeStudent.class_id)) || null;
  }, [classes, activeStudent]);

  const [publishedSchedules, setPublishedSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load only published schedules
  useEffect(() => {
    const fetchPublished = async () => {
      setLoading(true);
      try {
        const { data: schedData, error: schedErr } = await supabase
          .from('exam_schedules')
          .select('*')
          .eq('status', 'published')
          .order('start_date', { ascending: true });

        if (schedErr) throw schedErr;
        setPublishedSchedules(schedData || []);

        if (schedData && schedData.length > 0) {
          setSelectedScheduleId(String(schedData[0].id));
          const schedIds = schedData.map((s) => s.id);

          const [sessRes, slotsRes] = await Promise.all([
            supabase
              .from('exam_sessions')
              .select('*')
              .in('schedule_id', schedIds)
              .order('order_seq'),
            supabase.from('exam_schedule_slots').select('*').in('schedule_id', schedIds),
          ]);

          setSessions(sessRes.data || []);
          setSlots(slotsRes.data || []);
        } else {
          setSelectedScheduleId(null);
          setSessions([]);
          setSlots([]);
        }
      } catch (err) {
        console.error('[ParentExamTimetableView] Error loading schedules:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublished();
  }, []);

  const selectedSchedule = useMemo(() => {
    return publishedSchedules.find((s) => String(s.id) === String(selectedScheduleId)) || null;
  }, [publishedSchedules, selectedScheduleId]);

  // Filter slots for active student's class and selected schedule
  const wardSlots = useMemo(() => {
    if (!selectedScheduleId || !activeStudent?.class_id) return [];
    return slots
      .filter(
        (slot) =>
          String(slot.schedule_id) === String(selectedScheduleId) &&
          String(slot.class_id) === String(activeStudent.class_id)
      )
      .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
  }, [slots, selectedScheduleId, activeStudent]);

  const sessionMap = useMemo(() => {
    const map = {};
    sessions.forEach((sess) => {
      map[String(sess.id)] = sess;
    });
    return map;
  }, [sessions]);

  const subjectMap = useMemo(() => {
    const map = {};
    subjects.forEach((sub) => {
      map[String(sub.id)] = sub;
    });
    return map;
  }, [subjects]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Banner & Child Selector */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-light-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg shadow-2xs">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                Ward Examination Schedule
              </h2>
              <p className="text-xs font-bold text-dark-muted">
                Official published upcoming examination schedule for your child
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Multi-student Ward Switcher */}
          {studentsList.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-3 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-dark-muted">Ward:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer"
              >
                {studentsList.map((stu) => (
                  <option key={stu.id || stu.admission_no} value={stu.id || stu.admission_no}>
                    {stu.student_name || stu.name} ({stu.class_name || `Class ${stu.class_id}`})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Schedule Picker */}
          {publishedSchedules.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-3 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-dark-muted">Exam:</span>
              <select
                value={selectedScheduleId || ''}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer"
              >
                {publishedSchedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {wardSlots.length > 0 && (
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-white border border-light-border hover:bg-slate-50 text-dark-primary text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
            >
              <i className="fas fa-print text-rose-600" />
              <span>Print Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* Ward Info Card */}
      {activeStudent && (
        <div className="bg-gradient-to-r from-rose-50/50 via-white to-orange-50/40 p-4 rounded-2xl border border-rose-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
              {(activeStudent.student_name || activeStudent.name || 'S').charAt(0)}
            </div>
            <div>
              <p className="text-sm font-extrabold text-dark-primary">
                {activeStudent.student_name || activeStudent.name}
              </p>
              <p className="text-xs text-dark-muted">
                Admission No:{' '}
                <span className="font-mono font-semibold">{activeStudent.admission_no}</span> •{' '}
                Class:{' '}
                <span className="font-bold text-rose-700">
                  {studentClass?.name ||
                    activeStudent.class_name ||
                    `Class ${activeStudent.class_id}`}
                </span>
              </p>
            </div>
          </div>

          {selectedSchedule && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <i className="fas fa-circle-check text-[10px]" /> Published
              </span>
              <p className="text-[11px] font-semibold text-dark-muted mt-1">
                {selectedSchedule.start_date} to {selectedSchedule.end_date}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Schedule Display */}
      {publishedSchedules.length === 0 ? (
        <div className="text-center py-16 bg-white border border-light-border rounded-2xl p-8 shadow-sm">
          <i className="fas fa-calendar-times text-4xl text-slate-300 mb-3 block" />
          <h3 className="text-base font-bold text-dark-primary">No Published Exam Schedules</h3>
          <p className="text-xs text-dark-muted mt-1 max-w-md mx-auto">
            There are currently no published examinations announced. Once the administration
            publishes the upcoming exam dates, they will appear here.
          </p>
        </div>
      ) : wardSlots.length === 0 ? (
        <div className="text-center py-16 bg-white border border-light-border rounded-2xl p-8 shadow-sm">
          <i className="fas fa-file-circle-question text-4xl text-amber-300 mb-3 block" />
          <h3 className="text-base font-bold text-dark-primary">No Timetable for This Class Yet</h3>
          <p className="text-xs text-dark-muted mt-1 max-w-md mx-auto">
            The exam "{selectedSchedule?.name}" is published, but the specific timetable entries for{' '}
            <span className="font-bold">
              {studentClass?.name || `Class ${activeStudent?.class_id}`}
            </span>{' '}
            have not yet been scheduled.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-light-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-light-border bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-calendar-check text-rose-600" />
              <h3 className="text-sm font-bold text-dark-primary">
                {selectedSchedule?.name} — Date Sheet
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
              {wardSlots.length} Exams Scheduled
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-light-border bg-slate-50/50 text-[11px] font-black text-dark-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Day</th>
                  <th className="py-3 px-4">Session & Timing</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Room / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border text-xs">
                {wardSlots.map((slot, idx) => {
                  const sess = sessionMap[String(slot.session_id)];
                  const sub = subjectMap[String(slot.subject_id)];
                  const dateObj = new Date(slot.exam_date);
                  const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
                  const formattedDate = dateObj.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr key={slot.id || idx} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-dark-primary block">{formattedDate}</span>
                        <span className="text-[11px] text-dark-muted">{dayName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-dark-secondary block">
                          {sess?.name || 'Standard Session'}
                        </span>
                        <span className="text-[11px] text-dark-muted font-mono">
                          {sess?.start_time && sess?.end_time
                            ? `${sess.start_time.slice(0, 5)} – ${sess.end_time.slice(0, 5)}`
                            : 'Timing TBA'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-black text-dark-primary text-sm block">
                          {sub?.name || `Subject #${slot.subject_id}`}
                        </span>
                        {slot.notes && (
                          <span className="text-[11px] text-slate-500 italic block mt-0.5">
                            {slot.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-dark-muted">
                          {slot.room_no ? `Room ${slot.room_no}` : 'Designated Classroom'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentExamTimetableView;
