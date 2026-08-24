import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const KPICard = ({ icon, iconBg, label, value, subValue, children }) => (
  <div className="bg-white border border-light-border rounded-2xl p-3.5 shadow-xs flex flex-col justify-between gap-2 hover:shadow-md transition-all">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <i className={`fas ${icon} text-sm text-white`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <div className="text-base font-black text-dark-primary leading-tight">{value}</div>
        {subValue && <p className="text-[10px] font-bold text-gray-500 mt-0.5 truncate">{subValue}</p>}
      </div>
      {children}
    </div>
  </div>
);

const MiniProgressRing = ({ percentage }) => {
  const pct = Math.round(percentage);
  const color = pct >= 90 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const data = [{ value: pct }, { value: 100 - pct }];
  return (
    <div className="w-11 h-11 shrink-0 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={14}
            outerRadius={20}
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {/* 1. Subjects Tracked */}
      <KPICard
        icon="fa-book-open"
        iconBg="bg-indigo-500"
        label="Subjects Tracked"
        value={summary.totalTracked}
        subValue={`across ${summary.classCount} classes`}
      />

      {/* 2. Avg Completion */}
      <KPICard
        icon="fa-chart-pie"
        iconBg="bg-emerald-500"
        label="Avg. Completion"
        value={`${(summary.avgCompletion || 0).toFixed(0)}%`}
        subValue={`Expected: ${(summary.avgExpected || 0).toFixed(0)}%`}
      >
        <MiniProgressRing percentage={summary.avgCompletion || 0} />
      </KPICard>

      {/* 3. Plan Adherence (Dual Scope) */}
      <KPICard
        icon="fa-list-check"
        iconBg="bg-teal-500"
        label="Plan Adherence"
        value={
          <span className="flex items-center gap-1.5 text-base font-black">
            <span>{(summary.avgAdherence30d || 0).toFixed(0)}%</span>
            <span className="text-[10px] font-bold text-gray-400">(30d)</span>
          </span>
        }
        subValue={`Acad Year: ${(summary.avgAdherenceAcadYear || 0).toFixed(0)}%`}
      >
        <MiniProgressRing percentage={summary.avgAdherence30d || 0} />
      </KPICard>

      {/* 4. Pacing Status */}
      <KPICard
        icon="fa-signal"
        iconBg="bg-amber-500"
        label="Pacing Status"
        value={
          <span className="flex items-center gap-1.5 text-sm font-black">
            <span className="text-emerald-600" title="On Track">{summary.pacingCounts?.onTrack || 0}</span>
            <span className="text-gray-300">·</span>
            <span className="text-amber-600" title="Behind">{summary.pacingCounts?.behind || 0}</span>
            <span className="text-gray-300">·</span>
            <span className="text-red-500" title="Critical">{summary.pacingCounts?.critical || 0}</span>
            {summary.pacingCounts?.suspicious > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-indigo-600 font-extrabold" title="Suspicious (Too Fast)">{summary.pacingCounts?.suspicious}</span>
              </>
            )}
            {summary.overdueCount > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-purple-600 font-extrabold" title="Overdue">{summary.overdueCount}</span>
              </>
            )}
          </span>
        }
        subValue={
          summary.pacingCounts?.suspicious > 0
            ? `${summary.pacingCounts.suspicious} Suspicious Pace (&ge;125%)`
            : summary.overdueCount > 0
              ? `${summary.overdueCount} Overdue Books`
              : 'On-Track · Behind · Critical'
        }
      />

      {/* 5. Teacher Activity */}
      <KPICard
        icon="fa-clipboard-list"
        iconBg="bg-blue-500"
        label="Activity (7 Days)"
        value={summary.recentLogsCount}
        subValue="lessons logged"
      />

      {/* 6. Active Teachers Submitting */}
      <KPICard
        icon="fa-chalkboard-user"
        iconBg="bg-teal-600"
        label="Active Teachers (7d)"
        value={
          <span>
            {summary.activeTeachers7d || 0}
            <span className="text-xs text-gray-400 font-bold ml-1">/ {summary.totalTeachers || 0}</span>
          </span>
        }
        subValue="submitting trackers"
      >
        <MiniProgressRing
          percentage={
            summary.totalTeachers > 0
              ? ((summary.activeTeachers7d || 0) / summary.totalTeachers) * 100
              : 0
          }
        />
      </KPICard>
    </div>
  );
};

export default OverviewKPICards;
