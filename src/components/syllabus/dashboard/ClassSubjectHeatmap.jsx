import React, { useState, useMemo, useRef, useEffect } from 'react';

// Reusable Multi-Select Dropdown Component
const MultiSelectDropdown = ({
  label,
  options = [], // [{ id, name }]
  selectedIds = [], // array of selected IDs
  onChange,
  icon = 'fa-filter',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allSelected = options.length > 0 && selectedIds.length === options.length;
  const isNoneSelected = selectedIds.length === 0;

  const handleToggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map((o) => String(o.id)));
    }
  };

  const handleToggleItem = (id) => {
    const idStr = String(id);
    if (selectedIds.includes(idStr)) {
      onChange(selectedIds.filter((item) => item !== idStr));
    } else {
      onChange([...selectedIds, idStr]);
    }
  };

  const buttonText = isNoneSelected
    ? `0 ${label}s`
    : allSelected
      ? `All ${label}s (${options.length})`
      : `${selectedIds.length} / ${options.length} ${label}s`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary flex items-center gap-2 hover:bg-gray-50 focus:ring-1 focus:ring-brand-primary"
      >
        <i className={`fas ${icon} text-gray-400 text-xs`} />
        <span>{buttonText}</span>
        <i className="fas fa-chevron-down text-[10px] text-gray-400 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-light-border p-2 z-40 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100 mb-1">
            <span className="text-[11px] font-black text-gray-700">{label} Filter</span>
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-[10px] font-black text-brand-primary hover:underline"
            >
              {allSelected ? 'Clear All' : 'Select All'}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {options.map((opt) => {
              const optId = String(opt.id);
              const isChecked = selectedIds.includes(optId);

              return (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 cursor-pointer text-xs font-bold text-dark-primary select-none transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleItem(opt.id)}
                    className="w-3.5 h-3.5 rounded text-brand-primary focus:ring-0 cursor-pointer"
                  />
                  <span className="truncate">{opt.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ClassSubjectHeatmap = ({ heatmap, onCellClick }) => {
  const subjectColumns = heatmap?.subjectColumns || [];
  const classificationGroups = heatmap?.classificationGroups || [];
  const matrixData = heatmap?.rows || [];

  // Default view: 'matrix' & Transposed (Subjects = Rows, Classes = Columns)
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' | 'cards'
  const [isTransposed, setIsTransposed] = useState(true); // true = Subjects x Classes, false = Classes x Subjects
  const [hideUnmapped, setHideUnmapped] = useState(false); // DEFAULT: SHOW ALL (false)
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'on_track' | 'behind' | 'critical' | 'overdue'

  // Multi-Select States: Default to ALL selected
  const [selectedClassIds, setSelectedClassIds] = useState(() => {
    return matrixData.map((r) => String(r.classId));
  });

  const [selectedSubjectIds, setSelectedSubjectIds] = useState(() => {
    return subjectColumns.map((s) => String(s.id));
  });

  // Keep selected classes in sync if matrixData updates
  useEffect(() => {
    if (matrixData.length > 0 && selectedClassIds.length === 0) {
      setSelectedClassIds(matrixData.map((r) => String(r.classId)));
    }
  }, [matrixData]);

  // Keep selected subjects in sync if subjectColumns updates
  useEffect(() => {
    if (subjectColumns.length > 0 && selectedSubjectIds.length === 0) {
      setSelectedSubjectIds(subjectColumns.map((s) => String(s.id)));
    }
  }, [subjectColumns]);

  // Helper for cell color styling
  const getStatusInfo = (cell) => {
    if (!cell) return null;

    if (!cell.hasData && cell.isAssigned) {
      return {
        type: 'unmapped',
        label: 'Unmapped',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        barBg: 'bg-amber-400',
        pillBg: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300',
        textColor: 'text-amber-700',
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
    const ratio = expected > 0 ? pct / expected : (pct >= 100 ? 1.25 : 0);

    if (ratio >= 1.25 || pct >= 125) {
      return {
        type: 'suspicious',
        label: 'Suspicious (Too Fast)',
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        barBg: 'bg-indigo-600',
        pillBg: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border-indigo-300 font-bold',
        textColor: 'text-indigo-800',
      };
    }

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

  // 1. Filtered classes based on multi-select
  const classOptions = useMemo(() => {
    return matrixData.map((r) => ({ id: String(r.classId), name: r.className }));
  }, [matrixData]);

  const activeClasses = useMemo(() => {
    return matrixData.filter((r) => selectedClassIds.includes(String(r.classId)));
  }, [matrixData, selectedClassIds]);

  // 2. Subjects available in the selected classes
  const availableSubjectOptions = useMemo(() => {
    const subjectIdSet = new Set();
    activeClasses.forEach((clsRow) => {
      Object.keys(clsRow.cells || {}).forEach((subjId) => {
        if (clsRow.cells[subjId]?.hasData || clsRow.cells[subjId]?.isAssigned) {
          subjectIdSet.add(String(subjId));
        }
      });
    });

    return subjectColumns
      .filter((s) => subjectIdSet.size === 0 || subjectIdSet.has(String(s.id)))
      .map((s) => ({
        id: String(s.id),
        realSubjectId: s.subjectId || s.id,
        name: s.name,
        classification_id: s.classification_id,
      }));
  }, [activeClasses, subjectColumns]);

  // 3. Active filtered subjects
  const activeSubjects = useMemo(() => {
    return availableSubjectOptions.filter((s) => selectedSubjectIds.includes(String(s.id)));
  }, [availableSubjectOptions, selectedSubjectIds]);

  // 4. Transposed Subject Rows grouped by Classification
  const groupedTransposedSubjects = useMemo(() => {
    const classificationMap = new Map();

    activeSubjects.forEach((subj) => {
      const classIdStr = String(subj.classification_id || 'general');
      if (!classificationMap.has(classIdStr)) {
        const groupInfo = classificationGroups.find((g) => String(g.classificationId) === classIdStr);
        classificationMap.set(classIdStr, {
          classificationId: classIdStr,
          name: groupInfo?.name || 'General',
          subjects: [],
        });
      }

      // Collect cell for each active class
      const classCells = activeClasses.map((clsRow) => {
        const cell = clsRow?.cells ? clsRow.cells[subj.id] : null;
        return {
          classId: clsRow?.classId,
          className: clsRow?.className || '',
          cell,
          status: getStatusInfo(cell),
        };
      });

      // Filter by hideUnmapped and statusFilter if applicable
      const hasAnyData = classCells.some((c) => c.cell?.hasData || (!hideUnmapped && c.cell?.isAssigned));
      if (!hasAnyData && hideUnmapped) return;

      const matchesStatus =
        statusFilter === 'all' || classCells.some((c) => c.status?.type === statusFilter);
      if (!matchesStatus) return;

      classificationMap.get(classIdStr).subjects.push({
        columnId: subj.id,
        subjectId: subj.realSubjectId || subj.id,
        subjectName: subj.name,
        classificationName: classificationMap.get(classIdStr).name,
        classCells,
      });
    });

    return Array.from(classificationMap.values()).filter((group) => group.subjects.length > 0);
  }, [activeSubjects, activeClasses, classificationGroups, hideUnmapped, statusFilter]);

  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm overflow-hidden flex flex-col w-full">
      {/* Top Header & Filter Toolbar */}
      <div className="p-4 sm:p-5 border-b border-light-border bg-white flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Title and Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-sm">
              <i className="fas fa-layer-group" />
            </div>
            <div>
              <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
                Subject Heatmap
              </h3>
              <p className="text-[11px] font-bold text-gray-400">
                {isTransposed ? 'Subject rows × Class columns' : 'Class rows × Subject columns'}
              </p>
            </div>
          </div>

          {/* Action Toolbar: Filters, Transpose Toggle, View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Multi-Select Class Filter */}
            <MultiSelectDropdown
              label="Class"
              icon="fa-graduation-cap"
              options={classOptions}
              selectedIds={selectedClassIds}
              onChange={setSelectedClassIds}
            />

            {/* Multi-Select Subject Filter (dynamically filtered by classes) */}
            <MultiSelectDropdown
              label="Subject"
              icon="fa-book"
              options={availableSubjectOptions}
              selectedIds={selectedSubjectIds}
              onChange={setSelectedSubjectIds}
            />

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="all">All Statuses</option>
              <option value="on_track">🟢 On Track</option>
              <option value="behind">🟡 Behind</option>
              <option value="critical">🔴 Critical</option>
              <option value="overdue">🟣 Overdue</option>
              <option value="suspicious">🔵 Suspicious (Too Fast)</option>
            </select>

            {/* Transpose Toggle Button */}
            <button
              type="button"
              onClick={() => setIsTransposed(!isTransposed)}
              className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
              title="Transpose rows and columns"
            >
              <i className="fas fa-arrow-right-arrow-left text-brand-primary text-xs" />
              <span>{isTransposed ? 'Transposed' : 'Original'}</span>
            </button>

            {/* Hide Unmapped / Show All Toggle */}
            <button
              type="button"
              onClick={() => setHideUnmapped(!hideUnmapped)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                hideUnmapped
                  ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                  : 'bg-white text-gray-500 border-light-border hover:bg-gray-50'
              }`}
              title="Toggle display of unmapped columns/cells"
            >
              {hideUnmapped ? 'Mapped Only' : 'Show All'}
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[10px] font-bold text-gray-500">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> On Track
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Behind
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Critical
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Overdue
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Suspicious (&ge;1.25x pace)
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold border border-amber-300">Unmapped</span> Allocated, No Book
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[9px] font-bold border border-gray-200">N/A</span> Not Allocated
            </span>
          </div>

          <span className="text-[10px] text-gray-400 font-semibold">
            Showing {activeClasses.length} Classes · {activeSubjects.length} Subjects
          </span>
        </div>
      </div>

      {/* MATRIX TABLE VIEW WITH STICKY STATIC HEADER */}
      <div className="overflow-auto max-h-[600px] w-full">
        <table className="w-full border-collapse text-xs">
          {/* STATIC HEADER */}
          <thead className="sticky top-0 z-20 bg-gray-50 shadow-xs border-b border-gray-200">
            {isTransposed ? (
              /* TRANSPOSED HEADER: Column 1 = Classification, Column 2 = Subject, Columns 3+ = Classes */
              <tr>
                <th className="sticky left-0 top-0 z-30 bg-gray-50 px-3 py-3 text-left text-[11px] font-black text-gray-600 uppercase tracking-wider border-r border-gray-200 min-w-[130px]">
                  Classification
                </th>
                <th className="sticky left-[130px] top-0 z-30 bg-gray-50 px-3 py-3 text-left text-[11px] font-black text-gray-700 uppercase tracking-wider border-r border-gray-200 min-w-[150px] shadow-2xs">
                  Subject
                </th>
                {activeClasses.map((clsRow) => (
                  <th
                    key={clsRow.classId}
                    className="px-2 py-3 text-[11px] font-black text-gray-800 text-center border-r border-gray-200 bg-gray-50 min-w-[85px]"
                  >
                    <span className="block truncate" title={clsRow.className}>
                      {clsRow.className}
                    </span>
                  </th>
                ))}
              </tr>
            ) : (
              /* UNTRANSPOSED HEADER: Rows = Classes, Columns = Subjects */
              <tr>
                <th className="sticky left-0 top-0 z-30 bg-gray-50 px-4 py-3 text-left text-[11px] font-black text-gray-700 uppercase tracking-wider border-r border-gray-200 min-w-[140px]">
                  Class
                </th>
                {activeSubjects.map((subj) => (
                  <th
                    key={subj.id}
                    className="px-2 py-3 text-[11px] font-black text-gray-800 text-center border-r border-gray-200 bg-gray-50 min-w-[85px]"
                  >
                    <span className="block truncate" title={subj.name}>
                      {subj.name}
                    </span>
                  </th>
                ))}
              </tr>
            )}
          </thead>

          {/* TABLE BODY */}
          <tbody className="divide-y divide-gray-100">
            {isTransposed ? (
              /* TRANSPOSED BODY: Classification (Col 1) | Subject (Col 2) | Class Cells (Cols 3+) */
              groupedTransposedSubjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeClasses.length + 2}
                    className="text-center py-16 text-gray-400 font-bold text-xs"
                  >
                    No matching subjects or classes found for the selected filters.
                  </td>
                </tr>
              ) : (
                groupedTransposedSubjects.map((group) =>
                  group.subjects.map((subjRow, sIdx) => (
                    <tr
                      key={subjRow.subjectId}
                      className="hover:bg-gray-50/60 transition-colors border-b border-gray-100"
                    >
                      {/* Column 1: Classification */}
                      <td className="sticky left-0 z-10 bg-white px-3 py-2.5 font-bold text-xs text-gray-500 border-r border-gray-100 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-extrabold border border-gray-200">
                          {group.name}
                        </span>
                      </td>

                      {/* Column 2: Subject */}
                      <td className="sticky left-[130px] z-10 bg-white px-3 py-2.5 font-black text-xs text-dark-primary border-r border-gray-100 whitespace-nowrap shadow-2xs">
                        {subjRow.subjectName}
                      </td>

                      {/* Columns 3+: Class Cells */}
                      {subjRow.classCells.map(({ classId, className, cell, status }) => (
                        <td key={classId} className="p-1 border-r border-gray-100 text-center">
                          {cell?.hasData ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onCellClick) {
                                  onCellClick({ classId, subjectId: subjRow.subjectId });
                                }
                              }}
                              className={`w-full h-8 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-2xs hover:shadow-sm ${status?.pillBg}`}
                              title={`${className} · ${subjRow.subjectName}\nActual Progress: ${cell.pct}%\nExpected Pace: ${cell.expectedPct}%`}
                            >
                              {cell.pct}%
                            </button>
                          ) : cell?.isAssigned ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onCellClick) {
                                  onCellClick({ classId, subjectId: subjRow.subjectId });
                                }
                              }}
                              className="w-full h-8 rounded-xl border text-[10px] font-black text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100 transition-all flex items-center justify-center cursor-pointer"
                              title={`Assigned to ${className} / ${subjRow.subjectName}, but no book mapped yet.`}
                            >
                              Unmapped
                            </button>
                          ) : (
                            <div className="w-full h-8 rounded-xl bg-gray-50/40 border border-dashed border-gray-200 flex items-center justify-center text-gray-400 font-bold text-[10px] select-none" title="Not allocated for this class">
                              N/A
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )
              )
            ) : (
              /* UNTRANSPOSED BODY: Class Rows -> Subject Cells */
              activeClasses.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeSubjects.length + 1}
                    className="text-center py-16 text-gray-400 font-bold text-xs"
                  >
                    No classes match the selected filter.
                  </td>
                </tr>
              ) : (
                activeClasses.map((clsRow) => (
                  <tr
                    key={clsRow.classId}
                    className="hover:bg-gray-50/60 transition-colors border-b border-gray-100"
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-black text-xs text-dark-primary border-r border-gray-100 whitespace-nowrap shadow-2xs">
                      {clsRow.className}
                    </td>

                    {activeSubjects.map((subj) => {
                      const cell = clsRow.cells[subj.id];
                      const status = getStatusInfo(cell);

                      return (
                        <td key={subj.id} className="p-1 border-r border-gray-100 text-center">
                          {cell?.hasData ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onCellClick) {
                                  onCellClick({ classId: clsRow.classId, subjectId: subj.id });
                                }
                              }}
                              className={`w-full h-8 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-2xs hover:shadow-sm ${status?.pillBg}`}
                              title={`${clsRow.className} · ${subj.name}\nActual Progress: ${cell.pct}%\nExpected Pace: ${cell.expectedPct}%`}
                            >
                              {cell.pct}%
                            </button>
                          ) : cell?.isAssigned ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onCellClick) {
                                  onCellClick({ classId: clsRow.classId, subjectId: subj.id });
                                }
                              }}
                              className="w-full h-8 rounded-xl border text-[10px] font-black text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100 transition-all flex items-center justify-center cursor-pointer"
                              title={`Assigned to ${clsRow.className} / ${subj.name}, but no book mapped yet.`}
                            >
                              Unmapped
                            </button>
                          ) : (
                            <div className="w-full h-8 rounded-xl bg-gray-50/40 border border-dashed border-gray-200 flex items-center justify-center text-gray-400 font-bold text-[10px] select-none" title="Not allocated for this class">
                              N/A
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClassSubjectHeatmap;
