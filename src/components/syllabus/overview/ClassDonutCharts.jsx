import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

const SEGMENT_COLORS = ['#10b981', '#3b82f6', '#d1d5db'];

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
      <div className="mb-4">
        <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
          <i className="fas fa-chart-pie text-brand-primary"></i>
          Class Completion Mix
        </h3>
        <p className="text-[11px] font-bold text-gray-400 mt-1">
          Completed, in-progress, and not-started lesson mix for each class.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {classDonutData.map((item) => {
          const chartData = [
            { name: 'Completed', value: item.completed },
            { name: 'In Progress', value: item.inProgress },
            { name: 'Not Started', value: item.notStarted },
          ];
          const total = Math.max(item.total, 1);
          const completionPct = (item.completed / total) * 100;

          return (
            <div
              key={item.classId}
              className="rounded-2xl border border-light-border bg-light-bg/40 p-4"
            >
              <div className="h-44 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {chartData.map((segment, index) => (
                        <Cell key={segment.name} fill={SEGMENT_COLORS[index]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
                    {item.className}
                  </p>
                  <p className="text-2xl font-black text-dark-primary leading-none mt-1">
                    {completionPct.toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold mt-2">
                <div className="rounded-xl bg-white border border-light-border px-2 py-2 text-emerald-700">
                  {item.completed}
                  <div className="text-[10px] text-gray-400 mt-1">Done</div>
                </div>
                <div className="rounded-xl bg-white border border-light-border px-2 py-2 text-blue-700">
                  {item.inProgress}
                  <div className="text-[10px] text-gray-400 mt-1">Active</div>
                </div>
                <div className="rounded-xl bg-white border border-light-border px-2 py-2 text-gray-600">
                  {item.notStarted}
                  <div className="text-[10px] text-gray-400 mt-1">Pending</div>
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
