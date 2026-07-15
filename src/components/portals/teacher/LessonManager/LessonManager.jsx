import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';

import SyllabusTreePanel from './SyllabusTreePanel';
import TimelinePanel from './TimelinePanel';
import AddWorkModalCompactView from './AddWorkModalCompactView';
import AssignLessonsModal from './AssignLessonsModal';
import MapBookModal from './MapBookModal';
import ProgressPanel from './ProgressPanel';

// Shared module-level cache for LessonManager
let lessonManagerCache = {
  userId: null,
  teacher: null,
  classes: [],
  subjects: [],
  assignments: [],
  books: [],
  bookClasses: [],
  classifications: [],
  allLessons: [],
  progressRecords: [],
  favorites: [],
  myWorkEntries: null,
  allTeachers: [],

  // Stored selections
  selectedTeacherId: '',
  selectedClassId: '',
  selectedSubjectId: '',
  selectedBookId: '',
  selectedLessonIds: new Set(),
  showAllClasses: false, // New toggle state
};

const LessonManager = ({ user, teacherRecord, role = 'teacher' }) => {
  const isAdminView = role === 'admin' || role === 'management';

  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Layout state
  const [activeMobileTab, setActiveMobileTab] = useState('syllabus'); // 'syllabus' | 'timeline'
  const [activeBottomTab, setActiveBottomTab] = useState('none'); // 'none' | 'progress' | 'activity'

  // Teacher context
  const [teacher, setTeacher] = useState(null);
  const [allTeachers, setAllTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(() =>
    lessonManagerCache.userId === user?.id ? lessonManagerCache.selectedTeacherId : ''
  );

  // Core Data
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [books, setBooks] = useState([]);
  const [bookClasses, setBookClasses] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [progressRecords, setProgressRecords] = useState([]); // Replaces lesson_plans + lesson_tracker_log

  // Toggle for filtering classes
  const [showAllClasses, setShowAllClasses] = useState(() =>
    lessonManagerCache.userId === user?.id ? lessonManagerCache.showAllClasses : false
  );

  // Selection
  const [selectedClassId, setSelectedClassId] = useState(() =>
    lessonManagerCache.userId === user?.id ? lessonManagerCache.selectedClassId : ''
  );
  const [selectedClassificationId, setSelectedClassificationId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(() =>
    lessonManagerCache.userId === user?.id ? lessonManagerCache.selectedSubjectId : ''
  );
  const [selectedBookId, setSelectedBookId] = useState(() =>
    lessonManagerCache.userId === user?.id ? lessonManagerCache.selectedBookId : ''
  );
  const [selectedLessonIds, setSelectedLessonIds] = useState(() =>
    lessonManagerCache.userId === user?.id ? lessonManagerCache.selectedLessonIds : new Set()
  );

  // Modals and Panels
  const [addWorkTarget, setAddWorkTarget] = useState(null); // { record? } or just true
  const [isMapBookModalOpen, setIsMapBookModalOpen] = useState(false);
  const [assignModalTarget, setAssignModalTarget] = useState(null);

  // Timeline Shared State
  const [planningMode, setPlanningMode] = useState('date');
  const [activeTargetDate, setActiveTargetDate] = useState(null);
  const [activeTargetWeek, setActiveTargetWeek] = useState(null);

  // Keep cache updated
  useEffect(() => {
    if (user?.id) {
      lessonManagerCache.userId = user.id;
      lessonManagerCache.selectedTeacherId = selectedTeacherId;
      lessonManagerCache.selectedClassId = selectedClassId;
      lessonManagerCache.selectedSubjectId = selectedSubjectId;
      lessonManagerCache.selectedBookId = selectedBookId;
      lessonManagerCache.selectedLessonIds = selectedLessonIds;
      lessonManagerCache.showAllClasses = showAllClasses;
      lessonManagerCache.bookClasses = bookClasses;
      lessonManagerCache.progressRecords = progressRecords;
    }
  }, [
    user,
    selectedTeacherId,
    selectedClassId,
    selectedSubjectId,
    selectedBookId,
    selectedLessonIds,
    showAllClasses,
    bookClasses,
    progressRecords,
  ]);

  // Data Fetching
  useEffect(() => {
    if (!user?.id) {
      setLoading(true);
      return;
    }

    const fetchAll = async () => {
      // Check cache
      if (
        lessonManagerCache.userId === user.id &&
        lessonManagerCache.classes.length > 0 &&
        lessonManagerCache.bookClasses.length > 0
      ) {
        setClasses(lessonManagerCache.classes);
        setSubjects(lessonManagerCache.subjects);
        setAssignments(lessonManagerCache.assignments);
        setBooks(lessonManagerCache.books);
        setBookClasses(lessonManagerCache.bookClasses);
        setClassifications(lessonManagerCache.classifications);
        setAllLessons(lessonManagerCache.allLessons);
        setProgressRecords(lessonManagerCache.progressRecords);
        if (isAdminView) setAllTeachers(lessonManagerCache.allTeachers);
        else setTeacher(lessonManagerCache.teacher);

        setInitialized(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const queries = [
          supabase.from('classes').select('*'),
          supabase.from('subjects').select('*'),
          supabase.from('class_assignments').select('*'),
          supabase.from('syllabus_books').select('*'),
          supabase.from('syllabus_book_classes').select('*'),
          supabase.from('syllabus_book_lessons').select('*'),
          supabase
            .from('lesson_progress')
            .select(
              'id, class_id, subject_id, book_id, lesson_id, target_start_date, target_end_date, due_date, academic_week, status, completion_percentage'
            ),
          supabase.from('subject_classifications').select('*'),
        ];

        if (isAdminView) {
          queries.push(supabase.from('teachers').select('*'));
        } else {
          let teacherData = teacherRecord || null;
          if (!teacherData) {
            const { data, error: teachErr } = await supabase
              .from('teachers')
              .select('*')
              .eq('auth_id', user.id)
              .maybeSingle();
            if (teachErr) throw teachErr;
            teacherData = data;
          }
          if (!teacherData?.id) throw new Error('No teacher record found.');
          setTeacher(teacherData);
        }

        const results = await Promise.all(queries);
        const errors = results.map((r) => r.error).filter(Boolean);
        if (errors.length) throw new Error(errors[0].message);

        const [
          { data: dbClasses },
          { data: dbSubjects },
          { data: dbAssignments },
          { data: dbBooks },
          { data: dbBookClasses },
          { data: dbLessons },
          { data: dbProgress },
          { data: dbClassifications },
          teachersResult,
        ] = results;

        setClasses(dbClasses || []);
        setSubjects(dbSubjects || []);
        setAssignments(dbAssignments || []);
        setBooks(dbBooks || []);
        setBookClasses(dbBookClasses || []);
        setAllLessons(dbLessons || []);
        setProgressRecords(dbProgress || []);
        setClassifications(dbClassifications || []);

        if (isAdminView) {
          setAllTeachers(teachersResult?.data || []);
        }

        // Update Cache
        lessonManagerCache = {
          ...lessonManagerCache,
          userId: user.id,
          classes: dbClasses || [],
          subjects: dbSubjects || [],
          assignments: dbAssignments || [],
          books: dbBooks || [],
          bookClasses: dbBookClasses || [],
          allLessons: dbLessons || [],
          progressRecords: dbProgress || [],
          classifications: dbClassifications || [],
          allTeachers: teachersResult?.data || [],
          teacher: isAdminView ? null : teacherRecord || lessonManagerCache.teacher,
        };

        setInitialized(true);
      } catch (err) {
        console.error('LessonManager fetchAll failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, teacherRecord, isAdminView]);

  // Filtering Logic
  const filterTeacherId = isAdminView ? selectedTeacherId : teacher?.id;

  const availableClasses = useMemo(() => {
    if (isAdminView && !selectedTeacherId) return classes;
    if (showAllClasses) return classes;

    return classes.filter((c) =>
      assignments.some(
        (a) =>
          String(a.class_id) === String(c.id) && String(a.teacher_id) === String(filterTeacherId)
      )
    );
  }, [classes, assignments, filterTeacherId, isAdminView, showAllClasses]);

  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    const assignmentSubjects = assignments
      .filter(
        (a) =>
          String(a.class_id) === String(selectedClassId) &&
          (!filterTeacherId || String(a.teacher_id) === String(filterTeacherId))
      )
      .map((a) => String(a.subject_id));

    // If showAllClasses is true or admin view, we might want to show all subjects for the class
    let filteredSubjects = subjects;
    if (!(showAllClasses || (isAdminView && !selectedTeacherId))) {
      filteredSubjects = subjects.filter((s) => assignmentSubjects.includes(String(s.id)));
    }

    // Filter by selected classification
    if (selectedClassificationId) {
      filteredSubjects = filteredSubjects.filter(
        (s) => String(s.classification_id) === String(selectedClassificationId)
      );
    }

    return filteredSubjects;
  }, [subjects, assignments, selectedClassId, filterTeacherId, isAdminView, showAllClasses, selectedClassificationId]);

  const availableBooks = useMemo(() => {
    if (!selectedClassId || !selectedSubjectId) return [];
    return books.filter((b) => {
      const matchSubject = String(b.subject_id) === String(selectedSubjectId);
      const matchClass = bookClasses.some(
        (bc) =>
          String(bc.book_id) === String(b.id) && String(bc.class_id) === String(selectedClassId)
      );
      return matchSubject && matchClass;
    });
  }, [books, bookClasses, selectedClassId, selectedSubjectId]);

  // Auto-select book if only 1 is available
  useEffect(() => {
    if (availableBooks.length === 1 && selectedBookId !== String(availableBooks[0].id)) {
      setSelectedBookId(String(availableBooks[0].id));
    }
  }, [availableBooks, selectedBookId]);

  // UI Handlers
  const handleRefresh = async () => {
    setLoading(true);
    lessonManagerCache.classes = []; // Invalidate cache to force reload
    setInitialized(false);
    // Component will re-fetch automatically since initialized becomes false,
    // wait, we need to trigger the effect. Let's reset user.id briefly or just call fetchAll.
    // Easiest is to reload the window or abstract fetchAll, but for now we can just clear cache and wait for unmount/remount or abstract it later.
    window.location.reload();
  };

  const handleDirectAssign = async (lessons, targetVal) => {
    try {
      const upsertData = lessons.map((lesson) => {
        const existing = progressRecords.find(
          (p) =>
            String(p.class_id) === String(selectedClassId) &&
            String(p.lesson_id) === String(lesson.id)
        );

        let startD, endD;
        if (planningMode === 'date') {
          startD = targetVal;
          endD = targetVal;
        } else {
          // Compute Monday and Saturday of the selected weekDate
          const d = new Date(targetVal);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(d.setDate(diff));

          const saturday = new Date(monday);
          saturday.setDate(monday.getDate() + 5);

          startD = monday.toISOString().split('T')[0];
          endD = saturday.toISOString().split('T')[0];
        }

        return {
          id: existing ? existing.id : undefined,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          book_id: selectedBookId,
          lesson_id: lesson.id,
          target_start_date: startD,
          target_end_date: endD,
          academic_week: existing ? existing.academic_week : null,
          status: existing && existing.status !== 'not_started' ? existing.status : 'planned',
        };
      });

      // Remove id from new records so Postgres uses its bigint sequence default
      upsertData.forEach((d) => {
        if (!d.id) delete d.id;
      });

      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(upsertData, { onConflict: 'class_id, lesson_id', ignoreDuplicates: false })
        .select(
          'id, class_id, subject_id, book_id, lesson_id, target_start_date, target_end_date, due_date, academic_week, status, completion_percentage'
        );

      if (error) throw error;

      const updatedRecords = [...progressRecords];
      data.forEach((newRec) => {
        const index = updatedRecords.findIndex((r) => String(r.id) === String(newRec.id));
        if (index >= 0) updatedRecords[index] = newRec;
        else updatedRecords.push(newRec);
      });
      setProgressRecords(updatedRecords);
      showToast(`Assigned ${lessons.length} lesson(s) successfully!`, 'success');
    } catch (err) {
      showToast('Failed to assign lessons: ' + err.message, 'error');
    }
  };

  // -------------------------
  // Render
  // -------------------------

  if (loading && !initialized) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-2xl border shadow-sm mt-4">
        <div className="flex flex-col items-center">
          <i className="fas fa-circle-notch fa-spin text-4xl text-brand-primary mb-4"></i>
          <span className="text-gray-500 font-bold">Loading Lesson Manager...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm mt-4">
        <i className="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
        <h3 className="text-lg font-bold text-gray-800">Failed to load</h3>
        <p className="text-red-500 mt-2">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg font-bold"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-auto lg:h-[calc(100vh-130px)] lg:min-h-[600px] bg-light-bg font-sans pb-24 lg:pb-0">
      {/* Header and Selectors */}
      <div className="bg-white border-b px-4 py-4 md:px-6 shadow-sm shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
              <i className="fas fa-calendar-check text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-dark-primary tracking-tight">
                Lesson Planner
              </h1>
              <p className="text-xs font-bold text-dark-soft">
                Plan, track, and log syllabus progress
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 w-full md:w-auto pb-2 md:pb-0">
            {isAdminView && (
              <div className="col-span-2 md:col-span-1 md:min-w-[150px] w-full md:w-auto">
                <select
                  value={selectedTeacherId}
                  onChange={(e) => {
                    setSelectedTeacherId(e.target.value);
                    setSelectedClassId('');
                    setSelectedSubjectId('');
                    setSelectedBookId('');
                  }}
                  className="w-full bg-gray-50 border border-gray-200 text-dark-primary text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                >
                  <option value="">All Teachers</option>
                  {allTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isAdminView && (
              <div className="col-span-1 md:min-w-[140px] w-full md:w-auto">
                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors h-[34px] w-full">
                  <input
                    type="checkbox"
                    checked={showAllClasses}
                    onChange={(e) => setShowAllClasses(e.target.checked)}
                    className="w-3.5 h-3.5 text-brand-primary focus:ring-brand-primary rounded cursor-pointer shrink-0"
                  />
                  <span className="truncate">Show All Classes</span>
                </label>
              </div>
            )}

            <div className="col-span-1 md:min-w-[140px] w-full md:w-auto">
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedClassificationId('');
                  setSelectedSubjectId('');
                  setSelectedBookId('');
                }}
                className="w-full bg-gray-50 border border-gray-200 text-dark-primary text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
              >
                <option value="">Select Class...</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:min-w-[140px] w-full md:w-auto">
              <select
                value={selectedClassificationId}
                onChange={(e) => {
                  setSelectedClassificationId(e.target.value);
                  setSelectedSubjectId('');
                  setSelectedBookId('');
                }}
                disabled={!selectedClassId}
                className="w-full bg-gray-50 border border-gray-200 text-dark-primary text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-50"
              >
                <option value="">Select Classification...</option>
                {classifications.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:min-w-[140px] w-full md:w-auto">
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedBookId('');
                }}
                disabled={!selectedClassId}
                className="w-full bg-gray-50 border border-gray-200 text-dark-primary text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-50"
              >
                <option value="">Select Subject...</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:min-w-[160px] w-full md:w-auto">
              <select
                value={selectedBookId}
                onChange={(e) => {
                  if (e.target.value === 'map-new-book') {
                    setIsMapBookModalOpen(true);
                  } else {
                    setSelectedBookId(e.target.value);
                  }
                }}
                disabled={!selectedSubjectId}
                className="w-full bg-gray-50 border border-gray-200 text-dark-primary text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-50 shadow-sm"
              >
                <option value="">Select Book...</option>
                {availableBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
                {selectedClassId && selectedSubjectId && (
                  <option value="map-new-book" className="text-indigo-600 font-bold">
                    + Map Book to Class...
                  </option>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Pane: Syllabus Tree */}
        <div
          className={`w-full lg:w-[400px] xl:w-[450px] shrink-0 border-r bg-gray-50/50 flex-col overflow-hidden min-h-0 ${activeMobileTab === 'syllabus' ? 'flex' : 'hidden lg:flex'}`}
        >
          <SyllabusTreePanel
            selectedClassId={selectedClassId}
            selectedSubjectId={selectedSubjectId}
            selectedBookId={selectedBookId}
            allLessons={allLessons}
            progressRecords={progressRecords}
            selectedLessonIds={selectedLessonIds}
            setSelectedLessonIds={setSelectedLessonIds}
            onAssign={(lessons) => {
              if (planningMode === 'date' && activeTargetDate) {
                handleDirectAssign(lessons, activeTargetDate);
              } else if (planningMode === 'week' && activeTargetWeek) {
                handleDirectAssign(lessons, activeTargetWeek);
              } else {
                setAssignModalTarget({ lessons });
              }
            }}
          />
        </div>

        {/* Right Pane: Timeline */}
        <div
          className={`flex-1 flex-col overflow-hidden min-h-0 bg-light-bg ${activeMobileTab === 'timeline' ? 'flex' : 'hidden lg:flex'}`}
        >
          <TimelinePanel
            selectedClassId={selectedClassId}
            selectedSubjectId={selectedSubjectId}
            selectedBookId={selectedBookId}
            allLessons={allLessons}
            progressRecords={progressRecords}
            setProgressRecords={setProgressRecords}
            planningMode={planningMode}
            setPlanningMode={setPlanningMode}
            activeTargetDate={activeTargetDate}
            setActiveTargetDate={setActiveTargetDate}
            activeTargetWeek={activeTargetWeek}
            setActiveTargetWeek={setActiveTargetWeek}
            onAddLessonClick={(type, target) =>
              setAssignModalTarget({ lessons: [], directMode: type, directTarget: target })
            }
            onLogWork={(record) => {
              setAddWorkTarget({ record });
            }}
          />
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <button
          onClick={() => setActiveMobileTab('syllabus')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeMobileTab === 'syllabus'
              ? 'bg-brand-primary/10 text-brand-primary'
              : 'text-gray-500'
          }`}
        >
          <i className="fas fa-list text-base"></i>
          Lessons
        </button>
        <button
          onClick={() => setActiveMobileTab('timeline')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeMobileTab === 'timeline'
              ? 'bg-brand-primary/10 text-brand-primary'
              : 'text-gray-500'
          }`}
        >
          <i className="fas fa-calendar-alt text-base"></i>
          Timeline
        </button>
      </div>

      {/* Modals */}
      {addWorkTarget && (
        <AddWorkModalCompactView
          onClose={() => setAddWorkTarget(null)}
          classes={availableClasses}
          subjects={subjects}
          books={books}
          bookClasses={bookClasses}
          allLessons={allLessons}
          progressRecords={progressRecords}
          setProgressRecords={setProgressRecords}
          initialClassId={selectedClassId}
          initialSubjectId={selectedSubjectId}
          initialBookId={selectedBookId}
          teacherId={isAdminView ? selectedTeacherId : teacher?.id}
          initialRecord={addWorkTarget.record}
        />
      )}

      {assignModalTarget && (
        <AssignLessonsModal
          onClose={() => setAssignModalTarget(null)}
          lessons={assignModalTarget.lessons}
          allLessons={allLessons}
          availableBooks={availableBooks}
          classId={selectedClassId}
          subjectId={selectedSubjectId}
          progressRecords={progressRecords}
          setProgressRecords={setProgressRecords}
          directMode={assignModalTarget.directMode}
          directTarget={assignModalTarget.directTarget}
        />
      )}

      {isMapBookModalOpen && (
        <MapBookModal
          onClose={() => setIsMapBookModalOpen(false)}
          classId={selectedClassId}
          subjectId={selectedSubjectId}
          classes={classes}
          subjects={subjects}
          allBooks={books}
          bookClasses={bookClasses}
          setBookClasses={setBookClasses}
        />
      )}
    </div>
  );
};

export default LessonManager;
