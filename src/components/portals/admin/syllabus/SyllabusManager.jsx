import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';
import ClassificationsModal from '../timetable/ClassificationsModal';
import ConfirmModal from '../../../ConfirmModal';
import SyllabusCsvMappingModal from './SyllabusCsvMappingModal';
import * as XLSX from 'xlsx';

const generateLocalId = () => 'local-' + Math.random().toString(36).substr(2, 9);

const getComplexityBadgeClass = (comp) => {
  if (comp === 'Complex') return 'bg-red-100 text-red-700 border-red-200';
  if (comp === 'Moderate') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

const SyllabusManager = ({ role, user, teacherRecord }) => {
  const isAdmin = role === 'admin' || role === 'management';
  const isTeacher = role === 'teacher';

  const [classifications, setClassifications] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [books, setBooks] = useState([]);
  const [syllabusData, setSyllabusData] = useState([]);
  const [allocatedSubjectIds, setAllocatedSubjectIds] = useState([]);
  const [classes, setClasses] = useState([]);
  const [bookClasses, setBookClasses] = useState([]);
  const [mappingBook, setMappingBook] = useState(null);
  const [tempMappings, setTempMappings] = useState([]);
  const [showAllSubjects, setShowAllSubjects] = useState(false);

  const initiateMapping = (book) => {
    setMappingBook(book);
    const existing = bookClasses
      .filter((bc) => String(bc.book_id) === String(book.id))
      .map((bc) => String(bc.class_id));
    setTempMappings(existing);
  };

  const handleToggleClassMapping = (classId) => {
    const cidStr = String(classId);
    if (tempMappings.includes(cidStr)) {
      setTempMappings(tempMappings.filter((id) => id !== cidStr));
    } else {
      setTempMappings([...tempMappings, cidStr]);
    }
  };

  const handleSaveClassMappings = async () => {
    if (!mappingBook) return;
    setLoading(true);
    try {
      const bookId = mappingBook.id;

      if (isSupabaseMode) {
        const { error: delErr } = await supabase
          .from('map_class_books')
          .delete()
          .eq('book_id', bookId);
        if (delErr) throw delErr;

        if (tempMappings.length > 0) {
          const insertData = tempMappings.map((cid) => ({
            book_id: bookId,
            class_id: Number(cid),
          }));
          const { error: insErr } = await supabase.from('map_class_books').insert(insertData);
          if (insErr) throw insErr;
        }
      }

      const filtered = bookClasses.filter((bc) => String(bc.book_id) !== String(bookId));
      const updated = [
        ...filtered,
        ...tempMappings.map((cid) => ({
          book_id: bookId,
          class_id: Number(cid),
        })),
      ];
      setBookClasses(updated);
      localStorage.setItem('jzv_map_class_books', JSON.stringify(updated));

      showToast('Book mapped to classes successfully!', 'success');
      setMappingBook(null);
    } catch (err) {
      showToast('Error saving mappings: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const [collapsedNodes, setCollapsedNodes] = useState({});
  const [collapsedClassifications, setCollapsedClassifications] = useState({});
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (isTeacher && !showAllSubjects) {
      const activeAllocated = allocatedSubjectIds
        .map((id) => String(id))
        .includes(String(activeSubjectId));
      if (!activeAllocated) {
        const firstAllocated = subjects.find((s) =>
          allocatedSubjectIds.map((id) => String(id)).includes(String(s.id))
        );
        if (firstAllocated) {
          setActiveSubjectId(firstAllocated.id);
        } else {
          setActiveSubjectId(null);
        }
      }
    }
  }, [showAllSubjects, activeSubjectId, allocatedSubjectIds, subjects, isTeacher]);

  useEffect(() => {
    if (!mappingBook) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMappingBook(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mappingBook]);

  const [deleteModalSubject, setDeleteModalSubject] = useState(null);
  const [mappedClasses, setMappedClasses] = useState([]);

  const checkTimetableMappings = async (subjectId) => {
    let mapped = [];
    if (isSupabaseMode) {
      try {
        const { data, error } = await supabase
          .from('timetable_slots')
          .select('class_id, classes(name)')
          .eq('subject_id', subjectId);

        if (data && data.length > 0) {
          const classMap = new Map();
          data.forEach((slot) => {
            if (slot.class_id) {
              const className = slot.classes?.name || `Class ID ${slot.class_id}`;
              classMap.set(String(slot.class_id), className);
            }
          });
          mapped = Array.from(classMap.values());
        }
      } catch (err) {
        console.warn('Error fetching DB timetable slots:', err.message);
      }
    } else {
      const raw = localStorage.getItem('jzv_timetable_local_data');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const slots = parsed.slots || [];
          const classesList = parsed.classes || [];
          const matchingSlots = slots.filter((s) => String(s.subject_id) === String(subjectId));
          const classMap = new Map();
          matchingSlots.forEach((s) => {
            const cls = classesList.find((c) => String(c.id) === String(s.class_id));
            const className = cls?.name || `Class ID ${s.class_id}`;
            classMap.set(String(s.class_id), className);
          });
          mapped = Array.from(classMap.values());
        } catch (e) {
          console.warn('Error parsing local timetable storage:', e);
        }
      }
    }
    return mapped;
  };

  const handleInitiateDeleteSubject = async (sub) => {
    setLoading(true);
    try {
      const classesMapped = await checkTimetableMappings(sub.id);
      setMappedClasses(classesMapped);
      setDeleteModalSubject(sub);
    } catch (err) {
      showToast('Error checking timetable mappings: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateSubject = async (id) => {
    setLoading(true);
    try {
      if (isSupabaseMode) {
        await supabase
          .from('syl_subjects')
          .update({ deactivated: false, deactivate: false })
          .eq('id', id);
      }
      saveState({
        subjects: subjects.map((s) =>
          String(s.id) === String(id) ? { ...s, deactivated: false, deactivate: false } : s
        ),
      });
      showToast('Subject reactivated successfully!', 'success');
    } catch (err) {
      showToast('Error reactivating subject: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const [isSupabaseMode, setIsSupabaseMode] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  const [isClassificationsModalOpen, setIsClassificationsModalOpen] = useState(false);

  // CSV State
  const [isCsvMappingOpen, setIsCsvMappingOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [importBookId, setImportBookId] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const fileInputRef = useRef(null);

  // Lazy loading & session cache state
  const [loadedBookIds, setLoadedBookIds] = useState(new Set());
  const [loadingBookIds, setLoadingBookIds] = useState(new Set());

  const getSessionCachedData = async (cacheKey, fetcher) => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn(`Error reading session cache for ${cacheKey}:`, e);
    }
    const res = await fetcher();
    const data = res?.data !== undefined ? res.data : res;
    if (data && !res?.error) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {}
    }
    return data;
  };

  const loadData = async () => {
    setInitialLoading(true);
    try {
      const [dbClassifications, dbSubjects, dbClasses, dbBookClasses] = await Promise.all([
        getSessionCachedData('jzv_session_classifications', () =>
          supabase.from('syl_classifications').select('*').order('name', { ascending: true })
        ),
        getSessionCachedData('jzv_session_subjects', () => supabase.from('syl_subjects').select('*')),
        getSessionCachedData('jzv_session_classes', () =>
          supabase.from('classes').select('*').order('id', { ascending: true })
        ),
        getSessionCachedData('jzv_session_book_classes', () =>
          supabase.from('map_class_books').select('*')
        ),
      ]);

      // If classifications came back empty (e.g. due to RLS), try fetching by IDs referenced in subjects
      let resolvedClassifications = dbClassifications || [];
      if (
        (!resolvedClassifications || resolvedClassifications.length === 0) &&
        dbSubjects &&
        dbSubjects.length > 0
      ) {
        const referencedIds = [
          ...new Set(
            dbSubjects.filter((s) => s.classification_id).map((s) => String(s.classification_id))
          ),
        ];
        if (referencedIds.length > 0) {
          const { data: fallbackCls } = await supabase
            .from('syl_classifications')
            .select('*')
            .in('id', referencedIds)
            .order('name', { ascending: true });
          resolvedClassifications = fallbackCls || [];
        }
      }

      let teacherAllocatedIds = [];
      if (isTeacher && user?.id) {
        const teacherCacheKey = `jzv_session_teacher_allocated_${user.id}`;
        try {
          const cachedAlloc = sessionStorage.getItem(teacherCacheKey);
          if (cachedAlloc) {
            teacherAllocatedIds = JSON.parse(cachedAlloc);
          }
        } catch (e) {}

        if (teacherAllocatedIds.length === 0) {
          let teacherData = teacherRecord;
          if (!teacherData) {
            const { data, error: teacherErr } = await supabase.rpc('get_current_teacher_details', {
              p_auth_id: user.id,
            });
            if (!teacherErr) {
              teacherData = Array.isArray(data) ? data[0] : data;
            }
          }

          if (teacherData) {
            const [dbAssignments, dbTeacherSubjects] = await Promise.all([
              supabase
                .from('class_assignments')
                .select('subject_id')
                .eq('teacher_id', teacherData.id),
              supabase
                .from('map_teacher_subject')
                .select('subject_id')
                .eq('teacher_id', teacherData.id),
            ]);

            const idsFromAssignments = (dbAssignments.data || []).map((a) => String(a.subject_id));
            const idsFromTeacherSubjects = (dbTeacherSubjects.data || []).map((ts) =>
              String(ts.subject_id)
            );
            teacherAllocatedIds = Array.from(
              new Set([...idsFromAssignments, ...idsFromTeacherSubjects])
            );
            try {
              sessionStorage.setItem(teacherCacheKey, JSON.stringify(teacherAllocatedIds));
            } catch (e) {}
          }
        }
      }
      setAllocatedSubjectIds(teacherAllocatedIds);

      setClassifications(resolvedClassifications);
      setSubjects(dbSubjects || []);
      setClasses(dbClasses || []);
      setBookClasses(dbBookClasses || []);
      setIsSupabaseMode(true);

      let initialSubjectList = dbSubjects || [];
      if (isTeacher && teacherAllocatedIds.length > 0) {
        initialSubjectList = initialSubjectList.filter((s) =>
          teacherAllocatedIds.includes(String(s.id))
        );
      }
      if (initialSubjectList.length > 0 && !activeSubjectId) {
        setActiveSubjectId(initialSubjectList[0].id);
      }
    } catch (err) {
      console.warn('DB error, using LocalStorage:', err.message);
      setIsSupabaseMode(false);
      loadLocalData();
    } finally {
      setInitialLoading(false);
    }
  };

  const loadLocalData = () => {
    const raw = localStorage.getItem('jzv_syllabus_data');

    // Load local classes
    const rawTimetable = localStorage.getItem('jzv_timetable_local_data');
    if (rawTimetable) {
      try {
        const parsedTimetable = JSON.parse(rawTimetable);
        setClasses(parsedTimetable.classes || []);
      } catch (e) {
        console.warn('Error parsing timetable local data classes:', e);
      }
    }

    // Load local book classes mapping
    const rawBC = localStorage.getItem('jzv_map_class_books');
    if (rawBC) {
      try {
        setBookClasses(JSON.parse(rawBC));
      } catch (e) {}
    }

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setClassifications(parsed.classifications || []);
        setSubjects(parsed.subjects || []);
        setBooks(parsed.books || []);
        setSyllabusData(parsed.syllabusData || []);

        let teacherAllocatedIds = [];
        if (isTeacher && user?.id && rawTimetable) {
          try {
            const parsedTimetable = JSON.parse(rawTimetable);
            const matchedTeacher = (parsedTimetable.teachers || []).find(
              (t) => String(t.auth_id) === String(user.id) || String(t.id) === String(user.id)
            );
            if (matchedTeacher) {
              const idsFromTeacher = (matchedTeacher.subjects || []).map((id) => String(id));
              const idsFromAssignments = (parsedTimetable.assignments || [])
                .filter((a) => String(a.teacher_id) === String(matchedTeacher.id))
                .map((a) => String(a.subject_id));
              teacherAllocatedIds = Array.from(new Set([...idsFromTeacher, ...idsFromAssignments]));
            }
          } catch (e) {
            console.warn('Error parsing timetable local data:', e);
          }
        }
        setAllocatedSubjectIds(teacherAllocatedIds);

        let initialSubjectList = parsed.subjects || [];
        if (isTeacher && teacherAllocatedIds.length > 0) {
          initialSubjectList = initialSubjectList.filter((s) =>
            teacherAllocatedIds.includes(String(s.id))
          );
        }
        if (initialSubjectList.length > 0 && !activeSubjectId) {
          setActiveSubjectId(initialSubjectList[0].id);
        }
      } catch (e) {
        initializeMockData();
      }
    } else {
      initializeMockData();
    }
  };

  const initializeMockData = () => {
    const mockClassifications = [{ id: 'cls-1', name: 'Modern Education' }];
    const mockSubjects = [{ id: 'sub-1', name: 'Mathematics', classification_id: 'cls-1' }];
    const mockBooks = [
      {
        id: 'book-1',
        subject_id: 'sub-1',
        name: 'Grade 10 Algebra',
        hierarchy_type: 'Unit, Chapter, Lesson',
      },
    ];
    const mockSyllabusData = [
      {
        id: '1',
        book_id: 'book-1',
        level1: 'Unit 1',
        level2: 'Chapter 1',
        level3: 'Lesson 1',
        page_count: 10,
        complexity: 'Easy',
      },
    ];

    setClassifications(mockClassifications);
    setSubjects(mockSubjects);
    setBooks(mockBooks);
    setSyllabusData(mockSyllabusData);

    let initialSubjectList = mockSubjects;
    if (isTeacher && allocatedSubjectIds.length > 0) {
      initialSubjectList = initialSubjectList.filter((s) =>
        allocatedSubjectIds.includes(String(s.id))
      );
    }
    if (initialSubjectList.length > 0) {
      setActiveSubjectId(initialSubjectList[0].id);
    }
    saveState({
      classifications: mockClassifications,
      subjects: mockSubjects,
      books: mockBooks,
      syllabusData: mockSyllabusData,
    });
  };

  const saveState = (updates) => {
    const nextClassifications =
      updates.classifications !== undefined ? updates.classifications : classifications;
    const nextSubjects = updates.subjects !== undefined ? updates.subjects : subjects;
    const nextBooks = updates.books !== undefined ? updates.books : books;
    const nextSyllabusData =
      updates.syllabusData !== undefined ? updates.syllabusData : syllabusData;

    localStorage.setItem(
      'jzv_syllabus_data',
      JSON.stringify({
        classifications: nextClassifications,
        subjects: nextSubjects,
        books: nextBooks,
        syllabusData: nextSyllabusData,
      })
    );

    if (updates.classifications !== undefined) setClassifications(updates.classifications);
    if (updates.subjects !== undefined) setSubjects(updates.subjects);
    if (updates.books !== undefined) setBooks(updates.books);
    if (updates.syllabusData !== undefined) setSyllabusData(updates.syllabusData);
  };

  useEffect(() => {
    loadData();
  }, [user, role, teacherRecord]);

  const fetchBooksForSubject = async (subjectId) => {
    if (!subjectId || !isSupabaseMode) return;
    const cacheKey = `jzv_session_books_subject_${subjectId}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        setBooks((prev) => {
          const otherBooks = prev.filter((b) => String(b.subject_id) !== String(subjectId));
          return [...otherBooks, ...data];
        });
        return;
      }
    } catch (e) {}

    try {
      const { data, error } = await supabase
        .from('syl_books')
        .select('*')
        .eq('subject_id', subjectId);
      if (error) throw error;
      if (data) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {}
        setBooks((prev) => {
          const otherBooks = prev.filter((b) => String(b.subject_id) !== String(subjectId));
          return [...otherBooks, ...data];
        });
      }
    } catch (err) {
      console.warn('Error fetching books for subject:', err.message);
    }
  };

  useEffect(() => {
    if (activeSubjectId && isSupabaseMode) {
      fetchBooksForSubject(activeSubjectId);
    }
  }, [activeSubjectId, isSupabaseMode]);

  const fetchLessonsForBook = async (bookId) => {
    if (!bookId || !isSupabaseMode) return;
    setLoadingBookIds((prev) => new Set(prev).add(String(bookId)));
    try {
      const { data, error } = await supabase
        .from('syl_lessons')
        .select('*')
        .eq('book_id', bookId)
        .order('sequence', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
        .range(0, 9999);
      if (error) throw error;

      setSyllabusData((prev) => {
        const otherData = prev.filter(
          (d) => String(d.book_id || '').trim() !== String(bookId).trim()
        );
        return [...otherData, ...(data || [])];
      });
      setLoadedBookIds((prev) => new Set(prev).add(String(bookId)));
    } catch (err) {
      console.warn(`Error fetching lessons for book ${bookId}:`, err.message);
    } finally {
      setLoadingBookIds((prev) => {
        const next = new Set(prev);
        next.delete(String(bookId));
        return next;
      });
    }
  };

  const toggleCollapse = (id) =>
    setCollapsedNodes((prev) => {
      const currentVal = prev[id];
      const defaultVal = String(id).includes('-') ? false : true;
      const nextVal = currentVal === undefined ? !defaultVal : !currentVal;

      // When expanding a book node (id has no hyphen), lazily fetch lessons for that book if not loaded yet
      if (!nextVal && !String(id).includes('-') && !loadedBookIds.has(String(id))) {
        fetchLessonsForBook(id);
      }

      return { ...prev, [id]: nextVal };
    });
  const toggleClassificationCollapse = (name) =>
    setCollapsedClassifications((prev) => ({ ...prev, [name]: !prev[name] }));

  const handleExportExcel = (book) => {
    try {
      const bookData = syllabusData.filter((d) => String(d.book_id) === String(book.id));

      const sortedData = [...bookData].sort((a, b) => {
        const seqA = a.sequence !== null && a.sequence !== undefined ? Number(a.sequence) : null;
        const seqB = b.sequence !== null && b.sequence !== undefined ? Number(b.sequence) : null;

        if (seqA !== null && seqB !== null) return seqA - seqB;
        if (seqA !== null) return -1;
        if (seqB !== null) return 1;

        return (Number(a.id) || 0) - (Number(b.id) || 0);
      });

      const sheetData = sortedData.map((d, index) => ({
        Sequence: d.sequence !== null && d.sequence !== undefined ? d.sequence : index + 1,
        ID: d.id || '',
        Level1: d.level1 || '',
        Level2: d.level2 || '',
        Level3: d.level3 || '',
        page: d.page_count !== undefined && d.page_count !== null ? d.page_count : 0,
        complexity: d.complexity || 'Easy',
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Syllabus');

      const filename = `${book.name.replace(/\s+/g, '_')}_Syllabus.xlsx`;
      XLSX.writeFile(workbook, filename);

      showToast('Excel downloaded successfully!', 'success');
    } catch (err) {
      showToast('Export Error: ' + err.message, 'error');
    }
  };

  // Csv Import Logic
  const initiateCsvImport = (bookId) => {
    setImportBookId(bookId);
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Filter out completely empty rows
        const nonEmtpyRows = jsonData.filter(
          (row) =>
            row &&
            row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
        );

        if (nonEmtpyRows.length < 2) {
          showToast('File is empty or invalid.', 'error');
          return;
        }

        const headers = nonEmtpyRows[0].map((h) => String(h || '').trim());
        const rows = nonEmtpyRows.slice(1).map((row) =>
          headers.map((_, idx) => {
            const cell = row[idx];
            return cell === null || cell === undefined ? '' : String(cell).trim();
          })
        );

        setCsvHeaders(headers);
        setCsvRows(rows);
        setIsCsvMappingOpen(true);
      } catch (err) {
        showToast('Error parsing file: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  const handleExecuteCsvImport = async (mappings) => {
    setIsCsvMappingOpen(false);
    setLoading(true);
    setImportProgress({ current: 0, total: csvRows.length });

    const { isUpdateMode, idCol, unitCol, chapterCol, lessonCol, sequenceCol, complexityCol, pageCol } =
      mappings;
    const idIdx = isUpdateMode && idCol ? csvHeaders.indexOf(idCol) : -1;
    const unitIdx = unitCol ? csvHeaders.indexOf(unitCol) : -1;
    const chapterIdx = chapterCol ? csvHeaders.indexOf(chapterCol) : -1;
    const lessonIdx = lessonCol ? csvHeaders.indexOf(lessonCol) : -1;
    const seqIdx = sequenceCol ? csvHeaders.indexOf(sequenceCol) : -1;
    const complexityIdx = complexityCol ? csvHeaders.indexOf(complexityCol) : -1;
    const pageIdx = pageCol ? csvHeaders.indexOf(pageCol) : -1;

    const toProperCase = (str) => {
      if (!str || !str.trim()) return null;
      return str
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    try {
      const targetBook = books.find((b) => String(b.id) === String(importBookId));
      if (!targetBook) throw new Error('Target book not found');

      let currentData = [...syllabusData];
      let rowsImported = 0;
      let rowsUpdated = 0;
      let rowsInserted = 0;
      let importFailed = false;

      const maxExistingSeq = Math.max(
        0,
        ...currentData
          .filter((d) => String(d.book_id) === String(importBookId))
          .map((d) => Number(d.sequence) || 0)
      );

      for (let i = 0; i < csvRows.length; i++) {
        const row = csvRows[i];
        const rowNumInFile = i + 2; // 1-indexed line in file (row 1 is header)
        setImportProgress({ current: i + 1, total: csvRows.length });

        const rowId = idIdx !== -1 ? row[idIdx]?.trim() : null;
        const l1 = toProperCase(unitIdx !== -1 ? row[unitIdx] : null);
        const l2 = toProperCase(chapterIdx !== -1 ? row[chapterIdx] : null);
        const l3 = toProperCase(lessonIdx !== -1 ? row[lessonIdx] : null);
        if (!l1) continue;

        let seqVal = seqIdx !== -1 ? parseInt(row[seqIdx]) : maxExistingSeq + i + 1;
        if (isNaN(seqVal)) seqVal = maxExistingSeq + i + 1;

        const pageVal = pageIdx !== -1 ? parseInt(row[pageIdx]) || 0 : 0;
        let compVal = complexityIdx !== -1 ? row[complexityIdx] : 'Easy';
        if (compVal) {
          compVal = compVal.trim().toLowerCase();
          if (compVal === 'easy' || compVal === 'e') compVal = 'Easy';
          else if (compVal === 'moderate' || compVal === 'm' || compVal === 'mod')
            compVal = 'Moderate';
          else if (compVal === 'complex' || compVal === 'c' || compVal === 'comp')
            compVal = 'Complex';
        }
        if (!['Easy', 'Moderate', 'Complex'].includes(compVal)) compVal = 'Easy';

        const hierarchyStr = `${l1}${l2 ? ' > ' + l2 : ''}${l3 ? ' > ' + l3 : ''}`;

        // Find existing record by hierarchy
        const existingByHierarchy = currentData.find(
          (d) =>
            String(d.book_id) === String(importBookId) &&
            (d.level1 || '').trim().toLowerCase() === l1.toLowerCase() &&
            (d.level2 || '').trim().toLowerCase() === (l2 ? l2.toLowerCase() : '') &&
            (d.level3 || '').trim().toLowerCase() === (l3 ? l3.toLowerCase() : '')
        );

        let existingRow = null;
        if (isUpdateMode && rowId) {
          existingRow = currentData.find((d) => String(d.id) === String(rowId));
        }

        // If not updating by explicit ID, fallback to matching hierarchy
        if (!existingRow) {
          existingRow = existingByHierarchy;
        }

        try {
          if (!existingRow) {
            // Inserting a new record
            const newRow = {
              book_id: importBookId,
              level1: l1,
              level2: l2,
              level3: l3,
              sequence: seqVal,
              page_count: pageVal,
              complexity: compVal,
            };
            if (isSupabaseMode) {
              const { data, error } = await supabase
                .from('syl_lessons')
                .insert([newRow])
                .select();
              if (error) {
                const confId = existingByHierarchy?.id || 'unknown';
                const msg =
                  error.code === '23505'
                    ? `Duplicate key constraint "unique_syllabus_hierarchy" violated (Conflicting DB ID: ${confId})`
                    : error.message;
                throw new Error(msg);
              }
              existingRow = data[0];
            } else {
              existingRow = { id: generateLocalId(), ...newRow };
            }
            currentData.push(existingRow);
            rowsInserted++;
          } else {
            // Updating existing record
            const finalSeq = seqIdx !== -1 ? seqVal : (existingRow.sequence || seqVal);
            const updatePayload = {
              level1: l1,
              level2: l2,
              level3: l3,
              sequence: finalSeq,
              page_count: pageVal,
              complexity: compVal,
            };
            if (isSupabaseMode) {
              const { error } = await supabase
                .from('syl_lessons')
                .update(updatePayload)
                .eq('id', existingRow.id);
              if (error) {
                const confId = existingByHierarchy?.id || existingRow.id;
                const msg =
                  error.code === '23505'
                    ? `Duplicate key constraint "unique_syllabus_hierarchy" violated (Conflicting DB ID: ${confId})`
                    : error.message;
                throw new Error(msg);
              }
            }
            existingRow.level1 = l1;
            existingRow.level2 = l2;
            existingRow.level3 = l3;
            existingRow.sequence = finalSeq;
            existingRow.page_count = pageVal;
            existingRow.complexity = compVal;
            rowsUpdated++;
          }
          rowsImported++;
        } catch (rowErr) {
          importFailed = true;
          const confRecord = existingByHierarchy || existingRow;
          const confIdInfo = confRecord?.id ? ` (DB Record ID: ${confRecord.id})` : '';
          const fullErrText = `Import Error on Row ${rowNumInFile}${rowId ? ' [ID: ' + rowId + ']' : ''} ("${hierarchyStr}")${confIdInfo}: ${rowErr.message}`;
          showToast(fullErrText, 'error', 12000);
          console.error(fullErrText);
          break; // Stop on first error so user can fix exact row & DB ID
        }
      }

      if (!importFailed) {
        saveState({ syllabusData: currentData });
        if (isSupabaseMode) await loadData();
        showToast(
          `Successfully processed ${rowsImported} rows (${rowsInserted} added, ${rowsUpdated} updated)!`,
          'success'
        );
      }
    } catch (err) {
      showToast('CSV Error: ' + err.message, 'error', 10000);
    } finally {
      setLoading(false);
      setImportProgress(null);
      setImportBookId(null);
    }
  };

  const handleSaveNode = async (data) => {
    setLoading(true);
    try {
      if (data.type === 'edit') {
        if (data.level === 'subject') {
          if (isSupabaseMode)
            await supabase
              .from('syl_subjects')
              .update({
                name: data.name,
                classification_id: data.classificationId || null,
                requires_teacher: data.requires_teacher,
              })
              .eq('id', data.node.id);
          saveState({
            subjects: subjects.map((s) =>
              String(s.id) === String(data.node.id)
                ? {
                    ...s,
                    name: data.name,
                    classification_id: data.classificationId || null,
                    requires_teacher: data.requires_teacher,
                  }
                : s
            ),
          });
        } else if (data.level === 'book') {
          if (isSupabaseMode)
            await supabase
              .from('syl_books')
              .update({ name: data.name, hierarchy_type: data.hierarchyType })
              .eq('id', data.node.id);
          saveState({
            books: books.map((b) =>
              String(b.id) === String(data.node.id)
                ? { ...b, name: data.name, hierarchy_type: data.hierarchyType }
                : b
            ),
          });
        } else {
          // Edit specific node level properties (e.g. rename a level1 grouping)
          if (data.level === 'level1' || data.level === 'level2' || data.level === 'level3') {
            // In flattened structure, renaming a level1 means updating ALL rows that match that level1 for the book
            if (isSupabaseMode) {
              if (data.level === 'level1') {
                await supabase
                  .from('syl_lessons')
                  .update({ level1: data.name })
                  .eq('book_id', data.bookId)
                  .eq('level1', data.oldLevel1);
              } else if (data.level === 'level2') {
                // Rename level2 for all sub-rows
                await supabase
                  .from('syl_lessons')
                  .update({ level2: data.name })
                  .eq('book_id', data.bookId)
                  .eq('level1', data.oldLevel1)
                  .eq('level2', data.oldLevel2);

                // Update page count / complexity for placeholder row if provided
                if (data.pageCount !== null && data.pageCount !== undefined) {
                  await supabase
                    .from('syl_lessons')
                    .update({ page_count: data.pageCount, complexity: data.complexity })
                    .eq('book_id', data.bookId)
                    .eq('level1', data.oldLevel1)
                    .eq('level2', data.name)
                    .is('level3', null);
                }
              } else if (data.level === 'level3') {
                const updates = {
                  level3: data.name,
                  page_count: data.pageCount,
                  complexity: data.complexity,
                };
                await supabase
                  .from('syl_lessons')
                  .update(updates)
                  .eq('book_id', data.bookId)
                  .eq('level1', data.oldLevel1)
                  .eq('level2', data.oldLevel2)
                  .eq('level3', data.oldLevel3);
              }
            }
            const updatedData = syllabusData.map((d) => {
              if (String(d.book_id) !== String(data.bookId)) return d;
              if (d.level1 !== data.oldLevel1) return d;
              if (
                (data.level === 'level2' || data.level === 'level3') &&
                d.level2 !== data.oldLevel2
              )
                return d;
              if (data.level === 'level3' && d.level3 !== data.oldLevel3) return d;

              const isPlaceholderRow = d.level3 === null || d.level3 === undefined;
              return {
                ...d,
                level1: data.level === 'level1' ? data.name : d.level1,
                level2: data.level === 'level2' ? data.name : d.level2,
                level3: data.level === 'level3' ? data.name : d.level3,
                page_count:
                  data.level === 'level3'
                    ? data.pageCount
                    : data.level === 'level2' &&
                        isPlaceholderRow &&
                        data.pageCount !== null &&
                        data.pageCount !== undefined
                      ? data.pageCount
                      : d.page_count,
                complexity:
                  data.level === 'level3'
                    ? data.complexity
                    : data.level === 'level2' &&
                        isPlaceholderRow &&
                        data.pageCount !== null &&
                        data.pageCount !== undefined
                      ? data.complexity
                      : d.complexity,
              };
            });
            saveState({ syllabusData: updatedData });
          }
        }
        showToast('Updated successfully', 'success');
      } else {
        if (data.level === 'subject') {
          let newSub = {
            id: generateLocalId(),
            name: data.name,
            classification_id: data.classificationId || null,
            requires_teacher: data.requires_teacher,
            deactivated: false,
            deactivate: false,
          };
          if (isSupabaseMode) {
            const { data: res } = await supabase
              .from('syl_subjects')
              .insert([
                {
                  name: data.name,
                  classification_id: data.classificationId || null,
                  requires_teacher: data.requires_teacher,
                  deactivated: false,
                  deactivate: false,
                },
              ])
              .select();
            newSub = res[0];
          }
          saveState({ subjects: [...subjects, newSub] });
        } else if (data.level === 'book') {
          let newBook = {
            id: generateLocalId(),
            subject_id: data.parentId,
            name: data.name,
            hierarchy_type: data.hierarchyType,
          };
          if (isSupabaseMode) {
            const { data: res } = await supabase
              .from('syl_books')
              .insert([
                { subject_id: data.parentId, name: data.name, hierarchy_type: data.hierarchyType },
              ])
              .select();
            newBook = res[0];

            if (newBook?.id) {
              // Check if database trigger inserted default _Revision entries for new book
              const { data: revLessons } = await supabase
                .from('syl_lessons')
                .select('*')
                .eq('book_id', newBook.id)
                .eq('level1', '_Revision');

              // If database trigger inserted multiple _Revision rows (e.g. 9 rows), keep only 1 and delete the excess
              if (revLessons && revLessons.length > 1) {
                const idsToDelete = revLessons.slice(1).map((r) => r.id);
                await supabase.from('syl_lessons').delete().in('id', idsToDelete);
              }
            }
          }
          saveState({ books: [...books, newBook] });
        } else if (data.level === 'node') {
          let currentData = [...syllabusData];

          for (const n of data.nodesList) {
            let placeholder = null;

            if (n.level3) {
              // Adding Level 3: check for placeholder row with level1 & level2 matching, and level3 IS NULL
              placeholder = currentData.find(
                (d) =>
                  String(d.book_id) === String(data.bookId) &&
                  d.level1 === n.level1 &&
                  d.level2 === n.level2 &&
                  !d.level3
              );
            } else if (n.level2) {
              // Adding Level 2: check for placeholder row with level1 matching, and level2 & level3 IS NULL
              placeholder = currentData.find(
                (d) =>
                  String(d.book_id) === String(data.bookId) &&
                  d.level1 === n.level1 &&
                  !d.level2 &&
                  !d.level3
              );
            } else {
              // Adding Level 1: check if level1 already exists in any form to prevent redundant empty level1 placeholders
              const exists = currentData.some(
                (d) => String(d.book_id) === String(data.bookId) && d.level1 === n.level1
              );
              if (exists) {
                // If it already exists in the book, we don't need a redundant empty level1 placeholder row
                continue;
              }
            }

            const recordData = {
              book_id: data.bookId,
              level1: n.level1,
              level2: n.level2,
              level3: n.level3,
              page_count: n.pageCount || 0,
              complexity: n.complexity || 'Easy',
            };

            if (placeholder) {
              // Update existing placeholder
              if (isSupabaseMode) {
                const { data: updatedRes, error } = await supabase
                  .from('syl_lessons')
                  .update(recordData)
                  .eq('id', placeholder.id)
                  .select();
                if (error) throw error;
                currentData = currentData.map((d) => (d.id === placeholder.id ? updatedRes[0] : d));
              } else {
                currentData = currentData.map((d) =>
                  d.id === placeholder.id ? { ...d, ...recordData } : d
                );
              }
            } else {
              // Insert new record
              if (isSupabaseMode) {
                const { data: insertedRes, error } = await supabase
                  .from('syl_lessons')
                  .insert([recordData])
                  .select();
                if (error) throw error;
                currentData.push(insertedRes[0]);
              } else {
                const newRow = { id: generateLocalId(), ...recordData };
                currentData.push(newRow);
              }
            }
          }

          saveState({ syllabusData: currentData });
        }
        showToast('Added successfully', 'success');
      }
      setModal(null);
    } catch (err) {
      showToast('Save error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNode = async (level, id, nodeData = null) => {
    setConfirmConfig({
      title: 'Delete Node',
      message: 'Are you sure? This action is permanent.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setConfirmConfig(null);
        setLoading(true);
        try {
          if (level === 'subject') {
            const isSoft = nodeData?.isSoftDelete;
            if (isSoft) {
              if (isSupabaseMode) {
                await supabase
                  .from('syl_subjects')
                  .update({ deactivated: true, deactivate: true })
                  .eq('id', id);
              }
              saveState({
                subjects: subjects.map((s) =>
                  String(s.id) === String(id) ? { ...s, deactivated: true, deactivate: true } : s
                ),
              });
              showToast('Subject deactivated successfully', 'success');
            } else {
              if (isSupabaseMode) await supabase.from('syl_subjects').delete().eq('id', id);
              saveState({ subjects: subjects.filter((s) => String(s.id) !== String(id)) });
              showToast('Subject deleted permanently', 'success');
            }
          } else if (level === 'book') {
            if (isSupabaseMode) await supabase.from('syl_books').delete().eq('id', id);
            saveState({
              books: books.filter((b) => String(b.id) !== String(id)),
              syllabusData: syllabusData.filter((d) => String(d.book_id) !== String(id)),
            });
          } else {
            // Level-based intelligent deletion/pruning to keep parent hierarchy alive
            const bookId = nodeData.bookId || nodeData.book_id;
            const l1 = nodeData.level1;
            const l2 = nodeData.level2;
            const l3 = nodeData.level3;
            let currentData = [...syllabusData];

            if (level === 'level3') {
              // Delete level3 node
              const targetNode = currentData.find((d) => String(d.id) === String(id));
              if (targetNode) {
                // Count how many non-null level3 siblings exist under this level2
                const siblings = currentData.filter(
                  (d) =>
                    String(d.book_id) === String(bookId) &&
                    d.level1 === l1 &&
                    d.level2 === l2 &&
                    d.level3
                );

                if (siblings.length > 1) {
                  // Safe to delete this row completely from DB & local state
                  if (isSupabaseMode) {
                    await supabase.from('syl_lessons').delete().eq('id', targetNode.id);
                  }
                  currentData = currentData.filter((d) => String(d.id) !== String(targetNode.id));
                } else {
                  // Only sibling: update to set level3 = null
                  const updates = { level3: null, page_count: 0, complexity: 'Easy' };
                  if (isSupabaseMode) {
                    await supabase
                      .from('syl_lessons')
                      .update(updates)
                      .eq('id', targetNode.id);
                  }
                  currentData = currentData.map((d) =>
                    String(d.id) === String(targetNode.id) ? { ...d, ...updates } : d
                  );
                }
              }
            } else if (level === 'level2') {
              // Delete level2 node
              const rowsToDelete = currentData.filter(
                (d) => String(d.book_id) === String(bookId) && d.level1 === l1 && d.level2 === l2
              );

              if (rowsToDelete.length > 0) {
                // Count unique level2 values under this level1
                const uniqueL2s = new Set(
                  currentData
                    .filter(
                      (d) => String(d.book_id) === String(bookId) && d.level1 === l1 && d.level2
                    )
                    .map((d) => d.level2)
                );

                if (uniqueL2s.size > 1) {
                  // Safe to delete these rows completely
                  if (isSupabaseMode) {
                    await supabase
                      .from('syl_lessons')
                      .delete()
                      .eq('book_id', bookId)
                      .eq('level1', l1)
                      .eq('level2', l2);
                  }
                  currentData = currentData.filter(
                    (d) =>
                      !(String(d.book_id) === String(bookId) && d.level1 === l1 && d.level2 === l2)
                  );
                } else {
                  // Only level2 node under this level1: keep one row as placeholder and delete others
                  const keepRow = rowsToDelete[0];
                  const deleteRowIds = rowsToDelete.slice(1).map((r) => r.id);

                  if (isSupabaseMode) {
                    if (deleteRowIds.length > 0) {
                      await supabase.from('syl_lessons').delete().in('id', deleteRowIds);
                    }
                    await supabase
                      .from('syl_lessons')
                      .update({ level2: null, level3: null, page_count: 0, complexity: 'Easy' })
                      .eq('id', keepRow.id);
                  }

                  currentData = currentData.filter(
                    (d) => !deleteRowIds.map(String).includes(String(d.id))
                  );
                  currentData = currentData.map((d) =>
                    String(d.id) === String(keepRow.id)
                      ? { ...d, level2: null, level3: null, page_count: 0, complexity: 'Easy' }
                      : d
                  );
                }
              }
            } else if (level === 'level1') {
              // Delete level1 node completely
              if (isSupabaseMode) {
                await supabase
                  .from('syl_lessons')
                  .delete()
                  .eq('book_id', bookId)
                  .eq('level1', l1);
              }
              currentData = currentData.filter(
                (d) => !(String(d.book_id) === String(bookId) && d.level1 === l1)
              );
            }

            saveState({ syllabusData: currentData });
          }
          showToast('Deleted successfully', 'success');
        } catch (err) {
          showToast('Delete error: ' + err.message, 'error');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSaveClassifications = async (updatedCls) => {
    setLoading(true);
    try {
      if (isSupabaseMode) {
        for (const c of updatedCls) {
          if (String(c.id).startsWith('local-') || String(c.id).startsWith('cls-')) {
            await supabase
              .from('syl_classifications')
              .insert([{ name: c.name, theme: c.theme || 'blue' }]);
          } else if (c._deleted) {
            await supabase.from('syl_classifications').delete().eq('id', c.id);
          } else {
            await supabase
              .from('syl_classifications')
              .update({ name: c.name, theme: c.theme || 'blue' })
              .eq('id', c.id);
          }
        }
      }
      if (isSupabaseMode) await loadData();
      else saveState({ classifications: updatedCls.filter((c) => !c._deleted) });
      showToast('Classifications updated!', 'success');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMapSubjects = async (mappingData) => {
    setIsClassificationsModalOpen(false);
    setLoading(true);
    try {
      if (isSupabaseMode) {
        for (const item of mappingData) {
          await supabase
            .from('syl_subjects')
            .update({ classification_id: item.clsId })
            .eq('id', item.subId);
        }
      }
      if (isSupabaseMode) await loadData();
      else {
        const nextSub = [...subjects];
        mappingData.forEach((item) => {
          const s = nextSub.find((x) => String(x.id) === String(item.subId));
          if (s) s.classification_id = item.clsId;
        });
        saveState({ subjects: nextSub });
      }
      showToast('Subjects mapped!', 'success');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Grouping subjects by classifications
  const teacherFilteredSubjects =
    isTeacher && !showAllSubjects
      ? subjects.filter((s) => allocatedSubjectIds.map((id) => String(id)).includes(String(s.id)))
      : subjects;

  const unclassifiedSubjects = teacherFilteredSubjects.filter((s) => !s.classification_id);
  const groupedSubjects = (() => {
    // Build groups from known classifications
    const knownGroups = classifications
      .map((cls) => ({
        ...cls,
        subjects: teacherFilteredSubjects.filter(
          (s) => String(s.classification_id) === String(cls.id)
        ),
      }))
      .filter((cls) => cls.subjects.length > 0);

    // Find subjects with a classification_id that doesn't match any loaded classification
    // (happens when classifications table is partially visible via RLS)
    const knownClsIds = new Set(classifications.map((c) => String(c.id)));
    const orphanedSubjects = teacherFilteredSubjects.filter(
      (s) => s.classification_id && !knownClsIds.has(String(s.classification_id))
    );

    if (orphanedSubjects.length > 0) {
      // Group orphaned subjects by their classification_id, labelling as "Group <id>"
      const orphanGroups = {};
      orphanedSubjects.forEach((s) => {
        const key = String(s.classification_id);
        if (!orphanGroups[key])
          orphanGroups[key] = { id: key, name: `Classification #${key}`, subjects: [] };
        orphanGroups[key].subjects.push(s);
      });
      return [...knownGroups, ...Object.values(orphanGroups)];
    }

    return knownGroups;
  })();

  const allClassificationsCollapsed =
    groupedSubjects.length > 0 &&
    groupedSubjects.every((cls) => collapsedClassifications[cls.name]);

  const renderSubjectSelector = (title, subs, isUnclassified = false) => {
    if (!subs || subs.length === 0) return null;
    const isCollapsed = collapsedClassifications[title];
    const hasActive = subs.some((s) => String(s.id) === String(activeSubjectId));
    return (
      <div key={title} className="mb-4">
        <button
          onClick={() => toggleClassificationCollapse(title)}
          className={`w-full flex items-center justify-between text-left py-2 px-3 rounded-lg transition-colors group focus:outline-none ${hasActive ? 'bg-brand-lbg/20 text-brand-primary border border-brand-soft/20' : 'bg-light-lbg/10 hover:bg-light-lbg border border-light-border/40'}`}
        >
          <span className="flex items-center gap-2 text-xs font-bold text-dark-soft uppercase tracking-wider group-hover:text-dark-primary transition-colors truncate">
            <i
              className={`fas ${isCollapsed ? 'fa-folder' : 'fa-folder-open'} ${hasActive ? 'text-brand-primary' : 'text-orange-primary'}`}
            />
            <span className="truncate">{title}</span>
            <span className="text-[9px] text-dark-muted bg-white px-1.5 py-0.2 rounded-full border border-light-border ml-1">
              {subs.length}
            </span>
          </span>
          <i
            className={`fas fa-chevron-${isCollapsed ? 'right' : 'down'} text-[10px] text-dark-muted`}
          />
        </button>
        {!isCollapsed && (
          <div className="mt-2 space-y-1 pl-4 border-l border-light-border border-dashed ml-3">
            {subs.map((sub) => {
              const isSelected = String(activeSubjectId) === String(sub.id);
              const isSubDeactivated = sub.deactivated === true || sub.deactivate === true;
              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    setActiveSubjectId(sub.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`group w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex justify-between items-center cursor-pointer ${isSelected ? 'bg-brand-primary text-white font-bold' : 'text-dark-soft hover:bg-light-ui hover:text-dark-primary'} ${isSubDeactivated ? 'opacity-60' : ''}`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <i
                      className={`fas fa-book-open text-[10px] ${isSelected ? 'text-white' : 'text-blue-primary'}`}
                    />
                    <span className={`truncate ${isSubDeactivated ? 'line-through' : ''}`}>
                      {sub.name}
                    </span>
                    {sub.requires_teacher !== false ? (
                      <i
                        className={`fas fa-user text-[10px] ${
                          isSelected ? 'text-white/80' : 'text-black-500'
                        }`}
                        title="Requires Teacher"
                      />
                    ) : (
                      <i
                        className={`fas fa-user-slash text-[10px] ${
                          isSelected ? 'text-red-200' : 'text-red-500'
                        }`}
                        title="Does Not Require Teacher"
                      />
                    )}
                    {isSubDeactivated && (
                      <span
                        className={`text-[8px] font-bold px-1 py-0.2 rounded border shrink-0 ${isSelected ? 'bg-white/20 text-white border-white/30' : 'bg-red-50 text-red-500 border-red-100'}`}
                      >
                        Deactivated
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-2">
                    {(isAdmin || isTeacher) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal({
                            type: 'edit',
                            level: 'subject',
                            node: sub,
                            name: sub.name,
                          });
                        }}
                        className={`p-1 rounded transition-colors ${isSelected ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-blue-500 hover:bg-blue-50'}`}
                        title="Rename Subject"
                      >
                        <i className="fas fa-edit text-[10px]"></i>
                      </button>
                    )}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        {isSubDeactivated ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReactivateSubject(sub.id);
                            }}
                            className={`p-1 rounded transition-colors ${isSelected ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-green-600 hover:bg-green-50'}`}
                            title="Reactivate Subject"
                          >
                            <i className="fas fa-redo-alt text-[10px]"></i>
                          </button>
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInitiateDeleteSubject(sub);
                          }}
                          className={`p-1 rounded transition-colors ${isSelected ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-red-primary hover:bg-red-50'}`}
                          title={
                            isSubDeactivated
                              ? 'Delete Subject Permanently'
                              : 'Delete / Deactivate Subject'
                          }
                        >
                          <i className="fas fa-trash-alt text-[10px]"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span className="group-hover:hidden">
                      <i className="fas fa-check-circle text-white/95 text-[10px]"></i>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const activeSubject = subjects.find((s) => String(s.id) === String(activeSubjectId));
  const activeBooks = books.filter((b) => String(b.subject_id) === String(activeSubjectId));

  const handleMoveSequence = async (node, direction) => {
    if (!node || !node.id) return;
    const bookLessons = syllabusData
      .filter((d) => String(d.book_id) === String(node.book_id))
      .sort((a, b) => {
        const seqA = a.sequence !== null && a.sequence !== undefined ? Number(a.sequence) : null;
        const seqB = b.sequence !== null && b.sequence !== undefined ? Number(b.sequence) : null;
        if (seqA !== null && seqB !== null) return seqA - seqB;
        if (seqA !== null) return -1;
        if (seqB !== null) return 1;
        return (Number(a.id) || 0) - (Number(b.id) || 0);
      });

    const currentIndex = bookLessons.findIndex((d) => String(d.id) === String(node.id));
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= bookLessons.length) return;

    const targetNode = bookLessons[targetIndex];

    const updatedBookLessons = bookLessons.map((item, idx) => ({
      ...item,
      sequence: idx + 1,
    }));

    const currentSeq = updatedBookLessons[currentIndex].sequence;
    const targetSeq = updatedBookLessons[targetIndex].sequence;
    updatedBookLessons[currentIndex].sequence = targetSeq;
    updatedBookLessons[targetIndex].sequence = currentSeq;

    if (isSupabaseMode) {
      setLoading(true);
      try {
        await Promise.all([
          supabase.from('syl_lessons').update({ sequence: targetSeq }).eq('id', node.id),
          supabase.from('syl_lessons').update({ sequence: currentSeq }).eq('id', targetNode.id),
        ]);
      } catch (err) {
        showToast('Error updating sequence: ' + err.message, 'error');
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    const newSyllabusData = syllabusData.map((d) => {
      const updatedItem = updatedBookLessons.find((u) => String(u.id) === String(d.id));
      return updatedItem ? updatedItem : d;
    });

    saveState({ syllabusData: newSyllabusData });
    showToast('Sequence updated successfully!', 'success');
  };

  const getNormalizedL1 = (rawL1) => {
    if (!rawL1 || !String(rawL1).trim()) return 'General / Level 1';
    const trimmed = String(rawL1).trim();
    if (trimmed.toLowerCase().startsWith('_revision') || trimmed.toLowerCase() === 'revision') {
      return '_Revision';
    }
    return trimmed;
  };

  // Build Hierarchical Tree for active book
  const renderTreeForBook = (book) => {
    const bookData = syllabusData.filter(
      (d) => String(d.book_id || '').trim() === String(book.id || '').trim()
    );
    const sortedBookData = [...bookData].sort((a, b) => {
      const seqA = a.sequence !== null && a.sequence !== undefined ? Number(a.sequence) : null;
      const seqB = b.sequence !== null && b.sequence !== undefined ? Number(b.sequence) : null;
      if (seqA !== null && seqB !== null) return seqA - seqB;
      if (seqA !== null) return -1;
      if (seqB !== null) return 1;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    const levels = (book.hierarchy_type || 'Unit, Chapter, Lesson').split(',').map((s) => s.trim());
    const l1Name = levels[0] || 'Level 1';
    const l2Name = levels[1] || 'Level 2';
    const l3Name = levels[2] || 'Level 3';

    // Group by level1
    const grouped = {};
    sortedBookData.forEach((d) => {
      const l1 = getNormalizedL1(d.level1);
      if (!grouped[l1]) grouped[l1] = {};

      const l2 = d.level2 && String(d.level2).trim() ? String(d.level2).trim() : null;
      const l3 = d.level3 && String(d.level3).trim() ? String(d.level3).trim() : null;

      if (l2) {
        if (!grouped[l1][l2]) {
          grouped[l1][l2] = {
            lessons: [],
            page_count: 0,
            complexity: 'Easy',
            hasPlaceholder: false,
            placeholderId: null,
          };
        }
        if (l3) {
          grouped[l1][l2].lessons.push(d);
        } else {
          // It's a Level 2 leaf/placeholder record
          grouped[l1][l2].page_count = d.page_count || 0;
          grouped[l1][l2].complexity = d.complexity || 'Easy';
          grouped[l1][l2].hasPlaceholder = true;
          grouped[l1][l2].placeholderId = d.id;
          grouped[l1][l2].placeholderNode = d;
        }
      } else {
        // If it's just a level1 leaf (e.g. just a unit without chapters)
        if (l3) {
          if (!grouped[l1]['_direct_lessons']) grouped[l1]['_direct_lessons'] = [];
          grouped[l1]['_direct_lessons'].push(d);
        }
      }
    });

    return (
      <div className="p-2 bg-white border-t border-light-border space-y-2">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-xs italic text-dark-muted text-center py-6 border border-dashed border-light-border rounded-xl">
            No data added under this book.
            {(isAdmin || isTeacher) && (
              <div className="mt-2.5">
                <button
                  onClick={() =>
                    setModal({
                      type: 'add',
                      level: 'node',
                      bookId: book.id,
                      parentLevel: 'book',
                      hierarchy: book.hierarchy_type,
                    })
                  }
                  className="px-3 py-1.5 bg-brand-primary text-white hover:bg-brand-primary/95 rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-1 active:scale-[0.98]"
                >
                  <i className="fas fa-plus"></i> Add {l1Name}
                </button>
              </div>
            )}
          </div>
        ) : (
          Object.keys(grouped).map((l1) => {
            const isL1Collapsed = collapsedNodes[`${book.id}-${l1}`];
            const l2Groups = grouped[l1];
            const l2Keys = Object.keys(l2Groups).filter((k) => k !== '_direct_lessons' && k);
            return (
              <div
                key={l1}
                className="border border-dashed border-light-border rounded-xl overflow-hidden pl-1 sm:pl-2"
              >
                <div className="bg-blue-400 p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-light-border/40 border-dashed">
                  <button
                    onClick={() => toggleCollapse(`${book.id}-${l1}`)}
                    className="flex items-center gap-2.5 text-left focus:outline-none flex-1 min-w-0"
                  >
                    <i
                      className={`fas fa-chevron-${isL1Collapsed ? 'right' : 'down'} text-[9px] text-dark-soft shrink-0`}
                    />
                    <i className="fas fa-folder-open text-orange-primary text-xs shrink-0" />
                    <span className="font-extrabold text-xs text-dark-deepblue truncate">
                      {l1 === '_Revision' ? 'Book Revision' : l1}
                    </span>
                    <span className="text-[10px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                      {Object.keys(l2Groups).filter((k) => k !== '_direct_lessons').length} {l2Name}
                      s
                    </span>
                  </button>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                    {l2Keys.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const allL2Collapsed = l2Keys.every(
                            (l2) => collapsedNodes[`${book.id}-${l1}-${l2}`]
                          );
                          setCollapsedNodes((prev) => {
                            const next = { ...prev };
                            if (allL2Collapsed) {
                              delete next[`${book.id}-${l1}`]; // Ensure L1 is expanded
                            }
                            l2Keys.forEach((l2) => {
                              if (allL2Collapsed) {
                                delete next[`${book.id}-${l1}-${l2}`];
                              } else {
                                next[`${book.id}-${l1}-${l2}`] = true;
                              }
                            });
                            return next;
                          });
                        }}
                        className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-white border border-light-border hover:bg-orange-50 transition-all flex items-center justify-center"
                        title={
                          l2Keys.every((l2) => collapsedNodes[`${book.id}-${l1}-${l2}`])
                            ? `Expand All ${l2Name}s`
                            : `Collapse All ${l2Name}s`
                        }
                      >
                        <i
                          className={`fas ${l2Keys.every((l2) => collapsedNodes[`${book.id}-${l1}-${l2}`]) ? 'fa-angle-double-down' : 'fa-angle-double-up'} text-xs`}
                        />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setModal({
                          type: 'add',
                          level: 'node',
                          bookId: book.id,
                          parentLevel: 'level1',
                          parent1: l1,
                          hierarchy: book.hierarchy_type,
                        })
                      }
                      className="px-2 py-1 rounded-md text-[9px] font-bold bg-white border border-light-border hover:bg-orange-50 transition-all"
                    >
                      <i className="fas fa-plus"></i> Add {l2Name}
                    </button>
                    <button
                      onClick={() =>
                        setModal({
                          type: 'edit',
                          level: 'level1',
                          bookId: book.id,
                          oldLevel1: l1,
                          name: l1 === '_Revision' ? 'Book Revision' : l1,
                          hierarchy: book.hierarchy_type,
                        })
                      }
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                    >
                      <i className="fas fa-edit text-xs"></i>
                    </button>
                    {(isAdmin || isTeacher) && (
                      <button
                        onClick={() =>
                          handleDeleteNode('level1', null, { bookId: book.id, level1: l1 })
                        }
                        className="p-1 text-red-primary hover:bg-red-50 rounded"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    )}
                  </div>
                </div>

                {!isL1Collapsed && (
                  <div className="p-1 bg-white space-y-3">
                    {Object.keys(l2Groups).length === 0 ? (
                      <div className="text-xs italic text-dark-muted pl-4">
                        No {l2Name}s added under this {l1Name}.
                      </div>
                    ) : (
                      Object.keys(l2Groups).map((l2) => {
                        if (l2 === '_direct_lessons') {
                          return l2Groups[l2].map((node, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50 border border-light-border/40 p-2 rounded-lg text-xs font-semibold pl-3 sm:pl-4"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <i className="fas fa-file-alt text-dark-soft text-[10px] shrink-0" />
                                <span className="truncate">{node.level3}</span>
                                {node.sequence !== undefined && node.sequence !== null && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 border rounded bg-amber-50 text-amber-800 shrink-0" title="Sequence Number">
                                    #{node.sequence}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1.5 items-center shrink-0 justify-end">
                                {(isAdmin || isTeacher) && (
                                  <div className="flex items-center gap-0.5 border rounded bg-white px-1">
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSequence(node, 'up')}
                                      className="p-0.5 text-gray-600 hover:text-brand-primary text-[10px]"
                                      title="Move Sequence Up"
                                    >
                                      <i className="fas fa-arrow-up"></i>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSequence(node, 'down')}
                                      className="p-0.5 text-gray-600 hover:text-brand-primary text-[10px]"
                                      title="Move Sequence Down"
                                    >
                                      <i className="fas fa-arrow-down"></i>
                                    </button>
                                  </div>
                                )}
                                <span className="text-[9px] font-bold px-1.5 py-0.5 border rounded-full shrink-0">
                                  <i className="far fa-file-lines mr-1" />
                                  {node.page_count} pages
                                </span>
                                <span
                                  className={`text-[8px] font-bold px-1.5 py-0.5 border rounded-full shrink-0 ${getComplexityBadgeClass(node.complexity)}`}
                                >
                                  {node.complexity}
                                </span>
                                <button
                                  onClick={() =>
                                    setModal({
                                      type: 'edit',
                                      level: 'level3',
                                      bookId: book.id,
                                      node: node,
                                      oldLevel1: l1,
                                      oldLevel3: node.level3,
                                      name: node.level3,
                                      pageCount: node.page_count,
                                      complexity: node.complexity,
                                      sequence: node.sequence,
                                      hierarchy: book.hierarchy_type,
                                    })
                                  }
                                  className="p-1 text-blue-500"
                                >
                                  <i className="fas fa-edit text-[10px]"></i>
                                </button>
                                {(isAdmin || isTeacher) && (
                                  <button
                                    onClick={() => handleDeleteNode('level3', node.id, node)}
                                    className="p-1 text-red-primary"
                                  >
                                    <i className="fas fa-trash-alt text-[10px]"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          ));
                        }

                        const isL2Collapsed = collapsedNodes[`${book.id}-${l1}-${l2}`];
                        const l3Nodes = l2Groups[l2];

                        return (
                          <div
                            key={l2}
                            className="bg-blue-100 border border-light-border/40 rounded-lg overflow-hidden pl-2 sm:pl-4"
                          >
                            <div className="p-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <button
                                onClick={() => toggleCollapse(`${book.id}-${l1}-${l2}`)}
                                className="flex items-center gap-2 text-left focus:outline-none flex-1 min-w-0"
                              >
                                <i
                                  className={`fas fa-chevron-${isL2Collapsed ? 'right' : 'down'} text-[8px] text-dark-soft shrink-0`}
                                />
                                <i className="fas fa-bookmark text-emerald-600 text-[10px] shrink-0" />
                                <span className="font-extrabold text-xs text-dark-primary truncate">
                                  {l2}
                                </span>
                                {l3Nodes.lessons.length > 0 ? (
                                  <span className="text-[9px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                                    {l3Nodes.lessons.length} {l3Name}s
                                  </span>
                                ) : !l3Nodes.hasPlaceholder ? (
                                  <span className="text-[9px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                                    No {l3Name}s
                                  </span>
                                ) : null}
                              </button>

                              {l3Nodes.lessons.length === 0 && l3Nodes.hasPlaceholder && (
                                <div className="flex gap-2 items-center shrink-0">
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 border rounded-full bg-white text-dark-soft">
                                    <i className="far fa-file-lines mr-1" />
                                    {l3Nodes.page_count} pages
                                  </span>
                                  <span
                                    className={`text-[8px] font-bold px-1.5 py-0.5 border rounded-full shrink-0 ${getComplexityBadgeClass(l3Nodes.complexity)}`}
                                  >
                                    {l3Nodes.complexity}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-1 shrink-0 justify-end">
                                {l3Nodes.lessons.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCollapse(`${book.id}-${l1}-${l2}`);
                                    }}
                                    className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-white border border-light-border hover:bg-emerald-50 transition-all flex items-center justify-center"
                                    title={
                                      isL2Collapsed
                                        ? `Expand All ${l3Name}s`
                                        : `Collapse All ${l3Name}s`
                                    }
                                  >
                                    <i
                                      className={`fas ${isL2Collapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-[9px]`}
                                    />
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    setModal({
                                      type: 'add',
                                      level: 'node',
                                      bookId: book.id,
                                      parentLevel: 'level2',
                                      parent1: l1,
                                      parent2: l2,
                                      hierarchy: book.hierarchy_type,
                                    })
                                  }
                                  className="px-2 py-0.5 rounded text-[8px] font-bold bg-white border border-light-border hover:bg-emerald-50 transition-all"
                                >
                                  <i className="fas fa-plus"></i> Add {l3Name}
                                </button>
                                <button
                                  onClick={() =>
                                    setModal({
                                      type: 'edit',
                                      level: 'level2',
                                      bookId: book.id,
                                      oldLevel1: l1,
                                      oldLevel2: l2,
                                      name: l2,
                                      hierarchy: book.hierarchy_type,
                                      pageCount:
                                        l3Nodes.lessons.length === 0 ? l3Nodes.page_count : null,
                                      complexity:
                                        l3Nodes.lessons.length === 0 ? l3Nodes.complexity : null,
                                      placeholderId: l3Nodes.placeholderId,
                                    })
                                  }
                                  className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                >
                                  <i className="fas fa-edit text-xs"></i>
                                </button>
                                {(isAdmin || isTeacher) && (
                                  <button
                                    onClick={() =>
                                      handleDeleteNode('level2', null, {
                                        bookId: book.id,
                                        level1: l1,
                                        level2: l2,
                                      })
                                    }
                                    className="p-1 text-red-primary hover:bg-red-50 rounded"
                                  >
                                    <i className="fas fa-trash-alt text-xs"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                            {!isL2Collapsed && l3Nodes.lessons.length > 0 && (
                              <div className="p-2 bg-white space-y-1.5">
                                {l3Nodes.lessons.map((node, idx) => (
                                  <div
                                    key={idx}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50 border border-light-border/40 p-2 rounded-lg text-xs font-semibold pl-3 sm:pl-4"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <i className="fas fa-file-alt text-dark-soft text-[10px] shrink-0" />
                                      <span className="truncate">{node.level3}</span>
                                      {node.sequence !== undefined && node.sequence !== null && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 border rounded bg-amber-50 text-amber-800 shrink-0" title="Sequence Number">
                                          #{node.sequence}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-1.5 items-center shrink-0 justify-end">
                                      {(isAdmin || isTeacher) && (
                                        <div className="flex items-center gap-0.5 border rounded bg-white px-1">
                                          <button
                                            type="button"
                                            onClick={() => handleMoveSequence(node, 'up')}
                                            className="p-0.5 text-gray-600 hover:text-brand-primary text-[10px]"
                                            title="Move Sequence Up"
                                          >
                                            <i className="fas fa-arrow-up"></i>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleMoveSequence(node, 'down')}
                                            className="p-0.5 text-gray-600 hover:text-brand-primary text-[10px]"
                                            title="Move Sequence Down"
                                          >
                                            <i className="fas fa-arrow-down"></i>
                                          </button>
                                        </div>
                                      )}
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 border rounded-full shrink-0">
                                        <i className="far fa-file-lines mr-1" />
                                        {node.page_count} pages
                                      </span>
                                      <span
                                        className={`text-[8px] font-bold px-1.5 py-0.5 border rounded-full shrink-0 ${getComplexityBadgeClass(node.complexity)}`}
                                      >
                                        {node.complexity}
                                      </span>
                                      <button
                                        onClick={() =>
                                          setModal({
                                            type: 'edit',
                                            level: 'level3',
                                            bookId: book.id,
                                            node: node,
                                            oldLevel1: l1,
                                            oldLevel2: l2,
                                            oldLevel3: node.level3,
                                            name: node.level3,
                                            pageCount: node.page_count,
                                            complexity: node.complexity,
                                            sequence: node.sequence,
                                            hierarchy: book.hierarchy_type,
                                          })
                                        }
                                        className="p-1 text-blue-500"
                                      >
                                        <i className="fas fa-edit text-[10px]"></i>
                                      </button>
                                      {(isAdmin || isTeacher) && (
                                        <button
                                          onClick={() => handleDeleteNode('level3', node.id, node)}
                                          className="p-1 text-red-primary"
                                        >
                                          <i className="fas fa-trash-alt text-[10px]"></i>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-light-bg overflow-hidden font-sans relative">
      {/* Mobile Navigation Header Bar */}
      <div className="flex md:hidden items-center justify-between p-3 bg-white border-b border-light-border shadow-xs shrink-0 z-20">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="px-3 py-1.5 bg-brand-lbg text-brand-primary border border-brand-primary/20 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-2xs active:scale-95"
        >
          <i className={`fas ${isMobileSidebarOpen ? 'fa-times' : 'fa-layer-group'}`}></i>
          <span>{isMobileSidebarOpen ? 'Close Curriculum' : 'Curriculum List'}</span>
        </button>
        {activeSubject && (
          <div className="text-right truncate max-w-[180px]">
            <span className="text-xs font-black text-dark-primary block truncate">
              {activeSubject.name}
            </span>
          </div>
        )}
      </div>

      {/* Curriculum Sidebar Container */}
      <div
        className={`${
          isMobileSidebarOpen ? 'flex' : 'hidden'
        } md:flex w-full md:w-80 bg-white border-r border-light-border flex-col h-full shadow-sm z-30 shrink-0 absolute md:relative inset-0`}
      >
        <div className="p-3 border-b border-light-border/50 bg-gradient-to-br from-white to-light-bg/30">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-black text-brand-primary flex items-center gap-2 tracking-tight">
              <i className="fas fa-layer-group text-brand-primary"></i> Curriculum
            </h2>
            <div className="flex items-center gap-1">
              {groupedSubjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (allClassificationsCollapsed) {
                      setCollapsedClassifications({});
                    } else {
                      const newCollapsed = {};
                      groupedSubjects.forEach((cls) => {
                        newCollapsed[cls.name] = true;
                      });
                      setCollapsedClassifications(newCollapsed);
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-light-lbg rounded-xl transition-all"
                  title={
                    allClassificationsCollapsed
                      ? 'Expand All Classifications'
                      : 'Collapse All Classifications'
                  }
                >
                  <i
                    className={`fas ${allClassificationsCollapsed ? 'fa-angle-double-down' : 'fa-angle-double-up'} text-base`}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 md:hidden rounded-xl"
                title="Close"
              >
                <i className="fas fa-times text-base"></i>
              </button>
            </div>
          </div>

          {(isAdmin || isTeacher) && (
            <div className="flex gap-2 pt-2 border-t border-light-border/50 bg-white">
              {isAdmin && (
                <button
                  onClick={() => setIsClassificationsModalOpen(true)}
                  className="flex-1 py-1.5 px-3 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                  title="Manage Subject Classifications"
                >
                  <i className="fas fa-sliders text-xs"></i>
                  <span>Classifications</span>
                </button>
              )}
              <button
                onClick={() => setModal({ type: 'add', level: 'subject' })}
                className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                title="Add New Subject"
              >
                <i className="fas fa-book-open text-xs"></i>
                <span>Add Subject</span>
              </button>
            </div>
          )}
          {isTeacher && (
            <div className="flex items-center gap-2 mt-2 px-1 pb-1">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAllSubjects}
                  onChange={(e) => setShowAllSubjects(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand-soft peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-primary"></div>
                <span className="ms-2 text-[9px] font-black text-gray-500 uppercase tracking-wider">
                  Show All Subjects
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
          {renderSubjectSelector('Unclassified', unclassifiedSubjects, true)}
          {groupedSubjects.map((cls) => renderSubjectSelector(cls.name, cls.subjects))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-light-bg overflow-y-auto custom-scrollbar relative">
        <div className="mx-auto w-full p-3 sm:p-4 md:p-6 space-y-4">
          {!activeSubject ? (
            <div className="text-center py-16 sm:py-20 px-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-light-border animate-in zoom-in duration-300">
                <i className="fas fa-book-open text-3xl sm:text-4xl text-brand-soft/40"></i>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-dark-primary mb-2">No Subject Selected</h3>
              <p className="text-xs sm:text-sm font-semibold text-dark-muted max-w-sm mx-auto mb-4">
                Select a subject from the curriculum sidebar or create a new one to begin managing curriculum.
              </p>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold shadow-md active:scale-95"
              >
                <i className="fas fa-layer-group"></i> Open Curriculum List
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-light-border shadow-sm">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-lg sm:text-xl font-black text-dark-primary tracking-tight">
                      {activeSubject.name}
                    </h1>
                  </div>
                  <p className="text-xs font-bold text-dark-muted">
                    Syllabus for{' '}
                    <span className="text-dark-secondary uppercase">
                      {classifications.find(
                        (c) => String(c.id) === String(activeSubject.classification_id)
                      )?.name || 'Unclassified'}
                    </span>
                  </p>
                </div>
                {(isAdmin || isTeacher) && (
                  <button
                    onClick={() =>
                      setModal({ type: 'add', level: 'book', parentId: activeSubject.id })
                    }
                    className="bg-brand-primary hover:bg-brand-primary/80 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] w-full sm:w-auto text-center shrink-0"
                  >
                    <i className="fas fa-plus mr-1.5"></i> Add Book
                  </button>
                )}
              </div>

              <div className="flex justify-between items-center px-2"></div>

              {activeBooks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-light-border border-dashed p-12 text-center">
                  <i className="fas fa-book text-3xl text-blue-primary mb-4"></i>
                  <h3 className="text-sm font-bold text-dark-primary mb-1">No Books Found</h3>
                  <p className="text-xs font-semibold text-dark-muted">
                    Add a book to start structuring the syllabus.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBooks.map((book) => {
                    const isBookCollapsed =
                      collapsedNodes[book.id] === undefined ? true : collapsedNodes[book.id];
                    const bookLevels = (book.hierarchy_type || 'Unit, Chapter, Lesson')
                      .split(',')
                      .map((s) => s.trim());
                    const bookL1Name = bookLevels[0] || 'Level 1';
                    const bookData = syllabusData.filter(
                      (d) => String(d.book_id || '').trim() === String(book.id || '').trim()
                    );
                    const l1Keys = Array.from(
                      new Set(bookData.map((d) => getNormalizedL1(d.level1)))
                    ).filter(Boolean);
                    const bookL1Count = l1Keys.length;

                    const mappedClassIds = bookClasses
                      .filter((bc) => String(bc.book_id) === String(book.id))
                      .map((bc) => String(bc.class_id));
                    const mappedClassNames = classes
                      .filter((c) => mappedClassIds.includes(String(c.id)))
                      .map((c) => c.name || c.class_name);

                    return (
                      <div
                        key={book.id}
                        className="bg-white rounded-2xl border border-light-border shadow-sm overflow-hidden animate-in fade-in duration-300"
                      >
                        <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-light-border/60">
                          <button
                            onClick={() => toggleCollapse(book.id)}
                            className="flex items-center gap-3 text-left focus:outline-none flex-1 min-w-0"
                          >
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 ${isBookCollapsed ? 'bg-light-lbg text-dark-soft' : 'bg-brand-lbg text-brand-primary'}`}
                            >
                              <i
                                className={`fas fa-chevron-${isBookCollapsed ? 'right' : 'down'} text-xs`}
                              />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-extrabold text-sm sm:text-base text-dark-primary flex items-center gap-2 flex-wrap">
                                <i className="fas fa-book text-blue-primary text-sm shrink-0" />
                                <span className="truncate">{book.name}</span>
                                <span className="text-[10px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                  {loadedBookIds.has(String(book.id))
                                    ? `${bookL1Count} ${bookL1Name}s / ${bookData.length} Lessons`
                                    : 'Expand to load lessons'}
                                </span>
                              </h3>
                              <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                                <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider shrink-0">
                                  Book ID: {book.id}
                                </span>
                                {mappedClassNames.length > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                    <i className="fas fa-graduation-cap text-[9px]"></i>
                                    Mapped to: {mappedClassNames.join(', ')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                    <i className="fas fa-exclamation-triangle text-[9px]"></i>
                                    Not Mapped
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5 flex-wrap w-full xl:w-auto justify-start xl:justify-end border-t xl:border-t-0 pt-2 xl:pt-0">
                            {(isAdmin || isTeacher) && (
                              <>
                                {l1Keys.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const allL1Collapsed = l1Keys.every(
                                        (l1) => collapsedNodes[`${book.id}-${l1}`]
                                      );
                                      setCollapsedNodes((prev) => {
                                        const next = { ...prev };
                                        if (allL1Collapsed) {
                                          delete next[book.id]; // Ensure book itself is expanded
                                        }
                                        l1Keys.forEach((l1) => {
                                          if (allL1Collapsed) {
                                            delete next[`${book.id}-${l1}`];
                                          } else {
                                            next[`${book.id}-${l1}`] = true;
                                          }
                                        });
                                        return next;
                                      });
                                    }}
                                    className="p-1.5 text-dark-soft hover:bg-light-lbg rounded-xl transition-all flex items-center justify-center border border-light-border bg-white"
                                    title={
                                      l1Keys.every((l1) => collapsedNodes[`${book.id}-${l1}`])
                                        ? `Expand All ${bookL1Name}s`
                                        : `Collapse All ${bookL1Name}s`
                                    }
                                  >
                                    <i
                                      className={`fas ${l1Keys.every((l1) => collapsedNodes[`${book.id}-${l1}`]) ? 'fa-angle-double-down' : 'fa-angle-double-up'} text-xs`}
                                    />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    initiateMapping(book);
                                  }}
                                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border border-indigo-200 shadow-2xs active:scale-[0.98]"
                                  title="Map Book to Classes"
                                >
                                  <i className="fas fa-graduation-cap text-xs"></i>
                                  <span>Map to Class</span>
                                </button>
                                <button
                                  onClick={() =>
                                    setModal({
                                      type: 'add',
                                      level: 'node',
                                      bookId: book.id,
                                      parentLevel: 'book',
                                      hierarchy: book.hierarchy_type,
                                    })
                                  }
                                  className="px-2.5 py-1.5 bg-blue-primary text-white hover:bg-blue-dark rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 active:scale-[0.98]"
                                >
                                  <i className="fas fa-plus"></i> Add {bookL1Name}
                                </button>
                                <button
                                  onClick={() => initiateCsvImport(book.id)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 bg-white rounded-xl transition-all flex items-center justify-center shadow-sm"
                                  title="Import CSV/Excel"
                                >
                                  <i className="fas fa-file-arrow-up text-xl"></i>
                                </button>
                                <button
                                  onClick={() => handleExportExcel(book)}
                                  className="p-2 text-emerald-700 hover:bg-emerald-50 bg-white rounded-xl transition-all flex items-center justify-center shadow-sm"
                                  title="Download Excel"
                                >
                                  <i className="fas fa-file-arrow-down text-xl"></i>
                                </button>
                                <button
                                  onClick={() =>
                                    setModal({
                                      type: 'edit',
                                      level: 'book',
                                      node: book,
                                      name: book.name,
                                    })
                                  }
                                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center shadow-sm"
                                  title="Edit Book"
                                >
                                  <i className="fas fa-edit text-xl"></i>
                                </button>
                              </>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteNode('book', book.id)}
                                className="p-2 text-red-600 hover:bg-red-50 hover:border-red-200 bg-white rounded-xl transition-all flex items-center justify-center shadow-sm"
                                title="Delete Book"
                              >
                                <i className="fas fa-trash-alt text-xl"></i>
                              </button>
                            )}
                          </div>
                        </div>
                        {!isBookCollapsed &&
                          (loadingBookIds.has(String(book.id)) ? (
                            <div className="p-6 text-center text-xs font-bold text-dark-muted bg-white border-t border-light-border flex items-center justify-center gap-2">
                              <i className="fas fa-spinner fa-spin text-brand-primary text-sm"></i>{' '}
                              Loading lessons...
                            </div>
                          ) : (
                            renderTreeForBook(book)
                          ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <SyllabusFormModal
          modal={modal}
          classifications={classifications}
          onClose={() => setModal(null)}
          onSave={handleSaveNode}
        />
      )}

      <ClassificationsModal
        isOpen={isClassificationsModalOpen}
        onClose={() => setIsClassificationsModalOpen(false)}
        classifications={classifications}
        subjects={subjects}
        onSaveClassifications={handleSaveClassifications}
        onBulkMapSubjects={handleBulkMapSubjects}
      />

      {mappingBook && (
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-dark-deepblue">Map Book to Classes</h3>
              <button
                onClick={() => setMappingBook(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="text-xs font-semibold text-gray-500 mb-2">
              Book: <strong className="text-dark-primary">{mappingBook.name}</strong>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {classes.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No classes found.</p>
              ) : (
                classes.map((cls) => {
                  const isMapped = tempMappings.includes(String(cls.id));
                  return (
                    <label
                      key={cls.id}
                      className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50/50 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isMapped}
                        onChange={() => handleToggleClassMapping(cls.id)}
                        className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-xs font-bold text-dark-primary">
                        {cls.name || cls.class_name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex gap-2 w-full pt-2">
              <button
                type="button"
                onClick={() => setMappingBook(null)}
                className="flex-1 px-4 py-2 bg-light-ui hover:bg-light-border text-dark-soft rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClassMappings}
                className="flex-1 px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold transition-all"
              >
                Save Mappings
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmConfig}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />

      {deleteModalSubject && (
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 rounded-full shrink-0">
                <i className="fas fa-trash-alt text-red-500 text-xl"></i>
              </div>
              <h3 className="text-base font-extrabold text-dark-deepblue">
                Delete or Deactivate Subject
              </h3>
            </div>

            <div className="space-y-2 text-left">
              <p className="text-xs text-dark-soft font-semibold leading-relaxed">
                Subject: <strong className="text-dark-primary">{deleteModalSubject.name}</strong>
              </p>

              {mappedClasses.length >= 2 ? (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-semibold space-y-1.5">
                  <p className="font-bold">
                    <i className="fas fa-ban mr-1"></i> Cannot Delete or Deactivate
                  </p>
                  <p>This subject is currently mapped to multiple timetables:</p>
                  <ul className="list-disc pl-5 font-bold">
                    {mappedClasses.map((cls, i) => (
                      <li key={i}>{cls}</li>
                    ))}
                  </ul>
                  <p className="font-normal mt-1 text-[11px]">
                    Please remove it from these timetables first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mappedClasses.length === 1 ? (
                    <p className="p-2.5 bg-amber-50 border border-amber-100 text-amber-800 text-[11px] rounded-lg font-bold">
                      <i className="fas fa-exclamation-triangle mr-1"></i> Warning: This subject is
                      currently mapped to 1 timetable ({mappedClasses[0]}).
                    </p>
                  ) : (
                    <p className="text-xs text-dark-muted">
                      This subject is not assigned to any timetables.
                    </p>
                  )}
                  <p className="text-xs text-dark-soft">Choose one of the following actions:</p>
                  <div className="bg-light-bg/30 p-3 rounded-xl border border-light-border/40 text-[11px] text-dark-soft space-y-2">
                    <p>
                      <strong>Deactivate (Soft Delete):</strong> The subject will be marked as
                      deactivated. It cannot be assigned to new timetable slots, but existing
                      timetable assignments will remain unless explicitly removed.
                    </p>
                    <p>
                      <strong>Permanently Delete:</strong> Completely delete the subject. This will
                      clear it from any existing slots and assignments.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 w-full pt-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setDeleteModalSubject(null)}
                className="flex-1 px-4 py-2.5 bg-light-ui text-dark-soft hover:bg-light-border rounded-xl text-xs font-bold transition-all outline-none"
              >
                Cancel
              </button>
              {mappedClasses.length < 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const subId = deleteModalSubject.id;
                      setDeleteModalSubject(null);
                      handleDeleteNode('subject', subId, { isSoftDelete: true });
                    }}
                    className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all outline-none"
                  >
                    Deactivate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const subId = deleteModalSubject.id;
                      setDeleteModalSubject(null);
                      handleDeleteNode('subject', subId, { isSoftDelete: false });
                    }}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all outline-none"
                  >
                    Permanently Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <SyllabusCsvMappingModal
        isOpen={isCsvMappingOpen}
        headers={csvHeaders}
        previewRows={csvRows.slice(0, 5)}
        onClose={() => setIsCsvMappingOpen(false)}
        onImport={handleExecuteCsvImport}
        hierarchy={
          books.find((b) => String(b.id) === String(importBookId))?.hierarchy_type ||
          'Unit, Chapter, Lesson'
        }
      />

      {/* Loading / Progress Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl p-6 max-w-sm w-full text-center flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-brand-primary/20 border-t-brand-primary animate-spin"></div>
              <i className="fas fa-file-import text-brand-primary text-xl absolute"></i>
            </div>
            {importProgress ? (
              <div className="w-full space-y-2">
                <h4 className="text-sm font-extrabold text-dark-primary">Importing Syllabus...</h4>
                <p className="text-xs font-semibold text-dark-muted">
                  Processing row {importProgress.current} of {importProgress.total}
                </p>
                <div className="w-full bg-light-bg rounded-full h-2.5 overflow-hidden border border-light-border">
                  <div
                    className="bg-brand-primary h-full transition-all duration-200 rounded-full"
                    style={{
                      width: `${Math.round((importProgress.current / (importProgress.total || 1)) * 100)}%`,
                    }}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-brand-primary block">
                  {Math.round((importProgress.current / (importProgress.total || 1)) * 100)}%
                  Complete
                </span>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-extrabold text-dark-primary">Processing...</h4>
                <p className="text-xs font-semibold text-dark-muted">
                  Please wait while updating syllabus
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,.xls,.xlsx"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

const SyllabusFormModal = ({ modal, classifications, onClose, onSave }) => {
  const {
    type,
    level,
    name: pName,
    hierarchy,
    bookId,
    oldLevel1,
    oldLevel2,
    oldLevel3,
    pageCount: pCount,
    complexity: pComp,
  } = modal;
  const isEdit = type === 'edit';

  const [name, setName] = useState(isEdit ? pName || modal.node?.name || '' : '');
  const [classificationId, setClassificationId] = useState(
    isEdit && level === 'subject' ? modal.node?.classification_id || '' : ''
  );
  const [requiresTeacher, setRequiresTeacher] = useState(
    isEdit && level === 'subject' ? modal.node?.requires_teacher !== false : true
  );
  const [hierarchyType, setHierarchyType] = useState(
    isEdit && level === 'book'
      ? modal.node?.hierarchy_type || 'Unit, Chapter, Title'
      : 'Unit, Chapter, Title'
  );
  const [pageCount, setPageCount] = useState(
    isEdit &&
      (level === 'level3' ||
        (level === 'level2' && modal.pageCount !== null && modal.pageCount !== undefined))
      ? pCount
      : 5
  );
  const [complexity, setComplexity] = useState(
    isEdit &&
      (level === 'level3' ||
        (level === 'level2' && modal.pageCount !== null && modal.pageCount !== undefined))
      ? pComp
      : 'Easy'
  );
  const [sequence, setSequence] = useState(
    isEdit ? (modal.sequence !== undefined ? modal.sequence : (modal.node?.sequence !== undefined ? modal.node.sequence : '')) : ''
  );

  const [bulkNodes, setBulkNodes] = useState([
    { id: 1, name: '', pageCount: 5, complexity: 'Easy' },
  ]);

  const [level3Exists, setLevel3Exists] = useState(true);

  const hType = hierarchy || modal.node?.hierarchy_type || 'Unit, Chapter, Lesson';
  const levels = hType.split(',').map((s) => s.trim());
  const l1Name = levels[0] || 'Level 1';
  const l2Name = levels[1] || 'Level 2';
  const l3Name = levels[2] || 'Level 3';

  const getLabelName = () => {
    if (level === 'subject') return 'Subject Name';
    if (level === 'book') return 'Book Name';
    if (level === 'level1') return `${l1Name} Name`;
    if (level === 'level2') return `${l2Name} Name`;
    if (level === 'level3') return `${l3Name} Name`;
    return 'Name';
  };

  const getModalTitle = () => {
    const action = isEdit ? 'Edit' : 'Add';
    if (level === 'subject') return `${action} Subject`;
    if (level === 'book') return `${action} Book`;
    if (level === 'node') {
      if (modal.parentLevel === 'level1') return `${action} ${l2Name}`;
      if (modal.parentLevel === 'level2') return `${action} ${l3Name}`;
      return `${action} ${l1Name}`;
    }
    if (level === 'level1') return `${action} ${l1Name}`;
    if (level === 'level2') return `${action} ${l2Name}`;
    if (level === 'level3') return `${action} ${l3Name}`;
    return `${action} Item`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
      if (!name.trim()) return showToast('Name field required.', 'error');
      onSave({
        type: 'edit',
        level,
        name: name.trim(),
        classificationId,
        requires_teacher: level === 'subject' ? requiresTeacher : undefined,
        hierarchyType,
        bookId,
        oldLevel1,
        oldLevel2,
        oldLevel3,
        pageCount,
        complexity,
        sequence: sequence !== '' ? Number(sequence) : undefined,
        node: modal.node,
      });
    } else {
      if (level === 'subject' || level === 'book') {
        if (!name.trim()) return showToast('Name field required.', 'error');
        onSave({
          type: 'add',
          level,
          name: name.trim(),
          classificationId,
          requires_teacher: level === 'subject' ? requiresTeacher : undefined,
          hierarchyType,
          parentId: modal.parentId,
        });
      } else if (level === 'node') {
        const validNodes = bulkNodes.filter((n) => n.name.trim());
        if (validNodes.length === 0) return showToast('Add at least one node.', 'error');

        let nodesList = [];
        if (modal.parentLevel === 'level1') {
          // Adding Level 2s under Level 1
          nodesList = validNodes.map((n) => ({
            level1: modal.parent1,
            level2: n.name.trim(),
            level3: null,
            pageCount: !level3Exists ? n.pageCount : 0,
            complexity: !level3Exists ? n.complexity : 'Easy',
          }));
        } else if (modal.parentLevel === 'level2') {
          // Adding Level 3s under Level 2
          nodesList = validNodes.map((n) => ({
            level1: modal.parent1,
            level2: modal.parent2,
            level3: n.name.trim(),
            pageCount: n.pageCount,
            complexity: n.complexity,
          }));
        } else {
          // Adding Level 1s under Book
          nodesList = validNodes.map((n) => ({
            level1: n.name.trim(),
            level2: null,
            level3: null,
          }));
        }
        onSave({ type: 'add', level, bookId, nodesList });
      }
    }
  };

  const getAddLabel = () => {
    if (level === 'subject' || level === 'book') return `Add ${level}`;
    if (modal.parentLevel === 'level1') return `Add ${l2Name}`;
    if (modal.parentLevel === 'level2') return `Add ${l3Name}`;
    return `Add ${l1Name}`;
  };

  return (
    <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-brand-primary p-5 text-white flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <i className={`fas ${isEdit ? 'fa-edit' : 'fa-plus'}`}></i> {getModalTitle()}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {(isEdit || level === 'subject' || level === 'book') && (
            <>
              <div>
                <label className="block text-xs font-bold text-dark-soft mb-1.5">
                  {getLabelName()}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-light-border rounded-xl"
                />
              </div>
              {level === 'subject' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-dark-soft mb-1.5">
                      Classification
                    </label>
                    <select
                      value={classificationId}
                      onChange={(e) => setClassificationId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl"
                    >
                      <option value="">No Classification</option>
                      {classifications.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="requiresTeacher"
                      checked={requiresTeacher}
                      onChange={(e) => setRequiresTeacher(e.target.checked)}
                      className="w-4 h-4 text-brand-primary border-light-border rounded focus:ring-brand-soft"
                    />
                    <label
                      htmlFor="requiresTeacher"
                      className="text-xs font-bold text-dark-soft cursor-pointer select-none"
                    >
                      Requires Teacher
                    </label>
                  </div>
                </>
              )}
              {level === 'book' && (
                <div>
                  <label className="block text-xs font-bold text-dark-soft mb-1.5">Hierarchy</label>
                  <select
                    value={hierarchyType}
                    onChange={(e) => setHierarchyType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="Unit, Chapter, Title">Unit, Chapter, Title</option>
                    <option value="Section, Chapter, Lesson">Section, Chapter, Lesson</option>
                    <option value="Module, Topic, Subtopic">Module, Topic, Subtopic</option>
                    <option value="Heading, Sub Heading, Lesson">
                      Heading, Sub Heading, Lesson
                    </option>
                  </select>
                </div>
              )}
              {isEdit &&
                (level === 'level3' ||
                  (level === 'level2' &&
                    modal.pageCount !== null &&
                    modal.pageCount !== undefined)) && (
                  <div className="flex gap-3">
                    <div className="w-1/3">
                      <label className="block text-xs font-bold text-dark-soft mb-1.5">Sequence</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Auto"
                        value={sequence}
                        onChange={(e) => setSequence(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-dark-soft mb-1.5">Pages</label>
                      <input
                        type="number"
                        min="0"
                        value={pageCount}
                        onChange={(e) => setPageCount(Number(e.target.value))}
                        className="w-full px-4 py-2 border rounded-xl"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-dark-soft mb-1.5">
                        Complexity
                      </label>
                      <select
                        value={complexity}
                        onChange={(e) => setComplexity(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Complex">Complex</option>
                      </select>
                    </div>
                  </div>
                )}
            </>
          )}

          {!isEdit && level === 'node' && (
            <div>
              {modal.parentLevel === 'level1' && (
                <div className="flex items-center justify-between bg-light-lbg/10 p-3 rounded-xl border border-light-border mb-3">
                  <span className="text-xs font-bold text-dark-primary">{l3Name} exists?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLevel3Exists(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${level3Exists ? 'bg-brand-primary text-white' : 'bg-light-bg text-dark-secondary'}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setLevel3Exists(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${!level3Exists ? 'bg-brand-primary text-white' : 'bg-light-bg text-dark-secondary'}`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold">{getAddLabel()} (Bulk Edit)</span>
                <button
                  type="button"
                  onClick={() =>
                    setBulkNodes([
                      ...bulkNodes,
                      { id: Date.now(), name: '', pageCount: 5, complexity: 'Easy' },
                    ])
                  }
                  className="text-[10px] bg-brand-lbg text-brand-primary px-2 py-1 rounded"
                >
                  Add Row
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bulkNodes.map((n, i) => (
                  <div key={n.id} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={n.name}
                      onChange={(e) =>
                        setBulkNodes(
                          bulkNodes.map((x) => (x.id === n.id ? { ...x, name: e.target.value } : x))
                        )
                      }
                      placeholder="Name"
                      className="flex-1 border px-2 py-1 rounded text-xs"
                    />
                    {(modal.parentLevel === 'level2' ||
                      (modal.parentLevel === 'level1' && !level3Exists)) && (
                      <>
                        <input
                          type="number"
                          placeholder="Pages"
                          title="Pages"
                          value={n.pageCount}
                          onChange={(e) =>
                            setBulkNodes(
                              bulkNodes.map((x) =>
                                x.id === n.id ? { ...x, pageCount: Number(e.target.value) } : x
                              )
                            )
                          }
                          className="w-12 border px-1 py-1 rounded text-xs"
                        />
                        <select
                          value={n.complexity}
                          title="Complexity"
                          onChange={(e) =>
                            setBulkNodes(
                              bulkNodes.map((x) =>
                                x.id === n.id ? { ...x, complexity: e.target.value } : x
                              )
                            )
                          }
                          className="border px-1 py-1 rounded text-xs"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Moderate">Mod</option>
                          <option value="Complex">Comp</option>
                        </select>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setBulkNodes(bulkNodes.filter((x) => x.id !== n.id))}
                      className="text-red-500"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-light-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-brand-primary text-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SyllabusManager;
