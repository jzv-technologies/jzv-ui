// src/components/portals/teacher/SyllabusTracker.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';

const SyllabusTracker = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teacher, setTeacher] = useState(null);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [books, setBooks] = useState([]);
  const [syllabusData, setSyllabusData] = useState([]);
  const [classifications, setClassifications] = useState([]);

  // Filter selections (persisted per teacher)
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassificationId, setSelectedClassificationId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

  // New data model state
  const [lessonLogs, setLessonLogs] = useState([]); // lesson_tracker_log entries
  const [logItems, setLogItems] = useState({}); // { [lt_log_id]: [...items] }
  const [bookTrackers, setBookTrackers] = useState([]); // book_tracker entries
  const [expandedLogItems, setExpandedLogItems] = useState({}); // { [lt_log_id]: true/false }

  // Favorites & Recently Updated
  const [favorites, setFavorites] = useState([]);
  const [recentBooks, setRecentBooks] = useState([]);

  // UI state
  const [coverMode, setCoverMode] = useState(false);
  const [activeTab, setActiveTab] = useState('curriculum');
  const [expandedLvl1, setExpandedLvl1] = useState({});
  const [expandedLvl2, setExpandedLvl2] = useState({});
  const [selectedNodes, setSelectedNodes] = useState([]);

  // Bulk log entry modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('in_progress');
  const [bulkProgress, setBulkProgress] = useState(50);
  const [bulkComments, setBulkComments] = useState('');

  // Single log entry modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalLessonId, setLogModalLessonId] = useState(null);
  const [logModalStatus, setLogModalStatus] = useState('in_progress');
  const [logModalProgress, setLogModalProgress] = useState(50);
  const [logModalComments, setLogModalComments] = useState('');
  const [logModalIsRevision, setLogModalIsRevision] = useState(false);

  // Add syllabus item modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState('level3');
  const [addLevel1Name, setAddLevel1Name] = useState('');
  const [addLevel2Name, setAddLevel2Name] = useState('');
  const [addLevel3Name, setAddLevel3Name] = useState('');
  const [addPageCount, setAddPageCount] = useState(0);
  const [addComplexity, setAddComplexity] = useState('Easy');
  const [selectedAddLevel1, setSelectedAddLevel1] = useState('');
  const [selectedAddLevel2, setSelectedAddLevel2] = useState('');

  // ─── Persistence Helpers ──────────────────────────────────────────────────

  const getFilterKey = useCallback(() => {
    return teacher?.id ? `jzv_syllabus_filters_${teacher.id}` : 'jzv_syllabus_filters';
  }, [teacher]);

  const getFavoritesKey = useCallback(() => {
    return teacher?.id ? `jzv_syllabus_favorites_${teacher.id}` : 'jzv_syllabus_favorites';
  }, [teacher]);

  const getRecentKey = useCallback(() => {
    return teacher?.id ? `jzv_syllabus_recent_${teacher.id}` : 'jzv_syllabus_recent';
  }, [teacher]);

  const persistFilters = useCallback((classId, classificationId, subjectId, bookId) => {
    try {
      localStorage.setItem(getFilterKey(), JSON.stringify({
        classId, classificationId, subjectId, bookId
      }));
    } catch (e) { /* ignore */ }
  }, [getFilterKey]);

  const restoreFilters = useCallback(() => {
    try {
      const raw = localStorage.getItem(getFilterKey());
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }, [getFilterKey]);

  const updateRecentBooks = useCallback((classId, subjectId, bookId) => {
    try {
      const key = getRecentKey();
      const raw = localStorage.getItem(key);
      let recent = raw ? JSON.parse(raw) : [];

      const cName = classes.find(c => String(c.id) === String(classId))?.name || 'Class';
      const sName = subjects.find(s => String(s.id) === String(subjectId))?.name || 'Subject';
      const bName = books.find(b => String(b.id) === String(bookId))?.name || 'Book';

      // Remove existing entry for same combo
      recent = recent.filter(r =>
        !(String(r.classId) === String(classId) &&
          String(r.subjectId) === String(subjectId) &&
          String(r.bookId) === String(bookId))
      );

      // Add to front
      recent.unshift({
        classId, subjectId, bookId,
        className: cName, subjectName: sName, bookName: bName,
        lastUpdated: new Date().toISOString()
      });

      // Keep last 10 (as requested: "10")
      recent = recent.slice(0, 10);
      localStorage.setItem(key, JSON.stringify(recent));
      setRecentBooks(recent);
    } catch (e) { /* ignore */ }
  }, [getRecentKey, classes, subjects, books]);

  // ─── Data Loading ──────────────────────────────────────────────────

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        if (!user || !user.id) throw new Error('User session not found.');
        const { data: teacherData, error: teachErr } = await supabase
          .from('teachers').select('*').eq('auth_id', user.id).maybeSingle();
        if (teachErr) throw teachErr;
        if (!teacherData) throw new Error('User not mapped to Teacher record.');
        setTeacher(teacherData);

        const [
          { data: dbClasses }, { data: dbSubjects }, { data: dbAssignments },
          { data: dbBooks }, { data: dbSyllabusData }, { data: dbClassifications }
        ] = await Promise.all([
          supabase.from('classes').select('*'),
          supabase.from('subjects').select('*'),
          supabase.from('class_assignments').select('*').eq('teacher_id', teacherData.id),
          supabase.from('syllabus_books').select('*'),
          supabase.from('syllabus_book_lessons').select('*'),
          supabase.from('classifications').select('*')
        ]);

        setClasses(dbClasses || []);
        setSubjects(dbSubjects || []);
        setAssignments(dbAssignments || []);
        setClassifications(dbClassifications || []);
        setBooks(dbBooks || []);
        setSyllabusData(dbSyllabusData || []);

        // Restore persisted filters or auto-select
        const savedFilters = restoreFilters();
        const assignedClassIds = (dbAssignments || []).map(a => String(a.class_id));
        const filteredClasses = (dbClasses || []).filter(c => assignedClassIds.includes(String(c.id)));

        if (savedFilters?.classId && (dbClasses || []).some(c => String(c.id) === String(savedFilters.classId))) {
          setSelectedClassId(savedFilters.classId);
          setSelectedClassificationId(savedFilters.classificationId || '');
          setSelectedSubjectId(savedFilters.subjectId || '');
          setSelectedBookId(savedFilters.bookId || '');
        } else if (filteredClasses.length > 0) {
          setSelectedClassId(String(filteredClasses[0].id));
        }

        // Load favorites
        try {
          const favKey = teacherData.id ? `jzv_syllabus_favorites_${teacherData.id}` : 'jzv_syllabus_favorites';
          const stored = localStorage.getItem(favKey);
          setFavorites(stored ? JSON.parse(stored) : []);
        } catch (e) { setFavorites([]); }

        // Load recent books
        try {
          const recKey = teacherData.id ? `jzv_syllabus_recent_${teacherData.id}` : 'jzv_syllabus_recent';
          const stored = localStorage.getItem(recKey);
          setRecentBooks(stored ? JSON.parse(stored) : []);
        } catch (e) { setRecentBooks([]); }

      } catch (err) {
        console.warn('SyllabusTracker init failed:', err.message);
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
          setSyllabusData(parsed.syllabusData || []);
          setSubjects(parsed.subjects || []);
        } catch (e) {}
      }
      const rawTimetable = localStorage.getItem('jzv_timetable_local_data');
      if (rawTimetable) {
        try {
          const parsed = JSON.parse(rawTimetable);
          setClasses(parsed.classes || []);
          setClassifications(parsed.classifications || []);
          const matchedTeacher = (parsed.teachers || []).find(
            t => String(t.auth_id) === String(user?.id) || String(t.id) === String(user?.id)
          );
          if (matchedTeacher) {
            setTeacher(matchedTeacher);
            const localAssignments = (parsed.assignments || []).filter(
              a => String(a.teacher_id) === String(matchedTeacher.id)
            );
            setAssignments(localAssignments);
            const assignedClassIds = localAssignments.map(a => String(a.class_id));
            const filteredClasses = (parsed.classes || []).filter(c => assignedClassIds.includes(String(c.id)));
            if (filteredClasses.length > 0) setSelectedClassId(String(filteredClasses[0].id));
          }
        } catch (e) {}
      }
    };

    initData();
  }, [user]);

  // ─── Persist filters on change ──────────────────────────────────────

  useEffect(() => {
    if (teacher && selectedClassId) {
      persistFilters(selectedClassId, selectedClassificationId, selectedSubjectId, selectedBookId);
    }
  }, [selectedClassId, selectedClassificationId, selectedSubjectId, selectedBookId, teacher, persistFilters]);

  // ─── Dynamic filter lists ──────────────────────────────────────────

  const activeClasses = coverMode
    ? classes
    : classes.filter(c => assignments.some(a => String(a.class_id) === String(c.id)));

  const filteredSubjects = coverMode
    ? subjects
    : subjects.filter(s => assignments.some(a =>
        String(a.class_id) === String(selectedClassId) && String(a.subject_id) === String(s.id)
      ));

  const activeClassifications = classifications.filter(c =>
    filteredSubjects.some(s => String(s.classification_id) === String(c.id))
  );

  const activeSubjects = selectedClassificationId
    ? filteredSubjects.filter(s => String(s.classification_id) === String(selectedClassificationId))
    : filteredSubjects;

  const filteredBooks = books.filter(b => String(b.subject_id) === String(selectedSubjectId));

  // ─── Auto-selection cascades ──────────────────────────────────────

  useEffect(() => {
    if (activeClasses.length > 0) {
      if (!activeClasses.some(c => String(c.id) === String(selectedClassId))) {
        setSelectedClassId(String(activeClasses[0].id));
      }
    } else {
      setSelectedClassId('');
    }
  }, [coverMode, classes, assignments]);

  useEffect(() => {
    if (selectedClassificationId && !filteredSubjects.some(s => String(s.classification_id) === String(selectedClassificationId))) {
      setSelectedClassificationId('');
    }
  }, [selectedClassId, coverMode, filteredSubjects]);

  useEffect(() => {
    if (activeSubjects.length > 0) {
      if (!activeSubjects.some(s => String(s.id) === String(selectedSubjectId))) {
        setSelectedSubjectId(String(activeSubjects[0].id));
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedClassId, coverMode, selectedClassificationId, assignments, subjects, activeSubjects]);

  useEffect(() => {
    if (filteredBooks.length > 0) {
      if (!filteredBooks.some(b => String(b.id) === String(selectedBookId))) {
        setSelectedBookId(String(filteredBooks[0].id));
      }
    } else {
      setSelectedBookId('');
    }
    setSelectedNodes([]);
  }, [selectedSubjectId, books]);

  // ─── Fetch lesson logs & book tracker ──────────────────────────────

  const fetchLessonLogs = async () => {
    if (!selectedClassId) return;
    try {
      const { data, error } = await supabase
        .from('lesson_tracker_log')
        .select('*')
        .eq('class_id', selectedClassId);
      if (error) throw error;
      setLessonLogs(data || []);
    } catch (err) {
      console.warn('Failed to fetch lesson logs:', err.message);
      setLessonLogs([]);
    }
  };

  const fetchBookTrackers = async () => {
    if (!selectedClassId) return;
    try {
      const { data, error } = await supabase
        .from('book_tracker')
        .select('*')
        .eq('class_id', selectedClassId);
      if (error) throw error;
      setBookTrackers(data || []);
    } catch (err) {
      console.warn('Failed to fetch book trackers:', err.message);
      setBookTrackers([]);
    }
  };

  const fetchLogItemsForLog = async (ltLogId) => {
    try {
      const { data, error } = await supabase
        .from('lesson_tracker_log_items')
        .select('*, teacher:teachers(name)')
        .eq('lt_log_id', ltLogId)
        .order('date', { ascending: false });
      if (error) throw error;
      setLogItems(prev => ({ ...prev, [ltLogId]: data || [] }));
    } catch (err) {
      console.warn('Failed to fetch log items:', err.message);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchLessonLogs();
      fetchBookTrackers();
    }
  }, [selectedClassId]);

  // ─── Helpers ──────────────────────────────────────────────────────

  const getLessonLog = (lessonId) =>
    lessonLogs.find(l => String(l.lesson_id) === String(lessonId));

  const getBookTracker = (bookId) =>
    bookTrackers.find(bt => String(bt.book_id) === String(bookId));

  const activeBook = filteredBooks.find(b => String(b.id) === String(selectedBookId));
  const bookData = syllabusData.filter(d => String(d.book_id) === String(selectedBookId));
  const rawLevels = (activeBook?.hierarchy_type || 'Unit, Chapter, Lesson')
    .split(/[,>]/)
    .map(s => s.trim())
    .filter(Boolean);
  
  const bookLevels = (rawLevels[0] && rawLevels[0].toLowerCase().includes('book') && rawLevels.length > 1)
    ? rawLevels.slice(1)
    : rawLevels;

  const lvl1Label = bookLevels[0] || 'Unit';
  const lvl2Label = bookLevels[1] || 'Chapter';
  const lvl3Label = bookLevels[2] || 'Lesson';

  useEffect(() => {
    if (selectedBookId && bookData.length > 0) {
      const lvl1s = {};
      const lvl2s = {};
      bookData.forEach(n => {
        if (n.level1) lvl1s[n.level1] = true;
        if (n.level1 && n.level2) lvl2s[`${n.level1}-${n.level2}`] = true;
      });
      setExpandedLvl1(lvl1s);
      setExpandedLvl2(lvl2s);
    }
  }, [selectedBookId, bookData]);

  // ─── Core Actions ──────────────────────────────────────────────────

  const ensureLessonLog = async (classId, lessonId) => {
    // Check if log already exists
    const existing = lessonLogs.find(
      l => String(l.class_id) === String(classId) && String(l.lesson_id) === String(lessonId)
    );
    if (existing) return existing;

    const { data, error } = await supabase
      .from('lesson_tracker_log')
      .upsert([{
        class_id: classId,
        lesson_id: lessonId,
        start_date: logDate,
        current_status: 'not_started'
      }], { onConflict: 'class_id,lesson_id' })
      .select();
    if (error) throw error;
    return data[0];
  };

  const addLogItem = async (ltLogId, date, teacherId, status, progress, comments, isRevision) => {
    const { error } = await supabase
      .from('lesson_tracker_log_items')
      .insert([{
        lt_log_id: ltLogId,
        date: date,
        teacher_id: teacherId,
        current_status: status,
        progress: progress,
        is_revision: isRevision ? 'Y' : 'N',
        comments: comments || null
      }]);
    if (error) throw error;
  };

  // ─── Single Lesson Log Entry ──────────────────────────────────────

  const openLogModal = (lessonId) => {
    const log = getLessonLog(lessonId);
    setLogModalLessonId(lessonId);
    setLogModalStatus(log?.current_status === 'completed' ? 'completed' : 'in_progress');
    setLogModalProgress(Number(log?.completion_percentage) || 50);
    setLogModalComments('');
    setLogModalIsRevision(false);
    setIsLogModalOpen(true);
  };

  const handleLogItemSubmit = async (e) => {
    e.preventDefault();
    if (!logModalLessonId) return;
    setSubmitting(true);
    try {
      const log = await ensureLessonLog(selectedClassId, logModalLessonId);
      await addLogItem(
        log.id,
        logDate,
        teacher?.id,
        logModalStatus,
        logModalProgress,
        logModalComments,
        logModalIsRevision
      );

      // Update recent books
      updateRecentBooks(selectedClassId, selectedSubjectId, selectedBookId);

      showToast('Log entry added!', 'success');
      setIsLogModalOpen(false);
      await fetchLessonLogs();
      await fetchBookTrackers();

      // Refresh items if expanded
      if (expandedLogItems[log.id]) {
        await fetchLogItemsForLog(log.id);
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Bulk Log Entry ──────────────────────────────────────────────

  const openBulkModal = () => {
    if (selectedNodes.length === 0) return;
    setBulkStatus('in_progress');
    setBulkProgress(50);
    setBulkComments('');
    setIsBulkModalOpen(true);
  };

  const handleBulkLogSubmit = async (e) => {
    e.preventDefault();
    if (selectedNodes.length === 0) return;
    setSubmitting(true);
    try {
      for (const lessonId of selectedNodes) {
        const log = await ensureLessonLog(selectedClassId, lessonId);
        await addLogItem(
          log.id,
          logDate,
          teacher?.id,
          bulkStatus,
          bulkProgress,
          bulkComments,
          false // bulk entries are not revisions
        );
      }

      // Update recent books
      updateRecentBooks(selectedClassId, selectedSubjectId, selectedBookId);

      showToast(`Log entry added for ${selectedNodes.length} lessons!`, 'success');
      setIsBulkModalOpen(false);
      setSelectedNodes([]);
      await fetchLessonLogs();
      await fetchBookTrackers();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Add Syllabus Item ──────────────────────────────────────────────

  const handleAddSyllabusItem = async (e) => {
    e.preventDefault();
    if (!selectedBookId) return;

    let targetLevel1 = '';
    let targetLevel2 = null;
    let targetLevel3 = null;

    if (addType === 'level1') {
      if (!addLevel1Name.trim()) return showToast('Unit name is required.', 'warning');
      targetLevel1 = addLevel1Name.trim();
    } else if (addType === 'level2') {
      targetLevel1 = selectedAddLevel1;
      if (!targetLevel1) return showToast('Please select a Unit.', 'warning');
      if (!addLevel2Name.trim()) return showToast('Section name is required.', 'warning');
      targetLevel2 = addLevel2Name.trim();
    } else if (addType === 'level3') {
      targetLevel1 = selectedAddLevel1;
      if (!targetLevel1) return showToast('Please select a Unit.', 'warning');
      targetLevel2 = selectedAddLevel2 || 'General';
      if (!addLevel3Name.trim()) return showToast('Lesson/Topic name is required.', 'warning');
      targetLevel3 = addLevel3Name.trim();
    }

    setSubmitting(true);
    try {
      const recordData = {
        book_id: selectedBookId,
        level1: targetLevel1,
        level2: targetLevel2,
        level3: targetLevel3,
        page_count: Number(addPageCount) || 0,
        complexity: addComplexity || 'Easy',
      };

      // Search for placeholder to update
      let placeholder = null;
      if (targetLevel3) {
        placeholder = syllabusData.find(
          d => String(d.book_id) === String(selectedBookId) &&
               d.level1 === targetLevel1 &&
               (d.level2 || 'General') === targetLevel2 &&
               !d.level3
        );
      } else if (targetLevel2) {
        placeholder = syllabusData.find(
          d => String(d.book_id) === String(selectedBookId) &&
               d.level1 === targetLevel1 &&
               !d.level2 && !d.level3
        );
      } else {
        const exists = syllabusData.some(
          d => String(d.book_id) === String(selectedBookId) && d.level1 === targetLevel1
        );
        if (exists) throw new Error(`Unit "${targetLevel1}" already exists in this book.`);
      }

      let updatedData = [...syllabusData];

      if (placeholder) {
        const { data: updatedRes, error } = await supabase
          .from('syllabus_book_lessons').update(recordData).eq('id', placeholder.id).select();
        if (error) throw error;
        updatedData = updatedData.map(d => String(d.id) === String(placeholder.id) ? updatedRes[0] : d);
      } else {
        const { data: insertedRes, error } = await supabase
          .from('syllabus_book_lessons').insert([recordData]).select();
        if (error) throw error;
        updatedData.push(insertedRes[0]);
      }

      setSyllabusData(updatedData);
      showToast('Syllabus item added!', 'success');
      setIsAddModalOpen(false);
      setAddLevel1Name(''); setAddLevel2Name(''); setAddLevel3Name('');
      setAddPageCount(0); setAddComplexity('Easy');
      setSelectedAddLevel1(''); setSelectedAddLevel2('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Favorites ──────────────────────────────────────────────────

  const toggleFavorite = () => {
    if (!selectedClassId || !selectedSubjectId || !selectedBookId) return;
    const key = getFavoritesKey();
    const cName = classes.find(c => String(c.id) === String(selectedClassId))?.name || 'Class';
    const sName = subjects.find(s => String(s.id) === String(selectedSubjectId))?.name || 'Subject';
    const bName = books.find(b => String(b.id) === String(selectedBookId))?.name || 'Book';

    const existsIdx = favorites.findIndex(f =>
      String(f.classId) === String(selectedClassId) &&
      String(f.subjectId) === String(selectedSubjectId) &&
      String(f.bookId) === String(selectedBookId)
    );

    let newFavs = [...favorites];
    if (existsIdx > -1) {
      newFavs.splice(existsIdx, 1);
      showToast('Removed from Quick Access', 'info');
    } else {
      newFavs.push({ classId: selectedClassId, subjectId: selectedSubjectId, bookId: selectedBookId, className: cName, subjectName: sName, bookName: bName });
      showToast('Added to Quick Access', 'success');
    }
    setFavorites(newFavs);
    localStorage.setItem(key, JSON.stringify(newFavs));
  };

  const applyQuickAccess = (item) => {
    setSelectedClassId(item.classId);
    const subObj = subjects.find(s => String(s.id) === String(item.subjectId));
    if (subObj && subObj.classification_id) {
      setSelectedClassificationId(String(subObj.classification_id));
    } else {
      setSelectedClassificationId('');
    }
    setSelectedSubjectId(item.subjectId);
    setSelectedBookId(item.bookId);
  };

  // ─── Selection Handlers ──────────────────────────────────────────

  // Determine which book nodes are the actual leaf nodes (trackable)
  const getBookLessons = useCallback(() => {
    return bookData.filter(n => {
      // If it has level3, it's a leaf node
      if (n.level3) return true;
      // If level2 exists but level3 is null, it's a leaf if no other node has level3 under this level1+level2
      if (n.level2 && !n.level3) {
        const hasL3 = bookData.some(o => o.level1 === n.level1 && (o.level2 || 'General') === n.level2 && o.level3);
        return !hasL3;
      }
      // If level1 exists but level2 and level3 are null, it's a leaf if no other node has level2 or level3 under this level1
      if (n.level1 && !n.level2 && !n.level3) {
        const hasL2orL3 = bookData.some(o => o.level1 === n.level1 && (o.level2 || o.level3));
        return !hasL2orL3;
      }
      return false;
    });
  }, [bookData]);

  const handleSelectNode = (nodeId) => {
    setSelectedNodes(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
  };

  const handleSelectBook = (checked) => {
    const bookLessons = getBookLessons();
    const allIds = bookLessons.map(n => n.id);
    setSelectedNodes(checked ? allIds : []);
  };

  const handleSelectLvl1 = (level1Name, checked) => {
    const bookLessons = getBookLessons();
    const ids = bookLessons.filter(n => n.level1 === level1Name).map(n => n.id);
    if (checked) setSelectedNodes(prev => [...new Set([...prev, ...ids])]);
    else setSelectedNodes(prev => prev.filter(id => !ids.includes(id)));
  };

  const handleSelectLvl2 = (level1Name, level2Name, checked) => {
    const bookLessons = getBookLessons();
    const ids = bookLessons.filter(n => n.level1 === level1Name && (n.level2 || 'General') === level2Name).map(n => n.id);
    if (checked) setSelectedNodes(prev => [...new Set([...prev, ...ids])]);
    else setSelectedNodes(prev => prev.filter(id => !ids.includes(id)));
  };

  const toggleLvl1 = (name) => setExpandedLvl1(prev => ({ ...prev, [name]: !prev[name] }));
  const toggleLvl2 = (key) => setExpandedLvl2(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleLogItemsExpand = async (ltLogId) => {
    const isExpanded = expandedLogItems[ltLogId];
    setExpandedLogItems(prev => ({ ...prev, [ltLogId]: !isExpanded }));
    if (!isExpanded && !logItems[ltLogId]) {
      await fetchLogItemsForLog(ltLogId);
    }
  };

  // ─── Status Badges ──────────────────────────────────────────────

  const getStatusBadge = (status) => {
    if (status === 'completed') return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Completed</span>;
    if (status === 'in_progress') return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">In Progress</span>;
    return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold">Not Started</span>;
  };

  // ─── Render Curriculum Tab ──────────────────────────────────────

  const renderCurriculum = () => {
    if (activeClasses.length === 0) {
      return (
        <div className="p-8 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          No allocated classes found. Enable "Cover for Absent Teacher" above to log progress for other classes.
        </div>
      );
    }
    if (!activeBook) {
      return (
        <div className="p-4 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          No syllabus book selected.
        </div>
      );
    }

    const bt = getBookTracker(selectedBookId);
    const level1Groups = [...new Set(bookData.map(n => n.level1))].filter(Boolean);
    const bookLessons = getBookLessons();
    const allBookNodeIds = bookLessons.map(n => n.id);
    const isAllBookChecked = allBookNodeIds.length > 0 && allBookNodeIds.every(id => selectedNodes.includes(id));

    return (
      <div className="space-y-6">
        {/* Book Level Summary */}
        <div className="bg-white p-4 border rounded-2xl shadow-sm flex items-center justify-between bg-gradient-to-r from-purple-50/70 to-indigo-50/70 border-purple-100/80">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isAllBookChecked}
              onChange={(e) => handleSelectBook(e.target.checked)}
              className="w-4.5 h-4.5 rounded text-purple-600 border-purple-300 focus:ring-purple-500 cursor-pointer"
            />
            <div>
              <h4 className="text-sm font-black text-purple-900">{activeBook.name}</h4>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-purple-700 mt-1 flex-wrap">
                {bt ? (
                  <>
                    <span>Completed: <strong className="font-black text-emerald-700">{bt.completed}</strong></span>
                    <span className="text-purple-300">|</span>
                    <span>In Progress: <strong className="font-black text-blue-700">{bt.in_progress}</strong></span>
                    <span className="text-purple-300">|</span>
                    <span>Not Started: <strong className="font-black text-gray-500">{bt.not_started}</strong></span>
                    <span className="text-purple-300">|</span>
                    <span>Total: <strong className="font-black text-purple-900">{bt.total_lessons}</strong></span>
                  </>
                ) : (
                  <span className="text-gray-400">No tracking data yet</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-purple-100 text-purple-900 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 select-none">
              <i className="fas fa-chart-line text-[10px]" />
              {bt ? `${Number(bt.completion_percentage).toFixed(0)}%` : '0%'}
            </span>
            <button
              onClick={() => {
                const l1Names = [...new Set(bookData.map(n => n.level1))].filter(Boolean);
                if (l1Names.length > 0) {
                  setSelectedAddLevel1(l1Names[0]);
                  const l2Names = [...new Set(bookData.filter(n => n.level1 === l1Names[0]).map(n => n.level2 || 'General'))].filter(Boolean);
                  setSelectedAddLevel2(l2Names[0] || '');
                } else {
                  setSelectedAddLevel1(''); setSelectedAddLevel2('');
                }
                setIsAddModalOpen(true);
              }}
              disabled={submitting}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <i className="fas fa-plus"></i> Add {lvl1Label}
            </button>
          </div>
        </div>

        {/* Book Progress Bar */}
        {bt && (
          <div className="bg-white p-3 border rounded-xl shadow-sm">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Number(bt.completion_percentage)}%`,
                  backgroundColor: Number(bt.completion_percentage) >= 70 ? '#10b981' : Number(bt.completion_percentage) >= 30 ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
          </div>
        )}

        {/* Accordion Units & Sections */}
        <div className="space-y-4">
          {level1Groups.map(level1Name => {
            const level1Nodes = bookData.filter(n => n.level1 === level1Name);
            const isLvl1Expanded = !!expandedLvl1[level1Name];
            const level2Groups = [...new Set(level1Nodes.map(n => n.level2).filter(Boolean))];

            // Check if level1 itself is a leaf
            const lvl1Lessons = bookLessons.filter(n => n.level1 === level1Name);
            const isLvl1Leaf = lvl1Lessons.length === 1 && !lvl1Lessons[0].level2 && !lvl1Lessons[0].level3;

            if (isLvl1Leaf) {
              const leafNode = lvl1Lessons[0];
              const log = getLessonLog(leafNode.id);
              const status = log?.current_status || 'not_started';
              const isLogExpanded = log && expandedLogItems[log.id];

              return (
                <div key={level1Name} className="bg-white border border-light-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center p-4 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedNodes.includes(leafNode.id)}
                        onChange={() => handleSelectNode(leafNode.id)}
                        className="w-4 h-4 rounded text-brand-primary border-light-border focus:ring-brand-primary cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-bold text-dark-primary">{level1Name}</span>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {getStatusBadge(status)}
                          {log && (
                            <>
                              <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                {Number(log.completion_percentage).toFixed(0)}%
                              </span>
                              <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                Days: {log.days_taken}
                              </span>
                              {log.revision_counter > 0 && (
                                <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                  Revised {log.revision_counter}x
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log && (
                        <button
                          onClick={() => toggleLogItemsExpand(log.id)}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          <i className={`fas fa-${isLogExpanded ? 'eye-slash' : 'eye'} mr-1`}></i>
                          History
                        </button>
                      )}
                      <button
                        onClick={() => openLogModal(leafNode.id)}
                        disabled={submitting}
                        className="px-2.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <i className="fas fa-plus text-[10px]"></i> Log Entry
                      </button>
                    </div>
                  </div>
                  {/* Expanded Log Items */}
                  {isLogExpanded && log && (
                    <div className="ml-7 mt-1 mb-2 bg-white border border-light-border rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-extrabold text-dark-soft uppercase mb-1">Log Entries</p>
                      {(logItems[log.id] || []).length === 0 ? (
                        <p className="text-xs text-gray-400">No entries yet.</p>
                      ) : (
                        (logItems[log.id] || []).map(item => (
                          <div key={item.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-700">{new Date(item.date).toLocaleDateString()}</span>
                                {getStatusBadge(item.current_status)}
                                <span className="text-gray-500 font-semibold">{Number(item.progress).toFixed(0)}%</span>
                                {item.teacher?.name && <span className="text-gray-400 font-semibold">by {item.teacher.name}</span>}
                                {item.is_revision === 'Y' && (
                                  <span className="text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 text-[9px]">Revision</span>
                                )}
                                {item.late_reporting === 'Y' && (
                                  <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 text-[9px]">Late</span>
                                )}
                              </div>
                              {item.comments && <p className="text-gray-500 mt-1">{item.comments}</p>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            }

            const allLvl1NodeIds = lvl1Lessons.map(n => n.id);
            const isAllLvl1Checked = allLvl1NodeIds.length > 0 && allLvl1NodeIds.every(id => selectedNodes.includes(id));
            const lvl1Completed = lvl1Lessons.filter(n => getLessonLog(n.id)?.current_status === 'completed').length;
            const lvl1InProgress = lvl1Lessons.filter(n => getLessonLog(n.id)?.current_status === 'in_progress').length;

            return (
              <div key={level1Name} className="bg-white border border-light-border rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50/50 border-b border-light-border select-none">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isAllLvl1Checked}
                      onChange={(e) => handleSelectLvl1(level1Name, e.target.checked)}
                      className="w-4 h-4 rounded text-brand-primary border-light-border focus:ring-brand-primary cursor-pointer"
                    />
                    <div className="cursor-pointer" onClick={() => toggleLvl1(level1Name)}>
                      <h3 className="text-sm font-bold text-dark-primary flex items-center gap-2">
                        {level1Name}
                        <i className={`fas fa-chevron-${isLvl1Expanded ? 'down' : 'right'} text-xs text-gray-400`}></i>
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {lvl1Completed}/{lvl1Lessons.length} completed
                        </span>
                        {lvl1InProgress > 0 && (
                          <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {lvl1InProgress} in progress
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Level 2 Accordions & Direct Lessons */}
                {isLvl1Expanded && (
                  <div className="p-4 space-y-4 bg-white pl-6">
                    {/* Direct Lessons under Level 1 (with no level2) */}
                    {lvl1Lessons.filter(n => !n.level2).map(node => {
                      const log = getLessonLog(node.id);
                      const status = log?.current_status || 'not_started';
                      const title = node.level3 || node.level2 || node.level1;
                      const isLogExpanded = log && expandedLogItems[log.id];

                      return (
                        <div key={node.id} className="border border-gray-150 rounded-xl overflow-hidden shadow-sm p-3 bg-gray-50/50 hover:border-brand-primary/30 transition-colors">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedNodes.includes(node.id)}
                                onChange={() => handleSelectNode(node.id)}
                                className="w-4 h-4 rounded text-brand-primary border-light-border focus:ring-brand-primary cursor-pointer"
                              />
                              <div>
                                <p className="text-xs font-bold text-dark-primary">{title}</p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {getStatusBadge(status)}
                                  {log && (
                                    <>
                                      <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                        {Number(log.completion_percentage).toFixed(0)}%
                                      </span>
                                      <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                        Days: {log.days_taken}
                                      </span>
                                      {log.revision_counter > 0 && (
                                        <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                          Revised {log.revision_counter}x
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {log && (
                                <button
                                  onClick={() => toggleLogItemsExpand(log.id)}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  <i className={`fas fa-${isLogExpanded ? 'eye-slash' : 'eye'} mr-1`}></i>
                                  History
                                </button>
                              )}
                              <button
                                onClick={() => openLogModal(node.id)}
                                disabled={submitting}
                                className="px-2.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                              >
                                <i className="fas fa-plus text-[10px]"></i> Log Entry
                              </button>
                            </div>
                          </div>
                          {/* Expanded Log Items */}
                          {isLogExpanded && log && (
                            <div className="mt-2 bg-white border border-light-border rounded-xl p-3 space-y-2">
                              <p className="text-[10px] font-extrabold text-dark-soft uppercase mb-1">Log Entries</p>
                              {(logItems[log.id] || []).length === 0 ? (
                                <p className="text-xs text-gray-400">No entries yet.</p>
                              ) : (
                                (logItems[log.id] || []).map(item => (
                                  <div key={item.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-gray-700">{new Date(item.date).toLocaleDateString()}</span>
                                        {getStatusBadge(item.current_status)}
                                        <span className="text-gray-500 font-semibold">{Number(item.progress).toFixed(0)}%</span>
                                        {item.teacher?.name && <span className="text-gray-400 font-semibold">by {item.teacher.name}</span>}
                                        {item.is_revision === 'Y' && (
                                          <span className="text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 text-[9px]">Revision</span>
                                        )}
                                        {item.late_reporting === 'Y' && (
                                          <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 text-[9px]">Late</span>
                                        )}
                                      </div>
                                      {item.comments && <p className="text-gray-500 mt-1">{item.comments}</p>}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {level2Groups.map(level2Name => {
                      const level2Nodes = level1Nodes.filter(n => (n.level2 || 'General') === level2Name);
                      const lvl2Key = `${level1Name}-${level2Name}`;
                      const isLvl2Expanded = !!expandedLvl2[lvl2Key];

                      const lvl2Lessons = bookLessons.filter(n => n.level1 === level1Name && (n.level2 || 'General') === level2Name);
                      const isLvl2Leaf = lvl2Lessons.length === 1 && !lvl2Lessons[0].level3;

                      if (isLvl2Leaf) {
                        const leafNode = lvl2Lessons[0];
                        const log = getLessonLog(leafNode.id);
                        const status = log?.current_status || 'not_started';
                        const isLogExpanded = log && expandedLogItems[log.id];

                        return (
                          <div key={level2Name} className="border border-gray-150 rounded-xl overflow-hidden shadow-sm">
                            <div className="flex justify-between items-center p-3.5 bg-gray-50/30">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedNodes.includes(leafNode.id)}
                                  onChange={() => handleSelectNode(leafNode.id)}
                                  className="w-4 h-4 rounded text-brand-primary border-light-border focus:ring-brand-primary cursor-pointer"
                                />
                                <div>
                                  <span className="text-xs font-bold text-dark-primary">{level2Name}</span>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {getStatusBadge(status)}
                                    {log && (
                                      <>
                                        <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                          {Number(log.completion_percentage).toFixed(0)}%
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                          Days: {log.days_taken}
                                        </span>
                                        {log.revision_counter > 0 && (
                                          <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                            Revised {log.revision_counter}x
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {log && (
                                  <button
                                    onClick={() => toggleLogItemsExpand(log.id)}
                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                  >
                                    <i className={`fas fa-${isLogExpanded ? 'eye-slash' : 'eye'} mr-1`}></i>
                                    History
                                  </button>
                                )}
                                <button
                                  onClick={() => openLogModal(leafNode.id)}
                                  disabled={submitting}
                                  className="px-2.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                >
                                  <i className="fas fa-plus text-[10px]"></i> Log Entry
                                </button>
                              </div>
                            </div>
                            {/* Expanded Log Items */}
                            {isLogExpanded && log && (
                              <div className="ml-7 mt-1 mb-2 bg-white border border-light-border rounded-xl p-3 space-y-2">
                                <p className="text-[10px] font-extrabold text-dark-soft uppercase mb-1">Log Entries</p>
                                {(logItems[log.id] || []).length === 0 ? (
                                  <p className="text-xs text-gray-400">No entries yet.</p>
                                ) : (
                                  (logItems[log.id] || []).map(item => (
                                    <div key={item.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-gray-700">{new Date(item.date).toLocaleDateString()}</span>
                                          {getStatusBadge(item.current_status)}
                                          <span className="text-gray-500 font-semibold">{Number(item.progress).toFixed(0)}%</span>
                                          {item.teacher?.name && <span className="text-gray-400 font-semibold">by {item.teacher.name}</span>}
                                          {item.is_revision === 'Y' && (
                                            <span className="text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 text-[9px]">Revision</span>
                                          )}
                                          {item.late_reporting === 'Y' && (
                                            <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 text-[9px]">Late</span>
                                          )}
                                        </div>
                                        {item.comments && <p className="text-gray-500 mt-1">{item.comments}</p>}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }

                      const allLvl2NodeIds = lvl2Lessons.map(n => n.id);
                      const isAllLvl2Checked = allLvl2NodeIds.length > 0 && allLvl2NodeIds.every(id => selectedNodes.includes(id));
                      const lvl2Completed = lvl2Lessons.filter(n => getLessonLog(n.id)?.current_status === 'completed').length;
                      const lvl2InProgress = lvl2Lessons.filter(n => getLessonLog(n.id)?.current_status === 'in_progress').length;

                      return (
                        <div key={level2Name} className="border border-gray-150 rounded-xl overflow-hidden shadow-sm">
                          <div className="flex items-center justify-between p-3.5 bg-gray-50/30 border-b border-gray-150 select-none">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isAllLvl2Checked}
                                onChange={(e) => handleSelectLvl2(level1Name, level2Name, e.target.checked)}
                                className="w-4 h-4 rounded text-brand-primary border-light-border focus:ring-brand-primary cursor-pointer"
                              />
                              <div className="cursor-pointer" onClick={() => toggleLvl2(lvl2Key)}>
                                <h4 className="text-xs font-bold text-dark-soft flex items-center gap-2">
                                  {level2Name}
                                  <i className={`fas fa-chevron-${isLvl2Expanded ? 'down' : 'right'} text-[10px] text-gray-400`}></i>
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                    {lvl2Completed}/{lvl2Lessons.length} completed
                                  </span>
                                  {lvl2InProgress > 0 && (
                                    <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                      {lvl2InProgress} in progress
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Level 3 Node List */}
                          {isLvl2Expanded && (
                            <div className="p-3 bg-white space-y-2.5 pl-6">
                              {lvl2Lessons.map(node => {
                                const log = getLessonLog(node.id);
                                const status = log?.current_status || 'not_started';
                                const title = node.level3;
                                const isLogExpanded = log && expandedLogItems[log.id];

                                return (
                                  <div key={node.id}>
                                    <div className="flex justify-between items-center p-3 bg-gray-50/50 border rounded-xl hover:border-brand-primary/30 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="checkbox"
                                          checked={selectedNodes.includes(node.id)}
                                          onChange={() => handleSelectNode(node.id)}
                                          className="w-4 h-4 rounded text-brand-primary border-light-border focus:ring-brand-primary cursor-pointer"
                                        />
                                        <div>
                                          <p className="text-xs font-bold text-dark-primary">{title}</p>
                                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            {getStatusBadge(status)}
                                            {log && (
                                              <>
                                                <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                  {Number(log.completion_percentage).toFixed(0)}%
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                  Days: {log.days_taken}
                                                </span>
                                                {log.revision_counter > 0 && (
                                                  <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                                    Revised {log.revision_counter}x
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {log && (
                                          <button
                                            onClick={() => toggleLogItemsExpand(log.id)}
                                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                          >
                                            <i className={`fas fa-${isLogExpanded ? 'eye-slash' : 'eye'} mr-1`}></i>
                                            History
                                          </button>
                                        )}
                                        <button
                                          onClick={() => openLogModal(node.id)}
                                          disabled={submitting}
                                          className="px-2.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                        >
                                          <i className="fas fa-plus text-[10px]"></i> Log Entry
                                        </button>
                                      </div>
                                    </div>

                                    {/* Expanded Log Items */}
                                    {isLogExpanded && log && (
                                      <div className="ml-7 mt-1 mb-2 bg-white border border-light-border rounded-xl p-3 space-y-2">
                                        <p className="text-[10px] font-extrabold text-dark-soft uppercase mb-1">Log Entries</p>
                                        {(logItems[log.id] || []).length === 0 ? (
                                          <p className="text-xs text-gray-400">No entries yet.</p>
                                        ) : (
                                          (logItems[log.id] || []).map(item => (
                                            <div key={item.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="font-bold text-gray-700">{new Date(item.date).toLocaleDateString()}</span>
                                                  {getStatusBadge(item.current_status)}
                                                  <span className="text-gray-500 font-semibold">{Number(item.progress).toFixed(0)}%</span>
                                                  {item.teacher?.name && <span className="text-gray-400 font-semibold">by {item.teacher.name}</span>}
                                                  {item.is_revision === 'Y' && (
                                                    <span className="text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 text-[9px]">Revision</span>
                                                  )}
                                                  {item.late_reporting === 'Y' && (
                                                    <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 text-[9px]">Late</span>
                                                  )}
                                                </div>
                                                {item.comments && <p className="text-gray-500 mt-1">{item.comments}</p>}
                                              </div>
                                            </div>
                                          ))
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
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Action Bar for Bulk Updates */}
        {selectedNodes.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/95 text-white py-3.5 px-6 rounded-2xl shadow-xl flex items-center gap-4 z-40 border border-white/10 backdrop-blur-md">
            <span className="text-xs font-black text-white shrink-0">
              Selected: <strong className="text-brand-primary">{selectedNodes.length}</strong> lesson(s)
            </span>
            <div className="w-px h-6 bg-white/20"></div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={openBulkModal}
                disabled={submitting}
                className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <i className="fas fa-pen-to-square"></i> Bulk Log Entry
              </button>
              <button
                onClick={() => setSelectedNodes([])}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Render History Tab ──────────────────────────────────────────

  const renderHistory = () => {
    const bookLessons = getBookLessons();
    const bookLessonIds = bookLessons.map(n => n.id);
    const relevantLogs = lessonLogs.filter(l => bookLessonIds.includes(Number(l.lesson_id)) || bookLessonIds.includes(String(l.lesson_id)));

    if (relevantLogs.length === 0) {
      return (
        <div className="bg-white p-8 rounded-xl border text-center text-gray-500 text-sm font-semibold">
          No tracking history for this book yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {relevantLogs.map(log => {
          const lesson = syllabusData.find(d => String(d.id) === String(log.lesson_id));
          const title = lesson ? [lesson.level1, lesson.level2, lesson.level3].filter(Boolean).join(' > ') : 'Unknown Lesson';
          const isExpanded = expandedLogItems[log.id];
          const items = logItems[log.id] || [];

          return (
            <div key={log.id} className="bg-white p-4 border rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-dark-primary">{title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {getStatusBadge(log.current_status)}
                    <span className="text-[10px] text-gray-500 font-semibold">
                      Started: {new Date(log.start_date).toLocaleDateString()}
                    </span>
                    {log.end_date && (
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        Ended: {new Date(log.end_date).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500 font-semibold">
                      {Number(log.completion_percentage).toFixed(0)}% | {log.days_taken} day(s) | {log.revision_counter} revision(s)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleLogItemsExpand(log.id)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} mr-1`}></i>
                  {isExpanded ? 'Hide' : 'Show'} Entries ({items.length || '...'})
                </button>
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400">Loading...</p>
                  ) : (
                    items.map(item => (
                      <div key={item.id} className="text-sm p-2 border-l-2 border-brand-primary bg-gray-50 rounded-r-lg">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-700 text-xs">{new Date(item.date).toLocaleDateString()}</span>
                          {getStatusBadge(item.current_status)}
                          <span className="text-xs text-gray-500">{Number(item.progress).toFixed(0)}%</span>
                          {item.teacher?.name && <span className="text-xs text-gray-400">by {item.teacher.name}</span>}
                          {item.is_revision === 'Y' && <span className="text-[9px] text-purple-600 font-bold bg-purple-50 px-1 py-0.5 rounded">Revision</span>}
                          {item.late_reporting === 'Y' && <span className="text-[9px] text-red-600 font-bold bg-red-50 px-1 py-0.5 rounded">Late</span>}
                        </div>
                        {item.comments && <p className="text-xs text-gray-500 mt-1">{item.comments}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Loading State ──────────────────────────────────────────────

  if (loading && classes.length === 0) {
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
      <div className="bg-white border-b p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <h1 className="text-2xl font-black flex items-center gap-2">
            Syllabus Tracker
            {loading && <i className="fas fa-spinner fa-spin text-brand-primary text-sm"></i>}
          </h1>
          <label className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-xl cursor-pointer text-xs font-bold text-brand-primary select-none hover:bg-brand-primary/15 transition-colors">
            <input
              type="checkbox"
              checked={coverMode}
              onChange={(e) => setCoverMode(e.target.checked)}
              className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
            />
            Cover for Absent Teacher (Show all classes/subjects)
          </label>
        </div>

        {/* Quick Access: Favorites + Recently Updated */}
        {(favorites.length > 0 || recentBooks.length > 0) && (
          <div className="flex flex-wrap gap-2 items-center mb-4 p-2 bg-amber-50/40 border border-amber-100 rounded-xl">
            {favorites.length > 0 && (
              <>
                <span className="text-[10px] font-extrabold text-amber-800 uppercase flex items-center gap-1 shrink-0">
                  <i className="fas fa-star text-amber-500" /> Favorites:
                </span>
                {favorites.map((fav, index) => (
                  <button
                    key={`fav-${index}`}
                    onClick={() => applyQuickAccess(fav)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      String(selectedClassId) === String(fav.classId) &&
                      String(selectedSubjectId) === String(fav.subjectId) &&
                      String(selectedBookId) === String(fav.bookId)
                        ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm'
                        : 'bg-white border-light-border text-dark-soft hover:bg-amber-50/50 hover:text-amber-900'
                    }`}
                  >
                    <i className="fas fa-star text-amber-500 text-[8px]" />
                    <span>{fav.className} • {fav.subjectName}</span>
                  </button>
                ))}
              </>
            )}
            {recentBooks.length > 0 && (
              <>
                <span className="text-[10px] font-extrabold text-blue-800 uppercase flex items-center gap-1 shrink-0 ml-2">
                  <i className="fas fa-clock text-blue-500" /> Recent:
                </span>
                {recentBooks.slice(0, 10).map((rec, index) => (
                  <button
                    key={`rec-${index}`}
                    onClick={() => applyQuickAccess(rec)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      String(selectedClassId) === String(rec.classId) &&
                      String(selectedSubjectId) === String(rec.subjectId) &&
                      String(selectedBookId) === String(rec.bookId)
                        ? 'bg-blue-100 border-blue-300 text-blue-900 shadow-sm'
                        : 'bg-white border-light-border text-dark-soft hover:bg-blue-50/50 hover:text-blue-900'
                    }`}
                  >
                    <i className="fas fa-clock text-blue-400 text-[8px]" />
                    <span>{rec.className} • {rec.subjectName}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Filter Controls */}
        {activeClasses.length > 0 ? (
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-dark-soft uppercase">Class</label>
              <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary text-xs font-bold text-dark-primary h-9">
                {activeClasses.map(c => <option key={c.id} value={c.id}>{c.name || c.class_name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-dark-soft uppercase">Classification</label>
              <select value={selectedClassificationId} onChange={e => setSelectedClassificationId(e.target.value)} className="border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary text-xs font-bold text-dark-primary h-9">
                <option value="">All Classifications</option>
                {activeClassifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-dark-soft uppercase">Subject</label>
              <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary text-xs font-bold text-dark-primary h-9">
                {activeSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-dark-soft uppercase">Book</label>
              <select value={selectedBookId} onChange={e => setSelectedBookId(e.target.value)} className="border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary text-xs font-bold text-dark-primary h-9">
                {filteredBooks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-dark-soft uppercase">Date</label>
              <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary text-xs font-bold text-dark-primary h-9" />
            </div>
            <div className="flex flex-col gap-1 self-end h-[36px] justify-center ml-1">
              <button
                onClick={toggleFavorite}
                disabled={!selectedClassId || !selectedSubjectId || !selectedBookId}
                title={
                  favorites.some(f =>
                    String(f.classId) === String(selectedClassId) &&
                    String(f.subjectId) === String(selectedSubjectId) &&
                    String(f.bookId) === String(selectedBookId)
                  ) ? "Remove from Quick Access" : "Add to Quick Access"
                }
                className={`p-2 rounded-lg border transition-all ${
                  favorites.some(f =>
                    String(f.classId) === String(selectedClassId) &&
                    String(f.subjectId) === String(selectedSubjectId) &&
                    String(f.bookId) === String(selectedBookId)
                  )
                    ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600 hover:border-amber-600 shadow-sm'
                    : 'bg-white border-light-border text-dark-soft hover:bg-light-ui hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-star text-xs" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs font-bold text-red-500">No classes assigned. Enable "Cover for Absent Teacher" above to select a class.</p>
        )}
      </div>

      <div className="p-6 overflow-y-auto pb-24">
        <div className="flex gap-4 border-b mb-6 pb-2">
          {['curriculum', 'history'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === tab ? 'bg-brand-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'curriculum' && renderCurriculum()}
        {activeTab === 'history' && renderHistory()}
      </div>

      {/* ─── Single Log Entry Modal ─── */}
      {isLogModalOpen && (() => {
        const log = getLessonLog(logModalLessonId);
        const isCompleted = log?.current_status === 'completed';
        const lessonNode = syllabusData.find(d => String(d.id) === String(logModalLessonId));
        const lessonTitle = lessonNode ? (lessonNode.level3 || lessonNode.level2 || lessonNode.level1) : 'Lesson';

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-light-border">
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                <h3 className="text-sm font-black text-dark-deepblue uppercase tracking-wider">Add Log Entry</h3>
                <button onClick={() => setIsLogModalOpen(false)} className="text-gray-400 hover:text-dark-primary font-bold text-lg p-1">
                  <i className="fas fa-times" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4 font-semibold">{lessonTitle}</p>

              <form onSubmit={handleLogItemSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Date</label>
                  <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Status</label>
                  <select value={logModalStatus} onChange={e => setLogModalStatus(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft">
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Progress ({logModalProgress}%)</label>
                  <input type="range" min="0" max="100" step="5" value={logModalProgress} onChange={e => setLogModalProgress(Number(e.target.value))} className="w-full accent-brand-primary" />
                  <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-1">
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Comments</label>
                  <textarea value={logModalComments} onChange={e => setLogModalComments(e.target.value)} placeholder="Optional comments..." rows={2} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft resize-none" />
                </div>
                {isCompleted && (
                  <label className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 p-2 rounded-xl border border-purple-100 cursor-pointer">
                    <input type="checkbox" checked={logModalIsRevision} onChange={e => setLogModalIsRevision(e.target.checked)} className="w-4 h-4 rounded text-purple-600" />
                    Mark as Revision
                  </label>
                )}
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button type="button" onClick={() => setIsLogModalOpen(false)} className="px-4 py-2 border hover:bg-light-ui rounded-xl text-xs font-bold text-dark-soft transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black shadow-sm transition-colors disabled:opacity-50">
                    {submitting ? 'Saving...' : 'Add Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ─── Bulk Log Entry Modal ─── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-light-border">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="text-sm font-black text-dark-deepblue uppercase tracking-wider">Bulk Log Entry</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-dark-primary font-bold text-lg p-1">
                <i className="fas fa-times" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4 font-semibold">
              Adding entry for <strong className="text-brand-primary">{selectedNodes.length}</strong> lessons
            </p>

            <form onSubmit={handleBulkLogSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Date</label>
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Status</label>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft">
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Progress ({bulkProgress}%)</label>
                <input type="range" min="0" max="100" step="5" value={bulkProgress} onChange={e => setBulkProgress(Number(e.target.value))} className="w-full accent-brand-primary" />
                <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-1">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Comments</label>
                <textarea value={bulkComments} onChange={e => setBulkComments(e.target.value)} placeholder="Optional comments..." rows={2} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 border hover:bg-light-ui rounded-xl text-xs font-bold text-dark-soft transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black shadow-sm transition-colors disabled:opacity-50">
                  {submitting ? 'Saving...' : `Add ${selectedNodes.length} Entries`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Add Syllabus Node Modal ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-light-border">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-light-border">
              <h3 className="text-sm font-black text-dark-deepblue uppercase tracking-wider">Add Syllabus Item</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-dark-primary font-bold text-lg p-1">
                <i className="fas fa-times" />
              </button>
            </div>
            <form onSubmit={handleAddSyllabusItem} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1.5">Item Type</label>
                <div className="flex border border-light-border rounded-xl p-0.5 bg-light-bg/40 gap-0.5">
                  {[
                    { id: 'level1', label: lvl1Label, exists: !!bookLevels[0] },
                    { id: 'level2', label: lvl2Label, exists: !!bookLevels[1] },
                    { id: 'level3', label: lvl3Label, exists: !!bookLevels[2] }
                  ].filter(x => x.exists).map(type => (
                    <button
                      key={type.id} type="button"
                      onClick={() => {
                        setAddType(type.id);
                        const l1Names = [...new Set(bookData.map(n => n.level1))].filter(Boolean);
                        if (l1Names.length > 0) {
                          setSelectedAddLevel1(l1Names[0]);
                          const l2Names = [...new Set(bookData.filter(n => n.level1 === l1Names[0]).map(n => n.level2 || 'General'))].filter(Boolean);
                          if (l2Names.length > 0) setSelectedAddLevel2(l2Names[0]);
                        }
                      }}
                      className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${addType === type.id ? 'bg-brand-primary text-white shadow-sm' : 'text-dark-soft hover:text-dark-primary'}`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {addType === 'level1' && (
                <div>
                  <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">{lvl1Label} Name</label>
                  <input type="text" required placeholder={`e.g. ${lvl1Label} 1`} value={addLevel1Name} onChange={e => setAddLevel1Name(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft" />
                </div>
              )}

              {addType === 'level2' && (
                <>
                  <div>
                    <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Parent {lvl1Label}</label>
                    <select value={selectedAddLevel1} onChange={e => setSelectedAddLevel1(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft">
                      {[...new Set(bookData.map(n => n.level1))].filter(Boolean).map(l1 => <option key={l1} value={l1}>{l1}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">{lvl2Label} Name</label>
                    <input type="text" required placeholder={`e.g. ${lvl2Label} A`} value={addLevel2Name} onChange={e => setAddLevel2Name(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft" />
                  </div>
                </>
              )}

              {addType === 'level3' && (
                <>
                  <div>
                    <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Parent {lvl1Label}</label>
                    <select value={selectedAddLevel1} onChange={e => { setSelectedAddLevel1(e.target.value); const l2Names = [...new Set(bookData.filter(n => n.level1 === e.target.value).map(n => n.level2 || 'General'))].filter(Boolean); setSelectedAddLevel2(l2Names[0] || 'General'); }} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft">
                      {[...new Set(bookData.map(n => n.level1))].filter(Boolean).map(l1 => <option key={l1} value={l1}>{l1}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Parent {lvl2Label}</label>
                    <select value={selectedAddLevel2} onChange={e => setSelectedAddLevel2(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft">
                      {[...new Set(bookData.filter(n => n.level1 === selectedAddLevel1).map(n => n.level2 || 'General'))].filter(Boolean).map(l2 => <option key={l2} value={l2}>{l2}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">{lvl3Label} Name</label>
                    <input type="text" required placeholder={`e.g. ${lvl3Label} 1`} value={addLevel3Name} onChange={e => setAddLevel3Name(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Page Count</label>
                      <input type="number" min="0" value={addPageCount} onChange={e => setAddPageCount(Number(e.target.value))} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">Complexity</label>
                      <select value={addComplexity} onChange={e => setAddComplexity(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft">
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-light-border">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border border-light-border hover:bg-light-ui rounded-xl text-xs font-bold text-dark-soft transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-colors disabled:opacity-50">
                  Add {addType === 'level1' ? lvl1Label : addType === 'level2' ? lvl2Label : lvl3Label}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyllabusTracker;
