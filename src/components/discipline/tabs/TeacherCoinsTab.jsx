import React, { useMemo, useState } from 'react';

/**
 * Coins taken per teacher, read from the teacher counters.
 *
 * The rating scheme that will consume this is still to be defined, so the tab only counts what each
 * teacher recorded - for the selected week or the whole academic year.
 */
const TeacherCoinsTab = ({ totals, scope, selectedWeek, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('coins_taken');

  const rows = useMemo(() => {
    const filtered = (totals || []).filter((row) =>
      search ? `${row.name || ''} ${row.emp_id || ''}`.toLowerCase().includes(search.toLowerCase()) : true
    );
    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      return Number(b[sortKey] || 0) - Number(a[sortKey] || 0);
    });
  }, [totals, search, sortKey]);

  const totalCoins = useMemo(
    () => (totals || []).reduce((sum, row) => sum + Number(row.coins_taken || 0), 0),
    [totals]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <i className="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-dark-soft" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teacher or staff ID…"
              className="w-56 border border-light-border rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary bg-white outline-none focus:ring-2 focus:ring-brand-primary"
            data-feature-sort="discipline-teacher-sort"
          >
            <option value="coins_taken">Most coins taken</option>
            <option value="name">Teacher name</option>
          </select>
        </div>

        <button
          onClick={onRefresh}
          className="self-start px-3 py-2 rounded-xl border border-light-border bg-white text-dark-soft hover:bg-light-lbg text-xs font-bold transition-all cursor-pointer"
        >
          <i className="fas fa-rotate mr-1.5 text-[11px]" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:max-w-md">
        <div className="rounded-2xl border border-light-border bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-dark-soft">
            Coins taken ({scope === 'week' ? 'this week' : 'whole year'})
          </p>
          <p className="text-lg font-black text-dark-primary tabular-nums">{totalCoins}</p>
        </div>
        <div className="rounded-2xl border border-light-border bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-dark-soft">
            Teachers involved
          </p>
          <p className="text-lg font-black text-dark-primary tabular-nums">{(totals || []).length}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-light-border bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50">
              {['#', 'Teacher', 'Staff ID', 'Coins taken'].map((head) => (
                <th
                  key={head}
                  className="border border-light-border px-3 py-2 text-left font-black text-dark-primary whitespace-nowrap"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center">
                  <i className="fas fa-user-clock text-xl text-dark-soft" />
                  <p className="mt-2 text-sm font-bold text-dark-primary">No coins recorded yet</p>
                  <p className="text-xs font-semibold text-dark-muted mt-1">
                    {scope === 'week'
                      ? 'Log a deduction against a teacher to see them here.'
                      : 'Nothing has been recorded this academic year.'}
                  </p>
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={row.teacher_id} className="hover:bg-amber-50/40">
                <td className="border border-light-border px-3 py-2 font-black text-dark-soft tabular-nums">
                  {index + 1}
                </td>
                <td className="border border-light-border px-3 py-2 font-bold text-dark-primary whitespace-nowrap">
                  {row.name}
                </td>
                <td className="border border-light-border px-3 py-2 text-dark-muted">
                  {row.emp_id || '—'}
                </td>
                <td className="border border-light-border px-3 py-2 font-black tabular-nums text-red-600">
                  {row.coins_taken}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] font-semibold text-dark-muted">
        Counts come from the teacher counters, so they cover the coins each teacher recorded
        {scope === 'week' && selectedWeek ? ` in the week of ${selectedWeek}` : ' across the year'}.
        How these figures feed the Teacher Rewarding system is still to be defined, so no rating is
        applied here.
      </p>
    </div>
  );
};

export default TeacherCoinsTab;
