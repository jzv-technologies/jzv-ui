import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const getBarColor = (adherence) => {
  if (adherence >= 80) return '#10b981';
  if (adherence >= 50) return '#f59e0b';
  return '#ef4444';
};

const TeacherActivityChart = ({ teacherActivityData = [] }) => {
  if (teacherActivityData.length === 0) {
    return (
      <div className="bg-white border border-light-border rounded-2xl shadow-sm p-6 text-sm font-semibold text-gray-500">
        No teacher activity data is available for the last 7 days.
      </div>
    );
  }

  const chartData = teacherActivityData.slice(0, 10).map((teacher) => ({
    ...teacher,
    fill: getBarColor(teacher.adherence),
  }));

  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 sm:p-5 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
          <i className="fas fa-users-line text-brand-primary"></i>
          Teacher Activity (7d)
        </h3>
        <p className="text-[11px] font-bold text-gray-400 mt-1">
          Activity logs ranked by volume and colored by plan adherence.
        </p>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
          >
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }} />
            <YAxis
              type="category"
              dataKey="teacherName"
              width={92}
              tick={{ fontSize: 11, fontWeight: 700, fill: '#4b5563' }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'logs7d') return [`${value} logs`, 'Activity'];
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                const datum = payload?.[0]?.payload;
                if (!datum) return label;
                return `${label} | adherence ${datum.adherence.toFixed(0)}% | ${datum.completedPlans}/${datum.totalPlans} plans completed`;
              }}
              contentStyle={{ borderRadius: 16, borderColor: '#e5e7eb' }}
            />
            <Bar dataKey="logs7d" radius={[0, 10, 10, 0]}>
              {chartData.map((item) => (
                <Cell key={item.teacherId} fill={item.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TeacherActivityChart;
