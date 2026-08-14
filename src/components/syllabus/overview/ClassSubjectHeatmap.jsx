import React from 'react';

const ClassSubjectHeatmap = ({ heatmap, onCellClick }) => {
  const subjectColumns = heatmap?.subjectColumns || [];
  const classificationGroups = heatmap?.classificationGroups || [];
  const matrixData = heatmap?.rows || [];

  const getCellColor = (pct) => {
    if (pct === null) return 'bg-gray-50 border-gray-100';
    if (pct >= 70) return 'bg-emerald-100 border-emerald-200 hover:bg-emerald-200';
    if (pct >= 30) return 'bg-amber-100 border-amber-200 hover:bg-amber-200';
    return 'bg-red-100 border-red-200 hover:bg-red-200';
  };

  const getCellTextColor = (pct) => {
    if (pct === null) return 'text-gray-300';
    if (pct >= 70) return 'text-emerald-700';
    if (pct >= 30) return 'text-amber-700';
    return 'text-red-700';
  };

  if (subjectColumns.length === 0 || matrixData.length === 0) {
    return (
      <div className="bg-white border border-dashed rounded-2xl p-8 text-center text-gray-500 font-semibold text-sm">
        No subject data available for the heatmap.
      </div>
    );
  }

  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
            <i className="fas fa-th text-brand-primary"></i> Class × Subject Progress Heatmap
          </h3>
          <p className="text-[10px] font-bold text-gray-400 mt-0.5">
            Click any cell to view detailed progress
          </p>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-bold">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300"></span> ≥70%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-200 border border-amber-300"></span> 30-69%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-200 border border-red-300"></span> &lt;30%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></span> N/A
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            {/* Classification header row */}
            {classificationGroups.some((g) => g.name) && (
              <tr className="border-b border-gray-100">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-1.5 border-r"></th>
                {classificationGroups.map((g, i) => (
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
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider border-r min-w-[100px]">
                Class
              </th>
              {subjectColumns.map((subj) => (
                <th
                  key={subj.id}
                  className="px-1 py-2 text-[10px] font-extrabold text-gray-600 text-center border-r border-gray-100 bg-gray-50 min-w-[60px] max-w-[80px]"
                >
                  <span className="block truncate" title={subj.name}>
                    {subj.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixData.map((row) => (
              <tr key={row.classId} className="border-b border-gray-50 hover:bg-gray-50/30">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-black text-xs text-dark-primary border-r whitespace-nowrap">
                  {row.className}
                </td>
                {subjectColumns.map((subj) => {
                  const cell = row.cells[subj.id];
                  return (
                    <td key={subj.id} className="p-0.5 border-r border-gray-50">
                      <button
                        onClick={() =>
                          cell.hasData &&
                          onCellClick?.({ classId: row.classId, subjectId: subj.id })
                        }
                        disabled={!cell.hasData}
                        className={`w-full h-9 rounded-lg border text-[11px] font-black transition-all cursor-pointer flex items-center justify-center ${getCellColor(cell.pct)} ${getCellTextColor(cell.pct)} ${!cell.hasData ? 'cursor-default' : 'active:scale-95'}`}
                        title={
                          cell.hasData
                            ? `${row.className} / ${subj.name}\nActual: ${cell.pct}%\nExpected: ${cell.expectedPct}%\nEstimated periods: ${cell.estimatedPeriods || 'n/a'}\nPeriods available: ${cell.periodsAvailableToDate.toFixed(1)}\nApprox periods used: ${cell.periodsUsedApprox.toFixed(1)}`
                            : `No books mapped for ${row.className} / ${subj.name}`
                        }
                      >
                        {cell.hasData ? `${cell.pct}%` : '—'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClassSubjectHeatmap;
