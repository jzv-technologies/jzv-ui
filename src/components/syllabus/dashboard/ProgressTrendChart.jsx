import React, { useState, useMemo } from 'react';
import MultiSelectDropdown from '../../MultiSelectDropdown';
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
  '#e0f2fe', // Soft Sky Blue
  '#dcfce7', // Soft Mint Emerald
  '#fef9c3', // Soft Warm Yellow
  '#f3e8ff', // Soft Purple
  '#ffe4e6', // Soft Rose
  '#ccfbf1', // Soft Teal
  '#fae8ff', // Soft Fuchsia
  '#f1f5f9', // Soft Slate
];

const CustomBackgroundBands = (props) => {
  const { offset, data = [] } = props || {};
  if (!offset || !data || data.length === 0) return null;
  const { left = 0, top = 0, width = 0, height = 0 } = offset;
  if (width <= 0 || height <= 0) return null;

  const count = data.length;
  const bandWidth = width / count;

  return (
    <g className="custom-book-background-bands">
      {data.map((item, idx) => {
        const bandX = left + idx * bandWidth;
        const bgFill = MILD_BACKGROUNDS[idx % MILD_BACKGROUNDS.length];
        return (
          <g key={item.bookId || idx}>
            {/* Distinct background band for each book column */}
            <rect
              x={bandX + 1}
              y={top}
              width={Math.max(0, bandWidth - 2)}
              height={height}
              fill={bgFill}
              stroke="#94a3b8"
              strokeWidth={1}
              opacity={0.8}
            />

            {/* Vertical separator line between book sections */}
            {idx > 0 && (
              <line
                x1={bandX}
                y1={top}
                x2={bandX}
                y2={top + height}
                stroke="#475569"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}
          </g>
        );
      })}
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

  const [selectedBookIds, setSelectedBookIds] = useState([]); // Empty array = all books

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

  // Filter books based on book selector (defaults to 'all' if empty)
  const filteredBooks = useMemo(() => {
    if (!selectedBookIds || selectedBookIds.length === 0) return currentClassBooks;
    const idsSet = new Set(selectedBookIds.map(String));
    return currentClassBooks.filter((b) => idsSet.has(String(b.bookId)));
  }, [currentClassBooks, selectedBookIds]);

  const chartData = useMemo(() => {
    return filteredBooks.map((book) => {
      const bName = book.bookName || 'Book';
      const sName = book.subjectName || 'Subject';
      const entry = {
        bookId: book.bookId,
        name: bName.length > 32 ? `${bName.slice(0, 30)}…` : bName,
        fullName: `${sName} · ${bName}`,
        subject: sName,
        totalLessons: book.totalLessons || 0,
        currentProgress: book.currentProgress || 0,
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
              setSelectedBookIds([]); // Reset book filter on class change
            }}
            className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary focus:ring-1 focus:ring-brand-primary"
          >
            {classList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          {/* Book Filter MultiSelectDropdown (Default: All) */}
          <div className="min-w-[220px] max-w-[340px] sm:max-w-[420px]">
            <MultiSelectDropdown
              label="Books"
              options={currentClassBooks.map((b) => ({
                id: b.bookId,
                label: `${b.subjectName} · ${b.bookName}`,
              }))}
              selected={selectedBookIds}
              onChange={setSelectedBookIds}
              placeholder="All Books"
              fullWidth={false}
            />
          </div>
        </div>
      </div>

      {/* Bar + Line Chart Area */}
      {chartData.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-light-border bg-light-bg px-4 py-16 text-center text-xs font-bold text-gray-400">
          No mapped books or progress logs found for this selection.
        </div>
      ) : (
        <div className="h-[390px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 24, right: 20, left: 0, bottom: 50 }}>
              <Customized component={(chartProps) => <CustomBackgroundBands {...chartProps} data={chartData} />} />
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fontWeight: 700, fill: '#4b5563' }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={65}
              />
              <YAxis
                tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }}
                unit={metricType === 'percentage' ? '%' : ''}
                domain={yDomain}
              />
              <Tooltip
                formatter={(value, name) => [
                  name === 'Expected %'
                    ? `${value}% Expected`
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

              {/* Expected % Line Chart */}
              {metricType === 'percentage' && (
                <Line
                  type="linear"
                  dataKey="expected"
                  name="Expected %"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4.5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6.5, fill: '#d97706', stroke: '#ffffff', strokeWidth: 2 }}
                >
                  <LabelList
                    dataKey="expected"
                    position="top"
                    formatter={(val) => (val > 0 ? `${val}%` : '')}
                    style={{ fontSize: 9, fontWeight: 800, fill: '#b45309' }}
                    offset={8}
                  />
                </Line>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ProgressTrendChart;
