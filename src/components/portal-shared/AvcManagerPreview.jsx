// src/components/portal-shared/AvcManagerPreview.jsx
import React, { useState, useMemo } from 'react';

export const AvcManagerPreview = ({ viewConfigs = [], loading, tableMissing, onRefresh }) => {
  const [filterGroup, setFilterGroup] = useState('all');
  const [search, setSearch] = useState('');

  const allGroups = useMemo(() => {
    const set = new Set();
    viewConfigs.forEach((c) => {
      if (c.group_name) set.add(c.group_name);
    });
    return Array.from(set);
  }, [viewConfigs]);

  const filtered = viewConfigs.filter((cfg) => {
    const matchGroup = filterGroup === 'all' || cfg.group_name === filterGroup;
    const matchSearch =
      !search ||
      cfg.component_name?.toLowerCase().includes(search.toLowerCase()) ||
      cfg.description?.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header card */}
      <div className="bg-white border border-light-border rounded-[2rem] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl">
              <i className="fas fa-cubes"></i>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-dark-deepblue">
                View Controller Configuration
              </h3>
              <p className="text-xs text-dark-muted">
                Database registry driving the unified portal (`app_view_controller`)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-dark-deepblue text-xs font-bold transition-all"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>
      </div>

      {tableMissing && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-3">
          <i className="fas fa-exclamation-triangle text-amber-500 text-base"></i>
          <div>
            <strong>Table Not Found:</strong> The database table{' '}
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">app_view_controller</code>{' '}
            has not been created yet or is empty. Falling back to local default configuration.
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white border border-light-border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          <button
            onClick={() => setFilterGroup('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filterGroup === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-dark-muted border border-light-border hover:bg-gray-50'
            }`}
          >
            All ({viewConfigs.length})
          </button>
          {allGroups.map((grp) => {
            const count = viewConfigs.filter((c) => c.group_name === grp).length;
            return (
              <button
                key={grp}
                onClick={() => setFilterGroup(grp)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterGroup === grp
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white text-dark-muted border border-light-border hover:bg-gray-50'
                }`}
              >
                {grp} ({count})
              </button>
            );
          })}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search component..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-1.5 rounded-xl border border-light-border text-xs focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Table listing */}
      <div className="bg-white border border-light-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-light-border bg-gray-50/80 text-dark-muted font-bold">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Component Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Valid Access Roles</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cfg) => (
                <tr key={cfg.component_name} className="border-b border-light-border/40 hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-dark-muted">{cfg.display_order ?? 0}</td>
                  <td className="py-3 px-4 font-bold text-dark-deepblue">
                    <span className="font-mono text-purple-700">{cfg.component_name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px]">
                      {cfg.component_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-dark-muted">
                    {cfg.group_name || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(cfg.valid_access_roles || []).map((role) => (
                        <span
                          key={role}
                          className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[10px]"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        cfg.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cfg.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-dark-muted max-w-xs truncate" title={cfg.description}>
                    {cfg.description || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center text-xs text-dark-muted py-2">
        <i className="fas fa-info-circle mr-1 text-purple-600"></i>
        Interactive drag-and-drop ordering and permission editing interface will be delivered in <strong>Phase 4</strong>.
      </div>
    </div>
  );
};

export default AvcManagerPreview;
