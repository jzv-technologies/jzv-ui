import React, { useState, useMemo } from 'react';

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
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'flat'

  // Extract unique classes from alerts
  const classOptions = useMemo(() => {
    const classesSet = new Set();
    alerts.forEach((a) => {
      if (a.className) classesSet.add(a.className);
    });
    return Array.from(classesSet).sort();
  }, [alerts]);

  // Extract unique types from alerts
  const typeOptions = useMemo(() => {
    const typeMap = new Map();
    alerts.forEach((a) => {
      if (a.type && a.typeLabel) typeMap.set(a.type, a.typeLabel);
    });
    return Array.from(typeMap.entries()).map(([key, label]) => ({ key, label }));
  }, [alerts]);

  // Filter alerts by class and type
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchClass = selectedClass === 'all' || alert.className === selectedClass;
      const matchType = selectedType === 'all' || alert.type === selectedType;
      return matchClass && matchType;
    });
  }, [alerts, selectedClass, selectedType]);

  // Group filtered alerts: Class -> Type -> Alert Items
  const groupedAlerts = useMemo(() => {
    const classMap = new Map();

    filteredAlerts.forEach((alert) => {
      const className = alert.className || 'School-Wide / Teacher Flags';
      if (!classMap.has(className)) {
        classMap.set(className, new Map());
      }
      const typeMap = classMap.get(className);
      const typeLabel = alert.typeLabel || 'General';
      if (!typeMap.has(typeLabel)) {
        typeMap.set(typeLabel, []);
      }
      typeMap.get(typeLabel).push(alert);
    });

    return Array.from(classMap.entries()).map(([className, typeMap]) => ({
      className,
      types: Array.from(typeMap.entries()).map(([typeLabel, items]) => ({
        typeLabel,
        items,
      })),
      totalCount: Array.from(typeMap.values()).reduce((sum, items) => sum + items.length, 0),
    }));
  }, [filteredAlerts]);

  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 sm:p-5 h-full flex flex-col justify-start gap-3">
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-bell text-brand-primary"></i>
              Attention Required
            </h3>
            <p className="text-[11px] font-bold text-gray-400 mt-0.5">
              Auto-generated flags grouped by class and alert type.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-gray-100 p-0.5 rounded-lg flex items-center border border-gray-200 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  viewMode === 'grouped'
                    ? 'bg-white text-brand-primary shadow-2xs font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Grouped
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  viewMode === 'flat'
                    ? 'bg-white text-brand-primary shadow-2xs font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Flat
              </button>
            </div>

            <span className="text-[10px] font-extrabold bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-xl">
              {filteredAlerts.length} Flag{filteredAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Filter Bar: Class & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-brand-primary focus:bg-white"
          >
            <option value="all">All Classes ({alerts.length})</option>
            {classOptions.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-brand-primary focus:bg-white"
          >
            <option value="all">All Alert Types</option>
            {typeOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert List Container */}
      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 flex-1">
        {filteredAlerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-light-border bg-light-bg px-4 py-8 text-center text-xs font-bold text-gray-400">
            No active flags match selected filters.
          </div>
        ) : viewMode === 'grouped' ? (
          /* GROUPED VIEW: Class -> Type -> Items */
          groupedAlerts.map((group) => (
            <div
              key={group.className}
              className="rounded-2xl border border-gray-200/80 bg-gray-50/50 p-3.5 space-y-3"
            >
              {/* Class Header */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 pb-2">
                <h4 className="text-xs font-black text-dark-primary flex items-center gap-1.5">
                  <i className="fas fa-graduation-cap text-brand-primary text-xs" />
                  {group.className}
                </h4>
                <span className="text-[10px] font-extrabold bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-lg shadow-2xs">
                  {group.totalCount} Alert{group.totalCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Type Sub-Groups */}
              <div className="space-y-3">
                {group.types.map((typeGroup) => (
                  <div key={typeGroup.typeLabel} className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                      {typeGroup.typeLabel} ({typeGroup.items.length})
                    </div>

                    <div className="space-y-2">
                      {typeGroup.items.map((alert) => {
                        const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low;

                        return (
                          <div
                            key={alert.id}
                            className="rounded-xl border border-gray-200 p-3 bg-white hover:border-gray-300 transition-all shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex-1 min-w-0">
                                <h5 className="text-xs font-black text-dark-primary leading-tight">
                                  {alert.title}
                                </h5>
                                <p className="text-[11px] font-semibold text-gray-600 mt-1 leading-relaxed">
                                  {alert.description}
                                </p>
                                {alert.meta && (
                                  <p className="text-[10px] font-bold text-gray-400 mt-1">
                                    {alert.meta}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide inline-flex items-center gap-1 ${styles.badge}`}
                              >
                                <i className={`fas ${styles.icon}`}></i>
                                {alert.severity}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          /* FLAT VIEW */
          filteredAlerts.map((alert) => {
            const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low;

            return (
              <div
                key={alert.id}
                className="rounded-2xl border border-light-border p-3.5 bg-white hover:border-gray-300 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {alert.className && (
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-black">
                          {alert.className}
                        </span>
                      )}
                      {alert.typeLabel && (
                        <span className="px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary text-[10px] font-extrabold">
                          {alert.typeLabel}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-dark-primary leading-tight">
                      {alert.title}
                    </h4>
                    <p className="text-[11px] font-semibold text-gray-600 mt-1 leading-relaxed">
                      {alert.description}
                    </p>
                    {alert.meta && (
                      <p className="text-[10px] font-bold text-gray-400 mt-1.5">{alert.meta}</p>
                    )}
                  </div>

                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide inline-flex items-center gap-1 ${styles.badge}`}
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
