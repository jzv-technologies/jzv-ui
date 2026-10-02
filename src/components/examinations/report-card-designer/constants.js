export const TEMPLATES_CONFIG_KEY = 'exam_progress_report_templates';

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

export const PREVIEW_STUDENT = {
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

export const RAW_PREVIEW_SCORES = [
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

/**
 * Drag & Drop Report Card Template Designer
 * Allows configuring layout, reordering blocks, custom subject groupings,
 * headers, footers, tables, charts, grading rules, and sizing per visual block.
 */
export const DEFAULT_TABLE_COLUMN_HEADERS = {
  subject: 'Subject',
  arabicName: 'المادة (Arabic)',
  maxMarks: 'Max Marks',
  passMarks: 'Pass Marks',
  marksObtained: 'Marks Obtained',
  percentage: 'Percentage',
  grade: 'Grade',
  status: 'Status',
};

export const DEFAULT_BLOCK_TITLES = {
  schoolHeader: 'Header Details',
  studentInfo: 'Student Information',
  attendanceBar: 'Attendance Record & Summary',
  subjectTable: 'Academic Marks & Evaluation',
  summaryCalculations: 'Performance Summary',
  charts: 'Performance Analytics',
  remarks: "Teacher's Remarks & Recommendations",
  signatures: 'Attestation & Signatures',
};

// Per-block style defaults (applied globally or overridden per block)
export const DEFAULT_BLOCK_STYLE = {
  background: '', // CSS color string or '' for transparent
  noBackground: false, // toggle for explicit transparent background
  backgroundOpacity: 100, // opacity percentage 0-100
  bgWidth: 'component', // 'component' | 'page'
  coverTop: false, // For header block: bleed to top edge of page
  coverBottom: false, // For footer block: bleed to bottom edge of page
  labelFontSize: 9, // px for label/heading text
  labelColor: '', // CSS color or '' to use theme default
  contentFontSize: 11, // px for main content text
  contentColor: '', // CSS color or '' to use theme default
  title: '', // Custom block title text (empty = uses default block title)
  showTitle: false, // Whether to display title above component
  titleAlign: 'left', // 'left' | 'center' | 'right'
};

export const BLOCK_DEFAULT_BG = {
  schoolHeader: 'transparent',
  studentInfo: '#f8fafc',
  attendanceBar: 'transparent',
  subjectTable: 'transparent',
  summaryCalculations: '#0f172a',
  charts: '#f8fafc',
  remarks: 'rgb(255 251 235 / 0.6)',
  signatures: 'transparent',
};

// Chart column defaults for multi-column chart system
export const DEFAULT_CHART_COLUMN = {
  chartType: 'bar', // 'bar'|'horizontal_bar'|'line'|'area'|'donut'|'pie'|'stacked_bar'|'stacked_bar_h'|'text'
  chartData: 'subject_marks', // 'subject_marks'|'subject_pct'|'subject_classification'|'grade_classification'|'attendance'|'overall_pct'
  aggregation: 'none', // 'none'|'sum'|'avg'|'max'
  title: '',
  colors: [], // user-defined palette; empty = use defaults; overflow = random hsl
  widthPercent: null, // delegated column width %; null = auto distributed (100 / cols.length)
  height: null, // independent chart height in px; null = inherit global chartConfig.height
  showValues: false, // show numeric value on chart
  showLabels: false, // show category / item name label on chart
  dataLabelColor: '#1e293b', // customizable data label color
  dataLabelPosition: 'top', // 'top'|'center'|'inside'|'insideTop'|'insideBottom'
  dataLabelSeparator: 'colon', // 'colon'|'newline'|'comma'|'semicolon'|'space'|'bracket'|'hyphen'|'slash'
  showLegend: false, // toggle legend display
  legendPosition: 'bottom', // 'top'|'bottom'|'left'|'right'
  legendTextColorMode: 'data_labels_color', // 'data_labels_color' | 'chart_color'
  maxScale: 'auto', // 'auto'|'pct100'|'custom'
  maxScaleValue: 100, // used when maxScale === 'custom'
  // Type-specific geometry adjustments:
  barSize: null, // null = auto, or number in px (e.g. 18)
  barGap: 4, // bar gap in px
  barCategoryGap: '15%', // gap between categories
  barRadius: 3, // corner radius
  sliceGap: 2, // pie/donut padding angle (explosion/gap)
  pieSizePercent: 80, // outer radius %
  donutHolePercent: 44, // inner radius %
  lineWidth: 2, // line stroke width
  dotSize: 3, // line dot radius
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

/**
 * Common color palette dictionary for nearest-color name identification
 */
export const NAMED_COLORS = [
  { name: 'Pure White', hex: '#ffffff', r: 255, g: 255, b: 255 },
  { name: 'Off White', hex: '#f8fafc', r: 248, g: 250, b: 252 },
  { name: 'Light Slate', hex: '#f1f5f9', r: 241, g: 245, b: 249 },
  { name: 'Border Slate', hex: '#e2e8f0', r: 226, g: 232, b: 240 },
  { name: 'Light Gray', hex: '#cbd5e1', r: 203, g: 213, b: 225 },
  { name: 'Cool Gray', hex: '#94a3b8', r: 148, g: 163, b: 184 },
  { name: 'Slate Gray', hex: '#64748b', r: 100, g: 116, b: 139 },
  { name: 'Slate', hex: '#475569', r: 71, g: 85, b: 105 },
  { name: 'Dark Slate', hex: '#334155', r: 51, g: 65, b: 85 },
  { name: 'Navy Slate', hex: '#1e293b', r: 30, g: 41, b: 59 },
  { name: 'Dark Navy', hex: '#0f172a', r: 15, g: 23, b: 42 },
  { name: 'Black', hex: '#000000', r: 0, g: 0, b: 0 },
  { name: 'Rose Red', hex: '#e11d48', r: 225, g: 29, b: 72 },
  { name: 'Deep Rose', hex: '#be123c', r: 190, g: 18, b: 60 },
  { name: 'Bright Rose', hex: '#f43f5e', r: 244, g: 63, b: 94 },
  { name: 'Dark Ruby', hex: '#881337', r: 136, g: 19, b: 55 },
  { name: 'Crimson Red', hex: '#dc2626', r: 220, g: 38, b: 38 },
  { name: 'Coral Red', hex: '#ef4444', r: 239, g: 68, b: 68 },
  { name: 'Dark Red', hex: '#b91c1c', r: 185, g: 28, b: 28 },
  { name: 'Orange', hex: '#ea580c', r: 234, g: 88, b: 12 },
  { name: 'Warm Amber', hex: '#d97706', r: 217, g: 119, b: 6 },
  { name: 'Golden Amber', hex: '#f59e0b', r: 245, g: 158, b: 11 },
  { name: 'Gold', hex: '#fbbf24', r: 251, g: 191, b: 36 },
  { name: 'Emerald Green', hex: '#059669', r: 5, g: 150, b: 105 },
  { name: 'Deep Emerald', hex: '#047857', r: 4, g: 120, b: 87 },
  { name: 'Vibrant Green', hex: '#16a34a', r: 22, g: 163, b: 74 },
  { name: 'Light Green', hex: '#22c55e', r: 34, g: 197, b: 94 },
  { name: 'Teal Green', hex: '#0d9488', r: 13, g: 148, b: 136 },
  { name: 'Cyan', hex: '#0891b2', r: 8, g: 145, b: 178 },
  { name: 'Sky Blue', hex: '#0284c7', r: 2, g: 132, b: 199 },
  { name: 'Light Sky', hex: '#38bdf8', r: 56, g: 189, b: 248 },
  { name: 'Royal Blue', hex: '#2563eb', r: 37, g: 99, b: 235 },
  { name: 'Classic Blue', hex: '#3b82f6', r: 59, g: 130, b: 246 },
  { name: 'Dark Blue', hex: '#1d4ed8', r: 29, g: 78, b: 216 },
  { name: 'Indigo', hex: '#4f46e5', r: 79, g: 70, b: 229 },
  { name: 'Violet', hex: '#7c3aed', r: 124, g: 58, b: 237 },
  { name: 'Purple', hex: '#8b5cf6', r: 139, g: 92, b: 246 },
  { name: 'Fuchsia', hex: '#c026d3', r: 192, g: 38, b: 211 },
  { name: 'Pink', hex: '#db2777', r: 219, g: 39, b: 119 },
  { name: 'Brown / Bronze', hex: '#78350f', r: 120, g: 53, b: 15 },
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
    logoUrl: '/media/jzv-round-full-trans.png',
    examTitle: 'Annual Assessment & Term Examination',
    size: 'standard', // 'compact' | 'standard' | 'large'
    showTitle: true,
    showLogo: true,
    logoSize: 48, // Logo height in px (e.g. 24 - 120)
    logoAlign: 'center', // 'left' | 'center' | 'right'
    logoVerticalAlign: 'above', // 'above' | 'inline' | 'below'
    logoOffsetY: 0, // Fine vertical offset in px (-30 to +30)
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
    showMarksBarFill: false, // in-cell visual progress bar fill
    marksBarColor: '#10b981', // emerald-500
    marksBarOpacity: 25, // 0 - 100%
    marksBarDirection: 'horizontal', // 'horizontal' | 'vertical'
    headerBgColor: '', // CSS color string or '' to use theme accent
    headerTextColor: '', // CSS color string or '' to use #ffffff
    columnLabels: {}, // Custom column header labels e.g. { subject: 'Course', marksObtained: 'Score' }
    bandedRows: true,
    bandedRowColor: '#f8fafc',
    bandedRowOpacity: 60,
    showInlineBorders: true,
    inlineBorderStyle: 'solid', // 'solid' | 'dashed' | 'dotted'
    inlineBorderColor: '#e2e8f0',
    showOutlineBorder: true,
    outlineBorderStyle: 'solid',
    outlineBorderColor: '#cbd5e1',
    outlineBorderWidth: 1,
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
    tightMargins: false,
    style: { ...DEFAULT_BLOCK_STYLE },
    columns: [
      {
        ...DEFAULT_CHART_COLUMN,
        chartType: 'bar',
        chartData: 'subject_marks',
        title: 'Subject Marks',
      },
    ],
  },
  // Background ExtraComponent / Logo configuration
  showExtraComponent: false,
  extraComponentConfig: {
    type: 'text', // 'text' | 'image'
    text: 'JAMIA ZAYTOONAH',
    imageUrl: '/media/jzv-cap-logo.png',
    opacity: 8, // 1 to 100 percentage (0.08)
    size: 60, // font-size (px) for text, or width (px) for image
    rotate: -30, // degrees: -180 to 180
    xPos: 50, // horizontal position 0 to 100%
    yPos: 50, // vertical position 0 to 100%
    color: '#0f172a',
  },
  showAttendanceBar: true,
  attendanceBarConfig: {
    title: 'Attendance Record & Summary',
    size: 'standard', // 'compact' | 'standard' | 'large'
    showTitle: true,
    showStats: true,
    showPercentage: true,
    barHeight: 18,
    presentColor: '#059669',
    absentColor: '#e11d48',
    leaveColor: '#f59e0b',
    totalWorkingDays: 200,
    style: { ...DEFAULT_BLOCK_STYLE },
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
    columns: 0, // 0 = auto, 1-6 fixed columns per row
    style: { ...DEFAULT_BLOCK_STYLE },
    // Order of items within the summary block (drag-reorderable)
    itemOrder: [
      'showGrandTotal',
      'showPercentage',
      'showGrade',
      'showClassRank',
      'showPassFail',
      'showTotalSubjects',
    ],
  },
  showTeacherRemarks: true,
  remarksText: 'Hard work and continuous dedication bring great achievements.',
  remarksConfig: {
    title: 'Teacher Remarks & Recommendations',
    showRecommendations: true,
    recommendationsTitle: 'Recommendations & Action Plan',
    defaultRemarks: 'Demonstrates good conceptual grasp and disciplined work ethic.',
    defaultRecommendations:
      'Encouraged to maintain consistent daily practice and active classroom engagement.',
    size: 'standard', // 'compact' | 'standard' | 'spacious'
    showSignatureLine: false,
    showPromotion: false,
    style: { ...DEFAULT_BLOCK_STYLE },
  },
  showSignatures: true,
  signatures: {
    signature1: 'Class Teacher',
    signature2: 'Academic Coordinator',
    signature3: 'Principal',
    signature4: 'Parent / Guardian',
  },
  signaturesConfig: {
    size: 'standard', // 'compact' | 'standard' | 'tall'
    showSignature1: true,
    showSignature2: true,
    showSignature3: true,
    showSignature4: true,
    showDate: false,
    style: { ...DEFAULT_BLOCK_STYLE },
  },
  // Grading scale configuration & display legend
  showGradingScale: false,
  gradingScale: DEFAULT_GRADING_SCALE,
  // Spacing between visual blocks in px (0 to 32)
  blockSpacing: 12,
  // Order of visual blocks
  blockOrder: [
    'schoolHeader',
    'studentInfo',
    'attendanceBar',
    'subjectTable',
    'summaryCalculations',
    'charts',
    'remarks',
    'signatures',
  ],
};

export const BLOCK_LABELS = {
  schoolHeader: { name: 'Header Component', icon: 'fa-school' },
  studentInfo: { name: 'Student Details', icon: 'fa-id-card' },
  subjectTable: { name: 'Marks Table', icon: 'fa-table-cells' },
  summaryCalculations: { name: 'Summary Table', icon: 'fa-calculator' },
  charts: { name: 'Graph Component', icon: 'fa-chart-column' },
  attendanceBar: { name: 'Attendance Graph', icon: 'fa-chart-gantt' },
  remarks: { name: 'Remarks Component', icon: 'fa-comment-dots' },
  signatures: { name: 'Footer Signatures', icon: 'fa-file-signature' },
};
