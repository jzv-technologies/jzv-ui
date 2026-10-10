// src/components/examinations/ReportCardGenerator.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { getAdminConfig, saveAdminConfig } from '../../utils/adminConfigUtils';
import MultiSelectDropdown from '../MultiSelectDropdown';
import AttendanceHorizontalStackBar from './AttendanceHorizontalStackBar';
import RankHolders from './RankHolders';
import ExamAttendanceUploadModal from './ExamAttendanceUploadModal';
import ExamRemarksModal from './ExamRemarksModal';
import ConfirmModal from '../ConfirmModal';
import { useCanAccess } from '../portal-shared/ConditionalBlock';
import { isScheduleReportPublished, broadcastSchedulePublishedChange } from '../../utils/examScheduleUtils';
import { ExtraComponentLayers } from './report-card-designer/components/ExtraComponent';
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
  getGradeColor,
  getActiveTableColumns,
  getLabelPlacement,
  getLegendProps,
  getBlockBackgroundStyle,
  getBlockBleedStyles,
  BLOCK_DEFAULT_BG,
  hexToRgba,
  formatDataLabel,
  shouldPrintBlockOnPage,
  getDynamicClassesPerPage,
} from './ReportCardDesigner';
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

  const applyAttendance = (list) => {
    let rows = Array.isArray(list) ? list : [];
    if (rows.length === 0) {
      // Browser cache fallback (only populated on the machine that uploaded attendance)
      try {
        const local = localStorage.getItem(`jzv_exam_attendance_${selectedScheduleId}`);
        if (local) rows = JSON.parse(local);
      } catch (_) {}
    }
    const map = {};
    rows.forEach((item) => {
      if (item.admission_no) {
        const k1 = String(item.admission_no).trim().toLowerCase();
        const k2 = k1.replace(/^0+/, '');
        map[k1] = item;
        if (k2) map[k2] = item;
      }
      if (item.student_id) map[String(item.student_id)] = item;
    });
    if (propAttendanceMap && typeof propAttendanceMap === 'object') {
      Object.assign(map, propAttendanceMap);
    }
    setAttendanceMap(map);
  };

  const mergeById = (prev, incoming) => {
    const byId = new Map((prev || []).map((x) => [String(x.id), x]));
    incoming.forEach((x) => {
      const existing = byId.get(String(x.id)) || {};
      const merged = { ...existing, ...x };
      if (
        (merged.classification_id === undefined || merged.classification_id === null) &&
        existing.classification_id !== undefined &&
        existing.classification_id !== null
      ) {
        merged.classification_id = existing.classification_id;
      }
      if (
        (merged.seq === undefined || merged.seq === null) &&
        existing.seq !== undefined &&
        existing.seq !== null
      ) {
        merged.seq = existing.seq;
      }
      byId.set(String(x.id), merged);
    });
    return Array.from(byId.values());
  };

  // Fallback used only if the RPC is unavailable (e.g. migration not yet applied).
  // Still avoids the waterfall by running independent queries in parallel.
  const legacyLoad = async (seq) => {
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
    applyAttendance(attRes?.data);
  };

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
            if (Array.isArray(d.remarks)) combinedRemarks.push(...d.remarks);
            if (Array.isArray(d.subjects)) combinedSubjects = mergeById(combinedSubjects, d.subjects);
            if (Array.isArray(d.classifications))
              combinedClassifications = mergeById(combinedClassifications, d.classifications);
            if (d.class) combinedClasses = mergeById(combinedClasses, [d.class]);
          } else {
            failedClassIds.push(cId);
          }
        });

        // Run direct query fallback for classes where RPC was unavailable
        if (failedClassIds.length > 0) {
          try {
            const [stuRes, resRes, remRes] = await Promise.all([
              supabase
                .from('students')
                .select('*')
                .in('class_id', failedClassIds)
                .order('student_name'),
              supabase
                .from('exam_results')
                .select('*')
                .eq('schedule_id', selectedScheduleId)
                .in('class_id', failedClassIds),
              supabase
                .from('exam_student_remarks')
                .select('*')
                .eq('schedule_id', selectedScheduleId),
            ]);
            const fbResults = resRes?.data || [];
            let fbEntries = [];
            if (fbResults.length > 0) {
              const { data: ed } = await supabase
                .from('exam_result_entries')
                .select('*')
                .in(
                  'result_id',
                  fbResults.map((r) => r.id)
                );
              fbEntries = ed || [];
            }
            if (stuRes?.data) allStudents.push(...stuRes.data);
            allResults.push(...fbResults);
            allEntries.push(...fbEntries);
            if (remRes?.data) combinedRemarks.push(...remRes.data);
          } catch (fbErr) {
            console.warn('[ReportCardGenerator] Fallback query for rank holders failed:', fbErr);
          }
        }

        const uniqueStudents = Array.from(
          new Map(allStudents.map((s) => [String(s.id), s])).values()
        );
        const uniqueResults = Array.from(
          new Map(allResults.map((r) => [String(r.id), r])).values()
        );
        const uniqueEntries = Array.from(
          new Map(
            allEntries.map((e) => [
              String(e.id || `${e.result_id}_${e.student_id || ''}_${e.admission_no || ''}`),
              e,
            ])
          ).values()
        );

        setStudents(uniqueStudents);
        setResults(uniqueResults);
        setEntries(uniqueEntries);
        setServerRanksMap(combinedRanks);
        setServerRemarks(combinedRemarks);
        if (combinedSubjects.length) setInternalSubjects((prev) => mergeById(prev, combinedSubjects));
        if (combinedClassifications.length)
          setInternalClassifications((prev) => mergeById(prev, combinedClassifications));
        if (combinedClasses.length) setInternalClasses((prev) => mergeById(prev, combinedClasses));
      } catch (err) {
        console.error('[ReportCardGenerator] Failed to load rank holders data:', err);
        showToast('Error loading rank holder data', 'error');
      } finally {
        if (seq === reportFetchSeq.current) setLoading(false);
      }
      return;
    }

    // ── Default / Progress Report mode (Preserved exactly as is) ──
    if (!selectedClassId) {
      setStudents([]);
      setResults([]);
      setEntries([]);
      setReportPayload(null);
      return;
    }
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
      applyAttendance(data?.attendance);
      onReportDataLoaded?.(data);
    } catch (err) {
      console.warn(
        '[ReportCardGenerator] get_progress_report_data unavailable, using direct queries:',
        err?.message
      );
      try {
        await legacyLoad(seq);
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
    if (students.length === 0 || results.length === 0) return {};
    const scale = activeTemplate?.gradingScale || DEFAULT_GRADING_SCALE;

    const studentCalculations = students.map((student, sIdx) => {
      let totalObtained = 0;
      let totalMax = 0;
      let hasFailed = false;
      const subjectScores = [];
      const stuClassId = String(student.class_id || selectedClassId || '');
      const relevantResults = results.filter(
        (r) => !r.class_id || !stuClassId || String(r.class_id) === stuClassId
      );

      relevantResults.forEach((result) => {
        const sub = internalSubjects.find((s) => String(s.id) === String(result.subject_id));
        const entry = entries.find(
          (e) =>
            String(e.result_id) === String(result.id) &&
            // Join by admission_no (preferred) or fall back to student_id for legacy rows
            (e.admission_no
              ? String(e.admission_no) === String(student.admission_no)
              : String(e.student_id) === String(student.id))
        );

        const isAbsent = Boolean(entry?.is_absent);
        const marks = entry && entry.marks_obtained !== null ? Number(entry.marks_obtained) : null;
        const maxMarks = Number(result.max_marks || 100);
        const passMarks = result.pass_marks ? Number(result.pass_marks) : null;

        let status = 'PASS';
        if (isAbsent) {
          status = 'ABSENT';
          hasFailed = true;
        } else if (passMarks !== null && marks !== null && marks < passMarks) {
          status = 'FAIL';
          hasFailed = true;
        }

        let grade = '—';
        if (marks !== null && maxMarks > 0) {
          const pct = (marks / maxMarks) * 100;
          grade = calculateGrade(pct, scale);
        }

        if (!isAbsent && marks !== null) {
          totalObtained += marks;
        }
        totalMax += maxMarks;

        const subName = (sub?.name || `Subject #${result.subject_id}`).trim();
        const subNameNorm = subName.toLowerCase();
        const knownSub =
          KNOWN_SUBJECT_CLASSIFICATIONS[subNameNorm] ||
          Object.values(KNOWN_SUBJECT_CLASSIFICATIONS).find(
            (k) => String(k.subjectId) === String(result.subject_id)
          );

        const classificationId =
          sub?.classification_id ?? knownSub?.classificationId ?? null;

        const clsObj =
          internalClassifications.find((c) => String(c.id) === String(classificationId)) ||
          DEFAULT_MOCK_CLASSIFICATIONS.find((c) => String(c.id) === String(classificationId));

        const classificationName =
          clsObj?.name || knownSub?.classificationName || 'General';

        const classificationSeq =
          clsObj?.seq !== undefined && clsObj?.seq !== null
            ? Number(clsObj.seq)
            : knownSub?.seq !== undefined && knownSub?.seq !== null
            ? Number(knownSub.seq)
            : CLASSIFICATION_SEQ_FALLBACK[String(classificationId)] !== undefined
            ? CLASSIFICATION_SEQ_FALLBACK[String(classificationId)]
            : CLASSIFICATION_NAME_SEQ_FALLBACK[classificationName.toLowerCase()] !== undefined
            ? CLASSIFICATION_NAME_SEQ_FALLBACK[classificationName.toLowerCase()]
            : 999999;

        subjectScores.push({
          subjectId: result.subject_id,
          subjectName: subName,
          arabicName: sub?.arabic_name || knownSub?.arabicName || '',
          classificationId,
          classificationName,
          classificationSeq,
          maxMarks,
          passMarks,
          marksObtained: isAbsent ? 'Absent' : marks !== null ? marks : '—',
          rawMarks: marks || 0,
          isAbsent,
          grade,
          status,
        });
      });

      // Sort subjects by syl_classification seq hierarchy in asc sort order followed by subject name sorting
      subjectScores.sort((a, b) => {
        const seqA = a.classificationSeq ?? 999999;
        const seqB = b.classificationSeq ?? 999999;
        if (seqA !== seqB) {
          return seqA - seqB;
        }
        return (a.subjectName || '').localeCompare(b.subjectName || '');
      });

      const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const overallGrade = hasFailed ? 'F' : calculateGrade(overallPct, scale);

      return {
        studentId: student.id,
        totalObtained,
        totalMax,
        percentage: Number(overallPct.toFixed(1)),
        overallGrade,
        status: hasFailed ? 'FAIL' : 'PASS',
        subjectScores,
      };
    });

    // Rank only the students who passed, sorted by percentage (then total marks), which is
    // exactly how the Rank Holder report ranks. Failed/absent students must not consume a
    // rank slot, otherwise every student below them shows a rank one higher than the
    // Rank Holder report (e.g. Rank 2 missing, Rank 3 shown instead).
    const rankedCalculations = studentCalculations.filter(
      (s) => s.status !== 'FAIL' && s.overallGrade !== 'F'
    );
    const sortedByRank = [...rankedCalculations].sort(
      (a, b) => (b.percentage || 0) - (a.percentage || 0) || b.totalObtained - a.totalObtained
    );
    const metricsMap = {};
    studentCalculations.forEach((item) => {
      const stuObj = students.find((s) => String(s.id) === String(item.studentId));
      const admKey = stuObj?.admission_no ? String(stuObj.admission_no).trim().toLowerCase() : '';
      const serverRank =
        studentRanksMap?.[String(item.studentId)] ||
        (admKey && studentRanksMap?.[admKey]) ||
        serverRanksMap[String(item.studentId)] ||
        (admKey && serverRanksMap[admKey]);

      const hasFailed = item.status === 'FAIL' || item.overallGrade === 'F';
      const rankIdx = sortedByRank.findIndex(
        (s) => String(s.studentId) === String(item.studentId)
      );
      const computedRank = rankIdx >= 0 ? rankIdx + 1 : null;
      // In the parent view only the ward's rows are loaded, so the local cohort is not the
      // whole class and the class-wide server rank stays authoritative. In class-wide views
      // the locally computed rank wins so it always matches the Rank Holder report.
      const classRank = hasFailed
        ? null
        : isParentView
        ? serverRank?.classRank || computedRank
        : computedRank || serverRank?.classRank || null;
      const totalStudents =
        serverRank?.totalStudents ||
        (studentCalculations.length > 1 ? studentCalculations.length : null);

      metricsMap[String(item.studentId)] = {
        ...item,
        hasFailed,
        classRank,
        totalStudents,
      };
    });

    return metricsMap;
  }, [students, results, entries, internalSubjects, internalClassifications, activeTemplate?.gradingScale, studentRanksMap, serverRanksMap, isParentView]);

  // Compute rank holders grouped by class for the RankHolders component
  const classRankHoldersMap = useMemo(() => {
    if (!students || students.length === 0 || !studentMetricsMap) return {};

    const byClass = {};
    students.forEach((stu) => {
      const clsId = String(stu.class_id || selectedClassId || 'default');
      const metrics = studentMetricsMap[String(stu.id)] || {};
      
      // Check if student has failed any subject
      const hasFailed = metrics.hasFailed === true || metrics.status === 'FAIL' || metrics.overallGrade === 'F';
      
      if (!byClass[clsId]) byClass[clsId] = [];
      byClass[clsId].push({
        id: stu.id,
        student_id: stu.id,
        student_name: stu.student_name,
        admission_no: stu.admission_no,
        photo_id: stu.photo_id,
        class_id: stu.class_id,
        class_name:
          internalClasses.find((c) => String(c.id) === String(stu.class_id))?.name ||
          classes.find((c) => String(c.id) === String(stu.class_id))?.name ||
          selectedClass?.name ||
          `Class ${stu.class_id}`,
        percentage: metrics.percentage ?? 0,
        totalObtained: metrics.totalObtained ?? 0,
        classRank: metrics.classRank,
        rank: metrics.classRank,
        hasFailed,
        subjectScores: metrics.subjectScores,
      });
    });

    const result = {};
    Object.entries(byClass).forEach(([clsId, list]) => {
      // Filter out failed students before ranking
      const passedStudents = list.filter((s) => !s.hasFailed);
      const sorted = [...passedStudents].sort((a, b) => {
        return (b.percentage || 0) - (a.percentage || 0) || (b.totalObtained || 0) - (a.totalObtained || 0);
      });
      sorted.forEach((item, idx) => {
        item.classRank = idx + 1;
        item.rank = idx + 1;
      });
      result[clsId] = sorted;
    });

    return result;
  }, [students, studentMetricsMap, selectedClassId, internalClasses, classes, selectedClass]);

  // Rank Holder Report target classes to render (one page card per class)
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
  }, [activeTemplate?.signaturesConfig, activeTemplate?.signatures]);

  const renderRankHolderSchoolHeader = (clsName) => {
    if (!activeTemplate.showSchoolHeader) return null;
    const hdr = activeTemplate.schoolHeader || {};
    const isCompact = hdr.size === 'compact';
    const isLarge = hdr.size === 'large';
    const hdrSt = { ...DEFAULT_BLOCK_STYLE, ...(hdr.style || {}) };
    const logoSize = hdr?.logoSize
      ? Number(hdr.logoSize)
      : isCompact
        ? 32
        : isLarge
          ? 64
          : 48;
    const logoAlign = hdr?.logoAlign || 'center';
    const logoVAlign = hdr?.logoVerticalAlign || 'above';
    const logoOffsetY = hdr?.logoOffsetY ? Number(hdr.logoOffsetY) : 0;

    const logoEl =
      hdr.showLogo !== false && hdr.logoUrl ? (
        <div
          className={`flex ${
            logoAlign === 'left'
              ? 'justify-start'
              : logoAlign === 'right'
                ? 'justify-end'
                : 'justify-center'
          }`}
          style={{
            transform: logoOffsetY ? `translateY(${logoOffsetY}px)` : undefined,
          }}
        >
          <img
            src={hdr.logoUrl}
            alt="School Logo"
            style={{ height: `${logoSize}px` }}
            className="object-contain print:print-color-adjust-exact"
          />
        </div>
      ) : null;

    const textContentEl = (
      <div
        className={`space-y-1 print:space-y-0.5 ${
          logoAlign === 'left' && logoVAlign === 'inline'
            ? 'text-left'
            : logoAlign === 'right' && logoVAlign === 'inline'
              ? 'text-right'
              : 'text-center'
        }`}
      >
        {hdr.showTitle !== false && hdr.title && (
          <h1
            className={`font-black tracking-tight uppercase school-header-title ${
              isCompact ? 'text-lg' : isLarge ? 'text-2xl' : 'text-xl sm:text-2xl'
            }`}
            style={{
              color: hdrSt.contentColor || activeTemplate.accentColor || '#0f172a',
              fontSize: `${schoolHeaderPrint.titleFontSize}px`,
            }}
          >
            {hdr.title}
          </h1>
        )}
        {hdr.showSubtitle !== false && hdr.subtitle && (
          <p
            className="text-xs font-bold uppercase tracking-wider school-header-subtitle"
            style={{
              fontSize: `${schoolHeaderPrint.subtitleFontSize}px`,
              color: hdrSt.labelColor || '#64748b',
            }}
          >
            {hdr.subtitle}
          </p>
        )}
        {hdr.showAddress !== false && hdr.address && (
          <p
            className="text-[10px] font-semibold school-header-address"
            style={{
              fontSize: `${schoolHeaderPrint.addressFontSize}px`,
              color: hdrSt.labelColor || '#94a3b8',
            }}
          >
            {hdr.address}
          </p>
        )}
        {hdr.showExamTitle !== false && (
          <div className="pt-1 print:pt-0.5">
            <span
              className="inline-block px-3 py-0.5 print:py-0.2 print:px-2 rounded-full text-white font-black uppercase tracking-widest school-header-exam-badge"
              style={{
                backgroundColor: activeTemplate.accentColor || '#0f172a',
                fontSize: `${schoolHeaderPrint.examTitleFontSize}px`,
              }}
            >
              {selectedSchedule?.name
                ? `${selectedSchedule.name} · Rank Holder Report`
                : hdr.examTitle || 'Rank Holder Report'}
            </span>
          </div>
        )}
      </div>
    );

    return (
      <div
        className="border-b-2 border-slate-900 print:border-b space-y-1 print:space-y-0.5 relative pb-3 print:pb-1"
        style={{
          backgroundColor: hdrSt.backgroundColor || 'transparent',
        }}
      >
        {hdr.showHeaderImage && hdr.headerImageUrl && (
          <div className="w-full mb-2 print:mb-1 overflow-hidden">
            <img
              src={hdr.headerImageUrl}
              alt="School Header Banner"
              className="w-full h-auto object-contain max-h-48 print:max-h-28 rounded-lg mx-auto block"
            />
          </div>
        )}

        {logoVAlign === 'above' && logoEl}

        {logoVAlign === 'inline' ? (
          <div
            className={`flex items-center gap-3 ${
              logoAlign === 'right'
                ? 'flex-row-reverse'
                : logoAlign === 'left'
                  ? 'flex-row'
                  : 'flex-row justify-center'
            }`}
          >
            {logoEl}
            {textContentEl}
          </div>
        ) : (
          textContentEl
        )}
      </div>
    );
  };

  const printStyles = useMemo(() => `
    @media print {
      @page {
        size: ${paperSize} ${orientation};
        margin: 0 !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-sizing: border-box !important;
        min-height: 0 !important;
        height: auto !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        overflow: visible !important;
      }
      #root,
      #root > div,
      #dashboard-section,
      main,
      [data-feature="exam-progress-report"],
      [data-feature="exam-results"],
      [data-feature="exam-results-content"],
      [data-feature="progress-report-generator"],
      .min-h-screen,
      .animate-in {
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;
        display: block !important;
        transform: none !important;
        animation: none !important;
        background: transparent !important;
        overflow: visible !important;
      }
      header, nav, aside, footer, [data-feature-filter], [data-feature-tab], .print\\:hidden, button.print\\:hidden {
        display: none !important;
      }
      .print-cards-container {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-height: 0 !important;
        height: auto !important;
        border: none !important;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .progress-report-card-page {
        width: 100% !important;
        max-width: 100% !important;
        height: ${cardPrintHeight} !important;
        max-height: ${cardPrintHeight} !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: ${orientation === 'landscape' ? '5mm 7mm' : '6mm 8mm'} !important;
        --page-pad-x: ${orientation === 'landscape' ? '7mm' : '8mm'} !important;
        --page-pad-y: ${orientation === 'landscape' ? '5mm' : '6mm'} !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        overflow: hidden !important;
        background: #ffffff !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-before: auto !important;
        break-before: auto !important;
      }
      [data-bleed-page="true"] {
        margin-left: calc(-1 * var(--page-pad-x, 8mm)) !important;
        margin-right: calc(-1 * var(--page-pad-x, 8mm)) !important;
        padding-left: var(--page-pad-x, 8mm) !important;
        padding-right: var(--page-pad-x, 8mm) !important;
        width: calc(100% + (2 * var(--page-pad-x, 8mm))) !important;
        max-width: calc(100% + (2 * var(--page-pad-x, 8mm))) !important;
        box-sizing: border-box !important;
      }
      [data-bleed-top="true"] {
        margin-top: calc(-1 * var(--page-pad-y, 6mm)) !important;
        padding-top: calc(var(--page-pad-y, 6mm) + 2mm) !important;
      }
      [data-bleed-bottom="true"] {
        margin-bottom: calc(-1 * var(--page-pad-y, 6mm)) !important;
        padding-bottom: calc(var(--page-pad-y, 6mm) + 2mm) !important;
      }
      .progress-report-card-page:not(:last-child) {
        page-break-after: always !important;
        break-after: page !important;
      }
      .progress-report-card-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      .progress-report-card-page > .relative.z-10 {
        display: flex !important;
        flex-direction: column !important;
        flex: 1 1 0% !important;
        width: 100% !important;
        min-height: 0 !important;
        box-sizing: border-box !important;
        gap: ${activeTemplate.blockSpacing !== undefined ? `${(activeTemplate.blockSpacing * 0.22).toFixed(1)}mm` : orientation === 'landscape' ? '2mm' : '2.5mm'} !important;
      }
      .progress-report-card-page > * {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
      }
      .progress-report-card-page .report-card-signatures-wrapper {
        margin-top: auto !important;
      }
      .progress-report-card-page .report-card-signatures {
        margin-top: auto !important;
        padding-top: 2mm !important;
      }
      /* Mark Table */
      .progress-report-card-page table {
        font-size: ${tablePrintContentFontSize}px !important;
      }
      .progress-report-card-page thead tr,
      .progress-report-card-page thead th {
        font-size: ${tablePrintLabelFontSize}px !important;
      }
      .progress-report-card-page tbody tr,
      .progress-report-card-page tbody td {
        font-size: ${tablePrintContentFontSize}px !important;
      }
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
    }
  `, [
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
                  className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-primary outline-none"
                >
                  <option value="all">Entire Class ({students.length})</option>
                  <option value="selected">Selected Students</option>
                </select>
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-[11px] font-bold text-dark-slate mb-1">
                Active Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-primary outline-none"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Student MultiSelect if 'selected' mode is active */}
          {studentSelectionMode === 'selected' && (
            <div className="pt-2 animate-in fade-in duration-150">
              <MultiSelectDropdown
                label="Choose Students"
                options={students.map((s) => ({
                  id: s.id,
                  label: `${s.student_name} (${s.admission_no})`,
                }))}
                selected={selectedStudentIds}
                onChange={setSelectedStudentIds}
                placeholder="Select students..."
                fullWidth={true}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Report Card Preview & Printable Area ── */}
      {loading ? (
        <div className="flex justify-center py-20 bg-white rounded-3xl border border-light-border">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reportMode === 'excellence' ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl p-10 shadow-xs max-w-2xl mx-auto my-12 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-300 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-amber-200">
            <i className="fas fa-award text-3xl" />
          </div>
          <h3 className="text-xl font-black text-dark-primary">Excellence Report</h3>
          <p className="text-xs text-dark-muted mt-2 max-w-md mx-auto leading-relaxed">
            The Excellence Report feature is currently under active development. This report will highlight subject-wise distinction holders, outstanding student achievements, and honor roll certificates.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 shadow-2xs">
            <i className="fas fa-sparkles text-amber-500" />
            <span>Feature Coming Soon</span>
          </div>
        </div>
      ) : reportMode === 'rank_holder' ? (
        !selectedScheduleId ? (
          <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs">
            <i className="fas fa-trophy text-3xl text-slate-300 mb-2 block" />
            <p className="text-sm font-bold text-dark-primary">Select an Examination</p>
            <p className="text-xs text-dark-muted mt-1">
              Choose an examination event above to generate Rank Holder Reports for the selected classes.
            </p>
          </div>
        ) : rankHolderClassesToRender.length === 0 ? (
          <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs">
            <i className="fas fa-trophy text-3xl text-amber-400 mb-2 block" />
            <p className="text-sm font-bold text-dark-primary">No Rank Holders Found</p>
            <p className="text-xs text-dark-muted mt-1">
              No students or exam results recorded for the selected classes in{' '}
              {selectedSchedule?.name || 'this examination'}.
            </p>
          </div>
        ) : (
          <div className="space-y-8 print:space-y-0 print-cards-container">
            <style>{printStyles}</style>

            {(() => {
              const rkCfg = activeTemplate.rankHoldersConfig || {};
              const isRepeatOn = !!rkCfg.repeatForEveryClass;
              const classesPerPage = isRepeatOn ? getDynamicClassesPerPage(rkCfg) : 1;

              // Chunk rankHolderClassesToRender into pages
              const rankHolderPages = [];
              for (let i = 0; i < rankHolderClassesToRender.length; i += classesPerPage) {
                rankHolderPages.push(rankHolderClassesToRender.slice(i, i + classesPerPage));
              }

              if (rankHolderPages.length === 0 && rankHolderClassesToRender.length > 0) {
                rankHolderPages.push(rankHolderClassesToRender);
              }

              return rankHolderPages.map((pageClasses, pageIdx) => {
                const isStacked = pageClasses.length > 1;
                const pageNumber = pageIdx + 1;
                const totalPages = rankHolderPages.length;
                const headerClassName = pageClasses.map((c) => c.name).join(', ');

                return (
                  <div
                    key={`rank-holder-page-${pageIdx}`}
                    style={{
                      '--page-pad-x': '24px',
                      '--page-pad-y': '24px',
                    }}
                    className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-md print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0 progress-report-card-page max-w-4xl mx-auto relative overflow-hidden flex flex-col min-h-[920px] print:min-h-0"
                  >
                    {/* ── ExtraComponent / Logo Layers: Background ── */}
                    <ExtraComponentLayers
                      currentConfig={activeTemplate}
                      position="background"
                      pageNumber={pageNumber}
                      totalPages={totalPages}
                    />

                    <div
                      className="relative z-10 flex flex-col flex-1 h-full min-h-0 w-full"
                      style={{
                        gap: isStacked
                          ? `${Math.min(activeTemplate.blockSpacing ?? 12, 12)}px`
                          : `${activeTemplate.blockSpacing ?? 16}px`,
                      }}
                    >
                      {/* 1. Header Component */}
                      {(() => {
                        if (!activeTemplate.showSchoolHeader) return null;
                        const printRule = activeTemplate.schoolHeader?.printPages || 'everyPage';
                        const shouldPrint = shouldPrintBlockOnPage(
                          printRule,
                          pageNumber,
                          totalPages
                        );
                        const preserveSpace = !!activeTemplate.schoolHeader?.preserveSpace;

                        if (!shouldPrint && !preserveSpace) return null;

                        const headerContent = renderRankHolderSchoolHeader(headerClassName);
                        if (!headerContent) return null;

                        if (!shouldPrint && preserveSpace) {
                          return (
                            <div style={{ visibility: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                              {headerContent}
                            </div>
                          );
                        }
                        return headerContent;
                      })()}

                      {/* 2. Rank Holders Component (Stacked classes) */}
                      <div className="rank-holders-print-block my-auto py-2 flex-1 flex flex-col justify-center gap-3">
                        {pageClasses.map((clsItem, cIdx) => (
                          <div key={clsItem.id || cIdx} className="w-full">
                            {cIdx > 0 && (
                              <div className="w-full border-t border-slate-200/80 my-2" />
                            )}
                            <RankHolders
                              students={clsItem.students}
                              classNameText={clsItem.name}
                              config={rkCfg}
                              size={isStacked ? 'compact' : rkCfg.size}
                              isCompact={isStacked || rkCfg.size === 'compact'}
                            />
                          </div>
                        ))}
                      </div>

                      {/* 3. Remarks Component */}
                      {activeTemplate.showTeacherRemarks !== false && (
                        <div
                          className={`border border-amber-200 rounded-2xl print:rounded-lg space-y-1.5 print:space-y-0.5 relative ${
                            activeTemplate.remarksConfig?.size === 'compact'
                              ? 'p-2 print:p-1'
                              : 'p-3.5 print:p-1.5'
                          }`}
                          style={{
                            backgroundColor:
                              activeTemplate.remarksConfig?.style?.backgroundColor ||
                              'rgb(255 251 235 / 0.6)',
                          }}
                        >
                          <span
                            className="font-black uppercase tracking-wider block remarks-label text-amber-900"
                            style={{
                              fontSize: `${remarksPrint.labelFontSize}px`,
                              color: activeTemplate.remarksConfig?.style?.labelColor || '#78350f',
                            }}
                          >
                            {activeTemplate.remarksConfig?.title || 'Remarks'}:
                          </span>
                          <p
                            className="italic font-medium remarks-content"
                            style={{
                              fontSize: `${remarksPrint.contentFontSize}px`,
                              color: activeTemplate.remarksConfig?.style?.contentColor || '#0f172a',
                            }}
                          >
                            &quot;
                            {activeTemplate.remarksText ||
                              activeTemplate.remarksConfig?.defaultRemarks ||
                              'Congratulations to all the rank holders and high achievers for their outstanding academic performance and dedication!'}
                            &quot;
                          </p>
                        </div>
                      )}

                      {/* 4. Footer Signature components */}
                      {(() => {
                        if (activeTemplate.showSignatures === false || rankHolderActiveSigs.length === 0)
                          return null;
                        const printRule = activeTemplate.signaturesConfig?.printPages || 'everyPage';
                        const shouldPrint = shouldPrintBlockOnPage(
                          printRule,
                          pageNumber,
                          totalPages
                        );
                        const preserveSpace = !!activeTemplate.signaturesConfig?.preserveSpace;

                        if (!shouldPrint && !preserveSpace) return null;

                        return (
                          <div
                            className={`report-card-signatures mt-auto ${
                              activeTemplate.signaturesConfig?.size === 'compact'
                                ? 'pt-3 print:pt-1.5'
                                : activeTemplate.signaturesConfig?.size === 'tall'
                                  ? 'pt-8 print:pt-3'
                                  : 'pt-6 print:pt-2'
                            } grid gap-4 print:gap-2 text-center ${
                              rankHolderActiveSigs.length === 1 ? 'max-w-xs mx-auto' : ''
                            }`}
                            style={{
                              gridTemplateColumns: `repeat(${rankHolderActiveSigs.length}, minmax(0, 1fr))`,
                              ...(!shouldPrint && preserveSpace
                                ? { visibility: 'hidden', pointerEvents: 'none' }
                                : {}),
                            }}
                            aria-hidden={!shouldPrint ? 'true' : undefined}
                          >
                            {rankHolderActiveSigs.map((sig) => (
                              <div
                                key={sig.id}
                                className="border-t border-slate-900 pt-1.5 print:pt-0.5 space-y-0.5"
                              >
                                <span
                                  className="font-bold text-dark-slate block truncate signature-title"
                                  style={{
                                    fontSize: `${signaturesPrint.labelFontSize}px`,
                                    color: activeTemplate.signaturesConfig?.style?.labelColor || undefined,
                                  }}
                                >
                                  {sig.title}
                                </span>
                                <span
                                  className="text-dark-muted block truncate signature-subtitle"
                                  style={{
                                    fontSize: `${signaturesPrint.contentFontSize}px`,
                                    color:
                                      activeTemplate.signaturesConfig?.style?.contentColor ||
                                      undefined,
                                  }}
                                >
                                  {sig.subtitle}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* ── ExtraComponent / Logo Layers: Foreground ── */}
                    <ExtraComponentLayers
                      currentConfig={activeTemplate}
                      position="foreground"
                      pageNumber={pageNumber}
                      totalPages={totalPages}
                    />
                  </div>
                );
              });
            })()}
          </div>
        )
      ) : !selectedClassId ? (
        <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs">
          <i className="fas fa-chalkboard text-3xl text-slate-300 mb-2 block" />
          <p className="text-sm font-bold text-dark-primary">Select an Examination and Class</p>
          <p className="text-xs text-dark-muted mt-1">
            Choose an examination event and class section to view or generate student progress
            report cards.
          </p>
        </div>
      ) : displayedStudents.length === 0 ? (
        <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs">
          <i className="fas fa-user-graduate text-3xl text-slate-300 mb-2 block" />
          <p className="text-sm font-bold text-dark-primary">
            {students.length === 0 ? 'No Students in this Class' : 'No Students Selected'}
          </p>
          <p className="text-xs text-dark-muted mt-1">
            {students.length === 0
              ? `No students found enrolled in ${selectedClass?.name || 'this class'}.`
              : 'Choose students from the filter dropdown above to display their report cards.'}
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs">
          <i className="fas fa-clipboard-question text-3xl text-amber-400 mb-2 block" />
          <p className="text-sm font-bold text-dark-primary">No Exam Results Recorded</p>
          <p className="text-xs text-dark-muted mt-1">
            No results or marks have been initialized for {selectedClass?.name} in{' '}
            {selectedSchedule?.name}.
          </p>
        </div>
      ) : (
        /* Report Cards List (One card per student, strictly 1 full page without border) */
        <div className="space-y-8 print:space-y-0 print-cards-container">
          {/* Dynamic Print Stylesheet for 1 Full Page Per Card & Zero Border */}
          <style>{printStyles}</style>
          {displayedStudents.map((rawStudent, studentIdx) => {
            const admKey = String(rawStudent.admission_no || rawStudent.admission_number || '')
              .trim()
              .toLowerCase();
            const admKeyNoLeadingZero = admKey.replace(/^0+/, '');
            const stuIdKey = String(rawStudent.id || '');
            const att =
              attendanceMap[admKey] ||
              (admKeyNoLeadingZero && attendanceMap[admKeyNoLeadingZero]) ||
              (stuIdKey && attendanceMap[stuIdKey]);

            let student;
            if (att) {
              const pres = Number(att.present || 0);
              const abs = Number(att.absent || 0);
              const leave = Number(att.on_leave || 0);
              const totalWorking =
                att.total_days !== undefined && att.total_days !== null
                  ? Number(att.total_days)
                  : pres + abs + leave;
              const calcDays = pres + abs + leave;
              const divisor = totalWorking > 0 ? totalWorking : calcDays > 0 ? calcDays : 1;
              const pct = Math.round((pres / divisor) * 100);

              student = {
                ...rawStudent,
                total_working_days: totalWorking,
                present_days: pres,
                absent_days: abs,
                leave_days: leave,
                attendance: totalWorking > 0 || calcDays > 0 ? `${pct}%` : '—',
                hasAttendanceRecorded: true,
              };
            } else {
              student = {
                ...rawStudent,
                hasAttendanceRecorded: Boolean(
                  rawStudent.attendance &&
                    rawStudent.attendance !== '—' &&
                    rawStudent.attendance !== '0%'
                ),
              };
            }
            const metrics = studentMetricsMap[String(student.id)] || {};
            const subjectScores = metrics.subjectScores || [];

            // Group subjects according to activeTemplate.subjectGroups
            const { groupedSections, ungroupedScores } = (() => {
              const groups = activeTemplate.subjectGroups || [];
              const mappedIds = new Set();
              const sections = [];

              groups.forEach((g) => {
                const groupMembers = subjectScores.filter((s) =>
                  g.subjectIds.map(String).includes(String(s.subjectId))
                );
                if (groupMembers.length > 0) {
                  groupMembers.forEach((m) => mappedIds.add(String(m.subjectId)));
                  const groupTotalObt = groupMembers.reduce(
                    (acc, curr) =>
                      acc + (typeof curr.marksObtained === 'number' ? curr.marksObtained : 0),
                    0
                  );
                  const groupTotalMax = groupMembers.reduce((acc, curr) => acc + curr.maxMarks, 0);
                  const groupPct = groupTotalMax > 0 ? (groupTotalObt / groupTotalMax) * 100 : 0;

                  sections.push({
                    groupName: g.name,
                    members: groupMembers,
                    groupTotalObt,
                    groupTotalMax,
                    groupPct: Number(groupPct.toFixed(1)),
                  });
                }
              });

              const ungrouped = subjectScores.filter((s) => !mappedIds.has(String(s.subjectId)));
              return { groupedSections: sections, ungroupedScores: ungrouped };
            })();

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
                  pageNumber={studentIdx + 1}
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
                          if (!activeTemplate.showSchoolHeader) return null;
                          const hdr = activeTemplate.schoolHeader || {};
                          const isCompact = hdr.size === 'compact';
                          const isLarge = hdr.size === 'large';
                          const hdrSt = { ...DEFAULT_BLOCK_STYLE, ...(hdr.style || {}) };
                          const logoSize = hdr?.logoSize
                            ? Number(hdr.logoSize)
                            : isCompact
                              ? 32
                              : isLarge
                                ? 64
                                : 48;
                          const logoAlign = hdr?.logoAlign || 'center';
                          const logoVAlign = hdr?.logoVerticalAlign || 'above';
                          const logoOffsetY = hdr?.logoOffsetY ? Number(hdr.logoOffsetY) : 0;

                          const logoEl =
                            hdr.showLogo !== false && hdr.logoUrl ? (
                              <div
                                className={`flex ${
                                  logoAlign === 'left'
                                    ? 'justify-start'
                                    : logoAlign === 'right'
                                      ? 'justify-end'
                                      : 'justify-center'
                                }`}
                                style={{
                                  transform: logoOffsetY
                                    ? `translateY(${logoOffsetY}px)`
                                    : undefined,
                                }}
                              >
                                <img
                                  src={hdr.logoUrl}
                                  alt="School Logo"
                                  style={{ height: `${logoSize}px` }}
                                  className="object-contain print:print-color-adjust-exact"
                                />
                              </div>
                            ) : null;

                          const textContentEl = (
                            <div
                              className={`space-y-1 print:space-y-0.5 ${
                                logoAlign === 'left' && logoVAlign === 'inline'
                                  ? 'text-left'
                                  : logoAlign === 'right' && logoVAlign === 'inline'
                                    ? 'text-right'
                                    : 'text-center'
                              }`}
                            >
                              {hdr.showTitle !== false && hdr.title && (
                                <h1
                                  className={`font-black tracking-tight uppercase school-header-title ${
                                    isCompact
                                      ? 'text-lg'
                                      : isLarge
                                        ? 'text-2xl'
                                        : 'text-xl sm:text-2xl'
                                  }`}
                                  style={{
                                    color:
                                      hdrSt.contentColor || activeTemplate.accentColor || '#0f172a',
                                    fontSize: `${schoolHeaderPrint.titleFontSize}px`,
                                  }}
                                >
                                  {hdr.title}
                                </h1>
                              )}
                              {hdr.showSubtitle !== false && hdr.subtitle && (
                                <p
                                  className="text-xs font-bold uppercase tracking-wider school-header-subtitle"
                                  style={{
                                    fontSize: `${schoolHeaderPrint.subtitleFontSize}px`,
                                    color: hdrSt.labelColor || '#64748b',
                                  }}
                                >
                                  {hdr.subtitle}
                                </p>
                              )}
                              {hdr.showAddress !== false && hdr.address && (
                                <p
                                  className="text-[10px] font-semibold school-header-address"
                                  style={{
                                    fontSize: `${schoolHeaderPrint.addressFontSize}px`,
                                    color: hdrSt.labelColor || '#94a3b8',
                                  }}
                                >
                                  {hdr.address}
                                </p>
                              )}
                              {hdr.showExamTitle !== false && (
                                <div className="pt-1 print:pt-0.5">
                                  <span
                                    className="inline-block px-3 py-0.5 print:py-0.2 print:px-2 rounded-full text-white font-black uppercase tracking-widest school-header-exam-badge"
                                    style={{
                                      backgroundColor: activeTemplate.accentColor || '#0f172a',
                                      fontSize: `${schoolHeaderPrint.examTitleFontSize}px`,
                                    }}
                                  >
                                    {selectedSchedule?.name ||
                                      hdr.examTitle ||
                                      'Official Progress Report'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );

                          return (
                            <div
                              key="schoolHeader"
                              className={`${!bleed.isPageWidth ? 'border-b-2 border-slate-900 print:border-b' : ''} space-y-1 print:space-y-0.5 relative ${
                                isCompact
                                  ? 'pb-2 print:pb-0.5'
                                  : isLarge
                                    ? 'pb-4 print:pb-2'
                                    : 'pb-3 print:pb-1'
                              }`}
                              style={bleed.innerBgStyle('transparent')}
                            >
                              {hdr.showHeaderImage && hdr.headerImageUrl && (
                                <div className="w-full mb-2 print:mb-1 overflow-hidden">
                                  <img
                                    src={hdr.headerImageUrl}
                                    alt="School Header Banner"
                                    className="w-full h-auto object-contain max-h-48 print:max-h-28 rounded-lg mx-auto block"
                                  />
                                </div>
                              )}

                              {logoVAlign === 'above' && logoEl}

                              {logoVAlign === 'inline' ? (
                                <div
                                  className={`flex items-center gap-3 ${
                                    logoAlign === 'right'
                                      ? 'flex-row-reverse'
                                      : logoAlign === 'left'
                                        ? 'flex-row'
                                        : 'flex-row justify-center'
                                  }`}
                                >
                                  {logoEl}
                                  <div className="flex-1 min-w-0">{textContentEl}</div>
                                </div>
                              ) : (
                                textContentEl
                              )}

                              {logoVAlign === 'below' && logoEl}
                            </div>
                          );
                        }

                        case 'studentInfo': {
                          if (!activeTemplate.showStudentInfo) return null;
                          const flds = activeTemplate.studentFields || {};
                          const stuCfg = activeTemplate.studentInfoConfig || {};
                          const isCompact = stuCfg.size === 'compact';
                          const isLarge = stuCfg.size === 'large';
                          const cols = stuCfg.columns || 4;
                          const align = stuCfg.align || stuCfg.contentAlign || 'left';
                          const textAlignClass =
                            align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                          const colClass =
                            cols === 2
                              ? 'sm:grid-cols-2'
                              : cols === 3
                                ? 'sm:grid-cols-3'
                                : 'sm:grid-cols-4';
                          const siSt = { ...DEFAULT_BLOCK_STYLE, ...(stuCfg.style || {}) };
                          const siLabelStyle = {
                            fontSize: `${siSt.labelFontSize || (isCompact ? 8.5 : 9.5)}px`,
                            color: siSt.labelColor || '#64748b',
                          };
                          const siValueStyle = {
                            fontSize: `${siSt.contentFontSize || (isCompact ? 10.5 : 12)}px`,
                            color: siSt.contentColor || '#0f172a',
                          };

                          return (
                            <div
                              key="studentInfo"
                              className={`border border-slate-200 rounded-2xl print:rounded-lg grid grid-cols-2 ${colClass} ${textAlignClass} ${
                                isCompact
                                  ? 'p-2.5 print:p-1.5 gap-2 print:gap-1'
                                  : isLarge
                                    ? 'p-4 print:p-2.5 gap-3 print:gap-2'
                                    : 'p-3.5 print:p-2 gap-2.5 print:gap-1.5'
                              }`}
                              style={bleed.innerBgStyle('#f8fafc')}
                            >
                              {flds.name !== false && (
                                <div>
                                  <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
                                    Student Name
                                  </span>
                                  <span className="font-black student-info-value" style={siValueStyle}>
                                    {student.student_name}
                                  </span>
                                </div>
                              )}
                              {flds.admissionNo !== false && (
                                <div>
                                  <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
                                    Admission No
                                  </span>
                                  <span className="font-mono font-bold student-info-value" style={siValueStyle}>
                                    {student.admission_no}
                                  </span>
                                </div>
                              )}
                              {flds.className !== false && (
                                <div>
                                  <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
                                    Class & Section
                                  </span>
                                  <span
                                    className="font-bold student-info-value"
                                    style={{
                                      ...siValueStyle,
                                      color: siSt.contentColor || '#be123c',
                                    }}
                                  >
                                    {selectedClass?.name || `Class ${student.class_id}`}
                                  </span>
                                </div>
                              )}
                              {flds.rollNo !== false && (
                                <div>
                                  <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
                                    Roll No
                                  </span>
                                  <span className="font-mono font-bold student-info-value" style={siValueStyle}>
                                    #{student.roll_no || studentIdx + 1}
                                  </span>
                                </div>
                              )}
                              {flds.fatherName && (
                                <div>
                                  <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
                                    Father / Guardian
                                  </span>
                                  <span className="font-bold student-info-value" style={siValueStyle}>
                                    {student.father_name || '—'}
                                  </span>
                                </div>
                              )}
                              {flds.dob && (
                                <div>
                                  <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
                                    Date of Birth
                                  </span>
                                  <span className="font-mono font-bold student-info-value" style={siValueStyle}>
                                    {student.dob || '—'}
                                  </span>
                                </div>
                              )}
                              {flds.gender && (
                                <div>
                                  <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
                                    Gender
                                  </span>
                                  <span className="font-bold student-info-value" style={siValueStyle}>
                                    {student.gender || '—'}
                                  </span>
                                </div>
                              )}
                              {flds.bloodGroup && (
                                <div>
                                  <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
                                    Blood Group
                                  </span>
                                  <span className="font-mono font-bold student-info-value" style={siValueStyle}>
                                    {student.blood_group || '—'}
                                  </span>
                                </div>
                              )}
                              {flds.attendance && (
                                <div>
                                  <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
                                    Attendance
                                  </span>
                                  <span
                                    className="font-mono font-bold student-info-value"
                                    style={{
                                      ...siValueStyle,
                                      color: siSt.contentColor || '#047857',
                                    }}
                                  >
                                    {student.attendance || '—'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        case 'attendanceBar': {
                          if (!activeTemplate.showAttendanceBar) return null;
                          return (
                            <div key="attendanceBar">
                              <AttendanceHorizontalStackBar
                                student={student}
                                config={activeTemplate.attendanceBarConfig}
                                isCompact={activeTemplate.attendanceBarConfig?.size === 'compact'}
                              />
                            </div>
                          );
                        }

                        case 'rankHolders': {
                          if (!activeTemplate.showRankHolders) return null;
                          const rkCfg = activeTemplate.rankHoldersConfig || {};
                          const stuClassId = String(student.class_id || selectedClassId || 'default');
                          const classStudents = classRankHoldersMap[stuClassId] || [];
                          const currentClassName =
                            internalClasses.find((c) => String(c.id) === stuClassId)?.name ||
                            selectedClass?.name ||
                            (student.class_name || 'Class');

                          const allClassHolders = {};
                          if (rkCfg.repeatForEveryClass) {
                            Object.entries(classRankHoldersMap).forEach(([cId, cList]) => {
                              const cName =
                                internalClasses.find((c) => String(c.id) === String(cId))?.name || `Class ${cId}`;
                              allClassHolders[cName] = cList;
                            });
                          }

                          return (
                            <div key="rankHolders" className="rank-holders-print-block">
                              <RankHolders
                                students={classStudents}
                                classNameText={rkCfg.classNameText || currentClassName}
                                config={rkCfg}
                                size={rkCfg.size}
                                isCompact={rkCfg.size === 'compact'}
                                allClassRankHolders={rkCfg.repeatForEveryClass ? allClassHolders : null}
                              />
                            </div>
                          );
                        }

                        case 'subjectTable': {
                          if (!activeTemplate.showSubjectTable) return null;
                          const tbl = activeTemplate.subjectTableConfig || {};
                          const tblSt = { ...DEFAULT_BLOCK_STYLE, ...(tbl.style || {}) };
                          const isCompact = tbl.size === 'compact';
                          const isSpacious = tbl.size === 'spacious';
                          const cellPad = isCompact
                            ? 'py-1 px-2'
                            : isSpacious
                              ? 'py-2 px-3'
                              : 'py-1.5 px-2.5';
                          const fontClass = isCompact
                            ? 'text-[10px]'
                            : isSpacious
                              ? 'text-xs'
                              : 'text-xs';
                          const activeCols = getActiveTableColumns(tbl);

                          const showOutline = tbl.showOutlineBorder !== false;
                          const outlineStyle = showOutline
                            ? `${tbl.outlineBorderWidth || 1}px ${tbl.outlineBorderStyle || 'solid'} ${tbl.outlineBorderColor || '#cbd5e1'}`
                            : 'none';

                          const showInline = tbl.showInlineBorders !== false;
                          const inlineBorderBottom = showInline
                            ? `1px ${tbl.inlineBorderStyle || 'solid'} ${tbl.inlineBorderColor || '#e2e8f0'}`
                            : 'none';
                          const inlineBorderRight = showInline
                            ? `1px ${tbl.inlineBorderStyle || 'solid'} ${tbl.inlineBorderColor || '#e2e8f0'}`
                            : 'none';

                          const bandedBg = tbl.bandedRows
                            ? hexToRgba(
                                tbl.bandedRowColor || '#f8fafc',
                                (tbl.bandedRowOpacity ?? 50) / 100
                              )
                            : 'transparent';

                          const tblLabelStyle = {
                            fontSize: `${tblSt.labelFontSize || (isCompact ? 9 : 10)}px`,
                            color: tblSt.labelColor || undefined,
                          };
                          const tblValueStyle = {
                            fontSize: `${tblSt.contentFontSize || (isCompact ? 10 : 11)}px`,
                            color: tblSt.contentColor || undefined,
                          };

                          return (
                            <div
                              key="subjectTable"
                              className="space-y-1.5 print:space-y-1"
                              style={bleed.innerBgStyle('transparent')}
                            >
                              <div
                                className="overflow-x-auto rounded-xl print:rounded-lg"
                                style={{ border: outlineStyle }}
                              >
                                <table className={`w-full ${fontClass} border-collapse`} style={{ ...tblValueStyle }}>
                                  <thead>
                                    <tr
                                      className="font-black uppercase tracking-wider"
                                      style={{
                                        backgroundColor:
                                          activeTemplate.subjectTableConfig?.headerBgColor ||
                                          activeTemplate.accentColor ||
                                          '#0f172a',
                                        borderBottom: inlineBorderBottom,
                                        ...tblLabelStyle,
                                        color:
                                          activeTemplate.subjectTableConfig?.headerTextColor ||
                                          '#ffffff',
                                      }}
                                    >
                                      {activeCols.map((colId, cIdx) => {
                                        const isLast = cIdx === activeCols.length - 1;
                                        const thBorder =
                                          !isLast && showInline
                                            ? { borderRight: inlineBorderRight }
                                            : {};
                                        const headerText =
                                          activeTemplate.subjectTableConfig?.columnLabels?.[
                                            colId
                                          ] ||
                                          DEFAULT_TABLE_COLUMN_HEADERS[colId] ||
                                          colId;
                                        if (colId === 'subject') {
                                          return (
                                            <th
                                              key={colId}
                                              className={`${cellPad} text-left`}
                                              style={{ ...tblLabelStyle, ...thBorder }}
                                            >
                                              {headerText}
                                            </th>
                                          );
                                        }
                                        if (colId === 'arabicName') {
                                          return (
                                            <th
                                              key={colId}
                                              className={`${cellPad} text-right font-arabic pr-3`}
                                              dir="rtl"
                                              style={{ ...tblLabelStyle, ...thBorder }}
                                            >
                                              {headerText}
                                            </th>
                                          );
                                        }
                                        if (colId === 'maxMarks') {
                                          return (
                                            <th
                                              key={colId}
                                              className={`${cellPad} text-center w-20`}
                                              style={{ ...tblLabelStyle, ...thBorder }}
                                            >
                                              {headerText}
                                            </th>
                                          );
                                        }
                                        if (colId === 'passMarks') {
                                          return (
                                            <th
                                              key={colId}
                                              className={`${cellPad} text-center w-20`}
                                              style={{ ...tblLabelStyle, ...thBorder }}
                                            >
                                              {headerText}
                                            </th>
                                          );
                                        }
                                        if (colId === 'marksObtained') {
                                          return (
                                            <th
                                              key={colId}
                                              className={`${cellPad} text-center w-24`}
                                              style={{ ...tblLabelStyle, ...thBorder }}
                                            >
                                              {headerText}
                                            </th>
                                          );
                                        }
                                        if (colId === 'percentage') {
                                          return (
                                            <th
                                              key={colId}
                                              className={`${cellPad} text-center w-16`}
                                              style={{ ...tblLabelStyle, ...thBorder }}
                                            >
                                              {headerText}
                                            </th>
                                          );
                                        }
                                        if (colId === 'grade') {
                                          return (
                                            <th
                                              key={colId}
                                              className={`${cellPad} text-center w-16`}
                                              style={{ ...tblLabelStyle, ...thBorder }}
                                            >
                                              {headerText}
                                            </th>
                                          );
                                        }
                                        if (colId === 'status') {
                                          return (
                                            <th
                                              key={colId}
                                              className={`${cellPad} text-center w-20`}
                                              style={{ ...tblLabelStyle, ...thBorder }}
                                            >
                                              {headerText}
                                            </th>
                                          );
                                        }
                                        return null;
                                      })}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* Grouped Sections */}
                                    {groupedSections.map((grp) => (
                                      <React.Fragment key={grp.groupName}>
                                        <tr
                                          className="font-black text-dark-primary"
                                          style={{
                                            backgroundColor: hexToRgba('#ffe4e6', 0.6),
                                            borderBottom: inlineBorderBottom,
                                            ...tblLabelStyle,
                                          }}
                                        >
                                          <td
                                            colSpan={activeCols.length}
                                            className="py-1 px-2.5 uppercase tracking-wider text-rose-900"
                                            style={{ ...tblLabelStyle }}
                                          >
                                            <i className="fas fa-layer-group text-[10px] mr-1.5 text-rose-600" />
                                            <span>Group: {grp.groupName}</span>
                                            <span className="ml-3 font-normal opacity-80">
                                              (Subtotal: {grp.groupTotalObt} / {grp.groupTotalMax} ·{' '}
                                              {grp.groupPct}%)
                                            </span>
                                          </td>
                                        </tr>
                                        {grp.members.map((s) => (
                                          <tr
                                            key={s.subjectId}
                                            className="hover:bg-slate-50/50"
                                            style={{ borderBottom: inlineBorderBottom }}
                                          >
                                            {activeCols.map((colId, cIdx) => {
                                              const isLast = cIdx === activeCols.length - 1;
                                              const tdBorder =
                                                !isLast && showInline
                                                  ? { borderRight: inlineBorderRight }
                                                  : {};
                                              if (colId === 'subject') {
                                                return (
                                                  <td
                                                    key={colId}
                                                    className={`${cellPad} font-bold text-dark-primary pl-5 print:pl-3`}
                                                    style={{ ...tblValueStyle, ...tdBorder }}
                                                  >
                                                    • {s.subjectName}
                                                  </td>
                                                );
                                              }
                                              if (colId === 'arabicName') {
                                                return (
                                                  <td
                                                    key={colId}
                                                    className={`${cellPad} text-right font-arabic font-semibold text-slate-700 pr-3`}
                                                    dir="rtl"
                                                    style={{ ...tblValueStyle, ...tdBorder }}
                                                  >
                                                    {s.arabicName || '—'}
                                                  </td>
                                                );
                                              }
                                              if (colId === 'maxMarks') {
                                                return (
                                                  <td
                                                    key={colId}
                                                    className={`${cellPad} text-center font-mono`}
                                                    style={{ ...tblValueStyle, ...tdBorder }}
                                                  >
                                                    {s.maxMarks}
                                                  </td>
                                                );
                                              }
                                              if (colId === 'passMarks') {
                                                return (
                                                  <td
                                                    key={colId}
                                                    className={`${cellPad} text-center font-mono`}
                                                    style={{ ...tblValueStyle, ...tdBorder }}
                                                  >
                                                    {s.passMarks || '—'}
                                                  </td>
                                                );
                                              }
                                              if (colId === 'marksObtained') {
                                                const pct =
                                                  s.maxMarks > 0 &&
                                                  typeof s.marksObtained === 'number' &&
                                                  s.maxMarks > (s.passMarks || 0)
                                                    ? Math.min(
                                                        100,
                                                        Math.max(
                                                          0,
                                                          Math.round(
                                                            ((s.marksObtained -
                                                              (s.passMarks || 0)) /
                                                              (s.maxMarks - (s.passMarks || 0))) *
                                                              100
                                                          )
                                                        )
                                                      )
                                                    : 0;
                                                const showBar =
                                                  Boolean(tbl.showMarksBarFill) && pct > 0;
                                                const isVert = tbl.marksBarDirection === 'vertical';
                                                return (
                                                  <td
                                                    key={colId}
                                                    className={`${cellPad} text-center font-black relative overflow-hidden ${
                                                      s.status === 'FAIL'
                                                        ? 'text-rose-600'
                                                        : s.isAbsent
                                                          ? 'text-amber-600'
                                                          : 'text-dark-primary'
                                                    }`}
                                                    style={{ ...tblValueStyle, ...tdBorder }}
                                                  >
                                                    {showBar && (
                                                      <div
                                                        className="absolute pointer-events-none transition-all print:print-color-adjust-exact"
                                                        style={{
                                                          width: isVert ? '100%' : `${pct}%`,
                                                          height: isVert ? `${pct}%` : '100%',
                                                          left: 0,
                                                          bottom: 0,
                                                          top: isVert ? 'auto' : 0,
                                                          backgroundColor:
                                                            tbl.marksBarColor || '#10b981',
                                                          opacity:
                                                            (tbl.marksBarOpacity !== undefined
                                                              ? Number(tbl.marksBarOpacity)
                                                              : 25) / 100,
                                                        }}
                                                      />
                                                    )}
                                                    <span className="relative z-10">
                                                      {s.marksObtained}
                                                    </span>
                                                  </td>
                                                );
                                              }
                                              if (colId === 'percentage') {
                                                return (
                                                  <td
                                                    key={colId}
                                                    className={`${cellPad} text-center font-mono font-bold text-dark-slate`}
                                                    style={{ ...tblValueStyle, ...tdBorder }}
                                                  >
                                                    {typeof s.marksObtained === 'number' &&
                                                    s.maxMarks > 0
                                                      ? `${Math.round((s.marksObtained / s.maxMarks) * 100)}%`
                                                      : '—'}
                                                  </td>
                                                );
                                              }
                                              if (colId === 'grade') {
                                                const gradeColor = getGradeColor(s.grade, activeTemplate?.gradingScale);
                                                return (
                                                  <td
                                                    key={colId}
                                                    className={`${cellPad} text-center font-bold`}
                                                    style={{
                                                      ...tblValueStyle,
                                                      color: gradeColor || '#047857',
                                                      ...tdBorder,
                                                    }}
                                                  >
                                                    {s.grade}
                                                  </td>
                                                );
                                              }
                                              if (colId === 'status') {
                                                return (
                                                  <td
                                                    key={colId}
                                                    className={`${cellPad} text-center font-bold`}
                                                    style={{ ...tblValueStyle, ...tdBorder }}
                                                  >
                                                    <span
                                                      className={
                                                        s.status === 'PASS'
                                                          ? 'text-emerald-700'
                                                          : 'text-rose-700'
                                                      }
                                                    >
                                                      {s.status}
                                                    </span>
                                                  </td>
                                                );
                                              }
                                              return null;
                                            })}
                                          </tr>
                                        ))}
                                      </React.Fragment>
                                    ))}

                                    {/* Ungrouped Individual Subjects */}
                                    {ungroupedScores.map((s, uIdx) => {
                                      const rowBg =
                                        tbl.bandedRows && uIdx % 2 === 1 ? bandedBg : 'transparent';
                                      return (
                                        <tr
                                          key={s.subjectId}
                                          style={{
                                            backgroundColor: rowBg,
                                            borderBottom: inlineBorderBottom,
                                          }}
                                        >
                                          {activeCols.map((colId, cIdx) => {
                                            const isLast = cIdx === activeCols.length - 1;
                                            const tdBorder =
                                              !isLast && showInline
                                                ? { borderRight: inlineBorderRight }
                                                : {};
                                            if (colId === 'subject') {
                                              return (
                                                <td
                                                  key={colId}
                                                  className={`${cellPad} font-bold text-dark-primary`}
                                                  style={{ ...tblValueStyle, ...tdBorder }}
                                                >
                                                  {s.subjectName}
                                                </td>
                                              );
                                            }
                                            if (colId === 'arabicName') {
                                              return (
                                                <td
                                                  key={colId}
                                                  className={`${cellPad} text-right font-arabic font-semibold text-slate-700 pr-3`}
                                                  dir="rtl"
                                                  style={{ ...tblValueStyle, ...tdBorder }}
                                                >
                                                  {s.arabicName || '—'}
                                                </td>
                                              );
                                            }
                                            if (colId === 'maxMarks') {
                                              return (
                                                <td
                                                  key={colId}
                                                  className={`${cellPad} text-center font-mono`}
                                                  style={{ ...tblValueStyle, ...tdBorder }}
                                                >
                                                  {s.maxMarks}
                                                </td>
                                              );
                                            }
                                            if (colId === 'passMarks') {
                                              return (
                                                <td
                                                  key={colId}
                                                  className={`${cellPad} text-center font-mono`}
                                                  style={{ ...tblValueStyle, ...tdBorder }}
                                                >
                                                  {s.passMarks || '—'}
                                                </td>
                                              );
                                            }
                                            if (colId === 'marksObtained') {
                                              const pct =
                                                s.maxMarks > 0 &&
                                                typeof s.marksObtained === 'number' &&
                                                s.maxMarks > (s.passMarks || 0)
                                                  ? Math.min(
                                                      100,
                                                      Math.max(
                                                        0,
                                                        Math.round(
                                                          ((s.marksObtained - (s.passMarks || 0)) /
                                                            (s.maxMarks - (s.passMarks || 0))) *
                                                            100
                                                        )
                                                      )
                                                    )
                                                  : 0;
                                              const showBar =
                                                Boolean(tbl.showMarksBarFill) && pct > 0;
                                              const isVert = tbl.marksBarDirection === 'vertical';
                                              return (
                                                <td
                                                  key={colId}
                                                  className={`${cellPad} text-center font-black relative overflow-hidden ${
                                                    s.status === 'FAIL'
                                                      ? 'text-rose-600'
                                                      : s.isAbsent
                                                        ? 'text-amber-600'
                                                        : 'text-dark-primary'
                                                  }`}
                                                  style={{ ...tblValueStyle, ...tdBorder }}
                                                >
                                                  {showBar && (
                                                    <div
                                                      className="absolute pointer-events-none transition-all print:print-color-adjust-exact"
                                                      style={{
                                                        width: isVert ? '100%' : `${pct}%`,
                                                        height: isVert ? `${pct}%` : '100%',
                                                        left: 0,
                                                        bottom: 0,
                                                        top: isVert ? 'auto' : 0,
                                                        backgroundColor:
                                                          tbl.marksBarColor || '#10b981',
                                                        opacity:
                                                          (tbl.marksBarOpacity !== undefined
                                                            ? Number(tbl.marksBarOpacity)
                                                            : 25) / 100,
                                                      }}
                                                    />
                                                  )}
                                                  <span className="relative z-10">
                                                    {s.marksObtained}
                                                  </span>
                                                </td>
                                              );
                                            }
                                            if (colId === 'percentage') {
                                              return (
                                                <td
                                                  key={colId}
                                                  className={`${cellPad} text-center font-mono font-bold text-dark-slate`}
                                                  style={{ ...tblValueStyle, ...tdBorder }}
                                                >
                                                  {typeof s.marksObtained === 'number' &&
                                                  s.maxMarks > 0
                                                    ? `${Math.round((s.marksObtained / s.maxMarks) * 100)}%`
                                                    : '—'}
                                                </td>
                                              );
                                            }
                                            if (colId === 'grade') {
                                              const gradeColor = getGradeColor(s.grade, activeTemplate?.gradingScale);
                                              return (
                                                <td
                                                  key={colId}
                                                  className={`${cellPad} text-center font-bold`}
                                                  style={{
                                                    ...tblValueStyle,
                                                    color: gradeColor || '#047857',
                                                    ...tdBorder,
                                                  }}
                                                >
                                                  {s.grade}
                                                </td>
                                              );
                                            }
                                            if (colId === 'status') {
                                              return (
                                                <td
                                                  key={colId}
                                                  className={`${cellPad} text-center font-bold`}
                                                  style={{ ...tblValueStyle, ...tdBorder }}
                                                >
                                                  <span
                                                    className={
                                                      s.status === 'PASS'
                                                        ? 'text-emerald-700'
                                                        : 'text-rose-700'
                                                    }
                                                  >
                                                    {s.status}
                                                  </span>
                                                </td>
                                              );
                                            }
                                            return null;
                                          })}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        }

                        case 'summaryCalculations': {
                          if (!activeTemplate.showSummaryCalculations) return null;
                          const sum = activeTemplate.summaryConfig || {};
                          const sumStyle = { ...DEFAULT_BLOCK_STYLE, ...(sum.style || {}) };
                          const isCompact = sum.size === 'compact';
                          const itemOrder =
                            sum.itemOrder || DEFAULT_TEMPLATE.summaryConfig.itemOrder;

                          const hasFailed = Boolean(
                            metrics.hasFailed ||
                            metrics.status === 'FAIL' ||
                            (Array.isArray(subjectScores) &&
                              subjectScores.some(
                                (s) =>
                                  s.status === 'FAIL' ||
                                  Number(s.marksObtained ?? s.marks_obtained) < Number(s.passMarks ?? s.pass_marks ?? 35)
                              ))
                          );

                          const SUMMARY_VALUES = {
                            showGrandTotal: {
                              label: 'Grand Total',
                              value: `${metrics.totalObtained ?? '—'} / ${metrics.totalMax ?? '—'}`,
                              color: '',
                            },
                            showPercentage: {
                              label: 'Percentage',
                              value:
                                typeof metrics.percentage === 'number'
                                  ? `${metrics.percentage}%`
                                  : metrics.percentage || '—',
                              color: sumStyle.contentColor || '#34d399',
                            },
                            showGrade: {
                              label: 'Overall Grade',
                              value: hasFailed ? 'F' : metrics.overallGrade || '—',
                              color: hasFailed ? '#dc2626' : sumStyle.contentColor || '#fbbf24',
                            },
                            showClassRank: {
                              label: 'Class Rank',
                              value: hasFailed
                                ? ''
                                : metrics.classRank
                                  ? `${metrics.classRank ? `#${metrics.classRank}` : ''}${metrics.totalStudents ? ` / ${metrics.totalStudents}` : ''}`
                                  : '—',
                              color: '',
                            },
                            showPassFail: {
                              label: 'Result',
                              value: hasFailed ? 'FAIL' : metrics.status || 'PASS',
                              color:
                                hasFailed
                                  ? '#dc2626'
                                  : metrics.status === 'PASS'
                                    ? sumStyle.contentColor || '#34d399'
                                    : '#f87171',
                            },
                            showTotalSubjects: {
                              label: 'Total Subjects',
                              value: String(subjectScores.length || 0),
                              color: '',
                            },
                          };

                          const visibleItems = itemOrder.filter((k) => sum[k]);
                          const numCols =
                            sum.columns > 0 ? sum.columns : Math.min(visibleItems.length, 5);
                          const gridCols =
                            numCols <= 1
                              ? 'grid-cols-1'
                              : numCols === 2
                                ? 'grid-cols-2'
                                : numCols === 3
                                  ? 'grid-cols-3'
                                  : numCols === 4
                                    ? 'grid-cols-4'
                                    : numCols === 5
                                      ? 'grid-cols-5'
                                      : 'grid-cols-6';

                          return (
                            <div
                              key="summaryCalculations"
                              className={`rounded-2xl print:rounded-lg grid ${gridCols} gap-2.5 print:gap-1 text-center border border-slate-700/50 ${
                                isCompact ? 'p-2.5 print:p-1 text-xs' : 'p-3.5 print:p-1.5 text-sm'
                              }`}
                              style={bleed.innerBgStyle('#0f172a')}
                            >
                              {visibleItems.map((key) => {
                                const item = SUMMARY_VALUES[key];
                                if (!item) return null;
                                return (
                                  <div key={key}>
                                    <span
                                      className="font-bold uppercase block summary-calc-label"
                                      style={{
                                        fontSize: `${summaryPrint.labelFontSize}px`,
                                        color: sumStyle.labelColor || '#94a3b8',
                                      }}
                                    >
                                      {item.label}
                                    </span>
                                    <span
                                      className="font-black font-mono summary-calc-value"
                                      style={{
                                        color: item.color || sumStyle.contentColor || '#ffffff',
                                        fontSize: `${summaryPrint.contentFontSize}px`,
                                      }}
                                    >
                                      {item.value}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        case 'charts': {
                          if (!activeTemplate.showCharts || chartData.length === 0) return null;
                          const ch = activeTemplate.chartConfig || {};

                          // If multi-column charts are defined, render them
                          if (ch.columns && ch.columns.length > 0) {
                            const chartCols = ch.columns;
                            const chartH =
                              ch.height ||
                              (ch.size === 'compact' ? 120 : ch.size === 'large' ? 220 : 160);
                            const accentColor = activeTemplate.accentColor || '#e11d48';
                            const PALETTE = [
                              '#e11d48',
                              '#059669',
                              '#7c3aed',
                              '#0284c7',
                              '#d97706',
                              '#db2777',
                              '#0891b2',
                            ];

                            const isPercentage = (colCfg) => {
                              const d =
                                colCfg.chartData === 'classification'
                                  ? 'grade_classification'
                                  : colCfg.chartData || 'subject_marks';
                              const agg = colCfg.aggregation || 'none';
                              if (d === 'subject_pct' || d === 'overall_pct') return true;
                              if (d === 'subject_classification' && agg !== 'sum' && agg !== 'max')
                                return true;
                              return false;
                            };

                            const buildColData = (colCfg) => {
                              const d =
                                colCfg.chartData === 'classification'
                                  ? 'grade_classification'
                                  : colCfg.chartData || 'subject_marks';
                              const agg = colCfg.aggregation || 'none';

                              if (d === 'subject_marks') {
                                return subjectScores.map((s) => ({
                                  name:
                                    s.subjectName.length > 8
                                      ? s.subjectName.slice(0, 7) + '…'
                                      : s.subjectName,
                                  fullName: s.subjectName,
                                  value: typeof s.marksObtained === 'number' ? s.marksObtained : 0,
                                  Max: s.maxMarks,
                                }));
                              }

                              if (d === 'subject_pct') {
                                return subjectScores.map((s) => ({
                                  name:
                                    s.subjectName.length > 8
                                      ? s.subjectName.slice(0, 7) + '…'
                                      : s.subjectName,
                                  fullName: s.subjectName,
                                  value:
                                    s.maxMarks > 0 && typeof s.marksObtained === 'number'
                                      ? Math.round((s.marksObtained / s.maxMarks) * 100)
                                      : 0,
                                  Max: 100,
                                }));
                              }

                              if (d === 'subject_classification') {
                                const groupsMap = new Map();
                                subjectScores.forEach((s) => {
                                  const key = s.classificationName || 'General';
                                  if (!groupsMap.has(key)) groupsMap.set(key, []);
                                  groupsMap.get(key).push(s);
                                });

                                const result = [];
                                groupsMap.forEach((subList, groupName) => {
                                  const totalObt = subList.reduce(
                                    (acc, curr) =>
                                      acc +
                                      (typeof curr.marksObtained === 'number'
                                        ? curr.marksObtained
                                        : 0),
                                    0
                                  );
                                  const totalMax = subList.reduce(
                                    (acc, curr) => acc + (Number(curr.maxMarks) || 0),
                                    0
                                  );
                                  const count = subList.length;

                                  let val = 0;
                                  if (agg === 'sum') {
                                    val = Math.round(totalObt);
                                  } else if (agg === 'max') {
                                    val = Math.max(
                                      ...subList.map((s) =>
                                        typeof s.marksObtained === 'number' ? s.marksObtained : 0
                                      )
                                    );
                                  } else {
                                    val =
                                      totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
                                  }

                                  const groupSeq =
                                    subList[0]?.classificationSeq !== undefined &&
                                    subList[0]?.classificationSeq !== 999999
                                      ? subList[0].classificationSeq
                                      : CLASSIFICATION_NAME_SEQ_FALLBACK[groupName.toLowerCase()] !== undefined
                                      ? CLASSIFICATION_NAME_SEQ_FALLBACK[groupName.toLowerCase()]
                                      : CLASSIFICATION_SEQ_FALLBACK[String(subList[0]?.classificationId)] !== undefined
                                      ? CLASSIFICATION_SEQ_FALLBACK[String(subList[0]?.classificationId)]
                                      : 999999;

                                  result.push({
                                    name:
                                      groupName.length > 12
                                        ? groupName.slice(0, 10) + '…'
                                        : groupName,
                                    fullName: `${groupName} (${count} subjects)`,
                                    value: val,
                                    count,
                                    seq: groupSeq,
                                    Max: agg === 'sum' ? totalMax : 100,
                                  });
                                });

                                result.sort((a, b) => {
                                  const sA = a.seq ?? 999999;
                                  const sB = b.seq ?? 999999;
                                  if (sA !== sB) return sA - sB;
                                  return (a.name || '').localeCompare(b.name || '');
                                });

                                return result;
                              }

                              if (d === 'grade_classification') {
                                const scale =
                                  Array.isArray(activeTemplate.gradingScale) &&
                                  activeTemplate.gradingScale.length > 0
                                    ? activeTemplate.gradingScale
                                    : DEFAULT_GRADING_SCALE;

                                const counts = {};
                                scale.forEach((g) => {
                                  counts[g.grade] = 0;
                                });
                                subjectScores.forEach((s) => {
                                  if (s.grade && s.grade !== '—') {
                                    counts[s.grade] = (counts[s.grade] || 0) + 1;
                                  }
                                });

                                const isPieOrDonut =
                                  colCfg.chartType === 'pie' || colCfg.chartType === 'donut';
                                const gradeEntries = scale.map((g) => ({
                                  name: g.grade,
                                  fullName: `Grade ${g.grade}`,
                                  value: counts[g.grade] || 0,
                                }));

                                const nonZero = gradeEntries.filter((g) => g.value > 0);
                                return isPieOrDonut || nonZero.length >= 3
                                  ? nonZero.length > 0
                                    ? nonZero
                                    : gradeEntries
                                  : gradeEntries;
                              }

                              if (d === 'attendance') {
                                const attVal =
                                  Number(
                                    String(student.attendance || '').replace(/[^0-9.]/g, '')
                                  ) || 95;
                                return [
                                  { name: 'Present', value: attVal, Max: 100 },
                                  { name: 'Absent', value: Math.max(0, 100 - attVal), Max: 100 },
                                ];
                              }

                              if (d === 'overall_pct') {
                                const pct = Number(metrics.percentage) || 0;
                                return [
                                  { name: 'Score', value: Math.round(pct), Max: 100 },
                                  {
                                    name: 'Remaining',
                                    value: Math.max(0, 100 - Math.round(pct)),
                                    Max: 100,
                                  },
                                ];
                              }

                              return subjectScores.map((s) => ({
                                name: s.subjectName.slice(0, 6),
                                fullName: s.subjectName,
                                value: typeof s.marksObtained === 'number' ? s.marksObtained : 0,
                                Max: s.maxMarks,
                              }));
                            };

                            const isTight = !!ch.tightMargins;

                            const renderPrintChart = (colCfg, h, tight = false) => {
                              const data = buildColData(colCfg);
                              const t = colCfg.chartType || 'bar';
                              const pctMode = isPercentage(colCfg);
                              const cd =
                                colCfg.chartData === 'classification'
                                  ? 'grade_classification'
                                  : colCfg.chartData || 'subject_marks';

                              const userColors = Array.isArray(colCfg.colors)
                                ? colCfg.colors.filter(Boolean)
                                : [];
                              const randomHsl = (i) =>
                                `hsl(${Math.round((i * 137.508) % 360)}, 65%, 52%)`;
                              const getColor = (i) => {
                                if (userColors.length > 0)
                                  return i < userColors.length ? userColors[i] : randomHsl(i);
                                return PALETTE[i % PALETTE.length];
                              };
                              const baseColor = getColor(0) || accentColor;

                              const showValues = !!colCfg.showValues;
                              const showLabels = !!colCfg.showLabels;
                              const showAnyLabel = showValues || showLabels;
                              const labelColor = colCfg.dataLabelColor || '#1e293b';
                              const rawPos = colCfg.dataLabelPosition || 'top';
                              const placement = getLabelPlacement(t, rawPos);
                              const labelSeparator = colCfg.dataLabelSeparator || 'colon';

                              const enrichedData = data.map((d) => {
                                const fVal = pctMode ? `${d.value}%` : `${d.value}`;
                                const nameStr = d.name || '';
                                const displayLabel = formatDataLabel(
                                  nameStr,
                                  fVal,
                                  labelSeparator,
                                  showValues,
                                  showLabels
                                );
                                return {
                                  ...d,
                                  formattedValue: fVal,
                                  displayLabel,
                                };
                              });

                              const scaleType = colCfg.maxScale || 'auto';
                              const axisMax =
                                scaleType === 'pct100'
                                  ? 100
                                  : scaleType === 'custom'
                                    ? Number(colCfg.maxScaleValue) || 100
                                    : pctMode
                                      ? 100
                                      : 'auto';
                              const axisDomain = axisMax === 'auto' ? [0, 'auto'] : [0, axisMax];

                              const tooltipFormatter = (val, name, item) => {
                                const title = item?.payload?.fullName || name;
                                if (pctMode) return [`${val}%`, title];
                                if (cd === 'grade_classification')
                                  return [`${val} subjects`, title];
                                if (item?.payload?.Max)
                                  return [`${val} / ${item.payload.Max}`, title];
                                return [val, title];
                              };

                              // ── Legend Setup: On/Off & Positioning ──
                              const hasLegend =
                                colCfg.showLegend !== undefined
                                  ? !!colCfg.showLegend
                                  : colCfg.chartType === 'donut' || colCfg.chartType === 'pie';
                              const legendPos = colCfg.legendPosition || 'bottom';
                              const legendProps = getLegendProps(legendPos, tight);
                              const legendPayload = enrichedData.map((d, i) => ({
                                value: d.name,
                                type: t === 'line' ? 'line' : 'circle',
                                id: d.name,
                                color: getColor(i),
                              }));

                              // Recharts Legend text formatter with configurable color
                              const renderLegendText = (value, entry) => {
                                const mode = colCfg.legendTextColorMode || 'data_labels_color';
                                const textColor =
                                  mode === 'chart_color'
                                    ? entry.color || entry.payload?.fill || baseColor
                                    : colCfg.dataLabelColor || '#1e293b';
                                return (
                                  <span
                                    className="recharts-legend-item-text font-bold"
                                    style={{ color: textColor }}
                                  >
                                    {value}
                                  </span>
                                );
                              };

                              const getCartesianMargin = (kind) => {
                                let top = tight
                                  ? showAnyLabel && placement.position === 'top'
                                    ? 14
                                    : 2
                                  : showAnyLabel && placement.position === 'top'
                                    ? 16
                                    : 5;
                                let right = tight ? 4 : 8;
                                let left = tight ? -20 : -16;
                                let bottom = tight ? -2 : 2;

                                if (kind === 'horizontal') {
                                  top = tight ? 2 : 4;
                                  right = tight
                                    ? showAnyLabel && placement.position === 'right'
                                      ? 44
                                      : 24
                                    : showAnyLabel && placement.position === 'right'
                                      ? 48
                                      : 28;
                                  left = tight ? 4 : 8;
                                  bottom = tight ? 2 : 4;
                                } else if (kind === 'line' || kind === 'area') {
                                  top = tight
                                    ? showAnyLabel && placement.position === 'top'
                                      ? 14
                                      : 3
                                    : showAnyLabel && placement.position === 'top'
                                      ? 16
                                      : 5;
                                  right = tight ? 4 : 10;
                                  left = tight ? -20 : -16;
                                  bottom = tight ? -2 : 2;
                                }

                                if (hasLegend) {
                                  if (legendPos === 'top') top += 18;
                                  else if (legendPos === 'bottom') bottom += 16;
                                  else if (legendPos === 'left') left += 40;
                                  else if (legendPos === 'right') right += 40;
                                }

                                return { top, right, left, bottom };
                              };

                              // Custom SVG Label Renderer for multi-line (line break) and bounded positioning
                              const renderSvgLabel = (props) => {
                                const { x, y, width, height, value } = props;
                                if (!value && value !== 0) return null;
                                const str = String(value);
                                if (!str) return null;

                                if (str.includes('\n')) {
                                  const lines = str.split('\n');
                                  let tx = x + (width ? width / 2 : 0);
                                  let ty = y + (height ? height / 2 : 0);
                                  let anchor = 'middle';

                                  if (t === 'horizontal_bar' || t === 'stacked_bar_h') {
                                    if (placement.position === 'right') {
                                      tx = x + (width || 0) + 4;
                                      ty = y + (height ? height / 2 : 0);
                                      anchor = 'start';
                                    } else if (placement.position === 'insideRight') {
                                      tx = x + (width || 0) - 4;
                                      ty = y + (height ? height / 2 : 0);
                                      anchor = 'end';
                                    }
                                  } else {
                                    if (placement.position === 'top') {
                                      ty = y - 4;
                                    }
                                  }

                                  return (
                                    <text
                                      x={tx}
                                      y={ty - (lines.length - 1) * 4.5}
                                      fill={labelColor}
                                      textAnchor={anchor}
                                      dominantBaseline="central"
                                      fontSize={tight ? 7.5 : 8}
                                      fontWeight={700}
                                    >
                                      {lines.map((line, idx) => (
                                        <tspan key={idx} x={tx} dy={idx === 0 ? 0 : '1.15em'}>
                                          {line}
                                        </tspan>
                                      ))}
                                    </text>
                                  );
                                }

                                let tx = x + (width ? width / 2 : 0);
                                let ty = y + (height ? height / 2 : 0);
                                let anchor = 'middle';

                                if (t === 'horizontal_bar' || t === 'stacked_bar_h') {
                                  if (placement.position === 'right') {
                                    tx = x + (width || 0) + 4;
                                    anchor = 'start';
                                  } else if (placement.position === 'insideRight') {
                                    tx = x + (width || 0) - 4;
                                    anchor = 'end';
                                  }
                                } else if (placement.position === 'top') {
                                  ty = y - 5;
                                }

                                return (
                                  <text
                                    x={tx}
                                    y={ty}
                                    fill={labelColor}
                                    textAnchor={anchor}
                                    dominantBaseline="central"
                                    fontSize={tight ? 7.5 : 8}
                                    fontWeight={700}
                                  >
                                    {str}
                                  </text>
                                );
                              };

                              if (t === 'text') {
                                return (
                                  <div
                                    className={`flex flex-col ${tight ? 'gap-0.5' : 'gap-1'} justify-center h-full px-1`}
                                  >
                                    {enrichedData.slice(0, 6).map((d, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between text-[9px] font-bold"
                                      >
                                        <span className="text-dark-muted truncate max-w-[60%]">
                                          {d.name}
                                        </span>
                                        <span className="font-black" style={{ color: baseColor }}>
                                          {d.value}
                                          {pctMode
                                            ? '%'
                                            : cd === 'grade_classification'
                                              ? ' subs'
                                              : ''}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }

                              if (t === 'donut' || t === 'pie') {
                                const isPieInside = placement.isInside;
                                const pieData = enrichedData.map((d, i) => ({
                                  ...d,
                                  fill: getColor(i),
                                }));
                                const outerR = tight ? (isPieInside ? '90%' : '80%') : '70%';
                                const innerR = t === 'donut' ? (tight ? '46%' : '40%') : 0;
                                const RADIAN = Math.PI / 180;
                                const piePaddingAngle =
                                  colCfg.sliceGap !== undefined
                                    ? Number(colCfg.sliceGap)
                                    : tight
                                      ? 1
                                      : 2;
                                const defaultOuterR = hasLegend
                                  ? outerR
                                  : tight
                                    ? isPieInside
                                      ? '94%'
                                      : '84%'
                                    : '76%';
                                const effectiveOuterR = colCfg.pieSizePercent
                                  ? `${colCfg.pieSizePercent}%`
                                  : defaultOuterR;
                                const effectiveInnerR =
                                  t === 'donut'
                                    ? colCfg.donutHolePercent
                                      ? `${colCfg.donutHolePercent}%`
                                      : innerR
                                    : 0;

                                let pieCx = '50%';
                                let pieCy = '50%';
                                if (hasLegend) {
                                  if (legendPos === 'left') pieCx = '62%';
                                  else if (legendPos === 'right') pieCx = '38%';
                                  else if (legendPos === 'top') pieCy = '58%';
                                  else if (legendPos === 'bottom') pieCy = '44%';
                                }

                                const renderCustomPieLabel = (props) => {
                                  const {
                                    cx,
                                    cy,
                                    midAngle,
                                    innerRadius,
                                    outerRadius,
                                    payload,
                                    x,
                                    y,
                                  } = props;
                                  const text = payload?.displayLabel || '';
                                  if (!text) return null;

                                  if (isPieInside) {
                                    const ir = Number(innerRadius) || 0;
                                    const or = Number(outerRadius) || 60;
                                    const r = ir + (or - ir) * (t === 'donut' ? 0.52 : 0.6);
                                    const lx = cx + r * Math.cos(-midAngle * RADIAN);
                                    const ly = cy + r * Math.sin(-midAngle * RADIAN);

                                    if (text.includes('\n')) {
                                      const lines = text.split('\n');
                                      return (
                                        <text
                                          x={lx}
                                          y={ly - (lines.length - 1) * 4.5}
                                          fill={labelColor}
                                          textAnchor="middle"
                                          dominantBaseline="central"
                                          fontSize={tight ? 8 : 7.5}
                                          fontWeight={700}
                                        >
                                          {lines.map((l, i) => (
                                            <tspan key={i} x={lx} dy={i === 0 ? 0 : '1.15em'}>
                                              {l}
                                            </tspan>
                                          ))}
                                        </text>
                                      );
                                    }

                                    return (
                                      <text
                                        x={lx}
                                        y={ly}
                                        fill={labelColor}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fontSize={tight ? 8.5 : 8}
                                        fontWeight={700}
                                      >
                                        {text}
                                      </text>
                                    );
                                  }

                                  if (text.includes('\n')) {
                                    const lines = text.split('\n');
                                    const anchor = x > cx ? 'start' : 'end';
                                    return (
                                      <text
                                        x={x}
                                        y={y - (lines.length - 1) * 4.5}
                                        fill={labelColor}
                                        textAnchor={anchor}
                                        dominantBaseline="central"
                                        fontSize={8}
                                        fontWeight={700}
                                      >
                                        {lines.map((l, i) => (
                                          <tspan key={i} x={x} dy={i === 0 ? 0 : '1.15em'}>
                                            {l}
                                          </tspan>
                                        ))}
                                      </text>
                                    );
                                  }

                                  return (
                                    <text
                                      x={x}
                                      y={y}
                                      fill={labelColor}
                                      textAnchor={x > cx ? 'start' : 'end'}
                                      dominantBaseline="central"
                                      fontSize={8}
                                      fontWeight={700}
                                    >
                                      {text}
                                    </text>
                                  );
                                };

                                return (
                                  <ResponsiveContainer width="100%" height={h}>
                                    <PieChart>
                                      <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx={pieCx}
                                        cy={pieCy}
                                        innerRadius={effectiveInnerR}
                                        outerRadius={effectiveOuterR}
                                        paddingAngle={piePaddingAngle}
                                        label={showAnyLabel ? renderCustomPieLabel : undefined}
                                        labelLine={
                                          showAnyLabel && !isPieInside
                                            ? { stroke: labelColor, strokeWidth: 1 }
                                            : false
                                        }
                                      >
                                        {pieData.map((entry, index) => (
                                          <Cell key={index} fill={entry.fill} />
                                        ))}
                                      </Pie>
                                      <Tooltip
                                        contentStyle={{ fontSize: 9 }}
                                        formatter={tooltipFormatter}
                                      />
                                      {hasLegend && (
                                        <Legend
                                          payload={legendPayload}
                                          {...legendProps}
                                          iconSize={tight ? 7 : 8}
                                          formatter={renderLegendText}
                                        />
                                      )}
                                    </PieChart>
                                  </ResponsiveContainer>
                                );
                              }

                              if (t === 'horizontal_bar') {
                                return (
                                  <ResponsiveContainer width="100%" height={h}>
                                    <BarChart
                                      data={enrichedData}
                                      layout="vertical"
                                      margin={getCartesianMargin('horizontal')}
                                      barGap={
                                        colCfg.barGap !== undefined ? Number(colCfg.barGap) : 4
                                      }
                                      barCategoryGap={colCfg.barCategoryGap || '15%'}
                                    >
                                      <CartesianGrid
                                        strokeDasharray="3 3"
                                        horizontal={false}
                                        stroke="#e2e8f0"
                                      />
                                      <XAxis
                                        type="number"
                                        tick={{ fontSize: tight ? 7.5 : 8 }}
                                        domain={axisDomain}
                                        ticks={axisMax === 100 ? [0, 20, 40, 60, 80, 100] : undefined}
                                        allowDataOverflow={false}
                                      />
                                      <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: tight ? 7.5 : 8, fontWeight: 700 }}
                                        width={tight ? 32 : 40}
                                      />
                                      <Tooltip
                                        contentStyle={{ fontSize: 9 }}
                                        formatter={tooltipFormatter}
                                      />
                                      {hasLegend && (
                                        <Legend
                                          payload={legendPayload}
                                          {...legendProps}
                                          iconSize={tight ? 7 : 8}
                                          formatter={renderLegendText}
                                        />
                                      )}
                                      <Bar
                                        dataKey="value"
                                        barSize={
                                          colCfg.barSize ? Number(colCfg.barSize) : undefined
                                        }
                                        radius={
                                          colCfg.barRadius !== undefined
                                            ? [
                                                0,
                                                Number(colCfg.barRadius),
                                                Number(colCfg.barRadius),
                                                0,
                                              ]
                                            : [0, 3, 3, 0]
                                        }
                                      >
                                        {enrichedData.map((_, i) => (
                                          <Cell key={i} fill={getColor(i)} />
                                        ))}
                                        {showAnyLabel && (
                                          <LabelList
                                            dataKey="displayLabel"
                                            content={renderSvgLabel}
                                          />
                                        )}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                );
                              }

                              if (t === 'stacked_bar') {
                                return (
                                  <ResponsiveContainer width="100%" height={h}>
                                    <BarChart
                                      data={enrichedData}
                                      margin={getCartesianMargin('vertical')}
                                      barGap={
                                        colCfg.barGap !== undefined ? Number(colCfg.barGap) : 4
                                      }
                                      barCategoryGap={colCfg.barCategoryGap || '15%'}
                                    >
                                      <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#e2e8f0"
                                      />
                                      <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: tight ? 7.5 : 8, fontWeight: 700 }}
                                      />
                                      <YAxis
                                        tick={{ fontSize: tight ? 7.5 : 8 }}
                                        domain={axisDomain}
                                      />
                                      <Tooltip
                                        contentStyle={{ fontSize: 9 }}
                                        formatter={tooltipFormatter}
                                      />
                                      {hasLegend && (
                                        <Legend
                                          payload={legendPayload}
                                          {...legendProps}
                                          iconSize={tight ? 7 : 8}
                                          formatter={renderLegendText}
                                        />
                                      )}
                                      <Bar
                                        dataKey="value"
                                        stackId="a"
                                        fill={getColor(0)}
                                        barSize={
                                          colCfg.barSize ? Number(colCfg.barSize) : undefined
                                        }
                                        radius={
                                          colCfg.barRadius !== undefined
                                            ? [
                                                Number(colCfg.barRadius),
                                                Number(colCfg.barRadius),
                                                0,
                                                0,
                                              ]
                                            : undefined
                                        }
                                      >
                                        {showAnyLabel && (
                                          <LabelList
                                            dataKey="displayLabel"
                                            content={renderSvgLabel}
                                          />
                                        )}
                                      </Bar>
                                      {enrichedData[0]?.Max && (
                                        <Bar dataKey="Max" stackId="a" fill="#e2e8f0" />
                                      )}
                                    </BarChart>
                                  </ResponsiveContainer>
                                );
                              }

                              if (t === 'stacked_bar_h') {
                                return (
                                  <ResponsiveContainer width="100%" height={h}>
                                    <BarChart
                                      data={enrichedData}
                                      layout="vertical"
                                      margin={getCartesianMargin('horizontal')}
                                      barGap={
                                        colCfg.barGap !== undefined ? Number(colCfg.barGap) : 4
                                      }
                                      barCategoryGap={colCfg.barCategoryGap || '15%'}
                                    >
                                      <CartesianGrid
                                        strokeDasharray="3 3"
                                        horizontal={false}
                                        stroke="#e2e8f0"
                                      />
                                      <XAxis
                                        type="number"
                                        tick={{ fontSize: tight ? 7.5 : 8 }}
                                        domain={axisDomain}
                                        ticks={axisMax === 100 ? [0, 20, 40, 60, 80, 100] : undefined}
                                        allowDataOverflow={false}
                                      />
                                      <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: tight ? 7.5 : 8, fontWeight: 700 }}
                                        width={tight ? 32 : 40}
                                      />
                                      <Tooltip
                                        contentStyle={{ fontSize: 9 }}
                                        formatter={tooltipFormatter}
                                      />
                                      {hasLegend && (
                                        <Legend
                                          payload={legendPayload}
                                          {...legendProps}
                                          iconSize={tight ? 7 : 8}
                                          formatter={renderLegendText}
                                        />
                                      )}
                                      <Bar
                                        dataKey="value"
                                        stackId="a"
                                        fill={getColor(0)}
                                        barSize={
                                          colCfg.barSize ? Number(colCfg.barSize) : undefined
                                        }
                                        radius={
                                          colCfg.barRadius !== undefined
                                            ? [
                                                0,
                                                Number(colCfg.barRadius),
                                                Number(colCfg.barRadius),
                                                0,
                                              ]
                                            : undefined
                                        }
                                      >
                                        {showAnyLabel && (
                                          <LabelList
                                            dataKey="displayLabel"
                                            content={renderSvgLabel}
                                          />
                                        )}
                                      </Bar>
                                      {enrichedData[0]?.Max && (
                                        <Bar dataKey="Max" stackId="a" fill="#e2e8f0" />
                                      )}
                                    </BarChart>
                                  </ResponsiveContainer>
                                );
                              }

                              if (t === 'line') {
                                return (
                                  <ResponsiveContainer width="100%" height={h}>
                                    <LineChart
                                      data={enrichedData}
                                      margin={getCartesianMargin('line')}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                      <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: tight ? 7.5 : 8, fontWeight: 700 }}
                                      />
                                      <YAxis
                                        tick={{ fontSize: tight ? 7.5 : 8 }}
                                        domain={axisDomain}
                                      />
                                      <Tooltip
                                        contentStyle={{ fontSize: 9 }}
                                        formatter={tooltipFormatter}
                                      />
                                      {hasLegend && (
                                        <Legend
                                          payload={legendPayload}
                                          {...legendProps}
                                          iconSize={tight ? 7 : 8}
                                          formatter={renderLegendText}
                                        />
                                      )}
                                      <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke={baseColor}
                                        strokeWidth={
                                          colCfg.lineWidth ? Number(colCfg.lineWidth) : 2
                                        }
                                        dot={{
                                          r:
                                            colCfg.dotSize !== undefined
                                              ? Number(colCfg.dotSize)
                                              : 3,
                                          fill: baseColor,
                                        }}
                                      >
                                        {showAnyLabel && (
                                          <LabelList
                                            dataKey="displayLabel"
                                            content={renderSvgLabel}
                                          />
                                        )}
                                      </Line>
                                    </LineChart>
                                  </ResponsiveContainer>
                                );
                              }

                              if (t === 'area') {
                                return (
                                  <ResponsiveContainer width="100%" height={h}>
                                    <AreaChart
                                      data={enrichedData}
                                      margin={getCartesianMargin('area')}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                      <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: tight ? 7.5 : 8, fontWeight: 700 }}
                                      />
                                      <YAxis
                                        tick={{ fontSize: tight ? 7.5 : 8 }}
                                        domain={axisDomain}
                                      />
                                      <Tooltip
                                        contentStyle={{ fontSize: 9 }}
                                        formatter={tooltipFormatter}
                                      />
                                      {hasLegend && (
                                        <Legend
                                          payload={legendPayload}
                                          {...legendProps}
                                          iconSize={tight ? 7 : 8}
                                          formatter={renderLegendText}
                                        />
                                      )}
                                      <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={baseColor}
                                        strokeWidth={
                                          colCfg.lineWidth ? Number(colCfg.lineWidth) : 2
                                        }
                                        fillOpacity={0.25}
                                        fill={baseColor}
                                      >
                                        {showAnyLabel && (
                                          <LabelList
                                            dataKey="displayLabel"
                                            content={renderSvgLabel}
                                          />
                                        )}
                                      </Area>
                                    </AreaChart>
                                  </ResponsiveContainer>
                                );
                              }

                              return (
                                <ResponsiveContainer width="100%" height={h}>
                                  <BarChart
                                    data={enrichedData}
                                    margin={getCartesianMargin('vertical')}
                                    barGap={colCfg.barGap !== undefined ? Number(colCfg.barGap) : 4}
                                    barCategoryGap={colCfg.barCategoryGap || '15%'}
                                  >
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      vertical={false}
                                      stroke="#e2e8f0"
                                    />
                                    <XAxis
                                      dataKey="name"
                                      tick={{ fontSize: tight ? 7.5 : 8, fontWeight: 700 }}
                                    />
                                    <YAxis
                                      tick={{ fontSize: tight ? 7.5 : 8 }}
                                      domain={axisDomain}
                                    />
                                    <Tooltip
                                      contentStyle={{ fontSize: 9 }}
                                      formatter={tooltipFormatter}
                                    />
                                    <Bar
                                      dataKey="value"
                                      barSize={colCfg.barSize ? Number(colCfg.barSize) : undefined}
                                      radius={
                                        colCfg.barRadius !== undefined
                                          ? [
                                              Number(colCfg.barRadius),
                                              Number(colCfg.barRadius),
                                              0,
                                              0,
                                            ]
                                          : [3, 3, 0, 0]
                                      }
                                    >
                                      {enrichedData.map((_, index) => (
                                        <Cell key={index} fill={getColor(index)} />
                                      ))}
                                      {showAnyLabel && (
                                        <LabelList
                                          dataKey="displayLabel"
                                          content={renderSvgLabel}
                                        />
                                      )}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              );
                            };

                            const totalCols = chartCols.length;
                            const gridTemplateStyle =
                              totalCols > 1
                                ? {
                                    gridTemplateColumns: chartCols
                                      .map(
                                        (c) =>
                                          `minmax(0, ${c.widthPercent || Math.round(100 / totalCols)}fr)`
                                      )
                                      .join(' '),
                                  }
                                : undefined;

                            const chSt = { ...DEFAULT_BLOCK_STYLE, ...(ch.style || {}) };

                            return (
                              <div
                                key="charts"
                                className={`${isTight ? 'p-1.5 print:p-0.5 space-y-1 print:space-y-0.5' : 'p-3 print:p-1.5 space-y-1.5 print:space-y-0.5'} border border-slate-200 rounded-2xl print:rounded-lg transition-all`}
                                style={bleed.innerBgStyle('#f8fafc')}
                              >
                                <div
                                  className={`grid ${totalCols === 1 ? 'grid-cols-1' : ''} ${isTight ? 'gap-1.5 print:gap-1' : 'gap-3'}`}
                                  style={gridTemplateStyle}
                                >
                                  {chartCols.map((colCfg, colIdx) => {
                                    const colH = colCfg.height ? Number(colCfg.height) : chartH;
                                    return (
                                      <div
                                        key={colIdx}
                                        className={`${isTight ? 'space-y-0.5' : 'space-y-1'} min-w-0 w-full overflow-hidden`}
                                      >
                                        {colCfg.title && (
                                          <h5
                                            className="font-black text-dark-primary uppercase tracking-wider text-center chart-column-title mb-1"
                                            style={{
                                              fontSize: `${chartPrint.titleFontSize}px`,
                                              color: chSt.labelColor || undefined,
                                            }}
                                          >
                                            {colCfg.title}
                                          </h5>
                                        )}
                                        <div style={{ height: `${colH}px` }}>
                                          {renderPrintChart(colCfg, colH, isTight)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }

                        case 'remarks': {
                          if (!activeTemplate.showTeacherRemarks) return null;
                          const rmk = activeTemplate.remarksConfig || {};
                          const isCompact = rmk.size === 'compact';
                          const rmkSt = { ...DEFAULT_BLOCK_STYLE, ...(rmk.style || {}) };

                          const studentRemarks = studentRemarksMap[String(student.id)] || {};
                          const effectiveRemarks =
                            studentRemarks.remarks !== undefined
                              ? studentRemarks.remarks
                              : activeTemplate.remarksText || '';
                          const effectiveRecommendations =
                            studentRemarks.recommendations !== undefined
                              ? studentRemarks.recommendations
                              : rmk.recommendationsText || '';

                          return (
                            <div
                              key="remarks"
                              className={`border border-amber-200 rounded-2xl print:rounded-lg space-y-1.5 print:space-y-0.5 relative group ${
                                isCompact ? 'p-2 print:p-1' : 'p-3.5 print:p-1.5'
                              }`}
                              style={bleed.innerBgStyle('rgb(255 251 235 / 0.6)')}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className="font-black uppercase tracking-wider block remarks-label"
                                  style={{
                                    color: rmkSt.labelColor || '#78350f',
                                    fontSize: `${remarksPrint.labelFontSize}px`,
                                  }}
                                >
                                  {rmk.title || "Teacher's Remarks"}:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRemarksStudentId(String(student.id));
                                    setRemarksForm({
                                      remarks: effectiveRemarks,
                                      recommendations: effectiveRecommendations,
                                    });
                                    setIsRemarksModalOpen(true);
                                  }}
                                  className="print:hidden text-[9px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 opacity-80 group-hover:opacity-100"
                                  title="Edit remarks for this student"
                                >
                                  <i className="fas fa-edit text-[8px]" />
                                  <span>Edit Remarks</span>
                                </button>
                              </div>
                              <p
                                className="italic font-medium remarks-content"
                                style={{
                                  color: rmkSt.contentColor || '#0f172a',
                                  fontSize: `${remarksPrint.contentFontSize}px`,
                                }}
                              >
                                &quot;{effectiveRemarks}&quot;
                              </p>

                              {rmk.showRecommendations !== false && effectiveRecommendations && (
                                <div className="pt-1.5 border-t border-amber-200/60 print:pt-0.5">
                                  <span
                                    className="font-black uppercase tracking-wider block remarks-label"
                                    style={{
                                      color: rmkSt.labelColor || '#78350f',
                                      fontSize: `${remarksPrint.labelFontSize}px`,
                                    }}
                                  >
                                    {rmk.recommendationsTitle || 'Recommendations'}:
                                  </span>
                                  <p
                                    className="italic font-medium remarks-content"
                                    style={{
                                      color: rmkSt.contentColor || '#0f172a',
                                      fontSize: `${remarksPrint.contentFontSize}px`,
                                    }}
                                  >
                                    &quot;{effectiveRecommendations}&quot;
                                  </p>
                                </div>
                              )}

                              {rmk.showPromotion && (
                                <p
                                  className="mt-1 font-bold uppercase tracking-wider remarks-content"
                                  style={{
                                    fontSize: `${remarksPrint.labelFontSize}px`,
                                    color: rmkSt.contentColor || '#065f46',
                                  }}
                                >
                                  Status: Eligible for promotion to next grade level.
                                </p>
                              )}
                            </div>
                          );
                        }

                        case 'signatures': {
                          if (!activeTemplate.showSignatures) return null;
                          const sigCfg = activeTemplate.signaturesConfig || {};
                          const sigSt = { ...DEFAULT_BLOCK_STYLE, ...(sigCfg.style || {}) };
                          const isCompact = sigCfg.size === 'compact';
                          const isTall = sigCfg.size === 'tall';
                          const ptClass = isCompact
                            ? 'pt-3 print:pt-1.5'
                            : isTall
                              ? 'pt-8 print:pt-3'
                              : 'pt-6 print:pt-2';

                          const isSig1 =
                            sigCfg.showSignature1 !== undefined ? !!sigCfg.showSignature1 : true;
                          const isSig2 =
                            sigCfg.showSignature2 !== undefined ? !!sigCfg.showSignature2 : true;
                          const isSig3 =
                            sigCfg.showSignature3 !== undefined ? !!sigCfg.showSignature3 : true;
                          const isSig4 =
                            sigCfg.showSignature4 !== undefined ? !!sigCfg.showSignature4 : true;

                          const activeSigs = [
                            isSig1 && {
                              id: 'signature1',
                              title: activeTemplate.signatures?.signature1 || 'Signature 1',
                              subtitle: 'Signature',
                            },
                            isSig2 && {
                              id: 'signature2',
                              title: activeTemplate.signatures?.signature2 || 'Signature 2',
                              subtitle: 'Signature',
                            },
                            isSig3 && {
                              id: 'signature3',
                              title: activeTemplate.signatures?.signature3 || 'Signature 3',
                              subtitle: 'Seal & Signature',
                            },
                            isSig4 && {
                              id: 'signature4',
                              title: activeTemplate.signatures?.signature4 || 'Signature 4',
                              subtitle: 'Signature',
                            },
                          ].filter(Boolean);

                          if (activeSigs.length === 0) return null;

                          return (
                            <div
                              key="signatures"
                              className={`report-card-signatures ${ptClass} grid gap-4 print:gap-2 text-center ${
                                activeSigs.length === 1 ? 'max-w-xs mx-auto' : ''
                              }`}
                              style={{
                                gridTemplateColumns: `repeat(${activeSigs.length}, minmax(0, 1fr))`,
                                ...bleed.innerBgStyle('transparent'),
                              }}
                            >
                              {activeSigs.map((sig) => (
                                <div
                                  key={sig.id}
                                  className="border-t border-slate-900 pt-1.5 print:pt-0.5 space-y-0.5"
                                >
                                  <span
                                    className="font-bold text-dark-slate block truncate signature-title"
                                    style={{
                                      fontSize: `${signaturesPrint.labelFontSize}px`,
                                      color: sigSt.labelColor || undefined,
                                    }}
                                  >
                                    {sig.title}
                                  </span>
                                  <span
                                    className="text-dark-muted block truncate signature-subtitle"
                                    style={{
                                      fontSize: `${signaturesPrint.contentFontSize}px`,
                                    }}
                                  >
                                    {sig.subtitle}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }

                        default:
                          return null;
                      }
                    })();

                    const pageNumber = studentIdx + 1;
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
                    <div className="pt-2 print:pt-1 border-t border-slate-200 print:border-slate-300 grading-scale-legend">
                      <span
                        className="font-black uppercase text-dark-muted block mb-0.5"
                        style={{ fontSize: `${gradingScalePrint.fontSize}px` }}
                      >
                        Grading Criteria Legend:
                      </span>
                      <div
                        className="flex flex-wrap gap-1.5 text-dark-slate"
                        style={{ fontSize: `${gradingScalePrint.fontSize}px` }}
                      >
                        {activeTemplate.gradingScale.map((g) => (
                          <span
                            key={g.grade}
                            className="bg-slate-100 print:bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200 font-bold"
                            style={{ fontSize: `${gradingScalePrint.fontSize}px` }}
                          >
                            <strong>{g.grade}</strong> ({g.minPercentage}% - {g.maxPercentage}%
                            {g.description ? ` · ${g.description}` : ''})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── ExtraComponent / Logo Layers: Foreground layers (z-30, above content) ── */}
                <ExtraComponentLayers
                  currentConfig={activeTemplate}
                  position="foreground"
                  pageNumber={studentIdx + 1}
                  totalPages={displayedStudents.length}
                />
              </div>
            );
          })}
        </div>
      )}

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
