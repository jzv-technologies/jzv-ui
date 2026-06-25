// src/components/portals/teacher/SyllabusTracker.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';

const SyllabusTracker = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teacher, setTeacher] = useState(null);

  // Lists
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [books, setBooks] = useState([]);
  const [units, setUnits] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);

  // Selections
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');

  // Live progress states
  const [progressList, setProgressList] = useState([]);

  // Form states
  const [activeTab, setActiveTab] = useState('curriculum'); // 'curriculum' | 'revision' | 'adhoc' | 'history'
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Tab: Curriculum Node Log state
  const [selectedNodeToUpdate, setSelectedNodeToUpdate] = useState(null); // { type, id, name }
  const [updateStatus, setUpdateStatus] = useState('in_progress'); // 'in_progress' | 'completed'

  // Tab: Revision state
  const [revisionSelections, setRevisionSelections] = useState({}); // key: 'type-id' -> boolean

  // Tab: Adhoc state
  const [adhocName, setAdhocName] = useState('');

  // History logs
  const [historyLogs, setHistoryLogs] = useState([]);

  // Load teacher profile, assignments, and base data
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        if (!user || !user.id) {
          throw new Error('User session not found.');
        }

        // 1. Fetch teacher linked to auth_id
        const { data: teacherData, error: teachErr } = await supabase
          .from('teachers')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (teachErr) throw teachErr;
        if (!teacherData) {
          throw new Error('This user is not mapped to any Teacher record in the database.');
        }
        setTeacher(teacherData);

        // 2. Fetch all metadata in parallel
        const [
          { data: dbClasses },
          { data: dbSubjects },
          { data: dbAssignments },
          { data: dbBooks },
          { data: dbUnits },
          { data: dbChapters },
          { data: dbLessons }
        ] = await Promise.all([
          supabase.from('classes').select('*'),
          supabase.from('subjects').select('*'),
          supabase.from('class_assignments').select('*').eq('teacher_id', teacherData.id),
          supabase.from('syllabus_books').select('*'),
          supabase.from('syllabus_units').select('*'),
          supabase.from('syllabus_chapters').select('*'),
          supabase.from('syllabus_lessons').select('*')
        ]);

        setClasses(dbClasses || []);
        setSubjects(dbSubjects || []);
        setAssignments(dbAssignments || []);
        setBooks(dbBooks || []);
        setUnits(dbUnits || []);
        setChapters(dbChapters || []);
        setLessons(dbLessons || []);

        // Filter and auto-select class
        const assignedClassIds = (dbAssignments || []).map(a => String(a.class_id));
        const filteredClasses = (dbClasses || []).filter(c => assignedClassIds.includes(String(c.id)));
        if (filteredClasses.length > 0) {
          setSelectedClassId(String(filteredClasses[0].id));
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [user]);

  // Handle class change -> filter subjects assigned to this teacher in this class
  const filteredSubjects = subjects.filter(s => {
    return assignments.some(
      a => String(a.class_id) === String(selectedClassId) && String(a.subject_id) === String(s.id)
    );
  });

  // Auto-select subject when class or subjects change
  useEffect(() => {
    if (filteredSubjects.length > 0) {
      // Keep selected if still valid, else select first
      const exists = filteredSubjects.some(s => String(s.id) === String(selectedSubjectId));
      if (!exists) {
        setSelectedSubjectId(String(filteredSubjects[0].id));
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedClassId, assignments]);

  // Filter books based on subject select
  const filteredBooks = books.filter(b => String(b.subject_id) === String(selectedSubjectId));

  // Auto-select book when subject or books change
  useEffect(() => {
    if (filteredBooks.length > 0) {
      setSelectedBookId(String(filteredBooks[0].id));
    } else {
      setSelectedBookId('');
    }
  }, [selectedSubjectId]);

  // Fetch node progress whenever class or book changes
  const fetchProgress = async () => {
    if (!selectedClassId) return;
    try {
      const { data, error } = await supabase
        .from('syllabus_node_progress')
        .select('*')
        .eq('class_id', selectedClassId);
      if (error) throw error;
      setProgressList(data || []);
    } catch (err) {
      console.error('Error fetching progress:', err.message);
    }
  };

  // Fetch log history
  const fetchHistory = async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    try {
      const { data, error } = await supabase
        .from('syllabus_tracker_logs')
        .select(`
          id,
          date,
          syllabus_tracker_log_items (
            id,
            item_type,
            item_id,
            adhoc_name,
            status
          )
        `)
        .eq('class_id', selectedClassId)
        .eq('subject_id', selectedSubjectId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs history:', err.message);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchProgress();
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      fetchHistory();
    }
  }, [selectedClassId, selectedSubjectId]);

  // Helper: Get progress for a specific node
  const getNodeProgress = (type, id) => {
    return progressList.find(p => p.item_type === type && String(p.item_id) === String(id));
  };

  // Tree Helper: Rollup progress of parent nodes dynamically
  // Returns { status: 'not_started'|'in_progress'|'completed', completedCount, totalCount }
  const calculateParentProgress = (nodeType, nodeId, bookHierarchy) => {
    const isChapter = nodeType === 'chapter';
    const isUnit = nodeType === 'unit';

    let descendants = [];

    if (isChapter) {
      const hasLessons = bookHierarchy !== 'Book > Unit > Chapter';
      if (hasLessons) {
        descendants = lessons.filter(l => String(l.chapter_id) === String(nodeId)).map(l => ({ type: 'lesson', id: l.id }));
      } else {
        // Chapter itself is the lowest level
        const p = getNodeProgress('chapter', nodeId);
        return {
          status: p?.status || 'not_started',
          completedCount: p?.status === 'completed' ? 1 : 0,
          totalCount: 1
        };
      }
    }

    if (isUnit) {
      const hasChapters = bookHierarchy.includes('Chapter');
      const hasLessons = bookHierarchy.includes('Lesson');

      if (hasChapters) {
        const unitChaps = chapters.filter(c => String(c.unit_id) === String(nodeId));
        if (hasLessons) {
          // Descendants are lessons under all chapters of this unit
          const chapIds = unitChaps.map(c => String(c.id));
          descendants = lessons.filter(l => chapIds.includes(String(l.chapter_id))).map(l => ({ type: 'lesson', id: l.id }));
        } else {
          // Descendants are chapters
          descendants = unitChaps.map(c => ({ type: 'chapter', id: c.id }));
        }
      } else if (hasLessons) {
        // Direct Unit > Lesson
        descendants = lessons.filter(l => String(l.unit_id) === String(nodeId)).map(l => ({ type: 'lesson', id: l.id }));
      }
    }

    if (descendants.length === 0) {
      return { status: 'not_started', completedCount: 0, totalCount: 0 };
    }

    let completed = 0;
    let inProgress = 0;

    descendants.forEach(d => {
      const p = getNodeProgress(d.type, d.id);
      if (p?.status === 'completed') {
        completed++;
      } else if (p?.status === 'in_progress') {
        inProgress++;
      }
    });

    if (completed === descendants.length) {
      return { status: 'completed', completedCount: completed, totalCount: descendants.length };
    }
    if (completed > 0 || inProgress > 0) {
      return { status: 'in_progress', completedCount: completed, totalCount: descendants.length };
    }
    return { status: 'not_started', completedCount: 0, totalCount: descendants.length };
  };

  // Submit Handler for Daily Progress (Curriculum Node update)
  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClassId || !selectedSubjectId || !selectedNodeToUpdate) {
      showToast('Please select a class, subject, and syllabus item to update.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Daily Log entry
      const { data: logData, error: logErr } = await supabase
        .from('syllabus_tracker_logs')
        .insert([{
          date: logDate,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          teacher_id: teacher.id
        }])
        .select();

      if (logErr) throw logErr;
      const logId = logData[0].id;

      // 2. Create Log Item
      const { error: itemErr } = await supabase
        .from('syllabus_tracker_log_items')
        .insert([{
          log_id: logId,
          item_type: selectedNodeToUpdate.type,
          item_id: selectedNodeToUpdate.id,
          status: updateStatus
        }]);

      if (itemErr) throw itemErr;

      // 3. Upsert Status in syllabus_node_progress
      const { data: existingProgress, error: progFetchErr } = await supabase
        .from('syllabus_node_progress')
        .select('*')
        .eq('class_id', selectedClassId)
        .eq('item_type', selectedNodeToUpdate.type)
        .eq('item_id', selectedNodeToUpdate.id)
        .maybeSingle();

      if (progFetchErr) throw progFetchErr;

      if (!existingProgress) {
        const { error: insertErr } = await supabase
          .from('syllabus_node_progress')
          .insert([{
            class_id: selectedClassId,
            item_type: selectedNodeToUpdate.type,
            item_id: selectedNodeToUpdate.id,
            status: updateStatus,
            days_spent: 1,
            first_worked_at: logDate,
            completed_at: updateStatus === 'completed' ? logDate : null
          }]);
        if (insertErr) throw insertErr;
      } else {
        const updates = {
          status: updateStatus,
          days_spent: (existingProgress.days_spent || 0) + 1,
          updated_at: new Date().toISOString()
        };
        if (updateStatus === 'completed' && !existingProgress.completed_at) {
          updates.completed_at = logDate;
        }
        const { error: updateErr } = await supabase
          .from('syllabus_node_progress')
          .update(updates)
          .eq('id', existingProgress.id);
        if (updateErr) throw updateErr;
      }

      showToast('Daily syllabus progress logged successfully!', 'success');
      setSelectedNodeToUpdate(null);
      
      // Refresh local states
      await fetchProgress();
      await fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Handler for Revisions (Multiple items)
  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    const selectedKeys = Object.keys(revisionSelections).filter(k => revisionSelections[k]);
    if (selectedKeys.length === 0) {
      showToast('Please check at least one completed item to submit revision.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Log Entry
      const { data: logData, error: logErr } = await supabase
        .from('syllabus_tracker_logs')
        .insert([{
          date: logDate,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          teacher_id: teacher.id
        }])
        .select();

      if (logErr) throw logErr;
      const logId = logData[0].id;

      // 2. Loop and log revision items
      for (const key of selectedKeys) {
        const [itemType, itemId] = key.split('-');
        
        // Log Item Entry
        const { error: itemErr } = await supabase
          .from('syllabus_tracker_log_items')
          .insert([{
            log_id: logId,
            item_type: itemType,
            item_id: itemId,
            status: 'revision'
          }]);
        if (itemErr) throw itemErr;

        // Upsert Progress revision_count
        const { data: existingProgress, error: progFetchErr } = await supabase
          .from('syllabus_node_progress')
          .select('*')
          .eq('class_id', selectedClassId)
          .eq('item_type', itemType)
          .eq('item_id', itemId)
          .maybeSingle();

        if (progFetchErr) throw progFetchErr;

        if (!existingProgress) {
          // If a rolled-up node doesn't have a record yet, create it as completed
          const { error: insertErr } = await supabase
            .from('syllabus_node_progress')
            .insert([{
              class_id: selectedClassId,
              item_type: itemType,
              item_id: itemId,
              status: 'completed',
              revision_count: 1,
              first_worked_at: logDate,
              completed_at: logDate
            }]);
          if (insertErr) throw insertErr;
        } else {
          const { error: updateErr } = await supabase
            .from('syllabus_node_progress')
            .update({
              revision_count: (existingProgress.revision_count || 0) + 1,
              status: 'completed', // force completed
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProgress.id);
          if (updateErr) throw updateErr;
        }
      }

      showToast(`Logged revision for ${selectedKeys.length} items successfully!`, 'success');
      setRevisionSelections({});
      
      // Refresh
      await fetchProgress();
      await fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Handler for Adhoc Activity
  const handleAdhocSubmit = async (e) => {
    e.preventDefault();
    if (!adhocName.trim()) {
      showToast('Please type in a description for the Adhoc Activity.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Log
      const { data: logData, error: logErr } = await supabase
        .from('syllabus_tracker_logs')
        .insert([{
          date: logDate,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          teacher_id: teacher.id
        }])
        .select();

      if (logErr) throw logErr;
      const logId = logData[0].id;

      // 2. Create Log Item
      const { error: itemErr } = await supabase
        .from('syllabus_tracker_log_items')
        .insert([{
          log_id: logId,
          item_type: 'adhoc',
          item_id: null,
          adhoc_name: adhocName.trim(),
          status: 'completed'
        }]);

      if (itemErr) throw itemErr;

      showToast('Adhoc activity logged successfully!', 'success');
      setAdhocName('');
      
      // Refresh
      await fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-dark-muted font-semibold text-sm">Loading Daily Tracker dashboard...</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-light-border p-8 text-center max-w-lg mx-auto shadow-sm my-8">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h4 className="text-lg font-bold text-dark-deepblue mb-2">No Class Assignments</h4>
        <p className="text-xs text-dark-soft leading-relaxed">
          You are currently not assigned to teach any subjects/classes in the timetable scheduler. Please contact the administrator to setup your class assignments.
        </p>
      </div>
    );
  }

  // Active book context
  const activeBook = filteredBooks[0];
  const hierarchy = activeBook?.hierarchy_type || 'Book > Unit > Chapter > Lesson';
  const hasUnits = hierarchy.includes('Unit');
  const hasChapters = hierarchy.includes('Chapter');
  const hasLessons = hierarchy.includes('Lesson');

  // Compute lowest level node type
  const lowestLevelType = hasLessons ? 'lesson' : 'chapter';

  // Render a specific node row in the tree view (Tab 1: Progress Logging)
  const renderProgressNodeRow = (type, id, name, parentStatus) => {
    const isLowest = type === lowestLevelType;
    const progress = isLowest ? getNodeProgress(type, id) : calculateParentProgress(type, id, hierarchy);
    const status = progress.status;

    let badgeClass = 'bg-light-bg text-dark-soft';
    let label = 'Not Started';

    if (status === 'completed') {
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
      label = 'Completed';
    } else if (status === 'in_progress') {
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-100';
      label = 'In Progress';
    }

    return (
      <div className="flex items-center justify-between p-3 rounded-2xl border border-light-border/40 bg-white hover:shadow-sm transition-all gap-4 animate-in fade-in duration-200">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${
            status === 'completed' ? 'bg-emerald-500' : status === 'in_progress' ? 'bg-blue-500' : 'bg-dark-muted'
          }`} />
          <div>
            <span className="text-xs font-bold text-dark-primary">{name}</span>
            {!isLowest && progress.totalCount > 0 && (
              <span className="text-[10px] text-dark-soft block font-semibold mt-0.5">
                {progress.completedCount} / {progress.totalCount} completed ({Math.round((progress.completedCount / progress.totalCount) * 100)}%)
              </span>
            )}
            {isLowest && progress?.days_spent > 0 && (
              <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                <i className="fas fa-history mr-1"></i>{progress.days_spent} daily logs logged
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeClass}`}>
            {label}
          </span>

          {isLowest && status !== 'completed' && (
            <button
              type="button"
              onClick={() => {
                setSelectedNodeToUpdate({ type, id, name });
                setUpdateStatus(status === 'in_progress' ? 'completed' : 'in_progress');
              }}
              className="bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white px-3 py-1 rounded-xl text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {status === 'in_progress' ? 'Complete' : 'Start'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render a specific node row in the Revision list (Tab 2: Revision selection)
  const renderRevisionNodeRow = (type, id, name) => {
    // Check rollup status to ensure it's completed
    const isLowest = type === lowestLevelType;
    const progress = isLowest ? getNodeProgress(type, id) : calculateParentProgress(type, id, hierarchy);
    const isCompleted = progress.status === 'completed';

    const key = `${type}-${id}`;
    const isChecked = !!revisionSelections[key];

    if (!isCompleted) return null; // Only completed items are eligible for revision

    return (
      <label key={key} className="flex items-center justify-between p-3 rounded-2xl border border-light-border/40 bg-white hover:bg-emerald-50/10 cursor-pointer select-none transition-all gap-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              setRevisionSelections(prev => ({
                ...prev,
                [key]: e.target.checked
              }));
            }}
            className="w-4 h-4 text-emerald-600 bg-white border border-light-border rounded focus:ring-emerald-500"
          />
          <div>
            <span className="text-xs font-bold text-dark-primary">{name}</span>
            <span className="text-[9px] text-dark-soft uppercase block tracking-wider font-extrabold mt-0.5">
              {type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getNodeProgress(type, id)?.revision_count > 0 && (
            <span className="bg-emerald-50 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-100">
              {getNodeProgress(type, id).revision_count} Revisions
            </span>
          )}
        </div>
      </label>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-3xl border border-light-border p-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center flex-1">
          {/* Class Select */}
          <div className="w-full sm:w-48">
            <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1.5">Select Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedNodeToUpdate(null);
              }}
              className="w-full bg-light-bg/20 border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
            >
              {classes
                .filter(c => assignments.some(a => String(a.class_id) === String(c.id)))
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
              }
            </select>
          </div>

          {/* Subject Select */}
          <div className="w-full sm:w-48">
            <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1.5">Select Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedNodeToUpdate(null);
              }}
              className="w-full bg-light-bg/20 border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
            >
              {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Date Picker */}
          <div className="w-full sm:w-44">
            <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1.5">Log Date</label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full bg-light-bg/20 border border-light-border rounded-xl px-3 py-1.5 text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </div>
        </div>

        {/* Current Active Book Details */}
        {activeBook ? (
          <div className="text-right">
            <span className="text-[10px] font-bold text-dark-soft block uppercase tracking-wider">Active Book</span>
            <span className="text-sm font-extrabold text-dark-primary">{activeBook.name}</span>
            <span className="text-[9px] text-brand-primary block font-bold mt-0.5">{hierarchy}</span>
          </div>
        ) : (
          <div className="text-red-primary font-bold text-xs">No active syllabus book found for this subject.</div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-light-border gap-2">
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`px-5 py-2.5 text-xs font-extrabold transition-all border-b-2 outline-none ${
            activeTab === 'curriculum'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-dark-soft hover:text-dark-primary'
          }`}
        >
          <i className="fas fa-list-check mr-2"></i>Curriculum Progress
        </button>
        <button
          onClick={() => setActiveTab('revision')}
          className={`px-5 py-2.5 text-xs font-extrabold transition-all border-b-2 outline-none ${
            activeTab === 'revision'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-dark-soft hover:text-dark-primary'
          }`}
        >
          <i className="fas fa-redo-alt mr-2"></i>Revision Session
        </button>
        <button
          onClick={() => setActiveTab('adhoc')}
          className={`px-5 py-2.5 text-xs font-extrabold transition-all border-b-2 outline-none ${
            activeTab === 'adhoc'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-dark-soft hover:text-dark-primary'
          }`}
        >
          <i className="fas fa-puzzle-piece mr-2"></i>Adhoc - Activity
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2.5 text-xs font-extrabold transition-all border-b-2 outline-none ${
            activeTab === 'history'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-dark-soft hover:text-dark-primary'
          }`}
        >
          <i className="fas fa-clock-rotate-left mr-2"></i>Submission History
        </button>
      </div>

      {/* Main Tab Panels */}
      {activeTab === 'curriculum' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tree View (Left/Center 2 cols) */}
          <div className="lg:col-span-2 bg-light-bg/10 rounded-3xl border border-light-border p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider mb-2">Curriculum Tree Status</h4>
            
            {activeBook ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Render Unit level if hasUnits */}
                {hasUnits ? (
                  units.filter(u => String(u.book_id) === String(selectedBookId)).map(unit => {
                    const progress = calculateParentProgress('unit', unit.id, hierarchy);
                    return (
                      <div key={unit.id} className="border border-light-border/40 rounded-2xl bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-light-border/40 pb-2">
                          <span className="text-xs font-extrabold text-brand-primary">Unit: {unit.name}</span>
                          <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-2.5 py-0.5 rounded-full font-extrabold">
                            {progress.completedCount}/{progress.totalCount} Complete
                          </span>
                        </div>

                        {/* Chapters under Unit */}
                        {hasChapters ? (
                          <div className="pl-4 border-l border-dashed border-light-border/60 space-y-3">
                            {chapters.filter(c => String(c.unit_id) === String(unit.id)).map(chap => {
                              const chapProgress = calculateParentProgress('chapter', chap.id, hierarchy);
                              return (
                                <div key={chap.id} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-dark-primary">Chapter: {chap.name}</span>
                                    {hasLessons && (
                                      <span className="text-[9px] bg-light-bg text-dark-muted px-2 py-0.5 rounded-full font-bold">
                                        {chapProgress.completedCount}/{chapProgress.totalCount} Lessons
                                      </span>
                                    )}
                                  </div>

                                  {/* Lessons under Chapter */}
                                  {hasLessons ? (
                                    <div className="pl-4 space-y-2">
                                      {lessons.filter(l => String(l.chapter_id) === String(chap.id)).map(less => (
                                        <div key={less.id}>
                                          {renderProgressNodeRow('lesson', less.id, less.name)}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    // No lessons: Render chapter as progress row
                                    <div className="pl-2">
                                      {renderProgressNodeRow('chapter', chap.id, chap.name)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Direct Unit > Lesson
                          <div className="pl-4 space-y-2">
                            {lessons.filter(l => String(l.unit_id) === String(unit.id)).map(less => (
                              <div key={less.id}>
                                {renderProgressNodeRow('lesson', less.id, less.name)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Direct Chapters under Book
                  chapters.filter(c => String(c.book_id) === String(selectedBookId)).map(chap => (
                    <div key={chap.id} className="border border-light-border/40 rounded-2xl bg-white p-4 space-y-3">
                      <span className="text-xs font-extrabold text-brand-primary">Chapter: {chap.name}</span>
                      <div className="pl-4 space-y-2">
                        {lessons.filter(l => String(l.chapter_id) === String(chap.id)).map(less => (
                          <div key={less.id}>
                            {renderProgressNodeRow('lesson', less.id, less.name)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-dark-muted font-semibold text-xs">No active syllabus to display.</div>
            )}
          </div>

          {/* Submission Panel (Right 1 col) */}
          <div className="bg-white rounded-3xl border border-light-border p-6 shadow-sm h-fit">
            <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider mb-4">Log Daily Progress</h4>
            
            {selectedNodeToUpdate ? (
              <form onSubmit={handleProgressSubmit} className="space-y-4">
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase block tracking-wider mb-1">
                    Selected Node ({selectedNodeToUpdate.type})
                  </span>
                  <span className="text-xs font-extrabold text-dark-primary block">{selectedNodeToUpdate.name}</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-dark-soft uppercase mb-2">Update Status To</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUpdateStatus('in_progress')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        updateStatus === 'in_progress'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-dark-soft border-light-border hover:bg-light-bg'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpdateStatus('completed')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        updateStatus === 'completed'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-dark-soft border-light-border hover:bg-light-bg'
                      }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNodeToUpdate(null)}
                    className="flex-1 bg-light-ui hover:bg-light-border text-dark-soft py-2.5 rounded-xl text-xs font-bold transition-all outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-brand-primary hover:bg-brand-dark text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm outline-none flex items-center justify-center gap-1.5"
                  >
                    {submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                    Submit Log
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-12 text-dark-muted font-semibold text-xs border border-dashed border-light-border rounded-2xl">
                Click "Start" or "Complete" on any lesson/chapter to construct a daily log.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'revision' && (
        <form onSubmit={handleRevisionSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Completed checklist (Left/Center 2 cols) */}
          <div className="lg:col-span-2 bg-light-bg/10 rounded-3xl border border-light-border p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider">Completed Curriculum Nodes</h4>
                <p className="text-[10px] text-dark-soft mt-0.5">Only items marked as completed can be submitted for revision.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  // Toggle check-all
                  const allKeys = {};
                  // Find all completed items
                  const hasCompletedUnits = hasUnits;
                  const hasCompletedChapters = hasChapters;
                  
                  if (hasCompletedUnits) {
                    units.filter(u => String(u.book_id) === String(selectedBookId)).forEach(unit => {
                      if (calculateParentProgress('unit', unit.id, hierarchy).status === 'completed') {
                        allKeys[`unit-${unit.id}`] = true;
                      }
                    });
                  }
                  if (hasCompletedChapters) {
                    chapters.filter(c => {
                      if (hasUnits) {
                        const unitIds = units.filter(u => String(u.book_id) === String(selectedBookId)).map(u => String(u.id));
                        return unitIds.includes(String(c.unit_id));
                      }
                      return String(c.book_id) === String(selectedBookId);
                    }).forEach(c => {
                      if (calculateParentProgress('chapter', c.id, hierarchy).status === 'completed') {
                        allKeys[`chapter-${c.id}`] = true;
                      }
                    });
                  }
                  if (hasLessons) {
                    // Gather completed lessons
                    lessons.filter(l => {
                      const progress = getNodeProgress('lesson', l.id);
                      return progress?.status === 'completed';
                    }).forEach(l => {
                      allKeys[`lesson-${l.id}`] = true;
                    });
                  }
                  setRevisionSelections(allKeys);
                }}
                className="text-emerald-600 hover:text-emerald-700 text-[10px] font-extrabold"
              >
                Select All Completed
              </button>
            </div>

            {activeBook ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {/* List units if completed */}
                {hasUnits && units.filter(u => String(u.book_id) === String(selectedBookId)).map(unit => (
                  <React.Fragment key={unit.id}>
                    {renderRevisionNodeRow('unit', unit.id, `Unit: ${unit.name}`)}
                  </React.Fragment>
                ))}

                {/* List chapters if completed */}
                {hasChapters && chapters.filter(c => {
                  if (hasUnits) {
                    const unitIds = units.filter(u => String(u.book_id) === String(selectedBookId)).map(u => String(u.id));
                    return unitIds.includes(String(c.unit_id));
                  }
                  return String(c.book_id) === String(selectedBookId);
                }).map(chap => (
                  <React.Fragment key={chap.id}>
                    {renderRevisionNodeRow('chapter', chap.id, `Chapter: ${chap.name}`)}
                  </React.Fragment>
                ))}

                {/* List lessons if completed */}
                {hasLessons && lessons.filter(l => {
                  const progress = getNodeProgress('lesson', l.id);
                  return progress?.status === 'completed';
                }).map(less => (
                  <React.Fragment key={less.id}>
                    {renderRevisionNodeRow('lesson', less.id, less.name)}
                  </React.Fragment>
                ))}

                {/* Show placeholder if no items are completed yet */}
                {Object.keys(progressList.filter(p => p.status === 'completed')).length === 0 && (
                  <div className="col-span-full text-center py-12 text-dark-muted font-semibold text-xs border border-dashed border-light-border rounded-3xl">
                    No curriculum items have been marked "Completed" yet in this class.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-dark-muted font-semibold text-xs">No active syllabus to display.</div>
            )}
          </div>

          {/* Actions panel */}
          <div className="bg-white rounded-3xl border border-light-border p-6 shadow-sm h-fit space-y-4">
            <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider">Log Revision Session</h4>
            
            <p className="text-[10px] text-dark-soft leading-relaxed font-semibold">
              Select multiple lessons, chapters, or units on the left and submit them as revisions. Each submission will increment their respective revision counts.
            </p>

            <div className="pt-2 border-t border-light-border">
              <span className="text-[10px] font-bold text-dark-soft uppercase block mb-2">Selected Items</span>
              <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-1">
                {Object.keys(revisionSelections).filter(k => revisionSelections[k]).map(key => {
                  const [type, id] = key.split('-');
                  let name = '';
                  if (type === 'unit') name = units.find(u => String(u.id) === String(id))?.name || 'Unit';
                  if (type === 'chapter') name = chapters.find(c => String(c.id) === String(id))?.name || 'Chapter';
                  if (type === 'lesson') name = lessons.find(l => String(l.id) === String(id))?.name || 'Lesson';
                  return (
                    <div key={key} className="flex justify-between items-center text-[10px] font-bold bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-100/50">
                      <span className="truncate max-w-[150px]">{name}</span>
                      <span className="uppercase text-[8px] font-extrabold">{type}</span>
                    </div>
                  );
                })}
                {Object.keys(revisionSelections).filter(k => revisionSelections[k]).length === 0 && (
                  <span className="text-xs text-dark-muted font-medium italic">None selected</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || Object.keys(revisionSelections).filter(k => revisionSelections[k]).length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm outline-none flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-redo-alt"></i>}
              Submit Revision Session
            </button>
          </div>
        </form>
      )}

      {activeTab === 'adhoc' && (
        <form onSubmit={handleAdhocSubmit} className="bg-white rounded-3xl border border-light-border p-6 shadow-sm max-w-2xl mx-auto space-y-5">
          <div>
            <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider mb-1">Log Adhoc Activity</h4>
            <p className="text-[10px] text-dark-soft">
              Log custom class activities that are outside the pre-configured syllabus curriculum.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-deepblue mb-1.5">Activity Description *</label>
            <textarea
              required
              rows={4}
              placeholder="e.g. Conducted a mock class quiz on algebra, or guided students through science laboratory equipment safety protocols."
              value={adhocName}
              onChange={(e) => setAdhocName(e.target.value)}
              className="w-full px-4 py-3 border border-light-border rounded-2xl focus:border-brand-primary focus:ring-4 focus:ring-brand-soft outline-none text-xs font-bold text-dark-primary transition-all"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm outline-none flex items-center gap-1.5"
            >
              {submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
              Log Adhoc Activity
            </button>
          </div>
        </form>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-light-border p-6 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider mb-1">Log Submission History</h4>
            <p className="text-[10px] text-dark-soft">A chronological list of daily syllabus and adhoc logs submitted for this subject and class.</p>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {historyLogs.map(log => (
              <div key={log.id} className="border border-light-border/40 rounded-2xl p-4 bg-light-lbg/10 space-y-3 text-xs">
                {/* Log date header */}
                <div className="flex justify-between items-center border-b border-light-border/40 pb-2">
                  <span className="font-extrabold text-dark-deepblue">
                    <i className="far fa-calendar-alt mr-2 text-dark-soft"></i>{log.date}
                  </span>
                  <span className="text-[9px] text-dark-soft font-bold uppercase">Log ID: {log.id}</span>
                </div>

                {/* Log items list */}
                <div className="space-y-2">
                  {log.syllabus_tracker_log_items?.map(item => {
                    let itemName = '';
                    let itemBadgeClass = 'bg-light-bg text-dark-soft border-light-border';

                    if (item.item_type === 'lesson') {
                      itemName = lessons.find(l => String(l.id) === String(item.item_id))?.name || 'Lesson';
                    } else if (item.item_type === 'chapter') {
                      itemName = chapters.find(c => String(c.id) === String(item.item_id))?.name || 'Chapter';
                    } else if (item.item_type === 'unit') {
                      itemName = units.find(u => String(u.id) === String(item.item_id))?.name || 'Unit';
                    } else if (item.item_type === 'adhoc') {
                      itemName = item.adhoc_name || 'Adhoc Activity';
                      itemBadgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                    }

                    return (
                      <div key={item.id} className="flex flex-wrap items-center justify-between bg-white border border-light-border/30 p-2.5 rounded-xl gap-2 font-semibold">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${itemBadgeClass}`}>
                            {item.item_type}
                          </span>
                          <span className="text-dark-primary text-xs font-bold">{itemName}</span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          item.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.status === 'in_progress'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {item.status === 'revision' ? 'revision conducted' : item.status}
                        </span>
                      </div>
                    );
                  })}
                  {(!log.syllabus_tracker_log_items || log.syllabus_tracker_log_items.length === 0) && (
                    <span className="text-dark-muted italic block">No items logged in this submission.</span>
                  )}
                </div>
              </div>
            ))}

            {historyLogs.length === 0 && (
              <div className="text-center py-12 text-dark-muted font-semibold text-xs border border-dashed border-light-border rounded-3xl">
                No logs have been submitted yet for this subject and class.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SyllabusTracker;
