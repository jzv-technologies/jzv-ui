// src/components/portals/teacher/LessonPlanner.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase, fetchAllPages } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

// Module-level cache to persist data across page activations / subview toggles
let lessonPlannerCache = {
  userId: null,
  teacher: null,
  classes: [],
  subjects: [],
  assignments: [],
  books: [],
  bookClasses: [],
  allLessons: [],
  lessonPlans: [],
  allTeachers: [],
  selectedTeacherId: '',
  selectedClassId: '',
  selectedSubjectId: '',
  selectedBookId: '',
  selectedLessonIds: new Set(),
};

const LessonPlanner = ({ user, teacherRecord, role = 'teacher' }) => {
  const isAdminView = role === 'admin' || role === 'management';

  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // Separate saving state to prevent full screen reloads
  const [error, setError] = useState(null);

  // Mobile tab switcher state
  const [activeMobileTab, setActiveMobileTab] = useState('syllabus'); // 'syllabus' | 'timeline'

  // Teacher context
  const [teacher, setTeacher] = useState(null);
  const [allTeachers, setAllTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(() =>
    lessonPlannerCache.userId === user?.id ? lessonPlannerCache.selectedTeacherId : ''
  );

  // Data
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [books, setBooks] = useState([]);
  const [bookClasses, setBookClasses] = useState([]);
  const [allLessons, setAllLessons] = useState(() =>
    lessonPlannerCache.userId === user?.id ? lessonPlannerCache.allLessons : []
  );
  const [lessonPlans, setLessonPlans] = useState([]);

  // Selection
  const [selectedClassId, setSelectedClassId] = useState(() =>
    lessonPlannerCache.userId === user?.id ? lessonPlannerCache.selectedClassId : ''
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(() =>
    lessonPlannerCache.userId === user?.id ? lessonPlannerCache.selectedSubjectId : ''
  );
  const [selectedBookId, setSelectedBookId] = useState(() =>
    lessonPlannerCache.userId === user?.id ? lessonPlannerCache.selectedBookId : ''
  );

  // Multi-select for syllabus leaves
  const [selectedLessonIds, setSelectedLessonIds] = useState(() =>
    lessonPlannerCache.userId === user?.id ? lessonPlannerCache.selectedLessonIds : new Set()
  );

  // Active targets in timeline
  const [activeTargetDate, setActiveTargetDate] = useState(null);
  const [activeTargetEndDate, setActiveTargetEndDate] = useState(null);
  const [activeTargetWeek, setActiveTargetWeek] = useState(null);

  // Custom multi-select Assign Lessons Modal Target State
  const [assignModalTarget, setAssignModalTarget] = useState(null); // { date: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', week: number }
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [modalSelectedIds, setModalSelectedIds] = useState(new Set());
  const [modalCollapsedNodes, setModalCollapsedNodes] = useState(new Set());

  // Inline rescheduling state for planned lessons
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editWeek, setEditWeek] = useState('');

  // Drag over tracking
  const [draggedOverDate, setDraggedOverDate] = useState(null);
  const [draggedOverWeek, setDraggedOverWeek] = useState(null);

  // Collapse state for syllabus tree
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());

  // Settings
  const [planningMode, setPlanningMode] = useState('date');
  const [timelineWeeks, setTimelineWeeks] = useState(4);
  const [timelineDays, setTimelineDays] = useState(14);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  // Helper function to generate array of date strings between startDate and endDate
  const getDatesInRange = (startDateStr, endDateStr) => {
    if (!startDateStr) return [];
    if (!endDateStr || endDateStr === startDateStr) return [startDateStr];

    const dates = [];
    let curr = new Date(startDateStr);
    let end = new Date(endDateStr);

    if (isNaN(curr.getTime())) return [];
    if (isNaN(end.getTime())) return [startDateStr];

    if (curr > end) {
      const temp = curr;
      curr = end;
      end = temp;
    }

    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  // Keep selection and target cache updated
  useEffect(() => {
    if (user?.id) {
      lessonPlannerCache.userId = user.id;
      lessonPlannerCache.selectedTeacherId = selectedTeacherId;
      lessonPlannerCache.selectedClassId = selectedClassId;
      lessonPlannerCache.selectedSubjectId = selectedSubjectId;
      lessonPlannerCache.selectedBookId = selectedBookId;
      lessonPlannerCache.selectedLessonIds = selectedLessonIds;
      lessonPlannerCache.allLessons = allLessons;
    }
  }, [
    user,
    selectedTeacherId,
    selectedClassId,
    selectedSubjectId,
    selectedBookId,
    selectedLessonIds,
    allLessons,
  ]);

  // Reset active targets when mode changes
  useEffect(() => {
    setActiveTargetDate(null);
    setActiveTargetEndDate(null);
    setActiveTargetWeek(null);
  }, [planningMode]);

  // -------------------------
  // Data Fetching
  // -------------------------
  useEffect(() => {
    if (!user?.id) {
      setLoading(true);
      return;
    }

    const fetchAll = async () => {
      // Check if cache matches the current user
      if (lessonPlannerCache.userId === user.id && lessonPlannerCache.classes.length > 0) {
        console.log('LessonPlanner: Loading from cache');
        setClasses(lessonPlannerCache.classes);
        setSubjects(lessonPlannerCache.subjects);
        setAssignments(lessonPlannerCache.assignments);
        setBooks(lessonPlannerCache.books);
        setBookClasses(lessonPlannerCache.bookClasses);
        setAllLessons(lessonPlannerCache.allLessons);
        setLessonPlans(lessonPlannerCache.lessonPlans);
        if (isAdminView) {
          setAllTeachers(lessonPlannerCache.allTeachers);
        } else {
          setTeacher(lessonPlannerCache.teacher);
        }
        setInitialized(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const queries = [
          supabase.from('classes').select('*'),
          supabase.from('syl_subjects').select('*'),
          supabase.from('class_assignments').select('*'),
          supabase.from('syl_books').select('*'),
          supabase.from('map_class_books').select('*'),
          selectedBookId
            ? fetchAllPages('syl_lessons', '*', (q) =>
                q
                  .eq('book_id', selectedBookId)
                  .order('sequence', { ascending: true, nullsFirst: false })
                  .order('id', { ascending: true })
              )
            : Promise.resolve({ data: [], error: null }),
          fetchAllPages('lesson_plans', '*'),
        ];

        if (isAdminView) {
          queries.push(
            supabase.rpc('get_teachers_with_auth_secure', { p_auth_id: user?.id || null })
          );
        } else {
          // Resolve teacher for teacher role
          let teacherData = teacherRecord || null;
          if (!teacherData) {
            const { data, error: teachErr } = await supabase.rpc('get_teachers_with_auth_secure', {
              p_auth_id: user?.id || null,
            });

            if (teachErr) {
              const { data: currentTeacherData, error: currentTeacherErr } = await supabase.rpc(
                'get_current_teacher_details'
              );
              if (currentTeacherErr) throw currentTeacherErr;
              const currentTeacher = Array.isArray(currentTeacherData)
                ? currentTeacherData[0]
                : currentTeacherData || null;
              teacherData = currentTeacher
                ? {
                    id: currentTeacher.id,
                    teacher_id: currentTeacher.id,
                    name: currentTeacher.name,
                    auth_id: user?.id || null,
                    is_male: currentTeacher.is_male,
                    is_active: true,
                  }
                : null;
            } else {
              const teacherRows = Array.isArray(data) ? data : [];
              teacherData =
                teacherRows.find((t) => String(t.auth_id || '') === String(user?.id || '')) ||
                teacherRows[0] ||
                null;
            }
          }
          const normalizedTeacher = teacherData
            ? {
                ...teacherData,
                id: teacherData.id ?? teacherData.teacher_id,
                name: teacherData.name ?? teacherData.full_name ?? '',
              }
            : null;
          if (!normalizedTeacher?.id) throw new Error(`No teacher record found for this user.`);
          setTeacher(normalizedTeacher);
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
          { data: dbAllLessons },
          { data: dbLessonPlans },
          teachersResult,
        ] = results;

        const resolvedClasses = dbClasses || [];
        const resolvedSubjects = dbSubjects || [];
        const resolvedAssignments = dbAssignments || [];
        const resolvedBooks = dbBooks || [];
        const resolvedBookClasses = dbBookClasses || [];
        const resolvedLessons = dbAllLessons || [];
        const resolvedLessonPlans = dbLessonPlans || [];
        const resolvedTeachers =
          isAdminView && teachersResult
            ? (teachersResult.data || []).map((t) => ({
                ...t,
                id: t.id ?? t.teacher_id,
                name: t.name ?? t.full_name ?? '',
              }))
            : [];

        setClasses(resolvedClasses);
        setSubjects(resolvedSubjects);
        setAssignments(resolvedAssignments);
        setBooks(resolvedBooks);
        setBookClasses(resolvedBookClasses);
        setAllLessons(resolvedLessons);
        setLessonPlans(resolvedLessonPlans);

        if (isAdminView) {
          setAllTeachers(resolvedTeachers);
        }

        // Cache the loaded data
        lessonPlannerCache = {
          ...lessonPlannerCache,
          userId: user.id,
          classes: resolvedClasses,
          subjects: resolvedSubjects,
          assignments: resolvedAssignments,
          books: resolvedBooks,
          bookClasses: resolvedBookClasses,
          allLessons: resolvedLessons,
          lessonPlans: resolvedLessonPlans,
          allTeachers: resolvedTeachers,
          teacher: isAdminView ? null : teacherRecord || lessonPlannerCache.teacher,
        };

        setInitialized(true);
      } catch (err) {
        console.error('LessonPlanner fetchAll failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, teacherRecord, isAdminView]);

  // -------------------------
  // Filtering and Selectors
  // -------------------------
  const filterTeacherId = isAdminView ? selectedTeacherId : teacher?.id;

  const availableClasses = useMemo(() => {
    if (isAdminView && !selectedTeacherId) {
      return classes;
    }
    return classes.filter((c) =>
      assignments.some(
        (a) =>
          String(a.class_id) === String(c.id) && String(a.teacher_id) === String(filterTeacherId)
      )
    );
  }, [classes, assignments, isAdminView, selectedTeacherId, filterTeacherId]);

  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    if (isAdminView && !selectedTeacherId) {
      const subjectIds = new Set(
        assignments
          .filter((a) => String(a.class_id) === String(selectedClassId))
          .map((a) => String(a.subject_id))
      );
      return subjects.filter((s) => subjectIds.has(String(s.id)));
    }
    const subjectIds = assignments
      .filter(
        (a) =>
          String(a.class_id) === String(selectedClassId) &&
          String(a.teacher_id) === String(filterTeacherId)
      )
      .map((a) => String(a.subject_id));
    return subjects.filter((s) => subjectIds.includes(String(s.id)));
  }, [selectedClassId, assignments, subjects, isAdminView, selectedTeacherId, filterTeacherId]);

  const availableBooks = useMemo(() => {
    if (!selectedClassId || !selectedSubjectId) return [];
    const classBookIds = bookClasses
      .filter((bc) => String(bc.class_id) === String(selectedClassId))
      .map((bc) => String(bc.book_id));
    return books.filter(
      (b) =>
        String(b.subject_id) === String(selectedSubjectId) && classBookIds.includes(String(b.id))
    );
  }, [selectedClassId, selectedSubjectId, bookClasses, books]);

  // Auto-select helper hooks
  useEffect(() => {
    if (availableClasses.length === 1 && !selectedClassId)
      setSelectedClassId(String(availableClasses[0].id));
  }, [availableClasses, selectedClassId]);
  useEffect(() => {
    if (availableSubjects.length === 1 && !selectedSubjectId)
      setSelectedSubjectId(String(availableSubjects[0].id));
  }, [availableSubjects, selectedSubjectId]);
  useEffect(() => {
    if (availableBooks.length === 1 && !selectedBookId)
      setSelectedBookId(String(availableBooks[0].id));
  }, [availableBooks, selectedBookId]);

  // Reset when teacher changes
  useEffect(() => {
    setSelectedClassId('');
    setSelectedSubjectId('');
    setSelectedBookId('');
    setSelectedLessonIds(new Set());
  }, [selectedTeacherId]);

  // Lazy load lessons for the selected book on-demand
  useEffect(() => {
    if (!selectedBookId) return;

    const bookLessonsLoaded = allLessons.some((l) => String(l.book_id) === String(selectedBookId));
    if (bookLessonsLoaded) return;

    let isMounted = true;
    const fetchBookLessons = async () => {
      try {
        const { data, error } = await fetchAllPages(
          'syl_lessons',
          '*',
          (q) =>
            q
              .eq('book_id', selectedBookId)
              .order('sequence', { ascending: true, nullsFirst: false })
              .order('id', { ascending: true })
        );
        if (error) throw error;
        if (isMounted && data) {
          setAllLessons((prev) => {
            const existingIds = new Set(prev.map((l) => String(l.id)));
            const newLessons = data.filter((l) => !existingIds.has(String(l.id)));
            const updated = [...prev, ...newLessons];
            lessonPlannerCache.allLessons = updated;
            return updated;
          });
        }
      } catch (err) {
        console.error('LessonPlanner: Failed to lazy load lessons for book:', selectedBookId, err);
      }
    };

    fetchBookLessons();
    return () => {
      isMounted = false;
    };
  }, [selectedBookId, allLessons]);

  // -------------------------
  // Syllabus Tree Construction
  // -------------------------
  const currentBookLessons = useMemo(() => {
    if (!selectedBookId) return [];
    const filtered = allLessons.filter((l) => String(l.book_id) === String(selectedBookId));
    return [...filtered].sort((a, b) => {
      const seqA = a.sequence !== null && a.sequence !== undefined ? Number(a.sequence) : null;
      const seqB = b.sequence !== null && b.sequence !== undefined ? Number(b.sequence) : null;
      if (seqA !== null && seqB !== null) return seqA - seqB;
      if (seqA !== null) return -1;
      if (seqB !== null) return 1;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
  }, [selectedBookId, allLessons]);

  const syllabusTree = useMemo(() => {
    const tree = {};
    currentBookLessons.forEach((lesson) => {
      const l1 = lesson.level1 || 'General';
      if (!tree[l1]) {
        tree[l1] = {
          name: l1,
          lessons: [],
          level2s: {},
        };
      }

      const l2 = lesson.level2;
      const l3 = lesson.level3;

      if (!l2 && !l3) {
        tree[l1].lessons.push(lesson);
      } else if (l2) {
        if (!tree[l1].level2s[l2]) {
          tree[l1].level2s[l2] = {
            name: l2,
            lessons: [],
            level3s: [],
          };
        }
        if (!l3) {
          tree[l1].level2s[l2].lessons.push(lesson);
        } else {
          tree[l1].level2s[l2].level3s.push(lesson);
        }
      }
    });
    return Object.values(tree);
  }, [currentBookLessons]);

  // Get flat list of all leaf lessons in the book
  const leafLessons = useMemo(() => {
    const leaves = [];
    syllabusTree.forEach((l1Node) => {
      leaves.push(...l1Node.lessons);
      Object.values(l1Node.level2s).forEach((l2Node) => {
        leaves.push(...l2Node.lessons);
        leaves.push(...l2Node.level3s);
      });
    });
    return leaves;
  }, [syllabusTree]);

  // Helper to format full hierarchical path for lessons (shows up to 3 levels)
  const getFullLessonPath = (lesson) => {
    if (!lesson) return '';
    const parts = [];
    if (lesson.level1) parts.push(lesson.level1);
    if (lesson.level2) parts.push(lesson.level2);
    if (lesson.level3) parts.push(lesson.level3);
    return parts.join(' > ');
  };

  const handleLessonDragStart = (e, lesson) => {
    if (!lesson?.id) return;
    e.dataTransfer.setData('text/plain', String(lesson.id));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // -------------------------
  // Modal State and Logic
  // -------------------------
  const openAssignModal = (target) => {
    setAssignModalTarget(target);
    setModalStartDate(target?.date || '');
    setModalEndDate(target?.endDate || target?.date || '');
    setModalSearch('');
    setModalSelectedIds(new Set());
    setModalCollapsedNodes(new Set());
  };

  // Get available lessons for assigning in the modal (includes Search Filter)
  const modalAvailableLessons = useMemo(() => {
    if (!selectedBookId) return [];

    return leafLessons.filter((l) => {
      // Exclude lessons already planned on this target date or week
      const isAlreadyPlanned = lessonPlans.some(
        (p) =>
          String(p.lesson_id) === String(l.id) &&
          String(p.class_id) === String(selectedClassId) &&
          (assignModalTarget?.date
            ? p.target_date === assignModalTarget.date
            : p.academic_week === assignModalTarget?.week)
      );
      if (isAlreadyPlanned) return false;

      if (modalSearch.trim()) {
        const query = modalSearch.toLowerCase();
        return getFullLessonPath(l).toLowerCase().includes(query);
      }
      return true;
    });
  }, [leafLessons, lessonPlans, selectedClassId, selectedBookId, modalSearch, assignModalTarget]);

  // Group modal available lessons into a tree hierarchy
  const modalSyllabusTree = useMemo(() => {
    const tree = {};
    modalAvailableLessons.forEach((lesson) => {
      const l1 = lesson.level1 || 'General';
      if (!tree[l1]) {
        tree[l1] = {
          name: l1,
          lessons: [],
          level2s: {},
        };
      }

      const l2 = lesson.level2;
      const l3 = lesson.level3;

      if (!l2 && !l3) {
        tree[l1].lessons.push(lesson);
      } else if (l2) {
        if (!tree[l1].level2s[l2]) {
          tree[l1].level2s[l2] = {
            name: l2,
            lessons: [],
            level3s: [],
          };
        }
        if (!l3) {
          tree[l1].level2s[l2].lessons.push(lesson);
        } else {
          tree[l1].level2s[l2].level3s.push(lesson);
        }
      }
    });
    return Object.values(tree);
  }, [modalAvailableLessons]);

  const handleModalSelectAll = (checked) => {
    setModalSelectedIds((prev) => {
      const next = new Set(prev);
      modalAvailableLessons.forEach((l) => {
        if (checked) {
          next.add(String(l.id));
        } else {
          next.delete(String(l.id));
        }
      });
      return next;
    });
  };

  const isAllModalSelected =
    modalAvailableLessons.length > 0 &&
    modalAvailableLessons.every((l) => modalSelectedIds.has(String(l.id)));

  const handleModalLeafToggle = (id) => {
    setModalSelectedIds((prev) => {
      const next = new Set(prev);
      const strId = String(id);
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  };

  const getModalLeafLessonsForLevel1 = (l1Node) => {
    const leaves = [...l1Node.lessons];
    Object.values(l1Node.level2s).forEach((l2Node) => {
      leaves.push(...l2Node.lessons);
      leaves.push(...l2Node.level3s);
    });
    return leaves;
  };

  const getModalLevel1CheckState = (l1Node) => {
    const leaves = getModalLeafLessonsForLevel1(l1Node);
    if (leaves.length === 0) return 'none';
    const checkedCount = leaves.filter((l) => modalSelectedIds.has(String(l.id))).length;
    if (checkedCount === 0) return 'none';
    if (checkedCount === leaves.length) return 'all';
    return 'some';
  };

  const handleModalLevel1CheckboxToggle = (l1Node) => {
    const checkState = getModalLevel1CheckState(l1Node);
    const leaves = getModalLeafLessonsForLevel1(l1Node);
    setModalSelectedIds((prev) => {
      const next = new Set(prev);
      if (checkState === 'all') {
        leaves.forEach((l) => next.delete(String(l.id)));
      } else {
        leaves.forEach((l) => next.add(String(l.id)));
      }
      return next;
    });
  };

  const toggleModalCollapse = (path) => {
    setModalCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleModalAssignSubmit = async () => {
    if (!assignModalTarget) return;
    const startDate = modalStartDate || assignModalTarget.date || null;
    const endDate = modalEndDate || assignModalTarget.endDate || startDate;
    const targetWeek = assignModalTarget.week || null;

    const lessonsToAssign = modalAvailableLessons.filter((l) => modalSelectedIds.has(String(l.id)));
    if (lessonsToAssign.length === 0) {
      showToast('No lessons selected', 'info');
      return;
    }

    const datesToPlan = startDate ? getDatesInRange(startDate, endDate) : [null];
    const planTeacherId = isAdminView ? selectedTeacherId || null : teacher?.id || null;

    const plansToInsert = [];
    lessonsToAssign.forEach((lesson) => {
      datesToPlan.forEach((dStr) => {
        plansToInsert.push({
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          book_id: selectedBookId,
          teacher_id: planTeacherId,
          lesson_id: lesson.id,
          target_date: dStr,
          academic_week: targetWeek,
          status: 'planned',
          carry_forward_count: 0,
        });
      });
    });

    setSaving(true);
    try {
      const { data, error } = await supabase.from('lesson_plans').insert(plansToInsert).select();
      if (error) throw error;

      setLessonPlans((prev) => {
        const next = [...prev, ...data];
        lessonPlannerCache.lessonPlans = next;
        return next;
      });
      showToast(
        datesToPlan.length > 1
          ? `Successfully assigned ${lessonsToAssign.length} lesson(s) across ${datesToPlan.length} days`
          : `Successfully assigned ${lessonsToAssign.length} lesson(s)`,
        'success'
      );
      setAssignModalTarget(null);
    } catch (err) {
      showToast('Failed to assign lessons: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Tree action helpers
  const getLeafLessonsForLevel1 = (l1Node) => {
    const leaves = [...l1Node.lessons];
    Object.values(l1Node.level2s).forEach((l2Node) => {
      leaves.push(...l2Node.lessons);
      leaves.push(...l2Node.level3s);
    });
    return leaves;
  };

  const getLevel1CheckState = (l1Node) => {
    const leaves = getLeafLessonsForLevel1(l1Node);
    if (leaves.length === 0) return 'none';
    const checkedCount = leaves.filter((l) => selectedLessonIds.has(String(l.id))).length;
    if (checkedCount === 0) return 'none';
    if (checkedCount === leaves.length) return 'all';
    return 'some';
  };

  const handleLevel1CheckboxToggle = (l1Node) => {
    const checkState = getLevel1CheckState(l1Node);
    const leaves = getLeafLessonsForLevel1(l1Node);
    setSelectedLessonIds((prev) => {
      const next = new Set(prev);
      if (checkState === 'all') {
        leaves.forEach((l) => next.delete(String(l.id)));
      } else {
        leaves.forEach((l) => next.add(String(l.id)));
      }
      return next;
    });
  };

  const handleLeafCheckboxToggle = (lessonId) => {
    setSelectedLessonIds((prev) => {
      const next = new Set(prev);
      const strId = String(lessonId);
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  };

  const toggleCollapse = (path) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // -------------------------
  // Assignment Actions (Drag/Drop and Single clicks)
  // -------------------------
  const handleAssignLesson = async (lesson, dateStr, weekNum, endDateStr = null) => {
    if (!selectedClassId || !selectedSubjectId || !selectedBookId) {
      showToast('Please select Class, Subject, and Book first', 'error');
      return;
    }

    const planTeacherId = isAdminView ? selectedTeacherId || null : teacher?.id || null;

    setSaving(true);
    try {
      const datesToPlan =
        planningMode === 'date' ? getDatesInRange(dateStr, endDateStr || dateStr) : [dateStr];

      const newPlans = datesToPlan.map((dStr) => ({
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        book_id: selectedBookId,
        teacher_id: planTeacherId,
        lesson_id: lesson.id,
        target_date: planningMode === 'date' ? dStr : null,
        academic_week: planningMode === 'week' ? weekNum : null,
        status: 'planned',
        carry_forward_count: 0,
      }));

      const { data, error } = await supabase.from('lesson_plans').insert(newPlans).select();
      if (error) throw error;

      setLessonPlans((prev) => {
        const next = [...prev, ...data];
        lessonPlannerCache.lessonPlans = next;
        return next;
      });
      showToast(
        datesToPlan.length > 1
          ? `Lesson assigned across ${datesToPlan.length} days`
          : 'Lesson assigned successfully',
        'success'
      );
    } catch (err) {
      showToast('Failed to assign lesson: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignToActiveTarget = (lesson) => {
    if (planningMode === 'date') {
      if (!activeTargetDate) {
        showToast('Please click to select a date card on the timeline first', 'info');
        return;
      }
      handleAssignLesson(lesson, activeTargetDate, null, activeTargetEndDate);
    } else {
      if (!activeTargetWeek) {
        showToast('Please click to select a week card on the timeline first', 'info');
        return;
      }
      handleAssignLesson(lesson, null, activeTargetWeek);
    }
  };

  const handleBulkAssign = async () => {
    const targetDate = planningMode === 'date' ? activeTargetDate : null;
    const targetEndDate = planningMode === 'date' ? activeTargetEndDate : null;
    const targetWeek = planningMode === 'week' ? activeTargetWeek : null;

    if (planningMode === 'date' && !targetDate) {
      showToast('Please select a target date from the timeline first', 'error');
      return;
    }
    if (planningMode === 'week' && !targetWeek) {
      showToast('Please select a target week from the timeline first', 'error');
      return;
    }

    const lessonsToAssign = leafLessons.filter((l) => selectedLessonIds.has(String(l.id)));
    if (lessonsToAssign.length === 0) {
      showToast('No lessons selected', 'error');
      return;
    }

    const datesToPlan =
      planningMode === 'date'
        ? getDatesInRange(targetDate, targetEndDate || targetDate)
        : [targetDate];

    // Filter out already planned lessons to prevent duplication
    const plansToInsert = [];
    lessonsToAssign.forEach((lesson) => {
      datesToPlan.forEach((dStr) => {
        const alreadyPlanned = lessonPlans.some(
          (p) =>
            String(p.lesson_id) === String(lesson.id) &&
            String(p.class_id) === String(selectedClassId) &&
            (planningMode === 'date' ? p.target_date === dStr : p.academic_week === targetWeek)
        );

        if (!alreadyPlanned) {
          plansToInsert.push({
            class_id: selectedClassId,
            subject_id: selectedSubjectId,
            book_id: selectedBookId,
            teacher_id: isAdminView ? selectedTeacherId || null : teacher?.id || null,
            lesson_id: lesson.id,
            target_date: planningMode === 'date' ? dStr : null,
            academic_week: targetWeek,
            status: 'planned',
            carry_forward_count: 0,
          });
        }
      });
    });

    if (plansToInsert.length === 0) {
      showToast('Selected lessons are already planned on these targets', 'info');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.from('lesson_plans').insert(plansToInsert).select();
      if (error) throw error;

      setLessonPlans((prev) => {
        const next = [...prev, ...data];
        lessonPlannerCache.lessonPlans = next;
        return next;
      });
      setSelectedLessonIds(new Set());
      showToast(`Successfully assigned ${data.length} lesson plan entries`, 'success');
    } catch (err) {
      showToast('Failed to assign lessons: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignLesson = async (planId) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('lesson_plans').delete().eq('id', planId);
      if (error) throw error;
      setLessonPlans((prev) => {
        const next = prev.filter((p) => p.id !== planId);
        lessonPlannerCache.lessonPlans = next;
        return next;
      });
      showToast('Lesson unassigned', 'success');
    } catch (err) {
      showToast('Failed to unassign: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlanDate = async (planId, newDate) => {
    if (!newDate) {
      showToast('Please select a date', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .update({ target_date: newDate })
        .eq('id', planId)
        .select();
      if (error) throw error;

      setLessonPlans((prev) => {
        const next = prev.map((p) => (p.id === planId ? data[0] : p));
        lessonPlannerCache.lessonPlans = next;
        return next;
      });
      showToast('Lesson date updated successfully', 'success');
      setEditingPlanId(null);
    } catch (err) {
      showToast('Failed to update date: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlanWeek = async (planId, newWeek) => {
    if (!newWeek) {
      showToast('Please select a week', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .update({ academic_week: newWeek })
        .eq('id', planId)
        .select();
      if (error) throw error;

      setLessonPlans((prev) => {
        const next = prev.map((p) => (p.id === planId ? data[0] : p));
        lessonPlannerCache.lessonPlans = next;
        return next;
      });
      showToast('Lesson week updated successfully', 'success');
      setEditingPlanId(null);
    } catch (err) {
      showToast('Failed to update week: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Colorful indexing helper for tree categories (Workbook style)
  const getIndexColorClass = (index) => {
    const classes = [
      'border-l-4 border-l-rose-500',
      'border-l-4 border-l-indigo-500',
      'border-l-4 border-l-emerald-500',
      'border-l-4 border-l-amber-500',
      'border-l-4 border-l-purple-500',
      'border-l-4 border-l-cyan-500',
    ];
    return classes[index % classes.length];
  };

  // Get weekday colors for daily cards (Rainbow calendar layout)
  const getWeekdayColorStyles = (date) => {
    const day = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
    switch (day) {
      case 1: // Monday
        return { bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-800' };
      case 2: // Tuesday
        return { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-800' };
      case 3: // Wednesday
        return { bg: 'bg-rose-50 border-rose-100', text: 'text-rose-800' };
      case 4: // Thursday
        return { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-800' };
      case 5: // Friday
        return { bg: 'bg-purple-50 border-purple-100', text: 'text-purple-800' };
      default: // Saturday/Sunday
        return { bg: 'bg-gray-50 border-gray-150', text: 'text-gray-700' };
    }
  };

  // -------------------------
  // Rendition of Syllabus Tree (Left Pane)
  // -------------------------
  const renderSyllabusTree = () => {
    if (!selectedBookId) {
      return (
        <div className="text-center text-gray-400 mt-10 text-sm p-4">
          Select Class, Subject, and Book to view syllabus tree.
        </div>
      );
    }
    if (syllabusTree.length === 0) {
      return (
        <div className="text-center text-gray-400 mt-10 text-sm p-4">
          No syllabus lessons registered for this book.
        </div>
      );
    }

    return (
      <div className="space-y-2 pb-6">
        {syllabusTree.map((l1Node, idx) => {
          const l1Path = l1Node.name;
          const isL1Collapsed = collapsedNodes.has(l1Path);
          const l1CheckState = getLevel1CheckState(l1Node);
          const hasChildren = Object.keys(l1Node.level2s).length > 0;
          const l1CheckIcon =
            l1CheckState === 'all'
              ? 'fa-check-square text-pink-600'
              : l1CheckState === 'some'
                ? 'fa-minus-square text-pink-600'
                : 'fa-square text-gray-400';

          return (
            <div
              key={l1Node.name}
              className={`bg-white rounded border border-gray-150 p-2 shadow-sm space-y-1 ${getIndexColorClass(idx)}`}
            >
              {/* Level 1 Header */}
              <div className="flex items-center justify-between py-1 bg-gray-50/50 rounded pr-2">
                <div
                  draggable={!hasChildren && !!l1Node.lessons[0]}
                  onDragStart={(e) => {
                    if (!hasChildren && l1Node.lessons[0]) {
                      handleLessonDragStart(e, l1Node.lessons[0]);
                    }
                  }}
                  className={`flex items-center min-w-0 flex-1 ${!hasChildren && l1Node.lessons[0] ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
                >
                  {hasChildren ? (
                    <button
                      onClick={() => toggleCollapse(l1Path)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors mr-1"
                    >
                      <i
                        className={`fas fa-chevron-${isL1Collapsed ? 'right' : 'down'} text-[10px] w-3`}
                      ></i>
                    </button>
                  ) : (
                    <div className="w-5 mr-1" />
                  )}

                  {/* Checkbox at Level 1 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLevel1CheckboxToggle(l1Node);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-1 hover:bg-gray-200 rounded transition-colors mr-1.5 flex-shrink-0 cursor-default"
                  >
                    <i className={`far ${l1CheckIcon} text-base`}></i>
                  </button>

                  <span
                    className="font-semibold text-gray-800 text-sm truncate"
                    title={l1Node.name}
                  >
                    {l1Node.name}
                  </span>
                </div>

                {/* Level 1 Leaf Assign Button */}
                {!hasChildren && l1Node.lessons[0] && (
                  <div className="flex items-center gap-1">
                    {lessonPlans.some(
                      (p) =>
                        String(p.lesson_id) === String(l1Node.lessons[0].id) &&
                        String(p.class_id) === String(selectedClassId)
                    ) ? (
                      <span className="bg-pink-100 text-pink-700 text-[10px] px-1.5 py-0.5 rounded font-bold">
                        Planned
                      </span>
                    ) : (
                      <button
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', String(l1Node.lessons[0].id));
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => handleAssignToActiveTarget(l1Node.lessons[0])}
                        className="text-pink-600 hover:bg-pink-50 p-1 rounded transition-colors text-xs cursor-grab active:cursor-grabbing flex items-center gap-1 border border-pink-200"
                        title="Drag lesson to card or click to assign to selected target"
                      >
                        <i className="fas fa-grip-vertical text-gray-400"></i>
                        <i className="fas fa-arrow-right"></i>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Level 1 Children Content */}
              {!isL1Collapsed && hasChildren && (
                <div className="pl-4 border-l-2 border-gray-100 ml-2 mt-1 space-y-1">
                  {Object.values(l1Node.level2s).map((l2Node) => {
                    const l2Path = `${l1Path}/${l2Node.name}`;
                    const isL2Collapsed = collapsedNodes.has(l2Path);
                    const hasL3 = l2Node.level3s.length > 0;

                    return (
                      <div key={l2Node.name} className="space-y-1">
                        {/* Level 2 Header */}
                        <div className="flex items-center justify-between py-1 hover:bg-gray-100/50 rounded pr-2">
                          <div
                            draggable={!hasL3 && !!l2Node.lessons[0]}
                            onDragStart={(e) => {
                              if (!hasL3 && l2Node.lessons[0])
                                handleLessonDragStart(e, l2Node.lessons[0]);
                            }}
                            className={`flex items-center min-w-0 flex-1 ${!hasL3 && l2Node.lessons[0] ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
                          >
                            {hasL3 ? (
                              <button
                                onClick={() => toggleCollapse(l2Path)}
                                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors mr-1"
                              >
                                <i
                                  className={`fas fa-chevron-${isL2Collapsed ? 'right' : 'down'} text-[9px] w-3`}
                                ></i>
                              </button>
                            ) : (
                              <i className="fas fa-level-up-alt rotate-90 text-gray-400 ml-1 mr-2 text-[10px]"></i>
                            )}

                            {/* Checkbox for Level 2 Leaf */}
                            {!hasL3 && l2Node.lessons[0] && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLeafCheckboxToggle(l2Node.lessons[0].id);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-0.5 hover:bg-gray-200 rounded transition-colors mr-1 flex-shrink-0 cursor-default"
                              >
                                <i
                                  className={`far ${selectedLessonIds.has(String(l2Node.lessons[0].id)) ? 'fa-check-square text-pink-600' : 'fa-square text-gray-400'} text-sm`}
                                ></i>
                              </button>
                            )}

                            <span
                              className="text-xs font-semibold text-gray-700 truncate"
                              title={l2Node.name}
                            >
                              {l2Node.name}
                            </span>
                          </div>

                          {/* Level 2 Leaf actions */}
                          {!hasL3 && l2Node.lessons[0] && (
                            <div className="flex items-center gap-1">
                              {lessonPlans.some(
                                (p) =>
                                  String(p.lesson_id) === String(l2Node.lessons[0].id) &&
                                  String(p.class_id) === String(selectedClassId)
                              ) ? (
                                <span className="bg-pink-100 text-pink-700 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                  Planned
                                </span>
                              ) : (
                                <button
                                  draggable="true"
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData(
                                      'text/plain',
                                      String(l2Node.lessons[0].id)
                                    );
                                    e.dataTransfer.effectAllowed = 'copy';
                                  }}
                                  onClick={() => handleAssignToActiveTarget(l2Node.lessons[0])}
                                  className="text-pink-600 hover:bg-pink-50 p-1 rounded transition-colors text-xs cursor-grab active:cursor-grabbing flex items-center gap-1 border border-pink-200"
                                >
                                  <i className="fas fa-grip-vertical text-gray-400"></i>
                                  <i className="fas fa-arrow-right"></i>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Level 3 Content */}
                        {!isL2Collapsed && hasL3 && (
                          <div className="pl-4 border-l border-gray-200 ml-2 space-y-1">
                            {l2Node.level3s.map((l3Lesson) => (
                              <div
                                key={l3Lesson.id}
                                className="flex items-center justify-between py-1 hover:bg-gray-100/50 rounded pr-2"
                              >
                                <div
                                  draggable={true}
                                  onDragStart={(e) => handleLessonDragStart(e, l3Lesson)}
                                  className="flex items-center min-w-0 flex-1 cursor-grab active:cursor-grabbing select-none"
                                >
                                  <i className="fas fa-level-up-alt rotate-90 text-gray-300 mr-2 text-[9px] ml-1"></i>

                                  {/* Checkbox for Level 3 Leaf */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleLeafCheckboxToggle(l3Lesson.id);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="p-0.5 hover:bg-gray-200 rounded transition-colors mr-1 flex-shrink-0 cursor-default"
                                  >
                                    <i
                                      className={`far ${selectedLessonIds.has(String(l3Lesson.id)) ? 'fa-check-square text-pink-600' : 'fa-square text-gray-400'} text-xs`}
                                    ></i>
                                  </button>

                                  <span
                                    className="text-xs text-gray-600 truncate"
                                    title={l3Lesson.level3}
                                  >
                                    {l3Lesson.level3}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  {lessonPlans.some(
                                    (p) =>
                                      String(p.lesson_id) === String(l3Lesson.id) &&
                                      String(p.class_id) === String(selectedClassId)
                                  ) ? (
                                    <span className="bg-pink-100 text-pink-700 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                      Planned
                                    </span>
                                  ) : (
                                    <button
                                      draggable="true"
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', String(l3Lesson.id));
                                        e.dataTransfer.effectAllowed = 'copy';
                                      }}
                                      onClick={() => handleAssignToActiveTarget(l3Lesson)}
                                      className="text-pink-600 hover:bg-pink-50 p-1 rounded transition-colors text-xs cursor-grab active:cursor-grabbing flex items-center gap-1 border border-pink-200"
                                    >
                                      <i className="fas fa-grip-vertical text-gray-400"></i>
                                      <i className="fas fa-arrow-right"></i>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
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
    );
  };

  // -------------------------
  // Rendition of Modal Syllabus Tree (Popup Modal)
  // -------------------------
  const renderModalSyllabusTree = () => {
    if (modalSyllabusTree.length === 0) {
      return (
        <div className="text-center text-gray-400 text-xs py-8">
          {modalSearch.trim()
            ? 'No matching lessons found.'
            : 'All lessons from this book are already planned on this target.'}
        </div>
      );
    }

    return (
      <div className="space-y-2 pb-6">
        {modalSyllabusTree.map((l1Node, idx) => {
          const l1Path = l1Node.name;
          const isL1Collapsed = modalCollapsedNodes.has(l1Path);
          const l1CheckState = getModalLevel1CheckState(l1Node);

          const l1CheckIcon =
            l1CheckState === 'all'
              ? 'fa-check-square text-pink-600'
              : l1CheckState === 'some'
                ? 'fa-minus-square text-pink-600'
                : 'fa-square text-gray-400';

          const hasChildren = Object.keys(l1Node.level2s).length > 0;

          return (
            <div
              key={l1Node.name}
              className={`bg-white rounded border border-gray-150 p-2 shadow-sm space-y-1 ${getIndexColorClass(idx)}`}
            >
              {/* Level 1 Header */}
              <div className="flex items-center justify-between py-1 bg-gray-50/50 rounded pr-2">
                <div className="flex items-center min-w-0 flex-1">
                  {hasChildren ? (
                    <button
                      onClick={() => toggleModalCollapse(l1Path)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors mr-1"
                    >
                      <i
                        className={`fas fa-chevron-${isL1Collapsed ? 'right' : 'down'} text-[10px] w-3`}
                      ></i>
                    </button>
                  ) : (
                    <div className="w-5 mr-1" />
                  )}

                  {/* Checkbox at Level 1 */}
                  <button
                    onClick={() => handleModalLevel1CheckboxToggle(l1Node)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors mr-1.5 flex-shrink-0"
                    disabled={saving}
                  >
                    <i className={`far ${l1CheckIcon} text-base`}></i>
                  </button>

                  <span
                    className="font-semibold text-gray-800 text-sm truncate"
                    title={l1Node.name}
                  >
                    {l1Node.name}
                  </span>
                </div>
              </div>

              {/* Level 1 Children Content */}
              {!isL1Collapsed && hasChildren && (
                <div className="pl-4 border-l-2 border-gray-100 ml-2 mt-1 space-y-1">
                  {Object.values(l1Node.level2s).map((l2Node) => {
                    const l2Path = `${l1Path}/${l2Node.name}`;
                    const isL2Collapsed = modalCollapsedNodes.has(l2Path);
                    const hasL3 = l2Node.level3s.length > 0;

                    return (
                      <div key={l2Node.name} className="space-y-1">
                        {/* Level 2 Header */}
                        <div className="flex items-center justify-between py-1 hover:bg-gray-100/50 rounded pr-2">
                          <div className="flex items-center min-w-0 flex-1">
                            {hasL3 ? (
                              <button
                                onClick={() => toggleModalCollapse(l2Path)}
                                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors mr-1"
                              >
                                <i
                                  className={`fas fa-chevron-${isL2Collapsed ? 'right' : 'down'} text-[9px] w-3`}
                                ></i>
                              </button>
                            ) : (
                              <i className="fas fa-level-up-alt rotate-90 text-gray-400 ml-1 mr-2 text-[10px]"></i>
                            )}

                            {/* Checkbox for Level 2 Leaf */}
                            {!hasL3 && l2Node.lessons[0] && (
                              <button
                                onClick={() => handleModalLeafToggle(l2Node.lessons[0].id)}
                                className="p-0.5 hover:bg-gray-200 rounded transition-colors mr-1 flex-shrink-0"
                                disabled={saving}
                              >
                                <i
                                  className={`far ${modalSelectedIds.has(String(l2Node.lessons[0].id)) ? 'fa-check-square text-pink-600' : 'fa-square text-gray-400'} text-sm`}
                                ></i>
                              </button>
                            )}

                            <span
                              className="text-xs font-semibold text-gray-700 truncate"
                              title={l2Node.name}
                            >
                              {l2Node.name}
                            </span>
                          </div>
                        </div>

                        {/* Level 3 Content */}
                        {!isL2Collapsed && hasL3 && (
                          <div className="pl-4 border-l border-gray-200 ml-2 space-y-1">
                            {l2Node.level3s.map((l3Lesson) => (
                              <div
                                key={l3Lesson.id}
                                className="flex items-center justify-between py-1 hover:bg-gray-100/50 rounded pr-2"
                              >
                                <div className="flex items-center min-w-0 flex-1">
                                  <i className="fas fa-level-up-alt rotate-90 text-gray-300 mr-2 text-[9px] ml-1"></i>

                                  {/* Checkbox for Level 3 Leaf */}
                                  <button
                                    onClick={() => handleModalLeafToggle(l3Lesson.id)}
                                    className="p-0.5 hover:bg-gray-200 rounded transition-colors mr-1 flex-shrink-0"
                                    disabled={saving}
                                  >
                                    <i
                                      className={`far ${modalSelectedIds.has(String(l3Lesson.id)) ? 'fa-check-square text-pink-600' : 'fa-square text-gray-400'} text-xs`}
                                    ></i>
                                  </button>

                                  <span
                                    className="text-xs text-gray-600 truncate"
                                    title={l3Lesson.level3}
                                  >
                                    {l3Lesson.level3}
                                  </span>
                                </div>
                              </div>
                            ))}
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
    );
  };

  // -------------------------
  // Loading & UI States
  // -------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading Lesson Planner...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-gray-50">
        <div className="text-center text-red-500 bg-white p-6 rounded-lg shadow-sm border">
          <i className="fas fa-exclamation-triangle text-3xl mb-2 block"></i>
          <p className="font-semibold mb-2">Failed to load Lesson Planner</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // -------------------------
  // Timeline setup
  // -------------------------
  const timelineDates = [];
  let d = new Date(startDate || new Date());
  const safeDays = isNaN(Number(timelineDays)) ? 14 : Number(timelineDays);
  const safeWeeks = isNaN(Number(timelineWeeks)) ? 4 : Number(timelineWeeks);
  const daysToShow = planningMode === 'date' ? safeDays : safeWeeks * 7;
  for (let i = 0; i < Math.min(daysToShow, 100); i++) {
    if (d.getDay() !== 0) timelineDates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  const timelineWeeksList = Array.from({ length: Math.min(safeWeeks, 20) }, (_, i) => i + 1);

  // Active target textual display
  const getActiveTargetName = () => {
    if (planningMode === 'date' && activeTargetDate) {
      return new Date(activeTargetDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    if (planningMode === 'week' && activeTargetWeek) {
      return `Week ${activeTargetWeek}`;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow overflow-hidden relative">
      {/* Tiny subtle inline saving progress bar overlay at the absolute top of container */}
      {saving && (
        <div className="absolute top-0 left-0 w-full h-1 bg-pink-100 overflow-hidden z-50">
          <div className="w-full h-full bg-pink-600 animate-pulse origin-left"></div>
        </div>
      )}

      {/* Header Row */}
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <i className="fas fa-calendar-check text-pink-600 mr-2"></i>Lesson Planner
            {isAdminView && (
              <span className="ml-2 text-[10px] font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {role}
              </span>
            )}
          </h2>

          {/* Teacher Selector inside Heading Row */}
          {isAdminView && (
            <div className="flex items-center gap-1.5 ml-2 bg-indigo-50 border border-indigo-155 py-1 px-2 rounded-md shadow-sm">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                <i className="fas fa-user-tie"></i> Teacher:
              </span>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                disabled={saving}
                className="border-indigo-200 rounded text-xs focus:border-indigo-500 focus:ring-indigo-500 bg-white py-0.5 px-2 outline-none font-medium cursor-pointer disabled:bg-gray-100"
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
        </div>

        <div className="flex items-center gap-2 bg-white rounded-full p-1 border shadow-sm">
          <button
            onClick={() => setPlanningMode('date')}
            disabled={saving}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${planningMode === 'date' ? 'bg-pink-600 text-white' : 'text-gray-500 hover:bg-gray-100'} disabled:opacity-50`}
          >
            By Date
          </button>
          <button
            onClick={() => setPlanningMode('week')}
            disabled={saving}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${planningMode === 'week' ? 'bg-pink-600 text-white' : 'text-gray-500 hover:bg-gray-100'} disabled:opacity-50`}
          >
            By Week
          </button>
        </div>
      </div>

      {/* Context Selection Row */}
      <div className="p-4 border-b bg-white flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
            Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedSubjectId('');
              setSelectedBookId('');
            }}
            disabled={saving}
            className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-150"
          >
            <option value="">Select Class...</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.class_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
            Subject
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setSelectedBookId('');
            }}
            disabled={!selectedClassId || saving}
            className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100"
          >
            <option value="">Select Subject...</option>
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
            Book
          </label>
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            disabled={!selectedSubjectId || saving}
            className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100"
          >
            <option value="">Select Book...</option>
            {availableBooks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden border-b bg-gray-50 text-xs font-bold text-gray-500">
        <button
          onClick={() => setActiveMobileTab('syllabus')}
          className={`flex-1 py-3 text-center border-b-2 ${
            activeMobileTab === 'syllabus'
              ? 'border-pink-600 text-pink-600 bg-white'
              : 'border-transparent hover:bg-gray-100'
          }`}
        >
          Syllabus ({selectedLessonIds.size} Selected)
        </button>
        <button
          onClick={() => setActiveMobileTab('timeline')}
          className={`flex-1 py-3 text-center border-b-2 ${
            activeMobileTab === 'timeline'
              ? 'border-pink-600 text-pink-600 bg-white'
              : 'border-transparent hover:bg-gray-100'
          }`}
        >
          Timeline {getActiveTargetName() && `(${getActiveTargetName()})`}
        </button>
      </div>

      {/* Main Responsive Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Syllabus Tree & Bulk Assign */}
        <div
          className={`w-full md:w-1/3 md:min-w-[320px] border-r border-gray-200 flex flex-col bg-gray-50 ${activeMobileTab === 'syllabus' ? 'flex' : 'hidden md:flex'}`}
        >
          <div className="p-3 border-b bg-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Syllabus Items {selectedBookId && `(${leafLessons.length} items)`}
            </span>
            {selectedLessonIds.size > 0 && (
              <button
                onClick={() => setSelectedLessonIds(new Set())}
                disabled={saving}
                className="text-[10px] text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
              >
                Clear selection ({selectedLessonIds.size})
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-3">
            {/* Bulk Assign Panel */}
            {selectedLessonIds.size > 0 && (
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mb-3 shadow-sm text-center space-y-2">
                <p className="text-xs text-pink-800 font-medium">
                  <strong>{selectedLessonIds.size} lessons</strong> selected
                </p>
                {getActiveTargetName() ? (
                  <button
                    onClick={handleBulkAssign}
                    disabled={saving}
                    className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-300 text-white font-bold py-2 px-3 rounded shadow text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    ) : (
                      <i className="fas fa-calendar-plus"></i>
                    )}
                    {saving ? 'Assigning...' : `Assign to ${getActiveTargetName()}`}
                  </button>
                ) : (
                  <div className="text-xs text-pink-700 italic font-medium bg-pink-100/50 py-1.5 px-2 rounded">
                    <i className="fas fa-mouse-pointer mr-1"></i>
                    Click a date or week card on the timeline to target it for assignment.
                  </div>
                )}
              </div>
            )}

            {renderSyllabusTree()}
          </div>
        </div>

        {/* Right Pane: Timeline with Selection/Drop Target Indicators */}
        <div
          className={`flex-1 flex flex-col bg-white ${activeMobileTab === 'timeline' ? 'flex' : 'hidden md:flex'}`}
        >
          <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
            <div className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <span>{planningMode === 'date' ? 'Daily Timeline' : 'Weekly Timeline'}</span>
              {getActiveTargetName() && (
                <span className="text-xs bg-pink-600 text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  Active target: {getActiveTargetName()}
                  <button
                    onClick={() => {
                      setActiveTargetDate(null);
                      setActiveTargetWeek(null);
                    }}
                    className="hover:text-red-200"
                  >
                    <i className="fas fa-times-circle ml-0.5"></i>
                  </button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {planningMode === 'date' ? (
                <>
                  <button
                    onClick={() => setTimelineDays((p) => Math.max(1, p - 1))}
                    className="text-gray-400 hover:text-gray-600 px-2 py-1"
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <span className="text-xs font-bold text-gray-500">{timelineDays} Days</span>
                  <button
                    onClick={() => setTimelineDays((p) => p + 1)}
                    className="text-gray-400 hover:text-gray-600 px-2 py-1"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setTimelineWeeks((p) => Math.max(1, p - 1))}
                    className="text-gray-400 hover:text-gray-600 px-2 py-1"
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <span className="text-xs font-bold text-gray-500">{timelineWeeks} Weeks</span>
                  <button
                    onClick={() => setTimelineWeeks((p) => p + 1)}
                    className="text-gray-400 hover:text-gray-600 px-2 py-1"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4 bg-gray-50/50">
            {!selectedBookId ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <i className="fas fa-calendar-alt text-4xl mb-3 block"></i>
                  Select Class, Subject, and Book to view planning timeline.
                </div>
              </div>
            ) : planningMode === 'date' ? (
              <div className="space-y-4">
                {timelineDates.map((date) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const plansForDate = lessonPlans.filter(
                    (p) =>
                      p.target_date === dateStr &&
                      String(p.class_id) === String(selectedClassId) &&
                      String(p.subject_id) === String(selectedSubjectId)
                  );

                  const isSelected = activeTargetDate === dateStr;
                  const isRangeSelected =
                    activeTargetDate &&
                    activeTargetEndDate &&
                    dateStr >=
                      (activeTargetDate < activeTargetEndDate
                        ? activeTargetDate
                        : activeTargetEndDate) &&
                    dateStr <=
                      (activeTargetDate < activeTargetEndDate
                        ? activeTargetEndDate
                        : activeTargetDate);
                  const isDraggedOver = draggedOverDate === dateStr;
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const colorStyles = getWeekdayColorStyles(date);

                  return (
                    <div
                      key={dateStr}
                      onClick={(e) => {
                        if (e.shiftKey && activeTargetDate) {
                          if (activeTargetDate < dateStr) {
                            setActiveTargetEndDate(dateStr);
                          } else {
                            setActiveTargetEndDate(activeTargetDate);
                            setActiveTargetDate(dateStr);
                          }
                        } else {
                          if (activeTargetDate === dateStr && !activeTargetEndDate) {
                            setActiveTargetDate(null);
                            setActiveTargetEndDate(null);
                          } else {
                            setActiveTargetDate(dateStr);
                            setActiveTargetEndDate(null);
                          }
                        }
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDraggedOverDate(dateStr);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDragLeave={() => setDraggedOverDate(null)}
                      onDrop={(e) => {
                        setDraggedOverDate(null);
                        const lessonId = e.dataTransfer.getData('text/plain');
                        const lesson = allLessons.find((l) => String(l.id) === lessonId);
                        if (lesson) {
                          handleAssignLesson(
                            lesson,
                            dateStr,
                            null,
                            activeTargetEndDate && (activeTargetDate === dateStr || isRangeSelected)
                              ? activeTargetEndDate
                              : null
                          );
                        }
                      }}
                      className={`bg-white border rounded-lg p-3 shadow-sm transition-all cursor-pointer ${
                        isSelected || isRangeSelected
                          ? 'ring-2 ring-pink-500 border-transparent bg-pink-50/20'
                          : 'border-gray-200'
                      } ${
                        isDraggedOver ? 'border-2 border-dashed border-pink-500 bg-pink-50' : ''
                      } ${
                        isToday ? 'border-2 border-pink-400 shadow-md ring-1 ring-pink-300' : ''
                      }`}
                    >
                      <div
                        className={`flex justify-between items-center mb-2 border-b pb-2 flex-wrap gap-2 ${colorStyles.bg} -mx-3 -mt-3 p-2 rounded-t-lg`}
                      >
                        <span
                          className={`font-bold flex items-center gap-1.5 text-xs sm:text-sm ${colorStyles.text}`}
                        >
                          {isSelected && <i className="fas fa-map-pin text-pink-600 text-sm"></i>}
                          {date.toLocaleDateString(undefined, {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {isToday && (
                            <span className="text-[9px] font-bold bg-pink-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider ml-1">
                              Today
                            </span>
                          )}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssignModal({
                              date: dateStr,
                              endDate:
                                activeTargetEndDate &&
                                (activeTargetDate === dateStr || isRangeSelected)
                                  ? activeTargetEndDate
                                  : dateStr,
                            });
                          }}
                          disabled={saving}
                          className="bg-white hover:bg-gray-150 text-gray-700 border border-gray-250 rounded px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <i className="fas fa-plus text-[10px]"></i>
                          Assign
                        </button>
                      </div>

                      {plansForDate.length === 0 ? (
                        <div className="text-xs text-gray-400 italic py-1">
                          No lessons planned. Drag a syllabus item here or click "+ Assign".
                        </div>
                      ) : (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          {plansForDate.map((plan) => {
                            const lesson = allLessons.find(
                              (l) => String(l.id) === String(plan.lesson_id)
                            );
                            const fullPath = getFullLessonPath(lesson);
                            const isEditing = editingPlanId === plan.id;

                            return (
                              <div
                                key={plan.id}
                                className="flex flex-col p-2 bg-pink-50 border border-pink-100 rounded text-sm shadow-sm hover:border-pink-200 transition-colors"
                              >
                                {isEditing ? (
                                  <div
                                    className="flex flex-col gap-1.5 w-full"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span
                                      className="font-semibold text-pink-800 text-xs break-words"
                                      title={fullPath}
                                    >
                                      {fullPath}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="text-xs border border-pink-200 rounded px-1.5 py-0.5 outline-none font-semibold text-pink-800 bg-white flex-1"
                                      />
                                      <button
                                        onClick={() => handleUpdatePlanDate(plan.id, editDate)}
                                        className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-2 py-0.5 rounded text-[10px]"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingPlanId(null)}
                                        className="bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded text-[10px]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className="flex justify-between items-center w-full"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span
                                      className="font-semibold text-pink-800 text-xs break-words max-w-[70%]"
                                      title={fullPath}
                                    >
                                      {fullPath}
                                    </span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {plan.status === 'planned' && (
                                        <button
                                          onClick={() => {
                                            setEditingPlanId(plan.id);
                                            setEditDate(
                                              plan.target_date ||
                                                new Date().toISOString().split('T')[0]
                                            );
                                          }}
                                          disabled={saving}
                                          className="text-pink-600 hover:text-pink-800 p-1 disabled:opacity-50"
                                          title="Change Date"
                                        >
                                          <i className="fas fa-edit"></i>
                                        </button>
                                      )}
                                      {plan.carry_forward_count > 0 && (
                                        <span
                                          className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold"
                                          title="Carried forward"
                                        >
                                          CF x{plan.carry_forward_count}
                                        </span>
                                      )}
                                      <button
                                        onClick={() => handleUnassignLesson(plan.id)}
                                        disabled={saving}
                                        className="text-red-400 hover:text-red-600 p-1 disabled:opacity-50"
                                      >
                                        <i className="fas fa-times"></i>
                                      </button>
                                    </div>
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
            ) : (
              <div className="space-y-4">
                {timelineWeeksList.map((weekNum) => {
                  const plansForWeek = lessonPlans.filter(
                    (p) =>
                      p.academic_week === weekNum &&
                      String(p.class_id) === String(selectedClassId) &&
                      String(p.subject_id) === String(selectedSubjectId)
                  );

                  const isSelected = activeTargetWeek === weekNum;
                  const isDraggedOver = draggedOverWeek === weekNum;

                  return (
                    <div
                      key={weekNum}
                      onClick={() =>
                        setActiveTargetWeek((prev) => (prev === weekNum ? null : weekNum))
                      }
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDraggedOverWeek(weekNum);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDragLeave={() => setDraggedOverWeek(null)}
                      onDrop={(e) => {
                        setDraggedOverWeek(null);
                        const lessonId = e.dataTransfer.getData('text/plain');
                        const lesson = allLessons.find((l) => String(l.id) === lessonId);
                        if (lesson) handleAssignLesson(lesson, null, weekNum);
                      }}
                      className={`bg-white border rounded-lg p-3 shadow-sm transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-pink-500 border-transparent bg-pink-50/20'
                          : 'border-gray-200'
                      } ${
                        isDraggedOver ? 'border-2 border-dashed border-pink-500 bg-pink-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2 border-b pb-2 flex-wrap gap-2 bg-pink-50/30 -mx-3 -mt-3 p-2 rounded-t-lg border-pink-100">
                        <span className="font-bold text-gray-700 flex items-center gap-1.5 text-xs sm:text-sm">
                          {isSelected && <i className="fas fa-map-pin text-pink-600 text-sm"></i>}
                          Week {weekNum}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssignModal({ week: weekNum });
                          }}
                          disabled={saving}
                          className="bg-white hover:bg-gray-150 text-gray-700 border border-gray-250 rounded px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <i className="fas fa-plus text-[10px]"></i>
                          Assign
                        </button>
                      </div>

                      {plansForWeek.length === 0 ? (
                        <div className="text-xs text-gray-400 italic py-1">
                          No lessons planned. Drag a syllabus item here or click "+ Assign".
                        </div>
                      ) : (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          {plansForWeek.map((plan) => {
                            const lesson = allLessons.find(
                              (l) => String(l.id) === String(plan.lesson_id)
                            );
                            const fullPath = getFullLessonPath(lesson);
                            const isEditing = editingPlanId === plan.id;

                            return (
                              <div
                                key={plan.id}
                                className="flex flex-col p-2 bg-pink-50 border border-pink-100 rounded text-sm shadow-sm hover:border-pink-200 transition-colors"
                              >
                                {isEditing ? (
                                  <div
                                    className="flex flex-col gap-1.5 w-full"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span
                                      className="font-semibold text-pink-800 text-xs break-words"
                                      title={fullPath}
                                    >
                                      {fullPath}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <select
                                        value={editWeek}
                                        onChange={(e) => setEditWeek(e.target.value)}
                                        className="text-xs border border-pink-200 rounded px-1.5 py-0.5 outline-none font-semibold text-pink-800 bg-white flex-1"
                                      >
                                        {timelineWeeksList.map((w) => (
                                          <option key={w} value={w}>
                                            Week {w}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() =>
                                          handleUpdatePlanWeek(plan.id, parseInt(editWeek))
                                        }
                                        className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-2 py-0.5 rounded text-[10px]"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingPlanId(null)}
                                        className="bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded text-[10px]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className="flex justify-between items-center w-full"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span
                                      className="font-semibold text-pink-800 text-xs break-words max-w-[70%]"
                                      title={fullPath}
                                    >
                                      {fullPath}
                                    </span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {plan.status === 'planned' && (
                                        <button
                                          onClick={() => {
                                            setEditingPlanId(plan.id);
                                            setEditWeek(plan.academic_week || '1');
                                          }}
                                          disabled={saving}
                                          className="text-pink-600 hover:text-pink-800 p-1 disabled:opacity-50"
                                          title="Change Week"
                                        >
                                          <i className="fas fa-edit"></i>
                                        </button>
                                      )}
                                      {plan.carry_forward_count > 0 && (
                                        <span
                                          className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold"
                                          title="Carried forward"
                                        >
                                          CF x{plan.carry_forward_count}
                                        </span>
                                      )}
                                      <button
                                        onClick={() => handleUnassignLesson(plan.id)}
                                        disabled={saving}
                                        className="text-red-400 hover:text-red-600 p-1 disabled:opacity-50"
                                      >
                                        <i className="fas fa-times"></i>
                                      </button>
                                    </div>
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
        </div>
      </div>

      {/* Assign Lessons Custom Multi-Select Modal */}
      {assignModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border">
            {/* Modal Header */}
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                <i className="fas fa-calendar-plus text-pink-600"></i>
                Assign Lessons to{' '}
                {assignModalTarget.date
                  ? new Date(assignModalTarget.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  : `Week ${assignModalTarget.week}`}
              </h3>
              <button
                onClick={() => setAssignModalTarget(null)}
                disabled={saving}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 disabled:opacity-50"
              >
                <i className="fas fa-times text-base"></i>
              </button>
            </div>

            {/* Date Range Controls for Date Mode */}
            {assignModalTarget.date && (
              <div className="px-4 py-2.5 bg-pink-50/70 border-b border-pink-100 flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-pink-800 uppercase tracking-wide mb-0.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={modalStartDate}
                    onChange={(e) => setModalStartDate(e.target.value)}
                    disabled={saving}
                    className="w-full text-xs border border-pink-200 rounded px-2 py-1 outline-none font-medium bg-white text-gray-800 focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-pink-800 uppercase tracking-wide mb-0.5">
                    End Date (Multi-Day Plan)
                  </label>
                  <input
                    type="date"
                    value={modalEndDate}
                    onChange={(e) => setModalEndDate(e.target.value)}
                    disabled={saving}
                    className="w-full text-xs border border-pink-200 rounded px-2 py-1 outline-none font-medium bg-white text-gray-800 focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>
            )}

            {/* Search and Select All controls */}
            <div className="p-3 border-b bg-white space-y-2">
              <input
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                disabled={saving}
                placeholder="Search by topic, unit or chapter..."
                className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 focus:border-pink-500 focus:ring-pink-500 outline-none disabled:bg-gray-100"
              />
              {modalAvailableLessons.length > 0 && (
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 select-none cursor-pointer pl-1 py-1">
                  <input
                    type="checkbox"
                    checked={isAllModalSelected}
                    disabled={saving}
                    onChange={(e) => handleModalSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer disabled:opacity-50"
                  />
                  <span>
                    Select All / Deselect All ({modalAvailableLessons.length} lessons available)
                  </span>
                </label>
              )}
            </div>

            {/* Lessons Checkbox List - Hierarchical Tree View */}
            <div className="flex-1 overflow-auto p-4 space-y-2 bg-gray-50">
              {renderModalSyllabusTree()}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setAssignModalTarget(null)}
                disabled={saving}
                className="px-4 py-2 border rounded text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleModalAssignSubmit}
                disabled={modalSelectedIds.size === 0 || saving}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-300 text-white text-xs font-bold rounded shadow transition-colors flex items-center gap-1.5"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <i className="fas fa-plus"></i>
                )}
                {saving ? 'Assigning...' : `Assign Selected (${modalSelectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonPlanner;
