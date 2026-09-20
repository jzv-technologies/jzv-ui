// src/components/examinations/ProgressReportGenerator.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { getAdminConfig, saveAdminConfig } from '../../utils/adminConfigUtils';
import MultiSelectDropdown from '../MultiSelectDropdown';
import ProgressReportDesigner, { DEFAULT_TEMPLATE } from './ProgressReportDesigner';
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

const TEMPLATES_CONFIG_KEY = 'exam_progress_report_templates';

/**
 * Progress Report Generator & Card Renderer
 * Generates official report cards by examination for the entire class or selected students.
 * Supports:
 * - Drag-drop customized templates
 * - Dynamic calculations (Total, %, Class Rank, Pass/Fail, GPA)
 * - Custom subject grouping (e.g. Physics, Chem, Bio under "Science")
 * - Embedded charts/graphs per student
 * - High quality A4 multi-student print & PDF export
 */
const ProgressReportGenerator = ({
  schedules = [],
  classes = [],
  subjects = [],
  initialScheduleId = null,
  initialClassId = null,
  userRoles = [],
  studentSelectionMode: controlledStudentSelectionMode,
  onStudentSelectionModeChange,
  selectedStudentIds: controlledSelectedStudentIds,
  onSelectedStudentIdsChange,
  selectedTemplateId: controlledSelectedTemplateId,
  onSelectedTemplateIdChange,
  isDesignerOpen: controlledIsDesignerOpen,
  onIsDesignerOpenChange,
  onTemplatesLoaded,
  hideControlBar = false,
}) => {
  const [internalSchedules, setInternalSchedules] = useState(schedules);
  const [internalClasses, setInternalClasses] = useState(classes);
  const [internalSubjects, setInternalSubjects] = useState(subjects);

  const [selectedScheduleId, setSelectedScheduleId] = useState(
    initialScheduleId ? String(initialScheduleId) : schedules[0]?.id ? String(schedules[0].id) : ''
  );
  const [selectedClassId, setSelectedClassId] = useState(
    initialClassId ? String(initialClassId) : classes[0]?.id ? String(classes[0].id) : ''
  );

  useEffect(() => {
    if (initialScheduleId) setSelectedScheduleId(String(initialScheduleId));
  }, [initialScheduleId]);

  useEffect(() => {
    if (initialClassId) setSelectedClassId(String(initialClassId));
  }, [initialClassId]);

  // Sync props to internal state
  useEffect(() => {
    if (schedules.length > 0) {
      setInternalSchedules(schedules);
      if (!selectedScheduleId) setSelectedScheduleId(String(schedules[0].id));
    }
  }, [schedules]);

  useEffect(() => {
    if (classes.length > 0) {
      setInternalClasses(classes);
      if (!selectedClassId) setSelectedClassId(String(classes[0].id));
    }
  }, [classes]);

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
      } catch (err) {
        console.error('Failed to load master data in ProgressReportGenerator:', err);
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
  const setStudentSelectionMode =
    onStudentSelectionModeChange || setInternalStudentSelectionMode;

  const [internalSelectedStudentIds, setInternalSelectedStudentIds] = useState([]);
  const selectedStudentIds =
    controlledSelectedStudentIds !== undefined
      ? controlledSelectedStudentIds
      : internalSelectedStudentIds;
  const setSelectedStudentIds =
    onSelectedStudentIdsChange || setInternalSelectedStudentIds;

  // Templates
  const [templates, setTemplates] = useState([DEFAULT_TEMPLATE]);
  const [internalSelectedTemplateId, setInternalSelectedTemplateId] = useState(DEFAULT_TEMPLATE.id);
  const selectedTemplateId =
    controlledSelectedTemplateId !== undefined
      ? controlledSelectedTemplateId
      : internalSelectedTemplateId;
  const setSelectedTemplateId =
    onSelectedTemplateIdChange || setInternalSelectedTemplateId;

  const [internalIsDesignerOpen, setInternalIsDesignerOpen] = useState(false);
  const isDesignerOpen =
    controlledIsDesignerOpen !== undefined
      ? controlledIsDesignerOpen
      : internalIsDesignerOpen;
  const setIsDesignerOpen = (val) => {
    if (onIsDesignerOpenChange) onIsDesignerOpenChange(val);
    setInternalIsDesignerOpen(val);
  };

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
        console.warn('[ProgressReportGenerator] Remote templates fallback:', err);
      }
    };
    loadTemplates();
  }, []);

  // Save template update via RPC
  const handleSaveTemplate = async (updatedTemplate) => {
    try {
      const existingIdx = templates.findIndex((t) => t.id === updatedTemplate.id);
      let updatedList = [];
      if (existingIdx >= 0) {
        updatedList = templates.map((t, idx) => (idx === existingIdx ? updatedTemplate : t));
      } else {
        updatedList = [...templates, updatedTemplate];
      }

      setTemplates(updatedList);
      setSelectedTemplateId(updatedTemplate.id);
      setIsDesignerOpen(false);
      if (onTemplatesLoaded) onTemplatesLoaded(updatedList);

      const success = await saveAdminConfig(TEMPLATES_CONFIG_KEY, updatedList);
      if (success) {
        showToast('Report template saved successfully', 'success');
      } else {
        showToast('Report template saved to local cache', 'info');
      }
    } catch (err) {
      showToast('Failed to save template: ' + err.message, 'error');
    }
  };

  // Active template
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0] || DEFAULT_TEMPLATE;
  }, [templates, selectedTemplateId]);

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
        const { data: stuData } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', selectedClassId)
          .eq('enrollment', 'Active')
          .order('student_name');

        setStudents(stuData || []);

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
  }, [selectedScheduleId, selectedClassId]);

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
    return students.filter((s) => selectedStudentIds.includes(String(s.id)));
  }, [students, studentSelectionMode, selectedStudentIds]);

  // Compute calculated metrics & ranks across all students in class
  const studentMetricsMap = useMemo(() => {
    if (students.length === 0 || results.length === 0) return {};

    const studentCalculations = students.map((student) => {
      let totalObtained = 0;
      let totalMax = 0;
      let hasFailed = false;
      const subjectScores = [];

      results.forEach((result) => {
        const sub = internalSubjects.find((s) => String(s.id) === String(result.subject_id));
        const entry = entries.find(
          (e) => String(e.result_id) === String(result.id) && String(e.student_id) === String(student.id)
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
          if (pct >= 90) grade = 'A+';
          else if (pct >= 80) grade = 'A';
          else if (pct >= 70) grade = 'B';
          else if (pct >= 60) grade = 'C';
          else if (pct >= 50) grade = 'D';
          else grade = 'F';
        }

        if (!isAbsent && marks !== null) {
          totalObtained += marks;
        }
        totalMax += maxMarks;

        subjectScores.push({
          subjectId: result.subject_id,
          subjectName: sub?.name || `Subject #${result.subject_id}`,
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
      let overallGrade = '—';
      if (overallPct >= 90) overallGrade = 'A+';
      else if (overallPct >= 80) overallGrade = 'A';
      else if (overallPct >= 70) overallGrade = 'B';
      else if (overallPct >= 60) overallGrade = 'C';
      else if (overallPct >= 50) overallGrade = 'D';
      else overallGrade = 'F';

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
    const sortedByTotal = [...studentCalculations].sort((a, b) => b.totalObtained - a.totalObtained);
    const metricsMap = {};
    sortedByTotal.forEach((item, idx) => {
      metricsMap[String(item.studentId)] = {
        ...item,
        classRank: idx + 1,
      };
    });

    return metricsMap;
  }, [students, results, entries, subjects]);

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
              onClick={() => setIsDesignerOpen(true)}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-dark-slate border border-light-border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Open Template Layout & Grouping Designer"
            >
              <i className="fas fa-sliders text-rose-600 text-[11px]" />
              <span>Design Template</span>
            </button>

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
            <label className="block text-[11px] font-bold text-dark-slate mb-1">Examination</label>
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
            <label className="block text-[11px] font-bold text-dark-slate mb-1">Students Scope</label>
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
            <label className="block text-[11px] font-bold text-dark-slate mb-1">Active Template</label>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-primary outline-none"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsDesignerOpen(true)}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                title="Design / Edit Template"
              >
                <i className="fas fa-palette text-[10px]" />
                <span>Designer</span>
              </button>
            </div>
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
      ) : displayedStudents.length === 0 ? (
        <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs">
          <i className="fas fa-user-graduate text-3xl text-slate-300 mb-2 block" />
          <p className="text-sm font-bold text-dark-primary">No Students Selected</p>
          <p className="text-xs text-dark-muted mt-1">
            Choose a class or select students from the filter bar above.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs">
          <i className="fas fa-clipboard-question text-3xl text-amber-400 mb-2 block" />
          <p className="text-sm font-bold text-dark-primary">No Exam Results Recorded</p>
          <p className="text-xs text-dark-muted mt-1">
            No results or marks have been initialized for {selectedClass?.name} in {selectedSchedule?.name}.
          </p>
        </div>
      ) : (
        /* Report Cards List (One card per student, styled for A4 page break on print) */
        <div className="space-y-8 print:space-y-0">
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
                    (acc, curr) => acc + (typeof curr.marksObtained === 'number' ? curr.marksObtained : 0),
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
                className="bg-white border-2 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-md print:shadow-none print:border-2 print:border-black print:rounded-none print:m-0 print:p-6 print:break-after-page space-y-6 max-w-4xl mx-auto"
              >
                {/* ── Render Blocks according to activeTemplate.blockOrder ── */}
                {activeTemplate.blockOrder.map((blockKey) => {
                  switch (blockKey) {
                    case 'schoolHeader':
                      if (!activeTemplate.showSchoolHeader) return null;
                      return (
                        <div
                          key="schoolHeader"
                          className="border-b-2 border-slate-900 pb-4 text-center space-y-1 relative"
                        >
                          {activeTemplate.schoolHeader.logoUrl && (
                            <img
                              src={activeTemplate.schoolHeader.logoUrl}
                              alt="School Logo"
                              className="mx-auto max-h-14 mb-1 object-contain"
                            />
                          )}
                          <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-dark-primary">
                            {activeTemplate.schoolHeader.title}
                          </h1>
                          <p className="text-xs font-bold text-dark-muted uppercase tracking-wider">
                            {activeTemplate.schoolHeader.subtitle}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500">
                            {activeTemplate.schoolHeader.address}
                          </p>
                          <div className="pt-2">
                            <span className="inline-block px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest">
                              {selectedSchedule?.name || activeTemplate.schoolHeader.examTitle}
                            </span>
                          </div>
                        </div>
                      );

                    case 'studentInfo':
                      if (!activeTemplate.showStudentInfo) return null;
                      return (
                        <div
                          key="studentInfo"
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs"
                        >
                          <div>
                            <span className="text-[10px] font-bold text-dark-muted uppercase block">
                              Student Name
                            </span>
                            <span className="font-black text-dark-primary text-sm">
                              {student.student_name}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-dark-muted uppercase block">
                              Admission No
                            </span>
                            <span className="font-mono font-bold text-dark-primary">
                              {student.admission_no}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-dark-muted uppercase block">
                              Class & Section
                            </span>
                            <span className="font-bold text-rose-700">
                              {selectedClass?.name || `Class ${student.class_id}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-dark-muted uppercase block">
                              Roll No
                            </span>
                            <span className="font-mono font-bold text-dark-primary">
                              {student.roll_no || studentIdx + 1}
                            </span>
                          </div>
                        </div>
                      );

                    case 'subjectTable':
                      if (!activeTemplate.showSubjectTable) return null;
                      return (
                        <div key="subjectTable" className="space-y-3">
                          <h3 className="text-xs font-black text-dark-primary uppercase tracking-wider">
                            Academic Marks Register
                          </h3>
                          <div className="overflow-x-auto rounded-xl border border-slate-900">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider">
                                  <th className="py-2.5 px-3 text-left">Subject</th>
                                  {activeTemplate.subjectTableConfig.showMaxMarks && (
                                    <th className="py-2.5 px-2 text-center w-20">Max Marks</th>
                                  )}
                                  {activeTemplate.subjectTableConfig.showPassMarks && (
                                    <th className="py-2.5 px-2 text-center w-20">Pass Marks</th>
                                  )}
                                  {activeTemplate.subjectTableConfig.showMarksObtained && (
                                    <th className="py-2.5 px-2 text-center w-24">Marks Obtained</th>
                                  )}
                                  {activeTemplate.subjectTableConfig.showGrade && (
                                    <th className="py-2.5 px-2 text-center w-16">Grade</th>
                                  )}
                                  {activeTemplate.subjectTableConfig.showStatus && (
                                    <th className="py-2.5 px-2 text-center w-20">Status</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {/* Grouped Sections */}
                                {groupedSections.map((grp) => (
                                  <React.Fragment key={grp.groupName}>
                                    <tr className="bg-slate-100 font-black text-[11px] text-dark-primary">
                                      <td
                                        colSpan={6}
                                        className="py-2 px-3 uppercase tracking-wider bg-rose-50/70 text-rose-900 border-y border-rose-200"
                                      >
                                        <i className="fas fa-layer-group text-[10px] mr-1.5 text-rose-600" />
                                        <span>Group: {grp.groupName}</span>
                                        <span className="ml-3 font-normal text-[10px] text-dark-muted">
                                          (Subtotal: {grp.groupTotalObt} / {grp.groupTotalMax} · {grp.groupPct}%)
                                        </span>
                                      </td>
                                    </tr>
                                    {grp.members.map((s) => (
                                      <tr key={s.subjectId} className="hover:bg-slate-50/50">
                                        <td className="py-2 px-3 font-bold text-dark-primary pl-6">
                                          • {s.subjectName}
                                        </td>
                                        {activeTemplate.subjectTableConfig.showMaxMarks && (
                                          <td className="py-2 px-2 text-center font-mono">{s.maxMarks}</td>
                                        )}
                                        {activeTemplate.subjectTableConfig.showPassMarks && (
                                          <td className="py-2 px-2 text-center font-mono">{s.passMarks || '—'}</td>
                                        )}
                                        {activeTemplate.subjectTableConfig.showMarksObtained && (
                                          <td
                                            className={`py-2 px-2 text-center font-black ${
                                              s.status === 'FAIL'
                                                ? 'text-rose-600'
                                                : s.isAbsent
                                                  ? 'text-amber-600'
                                                  : 'text-dark-primary'
                                            }`}
                                          >
                                            {s.marksObtained}
                                          </td>
                                        )}
                                        {activeTemplate.subjectTableConfig.showGrade && (
                                          <td className="py-2 px-2 text-center font-bold">{s.grade}</td>
                                        )}
                                        {activeTemplate.subjectTableConfig.showStatus && (
                                          <td className="py-2 px-2 text-center font-bold text-[10px]">
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
                                        )}
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                ))}

                                {/* Ungrouped Individual Subjects */}
                                {ungroupedScores.map((s) => (
                                  <tr key={s.subjectId} className="hover:bg-slate-50/50">
                                    <td className="py-2 px-3 font-bold text-dark-primary">
                                      {s.subjectName}
                                    </td>
                                    {activeTemplate.subjectTableConfig.showMaxMarks && (
                                      <td className="py-2 px-2 text-center font-mono">{s.maxMarks}</td>
                                    )}
                                    {activeTemplate.subjectTableConfig.showPassMarks && (
                                      <td className="py-2 px-2 text-center font-mono">{s.passMarks || '—'}</td>
                                    )}
                                    {activeTemplate.subjectTableConfig.showMarksObtained && (
                                      <td
                                        className={`py-2 px-2 text-center font-black ${
                                          s.status === 'FAIL'
                                            ? 'text-rose-600'
                                            : s.isAbsent
                                              ? 'text-amber-600'
                                              : 'text-dark-primary'
                                        }`}
                                      >
                                        {s.marksObtained}
                                      </td>
                                    )}
                                    {activeTemplate.subjectTableConfig.showGrade && (
                                      <td className="py-2 px-2 text-center font-bold">{s.grade}</td>
                                    )}
                                    {activeTemplate.subjectTableConfig.showStatus && (
                                      <td className="py-2 px-2 text-center font-bold text-[10px]">
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
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );

                    case 'summaryCalculations':
                      if (!activeTemplate.showSummaryCalculations) return null;
                      return (
                        <div
                          key="summaryCalculations"
                          className="bg-slate-900 text-white rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center"
                        >
                          <div>
                            <span className="text-[10px] text-slate-300 font-bold uppercase block">
                              Grand Total
                            </span>
                            <span className="text-base font-black text-white">
                              {metrics.totalObtained} / {metrics.totalMax}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-300 font-bold uppercase block">
                              Percentage
                            </span>
                            <span className="text-base font-black text-emerald-400">
                              {metrics.percentage}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-300 font-bold uppercase block">
                              Overall Grade
                            </span>
                            <span className="text-base font-black text-amber-400">
                              {metrics.overallGrade}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-300 font-bold uppercase block">
                              Class Rank
                            </span>
                            <span className="text-base font-black text-white font-mono">
                              #{metrics.classRank}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-300 font-bold uppercase block">
                              Result
                            </span>
                            <span
                              className={`text-base font-black ${
                                metrics.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {metrics.status}
                            </span>
                          </div>
                        </div>
                      );

                    case 'charts':
                      if (!activeTemplate.showCharts || chartData.length === 0) return null;
                      return (
                        <div
                          key="charts"
                          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2"
                        >
                          <h4 className="text-xs font-black text-dark-primary uppercase tracking-wider text-center">
                            {activeTemplate.chartConfig.title}
                          </h4>
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              {activeTemplate.chartConfig?.type === 'horizontal_bar' ? (
                                <BarChart
                                  data={chartData}
                                  layout="vertical"
                                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
                                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
                                  <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fontSize: 9, fontWeight: 700 }}
                                    width={70}
                                  />
                                  <Tooltip
                                    formatter={(value, name, item) => [
                                      `${value} / ${item.payload.Max}`,
                                      item.payload.fullName,
                                    ]}
                                  />
                                  <Bar dataKey="Marks" fill={activeTemplate.accentColor || '#e11d48'} radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={
                                          entry.Marks >= 75
                                            ? activeTemplate.secondaryColor || '#059669'
                                            : activeTemplate.accentColor || '#e11d48'
                                        }
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              ) : activeTemplate.chartConfig?.type === 'radar' ? (
                                <RadarChart outerRadius={55} data={chartData}>
                                  <PolarGrid stroke="#cbd5e1" />
                                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                                  <Radar
                                    name="Marks"
                                    dataKey="Marks"
                                    stroke={activeTemplate.accentColor || '#e11d48'}
                                    fill={activeTemplate.accentColor || '#e11d48'}
                                    fillOpacity={0.4}
                                  />
                                  <Tooltip
                                    formatter={(value, name, item) => [
                                      `${value} / ${item.payload.Max}`,
                                      item.payload.fullName,
                                    ]}
                                  />
                                </RadarChart>
                              ) : activeTemplate.chartConfig?.type === 'line' ? (
                                <LineChart
                                  data={chartData}
                                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} interval={0} />
                                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                                  <Tooltip
                                    formatter={(value, name, item) => [
                                      `${value} / ${item.payload.Max}`,
                                      item.payload.fullName,
                                    ]}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="Marks"
                                    stroke={activeTemplate.accentColor || '#e11d48'}
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: activeTemplate.accentColor || '#e11d48' }}
                                  />
                                </LineChart>
                              ) : activeTemplate.chartConfig?.type === 'area' ? (
                                <AreaChart
                                  data={chartData}
                                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} interval={0} />
                                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                                  <Tooltip
                                    formatter={(value, name, item) => [
                                      `${value} / ${item.payload.Max}`,
                                      item.payload.fullName,
                                    ]}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="Marks"
                                    stroke={activeTemplate.accentColor || '#e11d48'}
                                    fill={activeTemplate.accentColor || '#e11d48'}
                                    fillOpacity={0.25}
                                  />
                                </AreaChart>
                              ) : (
                                <BarChart
                                  data={chartData}
                                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                                  <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fontWeight: 700 }}
                                    interval={0}
                                  />
                                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                                  <Tooltip
                                    formatter={(value, name, item) => [
                                      `${value} / ${item.payload.Max}`,
                                      item.payload.fullName,
                                    ]}
                                  />
                                  <Bar dataKey="Marks" fill={activeTemplate.accentColor || '#e11d48'} radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={
                                          entry.Marks >= 75
                                            ? activeTemplate.secondaryColor || '#059669' // emerald
                                            : activeTemplate.accentColor || '#e11d48'
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

                    case 'remarks':
                      if (!activeTemplate.showTeacherRemarks) return null;
                      return (
                        <div key="remarks" className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                          <span className="text-[10px] font-bold text-dark-muted uppercase block">
                            Teacher / Institution Remarks
                          </span>
                          <p className="text-xs text-dark-slate italic">
                            "{activeTemplate.remarksText}"
                          </p>
                        </div>
                      );

                    case 'signatures':
                      if (!activeTemplate.showSignatures) return null;
                      return (
                        <div
                          key="signatures"
                          className="pt-8 grid grid-cols-3 gap-6 text-center text-xs"
                        >
                          <div className="border-t border-slate-900 pt-1.5">
                            <span className="font-bold text-dark-slate block">
                              {activeTemplate.signatures.classTeacher}
                            </span>
                            <span className="text-[10px] text-dark-muted">Signature</span>
                          </div>
                          <div className="border-t border-slate-900 pt-1.5">
                            <span className="font-bold text-dark-slate block">
                              {activeTemplate.signatures.principal}
                            </span>
                            <span className="text-[10px] text-dark-muted">Seal & Signature</span>
                          </div>
                          <div className="border-t border-slate-900 pt-1.5">
                            <span className="font-bold text-dark-slate block">
                              {activeTemplate.signatures.parent}
                            </span>
                            <span className="text-[10px] text-dark-muted">Signature</span>
                          </div>
                        </div>
                      );

                    default:
                      return null;
                  }
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Template Designer Modal ── */}
      {isDesignerOpen && (
        <ProgressReportDesigner
          template={activeTemplate}
          availableSubjects={internalSubjects}
          onSave={handleSaveTemplate}
          onClose={() => setIsDesignerOpen(false)}
        />
      )}
    </div>
  );
};

export default ProgressReportGenerator;
