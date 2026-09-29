// src/components/examinations/ReportCardDesigner.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import MultiSelectDropdown from '../MultiSelectDropdown';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { getAdminConfig, saveAdminConfig } from '../../utils/adminConfigUtils';
import { useCanAccess } from '../portal-shared/ConditionalBlock';

const TEMPLATES_CONFIG_KEY = 'exam_progress_report_templates';
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

/**
 * Standard Default Grading Scale
 * Fully configurable per template: Grade letter, percentage range, description/remarks, and GPA
 */
export const DEFAULT_GRADING_SCALE = [
  { grade: 'A+', minPercentage: 90, maxPercentage: 100, description: 'Outstanding', gpa: 4.0 },
  { grade: 'A', minPercentage: 80, maxPercentage: 89.99, description: 'Excellent', gpa: 3.7 },
  { grade: 'B', minPercentage: 70, maxPercentage: 79.99, description: 'Very Good', gpa: 3.0 },
  { grade: 'C', minPercentage: 60, maxPercentage: 69.99, description: 'Good', gpa: 2.0 },
  { grade: 'D', minPercentage: 50, maxPercentage: 59.99, description: 'Satisfactory', gpa: 1.0 },
  {
    grade: 'F',
    minPercentage: 0,
    maxPercentage: 49.99,
    description: 'Needs Improvement',
    gpa: 0.0,
  },
];

/**
 * Helper to compute grade from percentage using the active grading scale
 */
export const calculateGrade = (pct, scale = DEFAULT_GRADING_SCALE) => {
  if (pct === null || pct === undefined || isNaN(pct)) return '—';
  const num = Number(pct);
  const activeScale = Array.isArray(scale) && scale.length > 0 ? scale : DEFAULT_GRADING_SCALE;
  const sorted = [...activeScale].sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage));
  for (const tier of sorted) {
    if (num >= Number(tier.minPercentage)) {
      return tier.grade;
    }
  }
  return sorted[sorted.length - 1]?.grade || 'F';
};

const PREVIEW_STUDENT = {
  id: 'preview_1',
  student_name: 'Zainab Fatima',
  admission_no: 'JZV-2024-089',
  class_name: 'Grade 10 - Section A',
  roll_no: '14',
  father_name: 'Mohammed Tariq',
  dob: '2010-04-15',
  gender: 'Female',
  blood_group: 'O+',
  attendance: '96%',
};

const RAW_PREVIEW_SCORES = [
  {
    subjectId: '1',
    subjectName: 'English Literature',
    arabicName: 'الأدب الإنجليزي',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 88,
    status: 'PASS',
  },
  {
    subjectId: '2',
    subjectName: 'Mathematics',
    arabicName: 'الرياضيات',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 94,
    status: 'PASS',
  },
  {
    subjectId: '3',
    subjectName: 'Physics',
    arabicName: 'الفيزياء',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 82,
    status: 'PASS',
  },
  {
    subjectId: '4',
    subjectName: 'Chemistry',
    arabicName: 'الكيمياء',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 79,
    status: 'PASS',
  },
  {
    subjectId: '5',
    subjectName: 'Biology',
    arabicName: 'علم الأحياء',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 91,
    status: 'PASS',
  },
  {
    subjectId: '6',
    subjectName: 'Islamic Studies',
    arabicName: 'الدراسات الإسلامية',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 96,
    status: 'PASS',
  },
  {
    subjectId: '7',
    subjectName: 'Social Studies',
    arabicName: 'الدراسات الاجتماعية',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 85,
    status: 'PASS',
  },
];

export const DEFAULT_TABLE_COLUMN_ORDER = [
  'subject',
  'arabicName',
  'maxMarks',
  'passMarks',
  'marksObtained',
  'percentage',
  'grade',
  'status',
];

export const TABLE_COLUMN_LABELS = {
  subject: 'Subject Name (English)',
  arabicName: 'Arabic Name (المادة)',
  maxMarks: 'Max Marks',
  passMarks: 'Pass Marks',
  marksObtained: 'Marks Scored',
  percentage: 'Percentage (%)',
  grade: 'Letter Grade',
  status: 'Pass / Fail',
};

export const getActiveTableColumns = (tblConfig = {}) => {
  const configuredOrder =
    Array.isArray(tblConfig.columnOrder) && tblConfig.columnOrder.length > 0
      ? tblConfig.columnOrder
      : DEFAULT_TABLE_COLUMN_ORDER;

  // Merge any missing default columns to ensure none are lost
  const fullOrder = [...configuredOrder];
  DEFAULT_TABLE_COLUMN_ORDER.forEach((c) => {
    if (!fullOrder.includes(c)) fullOrder.push(c);
  });

  return fullOrder.filter((colId) => {
    if (colId === 'subject') return true;
    if (colId === 'arabicName') return !!tblConfig.showArabicName;
    if (colId === 'maxMarks') return tblConfig.showMaxMarks !== false;
    if (colId === 'passMarks') return tblConfig.showPassMarks !== false;
    if (colId === 'marksObtained') return tblConfig.showMarksObtained !== false;
    if (colId === 'percentage') return !!tblConfig.showPercentage;
    if (colId === 'grade') return tblConfig.showGrade !== false;
    if (colId === 'status') return tblConfig.showStatus !== false;
    return false;
  });
};

/**
 * Drag & Drop Report Card Template Designer
 * Allows configuring layout, reordering blocks, custom subject groupings,
 * headers, footers, tables, charts, grading rules, and sizing per visual block.
 */
export const DEFAULT_TEMPLATE = {
  id: 'standard-report',
  name: 'Standard Comprehensive Report Card',
  pageSize: 'A4',
  orientation: 'portrait',
  accentColor: '#e11d48', // rose-600
  secondaryColor: '#059669', // emerald-600
  showSchoolHeader: true,
  schoolHeader: {
    title: 'Jamia Zaytoonah High School',
    subtitle: 'Centre for Academic & Islamic Excellence',
    address: 'Campus Road, Bangalore, Karnataka',
    logoUrl: '/media/jzv-cap-logo.png',
    examTitle: 'Annual Assessment & Term Examination',
    size: 'standard', // 'compact' | 'standard' | 'large'
    showTitle: true,
    showLogo: true,
    showSubtitle: true,
    showAddress: true,
    showExamTitle: true,
    showHeaderImage: false,
    headerImageUrl: '',
  },
  showStudentInfo: true,
  studentFields: {
    name: true,
    admissionNo: true,
    className: true,
    rollNo: true,
    fatherName: false,
    dob: false,
    gender: false,
    bloodGroup: false,
    attendance: false,
  },
  studentInfoConfig: {
    size: 'standard', // 'compact' | 'standard' | 'large'
    columns: 4, // 2 | 3 | 4
  },
  showSubjectTable: true,
  subjectTableConfig: {
    showArabicName: false,
    showMaxMarks: true,
    showPassMarks: true,
    showMarksObtained: true,
    showPercentage: false,
    showGrade: true,
    showStatus: true,
    bandedRows: true,
    size: 'standard', // 'compact' | 'standard' | 'spacious'
    columnOrder: [
      'subject',
      'arabicName',
      'maxMarks',
      'passMarks',
      'marksObtained',
      'percentage',
      'grade',
      'status',
    ],
  },
  subjectGroups: [],
  showCharts: true,
  chartConfig: {
    type: 'bar', // 'bar' | 'horizontal_bar' | 'radar' | 'line' | 'area'
    title: 'Subject Performance Analysis',
    height: 180,
    size: 'standard', // 'compact' | 'standard' | 'large'
  },
  showSummaryCalculations: true,
  summaryConfig: {
    showGrandTotal: true,
    showPercentage: true,
    showGrade: true,
    showClassRank: true,
    showPassFail: true,
    showTotalSubjects: false,
    size: 'standard', // 'compact' | 'standard' | 'large'
  },
  showTeacherRemarks: true,
  remarksText: 'Hard work and continuous dedication bring great achievements.',
  remarksConfig: {
    title: 'Teacher Remarks & Recommendations',
    size: 'standard', // 'compact' | 'standard' | 'spacious'
    showSignatureLine: false,
    showPromotion: false,
  },
  showSignatures: true,
  signatures: {
    classTeacher: 'Class Teacher',
    coordinator: 'Academic Coordinator',
    principal: 'Principal',
    parent: 'Parent / Guardian',
  },
  signaturesConfig: {
    size: 'standard', // 'compact' | 'standard' | 'tall'
    showClassTeacher: true,
    showCoordinator: true,
    showPrincipal: true,
    showParent: true,
    showDate: false,
  },
  // Grading scale configuration & display legend
  showGradingScale: false,
  gradingScale: DEFAULT_GRADING_SCALE,
  // Order of visual blocks
  blockOrder: [
    'schoolHeader',
    'studentInfo',
    'subjectTable',
    'summaryCalculations',
    'charts',
    'remarks',
    'signatures',
  ],
};

const BLOCK_LABELS = {
  schoolHeader: { name: 'School Header & Logo', icon: 'fa-school' },
  studentInfo: { name: 'Student Profile Details', icon: 'fa-id-card' },
  subjectTable: { name: 'Subject Marks Table', icon: 'fa-table-cells' },
  summaryCalculations: { name: 'Performance Summary & Totals', icon: 'fa-calculator' },
  charts: { name: 'Performance Graph / Chart', icon: 'fa-chart-column' },
  remarks: { name: 'Teacher Remarks & Notes', icon: 'fa-comment-dots' },
  signatures: { name: 'Signatures & Verification Footer', icon: 'fa-file-signature' },
};

const ReportCardDesigner = ({
  template = null,
  templates = [],
  selectedTemplateId = null,
  onSelectTemplate,
  availableSubjects = [],
  onSave,
  onClose,
  userRoles = [],
}) => {
  const canAccess = useCanAccess(userRoles);
  const canEdit = canAccess('report-card-designer-edit');

  const [internalTemplates, setInternalTemplates] = useState(templates);
  const [internalSubjects, setInternalSubjects] = useState(availableSubjects);

  const effectiveTemplates = useMemo(() => {
    return Array.isArray(templates) && templates.length > 0 ? templates : internalTemplates;
  }, [templates, internalTemplates]);

  const effectiveSubjects = useMemo(() => {
    return Array.isArray(availableSubjects) && availableSubjects.length > 0
      ? availableSubjects
      : internalSubjects;
  }, [availableSubjects, internalSubjects]);

  const [currentConfig, setCurrentConfig] = useState(() => ({
    ...DEFAULT_TEMPLATE,
    ...(template || {}),
    schoolHeader: { ...DEFAULT_TEMPLATE.schoolHeader, ...(template?.schoolHeader || {}) },
    studentFields: { ...DEFAULT_TEMPLATE.studentFields, ...(template?.studentFields || {}) },
    studentInfoConfig: {
      ...DEFAULT_TEMPLATE.studentInfoConfig,
      ...(template?.studentInfoConfig || {}),
    },
    subjectTableConfig: {
      ...DEFAULT_TEMPLATE.subjectTableConfig,
      ...(template?.subjectTableConfig || {}),
    },
    summaryConfig: { ...DEFAULT_TEMPLATE.summaryConfig, ...(template?.summaryConfig || {}) },
    chartConfig: { ...DEFAULT_TEMPLATE.chartConfig, ...(template?.chartConfig || {}) },
    remarksConfig: { ...DEFAULT_TEMPLATE.remarksConfig, ...(template?.remarksConfig || {}) },
    signatures: { ...DEFAULT_TEMPLATE.signatures, ...(template?.signatures || {}) },
    signaturesConfig: {
      ...DEFAULT_TEMPLATE.signaturesConfig,
      ...(template?.signaturesConfig || {}),
    },
    gradingScale:
      template?.gradingScale && template.gradingScale.length > 0
        ? template.gradingScale
        : DEFAULT_GRADING_SCALE,
    showGradingScale: template?.showGradingScale ?? false,
    blockOrder: template?.blockOrder || DEFAULT_TEMPLATE.blockOrder,
    subjectGroups: template?.subjectGroups || [],
  }));

  // Auto-fetch remote templates if running standalone (no templates passed via props)
  useEffect(() => {
    if ((!templates || templates.length === 0) && internalTemplates.length === 0) {
      const loadRemoteTemplates = async () => {
        try {
          const data = await getAdminConfig(TEMPLATES_CONFIG_KEY, [DEFAULT_TEMPLATE]);
          if (data && Array.isArray(data) && data.length > 0) {
            setInternalTemplates(data);
            if (!template?.id) {
              const firstTpl = data[0];
              setCurrentConfig({
                ...DEFAULT_TEMPLATE,
                ...firstTpl,
                schoolHeader: {
                  ...DEFAULT_TEMPLATE.schoolHeader,
                  ...(firstTpl.schoolHeader || {}),
                },
                studentFields: {
                  ...DEFAULT_TEMPLATE.studentFields,
                  ...(firstTpl.studentFields || {}),
                },
                studentInfoConfig: {
                  ...DEFAULT_TEMPLATE.studentInfoConfig,
                  ...(firstTpl.studentInfoConfig || {}),
                },
                subjectTableConfig: {
                  ...DEFAULT_TEMPLATE.subjectTableConfig,
                  ...(firstTpl.subjectTableConfig || {}),
                },
                summaryConfig: {
                  ...DEFAULT_TEMPLATE.summaryConfig,
                  ...(firstTpl.summaryConfig || {}),
                },
                chartConfig: {
                  ...DEFAULT_TEMPLATE.chartConfig,
                  ...(firstTpl.chartConfig || {}),
                },
                remarksConfig: {
                  ...DEFAULT_TEMPLATE.remarksConfig,
                  ...(firstTpl.remarksConfig || {}),
                },
                signatures: {
                  ...DEFAULT_TEMPLATE.signatures,
                  ...(firstTpl.signatures || {}),
                },
                signaturesConfig: {
                  ...DEFAULT_TEMPLATE.signaturesConfig,
                  ...(firstTpl.signaturesConfig || {}),
                },
                gradingScale:
                  firstTpl.gradingScale && firstTpl.gradingScale.length > 0
                    ? firstTpl.gradingScale
                    : DEFAULT_GRADING_SCALE,
                showGradingScale: firstTpl.showGradingScale ?? false,
                blockOrder: firstTpl.blockOrder || DEFAULT_TEMPLATE.blockOrder,
                subjectGroups: firstTpl.subjectGroups || [],
              });
            }
          }
        } catch (err) {
          console.warn('[ReportCardDesigner] Failed to load remote templates:', err);
        }
      };
      loadRemoteTemplates();
    }
  }, [templates, internalTemplates.length, template?.id]);

  // Auto-fetch subjects if running standalone
  useEffect(() => {
    if ((!availableSubjects || availableSubjects.length === 0) && internalSubjects.length === 0) {
      const loadSubjects = async () => {
        try {
          const { data } = await supabase.from('syl_subjects').select('*').order('name');
          if (data && data.length > 0) {
            setInternalSubjects(data);
          }
        } catch (err) {
          console.warn('[ReportCardDesigner] Failed to load subjects:', err);
        }
      };
      loadSubjects();
    }
  }, [availableSubjects, internalSubjects.length]);

  // Sync external template changes if any
  useEffect(() => {
    if (template && template.id) {
      setCurrentConfig((prev) => {
        if (prev.id === template.id && prev.name === template.name) return prev;
        return {
          ...DEFAULT_TEMPLATE,
          ...template,
          schoolHeader: { ...DEFAULT_TEMPLATE.schoolHeader, ...(template.schoolHeader || {}) },
          studentFields: { ...DEFAULT_TEMPLATE.studentFields, ...(template.studentFields || {}) },
          studentInfoConfig: {
            ...DEFAULT_TEMPLATE.studentInfoConfig,
            ...(template.studentInfoConfig || {}),
          },
          subjectTableConfig: {
            ...DEFAULT_TEMPLATE.subjectTableConfig,
            ...(template.subjectTableConfig || {}),
          },
          summaryConfig: { ...DEFAULT_TEMPLATE.summaryConfig, ...(template.summaryConfig || {}) },
          chartConfig: { ...DEFAULT_TEMPLATE.chartConfig, ...(template.chartConfig || {}) },
          remarksConfig: { ...DEFAULT_TEMPLATE.remarksConfig, ...(template.remarksConfig || {}) },
          signatures: { ...DEFAULT_TEMPLATE.signatures, ...(template.signatures || {}) },
          signaturesConfig: {
            ...DEFAULT_TEMPLATE.signaturesConfig,
            ...(template.signaturesConfig || {}),
          },
          gradingScale:
            template.gradingScale && template.gradingScale.length > 0
              ? template.gradingScale
              : DEFAULT_GRADING_SCALE,
          showGradingScale: template.showGradingScale ?? false,
          blockOrder: template.blockOrder || DEFAULT_TEMPLATE.blockOrder,
          subjectGroups: template.subjectGroups || [],
        };
      });
    }
  }, [template]);

  // Options for template dropdown
  const templateOptions = useMemo(() => {
    const list =
      Array.isArray(effectiveTemplates) && effectiveTemplates.length > 0
        ? effectiveTemplates
        : [currentConfig];
    const hasCurrent = list.some((t) => String(t.id) === String(currentConfig.id));
    const combined = hasCurrent
      ? list
      : [...list, { id: currentConfig.id, name: currentConfig.name }];
    return combined.map((t) => ({
      id: String(t.id),
      label: t.name || 'Untitled Template',
    }));
  }, [effectiveTemplates, currentConfig.id, currentConfig.name]);

  // Switch to an existing template from dropdown
  const handleSelectTemplate = (templateId) => {
    const target = (effectiveTemplates || []).find((t) => String(t.id) === String(templateId));
    if (target) {
      if (onSelectTemplate) onSelectTemplate(templateId);
      setCurrentConfig({
        ...DEFAULT_TEMPLATE,
        ...target,
        schoolHeader: { ...DEFAULT_TEMPLATE.schoolHeader, ...(target.schoolHeader || {}) },
        studentFields: { ...DEFAULT_TEMPLATE.studentFields, ...(target.studentFields || {}) },
        studentInfoConfig: {
          ...DEFAULT_TEMPLATE.studentInfoConfig,
          ...(target.studentInfoConfig || {}),
        },
        subjectTableConfig: {
          ...DEFAULT_TEMPLATE.subjectTableConfig,
          ...(target.subjectTableConfig || {}),
        },
        summaryConfig: { ...DEFAULT_TEMPLATE.summaryConfig, ...(target.summaryConfig || {}) },
        chartConfig: { ...DEFAULT_TEMPLATE.chartConfig, ...(target.chartConfig || {}) },
        remarksConfig: { ...DEFAULT_TEMPLATE.remarksConfig, ...(target.remarksConfig || {}) },
        signatures: { ...DEFAULT_TEMPLATE.signatures, ...(target.signatures || {}) },
        signaturesConfig: {
          ...DEFAULT_TEMPLATE.signaturesConfig,
          ...(target.signaturesConfig || {}),
        },
        gradingScale:
          target.gradingScale && target.gradingScale.length > 0
            ? target.gradingScale
            : DEFAULT_GRADING_SCALE,
        showGradingScale: target.showGradingScale ?? false,
        blockOrder: target.blockOrder || DEFAULT_TEMPLATE.blockOrder,
        subjectGroups: target.subjectGroups || [],
      });
      if (onSelectTemplate) {
        onSelectTemplate(templateId);
      }
      showToast(`Switched to template "${target.name}"`, 'success');
    }
  };

  // Create new template from scratch
  const handleCreateNewTemplate = () => {
    const newId = 'template_' + Date.now();
    const newName = `Custom Template ${(templates?.length || 1) + 1}`;
    setCurrentConfig({
      ...DEFAULT_TEMPLATE,
      id: newId,
      name: newName,
    });
    showToast(`Created new template: "${newName}"`, 'info');
  };

  const [draggedBlockIdx, setDraggedBlockIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('layout'); // 'layout' | 'grading' | 'grouping'
  const [mobileView, setMobileView] = useState('config'); // 'config' | 'preview'
  const [expandedBlock, setExpandedBlock] = useState('schoolHeader'); // Key of currently expanded block in layout tab

  // Split-pane width state & dragging
  const [leftWidthPercent, setLeftWidthPercent] = useState(48);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);
  const containerRef = useRef(null);

  const [isLgScreen, setIsLgScreen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsLgScreen(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSplitterMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  };

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(rawPct, 25), 75);
      setLeftWidthPercent(Math.round(clamped));
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  // Grade Modal State
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editingGradeIdx, setEditingGradeIdx] = useState(null);
  const [gradeForm, setGradeForm] = useState({
    grade: '',
    minPercentage: 0,
    maxPercentage: 100,
    description: '',
    gpa: 4.0,
  });

  // Subject Group Modal State
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupSubjectIds, setGroupSubjectIds] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);

  useEffect(() => {
    if (!showGradeModal && !showGroupModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (showGradeModal) setShowGradeModal(false);
        if (showGroupModal) setShowGroupModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGradeModal, showGroupModal]);

  // Drag and Drop handlers for Block Reordering
  const handleDragStart = (idx) => {
    setDraggedBlockIdx(idx);
  };

  const handleDragOver = (e, targetIdx) => {
    e.preventDefault();
    if (draggedBlockIdx === null || draggedBlockIdx === targetIdx) return;

    const newOrder = [...currentConfig.blockOrder];
    const draggedItem = newOrder.splice(draggedBlockIdx, 1)[0];
    newOrder.splice(targetIdx, 0, draggedItem);
    setDraggedBlockIdx(targetIdx);
    setCurrentConfig((prev) => ({ ...prev, blockOrder: newOrder }));
  };

  const handleDragEnd = () => {
    setDraggedBlockIdx(null);
  };

  // Move block up or down
  const moveBlock = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= currentConfig.blockOrder.length) return;
    const newOrder = [...currentConfig.blockOrder];
    const [item] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, item);
    setCurrentConfig((prev) => ({ ...prev, blockOrder: newOrder }));
  };

  // Block Visibility Toggle
  const toggleBlockVisibility = (blockKey) => {
    switch (blockKey) {
      case 'schoolHeader':
        setCurrentConfig((prev) => ({ ...prev, showSchoolHeader: !prev.showSchoolHeader }));
        break;
      case 'studentInfo':
        setCurrentConfig((prev) => ({ ...prev, showStudentInfo: !prev.showStudentInfo }));
        break;
      case 'subjectTable':
        setCurrentConfig((prev) => ({ ...prev, showSubjectTable: !prev.showSubjectTable }));
        break;
      case 'summaryCalculations':
        setCurrentConfig((prev) => ({
          ...prev,
          showSummaryCalculations: !prev.showSummaryCalculations,
        }));
        break;
      case 'charts':
        setCurrentConfig((prev) => ({ ...prev, showCharts: !prev.showCharts }));
        break;
      case 'remarks':
        setCurrentConfig((prev) => ({ ...prev, showTeacherRemarks: !prev.showTeacherRemarks }));
        break;
      case 'signatures':
        setCurrentConfig((prev) => ({ ...prev, showSignatures: !prev.showSignatures }));
        break;
      default:
        break;
    }
  };

  // Block Size Change Helper
  const setBlockSize = (blockKey, size) => {
    switch (blockKey) {
      case 'schoolHeader':
        setCurrentConfig((prev) => ({
          ...prev,
          schoolHeader: { ...prev.schoolHeader, size },
        }));
        break;
      case 'studentInfo':
        setCurrentConfig((prev) => ({
          ...prev,
          studentInfoConfig: { ...prev.studentInfoConfig, size },
        }));
        break;
      case 'subjectTable':
        setCurrentConfig((prev) => ({
          ...prev,
          subjectTableConfig: { ...prev.subjectTableConfig, size },
        }));
        break;
      case 'summaryCalculations':
        setCurrentConfig((prev) => ({
          ...prev,
          summaryConfig: { ...prev.summaryConfig, size },
        }));
        break;
      case 'charts':
        setCurrentConfig((prev) => ({
          ...prev,
          chartConfig: {
            ...prev.chartConfig,
            size,
            height: size === 'compact' ? 130 : size === 'large' ? 240 : 180,
          },
        }));
        break;
      case 'remarks':
        setCurrentConfig((prev) => ({
          ...prev,
          remarksConfig: { ...prev.remarksConfig, size },
        }));
        break;
      case 'signatures':
        setCurrentConfig((prev) => ({
          ...prev,
          signaturesConfig: { ...prev.signaturesConfig, size },
        }));
        break;
      default:
        break;
    }
  };

  const getBlockSize = (blockKey) => {
    switch (blockKey) {
      case 'schoolHeader':
        return currentConfig.schoolHeader?.size || 'standard';
      case 'studentInfo':
        return currentConfig.studentInfoConfig?.size || 'standard';
      case 'subjectTable':
        return currentConfig.subjectTableConfig?.size || 'standard';
      case 'summaryCalculations':
        return currentConfig.summaryConfig?.size || 'standard';
      case 'charts':
        return currentConfig.chartConfig?.size || 'standard';
      case 'remarks':
        return currentConfig.remarksConfig?.size || 'standard';
      case 'signatures':
        return currentConfig.signaturesConfig?.size || 'standard';
      default:
        return 'standard';
    }
  };

  const isBlockVisible = (blockKey) => {
    switch (blockKey) {
      case 'schoolHeader':
        return currentConfig.showSchoolHeader;
      case 'studentInfo':
        return currentConfig.showStudentInfo;
      case 'subjectTable':
        return currentConfig.showSubjectTable;
      case 'summaryCalculations':
        return currentConfig.showSummaryCalculations;
      case 'charts':
        return currentConfig.showCharts;
      case 'remarks':
        return currentConfig.showTeacherRemarks;
      case 'signatures':
        return currentConfig.showSignatures;
      default:
        return true;
    }
  };

  // ── Grade Scale Handlers ──
  const handleOpenAddGrade = () => {
    setGradeForm({
      grade: '',
      minPercentage: 0,
      maxPercentage: 100,
      description: '',
      gpa: 4.0,
    });
    setEditingGradeIdx(null);
    setShowGradeModal(true);
  };

  const handleOpenEditGrade = (idx) => {
    const item = currentConfig.gradingScale[idx];
    if (!item) return;
    setGradeForm({
      grade: item.grade,
      minPercentage: item.minPercentage,
      maxPercentage: item.maxPercentage,
      description: item.description || '',
      gpa: item.gpa != null ? item.gpa : 0.0,
    });
    setEditingGradeIdx(idx);
    setShowGradeModal(true);
  };

  const handleSaveGradeForm = (e) => {
    e.preventDefault();
    const gradeLetter = (gradeForm.grade || '').trim().toUpperCase();
    if (!gradeLetter) {
      showToast('Please enter a grade letter or code (e.g. A+, B, Distinction)', 'error');
      return;
    }
    const minP = Number(gradeForm.minPercentage);
    const maxP = Number(gradeForm.maxPercentage);
    if (isNaN(minP) || isNaN(maxP) || minP < 0 || maxP > 100 || minP > maxP) {
      showToast('Invalid percentage range. Must be between 0 and 100 with Min <= Max', 'error');
      return;
    }

    const newTier = {
      grade: gradeLetter,
      minPercentage: minP,
      maxPercentage: maxP,
      description: (gradeForm.description || '').trim(),
      gpa: Number(gradeForm.gpa || 0),
    };

    let updatedScale = [...currentConfig.gradingScale];
    if (editingGradeIdx !== null && editingGradeIdx >= 0) {
      updatedScale[editingGradeIdx] = newTier;
      showToast(`Updated grade "${gradeLetter}"`, 'success');
    } else {
      updatedScale.push(newTier);
      showToast(`Added grade "${gradeLetter}"`, 'success');
    }

    // Sort descending by minPercentage
    updatedScale.sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage));

    setCurrentConfig((prev) => ({
      ...prev,
      gradingScale: updatedScale,
    }));
    setShowGradeModal(false);
  };

  const handleDeleteGrade = (idx) => {
    if (currentConfig.gradingScale.length <= 1) {
      showToast('At least one grade tier must remain in the grading scale', 'error');
      return;
    }
    const updated = currentConfig.gradingScale.filter((_, i) => i !== idx);
    setCurrentConfig((prev) => ({ ...prev, gradingScale: updated }));
    showToast('Grade tier removed', 'info');
  };

  const handleResetGradingScale = () => {
    setCurrentConfig((prev) => ({
      ...prev,
      gradingScale: DEFAULT_GRADING_SCALE,
    }));
    showToast('Grading scale reset to standard defaults', 'success');
  };

  // ── Subject Grouping Handlers ──
  const handleOpenNewGroup = () => {
    setGroupNameInput('');
    setGroupSubjectIds([]);
    setEditingGroupId(null);
    setShowGroupModal(true);
  };

  const handleEditGroup = (group) => {
    setGroupNameInput(group.name);
    setGroupSubjectIds(group.subjectIds.map(String));
    setEditingGroupId(group.id);
    setShowGroupModal(true);
  };

  const handleSaveGroup = (e) => {
    e.preventDefault();
    const trimmed = groupNameInput.trim();
    if (!trimmed) {
      showToast('Please provide a subject group name (e.g. Science, Languages)', 'error');
      return;
    }
    if (groupSubjectIds.length === 0) {
      showToast('Please select at least one subject to include in this group', 'error');
      return;
    }

    if (editingGroupId) {
      setCurrentConfig((prev) => ({
        ...prev,
        subjectGroups: prev.subjectGroups.map((g) =>
          g.id === editingGroupId ? { ...g, name: trimmed, subjectIds: groupSubjectIds } : g
        ),
      }));
      showToast(`Updated group "${trimmed}"`, 'success');
    } else {
      const newGroup = {
        id: 'group_' + Date.now(),
        name: trimmed,
        subjectIds: groupSubjectIds,
      };
      setCurrentConfig((prev) => ({
        ...prev,
        subjectGroups: [...prev.subjectGroups, newGroup],
      }));
      showToast(`Added subject group "${trimmed}"`, 'success');
    }

    setShowGroupModal(false);
  };

  const handleDeleteGroup = (groupId) => {
    setCurrentConfig((prev) => ({
      ...prev,
      subjectGroups: prev.subjectGroups.filter((g) => g.id !== groupId),
    }));
    showToast('Subject group removed', 'info');
  };

  const handleSaveAll = async () => {
    if (!canEdit) {
      showToast('You do not have permission to modify report templates', 'error');
      return;
    }
    if (!currentConfig.name.trim()) {
      showToast('Please provide a name for this template', 'error');
      return;
    }
    if (onSave) {
      onSave(currentConfig);
    } else {
      try {
        const existingIdx = effectiveTemplates.findIndex((t) => t.id === currentConfig.id);
        let updatedList = [];
        if (existingIdx >= 0) {
          updatedList = effectiveTemplates.map((t, idx) =>
            idx === existingIdx ? currentConfig : t
          );
        } else {
          updatedList = [...effectiveTemplates, currentConfig];
        }
        setInternalTemplates(updatedList);
        const success = await saveAdminConfig(TEMPLATES_CONFIG_KEY, updatedList);
        if (success) {
          showToast(`Report template "${currentConfig.name}" saved successfully`, 'success');
        } else {
          showToast(`Report template "${currentConfig.name}" saved to local cache`, 'info');
        }
      } catch (err) {
        showToast('Failed to save template: ' + err.message, 'error');
      }
    }
  };

  // Compute preview scores with dynamically evaluated grades using currentConfig.gradingScale
  const previewScoresWithGrades = useMemo(() => {
    return RAW_PREVIEW_SCORES.map((s) => {
      const dbSub = availableSubjects.find(
        (as) =>
          String(as.id) === String(s.subjectId) ||
          as.name?.trim().toLowerCase() === s.subjectName?.trim().toLowerCase()
      );
      const pct = (s.marksObtained / s.maxMarks) * 100;
      const grade = calculateGrade(pct, currentConfig.gradingScale);
      return {
        ...s,
        arabicName: dbSub?.arabic_name || s.arabicName || '',
        grade,
      };
    });
  }, [currentConfig.gradingScale, availableSubjects]);

  const previewData = useMemo(() => {
    const groups = currentConfig.subjectGroups || [];
    const mappedIds = new Set();
    const sections = [];

    groups.forEach((g) => {
      const groupMembers = previewScoresWithGrades.filter((s) =>
        g.subjectIds.map(String).includes(String(s.subjectId))
      );
      if (groupMembers.length > 0) {
        groupMembers.forEach((m) => mappedIds.add(String(m.subjectId)));
        const groupTotalObt = groupMembers.reduce((acc, curr) => acc + curr.marksObtained, 0);
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

    const ungrouped = previewScoresWithGrades.filter((s) => !mappedIds.has(String(s.subjectId)));
    return { sections, ungrouped };
  }, [currentConfig.subjectGroups, previewScoresWithGrades]);

  const overallPreviewPct = 87.9;
  const overallPreviewGrade = useMemo(() => {
    return calculateGrade(overallPreviewPct, currentConfig.gradingScale);
  }, [currentConfig.gradingScale]);

  const previewChartData = useMemo(() => {
    return previewScoresWithGrades.map((s) => ({
      name: s.subjectName.length > 12 ? `${s.subjectName.slice(0, 10)}…` : s.subjectName,
      fullName: s.subjectName,
      Marks: s.marksObtained,
      Max: s.maxMarks,
    }));
  }, [previewScoresWithGrades]);

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-3xl border border-light-border shadow-xs overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[720px] animate-in fade-in duration-200"
      data-feature="report-card-designer"
    >
      {/* ── Subview Top Header Bar ── */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-light-border bg-slate-50/90 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-light-border bg-white hover:bg-slate-100 text-xs font-bold text-dark-primary flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
            title="Return to Portal"
          >
            <i className="fas fa-arrow-left text-[11px] text-dark-muted" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shadow-2xs">
            <i className="fas fa-palette" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-dark-primary tracking-tight flex items-center gap-2">
              <span>Report Card Designer</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hidden md:inline">
                Administration & System
              </span>
            </h2>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mobile view switcher (< lg) */}
          <div className="lg:hidden flex items-center bg-slate-200/80 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setMobileView('config')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mobileView === 'config'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-dark-muted hover:text-dark-primary'
              }`}
            >
              Config
            </button>
            <button
              type="button"
              onClick={() => setMobileView('preview')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mobileView === 'preview'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-dark-muted hover:text-dark-primary'
              }`}
            >
              Live Preview
            </button>
          </div>

          {/* Cancel button */}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-muted hover:bg-slate-100 transition-all cursor-pointer"
          >
            Cancel
          </button>

          {/* Save button / Read-Only indicator */}
          {canEdit ? (
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fas fa-check text-xs" />
              <span>Save Template</span>
            </button>
          ) : (
            <span
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200 flex items-center gap-1.5"
              title="Read-only view. Edit permission requires report-card-designer-edit role access."
            >
              <i className="fas fa-lock text-[10px]" />
              <span>Read Only</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Subview Two-Block Split Workspace ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* ── LEFT PANEL: CONFIGURATION BLOCK ── */}
        <div
          className={`flex flex-col bg-slate-50/60 border-r border-light-border overflow-hidden ${
            mobileView === 'preview' ? 'hidden lg:flex' : 'flex'
          }`}
          style={{ width: isLgScreen ? `${leftWidthPercent}%` : '100%' }}
        >
          {/* Unified Template Selection & Naming Bar (Single place across designer) */}
          <div className="px-4 py-3 bg-white border-b border-light-border flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <div className="w-48 sm:w-56 shrink-0">
                <MultiSelectDropdown
                  placeholder="Select Template..."
                  options={templateOptions}
                  selected={String(currentConfig.id)}
                  onChange={handleSelectTemplate}
                  singleSelect={true}
                  icon="fa-file-invoice"
                  fullWidth={true}
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <input
                  type="text"
                  value={currentConfig.name}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, name: e.target.value })}
                  placeholder="Template Name..."
                  className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-300 outline-none text-dark-primary transition-all"
                  title="Edit Template Name"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateNewTemplate}
              className="px-2.5 py-1.5 rounded-xl border border-dashed border-rose-300 text-rose-700 bg-rose-50/60 hover:bg-rose-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Create a new template from scratch"
            >
              <i className="fas fa-plus text-[10px]" />
              <span>New Template</span>
            </button>
          </div>

          {/* Configuration Sub-Tabs Header */}
          <div className="px-4 py-2 border-b border-light-border bg-white flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex items-center gap-1">
              {[
                { id: 'layout', label: 'Blocks & Layout', icon: 'fa-grip-vertical' },
                { id: 'grading', label: 'Grading Rules', icon: 'fa-graduation-cap' },
                { id: 'grouping', label: 'Subject Groups', icon: 'fa-layer-group' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                      : 'text-dark-muted hover:text-dark-primary hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <i className={`fas ${tab.icon} text-[10px]`} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Configuration Scrollable Content */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            {/* ══════════════════════════════════════════════════════════════
              TAB 1: VISUAL BLOCKS, ORDER, DETAILS & SIZING CONTROLS
          ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'layout' && (
              <div className="space-y-4">
                {/* Block List with Inline Details & Size Controls */}
                <div className="space-y-3">
                  {currentConfig.blockOrder.map((blockKey, idx) => {
                    const blockInfo = BLOCK_LABELS[blockKey] || {
                      name: blockKey,
                      icon: 'fa-cube',
                    };
                    const isDragging = draggedBlockIdx === idx;
                    const isExpanded = expandedBlock === blockKey;
                    const isVisible = isBlockVisible(blockKey);
                    const blockSize = getBlockSize(blockKey);

                    return (
                      <div
                        key={blockKey}
                        className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                          isDragging
                            ? 'border-rose-300 shadow-md scale-[1.01] bg-rose-50/40'
                            : isVisible
                              ? 'border-light-border hover:border-slate-300'
                              : 'border-slate-200 opacity-60 bg-slate-50/80'
                        }`}
                      >
                        {/* Block Row Header */}
                        <div
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setExpandedBlock(isExpanded ? null : blockKey)}
                          className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/60 transition-colors"
                        >
                          {/* Left: Reorder Up/Down (Leftmost), Drag Handle, Icon, Block Name & Read-Only Eye */}
                          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                            {/* Reorder Arrows (Leftmost) */}
                            <div
                              className="flex items-center gap-0.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => moveBlock(idx, -1)}
                                disabled={idx === 0}
                                className="w-6 h-6 rounded-lg border border-light-border flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-20 cursor-pointer transition-all"
                                title="Move block up"
                              >
                                <i className="fas fa-chevron-up text-[8px]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveBlock(idx, 1)}
                                disabled={idx === currentConfig.blockOrder.length - 1}
                                className="w-6 h-6 rounded-lg border border-light-border flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-20 cursor-pointer transition-all"
                                title="Move block down"
                              >
                                <i className="fas fa-chevron-down text-[8px]" />
                              </button>
                            </div>

                            {/* Drag Handle */}
                            <div
                              className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs shrink-0 cursor-grab active:cursor-grabbing"
                              title="Drag to reorder block"
                            >
                              <i className="fas fa-grip-vertical text-[10px]" />
                            </div>

                            {/* Block Icon */}
                            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs shrink-0">
                              <i className={`fas ${blockInfo.icon}`} />
                            </div>

                            {/* Block Name, # Badge & Read-Only Eye */}
                            <div className="min-w-0 flex items-center gap-2">
                              <h4 className="text-xs font-black text-dark-primary tracking-tight truncate">
                                {blockInfo.name}
                              </h4>
                              <span className="text-[10px] text-dark-muted font-mono bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                                #{idx + 1}
                              </span>
                              {/* Read-only eye based on visibility */}
                              {isVisible ? (
                                <span
                                  title="Visible on report card"
                                  className="text-emerald-600 flex items-center ml-1 shrink-0"
                                >
                                  <i className="fas fa-eye text-xs" />
                                </span>
                              ) : (
                                <span
                                  title="Hidden from report card"
                                  className="text-slate-400 flex items-center gap-1 ml-1 shrink-0"
                                >
                                  <i className="fas fa-eye-slash text-xs" />
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600">
                                    Hidden
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Expand / Collapse Button */}
                          <div
                            className="flex items-center shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedBlock(isExpanded ? null : blockKey)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isExpanded
                                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                                  : 'bg-white text-dark-slate border-light-border hover:bg-slate-50'
                              }`}
                              title={isExpanded ? 'Collapse section' : 'Expand section'}
                            >
                              <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                              <i
                                className={`fas fa-chevron-down text-[8px] transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-rose-600' : 'text-slate-400'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* ── EXPANDABLE BLOCK DETAILS PANEL ── */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
                            {/* Block Visibility & Size Settings Bar (Moved inside details) */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-light-border shadow-2xs">
                              {/* Visibility Toggle Button (On / Off) */}
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-bold text-dark-slate">
                                  Visibility:
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isVisible}
                                  onClick={() => toggleBlockVisibility(blockKey)}
                                  className="flex items-center gap-2 cursor-pointer select-none group focus:outline-hidden"
                                  title={
                                    isVisible
                                      ? 'Click to turn visibility Off'
                                      : 'Click to turn visibility On'
                                  }
                                >
                                  <div
                                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                      isVisible ? 'bg-emerald-600' : 'bg-slate-300'
                                    }`}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        isVisible ? 'translate-x-5' : 'translate-x-0'
                                      }`}
                                    />
                                  </div>
                                  <span
                                    className={`text-xs font-black min-w-[34px] flex items-center gap-1 uppercase tracking-wide transition-colors ${
                                      isVisible ? 'text-emerald-700' : 'text-slate-500'
                                    }`}
                                  >
                                    <i
                                      className={`fas ${
                                        isVisible
                                          ? 'fa-eye text-emerald-600'
                                          : 'fa-eye-slash text-slate-400'
                                      } text-[10px]`}
                                    />
                                    <span>{isVisible ? 'On' : 'Off'}</span>
                                  </span>
                                </button>
                              </div>

                              {/* Block Size Segmented Control */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-black">
                                  <button
                                    type="button"
                                    onClick={() => setBlockSize(blockKey, 'compact')}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                      blockSize === 'compact'
                                        ? 'bg-white text-rose-700 shadow-2xs font-black'
                                        : 'text-dark-muted hover:text-dark-primary'
                                    }`}
                                    title="Compact size (tight padding, smaller font - ideal for 1 page A4)"
                                  >
                                    Compact
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBlockSize(blockKey, 'standard')}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                      blockSize === 'standard'
                                        ? 'bg-white text-rose-700 shadow-2xs font-black'
                                        : 'text-dark-muted hover:text-dark-primary'
                                    }`}
                                    title="Standard balanced size"
                                  >
                                    Standard
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBlockSize(blockKey, 'large')}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                      blockSize === 'large'
                                        ? 'bg-white text-rose-700 shadow-2xs font-black'
                                        : 'text-dark-muted hover:text-dark-primary'
                                    }`}
                                    title="Large spacious size"
                                  >
                                    Large
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* 1. School Header Details */}
                            {blockKey === 'schoolHeader' && (
                              <div className="space-y-3">
                                <div className="max-w-md">
                                  <MultiSelectDropdown
                                    label="Details to Display"
                                    placeholder="Select details to display..."
                                    options={[
                                      {
                                        id: 'showHeaderImage',
                                        label: 'Complete Header Image (Full Width)',
                                      },
                                      { id: 'showTitle', label: 'School Name' },
                                      { id: 'showLogo', label: 'School Logo' },
                                      { id: 'showSubtitle', label: 'Subtitle / Motto' },
                                      { id: 'showAddress', label: 'Campus Address' },
                                      { id: 'showExamTitle', label: 'Exam Title Badge' },
                                    ]}
                                    selected={[
                                      currentConfig.schoolHeader?.showHeaderImage
                                        ? 'showHeaderImage'
                                        : null,
                                      currentConfig.schoolHeader?.showTitle !== false
                                        ? 'showTitle'
                                        : null,
                                      currentConfig.schoolHeader?.showLogo !== false
                                        ? 'showLogo'
                                        : null,
                                      currentConfig.schoolHeader?.showSubtitle !== false
                                        ? 'showSubtitle'
                                        : null,
                                      currentConfig.schoolHeader?.showAddress !== false
                                        ? 'showAddress'
                                        : null,
                                      currentConfig.schoolHeader?.showExamTitle !== false
                                        ? 'showExamTitle'
                                        : null,
                                    ].filter(Boolean)}
                                    onChange={(selectedIds) => {
                                      const arr = Array.isArray(selectedIds)
                                        ? selectedIds
                                        : [selectedIds];
                                      setCurrentConfig((prev) => ({
                                        ...prev,
                                        schoolHeader: {
                                          ...prev.schoolHeader,
                                          showHeaderImage: arr.includes('showHeaderImage'),
                                          showTitle: arr.includes('showTitle'),
                                          showLogo: arr.includes('showLogo'),
                                          showSubtitle: arr.includes('showSubtitle'),
                                          showAddress: arr.includes('showAddress'),
                                          showExamTitle: arr.includes('showExamTitle'),
                                        },
                                      }));
                                    }}
                                    icon="fa-heading"
                                    fullWidth={true}
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  {Boolean(currentConfig.schoolHeader?.showHeaderImage) && (
                                    <div className="col-span-1 sm:col-span-2">
                                      <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                        Complete Header Image URL or Path (Full Width)
                                      </label>
                                      <input
                                        type="text"
                                        value={currentConfig.schoolHeader?.headerImageUrl || ''}
                                        onChange={(e) =>
                                          setCurrentConfig({
                                            ...currentConfig,
                                            schoolHeader: {
                                              ...currentConfig.schoolHeader,
                                              headerImageUrl: e.target.value,
                                            },
                                          })
                                        }
                                        placeholder="e.g. /media/jzv-header-banner.png or https://example.com/banner.png"
                                        className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                      />
                                      <p className="text-[10px] text-dark-muted mt-1">
                                        This banner image will occupy the complete width across the
                                        header.
                                      </p>
                                    </div>
                                  )}

                                  {currentConfig.schoolHeader?.showTitle !== false && (
                                    <div>
                                      <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                        School Name
                                      </label>
                                      <input
                                        type="text"
                                        value={currentConfig.schoolHeader?.title || ''}
                                        onChange={(e) =>
                                          setCurrentConfig({
                                            ...currentConfig,
                                            schoolHeader: {
                                              ...currentConfig.schoolHeader,
                                              title: e.target.value,
                                            },
                                          })
                                        }
                                        className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                      />
                                    </div>
                                  )}

                                  {currentConfig.schoolHeader?.showSubtitle !== false && (
                                    <div>
                                      <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                        Subtitle / Motto
                                      </label>
                                      <input
                                        type="text"
                                        value={currentConfig.schoolHeader?.subtitle || ''}
                                        onChange={(e) =>
                                          setCurrentConfig({
                                            ...currentConfig,
                                            schoolHeader: {
                                              ...currentConfig.schoolHeader,
                                              subtitle: e.target.value,
                                            },
                                          })
                                        }
                                        className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                      />
                                    </div>
                                  )}

                                  {currentConfig.schoolHeader?.showAddress !== false && (
                                    <div>
                                      <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                        Campus Address
                                      </label>
                                      <input
                                        type="text"
                                        value={currentConfig.schoolHeader?.address || ''}
                                        onChange={(e) =>
                                          setCurrentConfig({
                                            ...currentConfig,
                                            schoolHeader: {
                                              ...currentConfig.schoolHeader,
                                              address: e.target.value,
                                            },
                                          })
                                        }
                                        className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                      />
                                    </div>
                                  )}

                                  {currentConfig.schoolHeader?.showLogo !== false && (
                                    <div>
                                      <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                        Logo URL or Path
                                      </label>
                                      <input
                                        type="text"
                                        value={currentConfig.schoolHeader?.logoUrl || ''}
                                        onChange={(e) =>
                                          setCurrentConfig({
                                            ...currentConfig,
                                            schoolHeader: {
                                              ...currentConfig.schoolHeader,
                                              logoUrl: e.target.value,
                                            },
                                          })
                                        }
                                        className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                      />
                                    </div>
                                  )}

                                  {currentConfig.schoolHeader?.showExamTitle !== false && (
                                    <div>
                                      <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                        Exam Title Badge
                                      </label>
                                      <input
                                        type="text"
                                        value={currentConfig.schoolHeader?.examTitle || ''}
                                        onChange={(e) =>
                                          setCurrentConfig({
                                            ...currentConfig,
                                            schoolHeader: {
                                              ...currentConfig.schoolHeader,
                                              examTitle: e.target.value,
                                            },
                                          })
                                        }
                                        className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 2. Student Info Details */}
                            {blockKey === 'studentInfo' && (
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex-1 max-w-md">
                                    <MultiSelectDropdown
                                      label="Details to Display"
                                      placeholder="Select student details..."
                                      options={[
                                        { id: 'name', label: 'Student Full Name' },
                                        { id: 'admissionNo', label: 'Admission / ID Number' },
                                        { id: 'className', label: 'Class & Section' },
                                        { id: 'rollNo', label: 'Roll Number' },
                                        { id: 'fatherName', label: 'Father / Guardian Name' },
                                        { id: 'dob', label: 'Date of Birth (DOB)' },
                                        { id: 'gender', label: 'Gender' },
                                        { id: 'bloodGroup', label: 'Blood Group' },
                                        { id: 'attendance', label: 'Attendance Percentage' },
                                      ]}
                                      selected={Object.keys(
                                        currentConfig.studentFields || {}
                                      ).filter((k) => currentConfig.studentFields[k])}
                                      onChange={(selectedIds) => {
                                        const arr = Array.isArray(selectedIds)
                                          ? selectedIds
                                          : [selectedIds];
                                        const allKeys = [
                                          'name',
                                          'admissionNo',
                                          'className',
                                          'rollNo',
                                          'fatherName',
                                          'dob',
                                          'gender',
                                          'bloodGroup',
                                          'attendance',
                                        ];
                                        const updatedFields = {};
                                        allKeys.forEach((k) => {
                                          updatedFields[k] = arr.includes(k);
                                        });
                                        setCurrentConfig((prev) => ({
                                          ...prev,
                                          studentFields: updatedFields,
                                        }));
                                      }}
                                      icon="fa-id-card"
                                      fullWidth={true}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                    <span className="text-[10px] font-bold text-dark-muted">
                                      Grid Columns:
                                    </span>
                                    {[2, 3, 4].map((col) => (
                                      <button
                                        key={col}
                                        type="button"
                                        onClick={() =>
                                          setCurrentConfig({
                                            ...currentConfig,
                                            studentInfoConfig: {
                                              ...currentConfig.studentInfoConfig,
                                              columns: col,
                                            },
                                          })
                                        }
                                        className={`px-2 py-1 rounded-lg text-[10px] font-black border cursor-pointer transition-all ${
                                          (currentConfig.studentInfoConfig?.columns || 4) === col
                                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                            : 'bg-white text-dark-slate border-light-border hover:bg-slate-50'
                                        }`}
                                      >
                                        {col} Cols
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 3. Subject Table Details */}
                            {blockKey === 'subjectTable' && (
                              <div className="space-y-4">
                                <div className="max-w-md">
                                  <MultiSelectDropdown
                                    label="Details to Display"
                                    placeholder="Select columns & options..."
                                    options={[
                                      { id: 'showArabicName', label: 'Arabic Subject Name' },
                                      { id: 'showMaxMarks', label: 'Max Marks' },
                                      { id: 'showPassMarks', label: 'Pass Marks' },
                                      { id: 'showMarksObtained', label: 'Marks Scored' },
                                      { id: 'showPercentage', label: 'Subject %' },
                                      { id: 'showGrade', label: 'Letter Grade' },
                                      { id: 'showStatus', label: 'Pass / Fail' },
                                      { id: 'bandedRows', label: 'Banded Row Colors' },
                                    ]}
                                    selected={Object.keys(
                                      currentConfig.subjectTableConfig || {}
                                    ).filter((k) => currentConfig.subjectTableConfig[k])}
                                    onChange={(selectedIds) => {
                                      const arr = Array.isArray(selectedIds)
                                        ? selectedIds
                                        : [selectedIds];
                                      const allKeys = [
                                        'showArabicName',
                                        'showMaxMarks',
                                        'showPassMarks',
                                        'showMarksObtained',
                                        'showPercentage',
                                        'showGrade',
                                        'showStatus',
                                        'bandedRows',
                                      ];
                                      const updated = { ...currentConfig.subjectTableConfig };
                                      allKeys.forEach((k) => {
                                        updated[k] = arr.includes(k);
                                      });
                                      setCurrentConfig((prev) => ({
                                        ...prev,
                                        subjectTableConfig: updated,
                                      }));
                                    }}
                                    icon="fa-table-cells"
                                    fullWidth={true}
                                  />
                                </div>

                                {/* Column Sequence & Order Control */}
                                <div className="pt-3 border-t border-light-border/70 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="text-xs font-black text-dark-primary flex items-center gap-1.5">
                                        <i className="fas fa-arrows-alt-v text-rose-500 text-[11px]" />
                                        <span>Column Sequence &amp; Order</span>
                                      </h5>
                                      <p className="text-[11px] text-dark-muted font-medium">
                                        Reorder columns from left to right using up/down arrows.
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCurrentConfig((prev) => ({
                                          ...prev,
                                          subjectTableConfig: {
                                            ...prev.subjectTableConfig,
                                            columnOrder: DEFAULT_TABLE_COLUMN_ORDER,
                                          },
                                        }));
                                      }}
                                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline px-2 py-1 rounded cursor-pointer transition-colors"
                                      title="Reset to default column order"
                                    >
                                      <i className="fas fa-undo-alt mr-1 text-[9px]" />
                                      Reset Order
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {getActiveTableColumns(currentConfig.subjectTableConfig).map(
                                      (colId, cIdx, arr) => (
                                        <div
                                          key={colId}
                                          className="flex items-center justify-between px-3 py-2 rounded-xl border border-light-border bg-white shadow-2xs hover:border-slate-300 transition-all"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-black text-slate-700 flex items-center justify-center shrink-0">
                                              {cIdx + 1}
                                            </span>
                                            <span className="text-xs font-bold text-dark-primary truncate">
                                              {TABLE_COLUMN_LABELS[colId] || colId}
                                            </span>
                                            {colId === 'arabicName' && (
                                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0 font-arabic">
                                                عربي
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0 ml-2">
                                            <button
                                              type="button"
                                              disabled={cIdx === 0}
                                              onClick={() => {
                                                const activeCols = getActiveTableColumns(
                                                  currentConfig.subjectTableConfig
                                                );
                                                const currentOrder = [
                                                  ...activeCols,
                                                  ...(
                                                    currentConfig.subjectTableConfig?.columnOrder || []
                                                  ).filter((id) => !activeCols.includes(id)),
                                                ];
                                                const fromIdx = currentOrder.indexOf(colId);
                                                const toIdx = fromIdx - 1;
                                                if (toIdx < 0) return;
                                                const nextOrder = [...currentOrder];
                                                const temp = nextOrder[fromIdx];
                                                nextOrder[fromIdx] = nextOrder[toIdx];
                                                nextOrder[toIdx] = temp;
                                                setCurrentConfig((prev) => ({
                                                  ...prev,
                                                  subjectTableConfig: {
                                                    ...prev.subjectTableConfig,
                                                    columnOrder: nextOrder,
                                                  },
                                                }));
                                              }}
                                              className="w-6 h-6 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-600 transition-all cursor-pointer"
                                              title="Move Column Left / Up"
                                            >
                                              <i className="fas fa-arrow-up text-[10px]" />
                                            </button>
                                            <button
                                              type="button"
                                              disabled={cIdx === arr.length - 1}
                                              onClick={() => {
                                                const activeCols = getActiveTableColumns(
                                                  currentConfig.subjectTableConfig
                                                );
                                                const currentOrder = [
                                                  ...activeCols,
                                                  ...(
                                                    currentConfig.subjectTableConfig?.columnOrder || []
                                                  ).filter((id) => !activeCols.includes(id)),
                                                ];
                                                const fromIdx = currentOrder.indexOf(colId);
                                                const toIdx = fromIdx + 1;
                                                if (toIdx >= currentOrder.length) return;
                                                const nextOrder = [...currentOrder];
                                                const temp = nextOrder[fromIdx];
                                                nextOrder[fromIdx] = nextOrder[toIdx];
                                                nextOrder[toIdx] = temp;
                                                setCurrentConfig((prev) => ({
                                                  ...prev,
                                                  subjectTableConfig: {
                                                    ...prev.subjectTableConfig,
                                                    columnOrder: nextOrder,
                                                  },
                                                }));
                                              }}
                                              className="w-6 h-6 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-600 transition-all cursor-pointer"
                                              title="Move Column Right / Down"
                                            >
                                              <i className="fas fa-arrow-down text-[10px]" />
                                            </button>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 4. Performance Summary Details */}
                            {blockKey === 'summaryCalculations' && (
                              <div className="space-y-3">
                                <div className="max-w-md">
                                  <MultiSelectDropdown
                                    label="Details to Display"
                                    placeholder="Select summary metrics..."
                                    options={[
                                      {
                                        id: 'showGrandTotal',
                                        label: 'Grand Total (Obtained / Max)',
                                      },
                                      { id: 'showPercentage', label: 'Percentage (%)' },
                                      { id: 'showGrade', label: 'Overall Grade' },
                                      { id: 'showClassRank', label: 'Class Rank (#)' },
                                      { id: 'showPassFail', label: 'Result Status (PASS/FAIL)' },
                                      {
                                        id: 'showTotalSubjects',
                                        label: 'Total Subjects Evaluated',
                                      },
                                    ]}
                                    selected={Object.keys(currentConfig.summaryConfig || {}).filter(
                                      (k) => currentConfig.summaryConfig[k]
                                    )}
                                    onChange={(selectedIds) => {
                                      const arr = Array.isArray(selectedIds)
                                        ? selectedIds
                                        : [selectedIds];
                                      const allKeys = [
                                        'showGrandTotal',
                                        'showPercentage',
                                        'showGrade',
                                        'showClassRank',
                                        'showPassFail',
                                        'showTotalSubjects',
                                      ];
                                      const updated = { ...currentConfig.summaryConfig };
                                      allKeys.forEach((k) => {
                                        updated[k] = arr.includes(k);
                                      });
                                      setCurrentConfig((prev) => ({
                                        ...prev,
                                        summaryConfig: updated,
                                      }));
                                    }}
                                    icon="fa-calculator"
                                    fullWidth={true}
                                  />
                                </div>
                              </div>
                            )}

                            {/* 5. Charts Details */}
                            {blockKey === 'charts' && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                      Chart Type
                                    </label>
                                    <select
                                      value={currentConfig.chartConfig.type}
                                      onChange={(e) =>
                                        setCurrentConfig({
                                          ...currentConfig,
                                          chartConfig: {
                                            ...currentConfig.chartConfig,
                                            type: e.target.value,
                                          },
                                        })
                                      }
                                      className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                    >
                                      <option value="bar">Vertical Columns (Marks vs Max)</option>
                                      <option value="horizontal_bar">
                                        Horizontal Progress Bars
                                      </option>
                                      <option value="radar">Proficiency Radar / Spider Web</option>
                                      <option value="line">Score Trend Line</option>
                                      <option value="area">Gradient Area Chart</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                      Chart Title
                                    </label>
                                    <input
                                      type="text"
                                      value={currentConfig.chartConfig.title}
                                      onChange={(e) =>
                                        setCurrentConfig({
                                          ...currentConfig,
                                          chartConfig: {
                                            ...currentConfig.chartConfig,
                                            title: e.target.value,
                                          },
                                        })
                                      }
                                      className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 6. Teacher Remarks Details */}
                            {blockKey === 'remarks' && (
                              <div className="space-y-3">
                                <div className="max-w-md">
                                  <MultiSelectDropdown
                                    label="Details to Display"
                                    placeholder="Select remarks options..."
                                    options={[
                                      {
                                        id: 'showSignatureLine',
                                        label: 'Teacher Signature & Date Line',
                                      },
                                      {
                                        id: 'showPromotion',
                                        label: 'Promotion / Next Class Eligibility Line',
                                      },
                                    ]}
                                    selected={[
                                      currentConfig.remarksConfig?.showSignatureLine
                                        ? 'showSignatureLine'
                                        : null,
                                      currentConfig.remarksConfig?.showPromotion
                                        ? 'showPromotion'
                                        : null,
                                    ].filter(Boolean)}
                                    onChange={(selectedIds) => {
                                      const arr = Array.isArray(selectedIds)
                                        ? selectedIds
                                        : [selectedIds];
                                      setCurrentConfig((prev) => ({
                                        ...prev,
                                        remarksConfig: {
                                          ...prev.remarksConfig,
                                          showSignatureLine: arr.includes('showSignatureLine'),
                                          showPromotion: arr.includes('showPromotion'),
                                        },
                                      }));
                                    }}
                                    icon="fa-comment-dots"
                                    fullWidth={true}
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                      Section Heading
                                    </label>
                                    <input
                                      type="text"
                                      value={
                                        currentConfig.remarksConfig?.title ||
                                        'Teacher Remarks & Recommendations'
                                      }
                                      onChange={(e) =>
                                        setCurrentConfig({
                                          ...currentConfig,
                                          remarksConfig: {
                                            ...currentConfig.remarksConfig,
                                            title: e.target.value,
                                          },
                                        })
                                      }
                                      className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                      Default Remarks Text
                                    </label>
                                    <input
                                      type="text"
                                      value={currentConfig.remarksText}
                                      onChange={(e) =>
                                        setCurrentConfig({
                                          ...currentConfig,
                                          remarksText: e.target.value,
                                        })
                                      }
                                      className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 7. Signatures Details */}
                            {blockKey === 'signatures' && (
                              <div className="space-y-3">
                                <div className="max-w-md">
                                  <MultiSelectDropdown
                                    label="Details to Display"
                                    placeholder="Select signature lines to display..."
                                    options={[
                                      { id: 'showClassTeacher', label: 'Class Teacher' },
                                      { id: 'showCoordinator', label: 'Coordinator' },
                                      { id: 'showPrincipal', label: 'Principal' },
                                      { id: 'showParent', label: 'Parent / Guardian' },
                                    ]}
                                    selected={[
                                      currentConfig.signaturesConfig?.showClassTeacher !== false
                                        ? 'showClassTeacher'
                                        : null,
                                      currentConfig.signaturesConfig?.showCoordinator !== false
                                        ? 'showCoordinator'
                                        : null,
                                      currentConfig.signaturesConfig?.showPrincipal !== false
                                        ? 'showPrincipal'
                                        : null,
                                      currentConfig.signaturesConfig?.showParent !== false
                                        ? 'showParent'
                                        : null,
                                    ].filter(Boolean)}
                                    onChange={(selectedIds) => {
                                      const arr = Array.isArray(selectedIds)
                                        ? selectedIds
                                        : [selectedIds];
                                      setCurrentConfig((prev) => ({
                                        ...prev,
                                        signaturesConfig: {
                                          ...prev.signaturesConfig,
                                          showClassTeacher: arr.includes('showClassTeacher'),
                                          showCoordinator: arr.includes('showCoordinator'),
                                          showPrincipal: arr.includes('showPrincipal'),
                                          showParent: arr.includes('showParent'),
                                        },
                                      }));
                                    }}
                                    icon="fa-file-signature"
                                    fullWidth={true}
                                  />
                                </div>

                                {/* Custom Signature Titles: ONLY VISIBLE WHEN SELECTED */}
                                {(currentConfig.signaturesConfig?.showClassTeacher !== false ||
                                  currentConfig.signaturesConfig?.showCoordinator !== false ||
                                  currentConfig.signaturesConfig?.showPrincipal !== false ||
                                  currentConfig.signaturesConfig?.showParent !== false) && (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                                    {currentConfig.signaturesConfig?.showClassTeacher !== false && (
                                      <div>
                                        <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                          Class Teacher Title
                                        </label>
                                        <input
                                          type="text"
                                          value={currentConfig.signatures?.classTeacher || ''}
                                          onChange={(e) =>
                                            setCurrentConfig({
                                              ...currentConfig,
                                              signatures: {
                                                ...currentConfig.signatures,
                                                classTeacher: e.target.value,
                                              },
                                            })
                                          }
                                          className="w-full px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                          placeholder="e.g. Class Teacher"
                                        />
                                      </div>
                                    )}
                                    {currentConfig.signaturesConfig?.showCoordinator !== false && (
                                      <div>
                                        <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                          Coordinator Title
                                        </label>
                                        <input
                                          type="text"
                                          value={currentConfig.signatures?.coordinator || ''}
                                          onChange={(e) =>
                                            setCurrentConfig({
                                              ...currentConfig,
                                              signatures: {
                                                ...currentConfig.signatures,
                                                coordinator: e.target.value,
                                              },
                                            })
                                          }
                                          className="w-full px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                          placeholder="e.g. Academic Coordinator"
                                        />
                                      </div>
                                    )}
                                    {currentConfig.signaturesConfig?.showPrincipal !== false && (
                                      <div>
                                        <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                          Principal Title
                                        </label>
                                        <input
                                          type="text"
                                          value={currentConfig.signatures?.principal || ''}
                                          onChange={(e) =>
                                            setCurrentConfig({
                                              ...currentConfig,
                                              signatures: {
                                                ...currentConfig.signatures,
                                                principal: e.target.value,
                                              },
                                            })
                                          }
                                          className="w-full px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                          placeholder="e.g. Principal"
                                        />
                                      </div>
                                    )}
                                    {currentConfig.signaturesConfig?.showParent !== false && (
                                      <div>
                                        <label className="block text-[11px] font-bold text-dark-slate mb-1">
                                          Parent Title
                                        </label>
                                        <input
                                          type="text"
                                          value={currentConfig.signatures?.parent || ''}
                                          onChange={(e) =>
                                            setCurrentConfig({
                                              ...currentConfig,
                                              signatures: {
                                                ...currentConfig.signatures,
                                                parent: e.target.value,
                                              },
                                            })
                                          }
                                          className="w-full px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                                          placeholder="e.g. Parent / Guardian"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
              TAB 2: GRADING SCALE & RULES CONFIGURATION
          ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'grading' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-50/70 to-amber-50/70 p-4 rounded-2xl border border-rose-200">
                  <div>
                    <h3 className="text-xs font-black text-dark-primary uppercase tracking-wider flex items-center gap-2">
                      <i className="fas fa-graduation-cap text-rose-600 text-sm" />
                      <span>Grading Scale & Performance Rules</span>
                    </h3>
                    <p className="text-xs text-dark-muted mt-0.5 max-w-xl">
                      Configure the grading rules used to compute letter grades for subjects and the
                      overall grand percentage. Define custom percentages, grade codes, and
                      descriptions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleResetGradingScale}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-dark-slate border border-light-border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      Reset Defaults
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddGrade}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fas fa-plus text-[10px]" />
                      <span>Add Grade Tier</span>
                    </button>
                  </div>
                </div>

                {/* Toggle to Show Grade Legend on Report Card */}
                <div className="bg-white p-3.5 rounded-2xl border border-light-border shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs">
                      <i className="fas fa-table-list" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-dark-primary">
                        Display Grading Scale Legend on Report Card
                      </h4>
                      <p className="text-[11px] text-dark-muted">
                        Prints a compact grade criteria key at the bottom of the card for parents
                        and students
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.showGradingScale)}
                      onChange={(e) =>
                        setCurrentConfig({ ...currentConfig, showGradingScale: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                {/* Grading Table */}
                <div className="overflow-x-auto rounded-2xl border border-light-border bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-dark-muted font-black text-[10px] uppercase tracking-wider border-b border-light-border">
                        <th className="py-3 px-4">Grade</th>
                        <th className="py-3 px-4">Marks Range (%)</th>
                        <th className="py-3 px-4">Performance Description</th>
                        <th className="py-3 px-4 text-center">Grade Points (GPA)</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border font-medium">
                      {currentConfig.gradingScale.map((tier, idx) => (
                        <tr
                          key={tier.grade + idx}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                              {tier.grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-dark-primary">
                            {tier.minPercentage}% - {tier.maxPercentage}%
                          </td>
                          <td className="py-3 px-4 text-dark-slate">{tier.description || '—'}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-dark-muted">
                            {tier.gpa != null ? Number(tier.gpa).toFixed(1) : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditGrade(idx)}
                                className="p-1.5 text-slate-500 hover:text-dark-primary cursor-pointer"
                                title="Edit grade tier"
                              >
                                <i className="fas fa-pen text-xs" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGrade(idx)}
                                className="p-1.5 text-rose-400 hover:text-rose-700 cursor-pointer"
                                title="Delete grade tier"
                              >
                                <i className="fas fa-trash text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
              TAB 3: SUBJECT GROUPINGS (Physics + Chem + Bio -> Science)
          ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'grouping' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-light-border shadow-2xs">
                  <div>
                    <h3 className="text-xs font-black text-dark-primary uppercase tracking-wider">
                      Subject Grouping System
                    </h3>
                    <p className="text-xs text-dark-muted mt-0.5 max-w-lg">
                      Group individual subjects under a custom parent title (e.g. place Physics,
                      Chemistry, and Biology under "Science").
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenNewGroup}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <i className="fas fa-plus text-[10px]" />
                    <span>Add Subject Group</span>
                  </button>
                </div>

                {currentConfig.subjectGroups.length === 0 ? (
                  <div className="text-center py-12 bg-white border border-dashed border-light-border rounded-2xl p-6">
                    <i className="fas fa-layer-group text-3xl text-slate-300 mb-2 block" />
                    <p className="text-xs font-bold text-dark-primary">No Subject Groups Defined</p>
                    <p className="text-[11px] text-dark-muted mt-1 max-w-sm mx-auto">
                      All subjects will render as individual rows in the table. Click "Add Subject
                      Group" to combine related subjects under a single category title.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentConfig.subjectGroups.map((group) => {
                      const memberSubjects = availableSubjects.filter((s) =>
                        group.subjectIds.map(String).includes(String(s.id))
                      );

                      return (
                        <div
                          key={group.id}
                          className="bg-white p-4 rounded-2xl border border-light-border shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                <i className="fas fa-folder" />
                              </div>
                              <h4 className="text-xs font-black text-dark-primary">{group.name}</h4>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditGroup(group)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Edit group"
                              >
                                <i className="fas fa-pen text-[10px]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGroup(group.id)}
                                className="p-1.5 text-rose-400 hover:text-rose-700 cursor-pointer"
                                title="Delete group"
                              >
                                <i className="fas fa-trash text-[10px]" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {memberSubjects.length > 0 ? (
                              memberSubjects.map((s) => (
                                <span
                                  key={s.id}
                                  className="px-2 py-0.5 rounded-lg bg-slate-100 text-dark-slate text-[10px] font-bold"
                                >
                                  {s.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-dark-muted italic">
                                {group.subjectIds.length} subjects mapped
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── DRAGGABLE DIVIDER / SPLITTER (Desktop) ── */}
        <div
          onMouseDown={handleSplitterMouseDown}
          onDoubleClick={() => setLeftWidthPercent(48)}
          className={`hidden lg:flex w-3 hover:w-3.5 -mx-1.5 z-20 cursor-col-resize items-center justify-center transition-all select-none group shrink-0 ${
            isDraggingSplitter ? 'bg-rose-500/20' : 'hover:bg-rose-100/80'
          }`}
          title="Drag to resize panels (Double click to reset 48/52)"
        >
          <div
            className={`w-1 h-12 rounded-full transition-all flex flex-col items-center justify-center gap-0.5 ${
              isDraggingSplitter
                ? 'bg-rose-600 h-16 shadow-xs'
                : 'bg-slate-300 group-hover:bg-rose-500'
            }`}
          >
            <span className="w-0.5 h-0.5 rounded-full bg-white opacity-80" />
            <span className="w-0.5 h-0.5 rounded-full bg-white opacity-80" />
            <span className="w-0.5 h-0.5 rounded-full bg-white opacity-80" />
          </div>
        </div>

        {/* ── RIGHT PANEL: REALTIME LIVE PREVIEW ── */}
        <div
          className={`flex flex-col bg-slate-100/90 overflow-hidden ${
            mobileView === 'config' ? 'hidden lg:flex' : 'flex'
          }`}
          style={{ width: isLgScreen ? `${100 - leftWidthPercent}%` : '100%' }}
        >
          {/* Live Preview Sub-Header */}
          <div className="px-4 py-2.5 border-b border-light-border bg-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black text-dark-primary uppercase tracking-wider">
                Real-Time Live Preview
              </span>
              <span className="text-[10px] text-dark-muted hidden md:inline">
                Updates dynamically with any configuration changes
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 bg-slate-100 border border-light-border rounded-xl p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.max(z - 10, 60))}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-dark-muted hover:text-dark-primary cursor-pointer transition-all"
                  title="Zoom Out"
                >
                  <i className="fas fa-minus text-[9px]" />
                </button>
                <span className="text-[11px] font-black text-dark-primary px-1 min-w-[34px] text-center">
                  {previewZoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(z + 10, 140))}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-dark-muted hover:text-dark-primary cursor-pointer transition-all"
                  title="Zoom In"
                >
                  <i className="fas fa-plus text-[9px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(100)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-dark-muted hover:text-dark-primary cursor-pointer transition-all"
                  title="Reset 100%"
                >
                  <i className="fas fa-undo text-[9px]" />
                </button>
              </div>

              <span className="text-[10px] font-bold text-dark-muted uppercase px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 hidden sm:inline">
                A4 Portrait
              </span>
            </div>
          </div>

          {/* Live Preview Scrollable Canvas */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex justify-center items-start">
            <div
              style={{
                transform: previewZoom !== 100 ? `scale(${previewZoom / 100})` : undefined,
                transformOrigin: 'top center',
                transition: isDraggingSplitter ? 'none' : 'transform 0.15s ease',
              }}
              className="w-full max-w-3xl"
            >
              {/* Sample Report Card Container */}
              <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-xl space-y-4">
                {currentConfig.blockOrder.map((blockKey) => {
                  const blockSize = getBlockSize(blockKey);

                  switch (blockKey) {
                    case 'schoolHeader': {
                      if (!currentConfig.showSchoolHeader) return null;
                      const hdr = currentConfig.schoolHeader;
                      const isCompact = blockSize === 'compact';
                      const isLarge = blockSize === 'large';

                      return (
                        <div
                          key="schoolHeader"
                          className={`border-b-2 border-slate-900 text-center space-y-1 relative ${
                            isCompact ? 'pb-2' : isLarge ? 'pb-4' : 'pb-3'
                          }`}
                        >
                          {hdr?.showHeaderImage && hdr?.headerImageUrl && (
                            <div className="w-full mb-2 overflow-hidden rounded-xl">
                              <img
                                src={hdr.headerImageUrl}
                                alt="School Header Banner"
                                className="w-full h-auto object-contain max-h-48 rounded-lg mx-auto block"
                              />
                            </div>
                          )}
                          {hdr?.showLogo !== false && hdr?.logoUrl && (
                            <img
                              src={hdr.logoUrl}
                              alt="Logo"
                              className={`mx-auto mb-1 object-contain ${
                                isCompact ? 'max-h-8' : isLarge ? 'max-h-16' : 'max-h-12'
                              }`}
                            />
                          )}
                          {hdr?.showTitle !== false && (
                            <h2
                              className={`font-black uppercase tracking-tight ${
                                isCompact ? 'text-lg' : isLarge ? 'text-2xl' : 'text-xl'
                              }`}
                              style={{ color: currentConfig.accentColor || '#1e293b' }}
                            >
                              {hdr?.title || 'School Name'}
                            </h2>
                          )}
                          {hdr?.showSubtitle !== false && hdr?.subtitle && (
                            <p className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">
                              {hdr.subtitle}
                            </p>
                          )}
                          {hdr?.showAddress !== false && hdr?.address && (
                            <p className="text-[10px] font-semibold text-slate-500">
                              {hdr.address}
                            </p>
                          )}
                          {hdr?.showExamTitle !== false && (
                            <div className="pt-1">
                              <span
                                className="inline-block px-3 py-0.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest"
                                style={{ backgroundColor: currentConfig.accentColor || '#0f172a' }}
                              >
                                {hdr?.examTitle || 'Official Progress Report'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    case 'studentInfo': {
                      if (!currentConfig.showStudentInfo) return null;
                      const flds = currentConfig.studentFields || {};
                      const cols = currentConfig.studentInfoConfig?.columns || 4;
                      const isCompact = blockSize === 'compact';
                      const colClass =
                        cols === 2
                          ? 'sm:grid-cols-2'
                          : cols === 3
                            ? 'sm:grid-cols-3'
                            : 'sm:grid-cols-4';

                      return (
                        <div
                          key="studentInfo"
                          className={`grid grid-cols-2 ${colClass} gap-2 bg-slate-50 rounded-xl border border-slate-200 ${
                            isCompact ? 'p-2 text-[10px]' : 'p-3 text-xs'
                          }`}
                        >
                          {flds.name && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Student Name
                              </span>
                              <span className="font-black text-dark-primary">
                                {PREVIEW_STUDENT.student_name}
                              </span>
                            </div>
                          )}
                          {flds.admissionNo && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Admission No
                              </span>
                              <span className="font-bold text-dark-slate font-mono">
                                {PREVIEW_STUDENT.admission_no}
                              </span>
                            </div>
                          )}
                          {flds.className && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Class / Grade
                              </span>
                              <span className="font-bold text-dark-slate">
                                {PREVIEW_STUDENT.class_name}
                              </span>
                            </div>
                          )}
                          {flds.rollNo && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Roll No
                              </span>
                              <span className="font-bold text-dark-slate font-mono">
                                #{PREVIEW_STUDENT.roll_no}
                              </span>
                            </div>
                          )}
                          {flds.fatherName && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Father / Guardian
                              </span>
                              <span className="font-bold text-dark-slate">
                                {PREVIEW_STUDENT.father_name}
                              </span>
                            </div>
                          )}
                          {flds.dob && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Date of Birth
                              </span>
                              <span className="font-bold text-dark-slate font-mono">
                                {PREVIEW_STUDENT.dob}
                              </span>
                            </div>
                          )}
                          {flds.gender && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Gender
                              </span>
                              <span className="font-bold text-dark-slate">
                                {PREVIEW_STUDENT.gender}
                              </span>
                            </div>
                          )}
                          {flds.bloodGroup && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Blood Group
                              </span>
                              <span className="font-bold text-dark-slate font-mono">
                                {PREVIEW_STUDENT.blood_group}
                              </span>
                            </div>
                          )}
                          {flds.attendance && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Attendance
                              </span>
                              <span className="font-bold text-emerald-700 font-mono">
                                {PREVIEW_STUDENT.attendance}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    case 'subjectTable': {
                      if (!currentConfig.showSubjectTable) return null;
                      const tbl = currentConfig.subjectTableConfig || {};
                      const isCompact = blockSize === 'compact';
                      const cellPad = isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2.5';
                      const activeCols = getActiveTableColumns(tbl);

                      return (
                        <div key="subjectTable" className="space-y-1">
                          <div className="overflow-x-auto rounded-xl border border-slate-300">
                            <table
                              className={`w-full text-left border-collapse ${isCompact ? 'text-[10px]' : 'text-xs'}`}
                            >
                              <thead
                                className="text-white text-[10px] uppercase font-black tracking-wider"
                                style={{ backgroundColor: currentConfig.accentColor || '#1e293b' }}
                              >
                                <tr>
                                  {activeCols.map((colId) => {
                                    if (colId === 'subject') {
                                      return (
                                        <th key={colId} className={`${cellPad}`}>
                                          Subject
                                        </th>
                                      );
                                    }
                                    if (colId === 'arabicName') {
                                      return (
                                        <th
                                          key={colId}
                                          className={`${cellPad} text-center font-arabic`}
                                          dir="rtl"
                                        >
                                          المادة (Arabic)
                                        </th>
                                      );
                                    }
                                    if (colId === 'maxMarks') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-center`}>
                                          Max Marks
                                        </th>
                                      );
                                    }
                                    if (colId === 'passMarks') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-center`}>
                                          Pass Marks
                                        </th>
                                      );
                                    }
                                    if (colId === 'marksObtained') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-center`}>
                                          Marks Scored
                                        </th>
                                      );
                                    }
                                    if (colId === 'percentage') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-center`}>
                                          %
                                        </th>
                                      );
                                    }
                                    if (colId === 'grade') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-center`}>
                                          Grade
                                        </th>
                                      );
                                    }
                                    if (colId === 'status') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-center`}>
                                          Status
                                        </th>
                                      );
                                    }
                                    return null;
                                  })}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {/* Grouped Sections */}
                                {previewData.sections.map((grp) => (
                                  <React.Fragment key={grp.groupName}>
                                    <tr className="bg-rose-50/60 font-black text-[10px] text-rose-900">
                                      <td
                                        colSpan={activeCols.length}
                                        className="py-1 px-2.5 uppercase tracking-wider"
                                      >
                                        <i className="fas fa-layer-group text-[9px] mr-1.5 text-rose-600" />
                                        <span>Group: {grp.groupName}</span>
                                        <span className="ml-2 font-normal text-slate-600">
                                          (Subtotal: {grp.groupTotalObt} / {grp.groupTotalMax} ·{' '}
                                          {grp.groupPct}%)
                                        </span>
                                      </td>
                                    </tr>
                                    {grp.members.map((s) => (
                                      <tr key={s.subjectId} className="hover:bg-slate-50">
                                        {activeCols.map((colId) => {
                                          if (colId === 'subject') {
                                            return (
                                              <td
                                                key={colId}
                                                className={`${cellPad} pl-5 font-semibold text-dark-primary`}
                                              >
                                                • {s.subjectName}
                                              </td>
                                            );
                                          }
                                          if (colId === 'arabicName') {
                                            return (
                                              <td
                                                key={colId}
                                                className={`${cellPad} text-center font-arabic font-semibold text-slate-700`}
                                                dir="rtl"
                                              >
                                                {s.arabicName || s.arabic_name || '—'}
                                              </td>
                                            );
                                          }
                                          if (colId === 'maxMarks') {
                                            return (
                                              <td
                                                key={colId}
                                                className={`${cellPad} text-center font-mono`}
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
                                              >
                                                {s.passMarks}
                                              </td>
                                            );
                                          }
                                          if (colId === 'marksObtained') {
                                            return (
                                              <td
                                                key={colId}
                                                className={`${cellPad} text-center font-black text-dark-primary font-mono`}
                                              >
                                                {s.marksObtained}
                                              </td>
                                            );
                                          }
                                          if (colId === 'percentage') {
                                            return (
                                              <td
                                                key={colId}
                                                className={`${cellPad} text-center font-mono font-bold text-dark-slate`}
                                              >
                                                {Math.round((s.marksObtained / s.maxMarks) * 100)}%
                                              </td>
                                            );
                                          }
                                          if (colId === 'grade') {
                                            return (
                                              <td
                                                key={colId}
                                                className={`${cellPad} text-center font-bold text-emerald-700`}
                                              >
                                                {s.grade}
                                              </td>
                                            );
                                          }
                                          if (colId === 'status') {
                                            return (
                                              <td
                                                key={colId}
                                                className={`${cellPad} text-center font-bold text-[10px] text-emerald-700`}
                                              >
                                                {s.status}
                                              </td>
                                            );
                                          }
                                          return null;
                                        })}
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                ))}

                                {/* Ungrouped Sections */}
                                {previewData.ungrouped.map((s, uIdx) => (
                                  <tr
                                    key={s.subjectId}
                                    className={
                                      tbl.bandedRows && uIdx % 2 === 1
                                        ? 'bg-slate-50/70'
                                        : 'bg-white'
                                    }
                                  >
                                    {activeCols.map((colId) => {
                                      if (colId === 'subject') {
                                        return (
                                          <td
                                            key={colId}
                                            className={`${cellPad} font-semibold text-dark-primary`}
                                          >
                                            {s.subjectName}
                                          </td>
                                        );
                                      }
                                      if (colId === 'arabicName') {
                                        return (
                                          <td
                                            key={colId}
                                            className={`${cellPad} text-center font-arabic font-semibold text-slate-700`}
                                            dir="rtl"
                                          >
                                            {s.arabicName || s.arabic_name || '—'}
                                          </td>
                                        );
                                      }
                                      if (colId === 'maxMarks') {
                                        return (
                                          <td
                                            key={colId}
                                            className={`${cellPad} text-center font-mono`}
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
                                          >
                                            {s.passMarks}
                                          </td>
                                        );
                                      }
                                      if (colId === 'marksObtained') {
                                        return (
                                          <td
                                            key={colId}
                                            className={`${cellPad} text-center font-black text-dark-primary font-mono`}
                                          >
                                            {s.marksObtained}
                                          </td>
                                        );
                                      }
                                      if (colId === 'percentage') {
                                        return (
                                          <td
                                            key={colId}
                                            className={`${cellPad} text-center font-mono font-bold text-dark-slate`}
                                          >
                                            {Math.round((s.marksObtained / s.maxMarks) * 100)}%
                                          </td>
                                        );
                                      }
                                      if (colId === 'grade') {
                                        return (
                                          <td
                                            key={colId}
                                            className={`${cellPad} text-center font-bold text-emerald-700`}
                                          >
                                            {s.grade}
                                          </td>
                                        );
                                      }
                                      if (colId === 'status') {
                                        return (
                                          <td
                                            key={colId}
                                            className={`${cellPad} text-center font-bold text-[10px] text-emerald-700`}
                                          >
                                            {s.status}
                                          </td>
                                        );
                                      }
                                      return null;
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    }

                    case 'summaryCalculations': {
                      if (!currentConfig.showSummaryCalculations) return null;
                      const sum = currentConfig.summaryConfig || {};
                      const isCompact = blockSize === 'compact';

                      return (
                        <div
                          key="summaryCalculations"
                          className={`bg-slate-900 text-white rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-2 text-center ${
                            isCompact ? 'p-2 text-xs' : 'p-3 text-sm'
                          }`}
                        >
                          {sum.showGrandTotal && (
                            <div>
                              <span className="text-[9px] text-slate-300 font-bold uppercase block">
                                Grand Total
                              </span>
                              <span className="font-black">615 / 700</span>
                            </div>
                          )}
                          {sum.showPercentage && (
                            <div>
                              <span className="text-[9px] text-slate-300 font-bold uppercase block">
                                Percentage
                              </span>
                              <span className="font-black text-emerald-400">
                                {overallPreviewPct}%
                              </span>
                            </div>
                          )}
                          {sum.showGrade && (
                            <div>
                              <span className="text-[9px] text-slate-300 font-bold uppercase block">
                                Overall Grade
                              </span>
                              <span className="font-black text-amber-400">
                                {overallPreviewGrade}
                              </span>
                            </div>
                          )}
                          {sum.showClassRank && (
                            <div>
                              <span className="text-[9px] text-slate-300 font-bold uppercase block">
                                Class Rank
                              </span>
                              <span className="font-black text-white font-mono">#3</span>
                            </div>
                          )}
                          {sum.showPassFail && (
                            <div>
                              <span className="text-[9px] text-slate-300 font-bold uppercase block">
                                Result
                              </span>
                              <span className="font-black text-emerald-400">PASS</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    case 'charts': {
                      if (!currentConfig.showCharts) return null;
                      const ch = currentConfig.chartConfig || {};
                      const chartH = ch.height || 180;

                      return (
                        <div
                          key="charts"
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
                        >
                          <h4 className="text-[11px] font-black text-dark-primary uppercase tracking-wider text-center">
                            {ch.title || 'Subject Performance Analysis'}
                          </h4>
                          <div style={{ height: `${chartH}px` }} className="w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              {ch.type === 'horizontal_bar' ? (
                                <BarChart
                                  data={previewChartData}
                                  layout="vertical"
                                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    horizontal={false}
                                    stroke="#cbd5e1"
                                  />
                                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
                                  <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fontSize: 9, fontWeight: 700 }}
                                    width={70}
                                  />
                                  <Tooltip />
                                  <Bar
                                    dataKey="Marks"
                                    fill={currentConfig.accentColor || '#e11d48'}
                                    radius={[0, 4, 4, 0]}
                                  />
                                </BarChart>
                              ) : ch.type === 'radar' ? (
                                <RadarChart
                                  cx="50%"
                                  cy="50%"
                                  outerRadius="75%"
                                  data={previewChartData}
                                >
                                  <PolarGrid stroke="#cbd5e1" />
                                  <PolarAngleAxis
                                    dataKey="name"
                                    tick={{ fontSize: 9, fontWeight: 700 }}
                                  />
                                  <PolarRadiusAxis
                                    angle={30}
                                    domain={[0, 100]}
                                    tick={{ fontSize: 8 }}
                                  />
                                  <Radar
                                    name="Marks"
                                    dataKey="Marks"
                                    stroke={currentConfig.accentColor || '#e11d48'}
                                    fill={currentConfig.accentColor || '#e11d48'}
                                    fillOpacity={0.45}
                                  />
                                  <Tooltip />
                                </RadarChart>
                              ) : ch.type === 'line' ? (
                                <LineChart
                                  data={previewChartData}
                                  margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                                  <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                                  <Tooltip />
                                  <Line
                                    type="monotone"
                                    dataKey="Marks"
                                    stroke={currentConfig.accentColor || '#e11d48'}
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: currentConfig.accentColor || '#e11d48' }}
                                  />
                                </LineChart>
                              ) : ch.type === 'area' ? (
                                <AreaChart
                                  data={previewChartData}
                                  margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                                  <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                                  <Tooltip />
                                  <Area
                                    type="monotone"
                                    dataKey="Marks"
                                    stroke={currentConfig.accentColor || '#e11d48'}
                                    strokeWidth={2}
                                    fillOpacity={0.3}
                                    fill={currentConfig.accentColor || '#e11d48'}
                                  />
                                </AreaChart>
                              ) : (
                                <BarChart
                                  data={previewChartData}
                                  margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#cbd5e1"
                                  />
                                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                                  <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                                  <Tooltip />
                                  <Bar dataKey="Marks" radius={[4, 4, 0, 0]}>
                                    {previewChartData.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={
                                          entry.Marks >= 80
                                            ? currentConfig.secondaryColor || '#059669'
                                            : currentConfig.accentColor || '#e11d48'
                                        }
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              )}
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    }

                    case 'remarks': {
                      if (!currentConfig.showTeacherRemarks) return null;
                      const rmk = currentConfig.remarksConfig || {};
                      const isCompact = blockSize === 'compact';

                      return (
                        <div
                          key="remarks"
                          className={`bg-amber-50/60 border border-amber-200 rounded-xl ${
                            isCompact ? 'p-2 text-[11px]' : 'p-3 text-xs'
                          }`}
                        >
                          <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block mb-0.5">
                            {rmk.title || 'Teacher Remarks & Recommendations'}:
                          </span>
                          <p className="text-dark-primary font-medium italic">
                            "{currentConfig.remarksText}"
                          </p>
                          {rmk.showPromotion && (
                            <p className="mt-1 font-bold text-emerald-800 text-[10px] uppercase tracking-wider">
                              Status: Eligible for promotion to next grade level.
                            </p>
                          )}
                        </div>
                      );
                    }

                    case 'signatures': {
                      if (!currentConfig.showSignatures) return null;
                      const sigCfg = currentConfig.signaturesConfig || {};
                      const isCompact = blockSize === 'compact';

                      return (
                        <div
                          key="signatures"
                          className={`border-t-2 border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs ${
                            isCompact ? 'pt-3' : 'pt-6'
                          }`}
                        >
                          {sigCfg.showClassTeacher !== false && (
                            <div className="space-y-1">
                              <div className="h-5 border-b border-dashed border-slate-400 mx-auto w-3/4" />
                              <span className="text-[10px] font-bold text-dark-muted block uppercase">
                                {currentConfig.signatures?.classTeacher || 'Class Teacher'}
                              </span>
                            </div>
                          )}
                          {sigCfg.showCoordinator !== false && (
                            <div className="space-y-1">
                              <div className="h-5 border-b border-dashed border-slate-400 mx-auto w-3/4" />
                              <span className="text-[10px] font-bold text-dark-muted block uppercase">
                                {currentConfig.signatures?.coordinator || 'Academic Coordinator'}
                              </span>
                            </div>
                          )}
                          {sigCfg.showPrincipal !== false && (
                            <div className="space-y-1">
                              <div className="h-5 border-b border-dashed border-slate-400 mx-auto w-3/4" />
                              <span className="text-[10px] font-bold text-dark-muted block uppercase">
                                {currentConfig.signatures?.principal || 'Principal'}
                              </span>
                            </div>
                          )}
                          {sigCfg.showParent !== false && (
                            <div className="space-y-1">
                              <div className="h-5 border-b border-dashed border-slate-400 mx-auto w-3/4" />
                              <span className="text-[10px] font-bold text-dark-muted block uppercase">
                                {currentConfig.signatures?.parent || 'Parent / Guardian'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    default:
                      return null;
                  }
                })}

                {/* Optional Grading Scale Legend on Preview */}
                {currentConfig.showGradingScale && currentConfig.gradingScale?.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[9px] font-black uppercase text-dark-muted block mb-1">
                      Grading Criteria Legend:
                    </span>
                    <div className="flex flex-wrap gap-2 text-[9px] text-dark-slate">
                      {currentConfig.gradingScale.map((g) => (
                        <span
                          key={g.grade}
                          className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold"
                        >
                          <strong className="text-dark-primary">{g.grade}</strong> (
                          {g.minPercentage}% - {g.maxPercentage}%
                          {g.description ? ` · ${g.description}` : ''})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grade Rule Add/Edit Modal ── */}
      {showGradeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveGradeForm}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-200 border border-slate-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
                <i className="fas fa-graduation-cap text-rose-600" />
                <span>{editingGradeIdx !== null ? 'Edit Grade Rule' : 'New Grade Rule'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowGradeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1">
                  Grade Code / Letter <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A+, B, O"
                  value={gradeForm.grade}
                  onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold uppercase focus:ring-2 focus:ring-rose-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1">
                  GPA Points (Optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={gradeForm.gpa}
                  onChange={(e) => setGradeForm({ ...gradeForm, gpa: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold focus:ring-2 focus:ring-rose-300 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1">
                  Min Percentage (%) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={gradeForm.minPercentage}
                  onChange={(e) => setGradeForm({ ...gradeForm, minPercentage: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold focus:ring-2 focus:ring-rose-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1">
                  Max Percentage (%) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={gradeForm.maxPercentage}
                  onChange={(e) => setGradeForm({ ...gradeForm, maxPercentage: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold focus:ring-2 focus:ring-rose-300 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-slate mb-1">
                Performance Description / Remark
              </label>
              <input
                type="text"
                placeholder="e.g. Outstanding, Excellent, Pass"
                value={gradeForm.description}
                onChange={(e) => setGradeForm({ ...gradeForm, description: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold focus:ring-2 focus:ring-rose-300 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-light-border">
              <button
                type="button"
                onClick={() => setShowGradeModal(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all cursor-pointer shadow-xs"
              >
                Save Grade Tier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Grouping Modal (Custom Group Name & Subject Mapping) ── */}
      {showGroupModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveGroup}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
                <i className="fas fa-folder-plus text-rose-600" />
                <span>{editingGroupId ? 'Edit Subject Group' : 'New Subject Group'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <p className="text-xs text-dark-muted">
              Specify a custom title to group multiple subjects under one header (e.g. Science,
              Social, Languages).
            </p>

            <div>
              <label className="block text-xs font-bold text-dark-slate mb-1">
                Custom Group Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Science or Languages"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white font-bold focus:ring-2 focus:ring-rose-300 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-slate mb-2">
                Select Subjects to Group
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-light-border rounded-xl">
                {availableSubjects.map((sub) => {
                  const isChecked = groupSubjectIds.includes(String(sub.id));
                  return (
                    <label
                      key={sub.id}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-white border-light-border text-dark-primary hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGroupSubjectIds([...groupSubjectIds, String(sub.id)]);
                          } else {
                            setGroupSubjectIds(
                              groupSubjectIds.filter((id) => id !== String(sub.id))
                            );
                          }
                        }}
                        className="rounded text-rose-600 focus:ring-rose-400"
                      />
                      <span>{sub.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-light-border">
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all cursor-pointer shadow-xs"
              >
                Save Grouping
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ReportCardDesigner;
