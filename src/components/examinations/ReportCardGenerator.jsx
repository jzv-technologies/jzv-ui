// src/components/examinations/ReportCardGenerator.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { getAdminConfig, saveAdminConfig } from '../../utils/adminConfigUtils';
import MultiSelectDropdown from '../MultiSelectDropdown';
import {
  DEFAULT_TEMPLATE,
  DEFAULT_GRADING_SCALE,
  DEFAULT_CHART_COLUMN,
  DEFAULT_MOCK_CLASSIFICATIONS,
  calculateGrade,
  getActiveTableColumns,
  getLabelPlacement,
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
  userRoles = [],
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
}) => {
  const [internalPaperSize, setInternalPaperSize] = useState('a4');
  const [internalOrientation, setInternalOrientation] = useState('portrait');
  const paperSize = propPaperSize || internalPaperSize;
  const orientation = propOrientation || internalOrientation;

  const [internalSchedules, setInternalSchedules] = useState(schedules);
  const [internalClasses, setInternalClasses] = useState(classes);
  const [internalSubjects, setInternalSubjects] = useState(subjects);
  const [internalClassifications, setInternalClassifications] = useState(DEFAULT_MOCK_CLASSIFICATIONS);

  const [selectedScheduleId, setSelectedScheduleId] = useState(
    initialScheduleId ? String(initialScheduleId) : schedules[0]?.id ? String(schedules[0].id) : ''
  );
  const [selectedClassId, setSelectedClassId] = useState(
    initialClassId ? String(initialClassId) : classes[0]?.id ? String(classes[0].id) : ''
  );

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

  useEffect(() => {
    if (subjects.length > 0) setInternalSubjects(subjects);
  }, [subjects]);

  // If master data props are empty (e.g. Standalone View), fetch from Supabase
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        if (schedules.length === 0) {
          const { data: sData } = await supabase
            .from('exam_schedules')
            .select('*')
            .order('start_date', { ascending: false });
          if (sData && sData.length > 0) {
            setInternalSchedules(sData);
            setSelectedScheduleId((prev) => prev || String(sData[0].id));
          }
        }
        if (classes.length === 0) {
          const { data: cData } = await supabase.from('classes').select('*').order('name');
          if (cData && cData.length > 0) {
            setInternalClasses(cData);
            setSelectedClassId((prev) => prev || String(cData[0].id));
          }
        }
        if (subjects.length === 0) {
          const { data: subData } = await supabase.from('syl_subjects').select('*').order('name');
          if (subData) setInternalSubjects(subData);
        }
        const { data: clsData } = await supabase.from('syl_classifications').select('*').order('name');
        if (clsData && clsData.length > 0) setInternalClassifications(clsData);
      } catch (err) {
        console.error('Failed to load master data in ReportCardGenerator:', err);
      }
    };
    if (schedules.length === 0 || classes.length === 0 || subjects.length === 0) {
      fetchMasterData();
    }
  }, [schedules.length, classes.length, subjects.length]);

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
  const [loading, setLoading] = useState(false);

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
    return templates.find((t) => t.id === selectedTemplateId) || templates[0] || DEFAULT_TEMPLATE;
  }, [templates, selectedTemplateId]);

  // If propStudents is passed, sync students state directly
  useEffect(() => {
    if (propStudents && Array.isArray(propStudents)) {
      setStudents(propStudents.filter((s) => String(s.class_id) === String(selectedClassId)));
    }
  }, [propStudents, selectedClassId]);

  // Load class students and exam data
  useEffect(() => {
    if (!selectedClassId || !selectedScheduleId) {
      setStudents([]);
      setResults([]);
      setEntries([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Students
        if (propStudents && Array.isArray(propStudents) && propStudents.length > 0) {
          const matched = propStudents.filter(
            (s) => String(s.class_id) === String(selectedClassId)
          );
          setStudents(matched);
        } else {
          const { data: stuData } = await supabase
            .from('students')
            .select('*')
            .eq('class_id', selectedClassId)
            .order('student_name');
          setStudents(stuData || []);
        }

        // 2. Fetch Results for this Schedule + Class
        const { data: resData } = await supabase
          .from('exam_results')
          .select('*')
          .eq('schedule_id', selectedScheduleId)
          .eq('class_id', selectedClassId);

        setResults(resData || []);

        // 3. Fetch Entries for these results
        if (resData && resData.length > 0) {
          const resIds = resData.map((r) => r.id);
          const { data: entryData } = await supabase
            .from('exam_result_entries')
            .select('*')
            .in('result_id', resIds);

          setEntries(entryData || []);
        } else {
          setEntries([]);
        }
      } catch (err) {
        console.error('Error loading report card data:', err);
        showToast('Error loading report card data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedScheduleId, selectedClassId, propStudents]);

  // Selected schedule object
  const selectedSchedule = useMemo(() => {
    return internalSchedules.find((s) => String(s.id) === String(selectedScheduleId)) || null;
  }, [internalSchedules, selectedScheduleId]);

  // Selected class object
  const selectedClass = useMemo(() => {
    return internalClasses.find((c) => String(c.id) === String(selectedClassId)) || null;
  }, [internalClasses, selectedClassId]);

  // Determine which students to render cards for
  const displayedStudents = useMemo(() => {
    if (studentSelectionMode === 'all') return students;
    if (selectedStudentIds === undefined || selectedStudentIds === null) {
      return students;
    }
    if (selectedStudentIds.length === 0) {
      return [];
    }
    if (selectedStudentIds.length === students.length) {
      return students;
    }
    const stringIds = new Set(selectedStudentIds.map(String));
    return students.filter((s) => stringIds.has(String(s.id)));
  }, [students, studentSelectionMode, selectedStudentIds]);

  // Compute calculated metrics & ranks across all students in class
  const studentMetricsMap = useMemo(() => {
    if (students.length === 0 || results.length === 0) return {};
    const scale = activeTemplate?.gradingScale || DEFAULT_GRADING_SCALE;

    const studentCalculations = students.map((student) => {
      let totalObtained = 0;
      let totalMax = 0;
      let hasFailed = false;
      const subjectScores = [];

      results.forEach((result) => {
        const sub = internalSubjects.find((s) => String(s.id) === String(result.subject_id));
        const entry = entries.find(
          (e) =>
            String(e.result_id) === String(result.id) && String(e.student_id) === String(student.id)
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

        const clsObj = internalClassifications.find(
          (c) => String(c.id) === String(sub?.classification_id)
        );
        const classificationName = clsObj?.name || 'General';

        subjectScores.push({
          subjectId: result.subject_id,
          subjectName: sub?.name || `Subject #${result.subject_id}`,
          arabicName: sub?.arabic_name || '',
          classificationId: sub?.classification_id || null,
          classificationName,
          maxMarks,
          passMarks,
          marksObtained: isAbsent ? 'Absent' : marks !== null ? marks : '—',
          rawMarks: marks || 0,
          isAbsent,
          grade,
          status,
        });
      });

      const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const overallGrade = calculateGrade(overallPct, scale);

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

    // Rank students by totalObtained descending
    const sortedByTotal = [...studentCalculations].sort(
      (a, b) => b.totalObtained - a.totalObtained
    );
    const metricsMap = {};
    sortedByTotal.forEach((item, idx) => {
      metricsMap[String(item.studentId)] = {
        ...item,
        classRank: idx + 1,
      };
    });

    return metricsMap;
  }, [students, results, entries, internalSubjects, activeTemplate?.gradingScale]);

  const handlePrint = () => {
    window.print();
  };


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
                <h2 className="text-base font-black text-dark-primary tracking-tight">
                  Progress Report Generator
                </h2>
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
          <style>{`
            @media print {
              @page {
                size: ${paperSize} ${orientation};
                margin: 0 !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              header, nav, aside, footer, [data-feature-filter], [data-feature-tab], .print\\:hidden {
                display: none !important;
              }
              .print-cards-container {
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
              }
              .progress-report-card-page {
                width: 100vw !important;
                height: 100vh !important;
                max-height: 100vh !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                padding: ${orientation === 'landscape' ? '5mm 7mm' : '7mm 8mm'} !important;
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                gap: ${orientation === 'landscape' ? '2mm' : '2.5mm'} !important;
                overflow: hidden !important;
                background: #ffffff !important;
              }
              .progress-report-card-page > * {
                margin-top: 0 !important;
                margin-bottom: 0 !important;
              }
              .progress-report-card-page .report-card-signatures {
                margin-top: auto !important;
                padding-top: 2.5mm !important;
              }
              .progress-report-card-page table {
                font-size: 9.5px !important;
              }
              .progress-report-card-page th,
              .progress-report-card-page td {
                padding: 3px 5px !important;
              }
            }
          `}</style>
          {displayedStudents.map((student, studentIdx) => {
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
                className="bg-white border-2 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-md print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0 progress-report-card-page max-w-4xl mx-auto space-y-4 print:space-y-0"
              >
                {/* ── Render Blocks according to activeTemplate.blockOrder ── */}
                {activeTemplate.blockOrder.map((blockKey) => {
                  switch (blockKey) {
                    case 'schoolHeader': {
                      if (!activeTemplate.showSchoolHeader) return null;
                      const hdr = activeTemplate.schoolHeader || {};
                      const isCompact = hdr.size === 'compact';
                      const isLarge = hdr.size === 'large';

                      return (
                        <div
                          key="schoolHeader"
                          className={`border-b-2 border-slate-900 text-center space-y-1 print:space-y-0.5 relative ${
                            isCompact
                              ? 'pb-2 print:pb-0.5'
                              : isLarge
                                ? 'pb-4 print:pb-2'
                                : 'pb-3 print:pb-1'
                          }`}
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
                          {hdr.showLogo !== false && hdr.logoUrl && (
                            <img
                              src={hdr.logoUrl}
                              alt="School Logo"
                              className={`mx-auto mb-1 print:mb-0 object-contain ${
                                isCompact
                                  ? 'max-h-8 print:max-h-6'
                                  : isLarge
                                    ? 'max-h-16 print:max-h-10'
                                    : 'max-h-12 print:max-h-8'
                              }`}
                            />
                          )}
                          {hdr.showTitle !== false && hdr.title && (
                            <h1
                              className={`font-black tracking-tight uppercase text-dark-primary ${
                                isCompact
                                  ? 'text-lg print:text-xs'
                                  : isLarge
                                    ? 'text-2xl print:text-lg'
                                    : 'text-xl sm:text-2xl print:text-base'
                              }`}
                              style={{ color: activeTemplate.accentColor || '#0f172a' }}
                            >
                              {hdr.title}
                            </h1>
                          )}
                          {hdr.showSubtitle !== false && hdr.subtitle && (
                            <p className="text-xs print:text-[8.5px] font-bold text-dark-muted uppercase tracking-wider">
                              {hdr.subtitle}
                            </p>
                          )}
                          {hdr.showAddress !== false && hdr.address && (
                            <p className="text-[10px] print:text-[7.5px] font-semibold text-slate-500">
                              {hdr.address}
                            </p>
                          )}
                          {hdr.showExamTitle !== false && (
                            <div className="pt-1 print:pt-0.5">
                              <span
                                className="inline-block px-3 py-0.5 print:py-0.2 print:px-2 rounded-full text-white text-[10px] print:text-[8px] font-black uppercase tracking-widest"
                                style={{ backgroundColor: activeTemplate.accentColor || '#0f172a' }}
                              >
                                {selectedSchedule?.name || hdr.examTitle || 'Official Progress Report'}
                              </span>
                            </div>
                          )}
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
                      const colClass =
                        cols === 2
                          ? 'sm:grid-cols-2'
                          : cols === 3
                            ? 'sm:grid-cols-3'
                            : 'sm:grid-cols-4';

                      return (
                        <div
                          key="studentInfo"
                          className={`bg-slate-50 border border-slate-200 rounded-2xl print:rounded-lg grid grid-cols-2 ${colClass} ${
                            isCompact
                              ? 'p-2.5 print:p-1.5 gap-2 print:gap-1 text-[11px] print:text-[8.5px]'
                              : isLarge
                                ? 'p-4 print:p-2.5 gap-3 print:gap-2 text-xs print:text-[10.5px]'
                                : 'p-3.5 print:p-2 gap-2.5 print:gap-1.5 text-xs print:text-[10px]'
                          }`}
                        >
                          {flds.name !== false && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] font-bold text-dark-muted uppercase block">
                                Student Name
                              </span>
                              <span className="font-black text-dark-primary text-sm print:text-xs">
                                {student.student_name}
                              </span>
                            </div>
                          )}
                          {flds.admissionNo !== false && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] font-bold text-dark-muted uppercase block">
                                Admission No
                              </span>
                              <span className="font-mono font-bold text-dark-primary">
                                {student.admission_no}
                              </span>
                            </div>
                          )}
                          {flds.className !== false && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] font-bold text-dark-muted uppercase block">
                                Class & Section
                              </span>
                              <span className="font-bold text-rose-700">
                                {selectedClass?.name || `Class ${student.class_id}`}
                              </span>
                            </div>
                          )}
                          {flds.rollNo !== false && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] font-bold text-dark-muted uppercase block">
                                Roll No
                              </span>
                              <span className="font-mono font-bold text-dark-primary">
                                {student.roll_no || studentIdx + 1}
                              </span>
                            </div>
                          )}
                          {flds.fatherName && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] font-bold text-dark-muted uppercase block">
                                Father / Guardian
                              </span>
                              <span className="font-bold text-dark-slate">
                                {student.father_name || '—'}
                              </span>
                            </div>
                          )}
                          {flds.dob && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] font-bold text-dark-muted uppercase block">
                                Date of Birth
                              </span>
                              <span className="font-mono font-bold text-dark-slate">
                                {student.dob || '—'}
                              </span>
                            </div>
                          )}
                          {flds.gender && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] font-bold text-dark-muted uppercase block">
                                Gender
                              </span>
                              <span className="font-bold text-dark-slate">
                                {student.gender || '—'}
                              </span>
                            </div>
                          )}
                          {flds.bloodGroup && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] font-bold text-dark-muted uppercase block">
                                Blood Group
                              </span>
                              <span className="font-mono font-bold text-dark-slate">
                                {student.blood_group || '—'}
                              </span>
                            </div>
                          )}
                          {flds.attendance && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] font-bold text-dark-muted uppercase block">
                                Attendance
                              </span>
                              <span className="font-mono font-bold text-emerald-700">
                                {student.attendance || '—'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    case 'subjectTable': {
                      if (!activeTemplate.showSubjectTable) return null;
                      const tbl = activeTemplate.subjectTableConfig || {};
                      const isCompact = tbl.size === 'compact';
                      const isSpacious = tbl.size === 'spacious';
                      const cellPad = isCompact
                        ? 'py-1 print:py-0.5 px-2 print:px-1'
                        : isSpacious
                          ? 'py-2 print:py-1 px-3 print:px-2'
                          : 'py-1.5 print:py-0.5 px-2.5 print:px-1.5';
                      const fontClass = isCompact
                        ? 'text-[10px] print:text-[8.5px]'
                        : isSpacious
                          ? 'text-xs print:text-[10.5px]'
                          : 'text-xs print:text-[9.5px]';
                      const activeCols = getActiveTableColumns(tbl);

                      return (
                        <div key="subjectTable" className="space-y-1.5 print:space-y-1">
                          <h3 className="text-xs print:text-[9px] font-black text-dark-primary uppercase tracking-wider">
                            Academic Marks Register
                          </h3>
                          <div className="overflow-x-auto rounded-xl border border-slate-900 print:rounded-lg">
                            <table className={`w-full ${fontClass} border-collapse`}>
                              <thead>
                                <tr
                                  className="text-white font-black text-[10px] print:text-[8.5px] uppercase tracking-wider"
                                  style={{ backgroundColor: activeTemplate.accentColor || '#0f172a' }}
                                >
                                  {activeCols.map((colId) => {
                                    if (colId === 'subject') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-left`}>
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
                                        <th key={colId} className={`${cellPad} text-center w-20 print:w-14`}>
                                          Max Marks
                                        </th>
                                      );
                                    }
                                    if (colId === 'passMarks') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-center w-20 print:w-14`}>
                                          Pass Marks
                                        </th>
                                      );
                                    }
                                    if (colId === 'marksObtained') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-center w-24 print:w-16`}>
                                          Marks Obtained
                                        </th>
                                      );
                                    }
                                    if (colId === 'percentage') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-center w-16 print:w-12`}>
                                          %
                                        </th>
                                      );
                                    }
                                    if (colId === 'grade') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-center w-16 print:w-12`}>
                                          Grade
                                        </th>
                                      );
                                    }
                                    if (colId === 'status') {
                                      return (
                                        <th key={colId} className={`${cellPad} text-center w-20 print:w-14`}>
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
                                {groupedSections.map((grp) => (
                                  <React.Fragment key={grp.groupName}>
                                    <tr className="bg-slate-100 font-black text-[11px] print:text-[9px] text-dark-primary">
                                      <td
                                        colSpan={activeCols.length}
                                        className="py-1 print:py-0.5 px-2.5 print:px-1.5 uppercase tracking-wider bg-rose-50/70 text-rose-900 border-y border-rose-200"
                                      >
                                        <i className="fas fa-layer-group text-[10px] mr-1.5 text-rose-600" />
                                        <span>Group: {grp.groupName}</span>
                                        <span className="ml-3 font-normal text-[10px] print:text-[8px] text-dark-muted">
                                          (Subtotal: {grp.groupTotalObt} / {grp.groupTotalMax} · {grp.groupPct}%)
                                        </span>
                                      </td>
                                    </tr>
                                    {grp.members.map((s) => (
                                      <tr key={s.subjectId} className="hover:bg-slate-50/50">
                                        {activeCols.map((colId) => {
                                          if (colId === 'subject') {
                                            return (
                                              <td
                                                key={colId}
                                                className={`${cellPad} font-bold text-dark-primary pl-5 print:pl-3`}
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
                                                {s.arabicName || '—'}
                                              </td>
                                            );
                                          }
                                          if (colId === 'maxMarks') {
                                            return (
                                              <td key={colId} className={`${cellPad} text-center font-mono`}>
                                                {s.maxMarks}
                                              </td>
                                            );
                                          }
                                          if (colId === 'passMarks') {
                                            return (
                                              <td key={colId} className={`${cellPad} text-center font-mono`}>
                                                {s.passMarks || '—'}
                                              </td>
                                            );
                                          }
                                          if (colId === 'marksObtained') {
                                            return (
                                              <td
                                                key={colId}
                                                className={`${cellPad} text-center font-black ${
                                                  s.status === 'FAIL'
                                                    ? 'text-rose-600'
                                                    : s.isAbsent
                                                      ? 'text-amber-600'
                                                      : 'text-dark-primary'
                                                }`}
                                              >
                                                {s.marksObtained}
                                              </td>
                                            );
                                          }
                                          if (colId === 'percentage') {
                                            return (
                                              <td key={colId} className={`${cellPad} text-center font-mono font-bold text-dark-slate`}>
                                                {typeof s.marksObtained === 'number' && s.maxMarks > 0
                                                  ? `${Math.round((s.marksObtained / s.maxMarks) * 100)}%`
                                                  : '—'}
                                              </td>
                                            );
                                          }
                                          if (colId === 'grade') {
                                            return (
                                              <td key={colId} className={`${cellPad} text-center font-bold text-emerald-700`}>
                                                {s.grade}
                                              </td>
                                            );
                                          }
                                          if (colId === 'status') {
                                            return (
                                              <td key={colId} className={`${cellPad} text-center font-bold text-[10px] print:text-[8.5px]`}>
                                                <span className={s.status === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}>
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
                                {ungroupedScores.map((s, uIdx) => (
                                  <tr
                                    key={s.subjectId}
                                    className={
                                      tbl.bandedRows && uIdx % 2 === 1
                                        ? 'bg-slate-50/60'
                                        : 'hover:bg-slate-50/50'
                                    }
                                  >
                                    {activeCols.map((colId) => {
                                      if (colId === 'subject') {
                                        return (
                                          <td key={colId} className={`${cellPad} font-bold text-dark-primary`}>
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
                                            {s.arabicName || '—'}
                                          </td>
                                        );
                                      }
                                      if (colId === 'maxMarks') {
                                        return (
                                          <td key={colId} className={`${cellPad} text-center font-mono`}>
                                            {s.maxMarks}
                                          </td>
                                        );
                                      }
                                      if (colId === 'passMarks') {
                                        return (
                                          <td key={colId} className={`${cellPad} text-center font-mono`}>
                                            {s.passMarks || '—'}
                                          </td>
                                        );
                                      }
                                      if (colId === 'marksObtained') {
                                        return (
                                          <td
                                            key={colId}
                                            className={`${cellPad} text-center font-black ${
                                              s.status === 'FAIL'
                                                ? 'text-rose-600'
                                                : s.isAbsent
                                                  ? 'text-amber-600'
                                                  : 'text-dark-primary'
                                            }`}
                                          >
                                            {s.marksObtained}
                                          </td>
                                        );
                                      }
                                      if (colId === 'percentage') {
                                        return (
                                          <td key={colId} className={`${cellPad} text-center font-mono font-bold text-dark-slate`}>
                                            {typeof s.marksObtained === 'number' && s.maxMarks > 0
                                              ? `${Math.round((s.marksObtained / s.maxMarks) * 100)}%`
                                              : '—'}
                                          </td>
                                        );
                                      }
                                      if (colId === 'grade') {
                                        return (
                                          <td key={colId} className={`${cellPad} text-center font-bold text-emerald-700`}>
                                            {s.grade}
                                          </td>
                                        );
                                      }
                                      if (colId === 'status') {
                                        return (
                                          <td key={colId} className={`${cellPad} text-center font-bold text-[10px] print:text-[8.5px]`}>
                                            <span className={s.status === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}>
                                              {s.status}
                                            </span>
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
                      if (!activeTemplate.showSummaryCalculations) return null;
                      const sum = activeTemplate.summaryConfig || {};
                      const isCompact = sum.size === 'compact';
                      const isLarge = sum.size === 'large';

                      return (
                        <div
                          key="summaryCalculations"
                          className={`bg-slate-900 text-white rounded-2xl print:rounded-lg grid grid-cols-2 sm:grid-cols-5 gap-2.5 print:gap-1 text-center ${
                            isCompact
                              ? 'p-2.5 print:p-1'
                              : isLarge
                                ? 'p-4.5 print:p-2'
                                : 'p-3.5 print:p-1.5'
                          }`}
                        >
                          {sum.showGrandTotal !== false && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] text-slate-300 font-bold uppercase block">
                                Grand Total
                              </span>
                              <span className={`font-black text-white ${isCompact ? 'text-sm print:text-[11px]' : 'text-base print:text-xs'}`}>
                                {metrics.totalObtained} / {metrics.totalMax}
                              </span>
                            </div>
                          )}
                          {sum.showPercentage !== false && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] text-slate-300 font-bold uppercase block">
                                Percentage
                              </span>
                              <span className={`font-black text-emerald-400 ${isCompact ? 'text-sm print:text-[11px]' : 'text-base print:text-xs'}`}>
                                {metrics.percentage}%
                              </span>
                            </div>
                          )}
                          {sum.showGrade !== false && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] text-slate-300 font-bold uppercase block">
                                Overall Grade
                              </span>
                              <span className={`font-black text-amber-400 ${isCompact ? 'text-sm print:text-[11px]' : 'text-base print:text-xs'}`}>
                                {metrics.overallGrade}
                              </span>
                            </div>
                          )}
                          {sum.showClassRank !== false && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] text-slate-300 font-bold uppercase block">
                                Class Rank
                              </span>
                              <span className={`font-black text-white font-mono ${isCompact ? 'text-sm print:text-[11px]' : 'text-base print:text-xs'}`}>
                                #{metrics.classRank}
                              </span>
                            </div>
                          )}
                          {sum.showPassFail !== false && (
                            <div>
                              <span className="text-[10px] print:text-[7.5px] text-slate-300 font-bold uppercase block">
                                Result
                              </span>
                              <span
                                className={`font-black ${
                                  metrics.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'
                                } ${isCompact ? 'text-sm print:text-[11px]' : 'text-base print:text-xs'}`}
                              >
                                {metrics.status}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    case 'charts': {
                      if (!activeTemplate.showCharts || chartData.length === 0) return null;
                      const ch = activeTemplate.chartConfig || {};

                      // If multi-column charts are defined, render them
                      if (ch.columns && ch.columns.length > 0) {
                        const chartCols = ch.columns;
                        const colWidthClass = chartCols.length === 1 ? 'grid-cols-1' : chartCols.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
                        const chartH = ch.height || (ch.size === 'compact' ? 120 : ch.size === 'large' ? 220 : 160);
                        const accentColor = activeTemplate.accentColor || '#e11d48';
                        const PALETTE = ['#e11d48', '#059669', '#7c3aed', '#0284c7', '#d97706', '#db2777', '#0891b2'];

                        const isPercentage = (colCfg) => {
                          const d = colCfg.chartData === 'classification' ? 'grade_classification' : (colCfg.chartData || 'subject_marks');
                          const agg = colCfg.aggregation || 'none';
                          if (d === 'subject_pct' || d === 'overall_pct') return true;
                          if (d === 'subject_classification' && agg !== 'sum' && agg !== 'max') return true;
                          return false;
                        };

                        const buildColData = (colCfg) => {
                          const d = colCfg.chartData === 'classification' ? 'grade_classification' : (colCfg.chartData || 'subject_marks');
                          const agg = colCfg.aggregation || 'none';

                          if (d === 'subject_marks') {
                            return subjectScores.map(s => ({
                              name: s.subjectName.length > 8 ? s.subjectName.slice(0, 7) + '…' : s.subjectName,
                              fullName: s.subjectName,
                              value: typeof s.marksObtained === 'number' ? s.marksObtained : 0,
                              Max: s.maxMarks,
                            }));
                          }

                          if (d === 'subject_pct') {
                            return subjectScores.map(s => ({
                              name: s.subjectName.length > 8 ? s.subjectName.slice(0, 7) + '…' : s.subjectName,
                              fullName: s.subjectName,
                              value: s.maxMarks > 0 && typeof s.marksObtained === 'number' ? Math.round((s.marksObtained / s.maxMarks) * 100) : 0,
                              Max: 100,
                            }));
                          }

                          if (d === 'subject_classification') {
                            const groupsMap = new Map();
                            subjectScores.forEach(s => {
                              const key = s.classificationName || 'General';
                              if (!groupsMap.has(key)) groupsMap.set(key, []);
                              groupsMap.get(key).push(s);
                            });

                            const result = [];
                            groupsMap.forEach((subList, groupName) => {
                              const totalObt = subList.reduce((acc, curr) => acc + (typeof curr.marksObtained === 'number' ? curr.marksObtained : 0), 0);
                              const totalMax = subList.reduce((acc, curr) => acc + (Number(curr.maxMarks) || 0), 0);
                              const count = subList.length;

                              let val = 0;
                              if (agg === 'sum') {
                                val = Math.round(totalObt);
                              } else if (agg === 'max') {
                                val = Math.max(...subList.map(s => typeof s.marksObtained === 'number' ? s.marksObtained : 0));
                              } else {
                                val = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
                              }

                              result.push({
                                name: groupName.length > 12 ? groupName.slice(0, 10) + '…' : groupName,
                                fullName: `${groupName} (${count} subjects)`,
                                value: val,
                                count,
                                Max: agg === 'sum' ? totalMax : 100,
                              });
                            });
                            return result;
                          }

                          if (d === 'grade_classification') {
                            const scale = Array.isArray(activeTemplate.gradingScale) && activeTemplate.gradingScale.length > 0
                              ? activeTemplate.gradingScale
                              : DEFAULT_GRADING_SCALE;

                            const counts = {};
                            scale.forEach(g => { counts[g.grade] = 0; });
                            subjectScores.forEach(s => {
                              if (s.grade && s.grade !== '—') {
                                counts[s.grade] = (counts[s.grade] || 0) + 1;
                              }
                            });

                            const isPieOrDonut = colCfg.chartType === 'pie' || colCfg.chartType === 'donut';
                            const gradeEntries = scale.map(g => ({
                              name: g.grade,
                              fullName: `Grade ${g.grade}`,
                              value: counts[g.grade] || 0,
                            }));

                            const nonZero = gradeEntries.filter(g => g.value > 0);
                            return (isPieOrDonut || nonZero.length >= 3) ? (nonZero.length > 0 ? nonZero : gradeEntries) : gradeEntries;
                          }

                          if (d === 'attendance') {
                            const attVal = Number(String(student.attendance || '').replace(/[^0-9.]/g, '')) || 95;
                            return [
                              { name: 'Present', value: attVal, Max: 100 },
                              { name: 'Absent', value: Math.max(0, 100 - attVal), Max: 100 },
                            ];
                          }

                          if (d === 'overall_pct') {
                            const pct = Number(metrics.percentage) || 0;
                            return [
                              { name: 'Score', value: Math.round(pct), Max: 100 },
                              { name: 'Remaining', value: Math.max(0, 100 - Math.round(pct)), Max: 100 },
                            ];
                          }

                          return subjectScores.map(s => ({
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
                          const cd = colCfg.chartData === 'classification' ? 'grade_classification' : (colCfg.chartData || 'subject_marks');

                          const userColors = Array.isArray(colCfg.colors) ? colCfg.colors.filter(Boolean) : [];
                          const randomHsl = (i) => `hsl(${Math.round((i * 137.508) % 360)}, 65%, 52%)`;
                          const getColor = (i) => {
                            if (userColors.length > 0) return i < userColors.length ? userColors[i] : randomHsl(i);
                            return PALETTE[i % PALETTE.length];
                          };
                          const baseColor = getColor(0) || accentColor;

                          const showValues = colCfg.showValues !== undefined ? !!colCfg.showValues : !!colCfg.showDataLabels;
                          const showLabels = !!colCfg.showLabels;
                          const showAnyLabel = showValues || showLabels;
                          const labelColor = colCfg.dataLabelColor || '#1e293b';
                          const rawPos = colCfg.dataLabelPosition || 'top';
                          const placement = getLabelPlacement(t, rawPos);
                          const labelStyle = { fontSize: tight ? 8.5 : 8, fontWeight: 700, fill: labelColor };

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

                          const scaleType = colCfg.maxScale || 'auto';
                          const axisMax = scaleType === 'pct100' ? 100 : scaleType === 'custom' ? (Number(colCfg.maxScaleValue) || 100) : 'auto';
                          const axisDomain = axisMax === 'auto' ? [0, 'auto'] : [0, axisMax];

                          const tooltipFormatter = (val, name, item) => {
                            const title = item?.payload?.fullName || name;
                            if (pctMode) return [`${val}%`, title];
                            if (cd === 'grade_classification') return [`${val} subjects`, title];
                            if (item?.payload?.Max) return [`${val} / ${item.payload.Max}`, title];
                            return [val, title];
                          };

                          if (t === 'text') {
                            return (
                              <div className={`flex flex-col ${tight ? 'gap-0.5' : 'gap-1'} justify-center h-full px-1`}>
                                {enrichedData.slice(0, 6).map((d, i) => (
                                  <div key={i} className="flex items-center justify-between text-[9px] font-bold">
                                    <span className="text-dark-muted truncate max-w-[60%]">{d.name}</span>
                                    <span className="font-black" style={{ color: baseColor }}>
                                      {d.value}{pctMode ? '%' : cd === 'grade_classification' ? ' subs' : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }

                          if (t === 'donut' || t === 'pie') {
                            const isPieInside = placement.isInside;
                            const pieData = enrichedData.map((d, i) => ({ ...d, fill: getColor(i) }));
                            const outerR = tight ? (isPieInside ? '90%' : '80%') : '70%';
                            const innerR = t === 'donut' ? (tight ? '46%' : '40%') : 0;
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
                                    fontSize={tight ? 8.5 : 8}
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
                                    paddingAngle={tight ? 1 : 2}
                                    label={showAnyLabel ? renderCustomPieLabel : undefined}
                                    labelLine={showAnyLabel && !isPieInside ? { stroke: labelColor, strokeWidth: 1 } : false}
                                  >
                                    {pieData.map((entry, index) => (
                                      <Cell key={index} fill={entry.fill} />
                                    ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ fontSize: 9 }} formatter={tooltipFormatter} />
                                  <Legend iconSize={tight ? 7 : 8} wrapperStyle={{ fontSize: tight ? 7.5 : 8, bottom: tight ? -4 : 0 }} />
                                </PieChart>
                              </ResponsiveContainer>
                            );
                          }

                          if (t === 'horizontal_bar') {
                            const hMargin = tight
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
                                  <XAxis type="number" tick={{ fontSize: tight ? 7.5 : 8 }} domain={axisDomain} />
                                  <YAxis type="category" dataKey="name" tick={{ fontSize: tight ? 7.5 : 8, fontWeight: 700 }} width={tight ? 28 : 36} />
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

                          if (t === 'line') {
                            const lineMargin = tight
                              ? { top: showAnyLabel && placement.position === 'top' ? 14 : 3, right: 4, left: -22, bottom: -4 }
                              : { top: showAnyLabel && placement.position === 'top' ? 16 : 5, right: 10, left: -20, bottom: 2 };

                            return (
                              <ResponsiveContainer width="100%" height={h}>
                                <LineChart data={enrichedData} margin={lineMargin}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="name" tick={{ fontSize: tight ? 7.5 : 8, fontWeight: 700 }} />
                                  <YAxis tick={{ fontSize: tight ? 7.5 : 8 }} domain={axisDomain} />
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
                            const areaMargin = tight
                              ? { top: showAnyLabel && placement.position === 'top' ? 14 : 3, right: 4, left: -22, bottom: -4 }
                              : { top: showAnyLabel && placement.position === 'top' ? 16 : 5, right: 10, left: -20, bottom: 2 };

                            return (
                              <ResponsiveContainer width="100%" height={h}>
                                <AreaChart data={enrichedData} margin={areaMargin}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="name" tick={{ fontSize: tight ? 7.5 : 8, fontWeight: 700 }} />
                                  <YAxis tick={{ fontSize: tight ? 7.5 : 8 }} domain={axisDomain} />
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

                          const vMargin = tight
                            ? { top: showAnyLabel && placement.position === 'top' ? 14 : 2, right: 2, left: -22, bottom: -4 }
                            : { top: showAnyLabel && placement.position === 'top' ? 16 : 5, right: 5, left: -20, bottom: 2 };

                          return (
                            <ResponsiveContainer width="100%" height={h}>
                              <BarChart data={enrichedData} margin={vMargin}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: tight ? 7.5 : 8, fontWeight: 700 }} />
                                <YAxis tick={{ fontSize: tight ? 7.5 : 8 }} domain={axisDomain} />
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

                        return (
                          <div
                            key="charts"
                            className={`${isTight ? 'p-1.5 print:p-0.5 space-y-1 print:space-y-0.5' : 'p-3 print:p-1.5 space-y-1.5 print:space-y-0.5'} bg-slate-50 border border-slate-200 rounded-2xl print:rounded-lg transition-all`}
                          >
                            <div className={`grid ${colWidthClass} ${isTight ? 'gap-1.5 print:gap-1' : 'gap-3'}`}>
                              {chartCols.map((colCfg, colIdx) => (
                                <div key={colIdx} className={isTight ? 'space-y-0.5' : 'space-y-1'}>
                                  {colCfg.title && (
                                    <h5 className={`${isTight ? 'text-[9.5px] print:text-[7.5px] mb-0.5' : 'text-[10px] print:text-[8px] mb-1'} font-black text-dark-primary uppercase tracking-wider text-center`}>
                                      {colCfg.title}
                                    </h5>
                                  )}
                                  <div style={{ height: `${chartH}px` }}>
                                    {renderPrintChart(colCfg, chartH, isTight)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Legacy single chart fallback
                      const chartHClass =
                        ch.size === 'compact'
                          ? 'h-32 print:h-20'
                          : ch.size === 'large'
                            ? 'h-52 print:h-34'
                            : `h-44 ${orientation === 'landscape' ? 'print:h-22' : 'print:h-28'}`;

                      return (
                        <div
                          key="charts"
                          className="p-3 print:p-1.5 bg-slate-50 border border-slate-200 rounded-2xl print:rounded-lg space-y-1.5 print:space-y-0.5"
                        >
                          <h4 className="text-xs print:text-[8.5px] font-black text-dark-primary uppercase tracking-wider text-center">
                            {ch.title || 'Subject Performance Analysis'}
                          </h4>
                          <div className={`${chartHClass} w-full`}>
                            <ResponsiveContainer width="100%" height="100%">
                              {ch.type === 'horizontal_bar' ? (
                                <BarChart
                                  data={chartData}
                                  layout="vertical"
                                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
                                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
                                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} width={70} />
                                  <Tooltip formatter={(value, name, item) => [`${value} / ${item.payload.Max}`, item.payload.fullName]} />
                                  <Bar dataKey="Marks" fill={activeTemplate.accentColor || '#e11d48'} radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={entry.Marks >= 75 ? activeTemplate.secondaryColor || '#059669' : activeTemplate.accentColor || '#e11d48'}
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              ) : ch.type === 'radar' ? (
                                <RadarChart outerRadius={55} data={chartData}>
                                  <PolarGrid stroke="#cbd5e1" />
                                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                                  <Radar name="Marks" dataKey="Marks" stroke={activeTemplate.accentColor || '#e11d48'} fill={activeTemplate.accentColor || '#e11d48'} fillOpacity={0.4} />
                                  <Tooltip formatter={(value, name, item) => [`${value} / ${item.payload.Max}`, item.payload.fullName]} />
                                </RadarChart>
                              ) : ch.type === 'line' ? (
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} interval={0} />
                                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                                  <Tooltip formatter={(value, name, item) => [`${value} / ${item.payload.Max}`, item.payload.fullName]} />
                                  <Line type="monotone" dataKey="Marks" stroke={activeTemplate.accentColor || '#e11d48'} strokeWidth={3} dot={{ r: 4, fill: activeTemplate.accentColor || '#e11d48' }} />
                                </LineChart>
                              ) : ch.type === 'area' ? (
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} interval={0} />
                                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                                  <Tooltip formatter={(value, name, item) => [`${value} / ${item.payload.Max}`, item.payload.fullName]} />
                                  <Area type="monotone" dataKey="Marks" stroke={activeTemplate.accentColor || '#e11d48'} fill={activeTemplate.accentColor || '#e11d48'} fillOpacity={0.25} />
                                </AreaChart>
                              ) : (
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} interval={0} />
                                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                                  <Tooltip formatter={(value, name, item) => [`${value} / ${item.payload.Max}`, item.payload.fullName]} />
                                  <Bar dataKey="Marks" fill={activeTemplate.accentColor || '#e11d48'} radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={entry.Marks >= 75 ? activeTemplate.secondaryColor || '#059669' : activeTemplate.accentColor || '#e11d48'}
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
                      if (!activeTemplate.showTeacherRemarks) return null;
                      const rmk = activeTemplate.remarksConfig || {};
                      const isCompact = rmk.size === 'compact';

                      return (
                        <div
                          key="remarks"
                          className={`bg-amber-50/60 border border-amber-200 rounded-2xl print:rounded-lg space-y-1 print:space-y-0.5 ${
                            isCompact ? 'p-2 print:p-1' : 'p-3.5 print:p-1.5'
                          }`}
                        >
                          <span className="text-[10px] print:text-[7.5px] font-bold text-dark-muted uppercase block">
                            {rmk.title || 'Teacher / Institution Remarks'}
                          </span>
                          <p className="text-xs print:text-[9.5px] text-dark-slate italic">
                            "{activeTemplate.remarksText}"
                          </p>
                          {rmk.showPromotion && (
                            <p className="mt-1 font-bold text-emerald-800 text-[10px] print:text-[8px] uppercase tracking-wider">
                              Status: Eligible for promotion to next grade level.
                            </p>
                          )}
                        </div>
                      );
                    }

                    case 'signatures': {
                      if (!activeTemplate.showSignatures) return null;
                      const sigCfg = activeTemplate.signaturesConfig || {};
                      const isCompact = sigCfg.size === 'compact';
                      const isTall = sigCfg.size === 'tall';
                      const ptClass = isCompact
                        ? 'pt-3 print:pt-1.5'
                        : isTall
                          ? 'pt-8 print:pt-3'
                          : 'pt-6 print:pt-2';

                      return (
                        <div
                          key="signatures"
                          className={`report-card-signatures ${ptClass} print:mt-auto grid grid-cols-2 sm:grid-cols-4 gap-4 print:gap-2 text-center text-xs print:text-[8.5px]`}
                        >
                          {sigCfg.showClassTeacher !== false && (
                            <div className="border-t border-slate-900 pt-1.5 print:pt-0.5">
                              <span className="font-bold text-dark-slate block truncate">
                                {activeTemplate.signatures?.classTeacher || 'Class Teacher'}
                              </span>
                              <span className="text-[10px] print:text-[7.5px] text-dark-muted">Signature</span>
                            </div>
                          )}
                          {sigCfg.showCoordinator !== false && (
                            <div className="border-t border-slate-900 pt-1.5 print:pt-0.5">
                              <span className="font-bold text-dark-slate block truncate">
                                {activeTemplate.signatures?.coordinator || 'Academic Coordinator'}
                              </span>
                              <span className="text-[10px] print:text-[7.5px] text-dark-muted">Signature</span>
                            </div>
                          )}
                          {sigCfg.showPrincipal !== false && (
                            <div className="border-t border-slate-900 pt-1.5 print:pt-0.5">
                              <span className="font-bold text-dark-slate block truncate">
                                {activeTemplate.signatures?.principal || 'Principal'}
                              </span>
                              <span className="text-[10px] print:text-[7.5px] text-dark-muted">Seal & Signature</span>
                            </div>
                          )}
                          {sigCfg.showParent !== false && (
                            <div className="border-t border-slate-900 pt-1.5 print:pt-0.5">
                              <span className="font-bold text-dark-slate block truncate">
                                {activeTemplate.signatures?.parent || 'Parent / Guardian'}
                              </span>
                              <span className="text-[10px] print:text-[7.5px] text-dark-muted">Signature</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    default:
                      return null;
                  }
                })}

                {/* Optional Grading Scale Legend on Printed Card */}
                {activeTemplate.showGradingScale && activeTemplate.gradingScale?.length > 0 && (
                  <div className="pt-2 print:pt-1 border-t border-slate-200 print:border-slate-300">
                    <span className="text-[9px] print:text-[7px] font-black uppercase text-dark-muted block mb-0.5">
                      Grading Criteria Legend:
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-[9px] print:text-[7px] text-dark-slate">
                      {activeTemplate.gradingScale.map((g) => (
                        <span key={g.grade} className="bg-slate-100 print:bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200 font-bold">
                          <strong>{g.grade}</strong> ({g.minPercentage}% - {g.maxPercentage}%{g.description ? ` · ${g.description}` : ''})
                        </span>
                      ))}
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
};

export default ReportCardGenerator;
