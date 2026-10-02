// src/components/examinations/AttendanceHorizontalStackBar.jsx
import React from 'react';
import { getBlockBackgroundStyle } from './ReportCardDesigner';

/**
 * AttendanceHorizontalStackBar Component
 * Renders a high-fidelity horizontal stacked bar representing student attendance
 * (Present, Absent, Leaves/Excused) along with percentage badges and summary metrics.
 */
export const AttendanceHorizontalStackBar = ({
  student = {},
  config = {},
  isCompact = false,
  className = '',
}) => {
  const {
    title = 'Attendance Summary',
    showTitle = true,
    showStats = true,
    showPercentage = true,
    barHeight = 18,
    presentColor = '#059669',
    absentColor = '#e11d48',
    leaveColor = '#f59e0b',
    totalWorkingDays = 200,
    size = 'standard',
    style = {},
  } = config;

  const effectiveCompact = isCompact || size === 'compact';

  // Extract attendance metrics from student or fallback mock
  const totalDays =
    Number(student.total_working_days || student.totalDays) || Number(totalWorkingDays) || 200;

  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = Number(student.leave_days || student.leaveDays) || 0;

  if (student.present_days !== undefined || student.presentDays !== undefined) {
    presentDays = Number(student.present_days || student.presentDays) || 0;
    absentDays =
      student.absent_days !== undefined || student.absentDays !== undefined
        ? Number(student.absent_days || student.absentDays) || 0
        : Math.max(0, totalDays - presentDays - leaveDays);
  } else {
    // Derived from attendance string like '96%' or number 96
    const rawPct =
      typeof student.attendance === 'string'
        ? parseFloat(student.attendance.replace('%', ''))
        : typeof student.attendance === 'number'
          ? student.attendance
          : 96;
    const pct = isNaN(rawPct) ? 96 : Math.max(0, Math.min(100, rawPct));
    presentDays = Math.round((pct / 100) * totalDays);
    absentDays = Math.max(0, totalDays - presentDays - leaveDays);
  }

  const calculatedTotal = presentDays + absentDays + leaveDays;
  const divisor = calculatedTotal > 0 ? calculatedTotal : totalDays > 0 ? totalDays : 1;

  const presentPct = Math.min(100, Math.max(0, (presentDays / divisor) * 100));
  const absentPct = Math.min(100, Math.max(0, (absentDays / divisor) * 100));
  const leavePct = Math.min(100, Math.max(0, (leaveDays / divisor) * 100));

  // Determine health color badge
  const badgeBg =
    presentPct >= 90
      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
      : presentPct >= 75
        ? 'bg-amber-50 text-amber-700 border-amber-300'
        : 'bg-rose-50 text-rose-700 border-rose-300';

  const containerPadding = effectiveCompact ? 'p-2' : size === 'large' ? 'p-3.5' : 'p-2.5';
  const labelFontSize = style?.labelFontSize
    ? `${style.labelFontSize}px`
    : effectiveCompact
      ? '9px'
      : '10px';
  const contentFontSize = style?.contentFontSize
    ? `${style.contentFontSize}px`
    : effectiveCompact
      ? '10px'
      : '11px';

  return (
    <div
      className={`rounded-xl border border-slate-200 transition-all ${containerPadding} ${className}`}
      style={getBlockBackgroundStyle(style, '#f8fafc')}
    >
      {/* ── Top Header Row: Title & Percentage Badge ── */}
      {(showTitle || showPercentage) && (
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          {showTitle && (
            <div className="flex items-center gap-1.5">
              <i className="fas fa-chart-gantt text-rose-500 text-[10px]" />
              <span
                className="font-black uppercase tracking-wider block"
                style={{
                  fontSize: labelFontSize,
                  color: style?.labelColor || '#334155',
                }}
              >
                {title}
              </span>
            </div>
          )}

          {showPercentage && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[9px] font-bold text-dark-muted hidden sm:inline">
                {presentDays} / {totalDays} Days
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9.5px] font-black border uppercase tracking-wider ${badgeBg}`}
              >
                {presentPct.toFixed(1)}% Attended
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Horizontal Stacked Bar ── */}
      <div
        className="w-full bg-slate-200 rounded-lg overflow-hidden flex border border-slate-300/80 shadow-2xs relative"
        style={{ height: `${barHeight || 18}px` }}
      >
        {/* Segment 1: Present */}
        {presentPct > 0 && (
          <div
            style={{
              width: `${presentPct}%`,
              backgroundColor: presentColor,
            }}
            className="h-full flex items-center justify-center text-white text-[9px] font-black truncate px-1 transition-all duration-300 relative group"
            title={`Present: ${presentDays} days (${presentPct.toFixed(1)}%)`}
          >
            {presentPct >= 12 && (
              <span className="drop-shadow-xs truncate select-none">
                {presentDays}d ({presentPct.toFixed(0)}%)
              </span>
            )}
          </div>
        )}

        {/* Segment 2: Leave / Excused */}
        {leavePct > 0 && (
          <div
            style={{
              width: `${leavePct}%`,
              backgroundColor: leaveColor,
            }}
            className="h-full flex items-center justify-center text-white text-[9px] font-black truncate px-1 transition-all duration-300 relative group"
            title={`Leave: ${leaveDays} days (${leavePct.toFixed(1)}%)`}
          >
            {leavePct >= 10 && (
              <span className="drop-shadow-xs truncate select-none">{leaveDays}d</span>
            )}
          </div>
        )}

        {/* Segment 3: Absent */}
        {absentPct > 0 && (
          <div
            style={{
              width: `${absentPct}%`,
              backgroundColor: absentColor,
            }}
            className="h-full flex items-center justify-center text-white text-[9px] font-black truncate px-1 transition-all duration-300 relative group"
            title={`Absent: ${absentDays} days (${absentPct.toFixed(1)}%)`}
          >
            {absentPct >= 10 && (
              <span className="drop-shadow-xs truncate select-none">
                {absentDays}d ({absentPct.toFixed(0)}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Stats Chip Row ── */}
      {showStats && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2 pt-1.5 border-t border-slate-200/70 text-[9.5px]">
          <div className="flex items-center gap-1 font-bold text-dark-muted">
            <span className="text-[9px] uppercase tracking-wider">Working Days:</span>
            <span className="font-black text-dark-primary font-mono">{totalDays}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: presentColor }}
              />
              <span className="font-bold text-dark-slate">Present:</span>
              <span
                className="font-black font-mono"
                style={{ color: style?.contentColor || '#0f172a' }}
              >
                {presentDays} ({presentPct.toFixed(1)}%)
              </span>
            </div>

            {leaveDays > 0 && (
              <div className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: leaveColor }}
                />
                <span className="font-bold text-dark-slate">Leave:</span>
                <span
                  className="font-black font-mono"
                  style={{ color: style?.contentColor || '#0f172a' }}
                >
                  {leaveDays} ({leavePct.toFixed(1)}%)
                </span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: absentColor }}
              />
              <span className="font-bold text-dark-slate">Absent:</span>
              <span
                className="font-black font-mono"
                style={{ color: style?.contentColor || '#0f172a' }}
              >
                {absentDays} ({absentPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHorizontalStackBar;
