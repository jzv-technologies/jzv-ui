import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { CARD_THEMES } from '../../../utils/cardTheme';

const ParentSyllabusView = ({ student }) => {
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [bookTrackers, setBookTrackers] = useState([]);
  const [lessonLogs, setLessonLogs] = useState([]);
  const [logItems, setLogItems] = useState([]);
  const [syllabusData, setSyllabusData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [timeFilter, setTimeFilter] = useState('till_date'); // 'today' | 'week' | 'month' | 'till_date'
  const [expandedBookId, setExpandedBookId] = useState(null);
  const [showNotStarted, setShowNotStarted] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('class-progress'); // 'class-progress' | 'daily-activity'

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
          resSubjects,
          resClassifications
        ] = await Promise.all([
          supabase.from('syllabus_books').select('*'),
          supabase.from('book_tracker').select('*').eq('class_id', classId),
          supabase.from('lesson_tracker_log').select('*').eq('class_id', classId),
          supabase.from('subjects').select('*'),
          supabase.from('subject_classifications').select('*')
        ]);

        if (resBooks.error) throw resBooks.error;
        if (resTrackers.error) throw resTrackers.error;
        if (resLogs.error) throw resLogs.error;
        if (resSubjects.error) throw resSubjects.error;
        if (resClassifications.error) throw resClassifications.error;

        setBooks(resBooks.data || []);
        setBookTrackers(resTrackers.data || []);
        setLessonLogs(resLogs.data || []);
        setSubjects(resSubjects.data || []);
        setClassifications(resClassifications.data || []);

        const activeBookIds = [
          ...new Set([
            ...(resTrackers.data || []).map(t => String(t.book_id)),
            ...(resLogs.data || []).map(l => {
              const book = (resBooks.data || []).find(b => {
                // We don't have book_id on lesson log, but we can resolve it.
                return false;
              });
              return null;
            }).filter(Boolean)
          ])
        ].map(Number);

        let lessonsData = [];
        if (activeBookIds.length > 0) {
          const { data: resSyllabus, error: resSyllabusErr } = await supabase
            .from('syllabus_book_lessons')
            .select('*')
            .in('book_id', activeBookIds);
          if (resSyllabusErr) throw resSyllabusErr;
          lessonsData = resSyllabus || [];
        }
        setSyllabusData(lessonsData);

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

  const renderParentDailyActivity = () => {
    const filteredItems = getFilteredItems();
    const mappedEntries = filteredItems.map((item) => {
      const log = lessonLogs.find((l) => l.id === item.lt_log_id);
      const lesson = syllabusData.find((s) => String(s.id) === String(log?.lesson_id));
      const book = books.find((b) => String(b.id) === String(lesson?.book_id));
      const subject = subjects.find((s) => String(s.id) === String(book?.subject_id));
      const lessonPath = [lesson?.level1, lesson?.level2, lesson?.level3].filter(Boolean).join(' ➔ ');
      return {
        id: item.id,
        date: item.date,
        subjectName: subject?.name || '—',
        bookName: book?.name || '—',
        teacherName: item.teacher?.name || '—',
        lessonPath: lessonPath || '—',
        status: log?.current_status || 'not_started',
        isRevision: item.is_revision === 'Y',
        progress: item.progress,
        comments: item.comments,
      };
    });

    return (
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden space-y-4 p-4 text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-light-border text-dark-muted font-extrabold text-[10px] uppercase tracking-wider whitespace-nowrap">
                <th className="px-4 py-3 min-w-[90px]">Date</th>
                <th className="px-4 py-3 min-w-[90px]">Subject</th>
                <th className="px-4 py-3 min-w-[110px]">Book</th>
                <th className="px-4 py-3 min-w-[115px]">Teacher</th>
                <th className="px-4 py-3 min-w-[140px]">Topic / Path</th>
                <th className="px-4 py-3 min-w-[95px]">Status</th>
                <th className="px-4 py-3 min-w-[70px]">Progress</th>
                <th className="px-4 py-3 min-w-[140px]">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
              {mappedEntries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-400 font-semibold">
                    No teaching activity logged for this period.
                  </td>
                </tr>
              ) : (
                mappedEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/40">
                    <td className="px-4 py-3 text-dark-primary whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                      {entry.subjectName}
                    </td>
                    <td className="px-4 py-3 font-bold text-dark-primary whitespace-nowrap">
                      {entry.bookName}
                    </td>
                    <td className="px-4 py-3 text-blue-600 font-extrabold whitespace-nowrap">
                      {entry.teacherName}
                    </td>
                    <td
                      className="px-4 py-3 font-semibold text-gray-600 max-w-[250px] truncate whitespace-nowrap"
                      title={entry.lessonPath}
                    >
                      {entry.lessonPath}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(entry.status)}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                      {entry.isRevision ? '—' : `${Number(entry.progress).toFixed(0)}%`}
                    </td>
                    <td
                      className="px-4 py-3 text-gray-500 max-w-[200px] truncate whitespace-nowrap"
                      title={entry.comments || ''}
                    >
                      {entry.comments || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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
        Loading Syllabus Progress...
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
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4 text-left">
        <div>
          <h1 className="text-2xl font-black text-dark-primary flex items-center gap-2">
            Syllabus Progress — {student?.name || student?.student_name || 'Student'}
          </h1>
          <p className="text-xs font-bold text-dark-soft mt-1">
            Class: <span className="text-brand-primary uppercase">{className}</span>
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center border-b mb-6 pb-2 flex-wrap gap-4">
        <div className="flex gap-2">
          {[
            { key: 'class-progress', label: 'Class Progress', icon: 'fa-chart-pie' },
            { key: 'daily-activity', label: "Today's Class", icon: 'fa-list-check' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveSubTab(tab.key);
                setExpandedBookId(null);
              }}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
                activeSubTab === tab.key
                  ? 'bg-brand-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}
            >
              <i className={`fas ${tab.icon} text-xs`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Time filters tabs */}
        <div className="flex bg-white p-0.5 rounded-lg border border-light-border shadow-sm h-8 items-center gap-0.5">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'till_date', label: 'Till Date' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeFilter(tab.id)}
              className={`px-3 py-1 rounded-md text-[10px] font-extrabold transition-all h-full ${
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
        <>
          {activeSubTab === 'class-progress' && (
            <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {activeBooks.map((book) => {
              const bt = bookTrackers.find((t) => String(t.book_id) === String(book.id));
              const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
              const isExpanded = expandedBookId === book.id;

              // Resolve all book lessons (leaves)
              const bookLessons = syllabusData.filter((d) => String(d.book_id) === String(book.id));
              const activeBookLessons = bookLessons.filter((n) => {
                if (n.level3) return true;
                if (n.level2 && !n.level3) {
                  const hasL3 = bookLessons.some(
                    (o) => o.level1 === n.level1 && (o.level2 || 'General') === n.level2 && o.level3
                  );
                  return !hasL3;
                }
                if (n.level1 && !n.level2 && !n.level3) {
                  const hasL2orL3 = bookLessons.some((o) => o.level1 === n.level1 && (o.level2 || o.level3));
                  return !hasL2orL3;
                }
                return false;
              });
              const bookLogs = lessonLogs.filter((l) =>
                activeBookLessons.some((bl) => String(bl.id) === String(l.lesson_id))
              );

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
                pct = bt ? Number(bt.completion_percentage) : 0;
              } else {
                const activeLogIds = filteredItems.map((item) => item.lt_log_id);
                const activeLogs = bookLogs.filter((l) => activeLogIds.includes(l.id));
                completed = activeLogs.filter((l) => l.current_status === 'completed').length;
                inProgress = activeLogs.filter((l) => l.current_status === 'in_progress').length;
                notStarted = total - completed - inProgress;
                pct = total > 0 ? (completed / total) * 100 : 0;
              }

              const revisionCount = bookLogs.reduce((sum, log) => sum + (log.revision_counter || 0), 0);

              const pctColor = pct >= 70 ? 'text-emerald-600' : pct >= 30 ? 'text-amber-600' : 'text-red-500';
              const pctBg =
                pct >= 70
                  ? 'bg-emerald-50 border-emerald-200'
                  : pct >= 30
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-red-50 border-red-200';
              const barColor = pct >= 70 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444';

              const classificationId = subj?.classification_id;
              const classification = classifications.find((c) => String(c.id) === String(classificationId));
              const themeStyles =
                classification?.theme && CARD_THEMES[classification.theme]
                  ? CARD_THEMES[classification.theme]
                  : CARD_THEMES.charcoal;

              return (
                <div
                  key={book.id}
                  onClick={() => setExpandedBookId(isExpanded ? null : book.id)}
                  className={`p-4 border border-light-border border-l-[6px] rounded-2xl shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] flex flex-col justify-between ${
                    isExpanded
                      ? 'ring-2 ring-brand-primary/40 bg-brand-primary/5 border-brand-primary/30'
                      : 'bg-white'
                  } border-l-${themeStyles.color}`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 text-left">
                        {subj && (
                          <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{subj.name}</h3>
                        )}
                        <h4 className="text-xs font-black text-dark-primary truncate mt-0.5" title={book.name}>
                          {book.name}
                        </h4>
                      </div>
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl border ${pctBg} shrink-0 ml-2`}>
                        <span className={`text-xs font-black ${pctColor}`}>
                          {Number(pct).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-bold border-t pt-2 mt-auto">
                    <div className="flex justify-between text-emerald-600">
                      <span>Completed:</span>
                      <span>{completed}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>In-progress:</span>
                      <span>{inProgress}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Not Started:</span>
                      <span>{notStarted}</span>
                    </div>
                    <div className="flex justify-between text-purple-600">
                      <span>Revisions:</span>
                      <span>{revisionCount}</span>
                    </div>
                    <div className="flex justify-between text-dark-muted col-span-2 border-t border-dashed pt-1 mt-1">
                      <span>Total Lessons:</span>
                      <span>{total}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expanded Book Details */}
          {expandedBookId && (
            <div className="bg-white border rounded-2xl shadow-sm p-5 text-left">
              {(() => {
                const book = books.find((b) => b.id === expandedBookId);
                if (!book) return null;

                // Resolve all book lessons (leaves)
                const bookLessons = syllabusData.filter((d) => String(d.book_id) === String(book.id));
                const activeBookLessons = bookLessons.filter((n) => {
                  if (n.level3) return true;
                  if (n.level2 && !n.level3) {
                    const hasL3 = bookLessons.some(
                      (o) => o.level1 === n.level1 && (o.level2 || 'General') === n.level2 && o.level3
                    );
                    return !hasL3;
                  }
                  if (n.level1 && !n.level2 && !n.level3) {
                    const hasL2orL3 = bookLessons.some((o) => o.level1 === n.level1 && (o.level2 || o.level3));
                    return !hasL2orL3;
                  }
                  return false;
                });

                const bookLogs = lessonLogs.filter((l) =>
                  activeBookLessons.some((bl) => String(bl.id) === String(l.lesson_id))
                );

                // Level 1 Unit progress cards
                const uniqueLevel1s = [...new Set(activeBookLessons.map((l) => l.level1).filter(Boolean))];

                // Filtered lessons list
                const lessonsToRender = showNotStarted
                  ? activeBookLessons.filter((node) => {
                      const log = bookLogs.find((l) => String(l.lesson_id) === String(node.id));
                      const isNotStarted = !log || log.current_status === 'not_started';
                      if (isNotStarted) {
                        const isRev = [node.level1, node.level2, node.level3]
                          .filter(Boolean)
                          .some(
                            (lvl) =>
                              lvl.toLowerCase().includes('_revision') || lvl.toLowerCase() === 'revision'
                          );
                        return !isRev;
                      }
                      return true;
                    })
                  : activeBookLessons.filter((node) => {
                      const log = bookLogs.find((l) => String(l.lesson_id) === String(node.id));
                      return log && log.current_status !== 'not_started';
                    });

                return (
                  <>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2 border-b pb-2">
                      <h3 className="text-sm font-black text-dark-primary">
                        {book.name} — Lesson Details
                      </h3>
                    </div>

                    {/* Level-1 Progress Breakdown */}
                    <div className="mb-6">
                      <h4 className="text-[10px] font-extrabold text-dark-soft uppercase tracking-wider mb-3">
                        Level-1 Unit Progress
                      </h4>
                      {uniqueLevel1s.length === 0 ? (
                        <p className="text-xs text-gray-400 font-semibold">
                          No level-1 sections defined for this book.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {uniqueLevel1s.map((lvl1) => {
                            const lvl1Lessons = activeBookLessons.filter((l) => l.level1 === lvl1);
                            const lvl1Total = lvl1Lessons.length;

                            let completedCount = 0;
                            let inProgressCount = 0;
                            let totalProgressSum = 0;

                            lvl1Lessons.forEach((lesson) => {
                              const log = bookLogs.find((l) => String(l.lesson_id) === String(lesson.id));
                              if (log) {
                                if (log.current_status === 'completed') {
                                  completedCount++;
                                  totalProgressSum += 100;
                                } else if (log.current_status === 'in_progress') {
                                  inProgressCount++;
                                  totalProgressSum += Number(log.completion_percentage) || 0;
                                }
                              }
                            });

                            const progressPct = lvl1Total > 0 ? totalProgressSum / lvl1Total : 0;
                            const barColor =
                              progressPct >= 70 ? '#10b981' : progressPct >= 30 ? '#f59e0b' : '#ef4444';

                            return (
                              <div
                                key={lvl1}
                                className="p-3 border border-light-border rounded-xl bg-gray-50/50 flex flex-col justify-between shadow-sm"
                              >
                                <div className="flex items-start justify-between mb-2 gap-2">
                                  <span className="text-xs font-black text-dark-primary truncate" title={lvl1}>
                                    {lvl1}
                                  </span>
                                  <span className="text-xs font-black text-dark-deepblue shrink-0">
                                    {progressPct.toFixed(0)}%
                                  </span>
                                </div>
                                <div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="h-1.5 rounded-full transition-all duration-300"
                                      style={{ width: `${progressPct}%`, backgroundColor: barColor }}
                                    />
                                  </div>
                                  <p className="text-[9px] text-gray-500 font-bold mt-1.5 flex items-center justify-between">
                                    <span>
                                      {lvl1Total} {lvl1Total === 1 ? 'Lesson' : 'Lessons'}
                                    </span>
                                    <span className="text-dark-soft">
                                      {completedCount} ✓ / {inProgressCount} ◔
                                    </span>
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Lessons Coverage Tracker */}
                    <div className="bg-white rounded-2xl border border-light-border overflow-hidden mt-6">
                      <div className="p-4 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                        <h3 className="font-extrabold text-sm text-dark-primary">
                          Lessons Coverage Tracker
                        </h3>
                        <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl cursor-pointer text-xs font-bold text-gray-700 select-none hover:bg-gray-50 transition-colors shadow-sm">
                          <input
                            type="checkbox"
                            checked={showNotStarted}
                            onChange={(e) => setShowNotStarted(e.target.checked)}
                            className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                          />
                          Show Not Started Lessons
                        </label>
                      </div>
                      <div className="p-4 space-y-3">
                        {lessonsToRender.length === 0 ? (
                          <p className="text-xs text-gray-400 font-semibold py-4 text-center">
                            {showNotStarted
                              ? 'No lessons found for this book.'
                              : "No active (completed/in-progress) lessons. Check 'Show Not Started Lessons' to view all."}
                          </p>
                        ) : (
                          lessonsToRender.map((node) => {
                            const log = bookLogs.find((l) => String(l.lesson_id) === String(node.id));
                            const status = log?.current_status || 'not_started';
                            const progressPct = log ? Number(log.completion_percentage).toFixed(0) : 0;
                            const lessonTitle = node.level3 || node.level2 || node.level1;

                            // Get log items history
                            const itemHistory = log ? filteredItems.filter((item) => item.lt_log_id === log.id) : [];

                            return (
                              <div
                                key={node.id}
                                className="p-3 border border-gray-100 rounded-lg hover:border-brand-primary/20 transition-colors bg-white"
                              >
                                <div className="flex justify-between items-center gap-4 flex-wrap sm:flex-nowrap">
                                  <div className="text-left">
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

                                {itemHistory.length > 0 && itemHistory[0].comments && (
                                  <div className="mt-2 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-dashed border-gray-200 text-left">
                                    <strong className="text-dark-soft">Teacher Comment:</strong>{' '}
                                    {itemHistory[0].comments}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'daily-activity' && renderParentDailyActivity()}
    </>
  )}
    </div>
  );
};

export default ParentSyllabusView;
