// src/components/examinations/ReportCardDesigner.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ConfigTabsBar from '../examinations/report-card-designer/components/ConfigTabsBar';
import {
  DEFAULT_GRADING_SCALE,
  DEFAULT_MOCK_CLASSIFICATIONS,
  DEFAULT_TEMPLATE,
  RAW_PREVIEW_SCORES,
  TEMPLATES_CONFIG_KEY,
  CLASSIFICATION_SEQ_FALLBACK,
  CLASSIFICATION_NAME_SEQ_FALLBACK,
  KNOWN_SUBJECT_CLASSIFICATIONS,
} from '../examinations/report-card-designer/constants';
import DesignerHeader from '../examinations/report-card-designer/components/DesignerHeader';
import GradeRuleModal from '../examinations/report-card-designer/modals/GradeRuleModal';
import GradingTab from '../examinations/report-card-designer/tabs/GradingTab';
import GroupModal from '../examinations/report-card-designer/modals/GroupModal';
import GroupingTab from '../examinations/report-card-designer/tabs/GroupingTab';
import LayoutTab from '../examinations/report-card-designer/tabs/LayoutTab';
import PreviewPanel from '../examinations/report-card-designer/preview/PreviewPanel';
import TemplateSelectorBar from '../examinations/report-card-designer/components/TemplateSelectorBar';
import { calculateGrade, mergeConfig } from '../examinations/report-card-designer/utils';
import { getAdminConfig, saveAdminConfig } from '../../utils/adminConfigUtils';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { useCanAccess } from '../portal-shared/ConditionalBlock';

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
        const { data } = await supabase
          .from('syl_classifications')
          .select('*')
          .order('seq', { ascending: true })
          .order('name', { ascending: true });
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
  const [isExtraComponentExpanded, setIsExtraComponentExpanded] = useState(false);

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
      const clamped = Math.min(Math.max(rawPct, 28), 72);
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
      case 'attendanceBar':
        setCurrentConfig((prev) => ({ ...prev, showAttendanceBar: !prev.showAttendanceBar }));
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
      case 'attendanceBar':
        setCurrentConfig((prev) => ({
          ...prev,
          attendanceBarConfig: { ...prev.attendanceBarConfig, size },
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
      case 'attendanceBar':
        return currentConfig.attendanceBarConfig?.size || 'standard';
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
      case 'attendanceBar':
        return currentConfig.showAttendanceBar !== false;
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
    const sampleScores = [88, 94, 82, 79, 91, 96, 85, 90];
    const sourceSubjects =
      Array.isArray(effectiveSubjects) && effectiveSubjects.length > 0
        ? effectiveSubjects.slice(0, 8).map((sub, idx) => {
            const marks = sampleScores[idx % sampleScores.length];
            const subName = (sub.name || '').trim();
            const subNorm = subName.toLowerCase();
            const known = KNOWN_SUBJECT_CLASSIFICATIONS[subNorm];
            const classId = sub.classification_id ?? known?.classificationId;
            const classObj =
              classifications.find((c) => String(c.id) === String(classId)) ||
              DEFAULT_MOCK_CLASSIFICATIONS.find((c) => String(c.id) === String(classId));
            const classificationName = classObj?.name || known?.classificationName || '';
            const classificationSeq =
              classObj?.seq !== undefined && classObj?.seq !== null
                ? Number(classObj.seq)
                : known?.seq !== undefined && known?.seq !== null
                ? Number(known.seq)
                : CLASSIFICATION_SEQ_FALLBACK[String(classId)] !== undefined
                ? CLASSIFICATION_SEQ_FALLBACK[String(classId)]
                : CLASSIFICATION_NAME_SEQ_FALLBACK[classificationName.toLowerCase()] !== undefined
                ? CLASSIFICATION_NAME_SEQ_FALLBACK[classificationName.toLowerCase()]
                : 999999;
            return {
              subjectId: String(sub.id),
              subjectName: sub.name,
              arabicName: sub.arabic_name || known?.arabicName || '',
              maxMarks: 100,
              passMarks: 35,
              marksObtained: marks,
              status: marks >= 35 ? 'PASS' : 'FAIL',
              classificationId: classId,
              classificationName,
              classificationSeq,
            };
          })
        : RAW_PREVIEW_SCORES;

    const mapped = sourceSubjects.map((s) => {
      const dbSub = effectiveSubjects.find(
        (as) =>
          String(as.id) === String(s.subjectId) ||
          as.name?.trim().toLowerCase() === s.subjectName?.trim().toLowerCase()
      );
      const subName = (s.subjectName || dbSub?.name || '').trim();
      const subNorm = subName.toLowerCase();
      const known = KNOWN_SUBJECT_CLASSIFICATIONS[subNorm];
      const pct = (s.marksObtained / s.maxMarks) * 100;
      const grade = calculateGrade(pct, currentConfig.gradingScale);
      const classId = dbSub?.classification_id || s.classificationId || known?.classificationId;
      const classObj =
        classifications.find((c) => String(c.id) === String(classId)) ||
        DEFAULT_MOCK_CLASSIFICATIONS.find((c) => String(c.id) === String(classId));
      const classificationName =
        classObj?.name ||
        s.classificationName ||
        known?.classificationName ||
        (classId ? `Classification ${classId}` : 'General');
      const classificationSeq =
        classObj?.seq !== undefined && classObj?.seq !== null
          ? Number(classObj.seq)
          : s.classificationSeq !== undefined && s.classificationSeq !== null && s.classificationSeq !== 999999
          ? Number(s.classificationSeq)
          : known?.seq !== undefined && known?.seq !== null
          ? Number(known.seq)
          : CLASSIFICATION_SEQ_FALLBACK[String(classId)] !== undefined
          ? CLASSIFICATION_SEQ_FALLBACK[String(classId)]
          : CLASSIFICATION_NAME_SEQ_FALLBACK[classificationName.toLowerCase()] !== undefined
          ? CLASSIFICATION_NAME_SEQ_FALLBACK[classificationName.toLowerCase()]
          : 999999;
      return {
        ...s,
        arabicName: dbSub?.arabic_name || s.arabicName || '',
        grade,
        classificationId: classId,
        classificationName,
        classificationSeq,
      };
    });

    return mapped.sort((a, b) => {
      const seqA = a.classificationSeq ?? 999999;
      const seqB = b.classificationSeq ?? 999999;
      if (seqA !== seqB) return seqA - seqB;
      return (a.subjectName || '').localeCompare(b.subjectName || '');
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
      <DesignerHeader
        canEdit={canEdit}
        handleSaveAll={handleSaveAll}
        mobileView={mobileView}
        onClose={onClose}
        setMobileView={setMobileView}
      />

      {/* ── Subview Two-Block Split Workspace ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* ── LEFT PANEL: CONFIGURATION BLOCK ── */}
        <div
          className={`flex flex-col bg-slate-50/60 border-r border-light-border overflow-hidden ${
            mobileView === 'preview' ? 'hidden lg:flex' : 'flex'
          }`}
          style={{
            width: isLgScreen ? `${leftWidthPercent}%` : '100%',
            minWidth: isLgScreen ? '350px' : undefined,
            maxWidth: isLgScreen ? 'calc(100% - 320px)' : undefined,
          }}
        >
          {/* Unified Template Selection & Naming Bar (Single place across designer) */}
          <TemplateSelectorBar
            currentConfig={currentConfig}
            handleCreateNewTemplate={handleCreateNewTemplate}
            handleSelectTemplate={handleSelectTemplate}
            setCurrentConfig={setCurrentConfig}
            templateOptions={templateOptions}
          />

          {/* Configuration Sub-Tabs Header */}
          <ConfigTabsBar activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Configuration Scrollable Content */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            {/* ══════════════════════════════════════════════════════════════
              TAB 1: VISUAL BLOCKS, ORDER, DETAILS & SIZING CONTROLS
          ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'layout' && (
              <LayoutTab
                currentConfig={currentConfig}
                draggedBlockIdx={draggedBlockIdx}
                expandedBlock={expandedBlock}
                getBlockSize={getBlockSize}
                handleDragEnd={handleDragEnd}
                handleDragOver={handleDragOver}
                handleDragStart={handleDragStart}
                isBlockVisible={isBlockVisible}
                isExtraComponentExpanded={isExtraComponentExpanded}
                moveBlock={moveBlock}
                setBlockSize={setBlockSize}
                setCurrentConfig={setCurrentConfig}
                setExpandedBlock={setExpandedBlock}
                setIsExtraComponentExpanded={setIsExtraComponentExpanded}
                toggleBlockVisibility={toggleBlockVisibility}
              />
            )}

            {/* ══════════════════════════════════════════════════════════════
              TAB 2: GRADING SCALE & RULES CONFIGURATION
          ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'grading' && (
              <GradingTab
                currentConfig={currentConfig}
                handleDeleteGrade={handleDeleteGrade}
                handleOpenAddGrade={handleOpenAddGrade}
                handleOpenEditGrade={handleOpenEditGrade}
                handleResetGradingScale={handleResetGradingScale}
                setCurrentConfig={setCurrentConfig}
              />
            )}

            {/* ══════════════════════════════════════════════════════════════
              TAB 3: SUBJECT GROUPINGS (Physics + Chem + Bio -> Science)
          ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'grouping' && (
              <GroupingTab
                availableSubjects={availableSubjects}
                currentConfig={currentConfig}
                handleDeleteGroup={handleDeleteGroup}
                handleEditGroup={handleEditGroup}
                handleOpenNewGroup={handleOpenNewGroup}
              />
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
        <PreviewPanel
          currentConfig={currentConfig}
          getBlockSize={getBlockSize}
          isDraggingSplitter={isDraggingSplitter}
          isLgScreen={isLgScreen}
          leftWidthPercent={leftWidthPercent}
          mobileView={mobileView}
          overallPreviewGrade={overallPreviewGrade}
          overallPreviewPct={overallPreviewPct}
          previewData={previewData}
          previewScoresWithGrades={previewScoresWithGrades}
          previewZoom={previewZoom}
          setPreviewZoom={setPreviewZoom}
        />
      </div>

      {/* ── Grade Rule Add/Edit Modal ── */}
      {showGradeModal && (
        <GradeRuleModal
          editingGradeIdx={editingGradeIdx}
          gradeForm={gradeForm}
          handleSaveGradeForm={handleSaveGradeForm}
          setGradeForm={setGradeForm}
          setShowGradeModal={setShowGradeModal}
        />
      )}

      {/* ── Grouping Modal (Custom Group Name & Subject Mapping) ── */}
      {showGroupModal && (
        <GroupModal
          availableSubjects={availableSubjects}
          editingGroupId={editingGroupId}
          groupNameInput={groupNameInput}
          groupSubjectIds={groupSubjectIds}
          handleSaveGroup={handleSaveGroup}
          setGroupNameInput={setGroupNameInput}
          setGroupSubjectIds={setGroupSubjectIds}
          setShowGroupModal={setShowGroupModal}
        />
      )}
    </div>
  );
};

export default ReportCardDesigner;

// Public API of the original file is preserved: everything that used to be exported from
// ReportCardDesigner.jsx is re-exported here.
export * from '../examinations/report-card-designer';
