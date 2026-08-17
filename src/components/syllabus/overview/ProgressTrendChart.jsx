import React, { useState, useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Customized,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const WEEK_COLORS = ['#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];

const MILD_BACKGROUNDS = [
  '#f8fafc', // Soft slate
  '#f0fdf4', // Soft emerald
  '#eff6ff', // Soft blue
  '#fffbeb', // Soft amber
  '#f5f3ff', // Soft purple
  '#fff1f2', // Soft rose
  '#ecfeff', // Soft cyan
  '#faf5ff', // Soft violet
];

const CustomBackgroundBands = ({ offset, data = [] }) => {
  if (!offset || !data || data.length === 0) return null;
  const { left, top, width, height } = offset;
  const count = data.length;
  const bandWidth = width / count;

  return (
    <g className="custom-book-background-bands">
      {data.map((item, idx) => (
        <rect
          key={item.bookId || idx}
          x={left + idx * bandWidth + 3}
          y={top}
          width={Math.max(0, bandWidth - 6)}
          height={height}
          fill={MILD_BACKGROUNDS[idx % MILD_BACKGROUNDS.length]}
          rx={12}
          ry={12}
          stroke="#e2e8f0"
          strokeWidth={1}
          opacity={0.85}
        />
      ))}
    </g>
  );
};

const ProgressTrendChart = ({
  classes = [],
  bookWeeklyData = { byClass: {}, weekWindows: [] },
  loading = false,
}) => {
  const classList = useMemo(() => {
    return (classes || []).map((c) => ({
      id: String(c.id),
      name: c.name || `Class ${c.id}`,
    }));
  }, [classes]);

  const [selectedClassId, setSelectedClassId] = useState(() => {
    return classList.length > 0 ? classList[0].id : '';
  });

  const [selectedBookId, setSelectedBookId] = useState('all'); // 'all' | bookId

  // Default metric type: percentage (% Cumulative)
  const [metricType, setMetricType] = useState('percentage'); // 'percentage' | 'lessons'

  // Update selected class if list changes and current is invalid
  const activeClassId = classList.some((c) => c.id === selectedClassId)
    ? selectedClassId
    : classList.length > 0
      ? classList[0].id
      : '';

  const { byClass = {}, weekWindows = [] } = bookWeeklyData;
  const currentClassBooks = byClass[activeClassId] || [];

  // Filter books based on book selector (defaults to 'all')
  const filteredBooks = useMemo(() => {
    if (selectedBookId === 'all') return currentClassBooks;
    return currentClassBooks.filter((b) => String(b.bookId) === String(selectedBookId));
  }, [currentClassBooks, selectedBookId]);

  const chartData = useMemo(() => {
    return filteredBooks.map((book) => {
      const entry = {
        bookId: book.bookId,
        name: book.bookName.length > 20 ? `${book.bookName.slice(0, 18)}…` : book.bookName,
        fullName: `${book.subjectName} · ${book.bookName}`,
        subject: book.subjectName,
        totalLessons: book.totalLessons,
        currentProgress: book.currentProgress,
        expected: book.expectedProgress || 0,
      };

      weekWindows.forEach((w) => {
        const val =
          metricType === 'percentage'
            ? Number((book[`w${w.weekIndex}Pct`] || 0).toFixed(1))
            : book[`w${w.weekIndex}`] || 0;
        entry[w.fullLabel] = val;
      });

      return entry;
    });
  }, [filteredBooks, weekWindows, metricType]);

  // Dynamic Y-Axis Domain: min = Math.max(0, minVal - 5), max = Math.min(100, maxVal + 10)
  const yDomain = useMemo(() => {
    if (metricType !== 'percentage') return ['auto', 'auto'];

    const allPcts = [];
    chartData.forEach((d) => {
      weekWindows.forEach((w) => {
        if (typeof d[w.fullLabel] === 'number') allPcts.push(d[w.fullLabel]);
      });
      if (typeof d.expected === 'number') allPcts.push(d.expected);
    });

    if (allPcts.length === 0) return [0, 100];

    const minVal = Math.min(...allPcts);
    const maxVal = Math.max(...allPcts);

    const dynamicMin = Math.max(0, Math.floor(minVal - 5));
    const dynamicMax = Math.min(100, Math.ceil(maxVal + 10));

    if (dynamicMin >= dynamicMax) {
      return [0, Math.min(100, dynamicMin + 20)];
    }

    return [dynamicMin, dynamicMax];
  }, [chartData, weekWindows, metricType]);

  if (loading && currentClassBooks.length === 0) {
    return (
      <div className="bg-white border border-light-border rounded-2xl shadow-sm p-6 text-sm font-semibold text-gray-500">
        Loading weekly progress trend data...
      </div>
    );
  }

  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col justify-between w-full">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
            <i className="fas fa-chart-column text-brand-primary"></i>
            Weekly Book Progress Trend
          </h3>
          <p className="text-[11px] font-bold text-gray-400 mt-0.5">
            Cumulative % completion across the last 4 academic weeks with dynamic pacing scale.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Mode Toggle */}
          <div className="bg-light-lbg border border-light-border p-0.5 rounded-xl flex items-center gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMetricType('percentage')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                metricType === 'percentage'
                  ? 'bg-white text-brand-primary shadow-2xs font-black'
                  : 'text-gray-500 hover:text-dark-primary'
              }`}
            >
              % Cumulative
            </button>
            <button
              type="button"
              onClick={() => setMetricType('lessons')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                metricType === 'lessons'
                  ? 'bg-white text-brand-primary shadow-2xs font-black'
                  : 'text-gray-500 hover:text-dark-primary'
              }`}
            >
              Lessons / Wk
            </button>
          </div>

          {/* Class Selector Dropdown */}
          <select
            value={activeClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedBookId('all'); // Reset book filter on class change
            }}
            className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary focus:ring-1 focus:ring-brand-primary"
          >
            {classList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          {/* Book Filter Dropdown (Default: All) */}
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary focus:ring-1 focus:ring-brand-primary max-w-[200px] truncate"
          >
            <option value="all">All Books ({currentClassBooks.length})</option>
            {currentClassBooks.map((b) => (
              <option key={b.bookId} value={b.bookId}>
                {b.subjectName} · {b.bookName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bar + Line Chart Area */}
      {chartData.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-light-border bg-light-bg px-4 py-16 text-center text-xs font-bold text-gray-400">
          No mapped books or progress logs found for this selection.
        </div>
      ) : (
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 24, right: 20, left: 0, bottom: 25 }}>
              <Customized component={(chartProps) => <CustomBackgroundBands {...chartProps} data={chartData} />} />
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontWeight: 700, fill: '#4b5563' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }}
                unit={metricType === 'percentage' ? '%' : ''}
                domain={yDomain}
              />
              <Tooltip
                formatter={(value, name) => [
                  name === 'Expected Pace'
                    ? `${value}% expected`
                    : metricType === 'percentage'
                      ? `${value}% cumulative completion`
                      : `${value} lessons completed this week`,
                  name,
                ]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item
                    ? `${item.fullName} (${item.totalLessons} total lessons · Expected: ${item.expected}% · Current: ${item.currentProgress}%)`
                    : label;
                }}
                contentStyle={{ borderRadius: 16, borderColor: '#e5e7eb', fontSize: 11, fontWeight: 700 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }} />

              {/* Weekly Bars */}
              {weekWindows.map((w, idx) => (
                <Bar
                  key={w.fullLabel}
                  dataKey={w.fullLabel}
                  fill={WEEK_COLORS[idx % WEEK_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                >
                  <LabelList
                    dataKey={w.fullLabel}
                    position="top"
                    formatter={(val) => (val > 0 ? (metricType === 'percentage' ? `${val}%` : `${val}`) : '')}
                    style={{ fontSize: 9, fontWeight: 800, fill: '#374151' }}
                  />
                </Bar>
              ))}

              {/* Expected Completion Line */}
              {metricType === 'percentage' && (
                <Line
                  type="monotone"
                  dataKey="expected"
                  name="Expected Pace"
                  stroke="#111827"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#111827' }}
                  activeDot={{ r: 6 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ProgressTrendChart;
