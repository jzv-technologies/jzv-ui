import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { supabase, fetchAllPages } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import ConfirmModal from '../ConfirmModal';
import MultiSelectDropdown from '../MultiSelectDropdown';
import { getNonTeachingEventForDate } from '../../utils/academicEventsUtils';
import DailyActivityTable from './DailyActivityTable';
import SyllabusProgressGrid from './SyllabusProgressGrid';
import AddWorkModalCompactView from './lesson-manager/AddWorkModalCompactView';
import AddWorkModalCompleteView from './lesson-manager/AddWorkModalCompleteView';
import AddWorkExceptionsModal from './AddWorkExceptionsModal';
import LessonManager from './lesson-manager/LessonManager';
import UpcomingLessonsGrid from './UpcomingLessonsGrid';
import SyllabusOverviewDashboard from './SyllabusOverviewDashboard';

import SyllabusTeacherAdherence from './SyllabusTeacherAdherence';
let syllabusTrackerPortalCache = {
  data: null,
  loadingPromise: null,
};

const usePortalPosition = (desiredWidth = 240, minHeight = 220) => {
  const triggerRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({});

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const panelWidth = Math.min(desiredWidth, viewportW - 20);

    // Clamp horizontally between 10px and (viewportW - panelWidth - 10px)
    let left = rect.left;
    if (left + panelWidth > viewportW - 10) {
      left = viewportW - panelWidth - 10;
    }
    if (left < 10) {
      left = 10;
    }

    // Auto flip upward if too close to bottom of screen
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const isCloseToBottom = spaceBelow < minHeight && spaceAbove > spaceBelow;

    setPanelStyle({
      position: 'fixed',
      top: isCloseToBottom ? 'auto' : `${rect.bottom + 6}px`,
      bottom: isCloseToBottom ? `${viewportH - rect.top + 6}px` : 'auto',
      left: `${left}px`,
      width: `${panelWidth}px`,
      maxWidth: 'calc(100vw - 20px)',
      maxHeight: isCloseToBottom
        ? `${Math.max(160, spaceAbove - 16)}px`
        : `${Math.max(160, spaceBelow - 16)}px`,
      zIndex: 99999,
    });
  }, [desiredWidth, minHeight]);

  return { triggerRef, panelStyle, updatePosition };
};

const FeatureSortDropdown = ({
  options = [],
  value,
  onChange,
  featureName = 'sort',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const { triggerRef, panelStyle, updatePosition } = usePortalPosition(240, 220);

  const selectedOpt = options.find((o) => o.key === value) || options[0] || {};

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        !e.target.closest('[data-sort-dropdown-panel]')
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={`relative ${className}`} data-feature-sort={featureName}>
      {/* Mobile view dropdown button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex sm:hidden items-center justify-between gap-1.5 h-9 px-3 rounded-xl border border-gray-250 bg-white text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-95 transition-all cursor-pointer w-full min-w-0"
        title={selectedOpt.label}
        aria-label={selectedOpt.label}
      >
        <span className="flex items-center gap-1.5 truncate min-w-0">
          <i
            className={`fas ${selectedOpt.icon || 'fa-sort'} text-brand-primary text-xs shrink-0`}
          ></i>
          <span className="truncate">{selectedOpt.label}</span>
        </span>
        <i
          className={`fas fa-chevron-${open ? 'up' : 'down'} text-[9px] text-gray-400 ml-1 shrink-0 transition-transform`}
        ></i>
      </button>

      {/* Mobile Popover Menu using Portal */}
      {open &&
        ReactDOM.createPortal(
          <div
            data-sort-dropdown-panel
            className="sm:hidden bg-white border border-light-border rounded-2xl shadow-2xl overflow-hidden p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150"
            style={panelStyle}
          >
            <div className="px-2.5 py-1 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-light-border/60 mb-1">
              Options
            </div>
            <div className="overflow-y-auto max-h-56 space-y-0.5">
              {options.map((opt) => {
                const isSelected = opt.key === value;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      onChange(opt.key);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-primary/10 text-brand-primary font-black'
                        : 'text-gray-700 hover:bg-gray-50 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-brand-primary text-white shadow-xs'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <i className={`fas ${opt.icon} text-xs`}></i>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs truncate font-bold leading-tight">{opt.label}</div>
                        {opt.desc && (
                          <div className="text-[10px] text-gray-400 font-normal truncate mt-0.5">
                            {opt.desc}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <i className="fas fa-check text-xs text-brand-primary shrink-0 ml-1"></i>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

      {/* Desktop view pill buttons */}
      <div className="hidden sm:flex bg-gray-100 p-0.5 rounded-xl border h-8 items-center gap-0.5 select-none">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            title={opt.desc || opt.label}
            aria-label={opt.label}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all h-full cursor-pointer flex items-center gap-1.5 ${
              value === opt.key
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <i className={`fas ${opt.icon} text-[10px]`}></i>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const UpcomingDateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const { triggerRef, panelStyle, updatePosition } = usePortalPosition(280, 240);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        !e.target.closest('[data-date-popover-panel]')
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={`col-span-1 relative w-full sm:w-auto ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-between gap-2 h-9 sm:h-8 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer w-full sm:w-auto bg-white text-gray-600 border-gray-250 hover:bg-gray-50 active:scale-95"
        title="Select Date Range"
      >
        <div className="flex items-center gap-1.5 truncate">
          <i className="fas fa-calendar-alt text-xs shrink-0 text-brand-primary"></i>
          <span className="truncate">
            {new Date(startDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
            {' - '}
            {new Date(endDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        <i
          className={`fas fa-chevron-down text-[9px] text-gray-400 transition-transform shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
        ></i>
      </button>

      {open &&
        ReactDOM.createPortal(
          <div
            data-date-popover-panel
            className="bg-white border border-light-border rounded-2xl shadow-2xl p-4 space-y-3 text-left animate-in fade-in zoom-in-95 duration-150"
            style={panelStyle}
          >
            <h5 className="text-xs font-black text-dark-primary uppercase tracking-wider border-b pb-1 mb-2">
              Date Range
            </h5>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-primary w-full bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-primary w-full bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-light-border">
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
                className="px-2.5 py-1 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3.5 py-1 text-xs font-bold bg-brand-primary text-white rounded-xl shadow-xs hover:bg-brand-dark cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

const SyllabusTrackerPortal = ({ role, user, student, teacherRecord, dashboardOnly = false }) => {
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
  const [academicEvents, setAcademicEvents] = useState([]);
  const [teacher, setTeacher] = useState(teacherRecord || null);
  const lastDailyFetchTimeRef = useRef(0);
  const teacherInitDoneRef = useRef('');

  // Favorites (Teacher only)
  const [favorites, setFavorites] = useState([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState(() => {
    if (role === 'parent') return 'two-weeks-class';
    if (role === 'teacher') return 'upcoming-lessons';
    return 'teacher-activity';
  });

  // Shared teacher filters used by Lesson Planner tab
  const [lpShowAllClasses, setLpShowAllClasses] = useState(false);
  const [lpFilterClassId, setLpFilterClassId] = useState('');
  const [lpFilterClassificationId, setLpFilterClassificationId] = useState('');
  const [lpFilterSubjectId, setLpFilterSubjectId] = useState('');
  const [lpFilterBookId, setLpFilterBookId] = useState('');

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

  const getDefaultEndDateStr = () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 28);
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Column Filters for Daily Activity
  const [filterClasses, setFilterClasses] = useState(() =>
    role === 'parent' && student?.class_id ? [String(student.class_id)] : []
  );
  const [filterSubjects, setFilterSubjects] = useState([]);
  const [filterBooks, setFilterBooks] = useState([]);
  const [filterTeachers, setFilterTeachers] = useState([]);
  const [teacherGenderFilter, setTeacherGenderFilter] = useState('all');
  const [filterTopic, setFilterTopic] = useState('');
  const [isMobileTopicSearchOpen, setIsMobileTopicSearchOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const [timeFilter, setTimeFilter] = useState('7_days'); // '7_days' | '30_days' | 'range'
  const [dateRange, setDateRange] = useState(() => ({
    start: getLocalDateStr(7),
    end: getLocalDateStr(0),
  }));

  const [cpFilterClasses, setCpFilterClasses] = useState([]);
  const [cpFilterClassifications, setCpFilterClassifications] = useState([]);
  const [cpFilterBooks, setCpFilterBooks] = useState([]);
  const [cpFilterSubjects, setCpFilterSubjects] = useState([]);
  const [cpFilterTeachers, setCpFilterTeachers] = useState([]);
  const [cpTeacherShowMineOnly, setCpTeacherShowMineOnly] = useState(true);
  const [cpGroupingMode, setCpGroupingMode] = useState('none'); // 'classification' | 'subject' | 'none'
  const [progressExpandedBook, setProgressExpandedBook] = useState(null);
  const [progressExpandedClass, setProgressExpandedClass] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [progressBookLessons, setProgressBookLessons] = useState([]);
  const [progressBookLogs, setProgressBookLogs] = useState([]);
  const [expandedLogIds, setExpandedLogIds] = useState({});
  const [logItemsMap, setLogItemsMap] = useState({});
  const [showNotStarted, setShowNotStarted] = useState(false);
  const [isExceptionsModalOpen, setIsExceptionsModalOpen] = useState(false);

  // ─── Tab 3: Upcoming Lessons Filters & Grouping ───
  const [upcomingGroupingMode, setUpcomingGroupingMode] = useState('class_subject');
  const [upFilterTeachers, setUpFilterTeachers] = useState([]);
  const [upFilterClasses, setUpFilterClasses] = useState([]);
  const [upFilterClassifications, setUpFilterClassifications] = useState([]);
  const [upFilterSubjects, setUpFilterSubjects] = useState([]);
  const [upFilterBooks, setUpFilterBooks] = useState([]);
  const [upcomingStartDate, setUpcomingStartDate] = useState(() => getLocalDateStr(0));
  const [upcomingEndDate, setUpcomingEndDate] = useState(() => getDefaultEndDateStr());
  const [isUpDatePopoverOpen, setIsUpDatePopoverOpen] = useState(false);

  // Teacher Modals
  const [isAddWorkModalOpen, setIsAddWorkModalOpen] = useState(false);
  const [plannedLessonToLog, setPlannedLessonToLog] = useState(null);
  const [todaysPlans, setTodaysPlans] = useState([]);

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

  // ─── Load Base Reference Data ───
  const loadData = async () => {
    if (syllabusTrackerPortalCache.data) {
      const cache = syllabusTrackerPortalCache.data;
      let fetchedClasses = cache.classes;
      if (role === 'parent' && student?.class_id) {
        const hasClass = fetchedClasses.some((c) => String(c.id) === String(student.class_id));
        if (!hasClass) {
          fetchedClasses = [
            ...fetchedClasses,
            { id: student.class_id, name: student.class_name || 'Class ' + student.class_id },
          ];
        }
      }
      setClasses(fetchedClasses);
      setSubjects(cache.subjects);
      setBooks(cache.books);
      setClassifications(cache.classifications);
      setBookClasses(cache.bookClasses);
      setAssignments(cache.assignments);
      setTeachers(cache.teachers);
      setBookTrackers(cache.bookTrackers);
      setAllLogs(cache.allLogs);
      setAllLessons(cache.allLessons);
      setLessonPlans(cache.lessonPlans);
      setCarryForwards(cache.carryForwards);
      setAcademicEvents(cache.academicEvents || []);
      setLoading(false);
      return;
    }

    if (syllabusTrackerPortalCache.loadingPromise) {
      setLoading(true);
      try {
        const cache = await syllabusTrackerPortalCache.loadingPromise;
        let fetchedClasses = cache.classes;
        if (role === 'parent' && student?.class_id) {
          const hasClass = fetchedClasses.some((c) => String(c.id) === String(student.class_id));
          if (!hasClass) {
            fetchedClasses = [
              ...fetchedClasses,
              { id: student.class_id, name: student.class_name || 'Class ' + student.class_id },
            ];
          }
        }
        setClasses(fetchedClasses);
        setSubjects(cache.subjects);
        setBooks(cache.books);
        setClassifications(cache.classifications);
        setBookClasses(cache.bookClasses);
        setAssignments(cache.assignments);
        setTeachers(cache.teachers);
        setBookTrackers(cache.bookTrackers);
        setAllLogs(cache.allLogs);
        setAllLessons(cache.allLessons);
        setLessonPlans(cache.lessonPlans);
        setCarryForwards(cache.carryForwards);
      } catch (err) {
        console.warn('SyllabusTrackerPortal coalesced load failed:', err.message);
        loadLocalFallback();
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    const fetchPromise = (async () => {
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
        resAcademicEvents,
      ] = await Promise.all([
        supabase.from('classes').select('*').order('id', { ascending: true }),
        supabase.from('syl_subjects').select('*').order('name', { ascending: true }),
        supabase.from('syl_books').select('*').order('name', { ascending: true }),
        supabase.from('syl_classifications').select('*').order('name', { ascending: true }),
        supabase.from('map_class_books').select('*'),
        supabase.from('class_assignments').select('*'),
        supabase.from('teachers').select('*').order('name', { ascending: true }),
        supabase.from('trk_book_level_progress').select('*'),
        fetchAllPages(
          'trk_lesson_level_progress',
          'id, lesson_id, class_id, status, completion_percentage, revision_counter, start_date, end_date, days_taken, updated_at, book_id, replan_counter, carry_forward_counter, carry_forward_count, delay_start, delay_end'
        ),
        lpFilterBookId
          ? fetchAllPages('syl_lessons', '*', (q) =>
              q
                .eq('book_id', lpFilterBookId)
                .order('sequence', { ascending: true, nullsFirst: false })
                .order('id', { ascending: true })
            )
          : Promise.resolve({ data: [], error: null }),
        fetchAllPages(
          'trk_lesson_level_progress',
          '*, lesson:syl_lessons(*), class:classes(*), subject:syl_subjects(*), book:syl_books(*)',
          (q) => q.in('status', ['planned', 'in_progress', 'completed'])
        ),
        supabase.from('lesson_plan_carry_forwards').select('*'),
        supabase.from('academic_events').select('*').order('start_date', { ascending: true }),
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
      if (resAcademicEvents && resAcademicEvents.error) throw resAcademicEvents.error;

      const dbClasses = resClasses.data || [];
      const dbSubjects = resSubjects.data || [];
      const dbBooks = resBooks.data || [];
      const dbClassifications = resClassifications.data || [];
      const dbBookClasses = resBookClasses.data || [];
      const dbAssignments = resAssignments.data || [];
      const dbTeachers = (resTeachers.data || []).map((t) => ({ ...t, id: t.teacher_id || t.id }));
      const dbTrackers = resTrackers.data || [];
      const dbLessons = resLessons.data || [];
      const rawLogs = resLogs.data || [];
      const rawPlans = resPlans.data || [];
      const dbCarryForwards = resCarryForwards.data || [];
      const dbAcademicEvents = (resAcademicEvents && resAcademicEvents.data) || [];

      const dbLogs = rawLogs.map((log) => ({ ...log, current_status: log.status }));
      const dbPlans = rawPlans.map((plan) => ({ ...plan, target_date: plan.target_start_date }));

      return {
        classes: dbClasses,
        subjects: dbSubjects,
        books: dbBooks,
        classifications: dbClassifications,
        bookClasses: dbBookClasses,
        assignments: dbAssignments,
        teachers: dbTeachers,
        bookTrackers: dbTrackers,
        allLogs: dbLogs,
        allLessons: dbLessons,
        lessonPlans: dbPlans,
        carryForwards: dbCarryForwards,
        academicEvents: dbAcademicEvents,
      };
    })();

    syllabusTrackerPortalCache.loadingPromise = fetchPromise;

    try {
      const cacheData = await fetchPromise;
      syllabusTrackerPortalCache.data = cacheData;

      let fetchedClasses = cacheData.classes;
      if (role === 'parent' && student?.class_id) {
        const hasClass = fetchedClasses.some((c) => String(c.id) === String(student.class_id));
        if (!hasClass) {
          fetchedClasses = [
            ...fetchedClasses,
            { id: student.class_id, name: student.class_name || 'Class ' + student.class_id },
          ];
        }
      }

      setClasses(fetchedClasses);
      setSubjects(cacheData.subjects);
      setBooks(cacheData.books);
      setClassifications(cacheData.classifications);
      setBookClasses(cacheData.bookClasses);
      setAssignments(cacheData.assignments);
      setTeachers(cacheData.teachers);
      setBookTrackers(cacheData.bookTrackers);
      setAllLogs(cacheData.allLogs);
      setAllLessons(cacheData.allLessons);
      setLessonPlans(cacheData.lessonPlans);
      setCarryForwards(cacheData.carryForwards);
    } catch (err) {
      console.warn('SyllabusTrackerPortal loadData failed:', err.message);
      syllabusTrackerPortalCache.loadingPromise = null;
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
        setTeachers(parsed.teachers || []);
        setAssignments(parsed.assignments || []);
      } catch (e) {}
    }
    const rawBC = localStorage.getItem('jzv_map_class_books');
    if (rawBC) {
      try {
        const parsedBC = JSON.parse(rawBC);
        setBookClasses(parsedBC);
      } catch (e) {}
    }
  };

  // ─── Initialize Teacher Specific Record & Favorites ───
  useEffect(() => {
    const initTeacher = async () => {
      if (role !== 'teacher' || !user?.id) return;
      const teacherKey = `${user.id}-${teacherRecord?.id || ''}`;
      if (teacherInitDoneRef.current === teacherKey && teacher) return;

      try {
        let teacherData = teacherRecord;
        if (!teacherData) {
          const { data, error: teachErr } = await supabase.rpc('get_current_teacher_details', {
            p_auth_id: user.id,
          });
          if (teachErr) throw teachErr;
          teacherData = Array.isArray(data) ? data[0] : data;
        }
        if (teacherData) {
          teacherInitDoneRef.current = teacherKey;
          setTeacher(teacherData);
          setUpFilterTeachers([String(teacherData.id)]);

          let dbFavs = await loadFavoritesFromDB(teacherData.id);
          if (dbFavs.length === 0) {
            const migrated = await migrateLocalStorageFavorites(teacherData.id);
            if (migrated) dbFavs = migrated;
          }
          setFavorites(dbFavs);
        }
      } catch (err) {
        console.warn('Teacher init failed:', err.message);
      }
    };
    initTeacher();
  }, [role, user?.id, teacherRecord?.id]);

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
      setActiveTab('two-weeks-class');
    }
  }, [student?.class_id, role]);

  // ─── Fetch Daily Entries ───
  const fetchDailyEntries = useCallback(
    async (options = {}) => {
      const force = options?.force === true;
      const now = Date.now();
      if (!force && now - lastDailyFetchTimeRef.current < 3000) {
        return;
      }
      lastDailyFetchTimeRef.current = now;

      setDailyLoading(true);
      try {
        let items = [];
        let startBound = null;
        let endBound = null;

        if (role === 'parent') {
          if (activeTab === 'two-weeks-class') {
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

          if (timeFilter === 'range' && (!dateRange.start || !dateRange.end)) {
            setDailyEntries([]);
            setDailyLoading(false);
            return;
          }
        }

        let query = supabase.from('trk_daily_teacher_progress').select(`
          *,
          teacher:teachers(name),
          lesson_progress:trk_lesson_level_progress(
            *,
            lesson:syl_lessons(*),
            class:classes(*),
            subject:syl_subjects(*),
            book:syl_books(*)
          )
        `);

        if (role === 'parent' && student?.class_id) {
          const { data: progressRows } = await supabase
            .from('trk_lesson_level_progress')
            .select('id')
            .eq('class_id', student.class_id);
          const progressIds = (progressRows || []).map((r) => r.id);

          if (progressIds.length === 0) {
            setDailyEntries([]);
            setDailyLoading(false);
            return;
          }
          query = query.in('progress_id', progressIds);
        } else if (role === 'teacher') {
          const currentTeacherId =
            teacher?.id || teacherRecord?.id || teacher?.teacher_id || teacherRecord?.teacher_id;
          if (!currentTeacherId) {
            setDailyEntries([]);
            setDailyLoading(false);
            return;
          }
          query = query.eq('teacher_id', currentTeacherId);
        }

        if (startBound && endBound) {
          query = query.gte('date', startBound).lte('date', endBound);
        }

        const { data: dbItems, error } = await query.order('date', { ascending: false }).limit(200);
        if (error) throw error;
        items = dbItems || [];

        const enriched = items.map((item) => {
          const nestedProgress = Array.isArray(item.lesson_progress)
            ? item.lesson_progress[0]
            : item.lesson_progress;
          const fallbackLog = allLogs.find((l) => String(l.id) === String(item.progress_id));
          const progressObj =
            nestedProgress ||
            (typeof item.progress === 'object' ? item.progress : null) ||
            fallbackLog;
          const log = progressObj ? { ...progressObj, current_status: progressObj.status } : null;
          const lesson =
            (progressObj && progressObj.lesson) ||
            allLessons.find((l) => String(l.id) === String(progressObj?.lesson_id)) ||
            null;
          const book =
            progressObj?.book ||
            books.find((b) => String(b.id) === String(progressObj?.book_id || lesson?.book_id)) ||
            null;
          const subject =
            progressObj?.subject ||
            subjects.find((s) => String(s.id) === String(progressObj?.subject_id)) ||
            (book ? subjects.find((s) => String(s.id) === String(book.subject_id)) : null) ||
            null;
          const cls =
            progressObj?.class ||
            classes.find((c) => String(c.id) === String(progressObj?.class_id)) ||
            null;

          const rawProgress =
            typeof item.progress === 'number'
              ? item.progress
              : typeof item.progress === 'string'
                ? parseFloat(item.progress)
                : null;
          const finalProgress =
            rawProgress !== null && !Number.isNaN(rawProgress)
              ? rawProgress
              : progressObj?.completion_percentage || 0;

          const computedStatus =
            finalProgress >= 100
              ? 'completed'
              : item.current_status || (progressObj ? progressObj.status : 'in_progress');

          return {
            ...item,
            current_status: computedStatus,
            progress: finalProgress,
            lt_log_id: item.progress_id,
            log,
            lesson,
            book,
            subject,
            class: cls,
            lessonPath: lesson
              ? [lesson.level1, lesson.level2, lesson.level3].filter(Boolean).join(' > ')
              : 'Unknown',
            isRevision: lesson?.level1 === '_Revision' || item.is_revision === 'Y',
          };
        });

        setDailyEntries(enriched);
      } catch (err) {
        console.warn('Failed to fetch daily activity logs:', err.message);
        setDailyEntries([]);
      } finally {
        setDailyLoading(false);
      }
    },
    [
      role,
      activeTab,
      student?.class_id,
      teacher?.id,
      teacherRecord?.id,
      teacher?.teacher_id,
      teacherRecord?.teacher_id,
      timeFilter,
      dateRange.start,
      dateRange.end,
      books,
      subjects,
      classes,
      allLogs,
      allLessons,
    ]
  );

  // ─── Fetch Teacher Class Progress Logs & Trackers ───
  const fetchTeacherProgressData = async () => {
    if (role !== 'teacher') return;
    setProgressLoading(true);
    try {
      const progressClasses =
        assignments.length === 0
          ? classes
          : classes.filter((c) => assignments.some((a) => String(a.class_id) === String(c.id)));
      const classIds = progressClasses.map((c) => c.id);

      if (classIds.length === 0) {
        setBookTrackers([]);
        setAllLogs([]);
        setProgressLoading(false);
        return;
      }

      const [trackerRes, logsRes] = await Promise.all([
        supabase.from('trk_book_level_progress').select('*').in('class_id', classIds),
        supabase
          .from('trk_lesson_level_progress')
          .select(
            'id, lesson_id, class_id, status, completion_percentage, revision_counter, start_date, end_date, days_taken, updated_at, book_id'
          )
          .in('class_id', classIds),
      ]);

      if (trackerRes.error) throw trackerRes.error;
      if (logsRes.error) throw logsRes.error;

      const mappedLogs = (logsRes.data || []).map((log) => ({
        ...log,
        current_status: log.status,
      }));
      setBookTrackers(trackerRes.data || []);
      setAllLogs(mappedLogs);
    } catch (err) {
      console.warn('Failed to fetch teacher progress data:', err.message);
    } finally {
      setProgressLoading(false);
    }
  };

  // ─── Fetch Teacher's Today Plans ───
  useEffect(() => {
    if (role === 'teacher' && lessonPlans.length > 0) {
      const todayStr = getLocalDateStr(0);
      const currentTeacherId =
        teacher?.id || teacherRecord?.id || teacher?.teacher_id || teacherRecord?.teacher_id;
      if (!currentTeacherId) {
        setTodaysPlans([]);
        return;
      }

      const filtered = lessonPlans.filter((p) => {
        if (p.status !== 'planned') return false;
        if (p.target_start_date && p.target_start_date > todayStr) return false;

        // Direct teacher match if present
        if (p.teacher_id && String(p.teacher_id) === String(currentTeacherId)) {
          return true;
        }

        // Assignment match (class_assignments maps class_id + subject_id to teacher_id)
        const assignment = (assignments || []).find(
          (a) =>
            String(a.class_id) === String(p.class_id) &&
            String(a.subject_id) === String(p.subject_id)
        );
        return assignment && String(assignment.teacher_id) === String(currentTeacherId);
      });
      setTodaysPlans(filtered);
    } else if (role !== 'teacher') {
      setTodaysPlans([]);
    }
  }, [
    role,
    lessonPlans,
    teacher?.id,
    teacherRecord?.id,
    teacher?.teacher_id,
    teacherRecord?.teacher_id,
    assignments,
  ]);

  // ─── Fetch Daily Entries on Tab Selection ───
  useEffect(() => {
    if (dashboardOnly) return;
    if (activeTab === 'teacher-activity' || activeTab === 'two-weeks-class') {
      fetchDailyEntries();
    }
  }, [dashboardOnly, activeTab, fetchDailyEntries]);

  // ─── Delete Actions ───
  const handleDeleteClick = (entry, parentLog = null, lesson = null, book = null) => {
    if (role !== 'management') return;

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
      logId: parentLog?.id || entry.lt_log_id || entry.progress_id,
    });
  };

  const handleExecuteDelete = async () => {
    if (!deleteModalConfig) return;
    setDailyLoading(true);
    try {
      const { error } = await supabase
        .from('trk_daily_teacher_progress')
        .delete()
        .eq('id', deleteModalConfig.id);
      if (error) throw error;

      if (deleteModalConfig.logId) {
        const { data: remainingItems } = await supabase
          .from('trk_daily_teacher_progress')
          .select('progress, is_revision')
          .eq('progress_id', deleteModalConfig.logId);

        const nonRevisionItems = (remainingItems || []).filter((item) => item.is_revision !== 'Y');

        let newProgress = 0;
        let newStatus = 'not_started';

        if (nonRevisionItems.length > 0) {
          newProgress = Math.max(...nonRevisionItems.map((item) => Number(item.progress || 0)));
          if (newProgress >= 100) {
            newStatus = 'completed';
          } else if (newProgress > 0) {
            newStatus = 'in_progress';
          }
        }

        await supabase
          .from('trk_lesson_level_progress')
          .update({
            completion_percentage: newProgress,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deleteModalConfig.logId);
      }

      showToast('Log entry deleted successfully!', 'success');
      setDailyEntries((prev) => prev.filter((item) => item.id !== deleteModalConfig.id));

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
      if (role === 'teacher') {
        await fetchTeacherProgressData();
      }
    } catch (err) {
      showToast('Error deleting log entry: ' + err.message, 'error');
    } finally {
      setDailyLoading(false);
    }
  };

  // ─── Click Book Tile to Expand Lessons ───
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
        fetchAllPages('syl_lessons', '*', (q) =>
          q
            .eq('book_id', bookId)
            .order('sequence', { ascending: true, nullsFirst: false })
            .order('id', { ascending: true })
        ),
        fetchAllPages(
          'trk_lesson_level_progress',
          'id, lesson_id, class_id, status, completion_percentage, revision_counter, start_date, end_date, days_taken, updated_at, book_id',
          (q) => q.eq('class_id', classId)
        ),
      ]);
      if (lessErr) throw lessErr;
      if (logErr) throw logErr;

      const mappedLogs = (logs || []).map((log) => ({ ...log, current_status: log.status }));
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

      bookLessons.sort((a, b) => {
        const seqA = a.sequence !== null && a.sequence !== undefined ? Number(a.sequence) : null;
        const seqB = b.sequence !== null && b.sequence !== undefined ? Number(b.sequence) : null;
        if (seqA !== null && seqB !== null) return seqA - seqB;
        if (seqA !== null) return -1;
        if (seqB !== null) return 1;
        return (Number(a.id) || 0) - (Number(b.id) || 0);
      });

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
          .from('trk_daily_teacher_progress')
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

  const handleTabChange = async (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'teacher-activity' || tabKey === 'two-weeks-class') {
      await fetchDailyEntries();
    } else if (role === 'teacher' && tabKey === 'syllabus-progress') {
      await fetchTeacherProgressData();
      setProgressExpandedBook(null);
      setProgressExpandedClass(null);
    }
  };

  const handleAddWorkSuccess = async () => {
    syllabusTrackerPortalCache.data = null;
    syllabusTrackerPortalCache.loadingPromise = null;
    await loadData();
    await fetchDailyEntries();
    if (role === 'teacher') {
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

  const clearDailyFilters = () => {
    setFilterClasses(role === 'parent' && student?.class_id ? [String(student.class_id)] : []);
    setFilterSubjects([]);
    setFilterBooks([]);
    setFilterTeachers([]);
    setTeacherGenderFilter('all');
    setFilterTopic('');
    setFilterStatus('');
    setTimeFilter('7_days');
    setDateRange({ start: getLocalDateStr(7), end: getLocalDateStr(0) });
  };

  const getFilteredDailyEntries = () => {
    const currentTeacherId =
      teacher?.id || teacherRecord?.id || teacher?.teacher_id || teacherRecord?.teacher_id;

    return dailyEntries.filter((entry) => {
      if (role === 'teacher' && currentTeacherId) {
        if (String(entry.teacher_id) !== String(currentTeacherId)) {
          return false;
        }
      }
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
      if (teacherGenderFilter && teacherGenderFilter !== 'all') {
        const tObj = teachers.find(
          (t) => String(t.id || t.teacher_id) === String(entry.teacher_id)
        );
        const isFemale =
          tObj?.is_female === true || tObj?.gender === 'female' || tObj?.is_male === false;
        if (teacherGenderFilter === 'male' && isFemale) return false;
        if (teacherGenderFilter === 'female' && !isFemale) return false;
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

  // ─── Teacher Carry Forward Action ───
  const handleCarryForward = async (plan, newStartDate = null, newEndDate = null) => {
    try {
      setDailyLoading(true);

      const targetCheckDate = newStartDate || newEndDate;
      if (targetCheckDate) {
        const nonTeaching = getNonTeachingEventForDate(targetCheckDate, academicEvents);
        if (nonTeaching) {
          showToast(
            `Cannot plan on ${targetCheckDate}: Non-teaching day (${nonTeaching.event_name})`,
            'error'
          );
          setDailyLoading(false);
          return;
        }
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const oldStart = plan.target_start_date ? String(plan.target_start_date).split('T')[0] : null;
      const oldEnd = plan.target_end_date ? String(plan.target_end_date).split('T')[0] : null;
      const oldCreated = plan.created_at ? String(plan.created_at).split('T')[0] : null;

      let newStart = plan.target_start_date;
      let newEnd = plan.target_end_date;

      if (plan.status === 'planned') {
        if (!newStartDate) {
          throw new Error('New start date is required to change plan.');
        }
        newStart = newStartDate;

        if (plan.target_start_date && plan.target_end_date) {
          const startD = new Date(plan.target_start_date);
          const endD = new Date(plan.target_end_date);
          const diffTime = endD - startD;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          const newEndD = new Date(newStartDate);
          newEndD.setDate(newEndD.getDate() + (diffDays > 0 ? diffDays : 0));
          newEnd = newEndD.toISOString().split('T')[0];
        } else {
          newEnd = newStartDate;
        }
      } else {
        if (newEndDate) {
          newEnd = newEndDate;
        } else {
          const currentEnd = plan.target_end_date || plan.target_start_date;
          if (currentEnd) {
            const dEnd = new Date(currentEnd);
            dEnd.setDate(dEnd.getDate() + 1);
            if (dEnd.getDay() === 0) dEnd.setDate(dEnd.getDate() + 1); // skip Sunday
            newEnd = dEnd.toISOString().split('T')[0];
          }
        }
      }

      let replanIncrement = 0;
      if (oldStart === todayStr && newStart > todayStr && oldCreated !== todayStr) {
        replanIncrement = 1;
      }

      let carryForwardIncrement = 0;
      if (plan.status === 'in_progress' && newEnd !== oldEnd) {
        carryForwardIncrement = 1;
      }

      const getDaysDiff = (dateA, dateB) => {
        if (!dateA || !dateB) return 0;
        const dA = new Date(String(dateA).split('T')[0]);
        const dB = new Date(String(dateB).split('T')[0]);
        return Math.ceil((dA - dB) / (1000 * 60 * 60 * 24));
      };

      const delay_start = plan.start_date ? getDaysDiff(plan.start_date, newStart) : 0;
      const delay_end = plan.end_date ? getDaysDiff(plan.end_date, newEnd) : 0;

      let updateData = {
        target_start_date: newStart,
        target_end_date: newEnd,
        replan_counter: (plan.replan_counter || 0) + replanIncrement,
        carry_forward_counter: (plan.carry_forward_counter || 0) + carryForwardIncrement,
        carry_forward_count:
          (plan.carry_forward_count || 0) + (replanIncrement || carryForwardIncrement ? 1 : 0),
        delay_start,
        delay_end,
      };

      const { error } = await supabase
        .from('trk_lesson_level_progress')
        .update(updateData)
        .eq('id', plan.id);
      if (error) throw error;

      if (plan.target_start_date && updateData.target_start_date) {
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

      showToast(
        plan.status === 'planned' ? 'Lesson plan changed' : 'Lesson carried forward',
        'success'
      );
      const newPlans = todaysPlans.filter((p) => p.id !== plan.id);
      setTodaysPlans(newPlans);
      syllabusTrackerPortalCache.data = null;
      syllabusTrackerPortalCache.loadingPromise = null;
      loadData();
    } catch (e) {
      showToast('Failed to update lesson plan: ' + e.message, 'error');
    } finally {
      setDailyLoading(false);
    }
  };

  const handleSubmitPlannedLesson = (plan) => {
    setPlannedLessonToLog(plan);
    setIsAddWorkModalOpen(true);
  };

  // Class Progress Chained Filters Handlers and Lookups
  const handleCpClassificationsChange = (newClassifications) => {
    setCpFilterClassifications(newClassifications);
    setProgressExpandedBook(null);
    setProgressExpandedClass(null);

    // Filter active subject selections
    if (newClassifications.length > 0) {
      setCpFilterSubjects((prev) =>
        prev.filter((subId) => {
          const s = subjects.find((sub) => String(sub.id) === String(subId));
          return s && newClassifications.includes(String(s.classification_id));
        })
      );
    } else {
      setCpFilterSubjects([]);
    }
    // Reset book selections when classification changes
    setCpFilterBooks([]);
  };

  const handleCpSubjectsChange = (newSubjects) => {
    setCpFilterSubjects(newSubjects);
    setProgressExpandedBook(null);
    setProgressExpandedClass(null);

    // Filter active book selections
    if (newSubjects.length > 0) {
      setCpFilterBooks((prev) =>
        prev.filter((bookId) => {
          const b = books.find((bk) => String(bk.id) === String(bookId));
          return b && newSubjects.includes(String(b.subject_id));
        })
      );
    } else {
      setCpFilterBooks([]);
    }
  };

  const getProgressBookMappings = () => {
    const selectedClassIds = new Set(cpFilterClasses.map(String));
    return bookClasses.filter((mapping) => {
      if (selectedClassIds.size > 0 && !selectedClassIds.has(String(mapping.class_id))) {
        return false;
      }
      return true;
    });
  };

  const getFilteredSubjectOpts = () => {
    let filtered = subjects;
    if (cpFilterClassifications.length > 0) {
      filtered = filtered.filter((s) =>
        cpFilterClassifications.includes(String(s.classification_id))
      );
    }
    return filtered.map((s) => ({ id: String(s.id), label: s.name }));
  };

  const getFilteredClassificationOpts = () => {
    return classifications.map((cl) => ({ id: String(cl.id), label: cl.name }));
  };

  const getFilteredBookOpts = () => {
    let filtered = books;
    if (cpFilterSubjects.length > 0) {
      filtered = filtered.filter((b) => cpFilterSubjects.includes(String(b.subject_id)));
    } else if (cpFilterClassifications.length > 0) {
      const allowedSubjectIds = new Set(
        subjects
          .filter((s) => cpFilterClassifications.includes(String(s.classification_id)))
          .map((s) => String(s.id))
      );
      filtered = filtered.filter((b) => allowedSubjectIds.has(String(b.subject_id)));
    }
    return filtered.map((b) => ({ id: String(b.id), label: b.name }));
  };

  // Upcoming Lessons Chained Filters Handlers and Lookups
  const handleUpClassificationsChange = (newClassifications) => {
    setUpFilterClassifications(newClassifications);
    if (newClassifications.length > 0) {
      setUpFilterSubjects((prev) =>
        prev.filter((subId) => {
          const s = subjects.find((sub) => String(sub.id) === String(subId));
          return s && newClassifications.includes(String(s.classification_id));
        })
      );
    } else {
      setUpFilterSubjects([]);
    }
    setUpFilterBooks([]);
  };

  const handleUpSubjectsChange = (newSubjects) => {
    setUpFilterSubjects(newSubjects);
    if (newSubjects.length > 0) {
      setUpFilterBooks((prev) =>
        prev.filter((bookId) => {
          const b = books.find((bk) => String(bk.id) === String(bookId));
          return b && newSubjects.includes(String(b.subject_id));
        })
      );
    } else {
      setUpFilterBooks([]);
    }
  };

  const getFilteredUpSubjectOpts = () => {
    let filtered = subjects;
    if (role === 'teacher') {
      filtered = filtered.filter((s) =>
        assignments.some((a) => String(a.subject_id) === String(s.id))
      );
    }
    if (upFilterClassifications.length > 0) {
      filtered = filtered.filter((s) =>
        upFilterClassifications.includes(String(s.classification_id))
      );
    }
    return filtered.map((s) => ({ id: String(s.id), label: s.name }));
  };

  const getFilteredUpBookOpts = () => {
    let filtered = books;
    if (upFilterSubjects.length > 0) {
      filtered = filtered.filter((b) => upFilterSubjects.includes(String(b.subject_id)));
    } else if (upFilterClassifications.length > 0) {
      const allowedSubjectIds = subjects
        .filter((s) => upFilterClassifications.includes(String(s.classification_id)))
        .map((s) => String(s.id));
      filtered = filtered.filter((b) => allowedSubjectIds.includes(String(b.subject_id)));
    }
    return filtered.map((b) => ({ id: String(b.id), label: b.name }));
  };

  const getClassesToRender = () => {
    let baseClasses = classes;
    if (role === 'parent' && student?.class_id) {
      baseClasses = classes.filter((c) => String(c.id) === String(student.class_id));
    } else if (role === 'teacher') {
      baseClasses =
        assignments.length === 0
          ? classes
          : classes.filter((c) => assignments.some((a) => String(a.class_id) === String(c.id)));
    }

    if (cpFilterClasses.length > 0) {
      return baseClasses.filter((c) => cpFilterClasses.includes(String(c.id)));
    }
    return baseClasses;
  };

  const lpTeacherId = teacher?.id ? String(teacher.id) : '';
  const lpTeacherClassIds = new Set(
    assignments.filter((a) => String(a.teacher_id) === lpTeacherId).map((a) => String(a.class_id))
  );

  const lpAvailableClasses =
    role !== 'teacher' || lpShowAllClasses || !lpTeacherId
      ? classes
      : classes.filter((c) => lpTeacherClassIds.has(String(c.id)));

  const lpClassAssignmentSubjectIds = new Set(
    assignments
      .filter(
        (a) =>
          String(a.teacher_id) === lpTeacherId && String(a.class_id) === String(lpFilterClassId)
      )
      .map((a) => String(a.subject_id))
  );

  const lpMappedBookIdsForClass = new Set(
    bookClasses
      .filter((bc) => String(bc.class_id) === String(lpFilterClassId))
      .map((bc) => String(bc.book_id))
  );

  const lpMappedSubjectIdsFromBooks = new Set(
    books.filter((b) => lpMappedBookIdsForClass.has(String(b.id))).map((b) => String(b.subject_id))
  );

  const lpAvailableSubjects = !lpFilterClassId
    ? []
    : subjects.filter((s) => {
        const sId = String(s.id);
        if (role !== 'teacher' || lpShowAllClasses) {
          return lpMappedSubjectIdsFromBooks.size === 0 || lpMappedSubjectIdsFromBooks.has(sId);
        }
        return lpClassAssignmentSubjectIds.has(sId);
      });

  const lpAvailableClassifications = classifications.filter((cl) =>
    lpAvailableSubjects.some((s) => String(s.classification_id) === String(cl.id))
  );

  const lpVisibleSubjects = lpFilterClassificationId
    ? lpAvailableSubjects.filter(
        (s) => String(s.classification_id) === String(lpFilterClassificationId)
      )
    : lpAvailableSubjects;

  const lpAvailableBooks =
    !lpFilterClassId || !lpFilterSubjectId
      ? []
      : books.filter((b) => {
          const matchSubject = String(b.subject_id) === String(lpFilterSubjectId);
          const matchClass = bookClasses.some(
            (bc) =>
              String(bc.book_id) === String(b.id) && String(bc.class_id) === String(lpFilterClassId)
          );
          return matchSubject && matchClass;
        });

  // Auto-select Classification, Subject, and Book in Lesson Planner if only 1 option exists
  useEffect(() => {
    if (activeTab !== 'lesson-planner') return;
    if (!lpFilterClassId) return;

    if (!lpFilterClassificationId && lpAvailableClassifications.length === 1) {
      setLpFilterClassificationId(String(lpAvailableClassifications[0].id));
      return;
    }

    if (!lpFilterSubjectId && lpVisibleSubjects.length === 1) {
      setLpFilterSubjectId(String(lpVisibleSubjects[0].id));
      return;
    }

    if (lpFilterSubjectId && !lpFilterBookId && lpAvailableBooks.length === 1) {
      setLpFilterBookId(String(lpAvailableBooks[0].id));
      return;
    }
  }, [
    activeTab,
    lpFilterClassId,
    lpFilterClassificationId,
    lpFilterSubjectId,
    lpFilterBookId,
    lpAvailableClassifications,
    lpVisibleSubjects,
    lpAvailableBooks,
  ]);

  // Lazy load lessons for the selected book on-demand
  useEffect(() => {
    if (!lpFilterBookId) return;

    const bookLessonsLoaded = allLessons.some((l) => String(l.book_id) === String(lpFilterBookId));
    if (bookLessonsLoaded) return;

    let isMounted = true;
    const fetchBookLessons = async () => {
      try {
        const { data, error } = await fetchAllPages('syl_lessons', '*', (q) =>
          q
            .eq('book_id', lpFilterBookId)
            .order('sequence', { ascending: true, nullsFirst: false })
            .order('id', { ascending: true })
        );
        if (error) throw error;
        if (isMounted && data) {
          setAllLessons((prev) => {
            const existingIds = new Set(prev.map((l) => String(l.id)));
            const newLessons = data.filter((l) => !existingIds.has(String(l.id)));
            return [...prev, ...newLessons];
          });
        }
      } catch (err) {
        console.error(
          'SyllabusTrackerPortal: Failed to lazy load lessons for book:',
          lpFilterBookId,
          err
        );
      }
    };

    fetchBookLessons();
    return () => {
      isMounted = false;
    };
  }, [lpFilterBookId, allLessons]);

  if (loading) {
    return (
      <div className="p-8 text-center bg-light-bg min-h-screen flex items-center justify-center font-bold text-dark-primary">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mr-3"></div>
        Loading Syllabus Dashboard...
      </div>
    );
  }

  const roleTabs = {
    parent: [
      {
        key: 'two-weeks-class',
        label: 'Last 2 Weeks Classes',
        shortLabel: '2 Weeks',
        icon: 'fa-calendar-week',
      },
      {
        key: 'syllabus-progress',
        label: 'Syllabus Progress',
        shortLabel: 'Progress',
        icon: 'fa-chart-pie',
      },
      {
        key: 'upcoming-lessons',
        label: 'Upcoming Lessons',
        shortLabel: 'Upcoming',
        icon: 'fa-calendar-alt',
      },
    ],
    teacher: [
      {
        key: 'lesson-planner',
        label: 'Lesson Planner',
        shortLabel: 'Planner',
        icon: 'fa-calendar-check',
      },
      {
        key: 'syllabus-progress',
        label: 'Syllabus Progress',
        shortLabel: 'Progress',
        icon: 'fa-chart-pie',
      },
      {
        key: 'upcoming-lessons',
        label: 'Upcoming Lessons',
        shortLabel: 'Upcoming',
        icon: 'fa-calendar-alt',
      },
      {
        key: 'teacher-activity',
        label: 'My Activity',
        shortLabel: 'Activity',
        icon: 'fa-list-check',
      },
    ],
    admin: [
      {
        key: 'teacher-activity',
        label: 'Teacher Activity',
        shortLabel: 'Activity',
        icon: 'fa-list-check',
      },
      {
        key: 'syllabus-progress',
        label: 'Syllabus Progress',
        shortLabel: 'Progress',
        icon: 'fa-chart-pie',
      },
      {
        key: 'upcoming-lessons',
        label: 'Upcoming Lessons',
        shortLabel: 'Upcoming',
        icon: 'fa-calendar-alt',
      },
      {
        key: 'teacher-adherence',
        label: 'Planning Adherence',
        shortLabel: 'Adherence',
        icon: 'fa-clipboard-check',
      },
    ],
    management: [
      {
        key: 'teacher-activity',
        label: 'Teacher Activity',
        shortLabel: 'Activity',
        icon: 'fa-list-check',
      },
      {
        key: 'syllabus-progress',
        label: 'Syllabus Progress',
        shortLabel: 'Progress',
        icon: 'fa-chart-pie',
      },
      {
        key: 'upcoming-lessons',
        label: 'Upcoming Lessons',
        shortLabel: 'Upcoming',
        icon: 'fa-calendar-alt',
      },
      {
        key: 'teacher-adherence',
        label: 'Planning Adherence',
        shortLabel: 'Adherence',
        icon: 'fa-clipboard-check',
      },
    ],
  };

  const currentTabs = roleTabs[role] || roleTabs.admin;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-light-bg font-sans">
      <div className="p-3 sm:p-6 overflow-y-auto pb-24 flex-1">
        {!dashboardOnly && (
          <div
            className="flex justify-between items-center gap-4 border-b mb-6 pb-2 flex-wrap"
            data-feature="lesson-planner-and-tracker-tabs"
          >
            <div
              className="flex gap-4 items-center flex-wrap w-full sm:w-auto"
              data-feature="navigation-tabs"
            >
              <div className="bg-light-lbg border border-light-border p-0.5 sm:p-1 rounded-2xl flex items-center justify-between gap-0.5 sm:gap-1 shrink-0 overflow-x-auto scrollbar-hide w-full sm:w-auto">
                {currentTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all whitespace-nowrap flex-1 sm:flex-initial cursor-pointer ${
                      activeTab === tab.key
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-dark-soft hover:text-dark-primary hover:bg-white/50'
                    }`}
                  >
                    <i className={`fas ${tab.icon} text-[10px] sm:text-xs`}></i>
                    <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {role !== 'parent' && activeTab === 'teacher-activity' && (
                <span className="hidden sm:inline-block text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full select-none">
                  Showing {filteredDailyEntries.length} of {dailyEntries.length} entries
                </span>
              )}
              {role === 'parent' && activeTab === 'two-weeks-class' && (
                <span className="hidden sm:inline-block text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full select-none">
                  Showing {filteredDailyEntries.length} entries
                </span>
              )}
            </div>

            {/* Inline Daily Activity Filters */}
            {(activeTab === 'teacher-activity' || activeTab === 'two-weeks-class') && (
              <div
                className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 mt-2"
                data-feature-filter="teacher-activity"
              >
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 w-full flex-1 min-w-0">
                  {role !== 'parent' && (
                    <MultiSelectDropdown
                      label=""
                      placeholder="Class"
                      options={classes.map((c) => ({
                        id: String(c.id),
                        label: c.name || c.class_name,
                      }))}
                      selected={filterClasses}
                      onChange={setFilterClasses}
                    />
                  )}
                  <MultiSelectDropdown
                    label=""
                    placeholder="Subject"
                    options={subjects.map((s) => ({ id: String(s.id), label: s.name }))}
                    selected={filterSubjects}
                    onChange={setFilterSubjects}
                  />
                  <MultiSelectDropdown
                    label=""
                    placeholder="Book"
                    options={books.map((b) => ({ id: String(b.id), label: b.name }))}
                    selected={filterBooks}
                    onChange={setFilterBooks}
                  />
                  {role !== 'parent' && role !== 'teacher' && (
                    <MultiSelectDropdown
                      label=""
                      placeholder="Teacher"
                      options={teachers.map((t) => {
                        const isFemale =
                          t.is_female === true || t.gender === 'female' || t.is_male === false;
                        return {
                          id: String(t.id || t.teacher_id),
                          label: t.name || t.full_name || t.employee_name,
                          is_male: t.is_male,
                          is_female: isFemale,
                          prefix: isFemale ? 'fa-female' : 'fa-male',
                          prefixStyle: { color: isFemale ? '#F472B6' : '#3B82F6' },
                        };
                      })}
                      selected={filterTeachers}
                      onChange={setFilterTeachers}
                      genderFilter={teacherGenderFilter}
                      onGenderChange={setTeacherGenderFilter}
                    />
                  )}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full sm:w-auto border border-gray-250 px-2.5 py-1.5 sm:py-1 rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-brand-primary bg-white h-9 sm:h-8 cursor-pointer text-gray-600"
                  >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="not_started">Not Started</option>
                  </select>

                  {/* Desktop view topic search input */}
                  <input
                    type="text"
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    placeholder="Filter topic..."
                    className="hidden sm:block border border-gray-250 px-3.5 py-1 rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-brand-primary h-8 bg-white min-w-[120px]"
                  />

                  {/* Mobile view topic search trigger button */}
                  <button
                    type="button"
                    onClick={() => setIsMobileTopicSearchOpen((prev) => !prev)}
                    title="Filter topic"
                    aria-label="Search topic"
                    className={`sm:hidden col-span-1 h-9 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between active:scale-95 ${
                      isMobileTopicSearchOpen || filterTopic
                        ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                        : 'bg-white text-gray-700 border-gray-250 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate min-w-0">
                      <i className="fas fa-search text-xs"></i>
                      <span className="truncate">
                        {filterTopic ? `Topic: ${filterTopic}` : 'Topic Search'}
                      </span>
                    </span>
                    {filterTopic && (
                      <i
                        className="fas fa-times text-xs ml-1 hover:text-red-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterTopic('');
                          setIsMobileTopicSearchOpen(false);
                        }}
                      ></i>
                    )}
                  </button>

                  {/* Time Sort Filter integrated inside the grid on mobile, floats to sm:ml-auto on desktop */}
                  {activeTab === 'teacher-activity' && (
                    <FeatureSortDropdown
                      featureName="teacher-activity"
                      value={timeFilter}
                      onChange={setTimeFilter}
                      className="col-span-1 sm:ml-auto"
                      options={[
                        {
                          key: '7_days',
                          label: '7 Days',
                          desc: 'Last 7 days of activity',
                          icon: 'fa-calendar-week',
                        },
                        {
                          key: '30_days',
                          label: '30 Days',
                          desc: 'Last 30 days of activity',
                          icon: 'fa-calendar-alt',
                        },
                        {
                          key: 'range',
                          label: 'Custom Range',
                          desc: 'Specify custom start and end date',
                          icon: 'fa-calendar-days',
                        },
                      ]}
                    />
                  )}

                  {(filterClasses.length > (role === 'parent' ? 1 : 0) ||
                    filterSubjects.length > 0 ||
                    filterBooks.length > 0 ||
                    filterTeachers.length > 0 ||
                    filterTopic ||
                    filterStatus) && (
                    <button
                      onClick={() => {
                        clearDailyFilters();
                        setIsMobileTopicSearchOpen(false);
                      }}
                      className="col-span-2 sm:col-span-1 w-full sm:w-auto text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 sm:py-1 rounded-xl border border-red-100 transition-colors h-9 sm:h-8 flex items-center justify-center cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Custom range date inputs if active */}
                {activeTab === 'teacher-activity' && timeFilter === 'range' && (
                  <div className="flex items-center gap-1.5 w-full sm:w-auto mt-1 md:mt-0">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="border border-gray-250 rounded-xl px-2 py-1 text-xs font-bold text-gray-700 bg-white h-9 sm:h-8 outline-none focus:ring-1 focus:ring-brand-primary flex-1 sm:flex-initial"
                    />
                    <span className="text-gray-400 font-bold text-xs">-</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="border border-gray-250 rounded-xl px-2 py-1 text-xs font-bold text-gray-700 bg-white h-9 sm:h-8 outline-none focus:ring-1 focus:ring-brand-primary flex-1 sm:flex-initial"
                    />
                  </div>
                )}

                {/* Mobile view expandable topic search input */}
                {(isMobileTopicSearchOpen || filterTopic) && (
                  <div className="w-full sm:hidden relative mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <input
                      type="text"
                      value={filterTopic}
                      onChange={(e) => setFilterTopic(e.target.value)}
                      placeholder="Filter topic..."
                      autoFocus
                      className="w-full border pl-8 pr-8 py-1.5 rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-brand-primary h-9 bg-white"
                    />
                    <i className="fas fa-search text-gray-400 text-xs absolute left-2.5 top-3 pointer-events-none"></i>
                    {filterTopic && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterTopic('');
                          setIsMobileTopicSearchOpen(false);
                        }}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      >
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'lesson-planner' && role === 'teacher' && (
              <div
                className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 mt-2"
                data-feature-filter="lesson-planner"
              >
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 w-full flex-1 min-w-0">
                  <select
                    value={lpFilterClassId}
                    onChange={(e) => {
                      setLpFilterClassId(e.target.value);
                      setLpFilterClassificationId('');
                      setLpFilterSubjectId('');
                      setLpFilterBookId('');
                    }}
                    className="w-full sm:w-auto border border-gray-250 px-2.5 py-1.5 sm:py-1 rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-brand-primary bg-white h-9 sm:h-8 cursor-pointer text-gray-600"
                  >
                    <option value="">Class</option>
                    {lpAvailableClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.class_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={lpFilterClassificationId}
                    onChange={(e) => {
                      setLpFilterClassificationId(e.target.value);
                      setLpFilterSubjectId('');
                      setLpFilterBookId('');
                    }}
                    disabled={!lpFilterClassId || lpAvailableClassifications.length === 0}
                    className="w-full sm:w-auto border border-gray-250 px-2.5 py-1.5 sm:py-1 rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-brand-primary bg-white h-9 sm:h-8 cursor-pointer text-gray-600 disabled:opacity-50"
                  >
                    <option value="">Classification</option>
                    {lpAvailableClassifications.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={lpFilterSubjectId}
                    onChange={(e) => {
                      setLpFilterSubjectId(e.target.value);
                      setLpFilterBookId('');
                    }}
                    disabled={!lpFilterClassId}
                    className="w-full sm:w-auto border border-gray-250 px-2.5 py-1.5 sm:py-1 rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-brand-primary bg-white h-9 sm:h-8 cursor-pointer text-gray-600 disabled:opacity-50"
                  >
                    <option value="">Subject</option>
                    {lpVisibleSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={lpFilterBookId}
                    onChange={(e) => setLpFilterBookId(e.target.value)}
                    disabled={!lpFilterSubjectId}
                    className="w-full sm:w-auto border border-gray-250 px-2.5 py-1.5 sm:py-1 rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-brand-primary bg-white h-9 sm:h-8 cursor-pointer text-gray-600 disabled:opacity-50"
                  >
                    <option value="">Book</option>
                    {lpAvailableBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setLpShowAllClasses((prev) => !prev)}
                    title={lpShowAllClasses ? 'Show All Classes' : 'Show My Classes Only'}
                    aria-label="Show All Classes"
                    className={`h-9 sm:h-8 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer items-center justify-center gap-1.5 select-none w-full sm:w-auto active:scale-95 flex ${
                      lpShowAllClasses
                        ? 'bg-white text-gray-600 border-gray-250 hover:bg-gray-50'
                        : 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300/40'
                    }`}
                  >
                    <i
                      className={`fas fa-user-check text-xs ${
                        lpShowAllClasses ? 'text-gray-600' : 'text-white'
                      }`}
                    ></i>
                    <span>Mine Only</span>
                  </button>

                  {(lpFilterClassId ||
                    lpFilterClassificationId ||
                    lpFilterSubjectId ||
                    lpFilterBookId) && (
                    <button
                      onClick={() => {
                        setLpFilterClassId('');
                        setLpFilterClassificationId('');
                        setLpFilterSubjectId('');
                        setLpFilterBookId('');
                      }}
                      className="w-full sm:w-auto border border-gray-250 px-2.5 py-1.5 sm:py-1 rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-brand-primary bg-white h-9 sm:h-8 cursor-pointer text-red-600 disabled:opacity-50"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Inline Syllabus Progress Filters */}
            {activeTab === 'syllabus-progress' && role !== 'parent' && (
              <div
                className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 mt-2"
                data-feature-filter="syllabus-progress"
              >
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 w-full flex-1 min-w-0">
                  <MultiSelectDropdown
                    label=""
                    placeholder="Class"
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
                    placeholder="Classification"
                    options={getFilteredClassificationOpts()}
                    selected={cpFilterClassifications}
                    onChange={handleCpClassificationsChange}
                  />
                  <MultiSelectDropdown
                    label=""
                    placeholder="Subject"
                    options={getFilteredSubjectOpts()}
                    selected={cpFilterSubjects}
                    onChange={handleCpSubjectsChange}
                  />
                  <MultiSelectDropdown
                    label=""
                    placeholder="Book"
                    options={getFilteredBookOpts()}
                    selected={cpFilterBooks}
                    onChange={(val) => {
                      setCpFilterBooks(val);
                      setProgressExpandedBook(null);
                      setProgressExpandedClass(null);
                    }}
                  />
                  {(role === 'admin' || role === 'management') && (
                    <MultiSelectDropdown
                      label=""
                      placeholder="Teacher"
                      options={teachers.map((t) => {
                        const isFemale =
                          t.is_female === true || t.gender === 'female' || t.is_male === false;
                        return {
                          id: String(t.id || t.teacher_id),
                          label: t.name || t.full_name || t.employee_name,
                          is_male: t.is_male,
                          is_female: isFemale,
                          prefix: isFemale ? 'fa-female' : 'fa-male',
                          prefixStyle: { color: isFemale ? '#F472B6' : '#3B82F6' },
                        };
                      })}
                      selected={cpFilterTeachers}
                      onChange={(val) => {
                        setCpFilterTeachers(val);
                        setProgressExpandedBook(null);
                        setProgressExpandedClass(null);
                      }}
                      genderFilter={teacherGenderFilter}
                      onGenderChange={setTeacherGenderFilter}
                    />
                  )}
                  {role === 'teacher' && (
                    <button
                      type="button"
                      onClick={() => setCpTeacherShowMineOnly((prev) => !prev)}
                      title={
                        cpTeacherShowMineOnly
                          ? 'Show Mine Only: Active (Showing my subjects)'
                          : 'Show Mine Only: Inactive (Showing all subjects)'
                      }
                      aria-label="Show Mine Only"
                      className={`h-9 sm:h-8 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer items-center justify-center gap-1.5 select-none w-full sm:w-auto active:scale-95 flex ${
                        cpTeacherShowMineOnly
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300/40'
                          : 'bg-white text-gray-600 border-gray-250 hover:bg-gray-50'
                      }`}
                    >
                      <i
                        className={`fas fa-user-check text-xs ${
                          cpTeacherShowMineOnly ? 'text-white' : 'text-gray-400'
                        }`}
                      ></i>
                      <span>Mine Only</span>
                    </button>
                  )}

                  {/* Grouping Sort Filter integrated directly inside filter grid */}
                  <FeatureSortDropdown
                    featureName="syllabus-progress"
                    value={cpGroupingMode}
                    onChange={setCpGroupingMode}
                    className="col-span-1 sm:ml-auto"
                    options={[
                      {
                        key: 'none',
                        label: 'No Group',
                        desc: 'Standard tabular layout',
                        icon: 'fa-bars',
                      },
                      {
                        key: 'classification',
                        label: 'Classification',
                        desc: 'Group cards by classification',
                        icon: 'fa-tags',
                      },
                      {
                        key: 'subject',
                        label: 'Subject',
                        desc: 'Group cards by subject',
                        icon: 'fa-book',
                      },
                    ]}
                  />

                  {(cpFilterClasses.length > 0 ||
                    cpFilterBooks.length > 0 ||
                    cpFilterClassifications.length > 0 ||
                    cpFilterSubjects.length > 0 ||
                    cpFilterTeachers.length > 0) && (
                    <button
                      onClick={() => {
                        setCpFilterClasses([]);
                        setCpFilterBooks([]);
                        setCpFilterClassifications([]);
                        setCpFilterSubjects([]);
                        setCpFilterTeachers([]);
                        setProgressExpandedBook(null);
                        setProgressExpandedClass(null);
                      }}
                      className="col-span-2 sm:col-span-1 w-full sm:w-auto text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 sm:py-1 rounded-xl border border-red-100 transition-colors h-9 sm:h-8 flex items-center justify-center cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Inline Upcoming Lessons Filters */}
            {activeTab === 'upcoming-lessons' && (
              <div
                className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 mt-2"
                data-feature-filter="upcoming-lessons"
              >
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 w-full flex-1 min-w-0">
                  {role === 'parent' ? null : (
                    <>
                      {role !== 'teacher' && (
                        <MultiSelectDropdown
                          label=""
                          placeholder="Teacher"
                          options={teachers.map((t) => {
                            const isFemale =
                              t.is_female === true || t.gender === 'female' || t.is_male === false;
                            return {
                              id: String(t.id || t.teacher_id),
                              label: t.name || t.full_name || t.employee_name,
                              is_male: t.is_male,
                              is_female: isFemale,
                              prefix: isFemale ? 'fa-female' : 'fa-male',
                              prefixStyle: { color: isFemale ? '#F472B6' : '#3B82F6' },
                            };
                          })}
                          selected={upFilterTeachers}
                          onChange={setUpFilterTeachers}
                          genderFilter={teacherGenderFilter}
                          onGenderChange={setTeacherGenderFilter}
                        />
                      )}
                      <MultiSelectDropdown
                        label=""
                        placeholder="Class"
                        options={
                          role === 'teacher'
                            ? classes
                                .filter((c) =>
                                  assignments.some((a) => String(a.class_id) === String(c.id))
                                )
                                .map((c) => ({ id: String(c.id), label: c.name || c.class_name }))
                            : classes.map((c) => ({
                                id: String(c.id),
                                label: c.name || c.class_name,
                              }))
                        }
                        selected={upFilterClasses}
                        onChange={setUpFilterClasses}
                      />
                      <MultiSelectDropdown
                        label=""
                        placeholder="Classification"
                        options={classifications.map((cl) => ({
                          id: String(cl.id),
                          label: cl.name,
                        }))}
                        selected={upFilterClassifications}
                        onChange={handleUpClassificationsChange}
                      />
                      <MultiSelectDropdown
                        label=""
                        placeholder="Subject"
                        options={getFilteredUpSubjectOpts()}
                        selected={upFilterSubjects}
                        onChange={handleUpSubjectsChange}
                      />
                      <MultiSelectDropdown
                        label=""
                        placeholder="Book"
                        options={getFilteredUpBookOpts()}
                        selected={upFilterBooks}
                        onChange={setUpFilterBooks}
                      />
                    </>
                  )}

                  {/* Date Range Popover Button */}
                  <UpcomingDateRangePicker
                    startDate={upcomingStartDate}
                    endDate={upcomingEndDate}
                    onStartDateChange={setUpcomingStartDate}
                    onEndDateChange={setUpcomingEndDate}
                    onReset={() => {
                      setUpcomingStartDate(getLocalDateStr(0));
                      setUpcomingEndDate(getDefaultEndDateStr());
                    }}
                  />

                  {/* Grouping Sort Filter integrated directly inside filter grid */}
                  <FeatureSortDropdown
                    featureName="upcoming-lessons"
                    value={upcomingGroupingMode}
                    onChange={setUpcomingGroupingMode}
                    className="col-span-1 sm:ml-auto"
                    options={[
                      {
                        key: 'teacher',
                        label: 'Teacher',
                        desc: 'Group upcoming lessons by teacher',
                        icon: 'fa-user-tie',
                      },
                      {
                        key: 'class',
                        label: 'Class',
                        desc: 'Group upcoming lessons by class',
                        icon: 'fa-graduation-cap',
                      },
                      {
                        key: 'date',
                        label: 'Date',
                        desc: 'Group upcoming lessons by date',
                        icon: 'fa-calendar-day',
                      },
                    ]}
                  />

                  {(() => {
                    const hasActiveFilters =
                      (role !== 'parent' && role !== 'teacher' && upFilterTeachers.length > 0) ||
                      upFilterClasses.length > 0 ||
                      upFilterClassifications.length > 0 ||
                      upFilterSubjects.length > 0 ||
                      upFilterBooks.length > 0 ||
                      upcomingStartDate !== getLocalDateStr(0) ||
                      upcomingEndDate !== getDefaultEndDateStr();

                    if (!hasActiveFilters) return null;

                    return (
                      <button
                        onClick={() => {
                          if (role !== 'teacher') setUpFilterTeachers([]);
                          setUpFilterClasses([]);
                          setUpFilterClassifications([]);
                          setUpFilterSubjects([]);
                          setUpFilterBooks([]);
                          setUpcomingStartDate(getLocalDateStr(0));
                          setUpcomingEndDate(getDefaultEndDateStr());
                        }}
                        className="col-span-2 sm:col-span-1 w-full sm:w-auto text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 sm:py-1 rounded-xl border border-red-100 transition-colors h-9 sm:h-8 flex items-center justify-center cursor-pointer"
                      >
                        Reset
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Contents */}
        {!dashboardOnly && activeTab === 'lesson-planner' && role === 'teacher' && (
          <div data-feature="lesson-planner">
            <LessonManager
              user={user}
              teacherRecord={teacherRecord}
              role="teacher"
              hideFilterHeader={true}
              externalFilters={{
                classId: lpFilterClassId,
                classificationId: lpFilterClassificationId,
                subjectId: lpFilterSubjectId,
                bookId: lpFilterBookId,
                showAllClasses: lpShowAllClasses,
              }}
              onExternalFiltersChange={(next) => {
                setLpFilterClassId(next.classId || '');
                setLpFilterClassificationId(next.classificationId || '');
                setLpFilterSubjectId(next.subjectId || '');
                setLpFilterBookId(next.bookId || '');
                setLpShowAllClasses(Boolean(next.showAllClasses));
              }}
            />
          </div>
        )}

        {!dashboardOnly && activeTab === 'teacher-activity' && role === 'teacher' && (
          <div data-feature="teacher-activity">
            <DailyActivityTable
              role="teacher"
              activeTab={activeTab}
              dailyEntries={dailyEntries}
              dailyLoading={dailyLoading}
              classes={classes}
              subjects={subjects}
              books={books}
              filteredDailyEntries={filteredDailyEntries}
              handleDeleteClick={role === 'management' ? handleDeleteClick : undefined}
              isCreatedToday={isCreatedToday}
            />
          </div>
        )}

        {!dashboardOnly &&
          ((activeTab === 'teacher-activity' && role !== 'teacher') ||
            activeTab === 'two-weeks-class') && (
            <div data-feature={activeTab}>
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
                handleDeleteClick={role === 'management' ? handleDeleteClick : undefined}
                isCreatedToday={role === 'teacher' ? isCreatedToday : undefined}
              />
            </div>
          )}

        {!dashboardOnly && activeTab === 'upcoming-lessons' && (
          <div data-feature="upcoming-lessons">
            <UpcomingLessonsGrid
              role={role}
              student={student}
              teacher={teacher}
              upcomingGroupingMode={upcomingGroupingMode}
              upcomingStartDate={upcomingStartDate}
              upcomingEndDate={upcomingEndDate}
              upFilterTeachers={upFilterTeachers}
              upFilterClasses={upFilterClasses}
              upFilterClassifications={upFilterClassifications}
              upFilterSubjects={upFilterSubjects}
              upFilterBooks={upFilterBooks}
              lessonPlans={lessonPlans}
              classifications={classifications}
              teachers={teachers}
              assignments={assignments}
              subjects={subjects}
              handleSubmitPlannedLesson={handleSubmitPlannedLesson}
              handleCarryForward={handleCarryForward}
            />
          </div>
        )}

        {!dashboardOnly && activeTab === 'teacher-adherence' && (
          <div data-feature="teacher-adherence">
            <SyllabusTeacherAdherence
              teachers={teachers}
              lessonPlans={lessonPlans}
              assignments={assignments}
              books={books}
              subjects={subjects}
            />
          </div>
        )}

        {dashboardOnly && (
          <div data-feature="overview">
            <SyllabusOverviewDashboard
              role={role}
              classes={classes}
              subjects={subjects}
              books={books}
              classifications={classifications}
              bookClasses={bookClasses}
              setBookClasses={setBookClasses}
              assignments={assignments}
              teachers={teachers}
              bookTrackers={bookTrackers}
              setBookTrackers={setBookTrackers}
              allLogs={allLogs}
              allLessons={allLessons}
              lessonPlans={lessonPlans}
              carryForwards={carryForwards}
              onOpenClassProgress={(payload) => {
                const classId = payload?.classId;
                const subjectId = payload?.subjectId;
                const subject = subjects.find((item) => String(item.id) === String(subjectId));

                setCpFilterClasses(classId ? [String(classId)] : []);
                setCpFilterClassifications(
                  subject?.classification_id ? [String(subject.classification_id)] : []
                );
                setCpFilterSubjects(subjectId ? [String(subjectId)] : []);
                setCpFilterBooks([]);
                setProgressExpandedBook(null);
                setProgressExpandedClass(null);
                setExpandedLogIds({});
                setLogItemsMap({});
                setActiveTab('syllabus-progress');
              }}
            />
          </div>
        )}

        {!dashboardOnly && activeTab === 'syllabus-progress' && (
          <div data-feature="syllabus-progress">
            <SyllabusProgressGrid
              role={role}
              student={student}
              classesToRender={getClassesToRender()}
              books={books}
              bookClasses={bookClasses}
              subjects={subjects}
              classifications={classifications}
              teachers={teachers}
              assignments={assignments}
              currentTeacherId={teacher?.id || teacherRecord?.id}
              cpFilterTeachers={cpFilterTeachers}
              cpTeacherShowMineOnly={cpTeacherShowMineOnly}
              allTrackers={bookTrackers}
              allLogs={allLogs}
              allLessons={allLessons}
              cpGroupingMode={cpGroupingMode}
              cpFilterBooks={cpFilterBooks}
              cpFilterSubjects={cpFilterSubjects}
              cpFilterClassifications={cpFilterClassifications}
              progressExpandedBook={progressExpandedBook}
              progressExpandedClass={progressExpandedClass}
              handleProgressBookClick={handleProgressBookClick}
              progressLoading={progressLoading || detailsLoading}
              progressBookLessons={progressBookLessons}
              progressBookLogs={progressBookLogs}
              showNotStarted={showNotStarted}
              setShowNotStarted={setShowNotStarted}
              expandedLogIds={expandedLogIds}
              toggleLogExpand={toggleLogExpand}
              logItemsMap={logItemsMap}
              handleDeleteClick={role === 'management' ? handleDeleteClick : undefined}
            />
          </div>
        )}
      </div>

      {isAddWorkModalOpen &&
        (plannedLessonToLog ? (
          <AddWorkModalCompactView
            onClose={() => {
              setIsAddWorkModalOpen(false);
              setPlannedLessonToLog(null);
            }}
            classes={classes}
            subjects={subjects}
            books={books}
            bookClasses={bookClasses}
            allLessons={allLessons}
            progressRecords={allLogs}
            setProgressRecords={setAllLogs}
            initialClassId={plannedLessonToLog?.class_id}
            initialSubjectId={plannedLessonToLog?.subject_id}
            initialBookId={plannedLessonToLog?.book_id}
            teacherId={teacher?.id}
            initialRecord={plannedLessonToLog}
            onSuccess={handleAddWorkSuccess}
          />
        ) : (
          <AddWorkModalCompleteView
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
            allTeachers={teachers}
            favorites={favorites}
            setFavorites={(newFavs) => {
              setFavorites(newFavs);
              if (teacher?.id) saveFavoritesToDB(teacher.id, newFavs);
            }}
            assignments={assignments}
            initialPlan={null}
          />
        ))}

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

      <AddWorkExceptionsModal
        isOpen={isExceptionsModalOpen}
        onClose={() => setIsExceptionsModalOpen(false)}
        user={user}
        fullName={user?.fullName || user?.user_metadata?.full_name}
      />
    </div>
  );
};

export default SyllabusTrackerPortal;
