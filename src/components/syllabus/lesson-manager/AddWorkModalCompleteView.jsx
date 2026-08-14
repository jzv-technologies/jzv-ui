import React, { useState, useEffect } from 'react';
import { supabase, fetchAllPages } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';
import MapBookModal from './MapBookModal';

const todayStr = new Date().toISOString().split('T')[0];

const getBookLabels = (book) => {
  const rl = (book?.hierarchy_type || 'Unit, Chapter, Lesson')
    .split(/[,>]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const bl = rl[0] && rl[0].toLowerCase().includes('book') && rl.length > 1 ? rl.slice(1) : rl;
  return { lvl1: bl[0] || 'Unit', lvl2: bl[1] || 'Chapter', lvl3: bl[2] || 'Lesson', levels: bl };
};

const AddWorkModalCompleteView = ({
  isOpen,
  onClose,
  onSuccess,
  teacher,
  classes,
  books,
  bookClasses,
  setBookClasses,
  subjects,
  allTeachers = [],
  favorites,
  setFavorites,
  assignments,
  initialPlan,
}) => {
  const [awClassId, setAwClassId] = useState('');
  const [awSubjectId, setAwSubjectId] = useState('');
  const [awBookId, setAwBookId] = useState('');
  const [awBookData, setAwBookData] = useState([]);
  const [awLevel1, setAwLevel1] = useState('');
  const [awLevel2, setAwLevel2] = useState('');
  const [awLevel3, setAwLevel3] = useState('');
  const [awProgress, setAwProgress] = useState(10);
  const [awStatus, setAwStatus] = useState('in_progress');
  const [awComments, setAwComments] = useState('');
  const [awDate, setAwDate] = useState(todayStr);
  const [isAwForceRevision, setIsAwForceRevision] = useState(false);
  const [coverMode, setCoverMode] = useState(false);
  const [coverTeacherId, setCoverTeacherId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previousMaxProgress, setPreviousMaxProgress] = useState(0);

  // Map Book Modal
  const [isMapBookModalOpen, setIsMapBookModalOpen] = useState(false);

  // Favorites override Modal
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideSelection, setOverrideSelection] = useState('');
  const [pendingFavorite, setPendingFavorite] = useState(null);

  // Inline Add Level States
  const [inlineAddType, setInlineAddType] = useState(null); // 'level1' | 'level2' | 'level3'
  const [inlineAddName, setInlineAddName] = useState('');
  const [inlineAddPageCount, setInlineAddPageCount] = useState(0);
  const [inlineAddComplexity, setInlineAddComplexity] = useState('Easy');
  const [inlineAddWithLevel3, setInlineAddWithLevel3] = useState(false);
  const [inlineAddLevel3Name, setInlineAddLevel3Name] = useState('');

  // Permission & Exception states for Add Work
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [isAddWorkAllowed, setIsAddWorkAllowed] = useState(true);
  const [showRaiseException, setShowRaiseException] = useState(false);
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [submittingException, setSubmittingException] = useState(false);
  const [existingPendingRequest, setExistingPendingRequest] = useState(null);

  const checkAddWorkPermission = async () => {
    if (!teacher?.id || initialPlan) {
      setIsAddWorkAllowed(true);
      return;
    }
    setCheckingPermission(true);
    try {
      const teacherIdNum = Number(teacher.id);

      // 1. Check active approved request in request_tracker
      const { data: approvedReq } = await supabase
        .from('request_tracker')
        .select('*')
        .eq('requester_id', teacherIdNum)
        .eq('request_type', 'Add Work Access')
        .eq('status', 'approved')
        .gt('expire_at', new Date().toISOString())
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      setIsAddWorkAllowed(!!approvedReq);

      // 2. Check pending exception requests
      const { data: pendingReq } = await supabase
        .from('request_tracker')
        .select('*')
        .eq('requester_id', teacherIdNum)
        .eq('request_type', 'Add Work Access')
        .eq('status', 'pending')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      setExistingPendingRequest(pendingReq || null);
    } catch (err) {
      console.warn('Failed to check add_work permission:', err);
      setIsAddWorkAllowed(false);
    } finally {
      setCheckingPermission(false);
    }
  };

  const handleSubmitExceptionRequest = async (e) => {
    e.preventDefault();
    if (!exceptionNotes.trim()) {
      return showToast('Please enter a note for your exception request.', 'warning');
    }
    setSubmittingException(true);
    try {
      const newRecord = {
        requester_id: Number(teacher.id),
        requester_name: teacher.name || 'Teacher',
        request_type: 'Add Work Access',
        notes: exceptionNotes.trim(),
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('request_tracker')
        .insert(newRecord)
        .select()
        .single();

      if (error) throw error;

      setExistingPendingRequest(data || newRecord);
      setShowRaiseException(false);
      setExceptionNotes('');
      showToast('Exception request submitted to Management for approval.', 'success');
    } catch (err) {
      showToast('Failed to submit exception request: ' + err.message, 'error');
    } finally {
      setSubmittingException(false);
    }
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Initialize from initialPlan if provided
  useEffect(() => {
    if (isOpen && initialPlan) {
      setIsAddWorkAllowed(true);
      setAwClassId(String(initialPlan.class_id || ''));
      setAwSubjectId(String(initialPlan.subject_id || ''));
      setAwBookId(String(initialPlan.book_id || ''));
      setAwLevel1(initialPlan.lesson?.level1 || '');
      setAwLevel2(initialPlan.lesson?.level2 || '');
      setAwLevel3(initialPlan.lesson?.level3 || '');
      setAwStatus('completed');
      setAwProgress(100);
      setAwDate(todayStr);
      setCoverMode(false);
      setCoverTeacherId('');
      if (initialPlan.book_id) {
        loadAwBookData(initialPlan.book_id);
      }
    } else if (isOpen) {
      checkAddWorkPermission();
      // Reset form states
      setAwClassId('');
      setAwSubjectId('');
      setAwBookId('');
      setAwBookData([]);
      setAwLevel1('');
      setAwLevel2('');
      setAwLevel3('');
      setAwProgress(0);
      setAwStatus('in_progress');
      setAwComments('');
      setAwDate(todayStr);
      setIsAwForceRevision(false);
      setCoverMode(false);
      setCoverTeacherId('');
      setPreviousMaxProgress(0);
      setInlineAddType(null);
      setInlineAddName('');
      setInlineAddPageCount(0);
      setInlineAddComplexity('Easy');
      setInlineAddWithLevel3(false);
      setInlineAddLevel3Name('');
      setShowRaiseException(false);
      setExceptionNotes('');
    }
  }, [isOpen, initialPlan]);

  const loadAwBookData = async (bookId) => {
    if (!bookId) {
      setAwBookData([]);
      return;
    }
    try {
      const { data, error } = await fetchAllPages(
        'syl_lessons',
        '*',
        (q) =>
          q
            .eq('book_id', bookId)
            .order('sequence', { ascending: true, nullsFirst: false })
            .order('id', { ascending: true })
      );
      if (error) throw error;
      setAwBookData(data || []);
    } catch (err) {
      setAwBookData([]);
    }
  };

  useEffect(() => {
    if (isOpen && awBookId) {
      loadAwBookData(awBookId);
      if (!initialPlan) {
        setAwLevel1('');
        setAwLevel2('');
        setAwLevel3('');
      }
    }
  }, [awBookId, isOpen]);

  useEffect(() => {
    if (!coverMode) {
      setCoverTeacherId('');
      return;
    }

    if (!coverTeacherId && allTeachers.length > 0) {
      const firstOtherTeacher = allTeachers.find((t) => String(t.id) !== String(teacher?.id));
      if (firstOtherTeacher?.id) {
        setCoverTeacherId(String(firstOtherTeacher.id));
      }
    }
  }, [coverMode, allTeachers, teacher?.id, coverTeacherId]);

  const effectiveAssignmentTeacherId = coverMode ? coverTeacherId : String(teacher?.id || '');
  const coveredTeacher = allTeachers.find((t) => String(t.id) === String(coverTeacherId));

  const assignmentScopedRows = assignments.filter((a) => {
    if (!effectiveAssignmentTeacherId) return false;
    return String(a.teacher_id) === String(effectiveAssignmentTeacherId);
  });

  const assignmentClassIds = [...new Set(assignmentScopedRows.map((a) => String(a.class_id)))];

  const awClasses = classes.filter((c) => assignmentClassIds.includes(String(c.id)));

  // Cascading filters for logging
  const mappedBookIds = bookClasses
    .filter((bc) => String(bc.class_id) === String(awClassId))
    .map((bc) => String(bc.book_id));
  const awClassBooks = books.filter((b) => mappedBookIds.includes(String(b.id)));

  const assignmentSubjectIds = [
    ...new Set(
      assignmentScopedRows
        .filter((a) => String(a.class_id) === String(awClassId))
        .map((a) => String(a.subject_id))
    ),
  ];

  const awFilteredSubjects = subjects.filter((s) => {
    const inBookMap = awClassBooks.some((b) => String(b.subject_id) === String(s.id));
    const inTeacherAssignments = assignmentSubjectIds.includes(String(s.id));
    return inBookMap && inTeacherAssignments;
  });
  const awActiveSubjects = awFilteredSubjects;
  const awFilteredBooks = awClassBooks.filter((b) => String(b.subject_id) === String(awSubjectId));
  const awActiveBook = awFilteredBooks.find((b) => String(b.id) === String(awBookId));

  const awLabels = getBookLabels(awActiveBook);

  // Determine if revision mode
  const isRevisionMode = awLevel1 === '_Revision';

  // Determine level lists
  const awNonRevisionData = awBookData.filter((d) => d.level1 !== '_Revision');
  const awRevisionData = awBookData.filter((d) => d.level1 === '_Revision');

  const awLevel1s = [...new Set(awNonRevisionData.map((d) => d.level1).filter(Boolean))];
  const awLevel1sWithRevision = [...awLevel1s, ...(awRevisionData.length > 0 ? ['_Revision'] : [])];

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

  const isLeafNodeSelected = (() => {
    if (!awBookId || !awLevel1) return false;
    if (isRevisionMode) return false;
    if (awLevel3) return true;
    if (awLevel2) {
      const hasL3 = awBookData.some(
        (d) => d.level1 === awLevel1 && d.level2 === awLevel2 && d.level3
      );
      return !hasL3;
    }
    if (awLevel1) {
      const hasL2 = awBookData.some((d) => d.level1 === awLevel1 && d.level2);
      return !hasL2;
    }
    return false;
  })();

  const level3ExistsForLevel1 = (l1) => {
    return awBookData.some((d) => d.level1 === l1 && d.level3);
  };

  // Fetch previous max submission progress
  useEffect(() => {
    const updateDefaultProgress = async () => {
      if (!isOpen) return;
      if (!awClassId || !awBookId || !awLevel1) {
        setPreviousMaxProgress(0);
        if (!initialPlan) {
          setAwProgress(10);
          setAwStatus('in_progress');
        }
        return;
      }
      if (isRevisionMode) {
        setPreviousMaxProgress(0);
        return;
      }
      if (!isLeafNodeSelected) {
        setPreviousMaxProgress(0);
        if (!initialPlan) {
          setAwProgress(10);
          setAwStatus('in_progress');
        }
        return;
      }

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

      if (!targetLesson) {
        setPreviousMaxProgress(0);
        if (!initialPlan) {
          setAwProgress(10);
          setAwStatus('in_progress');
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('trk_lesson_level_progress')
          .select('completion_percentage, status')
          .eq('class_id', Number(awClassId))
          .eq('lesson_id', Number(targetLesson.id))
          .maybeSingle();

        if (error) throw error;

        const maxProgress = data ? Number(data.completion_percentage || 0) : 0;
        const currentStatus = data ? data.status || 'in_progress' : 'in_progress';

        setPreviousMaxProgress(maxProgress);
        if (!initialPlan) {
          setAwProgress(maxProgress || 10);
          setAwStatus(currentStatus);
        }
      } catch (err) {
        setPreviousMaxProgress(0);
        if (!initialPlan) {
          setAwProgress(10);
          setAwStatus('in_progress');
        }
      }
    };

    updateDefaultProgress();
  }, [awClassId, awBookId, awLevel1, awLevel2, awLevel3, awBookData, isLeafNodeSelected, isOpen]);

  // Handle status and progress sync
  const handleAwStatusChange = (newStatus) => {
    setAwStatus(newStatus);
    if (newStatus === 'completed') {
      setAwProgress(100);
    } else if (newStatus === 'in_progress' && awProgress === 100) {
      const defaultProgress = Math.max(10, previousMaxProgress);
      setAwProgress(defaultProgress);
    }
  };

  const handleAwProgressChange = (newProgress) => {
    const p = Number(newProgress);
    if (p < previousMaxProgress) return;
    setAwProgress(p);
    if (p === 100) {
      setAwStatus('completed');
    } else if (awStatus === 'completed' && p < 100) {
      setAwStatus('in_progress');
    }
  };

  // Favorites handlers
  const applyFavorite = (fav) => {
    setAwClassId(String(fav.classId));
    setAwSubjectId(String(fav.subjectId));
    setAwBookId(String(fav.bookId));
    setAwLevel1('');
    setAwLevel2('');
    setAwLevel3('');
    loadAwBookData(fav.bookId);
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

  const handleAddToFavorite = async (classId, subjectId, bookId) => {
    const cls = classes.find((c) => String(c.id) === String(classId));
    const book = books.find((b) => String(b.id) === String(bookId));
    const sub = subjects.find((s) => String(s.id) === String(subjectId));

    if (!cls || !book || !sub) {
      return showToast('Unable to add favorite: missing metadata.', 'warning');
    }

    const key = `${cls.name || cls.class_name} - ${book.name}`;
    const duplicate = favorites.find((f) => f.key === key);

    if (duplicate) {
      return showToast('This Class & Book combination is already in your favorites.', 'warning');
    }

    const newFav = {
      key,
      classId,
      classificationId: '',
      subjectId,
      bookId,
      className: cls.name || cls.class_name,
      subjectName: sub.name,
      bookName: book.name,
    };

    if (favorites.length >= 6) {
      setPendingFavorite(newFav);
      setIsOverrideModalOpen(true);
      return;
    }

    const updated = [...favorites, newFav];
    setFavorites(updated);
    localStorage.setItem(`jzv_syllabus_favorites_${teacher?.id}`, JSON.stringify(updated));

    if (teacher?.id) {
      await saveFavoritesToDB(teacher.id, updated);
    }
    showToast('Added to favorites!', 'success');
  };

  const handleExecuteFavoriteOverride = async () => {
    if (!overrideSelection || !pendingFavorite) return;

    const updated = favorites.map((fav) => (fav.key === overrideSelection ? pendingFavorite : fav));
    setFavorites(updated);
    localStorage.setItem(`jzv_syllabus_favorites_${teacher?.id}`, JSON.stringify(updated));

    if (teacher?.id) {
      await saveFavoritesToDB(teacher.id, updated);
    }

    showToast('Favorite override successful!', 'success');
    setIsOverrideModalOpen(false);
    setPendingFavorite(null);
    setOverrideSelection('');
  };

  // Inline Add Level Handler
  const handleInlineAddLevel = async () => {
    if (!inlineAddName.trim()) return showToast(`Name is required.`, 'warning');
    if (!awBookId) return showToast('Please select a book first.', 'warning');

    setSubmitting(true);
    try {
      let targetLevel1 = '';
      let targetLevel2 = null;
      let targetLevel3 = null;

      const getNextSequence = (dataList, bId) => {
        const seqs = (dataList || [])
          .filter((d) => String(d.book_id) === String(bId))
          .map((d) => Number(d.sequence) || 0);
        return (seqs.length > 0 ? Math.max(...seqs) : 0) + 1;
      };

      if (inlineAddType === 'level1') {
        targetLevel1 = inlineAddName.trim();
        const exists = awBookData.some((d) => d.level1 === targetLevel1);
        if (exists) throw new Error(`${awLabels.lvl1} "${targetLevel1}" already exists.`);

        const nextSeq = getNextSequence(awBookData, awBookId);
        const { data: insRes, error } = await supabase
          .from('syl_lessons')
          .insert([
            {
              book_id: awBookId,
              level1: targetLevel1,
              level2: null,
              level3: null,
              sequence: nextSeq,
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
          targetLevel3 = inlineAddLevel3Name.trim();

          const l2Exists = awBookData.some(
            (d) => d.level1 === targetLevel1 && d.level2 === targetLevel2
          );
          let updatedData = [...awBookData];

          if (!l2Exists) {
            const nextSeq1 = getNextSequence(updatedData, awBookId);
            const { data: l2Res, error: l2Err } = await supabase
              .from('syl_lessons')
              .insert([
                {
                  book_id: awBookId,
                  level1: targetLevel1,
                  level2: targetLevel2,
                  level3: null,
                  sequence: nextSeq1,
                  page_count: 0,
                  complexity: 'Easy',
                },
              ])
              .select();
            if (l2Err) throw l2Err;
            updatedData.push(l2Res[0]);
          }

          const nextSeq2 = getNextSequence(updatedData, awBookId);
          const { data: l3Res, error: l3Err } = await supabase
            .from('syl_lessons')
            .insert([
              {
                book_id: awBookId,
                level1: targetLevel1,
                level2: targetLevel2,
                level3: targetLevel3,
                sequence: nextSeq2,
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
          const nextSeq = getNextSequence(awBookData, awBookId);
          const recordData = {
            book_id: awBookId,
            level1: targetLevel1,
            level2: targetLevel2,
            level3: null,
            sequence: nextSeq,
            page_count: Number(inlineAddPageCount) || 0,
            complexity: inlineAddComplexity || 'Easy',
          };

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
              .from('syl_lessons')
              .update(recordData)
              .eq('id', placeholder.id)
              .select();
            if (error) throw error;
            updatedData = updatedData.map((d) =>
              String(d.id) === String(placeholder.id) ? updRes[0] : d
            );
          } else {
            const { data: insRes, error } = await supabase
              .from('syl_lessons')
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

        const nextSeq = getNextSequence(awBookData, awBookId);
        const recordData = {
          book_id: awBookId,
          level1: targetLevel1,
          level2: targetLevel2,
          level3: targetLevel3,
          sequence: nextSeq,
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
            .from('syl_lessons')
            .update(recordData)
            .eq('id', placeholder.id)
            .select();
          if (error) throw error;
          updatedData = updatedData.map((d) =>
            String(d.id) === String(placeholder.id) ? updRes[0] : d
          );
        } else {
          const { data: insRes, error } = await supabase
            .from('syl_lessons')
            .insert([recordData])
            .select();
          if (error) throw error;
          updatedData.push(insRes[0]);
        }

        setAwBookData(updatedData);
        showToast(`${awLabels.lvl3} added!`, 'success');
        setAwLevel3(targetLevel3);
      }

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

  // Submit Helper functions
  const ensureLessonLog = async (classId, lessonId, date, subjectId, bookId) => {
    const { data: existing } = await supabase
      .from('trk_lesson_level_progress')
      .select('*')
      .eq('class_id', classId)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (existing) return existing;

    const { data, error } = await supabase
      .from('trk_lesson_level_progress')
      .upsert(
        [
          {
            class_id: classId,
            subject_id: subjectId,
            book_id: bookId,
            lesson_id: lessonId,
            status: 'not_started',
          },
        ],
        { onConflict: 'class_id,lesson_id' }
      )
      .select();
    if (error) throw error;
    return data[0];
  };

  const addLogItem = async (
    progressId,
    date,
    teacherId,
    status,
    progress,
    comments,
    isRevision
  ) => {
    let dupQuery = supabase
      .from('trk_daily_teacher_progress')
      .select('id')
      .eq('progress_id', progressId)
      .eq('date', date);

    const effectiveTeacherId = teacherId || null;
    if (effectiveTeacherId) {
      dupQuery = dupQuery.eq('teacher_id', effectiveTeacherId);
    } else {
      dupQuery = dupQuery.is('teacher_id', null);
    }

    const { data: existingLogs, error: checkErr } = await dupQuery;
    if (checkErr) throw checkErr;

    if (existingLogs && existingLogs.length > 0) {
      throw new Error('Progress already added, you can update the previously submitted');
    }

    const { error } = await supabase.from('trk_daily_teacher_progress').insert([
      {
        progress_id: progressId,
        teacher_id: effectiveTeacherId,
        date: date,
        progress: Number(progress),
        is_revision: isRevision ? 'Y' : 'N',
        comments: comments.trim(),
      },
    ]);
    if (error) throw error;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (coverMode && !coverTeacherId) {
      return showToast('Please select the absent teacher you are covering.', 'warning');
    }
    if (!awClassId || !awBookId) return showToast('Please select Class and Book.', 'warning');

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

    let finalStatus = awStatus;
    let finalProgress = awProgress;
    let finalIsRevision = false;

    if (isRevisionMode) {
      finalStatus = 'completed';
      finalProgress = 100;
      finalIsRevision = true;
    } else if (!isLeafNodeSelected) {
      return showToast('Please select a leaf-level node to log progress.', 'warning');
    }

    if (!isRevisionMode && finalProgress < previousMaxProgress) {
      return showToast(
        `Progress percentage cannot be lesser than the previous max of ${previousMaxProgress}%.`,
        'warning'
      );
    }

    setSubmitting(true);
    try {
      const log = await ensureLessonLog(
        awClassId,
        targetLesson.id,
        awDate,
        awSubjectId,
        targetLesson.book_id
      );
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
      onSuccess();
      onClose();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-light-border max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-light-border">
            <h3 className="text-sm font-black text-dark-deepblue uppercase tracking-wider">
              Update Lesson Progress
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-dark-primary font-bold text-lg p-1 cursor-pointer"
            >
              <i className="fas fa-times" />
            </button>
          </div>

          {checkingPermission ? (
            <div className="py-12 text-center text-xs font-bold text-gray-400">
              <i className="fas fa-spinner fa-spin mr-2" /> Checking permissions...
            </div>
          ) : !initialPlan && !isAddWorkAllowed ? (
            <div className="py-4 space-y-4">
              {existingPendingRequest ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2 my-2">
                  <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto text-base font-bold">
                    <i className="fas fa-hourglass-half animate-pulse" />
                  </div>
                  <h4 className="font-extrabold text-xs text-amber-900">
                    Exception Request Pending Approval
                  </h4>
                  <p className="text-[11px] text-amber-800 font-semibold leading-relaxed max-w-sm mx-auto">
                    Your exception request submitted today is awaiting Management review.
                  </p>
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-xs italic text-gray-700 text-left font-semibold">
                    "{existingPendingRequest.notes}"
                  </div>
                </div>
              ) : showRaiseException ? (
                <form onSubmit={handleSubmitExceptionRequest} className="space-y-3 text-left my-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 font-extrabold flex items-center gap-2">
                    <i className="fas fa-[#3b82f6] fa-note-sticky text-blue-600 text-sm"></i>
                    <span>Requesting Add Work Exception for Today ({todayStr})</span>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-dark-soft mb-1">
                      Notes / Reason for Exception *
                    </label>
                    <textarea
                      rows="3"
                      required
                      value={exceptionNotes}
                      onChange={(e) => setExceptionNotes(e.target.value)}
                      placeholder="Type reason for exception (e.g. Internet connectivity issue, unassigned period, missed logging)..."
                      className="w-full border rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft border-gray-300"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRaiseException(false)}
                      className="px-3.5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingException}
                      className="px-4 py-2 text-xs font-black text-white bg-brand-primary hover:bg-brand-primary/95 rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {submittingException ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> Submitting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane"></i> Submit Exception Request
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 text-center space-y-4 my-2">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    <i className="fas fa-calendar-xmark"></i>
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-rose-900 mb-1">
                      Direct Activity Logging Restricted
                    </h4>
                    <p className="text-xs text-rose-800 font-bold leading-relaxed max-w-sm mx-auto">
                      Plan your lesson and then submit the activity from upcoming lessons screen Or
                      request exception for today
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowRaiseException(true)}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md inline-flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      <i className="fas fa-hand-holding-hand"></i> Raise Exception
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Favorites pills */}
              {favorites.length > 0 && (
                <div className="mb-4 p-1 bg-amber-50/50 border border-amber-100 rounded-xl text-left">
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

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {/* Cover for Absent Teacher checkbox */}
                <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-primary select-none">
                    <input
                      type="checkbox"
                      checked={coverMode}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setCoverMode(isChecked);
                        setAwClassId('');
                        setAwSubjectId('');
                        setAwBookId('');
                        setAwBookData([]);
                        setAwLevel1('');
                        setAwLevel2('');
                        setAwLevel3('');
                        if (!isChecked) {
                          setCoverTeacherId('');
                        }
                      }}
                      className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                    />
                    Cover for Absent Teacher
                  </label>

                  {coverMode && (
                    <div className="mt-1 pt-2 border-t border-brand-primary/15">
                      <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                        Select Absent Teacher
                      </label>
                      <select
                        value={coverTeacherId}
                        onChange={(e) => {
                          setCoverTeacherId(e.target.value);
                          setAwClassId('');
                          setAwSubjectId('');
                          setAwBookId('');
                          setAwBookData([]);
                          setAwLevel1('');
                          setAwLevel2('');
                          setAwLevel3('');
                        }}
                        className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft font-bold text-gray-700"
                      >
                        <option value="">Select Teacher</option>
                        {allTeachers
                          .filter((t) => String(t.id) !== String(teacher?.id))
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                      {coverTeacherId && coveredTeacher?.name && (
                        <p className="mt-2 text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-lg border border-brand-primary/20">
                          Logging work covering for:{' '}
                          <span className="font-extrabold">{coveredTeacher.name}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-extrabold text-dark-soft uppercase">
                      Class
                    </label>
                  </div>
                  <select
                    value={awClassId}
                    onChange={(e) => {
                      setAwClassId(e.target.value);
                      setAwSubjectId('');
                      setAwBookId('');
                      setAwBookData([]);
                      setAwLevel1('');
                      setAwLevel2('');
                      setAwLevel3('');
                    }}
                    className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft font-bold text-gray-700"
                  >
                    <option value="">Select Class</option>
                    {awClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.class_name}
                      </option>
                    ))}
                  </select>
                </div>

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
                      className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft font-bold text-gray-700"
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

                {/* Book */}
                {awClassId && awSubjectId && (
                  <div>
                    <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                      Syllabus Book
                    </label>
                    <select
                      value={awBookId}
                      onChange={(e) => {
                        if (e.target.value === 'map-new-book') {
                          setIsMapBookModalOpen(true);
                        } else {
                          setAwBookId(e.target.value);
                          setAwBookData([]);
                          setAwLevel1('');
                          setAwLevel2('');
                          setAwLevel3('');
                        }
                      }}
                      className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft font-bold text-gray-700"
                    >
                      <option value="">Select Book</option>
                      {awFilteredBooks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                      {awClassId && awSubjectId && (
                        <option value="map-new-book" className="text-indigo-600 font-bold">
                          + Map Book to Class...
                        </option>
                      )}
                    </select>
                  </div>
                )}

                {/* Level 1 dropdown */}
                {awBookId && awBookData.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-extrabold text-dark-soft uppercase">
                        Level 1 (Topic/Unit)
                      </label>
                      {!initialPlan && (
                        <button
                          type="button"
                          onClick={() => setInlineAddType('level1')}
                          className="text-[10px] font-black text-brand-primary hover:underline cursor-pointer"
                        >
                          + Add {awLabels.lvl1}
                        </button>
                      )}
                    </div>
                    <select
                      value={awLevel1}
                      onChange={(e) => {
                        setAwLevel1(e.target.value);
                        setAwLevel2('');
                        setAwLevel3('');
                      }}
                      className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft font-bold text-gray-700"
                    >
                      <option value="">Select Level 1</option>
                      {awLevel1sWithRevision.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl === '_Revision' ? 'Revision' : lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Level 2 dropdown */}
                {awLevel1 && awLevel2s.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-extrabold text-dark-soft uppercase">
                        Level 2 (Chapter/Sub-unit)
                      </label>
                      {!initialPlan && !isRevisionMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineAddType('level2');
                            setInlineAddWithLevel3(level3ExistsForLevel1(awLevel1));
                          }}
                          className="text-[10px] font-black text-brand-primary hover:underline cursor-pointer"
                        >
                          + Add {awLabels.lvl2}
                        </button>
                      )}
                    </div>
                    <select
                      value={awLevel2}
                      onChange={(e) => {
                        setAwLevel2(e.target.value);
                        setAwLevel3('');
                      }}
                      className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft font-bold text-gray-700"
                    >
                      <option value="">Select Level 2</option>
                      {awLevel2s.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Level 3 dropdown */}
                {awLevel1 && awLevel2 && awLevel3s.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-extrabold text-dark-soft uppercase">
                        Level 3 (Lesson/Detail)
                      </label>
                      {!initialPlan && !isRevisionMode && (
                        <button
                          type="button"
                          onClick={() => setInlineAddType('level3')}
                          className="text-[10px] font-black text-brand-primary hover:underline cursor-pointer"
                        >
                          + Add {awLabels.lvl3}
                        </button>
                      )}
                    </div>
                    <select
                      value={awLevel3}
                      onChange={(e) => setAwLevel3(e.target.value)}
                      className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft font-bold text-gray-700"
                    >
                      <option value="">Select Level 3</option>
                      {awLevel3s.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* If selected path has level3 but level3 not selected, prompt user */}
                {awLevel2 && level3ExistsForLevel1(awLevel1) && !awLevel3 && (
                  <p className="text-[10px] font-bold text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                    <i className="fas fa-circle-info mr-1" /> This topic contains Level-3 subtopics.
                    Please select a Level-3 subtopic to log progress.
                  </p>
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

                    <input
                      type="text"
                      placeholder={`${inlineAddType === 'level1' ? awLabels.lvl1 : inlineAddType === 'level2' ? awLabels.lvl2 : awLabels.lvl3} Name`}
                      value={inlineAddName}
                      onChange={(e) => setInlineAddName(e.target.value)}
                      className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-300 font-bold"
                    />

                    {inlineAddType === 'level2' && level3ExistsForLevel1(awLevel1) && (
                      <label className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 p-2 rounded-xl border border-indigo-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inlineAddWithLevel3}
                          onChange={(e) => {
                            setInlineAddWithLevel3(e.target.checked);
                            setInlineAddLevel3Name('');
                          }}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                        Add with {awLabels.lvl3}?
                      </label>
                    )}

                    {inlineAddType === 'level2' && inlineAddWithLevel3 && (
                      <input
                        type="text"
                        placeholder={`${awLabels.lvl3} Name`}
                        value={inlineAddLevel3Name}
                        onChange={(e) => setInlineAddLevel3Name(e.target.value)}
                        className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-300 font-bold"
                      />
                    )}

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
                            className="w-full bg-white border rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-300 font-bold"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">
                            Complexity
                          </label>
                          <select
                            value={inlineAddComplexity}
                            onChange={(e) => setInlineAddComplexity(e.target.value)}
                            className="w-full bg-white border rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-300 font-bold text-gray-700"
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
                      className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                    >
                      {submitting
                        ? 'Adding...'
                        : `Add ${inlineAddType === 'level1' ? awLabels.lvl1 : inlineAddType === 'level2' ? awLabels.lvl2 : awLabels.lvl3}`}
                    </button>
                  </div>
                )}

                {/* Date */}
                {awBookId && (
                  <div>
                    <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                      Log Date
                    </label>
                    <input
                      type="date"
                      value={awDate}
                      onChange={(e) => setAwDate(e.target.value)}
                      className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft font-bold text-gray-700"
                    />
                  </div>
                )}

                {/* Status & Progress slider (rendered only for leaf nodes and non-revision) */}
                {awBookId &&
                  awLevel1 &&
                  !isRevisionMode &&
                  isLeafNodeSelected &&
                  !isAwForceRevision && (
                    <div className="space-y-4 bg-gray-50/50 p-4 border border-dashed rounded-2xl">
                      <div>
                        <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                          Completion Status
                        </label>
                        <select
                          value={awStatus}
                          onChange={(e) => handleAwStatusChange(e.target.value)}
                          className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft cursor-pointer font-bold text-gray-700"
                        >
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                          <span>Current Progress</span>
                          <span className="text-brand-primary text-xs font-black bg-brand-primary/10 px-2 py-0.5 rounded-full select-none">
                            {awProgress}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={awStatus === 'in_progress' ? previousMaxProgress : 0}
                          max="100"
                          value={awProgress}
                          onChange={(e) => handleAwProgressChange(e.target.value)}
                          className="w-full accent-brand-primary cursor-pointer py-1"
                        />
                        <div className="flex justify-between text-[9px] font-bold text-gray-400">
                          <span>0%</span>
                          {previousMaxProgress > 0 && (
                            <span className="text-amber-600 font-extrabold">
                              Previous Max: {previousMaxProgress}%
                            </span>
                          )}
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Remarks */}
                {awBookId && (
                  <div>
                    <label className="block text-[10px] font-extrabold text-dark-soft uppercase mb-1">
                      Comments / Remarks
                    </label>
                    <textarea
                      value={awComments}
                      onChange={(e) => setAwComments(e.target.value)}
                      placeholder="Optional remarks on progress, coverage, issues..."
                      className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-soft h-16 resize-none font-bold text-gray-755"
                    />
                  </div>
                )}

                {/* Form actions */}
                <div className="flex justify-between items-center pt-4 border-t flex-wrap gap-3">
                  {awBookId && awClassId && (
                    <button
                      type="button"
                      onClick={() => handleAddToFavorite(awClassId, awSubjectId, awBookId)}
                      disabled={!awClassId || !awBookId || submitting}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all border border-amber-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-star text-amber-500" /> Save Favorite
                    </button>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border rounded-xl text-xs font-black hover:bg-gray-50 transition-all cursor-pointer h-[34px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-brand-primary hover:bg-brand-secondary text-white px-5 py-2 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer disabled:opacity-50 h-[34px] flex items-center justify-center"
                    >
                      {submitting ? 'Saving...' : 'Save Changes '}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Override favorites Modal */}
      {isOverrideModalOpen && pendingFavorite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border text-left space-y-4">
            <h4 className="font-black text-sm text-dark-primary uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <i className="fas fa-triangle-exclamation text-amber-500" /> Favorites Limit Reached
            </h4>
            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              You can only save up to 6 favorites. Select an existing favorite you want to replace:
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {favorites.map((fav) => (
                <label
                  key={fav.key}
                  className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 hover:bg-amber-50 border rounded-xl cursor-pointer text-xs font-bold text-gray-700 transition-colors select-none font-bold"
                >
                  <input
                    type="radio"
                    name="override-favorite"
                    value={fav.key}
                    checked={overrideSelection === fav.key}
                    onChange={(e) => setOverrideSelection(e.target.value)}
                    className="w-4 h-4 text-brand-primary border-gray-300 focus:ring-brand-primary cursor-pointer"
                  />
                  <span>{fav.key}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsOverrideModalOpen(false);
                  setPendingFavorite(null);
                  setOverrideSelection('');
                }}
                className="px-4 py-2 border rounded-xl text-xs font-black hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteFavoriteOverride}
                disabled={!overrideSelection}
                className="bg-brand-primary hover:bg-brand-secondary text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {isMapBookModalOpen && (
        <MapBookModal
          onClose={() => setIsMapBookModalOpen(false)}
          classId={awClassId}
          subjectId={awSubjectId}
          classes={classes}
          subjects={subjects}
          allBooks={books}
          bookClasses={bookClasses}
          setBookClasses={(updated) => {
            setBookClasses(updated);
            localStorage.setItem('jzv_map_class_books', JSON.stringify(updated));
          }}
        />
      )}
    </>
  );
};

export default AddWorkModalCompleteView;
