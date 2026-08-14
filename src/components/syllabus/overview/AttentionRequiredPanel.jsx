import React from 'react';

const SEVERITY_STYLES = {
  critical: {
    badge: 'bg-red-100 text-red-700 border-red-200',
    icon: 'fa-triangle-exclamation',
  },
  high: {
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: 'fa-circle-exclamation',
  },
  medium: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: 'fa-bell',
  },
  low: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'fa-circle-info',
  },
};

const AttentionRequiredPanel = ({ alerts = [] }) => {
  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 sm:p-5 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
          <i className="fas fa-bell text-brand-primary"></i>
          Attention Required
        </h3>
        <p className="text-[11px] font-bold text-gray-400 mt-1">
          Auto-generated flags from pacing, activity, and planning data.
        </p>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-light-border bg-light-bg px-4 py-6 text-center text-sm font-semibold text-gray-500">
            No alerts are currently active.
          </div>
        ) : (
          alerts.map((alert) => {
            const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low;
            return (
              <div key={alert.id} className="rounded-2xl border border-light-border p-4 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-dark-primary">{alert.title}</h4>
                    <p className="text-xs font-semibold text-gray-600 mt-1 leading-relaxed">
                      {alert.description}
                    </p>
                    {alert.meta && (
                      <p className="text-[11px] font-bold text-gray-400 mt-2">{alert.meta}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide inline-flex items-center gap-1 ${styles.badge}`}
                  >
                    <i className={`fas ${styles.icon}`}></i>
                    {alert.severity}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AttentionRequiredPanel;
