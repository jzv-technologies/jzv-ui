// src/components/portals/teacher/SyllabusTracker.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';

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
};

const SyllabusTracker = ({ user }) => {
  const isCacheValid = syllabusTrackerCache.userId === user?.id;

  const [loading, setLoading] = useState(() => !isCacheValid || !syllabusTrackerCache.teacher);
  const [submitting, setSubmitting] = useState(false);
  const [teacher, setTeacher] = useState(() =>
    isCacheValid ? syllabusTrackerCache.teacher : null
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
  const [bookClasses, setBookClasses] = useState(() => (isCacheValid ? syllabusTrackerCache.bookClasses : []));

  // Add Book Mapping form state (bottom of modal)
  const [showAddBookMappingForm, setShowAddBookMappingForm] = useState(false);
  const [abClassificationId, setAbClassificationId] = useState('');
  const [abSubjectId, setAbSubjectId] = useState('');
  const [abBookId, setAbBookId] = useState('');

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

  // Book trackers (for Syllabus Progress)
  const [bookTrackers, setBookTrackers] = useState(() => {
    if (isCacheValid && syllabusTrackerCache.selectedProgressClassId) {
      return syllabusTrackerCache.bookTrackers[syllabusTrackerCache.selectedProgressClassId] || [];
    }
    return [];
  });
  const [selectedProgressClassId, setSelectedProgressClassId] = useState(() =>
    isCacheValid ? syllabusTrackerCache.selectedProgressClassId : ''
  );

  // Syllabus Progress expanded state
  const [progressExpandedBook, setProgressExpandedBook] = useState(null);
  const [showNotStarted, setShowNotStarted] = useState(false);
  const [progressBookLessons, setProgressBookLessons] = useState([]);
  const [progressBookLogs, setProgressBookLogs] = useState([]);
  const [progressBookLogItems, setProgressBookLogItems] = useState([]);
  const [progressLoading, setProgressLoading] = useState(false);

  // My Books tab state
  const [myBooksData, setMyBooksData] = useState(() =>
    isCacheValid && syllabusTrackerCache.myBooksData ? syllabusTrackerCache.myBooksData : []
  );
  const [myBooksLoading, setMyBooksLoading] = useState(false);

  // Add Work modal state
  const [isAddWorkModalOpen, setIsAddWorkModalOpen] = useState(false);
  const [awClassId, setAwClassId] = useState('');
  const [awClassificationId, setAwClassificationId] = useState('');
  const [awSubjectId, setAwSubjectId] = useState('');
  const [awBookId, setAwBookId] = useState('');
  const [awLevel1, setAwLevel1] = useState('');
  const [awLevel2, setAwLevel2] = useState('');
  const [awLevel3, setAwLevel3] = useState('');
  const [awStatus, setAwStatus] = useState('in_progress');
  const [awProgress, setAwProgress] = useState(50);
  const [awDate, setAwDate] = useState(new Date().toISOString().split('T')[0]);
  const [awComments, setAwComments] = useState('');
  const [awBookData, setAwBookData] = useState([]);

  // Inline add level states
  const [inlineAddType, setInlineAddType] = useState(null); // 'level1' | 'level2' | 'level3'
  const [inlineAddName, setInlineAddName] = useState('');
  const [inlineAddPageCount, setInlineAddPageCount] = useState(0);
  const [inlineAddComplexity, setInlineAddComplexity] = useState('Easy');
  const [inlineAddWithLevel3, setInlineAddWithLevel3] = useState(false); // toggle for level2 add
  const [inlineAddLevel3Name, setInlineAddLevel3Name] = useState('');

  // Favorites override modal
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideSelection, setOverrideSelection] = useState('');
  const [pendingFavorite, setPendingFavorite] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // ─── Favorites DB Helpers ──────────────────────────────────────────

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

  // ─── Data Loading ──────────────────────────────────────────────────

  useEffect(() => {
    const initData = async () => {
      if (syllabusTrackerCache.userId !== user?.id) {
        syllabusTrackerCache = {
          userId: user?.id,
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

      try {
        if (!user || !user.id) throw new Error('User session not found.');
        const { data: teacherData, error: teachErr } = await supabase
          .from('teachers')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();
        if (teachErr) throw teachErr;
        if (!teacherData) throw new Error('User not mapped to Teacher record.');
        setTeacher(teacherData);
        syllabusTrackerCache.teacher = teacherData;

        const [
          { data: dbClasses },
          { data: dbSubjects },
          { data: dbAssignments },
          { data: dbBooks },
          { data: dbClassifications },
          { data: dbBookClasses },
        ] = await Promise.all([
          supabase.from('classes').select('*'),
          supabase.from('subjects').select('*'),
          supabase.from('class_assignments').select('*').eq('teacher_id', teacherData.id),
          supabase.from('syllabus_books').select('*'),
          supabase.from('subject_classifications').select('*'),
          supabase.from('syllabus_book_classes').select('*'),
        ]);

        const fetchedClasses = dbClasses || [];
        const fetchedSubjects = dbSubjects || [];
        const fetchedAssignments = dbAssignments || [];
        const fetchedBooks = dbBooks || [];
        const fetchedClassifications = dbClassifications || [];
        const fetchedBookClasses = dbBookClasses || [];

        setClasses(fetchedClasses);
        setSubjects(fetchedSubjects);
        setAssignments(fetchedAssignments);
        setBooks(fetchedBooks);
        setClassifications(fetchedClassifications);
        setBookClasses(fetchedBookClasses);

        syllabusTrackerCache.classes = fetchedClasses;
        syllabusTrackerCache.subjects = fetchedSubjects;
        syllabusTrackerCache.assignments = fetchedAssignments;
        syllabusTrackerCache.books = fetchedBooks;
        syllabusTrackerCache.classifications = fetchedClassifications;
        syllabusTrackerCache.bookClasses = fetchedBookClasses;

        const assignedClassIds = fetchedAssignments.map((a) => String(a.class_id));
        const filteredClasses = fetchedClasses.filter((c) =>
          assignedClassIds.includes(String(c.id))
        );
        if (filteredClasses.length > 0 && !syllabusTrackerCache.selectedProgressClassId) {
          const defaultClassId = String(filteredClasses[0].id);
          setSelectedProgressClassId(defaultClassId);
          syllabusTrackerCache.selectedProgressClassId = defaultClassId;
        }

        let dbFavs = await loadFavoritesFromDB(teacherData.id);
        if (dbFavs.length === 0) {
          const migrated = await migrateLocalStorageFavorites(teacherData.id);
          if (migrated) dbFavs = migrated;
        }
        setFavorites(dbFavs);
        syllabusTrackerCache.favorites = dbFavs;
      } catch (err) {
        console.warn('SyllabusTracker init failed:', err.message);
        if (!syllabusTrackerCache.teacher) {
          loadLocalFallback();
        }
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
  }, [user]);

  // ─── My Work: Fetch teacher's log entries ──────────────────────────

  const fetchMyWorkEntries = useCallback(async () => {
    if (!teacher?.id) return;
    if (!syllabusTrackerCache.myWorkEntries) {
      setMyWorkLoading(true);
    }
    try {
      // Fetch all log items by this teacher
      const { data: items, error } = await supabase
        .from('lesson_tracker_log_items')
        .select('*, teacher:teachers(name)')
        .eq('teacher_id', teacher.id)
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;

      if (!items || items.length === 0) {
        setMyWorkEntries([]);
        syllabusTrackerCache.myWorkEntries = [];
        setMyWorkLoading(false);
        return;
      }

      // Get unique lt_log_ids to fetch parent log info
      const ltLogIds = [...new Set(items.map((i) => i.lt_log_id))];
      const { data: logs, error: logErr } = await supabase
        .from('lesson_tracker_log')
        .select('*')
        .in('id', ltLogIds);
      if (logErr) throw logErr;

      // Get lesson details
      const lessonIds = [...new Set((logs || []).map((l) => l.lesson_id))];
      const { data: lessons, error: lesErr } = await supabase
        .from('syllabus_book_lessons')
        .select('*')
        .in('id', lessonIds);
      if (lesErr) throw lesErr;

      // Build enriched entries
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

      setMyWorkEntries(enriched);
      syllabusTrackerCache.myWorkEntries = enriched;
    } catch (err) {
      console.warn('Failed to fetch my work entries:', err.message);
      if (!syllabusTrackerCache.myWorkEntries) {
        setMyWorkEntries([]);
      }
    } finally {
      setMyWorkLoading(false);
    }
  }, [teacher, books, subjects, classes]);

  useEffect(() => {
    if (teacher?.id && books.length > 0 && subjects.length > 0 && classes.length > 0) {
      fetchMyWorkEntries();
    }
  }, [teacher, books, subjects, classes, fetchMyWorkEntries]);

  // ─── Book Tracker fetch for Syllabus Progress ──────────────────────

  const fetchBookTrackers = async (classId) => {
    if (!classId) return;
    if (syllabusTrackerCache.bookTrackers[classId]) {
      setBookTrackers(syllabusTrackerCache.bookTrackers[classId]);
    }
    try {
      const { data, error } = await supabase
        .from('book_tracker')
        .select('*')
        .eq('class_id', classId);
      if (error) throw error;
      const trackers = data || [];
      setBookTrackers(trackers);
      syllabusTrackerCache.bookTrackers[classId] = trackers;
    } catch (err) {
      console.warn('Failed to fetch book trackers:', err.message);
    }
  };

  useEffect(() => {
    if (selectedProgressClassId) {
      fetchBookTrackers(selectedProgressClassId);
      setProgressExpandedBook(null);
      syllabusTrackerCache.selectedProgressClassId = selectedProgressClassId;
    }
  }, [selectedProgressClassId]);

  // ─── My Books fetch ────────────────────────────────────────────────
  const fetchMyBooksData = async () => {
    if (syllabusTrackerCache.myBooksData) {
      setMyBooksData(syllabusTrackerCache.myBooksData);
    } else {
      setMyBooksLoading(true);
    }
    try {
      const { data, error } = await supabase.from('book_tracker').select('*');
      if (error) throw error;
      const trackers = data || [];
      setMyBooksData(trackers);
      syllabusTrackerCache.myBooksData = trackers;
    } catch (err) {
      console.warn('Failed to fetch My Books data:', err.message);
    } finally {
      setMyBooksLoading(false);
    }
  };

  const handleTabChange = async (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'teacher-activity') {
      await fetchMyWorkEntries();
    } else if (tabKey === 'class-progress') {
      if (selectedProgressClassId) {
        await fetchBookTrackers(selectedProgressClassId);
      }
      setProgressExpandedBook(null);
    } else if (tabKey === 'teacher-progress') {
      await fetchMyBooksData();
    }
  };

  const handleCoverModeChange = async (checked) => {
    setCoverMode(checked);
    if (activeTab === 'teacher-activity') {
      await fetchMyWorkEntries();
    } else if (activeTab === 'class-progress') {
      if (selectedProgressClassId) {
        await fetchBookTrackers(selectedProgressClassId);
      }
      setProgressExpandedBook(null);
    } else if (activeTab === 'teacher-progress') {
      // Temporarily use the updated coverMode value directly in the fetch mapping by passing checked
      setMyBooksLoading(true);
      try {
        const { data, error } = await supabase.from('book_tracker').select('*');
        if (error) throw error;
        setMyBooksData(data || []);
      } catch (err) {
        console.warn('Failed to fetch My Books data:', err.message);
        setMyBooksData([]);
      } finally {
        setMyBooksLoading(false);
      }
    }
  };

  // ─── Book labels helper ──────────────────────────────────────────

  const getBookLabels = (book) => {
    const rl = (book?.hierarchy_type || 'Unit, Chapter, Lesson')
      .split(/[,>]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const bl = rl[0] && rl[0].toLowerCase().includes('book') && rl.length > 1 ? rl.slice(1) : rl;
    return { lvl1: bl[0] || 'Unit', lvl2: bl[1] || 'Chapter', lvl3: bl[2] || 'Lesson', levels: bl };
  };

  // ─── Add Work Modal: cascading filter helpers ──────────────────────

  const awClasses = (coverMode || assignments.length === 0)
    ? classes
    : classes.filter((c) => assignments.some((a) => String(a.class_id) === String(c.id)));

  // Filter books and subjects by classes mapped in syllabus_book_classes
  const mappedBookIds = bookClasses
    .filter((bc) => String(bc.class_id) === String(awClassId))
    .map((bc) => String(bc.book_id));
  const awClassBooks = books.filter((b) => mappedBookIds.includes(String(b.id)));

  const awFilteredSubjects = subjects.filter((s) =>
    awClassBooks.some((b) => String(b.subject_id) === String(s.id))
  );
  const awActiveClassifications = classifications.filter((c) =>
    awFilteredSubjects.some((s) => String(s.classification_id) === String(c.id))
  );
  const awActiveSubjects = awClassificationId
    ? awFilteredSubjects.filter((s) => String(s.classification_id) === String(awClassificationId))
    : awFilteredSubjects;
  const awFilteredBooks = awClassBooks.filter((b) => String(b.subject_id) === String(awSubjectId));
  const awActiveBook = awFilteredBooks.find((b) => String(b.id) === String(awBookId));
  const awLabels = getBookLabels(awActiveBook);

  // Cascading filters for the "Add Book Mapping" section (abPrefix)
  const abMappedBookIds = bookClasses
    .filter((bc) => String(bc.class_id) === String(awClassId))
    .map((bc) => String(bc.book_id));
  const abAvailableBooks = books.filter((b) => !abMappedBookIds.includes(String(b.id)));
  const abFilteredBooks = abSubjectId
    ? abAvailableBooks.filter((b) => String(b.subject_id) === String(abSubjectId))
    : abAvailableBooks;
  const abFilteredSubjects = subjects;
  const abActiveClassifications = classifications.filter((c) =>
    abFilteredSubjects.some((s) => String(s.classification_id) === String(c.id))
  );
  const abActiveSubjects = abClassificationId
    ? abFilteredSubjects.filter((s) => String(s.classification_id) === String(abClassificationId))
    : abFilteredSubjects;

  // Syllabus data for the selected book (non-revision items)
  const awAllBookData = awBookData;
  const awNonRevisionData = awBookData.filter((d) => d.level1 !== '_Revision');
  const awRevisionData = awBookData.filter((d) => d.level1 === '_Revision');

  const awLevel1s = [...new Set(awNonRevisionData.map((d) => d.level1).filter(Boolean))];
  // Include _Revision as a special entry at end
  const awLevel1sWithRevision = [...awLevel1s, ...(awRevisionData.length > 0 ? ['_Revision'] : [])];

  const isRevisionMode = awLevel1 === '_Revision';

  const awLevel2s = awLevel1
    ? [...new Set(awBookData.filter((d) => d.level1 === awLevel1 && d.level2).map((d) => d.level2))]
    : [];
  const awLevel3s =
    awLevel1 && awLevel2
      ? [
          ...new Set(
            awBookData
              .filter((d) => d.level1 === awLevel1 && d.level2 === awLevel2 && d.level3)
              .map((d) => d.level3)
          ),
        ]
      : [];

  // Determine if selected path is a leaf node
  const isLeafNodeSelected = (() => {
    if (!awBookId || !awLevel1) return false;
    if (isRevisionMode) return false; // revision doesn't use status/progress

    // Check if this level has children
    if (awLevel3) return true; // Level3 selected = always leaf
    if (awLevel2) {
      // Level2 is leaf if no Level3 exists under it
      const hasL3 = awBookData.some(
        (d) => d.level1 === awLevel1 && d.level2 === awLevel2 && d.level3
      );
      return !hasL3;
    }
    if (awLevel1) {
      // Level1 is leaf if no Level2 exists under it
      const hasL2 = awBookData.some((d) => d.level1 === awLevel1 && d.level2);
      return !hasL2;
    }
    return false;
  })();

  // Check if level3 exists under a given level1 (for Add Level2 toggle)
  const level3ExistsForLevel1 = (l1) => {
    return awBookData.some((d) => d.level1 === l1 && d.level3);
  };

  // ─── Load book data when book changes ──────────────────────────────

  const loadAwBookData = async (bookId) => {
    if (!bookId) {
      setAwBookData([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('syllabus_book_lessons')
        .select('*')
        .eq('book_id', bookId);
      if (error) throw error;
      setAwBookData(data || []);
    } catch (err) {
      setAwBookData([]);
    }
  };

  useEffect(() => {
    if (isAddWorkModalOpen && awBookId) {
      loadAwBookData(awBookId);
      setAwLevel1('');
      setAwLevel2('');
      setAwLevel3('');
    }
  }, [awBookId, isAddWorkModalOpen]);

  // ─── Status ↔ Progress sync ──────────────────────────────────────

  const handleAwStatusChange = (newStatus) => {
    setAwStatus(newStatus);
    if (newStatus === 'completed') {
      setAwProgress(100);
    } else if (newStatus === 'in_progress' && awProgress === 100) {
      setAwProgress(50);
    }
  };

  const handleAwProgressChange = (newProgress) => {
    const p = Number(newProgress);
    setAwProgress(p);
    if (p === 100) {
      setAwStatus('completed');
    } else if (awStatus === 'completed' && p < 100) {
      setAwStatus('in_progress');
    }
  };

  // ─── Core Actions ──────────────────────────────────────────────────

  const ensureLessonLog = async (classId, lessonId, date) => {
    // Check existing
    const { data: existing } = await supabase
      .from('lesson_tracker_log')
      .select('*')
      .eq('class_id', classId)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (existing) return existing;

    const { data, error } = await supabase
      .from('lesson_tracker_log')
      .upsert(
        [
          {
            class_id: classId,
            lesson_id: lessonId,
            start_date: date,
            current_status: 'not_started',
          },
        ],
        { onConflict: 'class_id,lesson_id' }
      )
      .select();
    if (error) throw error;
    return data[0];
  };

  const addLogItem = async (ltLogId, date, teacherId, status, progress, comments, isRevision) => {
    const { error } = await supabase.from('lesson_tracker_log_items').insert([
      {
        lt_log_id: ltLogId,
        date: date,
        teacher_id: teacherId,
        current_status: status,
        progress: progress,
        is_revision: isRevision ? 'Y' : 'N',
        comments: comments || null,
      },
    ]);
    if (error) throw error;
  };

  // ─── Add Work Modal: open/reset ──────────────────────────────────

  const handleMapBookToClass = async () => {
    if (!awClassId) return showToast('Please select a class first.', 'warning');
    if (!abBookId) return showToast('Please select a book to map.', 'warning');
    
    setSubmitting(true);
    try {
      const bookId = Number(abBookId);
      const classId = Number(awClassId);

      // Save to Supabase
      try {
        const { error } = await supabase
          .from('syllabus_book_classes')
          .insert([{ book_id: bookId, class_id: classId }]);
        if (error && error.code !== '23505') throw error; // ignore duplicates
      } catch (e) {
        console.warn('DB mapping failed, fallback to LocalStorage:', e.message);
      }

      // Save to local state and LocalStorage
      const exists = bookClasses.some(
        (bc) => String(bc.book_id) === String(bookId) && String(bc.class_id) === String(classId)
      );
      if (!exists) {
        const updated = [...bookClasses, { book_id: bookId, class_id: classId }];
        setBookClasses(updated);
        syllabusTrackerCache.bookClasses = updated;
        localStorage.setItem('jzv_syllabus_book_classes', JSON.stringify(updated));
      }

      // Automatically select the newly mapped book
      const targetBook = books.find((b) => String(b.id) === String(bookId));
      if (targetBook) {
        const targetSubj = subjects.find((s) => String(s.id) === String(targetBook.subject_id));
        if (targetSubj) {
          setAwClassificationId(String(targetSubj.classification_id || ''));
          setAwSubjectId(String(targetSubj.id));
        }
        setAwBookId(String(targetBook.id));
      }

      showToast('Book mapped successfully!', 'success');
      setShowAddBookMappingForm(false);
      setAbClassificationId('');
      setAbSubjectId('');
      setAbBookId('');
    } catch (err) {
      showToast('Error mapping book: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddWorkModal = () => {
    setAwClassId('');
    setAwClassificationId('');
    setAwSubjectId('');
    setAwBookId('');
    setAwLevel1('');
    setAwLevel2('');
    setAwLevel3('');
    setAwStatus('in_progress');
    setAwProgress(50);
    setAwDate(new Date().toISOString().split('T')[0]);
    setAwComments('');
    setAwBookData([]);
    setInlineAddType(null);
    setInlineAddName('');
    setInlineAddPageCount(0);
    setInlineAddComplexity('Easy');
    setInlineAddWithLevel3(false);
    setInlineAddLevel3Name('');
    setShowAddBookMappingForm(false);
    setAbClassificationId('');
    setAbSubjectId('');
    setAbBookId('');
    setIsAddWorkModalOpen(true);
  };

  const resetAddWorkModal = () => {
    setAwClassId('');
    setAwClassificationId('');
    setAwSubjectId('');
    setAwBookId('');
    setAwLevel1('');
    setAwLevel2('');
    setAwLevel3('');
    setAwStatus('in_progress');
    setAwProgress(50);
    setAwDate(new Date().toISOString().split('T')[0]);
    setAwComments('');
    setAwBookData([]);
    setInlineAddType(null);
    setShowAddBookMappingForm(false);
    setAbClassificationId('');
    setAbSubjectId('');
    setAbBookId('');
  };

  // ─── Favorites ──────────────────────────────────────────────────

  const handleAddToFavorite = async (classId, classificationId, subjectId, bookId) => {
    if (!classId || !subjectId || !bookId) return;
    const cName = classes.find((c) => String(c.id) === String(classId))?.name || 'Class';
    const sName = subjects.find((s) => String(s.id) === String(subjectId))?.name || 'Subject';
    const bName = books.find((b) => String(b.id) === String(bookId))?.name || 'Book';
    const favKey = `${cName} - ${bName}`;

    // Check if already a favorite
    const existsIdx = favorites.findIndex(
      (f) => String(f.classId) === String(classId) && String(f.bookId) === String(bookId)
    );
    if (existsIdx > -1) {
      const newFavs = favorites.filter((_, i) => i !== existsIdx);
      setFavorites(newFavs);
      syllabusTrackerCache.favorites = newFavs;
      if (teacher?.id) await saveFavoritesToDB(teacher.id, newFavs);
      showToast('Removed from Favorites', 'info');
      return;
    }

    const newFav = {
      key: favKey,
      classId,
      classificationId: classificationId || '',
      subjectId,
      bookId,
      className: cName,
      subjectName: sName,
      bookName: bName,
    };

    if (favorites.length >= 8) {
      setPendingFavorite(newFav);
      setOverrideSelection('');
      setIsOverrideModalOpen(true);
      return;
    }

    const newFavs = [...favorites, newFav];
    setFavorites(newFavs);
    syllabusTrackerCache.favorites = newFavs;
    if (teacher?.id) await saveFavoritesToDB(teacher.id, newFavs);
    showToast('Added to Favorites!', 'success');
  };

  const handleOverrideFavorite = async () => {
    if (!overrideSelection || !pendingFavorite) return;
    const newFavs = favorites.map((f) => (f.key === overrideSelection ? pendingFavorite : f));
    setFavorites(newFavs);
    syllabusTrackerCache.favorites = newFavs;
    if (teacher?.id) await saveFavoritesToDB(teacher.id, newFavs);
    setIsOverrideModalOpen(false);
    setPendingFavorite(null);
    setOverrideSelection('');
    showToast('Favorite overridden!', 'success');
  };

  const applyFavorite = (fav) => {
    setAwClassId(String(fav.classId));
    const subObj = subjects.find((s) => String(s.id) === String(fav.subjectId));
    if (subObj && subObj.classification_id) {
      setAwClassificationId(String(subObj.classification_id));
    } else {
      setAwClassificationId('');
    }
    setAwSubjectId(String(fav.subjectId));
    setAwBookId(String(fav.bookId));
    setAwLevel1('');
    setAwLevel2('');
    setAwLevel3('');
  };

  // ─── Inline Add Level ──────────────────────────────────────────────

  const handleInlineAddLevel = async () => {
    if (!inlineAddName.trim()) return showToast(`Name is required.`, 'warning');
    if (!awBookId) return showToast('Please select a book first.', 'warning');

    setSubmitting(true);
    try {
      let targetLevel1 = '';
      let targetLevel2 = null;
      let targetLevel3 = null;

      if (inlineAddType === 'level1') {
        // Level1: name only, no page/complexity
        targetLevel1 = inlineAddName.trim();
        const exists = awBookData.some((d) => d.level1 === targetLevel1);
        if (exists) throw new Error(`${awLabels.lvl1} "${targetLevel1}" already exists.`);

        const { data: insRes, error } = await supabase
          .from('syllabus_book_lessons')
          .insert([
            {
              book_id: awBookId,
              level1: targetLevel1,
              level2: null,
              level3: null,
              page_count: 0,
              complexity: 'Easy',
            },
          ])
          .select();
        if (error) throw error;

        setAwBookData((prev) => [...prev, insRes[0]]);
        showToast(`${awLabels.lvl1} added!`, 'success');
        setAwLevel1(targetLevel1);
      } else if (inlineAddType === 'level2') {
        if (!awLevel1) return showToast(`Please select a ${awLabels.lvl1} first.`, 'warning');
        targetLevel1 = awLevel1;
        targetLevel2 = inlineAddName.trim();

        if (inlineAddWithLevel3 && inlineAddLevel3Name.trim()) {
          // Add Level2 + Level3 together
          targetLevel3 = inlineAddLevel3Name.trim();

          // Add placeholder level2 if doesn't exist, then add level3
          const l2Exists = awBookData.some(
            (d) => d.level1 === targetLevel1 && d.level2 === targetLevel2
          );
          let updatedData = [...awBookData];

          if (!l2Exists) {
            const { data: l2Res, error: l2Err } = await supabase
              .from('syllabus_book_lessons')
              .insert([
                {
                  book_id: awBookId,
                  level1: targetLevel1,
                  level2: targetLevel2,
                  level3: null,
                  page_count: 0,
                  complexity: 'Easy',
                },
              ])
              .select();
            if (l2Err) throw l2Err;
            updatedData.push(l2Res[0]);
          }

          const { data: l3Res, error: l3Err } = await supabase
            .from('syllabus_book_lessons')
            .insert([
              {
                book_id: awBookId,
                level1: targetLevel1,
                level2: targetLevel2,
                level3: targetLevel3,
                page_count: Number(inlineAddPageCount) || 0,
                complexity: inlineAddComplexity || 'Easy',
              },
            ])
            .select();
          if (l3Err) throw l3Err;
          updatedData.push(l3Res[0]);

          setAwBookData(updatedData);
          showToast(`${awLabels.lvl2} + ${awLabels.lvl3} added!`, 'success');
          setAwLevel2(targetLevel2);
          setAwLevel3(targetLevel3);
        } else {
          // Add Level2 as leaf (with page/complexity)
          const recordData = {
            book_id: awBookId,
            level1: targetLevel1,
            level2: targetLevel2,
            level3: null,
            page_count: Number(inlineAddPageCount) || 0,
            complexity: inlineAddComplexity || 'Easy',
          };

          // Placeholder logic
          const placeholder = awBookData.find(
            (d) =>
              String(d.book_id) === String(awBookId) &&
              d.level1 === targetLevel1 &&
              !d.level2 &&
              !d.level3
          );

          let updatedData = [...awBookData];
          if (placeholder) {
            const { data: updRes, error } = await supabase
              .from('syllabus_book_lessons')
              .update(recordData)
              .eq('id', placeholder.id)
              .select();
            if (error) throw error;
            updatedData = updatedData.map((d) =>
              String(d.id) === String(placeholder.id) ? updRes[0] : d
            );
          } else {
            const { data: insRes, error } = await supabase
              .from('syllabus_book_lessons')
              .insert([recordData])
              .select();
            if (error) throw error;
            updatedData.push(insRes[0]);
          }

          setAwBookData(updatedData);
          showToast(`${awLabels.lvl2} added!`, 'success');
          setAwLevel2(targetLevel2);
        }
      } else if (inlineAddType === 'level3') {
        if (!awLevel1) return showToast(`Please select a ${awLabels.lvl1} first.`, 'warning');
        targetLevel1 = awLevel1;
        targetLevel2 = awLevel2 || 'General';
        targetLevel3 = inlineAddName.trim();

        const recordData = {
          book_id: awBookId,
          level1: targetLevel1,
          level2: targetLevel2,
          level3: targetLevel3,
          page_count: Number(inlineAddPageCount) || 0,
          complexity: inlineAddComplexity || 'Easy',
        };

        const placeholder = awBookData.find(
          (d) =>
            String(d.book_id) === String(awBookId) &&
            d.level1 === targetLevel1 &&
            (d.level2 || 'General') === targetLevel2 &&
            !d.level3
        );

        let updatedData = [...awBookData];
        if (placeholder) {
          const { data: updRes, error } = await supabase
            .from('syllabus_book_lessons')
            .update(recordData)
            .eq('id', placeholder.id)
            .select();
          if (error) throw error;
          updatedData = updatedData.map((d) =>
            String(d.id) === String(placeholder.id) ? updRes[0] : d
          );
        } else {
          const { data: insRes, error } = await supabase
            .from('syllabus_book_lessons')
            .insert([recordData])
            .select();
          if (error) throw error;
          updatedData.push(insRes[0]);
        }

        setAwBookData(updatedData);
        showToast(`${awLabels.lvl3} added!`, 'success');
        setAwLevel3(targetLevel3);
      }

      // Reset inline form
      setInlineAddType(null);
      setInlineAddName('');
      setInlineAddPageCount(0);
      setInlineAddComplexity('Easy');
      setInlineAddWithLevel3(false);
      setInlineAddLevel3Name('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Submit Add Work ──────────────────────────────────────────────

  const handleAddWorkSubmit = async (e) => {
    e.preventDefault();
    if (!awClassId || !awBookId) return showToast('Please select Class and Book.', 'warning');

    // Find the target lesson node
    let targetLesson = null;
    if (awLevel3) {
      targetLesson = awBookData.find(
        (d) => d.level1 === awLevel1 && d.level2 === awLevel2 && d.level3 === awLevel3
      );
    } else if (awLevel2) {
      targetLesson = awBookData.find(
        (d) => d.level1 === awLevel1 && d.level2 === awLevel2 && !d.level3
      );
    } else if (awLevel1) {
      targetLesson = awBookData.find((d) => d.level1 === awLevel1 && !d.level2 && !d.level3);
    }

    if (!targetLesson) return showToast('Please select a valid lesson/topic to log.', 'warning');
    if (awDate > todayStr) return showToast('Date cannot be a future date.', 'warning');

    // Determine status and progress
    let finalStatus = awStatus;
    let finalProgress = awProgress;
    let finalIsRevision = false;

    if (isRevisionMode) {
      finalStatus = 'completed'; // revision entries are always "completed"
      finalProgress = 100;
      finalIsRevision = true;
    } else if (!isLeafNodeSelected) {
      return showToast('Please select a leaf-level node to log progress.', 'warning');
    }

    setSubmitting(true);
    try {
      const log = await ensureLessonLog(awClassId, targetLesson.id, awDate);
      await addLogItem(
        log.id,
        awDate,
        teacher?.id,
        finalStatus,
        finalProgress,
        awComments,
        finalIsRevision
      );

      showToast(isRevisionMode ? 'Revision logged!' : 'Log entry added!', 'success');
      setIsAddWorkModalOpen(false);
      // Refresh current tab data
      if (activeTab === 'teacher-activity') {
        await fetchMyWorkEntries();
      } else if (activeTab === 'class-progress') {
        await fetchBookTrackers(selectedProgressClassId);
      } else if (activeTab === 'teacher-progress') {
        await fetchMyBooksData();
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Syllabus Progress Tab Logic ──────────────────────────────────

  const handleProgressBookClick = async (bookId) => {
    if (progressExpandedBook === bookId) {
      setProgressExpandedBook(null);
      return;
    }
    setProgressExpandedBook(bookId);
    setProgressLoading(true);
    setShowNotStarted(false);
    try {
      const [{ data: lessons, error: lessErr }, { data: logs, error: logErr }] = await Promise.all([
        supabase.from('syllabus_book_lessons').select('*').eq('book_id', bookId),
        supabase.from('lesson_tracker_log').select('*').eq('class_id', selectedProgressClassId),
      ]);
      if (lessErr) throw lessErr;
      if (logErr) throw logErr;

      const bookLessons = (lessons || []).filter((l) => l.level3);
      const relevantLogs = (logs || []).filter((l) =>
        bookLessons.some((bl) => String(bl.id) === String(l.lesson_id))
      );

      setProgressBookLessons(bookLessons);
      setProgressBookLogs(relevantLogs);

      const completedLogIds = relevantLogs
        .filter((l) => l.current_status === 'completed')
        .map((l) => l.id);
      if (completedLogIds.length > 0) {
        const { data: items } = await supabase
          .from('lesson_tracker_log_items')
          .select('*, teacher:teachers(name)')
          .in('lt_log_id', completedLogIds)
          .order('date', { ascending: false });
        setProgressBookLogItems(items || []);
      } else {
        setProgressBookLogItems([]);
      }
    } catch (err) {
      console.warn('Progress book expand failed:', err.message);
    } finally {
      setProgressLoading(false);
    }
  };

  // ─── Status Badges ──────────────────────────────────────────────

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

  // ─── Render: My Work Tab ──────────────────────────────────────────

  const renderMyWork = () => {
    if (myWorkLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="w-6 h-6 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-xs font-bold text-gray-500">Loading your entries...</span>
        </div>
      );
    }

    if (myWorkEntries.length === 0) {
      return (
        <div className="p-12 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          <i className="fas fa-clipboard-list text-4xl text-gray-300 mb-3 block"></i>
          No log entries yet. Click <strong>"Add Work"</strong> to get started.
        </div>
      );
    }

    return (
      <div className="bg-white border border-light-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-light-border">
                <th className="text-left px-4 py-3 font-extrabold text-dark-soft uppercase text-[10px]">
                  Date
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-dark-soft uppercase text-[10px]">
                  Class
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-dark-soft uppercase text-[10px]">
                  Subject
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-dark-soft uppercase text-[10px]">
                  Book
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-dark-soft uppercase text-[10px]">
                  Lesson Path
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-dark-soft uppercase text-[10px]">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-dark-soft uppercase text-[10px]">
                  Progress
                </th>
                <th className="text-left px-4 py-3 font-extrabold text-dark-soft uppercase text-[10px]">
                  Comments
                </th>
              </tr>
            </thead>
            <tbody>
              {myWorkEntries.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                >
                  <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                    {new Date(entry.date).toLocaleDateString()}
                    {entry.late_reporting === 'Y' && (
                      <span className="ml-1 text-red-500 text-[8px] font-bold bg-red-50 px-1 py-0.5 rounded border border-red-100">
                        Late
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">
                    {entry.class?.name || '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-600">
                    {entry.subject?.name || '—'}
                  </td>
                  <td className="px-4 py-3 font-bold text-dark-primary">
                    {entry.book?.name || '—'}
                  </td>
                  <td
                    className="px-4 py-3 font-semibold text-gray-600 max-w-[250px] truncate"
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── Render: Syllabus Progress Tab ────────────────────────────────

  const renderSyllabusProgress = () => {
    const progressClasses = (coverMode || assignments.length === 0)
      ? classes
      : classes.filter((c) => assignments.some((a) => String(a.class_id) === String(c.id)));

    if (progressClasses.length === 0) {
      return (
        <div className="p-8 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          No allocated classes found.
        </div>
      );
    }

    const assignedSubjectIds = (coverMode || assignments.length === 0)
      ? subjects.map((s) => String(s.id))
      : assignments
          .filter((a) => String(a.class_id) === String(selectedProgressClassId))
          .map((a) => String(a.subject_id));
    const classBooks = books.filter((b) => assignedSubjectIds.includes(String(b.subject_id)));

    return (
      <div className="space-y-4">
        {/* Class selector for progress */}
        <div className="flex items-center gap-3 bg-white p-3 border rounded-xl shadow-sm">
          <label className="text-[10px] font-extrabold text-dark-soft uppercase shrink-0">
            Class:
          </label>
          <select
            value={selectedProgressClassId}
            onChange={(e) => setSelectedProgressClassId(e.target.value)}
            className="border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary text-xs font-bold text-dark-primary h-9"
          >
            {progressClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.class_name}
              </option>
            ))}
          </select>
        </div>

        {classBooks.length === 0 ? (
          <div className="p-8 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
            No syllabus books found for this class.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classBooks.map((book) => {
              const bt = bookTrackers.find((t) => String(t.book_id) === String(book.id));
              const pct = bt ? Number(bt.completion_percentage) : 0;
              const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
              const isExpanded = progressExpandedBook === book.id;
              const pctColor =
                pct >= 70 ? 'text-emerald-600' : pct >= 30 ? 'text-amber-600' : 'text-red-500';
              const pctBg =
                pct >= 70
                  ? 'bg-emerald-50 border-emerald-200'
                  : pct >= 30
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-red-50 border-red-200';
              const barColor = pct >= 70 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444';

              return (
                <div
                  key={book.id}
                  onClick={() => handleProgressBookClick(book.id)}
                  className={`p-4 border rounded-2xl shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${
                    isExpanded ? 'ring-2 ring-brand-primary/40 bg-brand-primary/5' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-dark-primary truncate">{book.name}</h4>
                      {subj && (
                        <p className="text-[10px] font-semibold text-gray-500 mt-0.5">
                          {subj.name}
                        </p>
                      )}
                    </div>
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-xl border ${pctBg} shrink-0 ml-2`}
                    >
                      <span className={`text-sm font-black ${pctColor}`}>{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                  {bt && (
                    <div className="flex items-center gap-3 mt-2 text-[9px] font-bold flex-wrap">
                      <span className="text-emerald-600">✓ {bt.completed}</span>
                      <span className="text-blue-600">◔ {bt.in_progress}</span>
                      <span className="text-gray-400">○ {bt.not_started}</span>
                      <span className="text-gray-500">Total: {bt.total_lessons}</span>
                    </div>
                  )}
                  {!bt && (
                    <p className="text-[9px] text-gray-400 mt-2 font-semibold">
                      No tracking data yet
                    </p>
                  )}
                </div>
              );
            })}
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
                    {classBooks.find((b) => b.id === progressExpandedBook)?.name} — Lesson Details
                  </h3>
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-xl cursor-pointer text-xs font-bold text-gray-700 select-none hover:bg-gray-150 transition-colors">
                    <input
                      type="checkbox"
                      checked={showNotStarted}
                      onChange={(e) => setShowNotStarted(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                    />
                    Show Not Started
                  </label>
                </div>

                {/* Completed */}
                {(() => {
                  const completedLogs = progressBookLogs.filter(
                    (l) => l.current_status === 'completed'
                  );
                  const inProgressLogs = progressBookLogs.filter(
                    (l) => l.current_status === 'in_progress'
                  );

                  return (
                    <div className="space-y-3">
                      {completedLogs.length > 0 && (
                        <div>
                          <p className="text-[10px] font-extrabold text-emerald-700 uppercase mb-2 flex items-center gap-1">
                            <i className="fas fa-check-circle" /> Completed ({completedLogs.length})
                          </p>
                          <div className="space-y-2">
                            {completedLogs.map((log) => {
                              const lesson = progressBookLessons.find(
                                (l) => String(l.id) === String(log.lesson_id)
                              );
                              const title = lesson
                                ? [lesson.level1, lesson.level2, lesson.level3]
                                    .filter(Boolean)
                                    .join(' > ')
                                : 'Unknown';
                              const relatedItems = progressBookLogItems.filter(
                                (i) => String(i.lt_log_id) === String(log.id)
                              );
                              const latestItem = relatedItems[0];
                              return (
                                <div
                                  key={log.id}
                                  className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl"
                                >
                                  <div className="flex items-center justify-between flex-wrap gap-1">
                                    <p className="text-xs font-bold text-dark-primary">{title}</p>
                                    <div className="flex items-center gap-2 text-[9px] text-gray-500 font-semibold">
                                      {log.end_date && (
                                        <span>
                                          Completed: {new Date(log.end_date).toLocaleDateString()}
                                        </span>
                                      )}
                                      {latestItem?.teacher?.name && (
                                        <span>by {latestItem.teacher.name}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {inProgressLogs.length > 0 && (
                        <div>
                          <p className="text-[10px] font-extrabold text-blue-700 uppercase mb-2 flex items-center gap-1">
                            <i className="fas fa-spinner" /> In Progress ({inProgressLogs.length})
                          </p>
                          <div className="space-y-2">
                            {inProgressLogs.map((log) => {
                              const lesson = progressBookLessons.find(
                                (l) => String(l.id) === String(log.lesson_id)
                              );
                              const title = lesson
                                ? [lesson.level1, lesson.level2, lesson.level3]
                                    .filter(Boolean)
                                    .join(' > ')
                                : 'Unknown';
                              return (
                                <div
                                  key={log.id}
                                  className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl"
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-dark-primary">{title}</p>
                                    <span className="text-[9px] text-blue-600 font-bold">
                                      {Number(log.completion_percentage).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {showNotStarted &&
                        (() => {
                          const loggedLessonIds = progressBookLogs.map((l) => String(l.lesson_id));
                          const notStarted = progressBookLessons.filter(
                            (l) => !loggedLessonIds.includes(String(l.id))
                          );
                          if (notStarted.length === 0)
                            return (
                              <p className="text-xs text-gray-400 font-semibold mt-2">
                                All lessons have been started.
                              </p>
                            );
                          return (
                            <div>
                              <p className="text-[10px] font-extrabold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <i className="fas fa-circle-minus" /> Not Started (
                                {notStarted.length})
                              </p>
                              <div className="space-y-2">
                                {notStarted.map((lesson) => {
                                  const title = [lesson.level1, lesson.level2, lesson.level3]
                                    .filter(Boolean)
                                    .join(' > ');
                                  return (
                                    <div
                                      key={lesson.id}
                                      className="p-3 bg-gray-50 border border-gray-150 rounded-xl"
                                    >
                                      <p className="text-xs font-bold text-gray-500">{title}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                      {completedLogs.length === 0 &&
                        inProgressLogs.length === 0 &&
                        !showNotStarted && (
                          <p className="text-xs text-gray-400 font-semibold">
                            No completed or in-progress lessons yet. Toggle "Show Not Started" to
                            see all lessons.
                          </p>
                        )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMyBooks = () => {
    if (myBooksLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="w-6 h-6 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-xs font-bold text-gray-500">Loading books progress...</span>
        </div>
      );
    }

    const progressClasses = (coverMode || assignments.length === 0)
      ? classes
      : classes.filter((c) => assignments.some((a) => String(a.class_id) === String(c.id)));

    // Group trackers by class
    const trackerByClass = {};
    myBooksData.forEach((tracker) => {
      const cls = progressClasses.find((c) => String(c.id) === String(tracker.class_id));
      if (!cls) return; // skip if class not in active classes

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

    if (classIdsWithEntries.length === 0) {
      return (
        <div className="p-12 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          <i className="fas fa-book text-4xl text-gray-300 mb-3 block"></i>
          No books tracking data found.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {classIdsWithEntries.map((classId) => {
          const { classObj, trackers } = trackerByClass[classId];
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
                  const pctColor =
                    pct >= 70 ? 'text-emerald-600' : pct >= 30 ? 'text-amber-600' : 'text-red-500';
                  const pctBg =
                    pct >= 70
                      ? 'bg-emerald-50 border-emerald-200'
                      : pct >= 30
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-red-50 border-red-200';
                  const barColor = pct >= 70 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444';

                  return (
                    <div
                      key={tracker.id}
                      className="p-4 border border-gray-100 rounded-xl bg-gray-50/30"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-dark-primary truncate">
                            {book.name}
                          </h4>
                          {subject && (
                            <p className="text-[10px] font-semibold text-gray-500 mt-0.5">
                              {subject.name}
                            </p>
                          )}
                        </div>
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-lg border ${pctBg} shrink-0 ml-2`}
                        >
                          <span className={`text-xs font-black ${pctColor}`}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[9px] font-bold text-gray-500">
                        <span className="text-emerald-600">✓ {tracker.completed}</span>
                        <span className="text-blue-600">◔ {tracker.in_progress}</span>
                        <span className="text-gray-400">○ {tracker.not_started}</span>
                        <span>Total: {tracker.total_lessons}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Loading State ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 text-center bg-light-bg min-h-screen flex items-center justify-center font-bold text-dark-primary">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mr-3"></div>
        Loading Tracker...
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-light-bg font-sans">
      {/* Simplified Header — no filter dropdowns */}
      <div className="bg-white border-b p-6 shadow-sm">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-2xl font-black flex items-center gap-2">Syllabus Tracker</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={openAddWorkModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <i className="fas fa-plus"></i> Add Work
            </button>
            <label className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-xl cursor-pointer text-xs font-bold text-brand-primary select-none hover:bg-brand-primary/15 transition-colors">
              <input
                type="checkbox"
                checked={coverMode}
                onChange={(e) => handleCoverModeChange(e.target.checked)}
                className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
              />
              Cover for Absent Teacher
            </label>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6 overflow-y-auto pb-24">
        <div className="flex gap-4 border-b mb-6 pb-2">
          {[
            { key: 'teacher-activity', label: 'My Activity', icon: 'fa-list-check' },
            { key: 'teacher-progress', label: 'My Progress', icon: 'fa-book' },
            { key: 'class-progress', label: 'Class Progress', icon: 'fa-chart-pie' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
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

        {activeTab === 'teacher-activity' && renderMyWork()}
        {activeTab === 'class-progress' && renderSyllabusProgress()}
        {activeTab === 'teacher-progress' && renderMyBooks()}
      </div>

      {/* ─── Add Work Modal ─── */}
      {isAddWorkModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-light-border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-light-border">
              <h3 className="text-sm font-black text-dark-deepblue uppercase tracking-wider">
                Add Log Entry
              </h3>
              <button
                type="button"
                onClick={() => setIsAddWorkModalOpen(false)}
                className="text-gray-400 hover:text-dark-primary font-bold text-lg p-1 cursor-pointer"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Favorites pills */}
            {favorites.length > 0 && (
              <div className="mb-4 p-2.5 bg-amber-50/50 border border-amber-100 rounded-xl">
                <p className="text-[9px] font-extrabold text-amber-800 uppercase mb-2 flex items-center gap-1">
                  <i className="fas fa-star text-amber-500" /> Favorites
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {favorites.map((fav, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyFavorite(fav)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        String(awClassId) === String(fav.classId) &&
                        String(awBookId) === String(fav.bookId)
                          ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-amber-50 hover:text-amber-800'
                      }`}
                    >
                      <i className="fas fa-star text-amber-400 text-[8px] mr-1" />
                      {fav.className} - {fav.bookName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAddWorkSubmit} className="space-y-4">
              {/* Class */}
              <div>
                <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                  Class
                </label>
                <select
                  value={awClassId}
                  onChange={(e) => {
                    setAwClassId(e.target.value);
                    setAwClassificationId('');
                    setAwSubjectId('');
                    setAwBookId('');
                    setAwBookData([]);
                    setAwLevel1('');
                    setAwLevel2('');
                    setAwLevel3('');
                  }}
                  className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft"
                >
                  <option value="">Select Class</option>
                  {awClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.class_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Classification */}
              {awClassId && (
                <div>
                  <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                    Classification
                  </label>
                  <select
                    value={awClassificationId}
                    onChange={(e) => {
                      setAwClassificationId(e.target.value);
                      setAwSubjectId('');
                      setAwBookId('');
                      setAwBookData([]);
                      setAwLevel1('');
                      setAwLevel2('');
                      setAwLevel3('');
                    }}
                    className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft"
                  >
                    <option value="">All Classifications</option>
                    {awActiveClassifications.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject */}
              {awClassId && (
                <div>
                  <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                    Subject
                  </label>
                  <select
                    value={awSubjectId}
                    onChange={(e) => {
                      setAwSubjectId(e.target.value);
                      setAwBookId('');
                      setAwBookData([]);
                      setAwLevel1('');
                      setAwLevel2('');
                      setAwLevel3('');
                    }}
                    className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft"
                  >
                    <option value="">Select Subject</option>
                    {awActiveSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Book + Add Level1 */}
              {awSubjectId && (
                <div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                        Book
                      </label>
                      <select
                        value={awBookId}
                        onChange={(e) => setAwBookId(e.target.value)}
                        className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft"
                      >
                        <option value="">Select Book</option>
                        {awFilteredBooks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {awBookId && (
                      <button
                        type="button"
                        onClick={() => {
                          setInlineAddType('level1');
                          setInlineAddName('');
                        }}
                        className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold border border-emerald-200 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        + Add {awLabels.lvl1}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Level1 + Add Level2 */}
              {awBookId && awLevel1sWithRevision.length > 0 && (
                <div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                        {awLabels.lvl1}
                      </label>
                      <select
                        value={awLevel1}
                        onChange={(e) => {
                          setAwLevel1(e.target.value);
                          setAwLevel2('');
                          setAwLevel3('');
                        }}
                        className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft"
                      >
                        <option value="">Select {awLabels.lvl1}</option>
                        {awLevel1sWithRevision.map((l) => (
                          <option key={l} value={l}>
                            {l === '_Revision' ? '📝 Revision' : l}
                          </option>
                        ))}
                      </select>
                    </div>
                    {awLevel1 && !isRevisionMode && awLabels.levels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setInlineAddType('level2');
                          setInlineAddName('');
                          setInlineAddPageCount(0);
                          setInlineAddComplexity('Easy');
                          setInlineAddWithLevel3(false);
                          setInlineAddLevel3Name('');
                        }}
                        className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold border border-emerald-200 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        + Add {awLabels.lvl2}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Revision mode indicator */}
              {isRevisionMode && awLevel1 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <p className="text-[10px] font-extrabold text-purple-800 uppercase flex items-center gap-1.5">
                    <i className="fas fa-rotate text-purple-500" /> Revision Mode
                  </p>
                  <p className="text-[10px] text-purple-600 mt-1">
                    Select reason and type below. Progress is not tracked for revisions.
                  </p>
                </div>
              )}

              {/* Level2 + Add Level3 */}
              {awLevel1 && awLevel2s.length > 0 && (
                <div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                        {isRevisionMode ? 'Reason' : awLabels.lvl2}
                      </label>
                      <select
                        value={awLevel2}
                        onChange={(e) => {
                          setAwLevel2(e.target.value);
                          setAwLevel3('');
                        }}
                        className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft"
                      >
                        <option value="">Select {isRevisionMode ? 'Reason' : awLabels.lvl2}</option>
                        {awLevel2s.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    {awLevel2 && !isRevisionMode && awLabels.levels.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          setInlineAddType('level3');
                          setInlineAddName('');
                          setInlineAddPageCount(0);
                          setInlineAddComplexity('Easy');
                        }}
                        className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold border border-emerald-200 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        + Add {awLabels.lvl3}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Level3 */}
              {awLevel2 && awLevel3s.length > 0 && (
                <div>
                  <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                    {isRevisionMode ? 'Type' : awLabels.lvl3}
                  </label>
                  <select
                    value={awLevel3}
                    onChange={(e) => setAwLevel3(e.target.value)}
                    className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft"
                  >
                    <option value="">Select {isRevisionMode ? 'Type' : awLabels.lvl3}</option>
                    {awLevel3s.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Inline Add Level Form */}
              {inlineAddType && (
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-extrabold text-emerald-800 uppercase">
                      New{' '}
                      {inlineAddType === 'level1'
                        ? awLabels.lvl1
                        : inlineAddType === 'level2'
                          ? awLabels.lvl2
                          : awLabels.lvl3}
                    </p>
                    <button
                      type="button"
                      onClick={() => setInlineAddType(null)}
                      className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>

                  {/* Name field (always shown) */}
                  <input
                    type="text"
                    placeholder={`${inlineAddType === 'level1' ? awLabels.lvl1 : inlineAddType === 'level2' ? awLabels.lvl2 : awLabels.lvl3} Name`}
                    value={inlineAddName}
                    onChange={(e) => setInlineAddName(e.target.value)}
                    className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-300"
                  />

                  {/* Level1: NO page/complexity */}

                  {/* Level2: Conditional page/complexity based on Level3 existence */}
                  {inlineAddType === 'level2' && level3ExistsForLevel1(awLevel1) && (
                    <label className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 p-2 rounded-xl border border-indigo-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inlineAddWithLevel3}
                        onChange={(e) => {
                          setInlineAddWithLevel3(e.target.checked);
                          setInlineAddLevel3Name('');
                        }}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      Add with {awLabels.lvl3}?
                    </label>
                  )}

                  {/* Level3 name when toggle is on */}
                  {inlineAddType === 'level2' && inlineAddWithLevel3 && (
                    <input
                      type="text"
                      placeholder={`${awLabels.lvl3} Name`}
                      value={inlineAddLevel3Name}
                      onChange={(e) => setInlineAddLevel3Name(e.target.value)}
                      className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  )}

                  {/* Page/Complexity: shown for Level3 always, Level2 always (it's leaf or has toggle), but NOT for Level1 */}
                  {inlineAddType !== 'level1' && (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">
                          Page Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={inlineAddPageCount}
                          onChange={(e) => setInlineAddPageCount(Number(e.target.value))}
                          className="w-full bg-white border rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">
                          Complexity
                        </label>
                        <select
                          value={inlineAddComplexity}
                          onChange={(e) => setInlineAddComplexity(e.target.value)}
                          className="w-full bg-white border rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-300"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Complex">Complex</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleInlineAddLevel}
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submitting
                      ? 'Adding...'
                      : `Add ${inlineAddType === 'level1' ? awLabels.lvl1 : inlineAddType === 'level2' ? awLabels.lvl2 : awLabels.lvl3}`}
                  </button>
                </div>
              )}

              {/* Status & Progress — only for leaf nodes in non-revision mode */}
              {isLeafNodeSelected && !isRevisionMode && (
                <>
                  <div>
                    <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                      Status
                    </label>
                    <select
                      value={awStatus}
                      onChange={(e) => handleAwStatusChange(e.target.value)}
                      className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft"
                    >
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                      Progress ({awProgress}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={awProgress}
                      onChange={(e) => handleAwProgressChange(Number(e.target.value))}
                      className="w-full accent-brand-primary"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </>
              )}

              {/* Revision status indicator */}
              {isRevisionMode && awLevel3 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                    Status: Revision
                  </span>
                  <span className="text-[10px] text-purple-600 font-semibold">
                    Revision counter will be incremented
                  </span>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={awDate}
                  max={todayStr}
                  onChange={(e) => setAwDate(e.target.value)}
                  className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft"
                />
              </div>

              {/* Comments */}
              <div>
                <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                  Comments
                </label>
                <textarea
                  value={awComments}
                  onChange={(e) => setAwComments(e.target.value)}
                  placeholder="Optional comments..."
                  rows={2}
                  className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft resize-none"
                />
              </div>

              {/* Map Book to Class section */}
              {awClassId && (
                <div className="pt-2 border-t border-light-border">
                  {!showAddBookMappingForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddBookMappingForm(true)}
                      className="text-xs font-bold text-brand-primary hover:text-brand-primary/80 flex items-center gap-1 cursor-pointer"
                    >
                      <i className="fas fa-plus-circle" /> Add Book (Map to Class)
                    </button>
                  ) : (
                    <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-150 space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">
                          Map Book to Class
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddBookMappingForm(false);
                            setAbClassificationId('');
                            setAbSubjectId('');
                            setAbBookId('');
                          }}
                          className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>

                      {/* Map Book: Classification */}
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">
                          Classification
                        </label>
                        <select
                          value={abClassificationId}
                          onChange={(e) => {
                            setAbClassificationId(e.target.value);
                            setAbSubjectId('');
                            setAbBookId('');
                          }}
                          className="w-full bg-white border rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <option value="">Select Classification</option>
                          {abActiveClassifications.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Map Book: Subject */}
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">
                          Subject
                        </label>
                        <select
                          value={abSubjectId}
                          onChange={(e) => {
                            setAbSubjectId(e.target.value);
                            setAbBookId('');
                          }}
                          className="w-full bg-white border rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-300"
                          disabled={!abClassificationId}
                        >
                          <option value="">Select Subject</option>
                          {abActiveSubjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Map Book: Book */}
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">
                          Book
                        </label>
                        <select
                          value={abBookId}
                          onChange={(e) => setAbBookId(e.target.value)}
                          className="w-full bg-white border rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-300"
                          disabled={!abSubjectId}
                        >
                          <option value="">Select Book</option>
                          {abFilteredBooks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleMapBookToClass}
                        disabled={submitting || !abBookId}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? 'Mapping...' : 'Add Mapping'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center gap-2 pt-3 border-t border-light-border">
                <button
                  type="button"
                  onClick={() =>
                    handleAddToFavorite(awClassId, awClassificationId, awSubjectId, awBookId)
                  }
                  disabled={!awClassId || !awBookId}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold border border-amber-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <i className="fas fa-star text-amber-500 text-[10px]" /> Add to Favorite
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetAddWorkModal}
                    className="px-4 py-2 border border-light-border hover:bg-light-ui rounded-xl text-xs font-bold text-dark-soft transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Favorites Override Modal ─── */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-light-border">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-light-border">
              <h3 className="text-sm font-black text-dark-deepblue uppercase tracking-wider">
                Maximum Favorites Reached
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsOverrideModalOpen(false);
                  setPendingFavorite(null);
                }}
                className="text-gray-400 hover:text-dark-primary font-bold text-lg p-1 cursor-pointer"
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4 font-semibold">
              You can have up to 8 favorites. Select one to override:
            </p>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {favorites.map((fav, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                    overrideSelection === fav.key
                      ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="override-fav"
                    value={fav.key}
                    checked={overrideSelection === fav.key}
                    onChange={() => setOverrideSelection(fav.key)}
                    className="w-4 h-4 text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <p className="text-xs font-bold text-dark-primary">{fav.key}</p>
                    <p className="text-[10px] text-gray-500">{fav.subjectName}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsOverrideModalOpen(false);
                  setPendingFavorite(null);
                }}
                className="px-4 py-2 border hover:bg-light-ui rounded-xl text-xs font-bold text-dark-soft transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOverrideFavorite}
                disabled={!overrideSelection}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                Override Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyllabusTracker;
