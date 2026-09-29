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
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
    classificationId: 1,
    classificationName: 'English Literacy',
  },
  {
    subjectId: '2',
    subjectName: 'Mathematics',
    arabicName: 'الرياضيات',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 94,
    status: 'PASS',
    classificationId: 10,
    classificationName: 'Modern Education',
  },
  {
    subjectId: '3',
    subjectName: 'Physics',
    arabicName: 'الفيزياء',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 82,
    status: 'PASS',
    classificationId: 10,
    classificationName: 'Modern Education',
  },
  {
    subjectId: '4',
    subjectName: 'Chemistry',
    arabicName: 'الكيمياء',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 79,
    status: 'PASS',
    classificationId: 10,
    classificationName: 'Modern Education',
  },
  {
    subjectId: '5',
    subjectName: 'Biology',
    arabicName: 'علم الأحياء',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 91,
    status: 'PASS',
    classificationId: 10,
    classificationName: 'Modern Education',
  },
  {
    subjectId: '6',
    subjectName: 'Islamic Studies',
    arabicName: 'الدراسات الإسلامية',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 96,
    status: 'PASS',
    classificationId: 12,
    classificationName: 'Personality Development',
  },
  {
    subjectId: '7',
    subjectName: 'Social Studies',
    arabicName: 'الدراسات الاجتماعية',
    maxMarks: 100,
    passMarks: 35,
    marksObtained: 85,
    status: 'PASS',
    classificationId: 10,
    classificationName: 'Modern Education',
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
// Per-block style defaults (applied globally or overridden per block)
export const DEFAULT_BLOCK_STYLE = {
  background: '',          // CSS color string or '' for transparent
  labelFontSize: 9,        // px for label/heading text
  labelColor: '',          // CSS color or '' to use theme default
  contentFontSize: 11,     // px for main content text
  contentColor: '',        // CSS color or '' to use theme default
};

// Chart column defaults for new multi-column chart system
export const DEFAULT_CHART_COLUMN = {
  chartType: 'bar',           // 'bar'|'horizontal_bar'|'line'|'area'|'donut'|'pie'|'stacked_bar'|'stacked_bar_h'|'text'
  chartData: 'subject_marks', // 'subject_marks'|'subject_pct'|'subject_classification'|'grade_classification'|'attendance'|'overall_pct'
  aggregation: 'none',        // 'none'|'sum'|'avg'|'max'
  title: '',
  colors: [],                  // user-defined palette; empty = use defaults; overflow = random hsl
  showDataLabels: false,       // backward compat: if true, showValues = true
  showValues: false,           // show numeric value on chart
  showLabels: false,           // show category / item name label on chart
  dataLabelColor: '#1e293b',   // customizable data label color
  dataLabelPosition: 'top',   // 'top'|'center'|'inside'|'insideTop'|'insideBottom'
  maxScale: 'auto',            // 'auto'|'pct100'|'custom'
  maxScaleValue: 100,          // used when maxScale === 'custom'
};

// Normalizes data label positioning across Cartesian (vertical/horizontal), Line, Area, and Pie/Donut charts
export const getLabelPlacement = (chartType, rawPos = 'top') => {
  const isHoriz = chartType === 'horizontal_bar' || chartType === 'stacked_bar_h';
  const isLineOrArea = chartType === 'line' || chartType === 'area';
  const isPie = chartType === 'donut' || chartType === 'pie';

  if (isPie) {
    const isInside = ['inside', 'center', 'insideTop', 'insideBottom'].includes(rawPos);
    return { isInside, position: isInside ? 'inside' : 'outside', offset: 0 };
  }

  if (isHoriz) {
    switch (rawPos) {
      case 'center':
        return { isInside: true, position: 'center', offset: 0 };
      case 'inside':
      case 'insideTop':
        return { isInside: true, position: 'insideRight', offset: 4 };
      case 'insideBottom':
        return { isInside: true, position: 'insideLeft', offset: 4 };
      case 'top':
      default:
        return { isInside: false, position: 'right', offset: 4 };
    }
  }

  if (isLineOrArea) {
    switch (rawPos) {
      case 'center':
        return { isInside: true, position: 'center', offset: 0 };
      case 'insideBottom':
      case 'bottom':
        return { isInside: false, position: 'bottom', offset: 6 };
      case 'top':
      case 'inside':
      case 'insideTop':
      default:
        return { isInside: false, position: 'top', offset: 6 };
    }
  }

  // Vertical Bar & Stacked Bar
  switch (rawPos) {
    case 'center':
      return { isInside: true, position: 'center', offset: 0 };
    case 'inside':
    case 'insideTop':
      return { isInside: true, position: 'insideTop', offset: 4 };
    case 'insideBottom':
      return { isInside: true, position: 'insideBottom', offset: 4 };
    case 'top':
    default:
      return { isInside: false, position: 'top', offset: 4 };
  }
};

export const CHART_TYPE_LABELS = {
  bar: 'Vertical Bar',
  horizontal_bar: 'Horizontal Bar',
  line: 'Line',
  area: 'Area',
  donut: 'Donut',
  pie: 'Pie',
  stacked_bar: 'Vertical Stacked Bar',
  stacked_bar_h: 'Horizontal Stacked Bar',
  text: 'Text / Numbers',
};

export const CHART_DATA_LABELS = {
  subject_marks: 'Subject Marks',
  subject_pct: 'Subject Mark %',
  subject_classification: 'Subject Classification',
  grade_classification: 'Grade Classification',
  attendance: 'Attendance',
  overall_pct: 'Overall Percentage',
};

export const AGGREGATION_LABELS = {
  none: 'Default / None',
  avg: 'Average (%)',
  sum: 'Sum (Total Marks)',
  max: 'Maximum Mark',
};

export const DEFAULT_MOCK_CLASSIFICATIONS = [
  { id: 1, name: 'English Literacy' },
  { id: 2, name: 'Arabic Literacy' },
  { id: 3, name: 'Tamil Literacy' },
  { id: 4, name: 'Urdu Literacy' },
  { id: 8, name: '10th Board' },
  { id: 9, name: '12th Board' },
  { id: 10, name: 'Modern Education' },
  { id: 11, name: 'Critical Thinking' },
  { id: 12, name: 'Personality Development' },
  { id: 13, name: 'Aalimiyat' },
  { id: 14, name: 'Holy Quran' },
];

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
    style: { ...DEFAULT_BLOCK_STYLE },
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
    style: { ...DEFAULT_BLOCK_STYLE },
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
    style: { ...DEFAULT_BLOCK_STYLE },
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
    // Legacy single chart (kept for backward compat, but columns[] takes priority)
    type: 'bar',
    title: 'Subject Performance Analysis',
    height: 180,
    size: 'standard', // 'compact' | 'standard' | 'large'
    tightMargins: false, // removes margins and padding to maximize chart size
    style: { ...DEFAULT_BLOCK_STYLE },
    // New multi-column chart config (up to 3 columns)
    columns: [
      {
        ...DEFAULT_CHART_COLUMN,
        chartType: 'bar',
        chartData: 'subject_marks',
        title: 'Subject Marks',
      },
    ],
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
    columns: 0,    // 0 = auto, 1-6 fixed columns per row
    style: { ...DEFAULT_BLOCK_STYLE },
    // Order of items within the summary block (drag-reorderable)
    itemOrder: ['showGrandTotal', 'showPercentage', 'showGrade', 'showClassRank', 'showPassFail', 'showTotalSubjects'],
  },
  showTeacherRemarks: true,
  remarksText: 'Hard work and continuous dedication bring great achievements.',
  remarksConfig: {
    title: 'Teacher Remarks & Recommendations',
    size: 'standard', // 'compact' | 'standard' | 'spacious'
    showSignatureLine: false,
    showPromotion: false,
    style: { ...DEFAULT_BLOCK_STYLE },
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
    style: { ...DEFAULT_BLOCK_STYLE },
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
  const [classifications, setClassifications] = useState(DEFAULT_MOCK_CLASSIFICATIONS);

  const effectiveTemplates = useMemo(() => {
    return Array.isArray(templates) && templates.length > 0 ? templates : internalTemplates;
  }, [templates, internalTemplates]);

  const effectiveSubjects = useMemo(() => {
    return Array.isArray(availableSubjects) && availableSubjects.length > 0
      ? availableSubjects
      : internalSubjects;
  }, [availableSubjects, internalSubjects]);

  const mergeConfig = (base, override) => ({
    ...base,
    ...(override || {}),
    schoolHeader: {
      ...base.schoolHeader,
      ...(override?.schoolHeader || {}),
      style: { ...DEFAULT_BLOCK_STYLE, ...base.schoolHeader?.style, ...(override?.schoolHeader?.style || {}) },
    },
    studentFields: { ...base.studentFields, ...(override?.studentFields || {}) },
    studentInfoConfig: {
      ...base.studentInfoConfig,
      ...(override?.studentInfoConfig || {}),
      style: { ...DEFAULT_BLOCK_STYLE, ...base.studentInfoConfig?.style, ...(override?.studentInfoConfig?.style || {}) },
    },
    subjectTableConfig: {
      ...base.subjectTableConfig,
      ...(override?.subjectTableConfig || {}),
      style: { ...DEFAULT_BLOCK_STYLE, ...base.subjectTableConfig?.style, ...(override?.subjectTableConfig?.style || {}) },
    },
    summaryConfig: {
      ...base.summaryConfig,
      ...(override?.summaryConfig || {}),
      style: { ...DEFAULT_BLOCK_STYLE, ...base.summaryConfig?.style, ...(override?.summaryConfig?.style || {}) },
      itemOrder: override?.summaryConfig?.itemOrder || base.summaryConfig?.itemOrder || DEFAULT_TEMPLATE.summaryConfig.itemOrder,
    },
    chartConfig: {
      ...base.chartConfig,
      ...(override?.chartConfig || {}),
      style: { ...DEFAULT_BLOCK_STYLE, ...base.chartConfig?.style, ...(override?.chartConfig?.style || {}) },
      columns: override?.chartConfig?.columns || base.chartConfig?.columns || DEFAULT_TEMPLATE.chartConfig.columns,
    },
    remarksConfig: {
      ...base.remarksConfig,
      ...(override?.remarksConfig || {}),
      style: { ...DEFAULT_BLOCK_STYLE, ...base.remarksConfig?.style, ...(override?.remarksConfig?.style || {}) },
    },
    signatures: { ...base.signatures, ...(override?.signatures || {}) },
    signaturesConfig: {
      ...base.signaturesConfig,
      ...(override?.signaturesConfig || {}),
      style: { ...DEFAULT_BLOCK_STYLE, ...base.signaturesConfig?.style, ...(override?.signaturesConfig?.style || {}) },
    },
    gradingScale:
      override?.gradingScale && override.gradingScale.length > 0
        ? override.gradingScale
        : base.gradingScale?.length > 0 ? base.gradingScale : DEFAULT_GRADING_SCALE,
    showGradingScale: override?.showGradingScale ?? base.showGradingScale ?? false,
    blockOrder: override?.blockOrder || base.blockOrder,
    subjectGroups: override?.subjectGroups || base.subjectGroups || [],
  });

  const [currentConfig, setCurrentConfig] = useState(() =>
    mergeConfig(DEFAULT_TEMPLATE, template || {})
  );

  // Auto-fetch remote templates if running standalone (no templates passed via props)
  useEffect(() => {
    if ((!templates || templates.length === 0) && internalTemplates.length === 0) {
      const loadRemoteTemplates = async () => {
        try {
          const data = await getAdminConfig(TEMPLATES_CONFIG_KEY, [DEFAULT_TEMPLATE]);
          if (data && Array.isArray(data) && data.length > 0) {
            setInternalTemplates(data);
            if (!template?.id) {
              setCurrentConfig(mergeConfig(DEFAULT_TEMPLATE, data[0]));
            }
          }
        } catch (err) {
          console.warn('[ReportCardDesigner] Failed to load remote templates:', err);
        }
      };
      loadRemoteTemplates();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Load syl_classifications
  useEffect(() => {
    const loadClassifications = async () => {
      try {
        const { data } = await supabase.from('syl_classifications').select('*').order('name');
        if (data && data.length > 0) {
          setClassifications(data);
        }
      } catch (err) {
        console.warn('[ReportCardDesigner] Failed to load classifications:', err);
      }
    };
    loadClassifications();
  }, []);

  // Sync external template changes if any
  useEffect(() => {
    if (template && template.id) {
      setCurrentConfig((prev) => {
        if (prev.id === template.id && prev.name === template.name) return prev;
        return mergeConfig(DEFAULT_TEMPLATE, template);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setCurrentConfig(mergeConfig(DEFAULT_TEMPLATE, target));
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

  // Compute preview scores with dynamically evaluated grades using currentConfig.gradingScale and classifications
  const previewScoresWithGrades = useMemo(() => {
    return RAW_PREVIEW_SCORES.map((s) => {
      const dbSub = effectiveSubjects.find(
        (as) =>
          String(as.id) === String(s.subjectId) ||
          as.name?.trim().toLowerCase() === s.subjectName?.trim().toLowerCase()
      );
      const pct = (s.marksObtained / s.maxMarks) * 100;
      const grade = calculateGrade(pct, currentConfig.gradingScale);
      const classId = dbSub?.classification_id || s.classificationId;
      const classObj = classifications.find((c) => String(c.id) === String(classId));
      const classificationName =
        classObj?.name || s.classificationName || (classId ? `Classification ${classId}` : 'General');
      return {
        ...s,
        arabicName: dbSub?.arabic_name || s.arabicName || '',
        grade,
        classificationId: classId,
        classificationName,
      };
    });
  }, [currentConfig.gradingScale, effectiveSubjects, classifications]);

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
                        {isExpanded && (() => {
                          // Helper to get/set block style
                          const getBlockStyle = () => {
                            switch (blockKey) {
                              case 'schoolHeader': return currentConfig.schoolHeader?.style || {};
                              case 'studentInfo': return currentConfig.studentInfoConfig?.style || {};
                              case 'subjectTable': return currentConfig.subjectTableConfig?.style || {};
                              case 'summaryCalculations': return currentConfig.summaryConfig?.style || {};
                              case 'charts': return currentConfig.chartConfig?.style || {};
                              case 'remarks': return currentConfig.remarksConfig?.style || {};
                              case 'signatures': return currentConfig.signaturesConfig?.style || {};
                              default: return {};
                            }
                          };
                          const setBlockStyle = (stylePatch) => {
                            const merged = { ...DEFAULT_BLOCK_STYLE, ...getBlockStyle(), ...stylePatch };
                            switch (blockKey) {
                              case 'schoolHeader': setCurrentConfig(p => ({ ...p, schoolHeader: { ...p.schoolHeader, style: merged } })); break;
                              case 'studentInfo': setCurrentConfig(p => ({ ...p, studentInfoConfig: { ...p.studentInfoConfig, style: merged } })); break;
                              case 'subjectTable': setCurrentConfig(p => ({ ...p, subjectTableConfig: { ...p.subjectTableConfig, style: merged } })); break;
                              case 'summaryCalculations': setCurrentConfig(p => ({ ...p, summaryConfig: { ...p.summaryConfig, style: merged } })); break;
                              case 'charts': setCurrentConfig(p => ({ ...p, chartConfig: { ...p.chartConfig, style: merged } })); break;
                              case 'remarks': setCurrentConfig(p => ({ ...p, remarksConfig: { ...p.remarksConfig, style: merged } })); break;
                              case 'signatures': setCurrentConfig(p => ({ ...p, signaturesConfig: { ...p.signaturesConfig, style: merged } })); break;
                              default: break;
                            }
                          };
                          const bs = { ...DEFAULT_BLOCK_STYLE, ...getBlockStyle() };
                          return (
                          <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
                            {/* Block Visibility & Size Settings Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-light-border shadow-2xs">
                              {/* Visibility Toggle */}
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-bold text-dark-slate">Visibility:</span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isVisible}
                                  onClick={() => toggleBlockVisibility(blockKey)}
                                  className="flex items-center gap-2 cursor-pointer select-none group focus:outline-hidden"
                                  title={isVisible ? 'Click to turn visibility Off' : 'Click to turn visibility On'}
                                >
                                  <div className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isVisible ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isVisible ? 'translate-x-5' : 'translate-x-0'}`} />
                                  </div>
                                  <span className={`text-xs font-black min-w-[34px] flex items-center gap-1 uppercase tracking-wide transition-colors ${isVisible ? 'text-emerald-700' : 'text-slate-500'}`}>
                                    <i className={`fas ${isVisible ? 'fa-eye text-emerald-600' : 'fa-eye-slash text-slate-400'} text-[10px]`} />
                                    <span>{isVisible ? 'On' : 'Off'}</span>
                                  </span>
                                </button>
                              </div>

                              {/* Block Size Segmented Control */}
                              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-black">
                                {['compact', 'standard', 'large'].map(sz => (
                                  <button key={sz} type="button" onClick={() => setBlockSize(blockKey, sz)}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer capitalize ${blockSize === sz ? 'bg-white text-rose-700 shadow-2xs font-black' : 'text-dark-muted hover:text-dark-primary'}`}
                                  >{sz}</button>
                                ))}
                              </div>
                            </div>

                            {/* ── Per-Block Style Controls ── */}
                            <div className="p-3 bg-white rounded-xl border border-light-border shadow-2xs space-y-3">
                              <h5 className="text-[11px] font-black text-dark-primary uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fas fa-palette text-rose-500 text-[10px]" />
                                Block Styling
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {/* Background */}
                                <div>
                                  <label className="block text-[10px] font-bold text-dark-muted mb-1">Background Color</label>
                                  <div className="flex items-center gap-1.5">
                                    <input type="color" value={bs.background || '#ffffff'}
                                      onChange={e => setBlockStyle({ background: e.target.value === '#ffffff' ? '' : e.target.value })}
                                      className="w-8 h-7 rounded-lg border border-light-border cursor-pointer"
                                    />
                                    <input type="text" value={bs.background || ''}
                                      onChange={e => setBlockStyle({ background: e.target.value })}
                                      placeholder="e.g. #f8fafc"
                                      className="flex-1 px-2 py-1 text-[10px] border border-light-border rounded-lg font-mono"
                                    />
                                    {bs.background && (
                                      <button type="button" onClick={() => setBlockStyle({ background: '' })}
                                        className="text-slate-400 hover:text-rose-600 cursor-pointer" title="Clear">
                                        <i className="fas fa-times text-[9px]" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {/* Label Font Size */}
                                <div>
                                  <label className="block text-[10px] font-bold text-dark-muted mb-1">Label Font Size (px)</label>
                                  <input type="number" min="7" max="20" step="1"
                                    value={bs.labelFontSize || 9}
                                    onChange={e => setBlockStyle({ labelFontSize: Number(e.target.value) })}
                                    className="w-full px-2 py-1.5 text-[10px] border border-light-border rounded-lg font-mono"
                                  />
                                </div>
                                {/* Label Color */}
                                <div>
                                  <label className="block text-[10px] font-bold text-dark-muted mb-1">Label Color</label>
                                  <div className="flex items-center gap-1.5">
                                    <input type="color" value={bs.labelColor || '#64748b'}
                                      onChange={e => setBlockStyle({ labelColor: e.target.value === '#64748b' ? '' : e.target.value })}
                                      className="w-8 h-7 rounded-lg border border-light-border cursor-pointer"
                                    />
                                    <input type="text" value={bs.labelColor || ''}
                                      onChange={e => setBlockStyle({ labelColor: e.target.value })}
                                      placeholder="e.g. #64748b"
                                      className="flex-1 px-2 py-1 text-[10px] border border-light-border rounded-lg font-mono"
                                    />
                                    {bs.labelColor && (
                                      <button type="button" onClick={() => setBlockStyle({ labelColor: '' })}
                                        className="text-slate-400 hover:text-rose-600 cursor-pointer" title="Clear">
                                        <i className="fas fa-times text-[9px]" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {/* Content Font Size */}
                                <div>
                                  <label className="block text-[10px] font-bold text-dark-muted mb-1">Content Font Size (px)</label>
                                  <input type="number" min="7" max="24" step="1"
                                    value={bs.contentFontSize || 11}
                                    onChange={e => setBlockStyle({ contentFontSize: Number(e.target.value) })}
                                    className="w-full px-2 py-1.5 text-[10px] border border-light-border rounded-lg font-mono"
                                  />
                                </div>
                                {/* Content Color */}
                                <div>
                                  <label className="block text-[10px] font-bold text-dark-muted mb-1">Content Color</label>
                                  <div className="flex items-center gap-1.5">
                                    <input type="color" value={bs.contentColor || '#0f172a'}
                                      onChange={e => setBlockStyle({ contentColor: e.target.value === '#0f172a' ? '' : e.target.value })}
                                      className="w-8 h-7 rounded-lg border border-light-border cursor-pointer"
                                    />
                                    <input type="text" value={bs.contentColor || ''}
                                      onChange={e => setBlockStyle({ contentColor: e.target.value })}
                                      placeholder="e.g. #0f172a"
                                      className="flex-1 px-2 py-1 text-[10px] border border-light-border rounded-lg font-mono"
                                    />
                                    {bs.contentColor && (
                                      <button type="button" onClick={() => setBlockStyle({ contentColor: '' })}
                                        className="text-slate-400 hover:text-rose-600 cursor-pointer" title="Clear">
                                        <i className="fas fa-times text-[9px]" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {/* Reset style */}
                                <div className="flex items-end">
                                  <button type="button"
                                    onClick={() => setBlockStyle({ background: '', labelFontSize: 9, labelColor: '', contentFontSize: 11, contentColor: '' })}
                                    className="px-3 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer transition-all flex items-center gap-1">
                                    <i className="fas fa-undo-alt text-[9px]" /> Reset Style
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
                            {blockKey === 'summaryCalculations' && (() => {
                              const SUMMARY_ITEM_LABELS = {
                                showGrandTotal: 'Grand Total (Obtained / Max)',
                                showPercentage: 'Percentage (%)',
                                showGrade: 'Overall Grade',
                                showClassRank: 'Class Rank (#)',
                                showPassFail: 'Result Status (PASS/FAIL)',
                                showTotalSubjects: 'Total Subjects Evaluated',
                              };
                              const itemOrder = currentConfig.summaryConfig?.itemOrder || DEFAULT_TEMPLATE.summaryConfig.itemOrder;
                              const moveSummaryItem = (idx, dir) => {
                                const newOrder = [...itemOrder];
                                const toIdx = idx + dir;
                                if (toIdx < 0 || toIdx >= newOrder.length) return;
                                [newOrder[idx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[idx]];
                                setCurrentConfig(p => ({ ...p, summaryConfig: { ...p.summaryConfig, itemOrder: newOrder } }));
                              };
                              return (
                                <div className="space-y-4">
                                  {/* Columns control */}
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-[11px] font-bold text-dark-slate">Columns per Row:</span>
                                    <div className="flex items-center gap-1">
                                      {[0, 1, 2, 3, 4, 5, 6].map(col => (
                                        <button key={col} type="button"
                                          onClick={() => setCurrentConfig(p => ({ ...p, summaryConfig: { ...p.summaryConfig, columns: col } }))}
                                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black border cursor-pointer transition-all ${
                                            (currentConfig.summaryConfig?.columns ?? 0) === col
                                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                              : 'bg-white text-dark-slate border-light-border hover:bg-slate-50'
                                          }`}>
                                          {col === 0 ? 'Auto' : col}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Items to display + sequence */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-[11px] font-black text-dark-primary flex items-center gap-1.5">
                                        <i className="fas fa-arrows-alt-v text-rose-500 text-[10px]" />
                                        Metrics & Sequence
                                      </h5>
                                      <button type="button"
                                        onClick={() => setCurrentConfig(p => ({ ...p, summaryConfig: { ...p.summaryConfig, itemOrder: DEFAULT_TEMPLATE.summaryConfig.itemOrder } }))}
                                        className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer">
                                        <i className="fas fa-undo-alt mr-1 text-[9px]" />Reset Order
                                      </button>
                                    </div>
                                    <div className="space-y-1.5">
                                      {itemOrder.map((key, idx) => (
                                        <div key={key} className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-light-border shadow-2xs hover:border-slate-300 transition-all">
                                          <div className="flex items-center gap-2">
                                            <input type="checkbox"
                                              checked={!!currentConfig.summaryConfig?.[key]}
                                              onChange={e => setCurrentConfig(p => ({ ...p, summaryConfig: { ...p.summaryConfig, [key]: e.target.checked } }))}
                                              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                                            />
                                            <span className="text-xs font-bold text-dark-primary">{SUMMARY_ITEM_LABELS[key] || key}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <button type="button" disabled={idx === 0} onClick={() => moveSummaryItem(idx, -1)}
                                              className="w-6 h-6 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-600 cursor-pointer">
                                              <i className="fas fa-arrow-up text-[10px]" />
                                            </button>
                                            <button type="button" disabled={idx === itemOrder.length - 1} onClick={() => moveSummaryItem(idx, 1)}
                                              className="w-6 h-6 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-600 cursor-pointer">
                                              <i className="fas fa-arrow-down text-[10px]" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 5. Charts Details — Multi-Column Configurator */}
                            {blockKey === 'charts' && (() => {
                              const chCfg = currentConfig.chartConfig || {};
                              const isTight = !!chCfg.tightMargins;
                              const currentHeight = chCfg.height || 180;
                              const cols = chCfg.columns || [{ ...DEFAULT_CHART_COLUMN }];
                              const updateCol = (colIdx, patch) => {
                                const next = cols.map((c, i) => i === colIdx ? { ...c, ...patch } : c);
                                setCurrentConfig(p => ({ ...p, chartConfig: { ...p.chartConfig, columns: next } }));
                              };
                              const addCol = () => {
                                if (cols.length >= 3) return;
                                setCurrentConfig(p => ({ ...p, chartConfig: { ...p.chartConfig, columns: [...cols, { ...DEFAULT_CHART_COLUMN, title: `Column ${cols.length + 1}` }] } }));
                              };
                              const removeCol = (colIdx) => {
                                if (cols.length <= 1) return;
                                setCurrentConfig(p => ({ ...p, chartConfig: { ...p.chartConfig, columns: cols.filter((_, i) => i !== colIdx) } }));
                              };
                              return (
                                <div className="space-y-4">
                                  {/* ── Chart Dimensions & Spacing Card ── */}
                                  <div className="p-3 bg-gradient-to-r from-rose-50/80 via-pink-50/50 to-slate-50 border border-rose-200/80 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-xs">
                                          <i className="fas fa-expand-arrows-alt" />
                                        </div>
                                        <div>
                                          <h5 className="text-[11px] font-black text-dark-primary leading-tight">Chart Sizing & Spacing</h5>
                                          <p className="text-[9.5px] text-dark-muted">Control chart height and eliminate padding/margins for maximum chart size</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-rose-100">
                                      {/* Maximize Size / Tight Fit Toggle */}
                                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-rose-100/90 shadow-2xs">
                                        <div>
                                          <span className="text-[10px] font-black text-dark-primary block">Maximize Chart Size</span>
                                          <span className="text-[9px] text-dark-muted font-medium block leading-snug">
                                            Remove margins & padding (full bleed)
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          role="switch"
                                          aria-checked={isTight}
                                          onClick={() => setCurrentConfig(p => ({
                                            ...p,
                                            chartConfig: { ...p.chartConfig, tightMargins: !isTight }
                                          }))}
                                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isTight ? 'bg-rose-600' : 'bg-slate-300'}`}
                                        >
                                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isTight ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                      </div>

                                      {/* Chart Height Presets + Numeric Input */}
                                      <div className="p-2.5 bg-white rounded-xl border border-rose-100/90 shadow-2xs space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-black text-dark-primary">Height</span>
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              min={80}
                                              max={600}
                                              step={10}
                                              value={currentHeight}
                                              onChange={e => {
                                                const val = Math.max(80, Math.min(600, Number(e.target.value) || 180));
                                                setCurrentConfig(p => ({
                                                  ...p,
                                                  chartConfig: { ...p.chartConfig, height: val }
                                                }));
                                              }}
                                              className="w-14 px-1.5 py-0.5 text-right font-mono text-[10px] font-black border border-slate-200 rounded-md bg-slate-50"
                                            />
                                            <span className="text-[9px] font-bold text-dark-muted">px</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {[
                                            { label: 'Compact', h: 130 },
                                            { label: 'Standard', h: 180 },
                                            { label: 'Large', h: 240 },
                                            { label: 'XL', h: 320 },
                                          ].map(preset => (
                                            <button
                                              key={preset.label}
                                              type="button"
                                              onClick={() => setCurrentConfig(p => ({
                                                ...p,
                                                chartConfig: {
                                                  ...p.chartConfig,
                                                  height: preset.h,
                                                  size: preset.label === 'Compact' ? 'compact' : preset.label === 'Large' ? 'large' : 'standard'
                                                }
                                              }))}
                                              className={`flex-1 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer ${currentHeight === preset.h ? 'bg-rose-600 text-white shadow-2xs' : 'bg-slate-100 text-dark-muted hover:bg-slate-200'}`}
                                            >
                                              {preset.label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Column count control */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="text-[11px] font-black text-dark-primary flex items-center gap-1.5">
                                        <i className="fas fa-columns text-rose-500 text-[10px]" />
                                        Chart Columns ({cols.length} / 3)
                                      </h5>
                                      <p className="text-[10px] text-dark-muted">Configure up to 3 chart columns. Each column can show a different chart or data.</p>
                                    </div>
                                    {cols.length < 3 && (
                                      <button type="button" onClick={addCol}
                                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black shadow-xs transition-all flex items-center gap-1 cursor-pointer">
                                        <i className="fas fa-plus text-[9px]" /> Add Column
                                      </button>
                                    )}
                                  </div>

                                  {/* Per-column config */}
                                  {cols.map((col, colIdx) => (
                                    <div key={colIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 relative">
                                      {/* Column header */}
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                          Column {colIdx + 1}
                                        </span>
                                        {cols.length > 1 && (
                                          <button type="button" onClick={() => removeCol(colIdx)}
                                            className="p-1.5 text-rose-400 hover:text-rose-700 cursor-pointer" title="Remove this column">
                                            <i className="fas fa-trash text-[10px]" />
                                          </button>
                                        )}
                                      </div>

                                      {/* Title */}
                                      <div>
                                        <label className="block text-[10px] font-bold text-dark-muted mb-1">Column Title (optional)</label>
                                        <input type="text" value={col.title || ''} onChange={e => updateCol(colIdx, { title: e.target.value })}
                                          placeholder={`e.g. Subject Performance`}
                                          className="w-full px-2.5 py-1.5 text-[10px] border border-light-border rounded-xl bg-white font-bold"
                                        />
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {/* Chart Type */}
                                        <div>
                                          <label className="block text-[10px] font-bold text-dark-muted mb-1">Chart Type</label>
                                          <select value={col.chartType} onChange={e => updateCol(colIdx, { chartType: e.target.value })}
                                            className="w-full px-2 py-1.5 text-[10px] border border-light-border rounded-xl bg-white font-bold">
                                            {Object.entries(CHART_TYPE_LABELS).map(([v, l]) => (
                                              <option key={v} value={v}>{l}</option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Chart Data */}
                                        <div>
                                          <label className="block text-[10px] font-bold text-dark-muted mb-1">Chart Data</label>
                                          <select
                                            value={col.chartData === 'classification' ? 'grade_classification' : (col.chartData || 'subject_marks')}
                                            onChange={e => updateCol(colIdx, { chartData: e.target.value })}
                                            className="w-full px-2 py-1.5 text-[10px] border border-light-border rounded-xl bg-white font-bold"
                                          >
                                            {Object.entries(CHART_DATA_LABELS).map(([v, l]) => (
                                              <option key={v} value={v}>{l}</option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Aggregation */}
                                        <div>
                                          <label className="block text-[10px] font-bold text-dark-muted mb-1">
                                            Aggregation {col.chartData === 'subject_classification' ? '(Category)' : ''}
                                          </label>
                                          <select
                                            value={col.aggregation || 'none'}
                                            onChange={e => updateCol(colIdx, { aggregation: e.target.value })}
                                            className="w-full px-2 py-1.5 text-[10px] border border-light-border rounded-xl bg-white font-bold"
                                          >
                                            {Object.entries(AGGREGATION_LABELS).map(([v, l]) => (
                                              <option key={v} value={v}>
                                                {col.chartData === 'subject_classification' && v === 'none' ? 'Average % (Default)' : l}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>

                                      {/* ── Color Palette ── */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-black text-dark-slate flex items-center gap-1">
                                          <i className="fas fa-palette text-rose-500 text-[9px]" />
                                          Custom Colors
                                        </label>
                                        {(col.colors || []).length > 0 && (
                                          <button type="button" onClick={() => updateCol(colIdx, { colors: [] })}
                                            className="text-[9px] font-bold text-rose-500 hover:underline cursor-pointer">
                                            Clear All
                                          </button>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-1.5 items-center">
                                        {(col.colors || []).map((c, ci) => (
                                          <div key={ci} className="relative group">
                                            <input type="color" value={c || '#e11d48'}
                                              onChange={e => {
                                                const nc = [...(col.colors || [])];
                                                nc[ci] = e.target.value;
                                                updateCol(colIdx, { colors: nc });
                                              }}
                                              className="w-7 h-7 rounded-lg border-2 border-slate-300 cursor-pointer p-0.5"
                                              title={`Color ${ci + 1}`}
                                            />
                                            <button type="button"
                                              onClick={() => updateCol(colIdx, { colors: (col.colors || []).filter((_, i) => i !== ci) })}
                                              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer leading-none">
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                        <button type="button"
                                          onClick={() => updateCol(colIdx, { colors: [...(col.colors || []), '#e11d48'] })}
                                          className="w-7 h-7 rounded-lg border-2 border-dashed border-rose-300 hover:border-rose-500 hover:bg-rose-50 flex items-center justify-center text-rose-500 cursor-pointer text-sm font-black transition-all"
                                          title="Add color">
                                          +
                                        </button>
                                      </div>
                                      <p className="text-[9px] text-dark-muted mt-1.5 leading-snug">
                                        Colors assigned in order. Extra data points beyond this list get auto-generated random colors.
                                      </p>
                                    </div>

                                    {/* ── Data Labels + Max Scale ── */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                      {/* Data Labels */}
                                      <div className="bg-white border border-light-border rounded-xl p-3 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <label className="text-[10px] font-black text-dark-slate flex items-center gap-1">
                                            <i className="fas fa-tag text-rose-500 text-[9px]" />
                                            Data Labels
                                          </label>
                                          {/* Configurable Color Picker */}
                                          <div className="flex items-center gap-1.5" title="Data label text color">
                                            <span className="text-[9px] font-bold text-dark-muted">Color</span>
                                            <input
                                              type="color"
                                              value={col.dataLabelColor || '#1e293b'}
                                              onChange={e => updateCol(colIdx, { dataLabelColor: e.target.value })}
                                              className="w-5 h-5 rounded-md border border-slate-300 cursor-pointer p-0"
                                            />
                                          </div>
                                        </div>

                                        {/* Quick Color Presets */}
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[8.5px] text-dark-muted font-bold">Presets:</span>
                                          {[
                                            { color: '#1e293b', title: 'Slate Dark' },
                                            { color: '#ffffff', title: 'White' },
                                            { color: '#e11d48', title: 'Rose' },
                                            { color: '#059669', title: 'Emerald' },
                                            { color: '#2563eb', title: 'Blue' },
                                            { color: '#7c3aed', title: 'Purple' },
                                          ].map(p => (
                                            <button
                                              key={p.color}
                                              type="button"
                                              onClick={() => updateCol(colIdx, { dataLabelColor: p.color })}
                                              className="w-3.5 h-3.5 rounded-full border border-slate-300 hover:scale-115 transition-transform shadow-2xs cursor-pointer"
                                              style={{ backgroundColor: p.color }}
                                              title={p.title}
                                            />
                                          ))}
                                        </div>

                                        {/* Checkboxes: Show Values & Show Labels */}
                                        <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                                          <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={col.showValues !== undefined ? !!col.showValues : !!col.showDataLabels}
                                              onChange={e => {
                                                const checked = e.target.checked;
                                                updateCol(colIdx, {
                                                  showValues: checked,
                                                  showDataLabels: checked || !!col.showLabels,
                                                });
                                              }}
                                              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                                            />
                                            <span className="text-[10px] font-bold text-dark-primary">Show Values</span>
                                          </label>

                                          <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={!!col.showLabels}
                                              onChange={e => {
                                                const checked = e.target.checked;
                                                updateCol(colIdx, {
                                                  showLabels: checked,
                                                  showDataLabels: checked || (col.showValues !== undefined ? !!col.showValues : false),
                                                });
                                              }}
                                              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                                            />
                                            <span className="text-[10px] font-bold text-dark-primary">Show Labels</span>
                                          </label>
                                        </div>

                                        {/* Position dropdown (when either showValues or showLabels is active) */}
                                        {((col.showValues !== undefined ? !!col.showValues : !!col.showDataLabels) || !!col.showLabels) && (
                                          <div className="pt-1 border-t border-slate-100">
                                            <label className="block text-[10px] font-bold text-dark-muted mb-1">Position</label>
                                            <select
                                              value={col.dataLabelPosition || 'top'}
                                              onChange={e => updateCol(colIdx, { dataLabelPosition: e.target.value })}
                                              className="w-full px-2 py-1.5 text-[10px] border border-light-border rounded-xl bg-white font-bold"
                                            >
                                              <option value="top">Top / Outside (Bar End)</option>
                                              <option value="center">Center (Middle)</option>
                                              <option value="inside">Inside End / Tip</option>
                                              <option value="insideTop">Inside Top</option>
                                              <option value="insideBottom">Inside Bottom (Base)</option>
                                            </select>
                                            <p className="text-[8.5px] text-dark-muted mt-1 leading-tight">
                                              For Donut/Pie, &ldquo;Inside&rdquo; or &ldquo;Center&rdquo; positions labels directly within slices.
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Max Scale */}
                                      <div className="bg-white border border-light-border rounded-xl p-3 space-y-2">
                                        <label className="text-[10px] font-black text-dark-slate flex items-center gap-1">
                                          <i className="fas fa-ruler-vertical text-rose-500 text-[9px]" />
                                          Max Scale (Y Axis)
                                        </label>
                                        <div className="space-y-1">
                                          {[
                                            { v: 'auto', label: 'Auto (Max Data)' },
                                            { v: 'pct100', label: 'Fixed 100' },
                                            { v: 'custom', label: 'Custom Number' },
                                          ].map(opt => (
                                            <label key={opt.v} className="flex items-center gap-2 cursor-pointer">
                                              <input type="radio" name={`maxScale-col-${colIdx}`} value={opt.v}
                                                checked={(col.maxScale || 'auto') === opt.v}
                                                onChange={() => updateCol(colIdx, { maxScale: opt.v })}
                                                className="text-rose-600 focus:ring-rose-400 cursor-pointer"
                                              />
                                              <span className="text-[10px] font-bold text-dark-primary">{opt.label}</span>
                                            </label>
                                          ))}
                                        </div>
                                        {(col.maxScale || 'auto') === 'custom' && (
                                          <input type="number" min={1} value={col.maxScaleValue || 100}
                                            onChange={e => updateCol(colIdx, { maxScaleValue: Number(e.target.value) })}
                                            className="w-full px-2.5 py-1.5 text-[10px] border border-light-border rounded-xl bg-white font-bold"
                                            placeholder="e.g. 100"
                                          />
                                        )}
                                      </div>

                                    </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

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
                          );
                        })()}
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
                      const hdrSt = { ...DEFAULT_BLOCK_STYLE, ...(hdr?.style || {}) };

                      return (
                        <div
                          key="schoolHeader"
                          className={`border-b-2 border-slate-900 text-center space-y-1 relative ${
                            isCompact ? 'pb-2' : isLarge ? 'pb-4' : 'pb-3'
                          }`}
                          style={hdrSt.background ? { backgroundColor: hdrSt.background } : undefined}
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
                              style={{
                                color: hdrSt.contentColor || currentConfig.accentColor || '#1e293b',
                                fontSize: hdrSt.contentFontSize ? `${hdrSt.contentFontSize}px` : undefined,
                              }}
                            >
                              {hdr?.title || 'School Name'}
                            </h2>
                          )}
                          {hdr?.showSubtitle !== false && hdr?.subtitle && (
                            <p
                              className="font-bold uppercase tracking-wider"
                              style={{
                                fontSize: `${hdrSt.labelFontSize || 11}px`,
                                color: hdrSt.labelColor || '#64748b',
                              }}
                            >
                              {hdr.subtitle}
                            </p>
                          )}
                          {hdr?.showAddress !== false && hdr?.address && (
                            <p
                              className="font-semibold"
                              style={{
                                fontSize: `${hdrSt.labelFontSize || 10}px`,
                                color: hdrSt.labelColor || '#94a3b8',
                              }}
                            >
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
                      const siSt = { ...DEFAULT_BLOCK_STYLE, ...(currentConfig.studentInfoConfig?.style || {}) };
                      const colClass =
                        cols === 2
                          ? 'sm:grid-cols-2'
                          : cols === 3
                            ? 'sm:grid-cols-3'
                            : 'sm:grid-cols-4';

                      // Reusable label/value style for studentInfo fields
                      const siLabelStyle = { fontSize: `${siSt.labelFontSize || 9}px`, color: siSt.labelColor || '#64748b' };
                      const siValueStyle = { fontSize: `${siSt.contentFontSize || 11}px`, color: siSt.contentColor || '#0f172a' };

                      return (
                        <div
                          key="studentInfo"
                          className={`grid grid-cols-2 ${colClass} gap-2 rounded-xl border border-slate-200 ${
                            isCompact ? 'p-2 text-[10px]' : 'p-3 text-xs'
                          }`}
                          style={{ backgroundColor: siSt.background || '#f8fafc' }}
                        >
                          {flds.name && (
                            <div>
                              <span className="font-bold uppercase block" style={siLabelStyle}>Student Name</span>
                              <span className="font-black" style={siValueStyle}>{PREVIEW_STUDENT.student_name}</span>
                            </div>
                          )}
                          {flds.admissionNo && (
                            <div>
                              <span className="font-bold uppercase block" style={siLabelStyle}>Admission No</span>
                              <span className="font-bold font-mono" style={siValueStyle}>{PREVIEW_STUDENT.admission_no}</span>
                            </div>
                          )}
                          {flds.className && (
                            <div>
                              <span className="font-bold uppercase block" style={siLabelStyle}>Class / Grade</span>
                              <span className="font-bold" style={siValueStyle}>{PREVIEW_STUDENT.class_name}</span>
                            </div>
                          )}
                          {flds.rollNo && (
                            <div>
                              <span className="font-bold uppercase block" style={siLabelStyle}>Roll No</span>
                              <span className="font-bold font-mono" style={siValueStyle}>#{PREVIEW_STUDENT.roll_no}</span>
                            </div>
                          )}
                          {flds.fatherName && (
                            <div>
                              <span className="font-bold uppercase block" style={siLabelStyle}>Father / Guardian</span>
                              <span className="font-bold" style={siValueStyle}>{PREVIEW_STUDENT.father_name}</span>
                            </div>
                          )}
                          {flds.dob && (
                            <div>
                              <span className="font-bold uppercase block" style={siLabelStyle}>Date of Birth</span>
                              <span className="font-bold font-mono" style={siValueStyle}>{PREVIEW_STUDENT.dob}</span>
                            </div>
                          )}
                          {flds.gender && (
                            <div>
                              <span className="font-bold uppercase block" style={siLabelStyle}>Gender</span>
                              <span className="font-bold" style={siValueStyle}>{PREVIEW_STUDENT.gender}</span>
                            </div>
                          )}
                          {flds.bloodGroup && (
                            <div>
                              <span className="font-bold uppercase block" style={siLabelStyle}>Blood Group</span>
                              <span className="font-bold font-mono" style={siValueStyle}>{PREVIEW_STUDENT.blood_group}</span>
                            </div>
                          )}
                          {flds.attendance && (
                            <div>
                              <span className="font-bold uppercase block" style={siLabelStyle}>Attendance</span>
                              <span className="font-bold font-mono" style={{ ...siValueStyle, color: siSt.contentColor || '#047857' }}>{PREVIEW_STUDENT.attendance}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    case 'subjectTable': {
                      if (!currentConfig.showSubjectTable) return null;
                      const tbl = currentConfig.subjectTableConfig || {};
                      const isCompact = blockSize === 'compact';
                      const tblSt = { ...DEFAULT_BLOCK_STYLE, ...(tbl.style || {}) };
                      const cellPad = isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2.5';
                      const activeCols = getActiveTableColumns(tbl);
                      const tblLabelStyle = { fontSize: `${tblSt.labelFontSize || 10}px`, color: tblSt.labelColor || undefined };
                      const tblValueStyle = { fontSize: `${tblSt.contentFontSize || 11}px`, color: tblSt.contentColor || undefined };

                      return (
                        <div key="subjectTable" className="space-y-1" style={tblSt.background ? { backgroundColor: tblSt.background } : undefined}>
                          <div className="overflow-x-auto rounded-xl border border-slate-300">
                            <table
                              className={`w-full text-left border-collapse ${isCompact ? 'text-[10px]' : 'text-xs'}`}
                            >
                              <thead
                                className="text-white text-[10px] uppercase font-black tracking-wider"
                                style={{ backgroundColor: currentConfig.accentColor || '#1e293b', ...tblLabelStyle, color: '#ffffff' }}
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
                                              <td key={colId} className={`${cellPad} pl-5 font-semibold`} style={tblValueStyle}>
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
                                              <td key={colId} className={`${cellPad} text-center font-bold`}
                                                style={{ color: tblSt.contentColor || '#047857' }}>
                                                {s.grade}
                                              </td>
                                            );
                                          }
                                          if (colId === 'status') {
                                            return (
                                              <td key={colId} className={`${cellPad} text-center font-bold`}
                                                style={{ fontSize: `${tblSt.labelFontSize || 10}px`, color: tblSt.contentColor || '#047857' }}>
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
                                          <td key={colId} className={`${cellPad} font-semibold`} style={tblValueStyle}>
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
                                          <td key={colId} className={`${cellPad} text-center font-bold`}
                                            style={{ color: tblSt.contentColor || '#047857' }}>
                                            {s.grade}
                                          </td>
                                        );
                                      }
                                      if (colId === 'status') {
                                        return (
                                          <td key={colId} className={`${cellPad} text-center font-bold`}
                                            style={{ fontSize: `${tblSt.labelFontSize || 10}px`, color: tblSt.contentColor || '#047857' }}>
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
                      const sumStyle = { ...DEFAULT_BLOCK_STYLE, ...(sum.style || {}) };
                      const itemOrder = sum.itemOrder || DEFAULT_TEMPLATE.summaryConfig.itemOrder;
                      const SUMMARY_PREVIEW_VALUES = {
                        showGrandTotal: { label: 'Grand Total', value: '615 / 700', color: '' },
                        showPercentage: { label: 'Percentage', value: `${overallPreviewPct}%`, color: sumStyle.contentColor || '#34d399' },
                        showGrade: { label: 'Overall Grade', value: overallPreviewGrade, color: sumStyle.contentColor || '#fbbf24' },
                        showClassRank: { label: 'Class Rank', value: '#3', color: '' },
                        showPassFail: { label: 'Result', value: 'PASS', color: sumStyle.contentColor || '#34d399' },
                        showTotalSubjects: { label: 'Total Subjects', value: '7', color: '' },
                      };
                      const visibleItems = itemOrder.filter(k => sum[k]);
                      const numCols = sum.columns > 0 ? sum.columns : Math.min(visibleItems.length, 5);
                      const gridCols = numCols <= 2 ? `grid-cols-${numCols}` : numCols === 3 ? 'grid-cols-3' : numCols === 4 ? 'grid-cols-4' : 'grid-cols-5';

                      return (
                        <div
                          key="summaryCalculations"
                          className={`rounded-xl grid ${gridCols} gap-2 text-center ${
                            isCompact ? 'p-2 text-xs' : 'p-3 text-sm'
                          }`}
                          style={{ backgroundColor: sumStyle.background || '#0f172a' }}
                        >
                          {visibleItems.map(key => {
                            const item = SUMMARY_PREVIEW_VALUES[key];
                            if (!item) return null;
                            return (
                              <div key={key}>
                                <span
                                  className="font-bold uppercase block"
                                  style={{ fontSize: `${sumStyle.labelFontSize || 9}px`, color: sumStyle.labelColor || '#94a3b8' }}
                                >
                                  {item.label}
                                </span>
                                <span
                                  className="font-black font-mono"
                                  style={{ color: item.color || sumStyle.contentColor || '#ffffff', fontSize: `${sumStyle.contentFontSize || 14}px` }}
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
                      if (!currentConfig.showCharts) return null;
                      const ch = currentConfig.chartConfig || {};
                      const chartCols = ch.columns && ch.columns.length > 0 ? ch.columns : [{ ...DEFAULT_CHART_COLUMN }];
                      const chartH = ch.height || (blockSize === 'compact' ? 130 : blockSize === 'large' ? 240 : 180);
                      const accentColor = currentConfig.accentColor || '#e11d48';
                      const secondColor = currentConfig.secondaryColor || '#059669';
                      const PALETTE = ['#e11d48', '#059669', '#7c3aed', '#0284c7', '#d97706', '#db2777', '#0891b2'];

                      // Helper: determines if a chart column represents a percentage metric
                      const isPercentage = (colCfg) => {
                        const d = colCfg.chartData === 'classification' ? 'grade_classification' : (colCfg.chartData || 'subject_marks');
                        const agg = colCfg.aggregation || 'none';
                        if (d === 'subject_pct' || d === 'overall_pct') return true;
                        if (d === 'subject_classification' && agg !== 'sum' && agg !== 'max') return true;
                        return false;
                      };

                      // Build chart data for a column config
                      const buildChartData = (colCfg) => {
                        const d = colCfg.chartData === 'classification' ? 'grade_classification' : (colCfg.chartData || 'subject_marks');
                        const agg = colCfg.aggregation || 'none';

                        if (d === 'subject_marks') {
                          return previewScoresWithGrades.map(s => ({
                            name: s.subjectName.length > 8 ? s.subjectName.slice(0, 7) + '…' : s.subjectName,
                            fullName: s.subjectName,
                            value: s.marksObtained,
                            Max: s.maxMarks,
                          }));
                        }

                        if (d === 'subject_pct') {
                          return previewScoresWithGrades.map(s => ({
                            name: s.subjectName.length > 8 ? s.subjectName.slice(0, 7) + '…' : s.subjectName,
                            fullName: s.subjectName,
                            value: Math.round((s.marksObtained / s.maxMarks) * 100),
                            Max: 100,
                          }));
                        }

                        if (d === 'subject_classification') {
                          // Aggregate preview scores by Subject Classification
                          const groupsMap = new Map();
                          previewScoresWithGrades.forEach(s => {
                            const key = s.classificationName || 'General';
                            if (!groupsMap.has(key)) {
                              groupsMap.set(key, []);
                            }
                            groupsMap.get(key).push(s);
                          });

                          const result = [];
                          groupsMap.forEach((subList, groupName) => {
                            const totalObt = subList.reduce((acc, curr) => acc + (Number(curr.marksObtained) || 0), 0);
                            const totalMax = subList.reduce((acc, curr) => acc + (Number(curr.maxMarks) || 0), 0);
                            const count = subList.length;

                            let val = 0;
                            if (agg === 'sum') {
                              val = Math.round(totalObt);
                            } else if (agg === 'max') {
                              val = Math.max(...subList.map(s => Number(s.marksObtained) || 0));
                            } else {
                              // 'avg' or 'none' / default: average percentage
                              val = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : (count > 0 ? Math.round(totalObt / count) : 0);
                            }

                            result.push({
                              name: groupName.length > 12 ? groupName.slice(0, 10) + '…' : groupName,
                              fullName: `${groupName} (${count} subject${count === 1 ? '' : 's'})`,
                              value: val,
                              count,
                              Max: agg === 'sum' ? totalMax : 100,
                            });
                          });
                          return result;
                        }

                        if (d === 'grade_classification') {
                          // Frequency distribution of grades across subjects
                          const scale = Array.isArray(currentConfig.gradingScale) && currentConfig.gradingScale.length > 0
                            ? currentConfig.gradingScale
                            : DEFAULT_GRADING_SCALE;

                          const counts = {};
                          scale.forEach(g => { counts[g.grade] = 0; });
                          previewScoresWithGrades.forEach(s => {
                            if (s.grade) {
                              counts[s.grade] = (counts[s.grade] || 0) + 1;
                            }
                          });

                          const isPieOrDonut = colCfg.chartType === 'pie' || colCfg.chartType === 'donut';
                          const gradeEntries = scale.map(g => ({
                            name: g.grade,
                            fullName: `Grade ${g.grade}${g.description ? ` (${g.description})` : ''}`,
                            value: counts[g.grade] || 0,
                            count: counts[g.grade] || 0,
                          }));

                          const nonZero = gradeEntries.filter(g => g.value > 0);
                          return (isPieOrDonut || nonZero.length >= 3) ? (nonZero.length > 0 ? nonZero : gradeEntries) : gradeEntries;
                        }

                        if (d === 'attendance') {
                          return [
                            { name: 'Present', fullName: 'Present Days', value: 96, Max: 100 },
                            { name: 'Absent', fullName: 'Absent Days', value: 4, Max: 100 },
                          ];
                        }

                        if (d === 'overall_pct') {
                          return [
                            { name: 'Score', fullName: 'Overall Score', value: Math.round(overallPreviewPct), Max: 100 },
                            { name: 'Remaining', fullName: 'Remaining', value: Math.round(100 - overallPreviewPct), Max: 100 },
                          ];
                        }

                        return previewScoresWithGrades.map(s => ({
                          name: s.subjectName.slice(0, 6),
                          fullName: s.subjectName,
                          value: s.marksObtained,
                          Max: s.maxMarks,
                        }));
                      };

                      const renderSingleChart = (colCfg, h, isTight = false) => {
                        const data = buildChartData(colCfg);
                        const t = colCfg.chartType || 'bar';
                        const pctMode = isPercentage(colCfg);
                        const cd = colCfg.chartData === 'classification' ? 'grade_classification' : (colCfg.chartData || 'subject_marks');

                        // ── Color palette: user-defined → overflow with seeded random hsl ──
                        const userColors = Array.isArray(colCfg.colors) ? colCfg.colors.filter(Boolean) : [];
                        const randomHsl = (i) => `hsl(${Math.round((i * 137.508) % 360)}, 65%, 52%)`;
                        const getColor = (i) => {
                          if (userColors.length > 0) return i < userColors.length ? userColors[i] : randomHsl(i);
                          return PALETTE[i % PALETTE.length];
                        };
                        const baseColor = getColor(0) || accentColor;

                        // ── Data labels: Show Values, Show Labels, Custom Color, Position Normalizer ──
                        const showValues = colCfg.showValues !== undefined ? !!colCfg.showValues : !!colCfg.showDataLabels;
                        const showLabels = !!colCfg.showLabels;
                        const showAnyLabel = showValues || showLabels;
                        const labelColor = colCfg.dataLabelColor || '#1e293b';
                        const rawPos = colCfg.dataLabelPosition || 'top';
                        const placement = getLabelPlacement(t, rawPos);
                        const labelStyle = { fontSize: isTight ? 8.5 : 8, fontWeight: 700, fill: labelColor };

                        // Enrich data with displayLabel based on showValues & showLabels
                        const enrichedData = data.map((d) => {
                          const fVal = pctMode ? `${d.value}%` : `${d.value}`;
                          const nameStr = d.name || '';
                          let displayLabel = '';
                          if (showValues && showLabels) {
                            displayLabel = `${nameStr}: ${fVal}`;
                          } else if (showLabels) {
                            displayLabel = nameStr;
                          } else if (showValues) {
                            displayLabel = fVal;
                          }
                          return {
                            ...d,
                            formattedValue: fVal,
                            displayLabel,
                          };
                        });

                        // ── Max scale → axis domain ──
                        const scaleType = colCfg.maxScale || 'auto';
                        const axisMax = scaleType === 'pct100' ? 100 : scaleType === 'custom' ? (Number(colCfg.maxScaleValue) || 100) : 'auto';
                        const axisDomain = axisMax === 'auto' ? [0, 'auto'] : [0, axisMax];

                        // ── Common Tooltip Formatter ──
                        const tooltipFormatter = (val, name, item) => {
                          const title = item?.payload?.fullName || name;
                          if (pctMode) return [`${val}%`, title];
                          if (cd === 'grade_classification') return [`${val} subject${val === 1 ? '' : 's'}`, title];
                          if (item?.payload?.Max) return [`${val} / ${item.payload.Max}`, title];
                          return [val, title];
                        };

                        if (t === 'text') {
                          return (
                            <div className={`flex flex-col ${isTight ? 'gap-0.5' : 'gap-1'} justify-center h-full px-1`}>
                              {enrichedData.slice(0, 6).map((d, i) => (
                                <div key={i} className="flex items-center justify-between text-[9px] font-bold">
                                  <span className="text-dark-muted truncate max-w-[60%]">{d.name}</span>
                                  <span className="font-black" style={{ color: baseColor }}>
                                    {d.value}{pctMode ? '%' : cd === 'grade_classification' ? (d.value === 1 ? ' subj' : ' subjs') : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }

                        if (t === 'donut' || t === 'pie') {
                          const isPieInside = placement.isInside;
                          const pieData = enrichedData.map((d, i) => ({ ...d, fill: getColor(i) }));
                          const outerR = isTight ? (isPieInside ? '90%' : '80%') : '70%';
                          const innerR = t === 'donut' ? (isTight ? '46%' : '40%') : 0;
                          const RADIAN = Math.PI / 180;

                          const renderCustomPieLabel = (props) => {
                            const { cx, cy, midAngle, innerRadius, outerRadius, name, value, payload, x, y } = props;
                            const text = payload?.displayLabel || (showValues && showLabels ? `${name}: ${value}` : showLabels ? `${name}` : `${value}`);
                            if (!text) return null;

                            if (isPieInside) {
                              const ir = Number(innerRadius) || 0;
                              const or = Number(outerRadius) || 60;
                              const r = ir + (or - ir) * (t === 'donut' ? 0.52 : 0.6);
                              const lx = cx + r * Math.cos(-midAngle * RADIAN);
                              const ly = cy + r * Math.sin(-midAngle * RADIAN);
                              return (
                                <text
                                  x={lx}
                                  y={ly}
                                  fill={labelColor}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fontSize={isTight ? 8.5 : 8}
                                  fontWeight={700}
                                >
                                  {text}
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
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={innerR}
                                  outerRadius={outerR}
                                  paddingAngle={isTight ? 1 : 2}
                                  label={showAnyLabel ? renderCustomPieLabel : undefined}
                                  labelLine={showAnyLabel && !isPieInside ? { stroke: labelColor, strokeWidth: 1 } : false}
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell key={index} fill={entry.fill} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
                                <Legend iconSize={isTight ? 7 : 8} wrapperStyle={{ fontSize: isTight ? 7.5 : 8, bottom: isTight ? -4 : 0 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          );
                        }

                        if (t === 'horizontal_bar') {
                          const hMargin = isTight
                            ? { top: 1, right: showAnyLabel && placement.position === 'right' ? 26 : 4, left: 16, bottom: -2 }
                            : { top: 2, right: showAnyLabel && placement.position === 'right' ? 36 : 10, left: 30, bottom: 2 };

                          return (
                            <ResponsiveContainer width="100%" height={h}>
                              <BarChart
                                data={enrichedData}
                                layout="vertical"
                                margin={hMargin}
                              >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }} width={isTight ? 28 : 36} />
                                <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
                                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                                  {enrichedData.map((_, i) => (
                                    <Cell key={i} fill={getColor(i)} />
                                  ))}
                                  {showAnyLabel && (
                                    <LabelList
                                      dataKey="displayLabel"
                                      position={placement.position}
                                      offset={placement.offset}
                                      fill={labelColor}
                                      style={labelStyle}
                                    />
                                  )}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        }

                        if (t === 'stacked_bar') {
                          const vMargin = isTight
                            ? { top: showAnyLabel && placement.position === 'top' ? 14 : 2, right: 2, left: -22, bottom: -4 }
                            : { top: showAnyLabel && placement.position === 'top' ? 16 : 2, right: 5, left: -20, bottom: 2 };

                          return (
                            <ResponsiveContainer width="100%" height={h}>
                              <BarChart data={enrichedData} margin={vMargin}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }} />
                                <YAxis tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
                                <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
                                <Bar dataKey="value" stackId="a" fill={getColor(0)}>
                                  {showAnyLabel && (
                                    <LabelList
                                      dataKey="displayLabel"
                                      position={placement.position}
                                      offset={placement.offset}
                                      fill={labelColor}
                                      style={labelStyle}
                                    />
                                  )}
                                </Bar>
                                {enrichedData[0]?.Max && <Bar dataKey="Max" stackId="a" fill="#e2e8f0" />}
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        }

                        if (t === 'stacked_bar_h') {
                          const hMargin = isTight
                            ? { top: 1, right: showAnyLabel && placement.position === 'right' ? 26 : 4, left: 16, bottom: -2 }
                            : { top: 2, right: showAnyLabel && placement.position === 'right' ? 36 : 10, left: 30, bottom: 2 };

                          return (
                            <ResponsiveContainer width="100%" height={h}>
                              <BarChart
                                data={enrichedData}
                                layout="vertical"
                                margin={hMargin}
                              >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }} width={isTight ? 28 : 36} />
                                <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
                                <Bar dataKey="value" stackId="a" fill={getColor(0)}>
                                  {showAnyLabel && (
                                    <LabelList
                                      dataKey="displayLabel"
                                      position={placement.position}
                                      offset={placement.offset}
                                      fill={labelColor}
                                      style={labelStyle}
                                    />
                                  )}
                                </Bar>
                                {enrichedData[0]?.Max && <Bar dataKey="Max" stackId="a" fill="#e2e8f0" />}
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        }

                        if (t === 'line') {
                          const lineMargin = isTight
                            ? { top: showAnyLabel && placement.position === 'top' ? 14 : 3, right: 4, left: -22, bottom: -4 }
                            : { top: showAnyLabel && placement.position === 'top' ? 16 : 5, right: 10, left: -20, bottom: 2 };

                          return (
                            <ResponsiveContainer width="100%" height={h}>
                              <LineChart data={enrichedData} margin={lineMargin}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }} />
                                <YAxis tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
                                <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
                                <Line type="monotone" dataKey="value" stroke={baseColor} strokeWidth={2} dot={{ r: 3, fill: baseColor }}>
                                  {showAnyLabel && (
                                    <LabelList
                                      dataKey="displayLabel"
                                      position={placement.position}
                                      offset={placement.offset}
                                      fill={labelColor}
                                      style={labelStyle}
                                    />
                                  )}
                                </Line>
                              </LineChart>
                            </ResponsiveContainer>
                          );
                        }

                        if (t === 'area') {
                          const areaMargin = isTight
                            ? { top: showAnyLabel && placement.position === 'top' ? 14 : 3, right: 4, left: -22, bottom: -4 }
                            : { top: showAnyLabel && placement.position === 'top' ? 16 : 5, right: 10, left: -20, bottom: 2 };

                          return (
                            <ResponsiveContainer width="100%" height={h}>
                              <AreaChart data={enrichedData} margin={areaMargin}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }} />
                                <YAxis tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
                                <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
                                <Area
                                  type="monotone"
                                  dataKey="value"
                                  stroke={baseColor}
                                  strokeWidth={2}
                                  fillOpacity={0.25}
                                  fill={baseColor}
                                >
                                  {showAnyLabel && (
                                    <LabelList
                                      dataKey="displayLabel"
                                      position={placement.position}
                                      offset={placement.offset}
                                      fill={labelColor}
                                      style={labelStyle}
                                    />
                                  )}
                                </Area>
                              </AreaChart>
                            </ResponsiveContainer>
                          );
                        }

                        // Default: vertical bar — per-bar color from palette
                        const vMargin = isTight
                          ? { top: showAnyLabel && placement.position === 'top' ? 14 : 2, right: 2, left: -22, bottom: -4 }
                          : { top: showAnyLabel && placement.position === 'top' ? 16 : 5, right: 5, left: -20, bottom: 2 };

                        return (
                          <ResponsiveContainer width="100%" height={h}>
                            <BarChart data={enrichedData} margin={vMargin}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" tick={{ fontSize: isTight ? 7.5 : 8, fontWeight: 700 }} />
                              <YAxis tick={{ fontSize: isTight ? 7.5 : 8 }} domain={axisDomain} />
                              <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
                              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                                {enrichedData.map((_, index) => (
                                  <Cell key={index} fill={getColor(index)} />
                                ))}
                                {showAnyLabel && (
                                  <LabelList
                                    dataKey="displayLabel"
                                    position={placement.position}
                                    offset={placement.offset}
                                    fill={labelColor}
                                    style={labelStyle}
                                  />
                                )}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      };

                      const colWidthClass = chartCols.length === 1 ? 'grid-cols-1' : chartCols.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

                      const chSt = { ...DEFAULT_BLOCK_STYLE, ...(ch.style || {}) };
                      const isTight = !!ch.tightMargins;

                      return (
                        <div key="charts" className={`${isTight ? 'p-1.5 space-y-1' : 'p-3 space-y-2'} border border-slate-200 rounded-xl transition-all`}
                          style={{ backgroundColor: chSt.background || '#f8fafc' }}>
                          <div className={`grid ${colWidthClass} ${isTight ? 'gap-1.5' : 'gap-3'}`}>
                            {chartCols.map((colCfg, colIdx) => (
                              <div key={colIdx} className={isTight ? 'space-y-0.5' : 'space-y-1'}>
                                {colCfg.title && (
                                  <h5 className={`${isTight ? 'text-[9.5px] mb-0.5' : 'text-[10px] mb-1'} font-black text-dark-primary uppercase tracking-wider text-center`}>
                                    {colCfg.title}
                                  </h5>
                                )}
                                {colCfg.chartType === 'text'
                                  ? <div style={{ height: `${chartH}px` }}>{renderSingleChart(colCfg, chartH, isTight)}</div>
                                  : renderSingleChart(colCfg, chartH, isTight)
                                }
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    case 'remarks': {
                      if (!currentConfig.showTeacherRemarks) return null;
                      const rmk = currentConfig.remarksConfig || {};
                      const isCompact = blockSize === 'compact';
                      const rmkSt = { ...DEFAULT_BLOCK_STYLE, ...(rmk.style || {}) };

                      return (
                        <div
                          key="remarks"
                          className={`border border-amber-200 rounded-xl ${
                            isCompact ? 'p-2' : 'p-3'
                          }`}
                          style={{ backgroundColor: rmkSt.background || 'rgb(255 251 235 / 0.6)' }}
                        >
                          <span
                            className="font-black uppercase tracking-wider block mb-0.5"
                            style={{ fontSize: `${rmkSt.labelFontSize || 10}px`, color: rmkSt.labelColor || '#78350f' }}
                          >
                            {rmk.title || 'Teacher Remarks & Recommendations'}:
                          </span>
                          <p
                            className="font-medium italic"
                            style={{ fontSize: `${rmkSt.contentFontSize || 11}px`, color: rmkSt.contentColor || '#0f172a' }}
                          >
                            &quot;{currentConfig.remarksText}&quot;
                          </p>
                          {rmk.showPromotion && (
                            <p
                              className="mt-1 font-bold uppercase tracking-wider"
                              style={{ fontSize: `${rmkSt.labelFontSize || 10}px`, color: rmkSt.contentColor || '#065f46' }}
                            >
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
                      const sigSt = { ...DEFAULT_BLOCK_STYLE, ...(sigCfg.style || {}) };

                      return (
                        <div
                          key="signatures"
                          className={`border-t-2 border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center ${
                            isCompact ? 'pt-3' : 'pt-6'
                          }`}
                          style={sigSt.background ? { backgroundColor: sigSt.background } : undefined}
                        >
                          {sigCfg.showClassTeacher !== false && (
                            <div className="space-y-1">
                              <div className="h-5 border-b border-dashed border-slate-400 mx-auto w-3/4" />
                              <span className="font-bold block uppercase"
                                style={{ fontSize: `${sigSt.labelFontSize || 10}px`, color: sigSt.labelColor || '#64748b' }}>
                                {currentConfig.signatures?.classTeacher || 'Class Teacher'}
                              </span>
                            </div>
                          )}
                          {sigCfg.showCoordinator !== false && (
                            <div className="space-y-1">
                              <div className="h-5 border-b border-dashed border-slate-400 mx-auto w-3/4" />
                              <span className="font-bold block uppercase"
                                style={{ fontSize: `${sigSt.labelFontSize || 10}px`, color: sigSt.labelColor || '#64748b' }}>
                                {currentConfig.signatures?.coordinator || 'Academic Coordinator'}
                              </span>
                            </div>
                          )}
                          {sigCfg.showPrincipal !== false && (
                            <div className="space-y-1">
                              <div className="h-5 border-b border-dashed border-slate-400 mx-auto w-3/4" />
                              <span className="font-bold block uppercase"
                                style={{ fontSize: `${sigSt.labelFontSize || 10}px`, color: sigSt.labelColor || '#64748b' }}>
                                {currentConfig.signatures?.principal || 'Principal'}
                              </span>
                            </div>
                          )}
                          {sigCfg.showParent !== false && (
                            <div className="space-y-1">
                              <div className="h-5 border-b border-dashed border-slate-400 mx-auto w-3/4" />
                              <span className="font-bold block uppercase"
                                style={{ fontSize: `${sigSt.labelFontSize || 10}px`, color: sigSt.labelColor || '#64748b' }}>
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
