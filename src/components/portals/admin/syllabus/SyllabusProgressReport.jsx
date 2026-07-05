import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';
import { CARD_THEMES } from '../../../../utils/cardTheme';

const SyllabusProgressReport = () => {
  const [loading, setLoading] = useState(true);

  // Reference data lists
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [books, setBooks] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [bookClasses, setBookClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [bookTrackers, setBookTrackers] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [allLessons, setAllLessons] = useState([]);

  // Active Tab: 'daily-activity' | 'book-progress' | 'class-progress'
  const [activeTab, setActiveTab] = useState('daily-activity');

  // ─── Tab 1: Daily Activity States & Filters ───
  const [dailyEntries, setDailyEntries] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Column Filters for Daily Activity
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterBook, setFilterBook] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ─── Tab 2: Book Progress States ───
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const [myProgressExpandedBook, setMyProgressExpandedBook] = useState(null);
  const [myProgressExpandedClass, setMyProgressExpandedClass] = useState(null);
  const [myProgressLoading, setMyProgressLoading] = useState(false);
  const [myProgressBookLessons, setMyProgressBookLessons] = useState([]);
  const [myProgressBookLogs, setMyProgressBookLogs] = useState([]);
  const [myProgressExpandedLogIds, setMyProgressExpandedLogIds] = useState({});
  const [myProgressLogItemsMap, setMyProgressLogItemsMap] = useState({});
  const [myProgressShowNotStarted, setMyProgressShowNotStarted] = useState(false);

  // ─── Tab 3: Class Progress States ───
  const [selectedProgressClassId, setSelectedProgressClassId] = useState('');
  const [classLogs, setClassLogs] = useState([]);
  const [classLessons, setClassLessons] = useState([]);
  const [progressExpandedBook, setProgressExpandedBook] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressBookLessons, setProgressBookLessons] = useState([]);
  const [progressBookLogs, setProgressBookLogs] = useState([]);
  const [expandedLogIds, setExpandedLogIds] = useState({});
  const [logItemsMap, setLogItemsMap] = useState({});
  const [showNotStarted, setShowNotStarted] = useState(false);

  // ─── Load Base Reference Data ───
  const loadData = async () => {
    setLoading(true);
    try {
      const [
        resClasses,
        resSubjects,
        resBooks,
        resClassifications,
        resBookClasses,
        resAssignments,
        resTeachers,
        resTrackers,
        resLogs,
        resLessons,
      ] = await Promise.all([
        supabase.from('classes').select('*').order('name', { ascending: true }),
        supabase.from('subjects').select('*').order('name', { ascending: true }),
        supabase.from('syllabus_books').select('*').order('name', { ascending: true }),
        supabase.from('subject_classifications').select('*').order('name', { ascending: true }),
        supabase.from('syllabus_book_classes').select('*'),
        supabase.from('class_assignments').select('*'),
        supabase
          .from('teachers')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase.from('book_tracker').select('*'),
        supabase.from('lesson_tracker_log').select('*'),
        supabase.from('syllabus_book_lessons').select('id, book_id'),
      ]);

      if (resClasses.error) throw resClasses.error;
      if (resSubjects.error) throw resSubjects.error;
      if (resBooks.error) throw resBooks.error;
      if (resClassifications.error) throw resClassifications.error;
      if (resBookClasses.error) throw resBookClasses.error;
      if (resAssignments.error) throw resAssignments.error;
      if (resTeachers.error) throw resTeachers.error;
      if (resTrackers.error) throw resTrackers.error;
      if (resLogs.error) throw resLogs.error;
      if (resLessons.error) throw resLessons.error;

      const dbClasses = resClasses.data || [];
      const dbSubjects = resSubjects.data || [];
      const dbBooks = resBooks.data || [];
      const dbClassifications = resClassifications.data || [];
      const dbBookClasses = resBookClasses.data || [];
      const dbAssignments = resAssignments.data || [];
      const dbTeachers = resTeachers.data || [];
      const dbTrackers = resTrackers.data || [];
      const dbLogs = resLogs.data || [];
      const dbLessons = resLessons.data || [];

      if (dbClasses.length === 0 && dbTeachers.length === 0 && dbBooks.length === 0) {
        loadLocalFallback();
      } else {
        setClasses(dbClasses);
        setSubjects(dbSubjects);
        setBooks(dbBooks);
        setClassifications(dbClassifications);
        setBookClasses(dbBookClasses);
        setAssignments(dbAssignments);
        setTeachers(dbTeachers);
      }
      setBookTrackers(dbTrackers);
      setAllLogs(dbLogs);
      setAllLessons(dbLessons);
    } catch (err) {
      console.warn('SyllabusProgressReport loadData failed:', err.message);
      loadLocalFallback();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalFallback = () => {
    const rawSyllabus = localStorage.getItem('jzv_syllabus_data');
    if (rawSyllabus) {
      try {
        const parsed = JSON.parse(rawSyllabus);
        setBooks(parsed.books || []);
        setSubjects(parsed.subjects || []);
      } catch (e) {}
    }
    const rawTimetable = localStorage.getItem('jzv_timetable_local_data');
    if (rawTimetable) {
      try {
        const parsed = JSON.parse(rawTimetable);
        setClasses(parsed.classes || []);
        setClassifications(parsed.classifications || []);
        setTeachers((parsed.teachers || []).filter((t) => t.is_active));
        setAssignments(parsed.assignments || []);
      } catch (e) {}
    }
    const rawBC = localStorage.getItem('jzv_syllabus_book_classes');
    if (rawBC) {
      try {
        const parsedBC = JSON.parse(rawBC);
        setBookClasses(parsedBC);
      } catch (e) {}
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── Daily Activity: Fetch & Enrich Logs ───
  const fetchDailyEntries = useCallback(async () => {
    setDailyLoading(true);
    try {
      const { data: items, error } = await supabase
        .from('lesson_tracker_log_items')
        .select('*, teacher:teachers(name)')
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;

      if (!items || items.length === 0) {
        setDailyEntries([]);
        return;
      }

      const ltLogIds = [...new Set(items.map((i) => i.lt_log_id))];
      const { data: logs, error: logErr } = await supabase
        .from('lesson_tracker_log')
        .select('*')
        .in('id', ltLogIds);
      if (logErr) throw logErr;

      const lessonIds = [...new Set((logs || []).map((l) => l.lesson_id))];
      const { data: lessons, error: lesErr } = await supabase
        .from('syllabus_book_lessons')
        .select('*')
        .in('id', lessonIds);
      if (lesErr) throw lesErr;

      const enriched = items.map((item) => {
        const log = (logs || []).find((l) => l.id === item.lt_log_id);
        const lesson = log ? (lessons || []).find((ls) => ls.id === log.lesson_id) : null;
        const book = lesson ? books.find((b) => b.id === lesson.book_id) : null;
        const subject = book ? subjects.find((s) => s.id === book.subject_id) : null;
        const cls = log ? classes.find((c) => c.id === log.class_id) : null;

        return {
          ...item,
          log,
          lesson,
          book,
          subject,
          class: cls,
          lessonPath: lesson
            ? [lesson.level1, lesson.level2, lesson.level3].filter(Boolean).join(' > ')
            : 'Unknown',
          isRevision: lesson?.level1 === '_Revision',
        };
      });

      setDailyEntries(enriched);
    } catch (err) {
      console.warn('Failed to fetch daily activity logs:', err.message);
      setDailyEntries([]);
    } finally {
      setDailyLoading(false);
    }
  }, [books, classes, subjects]);

  useEffect(() => {
    if (activeTab === 'daily-activity' && books.length > 0) {
      fetchDailyEntries();
    }
  }, [activeTab, books, fetchDailyEntries]);

  // ─── Class Progress: Fetch Class Logs & Lessons ───
  const fetchClassProgressTrackers = async (classId) => {
    if (!classId) return;
    try {
      const classBookIds = bookClasses
        .filter((bc) => String(bc.class_id) === String(classId))
        .map((bc) => bc.book_id);

      const [logsRes, lessonsRes] = await Promise.all([
        supabase
          .from('lesson_tracker_log')
          .select('lesson_id, current_status, completion_percentage, revision_counter')
          .eq('class_id', classId),
        classBookIds.length > 0
          ? supabase.from('syllabus_book_lessons').select('id, book_id').in('book_id', classBookIds)
          : Promise.resolve({ data: [] }),
      ]);

      if (logsRes.error) throw logsRes.error;
      if (lessonsRes.error) throw lessonsRes.error;

      setClassLogs(logsRes.data || []);
      setClassLessons(lessonsRes.data || []);
    } catch (err) {
      console.warn('Failed to fetch class progress trackers:', err.message);
    }
  };

  useEffect(() => {
    if (selectedProgressClassId) {
      fetchClassProgressTrackers(selectedProgressClassId);
      setProgressExpandedBook(null);
    } else {
      setClassLogs([]);
      setClassLessons([]);
      setProgressExpandedBook(null);
    }
  }, [selectedProgressClassId]);

  // ─── Click Book Tile to Expand Lessons ───
  const handleProgressBookClick = async (bookId) => {
    if (progressExpandedBook === bookId) {
      setProgressExpandedBook(null);
      return;
    }
    setProgressExpandedBook(bookId);
    setProgressLoading(true);
    setShowNotStarted(false);
    setExpandedLogIds({});
    try {
      const [{ data: lessons, error: lessErr }, { data: logs, error: logErr }] = await Promise.all([
        supabase.from('syllabus_book_lessons').select('*').eq('book_id', bookId),
        supabase.from('lesson_tracker_log').select('*').eq('class_id', selectedProgressClassId),
      ]);
      if (lessErr) throw lessErr;
      if (logErr) throw logErr;

      const bookLessons = (lessons || []).filter((l) => {
        if (l.level3) return true;
        if (l.level2 && !l.level3) {
          const hasL3 = (lessons || []).some(
            (o) => o.level1 === l.level1 && (o.level2 || 'General') === l.level2 && o.level3
          );
          return !hasL3;
        }
        if (l.level1 && !l.level2 && !l.level3) {
          const hasL2orL3 = (lessons || []).some(
            (o) => o.level1 === l.level1 && (o.level2 || o.level3)
          );
          return !hasL2orL3;
        }
        return false;
      });

      const relevantLogs = (logs || []).filter((l) =>
        bookLessons.some((bl) => String(bl.id) === String(l.lesson_id))
      );

      setProgressBookLessons(bookLessons);
      setProgressBookLogs(relevantLogs);
    } catch (err) {
      console.warn('Progress book expand failed:', err.message);
    } finally {
      setProgressLoading(false);
    }
  };

  const toggleLogExpand = async (logId) => {
    setExpandedLogIds((prev) => ({ ...prev, [logId]: !prev[logId] }));
    if (!logItemsMap[logId]) {
      try {
        const { data, error } = await supabase
          .from('lesson_tracker_log_items')
          .select('*, teacher:teachers(name)')
          .eq('lt_log_id', logId)
          .order('date', { ascending: false });
        if (error) throw error;
        setLogItemsMap((prev) => ({ ...prev, [logId]: data || [] }));
      } catch (err) {
        console.warn('Failed to load log items:', err.message);
      }
    }
  };

  const handleMyProgressBookClick = async (bookId, classId) => {
    if (myProgressExpandedBook === bookId && myProgressExpandedClass === classId) {
      setMyProgressExpandedBook(null);
      setMyProgressExpandedClass(null);
      return;
    }
    setMyProgressExpandedBook(bookId);
    setMyProgressExpandedClass(classId);
    setMyProgressLoading(true);
    setMyProgressShowNotStarted(false);
    setMyProgressExpandedLogIds({});
    try {
      const [{ data: lessons, error: lessErr }, { data: logs, error: logErr }] = await Promise.all([
        supabase.from('syllabus_book_lessons').select('*').eq('book_id', bookId),
        supabase.from('lesson_tracker_log').select('*').eq('class_id', classId),
      ]);
      if (lessErr) throw lessErr;
      if (logErr) throw logErr;

      const bookLessons = (lessons || []).filter((l) => {
        if (l.level3) return true;
        if (l.level2 && !l.level3) {
          const hasL3 = (lessons || []).some(
            (o) => o.level1 === l.level1 && (o.level2 || 'General') === l.level2 && o.level3
          );
          return !hasL3;
        }
        if (l.level1 && !l.level2 && !l.level3) {
          const hasL2orL3 = (lessons || []).some(
            (o) => o.level1 === l.level1 && (o.level2 || o.level3)
          );
          return !hasL2orL3;
        }
        return false;
      });

      const relevantLogs = (logs || []).filter((l) =>
        bookLessons.some((bl) => String(bl.id) === String(l.lesson_id))
      );

      setMyProgressBookLessons(bookLessons);
      setMyProgressBookLogs(relevantLogs);
    } catch (err) {
      console.warn('My progress book expand failed:', err.message);
    } finally {
      setMyProgressLoading(false);
    }
  };

  const toggleMyProgressLogExpand = async (logId) => {
    setMyProgressExpandedLogIds((prev) => ({ ...prev, [logId]: !prev[logId] }));
    if (!myProgressLogItemsMap[logId]) {
      try {
        const { data, error } = await supabase
          .from('lesson_tracker_log_items')
          .select('*, teacher:teachers(name)')
          .eq('lt_log_id', logId)
          .order('date', { ascending: false });
        if (error) throw error;
        setMyProgressLogItemsMap((prev) => ({ ...prev, [logId]: data || [] }));
      } catch (err) {
        console.warn('Failed to load log items:', err.message);
      }
    }
  };

  // ─── Status Badges ───
  const getStatusBadge = (status, isRev = false) => {
    if (isRev)
      return (
        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">
          Revision
        </span>
      );
    if (status === 'completed')
      return (
        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Completed
        </span>
      );
    if (status === 'in_progress')
      return (
        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> In Progress
        </span>
      );
    return (
      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Not Started
      </span>
    );
  };

  // ─── Render Helpers ───

  const renderDailyActivity = () => {
    if (dailyLoading) {
      return (
        <div className="flex items-center justify-center p-12 bg-white border border-light-border rounded-2xl">
          <div className="w-6 h-6 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-xs font-bold text-gray-500">Loading daily activity...</span>
        </div>
      );
    }

    // Apply filters
    const filteredDailyEntries = dailyEntries.filter((entry) => {
      if (
        filterClass &&
        !entry.class?.name?.toLowerCase().includes(filterClass.toLowerCase()) &&
        !entry.class?.class_name?.toLowerCase().includes(filterClass.toLowerCase())
      ) {
        return false;
      }
      if (
        filterSubject &&
        !entry.subject?.name?.toLowerCase().includes(filterSubject.toLowerCase())
      ) {
        return false;
      }
      if (filterBook && !entry.book?.name?.toLowerCase().includes(filterBook.toLowerCase())) {
        return false;
      }
      if (
        filterTeacher &&
        !entry.teacher?.name?.toLowerCase().includes(filterTeacher.toLowerCase())
      ) {
        return false;
      }
      if (filterTopic && !entry.lessonPath?.toLowerCase().includes(filterTopic.toLowerCase())) {
        return false;
      }
      if (filterStatus && entry.current_status !== filterStatus) {
        return false;
      }
      return true;
    });

    return (
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden space-y-4 p-4">
        <div className="flex justify-between items-center pb-2 border-b flex-wrap gap-2">
          <h3 className="font-extrabold text-sm text-dark-primary">Daily Activity Logs</h3>
          <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full">
            Showing {filteredDailyEntries.length} of {dailyEntries.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-light-border text-dark-muted font-extrabold text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3 min-w-[100px]">Date</th>
                <th className="px-4 py-3 min-w-[120px]">Class</th>
                <th className="px-4 py-3 min-w-[120px]">Subject</th>
                <th className="px-4 py-3 min-w-[150px]">Book</th>
                <th className="px-4 py-3 min-w-[120px]">Teacher</th>
                <th className="px-4 py-3 min-w-[180px]">Topic / Path</th>
                <th className="px-4 py-3 min-w-[110px]">Status</th>
                <th className="px-4 py-3 min-w-[80px]">Progress</th>
                <th className="px-4 py-3 min-w-[150px]">Comments</th>
              </tr>
              {/* Filter inputs row */}
              <tr className="bg-gray-100/50 border-b border-light-border">
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1">
                  <input
                    type="text"
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    placeholder="Filter class..."
                    className="w-full border p-1 rounded font-normal text-[11px] outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </th>
                <th className="px-2 py-1">
                  <input
                    type="text"
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    placeholder="Filter subject..."
                    className="w-full border p-1 rounded font-normal text-[11px] outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </th>
                <th className="px-2 py-1">
                  <input
                    type="text"
                    value={filterBook}
                    onChange={(e) => setFilterBook(e.target.value)}
                    placeholder="Filter book..."
                    className="w-full border p-1 rounded font-normal text-[11px] outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </th>
                <th className="px-2 py-1">
                  <input
                    type="text"
                    value={filterTeacher}
                    onChange={(e) => setFilterTeacher(e.target.value)}
                    placeholder="Filter teacher..."
                    className="w-full border p-1 rounded font-normal text-[11px] outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </th>
                <th className="px-2 py-1">
                  <input
                    type="text"
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    placeholder="Filter topic..."
                    className="w-full border p-1 rounded font-normal text-[11px] outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </th>
                <th className="px-2 py-1">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full border p-1 rounded font-normal text-[11px] outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="not_started">Not Started</option>
                  </select>
                </th>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
              {filteredDailyEntries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-gray-400 font-semibold">
                    No entries match your search filters.
                  </td>
                </tr>
              ) : (
                filteredDailyEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/40">
                    <td className="px-4 py-3 text-dark-primary whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-brand-primary">
                      {entry.class?.name || entry.class?.class_name || '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-600">
                      {entry.subject?.name || '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-dark-primary">
                      {entry.book?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-blue-600 font-extrabold">
                      {entry.teacher?.name || '—'}
                    </td>
                    <td
                      className="px-4 py-3 font-semibold text-gray-600 max-w-[200px] truncate"
                      title={entry.lessonPath}
                    >
                      {entry.lessonPath}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(entry.current_status, entry.isRevision)}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700">
                      {entry.isRevision ? '—' : `${Number(entry.progress).toFixed(0)}%`}
                    </td>
                    <td
                      className="px-4 py-3 text-gray-500 max-w-[200px] truncate"
                      title={entry.comments || ''}
                    >
                      {entry.comments || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderBookProgress = () => {
    const teacherAssignments = assignments.filter(
      (a) => String(a.teacher_id) === String(selectedTeacherId)
    );
    const progressClasses =
      teacherAssignments.length === 0
        ? classes
        : classes.filter((c) =>
            teacherAssignments.some((a) => String(a.class_id) === String(c.id))
          );

    // Group trackers by class
    const trackerByClass = {};
    bookTrackers.forEach((tracker) => {
      const cls = progressClasses.find((c) => String(c.id) === String(tracker.class_id));
      if (!cls) return;

      const bookObj = books.find((b) => String(b.id) === String(tracker.book_id));
      if (!bookObj) return;

      if (!trackerByClass[cls.id]) {
        trackerByClass[cls.id] = {
          classObj: cls,
          trackers: [],
        };
      }
      trackerByClass[cls.id].trackers.push({
        tracker,
        book: bookObj,
        subject: subjects.find((s) => String(s.id) === String(bookObj.subject_id)),
      });
    });

    const classIdsWithEntries = Object.keys(trackerByClass);

    return (
      <div className="space-y-4">
        {!selectedTeacherId ? (
          <div className="p-12 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
            <i className="fas fa-hand-pointer text-3xl text-gray-300 mb-3 block animate-bounce"></i>
            Please select a teacher from the dropdown above to view progress.
          </div>
        ) : classIdsWithEntries.length === 0 ? (
          <div className="p-12 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
            No allocated classes or progress records found for this teacher.
          </div>
        ) : (
          <div className="space-y-6">
            {classIdsWithEntries.map((classId) => {
              const { classObj, trackers } = trackerByClass[classId];
              const isThisClassExpanded = myProgressExpandedClass === classObj.id;

              return (
                <div
                  key={classId}
                  className="bg-white border border-light-border rounded-2xl shadow-sm overflow-hidden p-6 space-y-4"
                >
                  <h3 className="text-base font-black text-dark-primary border-b pb-2 flex items-center gap-2">
                    <i className="fas fa-graduation-cap text-brand-primary"></i>
                    {classObj.name || classObj.class_name}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {trackers.map(({ tracker, book, subject }) => {
                      const pct = Number(tracker.completion_percentage);
                      const isExpanded =
                        myProgressExpandedBook === book.id &&
                        myProgressExpandedClass === classObj.id;
                      const pctColor =
                        pct >= 70
                          ? 'text-emerald-600'
                          : pct >= 30
                            ? 'text-amber-600'
                            : 'text-red-500';
                      const pctBg =
                        pct >= 70
                          ? 'bg-emerald-50 border-emerald-200'
                          : pct >= 30
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-red-50 border-red-200';
                      const barColor = pct >= 70 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444';

                      const classificationId = subject?.classification_id;
                      const classification = classifications.find(
                        (c) => String(c.id) === String(classificationId)
                      );
                      const themeStyles =
                        classification?.theme && CARD_THEMES[classification.theme]
                          ? CARD_THEMES[classification.theme]
                          : CARD_THEMES.charcoal;

                      // Compute lesson counts dynamically for revisions count
                      const bookLessons = allLessons.filter(
                        (l) => String(l.book_id) === String(book.id)
                      );
                      const bookLessonIds = bookLessons.map((l) => String(l.id));
                      const bookLogs = allLogs.filter(
                        (log) =>
                          String(log.class_id) === String(classObj.id) &&
                          bookLessonIds.includes(String(log.lesson_id))
                      );
                      const revisionCount = bookLogs.reduce(
                        (sum, log) => sum + (log.revision_counter || 0),
                        0
                      );

                      const total = tracker.total_lessons || bookLessons.length;
                      const completed = tracker.completed || 0;
                      const inProgress = tracker.in_progress || 0;
                      const notStarted = tracker.not_started || 0;

                      return (
                        <div
                          key={book.id}
                          onClick={() => handleMyProgressBookClick(book.id, classObj.id)}
                          className={`p-4 border border-light-border border-l-[6px] rounded-2xl shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] flex flex-col justify-between ${
                            isExpanded
                              ? 'ring-2 ring-brand-primary/40 bg-brand-primary/5 border-brand-primary/30'
                              : 'bg-white'
                          } border-l-${themeStyles.color}`}
                        >
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                {subject && (
                                  <h3 className=" font-semibold text-gray-500 mt-0.5">
                                    {subject.name}
                                  </h3>
                                )}
                                <h4 className="text-sm font-black text-dark-primary truncate">
                                  {book.name}
                                </h4>
                                <p className="text-[9px] text-brand-primary font-bold mt-1">
                                  Class: {classObj.name || classObj.class_name}
                                </p>
                              </div>
                              <div
                                className={`flex items-center justify-center w-12 h-12 rounded-xl border ${pctBg} shrink-0 ml-2`}
                              >
                                <span className={`text-sm font-black ${pctColor}`}>
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                              <div
                                className="h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: barColor }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-bold border-t pt-2 mt-auto">
                            <div className="flex justify-between text-emerald-600">
                              <span>Completed:</span>
                              <span>{completed}</span>
                            </div>
                            <div className="flex justify-between text-blue-600">
                              <span>In-progress:</span>
                              <span>{inProgress}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                              <span>Not Started:</span>
                              <span>{notStarted}</span>
                            </div>
                            <div className="flex justify-between text-purple-600">
                              <span>Revisions:</span>
                              <span>{revisionCount}</span>
                            </div>
                            <div className="flex justify-between text-dark-muted col-span-2 border-t border-dashed pt-1.5 mt-0.5">
                              <span>Total Lessons:</span>
                              <span>{total}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expanded details list within this class card container */}
                  {isThisClassExpanded && myProgressExpandedBook && (
                    <div className="bg-gray-50/50 border border-dashed rounded-2xl p-5 mt-4">
                      {myProgressLoading ? (
                        <div className="flex items-center justify-center p-8">
                          <div className="w-6 h-6 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mr-2" />
                          <span className="text-xs font-bold text-gray-500">
                            Loading lessons...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <h3 className="text-xs font-extrabold text-dark-primary">
                              {books.find((b) => b.id === myProgressExpandedBook)?.name} — Lesson
                              Details
                            </h3>
                          </div>

                          {/* Level-1 Unit Progress */}
                          <div className="mb-6 border-b border-light-border pb-6">
                            <h4 className="text-[10px] font-extrabold text-dark-soft uppercase tracking-wider mb-3">
                              Level-1 Unit Progress
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(() => {
                                const uniqueLevel1s = [
                                  ...new Set(
                                    myProgressBookLessons.map((l) => l.level1).filter(Boolean)
                                  ),
                                ];
                                if (uniqueLevel1s.length === 0) {
                                  return (
                                    <p className="text-xs text-gray-400 font-semibold col-span-full">
                                      No level-1 sections defined for this book.
                                    </p>
                                  );
                                }

                                return uniqueLevel1s.map((lvl1) => {
                                  const lvl1Lessons = myProgressBookLessons.filter(
                                    (l) => l.level1 === lvl1
                                  );
                                  const total = lvl1Lessons.length;

                                  let completedCount = 0;
                                  let inProgressCount = 0;
                                  let totalProgressSum = 0;

                                  lvl1Lessons.forEach((lesson) => {
                                    const log = myProgressBookLogs.find(
                                      (l) => String(l.lesson_id) === String(lesson.id)
                                    );
                                    if (log) {
                                      if (log.current_status === 'completed') {
                                        completedCount++;
                                        totalProgressSum += 100;
                                      } else if (log.current_status === 'in_progress') {
                                        inProgressCount++;
                                        totalProgressSum += Number(log.completion_percentage) || 0;
                                      }
                                    }
                                  });

                                  const progressPct = total > 0 ? totalProgressSum / total : 0;
                                  const barColor =
                                    progressPct >= 70
                                      ? '#10b981'
                                      : progressPct >= 30
                                        ? '#f59e0b'
                                        : '#ef4444';

                                  return (
                                    <div
                                      key={lvl1}
                                      className="p-3 border border-light-border rounded-xl bg-white flex flex-col justify-between shadow-sm"
                                    >
                                      <div className="flex items-start justify-between mb-2 gap-2">
                                        <span
                                          className="text-xs font-bold text-dark-primary truncate"
                                          title={lvl1}
                                        >
                                          {lvl1}
                                        </span>
                                        <span className="text-xs font-bold text-dark-deepblue shrink-0">
                                          {progressPct.toFixed(0)}%
                                        </span>
                                      </div>
                                      <div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                          <div
                                            className="h-1.5 rounded-full transition-all duration-300"
                                            style={{
                                              width: `${progressPct}%`,
                                              backgroundColor: barColor,
                                            }}
                                          />
                                        </div>
                                        <p className="text-[9px] text-gray-500 font-bold mt-1.5 flex items-center justify-between">
                                          <span>
                                            {total} {total === 1 ? 'Lesson' : 'Lessons'}
                                          </span>
                                          <span className="text-dark-soft">
                                            {completedCount} ✓ / {inProgressCount} ◔
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                          {/* Lessons Coverage Tracker */}
                          <div className="bg-white rounded-2xl border border-light-border overflow-hidden">
                            <div className="p-4 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                              <h3 className="font-extrabold text-xs text-dark-primary">
                                Lessons Coverage Tracker
                              </h3>
                              <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl cursor-pointer text-xs font-bold text-gray-700 select-none hover:bg-gray-50 transition-colors shadow-sm">
                                <input
                                  type="checkbox"
                                  checked={myProgressShowNotStarted}
                                  onChange={(e) => setMyProgressShowNotStarted(e.target.checked)}
                                  className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                                />
                                Show Not Started Lessons
                              </label>
                            </div>
                            <div className="p-4 space-y-3">
                              {(() => {
                                const bookLessons = myProgressBookLessons;

                                const lessonsToRender = myProgressShowNotStarted
                                  ? bookLessons
                                  : bookLessons.filter((node) => {
                                      const log = myProgressBookLogs.find(
                                        (l) => String(l.lesson_id) === String(node.id)
                                      );
                                      return log && log.current_status !== 'not_started';
                                    });

                                if (lessonsToRender.length === 0) {
                                  return (
                                    <p className="text-xs text-gray-400 font-semibold py-4 text-center">
                                      {myProgressShowNotStarted
                                        ? 'No lessons found for this book.'
                                        : "No active (completed/in-progress) lessons. Check 'Show Not Started Lessons' to view all."}
                                    </p>
                                  );
                                }

                                return lessonsToRender.map((node) => {
                                  const log = myProgressBookLogs.find(
                                    (l) => String(l.lesson_id) === String(node.id)
                                  );
                                  const status = log?.current_status || 'not_started';
                                  const title = [node.level1, node.level2, node.level3]
                                    .filter(Boolean)
                                    .join(' > ');
                                  const isLogExpanded = log && myProgressExpandedLogIds[log.id];

                                  return (
                                    <div
                                      key={node.id}
                                      className="border border-gray-150 rounded-xl p-3 bg-white hover:bg-gray-50/50 transition-colors"
                                    >
                                      <div className="flex justify-between items-center flex-wrap gap-2">
                                        <div>
                                          <span className="font-bold text-xs text-dark-primary">
                                            {title}
                                          </span>
                                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            {getStatusBadge(status)}
                                            {log && (
                                              <>
                                                <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border">
                                                  {Number(log.completion_percentage).toFixed(0)}%
                                                  Progress
                                                </span>
                                                <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border">
                                                  Days Logged: {log.days_taken}
                                                </span>
                                                {log.revision_counter > 0 && (
                                                  <span className="text-[9px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                                    Revisions: {log.revision_counter}
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {log && (
                                            <button
                                              onClick={() => toggleMyProgressLogExpand(log.id)}
                                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer border"
                                            >
                                              <i
                                                className={`fas fa-${isLogExpanded ? 'eye-slash' : 'eye'} mr-1`}
                                              ></i>
                                              {isLogExpanded ? 'Hide' : 'View'} Entries
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {isLogExpanded && log && (
                                        <div className="mt-3 space-y-2 border-t border-dashed pt-3 pl-4">
                                          <p className="text-[9px] font-extrabold text-dark-soft uppercase tracking-wider mb-2">
                                            Logged Daily Entries
                                          </p>
                                          {!myProgressLogItemsMap[log.id] ? (
                                            <div className="flex items-center text-[10px] text-gray-400 font-bold">
                                              <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mr-1.5"></div>
                                              Loading details...
                                            </div>
                                          ) : myProgressLogItemsMap[log.id].length === 0 ? (
                                            <p className="text-[10px] text-gray-400 font-semibold">
                                              No daily entries found.
                                            </p>
                                          ) : (
                                            myProgressLogItemsMap[log.id].map((item) => (
                                              <div
                                                key={item.id}
                                                className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-semibold text-gray-600"
                                              >
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                  <span className="font-bold text-dark-primary">
                                                    {new Date(item.date).toLocaleDateString()}
                                                  </span>
                                                  {getStatusBadge(item.current_status)}
                                                  <span className="text-gray-500 font-bold">
                                                    {Number(item.progress).toFixed(0)}%
                                                  </span>
                                                  {item.teacher?.name && (
                                                    <span className="text-gray-400 font-bold">
                                                      by {item.teacher.name}
                                                    </span>
                                                  )}
                                                  {item.is_revision === 'Y' && (
                                                    <span className="text-purple-600 font-black bg-purple-50 px-1 py-0.5 rounded border border-purple-100 text-[8px] uppercase tracking-wider">
                                                      Revision
                                                    </span>
                                                  )}
                                                  {item.late_reporting === 'Y' && (
                                                    <span className="text-red-600 font-black bg-red-50 px-1 py-0.5 rounded border border-red-100 text-[8px] uppercase tracking-wider">
                                                      Late Reporting
                                                    </span>
                                                  )}
                                                </div>
                                                {item.comments && (
                                                  <p className="text-dark-soft mt-1 bg-white p-1.5 border rounded-md">
                                                    {item.comments}
                                                  </p>
                                                )}
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderClassProgress = () => {
    if (!selectedProgressClassId) {
      return (
        <div className="p-12 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          <i className="fas fa-hand-pointer text-3xl text-gray-300 mb-3 block animate-bounce"></i>
          Please select a class from the filter dropdown next to the tabs above to view progress.
        </div>
      );
    }

    const classBookIds = bookClasses
      .filter((bc) => String(bc.class_id) === String(selectedProgressClassId))
      .map((bc) => String(bc.book_id));
    const classBooks = books.filter((b) => classBookIds.includes(String(b.id)));

    // Group books by classification
    const booksByClassification = {};
    classBooks.forEach((book) => {
      const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
      const classificationId = subj?.classification_id;
      const classification = classifications.find((c) => String(c.id) === String(classificationId));

      const groupName = classification ? classification.name : 'Other / Unclassified';
      if (!booksByClassification[groupName]) {
        booksByClassification[groupName] = [];
      }
      booksByClassification[groupName].push(book);
    });

    return (
      <div className="space-y-4">
        {classBooks.length === 0 ? (
          <div className="p-8 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
            No syllabus books found for this class.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(booksByClassification).map(([groupName, booksInGroup]) => (
              <div key={groupName} className="space-y-3">
                <h4 className="text-sm font-black text-brand-primary uppercase tracking-wider border-b pb-1.5 flex items-center gap-2">
                  <i className="fas fa-bookmark text-xs"></i>
                  {groupName}
                  <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full font-bold normal-case">
                    {booksInGroup.length} {booksInGroup.length === 1 ? 'Book' : 'Books'}
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {booksInGroup.map((book) => {
                    const bt = bookTrackers.find(
                      (t) =>
                        String(t.book_id) === String(book.id) &&
                        String(t.class_id) === String(selectedProgressClassId)
                    );
                    const pct = bt ? Number(bt.completion_percentage) : 0;
                    const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
                    const isExpanded = progressExpandedBook === book.id;
                    const pctColor =
                      pct >= 70
                        ? 'text-emerald-600'
                        : pct >= 30
                          ? 'text-amber-600'
                          : 'text-red-500';
                    const pctBg =
                      pct >= 70
                        ? 'bg-emerald-50 border-emerald-200'
                        : pct >= 30
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-red-50 border-red-200';
                    const barColor = pct >= 70 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444';

                    const classificationId = subj?.classification_id;
                    const classification = classifications.find(
                      (c) => String(c.id) === String(classificationId)
                    );
                    const themeStyles =
                      classification?.theme && CARD_THEMES[classification.theme]
                        ? CARD_THEMES[classification.theme]
                        : CARD_THEMES.charcoal;

                    // Compute lesson counts dynamically for this class + book
                    const bookLessons = classLessons.filter(
                      (l) => String(l.book_id) === String(book.id)
                    );
                    const bookLessonIds = bookLessons.map((l) => String(l.id));
                    const bookLogs = classLogs.filter((log) =>
                      bookLessonIds.includes(String(log.lesson_id))
                    );
                    const revisionCount = bookLogs.reduce(
                      (sum, log) => sum + (log.revision_counter || 0),
                      0
                    );

                    const total = bt?.total_lessons || bookLessons.length;
                    const completed = bt?.completed || 0;
                    const inProgress = bt?.in_progress || 0;
                    const notStarted = bt?.not_started || 0;

                    return (
                      <div
                        key={book.id}
                        onClick={() => handleProgressBookClick(book.id)}
                        className={`p-4 border border-light-border border-l-[6px] rounded-2xl shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] flex flex-col justify-between ${
                          isExpanded
                            ? 'ring-2 ring-brand-primary/40 bg-brand-primary/5 border-brand-primary/30'
                            : 'bg-white'
                        } border-l-${themeStyles.color}`}
                      >
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              {subj && (
                                <h3 className=" font-semibold text-gray-500 mt-0.5">{subj.name}</h3>
                              )}
                              <h4 className="text-sm font-black text-dark-primary truncate">
                                {book.name}
                              </h4>
                            </div>
                            <div
                              className={`flex items-center justify-center w-12 h-12 rounded-xl border ${pctBg} shrink-0 ml-2`}
                            >
                              <span className={`text-sm font-black ${pctColor}`}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: barColor }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-bold border-t pt-2 mt-auto">
                          <div className="flex justify-between text-emerald-600">
                            <span>Completed:</span>
                            <span>{completed}</span>
                          </div>
                          <div className="flex justify-between text-blue-600">
                            <span>In-progress:</span>
                            <span>{inProgress}</span>
                          </div>
                          <div className="flex justify-between text-gray-400">
                            <span>Not Started:</span>
                            <span>{notStarted}</span>
                          </div>
                          <div className="flex justify-between text-purple-600">
                            <span>Revisions:</span>
                            <span>{revisionCount}</span>
                          </div>
                          <div className="flex justify-between text-dark-muted col-span-2 border-t border-dashed pt-1.5 mt-0.5">
                            <span>Total Lessons:</span>
                            <span>{total}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expanded Book Detail */}
        {progressExpandedBook && (
          <div className="bg-white border rounded-2xl shadow-sm p-5">
            {progressLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-xs font-bold text-gray-500">Loading lessons...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-black text-dark-primary">
                    {books.find((b) => b.id === progressExpandedBook)?.name} — Lesson Details
                  </h3>
                </div>

                {/* Level-1 Progress Breakdown */}
                <div className="mb-6 border-b border-light-border pb-6">
                  <h4 className="text-[10px] font-extrabold text-dark-soft uppercase tracking-wider mb-3">
                    Level-1 Unit Progress
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(() => {
                      const uniqueLevel1s = [
                        ...new Set(progressBookLessons.map((l) => l.level1).filter(Boolean)),
                      ];
                      if (uniqueLevel1s.length === 0) {
                        return (
                          <p className="text-xs text-gray-400 font-semibold col-span-full">
                            No level-1 sections defined for this book.
                          </p>
                        );
                      }

                      return uniqueLevel1s.map((lvl1) => {
                        const lvl1Lessons = progressBookLessons.filter((l) => l.level1 === lvl1);
                        const total = lvl1Lessons.length;

                        let completedCount = 0;
                        let inProgressCount = 0;
                        let totalProgressSum = 0;

                        lvl1Lessons.forEach((lesson) => {
                          const log = progressBookLogs.find(
                            (l) => String(l.lesson_id) === String(lesson.id)
                          );
                          if (log) {
                            if (log.current_status === 'completed') {
                              completedCount++;
                              totalProgressSum += 100;
                            } else if (log.current_status === 'in_progress') {
                              inProgressCount++;
                              totalProgressSum += Number(log.completion_percentage) || 0;
                            }
                          }
                        });

                        const progressPct = total > 0 ? totalProgressSum / total : 0;
                        const barColor =
                          progressPct >= 70 ? '#10b981' : progressPct >= 30 ? '#f59e0b' : '#ef4444';

                        return (
                          <div
                            key={lvl1}
                            className="p-3 border border-light-border rounded-xl bg-gray-50/50 flex flex-col justify-between shadow-sm"
                          >
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <span
                                className="text-xs font-black text-dark-primary truncate"
                                title={lvl1}
                              >
                                {lvl1}
                              </span>
                              <span className="text-xs font-black text-dark-deepblue shrink-0">
                                {progressPct.toFixed(0)}%
                              </span>
                            </div>
                            <div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${progressPct}%`, backgroundColor: barColor }}
                                />
                              </div>
                              <p className="text-[9px] text-gray-500 font-bold mt-1.5 flex items-center justify-between">
                                <span>
                                  {total} {total === 1 ? 'Lesson' : 'Lessons'}
                                </span>
                                <span className="text-dark-soft">
                                  {completedCount} ✓ / {inProgressCount} ◔
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Lessons Coverage Tracker */}
                <div className="bg-white rounded-2xl border border-light-border overflow-hidden">
                  <div className="p-4 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-extrabold text-sm text-dark-primary">
                      Lessons Coverage Tracker
                    </h3>
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl cursor-pointer text-xs font-bold text-gray-700 select-none hover:bg-gray-50 transition-colors shadow-sm">
                      <input
                        type="checkbox"
                        checked={showNotStarted}
                        onChange={(e) => setShowNotStarted(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                      />
                      Show Not Started Lessons
                    </label>
                  </div>
                  <div className="p-4 space-y-3">
                    {(() => {
                      const bookLessons = progressBookLessons;

                      const lessonsToRender = showNotStarted
                        ? bookLessons
                        : bookLessons.filter((node) => {
                            const log = progressBookLogs.find(
                              (l) => String(l.lesson_id) === String(node.id)
                            );
                            return log && log.current_status !== 'not_started';
                          });

                      if (lessonsToRender.length === 0) {
                        return (
                          <p className="text-xs text-gray-400 font-semibold py-4 text-center">
                            {showNotStarted
                              ? 'No lessons found for this book.'
                              : "No active (completed/in-progress) lessons. Check 'Show Not Started Lessons' to view all."}
                          </p>
                        );
                      }

                      return lessonsToRender.map((node) => {
                        const log = progressBookLogs.find(
                          (l) => String(l.lesson_id) === String(node.id)
                        );
                        const status = log?.current_status || 'not_started';
                        const title = [node.level1, node.level2, node.level3]
                          .filter(Boolean)
                          .join(' > ');
                        const isLogExpanded = log && expandedLogIds[log.id];

                        return (
                          <div
                            key={node.id}
                            className="border border-gray-150 rounded-xl p-3 hover:bg-gray-50/50 transition-colors"
                          >
                            <div className="flex justify-between items-center flex-wrap gap-2">
                              <div>
                                <span className="font-bold text-xs text-dark-primary">{title}</span>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {getStatusBadge(status)}
                                  {log && (
                                    <>
                                      <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border">
                                        {Number(log.completion_percentage).toFixed(0)}% Progress
                                      </span>
                                      <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border">
                                        Days Logged: {log.days_taken}
                                      </span>
                                      {log.revision_counter > 0 && (
                                        <span className="text-[9px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                          Revisions: {log.revision_counter}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {log && (
                                  <button
                                    onClick={() => toggleLogExpand(log.id)}
                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer border"
                                  >
                                    <i
                                      className={`fas fa-${isLogExpanded ? 'eye-slash' : 'eye'} mr-1`}
                                    ></i>
                                    {isLogExpanded ? 'Hide' : 'View'} Entries
                                  </button>
                                )}
                              </div>
                            </div>

                            {isLogExpanded && log && (
                              <div className="mt-3 space-y-2 border-t border-dashed pt-3 pl-4">
                                <p className="text-[9px] font-extrabold text-dark-soft uppercase tracking-wider mb-2">
                                  Logged Daily Entries
                                </p>
                                {!logItemsMap[log.id] ? (
                                  <div className="flex items-center text-[10px] text-gray-400 font-bold">
                                    <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mr-1.5"></div>
                                    Loading details...
                                  </div>
                                ) : logItemsMap[log.id].length === 0 ? (
                                  <p className="text-[10px] text-gray-400 font-semibold">
                                    No daily entries found.
                                  </p>
                                ) : (
                                  logItemsMap[log.id].map((item) => (
                                    <div
                                      key={item.id}
                                      className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-semibold text-gray-600"
                                    >
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="font-bold text-dark-primary">
                                          {new Date(item.date).toLocaleDateString()}
                                        </span>
                                        {getStatusBadge(item.current_status)}
                                        <span className="text-gray-500 font-bold">
                                          {Number(item.progress).toFixed(0)}%
                                        </span>
                                        {item.teacher?.name && (
                                          <span className="text-gray-400 font-bold">
                                            by {item.teacher.name}
                                          </span>
                                        )}
                                        {item.is_revision === 'Y' && (
                                          <span className="text-purple-600 font-black bg-purple-50 px-1 py-0.5 rounded border border-purple-100 text-[8px] uppercase tracking-wider">
                                            Revision
                                          </span>
                                        )}
                                        {item.late_reporting === 'Y' && (
                                          <span className="text-red-600 font-black bg-red-50 px-1 py-0.5 rounded border border-red-100 text-[8px] uppercase tracking-wider">
                                            Late Reporting
                                          </span>
                                        )}
                                      </div>
                                      {item.comments && (
                                        <p className="text-dark-soft mt-1 bg-white p-1.5 border rounded-md">
                                          {item.comments}
                                        </p>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Main Render ───
  if (loading) {
    return (
      <div className="p-8 text-center bg-light-bg min-h-screen flex items-center justify-center font-bold text-dark-primary">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mr-3"></div>
        Loading Syllabus Reports...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-light-bg font-sans">
      <div className="bg-white border-b p-6 shadow-sm flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2">Syllabus Progress Reports</h1>
      </div>

      <div className="p-6 overflow-y-auto pb-24 flex-1">
        <div className="flex justify-between items-center gap-4 border-b mb-6 pb-2">
          <div className="flex gap-4">
            {[
              { key: 'daily-activity', label: 'Daily Activity', icon: 'fa-list-check' },
              { key: 'book-progress', label: 'Book Progress', icon: 'fa-book' },
              { key: 'class-progress', label: 'Class Progress', icon: 'fa-chart-pie' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-brand-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <i className={`fas ${tab.icon} text-xs`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'book-progress' && (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="border p-1.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary text-xs font-bold text-dark-primary h-8 cursor-pointer"
            >
              <option value="">Select Teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {activeTab === 'class-progress' && (
            <select
              value={selectedProgressClassId}
              onChange={(e) => setSelectedProgressClassId(e.target.value)}
              className="border p-1.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary text-xs font-bold text-dark-primary h-8 cursor-pointer"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.class_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {activeTab === 'daily-activity' && renderDailyActivity()}
        {activeTab === 'book-progress' && renderBookProgress()}
        {activeTab === 'class-progress' && renderClassProgress()}
      </div>
    </div>
  );
};

export default SyllabusProgressReport;
