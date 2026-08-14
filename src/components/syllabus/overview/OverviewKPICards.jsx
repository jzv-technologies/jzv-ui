import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const KPICard = ({ icon, iconBg, label, value, subValue, children }) => (
  <div className="bg-white border border-light-border rounded-2xl p-4 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <i className={`fas ${icon} text-sm text-white`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-lg font-black text-dark-primary leading-tight">{value}</p>
        {subValue && <p className="text-[10px] font-bold text-gray-500 mt-0.5">{subValue}</p>}
      </div>
      {children}
    </div>
  </div>
);

const MiniProgressRing = ({ percentage }) => {
  const pct = Math.round(percentage);
  const color = pct >= 70 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444';
  const data = [{ value: pct }, { value: 100 - pct }];
  return (
    <div className="w-12 h-12 shrink-0 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={16}
            outerRadius={22}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#f3f4f6" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-dark-primary">
        {pct}%
      </span>
    </div>
  );
};

const OverviewKPICards = ({ summary }) => {
  const cfTrend =
    summary.recentCarryForwardsCount > summary.previousCarryForwardsCount
      ? 'up'
      : summary.recentCarryForwardsCount < summary.previousCarryForwardsCount
        ? 'down'
        : 'flat';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <KPICard
        icon="fa-book-open"
        iconBg="bg-indigo-500"
        label="Subjects Tracked"
        value={summary.totalTracked}
        subValue={`across ${summary.classCount} classes`}
      />

      <KPICard
        icon="fa-chart-pie"
        iconBg="bg-emerald-500"
        label="Avg. Completion"
        value={`${summary.avgCompletion.toFixed(0)}%`}
        subValue={`Expected: ${summary.avgExpected.toFixed(0)}%`}
      >
        <MiniProgressRing percentage={summary.avgCompletion} />
      </KPICard>

      <KPICard
        icon="fa-signal"
        iconBg="bg-amber-500"
        label="Pacing Status"
        value={
          <span className="flex items-center gap-1.5 text-base">
            <span className="text-emerald-600">{summary.pacingCounts.onTrack}</span>
            <span className="text-gray-300">·</span>
            <span className="text-amber-600">{summary.pacingCounts.behind}</span>
            <span className="text-gray-300">·</span>
            <span className="text-red-500">{summary.pacingCounts.critical}</span>
          </span>
        }
        subValue="On-Track · Behind · Critical"
      />

      <KPICard
        icon="fa-clipboard-list"
        iconBg="bg-blue-500"
        label="Activity (7 Days)"
        value={summary.recentLogsCount}
        subValue="lessons logged"
      />

      <KPICard
        icon="fa-arrow-rotate-right"
        iconBg={summary.recentCarryForwardsCount > 5 ? 'bg-red-500' : 'bg-gray-500'}
        label="Carry-Forwards (7d)"
        value={
          <span className="flex items-center gap-1.5">
            {summary.recentCarryForwardsCount}
            {cfTrend === 'up' && <i className="fas fa-arrow-up text-[10px] text-red-500"></i>}
            {cfTrend === 'down' && (
              <i className="fas fa-arrow-down text-[10px] text-emerald-500"></i>
            )}
          </span>
        }
        subValue={`prev week: ${summary.previousCarryForwardsCount}`}
      />
    </div>
  );
};

export default OverviewKPICards;
