import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const SEGMENTS = [
  { name: 'Completed', key: 'completed', color: '#10b981', textColor: 'text-emerald-700', bg: 'bg-emerald-50' },
  { name: 'In Progress', key: 'inProgress', color: '#3b82f6', textColor: 'text-blue-700', bg: 'bg-blue-50' },
  { name: 'Planned', key: 'planned', color: '#f59e0b', textColor: 'text-amber-700', bg: 'bg-amber-50' },
  { name: 'Not Planned', key: 'notPlanned', color: '#9ca3af', textColor: 'text-gray-600', bg: 'bg-gray-50' },
];

const ClassDonutCharts = ({ classDonutData = [] }) => {
  if (classDonutData.length === 0) {
    return (
      <div className="bg-white border border-light-border rounded-2xl shadow-sm p-6 text-sm font-semibold text-gray-500">
        No class completion summaries are available yet.
      </div>
    );
  }

  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
            <i className="fas fa-chart-pie text-brand-primary"></i>
            Class Completion Mix
          </h3>
          <p className="text-[11px] font-bold text-gray-400 mt-1">
            Status breakdown across all subjects for each class: Completed, In Progress, Planned, and Not Planned.
          </p>
        </div>

        {/* Global Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-gray-500">
          {SEGMENTS.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {classDonutData.map((item) => {
          const chartData = SEGMENTS.map((s) => ({
            name: s.name,
            value: item[s.key] || 0,
            color: s.color,
          }));

          const total = Math.max(item.total, 1);
          const completionPct = ((item.completed || 0) / total) * 100;

          return (
            <div
              key={item.classId}
              className="rounded-2xl border border-light-border bg-light-bg/30 p-4 flex flex-col justify-between"
            >
              <div className="h-44 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(value, name) => [`${value} lessons (${((value / total) * 100).toFixed(0)}%)`, name]}
                      contentStyle={{ borderRadius: 12, fontSize: 11, fontWeight: 700 }}
                    />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      innerRadius={44}
                      outerRadius={64}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {chartData.map((segment) => (
                        <Cell key={segment.name} fill={segment.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  <p className="text-xs font-black text-dark-primary uppercase tracking-wide">
                    {item.className}
                  </p>
                  <p className="text-2xl font-black text-emerald-600 leading-none mt-1">
                    {completionPct.toFixed(0)}%
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 mt-0.5">
                    {item.completed} / {total} Done
                  </p>
                </div>
              </div>

              {/* 4 Stat Badges */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold mt-3">
                <div className="rounded-xl bg-white border border-light-border p-1.5 text-emerald-700 shadow-2xs">
                  <div className="font-extrabold text-xs">{item.completed || 0}</div>
                  <div className="text-[9px] text-gray-400 font-semibold truncate">Done</div>
                </div>
                <div className="rounded-xl bg-white border border-light-border p-1.5 text-blue-700 shadow-2xs">
                  <div className="font-extrabold text-xs">{item.inProgress || 0}</div>
                  <div className="text-[9px] text-gray-400 font-semibold truncate">Active</div>
                </div>
                <div className="rounded-xl bg-white border border-light-border p-1.5 text-amber-700 shadow-2xs">
                  <div className="font-extrabold text-xs">{item.planned || 0}</div>
                  <div className="text-[9px] text-gray-400 font-semibold truncate">Planned</div>
                </div>
                <div className="rounded-xl bg-white border border-light-border p-1.5 text-gray-500 shadow-2xs">
                  <div className="font-extrabold text-xs">{item.notPlanned || 0}</div>
                  <div className="text-[9px] text-gray-400 font-semibold truncate">Unplanned</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClassDonutCharts;
