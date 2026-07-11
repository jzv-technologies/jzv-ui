import React from 'react';

const CARD_THEMES = {
  emerald: { color: 'emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  blue: { color: 'blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  purple: { color: 'purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
  indigo: { color: 'indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50' },
  rose: { color: 'rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
  amber: { color: 'amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  orange: { color: 'orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
  teal: { color: 'teal-500', text: 'text-teal-700', bg: 'bg-teal-50' },
  cyan: { color: 'cyan-500', text: 'text-cyan-700', bg: 'bg-cyan-50' },
  pink: { color: 'pink-500', text: 'text-pink-700', bg: 'bg-pink-50' },
  sky: { color: 'sky-500', text: 'text-sky-700', bg: 'bg-sky-50' },
  violet: { color: 'violet-500', text: 'text-violet-700', bg: 'bg-violet-50' },
  fuchsia: { color: 'fuchsia-500', text: 'text-fuchsia-700', bg: 'bg-fuchsia-50' },
  charcoal: { color: 'gray-700', text: 'text-gray-700', bg: 'bg-gray-50' },
};

const getStatusBadge = (status, isRev = false) => {
  if (isRev)
    return (
      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">
        Revision
      </span>
    );
  if (status === 'completed')
    return (
      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
        Completed
      </span>
    );
  if (status === 'in_progress')
    return (
      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
        In Progress
      </span>
    );
  return (
    <span className="bg-gray-150 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border">
      Not Started
    </span>
  );
};

const SyllabusProgressGrid = ({
  role,
  student,
  classesToRender,
  books,
  bookClasses,
  subjects,
  classifications,
  allTrackers,
  allLogs,
  allLessons,
  cpGroupingMode,
  progressExpandedBook,
  progressExpandedClass,
  handleProgressBookClick,
  progressLoading, // details/progress spinner loading state
  progressBookLessons,
  progressBookLogs,
  showNotStarted,
  setShowNotStarted,
  expandedLogIds = {},
  toggleLogExpand,
  logItemsMap = {},
  handleDeleteClick,
}) => {
  
  // Sub-renderer for expanded lessons checklist
  const renderExpandedDetails = () => {
    return (
      <div className="bg-gray-50/50 border border-dashed rounded-2xl p-5 mt-4 text-left">
        {progressLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-xs font-bold text-gray-500">Loading lessons...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-black text-dark-primary">
                {books.find((b) => String(b.id) === String(progressExpandedBook))?.name} — Lesson Details
              </h3>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showNotStarted}
                  onChange={(e) => setShowNotStarted(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                />
                Show Not Started Lessons
              </label>
            </div>

            {/* Level-1 Progress Breakdown */}
            <div className="mb-6 border-b border-light-border pb-6">
              <h4 className="text-[10px] font-extrabold text-dark-soft uppercase tracking-wider mb-3">
                Level-1 Unit Progress
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(() => {
                  const uniqueLevel1s = [
                    ...new Set(progressBookLessons.map((l) => l.level1).filter(Boolean)),
                  ];
                  if (uniqueLevel1s.length === 0) {
                    return (
                      <p className="text-xs text-gray-400 font-semibold col-span-full">
                        No level-1 sections defined for this book.
                      </p>
                    );
                  }

                  return uniqueLevel1s.map((lvl1) => {
                    const lvl1Lessons = progressBookLessons.filter((l) => l.level1 === lvl1);
                    const total = lvl1Lessons.length;

                    let completedCount = 0;
                    let inProgressCount = 0;
                    let totalProgressSum = 0;
                    let cumulativeDaysTaken = 0;

                    lvl1Lessons.forEach((lesson) => {
                      const log = progressBookLogs.find(
                        (l) => String(l.lesson_id) === String(lesson.id)
                      );
                      if (log) {
                        if (log.days_taken) {
                          cumulativeDaysTaken += Number(log.days_taken);
                        }
                        if (log.current_status === 'completed') {
                          completedCount++;
                          totalProgressSum += 100;
                        } else if (log.current_status === 'in_progress') {
                          inProgressCount++;
                          totalProgressSum += Number(log.completion_percentage) || 0;
                        }
                      }
                    });

                    const progressPct = total > 0 ? totalProgressSum / total : 0;
                    const barColor =
                      progressPct >= 70 ? '#10b981' : progressPct >= 30 ? '#f59e0b' : '#ef4444';

                    return (
                      <div
                        key={lvl1}
                        className="bg-white border rounded-xl p-3 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-1.5 gap-2">
                            <span className="font-extrabold text-xs text-dark-primary truncate flex-1">
                              {lvl1}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border whitespace-nowrap">
                                {cumulativeDaysTaken} Days
                              </span>
                              <span className="font-black text-xs text-dark-soft">
                                {progressPct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1 mb-2">
                            <div
                              className="h-1 rounded-full transition-all duration-300"
                              style={{ width: `${progressPct}%`, backgroundColor: barColor }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mt-1 border-t pt-1.5 flex-wrap gap-1">
                          <span>
                            Completed: {completedCount}/{total}
                          </span>
                          {inProgressCount > 0 && (
                            <span className="text-blue-600">In-progress: {inProgressCount}</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Detailed lessons list */}
            <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-dark-soft font-extrabold text-[10px] uppercase tracking-wider">
                    <th className="pb-2.5 font-extrabold text-left min-w-[200px]">
                      Lesson Details
                    </th>
                    <th className="pb-2.5 font-extrabold text-center min-w-[80px]">Progress</th>
                    <th className="pb-2.5 font-extrabold text-center min-w-[85px]">Days Taken</th>
                    <th className="pb-2.5 font-extrabold text-center min-w-[90px]">Status</th>
                    <th className="pb-2.5 font-extrabold text-right min-w-[90px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    const lessonsToRender = showNotStarted
                      ? progressBookLessons.filter((node) => {
                          const log = progressBookLogs.find(
                            (l) => String(l.lesson_id) === String(node.id)
                          );
                          const isNotStarted = !log || log.current_status === 'not_started';
                          if (isNotStarted) {
                            const isRev = [node.level1, node.level2, node.level3]
                              .filter(Boolean)
                              .some(
                                (lvl) =>
                                  lvl.toLowerCase().includes('_revision') ||
                                  lvl.toLowerCase() === 'revision'
                              );
                            return !isRev;
                          }
                          return true;
                        })
                      : progressBookLessons.filter((node) => {
                          const log = progressBookLogs.find(
                            (l) => String(l.lesson_id) === String(node.id)
                          );
                          return log && log.current_status !== 'not_started';
                        });

                    if (lessonsToRender.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-xs text-gray-400 font-semibold py-8 text-center"
                          >
                            {showNotStarted
                              ? 'No lessons found for this book.'
                              : "No active (completed/in-progress) lessons. Check 'Show Not Started Lessons' to view all."}
                          </td>
                        </tr>
                      );
                    }

                    const currentBookObj = books.find((b) => String(b.id) === String(progressExpandedBook));

                    return lessonsToRender.map((node) => {
                      const log = progressBookLogs.find(
                        (l) => String(l.lesson_id) === String(node.id)
                      );
                      const status = log?.current_status || 'not_started';
                      const title = [node.level1, node.level2, node.level3]
                        .filter(Boolean)
                        .join(' > ');
                      const isLogExpanded = log && expandedLogIds[log.id];

                      return (
                        <React.Fragment key={node.id}>
                          <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 pr-2">
                              <div className="font-bold text-dark-primary text-xs">{title}</div>
                              {log && (
                                <div className="flex items-center gap-2 mt-1 flex-wrap text-[9px] text-gray-400 font-bold">
                                  <span>
                                    Started:{' '}
                                    {log.start_date
                                      ? new Date(log.start_date).toLocaleDateString()
                                      : '—'}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                  {log.completion_percentage === 100 || status === 'completed' ? (
                                    <span>
                                      Ended:{' '}
                                      {log.end_date
                                        ? new Date(log.end_date).toLocaleDateString()
                                        : '—'}
                                    </span>
                                  ) : (
                                    <span>
                                      Last Updated:{' '}
                                      {log.updated_at
                                        ? new Date(log.updated_at).toLocaleDateString()
                                        : '—'}
                                    </span>
                                  )}
                                  {log.revision_counter > 0 && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                      <span className="text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-100">
                                        Revisions: {log.revision_counter}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              {log ? (
                                <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded border">
                                  {Number(log.completion_percentage).toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              {log ? (
                                <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded border">
                                  {log.days_taken || 0}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <div className="mt-1">{getStatusBadge(status)}</div>
                            </td>
                            <td className="py-3 pl-2 text-right">
                              {log && (
                                <button
                                  onClick={() => toggleLogExpand(log.id)}
                                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer border"
                                >
                                  <i
                                    className={`fas fa-${isLogExpanded ? 'eye-slash' : 'eye'} mr-1`}
                                  ></i>
                                  {isLogExpanded ? 'Hide' : 'View'}
                                </button>
                              )}
                            </td>
                          </tr>
                          {isLogExpanded && log && (
                            <tr>
                              <td colSpan={5} className="pb-3 bg-gray-50/50">
                                <div className="mt-2 space-y-2 border-t border-dashed pt-3 pl-4">
                                  <p className="text-[9px] font-extrabold text-dark-soft uppercase tracking-wider mb-2">
                                    Logged Daily Entries
                                  </p>
                                  {!logItemsMap[log.id] ? (
                                    <div className="flex items-center text-[10px] text-gray-400 font-bold">
                                      <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mr-1.5"></div>
                                      Loading details...
                                    </div>
                                  ) : logItemsMap[log.id].length === 0 ? (
                                    <p className="text-[10px] text-gray-400 font-semibold">
                                      No daily entries found.
                                    </p>
                                  ) : (
                                    logItemsMap[log.id].map((item) => (
                                      <div
                                        key={item.id}
                                        className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-semibold text-gray-600 flex justify-between items-start gap-4"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-bold text-dark-primary">
                                              {new Date(item.date).toLocaleDateString()}
                                            </span>
                                            {getStatusBadge(item.current_status)}
                                            <span className="text-gray-500 font-bold">
                                              {Number(item.progress).toFixed(0)}%
                                            </span>
                                            {item.teacher?.name && (
                                              <span className="text-gray-400 font-bold">
                                                by {item.teacher.name}
                                              </span>
                                            )}
                                            {item.is_revision === 'Y' && (
                                              <span className="text-purple-600 font-black bg-purple-50 px-1 py-0.5 rounded border border-purple-100 text-[8px] uppercase tracking-wider">
                                                Revision
                                              </span>
                                            )}
                                            {item.late_reporting === 'Y' && (
                                              <span className="text-red-600 font-black bg-red-50 px-1 py-0.5 rounded border border-red-100 text-[8px] uppercase tracking-wider">
                                                Late Reporting
                                              </span>
                                            )}
                                          </div>
                                          {item.comments && (
                                            <p className="text-dark-soft mt-1 bg-white p-1.5 border rounded-md">
                                              {item.comments}
                                            </p>
                                          )}
                                        </div>
                                        {role !== 'parent' && handleDeleteClick && (
                                          <button
                                            onClick={() =>
                                              handleDeleteClick(item, log, node, currentBookObj)
                                            }
                                            className="p-1 text-red-primary hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                                            title="Delete Log Entry"
                                          >
                                            <i className="fas fa-trash-alt text-[10px]"></i>
                                          </button>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderBooksGrid = (classObj, classBooks) => {
    if (classBooks.length === 0) {
      return (
        <div className="p-8 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          No syllabus books found for this class.
        </div>
      );
    }

    // Group books within this class
    const booksByGroup = {};
    if (cpGroupingMode === 'classification') {
      classBooks.forEach((book) => {
        const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
        const classificationId = subj?.classification_id;
        const classification = classifications.find(
          (cl) => String(cl.id) === String(classificationId)
        );
        const groupName = classification ? classification.name : 'Other / Unclassified';
        if (!booksByGroup[groupName]) {
          booksByGroup[groupName] = [];
        }
        booksByGroup[groupName].push(book);
      });
    } else if (cpGroupingMode === 'subject') {
      classBooks.forEach((book) => {
        const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
        const groupName = subj ? subj.name : 'General / Unclassified';
        if (!booksByGroup[groupName]) {
          booksByGroup[groupName] = [];
        }
        booksByGroup[groupName].push(book);
      });
    } else {
      booksByGroup['All Books'] = classBooks;
    }

    const isClassExpanded = progressExpandedClass === classObj.id;

    return (
      <div className="space-y-6">
        {Object.keys(booksByGroup).map((groupName) => {
          const groupedBooks = booksByGroup[groupName];
          return (
            <div key={groupName} className="space-y-3 text-left">
              {cpGroupingMode !== 'none' && (
                <h4 className="text-xs font-black text-dark-soft border-l-[3px] border-brand-primary pl-2 uppercase tracking-wider">
                  {groupName}
                </h4>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupedBooks.map((book) => {
                  const bt = allTrackers.find(
                    (t) =>
                      String(t.book_id) === String(book.id) &&
                      String(t.class_id) === String(classObj.id)
                  );
                  const pct = Number(bt?.completion_percentage || 0);
                  const isExpanded =
                    progressExpandedBook === book.id && progressExpandedClass === classObj.id;
                  const pctColor =
                    pct >= 70
                      ? 'text-emerald-600'
                      : pct >= 30
                        ? 'text-amber-600'
                        : 'text-red-500';
                  const pctBg =
                    pct >= 70
                      ? 'bg-emerald-50 border-emerald-200'
                      : pct >= 30
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-red-50 border-red-200';
                  const barColor = pct >= 70 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444';

                  const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
                  const classificationId = subj?.classification_id;
                  const classification = classifications.find(
                    (cl) => String(cl.id) === String(classificationId)
                  );
                  const themeStyles =
                    classification?.theme && CARD_THEMES[classification.theme]
                      ? CARD_THEMES[classification.theme]
                      : CARD_THEMES.charcoal;

                  // Compute lesson counts dynamically for revisions count
                  const bookLessons = allLessons.filter(
                    (l) => String(l.book_id) === String(book.id)
                  );
                  const bookLessonIds = bookLessons.map((l) => String(l.id));
                  const bookLogs = allLogs.filter(
                    (log) =>
                      String(log.class_id) === String(classObj.id) &&
                      bookLessonIds.includes(String(log.lesson_id))
                  );
                  const revisionCount = bookLogs.reduce(
                    (sum, log) => sum + (log.revision_counter || 0),
                    0
                  );

                  const activeBookLogs = bookLogs.filter(
                    (log) => log.current_status !== 'not_started'
                  );

                  let bookStartDate = null;
                  activeBookLogs.forEach((log) => {
                    if (log.start_date) {
                      if (
                        !bookStartDate ||
                        new Date(log.start_date) < new Date(bookStartDate)
                      ) {
                        bookStartDate = log.start_date;
                      }
                    }
                  });

                  let bookEndDate = null;
                  activeBookLogs.forEach((log) => {
                    if (log.end_date) {
                      if (!bookEndDate || new Date(log.end_date) > new Date(bookEndDate)) {
                        bookEndDate = log.end_date;
                      }
                    }
                  });

                  let bookUpdatedAt = null;
                  bookLogs.forEach((log) => {
                    if (log.updated_at) {
                      if (
                        !bookUpdatedAt ||
                        new Date(log.updated_at) > new Date(bookUpdatedAt)
                      ) {
                        bookUpdatedAt = log.updated_at;
                      }
                    }
                  });

                  const cumulativeDaysTaken = bookLogs.reduce(
                    (sum, log) => sum + (log.days_taken || 0),
                    0
                  );

                  const total = bt?.total_lessons || bookLessons.length;
                  const completed = bt?.completed || 0;
                  const inProgress = bt?.in_progress || 0;
                  const notStarted = bt?.not_started || 0;

                  return (
                    <div
                      key={book.id}
                      onClick={() => handleProgressBookClick(book.id, classObj.id)}
                      className={`p-4 border border-light-border border-l-[6px] rounded-2xl shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] flex flex-col justify-between ${
                        isExpanded
                          ? 'ring-2 ring-brand-primary/40 bg-brand-primary/5 border-brand-primary/30'
                          : 'bg-white'
                      } border-l-${themeStyles.color}`}
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            {subj && (
                              <h3 className=" font-semibold text-gray-500 mt-0.5">
                                {subj.name}
                              </h3>
                            )}
                            <h4 className="text-sm font-black text-dark-primary truncate">
                              {book.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded border whitespace-nowrap">
                              {cumulativeDaysTaken} Days
                            </span>
                            <div
                              className={`flex items-center justify-center w-12 h-12 rounded-xl border ${pctBg}`}
                            >
                              <span className={`text-sm font-black ${pctColor}`}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-bold border-t pt-2 mt-auto">
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
                          <span>Revision Days:</span>
                          <span>{revisionCount}</span>
                        </div>

                        <div className="flex justify-between text-dark-muted border-t border-dashed pt-1.5 mt-0.5 col-span-2">
                          <span>Total Lessons:</span>
                          <span>{total}</span>
                        </div>
                        <div className="border-t border-dashed pt-2 mt-1.5 text-[9px] text-gray-500 font-bold col-span-2 space-y-0.5">
                          <div className="flex justify-between">
                            <span>
                              Started:{' '}
                              {bookStartDate ? new Date(bookStartDate).toLocaleDateString() : '—'}
                            </span>
                            {pct === 100 ? (
                              <span>
                                Ended:{' '}
                                {bookEndDate ? new Date(bookEndDate).toLocaleDateString() : '—'}
                              </span>
                            ) : (
                              <span>
                                Updated:{' '}
                                {bookUpdatedAt
                                  ? new Date(bookUpdatedAt).toLocaleDateString()
                                  : '—'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Expanded details container for this class */}
        {isClassExpanded && progressExpandedBook && renderExpandedDetails()}
      </div>
    );
  };

  if (role === 'parent') {
    const parentClass = classesToRender.find((c) => String(c.id) === String(student?.class_id));
    if (!parentClass) return null;
    const classBookIds = bookClasses
      .filter((bc) => String(bc.class_id) === String(parentClass.id))
      .map((bc) => String(bc.book_id));
    const classBooks = books.filter((fb) => classBookIds.includes(String(fb.id)));
    return renderBooksGrid(parentClass, classBooks);
  }

  return (
    <div className="space-y-6">
      {classesToRender.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          No matching classes/books progress found.
        </div>
      ) : (
        classesToRender.map((c) => {
          const classBookIds = bookClasses
            .filter((bc) => String(bc.class_id) === String(c.id))
            .map((bc) => String(bc.book_id));
          const classBooks = books.filter((fb) => classBookIds.includes(String(fb.id)));
          if (classBooks.length === 0) return null;

          return (
            <div
              key={c.id}
              className="bg-white border border-light-border rounded-2xl shadow-sm overflow-hidden p-6 space-y-4 text-left"
            >
              <h3 className="text-base font-black text-dark-primary border-b pb-2 flex items-center gap-2">
                <i className="fas fa-graduation-cap text-brand-primary"></i>
                {c.name || c.class_name}
              </h3>
              {renderBooksGrid(c, classBooks)}
            </div>
          );
        })
      )}
    </div>
  );
};

export default SyllabusProgressGrid;
