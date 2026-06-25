// src/components/portals/admin/syllabus/SyllabusProgressReport.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';

const SyllabusProgressReport = () => {
  const [loading, setLoading] = useState(true);

  // Metadata Lists
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [books, setBooks] = useState([]);
  const [units, setUnits] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);
  
  // Selections
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');

  // Live progress
  const [progressList, setProgressList] = useState([]);
  // Logs history
  const [historyLogs, setHistoryLogs] = useState([]);

  // Fetch initial base data
  useEffect(() => {
    const fetchBase = async () => {
      setLoading(true);
      try {
        const [
          { data: dbClasses },
          { data: dbSubjects },
          { data: dbBooks },
          { data: dbUnits },
          { data: dbChapters },
          { data: dbLessons }
        ] = await Promise.all([
          supabase.from('classes').select('*'),
          supabase.from('subjects').select('*'),
          supabase.from('syllabus_books').select('*'),
          supabase.from('syllabus_units').select('*'),
          supabase.from('syllabus_chapters').select('*'),
          supabase.from('syllabus_lessons').select('*')
        ]);

        setClasses(dbClasses || []);
        setSubjects(dbSubjects || []);
        setBooks(dbBooks || []);
        setUnits(dbUnits || []);
        setChapters(dbChapters || []);
        setLessons(dbLessons || []);

        if (dbClasses && dbClasses.length > 0) {
          setSelectedClassId(String(dbClasses[0].id));
        }
        if (dbSubjects && dbSubjects.length > 0) {
          setSelectedSubjectId(String(dbSubjects[0].id));
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchBase();
  }, []);

  // Filter books by subject
  const filteredBooks = books.filter(b => String(b.subject_id) === String(selectedSubjectId));

  // Auto-select book when subject changes
  useEffect(() => {
    if (filteredBooks.length > 0) {
      setSelectedBookId(String(filteredBooks[0].id));
    } else {
      setSelectedBookId('');
    }
  }, [selectedSubjectId]);

  // Fetch reports when selection changes
  const fetchReportData = async () => {
    if (!selectedClassId || !selectedSubjectId) return;

    try {
      const [
        { data: progressData },
        { data: logsData }
      ] = await Promise.all([
        supabase
          .from('syllabus_node_progress')
          .select('*')
          .eq('class_id', selectedClassId),
        supabase
          .from('syllabus_tracker_logs')
          .select(`
            id,
            date,
            teacher:teachers(name),
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
          .order('created_at', { ascending: false })
      ]);

      setProgressList(progressData || []);
      setHistoryLogs(logsData || []);
    } catch (err) {
      console.error('Error fetching report data:', err.message);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedClassId, selectedSubjectId]);

  // Helpers
  const getNodeProgress = (type, id) => {
    return progressList.find(p => p.item_type === type && String(p.item_id) === String(id));
  };

  const activeBook = filteredBooks.find(b => String(b.id) === String(selectedBookId)) || filteredBooks[0];
  const hierarchy = activeBook?.hierarchy_type || 'Book > Unit > Chapter > Lesson';
  const hasUnits = hierarchy.includes('Unit');
  const hasChapters = hierarchy.includes('Chapter');
  const hasLessons = hierarchy.includes('Lesson');

  const lowestLevelType = hasLessons ? 'lesson' : 'chapter';

  // Tree Helper: Rollup progress of parent nodes dynamically
  const calculateParentProgress = (nodeType, nodeId) => {
    const isChapter = nodeType === 'chapter';
    const isUnit = nodeType === 'unit';

    let descendants = [];

    if (isChapter) {
      const hasLessons = hierarchy !== 'Book > Unit > Chapter';
      if (hasLessons) {
        descendants = lessons.filter(l => String(l.chapter_id) === String(nodeId)).map(l => ({ type: 'lesson', id: l.id }));
      } else {
        // Chapter itself is lowest
        const p = getNodeProgress('chapter', nodeId);
        return {
          status: p?.status || 'not_started',
          completedCount: p?.status === 'completed' ? 1 : 0,
          totalCount: 1,
          daysSpent: p?.days_spent || 0,
          revisionCount: p?.revision_count || 0
        };
      }
    }

    if (isUnit) {
      const hasChapters = hierarchy.includes('Chapter');
      const hasLessons = hierarchy.includes('Lesson');

      if (hasChapters) {
        const unitChaps = chapters.filter(c => String(c.unit_id) === String(nodeId));
        if (hasLessons) {
          const chapIds = unitChaps.map(c => String(c.id));
          descendants = lessons.filter(l => chapIds.includes(String(l.chapter_id))).map(l => ({ type: 'lesson', id: l.id }));
        } else {
          descendants = unitChaps.map(c => ({ type: 'chapter', id: c.id }));
        }
      } else if (hasLessons) {
        descendants = lessons.filter(l => String(l.unit_id) === String(nodeId)).map(l => ({ type: 'lesson', id: l.id }));
      }
    }

    if (descendants.length === 0) {
      return { status: 'not_started', completedCount: 0, totalCount: 0, daysSpent: 0, revisionCount: 0 };
    }

    let completed = 0;
    let inProgress = 0;
    let daysSpent = 0;
    let revisionCount = 0;

    descendants.forEach(d => {
      const p = d.type === lowestLevelType ? getNodeProgress(d.type, d.id) : calculateParentProgress(d.type, d.id);
      if (p?.status === 'completed') {
        completed++;
      } else if (p?.status === 'in_progress') {
        inProgress++;
      }
      daysSpent += (p?.daysSpent !== undefined ? p.daysSpent : (p?.days_spent || 0));
      revisionCount += (p?.revisionCount !== undefined ? p.revisionCount : (p?.revision_count || 0));
    });

    // Rollup revision count of this parent node itself (in case teacher logged revision on the parent unit/chapter)
    const selfProgress = getNodeProgress(nodeType, nodeId);
    revisionCount += (selfProgress?.revision_count || 0);

    let status = 'not_started';
    if (completed === descendants.length) {
      status = 'completed';
    } else if (completed > 0 || inProgress > 0) {
      status = 'in_progress';
    }

    return { status, completedCount: completed, totalCount: descendants.length, daysSpent, revisionCount };
  };

  // Rollup metrics for Book
  const getOverallMetrics = () => {
    if (!activeBook) return { pct: 0, avgDays: 0, totalRevisions: 0 };

    // Get all lowest-level nodes under this book
    let lowestNodes = [];
    if (hasUnits) {
      const unitIds = units.filter(u => String(u.book_id) === String(activeBook.id)).map(u => String(u.id));
      if (hasChapters) {
        const chapIds = chapters.filter(c => unitIds.includes(String(c.unit_id))).map(c => String(c.id));
        if (hasLessons) {
          lowestNodes = lessons.filter(l => chapIds.includes(String(l.chapter_id))).map(l => ({ type: 'lesson', id: l.id }));
        } else {
          lowestNodes = chapters.filter(c => unitIds.includes(String(c.unit_id))).map(c => ({ type: 'chapter', id: c.id }));
        }
      } else if (hasLessons) {
        lowestNodes = lessons.filter(l => unitIds.includes(String(l.unit_id))).map(l => ({ type: 'lesson', id: l.id }));
      }
    } else {
      // Direct Chapter > Lesson
      const chapIds = chapters.filter(c => String(c.book_id) === String(activeBook.id)).map(c => String(c.id));
      lowestNodes = lessons.filter(l => chapIds.includes(String(l.chapter_id))).map(l => ({ type: 'lesson', id: l.id }));
    }

    if (lowestNodes.length === 0) return { pct: 0, avgDays: 0, totalRevisions: 0 };

    let completedCount = 0;
    let totalDaysSpent = 0;
    let completedWithDays = 0;
    let totalRevisions = 0;

    lowestNodes.forEach(node => {
      const p = getNodeProgress(node.type, node.id);
      if (p?.status === 'completed') {
        completedCount++;
      }
      if (p?.days_spent > 0) {
        totalDaysSpent += p.days_spent;
        completedWithDays++;
      }
      if (p?.revision_count > 0) {
        totalRevisions += p.revision_count;
      }
    });

    // Also include any unit/chapter revisions in the total revisions count
    progressList.forEach(p => {
      if (p.item_type === 'unit' || (p.item_type === 'chapter' && !lowestNodes.some(ln => ln.type === 'chapter' && String(ln.id) === String(p.item_id)))) {
        totalRevisions += (p.revision_count || 0);
      }
    });

    const pct = Math.round((completedCount / lowestNodes.length) * 100);
    const avgDays = completedWithDays > 0 ? (totalDaysSpent / completedWithDays).toFixed(1) : '0.0';

    return { pct, avgDays, totalRevisions };
  };

  const metrics = getOverallMetrics();

  // Render a single node in report tree list
  const renderReportNodeRow = (type, id, name) => {
    const isLowest = type === lowestLevelType;
    const progress = isLowest ? getNodeProgress(type, id) : calculateParentProgress(type, id);
    const status = progress?.status || 'not_started';

    let badgeClass = 'bg-light-bg text-dark-soft border-light-border/40';
    let label = 'Not Started';

    if (status === 'completed') {
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
      label = 'Completed';
    } else if (status === 'in_progress') {
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-100';
      label = 'In Progress';
    }

    const days = isLowest ? (progress?.days_spent || 0) : progress.daysSpent;
    const revisions = isLowest ? (progress?.revision_count || 0) : progress.revisionCount;

    return (
      <div className="flex items-center justify-between p-3.5 rounded-2xl border border-light-border/40 bg-white hover:shadow-sm transition-all gap-4 animate-in fade-in duration-200">
        <div>
          <span className="text-xs font-bold text-dark-primary block">{name}</span>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] font-semibold text-dark-soft">
            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold ${badgeClass}`}>
              {label}
            </span>
            {days > 0 && (
              <span className="text-blue-600">
                <i className="far fa-clock mr-1"></i>{days} Logged Sessions
              </span>
            )}
            {revisions > 0 && (
              <span className="text-emerald-600">
                <i className="fas fa-redo-alt mr-1"></i>{revisions} Revisions Conducted
              </span>
            )}
            {isLowest && progress?.completed_at && (
              <span className="text-dark-muted">
                Completed on {progress.completed_at}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-dark-muted font-semibold text-sm">Loading reports dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Filter Selection */}
      <div className="bg-white rounded-3xl border border-light-border p-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center flex-1">
          {/* Class Select */}
          <div className="w-full sm:w-48">
            <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1.5">Class Filter</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Subject Select */}
          <div className="w-full sm:w-48">
            <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1.5">Subject Filter</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Book Select */}
          <div className="w-full sm:w-56">
            <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1.5">Book Filter</label>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
            >
              {filteredBooks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              {filteredBooks.length === 0 && <option value="">-- No Books Configured --</option>}
            </select>
          </div>
        </div>

        {activeBook && (
          <div className="text-right">
            <span className="text-[10px] font-bold text-dark-soft block uppercase tracking-wider">Hierarchy Level</span>
            <span className="text-xs font-extrabold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full inline-block mt-1">
              {hierarchy}
            </span>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      {activeBook ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl border border-light-border p-6 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xl shrink-0">
              <i className="fas fa-chart-pie"></i>
            </div>
            <div>
              <span className="text-[10px] font-bold text-dark-soft uppercase block tracking-wider">Syllabus Completed</span>
              <span className="text-2xl font-extrabold text-dark-primary mt-1 block">{metrics.pct}%</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-light-border p-6 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl shrink-0">
              <i className="far fa-clock"></i>
            </div>
            <div>
              <span className="text-[10px] font-bold text-dark-soft uppercase block tracking-wider">Avg. Spent Sessions</span>
              <span className="text-2xl font-extrabold text-dark-primary mt-1 block">{metrics.avgDays} days</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-light-border p-6 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl shrink-0">
              <i className="fas fa-redo-alt"></i>
            </div>
            <div>
              <span className="text-[10px] font-bold text-dark-soft uppercase block tracking-wider">Total Revisions</span>
              <span className="text-2xl font-extrabold text-dark-primary mt-1 block">{metrics.totalRevisions} rounds</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-light-border p-8 text-center shadow-sm">
          <span className="text-xs text-dark-muted font-semibold italic">Please add a Book or select a valid Subject to view metrics.</span>
        </div>
      )}

      {/* Progress Breakdown & Submission Logs Split */}
      {activeBook && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Breakdown list (Left/Center 2 cols) */}
          <div className="lg:col-span-2 bg-light-bg/10 rounded-3xl border border-light-border p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider">Syllabus Breakdown Progress</h4>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Unit renderer */}
              {hasUnits ? (
                units.filter(u => String(u.book_id) === String(selectedBookId)).map(unit => {
                  const progress = calculateParentProgress('unit', unit.id);
                  return (
                    <div key={unit.id} className="border border-light-border/40 rounded-2xl bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-light-border/30 pb-2">
                        <span className="text-xs font-extrabold text-brand-primary">Unit: {unit.name}</span>
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-dark-soft">
                          <span className={`px-2 py-0.5 rounded-full border text-[8px] font-extrabold ${
                            progress.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : progress.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : 'bg-light-bg text-dark-soft border-light-border/40'
                          }`}>
                            {progress.status === 'completed' ? 'Completed' : progress.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                          </span>
                          <span>{progress.completedCount}/{progress.totalCount} Complete</span>
                        </div>
                      </div>

                      {/* Chapters under Unit */}
                      {hasChapters ? (
                        <div className="pl-4 border-l border-dashed border-light-border/60 space-y-3">
                          {chapters.filter(c => String(c.unit_id) === String(unit.id)).map(chap => {
                            const chapProgress = calculateParentProgress('chapter', chap.id);
                            return (
                              <div key={chap.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-dark-primary">Chapter: {chap.name}</span>
                                  {hasLessons && (
                                    <span className="text-[9px] text-dark-soft font-bold uppercase">
                                      {chapProgress.completedCount}/{chapProgress.totalCount} Lessons
                                    </span>
                                  )}
                                </div>

                                {/* Lessons under Chapter */}
                                {hasLessons ? (
                                  <div className="pl-4 space-y-2">
                                    {lessons.filter(l => String(l.chapter_id) === String(chap.id)).map(less => (
                                      <div key={less.id}>
                                        {renderReportNodeRow('lesson', less.id, less.name)}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="pl-2">
                                    {renderReportNodeRow('chapter', chap.id, chap.name)}
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
                              {renderReportNodeRow('lesson', less.id, less.name)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // Direct Chapter > Lesson
                chapters.filter(c => String(c.book_id) === String(selectedBookId)).map(chap => (
                  <div key={chap.id} className="border border-light-border/40 rounded-2xl bg-white p-4 space-y-3">
                    <span className="text-xs font-extrabold text-brand-primary">Chapter: {chap.name}</span>
                    <div className="pl-4 space-y-2">
                      {lessons.filter(l => String(l.chapter_id) === String(chap.id)).map(less => (
                        <div key={less.id}>
                          {renderReportNodeRow('lesson', less.id, less.name)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Submission logs list (Right 1 col) */}
          <div className="bg-white rounded-3xl border border-light-border p-6 shadow-sm h-fit space-y-4">
            <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider">Log Submission History</h4>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {historyLogs.map(log => (
                <div key={log.id} className="border border-light-border/40 rounded-2xl p-4 bg-light-lbg/10 space-y-3 text-[11px] leading-relaxed">
                  <div className="flex justify-between items-center border-b border-light-border/30 pb-1.5 font-bold">
                    <span className="text-dark-deepblue">{log.date}</span>
                    <span className="text-dark-muted font-medium">By: {log.teacher?.name || 'Staff'}</span>
                  </div>

                  <div className="space-y-1.5">
                    {log.syllabus_tracker_log_items?.map(item => {
                      let itemName = '';
                      let badgeColor = 'bg-light-bg text-dark-soft';

                      if (item.item_type === 'lesson') {
                        itemName = lessons.find(l => String(l.id) === String(item.item_id))?.name || 'Lesson';
                      } else if (item.item_type === 'chapter') {
                        itemName = chapters.find(c => String(c.id) === String(item.item_id))?.name || 'Chapter';
                      } else if (item.item_type === 'unit') {
                        itemName = units.find(u => String(u.id) === String(item.item_id))?.name || 'Unit';
                      } else if (item.item_type === 'adhoc') {
                        itemName = item.adhoc_name || 'Adhoc Activity';
                        badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
                      }

                      return (
                        <div key={item.id} className="flex flex-wrap items-center justify-between bg-white border border-light-border/30 p-2 rounded-xl gap-2 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border ${badgeColor}`}>
                              {item.item_type}
                            </span>
                            <span className="text-dark-primary font-bold truncate max-w-[120px]">{itemName}</span>
                          </div>
                          <span className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                            item.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}>
                            {item.status === 'revision' ? 'revised' : item.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {historyLogs.length === 0 && (
                <div className="text-center py-8 text-dark-muted font-semibold italic text-xs">
                  No submissions have been logged for this class/subject.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyllabusProgressReport;
