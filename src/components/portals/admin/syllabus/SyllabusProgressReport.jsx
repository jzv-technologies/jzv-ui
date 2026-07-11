import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';
import { CARD_THEMES } from '../../../../utils/cardTheme';
import ConfirmModal from '../../../ConfirmModal';
import MultiSelectDropdown from '../../syllabus-shared/MultiSelectDropdown';
import DailyActivityTable from '../../syllabus-shared/DailyActivityTable';
import SyllabusProgressGrid from '../../syllabus-shared/SyllabusProgressGrid';

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
  const [lessonPlans, setLessonPlans] = useState([]);
  const [carryForwards, setCarryForwards] = useState([]);

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
  const [cpGroupingMode, setCpGroupingMode] = useState('none'); // 'classification' | 'subject' | 'none'
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
  const [upcomingGroupingMode, setUpcomingGroupingMode] = useState('subject_date'); // 'subject_date' | 'date_subject'
  const [upFilterTeachers, setUpFilterTeachers] = useState([]);
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
        resPlans,
        resCarryForwards,
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
        supabase
          .from('lesson_progress')
          .select(
            'id, lesson_id, class_id, status, completion_percentage, revision_counter, start_date, end_date, days_taken, updated_at, book_id'
          ),
        supabase.from('syllabus_book_lessons').select('id, book_id'),
        supabase
          .from('lesson_progress')
          .select(
            '*, lesson:syllabus_book_lessons(*), class:classes(*), subject:subjects(*), book:syllabus_books(*)'
          )
          .in('status', ['planned', 'in_progress']),
        supabase.from('lesson_plan_carry_forwards').select('*'),
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
      if (resPlans.error) throw resPlans.error;
      if (resCarryForwards.error) throw resCarryForwards.error;

      const dbClasses = resClasses.data || [];
      const dbSubjects = resSubjects.data || [];
      const dbBooks = resBooks.data || [];
      const dbClassifications = resClassifications.data || [];
      const dbBookClasses = resBookClasses.data || [];
      const dbAssignments = resAssignments.data || [];
      const dbTeachers = resTeachers.data || [];
      const dbTrackers = resTrackers.data || [];
      const dbLessons = resLessons.data || [];
      const rawLogs = resLogs.data || [];
      const rawPlans = resPlans.data || [];
      const dbCarryForwards = resCarryForwards.data || [];

      const dbLogs = rawLogs.map((log) => ({
        ...log,
        current_status: log.status,
      }));

      const dbPlans = rawPlans.map((plan) => ({
        ...plan,
        target_date: plan.target_start_date,
      }));

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
      setLessonPlans(dbPlans);
      setCarryForwards(dbCarryForwards);
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

      let query = supabase.from('lesson_progress_items').select(`
          *,
          teacher:teachers(name),
          progress:lesson_progress(
            *,
            lesson:syllabus_book_lessons(*)
          )
        `);

      if (role === 'parent' && student?.class_id) {
        // Fetch progress IDs for the class first
        const { data: progressRows } = await supabase
          .from('lesson_progress')
          .select('id')
          .eq('class_id', student.class_id);
        const progressIds = (progressRows || []).map((r) => r.id);

        if (progressIds.length === 0) {
          setDailyEntries([]);
          setDailyLoading(false);
          return;
        }
        query = query.in('progress_id', progressIds);
      }

      if (startBound && endBound) {
        query = query.gte('date', startBound).lte('date', endBound);
      }

      const { data: dbItems, error } = await query.order('date', { ascending: false }).limit(200);

      if (error) throw error;
      items = dbItems || [];

      const enriched = items.map((item) => {
        const progressObj = item.progress;
        const log = progressObj
          ? {
              ...progressObj,
              current_status: progressObj.status,
            }
          : null;

        const lesson = progressObj ? progressObj.lesson : null;
        const book = progressObj
          ? books.find((b) => String(b.id) === String(progressObj.book_id))
          : null;
        const subject = progressObj
          ? subjects.find((s) => String(s.id) === String(progressObj.subject_id)) ||
            (book ? subjects.find((s) => String(s.id) === String(book.subject_id)) : null)
          : null;
        const cls = progressObj
          ? classes.find((c) => String(c.id) === String(progressObj.class_id))
          : null;

        return {
          ...item,
          lt_log_id: item.progress_id,
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
    setDailyLoading(true);
    try {
      const { error } = await supabase
        .from('lesson_progress_items')
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
      (activeTab === 'daily-activity' ||
        activeTab === 'today-class' ||
        activeTab === 'two-weeks-class') &&
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
        supabase
          .from('lesson_progress')
          .select(
            'id, lesson_id, class_id, status, completion_percentage, revision_counter, start_date, end_date, days_taken, updated_at, book_id'
          )
          .eq('class_id', classId),
      ]);
      if (lessErr) throw lessErr;
      if (logErr) throw logErr;

      const mappedLogs = (logs || []).map((log) => ({
        ...log,
        current_status: log.status,
      }));

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

      const relevantLogs = mappedLogs.filter((l) =>
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

  useEffect(() => {
    if (role === 'parent' && student?.class_id) {
      setCpFilterClasses([String(student.class_id)]);
      setFilterClasses([String(student.class_id)]);
      setCpGroupingMode('none');
    }
  }, [role, student?.class_id]);

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
      
      // Role constraints
      if (role === 'parent') {
        return String(p.class_id) === String(student?.class_id);
      }

      // Filters for admin/management
      if (upFilterTeachers.length > 0 && !upFilterTeachers.includes(String(p.teacher_id))) {
        return false;
      }
      if (upFilterClasses.length > 0 && !upFilterClasses.includes(String(p.class_id))) {
        return false;
      }
      if (upFilterSubjects.length > 0 && !upFilterSubjects.includes(String(p.subject_id))) {
        return false;
      }

      return true;
    });

    const classOpts = classes.map((c) => ({ id: String(c.id), label: c.name || c.class_name }));
    const subjectOpts = subjects.map((s) => ({ id: String(s.id), label: s.name }));
    const teacherOpts = teachers.map((t) => ({ id: String(t.id), label: t.name }));

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
            {role !== 'parent' && `${plan.class?.name || plan.class?.class_name || '—'} • `}
            {plan.subject?.name} • {plan.book?.name}
            {role !== 'parent' && plan.teacher?.name && ` • ${plan.teacher.name}`}
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
      upFilterTeachers.length > 0 || 
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

  const renderTeacherAdherence = () => {
    // Determine time boundaries
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setDate(now.getDate() - 30);
    const oneYearAgo = new Date(now);
    oneYearAgo.setDate(now.getDate() - 365);

    // group plans by teacher
    const teacherStats = teachers
      .map((t) => {
        const tPlans = lessonPlans.filter((p) => String(p.teacher_id) === String(t.id));
        const totalPlans = tPlans.length;
        const completedPlans = tPlans.filter((p) => p.status === 'completed').length;

        const tCarryForwards = carryForwards.filter((c) => String(c.teacher_id) === String(t.id));

        const cfWeek = tCarryForwards.filter((c) => new Date(c.created_at) >= oneWeekAgo).length;
        const cfMonth = tCarryForwards.filter((c) => new Date(c.created_at) >= oneMonthAgo).length;
        const cfYear = tCarryForwards.filter((c) => new Date(c.created_at) >= oneYearAgo).length;

        const carryForwardTotal = tCarryForwards.length;

        const accuracy =
          totalPlans > 0 ? Math.max(0, 100 - (carryForwardTotal / totalPlans) * 20) : 0; // heuristic: 20% penalty per CF
        return {
          ...t,
          totalPlans,
          completedPlans,
          carryForwardTotal,
          cfWeek,
          cfMonth,
          cfYear,
          accuracy: totalPlans > 0 ? accuracy.toFixed(0) : '-',
        };
      })
      .sort((a, b) => b.totalPlans - a.totalPlans);

    return (
      <div className="bg-white border rounded-2xl shadow-sm p-4 text-left overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-700 text-sm">Teacher Planning Adherence</h3>
          <div className="text-xs text-gray-500 font-semibold bg-gray-50 px-3 py-1.5 rounded-full border">
            Metrics derived from automated Carry-Forward tracking
          </div>
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-y border-light-border text-dark-muted font-extrabold text-[10px] uppercase tracking-wider">
              <th className="px-4 py-3 border-r">Teacher</th>
              <th className="px-4 py-3 text-center border-r" colSpan="2">
                Overall Planning
              </th>
              <th className="px-4 py-3 text-center border-r" colSpan="4">
                Carry Forward Analytics
              </th>
              <th className="px-4 py-3 text-center">Health</th>
            </tr>
            <tr className="bg-gray-50 border-b border-light-border text-dark-muted font-bold text-[9px] uppercase tracking-wider">
              <th className="px-4 py-2 border-r"></th>
              <th className="px-4 py-2 text-center text-gray-500">Total Planned</th>
              <th className="px-4 py-2 text-center text-gray-500 border-r">Completed</th>

              <th className="px-4 py-2 text-center text-orange-600/80">7 Days</th>
              <th className="px-4 py-2 text-center text-orange-600/80">30 Days</th>
              <th className="px-4 py-2 text-center text-orange-600/80">Year</th>
              <th className="px-4 py-2 text-center text-orange-700 border-r">Lifetime Total</th>

              <th className="px-4 py-2 text-center">Accuracy %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teacherStats.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  No teacher data.
                </td>
              </tr>
            ) : (
              teacherStats.map((stat) => (
                <tr key={stat.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-bold text-dark-primary border-r">{stat.name}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{stat.totalPlans}</td>
                  <td className="px-4 py-3 text-center text-emerald-600 font-bold border-r">
                    {stat.completedPlans}
                  </td>

                  <td className="px-4 py-3 text-center text-orange-500 font-semibold">
                    {stat.cfWeek}
                  </td>
                  <td className="px-4 py-3 text-center text-orange-500 font-semibold">
                    {stat.cfMonth}
                  </td>
                  <td className="px-4 py-3 text-center text-orange-500 font-semibold">
                    {stat.cfYear}
                  </td>
                  <td className="px-4 py-3 text-center text-orange-600 font-bold border-r">
                    {stat.carryForwardTotal}
                  </td>

                  <td className="px-4 py-3 text-center bg-gray-50/30">
                    {stat.accuracy === '-' ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${stat.accuracy >= 80 ? 'bg-emerald-100 text-emerald-700' : stat.accuracy >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {stat.accuracy}%
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
              {role === 'parent'
                ? [
                    { key: 'today-class', label: "Today's Class", icon: 'fa-calendar-day' },
                    { key: 'upcoming-lessons', label: 'Upcoming Lessons', icon: 'fa-calendar-alt' },
                    {
                      key: 'two-weeks-class',
                      label: 'Last 2 Weeks Classes',
                      icon: 'fa-calendar-week',
                    },
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
                : [
                    { key: 'daily-activity', label: 'Teacher Progress', icon: 'fa-list-check' },
                    {
                      key: 'teacher-adherence',
                      label: 'Planning Adherence',
                      icon: 'fa-clipboard-check',
                    },
                    { key: 'class-progress', label: 'Syllabus Progress', icon: 'fa-chart-pie' },
                    { key: 'upcoming-lessons', label: 'Upcoming Lessons', icon: 'fa-calendar-alt' },
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
                  ))}
            </div>

            {role !== 'parent' && activeTab === 'daily-activity' && (
              <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full select-none">
                Showing {filteredDailyEntries.length} of {dailyEntries.length} entries
              </span>
            )}
            {role === 'parent' &&
              (activeTab === 'today-class' || activeTab === 'two-weeks-class') && (
                <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full select-none">
                  Showing {filteredDailyEntries.length} entries
                </span>
              )}
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

          {role !== 'parent' && activeTab === 'daily-activity' && (
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

          {activeTab === 'class-progress' && role !== 'parent' && (
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <div className="flex bg-gray-100 p-0.5 rounded-lg items-center border h-8 select-none">
                {[
                  { key: 'none', label: 'No Group' },
                  { key: 'classification', label: 'Classification' },
                  { key: 'subject', label: 'Subject' },
                ].map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setCpGroupingMode(g.key)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer h-7 flex items-center ${
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
        {activeTab === 'class-progress' && role !== 'parent' && (
          <div className="bg-white border rounded-2xl shadow-sm p-4 text-left flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filters:</span>
            </div>
            <div className="min-w-[140px] flex-1 sm:flex-initial">
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
            {role !== 'parent' && (
              <>
                <div className="min-w-[140px] flex-1 sm:flex-initial">
                  <MultiSelectDropdown
                    label=""
                    placeholder="Teacher Filter"
                    options={teachers.map((t) => ({ id: String(t.id), label: t.name }))}
                    selected={upFilterTeachers}
                    onChange={setUpFilterTeachers}
                  />
                </div>
                <div className="min-w-[140px] flex-1 sm:flex-initial">
                  <MultiSelectDropdown
                    label=""
                    placeholder="Class Filter"
                    options={classes.map((c) => ({ id: String(c.id), label: c.name || c.class_name }))}
                    selected={upFilterClasses}
                    onChange={setUpFilterClasses}
                  />
                </div>
                <div className="min-w-[140px] flex-1 sm:flex-initial">
                  <MultiSelectDropdown
                    label=""
                    placeholder="Subject Filter"
                    options={subjects.map((s) => ({ id: String(s.id), label: s.name }))}
                    selected={upFilterSubjects}
                    onChange={setUpFilterSubjects}
                  />
                </div>
              </>
            )}
            
            {/* Compact Date Range Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUpDatePopoverOpen(!isUpDatePopoverOpen)}
                className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  upcomingStartDate !== getLocalDateStr(0) || upcomingEndDate !== defaultEndDateStr
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
                          setUpcomingEndDate(defaultEndDateStr);
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

            {(() => {
              const defaultEndDateStr = (() => {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 28);
                const year = futureDate.getFullYear();
                const month = String(futureDate.getMonth() + 1).padStart(2, '0');
                const day = String(futureDate.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              })();

              const hasActiveFilters = 
                upFilterTeachers.length > 0 || 
                upFilterClasses.length > 0 || 
                upFilterSubjects.length > 0 || 
                upcomingStartDate !== getLocalDateStr(0) || 
                upcomingEndDate !== defaultEndDateStr;

              if (!hasActiveFilters) return null;

              return (
                <button
                  onClick={() => {
                    setUpFilterTeachers([]);
                    setUpFilterClasses([]);
                    setUpFilterSubjects([]);
                    setUpcomingStartDate(getLocalDateStr(0));
                    setUpcomingEndDate(defaultEndDateStr);
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors h-8"
                >
                  Reset
                </button>
              );
            })()}
          </div>
        )}

        {(activeTab === 'daily-activity' ||
          activeTab === 'today-class' ||
          activeTab === 'two-weeks-class') && (
          <DailyActivityTable
            role={role}
            student={student}
            activeTab={activeTab}
            dailyEntries={dailyEntries}
            dailyLoading={dailyLoading}
            classes={classes}
            subjects={subjects}
            books={books}
            teachers={teachers}
            classifications={classifications}
            filteredDailyEntries={filteredDailyEntries}
            filterClasses={filterClasses}
            setFilterClasses={setFilterClasses}
            filterSubjects={filterSubjects}
            setFilterSubjects={setFilterSubjects}
            filterBooks={filterBooks}
            setFilterBooks={setFilterBooks}
            filterTeachers={filterTeachers}
            setFilterTeachers={setFilterTeachers}
            filterTopic={filterTopic}
            setFilterTopic={setFilterTopic}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            clearDailyFilters={clearDailyFilters}
            handleDeleteClick={handleDeleteClick}
            isCreatedToday={() => true}
          />
        )}
        {activeTab === 'upcoming-lessons' && renderUpcomingLessons()}
        {activeTab === 'teacher-adherence' && renderTeacherAdherence()}
        {activeTab === 'class-progress' && (
          <SyllabusProgressGrid
            role={role}
            student={student}
            classesToRender={classes.filter((c) => {
              if (cpFilterClasses.length > 0) return cpFilterClasses.includes(String(c.id));
              return bookClasses.some(
                (bc) =>
                  String(bc.class_id) === String(c.id) &&
                  books.some((fb) => String(fb.id) === String(bc.book_id))
              );
            })}
            books={books}
            bookClasses={bookClasses}
            subjects={subjects}
            classifications={classifications}
            allTrackers={bookTrackers}
            allLogs={allLogs}
            allLessons={allLessons}
            cpGroupingMode={cpGroupingMode}
            cpFilterBooks={cpFilterBooks}
            cpFilterClassifications={cpFilterClassifications}
            progressExpandedBook={progressExpandedBook}
            progressExpandedClass={progressExpandedClass}
            handleProgressBookClick={handleProgressBookClick}
            progressLoading={progressLoading}
            progressBookLessons={progressBookLessons}
            progressBookLogs={progressBookLogs}
            showNotStarted={showNotStarted}
            setShowNotStarted={setShowNotStarted}
            expandedLogIds={expandedLogIds}
            toggleLogExpand={toggleLogExpand}
            logItemsMap={logItemsMap}
            handleDeleteClick={role !== 'parent' ? handleDeleteClick : undefined}
          />
        )}
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
