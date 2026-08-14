import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const SERIES_COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6'];

const ProgressTrendChart = ({ trendData = [], viewMode = 'monthly', loading = false }) => {
  const seriesKeys = trendData.length
    ? Object.keys(trendData[0]).filter((key) => key !== 'label' && key !== 'expected')
    : [];

  if (loading && trendData.length === 0) {
    return (
      <div className="bg-white border border-light-border rounded-2xl shadow-sm p-6 text-sm font-semibold text-gray-500">
        Loading progress trend data...
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className="bg-white border border-light-border rounded-2xl shadow-sm p-6 text-sm font-semibold text-gray-500">
        No trend data is available for the selected academic year.
      </div>
    );
  }

  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
            <i className="fas fa-chart-area text-brand-primary"></i>
            Progress Trend
          </h3>
          <p className="text-[11px] font-bold text-gray-400 mt-1 capitalize">
            {viewMode === 'weeks'
              ? 'Weekly'
              : viewMode === 'months'
                ? 'Grouped multi-month'
                : 'Monthly'}{' '}
            completion trend with expected pacing
          </p>
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }} />
            <Tooltip
              formatter={(value) => `${Number(value || 0).toFixed(0)}%`}
              contentStyle={{ borderRadius: 16, borderColor: '#e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />

            {seriesKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                fillOpacity={0.12}
                strokeWidth={2.5}
                activeDot={{ r: 4 }}
              />
            ))}

            <Line
              type="monotone"
              dataKey="expected"
              name="Expected Pace"
              stroke="#111827"
              strokeWidth={2}
              dot={false}
              strokeDasharray="6 6"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressTrendChart;
