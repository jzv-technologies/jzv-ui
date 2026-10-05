// src/components/examinations/analysis/ExamMarkDistributionTab.jsx
import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';

/**
 * 5 Performance Groups according to Requirements:
 * Group 1: 0 - 30% marks (Critical)
 * Group 2: 31 - 50% marks (Needs Improvement)
 * Group 3: 51 - 75% marks (Satisfactory)
 * Group 4: 76 - 90% marks (Good)
 * Group 5: 91 - 100% marks (Distinction)
 */
const BUCKET_CONFIGS = [
  {
    key: 'group1',
    range: '0 - 30%',
    title: 'Critical Attention',
    color: '#ef4444',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    icon: 'fa-triangle-exclamation',
  },
  {
    key: 'group2',
    range: '31 - 50%',
    title: 'Needs Improvement',
    color: '#f97316',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: 'fa-arrow-trend-down',
  },
  {
    key: 'group3',
    range: '51 - 75%',
    title: 'Satisfactory',
    color: '#eab308',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: 'fa-circle-half-stroke',
  },
  {
    key: 'group4',
    range: '76 - 90%',
    title: 'Good Performance',
    color: '#3b82f6',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'fa-award',
  },
  {
    key: 'group5',
    range: '91 - 100%',
    title: 'Distinction',
    color: '#10b981',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: 'fa-crown',
  },
];

const CustomStackedTooltip = ({ active, payload, label, isPercentageMode }) => {
  if (!active || !payload || !payload.length) return null;

  const totalStudents = payload.reduce((sum, p) => sum + (p.payload[`${p.dataKey}_count`] || 0), 0);

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700/80 text-xs min-w-[210px] animate-in fade-in zoom-in-95 duration-150">
      <div className="font-extrabold text-sm border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between">
        <span className="truncate max-w-[140px]">{label}</span>
        <span className="text-[11px] font-normal text-slate-400">
          {totalStudents} {totalStudents === 1 ? 'student' : 'students'}
        </span>
      </div>
      <div className="space-y-1">
        {[...payload].reverse().map((entry) => {
          const count = entry.payload[`${entry.dataKey}_count`] || 0;
          const pct = entry.payload[`${entry.dataKey}_pct`] || 0;
          return (
            <div key={entry.dataKey} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-200 font-medium">{entry.name}</span>
              </div>
              <div className="flex items-center gap-1 font-bold">
                <span>{count}</span>
                <span className="text-slate-400 font-normal text-[10px]">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ExamMarkDistributionTab = ({
  schedule = null,
  classes = [],
  subjects = [],
  selectedClassIds = [],
  selectedSubjectIds = [],
  selectedSubjectId = '',
  results = [],
  entries = [],
  loading = false,
}) => {
  // View orientation: 'by-subject' (one card per subject, classes on X-axis) vs 'by-class' (one card per class, subjects on X-axis)
  const [viewOrientation, setViewOrientation] = useState('by-subject'); // 'by-subject' | 'by-class'

  // Configurable graphs per row: 1, 2, 3, or 4
  const [graphsPerRow, setGraphsPerRow] = useState(2); // 1 | 2 | 3 | 4

  // Bar Layout: Vertical vs Horizontal bars (Requirement: Option to change vertical bar to horizontal bars)
  const [barLayout, setBarLayout] = useState('vertical'); // 'vertical' | 'horizontal'

  // Show/Hide data value inside the chart (Requirement: Show or hide the data value inside the chart)
  const [showDataValues, setShowDataValues] = useState(false);

  // Display mode: absolute student count vs percentage (100% stacked)
  const [displayMode, setDisplayMode] = useState('count'); // 'count' | 'percentage'

  // Global show table toggle for all cards
  const [showAllTables, setShowAllTables] = useState(false);

  // Individual cards table toggle state: { [cardId]: boolean }
  const [cardTableOpenMap, setCardTableOpenMap] = useState({});

  // Search filter inside the view
  const [cardSearch, setCardSearch] = useState('');

  // Results map by id
  const resultsMap = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      map[String(r.id)] = r;
    });
    return map;
  }, [results]);

  // Target classes filtered
  const targetClasses = useMemo(() => {
    if (!classes || classes.length === 0) return [];
    if (!selectedClassIds || selectedClassIds.length === 0) return classes;
    return classes.filter((c) => selectedClassIds.map(String).includes(String(c.id)));
  }, [classes, selectedClassIds]);

  // Target subjects filtered (supports multi-select selectedSubjectIds and fallback selectedSubjectId)
  const targetSubjects = useMemo(() => {
    if (!subjects || subjects.length === 0) return [];
    const subjectsWithResults = new Set(results.map((r) => String(r.subject_id)));
    let list = subjects.filter((s) => subjectsWithResults.has(String(s.id)));
    if (list.length === 0) list = subjects;

    if (selectedSubjectIds && selectedSubjectIds.length > 0) {
      list = list.filter((s) => selectedSubjectIds.map(String).includes(String(s.id)));
    } else if (selectedSubjectId && selectedSubjectId !== 'all') {
      list = list.filter((s) => String(s.id) === String(selectedSubjectId));
    }
    return list;
  }, [subjects, results, selectedSubjectIds, selectedSubjectId]);

  // Helper to calculate 5-group bucket statistics for an array of marks entries
  const calculateGroupBreakdown = (matchingEntries) => {
    let g1 = 0; // 0 - 30%
    let g2 = 0; // 31 - 50%
    let g3 = 0; // 51 - 75%
    let g4 = 0; // 76 - 90%
    let g5 = 0; // 91 - 100%
    let absentCount = 0;
    let totalPercentageSum = 0;
    let evaluatedCount = 0;

    matchingEntries.forEach((entry) => {
      if (entry.is_absent) {
        absentCount++;
        return;
      }

      const res = resultsMap[String(entry.result_id)];
      const maxMarks = Number(res?.max_marks) || 100;
      const marksObtained = Number(entry.marks_obtained);

      if (isNaN(marksObtained) || marksObtained === null) return;

      const pct = Math.max(0, Math.min(100, (marksObtained / maxMarks) * 100));
      totalPercentageSum += pct;
      evaluatedCount++;

      if (pct <= 30) g1++;
      else if (pct <= 50) g2++;
      else if (pct <= 75) g3++;
      else if (pct <= 90) g4++;
      else g5++;
    });

    const totalStudents = evaluatedCount;
    const g1_pct = totalStudents > 0 ? Math.round((g1 / totalStudents) * 100 * 10) / 10 : 0;
    const g2_pct = totalStudents > 0 ? Math.round((g2 / totalStudents) * 100 * 10) / 10 : 0;
    const g3_pct = totalStudents > 0 ? Math.round((g3 / totalStudents) * 100 * 10) / 10 : 0;
    const g4_pct = totalStudents > 0 ? Math.round((g4 / totalStudents) * 100 * 10) / 10 : 0;
    const g5_pct = totalStudents > 0 ? Math.round((g5 / totalStudents) * 100 * 10) / 10 : 0;
    const avgPct = totalStudents > 0 ? Math.round((totalPercentageSum / totalStudents) * 10) / 10 : 0;
    const passingStudents = g2 + g3 + g4 + g5;
    const passRate = totalStudents > 0 ? Math.round((passingStudents / totalStudents) * 100 * 10) / 10 : 0;

    return {
      totalStudents,
      absentCount,
      avgPct,
      passRate,
      group1_count: g1,
      group2_count: g2,
      group3_count: g3,
      group4_count: g4,
      group5_count: g5,
      group1_pct: g1_pct,
      group2_pct: g2_pct,
      group3_pct: g3_pct,
      group4_pct: g4_pct,
      group5_pct: g5_pct,
      group1: displayMode === 'percentage' ? g1_pct : g1,
      group2: displayMode === 'percentage' ? g2_pct : g2,
      group3: displayMode === 'percentage' ? g3_pct : g3,
      group4: displayMode === 'percentage' ? g4_pct : g4,
      group5: displayMode === 'percentage' ? g5_pct : g5,
    };
  };

  // 1. Overall Group Totals for the 5 Top KPI Range Tiles
  const overallGroupKPIs = useMemo(() => {
    let g1 = 0;
    let g2 = 0;
    let g3 = 0;
    let g4 = 0;
    let g5 = 0;
    let totalAssessed = 0;

    entries.forEach((entry) => {
      if (entry.is_absent) return;
      const res = resultsMap[String(entry.result_id)];
      if (!res) return;

      // Filter by schedule, class, subject
      if (selectedClassIds.length > 0 && !selectedClassIds.map(String).includes(String(res.class_id))) {
        return;
      }
      if (selectedSubjectIds.length > 0 && !selectedSubjectIds.map(String).includes(String(res.subject_id))) {
        return;
      }
      if (selectedSubjectId && selectedSubjectId !== 'all' && String(res.subject_id) !== String(selectedSubjectId)) {
        return;
      }

      const maxMarks = Number(res.max_marks) || 100;
      const marksObtained = Number(entry.marks_obtained);
      if (isNaN(marksObtained) || marksObtained === null) return;

      const pct = Math.max(0, Math.min(100, (marksObtained / maxMarks) * 100));
      totalAssessed++;

      if (pct <= 30) g1++;
      else if (pct <= 50) g2++;
      else if (pct <= 75) g3++;
      else if (pct <= 90) g4++;
      else g5++;
    });

    const getPct = (cnt) => (totalAssessed > 0 ? Math.round((cnt / totalAssessed) * 100 * 10) / 10 : 0);

    return {
      totalAssessed,
      group1: { count: g1, pct: getPct(g1) },
      group2: { count: g2, pct: getPct(g2) },
      group3: { count: g3, pct: getPct(g3) },
      group4: { count: g4, pct: getPct(g4) },
      group5: { count: g5, pct: getPct(g5) },
    };
  }, [entries, resultsMap, selectedClassIds, selectedSubjectIds, selectedSubjectId]);

  // 2a. Top-10 Subjects-Class where low marks were obtained (Critical Pyramid, Red Theme)
  // Requirement: Subjects with zero students not to be counted for the graph
  const top10LowMarksPyramid = useMemo(() => {
    const list = [];

    targetClasses.forEach((cls) => {
      targetSubjects.forEach((sub) => {
        const res = results.find(
          (r) => String(r.class_id) === String(cls.id) && String(r.subject_id) === String(sub.id)
        );
        if (!res) return;

        const maxMarks = Number(res.max_marks) || 100;
        const matching = entries.filter(
          (e) => String(e.result_id) === String(res.id) && !e.is_absent && e.marks_obtained !== null
        );

        // Subjects with zero students not to be counted
        if (matching.length === 0) return;

        let lowCount = 0;
        let sumPct = 0;

        matching.forEach((e) => {
          const pct = Math.max(0, Math.min(100, (Number(e.marks_obtained) / maxMarks) * 100));
          sumPct += pct;
          if (pct <= 30) lowCount++;
        });

        const total = matching.length;
        if (total === 0) return;

        const lowPct = Math.round((lowCount / total) * 100 * 10) / 10;
        const avgMark = Math.round((sumPct / total) * 10) / 10;

        list.push({
          id: `${cls.id}_${sub.id}`,
          className: cls.name,
          subjectName: sub.name,
          subjectCode: sub.code || '',
          lowCount,
          total,
          lowPct,
          avgMark,
        });
      });
    });

    // Sort descending by lowPct (highest proportion of 0-30% marks), then ascending by avgMark
    list.sort((a, b) => {
      if (b.lowPct !== a.lowPct) return b.lowPct - a.lowPct;
      return a.avgMark - b.avgMark;
    });

    return list.slice(0, 10);
  }, [targetClasses, targetSubjects, results, entries]);

  // 2b. Top-10 Subjects-Class where high marks were obtained (Reverse Pyramid, Green Theme)
  // Requirement: Reverse pyramid using the green theme; zero students not to be counted
  const top10HighMarksPyramid = useMemo(() => {
    const list = [];

    targetClasses.forEach((cls) => {
      targetSubjects.forEach((sub) => {
        const res = results.find(
          (r) => String(r.class_id) === String(cls.id) && String(r.subject_id) === String(sub.id)
        );
        if (!res) return;

        const maxMarks = Number(res.max_marks) || 100;
        const matching = entries.filter(
          (e) => String(e.result_id) === String(res.id) && !e.is_absent && e.marks_obtained !== null
        );

        // Subjects with zero students not to be counted
        if (matching.length === 0) return;

        let distinctionCount = 0; // 91 - 100%
        let goodCount = 0; // 76 - 90%
        let sumPct = 0;

        matching.forEach((e) => {
          const pct = Math.max(0, Math.min(100, (Number(e.marks_obtained) / maxMarks) * 100));
          sumPct += pct;
          if (pct >= 91) distinctionCount++;
          else if (pct >= 76) goodCount++;
        });

        const total = matching.length;
        if (total === 0) return;

        const distinctionPct = Math.round((distinctionCount / total) * 100 * 10) / 10;
        const goodPlusDistinctionPct = Math.round(((distinctionCount + goodCount) / total) * 100 * 10) / 10;
        const avgMark = Math.round((sumPct / total) * 10) / 10;

        list.push({
          id: `${cls.id}_${sub.id}`,
          className: cls.name,
          subjectName: sub.name,
          subjectCode: sub.code || '',
          distinctionCount,
          goodCount,
          total,
          distinctionPct,
          goodPlusDistinctionPct,
          avgMark,
        });
      });
    });

    // Sort descending by avgMark (highest mean mark), then by distinctionPct
    list.sort((a, b) => {
      if (b.avgMark !== a.avgMark) return b.avgMark - a.avgMark;
      return b.distinctionPct - a.distinctionPct;
    });

    return list.slice(0, 10);
  }, [targetClasses, targetSubjects, results, entries]);

  // 3. Multi-Card Data: Individual Cards per Subject OR per Class
  // Requirement: subjects with zero students should not be shown neither in graph nor in table view
  const individualCardsData = useMemo(() => {
    if (viewOrientation === 'by-subject') {
      // Each card represents a Subject, chart shows classes on X-axis
      return targetSubjects
        .map((sub) => {
          const classChartData = targetClasses
            .map((cls) => {
              const res = results.find(
                (r) => String(r.class_id) === String(cls.id) && String(r.subject_id) === String(sub.id)
              );
              const matchingEntries = res
                ? entries.filter((e) => String(e.result_id) === String(res.id))
                : [];

              const stats = calculateGroupBreakdown(matchingEntries);

              return {
                id: cls.id,
                name: cls.name,
                ...stats,
              };
            })
            .filter((item) => item.totalStudents > 0); // Exclude zero students from graph & table

          const totalAssessed = classChartData.reduce((sum, r) => sum + r.totalStudents, 0);
          const avgSum = classChartData.reduce((sum, r) => sum + r.avgPct * r.totalStudents, 0);
          const overallAvg = totalAssessed > 0 ? Math.round((avgSum / totalAssessed) * 10) / 10 : 0;

          return {
            id: String(sub.id),
            title: sub.name,
            subtitle: sub.code ? `Subject Code: ${sub.code}` : 'Subject Distribution',
            categoryType: 'Subject',
            itemLabel: 'Class',
            totalAssessed,
            overallAvg,
            chartData: classChartData,
          };
        })
        .filter((card) => card.chartData.length > 0); // Exclude cards with no active students
    } else {
      // Each card represents a Class, chart shows subjects on X-axis
      return targetClasses
        .map((cls) => {
          const subjectChartData = targetSubjects
            .map((sub) => {
              const res = results.find(
                (r) => String(r.class_id) === String(cls.id) && String(r.subject_id) === String(sub.id)
              );
              const matchingEntries = res
                ? entries.filter((e) => String(e.result_id) === String(res.id))
                : [];

              const stats = calculateGroupBreakdown(matchingEntries);

              return {
                id: sub.id,
                name: sub.name,
                code: sub.code || sub.name.slice(0, 5),
                ...stats,
              };
            })
            .filter((item) => item.totalStudents > 0); // Exclude zero students from graph & table

          const totalAssessed = subjectChartData.reduce((sum, r) => sum + r.totalStudents, 0);
          const avgSum = subjectChartData.reduce((sum, r) => sum + r.avgPct * r.totalStudents, 0);
          const overallAvg = totalAssessed > 0 ? Math.round((avgSum / totalAssessed) * 10) / 10 : 0;

          return {
            id: String(cls.id),
            title: cls.name,
            subtitle: `Class Section (${cls.name})`,
            categoryType: 'Class',
            itemLabel: 'Subject',
            totalAssessed,
            overallAvg,
            chartData: subjectChartData,
          };
        })
        .filter((card) => card.chartData.length > 0); // Exclude cards with no active students
    }
  }, [viewOrientation, targetSubjects, targetClasses, results, entries, displayMode]);

  // Filter individual cards by search query
  const filteredCards = useMemo(() => {
    if (!cardSearch.trim()) return individualCardsData;
    const q = cardSearch.toLowerCase().trim();
    return individualCardsData.filter(
      (c) => c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)
    );
  }, [individualCardsData, cardSearch]);

  // Dynamic grid column class based on graphsPerRow
  const gridColClass = useMemo(() => {
    switch (graphsPerRow) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 lg:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      default:
        return 'grid-cols-1 lg:grid-cols-2';
    }
  }, [graphsPerRow]);

  const toggleCardTable = (cardId) => {
    setCardTableOpenMap((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-light-border rounded-3xl shadow-xs">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-dark-muted">
          Loading student mark distributions across all classes...
        </p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="text-center py-20 bg-white border border-light-border rounded-3xl p-8 shadow-xs max-w-lg mx-auto">
        <i className="fas fa-calendar-xmark text-4xl text-slate-300 mb-3 block" />
        <p className="text-sm font-bold text-dark-primary">No Exam Schedule Selected</p>
        <p className="text-xs text-dark-muted mt-1">Please select an examination schedule from the top filter.</p>
      </div>
    );
  }

  // Tier styles for Lowest Scoring Pyramid (Apex to Base)
  const lowestTierStyles = [
    'bg-rose-700 text-white shadow-rose-200', // #1 (Apex)
    'bg-rose-600 text-white shadow-rose-200', // #2
    'bg-rose-500 text-white shadow-rose-100', // #3
    'bg-red-500 text-white shadow-red-100',   // #4
    'bg-orange-600 text-white shadow-orange-100', // #5
    'bg-orange-500 text-white shadow-orange-100', // #6
    'bg-amber-600 text-white shadow-amber-100', // #7
    'bg-amber-500 text-white shadow-amber-100', // #8
    'bg-yellow-600 text-white shadow-yellow-100', // #9
    'bg-slate-700 text-white shadow-slate-200', // #10 (Base)
  ];

  // Tier styles for Highest Scoring Reverse Pyramid (Base to Apex, Green Theme)
  const highestTierStyles = [
    'bg-emerald-700 text-white shadow-emerald-200', // #1 (Widest Top)
    'bg-emerald-600 text-white shadow-emerald-200', // #2
    'bg-emerald-500 text-white shadow-emerald-100', // #3
    'bg-teal-600 text-white shadow-teal-100',       // #4
    'bg-teal-500 text-white shadow-teal-100',       // #5
    'bg-green-600 text-white shadow-green-100',     // #6
    'bg-green-500 text-white shadow-green-100',     // #7
    'bg-emerald-800 text-white shadow-emerald-200', // #8
    'bg-teal-700 text-white shadow-teal-200',       // #9
    'bg-green-700 text-white shadow-green-200',     // #10 (Narrowest Bottom)
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── 1. Top 5 Performance Group Range Tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {BUCKET_CONFIGS.map((b) => {
          const stats = overallGroupKPIs[b.key] || { count: 0, pct: 0 };
          return (
            <div
              key={b.key}
              className={`bg-white border rounded-2xl p-3.5 shadow-2xs transition-all hover:shadow-xs ${b.border}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-black uppercase tracking-wider ${b.text}`}>
                  {b.range}
                </span>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${b.bg} ${b.text}`}
                >
                  <i className={`fas ${b.icon}`} />
                </div>
              </div>
              <div className="text-2xl font-black text-dark-primary">{stats.count}</div>
              <div className="flex items-center justify-between mt-1 text-[10px] text-dark-muted font-medium">
                <span>{b.title}</span>
                <span className="font-bold text-dark-primary">{stats.pct}% of total</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 2. Top-10 Lowest & Highest Scoring Pyramids (Two Columns on Desktop, One on Mobile) ── */}
      {(top10LowMarksPyramid.length > 0 || top10HighMarksPyramid.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* ── Left Column: Top 10 Lowest Scoring Class-Subjects (Critical Pyramid) ── */}
          <div className="bg-white border border-light-border rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xs sm:text-sm font-black text-dark-primary tracking-tight flex items-center gap-2">
                  <i className="fas fa-layer-group text-rose-600" />
                  <span>Top 10 Lowest Scoring (Critical Pyramid)</span>
                </h2>
                <p className="text-[10px] text-dark-muted mt-0.5">
                  Ranked by highest proportion of students in 0 - 30% marks.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-extrabold border border-rose-200 self-start sm:self-auto">
                <i className="fas fa-triangle-exclamation text-rose-500 text-[9px]" />
                <span>Remedial Attention</span>
              </span>
            </div>

            {/* Stepped Standard Pyramid (Apex at top, Base at bottom) */}
            {top10LowMarksPyramid.length === 0 ? (
              <div className="py-12 text-center text-xs text-dark-muted">No low mark records found</div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1 w-full">
                {top10LowMarksPyramid.map((item, idx) => {
                  // Apex: 52% width -> Base: 100% width
                  const widthPct = Math.min(100, Math.round(52 + idx * 5.3));

                  return (
                    <div
                      key={item.id}
                      style={{ width: `${widthPct}%` }}
                      className={`py-1.5 px-3 rounded-xl shadow-xs transition-all hover:scale-[1.01] hover:brightness-105 flex items-center justify-between text-xs font-semibold ${lowestTierStyles[idx]}`}
                    >
                      {/* Left: Rank & Title */}
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-lg bg-black/25 flex items-center justify-center font-black text-[10px] shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-extrabold truncate text-white text-[11px]">
                          {item.className} — {item.subjectName}
                        </span>
                      </div>

                      {/* Right: Low mark % & metrics */}
                      <div className="flex items-center gap-2 shrink-0 font-bold text-right">
                        <span className="hidden sm:inline text-[10px] opacity-90">
                          Mean: <strong>{item.avgMark}%</strong>
                        </span>
                        <div className="bg-black/30 px-2 py-0.5 rounded-lg text-white font-black text-[10px] flex items-center gap-1 shadow-2xs">
                          <span>{item.lowPct}%</span>
                          <span className="text-[9px] opacity-80 font-normal">
                            ({item.lowCount}/{item.total} sts)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right Column: Top 10 Highest Scoring Class-Subjects (Reverse Pyramid, Green Theme) ── */}
          <div className="bg-white border border-light-border rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xs sm:text-sm font-black text-dark-primary tracking-tight flex items-center gap-2">
                  <i className="fas fa-arrow-down-wide-short text-emerald-600" />
                  <span>Top 10 Highest Scoring (Reverse Pyramid)</span>
                </h2>
                <p className="text-[10px] text-dark-muted mt-0.5">
                  Ranked by highest average marks and distinction rate.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200 self-start sm:self-auto">
                <i className="fas fa-crown text-emerald-500 text-[9px]" />
                <span>Academic Excellence</span>
              </span>
            </div>

            {/* Inverted / Reverse Pyramid (Base at top 100%, Apex at bottom 52%) */}
            {top10HighMarksPyramid.length === 0 ? (
              <div className="py-12 text-center text-xs text-dark-muted">No high mark records found</div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1 w-full">
                {top10HighMarksPyramid.map((item, idx) => {
                  // Base at top (100% width) -> Apex at bottom (52% width)
                  const widthPct = Math.min(100, Math.round(100 - idx * 5.3));

                  return (
                    <div
                      key={item.id}
                      style={{ width: `${widthPct}%` }}
                      className={`py-1.5 px-3 rounded-xl shadow-xs transition-all hover:scale-[1.01] hover:brightness-105 flex items-center justify-between text-xs font-semibold ${highestTierStyles[idx]}`}
                    >
                      {/* Left: Rank & Title */}
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-lg bg-black/25 flex items-center justify-center font-black text-[10px] shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-extrabold truncate text-white text-[11px]">
                          {item.className} — {item.subjectName}
                        </span>
                      </div>

                      {/* Right: Distinction % & Mean */}
                      <div className="flex items-center gap-2 shrink-0 font-bold text-right">
                        <span className="hidden sm:inline text-[10px] opacity-90">
                          Mean: <strong>{item.avgMark}%</strong>
                        </span>
                        <div className="bg-black/30 px-2 py-0.5 rounded-lg text-white font-black text-[10px] flex items-center gap-1 shadow-2xs">
                          <span>{item.distinctionPct}% Distinction</span>
                          <span className="text-[9px] opacity-80 font-normal">
                            ({item.distinctionCount}/{item.total} sts)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3. Multi-Chart Interactive Grid (Class-wise & Subject-wise) ── */}
      <div className="bg-white border border-light-border rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm sm:text-base font-black text-dark-primary tracking-tight flex items-center gap-2">
              <i className="fas fa-chart-column text-violet-600" />
              <span>
                {viewOrientation === 'by-subject'
                  ? 'Subject-wise Class Breakdown'
                  : 'Class-wise Subject Breakdown'}
              </span>
            </h2>
            <p className="text-[11px] font-medium text-dark-muted mt-0.5">
              Viewing stacked performance distributions (zero-student subjects/classes excluded).
            </p>
          </div>

          {/* View Options & Configurable Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* View Orientation: By Subject vs By Class */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-bold text-dark-muted border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewOrientation('by-subject')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewOrientation === 'by-subject'
                    ? 'bg-white text-dark-primary shadow-2xs font-extrabold'
                    : 'hover:text-dark-primary'
                }`}
              >
                By Subject
              </button>
              <button
                type="button"
                onClick={() => setViewOrientation('by-class')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewOrientation === 'by-class'
                    ? 'bg-white text-dark-primary shadow-2xs font-extrabold'
                    : 'hover:text-dark-primary'
                }`}
              >
                By Class
              </button>
            </div>

            {/* Bar Direction: Vertical vs Horizontal (Requirement: Option to change vertical bar to horizontal bars) */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-bold text-dark-muted border border-slate-200/60">
              <button
                type="button"
                onClick={() => setBarLayout('vertical')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  barLayout === 'vertical'
                    ? 'bg-white text-dark-primary shadow-2xs font-extrabold'
                    : 'hover:text-dark-primary'
                }`}
                title="Vertical stacked bar chart"
              >
                <i className="fas fa-chart-column text-violet-600 text-[11px]" />
                <span className="hidden sm:inline">Vertical</span>
              </button>
              <button
                type="button"
                onClick={() => setBarLayout('horizontal')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  barLayout === 'horizontal'
                    ? 'bg-white text-dark-primary shadow-2xs font-extrabold'
                    : 'hover:text-dark-primary'
                }`}
                title="Horizontal stacked bar chart"
              >
                <i className="fas fa-bars-staggered text-violet-600 text-[11px]" />
                <span className="hidden sm:inline">Horizontal</span>
              </button>
            </div>

            {/* Show/Hide Data Values (Requirement: Show or hide the data value inside the chart) */}
            <button
              type="button"
              onClick={() => setShowDataValues((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                showDataValues
                  ? 'bg-violet-600 text-white border-violet-700 shadow-violet-200'
                  : 'bg-white text-dark-muted border-light-border hover:bg-slate-50 hover:text-dark-primary'
              }`}
              title="Show numerical values inside bar segments"
            >
              <i className={`fas ${showDataValues ? 'fa-eye' : 'fa-eye-slash'} text-[11px]`} />
              <span>{showDataValues ? 'Values ON' : 'Values'}</span>
            </button>

            {/* Configurable Graphs Per Row: 1 to 4 */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-xl text-xs font-bold text-dark-muted">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 hidden sm:inline">
                Cols:
              </span>
              {[1, 2, 3, 4].map((colNum) => (
                <button
                  key={colNum}
                  type="button"
                  onClick={() => setGraphsPerRow(colNum)}
                  className={`w-6 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    graphsPerRow === colNum
                      ? 'bg-violet-600 text-white shadow-2xs'
                      : 'hover:bg-slate-200 text-dark-muted'
                  }`}
                  title={`${colNum} graph${colNum > 1 ? 's' : ''} per row`}
                >
                  {colNum}
                </button>
              ))}
            </div>

            {/* Display Mode: Count vs Percentage */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-bold text-dark-muted border border-slate-200/60">
              <button
                type="button"
                onClick={() => setDisplayMode('count')}
                className={`px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                  displayMode === 'count'
                    ? 'bg-white text-dark-primary shadow-2xs font-extrabold'
                    : 'hover:text-dark-primary'
                }`}
              >
                Count
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('percentage')}
                className={`px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                  displayMode === 'percentage'
                    ? 'bg-white text-dark-primary shadow-2xs font-extrabold'
                    : 'hover:text-dark-primary'
                }`}
              >
                % Stack
              </button>
            </div>

            {/* Global Show All Tables Toggle */}
            <button
              type="button"
              onClick={() => setShowAllTables((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                showAllTables
                  ? 'bg-violet-50 text-violet-700 border-violet-300'
                  : 'bg-white text-dark-muted border-light-border hover:bg-slate-50'
              }`}
            >
              <i className="fas fa-table text-violet-600" />
              <span>{showAllTables ? 'Hide Tables' : 'All Tables'}</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            {BUCKET_CONFIGS.map((b) => (
              <div
                key={b.key}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold bg-slate-50/70 border-slate-200/60 text-dark-primary"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                <span>{b.range}</span>
              </div>
            ))}
          </div>

          {/* Quick Search */}
          <div className="w-full sm:w-56 relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
            <input
              type="text"
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
              placeholder={`Search ${viewOrientation === 'by-subject' ? 'subject' : 'class'}...`}
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 font-semibold"
            />
          </div>
        </div>

        {/* ── Multi-Card Grid ── */}
        {filteredCards.length === 0 ? (
          <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <i className="fas fa-chart-simple text-4xl text-slate-300 mb-3 block" />
            <p className="text-xs font-bold text-dark-primary">No examination data available</p>
            <p className="text-[11px] text-dark-muted mt-0.5">
              Try adjusting the top filters or choosing another examination event.
            </p>
          </div>
        ) : (
          <div className={`grid gap-4 sm:gap-6 ${gridColClass}`}>
            {filteredCards.map((card) => {
              const isTableOpen = showAllTables || Boolean(cardTableOpenMap[card.id]);
              // Dynamic height for horizontal bar layout based on number of items
              const horizontalHeight = Math.max(220, card.chartData.length * 36 + 45);

              return (
                <div
                  key={card.id}
                  className="bg-white border border-light-border rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-dark-primary truncate" title={card.title}>
                        {card.title}
                      </h3>
                      <p className="text-[10px] text-dark-muted font-medium mt-0.5">
                        {card.totalAssessed} students assessed • Mean: <span className="font-bold text-violet-700">{card.overallAvg}%</span>
                      </p>
                    </div>

                    {/* Show/Hide Table Button on this Card */}
                    <button
                      type="button"
                      onClick={() => toggleCardTable(card.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                        isTableOpen
                          ? 'bg-violet-100 text-violet-800 border-violet-200'
                          : 'bg-slate-50 text-dark-muted border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <i className="fas fa-table" />
                      <span>{isTableOpen ? 'Hide' : 'Table'}</span>
                    </button>
                  </div>

                  {/* Card Stacked Bar Chart (Vertical OR Horizontal) */}
                  {card.chartData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs text-dark-muted">
                      No active students
                    </div>
                  ) : barLayout === 'vertical' ? (
                    /* ── Vertical Bars ── */
                    <div className="w-full h-56 pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={card.chartData}
                          layout="horizontal"
                          margin={{ top: 12, right: 10, left: -20, bottom: 20 }}
                          barSize={graphsPerRow >= 3 ? 18 : 26}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: '#475569', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            unit={displayMode === 'percentage' ? '%' : ''}
                          />
                          <Tooltip content={<CustomStackedTooltip isPercentageMode={displayMode === 'percentage'} />} />
                          <Bar dataKey="group1" name="0-30%" stackId="stack" fill="#ef4444">
                            {showDataValues && (
                              <LabelList
                                dataKey="group1"
                                position="center"
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight={700}
                                formatter={(v) => (v > 0 ? (displayMode === 'percentage' ? `${v}%` : v) : '')}
                              />
                            )}
                          </Bar>
                          <Bar dataKey="group2" name="31-50%" stackId="stack" fill="#f97316">
                            {showDataValues && (
                              <LabelList
                                dataKey="group2"
                                position="center"
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight={700}
                                formatter={(v) => (v > 0 ? (displayMode === 'percentage' ? `${v}%` : v) : '')}
                              />
                            )}
                          </Bar>
                          <Bar dataKey="group3" name="51-75%" stackId="stack" fill="#eab308">
                            {showDataValues && (
                              <LabelList
                                dataKey="group3"
                                position="center"
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight={700}
                                formatter={(v) => (v > 0 ? (displayMode === 'percentage' ? `${v}%` : v) : '')}
                              />
                            )}
                          </Bar>
                          <Bar dataKey="group4" name="76-90%" stackId="stack" fill="#3b82f6">
                            {showDataValues && (
                              <LabelList
                                dataKey="group4"
                                position="center"
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight={700}
                                formatter={(v) => (v > 0 ? (displayMode === 'percentage' ? `${v}%` : v) : '')}
                              />
                            )}
                          </Bar>
                          <Bar dataKey="group5" name="91-100%" stackId="stack" fill="#10b981" radius={[3, 3, 0, 0]}>
                            {showDataValues && (
                              <LabelList
                                dataKey="group5"
                                position="center"
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight={700}
                                formatter={(v) => (v > 0 ? (displayMode === 'percentage' ? `${v}%` : v) : '')}
                              />
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    /* ── Horizontal Bars (Requirement: Option to change vertical bar to horizontal bars) ── */
                    <div className="w-full pt-1" style={{ height: `${horizontalHeight}px` }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={card.chartData}
                          layout="vertical"
                          margin={{ top: 10, right: 25, left: 10, bottom: 10 }}
                          barSize={18}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis
                            type="number"
                            tick={{ fill: '#475569', fontSize: 10 }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                            unit={displayMode === 'percentage' ? '%' : ''}
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            width={75}
                          />
                          <Tooltip content={<CustomStackedTooltip isPercentageMode={displayMode === 'percentage'} />} />
                          <Bar dataKey="group1" name="0-30%" stackId="stack" fill="#ef4444">
                            {showDataValues && (
                              <LabelList
                                dataKey="group1"
                                position="center"
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight={700}
                                formatter={(v) => (v > 0 ? (displayMode === 'percentage' ? `${v}%` : v) : '')}
                              />
                            )}
                          </Bar>
                          <Bar dataKey="group2" name="31-50%" stackId="stack" fill="#f97316">
                            {showDataValues && (
                              <LabelList
                                dataKey="group2"
                                position="center"
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight={700}
                                formatter={(v) => (v > 0 ? (displayMode === 'percentage' ? `${v}%` : v) : '')}
                              />
                            )}
                          </Bar>
                          <Bar dataKey="group3" name="51-75%" stackId="stack" fill="#eab308">
                            {showDataValues && (
                              <LabelList
                                dataKey="group3"
                                position="center"
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight={700}
                                formatter={(v) => (v > 0 ? (displayMode === 'percentage' ? `${v}%` : v) : '')}
                              />
                            )}
                          </Bar>
                          <Bar dataKey="group4" name="76-90%" stackId="stack" fill="#3b82f6">
                            {showDataValues && (
                              <LabelList
                                dataKey="group4"
                                position="center"
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight={700}
                                formatter={(v) => (v > 0 ? (displayMode === 'percentage' ? `${v}%` : v) : '')}
                              />
                            )}
                          </Bar>
                          <Bar dataKey="group5" name="91-100%" stackId="stack" fill="#10b981" radius={[0, 3, 3, 0]}>
                            {showDataValues && (
                              <LabelList
                                dataKey="group5"
                                position="center"
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight={700}
                                formatter={(v) => (v > 0 ? (displayMode === 'percentage' ? `${v}%` : v) : '')}
                              />
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Card Data Table (Shown just below the chart component when toggled; zero students excluded) */}
                  {isTableOpen && (
                    <div className="pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-50 font-black text-dark-muted uppercase text-[9px] tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-1.5 px-2.5">{card.itemLabel}</th>
                              <th className="py-1.5 px-1.5 text-right">Students</th>
                              <th className="py-1.5 px-1.5 text-right text-rose-600">0-30%</th>
                              <th className="py-1.5 px-1.5 text-right text-orange-600">31-50%</th>
                              <th className="py-1.5 px-1.5 text-right text-amber-600">51-75%</th>
                              <th className="py-1.5 px-1.5 text-right text-blue-600">76-90%</th>
                              <th className="py-1.5 px-1.5 text-right text-emerald-600">91-100%</th>
                              <th className="py-1.5 px-2 text-right">Mean</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {card.chartData.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50/60">
                                <td className="py-1 px-2.5 font-bold text-dark-primary truncate max-w-[120px]">
                                  {row.name}
                                </td>
                                <td className="py-1 px-1.5 text-right font-bold text-dark-primary">
                                  {row.totalStudents}
                                </td>
                                <td className="py-1 px-1.5 text-right font-medium text-rose-700 bg-rose-50/20">
                                  {row.group1_count}{' '}
                                  <span className="text-[9px] text-slate-400">({row.group1_pct}%)</span>
                                </td>
                                <td className="py-1 px-1.5 text-right font-medium text-orange-700 bg-orange-50/20">
                                  {row.group2_count}{' '}
                                  <span className="text-[9px] text-slate-400">({row.group2_pct}%)</span>
                                </td>
                                <td className="py-1 px-1.5 text-right font-medium text-amber-700 bg-amber-50/20">
                                  {row.group3_count}{' '}
                                  <span className="text-[9px] text-slate-400">({row.group3_pct}%)</span>
                                </td>
                                <td className="py-1 px-1.5 text-right font-medium text-blue-700 bg-blue-50/20">
                                  {row.group4_count}{' '}
                                  <span className="text-[9px] text-slate-400">({row.group4_pct}%)</span>
                                </td>
                                <td className="py-1 px-1.5 text-right font-medium text-emerald-700 bg-emerald-50/20">
                                  {row.group5_count}{' '}
                                  <span className="text-[9px] text-slate-400">({row.group5_pct}%)</span>
                                </td>
                                <td className="py-1 px-2 text-right font-extrabold text-dark-primary">
                                  {row.avgPct}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamMarkDistributionTab;
