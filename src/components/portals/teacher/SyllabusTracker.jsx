// src/components/portals/teacher/SyllabusTracker.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';
import { CARD_THEMES } from '../../../utils/cardTheme';
import ConfirmModal from '../../ConfirmModal';

// Global/Module-level cache to keep reference data, favorites, and entries across mounts
let syllabusTrackerCache = {
  userId: null,
  teacher: null,
  classes: [],
  subjects: [],
  assignments: [],
  books: [],
  classifications: [],
  favorites: [],
  selectedProgressClassId: '',
  myWorkEntries: null,
  bookTrackers: {}, // class_id -> array of book trackers
  myBooksData: null,
  bookClasses: [],
  classLogs: {},
  classLessons: {},
  allLogs: [],
  allLessons: [],
  todaysPlans: [],
  loadingPromise: null,
};

import MultiSelectDropdown from '../syllabus-shared/MultiSelectDropdown';
import SyllabusProgressGrid from '../syllabus-shared/SyllabusProgressGrid';
import DailyActivityTable from '../syllabus-shared/DailyActivityTable';
import SyllabusAddWorkModal from './components/SyllabusAddWorkModal';

const SyllabusTracker = ({ user, teacherRecord }) => {
  const isCacheValid = syllabusTrackerCache.userId === user?.id;

  const [loading, setLoading] = useState(() => !isCacheValid || !syllabusTrackerCache.teacher);
  const [submitting, setSubmitting] = useState(false);
  const [teacher, setTeacher] = useState(() =>
    isCacheValid ? syllabusTrackerCache.teacher : teacherRecord || null
  );

  // Reference data
  const [classes, setClasses] = useState(() => (isCacheValid ? syllabusTrackerCache.classes : []));
  const [subjects, setSubjects] = useState(() =>
    isCacheValid ? syllabusTrackerCache.subjects : []
  );
  const [assignments, setAssignments] = useState(() =>
    isCacheValid ? syllabusTrackerCache.assignments : []
  );
  const [books, setBooks] = useState(() => (isCacheValid ? syllabusTrackerCache.books : []));
  const [classifications, setClassifications] = useState(() =>
    isCacheValid ? syllabusTrackerCache.classifications : []
  );
  const [bookClasses, setBookClasses] = useState(() =>
    isCacheValid ? syllabusTrackerCache.bookClasses : []
  );

  // Favorites (DB-backed via teacher_cache)
  const [favorites, setFavorites] = useState(() =>
    isCacheValid ? syllabusTrackerCache.favorites : []
  );

  // UI state
  const [coverMode, setCoverMode] = useState(false);
  const [activeTab, setActiveTab] = useState('teacher-activity');

  // My Work tab — teacher's log entries
  const [myWorkEntries, setMyWorkEntries] = useState(() =>
    isCacheValid && syllabusTrackerCache.myWorkEntries ? syllabusTrackerCache.myWorkEntries : []
  );
  const [myWorkLoading, setMyWorkLoading] = useState(false);
  const isFetchingMyWorkRef = useRef(false);
  const initialLoadRef = useRef(false);

  const getLocalDateStr = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDefaultEndDateStr = () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 28);
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [timeFilter, setTimeFilter] = useState('7_days'); // '7_days' | '30_days' | 'range'
  const [dateRange, setDateRange] = useState(() => ({
    start: getLocalDateStr(7),
    end: getLocalDateStr(0),
  }));

  // ─── Tab 2: Syllabus Progress States ───
  const [cpFilterClasses, setCpFilterClasses] = useState([]);
  const [cpFilterBooks, setCpFilterBooks] = useState([]);
  const [cpFilterClassifications, setCpFilterClassifications] = useState([]);
  const [cpGroupingMode, setCpGroupingMode] = useState('none'); // 'classification' | 'subject' | 'none'

  // Upcoming Lessons States
  const [lessonPlans, setLessonPlans] = useState([]);
  const [upcomingGroupingMode, setUpcomingGroupingMode] = useState('subject_date');
  const [upFilterTeachers, setUpFilterTeachers] = useState(() =>
    teacherRecord?.id ? [String(teacherRecord.id)] : teacher?.id ? [String(teacher.id)] : []
  );
  const [upFilterClasses, setUpFilterClasses] = useState([]);
  const [upFilterSubjects, setUpFilterSubjects] = useState([]);
  const [upcomingStartDate, setUpcomingStartDate] = useState(() => getLocalDateStr(0));
  const [upcomingEndDate, setUpcomingEndDate] = useState(() => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 28);
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [isUpDatePopoverOpen, setIsUpDatePopoverOpen] = useState(false);

  const [allTrackers, setAllTrackers] = useState(() =>
    isCacheValid ? syllabusTrackerCache.allTrackers || [] : []
  );
  const [allLogs, setAllLogs] = useState(() =>
    isCacheValid ? syllabusTrackerCache.allLogs || [] : []
  );
  const [allLessons, setAllLessons] = useState(() =>
    isCacheValid ? syllabusTrackerCache.allLessons || [] : []
  );
  const [todaysPlans, setTodaysPlans] = useState(() =>
    isCacheValid ? syllabusTrackerCache.todaysPlans || [] : []
  );

  const [progressExpandedBook, setProgressExpandedBook] = useState(null);
  const [progressExpandedClass, setProgressExpandedClass] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [progressBookLessons, setProgressBookLessons] = useState([]);
  const [progressBookLogs, setProgressBookLogs] = useState([]);
  const [showNotStarted, setShowNotStarted] = useState(false);

  const [expandedLogIds, setExpandedLogIds] = useState({});
  const [logItemsMap, setLogItemsMap] = useState({});
  const [deleteModalConfig, setDeleteModalConfig] = useState(null);

  // Add Work modal state
  const [isAddWorkModalOpen, setIsAddWorkModalOpen] = useState(false);
  const [plannedLessonToLog, setPlannedLessonToLog] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // ─── Favorites DB Helpers ───

  const loadFavoritesFromDB = async (teacherId) => {
    try {
      const { data, error } = await supabase
        .from('teacher_cache')
        .select('cache_data')
        .eq('teacher_id', teacherId)
        .maybeSingle();
      if (error) throw error;
      if (data?.cache_data?.favorites) {
        return Object.entries(data.cache_data.favorites).map(([key, val]) => ({ key, ...val }));
      }
      return [];
    } catch (err) {
      console.warn('Failed to load favorites from DB:', err.message);
      return [];
    }
  };

  const saveFavoritesToDB = async (teacherId, favsArray) => {
    try {
      const favsObj = {};
      favsArray.forEach((fav) => {
        const key = fav.key || `${fav.className} - ${fav.bookName}`;
        favsObj[key] = {
          classId: fav.classId,
          classificationId: fav.classificationId || '',
          subjectId: fav.subjectId,
          bookId: fav.bookId,
          className: fav.className,
          subjectName: fav.subjectName,
          bookName: fav.bookName,
        };
      });
      const { error } = await supabase.from('teacher_cache').upsert(
        {
          teacher_id: teacherId,
          cache_data: { favorites: favsObj },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'teacher_id' }
      );
      if (error) throw error;
    } catch (err) {
      console.warn('Failed to save favorites to DB:', err.message);
    }
  };

  const migrateLocalStorageFavorites = async (teacherId) => {
    try {
      const localKey = `jzv_syllabus_favorites_${teacherId}`;
      const raw = localStorage.getItem(localKey);
      if (!raw) return null;
      const localFavs = JSON.parse(raw);
      if (!Array.isArray(localFavs) || localFavs.length === 0) return null;
      const migrated = localFavs.map((fav) => ({
        key: `${fav.className} - ${fav.bookName}`,
        classId: fav.classId,
        classificationId: fav.classificationId || '',
        subjectId: fav.subjectId,
        bookId: fav.bookId,
        className: fav.className,
        subjectName: fav.subjectName,
        bookName: fav.bookName,
      }));
      await saveFavoritesToDB(teacherId, migrated);
      localStorage.removeItem(localKey);
      return migrated;
    } catch (e) {
      console.warn('Favorites migration failed:', e);
      return null;
    }
  };

  // ─── Data Loading ───

  useEffect(() => {
    const initData = async () => {
      if (!user || !user.id) return;

      const isCacheValid = syllabusTrackerCache.userId === user.id && syllabusTrackerCache.teacher;

      if (isCacheValid) {
        // Cache is fully valid, set local states
        setTeacher(syllabusTrackerCache.teacher);
        setUpFilterTeachers([String(syllabusTrackerCache.teacher.id)]);
        setClasses(syllabusTrackerCache.classes);
        setSubjects(syllabusTrackerCache.subjects);
        setAssignments(syllabusTrackerCache.assignments);
        setBooks(syllabusTrackerCache.books);
        setClassifications(syllabusTrackerCache.classifications);
        setBookClasses(syllabusTrackerCache.bookClasses);
        setAllLessons(syllabusTrackerCache.allLessons);
        setAllLogs(syllabusTrackerCache.allLogs);
        setLessonPlans(syllabusTrackerCache.todaysPlans);
        setFavorites(syllabusTrackerCache.favorites);
        setLoading(false);
        return;
      }

      // If a fetch is already in progress for this user, wait for it
      if (syllabusTrackerCache.loadingPromise && syllabusTrackerCache.userId === user.id) {
        setLoading(true);
        try {
          const cache = await syllabusTrackerCache.loadingPromise;
          setTeacher(cache.teacher);
          setUpFilterTeachers([String(cache.teacher.id)]);
          setClasses(cache.classes);
          setSubjects(cache.subjects);
          setAssignments(cache.assignments);
          setBooks(cache.books);
          setClassifications(cache.classifications);
          setBookClasses(cache.bookClasses);
          setAllLessons(cache.allLessons);
          setAllLogs(cache.allLogs);
          setLessonPlans(cache.todaysPlans);
          setFavorites(cache.favorites);
        } catch (err) {
          console.warn('SyllabusTracker coalesced load failed:', err.message);
          loadLocalFallback();
        } finally {
          setLoading(false);
        }
        return;
      }

      // Clear cache for new user
      if (syllabusTrackerCache.userId !== user.id) {
        syllabusTrackerCache = {
          userId: user.id,
          teacher: null,
          classes: [],
          subjects: [],
          assignments: [],
          books: [],
          classifications: [],
          favorites: [],
          selectedProgressClassId: '',
          myWorkEntries: null,
          bookTrackers: {},
          myBooksData: null,
          bookClasses: [],
          classLogs: {},
          classLessons: {},
          allTrackers: [],
          allLogs: [],
          allLessons: [],
          todaysPlans: [],
          loadingPromise: null,
        };
        setLoading(true);
        setTeacher(null);
        setClasses([]);
        setSubjects([]);
        setAssignments([]);
        setBooks([]);
        setClassifications([]);
        setFavorites([]);
        setSelectedProgressClassId('');
        setBookTrackers([]);
        setMyWorkEntries([]);
        setMyBooksData([]);
        setBookClasses([]);
      }

      const fetchPromise = (async () => {
        let teacherData = teacherRecord;
        if (!teacherData) {
          const { data, error: teachErr } = await supabase
            .from('teachers')
            .select('*')
            .eq('auth_id', user.id)
            .maybeSingle();
          if (teachErr) throw teachErr;
          teacherData = data;
        }
        if (!teacherData) throw new Error('User not mapped to Teacher record.');

        const [
          { data: dbClasses },
          { data: dbSubjects },
          { data: dbAssignments },
          { data: dbBooks },
          { data: dbClassifications },
          { data: dbBookClasses },
          { data: dbAllLessons },
          { data: dbPlans },
        ] = await Promise.all([
          supabase.from('classes').select('*'),
          supabase.from('subjects').select('*'),
          supabase.from('class_assignments').select('*').eq('teacher_id', teacherData.id),
          supabase.from('syllabus_books').select('*'),
          supabase.from('subject_classifications').select('*'),
          supabase.from('syllabus_book_classes').select('*'),
          supabase.from('syllabus_book_lessons').select('*'),
          supabase
            .from('lesson_progress')
            .select(
              '*, lesson:syllabus_book_lessons(*), class:classes(*), subject:subjects(*), book:syllabus_books(*)'
            )
            .in('status', ['planned', 'in_progress']),
        ]);

        const fetchedClasses = dbClasses || [];
        const fetchedSubjects = dbSubjects || [];
        const fetchedAssignments = dbAssignments || [];
        const fetchedBooks = dbBooks || [];
        const fetchedClassifications = dbClassifications || [];
        const fetchedBookClasses = dbBookClasses || [];
        const fetchedAllLessons = dbAllLessons || [];
        const fetchedPlans = dbPlans || [];

        // Fetch logs for teacher's active classes
        const assignedClassIds = fetchedAssignments.map((a) => String(a.class_id));
        const { data: dbAllLogs } =
          assignedClassIds.length > 0
            ? await supabase
                .from('lesson_progress')
                .select(
                  'id, lesson_id, class_id, status, completion_percentage, revision_counter, start_date, end_date, days_taken, updated_at'
                )
                .in('class_id', assignedClassIds)
            : { data: [] };

        const mappedAllLogs = (dbAllLogs || []).map((log) => ({
          ...log,
          current_status: log.status,
        }));

        let dbFavs = await loadFavoritesFromDB(teacherData.id);
        if (dbFavs.length === 0) {
          const migrated = await migrateLocalStorageFavorites(teacherData.id);
          if (migrated) dbFavs = migrated;
        }

        const todayStr = getLocalDateStr(0);
        const activePlans = fetchedPlans.filter(
          (p) => p.status === 'planned' && (p.target_start_date === null || p.target_start_date <= todayStr)
        );

        return {
          teacher: teacherData,
          classes: fetchedClasses,
          subjects: fetchedSubjects,
          assignments: fetchedAssignments,
          books: fetchedBooks,
          classifications: fetchedClassifications,
          bookClasses: fetchedBookClasses,
          allLessons: fetchedAllLessons,
          allLogs: mappedAllLogs,
          todaysPlans: activePlans,
          favorites: dbFavs,
        };
      })();

      syllabusTrackerCache.loadingPromise = fetchPromise;

      try {
        const cacheData = await fetchPromise;
        syllabusTrackerCache.teacher = cacheData.teacher;
        syllabusTrackerCache.classes = cacheData.classes;
        syllabusTrackerCache.subjects = cacheData.subjects;
        syllabusTrackerCache.assignments = cacheData.assignments;
        syllabusTrackerCache.books = cacheData.books;
        syllabusTrackerCache.classifications = cacheData.classifications;
        syllabusTrackerCache.bookClasses = cacheData.bookClasses;
        syllabusTrackerCache.allLessons = cacheData.allLessons;
        syllabusTrackerCache.allLogs = cacheData.allLogs;
        syllabusTrackerCache.todaysPlans = cacheData.todaysPlans;
        syllabusTrackerCache.favorites = cacheData.favorites;

        setTeacher(cacheData.teacher);
        setUpFilterTeachers([String(cacheData.teacher.id)]);
        setClasses(cacheData.classes);
        setSubjects(cacheData.subjects);
        setAssignments(cacheData.assignments);
        setBooks(cacheData.books);
        setClassifications(cacheData.classifications);
        setBookClasses(cacheData.bookClasses);
        setAllLessons(cacheData.allLessons);
        setAllLogs(cacheData.allLogs);
        setLessonPlans(cacheData.todaysPlans);
        setFavorites(cacheData.favorites);
      } catch (err) {
        console.warn('SyllabusTracker init failed:', err.message);
        syllabusTrackerCache.loadingPromise = null;
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
          syllabusTrackerCache.books = parsed.books || [];
          syllabusTrackerCache.subjects = parsed.subjects || [];
        } catch (e) {}
      }
      const rawTimetable = localStorage.getItem('jzv_timetable_local_data');
      if (rawTimetable) {
        try {
          const parsed = JSON.parse(rawTimetable);
          setClasses(parsed.classes || []);
          setClassifications(parsed.classifications || []);
          syllabusTrackerCache.classes = parsed.classes || [];
          syllabusTrackerCache.classifications = parsed.classifications || [];
          const matchedTeacher = (parsed.teachers || []).find(
            (t) => String(t.auth_id) === String(user?.id) || String(t.id) === String(user?.id)
          );
          if (matchedTeacher) {
            setTeacher(matchedTeacher);
            syllabusTrackerCache.teacher = matchedTeacher;
            const localAssignments = (parsed.assignments || []).filter(
              (a) => String(a.teacher_id) === String(matchedTeacher.id)
            );
            setAssignments(localAssignments);
            syllabusTrackerCache.assignments = localAssignments;
          }
        } catch (e) {}
      }
      const rawBC = localStorage.getItem('jzv_syllabus_book_classes');
      if (rawBC) {
        try {
          const parsedBC = JSON.parse(rawBC);
          setBookClasses(parsedBC);
          syllabusTrackerCache.bookClasses = parsedBC;
        } catch (e) {}
      }
    };

    initData();
  }, [user, teacherRecord]);

  // ─── My Work: Fetch teacher's log entries ───

  const fetchMyWorkEntries = useCallback(async () => {
    if (!teacher?.id) return;
    if (isFetchingMyWorkRef.current) return;
    isFetchingMyWorkRef.current = true;

    setMyWorkLoading(true);
    try {
      // Determine date boundaries
      let startBound = null;
      let endBound = null;

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
        setMyWorkEntries([]);
        setMyWorkLoading(false);
        isFetchingMyWorkRef.current = false;
        return;
      }

      let query = supabase
        .from('lesson_progress_items')
        .select(
          `
          *,
          teacher:teachers(name),
          log:lesson_progress(
            *,
            lesson:syllabus_book_lessons(*)
          )
        `
        )
        .eq('teacher_id', teacher.id);

      if (startBound && endBound) {
        query = query.gte('date', startBound).lte('date', endBound);
      }

      const { data: items, error } = await query.order('date', { ascending: false }).limit(200);

      if (error) throw error;

      if (!items || items.length === 0) {
        setMyWorkEntries([]);
        syllabusTrackerCache.myWorkEntries = [];
        return;
      }

      // Build enriched entries using nested query result
      const enriched = items.map((item) => {
        const log = item.log;
        const lesson = log ? log.lesson : null;
        const book = lesson ? books.find((b) => String(b.id) === String(lesson.book_id)) : null;
        const subject = book
          ? subjects.find((s) => String(s.id) === String(book.subject_id))
          : null;
        const cls = log ? classes.find((c) => String(c.id) === String(log.class_id)) : null;

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

      setMyWorkEntries(enriched);
      syllabusTrackerCache.myWorkEntries = enriched;
    } catch (err) {
      console.warn('Failed to fetch my work entries:', err.message);
      if (!syllabusTrackerCache.myWorkEntries) {
        setMyWorkEntries([]);
      }
    } finally {
      setMyWorkLoading(false);
      isFetchingMyWorkRef.current = false;
    }
  }, [teacher?.id, timeFilter, dateRange.start, dateRange.end, books, subjects, classes]);

  useEffect(() => {
    if (teacher?.id && books.length > 0 && subjects.length > 0 && classes.length > 0) {
      fetchMyWorkEntries();
    }
  }, [
    teacher?.id,
    books.length,
    subjects.length,
    classes.length,
    timeFilter,
    dateRange.start,
    dateRange.end,
    fetchMyWorkEntries,
  ]);

  const fetchTeacherProgressData = async (overrideCoverMode = null) => {
    setProgressLoading(true);
    try {
      const isCover = overrideCoverMode !== null ? overrideCoverMode : coverMode;
      const progressClasses =
        isCover || assignments.length === 0
          ? classes
          : classes.filter((c) => assignments.some((a) => String(a.class_id) === String(c.id)));
      const classIds = progressClasses.map((c) => c.id);

      if (classIds.length === 0) {
        setAllTrackers([]);
        setAllLogs([]);
        setAllLessons([]);
        setProgressLoading(false);
        return;
      }

      const bookIds = bookClasses
        .filter((bc) => classIds.includes(bc.class_id))
        .map((bc) => bc.book_id);

      const [trackerRes, logsRes] = await Promise.all([
        supabase.from('book_tracker').select('*').in('class_id', classIds),
        supabase
          .from('lesson_progress')
          .select(
            'id, lesson_id, class_id, status, completion_percentage, revision_counter, start_date, end_date, days_taken, updated_at'
          )
          .in('class_id', classIds),
      ]);

      if (trackerRes.error) throw trackerRes.error;
      if (logsRes.error) throw logsRes.error;

      const mappedLogs = (logsRes.data || []).map((log) => ({
        ...log,
        current_status: log.status,
      }));

      setAllTrackers(trackerRes.data || []);
      setAllLogs(mappedLogs);

      syllabusTrackerCache.allTrackers = trackerRes.data || [];
      syllabusTrackerCache.allLogs = mappedLogs;
    } catch (err) {
      console.warn('Failed to fetch teacher progress data:', err.message);
    } finally {
      setProgressLoading(false);
    }
  };

  const handleTabChange = async (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'teacher-activity') {
      await fetchMyWorkEntries();
    } else if (tabKey === 'class-progress') {
      await fetchTeacherProgressData();
      setProgressExpandedBook(null);
      setProgressExpandedClass(null);
    }
  };

  const handleCoverModeChange = async (checked) => {
    setCoverMode(checked);
    if (activeTab === 'teacher-activity') {
      await fetchMyWorkEntries();
    } else if (activeTab === 'class-progress') {
      await fetchTeacherProgressData(checked);
      setProgressExpandedBook(null);
      setProgressExpandedClass(null);
    }
  };

  // ─── Refresh after Add Work ───

  const handleAddWorkSuccess = async () => {
    if (activeTab === 'teacher-activity') {
      await fetchMyWorkEntries();
    } else if (activeTab === 'class-progress') {
      await fetchTeacherProgressData();
    }
  };

  const isCreatedToday = (createdAtStr) => {
    if (!createdAtStr) return false;
    try {
      const entryDate = new Date(createdAtStr).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      return entryDate === today;
    } catch (e) {
      return false;
    }
  };

  const handleDeleteClick = (entry, parentLog = null, lesson = null, book = null) => {
    let className = '—';
    if (entry.class?.name || entry.class?.class_name) {
      className = entry.class.name || entry.class.class_name;
    } else if (parentLog) {
      const cls = classes.find((c) => String(c.id) === String(parentLog.class_id));
      className = cls?.name || `Class ID ${parentLog.class_id}`;
    }

    let subjectName = '—';
    if (entry.subject?.name) {
      subjectName = entry.subject.name;
    } else if (book) {
      const sub = subjects.find((s) => String(s.id) === String(book.subject_id));
      subjectName = sub?.name || '—';
    } else if (lesson) {
      const b = books.find((x) => String(x.id) === String(lesson.book_id));
      const sub = b ? subjects.find((s) => String(s.id) === String(b.subject_id)) : null;
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
    setMyWorkLoading(true);
    try {
      const { error } = await supabase
        .from('lesson_progress_items')
        .delete()
        .eq('id', deleteModalConfig.id);
      if (error) throw error;

      showToast('Log entry deleted successfully!', 'success');

      setMyWorkEntries((prev) => prev.filter((item) => item.id !== deleteModalConfig.id));
      if (syllabusTrackerCache.myWorkEntries) {
        syllabusTrackerCache.myWorkEntries = syllabusTrackerCache.myWorkEntries.filter(
          (item) => item.id !== deleteModalConfig.id
        );
      }

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
      if (activeTab === 'teacher-activity') {
        await fetchMyWorkEntries();
      } else if (activeTab === 'class-progress') {
        await fetchTeacherProgressData();
      }
    } catch (err) {
      showToast('Error deleting log entry: ' + err.message, 'error');
    } finally {
      setMyWorkLoading(false);
    }
  };

  // ─── Syllabus Progress Tab Logic ───

  const handleProgressBookClick = async (bookId, classId) => {
    if (progressExpandedBook === bookId && String(progressExpandedClass) === String(classId)) {
      setProgressExpandedBook(null);
      setProgressExpandedClass(null);
      return;
    }
    setProgressExpandedBook(bookId);
    setProgressExpandedClass(classId);
    setDetailsLoading(true);
    setShowNotStarted(false);
    setExpandedLogIds({});
    try {
      const [{ data: lessons, error: lessErr }, { data: logs, error: logErr }] = await Promise.all([
        supabase.from('syllabus_book_lessons').select('*').eq('book_id', bookId),
        supabase
          .from('lesson_progress')
          .select(
            'id, lesson_id, class_id, status, completion_percentage, revision_counter, start_date, end_date, days_taken, updated_at'
          )
          .eq('class_id', classId),
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

      const mappedLogs = (logs || []).map((log) => ({
        ...log,
        current_status: log.status,
      }));

      const relevantLogs = mappedLogs.filter((l) =>
        bookLessons.some((bl) => String(bl.id) === String(l.lesson_id))
      );

      setProgressBookLessons(bookLessons);
      setProgressBookLogs(relevantLogs);
    } catch (err) {
      console.warn('Progress book expand failed:', err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleLogExpand = async (logId) => {
    setExpandedLogIds((prev) => ({ ...prev, [logId]: !prev[logId] }));
    if (!logItemsMap[logId]) {
      try {
        const { data, error } = await supabase
          .from('lesson_progress_items')
          .select('*, teacher:teachers(name)')
          .eq('progress_id', logId)
          .order('date', { ascending: false });
        if (error) throw error;
        setLogItemsMap((prev) => ({ ...prev, [logId]: data || [] }));
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
        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
          Completed
        </span>
      );
    if (status === 'in_progress')
      return (
        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
          In Progress
        </span>
      );
    return (
      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold">
        Not Started
      </span>
    );
  };

  const handleSubmitPlannedLesson = (plan) => {
    setPlannedLessonToLog(plan);
    setIsAddWorkModalOpen(true);
  };

  const handleCarryForward = async (plan) => {
    try {
      setMyWorkLoading(true);
      // Increment carry_forward_count, and push target_start_date to tomorrow (or if it's weekly, just increment week)
      let updateData = { carry_forward_count: (plan.carry_forward_count || 0) + 1 };
      if (plan.target_start_date) {
        const d = new Date(plan.target_start_date);
        d.setDate(d.getDate() + 1);
        if (d.getDay() === 0) d.setDate(d.getDate() + 1); // skip sunday
        updateData.target_start_date = d.toISOString().split('T')[0];
        if (plan.target_end_date) {
          const dEnd = new Date(plan.target_end_date);
          dEnd.setDate(dEnd.getDate() + 1);
          if (dEnd.getDay() === 0) dEnd.setDate(dEnd.getDate() + 1);
          updateData.target_end_date = dEnd.toISOString().split('T')[0];
        }
      } else if (plan.academic_week) {
        updateData.academic_week = plan.academic_week + 1;
      }

      const { data, error } = await supabase
        .from('lesson_progress')
        .update(updateData)
        .eq('id', plan.id)
        .select(
          '*, lesson:syllabus_book_lessons(*), class:classes(*), subject:subjects(*), book:syllabus_books(*)'
        );
      if (error) throw error;

      if (plan.target_start_date) {
        try {
          await supabase.from('lesson_plan_carry_forwards').insert([
            {
              plan_id: plan.id,
              teacher_id: teacher?.id,
              original_date: plan.target_start_date,
              new_date: updateData.target_start_date,
            },
          ]);
        } catch (cfErr) {
          console.warn('Carry forward log insert skipped or failed:', cfErr.message);
        }
      }

      showToast('Lesson carried forward', 'success');

      const newPlans = todaysPlans.filter((p) => p.id !== plan.id);
      setTodaysPlans(newPlans);
      syllabusTrackerCache.todaysPlans = newPlans;
    } catch (e) {
      showToast('Failed to carry forward: ' + e.message, 'error');
    } finally {
      setMyWorkLoading(false);
    }
  };

  const renderPlannedForToday = () => {
    if (!todaysPlans || todaysPlans.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className="text-sm font-black text-dark-primary mb-4 flex items-center gap-2">
          <i className="fas fa-calendar-check text-brand-primary"></i> Planned for Today
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {todaysPlans.map((plan) => {
            const title = [plan.lesson?.level1, plan.lesson?.level2, plan.lesson?.level3]
              .filter(Boolean)
              .join(' > ');
            return (
              <div
                key={plan.id}
                className="bg-white border border-brand-primary/20 rounded-xl p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-extrabold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full uppercase">
                      {plan.class?.name || plan.class?.class_name}
                    </span>
                    {plan.carry_forward_count > 0 && (
                      <span
                        className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full"
                        title="Carried Forward"
                      >
                        CF x{plan.carry_forward_count}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-dark-primary mb-1 line-clamp-2">{title}</h4>
                  <p className="text-[11px] text-gray-500 font-semibold mb-3">
                    {plan.subject?.name} • {plan.book?.name}
                  </p>
                </div>
                <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleSubmitPlannedLesson(plan)}
                    className="flex-1 py-1.5 bg-brand-primary text-white text-[10px] font-bold rounded-lg hover:bg-brand-primary/90 transition-colors cursor-pointer"
                  >
                    <i className="fas fa-check mr-1"></i> Submit Log
                  </button>
                  <button
                    onClick={() => handleCarryForward(plan)}
                    className="flex-1 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
                  >
                    <i className="fas fa-forward mr-1"></i> Carry Forward
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ————————————————————————————————————————————————— Loading State ——————————————————————————————————————————————————

  if (loading) {
    return (
      <div className="p-8 text-center bg-light-bg min-h-screen flex items-center justify-center font-bold text-dark-primary">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mr-3"></div>
        Loading Tracker...
      </div>
    );
  }

  const renderUpcomingLessons = () => {
    const upcoming = lessonPlans.filter((p) => {
      // Date boundary
      if (!p.target_date || p.target_date < upcomingStartDate || p.target_date > upcomingEndDate) {
        return false;
      }
      // Status planned or in_progress
      if (p.status !== 'planned' && p.status !== 'in_progress') {
        return false;
      }
      
      // Filter by teacher (always the logged in teacher)
      if (upFilterTeachers.length > 0 && !upFilterTeachers.includes(String(p.teacher_id))) {
        return false;
      }
      // Filter by class
      if (upFilterClasses.length > 0 && !upFilterClasses.includes(String(p.class_id))) {
        return false;
      }
      // Filter by subject
      if (upFilterSubjects.length > 0 && !upFilterSubjects.includes(String(p.subject_id))) {
        return false;
      }

      return true;
    });

    const teacherClassIds = assignments.map((a) => String(a.class_id));
    const teacherSubjectIds = assignments.map((a) => String(a.subject_id));
    
    const assignedClassOpts = classes
      .filter((c) => teacherClassIds.includes(String(c.id)))
      .map((c) => ({ id: String(c.id), label: c.name || c.class_name }));

    const assignedSubjectOpts = subjects
      .filter((s) => teacherSubjectIds.includes(String(s.id)))
      .map((s) => ({ id: String(s.id), label: s.name }));

    const teacherOpts = teacher
      ? [{ id: String(teacher.id), label: teacher.name }]
      : [];

    const renderCard = (plan) => {
      const title = [plan.lesson?.level1, plan.lesson?.level2, plan.lesson?.level3]
        .filter(Boolean)
        .join(' > ');

      const classificationId = plan.subject?.classification_id;
      const classification = classifications.find(
        (c) => String(c.id) === String(classificationId)
      );
      const themeStyles =
        classification?.theme && CARD_THEMES[classification.theme]
          ? CARD_THEMES[classification.theme]
          : CARD_THEMES.charcoal;

      return (
        <div
          key={plan.id}
          className={`bg-white border border-light-border border-l-[6px] rounded-xl p-4 shadow-sm flex flex-col justify-between border-l-${themeStyles.color} text-left`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {new Date(plan.target_date).toLocaleDateString()}
            </span>
            <div className="flex gap-1">
              {plan.status === 'in_progress' && (
                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                  In Progress
                </span>
              )}
              {plan.carry_forward_count > 0 && (
                <span className="text-[10px] text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded">
                  Delayed
                </span>
              )}
            </div>
          </div>
          <h4 className="font-bold text-sm text-dark-primary mb-1 line-clamp-2" title={title}>
            {title}
          </h4>
          <p className="text-[11px] text-gray-500 font-semibold mt-1">
            {plan.class?.name || plan.class?.class_name || '—'} • {plan.subject?.name} • {plan.book?.name}
          </p>
        </div>
      );
    };

    const defaultEndDateStr = (() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 28);
      const year = futureDate.getFullYear();
      const month = String(futureDate.getMonth() + 1).padStart(2, '0');
      const day = String(futureDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();

    const hasActiveFilters = 
      upFilterClasses.length > 0 || 
      upFilterSubjects.length > 0 || 
      upcomingStartDate !== getLocalDateStr(0) || 
      upcomingEndDate !== defaultEndDateStr;

    return (
      <div className="space-y-6">
        {upcoming.length === 0 ? (
          <div className="text-center py-12 bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
            No upcoming lessons planned matching your filters.
          </div>
        ) : upcomingGroupingMode === 'subject_date' ? (
          // Group by Subject and sort by date ascending
          (() => {
            const sortedPlans = [...upcoming].sort((a, b) => a.target_date.localeCompare(b.target_date));
            const grouped = {};
            sortedPlans.forEach((plan) => {
              const key = plan.subject?.name || 'Other / General';
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(plan);
            });
            const sortedSubjs = Object.keys(grouped).sort();

            return (
              <div className="space-y-8 text-left">
                {sortedSubjs.map((subjName) => (
                  <div key={subjName} className="space-y-4">
                    <h3 className="text-sm font-black text-dark-soft border-l-[3px] border-brand-primary pl-2 uppercase tracking-wider">
                      {subjName}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {grouped[subjName].map((plan) => renderCard(plan))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          // Group by Date and sort by subject name
          (() => {
            const sortedPlans = [...upcoming].sort((a, b) => {
              const nameA = a.subject?.name || '';
              const nameB = b.subject?.name || '';
              return nameA.localeCompare(nameB);
            });
            const grouped = {};
            sortedPlans.forEach((plan) => {
              const key = plan.target_date;
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(plan);
            });
            const sortedDates = Object.keys(grouped).sort();

            return (
              <div className="space-y-8 text-left">
                {sortedDates.map((dateKey) => {
                  const dateDisplay = new Date(dateKey).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                  return (
                    <div key={dateKey} className="space-y-4">
                      <h3 className="text-sm font-black text-dark-soft border-l-[3px] border-brand-primary pl-2 uppercase tracking-wider">
                        {dateDisplay}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {grouped[dateKey].map((plan) => renderCard(plan))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>
    );
  };

  // ———————————————————————————————— Main Render ——————————————————————————————————————————————————
  const progressClasses =
    coverMode || assignments.length === 0
      ? classes
      : classes.filter((c) => assignments.some((a) => String(a.class_id) === String(c.id)));

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-light-bg font-sans">
      {/* Tab Content */}
      <div className="p-6 overflow-y-auto pb-24">
        <div className="flex justify-between items-center gap-4 border-b mb-6 pb-2">
          <div className="flex gap-4">
            {[
              { key: 'teacher-activity', label: 'My Activity', icon: 'fa-list-check' },
              { key: 'class-progress', label: 'Syllabus Progress', icon: 'fa-chart-pie' },
              { key: 'upcoming-lessons', label: 'Upcoming Lessons', icon: 'fa-calendar-alt' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-brand-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border'
                }`}
              >
                <i className={`fas ${tab.icon} text-xs`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'upcoming-lessons' && (
            <div className="flex bg-gray-100 p-0.5 rounded-lg border h-8 items-center gap-0.5 select-none ml-auto">
              {[
                { key: 'subject_date', icon: 'fa-book', tooltip: 'Group by Subject, Sort by Date' },
                { key: 'date_subject', icon: 'fa-calendar-alt', tooltip: 'Group by Date, Sort by Subject' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setUpcomingGroupingMode(t.key)}
                  title={t.tooltip}
                  aria-label={t.tooltip}
                  className={`w-8 h-7 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    upcomingGroupingMode === t.key
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                  }`}
                >
                  <i className={`fas ${t.icon} text-xs`}></i>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'teacher-activity' && (
            <div className="flex items-center gap-3 flex-wrap ml-auto">
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
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all h-full cursor-pointer flex items-center ${
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
                    className="border rounded-lg px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-brand-primary h-7 bg-white"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="border rounded-lg px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-brand-primary h-7 bg-white"
                  />
                </div>
              )}

              <button
                onClick={() => setIsAddWorkModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer h-8"
              >
                <i className="fas fa-plus"></i> Add Work
              </button>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-xl cursor-pointer text-xs font-bold text-brand-primary select-none hover:bg-brand-primary/15 transition-colors h-8">
                <input
                  type="checkbox"
                  checked={coverMode}
                  onChange={(e) => handleCoverModeChange(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                />
                Cover for Absent Teacher
              </label>
            </div>
          )}

          {activeTab === 'class-progress' && (
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <div className="flex bg-gray-100 p-0.5 rounded-lg items-center border h-7 select-none">
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
            </div>
          )}
        </div>

        {/* Dedicated Responsive Filters sub-bar */}
        {activeTab === 'class-progress' && (
          <div className="bg-white border rounded-2xl shadow-sm p-4 text-left flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filters:</span>
            </div>
            <div className="min-w-[140px] flex-1 sm:flex-initial">
              <MultiSelectDropdown
                label=""
                placeholder="Class Filter"
                options={progressClasses.map((c) => ({
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
            </div>
            <div className="min-w-[140px] flex-1 sm:flex-initial">
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
            </div>
            <div className="min-w-[140px] flex-1 sm:flex-initial">
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
            </div>
            {(cpFilterClasses.length > 0 || cpFilterBooks.length > 0 || cpFilterClassifications.length > 0) && (
              <button
                onClick={() => {
                  setCpFilterClasses([]);
                  setCpFilterBooks([]);
                  setCpFilterClassifications([]);
                  setProgressExpandedBook(null);
                  setProgressExpandedClass(null);
                }}
                className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors h-8"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {activeTab === 'upcoming-lessons' && (
          <div className="bg-white border rounded-2xl shadow-sm p-4 text-left flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filters:</span>
            </div>
            {(() => {
              const teacherClassIds = assignments.map((a) => String(a.class_id));
              const teacherSubjectIds = assignments.map((a) => String(a.subject_id));
              
              const assignedClassOpts = classes
                .filter((c) => teacherClassIds.includes(String(c.id)))
                .map((c) => ({ id: String(c.id), label: c.name || c.class_name }));

              const assignedSubjectOpts = subjects
                .filter((s) => teacherSubjectIds.includes(String(s.id)))
                .map((s) => ({ id: String(s.id), label: s.name }));

              const teacherOpts = teacher
                ? [{ id: String(teacher.id), label: teacher.name }]
                : [];

              const hasActiveFilters = 
                upFilterClasses.length > 0 || 
                upFilterSubjects.length > 0 || 
                upcomingStartDate !== getLocalDateStr(0) || 
                upcomingEndDate !== getDefaultEndDateStr();

              return (
                <>
                  <div className="min-w-[140px] flex-1 sm:flex-initial">
                    <MultiSelectDropdown
                      label=""
                      placeholder="Teacher"
                      options={teacherOpts}
                      selected={upFilterTeachers}
                      onChange={() => {}} // Read-only for teachers
                      disabled={true}
                    />
                  </div>

                  <div className="min-w-[140px] flex-1 sm:flex-initial">
                    <MultiSelectDropdown
                      label=""
                      placeholder="Class Filter"
                      options={assignedClassOpts}
                      selected={upFilterClasses}
                      onChange={setUpFilterClasses}
                    />
                  </div>

                  <div className="min-w-[140px] flex-1 sm:flex-initial">
                    <MultiSelectDropdown
                      label=""
                      placeholder="Subject Filter"
                      options={assignedSubjectOpts}
                      selected={upFilterSubjects}
                      onChange={setUpFilterSubjects}
                    />
                  </div>

                  {/* Compact Date Range Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsUpDatePopoverOpen(!isUpDatePopoverOpen)}
                      className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        upcomingStartDate !== getLocalDateStr(0) || upcomingEndDate !== getDefaultEndDateStr()
                          ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                      title="Select Date Range"
                    >
                      <i className="fas fa-calendar-alt text-xs"></i>
                      <span>
                        {new Date(upcomingStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {' - '}
                        {new Date(upcomingEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <i className={`fas fa-chevron-down text-[10px] transition-transform ${isUpDatePopoverOpen ? 'rotate-180' : ''}`}></i>
                    </button>

                    {isUpDatePopoverOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsUpDatePopoverOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 p-4 bg-white border rounded-xl shadow-xl z-50 min-w-[240px] space-y-3 text-left">
                          <h5 className="text-xs font-black text-dark-primary uppercase tracking-wider border-b pb-1 mb-2">
                            Date Range
                          </h5>
                          <div className="space-y-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">From:</span>
                              <input
                                type="date"
                                value={upcomingStartDate}
                                onChange={(e) => setUpcomingStartDate(e.target.value)}
                                className="border rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-primary w-full bg-white"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">To:</span>
                              <input
                                type="date"
                                value={upcomingEndDate}
                                onChange={(e) => setUpcomingEndDate(e.target.value)}
                                className="border rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-primary w-full bg-white"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t">
                            <button
                              type="button"
                              onClick={() => {
                                setUpcomingStartDate(getLocalDateStr(0));
                                setUpcomingEndDate(getDefaultEndDateStr());
                                setIsUpDatePopoverOpen(false);
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsUpDatePopoverOpen(false)}
                              className="px-3 py-1 text-[10px] font-bold bg-brand-primary text-white rounded shadow-sm hover:bg-brand-primary/90"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setUpFilterClasses([]);
                        setUpFilterSubjects([]);
                        setUpcomingStartDate(getLocalDateStr(0));
                        setUpcomingEndDate(getDefaultEndDateStr());
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors h-8"
                    >
                      Reset
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'teacher-activity' && (
          <>
            {renderPlannedForToday()}
            <DailyActivityTable
              role="teacher"
              activeTab={activeTab}
              dailyEntries={myWorkEntries}
              dailyLoading={myWorkLoading}
              classes={classes}
              subjects={subjects}
              books={books}
              filteredDailyEntries={myWorkEntries}
              handleDeleteClick={handleDeleteClick}
              isCreatedToday={isCreatedToday}
            />
          </>
        )}
        {activeTab === 'class-progress' && (
          <SyllabusProgressGrid
            role="teacher"
            classesToRender={(() => {
              const progressClasses =
                coverMode || assignments.length === 0
                  ? classes
                  : classes.filter((c) =>
                      assignments.some((a) => String(a.class_id) === String(c.id))
                    );
              return progressClasses.filter((c) => {
                if (cpFilterClasses.length > 0) return cpFilterClasses.includes(String(c.id));
                return true;
              });
            })()}
            books={books}
            bookClasses={bookClasses}
            subjects={subjects}
            classifications={classifications}
            allTrackers={allTrackers}
            allLogs={allLogs}
            allLessons={allLessons}
            cpGroupingMode={cpGroupingMode}
            cpFilterBooks={cpFilterBooks}
            cpFilterClassifications={cpFilterClassifications}
            progressExpandedBook={progressExpandedBook}
            progressExpandedClass={progressExpandedClass}
            handleProgressBookClick={handleProgressBookClick}
            progressLoading={detailsLoading}
            progressBookLessons={progressBookLessons}
            progressBookLogs={progressBookLogs}
            showNotStarted={showNotStarted}
            setShowNotStarted={setShowNotStarted}
            expandedLogIds={expandedLogIds}
            toggleLogExpand={toggleLogExpand}
            logItemsMap={logItemsMap}
          />
        )}
        {activeTab === 'upcoming-lessons' && renderUpcomingLessons()}
      </div>

      <SyllabusAddWorkModal
        isOpen={isAddWorkModalOpen}
        onClose={() => {
          setIsAddWorkModalOpen(false);
          setPlannedLessonToLog(null);
        }}
        onSuccess={handleAddWorkSuccess}
        teacher={teacher}
        classes={classes}
        books={books}
        bookClasses={bookClasses}
        setBookClasses={setBookClasses}
        subjects={subjects}
        classifications={classifications}
        favorites={favorites}
        setFavorites={(newFavs) => {
          setFavorites(newFavs);
          syllabusTrackerCache.favorites = newFavs;
          if (teacher?.id) saveFavoritesToDB(teacher.id, newFavs);
        }}
        coverMode={coverMode}
        assignments={assignments}
        initialPlan={plannedLessonToLog}
      />

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

export default SyllabusTracker;
