export const DEFAULT_WORKING_DAYS = 22;
export const DEFAULT_TEACHING_DAYS = 20;

const MONTH_LABELS = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec',
};

/**
 * Builds the ordered list of academic months from startMonth to endMonth.
 * Wraps around December→January if endMonth < startMonth (e.g. Jun→May).
 * Defaults to Jun–May (12 months) if not provided.
 */
export const buildAcademicMonths = (startMonth = 6, endMonth = 5) => {
  const s = typeof startMonth === 'object' ? Number(startMonth?.start_month || startMonth?.month || 6) : Number(startMonth);
  const e = typeof endMonth === 'object' ? Number(endMonth?.end_month || endMonth?.month || 5) : Number(endMonth);
  const cleanStart = Number.isFinite(s) && s >= 1 && s <= 12 ? s : 6;
  const cleanEnd = Number.isFinite(e) && e >= 1 && e <= 12 ? e : 5;

  const months = [];
  let m = cleanStart;
  for (let i = 0; i < 12; i++) {
    months.push({ month: m, label: MONTH_LABELS[m] || `M${m}` });
    if (m === cleanEnd) break;
    m = m === 12 ? 1 : m + 1;
  }
  return months;
};

// Default academic months (June → May). Replaced at runtime by configurable range.
export const ACADEMIC_MONTHS = buildAcademicMonths(6, 5);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const formatAcademicYearLabel = (startYear) =>
  `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;

export const parseAcademicYearLabel = (label) => {
  const startYear = Number(String(label || '').split('-')[0]);
  return Number.isFinite(startYear) ? startYear : new Date().getFullYear();
};

export const getCurrentAcademicYearLabel = (today = new Date()) => {
  const safeDate = (today instanceof Date && !isNaN(today.getTime())) ? today : new Date();
  const startYear = safeDate.getMonth() + 1 >= 6 ? safeDate.getFullYear() : safeDate.getFullYear() - 1;
  return formatAcademicYearLabel(startYear);
};

export const getAcademicMonthYear = (startYear, month) => {
  const m = typeof month === 'object' ? Number(month?.month || month?.start_month || 6) : Number(month);
  const cleanMonth = Number.isFinite(m) ? m : 6;
  const y = Number(startYear) || new Date().getFullYear();
  return cleanMonth >= 6 ? y : y + 1;
};

export const buildAcademicCalendarRows = (academicYearLabel, calendarEntries = [], startMonth = 6, endMonth = 5) => {
  const startYear = parseAcademicYearLabel(academicYearLabel);
  const months = buildAcademicMonths(startMonth, endMonth);
  const entryMap = new Map(calendarEntries.map((entry) => [`${entry.year}-${entry.month}`, entry]));

  return months.map(({ month, label }) => {
    const year = getAcademicMonthYear(startYear, month);
    const entry = entryMap.get(`${year}-${month}`);
    return {
      id: entry?.id ?? null,
      year,
      month,
      monthLabel: label,
      working_days: toNumber(entry?.working_days, DEFAULT_WORKING_DAYS),
      teaching_days: toNumber(entry?.teaching_days, DEFAULT_TEACHING_DAYS),
      source: entry ? 'database' : 'default',
    };
  });
};

export const getAcademicYearOptions = (calendarEntries = [], today = new Date()) => {
  const startYears = new Set([
    parseAcademicYearLabel(getCurrentAcademicYearLabel(today)),
    parseAcademicYearLabel(
      getCurrentAcademicYearLabel(
        new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      )
    ),
  ]);

  calendarEntries.forEach((entry) => {
    if (!entry?.year || !entry?.month) return;
    startYears.add(entry.month >= 6 ? Number(entry.year) : Number(entry.year) - 1);
  });

  return Array.from(startYears)
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => right - left)
    .map((year) => formatAcademicYearLabel(year));
};

export const getCalendarCoverageRows = (calendarRows = [], today = new Date()) => {
  return calendarRows.map((row) => {
    const monthStart = new Date(row.year, row.month - 1, 1);
    const monthEnd = new Date(row.year, row.month, 0, 23, 59, 59, 999);
    let fraction = 0;

    if (today >= monthEnd) {
      fraction = 1;
    } else if (today > monthStart) {
      const totalDays = Math.max(1, monthEnd.getDate());
      fraction = clamp(today.getDate() / totalDays, 0, 1);
    }

    return {
      ...row,
      fraction,
      elapsedTeachingDays: toNumber(row.teaching_days) * fraction,
    };
  });
};

export const buildPeriodsPerWeekMap = (timetableSlots = []) => {
  const periodMap = new Map();

  timetableSlots.forEach((slot) => {
    if (!slot?.class_id || !slot?.subject_id) return;
    const key = `${slot.class_id}-${slot.subject_id}`;
    periodMap.set(key, (periodMap.get(key) || 0) + 1);
  });

  return periodMap;
};

export const getEndOfWeekDate = (date = new Date()) => {
  const d = date instanceof Date && !isNaN(date.getTime()) ? new Date(date) : new Date();
  const day = d.getDay();
  const diffToSaturday = (6 - day + 7) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToSaturday, 23, 59, 59, 999);
};

/**
 * Given a month number and the calendarRows, compute how many teaching days have elapsed
 * within the window [windowStart, windowEnd] up to today.
 */
const getWindowCoverage = (calendarRows, windowStartMonth, windowEndMonth, today) => {
  // Build ordered list of months in the window (wrapping Dec→Jan if needed)
  const windowMonths = [];
  let m = windowStartMonth;
  for (let i = 0; i < 12; i++) {
    windowMonths.push(m);
    if (m === windowEndMonth) break;
    m = m === 12 ? 1 : m + 1;
  }

  const windowRows = calendarRows.filter((row) => windowMonths.includes(row.month));
  const totalWindowDays = windowRows.reduce((sum, row) => sum + toNumber(row.teaching_days), 0);

  const coverageRows = getCalendarCoverageRows(windowRows, today);
  const elapsedWindowDays = coverageRows.reduce((sum, row) => sum + row.elapsedTeachingDays, 0);

  const lastWindowRow = windowRows[windowRows.length - 1];
  const windowEnd = lastWindowRow
    ? new Date(lastWindowRow.year, lastWindowRow.month, 0, 23, 59, 59, 999)
    : null;
  const pastWindow = windowEnd ? today > windowEnd : false;

  const firstWindowRow = windowRows[0];
  const windowStart = firstWindowRow ? new Date(firstWindowRow.year, firstWindowRow.month - 1, 1) : null;
  const beforeWindow = windowStart ? today < windowStart : false;

  return { totalWindowDays, elapsedWindowDays, pastWindow, beforeWindow };
};

export const buildPacingRecords = ({
  bookClasses = [],
  bookTrackers = [],
  books = [],
  subjects = [],
  classes = [],
  calendarRows = [],
  periodsPerWeekMap = new Map(),
  allLogs = [],
  academicStartMonth = 6,
  academicEndMonth = 5,
  today = new Date(),
}) => {
  const endOfWeekDate = getEndOfWeekDate(today);
  const lastCalendarRow = [...calendarRows]
    .sort((left, right) => (left.year * 12 + left.month) - (right.year * 12 + right.month))
    .pop();
  const lastCalendarMonth = lastCalendarRow?.month ?? academicEndMonth;

  const coverageRows = getCalendarCoverageRows(calendarRows, today);
  const totalTeachingDays = coverageRows.reduce((sum, row) => sum + toNumber(row.teaching_days), 0);
  const elapsedTeachingDays = coverageRows.reduce((sum, row) => sum + row.elapsedTeachingDays, 0);

  const bookMap = new Map(books.map((book) => [String(book.id), book]));
  const subjectMap = new Map(subjects.map((subject) => [String(subject.id), subject]));
  const classMap = new Map(classes.map((item) => [String(item.id), item]));
  const trackerMap = new Map(
    bookTrackers.map((tracker) => [`${tracker.class_id}-${tracker.book_id}`, tracker])
  );

  // Map earliest lesson log per class-book pair
  const firstLessonMonthMap = new Map();
  (allLogs || []).forEach((log) => {
    if (!log.start_date && !log.updated_at) return;
    const dateStr = log.start_date || log.updated_at;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;
    const key = `${log.class_id}-${log.book_id}`;
    if (!firstLessonMonthMap.has(key) || date < firstLessonMonthMap.get(key).date) {
      firstLessonMonthMap.set(key, { date, month: date.getMonth() + 1 });
    }
  });

  return bookClasses
    .map((mapping) => {
      const book = bookMap.get(String(mapping.book_id));
      if (!book) return null;

      const subject = subjectMap.get(String(book.subject_id));
      const classRecord = classMap.get(String(mapping.class_id));
      const tracker = trackerMap.get(`${mapping.class_id}-${mapping.book_id}`);
      const periodsPerWeek = periodsPerWeekMap.get(`${mapping.class_id}-${book.subject_id}`) || 0;

      const totalLessons = toNumber(
        tracker?.total_lessons ||
          book.total_leaf_lessons ||
          book.total_lessons,
        0
      );
      const completedLessons = toNumber(tracker?.completed, 0);
      const inProgressLessons = toNumber(tracker?.in_progress, 0);
      const pendingLessons = Math.max(0, totalLessons - completedLessons);

      const actualProgress = totalLessons > 0
        ? clamp(Number(((completedLessons / totalLessons) * 100).toFixed(1)), 0, 100)
        : clamp(toNumber(tracker?.completion_percentage, 0), 0, 100);

      const firstLesson = firstLessonMonthMap.get(`${mapping.class_id}-${mapping.book_id}`);
      const rawStart = tracker?.expected_start_date;
      const rawEnd = tracker?.expected_end_date;

      const calculatedStartMonth =
        typeof rawStart === 'string' && rawStart.includes('-')
          ? new Date(rawStart).getMonth() + 1
          : typeof rawStart === 'number'
            ? rawStart
            : today.getMonth() + 1;

      const targetEndMonth =
        typeof rawEnd === 'string' && rawEnd.includes('-')
          ? new Date(rawEnd).getMonth() + 1
          : typeof rawEnd === 'number'
            ? rawEnd
            : lastCalendarMonth;

      const periodsAvailableToDate = periodsPerWeek * (elapsedTeachingDays / 5);

      // Determine expected progress based on teaching days within [calculatedStartMonth, targetEndMonth] up to end of current week
      let expectedProgress = 0;
      let isOverdue = false;

      const win = getWindowCoverage(
        calendarRows,
        calculatedStartMonth,
        targetEndMonth,
        endOfWeekDate
      );

      if (win.beforeWindow) {
        expectedProgress = 0;
      } else if (win.pastWindow) {
        expectedProgress = 100;
        if (actualProgress < 100) isOverdue = true;
      } else {
        expectedProgress = win.totalWindowDays > 0
          ? clamp((win.elapsedWindowDays / win.totalWindowDays) * 100, 0, 100)
          : 0;
      }

      // Expected completed lessons based on pace
      const expectedLessons = totalLessons > 0
        ? Math.round((expectedProgress / 100) * totalLessons)
        : 0;
      const lessonDelta = completedLessons - expectedLessons;

      const lessonBasedExpectedProgress = totalLessons > 0
        ? clamp(Math.round((expectedLessons / totalLessons) * 100), 0, 100)
        : Math.round(expectedProgress);

      return {
        id: mapping.id,
        trackerId: tracker?.id || null,
        classId: mapping.class_id,
        className: classRecord?.name || `Class ${mapping.class_id}`,
        bookId: mapping.book_id,
        bookName: book.title || book.name || 'Untitled Book',
        subjectId: book.subject_id,
        subjectName: subject?.name || 'Untitled Subject',
        classificationId: subject?.classification_id || null,
        actualProgress,
        rawTrackerPct: actualProgress,
        expectedProgress: lessonBasedExpectedProgress,
        isOverdue,
        periodsPerWeek,
        periodsAvailableToDate,
        totalLessons,
        completedLessons,
        inProgressLessons,
        pendingLessons,
        expectedLessons,
        lessonDelta,
        trackerUpdatedAt: tracker?.updated_at || null,
        calculatedStartMonth,
        expectedStartDate: rawStart || null,
        expectedEndDate: rawEnd || null,
        expectedStartMonth: rawStart || null,
        expectedEndMonth: rawEnd || null,
        expectedPercentage: tracker?.expected_percentage ?? lessonBasedExpectedProgress,
      };
    })
    .filter(Boolean);
};

export const buildOverviewSummary = ({
  pacingRecords = [],
  dailyLogs = [],
  carryForwards = [],
  teacherActivityData = [],
  today = new Date(),
}) => {
  const trackedRecords = pacingRecords.filter(
    (record) => record.totalLessons > 0 || record.actualProgress > 0 || record.expectedProgress > 0
  );

  const totalTracked = new Set(
    pacingRecords.map((record) => `${record.classId}-${record.subjectId}`)
  ).size;
  const classCount = new Set(pacingRecords.map((record) => String(record.classId))).size;
  const avgCompletion = trackedRecords.length
    ? trackedRecords.reduce((sum, record) => sum + record.actualProgress, 0) / trackedRecords.length
    : 0;
  const avgExpected = trackedRecords.length
    ? trackedRecords.reduce((sum, record) => sum + record.expectedProgress, 0) /
      trackedRecords.length
    : 0;

  const overdueCount = pacingRecords.filter((r) => r.isOverdue).length;

  const pacingCounts = trackedRecords.reduce(
    (accumulator, record) => {
      const pct = record.actualProgress ?? 0;
      const expected = record.expectedProgress ?? 0;
      const delta = pct - expected;
      const ratio = expected > 0 ? pct / expected : (pct >= 100 ? 1.25 : 0);

      if (ratio >= 1.25 || pct >= 125) {
        accumulator.suspicious += 1;
      } else if ((pct === 0 && expected >= 10) || delta <= -15 || (pct < 20 && expected >= 30)) {
        accumulator.critical += 1;
      } else if (pct >= 70 || delta >= -5) {
        accumulator.onTrack += 1;
      } else {
        accumulator.behind += 1;
      }
      return accumulator;
    },
    { onTrack: 0, behind: 0, critical: 0, suspicious: 0 }
  );

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 14);

  const recentLogs = dailyLogs.filter((log) => {
    const timestamp = log.date || log.created_at;
    return timestamp && new Date(timestamp) >= sevenDaysAgo;
  });

  const recentCarryForwards = carryForwards.filter(
    (entry) => entry.created_at && new Date(entry.created_at) >= sevenDaysAgo
  );
  const previousCarryForwards = carryForwards.filter((entry) => {
    if (!entry.created_at) return false;
    const createdAt = new Date(entry.created_at);
    return createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo;
  });

  // Dual-scope planning adherence
  const activeTeachers = teacherActivityData.filter((t) => t.totalPlans > 0 || t.logs7d > 0);
  const avgAdherenceAcadYear = activeTeachers.length
    ? activeTeachers.reduce((sum, t) => sum + t.adherenceAcadYear, 0) / activeTeachers.length
    : 0;
  const avgAdherence30d = activeTeachers.length
    ? activeTeachers.reduce((sum, t) => sum + t.adherence30d, 0) / activeTeachers.length
    : 0;

  const activeTeachers7d = teacherActivityData.filter((t) => (t.logs7d || 0) > 0).length;

  return {
    totalTracked,
    classCount,
    avgCompletion,
    avgExpected,
    overdueCount,
    pacingCounts,
    recentLogsCount: recentLogs.length,
    activeTeachers7d,
    totalTeachers: teacherActivityData.length,
    recentCarryForwardsCount: recentCarryForwards.length,
    previousCarryForwardsCount: previousCarryForwards.length,
    avgAdherenceAcadYear,
    avgAdherence30d,
  };
};

export const buildHeatmapModel = ({
  classes = [],
  subjects = [],
  classifications = [],
  pacingRecords = [],
  assignments = [],
  books = [],
}) => {
  const subjectMap = new Map(subjects.map((s) => [String(s.id), s]));
  const classificationMap = new Map(
    classifications.map((c) => [String(c.id), c])
  );
  const bookMap = new Map((books || []).map((b) => [String(b.id), b]));

  // Build unique columns per (subject_id, book_id) combination
  const columnKeyMap = new Map();

  pacingRecords.forEach((record) => {
    const sId = String(record.subjectId);
    const bId = record.bookId ? String(record.bookId) : 'none';
    const key = `${sId}-${bId}`;

    if (!columnKeyMap.has(key)) {
      const subject = subjectMap.get(sId);
      if (!subject) return;

      const bTitle = record.bookName || bookMap.get(bId)?.title || bookMap.get(bId)?.name || '';

      // Check if subject has more than 1 distinct book mapped across pacingRecords
      const totalSubjectBooks = new Set(
        pacingRecords
          .filter((pr) => String(pr.subjectId) === sId && pr.bookId)
          .map((pr) => String(pr.bookId))
      ).size;

      const displayName =
        totalSubjectBooks > 1 && bTitle
          ? `${subject.name} (${bTitle})`
          : subject.name;

      columnKeyMap.set(key, {
        id: key,
        subjectId: Number(sId),
        bookId: record.bookId ? Number(record.bookId) : null,
        name: displayName,
        rawSubjectName: subject.name,
        bookTitle: bTitle,
        classification_id: subject.classification_id,
      });
    }
  });

  // Also include assigned subjects that don't have pacing records yet
  assignments.forEach((assignment) => {
    const sId = String(assignment.subject_id);
    const hasPacingRecord = pacingRecords.some((pr) => String(pr.subjectId) === sId);
    if (!hasPacingRecord) {
      const key = `${sId}-none`;
      if (!columnKeyMap.has(key)) {
        const subject = subjectMap.get(sId);
        if (subject) {
          columnKeyMap.set(key, {
            id: key,
            subjectId: Number(sId),
            bookId: null,
            name: subject.name,
            rawSubjectName: subject.name,
            bookTitle: '',
            classification_id: subject.classification_id,
          });
        }
      }
    }
  });

  const subjectColumns = Array.from(columnKeyMap.values()).sort((left, right) => {
    const leftClassification = String(left.classification_id || '');
    const rightClassification = String(right.classification_id || '');
    if (leftClassification !== rightClassification) {
      return leftClassification.localeCompare(rightClassification);
    }
    return String(left.name || '').localeCompare(String(right.name || ''));
  });

  // Pre-build set of assigned class-subject keys
  const assignedKeys = new Set(
    assignments.map((a) => `${a.class_id}-${a.subject_id}`)
  );

  const rows = classes
    .map((classRecord) => {
      const cells = {};

      subjectColumns.forEach((col) => {
        const records = pacingRecords.filter((record) => {
          const matchClass = String(record.classId) === String(classRecord.id);
          const matchSubject = String(record.subjectId) === String(col.subjectId);
          const matchBook = col.bookId ? String(record.bookId) === String(col.bookId) : true;
          return matchClass && matchSubject && matchBook;
        });

        const isAssigned = assignedKeys.has(`${classRecord.id}-${col.subjectId}`);

        if (records.length === 0) {
          cells[col.id] = { hasData: false, isAssigned, pct: null };
          return;
        }

        const rec = records[0];

        cells[col.id] = {
          hasData: true,
          isAssigned,
          pct: Math.round(rec.actualProgress ?? 0),
          expectedPct: Math.round(rec.expectedPercentage ?? rec.expectedProgress ?? 0),
          isOverdue: rec.isOverdue,
          bookId: rec.bookId,
          bookName: rec.bookName,
          totalLessons: rec.totalLessons,
          completedLessons: rec.completedLessons,
        };
      });

      return {
        classId: classRecord.id,
        className: classRecord.name || `Class ${classRecord.id}`,
        cells,
      };
    })
    .filter((row) => Object.values(row.cells).some((cell) => cell.hasData || cell.isAssigned));

  const classificationGroups = [];
  let currentGroup = null;

  subjectColumns.forEach((col) => {
    const classificationId = String(col.classification_id || 'none');
    if (!currentGroup || currentGroup.classificationId !== classificationId) {
      if (currentGroup) classificationGroups.push(currentGroup);
      currentGroup = {
        classificationId,
        name: classificationMap.get(classificationId)?.name || '',
        count: 1,
      };
    } else {
      currentGroup.count += 1;
    }
  });

  if (currentGroup) classificationGroups.push(currentGroup);

  return {
    subjectColumns,
    classificationGroups,
    rows,
  };
};

export const buildTimelineBuckets = ({ viewMode = 'monthly', calendarRows = [] }) => {
  const totalTeachingDays = calendarRows.reduce((sum, row) => sum + toNumber(row.teaching_days), 0);

  if (viewMode === 'weeks') {
    const buckets = [];
    let cumulativeTeachingDays = 0;

    calendarRows.forEach((row) => {
      const monthEnd = new Date(row.year, row.month, 0, 23, 59, 59, 999);
      const weeklyTeachingDays = toNumber(row.teaching_days) / 4;
      for (let index = 0; index < 4; index += 1) {
        cumulativeTeachingDays += weeklyTeachingDays;
        buckets.push({
          label: `${row.monthLabel} W${index + 1}`,
          endDate: monthEnd,
          cumulativeTeachingDays,
          totalTeachingDays,
        });
      }
    });

    return buckets;
  }

  if (viewMode === 'months') {
    const groupDefinitions = [
      { label: 'Jun-Aug', months: [6, 7, 8] },
      { label: 'Sep-Nov', months: [9, 10, 11] },
      { label: 'Dec-Jan', months: [12, 1] },
      { label: 'Feb-Mar', months: [2, 3] },
    ];

    return groupDefinitions
      .map((group) => {
        const matchingRows = calendarRows.filter((row) => group.months.includes(row.month));
        if (matchingRows.length === 0) return null;
        const cumulativeTeachingDays = calendarRows.reduce((sum, row) => {
          if (group.months.includes(row.month)) return sum + toNumber(row.teaching_days);
          if (row.year < matchingRows[0].year) return sum + toNumber(row.teaching_days);
          if (
            row.year === matchingRows[0].year &&
            calendarRows.indexOf(row) <= calendarRows.indexOf(matchingRows[matchingRows.length - 1])
          ) {
            return sum + toNumber(row.teaching_days);
          }
          return sum;
        }, 0);
        const lastRow = matchingRows[matchingRows.length - 1];
        return {
          label: group.label,
          endDate: new Date(lastRow.year, lastRow.month, 0, 23, 59, 59, 999),
          cumulativeTeachingDays,
          totalTeachingDays,
        };
      })
      .filter(Boolean);
  }

  let cumulativeTeachingDays = 0;
  return calendarRows.map((row) => {
    cumulativeTeachingDays += toNumber(row.teaching_days);
    return {
      label: row.monthLabel,
      endDate: new Date(row.year, row.month, 0, 23, 59, 59, 999),
      cumulativeTeachingDays,
      totalTeachingDays,
    };
  });
};

export const buildTrendData = ({
  viewMode = 'monthly',
  calendarRows = [],
  lessonPlans = [],
  classifications = [],
  pacingRecords = [],
}) => {
  const timelineBuckets = buildTimelineBuckets({ viewMode, calendarRows });
  if (timelineBuckets.length === 0) return [];

  const classificationIds = new Set(
    pacingRecords.map((record) => String(record.classificationId || '')).filter(Boolean)
  );
  const relevantClassifications = classifications.filter((classification) =>
    classificationIds.has(String(classification.id))
  );

  return timelineBuckets.map((bucket) => {
    const row = {
      label: bucket.label,
      expected:
        pacingRecords.length === 0
          ? 0
          : pacingRecords.reduce((sum, record) => {
              const expected =
                record.estimatedPeriods && record.periodsPerWeek > 0
                  ? clamp(
                      ((record.periodsPerWeek * (bucket.cumulativeTeachingDays / 5)) /
                        record.estimatedPeriods) *
                        100,
                      0,
                      100
                    )
                  : bucket.totalTeachingDays > 0
                    ? clamp(
                        (bucket.cumulativeTeachingDays / bucket.totalTeachingDays) * 100,
                        0,
                        100
                      )
                    : 0;
              return sum + expected;
            }, 0) / pacingRecords.length,
    };

    relevantClassifications.forEach((classification) => {
      const relatedPlans = lessonPlans.filter(
        (plan) => String(plan.subject?.classification_id) === String(classification.id)
      );
      row[classification.name] =
        relatedPlans.length === 0
          ? 0
          : relatedPlans.reduce((sum, plan) => {
              if (!plan.updated_at || new Date(plan.updated_at) > bucket.endDate) return sum;
              return sum + toNumber(plan.completion_percentage, 0);
            }, 0) / relatedPlans.length;
    });

    return row;
  });
};

export const buildAttentionAlerts = ({
  pacingRecords = [],
  teachers = [],
  assignments = [],
  carryForwards = [],
  dailyLogs = [],
  lessonPlans = [],
  today = new Date(),
}) => {
  const alerts = [];
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 14);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  pacingRecords.forEach((record) => {
    // Overdue book alert — past expected end month but not completed
    if (record.isOverdue) {
      alerts.push({
        id: `overdue-${record.classId}-${record.bookId}`,
        severity: 'critical',
        classId: record.classId,
        className: record.className,
        type: 'overdue',
        typeLabel: 'Overdue',
        title: 'Book overdue',
        description: `${record.className} / ${record.bookName} has passed its expected completion month at ${record.actualProgress.toFixed(0)}%.`,
        meta: `Expected to finish by month ${record.expectedEndMonth}. ${100 - Math.round(record.actualProgress)}% remaining.`,
      });
    }

    const relatedPlans = lessonPlans.filter(
      (plan) =>
        String(plan.class_id) === String(record.classId) &&
        String(plan.book_id) === String(record.bookId)
    );
    const latestUpdatedAt = relatedPlans.reduce((latest, plan) => {
      if (!plan.updated_at) return latest;
      if (!latest || new Date(plan.updated_at) > new Date(latest)) return plan.updated_at;
      return latest;
    }, null);

    if (
      record.actualProgress < 100 &&
      (!latestUpdatedAt || new Date(latestUpdatedAt) < fourteenDaysAgo)
    ) {
      alerts.push({
        id: `stalled-${record.classId}-${record.bookId}`,
        severity: latestUpdatedAt ? 'high' : 'critical',
        classId: record.classId,
        className: record.className,
        type: 'stalled',
        typeLabel: 'Stalled Subject',
        title: 'Stalled subject',
        description: `${record.className} / ${record.subjectName} has not moved in the last 14 days.`,
        meta: latestUpdatedAt
          ? `Last activity: ${new Date(latestUpdatedAt).toLocaleDateString()}`
          : 'No recent progress updates found.',
      });
    }

    const delta = record.actualProgress - record.expectedProgress;
    const isCriticalBehind = (record.actualProgress === 0 && record.expectedProgress >= 10) || delta <= -15;
    if (isCriticalBehind || delta <= -10) {
      alerts.push({
        id: `behind-${record.classId}-${record.bookId}`,
        severity: isCriticalBehind ? 'critical' : 'high',
        classId: record.classId,
        className: record.className,
        type: 'behind',
        typeLabel: 'Behind Schedule',
        title: 'Behind schedule',
        description: `${record.className} / ${record.bookName} is ${Math.round(Math.abs(delta))} pts behind expected pacing.`,
        meta: `Actual ${Math.round(record.actualProgress)}% vs expected ${Math.round(record.expectedPercentage ?? record.expectedProgress)}%`,
      });
    }

    if (!record.estimatedPeriods) {
      alerts.push({
        id: `estimate-${record.id}`,
        severity: 'medium',
        classId: record.classId,
        className: record.className,
        type: 'missing_estimate',
        typeLabel: 'Missing Estimate',
        title: 'Missing period estimate',
        description: `${record.className} / ${record.bookName} does not have an estimated periods value.`,
        meta: 'Configure this in the Overview settings modal.',
      });
    }
  });

  const activeTeacherIds = new Set(assignments.map((assignment) => String(assignment.teacher_id)));
  teachers.forEach((teacher) => {
    if (!activeTeacherIds.has(String(teacher.id))) return;
    const teacherLogs = dailyLogs.filter((log) => String(log.teacher_id) === String(teacher.id));
    const logsLast7Days = teacherLogs.filter(
      (log) => (log.date || log.created_at) && new Date(log.date || log.created_at) >= sevenDaysAgo
    );
    if (logsLast7Days.length === 0) {
      alerts.push({
        id: `inactive-${teacher.id}`,
        severity: 'medium',
        classId: null,
        className: null,
        type: 'inactive_teacher',
        typeLabel: 'Inactive Teacher',
        title: 'Inactive teacher',
        description: `${teacher.name || 'Unnamed teacher'} has active assignments but no activity logs in the last 7 days.`,
        meta: 'Check timetable allocation or classroom follow-up.',
      });
    }
  });

  const carryForwardCounts = carryForwards.reduce((accumulator, entry) => {
    if (!entry.created_at || new Date(entry.created_at) < sevenDaysAgo) return accumulator;
    const teacherId = String(entry.teacher_id);
    accumulator[teacherId] = (accumulator[teacherId] || 0) + 1;
    return accumulator;
  }, {});

  Object.entries(carryForwardCounts).forEach(([teacherId, count]) => {
    if (count < 3) return;
    const teacher = teachers.find((item) => String(item.id) === teacherId);
    alerts.push({
      id: `carry-${teacherId}`,
      severity: count >= 5 ? 'high' : 'medium',
      classId: null,
      className: null,
      type: 'carry_forward',
      typeLabel: 'High Carry-Forward',
      title: 'High carry-forwards',
      description: `${teacher?.name || 'Teacher'} has ${count} carry-forwards in the last 7 days.`,
      meta: 'Review lesson planning slippage and adherence.',
    });
  });

  const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };

  return alerts
    .sort((left, right) => severityWeight[right.severity] - severityWeight[left.severity])
    .slice(0, 12);
};

export const buildClassDonutData = ({
  classes = [],
  bookTrackers = [],
  lessonPlans = [],
}) => {
  const classMap = new Map(classes.map((item) => [String(item.id), item]));

  return Array.from(
    bookTrackers
      .reduce((map, tracker) => {
        const key = String(tracker.class_id);
        if (!map.has(key)) {
          const classRecord = classMap.get(key);
          map.set(key, {
            classId: tracker.class_id,
            className: classRecord?.name || `Class ${tracker.class_id}`,
            completed: 0,
            inProgress: 0,
            planned: 0,
            notPlanned: 0,
            totalLessons: 0,
          });
        }

        const bucket = map.get(key);
        const comp = toNumber(tracker.completed, 0);
        const inProg = toNumber(tracker.in_progress, 0);
        const notStart = toNumber(tracker.not_started, 0);
        const total = comp + inProg + notStart;

        bucket.completed += comp;
        bucket.inProgress += inProg;
        bucket.totalLessons += total;
        return map;
      }, new Map())
      .values()
  )
    .map((item) => {
      const classIdStr = String(item.classId);
      const classPlans = (lessonPlans || []).filter((p) => String(p.class_id) === classIdStr);
      const pendingPlansCount = classPlans.filter(
        (p) => p.status !== 'completed' && p.status !== 'in_progress' && p.status !== 'active'
      ).length;

      const remainingUnstarted = Math.max(0, item.totalLessons - item.completed - item.inProgress);
      const planned = Math.min(pendingPlansCount, remainingUnstarted);
      const notPlanned = Math.max(0, remainingUnstarted - planned);
      const total = Math.max(item.totalLessons, item.completed + item.inProgress + planned + notPlanned, 1);

      return {
        ...item,
        planned,
        notPlanned,
        total,
      };
    })
    .sort((left, right) => left.className.localeCompare(right.className));
};

export const buildTeacherActivityData = ({
  teachers = [],
  dailyLogs = [],
  lessonPlans = [],
  carryForwards = [],
  assignments = [],
  academicYearStartDate = null, // Date object for start of academic year
  today = new Date(),
}) => {
  const assignmentMap = new Map(
    assignments.map((assignment) => [
      `${assignment.class_id}-${assignment.subject_id}`,
      String(assignment.teacher_id),
    ])
  );

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  return teachers
    .map((teacher) => {
      const teacherId = String(teacher.id);
      const allTeacherPlans = lessonPlans.filter(
        (plan) => assignmentMap.get(`${plan.class_id}-${plan.subject_id}`) === teacherId
      );

      // Academic year scope
      const acadYearPlans = academicYearStartDate
        ? allTeacherPlans.filter(
            (plan) => plan.updated_at && new Date(plan.updated_at) >= academicYearStartDate
          )
        : allTeacherPlans;
      const acadYearCompleted = acadYearPlans.filter((p) => p.status === 'completed').length;
      const adherenceAcadYear =
        acadYearPlans.length > 0 ? (acadYearCompleted / acadYearPlans.length) * 100 : 0;

      // Last 30 days scope
      const plans30d = allTeacherPlans.filter(
        (plan) => plan.updated_at && new Date(plan.updated_at) >= thirtyDaysAgo
      );
      const completed30d = plans30d.filter((p) => p.status === 'completed').length;
      const adherence30d = plans30d.length > 0 ? (completed30d / plans30d.length) * 100 : 0;

      const logs7d = dailyLogs.filter(
        (log) =>
          String(log.teacher_id) === teacherId &&
          (log.date || log.created_at) &&
          new Date(log.date || log.created_at) >= sevenDaysAgo
      ).length;
      const carryForwards7d = carryForwards.filter(
        (entry) =>
          String(entry.teacher_id) === teacherId &&
          entry.created_at &&
          new Date(entry.created_at) >= sevenDaysAgo
      ).length;

      // Legacy adherence field kept for backward compat (uses acad year scope)
      const adherence = adherenceAcadYear;

      return {
        teacherId: teacher.id,
        teacherName: teacher.name || 'Unnamed teacher',
        totalPlans: allTeacherPlans.length,
        completedPlans: acadYearCompleted,
        plans30d: plans30d.length,
        completed30d,
        logs7d,
        carryForwards7d,
        adherence,
        adherenceAcadYear,
        adherence30d,
      };
    })
    .filter((item) => item.totalPlans > 0 || item.logs7d > 0 || item.carryForwards7d > 0)
    .sort((left, right) => right.logs7d - left.logs7d || right.adherenceAcadYear - left.adherenceAcadYear);
};

export const buildEstimateRows = ({
  bookClasses = [],
  bookTrackers = [],
  books = [],
  subjects = [],
  classes = [],
  periodsPerWeekMap = new Map(),
  allLogs = [],
  academicStartMonth = 6,
  academicEndMonth = 5,
  academicYearLabel = getCurrentAcademicYearLabel(),
  calendarRows = [],
  today = new Date(),
}) => {
  const startYear = parseAcademicYearLabel(academicYearLabel);
  const currentMonthNum = today.getMonth() + 1;

  const bookMap = new Map(books.map((book) => [String(book.id), book]));
  const subjectMap = new Map(subjects.map((subject) => [String(subject.id), subject]));
  const classMap = new Map(classes.map((classRecord) => [String(classRecord.id), classRecord]));
  const trackerMap = new Map(
    (bookTrackers || []).map((tracker) => [`${tracker.class_id}-${tracker.book_id}`, tracker])
  );

  // Build a map of earliest lesson log per class-book pair
  const firstLessonMonthMap = new Map();
  (allLogs || []).forEach((log) => {
    if (!log.start_date && !log.updated_at) return;
    const dateStr = log.start_date || log.updated_at;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;
    const key = `${log.class_id}-${log.book_id}`;
    if (!firstLessonMonthMap.has(key) || date < firstLessonMonthMap.get(key).date) {
      firstLessonMonthMap.set(key, { date, month: date.getMonth() + 1, year: date.getFullYear() });
    }
  });

  return bookClasses
    .map((mapping) => {
      const book = bookMap.get(String(mapping.book_id));
      if (!book) return null;
      const subject = subjectMap.get(String(book.subject_id));
      const classRecord = classMap.get(String(mapping.class_id));
      const tracker = trackerMap.get(`${mapping.class_id}-${mapping.book_id}`);
      const periodsPerWeek = periodsPerWeekMap.get(`${mapping.class_id}-${book.subject_id}`) || 0;
      const firstLessonInfo = firstLessonMonthMap.get(`${mapping.class_id}-${mapping.book_id}`);

      const hasFirstLessonEntry = !!firstLessonInfo;

      const rawStart = tracker?.expected_start_date;
      const rawEnd = tracker?.expected_end_date;

      // If started, start from first lesson month. If NOT started, remaining available time starts from TODAY's month!
      const calculatedStartMonth =
        typeof rawStart === 'string' && rawStart.includes('-')
          ? new Date(rawStart).getMonth() + 1
          : typeof rawStart === 'number'
            ? rawStart
            : hasFirstLessonEntry
              ? firstLessonInfo.month
              : currentMonthNum;

      const calculatedStartYear = hasFirstLessonEntry
        ? firstLessonInfo.year
        : getAcademicMonthYear(startYear, calculatedStartMonth);

      const expectedEndMonthNum =
        typeof rawEnd === 'string' && rawEnd.includes('-')
          ? new Date(rawEnd).getMonth() + 1
          : typeof rawEnd === 'number'
            ? rawEnd
            : null;

      const effectiveEndMonth = expectedEndMonthNum || academicEndMonth;

      // Build array of month numbers in the active window
      const windowMonths = [];
      let m = calculatedStartMonth;
      for (let i = 0; i < 12; i++) {
        windowMonths.push(m);
        if (m === effectiveEndMonth) break;
        m = m === 12 ? 1 : m + 1;
      }
      const activeWindowMonths = windowMonths.length;

      // Count actual teaching days in window from calendarRows
      let activeTeachingDays = 0;
      if (calendarRows.length > 0) {
        activeTeachingDays = calendarRows
          .filter((row) => windowMonths.includes(row.month))
          .reduce((sum, row) => sum + (Number(row.teaching_days) || 0), 0);
      } else {
        activeTeachingDays = activeWindowMonths * DEFAULT_TEACHING_DAYS;
      }

      const activeTeachingWeeks = (activeTeachingDays / 5).toFixed(1);

      const startMonthFullLabel = `${MONTH_LABELS[calculatedStartMonth]} ${calculatedStartYear}`;
      const endMonthYear = getAcademicMonthYear(startYear, effectiveEndMonth);
      const endMonthFullLabel = `${MONTH_LABELS[effectiveEndMonth]} ${endMonthYear}`;

      return {
        mappingId: mapping.id,
        trackerId: tracker?.id || null,
        classId: mapping.class_id,
        className: classRecord?.name || `Class ${mapping.class_id}`,
        subjectId: book.subject_id,
        subjectName: subject?.name || 'Untitled Subject',
        bookId: mapping.book_id,
        bookName: book.title || book.name || 'Untitled Book',
        periodsPerWeek,
        calculatedStartMonth,
        calculatedStartMonthLabel: startMonthFullLabel,
        firstLessonDate: firstLessonInfo?.date?.toISOString().split('T')[0] ?? null,
        hasFirstLessonEntry,
        expectedStartMonth: rawStart || null,
        expectedEndMonth: rawEnd || null,
        expectedEndMonthNum,
        expectedEndMonthLabel: endMonthFullLabel,
        activeWindowMonths,
        activeTeachingDays,
        activeTeachingWeeks,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.className !== right.className) return left.className.localeCompare(right.className);
      if (left.subjectName !== right.subjectName) {
        return left.subjectName.localeCompare(right.subjectName);
      }
      return left.bookName.localeCompare(right.bookName);
    });
};

export const toLocalDateStr = (d) => {
  if (!d) return '';
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    d = new Date(d);
  }
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Builds a teacher submission heatmap model.
 * Each teacher gets a row with day-level cells for the last N weeks.
 * Supports direct database view rows (heatmap_teacher_tracker)
 * with allocated = count(unplanned == false) and submissions = count(has_progress == true).
 */
export const buildTeacherSubmissionHeatmap = ({
  teachers = [],
  teacherHeatmapRows = [],
  dailyLogs = [],
  allLogs = [],
  timetableSlots = [],
  assignments = [],
  classes = [],
  subjects = [],
  books = [],
  periods = [],
  weeks = 5,
  today = new Date(),
}) => {
  const SCHOOL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const periodMap = new Map(
    (periods || []).map((p) => [
      String(p.id || p.period_id || p.period_number),
      p.name || p.period_name || `Period ${p.period_number || p.id}`,
    ])
  );

  const getDayName = (date) => {
    const d = new Date(date);
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return names[d.getDay()];
  };

  // Determine anchor date: use latest date present in data if later than today, or today
  let anchorDate = new Date(today);
  if (Array.isArray(teacherHeatmapRows) && teacherHeatmapRows.length > 0) {
    let maxDbDate = null;
    teacherHeatmapRows.forEach((r) => {
      if (!r.date) return;
      const d = new Date(r.date);
      if (!isNaN(d.getTime())) {
        if (!maxDbDate || d > maxDbDate) maxDbDate = d;
      }
    });
    if (maxDbDate && maxDbDate > anchorDate) {
      anchorDate = maxDbDate;
    }
  }

  // Find Monday of anchor week
  const currentDay = anchorDate.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const currentMonday = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() + diffToMonday);

  // Generate N structured calendar weeks (Monday to Saturday)
  const weekBlocks = [];
  const allDates = [];
  const weekLabels = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const wMonday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - w * 7);
    const days = [];
    for (let d = 0; d < 6; d++) {
      const dayDate = new Date(wMonday.getFullYear(), wMonday.getMonth(), wMonday.getDate() + d);
      days.push(dayDate);
      allDates.push(dayDate);
    }
    const wSaturday = days[5];
    const fmt = (dt) => `${dt.getDate()}/${dt.getMonth() + 1}`;
    const label = `${fmt(wMonday)}–${fmt(wSaturday)}`;
    weekLabels.push(label);
    weekBlocks.push({
      label,
      days,
    });
  }

  // 1. DIRECT DATABASE VIEW PATH (heatmap_teacher_tracker)
  if (Array.isArray(teacherHeatmapRows) && teacherHeatmapRows.length > 0) {
    const teacherMap = new Map();
    teachers.forEach((t) => {
      const tid = String(t.teacher_id || t.id);
      teacherMap.set(tid, t.name || 'Unnamed');
    });

    const bookMap = new Map(
      books.map((b) => [String(b.id), b.title || b.name || ''])
    );

    const teacherDateMap = new Map();
    teacherHeatmapRows.forEach((r) => {
      const tid = String(r.teacher_id);
      if (!teacherMap.has(tid) && r.teacher_name) {
        teacherMap.set(tid, r.teacher_name);
      }
      const dateStr = toLocalDateStr(r.date);
      if (!dateStr) return;

      const key = `${tid}-${dateStr}`;
      if (!teacherDateMap.has(key)) teacherDateMap.set(key, []);
      teacherDateMap.get(key).push(r);
    });

    const rows = Array.from(teacherMap.entries())
      .map(([teacherId, teacherName]) => {
        let totalAllocatedPeriods = 0;

        const cells = allDates.map((date) => {
          const dateStr = toLocalDateStr(date);
          const dayName = getDayName(date);
          const dayRows = teacherDateMap.get(`${teacherId}-${dateStr}`) || [];

          // Allocated: unplanned === false
          const allocatedRows = dayRows.filter(
            (r) => r.unplanned === false || r.unplanned === 0 || r.unplanned === 'false'
          );
          const allocated = allocatedRows.length;
          totalAllocatedPeriods += allocated;

          // Submissions: has_progress === true
          const submissionRows = dayRows.filter((r) => Boolean(r.has_progress));
          const submissions = submissionRows.length;

          let status = 'none';
          if (allocated === 0) {
            status = submissions > 0 ? 'extra' : 'none';
          } else if (submissions >= allocated) {
            status = 'good';
          } else if (submissions > 0) {
            status = 'partial';
          } else {
            status = 'missing';
          }

          // Build period rows for the detail modal
          const periodRows = dayRows.map((r, idx) => {
            const bookName =
              r.book_name ||
              r.book_title ||
              (r.book_id ? bookMap.get(String(r.book_id)) : '') ||
              '';

            let resolvedPeriodName = '';
            if (r.unplanned === true || r.unplanned === 1 || r.unplanned === 'true') {
              resolvedPeriodName = 'Unplanned';
            } else if (r.period_name && !/^\d+$/.test(String(r.period_name).trim())) {
              resolvedPeriodName = r.period_name;
            } else if (r.period_id && periodMap.has(String(r.period_id))) {
              resolvedPeriodName = periodMap.get(String(r.period_id));
            } else if (r.period_name) {
              resolvedPeriodName = r.period_name;
            } else if (r.period_id) {
              resolvedPeriodName = `Period ${r.period_id}`;
            } else {
              resolvedPeriodName = `Period ${idx + 1}`;
            }

            return {
              isScheduled: !(r.unplanned === true || r.unplanned === 1 || r.unplanned === 'true'),
              periodName: resolvedPeriodName,
              periodTime: r.period_time || '',
              className: r.class_name || (r.class_id ? `Class ${r.class_id}` : 'Class'),
              subjectName: r.subject_name || (r.subject_id ? `Subject ${r.subject_id}` : 'Subject'),
              bookName,
              isSubmitted: Boolean(r.has_progress),
              log: r.has_progress
                ? {
                    id: r.id || `${teacherId}-${dateStr}-${idx}`,
                    bookName,
                    progress: r.progress ?? 100,
                    lessonTitle: r.lesson_title || r.lesson_name || '',
                    createdAt: r.created_at || null,
                  }
                : null,
            };
          });

          return {
            date: dateStr,
            dayName,
            submissions,
            allocated,
            periodRows,
            status,
          };
        });

        const totalSubmissions = cells.reduce((sum, c) => sum + c.submissions, 0);
        const totalExpected = cells.reduce((sum, c) => sum + c.allocated, 0);
        const adherenceRate = totalExpected > 0 ? (totalSubmissions / totalExpected) * 100 : 0;

        return {
          teacherId,
          teacherName,
          cells,
          totalSubmissions,
          totalExpected,
          totalAllocatedPeriods,
          adherenceRate,
        };
      })
      .filter((row) => row.totalAllocatedPeriods > 0 || row.totalSubmissions > 0)
      .sort((a, b) => b.adherenceRate - a.adherenceRate);

    return { rows, dates: allDates, weekBlocks, weekLabels, schoolDays: SCHOOL_DAYS };
  }

  // 2. FALLBACK PATH (In-memory join of timetable_slots + dailyLogs)
  const classMap = new Map(classes.map((c) => [String(c.id), c]));
  const subjectMap = new Map(subjects.map((s) => [String(s.id), s]));
  const fallbackBookMap = new Map(books.map((b) => [String(b.id), b]));
  const periodDetailsMap = new Map(periods.map((p) => [String(p.id || p.period_id), p]));

  const teacherDaySlots = new Map();
  const assignedTeacherSlots = new Map();

  assignments.forEach((a) => {
    const key = `${a.class_id}-${a.subject_id}`;
    assignedTeacherSlots.set(key, String(a.teacher_id));
  });

  timetableSlots.forEach((slot, index) => {
    const key = `${slot.class_id}-${slot.subject_id}`;
    const teacherId = slot.teacher_id
      ? String(slot.teacher_id)
      : assignedTeacherSlots.get(key) || null;
    if (!teacherId) return;

    if (!teacherDaySlots.has(teacherId)) {
      teacherDaySlots.set(teacherId, new Map());
    }
    const dayMap = teacherDaySlots.get(teacherId);
    const day = slot.day;
    if (!dayMap.has(day)) dayMap.set(day, []);

    const cls = classMap.get(String(slot.class_id));
    const subj = subjectMap.get(String(slot.subject_id));
    const periodInfo = periodDetailsMap.get(String(slot.period_id));
    const periodNum = periodInfo?.period_number || slot.period_id || index + 1;
    const periodName = periodInfo?.name || `Period ${periodNum}`;
    const periodTime =
      periodInfo?.start_time && periodInfo?.end_time
        ? `${periodInfo.start_time} – ${periodInfo.end_time}`
        : '';

    dayMap.get(day).push({
      slotId: slot.id,
      classId: slot.class_id,
      className: cls?.name || `Class ${slot.class_id}`,
      subjectId: slot.subject_id,
      subjectName: subj?.name || `Subject ${slot.subject_id}`,
      periodId: slot.period_id,
      periodNum,
      periodName,
      periodTime,
      day: slot.day,
    });
  });

  const logEntriesMap = new Map();
  const combinedLogs = [...dailyLogs];

  if (allLogs && allLogs.length > 0) {
    allLogs.forEach((l) => {
      combinedLogs.push({
        id: l.id,
        progress_id: l.id,
        teacher_id: l.teacher_id,
        class_id: l.class_id,
        subject_id: l.subject_id,
        book_id: l.book_id,
        current_status: l.current_status || l.status || 'completed',
        progress: l.completion_percentage ?? 100,
        date: l.end_date || l.start_date || l.updated_at || l.date,
        created_at: l.updated_at || l.start_date || l.end_date,
      });
    });
  }

  combinedLogs.forEach((log) => {
    const lp = log.lesson_progress || {};
    let bookId = log.book_id || lp.book_id;
    let classId = log.class_id || lp.class_id;
    let subjectId = log.subject_id || lp.subject_id;
    const lessonTitle = lp.lesson?.title || '';
    const lessonNum = lp.lesson?.lesson_number;

    if (!subjectId && bookId) {
      const b = fallbackBookMap.get(String(bookId));
      if (b?.subject_id) subjectId = b.subject_id;
    }

    let tid = log.teacher_id ? String(log.teacher_id) : null;
    if (!tid && classId && subjectId) {
      tid = assignedTeacherSlots.get(`${classId}-${subjectId}`) || null;
    }
    if (!tid) return;

    const dateVal = log.date || log.created_at || log.updated_at || log.end_date || log.start_date;
    if (!dateVal) return;
    const dateStr = String(dateVal).slice(0, 10);
    if (!dateStr) return;

    const key = `${tid}-${dateStr}`;
    if (!logEntriesMap.has(key)) logEntriesMap.set(key, []);

    const cls = classMap.get(String(classId));
    const subj = subjectMap.get(String(subjectId));
    const book = fallbackBookMap.get(String(bookId));

    const existing = logEntriesMap.get(key);
    if (log.id && existing.some((e) => e.id === log.id)) return;

    const progressVal = Number(log.progress ?? log.completion_percentage ?? 100);
    const currentStatus =
      progressVal >= 100 ? 'completed' : log.current_status || log.status || 'in_progress';

    existing.push({
      id: log.id,
      progressId: log.progress_id,
      classId: classId ? String(classId) : '',
      className: cls?.name || (classId ? `Class ${classId}` : 'Class'),
      subjectId: subjectId ? String(subjectId) : '',
      subjectName: subj?.name || book?.title || 'Subject',
      bookId: bookId ? String(bookId) : '',
      bookName: book?.title || book?.name || '',
      lessonTitle: lessonTitle || (lessonNum ? `Lesson ${lessonNum}` : ''),
      currentStatus,
      progress: progressVal,
      date: dateVal,
      createdAt: log.created_at || dateVal,
    });
  });

  const rows = teachers
    .map((teacher) => {
      const teacherId = String(teacher.teacher_id || teacher.id);
      const daySlotsMap = teacherDaySlots.get(teacherId) || new Map();
      const totalAllocatedPeriods = SCHOOL_DAYS.reduce(
        (sum, day) => sum + (daySlotsMap.get(day)?.length || 0),
        0
      );

      const cells = allDates.map((date) => {
        const dateStr = toLocalDateStr(date);
        const dayName = getDayName(date);
        const allocatedSlots = (daySlotsMap.get(dayName) || []).slice().sort(
          (a, b) => (Number(a.periodNum) || 0) - (Number(b.periodNum) || 0)
        );
        const submissionLogs = logEntriesMap.get(`${teacherId}-${dateStr}`) || [];
        const submissions = submissionLogs.length;
        const allocated = allocatedSlots.length;

        return {
          date: dateStr,
          dayName,
          submissions,
          allocated,
          allocatedSlots,
          submissionLogs,
          status:
            allocated === 0
              ? submissions > 0
                ? 'extra'
                : 'none'
              : submissions >= allocated
                ? 'good'
                : submissions > 0
                  ? 'partial'
                  : 'missing',
        };
      });

      const totalSubmissions = cells.reduce((sum, c) => sum + c.submissions, 0);
      const totalExpected = cells.reduce((sum, c) => sum + c.allocated, 0);
      const adherenceRate = totalExpected > 0 ? (totalSubmissions / totalExpected) * 100 : 0;

      return {
        teacherId,
        teacherName: teacher.name || 'Unnamed',
        cells,
        totalSubmissions,
        totalExpected,
        totalAllocatedPeriods,
        adherenceRate,
      };
    })
    .filter((row) => row.totalAllocatedPeriods > 0 || row.totalSubmissions > 0)
    .sort((a, b) => b.adherenceRate - a.adherenceRate);

  return { rows, dates: allDates, weekBlocks, weekLabels, schoolDays: SCHOOL_DAYS };
};

export const buildBookWeeklyTrendData = ({
  classes = [],
  books = [],
  subjects = [],
  bookClasses = [],
  bookTrackers = [],
  pacingRecords = [],
  calendarRows = [],
  allLogs = [],
  weeks = 4,
  academicStartMonth = 6,
  academicEndMonth = 5,
  today = new Date(),
}) => {
  const subjectMap = new Map(subjects.map((s) => [String(s.id), s]));
  const bookMap = new Map(books.map((b) => [String(b.id), b]));

  const calculateAcademicWeekNumber = (date, startMonth) => {
    const d = new Date(date);
    const year = d.getMonth() + 1 >= startMonth ? d.getFullYear() : d.getFullYear() - 1;
    const acadStart = new Date(year, startMonth - 1, 1);
    const diffDays = Math.max(0, Math.floor((d - acadStart) / (1000 * 60 * 60 * 24)));
    return Math.floor(diffDays / 7) + 1;
  };

  // Generate 4 weekly date windows (Mon–Sun) ending with the most recent week
  const weekWindows = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const wStart = new Date(today);
    wStart.setDate(today.getDate() - w * 7 - ((today.getDay() + 6) % 7));
    wStart.setHours(0, 0, 0, 0);

    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + 6);
    wEnd.setHours(23, 59, 59, 999);

    const weekIndex = weeks - w;
    const academicWeekNum = calculateAcademicWeekNumber(wEnd, academicStartMonth);
    const shortLabel = `Acad Wk ${academicWeekNum}`;
    const dateRangeLabel = `${wStart.getDate()}/${wStart.getMonth() + 1}–${wEnd.getDate()}/${wEnd.getMonth() + 1}`;
    const fullLabel = `${shortLabel} (${dateRangeLabel})`;

    weekWindows.push({
      weekIndex,
      academicWeekNum,
      shortLabel,
      dateRangeLabel,
      fullLabel,
      startDate: wStart,
      endDate: wEnd,
    });
  }

  // Group mapped books by class
  const classBookMap = new Map();

  pacingRecords.forEach((rec) => {
    const cid = String(rec.classId);
    if (!classBookMap.has(cid)) classBookMap.set(cid, new Set());
    if (rec.bookId) classBookMap.get(cid).add(String(rec.bookId));
  });

  bookClasses.forEach((bc) => {
    const cid = String(bc.class_id);
    if (!classBookMap.has(cid)) classBookMap.set(cid, new Set());
    if (bc.book_id) classBookMap.get(cid).add(String(bc.book_id));
  });

  const resultByClass = {};

  classes.forEach((cls) => {
    const cid = String(cls.id);
    const bookIdSet = classBookMap.get(cid) || new Set();
    const classRecords = [];

    bookIdSet.forEach((bid) => {
      const book = bookMap.get(bid);
      if (!book) return;
      const subject = subjectMap.get(String(book.subject_id));

      const tracker = (bookTrackers || []).find(
        (t) => String(t.class_id) === cid && String(t.book_id) === bid
      );
      const pacingRec = (pacingRecords || []).find(
        (p) => String(p.classId) === cid && String(p.bookId) === bid
      );

      const totalLessons = toNumber(
        tracker?.total_lessons ||
          pacingRec?.totalLessons ||
          book.total_leaf_lessons ||
          book.total_lessons,
        20
      );

      const bookLogs = (allLogs || []).filter(
        (log) => String(log.class_id) === cid && String(log.book_id) === bid
      );

      const record = {
        bookId: bid,
        bookName: book.title || book.name || `Book ${bid}`,
        subjectName: subject?.name || 'Subject',
        totalLessons,
      };

      let cumulativeCompleted = 0;

      weekWindows.forEach((w) => {
        // All completed lessons logged up to the end of this academic week (date <= w.endDate)
        const lessonsUpToWeek = bookLogs.filter((log) => {
          const dt = log.date || log.created_at || log.start_date || log.updated_at;
          if (!dt) return false;
          const logDate = new Date(dt);
          return logDate <= w.endDate;
        }).length;

        // Lessons logged strictly within this week
        const lessonsThisWeek = bookLogs.filter((log) => {
          const dt = log.date || log.created_at || log.start_date || log.updated_at;
          if (!dt) return false;
          const logDate = new Date(dt);
          return logDate >= w.startDate && logDate <= w.endDate;
        }).length;

        const cumulativePct = Number(
          (Math.min(100, (lessonsUpToWeek / Math.max(totalLessons, 1)) * 100)).toFixed(1)
        );

        // Calculate expected completion % for this specific book as of this academic week
        let expectedWeekPct = 0;
        if (calendarRows && calendarRows.length > 0) {
          const startM = pacingRec?.calculatedStartMonth ?? academicStartMonth;
          const endM = pacingRec?.expectedEndMonth ?? academicEndMonth;
          const win = getWindowCoverage(calendarRows, startM, endM, w.endDate);
          if (win.beforeWindow) {
            expectedWeekPct = 0;
          } else if (win.pastWindow) {
            expectedWeekPct = 100;
          } else {
            expectedWeekPct = win.totalWindowDays > 0
              ? Number(clamp((win.elapsedWindowDays / win.totalWindowDays) * 100, 0, 100).toFixed(1))
              : 0;
          }
        } else if (pacingRec && typeof pacingRec.expectedProgress === 'number') {
          expectedWeekPct = Number(pacingRec.expectedProgress.toFixed(1));
        }

        const weekKey = `w${w.weekIndex}`;
        const weekPctKey = `w${w.weekIndex}Pct`;
        record[weekKey] = lessonsThisWeek;
        record[weekPctKey] = cumulativePct;
        record[`w${w.weekIndex}Cumulative`] = cumulativePct;
        record[`w${w.weekIndex}Expected`] = expectedWeekPct;
      });

      record.currentProgress = pacingRec
        ? Number((pacingRec.actualProgress || 0).toFixed(1))
        : Number((Math.min(100, (cumulativeCompleted / Math.max(totalLessons, 1)) * 100)).toFixed(1));

      // Book-specific expected progress from pacing records (taking into account target end month and teaching days)
      const bookExpectedProgress =
        pacingRec && typeof pacingRec.expectedProgress === 'number'
          ? Number(pacingRec.expectedProgress.toFixed(1))
          : record[`w${weekWindows.length}Expected`] || 0;

      record.expectedProgress = bookExpectedProgress;

      classRecords.push(record);
    });

    resultByClass[cid] = classRecords.sort(
      (a, b) => a.subjectName.localeCompare(b.subjectName) || a.bookName.localeCompare(b.bookName)
    );
  });

  return {
    byClass: resultByClass,
    weekWindows,
  };
};
