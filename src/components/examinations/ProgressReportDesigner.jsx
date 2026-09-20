// src/components/examinations/ProgressReportDesigner.jsx
import React, { useState, useMemo } from 'react';
import { showToast } from '../../utils/toast';
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

const PREVIEW_STUDENT = {
  id: 'preview_1',
  student_name: 'Zainab Fatima',
  admission_no: 'JZV-2024-089',
  class_name: 'Grade 10 - Section A',
  roll_no: '14',
  father_name: 'Mohammed Tariq',
  dob: '2010-04-15',
};

const PREVIEW_SCORES = [
  { subjectId: '1', subjectName: 'English Literature', maxMarks: 100, passMarks: 35, marksObtained: 88, grade: 'A+', status: 'PASS' },
  { subjectId: '2', subjectName: 'Mathematics', maxMarks: 100, passMarks: 35, marksObtained: 94, grade: 'O', status: 'PASS' },
  { subjectId: '3', subjectName: 'Physics', maxMarks: 100, passMarks: 35, marksObtained: 82, grade: 'A', status: 'PASS' },
  { subjectId: '4', subjectName: 'Chemistry', maxMarks: 100, passMarks: 35, marksObtained: 79, grade: 'B+', status: 'PASS' },
  { subjectId: '5', subjectName: 'Biology', maxMarks: 100, passMarks: 35, marksObtained: 91, grade: 'A+', status: 'PASS' },
  { subjectId: '6', subjectName: 'Islamic Studies', maxMarks: 100, passMarks: 35, marksObtained: 96, grade: 'O', status: 'PASS' },
  { subjectId: '7', subjectName: 'Social Studies', maxMarks: 100, passMarks: 35, marksObtained: 85, grade: 'A', status: 'PASS' },
];

/**
 * Drag & Drop Report Card Template Designer
 * Allows configuring layout, reordering blocks, custom subject groupings,
 * headers, footers, tables, and chart placements.
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
  },
  showStudentInfo: true,
  studentFields: {
    name: true,
    admissionNo: true,
    className: true,
    rollNo: true,
    fatherName: false,
    dob: false,
  },
  showSubjectTable: true,
  subjectTableConfig: {
    showMaxMarks: true,
    showPassMarks: true,
    showMarksObtained: true,
    showGrade: true,
    showStatus: true,
    bandedRows: true,
  },
  // Custom Subject Groupings (Requirement: Ask for grouping name instead of auto-guessing)
  subjectGroups: [
    // e.g. { id: 'science', name: 'Science', subjectIds: [1, 2, 3] }
  ],
  showCharts: true,
  chartConfig: {
    type: 'bar', // 'bar' | 'radar'
    title: 'Subject Performance Analysis',
    height: 180,
  },
  showSummaryCalculations: true,
  summaryConfig: {
    showGrandTotal: true,
    showPercentage: true,
    showGrade: true,
    showClassRank: true,
    showPassFail: true,
  },
  showTeacherRemarks: true,
  remarksText: 'Hard work and continuous dedication bring great achievements.',
  showSignatures: true,
  signatures: {
    classTeacher: 'Class Teacher',
    coordinator: 'Academic Coordinator',
    principal: 'Principal',
    parent: 'Parent / Guardian',
  },
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

const ProgressReportDesigner = ({
  template = DEFAULT_TEMPLATE,
  availableSubjects = [],
  onSave,
  onClose,
}) => {
  const [currentConfig, setCurrentConfig] = useState(() => ({
    ...DEFAULT_TEMPLATE,
    ...template,
    schoolHeader: { ...DEFAULT_TEMPLATE.schoolHeader, ...(template?.schoolHeader || {}) },
    studentFields: { ...DEFAULT_TEMPLATE.studentFields, ...(template?.studentFields || {}) },
    subjectTableConfig: { ...DEFAULT_TEMPLATE.subjectTableConfig, ...(template?.subjectTableConfig || {}) },
    summaryConfig: { ...DEFAULT_TEMPLATE.summaryConfig, ...(template?.summaryConfig || {}) },
    chartConfig: { ...DEFAULT_TEMPLATE.chartConfig, ...(template?.chartConfig || {}) },
    signatures: { ...DEFAULT_TEMPLATE.signatures, ...(template?.signatures || {}) },
    blockOrder: template?.blockOrder || DEFAULT_TEMPLATE.blockOrder,
    subjectGroups: template?.subjectGroups || [],
  }));

  const [draggedBlockIdx, setDraggedBlockIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('layout'); // 'layout' | 'grouping' | 'header' | 'metrics'

  // Subject Group Modal State
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupSubjectIds, setGroupSubjectIds] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);

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

  // Subject Grouping Handlers
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

  const handleSaveAll = () => {
    if (!currentConfig.name.trim()) {
      showToast('Please provide a name for this template', 'error');
      return;
    }
    onSave(currentConfig);
  };

  const previewData = useMemo(() => {
    const groups = currentConfig.subjectGroups || [];
    const mappedIds = new Set();
    const sections = [];

    groups.forEach((g) => {
      const groupMembers = PREVIEW_SCORES.filter((s) =>
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

    const ungrouped = PREVIEW_SCORES.filter((s) => !mappedIds.has(String(s.subjectId)));
    return { sections, ungrouped };
  }, [currentConfig.subjectGroups]);

  const previewChartData = useMemo(() => {
    return PREVIEW_SCORES.map((s) => ({
      name: s.subjectName.length > 12 ? `${s.subjectName.slice(0, 10)}…` : s.subjectName,
      fullName: s.subjectName,
      Marks: s.marksObtained,
      Max: s.maxMarks,
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-light-border bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shadow-2xs">
              <i className="fas fa-palette" />
            </div>
            <div>
              <h2 className="text-base font-black text-dark-primary tracking-tight">
                Report Card Template Designer
              </h2>
              <p className="text-[11px] font-bold text-dark-muted">
                Customize headers, subject grouping, placement of charts, and calculations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab((t) => (t === 'preview' ? 'layout' : 'preview'))}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                  : 'bg-white text-dark-slate border-light-border hover:bg-slate-100'
              }`}
            >
              <i className={`fas ${activeTab === 'preview' ? 'fa-sliders' : 'fa-eye'} text-xs`} />
              <span>{activeTab === 'preview' ? 'Design Editor' : 'Real-time Preview'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-light-border text-xs font-bold text-dark-muted hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fas fa-check" />
              <span>Save Template</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-light-border bg-white flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'layout', label: 'Block Placement & Order', icon: 'fa-grip-vertical' },
            { id: 'grouping', label: 'Subject Groupings', icon: 'fa-layer-group' },
            { id: 'header', label: 'School Header & Logo', icon: 'fa-heading' },
            { id: 'metrics', label: 'Tables & Calculations', icon: 'fa-calculator' },
            { id: 'preview', label: 'Real-time Preview', icon: 'fa-eye' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-dark-muted hover:text-dark-primary'
              }`}
            >
              <i className={`fas ${tab.icon} text-[11px]`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Tab 1: Layout & Drag/Drop Blocks */}
          {activeTab === 'layout' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-dark-primary uppercase tracking-wider">
                    Drag & Drop Visual Blocks
                  </h3>
                  <p className="text-xs text-dark-muted">
                    Grab any block by the handle to reorder its position on the printed report card.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-dark-slate">Template Name:</label>
                  <input
                    type="text"
                    value={currentConfig.name}
                    onChange={(e) => setCurrentConfig({ ...currentConfig, name: e.target.value })}
                    className="px-3 py-1 text-xs border border-light-border rounded-xl font-bold bg-white focus:ring-2 focus:ring-rose-300 outline-none w-56"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {currentConfig.blockOrder.map((blockKey, idx) => {
                  const blockInfo = BLOCK_LABELS[blockKey] || { name: blockKey, icon: 'fa-cube' };
                  const isDragging = draggedBlockIdx === idx;

                  return (
                    <div
                      key={blockKey}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${
                        isDragging
                          ? 'bg-rose-50/80 border-rose-300 shadow-md scale-[1.01]'
                          : 'bg-white border-light-border hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center text-xs">
                          <i className="fas fa-grip-vertical" />
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xs">
                          <i className={`fas ${blockInfo.icon}`} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-dark-primary">{blockInfo.name}</h4>
                          <span className="text-[10px] text-dark-muted font-mono">
                            Position #{idx + 1}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, -1)}
                          disabled={idx === 0}
                          className="w-7 h-7 rounded-lg border border-light-border flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          title="Move up"
                        >
                          <i className="fas fa-chevron-up text-[10px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, 1)}
                          disabled={idx === currentConfig.blockOrder.length - 1}
                          className="w-7 h-7 rounded-lg border border-light-border flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          title="Move down"
                        >
                          <i className="fas fa-chevron-down text-[10px]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Subject Groupings (Physics + Chem + Bio -> Science) */}
          {activeTab === 'grouping' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-50/60 to-emerald-50/60 p-4 rounded-2xl border border-rose-100">
                <div>
                  <h3 className="text-xs font-black text-dark-primary uppercase tracking-wider">
                    Subject Grouping System
                  </h3>
                  <p className="text-xs text-dark-muted mt-0.5 max-w-lg">
                    Group individual subjects under a custom parent title (e.g. place Physics, Chemistry, and Biology under "Science"). Custom titles are strictly user-defined.
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
                <div className="text-center py-12 bg-slate-50 border border-dashed border-light-border rounded-2xl p-6">
                  <i className="fas fa-layer-group text-3xl text-slate-300 mb-2 block" />
                  <p className="text-xs font-bold text-dark-primary">No Subject Groups Defined</p>
                  <p className="text-[11px] text-dark-muted mt-1 max-w-sm mx-auto">
                    All subjects will render as individual rows in the table. Click "Add Subject Group" to combine related subjects under a single category title.
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

          {/* Tab 3: School Header & Identity */}
          {activeTab === 'header' && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-dark-primary uppercase tracking-wider">
                Header Details & Logo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">School Name</label>
                  <input
                    type="text"
                    value={currentConfig.schoolHeader.title}
                    onChange={(e) =>
                      setCurrentConfig({
                        ...currentConfig,
                        schoolHeader: { ...currentConfig.schoolHeader, title: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">Subtitle / Motto</label>
                  <input
                    type="text"
                    value={currentConfig.schoolHeader.subtitle}
                    onChange={(e) =>
                      setCurrentConfig({
                        ...currentConfig,
                        schoolHeader: { ...currentConfig.schoolHeader, subtitle: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">Campus Address</label>
                  <input
                    type="text"
                    value={currentConfig.schoolHeader.address}
                    onChange={(e) =>
                      setCurrentConfig({
                        ...currentConfig,
                        schoolHeader: { ...currentConfig.schoolHeader, address: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">Logo URL or Path</label>
                  <input
                    type="text"
                    value={currentConfig.schoolHeader.logoUrl}
                    onChange={(e) =>
                      setCurrentConfig({
                        ...currentConfig,
                        schoolHeader: { ...currentConfig.schoolHeader, logoUrl: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Table Columns, Metrics & Charts */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* Table Column Configuration */}
              <div>
                <h3 className="text-xs font-black text-dark-primary uppercase tracking-wider mb-2">
                  Subject Table Columns
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'showMaxMarks', label: 'Max Marks' },
                    { key: 'showPassMarks', label: 'Pass Marks' },
                    { key: 'showMarksObtained', label: 'Marks Scored' },
                    { key: 'showGrade', label: 'Letter Grade' },
                    { key: 'showStatus', label: 'Pass / Fail' },
                    { key: 'bandedRows', label: 'Banded Rows' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 p-3 bg-slate-50 border border-light-border rounded-xl cursor-pointer hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(currentConfig.subjectTableConfig[item.key])}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            subjectTableConfig: {
                              ...currentConfig.subjectTableConfig,
                              [item.key]: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-rose-600 focus:ring-rose-400"
                      />
                      <span className="text-xs font-bold text-dark-slate">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Performance Graph Configuration */}
              <div>
                <h3 className="text-xs font-black text-dark-primary uppercase tracking-wider mb-2">
                  Performance Graphs & Charts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-slate-50 border border-light-border rounded-xl cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={currentConfig.showCharts}
                      onChange={(e) =>
                        setCurrentConfig({ ...currentConfig, showCharts: e.target.checked })
                      }
                      className="rounded text-rose-600 focus:ring-rose-400"
                    />
                    <span className="text-xs font-bold text-dark-slate">Embed Chart in Report</span>
                  </label>

                  <div>
                    <label className="block text-[11px] font-bold text-dark-muted mb-1">Chart Type</label>
                    <select
                      value={currentConfig.chartConfig.type}
                      onChange={(e) =>
                        setCurrentConfig({
                          ...currentConfig,
                          chartConfig: { ...currentConfig.chartConfig, type: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white font-bold"
                    >
                      <option value="bar">Vertical Column Bar (Marks vs Max)</option>
                      <option value="horizontal_bar">Horizontal Progress Bars</option>
                      <option value="radar">Proficiency Radar / Spider Web</option>
                      <option value="line">Score Trend Line</option>
                      <option value="area">Gradient Area Chart</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-dark-muted mb-1">Chart Title</label>
                    <input
                      type="text"
                      value={currentConfig.chartConfig.title}
                      onChange={(e) =>
                        setCurrentConfig({
                          ...currentConfig,
                          chartConfig: { ...currentConfig.chartConfig, title: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Calculations Summary Options */}
              <div>
                <h3 className="text-xs font-black text-dark-primary uppercase tracking-wider mb-2">
                  Calculations & Totals Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'showGrandTotal', label: 'Grand Total' },
                    { key: 'showPercentage', label: 'Percentage (%)' },
                    { key: 'showGrade', label: 'Overall Grade' },
                    { key: 'showClassRank', label: 'Class Rank' },
                    { key: 'showPassFail', label: 'Result Status' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 p-3 bg-slate-50 border border-light-border rounded-xl cursor-pointer hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(currentConfig.summaryConfig[item.key])}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            summaryConfig: {
                              ...currentConfig.summaryConfig,
                              [item.key]: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-rose-600 focus:ring-rose-400"
                      />
                      <span className="text-xs font-bold text-dark-slate">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Real-time Live Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-rose-50/70 p-3 rounded-2xl border border-rose-200">
                <div className="flex items-center gap-2 text-rose-800">
                  <i className="fas fa-eye text-sm" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Interactive Real-Time Preview
                  </span>
                </div>
                <span className="text-[11px] font-bold text-rose-700">
                  Reflects current colors, block order, groupings & chart type live
                </span>
              </div>

              {/* Sample Report Card */}
              <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-lg space-y-5 max-w-3xl mx-auto">
                {currentConfig.blockOrder.map((blockKey) => {
                  switch (blockKey) {
                    case 'schoolHeader':
                      if (!currentConfig.showSchoolHeader) return null;
                      return (
                        <div
                          key="schoolHeader"
                          className="border-b-2 border-slate-900 pb-3 text-center space-y-1 relative"
                        >
                          {currentConfig.schoolHeader?.logoUrl && (
                            <img
                              src={currentConfig.schoolHeader.logoUrl}
                              alt="Logo"
                              className="mx-auto max-h-12 mb-1 object-contain"
                            />
                          )}
                          <h2
                            className="text-xl font-black uppercase tracking-tight"
                            style={{ color: currentConfig.accentColor || '#1e293b' }}
                          >
                            {currentConfig.schoolHeader?.title || 'School Name'}
                          </h2>
                          <p className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">
                            {currentConfig.schoolHeader?.subtitle}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500">
                            {currentConfig.schoolHeader?.address}
                          </p>
                          <div className="pt-1.5">
                            <span
                              className="inline-block px-3 py-0.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest"
                              style={{ backgroundColor: currentConfig.accentColor || '#0f172a' }}
                            >
                              {currentConfig.schoolHeader?.examTitle || 'Official Progress Report'}
                            </span>
                          </div>
                        </div>
                      );

                    case 'studentInfo':
                      if (!currentConfig.showStudentInfo) return null;
                      return (
                        <div
                          key="studentInfo"
                          className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs"
                        >
                          {currentConfig.studentFields?.name && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Student Name
                              </span>
                              <span className="font-black text-dark-primary">
                                {PREVIEW_STUDENT.student_name}
                              </span>
                            </div>
                          )}
                          {currentConfig.studentFields?.admissionNo && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Admission No
                              </span>
                              <span className="font-bold text-dark-slate font-mono">
                                {PREVIEW_STUDENT.admission_no}
                              </span>
                            </div>
                          )}
                          {currentConfig.studentFields?.className && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Class / Grade
                              </span>
                              <span className="font-bold text-dark-slate">
                                {PREVIEW_STUDENT.class_name}
                              </span>
                            </div>
                          )}
                          {currentConfig.studentFields?.rollNo && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Roll No
                              </span>
                              <span className="font-bold text-dark-slate font-mono">
                                #{PREVIEW_STUDENT.roll_no}
                              </span>
                            </div>
                          )}
                          {currentConfig.studentFields?.fatherName && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Father / Guardian
                              </span>
                              <span className="font-bold text-dark-slate">
                                {PREVIEW_STUDENT.father_name}
                              </span>
                            </div>
                          )}
                          {currentConfig.studentFields?.dob && (
                            <div>
                              <span className="text-[9px] font-bold text-dark-muted uppercase block">
                                Date of Birth
                              </span>
                              <span className="font-bold text-dark-slate font-mono">
                                {PREVIEW_STUDENT.dob}
                              </span>
                            </div>
                          )}
                        </div>
                      );

                    case 'subjectTable':
                      if (!currentConfig.showSubjectTable) return null;
                      return (
                        <div key="subjectTable" className="space-y-1">
                          <div className="overflow-x-auto rounded-xl border border-slate-300">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead
                                className="text-white text-[10px] uppercase font-black tracking-wider"
                                style={{ backgroundColor: currentConfig.accentColor || '#1e293b' }}
                              >
                                <tr>
                                  <th className="py-2 px-3">Subject</th>
                                  {currentConfig.subjectTableConfig?.showMaxMarks && (
                                    <th className="py-2 px-2 text-center">Max Marks</th>
                                  )}
                                  {currentConfig.subjectTableConfig?.showPassMarks && (
                                    <th className="py-2 px-2 text-center">Pass Marks</th>
                                  )}
                                  {currentConfig.subjectTableConfig?.showMarksObtained && (
                                    <th className="py-2 px-2 text-center">Marks Scored</th>
                                  )}
                                  {currentConfig.subjectTableConfig?.showGrade && (
                                    <th className="py-2 px-2 text-center">Grade</th>
                                  )}
                                  {currentConfig.subjectTableConfig?.showStatus && (
                                    <th className="py-2 px-2 text-center">Status</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {/* Grouped Sections */}
                                {previewData.sections.map((grp) => (
                                  <React.Fragment key={grp.groupName}>
                                    <tr className="bg-rose-50/60 font-black text-[10px] text-rose-900">
                                      <td colSpan={6} className="py-1.5 px-3 uppercase tracking-wider">
                                        <i className="fas fa-layer-group text-[9px] mr-1.5 text-rose-600" />
                                        <span>Group: {grp.groupName}</span>
                                        <span className="ml-2 font-normal text-slate-600">
                                          (Subtotal: {grp.groupTotalObt} / {grp.groupTotalMax} · {grp.groupPct}%)
                                        </span>
                                      </td>
                                    </tr>
                                    {grp.members.map((s) => (
                                      <tr key={s.subjectId} className="hover:bg-slate-50">
                                        <td className="py-1.5 px-3 pl-6 font-semibold text-dark-primary">
                                          • {s.subjectName}
                                        </td>
                                        {currentConfig.subjectTableConfig?.showMaxMarks && (
                                          <td className="py-1.5 px-2 text-center font-mono">{s.maxMarks}</td>
                                        )}
                                        {currentConfig.subjectTableConfig?.showPassMarks && (
                                          <td className="py-1.5 px-2 text-center font-mono">{s.passMarks}</td>
                                        )}
                                        {currentConfig.subjectTableConfig?.showMarksObtained && (
                                          <td className="py-1.5 px-2 text-center font-black text-dark-primary font-mono">
                                            {s.marksObtained}
                                          </td>
                                        )}
                                        {currentConfig.subjectTableConfig?.showGrade && (
                                          <td className="py-1.5 px-2 text-center font-bold text-emerald-700">
                                            {s.grade}
                                          </td>
                                        )}
                                        {currentConfig.subjectTableConfig?.showStatus && (
                                          <td className="py-1.5 px-2 text-center font-bold text-[10px] text-emerald-700">
                                            {s.status}
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                ))}

                                {/* Ungrouped Sections */}
                                {previewData.ungrouped.map((s, idx) => (
                                  <tr
                                    key={s.subjectId}
                                    className={
                                      currentConfig.subjectTableConfig?.bandedRows && idx % 2 === 1
                                        ? 'bg-slate-50/70'
                                        : 'bg-white'
                                    }
                                  >
                                    <td className="py-1.5 px-3 font-semibold text-dark-primary">
                                      {s.subjectName}
                                    </td>
                                    {currentConfig.subjectTableConfig?.showMaxMarks && (
                                      <td className="py-1.5 px-2 text-center font-mono">{s.maxMarks}</td>
                                    )}
                                    {currentConfig.subjectTableConfig?.showPassMarks && (
                                      <td className="py-1.5 px-2 text-center font-mono">{s.passMarks}</td>
                                    )}
                                    {currentConfig.subjectTableConfig?.showMarksObtained && (
                                      <td className="py-1.5 px-2 text-center font-black text-dark-primary font-mono">
                                        {s.marksObtained}
                                      </td>
                                    )}
                                    {currentConfig.subjectTableConfig?.showGrade && (
                                      <td className="py-1.5 px-2 text-center font-bold text-emerald-700">
                                        {s.grade}
                                      </td>
                                    )}
                                    {currentConfig.subjectTableConfig?.showStatus && (
                                      <td className="py-1.5 px-2 text-center font-bold text-[10px] text-emerald-700">
                                        {s.status}
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
                      if (!currentConfig.showSummaryCalculations) return null;
                      return (
                        <div
                          key="summaryCalculations"
                          className="bg-slate-900 text-white rounded-xl p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center"
                        >
                          {currentConfig.summaryConfig?.showGrandTotal && (
                            <div>
                              <span className="text-[9px] text-slate-300 font-bold uppercase block">
                                Grand Total
                              </span>
                              <span className="text-sm font-black">615 / 700</span>
                            </div>
                          )}
                          {currentConfig.summaryConfig?.showPercentage && (
                            <div>
                              <span className="text-[9px] text-slate-300 font-bold uppercase block">
                                Percentage
                              </span>
                              <span className="text-sm font-black text-emerald-400">87.9%</span>
                            </div>
                          )}
                          {currentConfig.summaryConfig?.showGrade && (
                            <div>
                              <span className="text-[9px] text-slate-300 font-bold uppercase block">
                                Overall Grade
                              </span>
                              <span className="text-sm font-black text-amber-400">A+</span>
                            </div>
                          )}
                          {currentConfig.summaryConfig?.showClassRank && (
                            <div>
                              <span className="text-[9px] text-slate-300 font-bold uppercase block">
                                Class Rank
                              </span>
                              <span className="text-sm font-black text-white font-mono">#3</span>
                            </div>
                          )}
                          {currentConfig.summaryConfig?.showPassFail && (
                            <div>
                              <span className="text-[9px] text-slate-300 font-bold uppercase block">
                                Result
                              </span>
                              <span className="text-sm font-black text-emerald-400">PASS</span>
                            </div>
                          )}
                        </div>
                      );

                    case 'charts':
                      if (!currentConfig.showCharts) return null;
                      return (
                        <div
                          key="charts"
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
                        >
                          <h4 className="text-[11px] font-black text-dark-primary uppercase tracking-wider text-center">
                            {currentConfig.chartConfig?.title || 'Subject Performance Analysis'}
                          </h4>
                          <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              {currentConfig.chartConfig?.type === 'horizontal_bar' ? (
                                <BarChart
                                  data={previewChartData}
                                  layout="vertical"
                                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
                                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
                                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} width={70} />
                                  <Tooltip />
                                  <Bar dataKey="Marks" fill={currentConfig.accentColor || '#e11d48'} radius={[0, 4, 4, 0]} />
                                </BarChart>
                              ) : currentConfig.chartConfig?.type === 'radar' ? (
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={previewChartData}>
                                  <PolarGrid stroke="#cbd5e1" />
                                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                                  <Radar
                                    name="Marks"
                                    dataKey="Marks"
                                    stroke={currentConfig.accentColor || '#e11d48'}
                                    fill={currentConfig.accentColor || '#e11d48'}
                                    fillOpacity={0.45}
                                  />
                                  <Tooltip />
                                </RadarChart>
                              ) : currentConfig.chartConfig?.type === 'line' ? (
                                <LineChart data={previewChartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
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
                              ) : currentConfig.chartConfig?.type === 'area' ? (
                                <AreaChart data={previewChartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                                  <defs>
                                    <linearGradient id="designerPreviewGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={currentConfig.accentColor || '#e11d48'} stopOpacity={0.7} />
                                      <stop offset="95%" stopColor={currentConfig.accentColor || '#e11d48'} stopOpacity={0.05} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                                  <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                                  <Tooltip />
                                  <Area
                                    type="monotone"
                                    dataKey="Marks"
                                    stroke={currentConfig.accentColor || '#e11d48'}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#designerPreviewGradient)"
                                  />
                                </AreaChart>
                              ) : (
                                <BarChart data={previewChartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                                  <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                                  <Tooltip />
                                  <Bar dataKey="Marks" radius={[4, 4, 0, 0]}>
                                    {previewChartData.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={entry.Marks >= 80 ? currentConfig.secondaryColor || '#059669' : currentConfig.accentColor || '#e11d48'}
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
                      if (!currentConfig.showTeacherRemarks) return null;
                      return (
                        <div key="remarks" className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs">
                          <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block mb-1">
                            Teacher Remarks & Recommendations:
                          </span>
                          <p className="text-dark-primary font-medium italic">
                            "{currentConfig.remarksText}"
                          </p>
                        </div>
                      );

                    case 'signatures':
                      if (!currentConfig.showSignatures) return null;
                      return (
                        <div
                          key="signatures"
                          className="pt-6 border-t-2 border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs"
                        >
                          {Object.entries(currentConfig.signatures || {}).map(([key, label]) => (
                            <div key={key} className="space-y-1">
                              <div className="h-6 border-b border-dashed border-slate-400 mx-auto w-3/4" />
                              <span className="text-[10px] font-bold text-dark-muted block uppercase">
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      );

                    default:
                      return null;
                  }
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grouping Modal (Prompts for custom grouping name) */}
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
              Specify a custom title to group multiple subjects under one header (e.g. Science, Social, Languages).
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
                            setGroupSubjectIds(groupSubjectIds.filter((id) => id !== String(sub.id)));
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

export default ProgressReportDesigner;
