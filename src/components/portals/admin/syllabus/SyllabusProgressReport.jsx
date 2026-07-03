import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';

const SyllabusProgressReport = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [books, setBooks] = useState([]);
  const [syllabusData, setSyllabusData] = useState([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');

  // Redesigned data states
  const [bookTracker, setBookTracker] = useState(null);
  const [lessonLogs, setLessonLogs] = useState([]);
  const [logItems, setLogItems] = useState({}); // { [ltLogId]: items }
  const [expandedLogs, setExpandedLogs] = useState({});

  useEffect(() => {
    const fetchBase = async () => {
      setLoading(true);
      try {
        const [
          { data: dbClasses },
          { data: dbSubjects },
          { data: dbBooks }
        ] = await Promise.all([
          supabase.from('classes').select('*'),
          supabase.from('subjects').select('*'),
          supabase.from('syllabus_books').select('*')
        ]);

        setClasses(dbClasses || []);
        setSubjects(dbSubjects || []);
        setBooks(dbBooks || []);

        if (dbClasses && dbClasses.length > 0) setSelectedClassId(String(dbClasses[0].id));
        if (dbSubjects && dbSubjects.length > 0) setSelectedSubjectId(String(dbSubjects[0].id));
      } catch (err) {
        console.warn('SyllabusProgressReport init base failed:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBase();
  }, []);

  const filteredBooks = books.filter(b => String(b.subject_id) === String(selectedSubjectId));

  useEffect(() => {
    if (filteredBooks.length > 0) setSelectedBookId(String(filteredBooks[0].id));
    else setSelectedBookId('');
  }, [selectedSubjectId]);

  const fetchSyllabusData = async (bookId) => {
    if (!bookId) {
      setSyllabusData([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('syllabus_book_lessons')
        .select('*')
        .eq('book_id', bookId);
      if (error) throw error;
      setSyllabusData(data || []);
    } catch (err) {
      console.warn('Failed to fetch syllabus lessons:', err.message);
      setSyllabusData([]);
    }
  };

  useEffect(() => {
    fetchSyllabusData(selectedBookId);
  }, [selectedBookId]);

  const fetchReportData = async () => {
    if (!selectedClassId || !selectedBookId) {
      setBookTracker(null);
      setLessonLogs([]);
      return;
    }
    try {
      const [resBT, resLogs] = await Promise.all([
        supabase.from('book_tracker').select('*').eq('class_id', selectedClassId).eq('book_id', selectedBookId).maybeSingle(),
        supabase.from('lesson_tracker_log').select('*').eq('class_id', selectedClassId)
      ]);

      if (resBT.error) throw resBT.error;
      if (resLogs.error) throw resLogs.error;

      setBookTracker(resBT.data || null);
      setLessonLogs(resLogs.data || []);
    } catch (err) {
      console.warn('Failed to fetch report progress data:', err.message);
      setBookTracker(null);
      setLessonLogs([]);
    }
  };

  const fetchLogItemsForLog = async (ltLogId) => {
    try {
      const { data, error } = await supabase
        .from('lesson_tracker_log_items')
        .select('*, teacher:teachers(name)')
        .eq('lt_log_id', ltLogId)
        .order('date', { ascending: false });
      if (error) throw error;
      setLogItems(prev => ({ ...prev, [ltLogId]: data || [] }));
    } catch (err) {
      console.warn('Failed to fetch log items:', err.message);
    }
  };

  const toggleLogExpand = async (ltLogId) => {
    const isExpanded = expandedLogs[ltLogId];
    setExpandedLogs(prev => ({ ...prev, [ltLogId]: !isExpanded }));
    if (!isExpanded && !logItems[ltLogId]) {
      await fetchLogItemsForLog(ltLogId);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this lesson log? This will delete all logged daily entries/items for this lesson.')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('lesson_tracker_log').delete().eq('id', logId);
      if (error) throw error;
      showToast('Lesson log deleted successfully!', 'success');
      await fetchReportData();
    } catch (err) {
      showToast('Failed to delete log: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId, ltLogId) => {
    if (!window.confirm('Are you sure you want to delete this specific daily log entry?')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('lesson_tracker_log_items').delete().eq('id', itemId);
      if (error) throw error;
      showToast('Daily log entry deleted successfully!', 'success');
      await fetchReportData();
      await fetchLogItemsForLog(ltLogId);
    } catch (err) {
      showToast('Failed to delete log entry: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedClassId, selectedBookId]);

  const getStatusBadge = (status) => {
    if (status === 'completed') return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Completed</span>;
    if (status === 'in_progress') return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">In Progress</span>;
    return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold">Not Started</span>;
  };

  const activeBook = filteredBooks.find(b => String(b.id) === String(selectedBookId));
  const bookData = syllabusData.filter(d => String(d.book_id) === String(selectedBookId));

  const getBookLessons = () => {
    return bookData.filter(n => {
      if (n.level3) return true;
      if (n.level2 && !n.level3) {
        const hasL3 = bookData.some(o => o.level1 === n.level1 && (o.level2 || 'General') === n.level2 && o.level3);
        return !hasL3;
      }
      if (n.level1 && !n.level2 && !n.level3) {
        const hasL2orL3 = bookData.some(o => o.level1 === n.level1 && (o.level2 || o.level3));
        return !hasL2orL3;
      }
      return false;
    });
  };

  const renderTree = () => {
    if (!activeBook) return <div className="p-8 text-center bg-white rounded-xl shadow-sm text-gray-500">No books found for this subject.</div>;

    const bookLessons = getBookLessons();
    const total = bookTracker?.total_lessons || bookLessons.length;
    const completed = bookTracker?.completed || 0;
    const inProgress = bookTracker?.in_progress || 0;
    const notStarted = bookTracker?.not_started || total;
    const pct = bookTracker ? Number(bookTracker.completion_percentage).toFixed(0) : '0';

    return (
      <div className="space-y-6">
        {/* Book Summary Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-light-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-dark-primary">{activeBook.name}</h2>
            <div className="flex gap-4 text-xs font-semibold text-gray-500 mt-2">
              <span>Completed: <strong className="text-emerald-700">{completed}</strong></span>
              <span>In Progress: <strong className="text-blue-700">{inProgress}</strong></span>
              <span>Not Started: <strong className="text-gray-500">{notStarted}</strong></span>
              <span>Total Lessons: <strong className="text-dark-primary">{total}</strong></span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-brand-primary">{pct}%</span>
            <p className="text-xs font-bold text-gray-400">Coverage Completed</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white p-3 border rounded-xl shadow-sm">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: Number(pct) >= 70 ? '#10b981' : Number(pct) >= 30 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
        </div>

        {/* Detailed Lessons */}
        <div className="bg-white rounded-2xl shadow-sm border border-light-border overflow-hidden">
          <div className="p-4 border-b bg-gray-50"><h3 className="font-bold">Lessons Coverage Tracker</h3></div>
          <div className="p-4 space-y-3">
            {bookLessons.map(node => {
              const log = lessonLogs.find(l => String(l.lesson_id) === String(node.id));
              const status = log?.current_status || 'not_started';
              const title = node.level3 || node.level2 || node.level1;
              const isExpanded = log && expandedLogs[log.id];

              return (
                <div key={node.id} className="border rounded-xl p-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-sm text-dark-primary">{title}</span>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {getStatusBadge(status)}
                        {log && (
                          <>
                            <span className="text-[10px] text-gray-500 font-semibold bg-gray-100 px-1.5 py-0.5 rounded">
                              {Number(log.completion_percentage).toFixed(0)}% Progress
                            </span>
                            <span className="text-[10px] text-gray-500 font-semibold bg-gray-100 px-1.5 py-0.5 rounded">
                              Days Logged: {log.days_taken}
                            </span>
                            {log.revision_counter > 0 && (
                              <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                Revisions: {log.revision_counter}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log && (
                        <>
                          <button
                            onClick={() => toggleLogExpand(log.id)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <i className={`fas fa-${isExpanded ? 'eye-slash' : 'eye'} mr-1`}></i>
                            {isExpanded ? 'Hide' : 'View'} Entries
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            disabled={submitting}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-100 transition-colors cursor-pointer"
                            title="Delete log and items"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Log Items entries detail */}
                  {isExpanded && log && (
                    <div className="mt-3 space-y-2 border-t pt-3 pl-4">
                      <p className="text-[10px] font-extrabold text-dark-soft uppercase">Logged Daily Entries</p>
                      {(logItems[log.id] || []).length === 0 ? (
                        <p className="text-xs text-gray-400">Loading details...</p>
                      ) : (
                        (logItems[log.id] || []).map(item => (
                          <div key={item.id} className="flex justify-between items-start p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-700">{new Date(item.date).toLocaleDateString()}</span>
                                {getStatusBadge(item.current_status)}
                                <span className="text-gray-500 font-semibold">{Number(item.progress).toFixed(0)}%</span>
                                {item.teacher?.name && <span className="text-gray-400 font-semibold">by {item.teacher.name}</span>}
                                {item.is_revision === 'Y' && (
                                  <span className="text-purple-600 font-bold bg-purple-50 px-1 py-0.5 rounded border border-purple-100 text-[9px]">Revision</span>
                                )}
                                {item.late_reporting === 'Y' && (
                                  <span className="text-red-600 font-bold bg-red-50 px-1 py-0.5 rounded border border-red-100 text-[9px]">Late Reporting</span>
                                )}
                              </div>
                              {item.comments && <p className="text-gray-500 mt-1">{item.comments}</p>}
                            </div>
                            <button
                              onClick={() => handleDeleteItem(item.id, log.id)}
                              disabled={submitting}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Delete daily entry"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center">Loading Progress Report...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-light-bg font-sans p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-6">Class Progress Report</h1>
        <div className="flex gap-4">
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="border p-2 rounded-xl bg-white min-w-[200px] outline-none">
            {classes.map(c => <option key={c.id} value={c.id}>{c.name || c.class_name}</option>)}
          </select>
          <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="border p-2 rounded-xl bg-white min-w-[200px] outline-none">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)} className="border p-2 rounded-xl bg-white min-w-[200px] outline-none">
            {filteredBooks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="max-w-5xl">
        {renderTree()}
      </div>
    </div>
  );
};

export default SyllabusProgressReport;
