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

  // Check if attendance was explicitly recorded for this student
  const hasRecordedAttendance =
    student.hasAttendanceRecorded === true ||
    student.present_days !== undefined ||
    student.presentDays !== undefined ||
    (typeof student.attendance === 'string' &&
      student.attendance.trim() !== '' &&
      student.attendance !== '—' &&
      student.attendance !== '0%');

  // Extract attendance metrics from student
  let totalDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let presentPct = 0;
  let absentPct = 0;
  let leavePct = 0;

  if (hasRecordedAttendance) {
    totalDays =
      Number(student.total_working_days || student.totalDays) ||
      Number(totalWorkingDays) ||
      0;
    leaveDays = Number(student.leave_days || student.leaveDays) || 0;

    if (student.present_days !== undefined || student.presentDays !== undefined) {
      presentDays = Number(student.present_days || student.presentDays) || 0;
      absentDays =
        student.absent_days !== undefined || student.absentDays !== undefined
          ? Number(student.absent_days || student.absentDays) || 0
          : Math.max(0, totalDays - presentDays - leaveDays);
    } else if (typeof student.attendance === 'string' && student.attendance.includes('%')) {
      const parsedPct = parseFloat(student.attendance.replace('%', ''));
      const safePct = isNaN(parsedPct) ? 0 : Math.max(0, Math.min(100, parsedPct));
      const refDays = totalDays > 0 ? totalDays : 100;
      presentDays = Math.round((safePct / 100) * refDays);
      absentDays = Math.max(0, refDays - presentDays - leaveDays);
      if (totalDays === 0) totalDays = refDays;
    }

    const calculatedTotal = presentDays + absentDays + leaveDays;
    const divisor = calculatedTotal > 0 ? calculatedTotal : totalDays > 0 ? totalDays : 1;

    presentPct = Math.min(100, Math.max(0, (presentDays / divisor) * 100));
    absentPct = Math.min(100, Math.max(0, (absentDays / divisor) * 100));
    leavePct = Math.min(100, Math.max(0, (leaveDays / divisor) * 100));
  }

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
                className="font-black uppercase tracking-wider block attendance-bar-label"
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
              {hasRecordedAttendance ? (
                <>
                  <span
                    className="font-bold text-dark-muted hidden sm:inline attendance-bar-label"
                    style={{ fontSize: labelFontSize }}
                  >
                    {presentDays} / {totalDays} Days
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-black border uppercase tracking-wider ${badgeBg} attendance-bar-label`}
                    style={{ fontSize: labelFontSize }}
                  >
                    {presentPct.toFixed(1)}% Attended
                  </span>
                </>
              ) : (
                <span
                  className="px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider bg-slate-100 text-slate-500 border-slate-200 attendance-bar-label"
                  style={{ fontSize: labelFontSize }}
                >
                  Not Recorded
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Horizontal Stacked Bar ── */}
      <div
        className="w-full bg-slate-200 rounded-lg overflow-hidden flex border border-slate-300/80 shadow-2xs relative"
        style={{ height: `${barHeight || 18}px` }}
      >
        {hasRecordedAttendance ? (
          <>
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
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-[9.5px] font-bold italic tracking-wide">
            Attendance details pending upload
          </div>
        )}
      </div>

      {/* ── Stats Chip Row ── */}
      {showStats && (
        <div
          className="flex flex-wrap items-center justify-between gap-1.5 mt-2 pt-1.5 border-t border-slate-200/70"
          style={{ fontSize: labelFontSize }}
        >
          <div className="flex items-center gap-1 font-bold text-dark-muted">
            <span
              className="uppercase tracking-wider attendance-bar-label"
              style={{ fontSize: labelFontSize }}
            >
              Working Days:
            </span>
            <span
              className="font-black text-dark-primary font-mono attendance-bar-content"
              style={{ fontSize: contentFontSize }}
            >
              {hasRecordedAttendance && totalDays > 0 ? totalDays : '—'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: presentColor }}
              />
              <span
                className="font-bold text-dark-slate attendance-bar-label"
                style={{ fontSize: labelFontSize }}
              >
                Present:
              </span>
              <span
                className="font-black font-mono attendance-bar-content"
                style={{ color: style?.contentColor || '#0f172a', fontSize: contentFontSize }}
              >
                {hasRecordedAttendance ? `${presentDays} (${presentPct.toFixed(1)}%)` : '—'}
              </span>
            </div>

            {leaveDays > 0 && (
              <div className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: leaveColor }}
                />
                <span
                  className="font-bold text-dark-slate attendance-bar-label"
                  style={{ fontSize: labelFontSize }}
                >
                  Leave:
                </span>
                <span
                  className="font-black font-mono attendance-bar-content"
                  style={{ color: style?.contentColor || '#0f172a', fontSize: contentFontSize }}
                >
                  {hasRecordedAttendance ? `${leaveDays} (${leavePct.toFixed(1)}%)` : '—'}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: absentColor }}
              />
              <span
                className="font-bold text-dark-slate attendance-bar-label"
                style={{ fontSize: labelFontSize }}
              >
                Absent:
              </span>
              <span
                className="font-black font-mono attendance-bar-content"
                style={{ color: style?.contentColor || '#0f172a', fontSize: contentFontSize }}
              >
                {hasRecordedAttendance ? `${absentDays} (${absentPct.toFixed(1)}%)` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHorizontalStackBar;
