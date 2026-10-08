import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { getAdminConfig, saveAdminConfig } from '../../utils/adminConfigUtils';
import MultiSelectDropdown from '../MultiSelectDropdown';
import AttendanceHorizontalStackBar from './AttendanceHorizontalStackBar';
import RankHolders from './RankHolders';
import ConfirmModal from '../ConfirmModal';
import { useCanAccess } from '../portal-shared/ConditionalBlock';
import { isScheduleReportPublished, broadcastSchedulePublishedChange } from '../../utils/examScheduleUtils';
import { ExtraComponentLayers } from './report-card-generator/components/ExtraComponentLayers';
import GradingScaleLegend from './report-card-generator/components/GradingScaleLegend';
import {
  DEFAULT_TEMPLATE,
  DEFAULT_GRADING_SCALE,
  DEFAULT_CHART_COLUMN,
  DEFAULT_MOCK_CLASSIFICATIONS,
  CLASSIFICATION_SEQ_FALLBACK,
  CLASSIFICATION_NAME_SEQ_FALLBACK,
  KNOWN_SUBJECT_CLASSIFICATIONS,
  DEFAULT_BLOCK_STYLE,
  DEFAULT_TABLE_COLUMN_HEADERS,
  DEFAULT_BLOCK_TITLES,
  renderBlockTitle,
  calculateGrade,
  getActiveTableColumns,
  getLabelPlacement,
  getLegendProps,
  getBlockBackgroundStyle,
  getBlockBleedStyles,
  BLOCK_DEFAULT_BG,
  hexToRgba,
  formatDataLabel,
  shouldPrintBlockOnPage,
} from './report-card-designer';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Legend,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  mergeById,
  applyAttendance,
  buildStudentMetricsMap,
  buildChartData,
  buildGroupedSections,
  getPrintFontSizes,
} from './report-card-generator/utils';
import {
  renderSchoolHeader,
  renderStudentInfo,
  renderSubjectTable,
  renderSummary,
  renderCharts,
  renderRemarks,
  renderSignatures,
  renderAttendanceBar,
  renderRankHolders,
} from './report-card-generator/preview';
import { ExamRemarksModal, ExamAttendanceUploadModal } from './report-card-generator/modals';

const TEMPLATES_CONFIG_KEY = 'exam_progress_report_templates';

/**
 * Progress Report Generator & Card Renderer
 * Generates official report cards by examination for the entire class or selected students.
 * Supports:
 * - Dynamic calculations (Total, %, Class Rank, Pass/Fail, GPA)
 * - Custom subject grouping (e.g. Physics, Chem, Bio under "Science")
 * - Embedded charts/graphs per student
 * - High quality A4 multi-student print & PDF export
 */
const ReportCardGenerator = ({
  schedules = [],
  classes = [],
  subjects = [],
  students: propStudents = null,
  initialScheduleId = null,
  initialClassId = null,
  selectedClassIds: propSelectedClassIds = null,
  reportMode = 'progress',
  userRoles = [],
  studentRanksMap = null,
  propAttendanceMap = null,
  onReportDataLoaded = null,
  studentSelectionMode: controlledStudentSelectionMode,
  onStudentSelectionModeChange,
  selectedStudentIds: controlledSelectedStudentIds,
  onSelectedStudentIdsChange,
  selectedTemplateId: controlledSelectedTemplateId,
  onSelectedTemplateIdChange,
  onTemplatesLoaded,
  paperSize: propPaperSize = 'a4',
  orientation: propOrientation = 'portrait',
  hideControlBar = false,
  isAttendanceModalOpen: propIsAttendanceModalOpen,
  onAttendanceModalOpenChange,
  isRemarksModalOpen: propIsRemarksModalOpen,
  onRemarksModalOpenChange,
  onAttendanceCountChange,
  onRemarksCountChange,
  onSchedulePublishedChange = null,
}) => {
  // Access control — driven by app_view_controller, no hardcoded role checks
  const canAccess = useCanAccess(userRoles);
  const canUploadAttendance = canAccess('exam-attendance-upload');
  const canPublishReport =
    canAccess('exam-progress-report-publish') ||
    canAccess('exam-sched-publish') ||
    userRoles.some((r) =>
      ['admin', 'management', 'coordinator', 'principal'].includes(String(r).toLowerCase().trim())
    );

  const [internalPaperSize, setInternalPaperSize] = useState('a4');
  const [internalOrientation, setInternalOrientation] = useState('portrait');
  const paperSize = propPaperSize || internalPaperSize;
  const orientation = propOrientation || internalOrientation;

  const [internalSchedules, setInternalSchedules] = useState(schedules);
  const [internalClasses, setInternalClasses] = useState(classes);
  const [internalSubjects, setInternalSubjects] = useState(subjects);
  const [internalClassifications, setInternalClassifications] = useState(
    DEFAULT_MOCK_CLASSIFICATIONS
  );

  // Listen for schedule published changes dispatched locally or via BroadcastChannel
  useEffect(() => {
    const handlePublishedChange = (e) => {
      const { scheduleId, is_report_published } = e.detail || {};
      if (scheduleId) {
        setInternalSchedules((prev) =>
          prev.map((s) =>
            String(s.id) === String(scheduleId)
              ? { ...s, is_report_published: Boolean(is_report_published) }
              : s
          )
        );
      }
    };
    window.addEventListener('exam-schedule-published-changed', handlePublishedChange);
    return () => window.removeEventListener('exam-schedule-published-changed', handlePublishedChange);
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    let bc = null;
    try {
      bc = new BroadcastChannel('exam_schedules_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'SCHEDULE_PUBLISHED_CHANGED') {
          const { scheduleId, is_report_published } = event.data;
          if (scheduleId) {
            setInternalSchedules((prev) =>
              prev.map((s) =>
                String(s.id) === String(scheduleId)
                  ? { ...s, is_report_published: Boolean(is_report_published) }
                  : s
              )
            );
          }
        }
      };
    } catch (e) {}
    return () => {
      if (bc) bc.close();
    };
  }, []);

  const [selectedScheduleId, setSelectedScheduleId] = useState(
    initialScheduleId ? String(initialScheduleId) : schedules[0]?.id ? String(schedules[0].id) : ''
  );
  const [selectedClassId, setSelectedClassId] = useState(
    initialClassId ? String(initialClassId) : classes[0]?.id ? String(classes[0].id) : ''
  );
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [publishingReport, setPublishingReport] = useState(false);

  useEffect(() => {
    if (initialScheduleId !== undefined && initialScheduleId !== null) {
      setSelectedScheduleId(String(initialScheduleId));
    }
  }, [initialScheduleId]);

  useEffect(() => {
    if (initialClassId !== undefined && initialClassId !== null) {
      setSelectedClassId(String(initialClassId));
    }
  }, [initialClassId]);

  // Sync props to internal state
  useEffect(() => {
    if (schedules.length > 0) {
      setInternalSchedules(schedules);
      if (!selectedScheduleId && initialScheduleId === null) {
        setSelectedScheduleId(String(schedules[0].id));
      }
    }
  }, [schedules, initialScheduleId, selectedScheduleId]);

  useEffect(() => {
    if (classes.length > 0) {
      setInternalClasses(classes);
      if (!selectedClassId && initialClassId === null) {
        setSelectedClassId(String(classes[0].id));
      }
    }
  }, [classes, initialClassId, selectedClassId]);

  // Load syl_classifications ordered by seq hierarchy
  useEffect(() => {
    let cancelled = false;
    const fetchClassifications = async () => {
      try {
        const { data, error } = await supabase
          .from('syl_classifications')
          .select('*')
          .order('seq', { ascending: true })
          .order('name', { ascending: true });
        if (!cancelled && data && data.length > 0) {
          setInternalClassifications(data);
        }
      } catch (err) {
        console.warn('[ReportCardGenerator] Failed to load syl_classifications:', err);
      }
    };
    fetchClassifications();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (subjects.length > 0) {
      setInternalSubjects(subjects);
      // Ensure subjects have classification_id
      if (subjects.some((s) => s.classification_id === undefined)) {
        supabase
          .from('syl_subjects')
          .select('id, name, arabic_name, classification_id')
          .then(({ data }) => {
            if (data && data.length > 0) {
              setInternalSubjects((prev) => mergeById(prev, data));
            }
          })
          .catch(() => {});
      }
    } else {
      supabase
        .from('syl_subjects')
        .select('*')
        .then(({ data }) => {
          if (data && data.length > 0) {
            setInternalSubjects((prev) => mergeById(prev, data));
          }
        })
        .catch(() => {});
    }
  }, [subjects]);

  // If the schedule list wasn't supplied, fetch only the lightweight schedule list.
  // Classes / subjects / classifications now arrive with the single report-data RPC below.
  useEffect(() => {
    if (schedules.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: sData } = await supabase
          .from('exam_schedules')
          .select('id, name, start_date, end_date, status, is_report_published')
          .order('start_date', { ascending: false });
        if (!cancelled && sData && sData.length > 0) {
          setInternalSchedules(sData);
          setSelectedScheduleId((prev) => prev || String(sData[0].id));
        }
      } catch (err) {
        console.error('Failed to load schedules in ReportCardGenerator:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schedules.length]);

  // Student selection: 'all' vs specific students
  const [internalStudentSelectionMode, setInternalStudentSelectionMode] = useState('all');
  const studentSelectionMode =
    controlledStudentSelectionMode !== undefined
      ? controlledStudentSelectionMode
      : internalStudentSelectionMode;
  const setStudentSelectionMode = onStudentSelectionModeChange || setInternalStudentSelectionMode;

  const [internalSelectedStudentIds, setInternalSelectedStudentIds] = useState([]);
  const selectedStudentIds =
    controlledSelectedStudentIds !== undefined
      ? controlledSelectedStudentIds
      : internalSelectedStudentIds;
  const setSelectedStudentIds = onSelectedStudentIdsChange || setInternalSelectedStudentIds;

  // Templates
  const [templates, setTemplates] = useState([DEFAULT_TEMPLATE]);
  const [internalSelectedTemplateId, setInternalSelectedTemplateId] = useState(DEFAULT_TEMPLATE.id);
  const selectedTemplateId =
    controlledSelectedTemplateId !== undefined
      ? controlledSelectedTemplateId
      : internalSelectedTemplateId;
  const setSelectedTemplateId = onSelectedTemplateIdChange || setInternalSelectedTemplateId;

  // Data
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [entries, setEntries] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [serverRanksMap, setServerRanksMap] = useState({});
  const [internalAttendanceModalOpen, setInternalAttendanceModalOpen] = useState(false);
  const isAttendanceModalOpen =
    propIsAttendanceModalOpen !== undefined
      ? propIsAttendanceModalOpen
      : internalAttendanceModalOpen;
  const setIsAttendanceModalOpen = (val) => {
    setInternalAttendanceModalOpen(val);
    onAttendanceModalOpenChange?.(val);
  };
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onAttendanceCountChange?.(Object.keys(attendanceMap).length);
  }, [attendanceMap, onAttendanceCountChange]);

  // ── Single-call report data ─────────────────────────────────────────────────
  // One RPC (get_progress_report_data) returns students, results, entries, attendance,
  // remarks, class ranks and the subject/classification/class masters for this report.
  // Replaces ~12 separate REST calls and the sequential results -> entries waterfall.
  const [reportPayload, setReportPayload] = useState(null);
  const [serverRemarks, setServerRemarks] = useState([]);
  const reportFetchSeq = useRef(0);
  const propStudentsRef = useRef(propStudents);
  propStudentsRef.current = propStudents;
  const internalClassesRef = useRef(internalClasses);
  internalClassesRef.current = internalClasses;
  const classesRef = useRef(classes);
  classesRef.current = classes;
  const isParentView = userRoles.includes('parent');
  const parentStudentIdsKey =
    isParentView && Array.isArray(selectedStudentIds) ? selectedStudentIds.map(String).join(',') : '';

  const propSelectedClassIdsKey = useMemo(() => {
    return Array.isArray(propSelectedClassIds)
      ? propSelectedClassIds.map(String).sort().join(',')
      : '';
  }, [propSelectedClassIds]);

  const loadReportData = useCallback(async () => {
    if (reportMode === 'excellence') {
      setLoading(false);
      return;
    }

    if (!selectedScheduleId) {
      setStudents([]);
      setResults([]);
      setEntries([]);
      setReportPayload(null);
      return;
    }

    // ── Rank Holder Report mode: load data for selected classes (or all classes) concurrently ──
    if (reportMode === 'rank_holder') {
      const isExplicit = Array.isArray(propSelectedClassIds) && propSelectedClassIds.length > 0;
      const currentClasses =
        internalClassesRef.current && internalClassesRef.current.length > 0
          ? internalClassesRef.current
          : classesRef.current || [];
      const targetClassIds = isExplicit
        ? propSelectedClassIds.map(String)
        : currentClasses.map((c) => String(c.id));

      if (targetClassIds.length === 0) {
        setStudents([]);
        setResults([]);
        setEntries([]);
        setReportPayload(null);
        return;
      }

      const seq = ++reportFetchSeq.current;
      setLoading(true);
      try {
        const batchResults = await Promise.allSettled(
          targetClassIds.map((cId) =>
            supabase.rpc('get_progress_report_data', {
              p_schedule_id: Number(selectedScheduleId),
              p_class_id: Number(cId),
              p_student_ids: null,
            })
          )
        );

        if (seq !== reportFetchSeq.current) return;

        const allStudents = [];
        const allResults = [];
        const allEntries = [];
        const combinedRanks = {};
        const combinedRemarks = [];
        let combinedSubjects = [];
        let combinedClassifications = [];
        let combinedClasses = [];
        const failedClassIds = [];

        batchResults.forEach((res, idx) => {
          const cId = targetClassIds[idx];
          if (res.status === 'fulfilled' && res.value?.data) {
            const d = res.value.data;
            if (Array.isArray(d.students)) allStudents.push(...d.students);
            if (Array.isArray(d.results)) allResults.push(...d.results);
            if (Array.isArray(d.entries)) allEntries.push(...d.entries);
            if (d.ranks) Object.assign(combinedRanks, d.ranks);
            if (d.remarks) combinedRemarks.push(...d.remarks);
            if (d.subjects?.length) combinedSubjects = mergeById(combinedSubjects, d.subjects);
            if (d.classifications?.length) combinedClassifications = mergeById(combinedClassifications, d.classifications);
            if (d.class) combinedClasses = mergeById(combinedClasses, [d.class]);
          } else {
            failedClassIds.push(cId);
          }
        });

        if (failedClassIds.length > 0) {
          console.warn('[ReportCardGenerator] Failed to load data for classes:', failedClassIds);
        }

        setStudents(allStudents);
        setResults(allResults);
        setEntries(allEntries);
        setServerRanksMap(combinedRanks);
        setServerRemarks(combinedRemarks);
        if (combinedSubjects.length) setInternalSubjects((prev) => mergeById(prev, combinedSubjects));
        if (combinedClassifications.length) setInternalClassifications((prev) => mergeById(prev, combinedClassifications));
        if (combinedClasses.length) setInternalClasses((prev) => mergeById(prev, combinedClasses));
        setReportPayload({ students: allStudents, results: allResults, entries: allEntries, ranks: combinedRanks, remarks: combinedRemarks });
        onReportDataLoaded?.({ students: allStudents, results: allResults, entries: allEntries, ranks: combinedRanks, remarks: combinedRemarks });
      } catch (err) {
        console.error('Error loading rank holder report data:', err);
        showToast('Error loading rank holder report data', 'error');
      } finally {
        if (seq === reportFetchSeq.current) setLoading(false);
      }
      return;
    }

    // ── Standard Progress Report mode ──
    const seq = ++reportFetchSeq.current;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_progress_report_data', {
        p_schedule_id: Number(selectedScheduleId),
        p_class_id: Number(selectedClassId),
        p_student_ids: isParentView
          ? parentStudentIdsKey.split(',').filter(Boolean).map(Number)
          : null,
      });
      if (error) throw error;
      if (seq !== reportFetchSeq.current) return;

      const hasProps =
        Array.isArray(propStudentsRef.current) && propStudentsRef.current.length > 0;
      console.log('[DEBUG ReportCardGenerator loadReportData]', {
        rpcClassifications: data?.classifications,
        rpcSubjects: data?.subjects,
      });
      setReportPayload(data);
      setResults(data?.results || []);
      setEntries(data?.entries || []);
      setServerRanksMap(data?.ranks || {});
      setServerRemarks(data?.remarks || []);
      if (!hasProps) setStudents(data?.students || []);
      if (data?.subjects?.length) setInternalSubjects((prev) => mergeById(prev, data.subjects));
      if (data?.classifications?.length)
        setInternalClassifications((prev) => mergeById(prev, data.classifications));
      if (data?.class) setInternalClasses((prev) => mergeById(prev, [data.class]));
      applyAttendance(data?.attendance, selectedScheduleId, propAttendanceMap);
      onReportDataLoaded?.(data);
    } catch (err) {
      console.warn(
        '[ReportCardGenerator] get_progress_report_data unavailable, using direct queries:',
        err?.message
      );
      try {
        // Legacy fallback
        const hasProps = Array.isArray(propStudentsRef.current) && propStudentsRef.current.length > 0;
        const [stuRes, resRes, attRes, remRes, subRes, clsRes] = await Promise.all([
          hasProps
            ? Promise.resolve(null)
            : supabase
                .from('students')
                .select('*')
                .eq('class_id', selectedClassId)
                .order('student_name'),
          supabase
            .from('exam_results')
            .select('*')
            .eq('schedule_id', selectedScheduleId)
            .eq('class_id', selectedClassId),
          supabase.from('exam_attendance_entries').select('*').eq('schedule_id', selectedScheduleId),
          supabase.from('exam_student_remarks').select('*').eq('schedule_id', selectedScheduleId),
          subjects.length === 0 ? supabase.from('syl_subjects').select('*') : Promise.resolve(null),
          supabase
            .from('syl_classifications')
            .select('*')
            .order('seq', { ascending: true })
            .order('name', { ascending: true }),
        ]);
        const resData = resRes?.data || [];
        let entryData = [];
        if (resData.length > 0) {
          const { data } = await supabase
            .from('exam_result_entries')
            .select('*')
            .in(
              'result_id',
              resData.map((r) => r.id)
            );
          entryData = data || [];
        }
        if (seq !== reportFetchSeq.current) return;
        if (stuRes) setStudents(stuRes.data || []);
        if (subRes?.data) setInternalSubjects(subRes.data);
        if (clsRes?.data?.length) setInternalClassifications(clsRes.data);
        setResults(resData);
        setEntries(entryData);
        setServerRemarks(remRes?.data || []);
        applyAttendance(attRes?.data, selectedScheduleId, propAttendanceMap);
      } catch (e) {
        console.error('Error loading report card data:', e);
        showToast('Error loading report card data', 'error');
      }
    } finally {
      if (seq === reportFetchSeq.current) setLoading(false);
    }
  }, [
    reportMode,
    selectedScheduleId,
    selectedClassId,
    propSelectedClassIdsKey,
    isParentView,
    parentStudentIdsKey,
  ]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Load saved templates strictly via RPC call with localStorage cache fallback
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await getAdminConfig(TEMPLATES_CONFIG_KEY, [DEFAULT_TEMPLATE]);
        if (data && Array.isArray(data) && data.length > 0) {
          setTemplates(data);
          if (!controlledSelectedTemplateId) {
            setSelectedTemplateId(data[0].id);
          }
          if (onTemplatesLoaded) onTemplatesLoaded(data);
        }
      } catch (err) {
        console.warn('[ReportCardGenerator] Remote templates fallback:', err);
      }
    };
    loadTemplates();
  }, []);

  // Active template
  const activeTemplate = useMemo(() => {
    const raw =
      templates.find((t) => t.id === selectedTemplateId) || templates[0] || DEFAULT_TEMPLATE;
    const baseOrder = raw.blockOrder || DEFAULT_TEMPLATE.blockOrder;
    let blockOrder = baseOrder;
    if (Array.isArray(baseOrder) && !baseOrder.includes('rankHolders')) {
      const copy = [...baseOrder];
      const attIdx = copy.indexOf('attendanceBar');
      if (attIdx !== -1) {
        copy.splice(attIdx + 1, 0, 'rankHolders');
      } else {
        copy.push('rankHolders');
      }
      blockOrder = copy;
    }
    return {
      ...DEFAULT_TEMPLATE,
      ...raw,
      blockOrder,
      rankHoldersConfig: {
        ...DEFAULT_TEMPLATE.rankHoldersConfig,
        ...(raw.rankHoldersConfig || {}),
        style: {
          ...DEFAULT_BLOCK_STYLE,
          ...DEFAULT_TEMPLATE.rankHoldersConfig?.style,
          ...(raw.rankHoldersConfig?.style || {}),
        },
      },
    };
  }, [templates, selectedTemplateId]);

  // If propStudents is passed, sync students state directly
  useEffect(() => {
    if (propStudents && Array.isArray(propStudents)) {
      setStudents(propStudents.filter((s) => String(s.class_id) === String(selectedClassId)));
    }
  }, [propStudents, selectedClassId]);

  // Selected schedule object
  const selectedSchedule = useMemo(() => {
    return internalSchedules.find((s) => String(s.id) === String(selectedScheduleId)) || null;
  }, [internalSchedules, selectedScheduleId]);

  const handleTogglePublishReport = useCallback(async () => {
    if (!selectedScheduleId || !selectedSchedule) {
      showToast('Please select an exam schedule first', 'warning');
      return;
    }

    const willPublish = !isScheduleReportPublished(selectedSchedule);

    setConfirmModalData({
      title: willPublish ? 'Publish Progress Report' : 'Unpublish Progress Report',
      message: willPublish
        ? `Publish progress report cards for "${selectedSchedule.name}"? Parents will immediately be able to view their ward's results in the parent portal.`
        : `Unpublish progress report cards for "${selectedSchedule.name}"? Parents will no longer be able to view report cards for this examination.`,
      confirmText: willPublish ? 'Publish to Parents' : 'Unpublish',
      type: willPublish ? 'success' : 'warning',
      onConfirm: async () => {
        setConfirmModalData(null);
        setPublishingReport(true);
        try {
          const { error } = await supabase
            .from('exam_schedules')
            .update({ is_report_published: willPublish })
            .eq('id', selectedSchedule.id);

          if (error) throw error;

          setInternalSchedules((prev) =>
            prev.map((s) =>
              String(s.id) === String(selectedSchedule.id)
                ? { ...s, is_report_published: willPublish }
                : s
            )
          );

          if (typeof onSchedulePublishedChange === 'function') {
            onSchedulePublishedChange(selectedSchedule.id, willPublish);
          }
          broadcastSchedulePublishedChange(selectedSchedule.id, willPublish);

          showToast(
            willPublish
              ? `Progress report for "${selectedSchedule.name}" published! Parents can now view results for their wards.`
              : `Progress report for "${selectedSchedule.name}" unpublished.`,
            'success'
          );
        } catch (err) {
          console.error('Failed to update progress report publication status:', err);
          showToast(err.message || 'Failed to update publication status', 'error');
        } finally {
          setPublishingReport(false);
        }
      },
    });
  }, [selectedScheduleId, selectedSchedule, onSchedulePublishedChange]);

  // Selected class object
  const selectedClass = useMemo(() => {
    return internalClasses.find((c) => String(c.id) === String(selectedClassId)) || null;
  }, [internalClasses, selectedClassId]);

  // Determine which students to render cards for
  const displayedStudents = useMemo(() => {
    // If specific student IDs are provided (e.g. from parent filter)
    if (selectedStudentIds && Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
      const stringIds = new Set(selectedStudentIds.map(String));
      return students.filter((s) => stringIds.has(String(s.id)));
    }
    // If studentSelectionMode is explicitly 'selected' but no students were selected
    if (studentSelectionMode === 'selected') {
      return [];
    }
    // Default: all students in class
    return students;
  }, [students, studentSelectionMode, selectedStudentIds]);

  // Compute calculated metrics & ranks across all students in class
  const studentMetricsMap = useMemo(() => {
    return buildStudentMetricsMap(students, results, internalSubjects, activeTemplate, selectedClassId, serverRanksMap);
  }, [students, results, internalSubjects, activeTemplate, selectedClassId, serverRanksMap]);

  // Class rank holders for rank_holder mode
  const classRankHoldersMap = useMemo(() => {
    if (reportMode !== 'rank_holder') return {};
    const rankMap = {};
    const scale = activeTemplate?.gradingScale || DEFAULT_GRADING_SCALE;

    const classGroups = {};
    students.forEach((student) => {
      const cId = String(student.class_id || selectedClassId);
      if (!classGroups[cId]) classGroups[cId] = [];
      classGroups[cId].push(student);
    });

    Object.entries(classGroups).forEach(([cId, classStudents]) => {
      const classResults = results.filter((r) => String(r.class_id) === cId);
      const classMetrics = buildStudentMetricsMap(classStudents, classResults, internalSubjects, activeTemplate, cId, {});
      const sorted = Object.values(classMetrics).sort((a, b) => b.percentage - a.percentage);
      rankMap[cId] = sorted.map((m, idx) => ({
        ...m,
        rank: idx + 1,
        studentName: classStudents.find((s) => String(s.id) === m.studentId)?.student_name || '',
        photo_id: classStudents.find((s) => String(s.id) === m.studentId)?.photo_id || '',
        class_name: classStudents.find((s) => String(s.id) === m.studentId)?.class_name || '',
      }));
    });

    return rankMap;
  }, [reportMode, students, results, internalSubjects, activeTemplate, selectedClassId]);

  // Rank holder classes to render
  const rankHolderClassesToRender = useMemo(() => {
    if (reportMode !== 'rank_holder') return [];
    const isExplicit = Array.isArray(propSelectedClassIds) && propSelectedClassIds.length > 0;
    const targetIds = isExplicit
      ? propSelectedClassIds.map(String)
      : (internalClasses.length > 0 ? internalClasses : classes).map((c) => String(c.id));

    return targetIds
      .map((cId) => {
        const classObj =
          internalClasses.find((c) => String(c.id) === String(cId)) ||
          classes.find((c) => String(c.id) === String(cId));
        const list = classRankHoldersMap[cId] || [];
        return {
          id: cId,
          name: classObj?.name || `Class ${cId}`,
          classObj,
          students: list,
        };
      })
      .filter((item) => isExplicit || item.students.length > 0);
  }, [reportMode, propSelectedClassIds, internalClasses, classes, classRankHoldersMap]);

  const handlePrint = () => {
    window.print();
  };

  // Exact physical page height (minus 1mm margin of error) to guarantee 1 single page per card
  const cardPrintHeight = useMemo(() => {
    const size = String(paperSize || 'a4').toLowerCase();
    const isLandscape = orientation === 'landscape';
    const specs = {
      a4: { portrait: '296mm', landscape: '209mm' },
      letter: { portrait: '10.95in', landscape: '8.45in' },
      legal: { portrait: '13.95in', landscape: '8.45in' },
      a3: { portrait: '419mm', landscape: '296mm' },
    };
    const spec = specs[size] || specs.a4;
    return isLandscape ? spec.landscape : spec.portrait;
  }, [paperSize, orientation]);

  // Dynamic font sizes for mark table in print / export PDF
  const tablePrintLabelFontSize = useMemo(() => {
    const tbl = activeTemplate?.subjectTableConfig || {};
    const tblSt = { ...DEFAULT_BLOCK_STYLE, ...(tbl.style || {}) };
    const isCompact = tbl.size === 'compact';
    return tblSt.labelFontSize || (isCompact ? 9 : 10);
  }, [activeTemplate]);

  const tablePrintContentFontSize = useMemo(() => {
    const tbl = activeTemplate?.subjectTableConfig || {};
    const tblSt = { ...DEFAULT_BLOCK_STYLE, ...(tbl.style || {}) };
    const isCompact = tbl.size === 'compact';
    return tblSt.contentFontSize || (isCompact ? 10 : 11);
  }, [activeTemplate]);

  // Dynamic font sizes for other blocks in print / export PDF
  const schoolHeaderPrint = useMemo(() => {
    const hdr = activeTemplate?.schoolHeader || {};
    const isCompact = hdr.size === 'compact';
    const isLarge = hdr.size === 'large';
    const hdrSt = { ...DEFAULT_BLOCK_STYLE, ...(hdr.style || {}) };
    return {
      titleFontSize: hdrSt.contentFontSize || (isCompact ? 16 : isLarge ? 24 : 20),
      subtitleFontSize: hdrSt.labelFontSize || (isCompact ? 10 : 11),
      addressFontSize: hdrSt.labelFontSize ? Math.max(8, hdrSt.labelFontSize - 1) : 10,
      examTitleFontSize: hdrSt.labelFontSize ? Math.max(8, hdrSt.labelFontSize - 1) : 9.5,
    };
  }, [activeTemplate]);

  const studentInfoPrint = useMemo(() => {
    const cfg = activeTemplate?.studentInfoConfig || {};
    const isCompact = cfg.size === 'compact';
    const st = { ...DEFAULT_BLOCK_STYLE, ...(cfg.style || {}) };
    return {
      labelFontSize: st.labelFontSize || (isCompact ? 8.5 : 9.5),
      contentFontSize: st.contentFontSize || (isCompact ? 10.5 : 12),
    };
  }, [activeTemplate]);

  const summaryPrint = useMemo(() => {
    const cfg = activeTemplate?.summaryConfig || {};
    const isCompact = cfg.size === 'compact';
    const st = { ...DEFAULT_BLOCK_STYLE, ...(cfg.style || {}) };
    return {
      labelFontSize: st.labelFontSize || (isCompact ? 8 : 9),
      contentFontSize: st.contentFontSize || (isCompact ? 12 : 14),
    };
  }, [activeTemplate]);

  const remarksPrint = useMemo(() => {
    const cfg = activeTemplate?.remarksConfig || {};
    const isCompact = cfg.size === 'compact';
    const st = { ...DEFAULT_BLOCK_STYLE, ...(cfg.style || {}) };
    return {
      labelFontSize: st.labelFontSize || (isCompact ? 9 : 10),
      contentFontSize: st.contentFontSize || (isCompact ? 10 : 11),
    };
  }, [activeTemplate]);

  const signaturesPrint = useMemo(() => {
    const cfg = activeTemplate?.signaturesConfig || {};
    const isCompact = cfg.size === 'compact';
    const st = { ...DEFAULT_BLOCK_STYLE, ...(cfg.style || {}) };
    return {
      labelFontSize: st.labelFontSize || (isCompact ? 9 : 10),
      contentFontSize: st.contentFontSize || (isCompact ? 8.5 : 9.5),
    };
  }, [activeTemplate]);

  const attendanceBarPrint = useMemo(() => {
    const cfg = activeTemplate?.attendanceBarConfig || {};
    const isCompact = cfg.size === 'compact';
    const st = { ...DEFAULT_BLOCK_STYLE, ...(cfg.style || {}) };
    return {
      labelFontSize: st.labelFontSize || (isCompact ? 9 : 10),
      contentFontSize: st.contentFontSize || (isCompact ? 10 : 11),
    };
  }, [activeTemplate]);

  const gradingScalePrint = useMemo(() => {
    const cfg = activeTemplate?.gradingScaleConfig || {};
    const st = { ...DEFAULT_BLOCK_STYLE, ...(cfg.style || {}) };
    return {
      fontSize: st.contentFontSize || st.labelFontSize || 8,
    };
  }, [activeTemplate]);

  const chartPrint = useMemo(() => {
    const cfg = activeTemplate?.chartConfig || {};
    const isTight = !!cfg.tightMargins;
    const st = { ...DEFAULT_BLOCK_STYLE, ...(cfg.style || {}) };
    return {
      titleFontSize: st.labelFontSize || (isTight ? 9 : 10),
    };
  }, [activeTemplate]);

  // Per-student Teacher Remarks & Recommendations Map
  const [studentRemarksMap, setStudentRemarksMap] = useState({});
  const [internalRemarksModalOpen, setInternalRemarksModalOpen] = useState(false);
  const isRemarksModalOpen =
    propIsRemarksModalOpen !== undefined ? propIsRemarksModalOpen : internalRemarksModalOpen;
  const setIsRemarksModalOpen = (val) => {
    setInternalRemarksModalOpen(val);
    onRemarksModalOpenChange?.(val);
  };

  // Build the per-student remarks map from the rows delivered by the report-data RPC
  // (no extra network call), merged with the browser-local cache.
  useEffect(() => {
    if (!selectedScheduleId) {
      setStudentRemarksMap({});
      return;
    }
    const currentStudents = students.length > 0 ? students : propStudents || [];
    const findStudent = (adm) =>
      currentStudents.find(
        (s) =>
          String(s.admission_no || s.admission_number || '')
            .trim()
            .toLowerCase() === adm
      );
    const map = {};

    (serverRemarks || []).forEach((item) => {
      const adm = String(item.admission_no || '')
        .trim()
        .toLowerCase();
      const entry = { remarks: item.remarks || '', recommendations: item.recommendations || '' };
      if (adm) map[adm] = entry;
      const matched = adm ? findStudent(adm) : null;
      if (matched) map[String(matched.id)] = entry;
    });

    let localMap = {};
    try {
      const local = localStorage.getItem(`jzv_exam_remarks_${selectedScheduleId}`);
      if (local) localMap = JSON.parse(local) || {};
    } catch (_) {}
    Object.entries(localMap).forEach(([admKey, entry]) => {
      const adm = String(admKey).trim().toLowerCase();
      if (!map[adm]) map[adm] = entry;
      const matched = findStudent(adm);
      if (matched && !map[String(matched.id)]) map[String(matched.id)] = entry;
    });

    setStudentRemarksMap(map);
  }, [serverRemarks, students, selectedScheduleId]);

  const rankHolderActiveSigs = useMemo(() => {
    const sigCfg = activeTemplate?.signaturesConfig || {};
    const isSig1 = sigCfg.showSignature1 !== undefined ? !!sigCfg.showSignature1 : true;
    const isSig2 = sigCfg.showSignature2 !== undefined ? !!sigCfg.showSignature2 : true;
    const isSig3 = sigCfg.showSignature3 !== undefined ? !!sigCfg.showSignature3 : true;
    const isSig4 = sigCfg.showSignature4 !== undefined ? !!sigCfg.showSignature4 : true;

    return [
      isSig1 && {
        id: 'signature1',
        title: activeTemplate?.signatures?.signature1 || 'Signature 1',
        subtitle: 'Signature',
      },
      isSig2 && {
        id: 'signature2',
        title: activeTemplate?.signatures?.signature2 || 'Signature 2',
        subtitle: 'Signature',
      },
      isSig3 && {
        id: 'signature3',
        title: activeTemplate?.signatures?.signature3 || 'Signature 3',
        subtitle: 'Seal & Signature',
      },
      isSig4 && {
        id: 'signature4',
        title: activeTemplate?.signatures?.signature4 || 'Signature 4',
        subtitle: 'Signature',
      },
    ].filter(Boolean);
  }, [activeTemplate]);

  // Print styles
  const printStyles = useMemo(() => {
    return `
      @page {
        size: ${paperSize} ${orientation};
        margin: 0;
      }
      @media print {
        .progress-report-card-page {
          height: ${cardPrintHeight};
          page-break-after: always;
          break-after: page;
          margin: 0;
          padding: var(--page-pad-x) var(--page-pad-y);
          box-sizing: border-box;
        }
        .progress-report-card-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        body { margin: 0; padding: 0; }
        .print\\:hidden { display: none !important; }
        .no-print { display: none !important; }
      }

      /* Table Font Sizes */
      .progress-report-card-page th,
      .progress-report-card-page td {
        padding: ${activeTemplate?.subjectTableConfig?.size === 'compact' ? '2px 4px' : activeTemplate?.subjectTableConfig?.size === 'spacious' ? '5px 8px' : '3px 6px'} !important;
      }

      /* School Header */
      .progress-report-card-page .school-header-title {
        font-size: ${schoolHeaderPrint.titleFontSize}px !important;
      }
      .progress-report-card-page .school-header-subtitle {
        font-size: ${schoolHeaderPrint.subtitleFontSize}px !important;
      }
      .progress-report-card-page .school-header-address {
        font-size: ${schoolHeaderPrint.addressFontSize}px !important;
      }
      .progress-report-card-page .school-header-exam-badge {
        font-size: ${schoolHeaderPrint.examTitleFontSize}px !important;
      }

      /* Student Info */
      .progress-report-card-page .student-info-label {
        font-size: ${studentInfoPrint.labelFontSize}px !important;
      }
      .progress-report-card-page .student-info-value {
        font-size: ${studentInfoPrint.contentFontSize}px !important;
      }

      /* Summary Calculations */
      .progress-report-card-page .summary-calc-label {
        font-size: ${summaryPrint.labelFontSize}px !important;
      }
      .progress-report-card-page .summary-calc-value {
        font-size: ${summaryPrint.contentFontSize}px !important;
      }

      /* Teacher Remarks */
      .progress-report-card-page .remarks-label {
        font-size: ${remarksPrint.labelFontSize}px !important;
      }
      .progress-report-card-page .remarks-content {
        font-size: ${remarksPrint.contentFontSize}px !important;
      }

      /* Signatures */
      .progress-report-card-page .signature-title {
        font-size: ${signaturesPrint.labelFontSize}px !important;
      }
      .progress-report-card-page .signature-subtitle {
        font-size: ${signaturesPrint.contentFontSize}px !important;
      }

      /* Attendance Bar */
      .progress-report-card-page .attendance-bar-label {
        font-size: ${attendanceBarPrint.labelFontSize}px !important;
      }
      .progress-report-card-page .attendance-bar-content {
        font-size: ${attendanceBarPrint.contentFontSize}px !important;
      }

      /* Rank Holders */
      .progress-report-card-page .rank-holders-print-block {
        page-break-inside: avoid;
        break-inside: avoid;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* Charts */
      .progress-report-card-page .chart-column-title {
        font-size: ${chartPrint.titleFontSize}px !important;
      }

      /* Grading Scale Legend */
      .progress-report-card-page .grading-scale-legend,
      .progress-report-card-page .grading-scale-legend * {
        font-size: ${gradingScalePrint.fontSize}px !important;
      }
    `;
  }, [
    paperSize,
    orientation,
    cardPrintHeight,
    activeTemplate,
    tablePrintContentFontSize,
    tablePrintLabelFontSize,
    schoolHeaderPrint,
    studentInfoPrint,
    summaryPrint,
    remarksPrint,
    signaturesPrint,
    attendanceBarPrint,
    chartPrint,
    gradingScalePrint,
  ]);

  return (
    <div className="space-y-6" data-feature="progress-report-generator">
      {/* ── Control Bar (Hidden on Print or when hideControlBar is true) ── */}
      {!hideControlBar && (
        <div className="print:hidden bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-light-border shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Title and Icon */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg shadow-2xs shrink-0">
                <i className="fas fa-file-invoice" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-dark-primary tracking-tight">
                    Progress Report Generator
                  </h2>
                  {selectedSchedule && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isScheduleReportPublished(selectedSchedule)
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                      title={
                        isScheduleReportPublished(selectedSchedule)
                          ? 'Progress Report cards are published to parent portal'
                          : 'Progress Report cards are draft/unpublished to parents'
                      }
                    >
                      <i
                        className={`fas ${
                          isScheduleReportPublished(selectedSchedule) ? 'fa-globe' : 'fa-lock'
                        } text-[8px]`}
                      />
                      {isScheduleReportPublished(selectedSchedule)
                        ? 'Report Published'
                        : 'Report Unpublished'}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-dark-muted">
                  Generate student performance cards with custom grouping, charts, and calculations
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
              <button
                type="button"
                onClick={handlePrint}
                disabled={displayedStudents.length === 0 || results.length === 0}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <i className="fas fa-print" />
                <span>Print / Export PDF</span>
              </button>
            </div>
          </div>

          {/* Filter Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            {/* Examination Selector */}
            <div>
              <label className="block text-[11px] font-bold text-dark-slate mb-1">
                Examination
              </label>
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-primary outline-none focus:ring-2 focus:ring-rose-300"
              >
                {internalSchedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Selector */}
            <div>
              <label className="block text-[11px] font-bold text-dark-slate mb-1">Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-primary outline-none focus:ring-2 focus:ring-rose-300"
              >
                {internalClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Generation Scope (Entire Class vs Selected Students) */}
            <div>
              <label className="block text-[11px] font-bold text-dark-slate mb-1">
                Students Scope
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={studentSelectionMode}
                  onChange={(e) => setStudentSelectionMode(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-primary outline-none focus:ring-2 focus:ring-rose-300"
                >
                  <option value="all">Entire Class</option>
                  <option value="selected">Selected Students</option>
                </select>
                {studentSelectionMode === 'selected' && displayedStudents.length > 0 && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                    {displayedStudents.length} selected
                  </span>
                )}
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-[11px] font-bold text-dark-slate mb-1">Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-primary outline-none focus:ring-2 focus:ring-rose-300"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paper Size & Orientation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-dark-slate mb-1">Paper Size</label>
              <select
                value={paperSize}
                onChange={(e) => setInternalPaperSize(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-primary outline-none focus:ring-2 focus:ring-rose-300"
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
                <option value="a3">A3</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-dark-slate mb-1">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setInternalOrientation(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-primary outline-none focus:ring-2 focus:ring-rose-300"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            {canPublishReport && selectedSchedule && (
              <div className="lg:col-span-2">
                <button
                  type="button"
                  onClick={handleTogglePublishReport}
                  disabled={publishingReport}
                  className={`w-full px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    isScheduleReportPublished(selectedSchedule)
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <i className={`fas ${isScheduleReportPublished(selectedSchedule) ? 'fa-lock' : 'fa-globe'} text-[10px]`} />
                  <span>
                    {publishingReport
                      ? 'Updating...'
                      : isScheduleReportPublished(selectedSchedule)
                        ? 'Unpublish from Parents'
                        : 'Publish to Parents'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Report Cards ── */}
      <div className="space-y-6">
        {displayedStudents.length === 0 || results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-light-border p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-2xl text-slate-400 mb-4">
              <i className="fas fa-file-invoice" />
            </div>
            <h3 className="text-lg font-black text-dark-primary mb-2">No Report Cards to Display</h3>
            <p className="text-dark-muted text-sm">
              {loading
                ? 'Loading report data...'
                : !selectedScheduleId
                  ? 'Please select an examination schedule.'
                  : !selectedClassId
                    ? 'Please select a class.'
                    : 'No students found for the selected class and examination.'}
            </p>
          </div>
        ) : (
          <>
            <style dangerouslySetInnerHTML={{ __html: printStyles }} />
            {displayedStudents.map((student, studentIndex) => {
              const metrics = studentMetricsMap[String(student.id)] || {};
              const subjectScores = metrics.subjectScores || [];

              // Build grouped sections for subject table
              const { groupedSections, ungroupedScores } = buildGroupedSections(
                subjectScores,
                activeTemplate.subjectGroups
              );

              // Chart data for student
              const chartData = subjectScores.map((s) => ({
                name: s.subjectName.length > 12 ? `${s.subjectName.slice(0, 10)}…` : s.subjectName,
                fullName: s.subjectName,
                Marks: typeof s.marksObtained === 'number' ? s.marksObtained : 0,
                Max: s.maxMarks,
              }));

              return (
                <div
                  key={student.id}
                  style={{
                    '--page-pad-x': '24px',
                    '--page-pad-y': '24px',
                  }}
                  className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-md print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0 progress-report-card-page max-w-4xl mx-auto relative overflow-hidden flex flex-col min-h-[920px] print:min-h-0"
                >
                  {/* ── ExtraComponent / Logo Layers: Background layers (z-0, behind content) ── */}
                  <ExtraComponentLayers
                    currentConfig={activeTemplate}
                    position="background"
                    pageNumber={studentIndex + 1}
                    totalPages={displayedStudents.length}
                  />

                  <div
                    className="relative z-10 flex flex-col flex-1 h-full min-h-0 w-full"
                    style={{ gap: `${activeTemplate.blockSpacing ?? 12}px` }}
                  >
                    {/* ── Render Blocks according to activeTemplate.blockOrder ── */}
                    {activeTemplate.blockOrder.map((blockKey) => {
                      const getBlockStyleObj = () => {
                        switch (blockKey) {
                          case 'schoolHeader':
                            return {
                              ...DEFAULT_BLOCK_STYLE,
                              ...(activeTemplate.schoolHeader?.style || {}),
                            };
                          case 'studentInfo':
                            return {
                              ...DEFAULT_BLOCK_STYLE,
                              ...(activeTemplate.studentInfoConfig?.style || {}),
                            };
                          case 'attendanceBar':
                            return {
                              ...DEFAULT_BLOCK_STYLE,
                              ...(activeTemplate.attendanceBarConfig?.style || {}),
                            };
                          case 'rankHolders':
                            return {
                              ...DEFAULT_BLOCK_STYLE,
                              ...(activeTemplate.rankHoldersConfig?.style || {}),
                            };
                          case 'subjectTable':
                            return {
                              ...DEFAULT_BLOCK_STYLE,
                              ...(activeTemplate.subjectTableConfig?.style || {}),
                            };
                          case 'summaryCalculations':
                            return {
                              ...DEFAULT_BLOCK_STYLE,
                              ...(activeTemplate.summaryConfig?.style || {}),
                            };
                          case 'charts':
                            return {
                              ...DEFAULT_BLOCK_STYLE,
                              ...(activeTemplate.chartConfig?.style || {}),
                            };
                          case 'remarks':
                            return {
                              ...DEFAULT_BLOCK_STYLE,
                              ...(activeTemplate.remarksConfig?.style || {}),
                            };
                          case 'signatures':
                            return {
                              ...DEFAULT_BLOCK_STYLE,
                              ...(activeTemplate.signaturesConfig?.style || {}),
                            };
                          default:
                            return DEFAULT_BLOCK_STYLE;
                        }
                      };

                      const blockSt = getBlockStyleObj();
                      const bleed = getBlockBleedStyles(blockSt, blockKey);

                      const blockContent = (() => {
                        switch (blockKey) {
                          case 'schoolHeader': {
                            return renderSchoolHeader({ bleed, activeTemplate, schoolHeaderPrint });
                          }

                          case 'studentInfo': {
                            return renderStudentInfo({ bleed, activeTemplate, studentInfoPrint });
                          }

                          case 'attendanceBar': {
                            return renderAttendanceBar({ activeTemplate, student, attendanceBarPrint });
                          }

                          case 'rankHolders': {
                            return renderRankHolders({
                              activeTemplate,
                              rankHolderClassesToRender,
                              student,
                            });
                          }

                          case 'subjectTable': {
                            return renderSubjectTable({
                              bleed,
                              activeTemplate,
                              groupedSections,
                              ungroupedScores,
                              tablePrintLabelFontSize,
                              tablePrintContentFontSize,
                            });
                          }

                          case 'summaryCalculations': {
                            return renderSummary({
                              bleed,
                              activeTemplate,
                              metrics,
                              subjectScores,
                              summaryPrint,
                            });
                          }

                          case 'charts': {
                            return renderCharts({
                              bleed,
                              activeTemplate,
                              chartData,
                              subjectScores,
                              chartPrint,
                            });
                          }

                          case 'remarks': {
                            return renderRemarks({
                              bleed,
                              activeTemplate,
                              studentRemarksMap,
                              student,
                              remarksPrint,
                            });
                          }

                          case 'signatures': {
                            return renderSignatures({ bleed, activeTemplate, signaturesPrint });
                          }

                          default:
                            return null;
                        }
                      })();

                      const pageNumber = studentIndex + 1;
                      const totalPages = displayedStudents.length;

                      // Evaluate page print filter and preserve block space
                      let shouldPrint = true;
                      let preserveSpace = false;

                      if (blockKey === 'schoolHeader') {
                        const printRule = activeTemplate.schoolHeader?.printPages || 'everyPage';
                        shouldPrint = shouldPrintBlockOnPage(printRule, pageNumber, totalPages);
                        preserveSpace = !!activeTemplate.schoolHeader?.preserveSpace;
                      } else if (blockKey === 'signatures') {
                        const printRule = activeTemplate.signaturesConfig?.printPages || 'everyPage';
                        shouldPrint = shouldPrintBlockOnPage(printRule, pageNumber, totalPages);
                        preserveSpace = !!activeTemplate.signaturesConfig?.preserveSpace;
                      }

                      // If not printing and space is NOT preserved, collapse completely
                      if (!shouldPrint && !preserveSpace) {
                        return null;
                      }

                      const isHiddenReserved = !shouldPrint && preserveSpace;

                      return (
                        <div
                          key={blockKey}
                          className={`relative transition-all ${!bleed.isPageWidth ? 'w-full' : ''} ${blockKey === 'signatures' ? 'mt-auto report-card-signatures-wrapper' : ''}`}
                          style={{
                            ...bleed.wrapperStyle,
                            ...(isHiddenReserved ? { visibility: 'hidden', pointerEvents: 'none' } : {}),
                          }}
                          aria-hidden={isHiddenReserved ? 'true' : undefined}
                          {...bleed.wrapperAttrs}
                        >
                          {renderBlockTitle(blockSt, DEFAULT_BLOCK_TITLES[blockKey])}
                          {blockContent}
                        </div>
                      );
                    })}

                    {/* Optional Grading Scale Legend on Printed Card */}
                    {activeTemplate.showGradingScale && activeTemplate.gradingScale?.length > 0 && (
                      <GradingScaleLegend currentConfig={activeTemplate} gradingScalePrint={gradingScalePrint} />
                    )}
                  </div>

                  {/* ── ExtraComponent / Logo Layers: Foreground layers (z-30, above content) ── */}
                  <ExtraComponentLayers
                    currentConfig={activeTemplate}
                    position="foreground"
                    pageNumber={studentIndex + 1}
                    totalPages={displayedStudents.length}
                  />
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── Remarks & Feedback Modal (Individual Edit with Next/Prev and Bulk Upload) ── */}
      <ExamRemarksModal
        isOpen={isRemarksModalOpen}
        onClose={() => setIsRemarksModalOpen(false)}
        schedule={selectedSchedule}
        students={students}
        displayedStudents={displayedStudents}
        studentRemarksMap={studentRemarksMap}
        onSaveSuccess={(updatedMap) => {
          setStudentRemarksMap(updatedMap);
          loadReportData();
        }}
        activeTemplate={activeTemplate}
      />

      {/* Attendance Upload Modal */}
      <ExamAttendanceUploadModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        schedule={selectedSchedule}
        students={students}
        displayedStudents={displayedStudents}
        attendanceMap={attendanceMap}
        onUploadSuccess={() => {
          loadReportData();
        }}
      />

      {/* Confirmation Modal */}
      {confirmModalData && (
        <ConfirmModal
          isOpen={Boolean(confirmModalData)}
          title={confirmModalData.title}
          message={confirmModalData.message}
          confirmText={confirmModalData.confirmText}
          cancelText={confirmModalData.cancelText || 'Cancel'}
          type={confirmModalData.type || 'warning'}
          onConfirm={confirmModalData.onConfirm}
          onCancel={() => setConfirmModalData(null)}
        />
      )}
    </div>
  );
};

export default ReportCardGenerator;