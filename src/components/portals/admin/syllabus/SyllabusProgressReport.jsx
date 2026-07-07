import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';
import { CARD_THEMES } from '../../../../utils/cardTheme';
import ConfirmModal from '../../../ConfirmModal';

const MultiSelectDropdown = ({ label, options, selected, onChange, placeholder = 'All' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter((opt) =>
    (opt.label || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((opt) => opt.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="relative inline-block text-left w-full sm:w-44">
      <div className="flex flex-col gap-0.5">
        {label && (
          <span className="text-[10px] font-extrabold text-dark-soft uppercase tracking-wider">
            {label}
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-dark-primary flex justify-between items-center shadow-sm hover:bg-gray-50 cursor-pointer h-7"
        >
          <span className="truncate select-none">
            {selected.length === 0 ? placeholder : `Selected (${selected.length})`}
          </span>
          <i className="fas fa-chevron-down text-[9px] text-gray-400 ml-1"></i>
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute left-0 mt-1 w-64 rounded-xl bg-white border border-gray-200 shadow-lg z-20 flex flex-col max-h-72 overflow-hidden">
            <div className="p-2 border-b bg-gray-50 flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div className="p-1.5 border-b bg-gray-50/50 flex justify-between text-[10px] font-black text-brand-primary uppercase px-3 select-none">
              <button onClick={handleSelectAll} className="hover:underline cursor-pointer">
                Select All
              </button>
              <button onClick={handleClearAll} className="hover:underline cursor-pointer">
                Clear All
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {filteredOptions.length === 0 ? (
                <p className="text-[10px] text-gray-400 font-semibold text-center py-2">
                  No matching options
                </p>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selected.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer select-none text-xs font-bold text-dark-primary"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(opt.id)}
                        className="rounded text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SyllabusProgressReport = ({ role, student }) => {
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
  const [activeTab, setActiveTab] = useState(() =>
    role === 'parent' ? 'today-class' : 'daily-activity'
  );

  // ─── Tab 1: Daily Activity States & Filters ───
  const [dailyEntries, setDailyEntries] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [deleteModalConfig, setDeleteModalConfig] = useState(null);

  const getLocalDateStr = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Column Filters for Daily Activity
  const [filterClasses, setFilterClasses] = useState(() =>
    role === 'parent' && student?.class_id ? [String(student.class_id)] : []
  );
  const [filterSubjects, setFilterSubjects] = useState([]);
  const [filterBooks, setFilterBooks] = useState([]);
  const [filterTeachers, setFilterTeachers] = useState([]);
  const [filterTopic, setFilterTopic] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [timeFilter, setTimeFilter] = useState('7_days'); // '7_days' | '30_days' | 'range'
  const [dateRange, setDateRange] = useState(() => ({
    start: getLocalDateStr(7),
    end: getLocalDateStr(0),
  }));

  // ─── Tab 2: Class Progress States (Syllabus Progress) ───
  const [cpFilterClasses, setCpFilterClasses] = useState(() =>
    role === 'parent' && student?.class_id ? [String(student.class_id)] : []
  );
  const [cpFilterBooks, setCpFilterBooks] = useState([]);
  const [cpFilterClassifications, setCpFilterClassifications] = useState([]);
  const [cpGroupingMode, setCpGroupingMode] = useState(() =>
    role === 'parent' ? 'none' : 'classification'
  );
  const [classLogs, setClassLogs] = useState([]);
  const [classLessons, setClassLessons] = useState([]);
  const [progressExpandedBook, setProgressExpandedBook] = useState(null);
  const [progressExpandedClass, setProgressExpandedClass] = useState(null);
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
        supabase.from('classes').select('*').order('id', { ascending: true }),
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

      let fetchedClasses = dbClasses;
      if (role === 'parent' && student?.class_id) {
        const hasClass = fetchedClasses.some((c) => String(c.id) === String(student.class_id));
        if (!hasClass) {
          fetchedClasses = [
            ...fetchedClasses,
            {
              id: student.class_id,
              name: student.class_name || 'Class ' + student.class_id,
            },
          ];
        }
      }

      if (
        dbClasses.length === 0 &&
        dbTeachers.length === 0 &&
        dbBooks.length === 0 &&
        role !== 'parent'
      ) {
        loadLocalFallback();
      } else {
        setClasses(fetchedClasses);
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
  }, [student?.id, student?.class_id]);

  useEffect(() => {
    if (role === 'parent' && student?.class_id) {
      setCpFilterClasses([String(student.class_id)]);
      setFilterClasses([String(student.class_id)]);
      setProgressExpandedBook(null);
      setProgressExpandedClass(null);
      setExpandedLogIds({});
      setLogItemsMap({});
      setActiveTab('today-class');
    }
  }, [student?.class_id, role]);

  // ─── Daily Activity: Fetch & Enrich Logs ───
  const fetchDailyEntries = useCallback(async () => {
    setDailyLoading(true);
    try {
      let items = [];
      let logs = [];

      // Determine date boundaries
      let startBound = null;
      let endBound = null;

      if (role === 'parent') {
        if (activeTab === 'today-class') {
          startBound = getLocalDateStr(0);
          endBound = getLocalDateStr(0);
        } else if (activeTab === 'two-weeks-class') {
          startBound = getLocalDateStr(14);
          endBound = getLocalDateStr(0);
        }
      } else {
        if (timeFilter === '7_days') {
          startBound = getLocalDateStr(7);
          endBound = getLocalDateStr(0);
        } else if (timeFilter === '30_days') {
          startBound = getLocalDateStr(30);
          endBound = getLocalDateStr(0);
        } else if (timeFilter === 'range' && dateRange.start && dateRange.end) {
          startBound = dateRange.start;
          endBound = dateRange.end;
        }

        // If range is selected but not completely filled, clear and skip query
        if (timeFilter === 'range' && (!dateRange.start || !dateRange.end)) {
          setDailyEntries([]);
          setDailyLoading(false);
          return;
        }
      }

      if (role === 'parent' && student?.class_id) {
        let queryLogs = supabase
          .from('lesson_tracker_log')
          .select('*')
          .eq('class_id', student.class_id);

        const { data: dbLogs, error: dbLogsErr } = await queryLogs;
        if (dbLogsErr) throw dbLogsErr;

        logs = dbLogs || [];
        const logIds = logs.map((l) => l.id);

        if (logIds.length > 0) {
          let queryItems = supabase
            .from('lesson_tracker_log_items')
            .select('*, teacher:teachers(name)')
            .in('lt_log_id', logIds);

          if (startBound && endBound) {
            queryItems = queryItems.gte('date', startBound).lte('date', endBound);
          }

          const { data: dbItems, error: dbItemsErr } = await queryItems.order('date', { ascending: false });
          if (dbItemsErr) throw dbItemsErr;
          items = dbItems || [];
        }
      } else {
        let queryItems = supabase
          .from('lesson_tracker_log_items')
          .select('*, teacher:teachers(name)');

        if (startBound && endBound) {
          queryItems = queryItems.gte('date', startBound).lte('date', endBound);
        }

        const { data: dbItems, error } = await queryItems
          .order('date', { ascending: false })
          .limit(200);
        if (error) throw error;
        items = dbItems || [];

        const ltLogIds = [...new Set(items.map((i) => i.lt_log_id))];
        if (ltLogIds.length > 0) {
          const { data: dbLogs, error: logErr } = await supabase
            .from('lesson_tracker_log')
            .select('*')
            .in('id', ltLogIds);
          if (logErr) throw logErr;
          logs = dbLogs || [];
        }
      }

      if (!items || items.length === 0) {
        setDailyEntries([]);
        return;
      }

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
  }, [
    role,
    activeTab,
    student?.class_id,
    timeFilter,
    dateRange.start,
    dateRange.end,
    books,
    subjects,
    classes,
  ]);

  const handleDeleteClick = (entry, parentLog = null, lesson = null, book = null) => {
    let className = '—';
    if (entry.class?.name || entry.class?.class_name) {
      className = entry.class.name || entry.class.class_name;
    } else if (parentLog) {
      const cls = classes.find((c) => c.id === parentLog.class_id);
      className = cls?.name || `Class ID ${parentLog.class_id}`;
    }

    let subjectName = '—';
    if (entry.subject?.name) {
      subjectName = entry.subject.name;
    } else if (book) {
      const sub = subjects.find((s) => s.id === book.subject_id);
      subjectName = sub?.name || '—';
    } else if (lesson) {
      const b = books.find((x) => x.id === lesson.book_id);
      const sub = b ? subjects.find((s) => s.id === b.subject_id) : null;
      subjectName = sub?.name || '—';
    }

    setDeleteModalConfig({
      id: entry.id,
      date: new Date(entry.date).toLocaleDateString(),
      className,
      subjectName,
      logId: parentLog?.id || entry.lt_log_id,
    });
  };

  const handleExecuteDelete = async () => {
    if (!deleteModalConfig) return;
    setDailyLoading(true);
    try {
      const { error } = await supabase
        .from('lesson_tracker_log_items')
        .delete()
        .eq('id', deleteModalConfig.id);
      if (error) throw error;

      showToast('Log entry deleted successfully!', 'success');

      if (deleteModalConfig.logId) {
        setLogItemsMap((prev) => {
          const updated = { ...prev };
          if (updated[deleteModalConfig.logId]) {
            updated[deleteModalConfig.logId] = updated[deleteModalConfig.logId].filter(
              (item) => item.id !== deleteModalConfig.id
            );
          }
          return updated;
        });
      }

      setDeleteModalConfig(null);
      await fetchDailyEntries();
    } catch (err) {
      showToast('Error deleting log entry: ' + err.message, 'error');
    } finally {
      setDailyLoading(false);
    }
  };

  useEffect(() => {
    if (
      (activeTab === 'daily-activity' || activeTab === 'today-class' || activeTab === 'two-weeks-class') &&
      books.length > 0
    ) {
      fetchDailyEntries();
    }
  }, [activeTab, books, fetchDailyEntries]);

  // ─── Click Book Tile to Expand Lessons ───
  const handleProgressBookClick = async (bookId, classId) => {
    if (progressExpandedBook === bookId && String(progressExpandedClass) === String(classId)) {
      setProgressExpandedBook(null);
      setProgressExpandedClass(null);
      return;
    }
    setProgressExpandedBook(bookId);
    setProgressExpandedClass(classId);
    setProgressLoading(true);
    setShowNotStarted(false);
    setExpandedLogIds({});
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

  useEffect(() => {
    if (role === 'parent' && student?.class_id) {
      setCpFilterClasses([String(student.class_id)]);
      setFilterClasses([String(student.class_id)]);
      setCpGroupingMode('none');
    }
  }, [role, student?.class_id]);

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
  const renderDateFilterPopup = () => null;

  const renderDailyActivityTiles = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDailyEntries.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
            {activeTab === 'today-class'
              ? 'No class logs recorded for today.'
              : 'No class logs recorded for the last 2 weeks.'}
          </div>
        ) : (
          filteredDailyEntries.map((entry) => {
            const pct = Number(entry.progress || 0);
            const status = entry.current_status || 'not_started';

            // Resolve subject colors for left border
            const classificationId = entry.subject?.classification_id;
            const classification = classifications.find(
              (c) => String(c.id) === String(classificationId)
            );
            const themeStyles =
              classification?.theme && CARD_THEMES[classification.theme]
                ? CARD_THEMES[classification.theme]
                : CARD_THEMES.charcoal;

            return (
              <div
                key={entry.id}
                className={`p-5 bg-white border border-light-border border-l-[6px] border-l-${themeStyles.color} rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2 text-left">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block mb-0.5">
                        {entry.subject?.name || 'Subject'}
                      </span>
                      <h4
                        className="text-sm font-black text-dark-primary truncate"
                        title={entry.book?.name || ''}
                      >
                        {entry.book?.name || 'Syllabus Book'}
                      </h4>
                    </div>
                    {getStatusBadge(status, entry.isRevision)}
                  </div>

                  <div className="space-y-2 mb-4 text-left">
                    <div className="text-xs">
                      <span className="text-gray-400 font-medium block">Topic / Path</span>
                      <span
                        className="font-bold text-dark-charcoal line-clamp-2"
                        title={entry.lessonPath}
                      >
                        {entry.lessonPath || '—'}
                      </span>
                    </div>

                    {entry.comments && (
                      <div className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-2">
                        <span className="text-gray-400 font-medium block text-[10px] uppercase tracking-wider mb-0.5">
                          Teacher's Remarks
                        </span>
                        <p className="font-bold text-gray-600 text-xs leading-relaxed italic">
                          "{entry.comments}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-3 mt-auto flex flex-col gap-2 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                        <i className="fas fa-user-tie"></i>
                      </div>
                      <span
                        className="font-extrabold text-blue-600 truncate"
                        title={entry.teacher?.name || ''}
                      >
                        {entry.teacher?.name || '—'}
                      </span>
                    </div>

                    {!entry.isRevision && (
                      <span className="font-black text-dark-primary bg-gray-100 px-2 py-0.5 rounded text-[10px]">
                        Progress: {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {!entry.isRevision && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-0.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500 bg-brand-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderDailyActivity = () => {
    if (dailyLoading) {
      return (
        <div className="flex items-center justify-center p-12 bg-white border border-light-border rounded-2xl shadow-sm">
          <div className="w-6 h-6 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-xs font-bold text-gray-500">
            {role === 'parent' ? "Loading today's class..." : 'Loading daily activity...'}
          </span>
        </div>
      );
    }

    if (role === 'parent' && activeTab === 'today-class') {
      return renderDailyActivityTiles();
    }

    // Options mapping for MultiSelectDropdowns
    const classOpts = classes.map((c) => ({ id: String(c.id), label: c.name || c.class_name }));
    const subjectOpts = subjects.map((s) => ({ id: String(s.id), label: s.name }));
    const bookOpts = books.map((b) => ({ id: String(b.id), label: b.name }));
    const teacherOpts = teachers.map((t) => ({ id: String(t.id), label: t.name }));
    const isParent = role === 'parent';

    return (
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden space-y-4 p-4 text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {isParent ? (
                <tr className="bg-gray-50 border-b border-light-border text-dark-muted font-extrabold text-[10px] uppercase tracking-wider whitespace-nowrap">
                  <th className="px-4 py-3 min-w-[90px]">Date</th>
                  <th className="px-4 py-3 min-w-[150px]">Subject \ Book</th>
                  <th className="px-4 py-3 min-w-[180px]">Topic</th>
                  <th className="px-4 py-3 min-w-[95px]">Status</th>
                  <th className="px-4 py-3 min-w-[115px]">Teacher</th>
                </tr>
              ) : (
                <>
                  <tr className="bg-gray-50 border-b border-light-border text-dark-muted font-extrabold text-[10px] uppercase tracking-wider whitespace-nowrap">
                    <th className="px-4 py-3 min-w-[90px]">Date</th>
                    <th className="px-4 py-3 min-w-[80px]">Class</th>
                    <th className="px-4 py-3 min-w-[90px]">Subject</th>
                    <th className="px-4 py-3 min-w-[110px]">Book</th>
                    <th className="px-4 py-3 min-w-[115px]">Teacher</th>
                    <th className="px-4 py-3 min-w-[140px]">Topic / Path</th>
                    <th className="px-4 py-3 min-w-[95px]">Status</th>
                    <th className="px-4 py-3 min-w-[70px]">Progress</th>
                    <th className="px-4 py-3 min-w-[140px]">Comments</th>
                    <th className="px-4 py-3 min-w-[60px] text-center">Action</th>
                  </tr>
                  {/* Filter inputs row */}
                  <tr className="bg-gray-100/50 border-b border-light-border">
                    <th className="px-2 py-1">
                      <div className="text-[10px] text-gray-400 text-center py-1 font-bold">
                        Filtered
                      </div>
                    </th>
                    <th className="px-2 py-1">
                      <MultiSelectDropdown
                        label=""
                        placeholder="All"
                        options={classOpts}
                        selected={filterClasses}
                        onChange={setFilterClasses}
                      />
                    </th>
                    <th className="px-2 py-1">
                      <MultiSelectDropdown
                        label=""
                        placeholder="All"
                        options={subjectOpts}
                        selected={filterSubjects}
                        onChange={setFilterSubjects}
                      />
                    </th>
                    <th className="px-2 py-1">
                      <MultiSelectDropdown
                        label=""
                        placeholder="All"
                        options={bookOpts}
                        selected={filterBooks}
                        onChange={setFilterBooks}
                      />
                    </th>
                    <th className="px-2 py-1">
                      <MultiSelectDropdown
                        label=""
                        placeholder="All"
                        options={teacherOpts}
                        selected={filterTeachers}
                        onChange={setFilterTeachers}
                      />
                    </th>
                    <th className="px-2 py-1">
                      <input
                        type="text"
                        value={filterTopic}
                        onChange={(e) => setFilterTopic(e.target.value)}
                        placeholder="Filter topic..."
                        className="w-full border p-1 rounded font-bold text-[11px] outline-none focus:ring-1 focus:ring-brand-primary h-7 bg-white"
                      />
                    </th>
                    <th className="px-2 py-1">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full border p-1 rounded font-bold text-[11px] outline-none focus:ring-1 focus:ring-brand-primary bg-white h-7 cursor-pointer"
                      >
                        <option value="">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="not_started">Not Started</option>
                      </select>
                    </th>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1 text-center">
                      <button
                        onClick={clearDailyFilters}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-[10px] uppercase px-2 py-1 rounded-lg border border-red-100 transition-colors cursor-pointer w-full h-7 flex items-center justify-center gap-1 shadow-sm font-black"
                        title="Clear all filters"
                      >
                        <i className="fas fa-trash-can text-[9px]"></i> Clear
                      </button>
                    </th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
              {filteredDailyEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={isParent ? 5 : 10}
                    className="text-center py-6 text-gray-400 font-semibold"
                  >
                    No entries match your search filters.
                  </td>
                </tr>
              ) : (
                filteredDailyEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/40">
                    {isParent ? (
                      <>
                        <td className="px-4 py-3 text-dark-primary whitespace-nowrap">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-brand-primary">
                              {entry.subject?.name || '—'}
                            </span>
                            <span className="text-gray-300 font-normal">\</span>
                            <span className="font-semibold text-gray-500">
                              {entry.book?.name || '—'}
                            </span>
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 font-semibold text-gray-600 max-w-[250px] truncate whitespace-nowrap"
                          title={entry.lessonPath}
                        >
                          {entry.lessonPath}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(entry.current_status, entry.isRevision)}
                        </td>
                        <td className="px-4 py-3 text-blue-600 font-extrabold whitespace-nowrap">
                          {entry.teacher?.name || '—'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-dark-primary whitespace-nowrap">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-brand-primary whitespace-nowrap">
                          {entry.class?.name || entry.class?.class_name || '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                          {entry.subject?.name || '—'}
                        </td>
                        <td className="px-4 py-3 font-bold text-dark-primary whitespace-nowrap">
                          {entry.book?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-blue-600 font-extrabold whitespace-nowrap">
                          {entry.teacher?.name || '—'}
                        </td>
                        <td
                          className="px-4 py-3 font-semibold text-gray-600 max-w-[250px] truncate whitespace-nowrap"
                          title={entry.lessonPath}
                        >
                          {entry.lessonPath}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(entry.current_status, entry.isRevision)}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                          {entry.isRevision ? '—' : `${Number(entry.progress).toFixed(0)}%`}
                        </td>
                        <td
                          className="px-4 py-3 text-gray-500 max-w-[200px] truncate whitespace-nowrap"
                          title={entry.comments || ''}
                        >
                          {entry.comments || '—'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteClick(entry)}
                            className="p-1 text-red-primary hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete Log Entry"
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSyllabusProgress = () => {
    // 1. Filter books based on classes selection
    const filteredClassBookClasses = bookClasses.filter((bc) => {
      if (cpFilterClasses.length > 0) {
        return cpFilterClasses.includes(String(bc.class_id));
      }
      return true;
    });

    const allowedBookIds = filteredClassBookClasses.map((bc) => String(bc.book_id));

    // 2. Filter books list
    const filteredBooks = books.filter((book) => {
      if (!allowedBookIds.includes(String(book.id))) return false;

      if (cpFilterBooks.length > 0 && !cpFilterBooks.includes(String(book.id))) {
        return false;
      }

      if (cpFilterClassifications.length > 0) {
        const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
        if (!subj || !cpFilterClassifications.includes(String(subj.classification_id))) {
          return false;
        }
      }

      return true;
    });

    const classesToRender = classes.filter((c) => {
      if (cpFilterClasses.length > 0) {
        return cpFilterClasses.includes(String(c.id));
      }
      // Only render classes that have at least one matching book in filteredBooks
      return bookClasses.some(
        (bc) =>
          String(bc.class_id) === String(c.id) &&
          filteredBooks.some((fb) => String(fb.id) === String(bc.book_id))
      );
    });

    // Sub-renderer for a class's books grid
    const renderBooksGrid = (classObj, classBooks) => {
      if (classBooks.length === 0) {
        return (
          <div className="p-8 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
            No syllabus books found for this class.
          </div>
        );
      }

      // Group books within this class
      const booksByGroup = {};
      if (cpGroupingMode === 'classification') {
        classBooks.forEach((book) => {
          const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
          const classificationId = subj?.classification_id;
          const classification = classifications.find(
            (cl) => String(cl.id) === String(classificationId)
          );
          const groupName = classification ? classification.name : 'Other / Unclassified';
          if (!booksByGroup[groupName]) {
            booksByGroup[groupName] = [];
          }
          booksByGroup[groupName].push(book);
        });
      } else if (cpGroupingMode === 'subject') {
        classBooks.forEach((book) => {
          const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
          const groupName = subj ? subj.name : 'General / Unclassified';
          if (!booksByGroup[groupName]) {
            booksByGroup[groupName] = [];
          }
          booksByGroup[groupName].push(book);
        });
      } else {
        booksByGroup['All Books'] = classBooks;
      }

      const isClassExpanded = progressExpandedClass === classObj.id;

      return (
        <div className="space-y-6">
          {Object.keys(booksByGroup).map((groupName) => {
            const groupedBooks = booksByGroup[groupName];
            return (
              <div key={groupName} className="space-y-3 text-left">
                {cpGroupingMode !== 'none' && (
                  <h4 className="text-xs font-black text-dark-soft border-l-[3px] border-brand-primary pl-2 uppercase tracking-wider">
                    {groupName}
                  </h4>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupedBooks.map((book) => {
                    const bt = bookTrackers.find(
                      (t) =>
                        String(t.book_id) === String(book.id) &&
                        String(t.class_id) === String(classObj.id)
                    );
                    const pct = Number(bt?.completion_percentage || 0);
                    const isExpanded =
                      progressExpandedBook === book.id && progressExpandedClass === classObj.id;
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

                    const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
                    const classificationId = subj?.classification_id;
                    const classification = classifications.find(
                      (cl) => String(cl.id) === String(classificationId)
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

                    const activeBookLogs = bookLogs.filter(
                      (log) => log.current_status !== 'not_started'
                    );

                    let bookStartDate = null;
                    activeBookLogs.forEach((log) => {
                      if (log.start_date) {
                        if (!bookStartDate || new Date(log.start_date) < new Date(bookStartDate)) {
                          bookStartDate = log.start_date;
                        }
                      }
                    });

                    let bookEndDate = null;
                    activeBookLogs.forEach((log) => {
                      if (log.end_date) {
                        if (!bookEndDate || new Date(log.end_date) > new Date(bookEndDate)) {
                          bookEndDate = log.end_date;
                        }
                      }
                    });

                    let bookUpdatedAt = null;
                    bookLogs.forEach((log) => {
                      if (log.updated_at) {
                        if (!bookUpdatedAt || new Date(log.updated_at) > new Date(bookUpdatedAt)) {
                          bookUpdatedAt = log.updated_at;
                        }
                      }
                    });

                    const cumulativeDaysTaken = bookLogs.reduce(
                      (sum, log) => sum + (log.days_taken || 0),
                      0
                    );

                    const total = bt?.total_lessons || bookLessons.length;
                    const completed = bt?.completed || 0;
                    const inProgress = bt?.in_progress || 0;
                    const notStarted = bt?.not_started || 0;

                    return (
                      <div
                        key={book.id}
                        onClick={() => handleProgressBookClick(book.id, classObj.id)}
                        className={`p-4 border border-light-border border-l-[6px] rounded-2xl shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]  flex flex-col justify-between ${
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
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[10px] text-gray-500 font-bold bg--100 px-2 py-1 rounded border whitespace-nowrap">
                                {cumulativeDaysTaken} Days
                              </span>
                              <div
                                className={`flex items-center justify-center w-12 h-12 rounded-xl border ${pctBg}`}
                              >
                                <span className={`text-sm font-black ${pctColor}`}>
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
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
                            <span>Revision Days:</span>
                            <span>{revisionCount}</span>
                          </div>

                          <div className="flex justify-between text-dark-muted border-t border-dashed pt-1.5 mt-0.5 col-span-2">
                            <span>Total Lessons:</span>
                            <span>{total}</span>
                          </div>
                          <div className="border-t border-dashed pt-2 mt-1.5 text-[9px] text-gray-500 font-bold col-span-2 space-y-0.5">
                            <div className="flex justify-between">
                              <span>
                                Started:{' '}
                                {bookStartDate ? new Date(bookStartDate).toLocaleDateString() : '—'}
                              </span>
                              {pct === 100 ? (
                                <span>
                                  Ended:{' '}
                                  {bookEndDate ? new Date(bookEndDate).toLocaleDateString() : '—'}
                                </span>
                              ) : (
                                <span>
                                  Updated:{' '}
                                  {bookUpdatedAt
                                    ? new Date(bookUpdatedAt).toLocaleDateString()
                                    : '—'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Expanded details container for this class */}
          {isClassExpanded && progressExpandedBook && renderExpandedDetails()}
        </div>
      );
    };

    // Sub-renderer for expanded lessons details
    const renderExpandedDetails = () => {
      return (
        <div className="bg-gray-50/50 border border-dashed rounded-2xl p-5 mt-4 text-left">
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
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showNotStarted}
                    onChange={(e) => setShowNotStarted(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                  />
                  Show Not Started Lessons
                </label>
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
                      let cumulativeDaysTaken = 0;

                      lvl1Lessons.forEach((lesson) => {
                        const log = progressBookLogs.find(
                          (l) => String(l.lesson_id) === String(lesson.id)
                        );
                        if (log) {
                          if (log.days_taken) {
                            cumulativeDaysTaken += Number(log.days_taken);
                          }
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
                          className="bg-white border rounded-xl p-3 shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-1.5 gap-2">
                              <span className="font-extrabold text-xs text-dark-primary truncate flex-1">
                                {lvl1}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border whitespace-nowrap">
                                  {cumulativeDaysTaken} Days
                                </span>
                                <span className="font-black text-xs text-dark-soft">
                                  {progressPct.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1 mb-2">
                              <div
                                className="h-1 rounded-full transition-all duration-300"
                                style={{ width: `${progressPct}%`, backgroundColor: barColor }}
                              />
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mt-1 border-t pt-1.5 flex-wrap gap-1">
                            <span>
                              Completed: {completedCount}/{total}
                            </span>
                            {inProgressCount > 0 && (
                              <span className="text-blue-600">In-progress: {inProgressCount}</span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Detailed lessons list */}
              <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-dark-soft font-extrabold text-[10px] uppercase tracking-wider">
                      <th className="pb-2.5 font-extrabold text-left min-w-[200px]">
                        Lesson Details
                      </th>
                      <th className="pb-2.5 font-extrabold text-center min-w-[80px]">Progress</th>
                      <th className="pb-2.5 font-extrabold text-center min-w-[85px]">Days Taken</th>
                      <th className="pb-2.5 font-extrabold text-center min-w-[90px]">Status</th>
                      <th className="pb-2.5 font-extrabold text-right min-w-[90px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const lessonsToRender = showNotStarted
                        ? progressBookLessons.filter((node) => {
                            const log = progressBookLogs.find(
                              (l) => String(l.lesson_id) === String(node.id)
                            );
                            const isNotStarted = !log || log.current_status === 'not_started';
                            if (isNotStarted) {
                              const isRev = [node.level1, node.level2, node.level3]
                                .filter(Boolean)
                                .some(
                                  (lvl) =>
                                    lvl.toLowerCase().includes('_revision') ||
                                    lvl.toLowerCase() === 'revision'
                                );
                              return !isRev;
                            }
                            return true;
                          })
                        : progressBookLessons.filter((node) => {
                            const log = progressBookLogs.find(
                              (l) => String(l.lesson_id) === String(node.id)
                            );
                            return log && log.current_status !== 'not_started';
                          });

                      if (lessonsToRender.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={5}
                              className="text-xs text-gray-400 font-semibold py-8 text-center"
                            >
                              {showNotStarted
                                ? 'No lessons found for this book.'
                                : "No active (completed/in-progress) lessons. Check 'Show Not Started Lessons' to view all."}
                            </td>
                          </tr>
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
                          <React.Fragment key={node.id}>
                            <tr className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-3 pr-2">
                                <div className="font-bold text-dark-primary text-xs">{title}</div>
                                {log && (
                                  <div className="flex items-center gap-2 mt-1 flex-wrap text-[9px] text-gray-400 font-bold">
                                    <span>
                                      Started:{' '}
                                      {log.start_date
                                        ? new Date(log.start_date).toLocaleDateString()
                                        : '—'}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                    {log.completion_percentage === 100 || status === 'completed' ? (
                                      <span>
                                        Ended:{' '}
                                        {log.end_date
                                          ? new Date(log.end_date).toLocaleDateString()
                                          : '—'}
                                      </span>
                                    ) : (
                                      <span>
                                        Last Updated:{' '}
                                        {log.updated_at
                                          ? new Date(log.updated_at).toLocaleDateString()
                                          : '—'}
                                      </span>
                                    )}
                                    {log.revision_counter > 0 && (
                                      <>
                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                        <span className="text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-100">
                                          Revisions: {log.revision_counter}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {log ? (
                                  <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded border">
                                    {Number(log.completion_percentage).toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {log ? (
                                  <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded border">
                                    {log.days_taken || 0}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center flex items-center justify-center h-full">
                                <div className="mt-1">{getStatusBadge(status)}</div>
                              </td>
                              <td className="py-3 pl-2 text-right">
                                {log && (
                                  <button
                                    onClick={() => toggleLogExpand(log.id)}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer border"
                                  >
                                    <i
                                      className={`fas fa-${isLogExpanded ? 'eye-slash' : 'eye'} mr-1`}
                                    ></i>
                                    {isLogExpanded ? 'Hide' : 'View'}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {isLogExpanded && log && (
                              <tr>
                                <td colSpan={5} className="pb-3 bg-gray-50/50">
                                  <div className="mt-2 space-y-2 border-t border-dashed pt-3 pl-4">
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
                                          className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-semibold text-gray-600 flex justify-between items-start gap-4"
                                        >
                                          <div className="flex-1 min-w-0">
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
                                          {role !== 'parent' && (
                                            <button
                                              onClick={() =>
                                                handleDeleteClick(item, log, node, book)
                                              }
                                              className="p-1 text-red-primary hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                                              title="Delete Log Entry"
                                            >
                                              <i className="fas fa-trash-alt text-[10px]"></i>
                                            </button>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      );
    };

    if (role === 'parent') {
      const parentClass = classes.find((c) => String(c.id) === String(student?.class_id));
      if (!parentClass) return null;
      const classBookIds = bookClasses
        .filter((bc) => String(bc.class_id) === String(parentClass.id))
        .map((bc) => String(bc.book_id));
      const classBooks = filteredBooks.filter((fb) => classBookIds.includes(String(fb.id)));
      return renderBooksGrid(parentClass, classBooks);
    }

    return (
      <div className="space-y-6">
        {classesToRender.length === 0 ? (
          <div className="p-12 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
            No matching classes/books progress found.
          </div>
        ) : (
          classesToRender.map((c) => {
            const classBookIds = bookClasses
              .filter((bc) => String(bc.class_id) === String(c.id))
              .map((bc) => String(bc.book_id));
            const classBooks = filteredBooks.filter((fb) => classBookIds.includes(String(fb.id)));
            if (classBooks.length === 0) return null;

            return (
              <div
                key={c.id}
                className="bg-white border border-light-border rounded-2xl shadow-sm overflow-hidden p-6 space-y-4 text-left"
              >
                <h3 className="text-base font-black text-dark-primary border-b pb-2 flex items-center gap-2">
                  <i className="fas fa-graduation-cap text-brand-primary"></i>
                  {c.name || c.class_name}
                </h3>
                {renderBooksGrid(c, classBooks)}
              </div>
            );
          })
        )}
      </div>
    );
  };

  const clearDailyFilters = () => {
    setFilterClasses(role === 'parent' && student?.class_id ? [String(student.class_id)] : []);
    setFilterSubjects([]);
    setFilterBooks([]);
    setFilterTeachers([]);
    setFilterTopic('');
    setFilterStatus('');
    setTimeFilter('7_days');
    setDateRange({ start: getLocalDateStr(7), end: getLocalDateStr(0) });
  };

  const getFilteredDailyEntries = () => {
    return dailyEntries.filter((entry) => {
      if (filterClasses.length > 0 && !filterClasses.includes(String(entry.class?.id))) {
        return false;
      }
      if (filterSubjects.length > 0 && !filterSubjects.includes(String(entry.subject?.id))) {
        return false;
      }
      if (filterBooks.length > 0 && !filterBooks.includes(String(entry.book?.id))) {
        return false;
      }
      if (filterTeachers.length > 0 && !filterTeachers.includes(String(entry.teacher_id))) {
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
  };

  const filteredDailyEntries = getFilteredDailyEntries();

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
      <div className="p-6 overflow-y-auto pb-24 flex-1">
        <div className="flex justify-between items-center gap-4 border-b mb-6 pb-2 flex-wrap">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex gap-2">
              {role === 'parent' ? (
                [
                  { key: 'today-class', label: "Today's Class", icon: 'fa-calendar-day' },
                  { key: 'two-weeks-class', label: "Last 2 Weeks Classes", icon: 'fa-calendar-week' },
                  { key: 'class-progress', label: 'Syllabus Progress', icon: 'fa-chart-pie' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
                      activeTab === tab.key
                        ? 'bg-brand-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border'
                    }`}
                  >
                    <i className={`fas ${tab.icon} text-xs`}></i>
                    {tab.label}
                  </button>
                ))
              ) : (
                [
                  { key: 'daily-activity', label: 'Teacher Progress', icon: 'fa-list-check' },
                  { key: 'class-progress', label: 'Syllabus Progress', icon: 'fa-chart-pie' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
                      activeTab === tab.key
                        ? 'bg-brand-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border'
                    }`}
                  >
                    <i className={`fas ${tab.icon} text-xs`}></i>
                    {tab.label}
                  </button>
                ))
              )}
            </div>

            {role !== 'parent' && activeTab === 'daily-activity' && (
              <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full select-none">
                Showing {filteredDailyEntries.length} of {dailyEntries.length} entries
              </span>
            )}
            {role === 'parent' && (activeTab === 'today-class' || activeTab === 'two-weeks-class') && (
              <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full select-none">
                Showing {filteredDailyEntries.length} entries
              </span>
            )}
          </div>

          {role !== 'parent' && activeTab === 'daily-activity' && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex bg-gray-100 p-0.5 rounded-lg border h-8 items-center gap-0.5 select-none">
                {[
                  { key: '7_days', label: '7 Days' },
                  { key: '30_days', label: '30 Days' },
                  { key: 'range', label: 'Custom Range' },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTimeFilter(t.key)}
                    className={`px-3.5 py-1 rounded-md text-[10px] font-extrabold transition-all h-full cursor-pointer flex items-center ${
                      timeFilter === t.key
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {timeFilter === 'range' && (
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="border rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-primary h-8 bg-white"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="border rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-primary h-8 bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'class-progress' && (
            <div className="flex items-center gap-2 flex-wrap">
              {role !== 'parent' && (
                <>
                  <MultiSelectDropdown
                    label=""
                    placeholder="Class Filter"
                    options={classes.map((c) => ({
                      id: String(c.id),
                      label: c.name || c.class_name,
                    }))}
                    selected={cpFilterClasses}
                    onChange={(val) => {
                      setCpFilterClasses(val);
                      setProgressExpandedBook(null);
                      setProgressExpandedClass(null);
                    }}
                  />
                  <MultiSelectDropdown
                    label=""
                    placeholder="Book Filter"
                    options={books.map((b) => ({ id: String(b.id), label: b.name }))}
                    selected={cpFilterBooks}
                    onChange={(val) => {
                      setCpFilterBooks(val);
                      setProgressExpandedBook(null);
                      setProgressExpandedClass(null);
                    }}
                  />
                  <MultiSelectDropdown
                    label=""
                    placeholder="Classification Filter"
                    options={classifications.map((cl) => ({ id: String(cl.id), label: cl.name }))}
                    selected={cpFilterClassifications}
                    onChange={(val) => {
                      setCpFilterClassifications(val);
                      setProgressExpandedBook(null);
                      setProgressExpandedClass(null);
                    }}
                  />

                  <div className="flex bg-gray-100 p-0.5 rounded-lg items-center border h-7">
                    {[
                      { key: 'none', label: 'No Group' },
                      { key: 'classification', label: 'Classification' },
                      { key: 'subject', label: 'Subject' },
                    ].map((g) => (
                      <button
                        key={g.key}
                        onClick={() => setCpGroupingMode(g.key)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer h-full flex items-center ${
                          cpGroupingMode === g.key
                            ? 'bg-brand-primary text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {(activeTab === 'daily-activity' || activeTab === 'today-class' || activeTab === 'two-weeks-class') &&
          renderDailyActivity()}
        {activeTab === 'class-progress' && renderSyllabusProgress()}
      </div>

      <ConfirmModal
        isOpen={!!deleteModalConfig}
        title="Delete Log Entry"
        message={`Are you sure you want to delete this class log entry?\n\nDate: ${deleteModalConfig?.date}\nClass: ${deleteModalConfig?.className}\nSubject: ${deleteModalConfig?.subjectName}\n\nThis action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteModalConfig(null)}
      />
    </div>
  );
};

export default SyllabusProgressReport;
