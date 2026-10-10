// src/components/timetable/DraftComparison.jsx
/**
 * DraftComparison Component
 * Shows what a draft changes relative to the live timetable as a readable table of
 * field-level changes (Added / Removed / Changed) instead of raw JSON paths.
 */

import React, { useMemo, useState } from 'react';
import { getDiffColorClass, getDiffIcon, getDiffLabel } from '../../utils/timetableComparison';

const TYPE_FILTERS = [
  { id: 'all', label: 'All changes', icon: 'fa-list' },
  { id: 'added', label: 'Added', icon: 'fa-plus-circle' },
  { id: 'removed', label: 'Removed', icon: 'fa-minus-circle' },
  { id: 'modified', label: 'Changed', icon: 'fa-pen' },
];

const DraftComparison = ({ comparison, onClose }) => {
  const { draft, changes = [], groups = [], summary, totalChanges = 0 } = comparison || {};

  const [entityFilter, setEntityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'entity', direction: 'asc' });

  // One table row per field-level change so Live vs Draft can be read side by side.
  const tableRows = useMemo(() => {
    const rows = [];
    changes.forEach((change) => {
      const fields = change.fields?.length ? change.fields : [{ label: '-', from: '-', to: '-' }];
      fields.forEach((field, idx) => {
        rows.push({
          id: `${change.entity}-${change.type}-${change.itemLabel}-${field.label}-${idx}`,
          entity: change.entity,
          type: change.type,
          itemLabel: change.itemLabel,
          fieldLabel: field.label,
          from: field.from,
          to: field.to,
        });
      });
    });
    return rows;
  }, [changes]);

  const entityLabel = (entity) => groups.find((g) => g.entity === entity)?.label || entity;

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tableRows.filter((row) => {
      if (entityFilter !== 'all' && row.entity !== entityFilter) return false;
      if (typeFilter !== 'all' && row.type !== typeFilter) return false;
      if (!needle) return true;
      return [
        entityLabel(row.entity),
        row.itemLabel,
        row.fieldLabel,
        String(row.from),
        String(row.to),
        getDiffLabel(row.type),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [tableRows, entityFilter, typeFilter, search, groups]);

  const sortedRows = useMemo(() => {
    const valueOf = (row) => {
      switch (sort.key) {
        case 'type':
          return getDiffLabel(row.type);
        case 'itemLabel':
          return row.itemLabel;
        case 'fieldLabel':
          return row.fieldLabel;
        case 'from':
          return String(row.from);
        case 'to':
          return String(row.to);
        default:
          return entityLabel(row.entity);
      }
    };
    return [...filteredRows].sort((a, b) => {
      const cmp = valueOf(a).localeCompare(valueOf(b), undefined, { numeric: true });
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sort, groups]);

  const toggleSort = (key) =>
    setSort((prev) =>
      prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }
    );

  const SortHeader = ({ label, sortKey, className = '' }) => (
    <th
      className={`px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-dark-soft cursor-pointer select-none whitespace-nowrap ${className}`}
      onClick={() => toggleSort(sortKey)}
      data-feature-sort={sortKey}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <i
          className={`fas text-[9px] ${
            sort.key === sortKey
              ? sort.direction === 'asc'
                ? 'fa-sort-up text-brand-primary'
                : 'fa-sort-down text-brand-primary'
              : 'fa-sort text-light-border'
          }`}
        />
      </span>
    </th>
  );

  return (
    <div className="fixed inset-0 bg-dark-almostblack/50 backdrop-blur-sm z-[70] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-light-border shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-brand-primary px-4 sm:px-6 py-3 text-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-80 block">
                Draft vs Live
              </span>
              <h3 className="text-base sm:text-lg font-bold truncate">{draft?.name || 'Draft'}</h3>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <i className="fas fa-arrow-left" />
              Back
            </button>
          </div>

          {/* Summary */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-extrabold">
              {totalChanges === 0 ? 'No differences from live' : `${totalChanges} change${totalChanges === 1 ? '' : 's'}`}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white text-green-700 text-[11px] font-extrabold">
              Added: {summary?.added ?? 0}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white text-red-700 text-[11px] font-extrabold">
              Removed: {summary?.removed ?? 0}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white text-amber-700 text-[11px] font-extrabold">
              Changed: {summary?.modified ?? 0}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-6 py-3 border-b border-light-border bg-light-lbg/40 shrink-0 space-y-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-light-border overflow-x-auto no-scrollbar">
              <button
                onClick={() => setEntityFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  entityFilter === 'all' ? 'bg-brand-primary text-white' : 'text-dark-soft hover:text-dark-primary'
                }`}
              >
                All sections
              </button>
              {groups.map((g) => (
                <button
                  key={g.entity}
                  onClick={() => setEntityFilter(g.entity)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    entityFilter === g.entity
                      ? 'bg-brand-primary text-white'
                      : 'text-dark-soft hover:text-dark-primary'
                  }`}
                  title={g.label}
                >
                  <i className={`fas ${g.icon} text-[10px]`} />
                  {g.label}
                  <span className="px-1.5 rounded-full bg-black/10 text-[10px] font-extrabold">
                    {g.total}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {TYPE_FILTERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-dark-soft text-xs" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search changes..."
                  className="w-full sm:w-56 pl-9 pr-3 py-2 bg-white border border-light-border rounded-xl text-xs font-medium text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          {sortedRows.length === 0 ? (
            <div className="text-center py-16 text-dark-soft">
              <i className={`fas ${totalChanges === 0 ? 'fa-check-circle text-green-400' : 'fa-filter'} text-4xl mb-3`} />
              <p className="font-bold">
                {totalChanges === 0 ? 'No differences found' : 'No changes match the filters'}
              </p>
              <p className="text-xs mt-1">
                {totalChanges === 0
                  ? 'This draft is identical to the live timetable.'
                  : 'Adjust the section, change type or search.'}
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-light-lbg z-10 border-b border-light-border">
                <tr>
                  <SortHeader label="Change" sortKey="type" />
                  <SortHeader label="Section" sortKey="entity" />
                  <SortHeader label="Item" sortKey="itemLabel" />
                  <SortHeader label="Field" sortKey="fieldLabel" />
                  <SortHeader label="Live" sortKey="from" />
                  <SortHeader label="Draft" sortKey="to" />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.id} className="border-b border-light-border/70 hover:bg-light-lbg/40">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-extrabold ${getDiffColorClass(
                          row.type
                        )}`}
                      >
                        <i className={`fas ${getDiffIcon(row.type)} text-[10px]`} />
                        {getDiffLabel(row.type)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-dark-soft whitespace-nowrap">
                      {entityLabel(row.entity)}
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-dark-primary">{row.itemLabel}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-dark-soft whitespace-nowrap">
                      {row.fieldLabel}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-red-700">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-red-50 border border-red-100">
                        {String(row.from)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-green-700">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-green-50 border border-green-100">
                        {String(row.to)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-light-border bg-light-lbg/40 shrink-0 flex items-center justify-between text-[11px] font-semibold text-dark-soft">
          <span>
            Showing {sortedRows.length} of {tableRows.length} changes
          </span>
          <span>Live data is never modified by comparing.</span>
        </div>
      </div>
    </div>
  );
};

export default DraftComparison;
