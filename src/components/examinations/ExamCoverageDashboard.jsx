// src/components/examinations/ExamCoverageDashboard.jsx
import React, { useMemo } from 'react';

/**
 * Shows per-class coverage: active subjects vs. those scheduled in the exam.
 */
const ExamCoverageDashboard = ({ classes, subjects, slots, classSubjects }) => {
  const coverageData = useMemo(() => {
    return classes.map((cls) => {
      const activeSubjectIds = classSubjects
        .filter((cs) => String(cs.class_id) === String(cls.id) && cs.status === 'active')
        .map((cs) => String(cs.subject_id));

      const scheduledSubjectIds = new Set(
        slots
          .filter((s) => String(s.class_id) === String(cls.id))
          .map((s) => String(s.subject_id))
      );

      const total = activeSubjectIds.length;
      const scheduled = activeSubjectIds.filter((sid) => scheduledSubjectIds.has(sid)).length;
      const pending = total - scheduled;
      const pct = total > 0 ? Math.round((scheduled / total) * 100) : 0;

      const unscheduledSubjects = subjects.filter(
        (s) => activeSubjectIds.includes(String(s.id)) && !scheduledSubjectIds.has(String(s.id))
      );

      return { cls, total, scheduled, pending, pct, unscheduledSubjects };
    }).sort((a, b) => a.pct - b.pct);
  }, [classes, subjects, slots, classSubjects]);

  const overall = useMemo(() => {
    const totalSubjectSlots = coverageData.reduce((s, c) => s + c.total, 0);
    const scheduledSubjectSlots = coverageData.reduce((s, c) => s + c.scheduled, 0);
    return totalSubjectSlots > 0
      ? Math.round((scheduledSubjectSlots / totalSubjectSlots) * 100)
      : 0;
  }, [coverageData]);

  const statusColor = (pct) => {
    if (pct === 100) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (pct >= 50) return { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    return { bar: 'bg-red-400', text: 'text-red-600', bg: 'bg-red-50 border-red-200' };
  };

  return (
    <div className="space-y-5">
      {/* Overall stat */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-light-border rounded-2xl p-5 text-center">
          <p className="text-3xl font-extrabold text-dark-deepblue">{overall}%</p>
          <p className="text-xs text-dark-muted mt-1">Overall Coverage</p>
        </div>
        <div className="bg-white border border-light-border rounded-2xl p-5 text-center">
          <p className="text-3xl font-extrabold text-emerald-600">
            {coverageData.filter((c) => c.pct === 100).length}
          </p>
          <p className="text-xs text-dark-muted mt-1">Classes Fully Scheduled</p>
        </div>
        <div className="bg-white border border-light-border rounded-2xl p-5 text-center">
          <p className="text-3xl font-extrabold text-red-500">
            {coverageData.filter((c) => c.pending > 0).length}
          </p>
          <p className="text-xs text-dark-muted mt-1">Classes with Gaps</p>
        </div>
      </div>

      {/* Per-class breakdown */}
      <div className="bg-white border border-light-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-light-border bg-slate-50">
          <h3 className="text-sm font-bold text-dark-deepblue">Per-Class Coverage</h3>
        </div>

        {coverageData.length === 0 ? (
          <div className="text-center py-12 text-xs text-dark-muted">
            <i className="fas fa-chart-bar text-3xl mb-3 block opacity-20" />
            No classes configured.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {coverageData.map(({ cls, total, scheduled, pending, pct, unscheduledSubjects }) => {
              const colors = statusColor(pct);

              return (
                <div key={cls.id} className="px-5 py-4 space-y-2 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${colors.bg}`}>
                        <i className={`fas fa-graduation-cap text-xs ${colors.text}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-dark-deepblue truncate">{cls.name}</p>
                        <p className="text-[11px] text-dark-muted">
                          {scheduled}/{total} subjects scheduled
                          {pending > 0 && (
                            <span className={`ml-1.5 font-bold ${colors.text}`}>
                              · {pending} pending
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-extrabold shrink-0 ${colors.text}`}>{pct}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Unscheduled subjects list */}
                  {unscheduledSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {unscheduledSubjects.map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200"
                        >
                          <i className="fas fa-circle-xmark text-[8px]" />
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-dark-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> 100% — Fully scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> 50–99% — Partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> &lt;50% — Needs attention
        </span>
      </div>
    </div>
  );
};

export default ExamCoverageDashboard;
