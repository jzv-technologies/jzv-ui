import React from 'react';
import { CARD_THEMES } from '../../../utils/cardTheme';

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
  cpFilterBooks = [],
  cpFilterSubjects = [],
  cpFilterClassifications = [],
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
  
  const [selectedLevel1, setSelectedLevel1] = React.useState('all');
  const detailsRef = React.useRef(null);

  React.useEffect(() => {
    setSelectedLevel1('all');
  }, [progressExpandedBook]);

  React.useEffect(() => {
    if (progressExpandedBook && detailsRef.current) {
      setTimeout(() => {
        detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [progressExpandedBook]);


  // Middle Panel: Level-1 progress breakdown list
  const renderLevel1Panel = (classObj) => {
    const uniqueLevel1s = [
      ...new Set(progressBookLessons.map((l) => l.level1).filter(Boolean)),
    ];

    // Compute book-level stats for the "All Units" selection card
    const totalBookLessons = progressBookLessons.length;
    let bookCompletedCount = 0;
    let bookInProgressCount = 0;
    let bookProgressSum = 0;
    let bookCumulativeDaysTaken = 0;

    progressBookLessons.forEach((lesson) => {
      const log = progressBookLogs.find((l) => String(l.lesson_id) === String(lesson.id));
      if (log) {
        if (log.days_taken) {
          bookCumulativeDaysTaken += Number(log.days_taken);
        }
        if (log.current_status === 'completed') {
          bookCompletedCount++;
          bookProgressSum += 100;
        } else if (log.current_status === 'in_progress') {
          bookInProgressCount++;
          bookProgressSum += Number(log.completion_percentage) || 0;
        }
      }
    });

    const bookProgressPct = totalBookLessons > 0 ? bookProgressSum / totalBookLessons : 0;
    const bookBarColor = bookProgressPct >= 70 ? '#10b981' : bookProgressPct >= 30 ? '#f59e0b' : '#ef4444';

    return (
      <div className="w-full lg:w-[35%] bg-white border border-light-border rounded-2xl p-5 shadow-sm text-left flex flex-col gap-4 animate-slide-in-left">
        <div>
          <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
            <i className="fas fa-list-ul text-brand-primary"></i>
            Level-1 Unit Progress
          </h3>
          <p className="text-[11px] font-medium text-gray-400 mt-0.5">
            Select a Unit to filter details, or click "All Level 1 Units".
          </p>
        </div>

        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
          {/* Card: All Level 1 Units */}
          <div
            onClick={() => setSelectedLevel1('all')}
            className={`p-3 border rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-[0.98] flex flex-col justify-between ${
              selectedLevel1 === 'all'
                ? 'ring-2 ring-brand-primary bg-brand-primary/5 border-brand-primary/30 shadow-md shadow-brand-primary/5'
                : 'bg-white hover:bg-gray-50/50'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-1.5 gap-2">
                <span className="font-extrabold text-xs text-dark-primary flex items-center gap-1.5">
                  <i className="fas fa-layer-group text-[10px] text-gray-400"></i>
                  All Level 1 Units
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded border whitespace-nowrap">
                    {bookCumulativeDaysTaken} Days
                  </span>
                  <span className="font-black text-xs text-dark-soft">
                    {bookProgressPct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mb-2">
                <div
                  className="h-1 rounded-full transition-all duration-300"
                  style={{ width: `${bookProgressPct}%`, backgroundColor: bookBarColor }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mt-1 border-t pt-1.5 flex-wrap gap-1">
              <span>
                Completed: {bookCompletedCount}/{totalBookLessons}
              </span>
              {bookInProgressCount > 0 && (
                <span className="text-blue-600">In-progress: {bookInProgressCount}</span>
              )}
            </div>
          </div>

          {/* Individual Level 1 Unit Cards */}
          {uniqueLevel1s.length === 0 ? (
            <p className="text-xs text-gray-400 font-semibold py-4 text-center">
              No level-1 sections defined for this book.
            </p>
          ) : (
            uniqueLevel1s.map((lvl1) => {
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

              const isSelected = selectedLevel1 === lvl1;

              return (
                <div
                  key={lvl1}
                  onClick={() => setSelectedLevel1(lvl1)}
                  className={`p-3 border rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-[0.98] flex flex-col justify-between ${
                    isSelected
                      ? 'ring-2 ring-brand-primary bg-brand-primary/5 border-brand-primary/30 shadow-md shadow-brand-primary/5'
                      : 'bg-white hover:bg-gray-50/50'
                  }`}
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
            })
          )}
        </div>
      </div>
    );
  };

  // Right Panel: Filtered detailed lessons table
  const renderLessonsDetailsPanel = () => {
    const bookObj = books.find((b) => String(b.id) === String(progressExpandedBook));
    const titleHeader = selectedLevel1 === 'all' ? 'All Level 1 Units' : selectedLevel1;

    return (
      <div className="flex-1 bg-white border border-light-border rounded-2xl p-5 shadow-sm text-left flex flex-col gap-4 animate-slide-in-right overflow-hidden w-full">
        {progressLoading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2 w-full">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-gray-500">Loading lessons...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2 border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-dark-primary truncate max-w-[280px]" title={bookObj?.name}>
                  {bookObj?.name}
                </h3>
                <p className="text-xs font-extrabold text-brand-primary mt-0.5 truncate max-w-[280px]" title={titleHeader}>
                  {titleHeader}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showNotStarted}
                  onChange={(e) => setShowNotStarted(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                />
                Show Not Started
              </label>
            </div>

            <div className="overflow-x-auto w-full">
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
                    const filteredByLvl1 = selectedLevel1 === 'all'
                      ? progressBookLessons
                      : progressBookLessons.filter((l) => l.level1 === selectedLevel1);

                    const lessonsToRender = showNotStarted
                      ? filteredByLvl1.filter((node) => {
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
                      : filteredByLvl1.filter((node) => {
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
                              ? 'No lessons found for this unit.'
                              : "No active lessons. Check 'Show Not Started' to view all."}
                          </td>
                        </tr>
                      );
                    }

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
                                      <span className="text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-100 font-bold">
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
                                              handleDeleteClick(item, log, node, bookObj)
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

  const renderSplitPanels = (classObj) => {
    return (
      <div className="flex-1 flex flex-col md:flex-row gap-6 w-full items-start">
        {renderLevel1Panel(classObj)}
        {renderLessonsDetailsPanel()}
      </div>
    );
  };


  const renderBooksGrid = (classObj, classBooks) => {
    // Apply Class Progress filters
    let filteredBooks = classBooks;

    if (cpFilterClassifications && cpFilterClassifications.length > 0) {
      filteredBooks = filteredBooks.filter((book) => {
        const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
        return subj && cpFilterClassifications.includes(String(subj.classification_id));
      });
    }

    if (cpFilterSubjects && cpFilterSubjects.length > 0) {
      filteredBooks = filteredBooks.filter((book) =>
        cpFilterSubjects.includes(String(book.subject_id))
      );
    }

    if (cpFilterBooks && cpFilterBooks.length > 0) {
      filteredBooks = filteredBooks.filter((book) =>
        cpFilterBooks.includes(String(book.id))
      );
    }

    if (filteredBooks.length === 0) {
      return (
        <div className="p-8 text-center bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          No syllabus books found for this class.
        </div>
      );
    }

    // Group books within this class
    const booksByGroup = {};
    if (cpGroupingMode === 'classification') {
      filteredBooks.forEach((book) => {
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
      filteredBooks.forEach((book) => {
        const subj = subjects.find((s) => String(s.id) === String(book.subject_id));
        const groupName = subj ? subj.name : 'General / Unclassified';
        if (!booksByGroup[groupName]) {
          booksByGroup[groupName] = [];
        }
        booksByGroup[groupName].push(book);
      });
    } else {
      booksByGroup['All Books'] = filteredBooks;
    }

    const isExpanded = progressExpandedClass === classObj.id && progressExpandedBook;

    const renderBookCard = (book, classObj) => {
      const bt = allTrackers.find(
        (t) =>
          String(t.book_id) === String(book.id) &&
          String(t.class_id) === String(classObj.id)
      );
      const pct = Number(bt?.completion_percentage || 0);
      const isBookSelected =
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
          className={`p-4 border border-light-border border-l-[6px] rounded-2xl shadow-sm cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-1 active:scale-[0.98] flex flex-col justify-between ${
            isBookSelected
              ? 'ring-2 ring-brand-primary bg-brand-primary/5 border-brand-primary/30 shadow-md shadow-brand-primary/5'
              : 'bg-white'
          } border-l-${themeStyles.color}`}
        >
          <div>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                {subj && (
                  <h3 className=" font-semibold text-gray-500 mt-0.5 block">
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
    };

    return (
      <div ref={isExpanded ? detailsRef : null} className="w-full">
        {/* Desktop View (lg and above) */}
        <div className="hidden lg:flex lg:flex-row gap-6 items-start w-full transition-all duration-500 ease-in-out">
          {/* Left Column: Books Grid / List */}
          <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'w-[25%] shrink-0' : 'w-full'}`}>
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
                    <div className={`grid gap-4 transition-all duration-500 ease-in-out ${
                      isExpanded
                        ? 'grid-cols-1'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    }`}>
                      {groupedBooks.map((book) => renderBookCard(book, classObj))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Level 1 Progress and Lesson Details split views */}
          {isExpanded && renderSplitPanels(classObj)}
        </div>

        {/* Mobile/Tablet View (below lg) */}
        <div className="lg:hidden w-full flex flex-col gap-6">
          {isExpanded ? (
            <div className="w-full flex flex-col gap-4 animate-slide-up">
              {/* Back Button */}
              <button
                onClick={() => handleProgressBookClick(progressExpandedBook, classObj.id)}
                className="flex items-center gap-1.5 text-xs font-black text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/15 px-3.5 py-2 rounded-xl active:scale-95 transition-all self-start border border-brand-primary/20 shadow-sm"
              >
                <i className="fas fa-arrow-left text-[10px]"></i>
                Back to Books
              </button>

              {/* Selected Book Card in Compact Mode */}
              <div className="w-full">
                {(() => {
                  const selectedBookObj = classBooks.find((b) => String(b.id) === String(progressExpandedBook));
                  return selectedBookObj ? renderBookCard(selectedBookObj, classObj) : null;
                })()}
              </div>

              {/* Split Panels: Level 1 and Details Stacked */}
              <div className="w-full flex flex-col gap-6">
                {renderLevel1Panel(classObj)}
                {renderLessonsDetailsPanel()}
              </div>
            </div>
          ) : (
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
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      {groupedBooks.map((book) => renderBookCard(book, classObj))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
