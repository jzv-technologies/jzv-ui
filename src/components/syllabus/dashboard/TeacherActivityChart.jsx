import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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

const CustomBarLabel = (props) => {
  const { x, y, width, height, value, payload } = props;
  if (!payload) return null;

  const adherence30d = payload.adherence30d ?? payload.adherence ?? 0;
  const cfCount = payload.carryForwards7d || 0;

  return (
    <g transform={`translate(${x + width + 8}, ${y + height / 2 + 4})`}>
      <text
        x="0"
        y="0"
        fill="#374151"
        fontSize="10"
        fontWeight="800"
        textAnchor="start"
      >
        {value} logs ({Math.round(adherence30d)}% adh)
      </text>
      {cfCount > 0 && (
        <text
          x="115"
          y="0"
          fill="#ef4444"
          fontSize="9"
          fontWeight="800"
          textAnchor="start"
        >
          · {cfCount} CF
        </text>
      )}
    </g>
  );
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
    fill: getBarColor(teacher.adherence30d ?? teacher.adherence ?? 0),
  }));

  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 sm:p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
            <i className="fas fa-users-line text-brand-primary"></i>
            Teacher Activity & Plan Adherence
          </h3>
          <span className="text-[10px] font-extrabold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
            7 Days Activity / 30d Adherence
          </span>
        </div>
        <p className="text-[11px] font-bold text-gray-400 mb-4">
          Activity logs ranked by volume, colored by 30-day plan adherence, with carry-forwards (CF).
        </p>
      </div>

      <div className="h-[310px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 140, left: 8, bottom: 0 }}
          >
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }} />
            <YAxis
              type="category"
              dataKey="teacherName"
              width={95}
              tick={{ fontSize: 11, fontWeight: 700, fill: '#4b5563' }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'logs7d') return [`${value} logs`, '7-Day Activity'];
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                const datum = payload?.[0]?.payload;
                if (!datum) return label;
                return `${label}\n• 30-Day Adherence: ${datum.adherence30d.toFixed(0)}% (${datum.completed30d}/${datum.plans30d} plans)\n• Acad Year Adherence: ${datum.adherenceAcadYear.toFixed(0)}% (${datum.completedPlans}/${datum.totalPlans} plans)\n• 7-Day Carry-Forwards: ${datum.carryForwards7d}`;
              }}
              contentStyle={{ borderRadius: 16, borderColor: '#e5e7eb' }}
            />
            <Bar dataKey="logs7d" radius={[0, 8, 8, 0]}>
              {chartData.map((item) => (
                <Cell key={item.teacherId} fill={item.fill} />
              ))}
              <LabelList dataKey="logs7d" content={<CustomBarLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TeacherActivityChart;
