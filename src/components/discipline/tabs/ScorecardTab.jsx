import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import CoinArt, { CoinStack } from '../CoinArt';
import { splitCategories } from '../../../utils/disciplineScoring';

const LINE_COLOURS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b'];

/**
 * The sheet layout: one row per discipline (with its coin art), then the two appreciation rows and
 * the three totals. Green marks the best class in a discipline, red marks a red zone (threshold or
 * fewer coins left), exactly like the printed scorecard.
 *
 * Because the database stores counters rather than incidents, a mistake is fixed by adjusting a
 * counter - clicking a cell opens a small correction popover for anyone who may do that.
 */
const ScorecardTab = ({
  categories,
  rows,
  allRows,
  weekResults,
  weeks,
  selectedWeek,
  shields,
  winnersByCategory,
  settings,
  metric,
  onMetricChange,
  onOpenClass,
  canTakeCoins = false,
}) => {
  const [view, setView] = useState('table');
  const [hiddenClassIds, setHiddenClassIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [showColumns, setShowColumns] = useState(false);

  const { disciplines, silver, golden } = useMemo(() => splitCategories(categories), [categories]);

  const columns = useMemo(() => {
    const sorted = [...(rows || [])];
    if (sortConfig.key === 'name') {
      sorted.sort((a, b) =>
        sortConfig.direction === 'asc'
          ? String(a.className).localeCompare(String(b.className))
          : String(b.className).localeCompare(String(a.className))
      );
    } else if (sortConfig.key === 'totalCoins') {
      sorted.sort((a, b) =>
        sortConfig.direction === 'asc' ? a.totalCoins - b.totalCoins : b.totalCoins - a.totalCoins
      );
    } else if (sortConfig.key === 'totalPoints') {
      sorted.sort((a, b) =>
        sortConfig.direction === 'asc' ? a.totalPoints - b.totalPoints : b.totalPoints - a.totalPoints
      );
    }
    return sorted.filter((row) => !hiddenClassIds.includes(String(row.classId)));
  }, [rows, sortConfig, hiddenClassIds]);

  // Only the classes that actually received the shield are green - not everyone who ties with them.
  // A shield the criteria could only RECOMMEND is marked separately, so the scorecard never presents
  // a recommendation as a settled result.
  const winnerIdsByCategory = useMemo(() => {
    const map = {};
    Object.entries(winnersByCategory || {}).forEach(([categoryId, winners]) => {
      map[categoryId] = new Set((winners || []).map((w) => String(w.classId)));
    });
    return map;
  }, [winnersByCategory]);

  const provisionalIdsByCategory = useMemo(() => {
    const map = {};
    Object.entries(winnersByCategory || {}).forEach(([categoryId, winners]) => {
      map[categoryId] = new Set(
        (winners || []).filter((w) => w._provisional).map((w) => String(w.classId))
      );
    });
    return map;
  }, [winnersByCategory]);

  const shieldReasonByCategory = useMemo(
    () =>
      (shields || []).reduce((acc, s) => {
        if (!acc[String(s.categoryId)]) acc[String(s.categoryId)] = s;
        return acc;
      }, {}),
    [shields]
  );

  const classesHoldingAShield = useMemo(
    () => new Set((shields || []).map((s) => String(s.classId))),
    [shields]
  );

  const toggleSort = (key) =>
    setSortConfig((prev) =>
      prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' }
    );

  const chartData = useMemo(() => {
    if (metric === 'coins') {
      return columns.map((row) => {
        const entry = { name: row.className };
        disciplines.forEach((category) => {
          entry[category.code] = Number(row.balances?.[category.code] || 0);
        });
        return entry;
      });
    }

    if (metric === 'points') {
      return columns.map((row) => ({
        name: row.className,
        totalCoins: row.totalCoins,
        silver: row.silverCoins * Number(settings?.silver_coin_points ?? 3),
        golden: row.goldenCoins * Number(settings?.golden_coin_points ?? 30),
        redZones: -1 * row.redZones * Number(settings?.red_zone_penalty ?? 5),
      }));
    }

    // Weekly trend of each class across the year's weeks.
    return [...(weeks || [])].sort().map((week) => {
      const entry = { name: week.slice(5) };
      const scored = weekResults?.[String(week).slice(0, 10)];
      columns.forEach((column) => {
        const row = scored?.byClass?.[String(column.classId)];
        if (row) entry[column.className] = row.weekPoints;
      });
      return entry;
    });
  }, [metric, columns, disciplines, weeks, weekResults, settings]);

  const trendClasses = useMemo(() => columns.map((c) => c.className), [columns]);

  const weekLabel = selectedWeek ? String(selectedWeek).slice(0, 10) : '';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl"
            data-feature-tab="discipline-scorecard-view"
          >
            {[
              { id: 'table', label: 'Table', icon: 'fa-table' },
              { id: 'graph', label: 'Graph', icon: 'fa-chart-column' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setView(option.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  view === option.id ? 'bg-white text-amber-700 shadow-xs' : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className={`fas ${option.icon} text-[10px]`} />
                {option.label}
              </button>
            ))}
          </div>

          {view === 'graph' && (
            <select
              value={metric}
              onChange={(e) => onMetricChange(e.target.value)}
              className="border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary bg-white outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="coins">Coins left by discipline</option>
              <option value="points">Points make-up</option>
              <option value="trend">Weekly points trend</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide bg-slate-100 text-dark-muted border-light-border">
            Week of {weekLabel || '—'}
          </span>

          <div className="relative">
            <button
              onClick={() => setShowColumns((prev) => !prev)}
              className="p-2 rounded-xl border border-light-border bg-white text-dark-soft hover:bg-light-lbg transition-all cursor-pointer"
              title="Choose which classes are shown"
            >
              <i className="fas fa-table-columns text-sm" />
            </button>
            {showColumns && (
              <div className="absolute right-0 mt-2 z-20 w-56 bg-white border border-light-border rounded-xl shadow-lg p-2 max-h-72 overflow-y-auto">
                <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wide text-dark-soft">
                  Classes shown
                </p>
                {(allRows || []).map((row) => (
                  <label
                    key={row.classId}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-light-lbg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenClassIds.includes(String(row.classId))}
                      onChange={(e) =>
                        setHiddenClassIds((prev) =>
                          e.target.checked
                            ? prev.filter((id) => id !== String(row.classId))
                            : [...prev, String(row.classId)]
                        )
                      }
                      className="accent-amber-500"
                    />
                    <span className="text-xs font-semibold text-dark-primary">{row.className}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {columns.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-light-border p-10 text-center">
          <i className="fas fa-coins text-2xl text-dark-soft" />
          <p className="mt-2 text-sm font-bold text-dark-primary">No classes to show</p>
          <p className="text-xs font-semibold text-dark-muted mt-1">
            Adjust the programme or class filter.
          </p>
        </div>
      ) : view === 'table' ? (
        <>
          <div className="overflow-x-auto rounded-2xl border border-light-border bg-white">
            <table className="w-full border-collapse text-xs" data-print-target="discipline-scorecard">
              <thead>
                <tr className="bg-slate-50">
                  <th
                    className="sticky left-0 z-10 bg-slate-50 border border-light-border px-3 py-2 text-left font-black text-dark-primary cursor-pointer whitespace-nowrap"
                    onClick={() => toggleSort('name')}
                  >
                    Discipline
                    <i
                      className={`fas ml-1 text-[9px] ${
                        sortConfig.key === 'name'
                          ? sortConfig.direction === 'asc'
                            ? 'fa-sort-up'
                            : 'fa-sort-down'
                          : 'fa-sort text-dark-soft/50'
                      }`}
                    />
                  </th>
                  {columns.map((row) => (
                    <th
                      key={row.classId}
                      className="border border-light-border px-1 py-2 text-center font-black text-dark-primary whitespace-nowrap min-w-[74px]"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => onOpenClass?.(row.classId)}
                          className="text-dark-primary hover:text-amber-700 underline decoration-dotted underline-offset-2 cursor-pointer"
                          title={`Open ${row.className}'s coin stacks`}
                        >
                          {row.className}
                        </button>
                        <span className="text-[9px] font-bold text-dark-soft">
                          {row.programme || '—'}
                        </span>
                        {classesHoldingAShield.has(String(row.classId)) && (
                          <i
                            className="fas fa-shield-halved text-[9px] text-emerald-600"
                            title="Holds a shield this week"
                          />
                        )}
                        {canTakeCoins && (
                          <button
                            onClick={() => onOpenClass?.(row.classId)}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-800 hover:bg-amber-100 transition-all cursor-pointer"
                            title={`Take a coin from ${row.className}`}
                            data-feature-action="discipline-take-coins-class"
                          >
                            <i className="fas fa-hand-holding-dollar" />
                            Coins
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disciplines.map((category) => {
                  return (
                    <tr key={category.id}>
                      <th className="sticky left-0 z-10 bg-white border border-light-border px-3 py-2 text-left">
                        <div className="flex items-center gap-2">
                          <CoinArt
                            image={category.coin_image}
                            accent={category.coin_accent}
                            shape={category.coin_shape}
                            face={category.coin_face}
                            size={26}
                            alt={category.name}
                          />
                          <span className="font-bold text-dark-primary leading-tight">
                            {category.name}
                          </span>
                        </div>
                      </th>
                      {columns.map((row) => {
                        const value = Number(row.balances?.[category.code] || 0);
                        const isRed = value <= Number(category.red_zone_threshold ?? 4);
                        const winnerIds = winnerIdsByCategory[String(category.id)];
                        // Green only for the classes that were actually awarded this discipline's
                        // shield, even when other classes hold the same number of coins.
                        const holdsShield = Boolean(winnerIds && winnerIds.has(String(row.classId)));
                        const provisional = Boolean(
                          provisionalIdsByCategory[String(category.id)]?.has(String(row.classId))
                        );
                        const reason =
                          shieldReasonByCategory[String(category.id)]?.filter || 'highest coins';
                        return (
                          <td
                            key={row.classId}
                            className={`border border-light-border px-2 py-2 text-center font-black tabular-nums ${
                              isRed
                                ? 'bg-red-500 text-white'
                                : holdsShield
                                  ? provisional
                                    ? 'bg-amber-200/90 text-amber-950 ring-2 ring-inset ring-amber-500/70'
                                    : 'bg-emerald-400/90 text-emerald-950'
                                  : 'text-dark-primary'
                            }`}
                            title={
                              isRed
                                ? `Red zone: ${value} of ${category.weekly_coins} coins left`
                                : `${value} of ${category.weekly_coins} coins left` +
                                  (holdsShield
                                    ? provisional
                                      ? ` · recommended shield (${reason}) - awaiting confirmation`
                                      : ` · shield winner (${reason})`
                                    : '')
                            }
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>{value}</span>
                              {holdsShield && (
                                <i
                                  className={`${
                                    provisional ? 'fas fa-hourglass-half' : 'fas fa-shield-halved'
                                  } text-[9px] ${
                                    isRed ? 'text-white' : provisional ? 'text-amber-700' : 'opacity-80'
                                  }`}
                                  title={
                                    provisional
                                      ? `Recommended shield (${reason}) - awaiting confirmation`
                                      : `Shield: ${reason}`
                                  }
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                <TotalRow label="Total coins" columns={columns} pick={(row) => row.totalCoins} strong />

                <AppreciationRow
                  label="Teacher's Appreciation"
                  hint={`${settings?.silver_coin_points ?? 3} points each`}
                  columns={columns}
                  pick={(row) => row.silverCoins}
                  accent={silver?.coin_accent || '#94a3b8'}
                  image={silver?.coin_image}
                  face="S"
                />

                <AppreciationRow
                  label="Management Appreciation"
                  hint={`${settings?.golden_coin_points ?? 30} points each`}
                  columns={columns}
                  pick={(row) => row.goldenCoins}
                  accent={golden?.coin_accent || '#eab308'}
                  image={golden?.coin_image}
                  face="G"
                />

                <TotalRow
                  label="This week points"
                  columns={columns}
                  pick={(row) => row.weekPoints}
                  hint={`${settings?.red_zone_penalty ?? 5} points off per red zone`}
                  strong
                />
                <TotalRow label="Previous total" columns={columns} pick={(row) => row.previousTotal} muted />
                <TotalRow
                  label="Total points"
                  columns={columns}
                  pick={(row) => `${row.totalPoints}${row.redZones > 0 ? ` · ${row.redZones} RZ` : ''}`}
                  onSort={() => toggleSort('totalPoints')}
                  sorted={sortConfig.key === 'totalPoints' ? sortConfig.direction : null}
                  strong
                />
              </tbody>
            </table>
          </div>

        </>
      ) : (
        <div className="rounded-2xl border border-light-border bg-white p-4">
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              {metric === 'trend' ? (
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {trendClasses.map((name, index) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={LINE_COLOURS[index % LINE_COLOURS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {metric === 'coins'
                    ? disciplines.map((category) => (
                        <Bar
                          key={category.code}
                          dataKey={category.code}
                          name={category.name}
                          stackId="coins"
                          fill={category.coin_accent || '#94a3b8'}
                        />
                      ))
                    : [
                        <Bar key="coins" dataKey="totalCoins" name="Coins left" fill="#10b981" stackId="p" />,
                        <Bar key="silver" dataKey="silver" name="Silver points" fill="#94a3b8" stackId="p" />,
                        <Bar key="golden" dataKey="golden" name="Gold points" fill="#eab308" stackId="p" />,
                        <Bar key="rz" dataKey="redZones" name="Red-zone penalty" fill="#ef4444" stackId="p" />,
                      ]}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-4 border-t border-light-border pt-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-dark-soft mb-2">
              Coins, as stacks
            </p>
            <div className="flex flex-wrap gap-3">
              {columns.map((row) => (
                <div key={row.classId} className="flex-1 min-w-[130px] rounded-xl border border-light-border p-2">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-[11px] font-black text-dark-primary">{row.className}</p>
                    {canTakeCoins && (
                      <button
                        onClick={() => onOpenClass?.(row.classId)}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-800 hover:bg-amber-100 transition-all cursor-pointer"
                        title={`Take a coin from ${row.className}`}
                        data-feature-action="discipline-take-coins-class"
                      >
                        <i className="fas fa-hand-holding-dollar" />
                        Coins
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {disciplines.map((category) => (
                      <div key={category.id} className="flex items-center gap-1.5">
                        <CoinStack
                          image={category.coin_image}
                          accent={category.coin_accent}
                          shape={category.coin_shape}
                          face={category.coin_face}
                          count={Number(row.balances?.[category.code] || 0)}
                          max={4}
                          size={14}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TotalRow = ({ label, columns, pick, hint, strong, muted, onSort, sorted }) => (
  <tr className={strong ? 'bg-slate-50' : muted ? 'bg-white' : ''}>
    <th className="sticky left-0 z-10 bg-inherit border border-light-border px-3 py-2 text-left">
      <button
        onClick={onSort}
        disabled={!onSort}
        className={`font-black text-dark-primary ${onSort ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {label}
        {onSort && (
          <i
            className={`fas ml-1 text-[9px] ${
              sorted === 'asc' ? 'fa-sort-up' : sorted === 'desc' ? 'fa-sort-down' : 'fa-sort text-dark-soft/50'
            }`}
          />
        )}
      </button>
      {hint && <div className="text-[9px] font-semibold text-dark-soft">{hint}</div>}
    </th>
    {columns.map((row) => (
      <td
        key={row.classId}
        className={`border border-light-border px-2 py-2 text-center font-black tabular-nums ${
          strong ? 'text-dark-primary' : 'text-dark-muted'
        }`}
      >
        {pick(row)}
      </td>
    ))}
  </tr>
);

const AppreciationRow = ({ label, hint, columns, pick, accent, image, face }) => (
  <tr>
    <th className="sticky left-0 z-10 bg-white border border-light-border px-3 py-2 text-left">
      <div className="flex items-center gap-2">
        <CoinArt accent={accent} image={image} size={24} alt={label} face={face} />
        <span className="font-bold text-dark-primary leading-tight">{label}</span>
      </div>
      <div className="text-[9px] font-semibold text-dark-soft">{hint}</div>
    </th>
    {columns.map((row) => {
      const value = pick(row);
      return (
        <td
          key={row.classId}
          className="border border-light-border px-2 py-2 text-center font-black tabular-nums text-dark-primary"
        >
          {value > 0 ? (
            <div className="flex items-center justify-center gap-1">
              <CoinArt accent={accent} image={image} size={18} alt={label} face={face} />
              <span>{value}</span>
            </div>
          ) : (
            <span className="text-dark-soft">-</span>
          )}
        </td>
      );
    })}
  </tr>
);

export default ScorecardTab;
