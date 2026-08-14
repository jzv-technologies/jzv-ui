export const DEFAULT_WORKING_DAYS = 22;
export const DEFAULT_TEACHING_DAYS = 20;

export const ACADEMIC_MONTHS = [
  { month: 6, label: 'Jun' },
  { month: 7, label: 'Jul' },
  { month: 8, label: 'Aug' },
  { month: 9, label: 'Sep' },
  { month: 10, label: 'Oct' },
  { month: 11, label: 'Nov' },
  { month: 12, label: 'Dec' },
  { month: 1, label: 'Jan' },
  { month: 2, label: 'Feb' },
  { month: 3, label: 'Mar' },
];

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
  const startYear = today.getMonth() + 1 >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  return formatAcademicYearLabel(startYear);
};

export const getAcademicMonthYear = (startYear, month) => (month >= 6 ? startYear : startYear + 1);

export const buildAcademicCalendarRows = (academicYearLabel, calendarEntries = []) => {
  const startYear = parseAcademicYearLabel(academicYearLabel);
  const entryMap = new Map(calendarEntries.map((entry) => [`${entry.year}-${entry.month}`, entry]));

  return ACADEMIC_MONTHS.map(({ month, label }) => {
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

export const buildPacingRecords = ({
  bookClasses = [],
  bookTrackers = [],
  books = [],
  subjects = [],
  classes = [],
  calendarRows = [],
  periodsPerWeekMap = new Map(),
  today = new Date(),
}) => {
  const coverageRows = getCalendarCoverageRows(calendarRows, today);
  const totalTeachingDays = coverageRows.reduce((sum, row) => sum + toNumber(row.teaching_days), 0);
  const elapsedTeachingDays = coverageRows.reduce((sum, row) => sum + row.elapsedTeachingDays, 0);

  const bookMap = new Map(books.map((book) => [String(book.id), book]));
  const subjectMap = new Map(subjects.map((subject) => [String(subject.id), subject]));
  const classMap = new Map(classes.map((item) => [String(item.id), item]));
  const trackerMap = new Map(
    bookTrackers.map((tracker) => [`${tracker.class_id}-${tracker.book_id}`, tracker])
  );

  return bookClasses
    .map((mapping) => {
      const book = bookMap.get(String(mapping.book_id));
      if (!book) return null;

      const subject = subjectMap.get(String(book.subject_id));
      const classRecord = classMap.get(String(mapping.class_id));
      const tracker = trackerMap.get(`${mapping.class_id}-${mapping.book_id}`);
      const periodsPerWeek = periodsPerWeekMap.get(`${mapping.class_id}-${book.subject_id}`) || 0;
      const estimatedPeriods = toNumber(mapping.estimated_periods, 0);
      const actualProgress = clamp(toNumber(tracker?.completion_percentage, 0), 0, 100);
      const periodsAvailableToDate = periodsPerWeek * (elapsedTeachingDays / 5);
      const expectedProgress =
        estimatedPeriods > 0 && periodsPerWeek > 0
          ? clamp((periodsAvailableToDate / estimatedPeriods) * 100, 0, 100)
          : totalTeachingDays > 0
            ? clamp((elapsedTeachingDays / totalTeachingDays) * 100, 0, 100)
            : 0;

      return {
        id: mapping.id,
        classId: mapping.class_id,
        className: classRecord?.name || `Class ${mapping.class_id}`,
        bookId: mapping.book_id,
        bookName: book.name || 'Untitled Book',
        subjectId: book.subject_id,
        subjectName: subject?.name || 'Untitled Subject',
        classificationId: subject?.classification_id || null,
        actualProgress,
        expectedProgress,
        periodsPerWeek,
        periodsAvailableToDate,
        estimatedPeriods: estimatedPeriods > 0 ? estimatedPeriods : null,
        periodsUsedApprox: estimatedPeriods > 0 ? (estimatedPeriods * actualProgress) / 100 : null,
        totalLessons: toNumber(tracker?.total_lessons, 0),
        completedLessons: toNumber(tracker?.completed, 0),
        trackerUpdatedAt: tracker?.updated_at || null,
      };
    })
    .filter(Boolean);
};

export const buildOverviewSummary = ({
  pacingRecords = [],
  dailyLogs = [],
  carryForwards = [],
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

  const pacingCounts = trackedRecords.reduce(
    (accumulator, record) => {
      const delta = record.actualProgress - record.expectedProgress;
      if (delta >= -10) accumulator.onTrack += 1;
      else if (delta >= -25) accumulator.behind += 1;
      else accumulator.critical += 1;
      return accumulator;
    },
    { onTrack: 0, behind: 0, critical: 0 }
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

  return {
    totalTracked,
    classCount,
    avgCompletion,
    avgExpected,
    pacingCounts,
    recentLogsCount: recentLogs.length,
    recentCarryForwardsCount: recentCarryForwards.length,
    previousCarryForwardsCount: previousCarryForwards.length,
  };
};

export const buildHeatmapModel = ({
  classes = [],
  subjects = [],
  classifications = [],
  pacingRecords = [],
}) => {
  const subjectIdsWithMappings = new Set(pacingRecords.map((record) => String(record.subjectId)));
  const subjectColumns = subjects
    .filter((subject) => subjectIdsWithMappings.has(String(subject.id)))
    .sort((left, right) => {
      const leftClassification = String(left.classification_id || '');
      const rightClassification = String(right.classification_id || '');
      if (leftClassification !== rightClassification) {
        return leftClassification.localeCompare(rightClassification);
      }
      return String(left.name || '').localeCompare(String(right.name || ''));
    });

  const classificationMap = new Map(
    classifications.map((classification) => [String(classification.id), classification])
  );
  const rows = classes
    .map((classRecord) => {
      const cells = {};

      subjectColumns.forEach((subject) => {
        const records = pacingRecords.filter(
          (record) =>
            String(record.classId) === String(classRecord.id) &&
            String(record.subjectId) === String(subject.id)
        );

        if (records.length === 0) {
          cells[subject.id] = { hasData: false, pct: null };
          return;
        }

        const avg = (items, field) =>
          items.reduce((sum, item) => sum + toNumber(item[field]), 0) / items.length;

        cells[subject.id] = {
          hasData: true,
          pct: Math.round(avg(records, 'actualProgress')),
          expectedPct: Math.round(avg(records, 'expectedProgress')),
          estimatedPeriods: records.reduce(
            (sum, item) => sum + toNumber(item.estimatedPeriods, 0),
            0
          ),
          periodsAvailableToDate: records.reduce(
            (sum, item) => sum + toNumber(item.periodsAvailableToDate),
            0
          ),
          periodsUsedApprox: records.reduce(
            (sum, item) => sum + toNumber(item.periodsUsedApprox),
            0
          ),
        };
      });

      return {
        classId: classRecord.id,
        className: classRecord.name || `Class ${classRecord.id}`,
        cells,
      };
    })
    .filter((row) => Object.values(row.cells).some((cell) => cell.hasData));

  const classificationGroups = [];
  let currentGroup = null;

  subjectColumns.forEach((subject) => {
    const classificationId = String(subject.classification_id || 'none');
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
        title: 'Stalled subject',
        description: `${record.className} / ${record.subjectName} has not moved in the last 14 days.`,
        meta: latestUpdatedAt
          ? `Last activity: ${new Date(latestUpdatedAt).toLocaleDateString()}`
          : 'No recent progress updates found.',
      });
    }

    const delta = record.actualProgress - record.expectedProgress;
    if (delta <= -15) {
      alerts.push({
        id: `behind-${record.classId}-${record.bookId}`,
        severity: delta <= -25 ? 'critical' : 'high',
        title: 'Behind schedule',
        description: `${record.className} / ${record.bookName} is ${Math.abs(delta).toFixed(0)} pts behind expected pacing.`,
        meta: `Actual ${record.actualProgress.toFixed(0)}% vs expected ${record.expectedProgress.toFixed(0)}%`,
      });
    }

    if (!record.estimatedPeriods) {
      alerts.push({
        id: `estimate-${record.id}`,
        severity: 'medium',
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

export const buildClassDonutData = ({ classes = [], bookTrackers = [] }) => {
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
            notStarted: 0,
          });
        }

        const bucket = map.get(key);
        bucket.completed += toNumber(tracker.completed, 0);
        bucket.inProgress += toNumber(tracker.in_progress, 0);
        bucket.notStarted += toNumber(tracker.not_started, 0);
        return map;
      }, new Map())
      .values()
  )
    .map((item) => ({
      ...item,
      total: item.completed + item.inProgress + item.notStarted,
    }))
    .sort((left, right) => left.className.localeCompare(right.className));
};

export const buildTeacherActivityData = ({
  teachers = [],
  dailyLogs = [],
  lessonPlans = [],
  carryForwards = [],
  assignments = [],
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

  return teachers
    .map((teacher) => {
      const teacherId = String(teacher.id);
      const totalPlans = lessonPlans.filter(
        (plan) => assignmentMap.get(`${plan.class_id}-${plan.subject_id}`) === teacherId
      ).length;
      const completedPlans = lessonPlans.filter(
        (plan) =>
          assignmentMap.get(`${plan.class_id}-${plan.subject_id}`) === teacherId &&
          plan.status === 'completed'
      ).length;
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
      const adherence = totalPlans > 0 ? (completedPlans / totalPlans) * 100 : 0;

      return {
        teacherId: teacher.id,
        teacherName: teacher.name || 'Unnamed teacher',
        totalPlans,
        completedPlans,
        logs7d,
        carryForwards7d,
        adherence,
      };
    })
    .filter((item) => item.totalPlans > 0 || item.logs7d > 0 || item.carryForwards7d > 0)
    .sort((left, right) => right.logs7d - left.logs7d || right.adherence - left.adherence);
};

export const buildEstimateRows = ({
  bookClasses = [],
  books = [],
  subjects = [],
  classes = [],
  periodsPerWeekMap = new Map(),
}) => {
  const bookMap = new Map(books.map((book) => [String(book.id), book]));
  const subjectMap = new Map(subjects.map((subject) => [String(subject.id), subject]));
  const classMap = new Map(classes.map((classRecord) => [String(classRecord.id), classRecord]));

  return bookClasses
    .map((mapping) => {
      const book = bookMap.get(String(mapping.book_id));
      if (!book) return null;
      const subject = subjectMap.get(String(book.subject_id));
      const classRecord = classMap.get(String(mapping.class_id));
      const periodsPerWeek = periodsPerWeekMap.get(`${mapping.class_id}-${book.subject_id}`) || 0;
      const numericEstimate = toNumber(mapping.estimated_periods, 0);

      return {
        mappingId: mapping.id,
        classId: mapping.class_id,
        className: classRecord?.name || `Class ${mapping.class_id}`,
        subjectId: book.subject_id,
        subjectName: subject?.name || 'Untitled Subject',
        bookId: mapping.book_id,
        bookName: book.name || 'Untitled Book',
        estimatedPeriods:
          mapping.estimated_periods == null ? '' : String(mapping.estimated_periods),
        periodsPerWeek,
        weeksToComplete:
          periodsPerWeek > 0 && numericEstimate > 0 ? numericEstimate / periodsPerWeek : null,
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
