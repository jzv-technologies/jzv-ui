// src/components/examinations/analysis/ExamScheduleComparisonTab.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { supabase } from '../../../utils/supabase';

const ExamScheduleComparisonTab = ({
  schedules = [],
  baseSchedule = null,
  classes = [],
  subjects = [],
  selectedClassIds = [],
  selectedSubjectIds = [],
  selectedSubjectId = '',
  baseResults = [],
  baseEntries = [],
  userRoles = [],
}) => {
  // Second schedule to compare with
  const [compareScheduleId, setCompareScheduleId] = useState('');
  const [compareResults, setCompareResults] = useState([]);
  const [compareEntries, setCompareEntries] = useState([]);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [chartGroupBy, setChartGroupBy] = useState('subject'); // 'subject' | 'class'
  const [sortKey, setSortKey] = useState('delta');
  const [sortDir, setSortDir] = useState('asc');

  // Auto-select a different schedule for comparison if available
  useEffect(() => {
    if (schedules.length > 1 && !compareScheduleId) {
      const other = schedules.find((s) => String(s.id) !== String(baseSchedule?.id));
      if (other) {
        setCompareScheduleId(String(other.id));
      }
    }
  }, [schedules, baseSchedule, compareScheduleId]);

  // Fetch comparison schedule data when compareScheduleId changes
  useEffect(() => {
    if (!compareScheduleId) {
      setCompareResults([]);
      setCompareEntries([]);
      return;
    }

    const fetchCompareData = async () => {
      setLoadingCompare(true);
      try {
        const { data: resData } = await supabase
          .from('exam_results')
          .select('id, schedule_id, class_id, subject_id, max_marks')
          .eq('schedule_id', Number(compareScheduleId));

        const rList = resData || [];
        setCompareResults(rList);

        if (rList.length > 0) {
          const resIds = rList.map((r) => r.id);
          const CHUNK_SIZE = 100;
          let allEntries = [];

          for (let i = 0; i < resIds.length; i += CHUNK_SIZE) {
            const chunkIds = resIds.slice(i, i + CHUNK_SIZE);
            let from = 0;
            const PAGE_SIZE = 1000;

            while (true) {
              const { data: entData, error: entErr } = await supabase
                .from('exam_result_entries')
                .select('id, result_id, student_id, marks_obtained, is_absent')
                .in('result_id', chunkIds)
                .range(from, from + PAGE_SIZE - 1);

              if (entErr) throw entErr;
              if (!entData || entData.length === 0) break;
              allEntries.push(...entData);
              if (entData.length < PAGE_SIZE) break;
              from += PAGE_SIZE;
            }
          }

          setCompareEntries(allEntries);
        } else {
          setCompareEntries([]);
        }
      } catch (err) {
        console.error('Failed to load comparison schedule data:', err);
      } finally {
        setLoadingCompare(false);
      }
    };

    fetchCompareData();
  }, [compareScheduleId]);

  const compareSchedule = useMemo(() => {
    return schedules.find((s) => String(s.id) === String(compareScheduleId)) || null;
  }, [schedules, compareScheduleId]);

  // Helper to compute standard deviation for an array of marks percentages
  const computeStdDev = (entriesList, resultsList, classId, subjectId) => {
    const res = resultsList.find(
      (r) => String(r.class_id) === String(classId) && String(r.subject_id) === String(subjectId)
    );
    if (!res) return null;

    const maxMarks = Number(res.max_marks) || 100;
    const matching = entriesList.filter(
      (e) => String(e.result_id) === String(res.id) && !e.is_absent && e.marks_obtained !== null
    );

    if (matching.length < 2) return matching.length === 1 ? 0 : null;

    const pcts = matching.map((e) =>
      Math.max(0, Math.min(100, (Number(e.marks_obtained) / maxMarks) * 100))
    );
    const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const variance = pcts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pcts.length;
    return Math.round(Math.sqrt(variance) * 10) / 10;
  };

  // Filtered classes
  const targetClasses = useMemo(() => {
    if (!classes || classes.length === 0) return [];
    if (!selectedClassIds || selectedClassIds.length === 0) return classes;
    return classes.filter((c) => selectedClassIds.map(String).includes(String(c.id)));
  }, [classes, selectedClassIds]);

  // Filtered subjects
  const targetSubjects = useMemo(() => {
    if (!subjects || subjects.length === 0) return [];
    if (selectedSubjectIds && selectedSubjectIds.length > 0) {
      return subjects.filter((s) => selectedSubjectIds.map(String).includes(String(s.id)));
    }
    if (selectedSubjectId && selectedSubjectId !== 'all') {
      return subjects.filter((s) => String(s.id) === String(selectedSubjectId));
    }
    return subjects;
  }, [subjects, selectedSubjectIds, selectedSubjectId]);

  // Comparative pairs: Class x Subject
  const comparisonRows = useMemo(() => {
    const rows = [];

    targetClasses.forEach((cls) => {
      targetSubjects.forEach((sub) => {
        const stdDevA = computeStdDev(baseEntries, baseResults, cls.id, sub.id);
        const stdDevB = computeStdDev(compareEntries, compareResults, cls.id, sub.id);

        if (stdDevA !== null || stdDevB !== null) {
          const delta =
            stdDevA !== null && stdDevB !== null ? Math.round((stdDevB - stdDevA) * 10) / 10 : null;

          rows.push({
            id: `${cls.id}_${sub.id}`,
            classId: cls.id,
            className: cls.name,
            subjectId: sub.id,
            subjectName: sub.name,
            stdDevA,
            stdDevB,
            delta,
          });
        }
      });
    });

    return rows;
  }, [targetClasses, targetSubjects, baseEntries, baseResults, compareEntries, compareResults]);

  // Grouped Chart Data
  const chartData = useMemo(() => {
    if (chartGroupBy === 'subject') {
      // Group by subject, showing average stdDev across classes for Sched A and Sched B
      return targetSubjects
        .map((sub) => {
          const related = comparisonRows.filter((r) => String(r.subjectId) === String(sub.id));
          const validA = related.map((r) => r.stdDevA).filter((v) => v !== null);
          const validB = related.map((r) => r.stdDevB).filter((v) => v !== null);

          const avgA =
            validA.length > 0 ? Math.round((validA.reduce((a, b) => a + b, 0) / validA.length) * 10) / 10 : 0;
          const avgB =
            validB.length > 0 ? Math.round((validB.reduce((a, b) => a + b, 0) / validB.length) * 10) / 10 : 0;

          if (validA.length === 0 && validB.length === 0) return null;

          return {
            name: sub.name,
            code: sub.code || sub.name.slice(0, 4),
            [baseSchedule?.name || 'Schedule 1']: avgA,
            [compareSchedule?.name || 'Schedule 2']: avgB,
            delta: Math.round((avgB - avgA) * 10) / 10,
          };
        })
        .filter(Boolean);
    } else {
      // Group by class
      return targetClasses
        .map((cls) => {
          const related = comparisonRows.filter((r) => String(r.classId) === String(cls.id));
          const validA = related.map((r) => r.stdDevA).filter((v) => v !== null);
          const validB = related.map((r) => r.stdDevB).filter((v) => v !== null);

          const avgA =
            validA.length > 0 ? Math.round((validA.reduce((a, b) => a + b, 0) / validA.length) * 10) / 10 : 0;
          const avgB =
            validB.length > 0 ? Math.round((validB.reduce((a, b) => a + b, 0) / validB.length) * 10) / 10 : 0;

          if (validA.length === 0 && validB.length === 0) return null;

          return {
            name: cls.name,
            code: cls.name,
            [baseSchedule?.name || 'Schedule 1']: avgA,
            [compareSchedule?.name || 'Schedule 2']: avgB,
            delta: Math.round((avgB - avgA) * 10) / 10,
          };
        })
        .filter(Boolean);
    }
  }, [comparisonRows, chartGroupBy, targetSubjects, targetClasses, baseSchedule, compareSchedule]);

  // Overall Comparative KPIs
  const comparisonKPIs = useMemo(() => {
    const validPairs = comparisonRows.filter((r) => r.delta !== null);
    if (validPairs.length === 0) {
      return {
        overallDelta: 0,
        improvedCount: 0,
        widenedCount: 0,
        bestImprovement: null,
      };
    }

    const totalDelta = validPairs.reduce((acc, r) => acc + r.delta, 0);
    const overallDelta = Math.round((totalDelta / validPairs.length) * 10) / 10;
    const improvedCount = validPairs.filter((r) => r.delta < 0).length;
    const widenedCount = validPairs.filter((r) => r.delta > 0).length;

    // Best improvement = most negative delta
    const sorted = [...validPairs].sort((a, b) => a.delta - b.delta);
    const bestImprovement = sorted[0];

    return {
      overallDelta,
      improvedCount,
      widenedCount,
      bestImprovement,
    };
  }, [comparisonRows]);

  // Sorted Table
  const sortedRows = useMemo(() => {
    const list = [...comparisonRows];
    list.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
    return list;
  }, [comparisonRows, sortKey, sortDir]);

  const handleSort = (key) => {
    setSortKey(key);
    setSortDir((prev) => (sortKey === key && prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleExportCSV = () => {
    if (comparisonRows.length === 0) return;
    const headers = [
      'Class',
      'Subject',
      `${baseSchedule?.name || 'Schedule 1'} Std Dev`,
      `${compareSchedule?.name || 'Schedule 2'} Std Dev`,
      'Delta',
      'Interpretation',
    ];

    const rows = comparisonRows.map((r) => [
      r.className,
      r.subjectName,
      r.stdDevA ?? '—',
      r.stdDevB ?? '—',
      r.delta !== null ? (r.delta > 0 ? `+${r.delta}` : r.delta) : '—',
      r.delta !== null
        ? r.delta < 0
          ? 'Consistency Improved'
          : r.delta > 0
          ? 'Variance Increased'
          : 'No Change'
        : 'Incomplete Data',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Schedule_StdDev_Comparison_${baseSchedule?.name}_vs_${compareSchedule?.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!baseSchedule) {
    return (
      <div className="text-center py-20 bg-white border border-light-border rounded-3xl p-8 shadow-xs max-w-lg mx-auto">
        <i className="fas fa-calendar-xmark text-4xl text-slate-300 mb-3 block" />
        <p className="text-sm font-bold text-dark-primary">No Base Exam Selected</p>
        <p className="text-xs text-dark-muted mt-1">Please select an examination event from the header.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Secondary Selector & Schedule Picker Header ── */}
      <div className="bg-white border border-light-border rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0 shadow-2xs">
            <i className="fas fa-code-compare" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-dark-primary tracking-tight">
              Cross-Schedule Standard Deviation Analysis
            </h2>
            <p className="text-[11px] font-medium text-dark-muted">
              Comparing variance and consistency trends between two examination milestones.
            </p>
          </div>
        </div>

        {/* Schedule B Selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-dark-muted shrink-0">Compare with:</span>
          <select
            value={compareScheduleId}
            onChange={(e) => setCompareScheduleId(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-dark-primary outline-none focus:ring-2 focus:ring-violet-500 shadow-2xs cursor-pointer min-w-[200px]"
          >
            <option value="">Select comparison schedule...</option>
            {schedules
              .filter((s) => String(s.id) !== String(baseSchedule.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="p-2 rounded-xl border border-light-border text-dark-muted hover:text-dark-primary hover:bg-slate-50 transition-all cursor-pointer shadow-2xs text-xs font-bold flex items-center gap-1.5"
            title="Export Comparison to CSV"
          >
            <i className="fas fa-file-excel text-emerald-600" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {loadingCompare ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-light-border rounded-3xl shadow-xs">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold text-dark-muted">Loading comparative examination metrics...</p>
        </div>
      ) : !compareSchedule ? (
        <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-xs max-w-md mx-auto">
          <i className="fas fa-arrows-split-up-and-left text-3xl text-slate-300 mb-3 block" />
          <p className="text-sm font-bold text-dark-primary">Select a Comparison Schedule</p>
          <p className="text-xs text-dark-muted mt-1">
            Choose a second examination schedule from the dropdown above to view standard deviation deltas.
          </p>
        </div>
      ) : (
        <>
          {/* ── KPI Delta Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-light-border rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider block mb-1">
                Net Variance Change
              </span>
              <div
                className={`text-2xl font-black ${
                  comparisonKPIs.overallDelta < 0
                    ? 'text-emerald-600'
                    : comparisonKPIs.overallDelta > 0
                    ? 'text-rose-600'
                    : 'text-dark-primary'
                }`}
              >
                {comparisonKPIs.overallDelta > 0 ? `+${comparisonKPIs.overallDelta}` : comparisonKPIs.overallDelta}
                <span className="text-xs font-bold text-dark-muted ml-1">pts</span>
              </div>
              <div className="text-[10px] text-dark-muted mt-1">
                {comparisonKPIs.overallDelta < 0 ? 'Consistent performance gain' : 'Increased mark disparity'}
              </div>
            </div>

            <div className="bg-white border border-light-border rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider block mb-1">
                Consistency Improved
              </span>
              <div className="text-2xl font-black text-emerald-600">{comparisonKPIs.improvedCount}</div>
              <div className="text-[10px] text-dark-muted mt-1">Class-subject pairs with lower spread</div>
            </div>

            <div className="bg-white border border-light-border rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider block mb-1">
                Disparity Increased
              </span>
              <div className="text-2xl font-black text-rose-600">{comparisonKPIs.widenedCount}</div>
              <div className="text-[10px] text-dark-muted mt-1">Class-subject pairs with wider spread</div>
            </div>

            <div className="bg-white border border-light-border rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider block mb-1">
                Best Consistency Gain
              </span>
              <div className="text-sm font-black text-dark-primary truncate">
                {comparisonKPIs.bestImprovement
                  ? `${comparisonKPIs.bestImprovement.className} — ${comparisonKPIs.bestImprovement.subjectName}`
                  : '—'}
              </div>
              <div className="text-[11px] font-extrabold text-emerald-600 mt-0.5">
                {comparisonKPIs.bestImprovement?.delta !== null && comparisonKPIs.bestImprovement?.delta !== undefined
                  ? `${comparisonKPIs.bestImprovement.delta} pts`
                  : ''}
              </div>
            </div>
          </div>

          {/* ── Side-by-Side Bar Chart Section ── */}
          <div className="bg-white border border-light-border rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-dark-primary tracking-tight">
                  Standard Deviation Comparison Chart
                </h3>
                <p className="text-[11px] font-medium text-dark-muted">
                  Lower bars indicate tighter clustering around the mean (greater consistency).
                </p>
              </div>

              {/* Toggle grouping: By Subject vs By Class */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-bold text-dark-muted border border-slate-200/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartGroupBy('subject')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    chartGroupBy === 'subject'
                      ? 'bg-white text-dark-primary shadow-2xs font-extrabold'
                      : 'hover:text-dark-primary'
                  }`}
                >
                  By Subject
                </button>
                <button
                  type="button"
                  onClick={() => setChartGroupBy('class')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    chartGroupBy === 'class'
                      ? 'bg-white text-dark-primary shadow-2xs font-extrabold'
                      : 'hover:text-dark-primary'
                  }`}
                >
                  By Class
                </button>
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-dark-primary">No overlapping examination data found</p>
              </div>
            ) : (
              <div className="w-full h-[360px] sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '16px',
                        border: '1px solid #334155',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '16px' }} />
                    <Bar
                      dataKey={baseSchedule?.name || 'Schedule 1'}
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey={compareSchedule?.name || 'Schedule 2'}
                      fill="#ec4899"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Detailed Delta Table ── */}
          <div className="bg-white border border-light-border rounded-3xl p-4 sm:p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-dark-primary tracking-tight">
              Class & Subject Standard Deviation Comparison Table
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] font-black text-dark-muted uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th
                      onClick={() => handleSort('className')}
                      className="py-3 px-4 cursor-pointer hover:text-dark-primary select-none sticky left-0 bg-slate-50 z-10"
                    >
                      Class
                    </th>
                    <th
                      onClick={() => handleSort('subjectName')}
                      className="py-3 px-3 cursor-pointer hover:text-dark-primary select-none"
                    >
                      Subject
                    </th>
                    <th className="py-3 px-3 text-right">
                      {baseSchedule.name} (Std Dev)
                    </th>
                    <th className="py-3 px-3 text-right">
                      {compareSchedule.name} (Std Dev)
                    </th>
                    <th
                      onClick={() => handleSort('delta')}
                      className="py-3 px-4 cursor-pointer hover:text-dark-primary select-none text-right"
                    >
                      Delta (Change)
                    </th>
                    <th className="py-3 px-4 text-center">Trend Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-dark-primary sticky left-0 bg-white z-10">
                        {row.className}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-dark-primary">
                        {row.subjectName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-indigo-700 bg-indigo-50/20">
                        {row.stdDevA !== null ? `${row.stdDevA} pts` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-pink-700 bg-pink-50/20">
                        {row.stdDevB !== null ? `${row.stdDevB} pts` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-black">
                        {row.delta !== null ? (
                          <span
                            className={
                              row.delta < 0
                                ? 'text-emerald-600'
                                : row.delta > 0
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }
                          >
                            {row.delta > 0 ? `+${row.delta}` : row.delta} pts
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {row.delta !== null ? (
                          row.delta < 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <i className="fas fa-arrow-down text-[9px]" /> Consistency Improved
                            </span>
                          ) : row.delta > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <i className="fas fa-arrow-up text-[9px]" /> Variance Increased
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              No Change
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[11px]">Incomplete Data</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExamScheduleComparisonTab;
