// src/components/portals/teacher/SyllabusTracker.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';

const SyllabusTracker = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teacher, setTeacher] = useState(() => {
    try {
      const raw = localStorage.getItem('jzv_timetable_local_data');
      if (raw && user?.id) {
        const parsed = JSON.parse(raw);
        return (parsed.teachers || []).find(t => String(t.auth_id) === String(user.id) || String(t.id) === String(user.id)) || null;
      }
    } catch (e) {}
    return null;
  });

  const [classes, setClasses] = useState(() => {
    try {
      const raw = localStorage.getItem('jzv_timetable_local_data');
      return raw ? (JSON.parse(raw).classes || []) : [];
    } catch(e) { return []; }
  });

  const [subjects, setSubjects] = useState(() => {
    try {
      const raw = localStorage.getItem('jzv_syllabus_data');
      return raw ? (JSON.parse(raw).subjects || []) : [];
    } catch(e) { return []; }
  });

  const [assignments, setAssignments] = useState(() => {
    try {
      const raw = localStorage.getItem('jzv_timetable_local_data');
      if (raw && user?.id) {
        const parsed = JSON.parse(raw);
        const matchedTeacher = (parsed.teachers || []).find(t => String(t.auth_id) === String(user.id) || String(t.id) === String(user.id));
        if (matchedTeacher) {
          return (parsed.assignments || []).filter(a => String(a.teacher_id) === String(matchedTeacher.id));
        }
      }
    } catch(e) {}
    return [];
  });

  const [books, setBooks] = useState(() => {
    try {
      const raw = localStorage.getItem('jzv_syllabus_data');
      return raw ? (JSON.parse(raw).books || []) : [];
    } catch(e) { return []; }
  });

  const [syllabusData, setSyllabusData] = useState(() => {
    try {
      const raw = localStorage.getItem('jzv_syllabus_data');
      return raw ? (JSON.parse(raw).syllabusData || []) : [];
    } catch(e) { return []; }
  });

  const [selectedClassId, setSelectedClassId] = useState(() => {
    try {
      const raw = localStorage.getItem('jzv_timetable_local_data');
      if (raw && user?.id) {
        const parsed = JSON.parse(raw);
        const matchedTeacher = (parsed.teachers || []).find(t => String(t.auth_id) === String(user.id) || String(t.id) === String(user.id));
        if (matchedTeacher) {
          const ass = (parsed.assignments || []).filter(a => String(a.teacher_id) === String(matchedTeacher.id));
          if (ass.length > 0) return String(ass[0].class_id);
        }
      }
    } catch(e) {}
    return '';
  });

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');

  const [progressList, setProgressList] = useState([]);
  const [activeTab, setActiveTab] = useState('curriculum');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

  const [historyLogs, setHistoryLogs] = useState([]);
  const [adhocName, setAdhocName] = useState('');
  const [coverMode, setCoverMode] = useState(false);

  // Accordion and Multi-Select states
  const [expandedLvl1, setExpandedLvl1] = useState({});
  const [expandedLvl2, setExpandedLvl2] = useState({});
  const [selectedNodes, setSelectedNodes] = useState([]);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        if (!user || !user.id) throw new Error('User session not found.');
        const { data: teacherData, error: teachErr } = await supabase.from('teachers').select('*').eq('auth_id', user.id).maybeSingle();
        if (teachErr) throw teachErr;
        if (!teacherData) throw new Error('User not mapped to Teacher record.');
        setTeacher(teacherData);

        const [
          { data: dbClasses }, { data: dbSubjects }, { data: dbAssignments }, { data: dbBooks }, { data: dbSyllabusData }
        ] = await Promise.all([
          supabase.from('classes').select('*'),
          supabase.from('subjects').select('*'),
          supabase.from('class_assignments').select('*').eq('teacher_id', teacherData.id),
          supabase.from('syllabus_books').select('*'),
          supabase.from('syllabus_book_lessons').select('*')
        ]);

        setClasses(dbClasses || []);
        setSubjects(dbSubjects || []);
        setAssignments(dbAssignments || []);

        if (dbBooks && dbBooks.length > 0) {
          setBooks(dbBooks);
          setSyllabusData(dbSyllabusData || []);
        } else {
          const rawSyllabus = localStorage.getItem('jzv_syllabus_data');
          if (rawSyllabus) {
            try {
              const parsed = JSON.parse(rawSyllabus);
              setBooks(parsed.books || []);
              setSyllabusData(parsed.syllabusData || []);
            } catch (e) {
              setBooks([]);
              setSyllabusData([]);
            }
          } else {
            setBooks([]);
            setSyllabusData([]);
          }
        }

        const assignedClassIds = (dbAssignments || []).map(a => String(a.class_id));
        const filteredClasses = (dbClasses || []).filter(c => assignedClassIds.includes(String(c.id)));
        if (filteredClasses.length > 0 && !selectedClassId) setSelectedClassId(String(filteredClasses[0].id));
      } catch (err) {
        console.warn('SyllabusTracker DB init failed, using LocalStorage fallback:', err.message);
        loadLocalTrackerData();
      } finally {
        setLoading(false);
      }
    };

    const loadLocalTrackerData = () => {
      const rawSyllabus = localStorage.getItem('jzv_syllabus_data');
      let localBooks = [];
      let localSyllabusData = [];
      let localSubjects = [];
      if (rawSyllabus) {
        try {
          const parsed = JSON.parse(rawSyllabus);
          localBooks = parsed.books || [];
          localSyllabusData = parsed.syllabusData || [];
          localSubjects = parsed.subjects || [];
        } catch (e) {}
      }

      const rawTimetable = localStorage.getItem('jzv_timetable_local_data');
      let localClasses = [];
      let localAssignments = [];
      let matchedTeacher = null;

      if (rawTimetable) {
        try {
          const parsedTimetable = JSON.parse(rawTimetable);
          localClasses = parsedTimetable.classes || [];

          matchedTeacher = (parsedTimetable.teachers || []).find(
            (t) => String(t.auth_id) === String(user?.id) || String(t.id) === String(user?.id)
          );
          if (matchedTeacher) {
            setTeacher(matchedTeacher);
            localAssignments = (parsedTimetable.assignments || []).filter(
              (a) => String(a.teacher_id) === String(matchedTeacher.id)
            );
          }
        } catch (e) {}
      }

      setClasses(localClasses);
      setSubjects(localSubjects.length > 0 ? localSubjects : (localClasses.length > 0 ? [{ id: '1', name: 'General' }] : []));
      setAssignments(localAssignments);
      setBooks(localBooks);
      setSyllabusData(localSyllabusData);

      const assignedClassIds = localAssignments.map((a) => String(a.class_id));
      const filteredClasses = localClasses.filter((c) => assignedClassIds.includes(String(c.id)));
      if (filteredClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(String(filteredClasses[0].id));
      } else if (localClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(String(localClasses[0].id));
      }
    };

    initData();
  }, [user]);

  // Handle active lists dynamically depending on coverMode
  const activeClasses = coverMode
    ? classes
    : classes.filter(c => assignments.some(a => String(a.class_id) === String(c.id)));

  const filteredSubjects = coverMode
    ? subjects
    : subjects.filter(s => assignments.some(a => String(a.class_id) === String(selectedClassId) && String(a.subject_id) === String(s.id)));

  // Auto-selections
  useEffect(() => {
    if (activeClasses.length > 0) {
      if (!activeClasses.some(c => String(c.id) === String(selectedClassId))) {
        setSelectedClassId(String(activeClasses[0].id));
      }
    } else {
      setSelectedClassId('');
    }
  }, [coverMode, classes, assignments]);

  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!filteredSubjects.some(s => String(s.id) === String(selectedSubjectId))) {
        setSelectedSubjectId(String(filteredSubjects[0].id));
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedClassId, coverMode, assignments, subjects]);

  const filteredBooks = books.filter(b => String(b.subject_id) === String(selectedSubjectId));

  useEffect(() => {
    if (filteredBooks.length > 0) {
      setSelectedBookId(String(filteredBooks[0].id));
    } else {
      setSelectedBookId('');
    }
    // Clear check selections when switching books
    setSelectedNodes([]);
  }, [selectedSubjectId, books]);

  const fetchProgress = async () => {
    if (!selectedClassId) return;
    try {
      const { data, error } = await supabase.from('syllabus_node_progress').select('*').eq('class_id', selectedClassId);
      if (error) throw error;
      setProgressList(data || []);
    } catch (err) {
      console.warn("DB syllabus_node_progress fetch failed, using LocalStorage fallback:", err.message);
      const localProgress = localStorage.getItem('jzv_syllabus_node_progress');
      if (localProgress) {
        try {
          const parsed = JSON.parse(localProgress);
          setProgressList(parsed.filter(p => String(p.class_id) === String(selectedClassId)));
        } catch (e) {
          setProgressList([]);
        }
      } else {
        setProgressList([]);
      }
    }
  };

  const fetchHistory = async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    try {
      const { data, error } = await supabase
        .from('syllabus_tracker_logs')
        .select(`id, date, syllabus_tracker_log_items (id, item_type, item_id, adhoc_name, status)`)
        .eq('class_id', selectedClassId)
        .eq('subject_id', selectedSubjectId)
        .order('date', { ascending: false });
      if (error) throw error;
      setHistoryLogs(data || []);
    } catch (err) {
      console.warn("DB syllabus_tracker_logs fetch failed, using LocalStorage fallback:", err.message);
      const localLogs = localStorage.getItem('jzv_syllabus_tracker_logs');
      if (localLogs) {
        try {
          const parsed = JSON.parse(localLogs);
          setHistoryLogs(parsed.filter(log => 
            String(log.class_id) === String(selectedClassId) && 
            String(log.subject_id) === String(selectedSubjectId)
          ));
        } catch (e) {
          setHistoryLogs([]);
        }
      } else {
        setHistoryLogs([]);
      }
    }
  };

  useEffect(() => {
    if (selectedClassId) fetchProgress();
    if (selectedClassId && selectedSubjectId) fetchHistory();
  }, [selectedClassId, selectedSubjectId]);

  const getNodeProgress = (id) => progressList.find(p => p.item_type === 'node' && String(p.item_id) === String(id));

  // Distinct dates worked calculation logic (roll-up core)
  const getNodeDates = (nodeId) => {
    const dates = [];
    historyLogs.forEach(log => {
      if (log.syllabus_tracker_log_items.some(item => String(item.item_id) === String(nodeId) && item.item_type === 'node')) {
        dates.push(log.date);
      }
    });
    return [...new Set(dates)];
  };

  const getNodeDays = (nodeId) => getNodeDates(nodeId).length;

  const getLevel2Days = (level1Name, level2Name) => {
    const lvl2Nodes = bookData.filter(n => n.level1 === level1Name && (n.level2 || 'General') === level2Name);
    return lvl2Nodes.reduce((sum, node) => sum + getNodeDays(node.id), 0);
  };

  const getLevel1Days = (level1Name) => {
    const level1Nodes = bookData.filter(n => n.level1 === level1Name);
    const level2Names = [...new Set(level1Nodes.map(n => n.level2 || 'General'))];
    return level2Names.reduce((sum, lvl2Name) => sum + getLevel2Days(level1Name, lvl2Name), 0);
  };

  const getBookDays = () => {
    const level1Names = [...new Set(bookData.map(n => n.level1))].filter(Boolean);
    return level1Names.reduce((sum, lvl1Name) => sum + getLevel1Days(lvl1Name), 0);
  };

  const getChildNodeIds = (parentType, parentItemId) => {
    let nodesToUpdate = [];
    if (parentType === 'book') {
      nodesToUpdate = bookData;
    } else if (parentType === 'level1') {
      const matchNode = bookData.find(n => String(n.id) === String(parentItemId));
      if (matchNode) {
        nodesToUpdate = bookData.filter(n => n.level1 === matchNode.level1);
      }
    } else if (parentType === 'level2') {
      const matchNode = bookData.find(n => String(n.id) === String(parentItemId));
      if (matchNode) {
        nodesToUpdate = bookData.filter(n => n.level1 === matchNode.level1 && (n.level2 || 'General') === (matchNode.level2 || 'General'));
      }
    }
    return nodesToUpdate;
  };

  const cascadeCompletion = async (parentType, parentItemId) => {
    const children = getChildNodeIds(parentType, parentItemId);
    if (children.length === 0) return;

    const updates = children.map(async (child) => {
      const existing = progressList.find(p => p.item_type === 'node' && String(p.item_id) === String(child.id));
      if (!existing) {
        await supabase.from('syllabus_node_progress').insert([{
          class_id: selectedClassId,
          item_type: 'node',
          item_id: child.id,
          status: '100%',
          revision_count: 0,
          first_worked_at: logDate,
          completed_at: logDate
        }]);
      } else {
        await supabase.from('syllabus_node_progress').update({
          status: '100%',
          completed_at: logDate,
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
      }
    });

    await Promise.all(updates);
  };

  const cascadeCompletionLocal = (parentType, parentItemId, localProgress) => {
    const children = getChildNodeIds(parentType, parentItemId);
    children.forEach(child => {
      const existingIdx = localProgress.findIndex(p => String(p.class_id) === String(selectedClassId) && p.item_type === 'node' && String(p.item_id) === String(child.id));
      if (existingIdx > -1) {
        localProgress[existingIdx] = {
          ...localProgress[existingIdx],
          status: '100%',
          completed_at: logDate,
          updated_at: new Date().toISOString()
        };
      } else {
        localProgress.push({
          id: 'local-prog-' + Math.random().toString(36).substr(2, 9),
          class_id: selectedClassId,
          item_type: 'node',
          item_id: child.id,
          status: '100%',
          revision_count: 0,
          first_worked_at: logDate,
          completed_at: logDate
        });
      }
    });
  };

  const handleStatusUpdate = async (nodeId, newStatus) => {
    setSubmitting(true);
    try {
      const existing = getNodeProgress(nodeId);
      let progressId = existing?.id;
      const isCompleted = newStatus === '100%' || newStatus === 'completed';

      try {
        if (!existing) {
          const { data, error } = await supabase.from('syllabus_node_progress').insert([{
            class_id: selectedClassId,
            item_type: 'node',
            item_id: nodeId,
            status: newStatus,
            revision_count: 0,
            first_worked_at: logDate,
            completed_at: isCompleted ? logDate : null
          }]).select();
          if (error) throw error;
          progressId = data[0].id;
        } else {
          const { error } = await supabase.from('syllabus_node_progress').update({
            status: newStatus,
            completed_at: isCompleted ? logDate : null,
            updated_at: new Date().toISOString()
          }).eq('id', existing.id);
          if (error) throw error;
        }

        const { data: logData, error: logErr } = await supabase.from('syllabus_tracker_logs').insert([{
          date: logDate, class_id: selectedClassId, subject_id: selectedSubjectId, teacher_id: teacher?.id
        }]).select();
        if (logErr) throw logErr;

        await supabase.from('syllabus_tracker_log_items').insert([{
          log_id: logData[0].id, item_type: 'node', item_id: nodeId, status: newStatus
        }]);

        showToast('Progress logged!', 'success');
      } catch (dbErr) {
        console.warn("DB save failed, falling back to LocalStorage:", dbErr.message);
        
        // Save progress locally
        const localProgressRaw = localStorage.getItem('jzv_syllabus_node_progress') || '[]';
        let localProgress = [];
        try { localProgress = JSON.parse(localProgressRaw); } catch (e) {}

        const existingIdx = localProgress.findIndex(p => String(p.class_id) === String(selectedClassId) && p.item_type === 'node' && String(p.item_id) === String(nodeId));
        if (existingIdx > -1) {
          localProgress[existingIdx] = {
            ...localProgress[existingIdx],
            status: newStatus,
            completed_at: isCompleted ? logDate : null,
            updated_at: new Date().toISOString()
          };
        } else {
          localProgress.push({
            id: 'local-prog-' + Math.random().toString(36).substr(2, 9),
            class_id: selectedClassId,
            item_type: 'node',
            item_id: nodeId,
            status: newStatus,
            revision_count: 0,
            first_worked_at: logDate,
            completed_at: isCompleted ? logDate : null
          });
        }
        localStorage.setItem('jzv_syllabus_node_progress', JSON.stringify(localProgress));

        // Save log locally
        const localLogsRaw = localStorage.getItem('jzv_syllabus_tracker_logs') || '[]';
        let localLogs = [];
        try { localLogs = JSON.parse(localLogsRaw); } catch (e) {}

        const newLogId = 'local-log-' + Math.random().toString(36).substr(2, 9);
        localLogs.unshift({
          id: newLogId,
          date: logDate,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          teacher_id: teacher?.id || 'local-teacher',
          syllabus_tracker_log_items: [{
            id: 'local-log-item-' + Math.random().toString(36).substr(2, 9),
            log_id: newLogId,
            item_type: 'node',
            item_id: nodeId,
            status: newStatus
          }]
        });
        localStorage.setItem('jzv_syllabus_tracker_logs', JSON.stringify(localLogs));

        showToast('Progress logged locally!', 'success');
      }

      fetchProgress();
      fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdateParent = async (itemType, itemId, newStatus, displayName) => {
    setSubmitting(true);
    try {
      const existing = progressList.find(p => p.item_type === itemType && String(p.item_id) === String(itemId));
      let progressId = existing?.id;
      const isCompleted = newStatus === '100%' || newStatus === 'completed';

      try {
        if (!existing) {
          const { data, error } = await supabase.from('syllabus_node_progress').insert([{
            class_id: selectedClassId,
            item_type: itemType,
            item_id: itemId,
            status: newStatus,
            revision_count: 0,
            first_worked_at: logDate,
            completed_at: isCompleted ? logDate : null
          }]).select();
          if (error) throw error;
          progressId = data[0].id;
        } else {
          const { error } = await supabase.from('syllabus_node_progress').update({
            status: newStatus,
            completed_at: isCompleted ? logDate : null,
            updated_at: new Date().toISOString()
          }).eq('id', existing.id);
          if (error) throw error;
        }

        const { data: logData, error: logErr } = await supabase.from('syllabus_tracker_logs').insert([{
          date: logDate, class_id: selectedClassId, subject_id: selectedSubjectId, teacher_id: teacher?.id
        }]).select();
        if (logErr) throw logErr;

        await supabase.from('syllabus_tracker_log_items').insert([{
          log_id: logData[0].id, item_type: itemType, item_id: itemId, status: newStatus, adhoc_name: displayName
        }]);

        if (isCompleted) {
          await cascadeCompletion(itemType, itemId);
        }

        showToast(`${displayName} status updated!`, 'success');
      } catch (dbErr) {
        console.warn("DB save failed, falling back to LocalStorage:", dbErr.message);

        // Save progress locally
        const localProgressRaw = localStorage.getItem('jzv_syllabus_node_progress') || '[]';
        let localProgress = [];
        try { localProgress = JSON.parse(localProgressRaw); } catch (e) {}

        const existingIdx = localProgress.findIndex(p => String(p.class_id) === String(selectedClassId) && p.item_type === itemType && String(p.item_id) === String(itemId));
        if (existingIdx > -1) {
          localProgress[existingIdx] = {
            ...localProgress[existingIdx],
            status: newStatus,
            completed_at: isCompleted ? logDate : null,
            updated_at: new Date().toISOString()
          };
        } else {
          localProgress.push({
            id: 'local-prog-' + Math.random().toString(36).substr(2, 9),
            class_id: selectedClassId,
            item_type: 'node',
            item_id: itemId,
            status: newStatus,
            revision_count: 0,
            first_worked_at: logDate,
            completed_at: isCompleted ? logDate : null
          });
        }

        if (isCompleted) {
          cascadeCompletionLocal(itemType, itemId, localProgress);
        }

        localStorage.setItem('jzv_syllabus_node_progress', JSON.stringify(localProgress));

        // Save log locally
        const localLogsRaw = localStorage.getItem('jzv_syllabus_tracker_logs') || '[]';
        let localLogs = [];
        try { localLogs = JSON.parse(localLogsRaw); } catch (e) {}

        const newLogId = 'local-log-' + Math.random().toString(36).substr(2, 9);
        localLogs.unshift({
          id: newLogId,
          date: logDate,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          teacher_id: teacher?.id || 'local-teacher',
          syllabus_tracker_log_items: [{
            id: 'local-log-item-' + Math.random().toString(36).substr(2, 9),
            log_id: newLogId,
            item_type: 'item',
            item_id: itemId,
            status: newStatus,
            adhoc_name: displayName
          }]
        });
        localStorage.setItem('jzv_syllabus_tracker_logs', JSON.stringify(localLogs));

        showToast(`${displayName} status updated locally!`, 'success');
      }

      fetchProgress();
      fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncrementRevision = async (itemType, itemId, displayName = '') => {
    setSubmitting(true);
    try {
      const existing = progressList.find(p => p.item_type === itemType && String(p.item_id) === String(itemId));
      const currentCount = existing?.revision_count || 0;
      const nextCount = currentCount + 1;

      try {
        if (!existing) {
          const { error } = await supabase.from('syllabus_node_progress').insert([{
            class_id: selectedClassId,
            item_type: itemType,
            item_id: itemId,
            status: '100%',
            revision_count: 1,
            first_worked_at: logDate,
            completed_at: logDate
          }]);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('syllabus_node_progress').update({
            revision_count: nextCount,
            updated_at: new Date().toISOString()
          }).eq('id', existing.id);
          if (error) throw error;
        }

        const { data: logData, error: logErr } = await supabase.from('syllabus_tracker_logs').insert([{
          date: logDate, class_id: selectedClassId, subject_id: selectedSubjectId, teacher_id: teacher?.id
        }]).select();
        if (logErr) throw logErr;

        await supabase.from('syllabus_tracker_log_items').insert([{
          log_id: logData[0].id,
          item_type: itemType,
          item_id: itemId,
          status: `revision-${nextCount}`,
          adhoc_name: displayName || `${itemType} revision`
        }]);

        showToast(`${displayName || itemType} revision logged (#${nextCount})!`, 'success');
      } catch (dbErr) {
        console.warn("DB save failed, falling back to LocalStorage:", dbErr.message);

        // Save progress locally
        const localProgressRaw = localStorage.getItem('jzv_syllabus_node_progress') || '[]';
        let localProgress = [];
        try { localProgress = JSON.parse(localProgressRaw); } catch (e) {}

        const existingIdx = localProgress.findIndex(p => String(p.class_id) === String(selectedClassId) && p.item_type === itemType && String(p.item_id) === String(itemId));
        if (existingIdx > -1) {
          localProgress[existingIdx] = {
            ...localProgress[existingIdx],
            revision_count: nextCount,
            updated_at: new Date().toISOString()
          };
        } else {
          localProgress.push({
            id: 'local-prog-' + Math.random().toString(36).substr(2, 9),
            class_id: selectedClassId,
            item_type: itemType,
            item_id: itemId,
            status: '100%',
            revision_count: 1,
            first_worked_at: logDate,
            completed_at: logDate
          });
        }
        localStorage.setItem('jzv_syllabus_node_progress', JSON.stringify(localProgress));

        // Save log locally
        const localLogsRaw = localStorage.getItem('jzv_syllabus_tracker_logs') || '[]';
        let localLogs = [];
        try { localLogs = JSON.parse(localLogsRaw); } catch (e) {}

        const newLogId = 'local-log-' + Math.random().toString(36).substr(2, 9);
        localLogs.unshift({
          id: newLogId,
          date: logDate,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          teacher_id: teacher?.id || 'local-teacher',
          syllabus_tracker_log_items: [{
            id: 'local-log-item-' + Math.random().toString(36).substr(2, 9),
            log_id: newLogId,
            item_type: itemType,
            item_id: itemId,
            status: `revision-${nextCount}`,
            adhoc_name: displayName || `${itemType} revision`
          }]
        });
        localStorage.setItem('jzv_syllabus_tracker_logs', JSON.stringify(localLogs));

        showToast(`${displayName || itemType} revision logged locally (#${nextCount})!`, 'success');
      }

      fetchProgress();
      fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk Updates Handlers
  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedNodes.length === 0) return;
    setSubmitting(true);
    try {
      const isCompleted = newStatus === '100%' || newStatus === 'completed';
      
      const updates = selectedNodes.map(async (nodeId) => {
        const existing = getNodeProgress(nodeId);
        if (!existing) {
          await supabase.from('syllabus_node_progress').insert([{
            class_id: selectedClassId,
            item_type: 'node',
            item_id: nodeId,
            status: newStatus,
            revision_count: 0,
            first_worked_at: logDate,
            completed_at: isCompleted ? logDate : null
          }]);
        } else {
          await supabase.from('syllabus_node_progress').update({
            status: newStatus,
            completed_at: isCompleted ? logDate : null,
            updated_at: new Date().toISOString()
          }).eq('id', existing.id);
        }
      });

      try {
        await Promise.all(updates);

        const { data: logData, error: logErr } = await supabase.from('syllabus_tracker_logs').insert([{
          date: logDate, class_id: selectedClassId, subject_id: selectedSubjectId, teacher_id: teacher?.id
        }]).select();
        if (logErr) throw logErr;

        const logItems = selectedNodes.map(nodeId => ({
          log_id: logData[0].id, item_type: 'node', item_id: nodeId, status: newStatus
        }));
        await supabase.from('syllabus_tracker_log_items').insert(logItems);

        showToast(`Bulk progress updated to ${newStatus} for ${selectedNodes.length} topics!`, 'success');
      } catch (dbErr) {
        console.warn("DB save failed, falling back to LocalStorage:", dbErr.message);

        const localProgressRaw = localStorage.getItem('jzv_syllabus_node_progress') || '[]';
        let localProgress = [];
        try { localProgress = JSON.parse(localProgressRaw); } catch (e) {}

        selectedNodes.forEach(nodeId => {
          const existingIdx = localProgress.findIndex(p => String(p.class_id) === String(selectedClassId) && p.item_type === 'node' && String(p.item_id) === String(nodeId));
          if (existingIdx > -1) {
            localProgress[existingIdx] = {
              ...localProgress[existingIdx],
              status: newStatus,
              completed_at: isCompleted ? logDate : null,
              updated_at: new Date().toISOString()
            };
          } else {
            localProgress.push({
              id: 'local-prog-' + Math.random().toString(36).substr(2, 9),
              class_id: selectedClassId,
              item_type: 'node',
              item_id: nodeId,
              status: newStatus,
              revision_count: 0,
              first_worked_at: logDate,
              completed_at: isCompleted ? logDate : null
            });
          }
        });
        localStorage.setItem('jzv_syllabus_node_progress', JSON.stringify(localProgress));

        const localLogsRaw = localStorage.getItem('jzv_syllabus_tracker_logs') || '[]';
        let localLogs = [];
        try { localLogs = JSON.parse(localLogsRaw); } catch (e) {}

        const newLogId = 'local-log-' + Math.random().toString(36).substr(2, 9);
        const localLogItems = selectedNodes.map(nodeId => ({
          id: 'local-log-item-' + Math.random().toString(36).substr(2, 9),
          log_id: newLogId,
          item_type: 'node',
          item_id: nodeId,
          status: newStatus
        }));
        localLogs.unshift({
          id: newLogId,
          date: logDate,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          teacher_id: teacher?.id || 'local-teacher',
          syllabus_tracker_log_items: localLogItems
        });
        localStorage.setItem('jzv_syllabus_tracker_logs', JSON.stringify(localLogs));

        showToast(`Bulk progress updated locally to ${newStatus} for ${selectedNodes.length} topics!`, 'success');
      }

      setSelectedNodes([]);
      fetchProgress();
      fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkIncrementRevision = async () => {
    if (selectedNodes.length === 0) return;
    setSubmitting(true);
    try {
      const updates = selectedNodes.map(async (nodeId) => {
        const existing = progressList.find(p => p.item_type === 'node' && String(p.item_id) === String(nodeId));
        const currentCount = existing?.revision_count || 0;
        const nextCount = currentCount + 1;

        if (!existing) {
          await supabase.from('syllabus_node_progress').insert([{
            class_id: selectedClassId,
            item_type: 'node',
            item_id: nodeId,
            status: '100%',
            revision_count: 1,
            first_worked_at: logDate,
            completed_at: logDate
          }]);
        } else {
          await supabase.from('syllabus_node_progress').update({
            revision_count: nextCount,
            updated_at: new Date().toISOString()
          }).eq('id', existing.id);
        }
      });

      try {
        await Promise.all(updates);

        const { data: logData, error: logErr } = await supabase.from('syllabus_tracker_logs').insert([{
          date: logDate, class_id: selectedClassId, subject_id: selectedSubjectId, teacher_id: teacher?.id
        }]).select();
        if (logErr) throw logErr;

        const logItems = selectedNodes.map(nodeId => {
          const node = bookData.find(n => String(n.id) === String(nodeId));
          const existing = progressList.find(p => p.item_type === 'node' && String(p.item_id) === String(nodeId));
          const nextCount = (existing?.revision_count || 0) + 1;
          return {
            log_id: logData[0].id,
            item_type: 'node',
            item_id: nodeId,
            status: `revision-${nextCount}`,
            adhoc_name: `Lesson: ${node?.level3 || 'Lesson revision'}`
          };
        });
        await supabase.from('syllabus_tracker_log_items').insert(logItems);

        showToast(`Logged revision for ${selectedNodes.length} topics!`, 'success');
      } catch (dbErr) {
        console.warn("DB save failed, falling back to LocalStorage:", dbErr.message);

        const localProgressRaw = localStorage.getItem('jzv_syllabus_node_progress') || '[]';
        let localProgress = [];
        try { localProgress = JSON.parse(localProgressRaw); } catch (e) {}

        selectedNodes.forEach(nodeId => {
          const existingIdx = localProgress.findIndex(p => String(p.class_id) === String(selectedClassId) && p.item_type === 'node' && String(p.item_id) === String(nodeId));
          const currentCount = existingIdx > -1 ? localProgress[existingIdx].revision_count : 0;
          const nextCount = currentCount + 1;

          if (existingIdx > -1) {
            localProgress[existingIdx] = {
              ...localProgress[existingIdx],
              revision_count: nextCount,
              updated_at: new Date().toISOString()
            };
          } else {
            localProgress.push({
              id: 'local-prog-' + Math.random().toString(36).substr(2, 9),
              class_id: selectedClassId,
              item_type: 'node',
              item_id: nodeId,
              status: '100%',
              revision_count: 1,
              first_worked_at: logDate,
              completed_at: logDate
            });
          }
        });
        localStorage.setItem('jzv_syllabus_node_progress', JSON.stringify(localProgress));

        const localLogsRaw = localStorage.getItem('jzv_syllabus_tracker_logs') || '[]';
        let localLogs = [];
        try { localLogs = JSON.parse(localLogsRaw); } catch (e) {}

        const newLogId = 'local-log-' + Math.random().toString(36).substr(2, 9);
        const localLogItems = selectedNodes.map(nodeId => {
          const node = bookData.find(n => String(n.id) === String(nodeId));
          const existing = progressList.find(p => p.item_type === 'node' && String(p.item_id) === String(nodeId));
          const nextCount = (existing?.revision_count || 0) + 1;
          return {
            id: 'local-log-item-' + Math.random().toString(36).substr(2, 9),
            log_id: newLogId,
            item_type: 'node',
            item_id: nodeId,
            status: `revision-${nextCount}`,
            adhoc_name: `Lesson: ${node?.level3 || 'Lesson revision'}`
          };
        });
        localLogs.unshift({
          id: newLogId,
          date: logDate,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          teacher_id: teacher?.id || 'local-teacher',
          syllabus_tracker_log_items: localLogItems
        });
        localStorage.setItem('jzv_syllabus_tracker_logs', JSON.stringify(localLogs));

        showToast(`Logged revision locally for ${selectedNodes.length} topics!`, 'success');
      }

      setSelectedNodes([]);
      fetchProgress();
      fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectNode = (nodeId) => {
    if (selectedNodes.includes(nodeId)) {
      setSelectedNodes(prev => prev.filter(id => id !== nodeId));
    } else {
      setSelectedNodes(prev => [...prev, nodeId]);
    }
  };

  const handleSelectBook = (checked) => {
    const allBookNodeIds = bookData.map(n => n.id);
    if (checked) {
      setSelectedNodes(allBookNodeIds);
    } else {
      setSelectedNodes([]);
    }
  };

  const handleSelectLvl1 = (level1Name, checked) => {
    const nodeIds = bookData.filter(n => n.level1 === level1Name).map(n => n.id);
    if (checked) {
      setSelectedNodes(prev => [...new Set([...prev, ...nodeIds])]);
    } else {
      setSelectedNodes(prev => prev.filter(id => !nodeIds.includes(id)));
    }
  };

  const handleSelectLvl2 = (level1Name, level2Name, checked) => {
    const nodeIds = bookData.filter(n => n.level1 === level1Name && (n.level2 || 'General') === level2Name).map(n => n.id);
    if (checked) {
      setSelectedNodes(prev => [...new Set([...prev, ...nodeIds])]);
    } else {
      setSelectedNodes(prev => prev.filter(id => !nodeIds.includes(id)));
    }
  };

  const toggleLvl1 = (name) => {
    setExpandedLvl1(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleLvl2 = (key) => {
    setExpandedLvl2(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAdhocSubmit = async (e) => {
    e.preventDefault();
    if (!adhocName.trim()) return showToast('Description required.', 'warning');
    setSubmitting(true);
    try {
      try {
        const { data: logData, error: logErr } = await supabase.from('syllabus_tracker_logs').insert([{
          date: logDate, class_id: selectedClassId, subject_id: selectedSubjectId, teacher_id: teacher?.id
        }]).select();
        if (logErr) throw logErr;
        
        await supabase.from('syllabus_tracker_log_items').insert([{
          log_id: logData[0].id, item_type: 'adhoc', item_id: null, adhoc_name: adhocName.trim(), status: 'completed'
        }]);
        
        showToast('Adhoc activity logged!', 'success');
      } catch (dbErr) {
        console.warn("DB save failed, falling back to LocalStorage:", dbErr.message);

        // Save log locally
        const localLogsRaw = localStorage.getItem('jzv_syllabus_tracker_logs') || '[]';
        let localLogs = [];
        try { localLogs = JSON.parse(localLogsRaw); } catch (e) {}

        const newLogId = 'local-log-' + Math.random().toString(36).substr(2, 9);
        localLogs.unshift({
          id: newLogId,
          date: logDate,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          teacher_id: teacher?.id || 'local-teacher',
          syllabus_tracker_log_items: [{
            id: 'local-log-item-' + Math.random().toString(36).substr(2, 9),
            log_id: newLogId,
            item_type: 'adhoc',
            item_id: null,
            adhoc_name: adhocName.trim(),
            status: 'completed'
          }]
        });
        localStorage.setItem('jzv_syllabus_tracker_logs', JSON.stringify(localLogs));

        showToast('Adhoc activity logged locally!', 'success');
      }

      setAdhocName('');
      fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && classes.length === 0) {
    return (
      <div className="p-8 text-center bg-light-bg min-h-screen flex items-center justify-center font-bold text-dark-primary">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mr-3"></div>
        Loading Tracker...
      </div>
    );
  }

  const activeBook = filteredBooks.find(b => String(b.id) === String(selectedBookId));
  const bookData = syllabusData.filter(d => String(d.book_id) === String(selectedBookId));

  const renderCurriculum = () => {
    if (activeClasses.length === 0) {
      return (
        <div className="p-8 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          No allocated classes found. Enable "Cover for Absent Teacher" above to log progress for other classes.
        </div>
      );
    }
    if (!activeBook) {
      return (
        <div className="p-4 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          No syllabus book selected.
        </div>
      );
    }

    const level1Groups = [...new Set(bookData.map(n => n.level1))].filter(Boolean);

    const bookProgress = progressList.find(p => p.item_type === 'book' && String(p.item_id) === String(selectedBookId));
    const bookStatus = bookProgress?.status || '0%';
    const bookRevisionCount = bookProgress?.revision_count || 0;
    const bookDays = getBookDays();

    const allBookNodeIds = bookData.map(n => n.id);
    const isAllBookChecked = allBookNodeIds.length > 0 && allBookNodeIds.every(id => selectedNodes.includes(id));

    return (
      <div className="space-y-6">
        {/* Book Level progress & revision logging & checkbox root */}
        <div className="bg-white p-4 border rounded-2xl shadow-sm flex items-center justify-between bg-gradient-to-r from-purple-50/70 to-indigo-50/70 border-purple-100/80">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isAllBookChecked}
              onChange={(e) => handleSelectBook(e.target.checked)}
              className="w-4.5 h-4.5 rounded text-purple-600 border-purple-300 focus:ring-purple-500 cursor-pointer"
            />
            <div>
              <h4 className="text-sm font-black text-purple-900">{activeBook.name}</h4>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-purple-700 mt-1 flex-wrap">
                <span>Revisions: <strong className="font-black text-purple-900">{bookRevisionCount}</strong></span>
                <span className="text-purple-300">|</span>
                <span>Days Taken: <strong className="font-black text-purple-900">{bookDays} day(s)</strong></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={bookStatus === 'completed' ? '100%' : (bookStatus === 'not_started' ? '0%' : bookStatus)}
              disabled={submitting}
              onChange={(e) => handleStatusUpdateParent('book', selectedBookId, e.target.value, `Book: ${activeBook.name}`)}
              className="border border-purple-200 px-2 py-1 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-purple-400 bg-white text-purple-955 cursor-pointer"
            >
              <option value="0%">0% (Not Started)</option>
              <option value="10%">10%</option>
              <option value="25%">25%</option>
              <option value="50%">50%</option>
              <option value="75%">75%</option>
              <option value="90%">90%</option>
              <option value="100%">100% (Completed)</option>
            </select>
            <button
              onClick={() => handleIncrementRevision('book', selectedBookId, `Book: ${activeBook.name}`)}
              disabled={submitting}
              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <i className="fas fa-redo"></i> Revise Book
            </button>
          </div>
        </div>

        {/* Accordion Units & Sections */}
        <div className="space-y-4">
          {level1Groups.map(level1Name => {
            const level1Nodes = bookData.filter(n => n.level1 === level1Name);
            const level1Id = level1Nodes[0]?.id;
            const level1Progress = progressList.find(p => p.item_type === 'level1' && String(p.item_id) === String(level1Id));
            const level1Status = level1Progress?.status || '0%';
            const level1RevisionCount = level1Progress?.revision_count || 0;
            const level1Days = getLevel1Days(level1Name);

            const isLvl1Expanded = !!expandedLvl1[level1Name];
            const level2Groups = [...new Set(level1Nodes.map(n => n.level2 || 'General'))];

            const allLvl1NodeIds = level1Nodes.map(n => n.id);
            const isAllLvl1Checked = allLvl1NodeIds.every(id => selectedNodes.includes(id));

            return (
              <div key={level1Name} className="bg-white border border-light-border rounded-2xl shadow-sm overflow-hidden">
                {/* Level 1 Accordion Header */}
                <div className="flex items-center justify-between p-4 bg-gray-50/50 border-b border-light-border select-none">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isAllLvl1Checked && allLvl1NodeIds.length > 0}
                      onChange={(e) => handleSelectLvl1(level1Name, e.target.checked)}
                      className="w-4 h-4 rounded text-brand-primary border-light-border focus:ring-brand-primary cursor-pointer"
                    />
                    <div className="cursor-pointer" onClick={() => toggleLvl1(level1Name)}>
                      <h3 className="text-sm font-bold text-dark-primary flex items-center gap-2">
                        {level1Name}
                        <i className={`fas fa-chevron-${isLvl1Expanded ? 'down' : 'right'} text-xs text-gray-400`}></i>
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          Days: {level1Days} day(s)
                        </span>
                        {level1RevisionCount > 0 && (
                          <span className="text-[9px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            Revised {level1RevisionCount}x
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={level1Status === 'completed' ? '100%' : (level1Status === 'not_started' ? '0%' : level1Status)}
                      disabled={submitting}
                      onChange={(e) => handleStatusUpdateParent('level1', level1Id, e.target.value, `Unit: ${level1Name}`)}
                      className="border border-gray-200 px-2 py-0.5 rounded-md text-[10px] font-bold outline-none focus:ring-1 focus:ring-brand-primary bg-white text-dark-primary cursor-pointer"
                    >
                      <option value="0%">0% (Not Started)</option>
                      <option value="10%">10%</option>
                      <option value="25%">25%</option>
                      <option value="50%">50%</option>
                      <option value="75%">75%</option>
                      <option value="90%">90%</option>
                      <option value="100%">100% (Completed)</option>
                    </select>
                    <button
                      onClick={() => handleIncrementRevision('level1', level1Id, `Unit: ${level1Name}`)}
                      disabled={submitting}
                      className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-xs font-black border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <i className="fas fa-redo text-[10px]"></i> Revise Unit
                    </button>
                  </div>
                </div>

                {/* Level 2 Accordions */}
                {isLvl1Expanded && (
                  <div className="p-4 space-y-4 bg-white pl-6">
                    {level2Groups.map(level2Name => {
                      const level2Nodes = level1Nodes.filter(n => (n.level2 || 'General') === level2Name);
                      const level2Id = level2Nodes[0]?.id;
                      const level2Progress = progressList.find(p => p.item_type === 'level2' && String(p.item_id) === String(level2Id));
                      const level2Status = level2Progress?.status || '0%';
                      const level2RevisionCount = level2Progress?.revision_count || 0;
                      const level2Days = getLevel2Days(level1Name, level2Name);

                      const lvl2Key = `${level1Name}-${level2Name}`;
                      const isLvl2Expanded = !!expandedLvl2[lvl2Key];

                      const allLvl2NodeIds = level2Nodes.map(n => n.id);
                      const isAllLvl2Checked = allLvl2NodeIds.every(id => selectedNodes.includes(id));

                      return (
                        <div key={level2Name} className="border border-gray-150 rounded-xl overflow-hidden shadow-sm">
                          {/* Level 2 Accordion Header */}
                          <div className="flex items-center justify-between p-3.5 bg-gray-50/30 border-b border-gray-150 select-none">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isAllLvl2Checked && allLvl2NodeIds.length > 0}
                                onChange={(e) => handleSelectLvl2(level1Name, level2Name, e.target.checked)}
                                className="w-4 h-4 rounded text-brand-primary border-light-border focus:ring-brand-primary cursor-pointer"
                              />
                              <div className="cursor-pointer" onClick={() => toggleLvl2(lvl2Key)}>
                                <h4 className="text-xs font-bold text-dark-soft flex items-center gap-2">
                                  {level2Name}
                                  <i className={`fas fa-chevron-${isLvl2Expanded ? 'down' : 'right'} text-[10px] text-gray-400`}></i>
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                                    Days: {level2Days} day(s)
                                  </span>
                                  {level2RevisionCount > 0 && (
                                    <span className="text-[9px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                                      Revised {level2RevisionCount}x
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={level2Status === 'completed' ? '100%' : (level2Status === 'not_started' ? '0%' : level2Status)}
                                disabled={submitting}
                                onChange={(e) => handleStatusUpdateParent('level2', level2Id, e.target.value, `Section: ${level2Name}`)}
                                className="border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold outline-none focus:ring-1 focus:ring-brand-primary bg-white text-dark-primary cursor-pointer"
                              >
                                <option value="0%">0% (Not Started)</option>
                                <option value="10%">10%</option>
                                <option value="25%">25%</option>
                                <option value="50%">50%</option>
                                <option value="75%">75%</option>
                                <option value="90%">90%</option>
                                <option value="100%">100% (Completed)</option>
                              </select>
                              <button
                                onClick={() => handleIncrementRevision('level2', level2Id, `Section: ${level2Name}`)}
                                disabled={submitting}
                                className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[10px] font-black border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <i className="fas fa-redo text-[9px]"></i> Revise Section
                              </button>
                            </div>
                          </div>

                          {/* Level 3 Node List */}
                          {isLvl2Expanded && (
                            <div className="p-3 bg-white space-y-2.5 pl-6">
                              {level2Nodes.map(node => {
                                const progress = getNodeProgress(node.id);
                                const status = progress?.status || '0%';
                                const nodeRevisionCount = progress?.revision_count || 0;
                                const title = node.level3 || 'Lesson Details';
                                const nodeDays = getNodeDays(node.id);

                                return (
                                  <div key={node.id} className="flex justify-between items-center p-3 bg-gray-50/50 border rounded-xl hover:border-brand-primary/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="checkbox"
                                        checked={selectedNodes.includes(node.id)}
                                        onChange={() => handleSelectNode(node.id)}
                                        className="w-4 h-4 rounded text-brand-primary border-light-border focus:ring-brand-primary cursor-pointer"
                                      />
                                      <div>
                                        <p className="text-xs font-bold text-dark-primary">{title}</p>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            status === '100%' || status === 'completed'
                                              ? 'bg-emerald-100 text-emerald-700'
                                              : status === '0%' || status === 'not_started'
                                              ? 'bg-gray-100 text-gray-500'
                                              : 'bg-blue-100 text-blue-700'
                                          }`}>
                                            {status === 'completed' || status === '100%' ? 'Completed (100%)' : status === 'not_started' || status === '0%' ? 'Not Started (0%)' : `In Progress (${status})`}
                                          </span>
                                          <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                            Days: {nodeDays} day(s)
                                          </span>
                                          {nodeRevisionCount > 0 && (
                                            <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                              Revised {nodeRevisionCount}x
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={status === 'completed' ? '100%' : (status === 'not_started' ? '0%' : status)}
                                        disabled={submitting}
                                        onChange={(e) => handleStatusUpdate(node.id, e.target.value)}
                                        className="border border-gray-200 px-2 py-1 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-brand-primary bg-white text-dark-primary cursor-pointer"
                                      >
                                        <option value="0%">0% (Not Started)</option>
                                        <option value="10%">10%</option>
                                        <option value="25%">25%</option>
                                        <option value="50%">50%</option>
                                        <option value="75%">75%</option>
                                        <option value="90%">90%</option>
                                        <option value="100%">100% (Completed)</option>
                                      </select>
                                      <button
                                        onClick={() => handleIncrementRevision('node', node.id, `Lesson: ${title}`)}
                                        disabled={submitting}
                                        title="Log Topic Revision"
                                        className="px-2 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold border border-purple-200 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
                                      >
                                        <i className="fas fa-redo"></i>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Action Bar for Bulk Updates */}
        {selectedNodes.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/95 text-white py-3.5 px-6 rounded-2xl shadow-xl flex items-center gap-4 z-40 border border-white/10 backdrop-blur-md animate-in slide-in-from-bottom-8 duration-200">
            <span className="text-xs font-black text-white shrink-0">
              Selected: <strong className="text-brand-primary">{selectedNodes.length}</strong> topic(s)
            </span>
            <div className="w-px h-6 bg-white/20"></div>
            <div className="flex items-center gap-2.5">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusUpdate(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-white/10 hover:bg-white/15 border border-white/20 px-2 py-1.5 rounded-xl text-xs font-bold outline-none cursor-pointer text-white [&>option]:text-gray-900"
              >
                <option value="">Set Progress...</option>
                <option value="0%">0% (Not Started)</option>
                <option value="10%">10%</option>
                <option value="25%">25%</option>
                <option value="50%">50%</option>
                <option value="75%">75%</option>
                <option value="90%">90%</option>
                <option value="100%">100% (Completed)</option>
              </select>
              <button
                onClick={handleBulkIncrementRevision}
                disabled={submitting}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <i className="fas fa-redo"></i> Bulk Revise
              </button>
              <button
                onClick={() => setSelectedNodes([])}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-light-bg font-sans">
      <div className="bg-white border-b p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <h1 className="text-2xl font-black flex items-center gap-2">
            Syllabus Tracker
            {loading && <i className="fas fa-spinner fa-spin text-brand-primary text-sm"></i>}
          </h1>
          <label className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-xl cursor-pointer text-xs font-bold text-brand-primary select-none hover:bg-brand-primary/15 transition-colors">
            <input
              type="checkbox"
              checked={coverMode}
              onChange={(e) => setCoverMode(e.target.checked)}
              className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
            />
            Cover for Absent Teacher (Show all classes/subjects)
          </label>
        </div>

        {activeClasses.length > 0 ? (
          <div className="flex gap-4">
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary">
              {activeClasses.map(c => <option key={c.id} value={c.id}>{c.name || c.class_name}</option>)}
            </select>
            <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary">
              {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={selectedBookId} onChange={e => setSelectedBookId(e.target.value)} className="border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary">
              {filteredBooks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
        ) : (
          <p className="text-xs font-bold text-red-500">No classes assigned. Enable "Cover for Absent Teacher" above to select a class.</p>
        )}
      </div>

      <div className="p-6 overflow-y-auto pb-24">
        <div className="flex gap-4 border-b mb-6 pb-2">
          {['curriculum', 'adhoc', 'history'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === tab ? 'bg-brand-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'curriculum' && renderCurriculum()}

        {activeTab === 'adhoc' && (
          <form onSubmit={handleAdhocSubmit} className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="font-bold mb-4">Log Adhoc Activity</h2>
            <input type="text" value={adhocName} onChange={e => setAdhocName(e.target.value)} placeholder="Activity description..." className="border p-2 w-full rounded-lg mb-4" required />
            <button disabled={submitting} type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-lg font-bold">Submit</button>
          </form>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyLogs.map(log => (
              <div key={log.id} className="bg-white p-4 border rounded-xl">
                <p className="font-bold text-sm text-gray-500 mb-2">{new Date(log.date).toLocaleDateString()}</p>
                {log.syllabus_tracker_log_items.map(item => (
                  <div key={item.id} className="text-sm p-2 border-l-2 border-brand-primary bg-gray-50 mb-2">
                    <span className="font-bold mr-2 uppercase text-[10px] bg-gray-200 px-2 rounded">{item.item_type}</span>
                    {item.item_type === 'adhoc' || item.item_type === 'book' || item.item_type === 'level1' || item.item_type === 'level2'
                      ? item.adhoc_name
                      : (syllabusData.find(d => String(d.id) === String(item.item_id))?.level3 || 'Unknown Node')}
                    <span className="ml-2 text-blue-600">[{item.status}]</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SyllabusTracker;
