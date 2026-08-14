import React, { useState, useMemo } from 'react';

const ClassSubjectHeatmap = ({ heatmap, onCellClick }) => {
  const subjectColumns = heatmap?.subjectColumns || [];
  const classificationGroups = heatmap?.classificationGroups || [];
  const matrixData = heatmap?.rows || [];

  // View state: 'cards' (default clean card grid) or 'matrix' (compact table grid)
  const [viewMode, setViewMode] = useState('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideEmptyColumns, setHideEmptyColumns] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'on_track' | 'behind' | 'critical' | 'overdue' | 'unmapped'

  // Helper for cell color styling
  const getStatusInfo = (cell) => {
    if (!cell) return null;

    if (!cell.hasData && cell.isAssigned) {
      return {
        type: 'unmapped',
        label: 'Unmapped',
        badgeBg: 'bg-gray-100 text-gray-600 border-gray-200',
        barBg: 'bg-gray-300',
        pillBg: 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200',
        textColor: 'text-gray-500',
      };
    }

    if (!cell.hasData) return null;

    if (cell.isOverdue) {
      return {
        type: 'overdue',
        label: 'Overdue',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
        barBg: 'bg-purple-600',
        pillBg: 'bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300',
        textColor: 'text-purple-700',
      };
    }

    const pct = cell.pct ?? 0;
    const expected = cell.expectedPct ?? 0;
    const delta = pct - expected;

    if (pct >= 90 || delta >= -5) {
      return {
        type: 'on_track',
        label: 'On Track',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barBg: 'bg-emerald-500',
        pillBg: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300',
        textColor: 'text-emerald-700',
      };
    }
    if (pct >= 70 || delta >= -15) {
      return {
        type: 'behind',
        label: 'Behind',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        barBg: 'bg-amber-500',
        pillBg: 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300',
        textColor: 'text-amber-700',
      };
    }
    return {
      type: 'critical',
      label: 'Critical',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
      barBg: 'bg-red-500',
      pillBg: 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300',
      textColor: 'text-red-700',
    };
  };

  // Filter matrix rows by search query
  const filteredRows = useMemo(() => {
    return matrixData.filter((row) => {
      const matchSearch =
        !searchQuery ||
        (row.className || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [matrixData, searchQuery]);

  // Dynamically determine visible subject columns for Matrix view (includes mapped OR assigned)
  const visibleSubjectColumns = useMemo(() => {
    if (!hideEmptyColumns) return subjectColumns;
    return subjectColumns.filter((subj) => {
      return filteredRows.some((row) => row.cells[subj.id]?.hasData || row.cells[subj.id]?.isAssigned);
    });
  }, [subjectColumns, filteredRows, hideEmptyColumns]);

  // Dynamically recompute classification groups based on visible subject columns (fixes colSpan alignment)
  const visibleClassificationGroups = useMemo(() => {
    const classificationMap = new Map();
    visibleSubjectColumns.forEach((subject) => {
      const classId = String(subject.classification_id || 'none');
      if (!classificationMap.has(classId)) {
        const foundGroup = classificationGroups.find((g) => g.classificationId === classId);
        classificationMap.set(classId, {
          classificationId: classId,
          name: foundGroup?.name || '',
          count: 0,
        });
      }
      classificationMap.get(classId).count += 1;
    });
    return Array.from(classificationMap.values());
  }, [visibleSubjectColumns, classificationGroups]);

  // Process rows with mapped or assigned subjects & stats for Card view
  const cardData = useMemo(() => {
    return filteredRows.map((row) => {
      const displayableSubjects = subjectColumns
        .map((subj) => ({
          subject: subj,
          cell: row.cells[subj.id],
          status: getStatusInfo(row.cells[subj.id]),
        }))
        .filter((item) => item.cell && (item.cell.hasData || item.cell.isAssigned));

      const mappedSubjects = displayableSubjects.filter((item) => item.cell?.hasData);
      const unmappedAssigned = displayableSubjects.filter((item) => !item.cell?.hasData && item.cell?.isAssigned);

      // Apply status filter if set
      const matchingSubjects = displayableSubjects.filter((item) => {
        if (statusFilter === 'all') return true;
        return item.status?.type === statusFilter;
      });

      const avgPct =
        mappedSubjects.length > 0
          ? Math.round(
              mappedSubjects.reduce((sum, item) => sum + (item.cell.pct || 0), 0) /
                mappedSubjects.length
            )
          : 0;

      const overallStatus = getStatusInfo({ hasData: true, pct: avgPct, expectedPct: 50 });

      return {
        ...row,
        displayableSubjects,
        mappedSubjects,
        unmappedAssigned,
        matchingSubjects,
        avgPct,
        overallStatus,
      };
    });
  }, [filteredRows, subjectColumns, statusFilter]);

  if (subjectColumns.length === 0 || matrixData.length === 0) {
    return (
      <div className="bg-white border border-dashed rounded-2xl p-8 text-center text-gray-500 font-semibold text-sm">
        No subject data available for the heatmap.
      </div>
    );
  }

  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Header & Controls */}
      <div className="p-4 border-b border-light-border flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-chart-pie text-brand-primary"></i> Class × Subject Progress
            </h3>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
              {viewMode === 'cards'
                ? 'Showing assigned & mapped subjects per class (click any subject to view details)'
                : 'Full matrix view of class progress across subjects'}
            </p>
          </div>

          {/* View Switcher & Legend */}
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-0.5 rounded-xl flex items-center border border-gray-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'cards'
                    ? 'bg-white text-brand-primary shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <i className="fas fa-th-large text-[11px]" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'matrix'
                    ? 'bg-white text-brand-primary shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <i className="fas fa-table-cells text-[11px]" />
                Matrix
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[160px] max-w-[240px]">
              <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Filter by class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-brand-primary focus:bg-white"
              />
            </div>

            {/* Matrix View Toggle for Empty Columns */}
            {viewMode === 'matrix' && (
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 border px-2.5 py-1 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={hideEmptyColumns}
                  onChange={(e) => setHideEmptyColumns(e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                />
                <span>Hide Unmapped Columns</span>
              </label>
            )}

            {/* Status Filter for Cards View */}
            {viewMode === 'cards' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 px-2.5 py-1 rounded-xl text-xs font-bold text-gray-600 bg-gray-50 outline-none cursor-pointer hover:bg-gray-100"
              >
                <option value="all">All Statuses</option>
                <option value="on_track">On Track (≥90%)</option>
                <option value="behind">Behind (70-89%)</option>
                <option value="critical">Critical (&lt;50%)</option>
                <option value="overdue">Overdue</option>
                <option value="unmapped">Unmapped (Assigned)</option>
              </select>
            )}
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-2 text-[10px] font-extrabold shrink-0 flex-wrap">
            <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> ≥90%
            </span>
            <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> 70-89%
            </span>
            <span className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-red-500" /> &lt;50%
            </span>
            <span className="flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-purple-600" /> Overdue
            </span>
            <span className="flex items-center gap-1 bg-gray-100 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-gray-400" /> Unmapped
            </span>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: CARDS VIEW (Clean & Compact) */}
      {viewMode === 'cards' && (
        <div className="p-4 bg-gray-50/50 flex-1 overflow-y-auto max-h-[580px]">
          {cardData.length === 0 ? (
            <div className="text-center py-10 bg-white border border-dashed rounded-2xl text-gray-400 text-xs font-semibold">
              No matching classes found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {cardData.map((cls) => {
                const displaySubjects =
                  statusFilter === 'all' ? cls.displayableSubjects : cls.matchingSubjects;

                return (
                  <div
                    key={cls.classId}
                    className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-md hover:border-brand-soft/40 transition-all flex flex-col justify-between"
                  >
                    {/* Card Header */}
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-xs">
                            {cls.className.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-gray-800 leading-tight">
                              {cls.className}
                            </h4>
                            <span className="text-[10px] font-bold text-gray-400">
                              {cls.mappedSubjects.length} Mapped
                              {cls.unmappedAssigned.length > 0 && ` · ${cls.unmappedAssigned.length} Unmapped`}
                            </span>
                          </div>
                        </div>

                        {/* Class Overall Progress Badge */}
                        <div
                          className={`px-2.5 py-1 rounded-xl border text-[11px] font-black flex items-center gap-1.5 ${cls.overallStatus?.badgeBg}`}
                        >
                          <i className="fas fa-chart-line text-[10px]" />
                          <span>{cls.avgPct}% Overall</span>
                        </div>
                      </div>

                      {/* Overall Progress Bar */}
                      <div className="mt-2.5 mb-3">
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              cls.overallStatus?.barBg || 'bg-brand-primary'
                            }`}
                            style={{ width: `${Math.min(100, cls.avgPct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Mapped & Assigned Subjects List */}
                      {displaySubjects.length === 0 ? (
                        <div className="py-4 text-center bg-gray-50 border border-dashed rounded-xl text-[11px] font-semibold text-gray-400">
                          {cls.displayableSubjects.length === 0
                            ? 'No subjects assigned or mapped for this class yet.'
                            : 'No subjects match selected status filter.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {displaySubjects.map(({ subject, cell, status }) => (
                            <button
                              key={subject.id}
                              type="button"
                              onClick={() => {
                                if (onCellClick) {
                                  onCellClick({ classId: cls.classId, subjectId: subject.id });
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all group flex items-center justify-between cursor-pointer active:scale-98 ${
                                status?.pillBg || 'bg-gray-50 border-gray-200'
                              }`}
                              title={
                                cell?.hasData
                                  ? `Click to view detailed progress for ${cls.className} / ${subject.name}\nActual: ${cell.pct}%\nExpected: ${cell.expectedPct}%`
                                  : `Assigned to ${cls.className} / ${subject.name}, but no book mapped yet.`
                              }
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="block text-xs font-bold truncate group-hover:text-black">
                                  {subject.name}
                                </span>
                                <div className="w-full bg-white/60 rounded-full h-1 mt-1 overflow-hidden">
                                  <div
                                    className={`h-full ${status?.barBg}`}
                                    style={{ width: cell?.hasData ? `${Math.min(100, cell.pct)}%` : '0%' }}
                                  />
                                </div>
                              </div>

                              <span className="text-[10px] font-black shrink-0 px-2 py-0.5 rounded-lg bg-white/80 shadow-2xs">
                                {cell?.hasData ? `${cell.pct}%` : 'Unmapped'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: MATRIX VIEW (Compact & Scrollable) */}
      {viewMode === 'matrix' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              {/* Classification header row with recomputed colSpans */}
              {visibleClassificationGroups.some((g) => g.name) && (
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 z-10 bg-gray-50 px-3 py-1.5 border-r"></th>
                  {visibleClassificationGroups.map((g, i) => (
                    <th
                      key={i}
                      colSpan={g.count}
                      className="px-1 py-1.5 text-[9px] font-black text-gray-500 uppercase tracking-wider text-center border-r border-gray-100 bg-gray-50"
                    >
                      {g.name}
                    </th>
                  ))}
                </tr>
              )}
              {/* Subject header row */}
              <tr className="border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider border-r min-w-[110px]">
                  Class
                </th>
                {visibleSubjectColumns.map((subj) => (
                  <th
                    key={subj.id}
                    className="px-1 py-2 text-[10px] font-extrabold text-gray-600 text-center border-r border-gray-100 bg-gray-50 min-w-[70px] max-w-[90px]"
                  >
                    <span className="block truncate" title={subj.name}>
                      {subj.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.classId} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-black text-xs text-dark-primary border-r whitespace-nowrap">
                    {row.className}
                  </td>
                  {visibleSubjectColumns.map((subj) => {
                    const cell = row.cells[subj.id];
                    const status = getStatusInfo(cell);

                    return (
                      <td key={subj.id} className="p-0.5 border-r border-gray-50">
                        {cell?.hasData ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onCellClick) {
                                onCellClick({ classId: row.classId, subjectId: subj.id });
                              }
                            }}
                            className={`w-full h-8 rounded-lg border text-[11px] font-black transition-all cursor-pointer flex items-center justify-center active:scale-95 ${status?.pillBg}`}
                            title={`${row.className} / ${subj.name}\nActual: ${cell.pct}%\nExpected: ${cell.expectedPct}%\nEstimated periods: ${cell.estimatedPeriods || 'n/a'}`}
                          >
                            {cell.pct}%
                          </button>
                        ) : cell?.isAssigned ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onCellClick) {
                                onCellClick({ classId: row.classId, subjectId: subj.id });
                              }
                            }}
                            className="w-full h-8 rounded-lg border text-[10px] font-bold text-gray-500 bg-gray-100 border-gray-200 hover:bg-gray-200 transition-all flex items-center justify-center cursor-pointer"
                            title={`Assigned to ${row.className} / ${subj.name}, but no book mapped yet.`}
                          >
                            Unmapped
                          </button>
                        ) : (
                          <div className="w-full h-8 rounded-lg bg-gray-50/40 border border-dashed border-gray-100 flex items-center justify-center text-gray-300 text-[10px] select-none">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClassSubjectHeatmap;
