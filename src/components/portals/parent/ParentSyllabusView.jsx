import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';

const ParentSyllabusView = ({ student }) => {
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [bookTrackers, setBookTrackers] = useState([]);
  const [lessonLogs, setLessonLogs] = useState([]);
  const [logItems, setLogItems] = useState([]);
  const [syllabusData, setSyllabusData] = useState([]);
  const [timeFilter, setTimeFilter] = useState('till_date'); // 'today' | 'week' | 'month' | 'till_date'
  const [expandedBooks, setExpandedBooks] = useState({});

  const classId = student?.class_id;
  const className = student?.class_name || 'Child\'s Class';

  useEffect(() => {
    const fetchData = async () => {
      if (!classId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [
          resBooks,
          resTrackers,
          resLogs,
          resSyllabus
        ] = await Promise.all([
          supabase.from('syllabus_books').select('*'),
          supabase.from('book_tracker').select('*').eq('class_id', classId),
          supabase.from('lesson_tracker_log').select('*').eq('class_id', classId),
          supabase.from('syllabus_book_lessons').select('*')
        ]);

        if (resBooks.error) throw resBooks.error;
        if (resTrackers.error) throw resTrackers.error;
        if (resLogs.error) throw resLogs.error;
        if (resSyllabus.error) throw resSyllabus.error;

        setBooks(resBooks.data || []);
        setBookTrackers(resTrackers.data || []);
        setLessonLogs(resLogs.data || []);
        setSyllabusData(resSyllabus.data || []);

        // Fetch log items for this class (joined to get details)
        const logIds = (resLogs.data || []).map(l => l.id);
        if (logIds.length > 0) {
          const { data: items, error: itemsErr } = await supabase
            .from('lesson_tracker_log_items')
            .select('*, teacher:teachers(name)')
            .in('lt_log_id', logIds)
            .order('date', { ascending: false });
          if (itemsErr) throw itemsErr;
          setLogItems(items || []);
        } else {
          setLogItems([]);
        }

      } catch (err) {
        console.warn('ParentSyllabusView fetch failed:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [classId]);

  const toggleBookExpand = (bookId) => {
    setExpandedBooks(prev => ({ ...prev, [bookId]: !prev[bookId] }));
  };

  const getStatusBadge = (status) => {
    if (status === 'completed') return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Completed</span>;
    if (status === 'in_progress') return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">In Progress</span>;
    return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold">Not Started</span>;
  };

  // Client-side date filters
  const getFilteredItems = () => {
    if (timeFilter === 'till_date') return logItems;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let limitDate = new Date();
    if (timeFilter === 'today') {
      return logItems.filter(item => item.date === todayStr);
    } else if (timeFilter === 'week') {
      // Start of current week (Monday)
      const day = limitDate.getDay();
      const diff = limitDate.getDate() - day + (day === 0 ? -6 : 1);
      limitDate.setDate(diff);
      limitDate.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'month') {
      // Start of current month
      limitDate.setDate(1);
      limitDate.setHours(0, 0, 0, 0);
    }

    return logItems.filter(item => new Date(item.date) >= limitDate);
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-light-bg min-h-[400px] flex items-center justify-center font-bold text-dark-primary">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mr-3"></div>
        Loading Syllabus Coverage...
      </div>
    );
  }

  if (!classId) {
    return (
      <div className="p-8 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
        No class assigned to the student.
      </div>
    );
  }

  // Filter books that belong to this class (by checking if we have logs or book tracker entries for them)
  const classBookIds = [
    ...new Set([
      ...bookTrackers.map(t => String(t.book_id)),
      ...lessonLogs.map(l => {
        const lesson = syllabusData.find(s => String(s.id) === String(l.lesson_id));
        return lesson ? String(lesson.book_id) : null;
      }).filter(Boolean)
    ])
  ];
  const activeBooks = books.filter(b => classBookIds.includes(String(b.id)));

  const filteredItems = getFilteredItems();

  return (
    <div className="flex flex-col bg-light-bg font-sans p-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-dark-primary flex items-center gap-2">
            Syllabus Coverage — {student?.name || student?.student_name || 'Student'}
          </h1>
          <p className="text-xs font-bold text-dark-soft mt-1">
            Class: <span className="text-brand-primary uppercase">{className}</span>
          </p>
        </div>

        {/* Time filters tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-light-border shadow-sm gap-0.5">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'till_date', label: 'Till Date' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTimeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeFilter === tab.id
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-dark-soft hover:text-dark-primary hover:bg-light-ui'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeBooks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-light-border border-dashed p-12 text-center">
          <i className="fas fa-book-open text-3xl text-brand-soft mb-4"></i>
          <h3 className="text-sm font-bold text-dark-primary mb-1">No Syllabus Tracks Found</h3>
          <p className="text-xs font-semibold text-dark-muted">
            No books or lesson tracker entries found for this class yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeBooks.map(book => {
            const bt = bookTrackers.find(t => String(t.book_id) === String(book.id));
            const isBookExpanded = !!expandedBooks[book.id];
            
            // Resolve all book lessons (leaves)
            const bookLessons = syllabusData.filter(d => String(d.book_id) === String(book.id));
            const activeBookLessons = bookLessons.filter(n => {
              if (n.level3) return true;
              if (n.level2 && !n.level3) {
                const hasL3 = bookLessons.some(o => o.level1 === n.level1 && (o.level2 || 'General') === n.level2 && o.level3);
                return !hasL3;
              }
              if (n.level1 && !n.level2 && !n.level3) {
                const hasL2orL3 = bookLessons.some(o => o.level1 === n.level1 && (o.level2 || o.level3));
                return !hasL2orL3;
              }
              return false;
            });

            const bookLogs = lessonLogs.filter(l => activeBookLessons.some(bl => String(bl.id) === String(l.lesson_id)));

            // Calculate numbers based on timeFilter
            let total = activeBookLessons.length;
            let completed = 0;
            let inProgress = 0;
            let notStarted = total;
            let pct = 0;

            if (timeFilter === 'till_date') {
              completed = bt?.completed || 0;
              inProgress = bt?.in_progress || 0;
              notStarted = bt?.not_started || total;
              pct = bt ? Number(bt.completion_percentage).toFixed(0) : 0;
            } else {
              // Filter logs that have item updates in the selected date range
              const activeLogIds = filteredItems.map(item => item.lt_log_id);
              const activeLogs = bookLogs.filter(l => activeLogIds.includes(l.id));

              completed = activeLogs.filter(l => l.current_status === 'completed').length;
              inProgress = activeLogs.filter(l => l.current_status === 'in_progress').length;
              notStarted = total - completed - inProgress;
              pct = total > 0 ? ((completed / total) * 100).toFixed(0) : 0;
            }

            // Group book lessons by Level 1 Unit
            const level1Names = [...new Set(activeBookLessons.map(l => l.level1))].filter(Boolean);

            return (
              <div key={book.id} className="bg-white rounded-2xl border border-light-border shadow-sm overflow-hidden">
                {/* Book Header */}
                <div className="p-5 flex items-center justify-between gap-4 cursor-pointer" onClick={() => toggleBookExpand(book.id)}>
                  <div className="flex items-center gap-4 text-left flex-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors bg-brand-lbg text-brand-primary`}>
                      <i className={`fas fa-chevron-${isBookExpanded ? 'down' : 'right'} text-xs`} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-dark-primary flex items-center gap-2">
                        <i className="fas fa-book text-blue-primary text-sm" />
                        {book.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-gray-500 flex-wrap">
                        <span>Completed: <strong className="text-emerald-700">{completed}</strong></span>
                        <span className="text-gray-300">|</span>
                        <span>In Progress: <strong className="text-blue-700">{inProgress}</strong></span>
                        <span className="text-gray-300">|</span>
                        <span>Not Started: <strong className="text-gray-500">{notStarted}</strong></span>
                        <span className="text-gray-300">|</span>
                        <span>Total: <strong className="text-dark-primary">{total}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-brand-primary">{pct}%</span>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Coverage</p>
                  </div>
                </div>

                {/* Book Progress Bar */}
                <div className="px-5 pb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: Number(pct) >= 70 ? '#10b981' : Number(pct) >= 30 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                </div>

                {/* Lessons Details Accordion */}
                {isBookExpanded && (
                  <div className="border-t p-5 bg-gray-50/30 space-y-4">
                    {level1Names.map(l1 => {
                      const l1Lessons = activeBookLessons.filter(l => l.level1 === l1);
                      const isLvl1Leaf = l1Lessons.length === 1 && !l1Lessons[0].level2 && !l1Lessons[0].level3;

                      // Skip grouping if Level 1 is a leaf itself (already rendered in header context or as single leaf card)
                      const l1Completed = l1Lessons.filter(l => {
                        const log = bookLogs.find(log => String(log.lesson_id) === String(l.id));
                        return log?.current_status === 'completed';
                      }).length;

                      return (
                        <div key={l1} className="bg-white border rounded-xl p-4 shadow-sm">
                          <h4 className="font-extrabold text-sm text-dark-primary border-b pb-2 mb-3 flex justify-between items-center">
                            <span>{l1}</span>
                            <span className="text-[10px] bg-gray-100 border px-2 py-0.5 rounded-full font-bold text-gray-600">
                              {l1Completed}/{l1Lessons.length} Completed
                            </span>
                          </h4>

                          <div className="space-y-2">
                            {l1Lessons.map(lesson => {
                              const log = bookLogs.find(l => String(l.lesson_id) === String(lesson.id));
                              const status = log?.current_status || 'not_started';
                              const progressPct = log ? Number(log.completion_percentage).toFixed(0) : 0;
                              const lessonTitle = lesson.level3 || lesson.level2 || lesson.level1;

                              // Get log items for this log to show parent comments or activity date
                              const itemHistory = log ? filteredItems.filter(item => item.lt_log_id === log.id) : [];

                              return (
                                <div key={lesson.id} className="p-3 border border-gray-100 rounded-lg hover:border-brand-primary/20 transition-colors">
                                  <div className="flex justify-between items-center gap-4 flex-wrap sm:flex-nowrap">
                                    <div>
                                      <p className="text-xs font-bold text-dark-primary">
                                        {lessonTitle}
                                      </p>
                                      {itemHistory.length > 0 && (
                                        <p className="text-[10px] text-gray-500 font-semibold mt-1">
                                          Last activity: {new Date(itemHistory[0].date).toLocaleDateString()}
                                          {itemHistory[0].teacher?.name && ` by ${itemHistory[0].teacher.name}`}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      {getStatusBadge(status)}
                                      {log && status !== 'not_started' && (
                                        <span className="text-xs text-gray-600 font-extrabold">
                                          {progressPct}%
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Comments from teachers */}
                                  {itemHistory.length > 0 && itemHistory[0].comments && (
                                    <div className="mt-2 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-dashed border-gray-200">
                                      <strong className="text-dark-soft">Teacher Comment:</strong> {itemHistory[0].comments}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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
};

export default ParentSyllabusView;
