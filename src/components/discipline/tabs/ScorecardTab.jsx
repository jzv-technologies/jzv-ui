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
import PrintPageDecorations from '../../PrintPageDecorations';
import { splitCategories } from '../../../utils/disciplineScoring';

const LINE_COLOURS = [
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#64748b',
];

const splitLabelIntoLines = (label) => {
  const words = String(label || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [words[0] || '', ''];

  let splitIndex = 1;
  let smallestDifference = Infinity;
  for (let index = 1; index < words.length; index += 1) {
    const firstLineLength = words.slice(0, index).join(' ').length;
    const secondLineLength = words.slice(index).join(' ').length;
    const difference = Math.abs(firstLineLength - secondLineLength);
    if (difference < smallestDifference) {
      splitIndex = index;
      smallestDifference = difference;
    }
  }

  return [words.slice(0, splitIndex).join(' '), words.slice(splitIndex).join(' ')];
};

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
  recommendations = [],
  recommendationPicks = {},
  onRecommendationSelection,
  weekLocked = false,
  showRecommendation = false,
  settings,
  printSettings,
  view = 'table',
  metric,
  onOpenClass,
  canTakeCoins = false,
}) => {
  const [hiddenClassIds, setHiddenClassIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [showColumns, setShowColumns] = useState(false);

  const { disciplines, silver, golden } = useMemo(() => splitCategories(categories), [categories]);

  const columns = useMemo(() => {
    const sorted = [...(rows || [])];
    const programmeOrder = (programme) => {
      const normalized = String(programme || '').trim().toUpperCase();
      if (normalized === 'PCC') return 0;
      if (normalized === 'GCC') return 1;
      return 2;
    };
    const compareClassName = (a, b) =>
      String(a.className).localeCompare(String(b.className), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    sorted.sort((a, b) => {
      const programmeDifference = programmeOrder(a.programme) - programmeOrder(b.programme);
      if (programmeDifference) return programmeDifference;

      if (sortConfig.key === 'name') {
        const comparison = compareClassName(a, b);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      if (sortConfig.key === 'totalCoins' || sortConfig.key === 'totalPoints') {
        const comparison = Number(a[sortConfig.key] || 0) - Number(b[sortConfig.key] || 0);
        if (comparison) return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      return compareClassName(a, b);
    });
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
        (winners || [])
          .filter((w) => !w._saved && (w._rule5 || w._provisional))
          .map((w) => String(w.classId))
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
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' }
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

  const weekEndingLabel = useMemo(() => {
    if (!selectedWeek) return '';
    const ending = new Date(`${String(selectedWeek).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(ending.getTime())) return '';
    ending.setDate(ending.getDate() + 6);
    const day = ending.getDate();
    const ordinal =
      day % 100 >= 11 && day % 100 <= 13
        ? 'th'
        : ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
    return `${day}${ordinal} ${ending.toLocaleDateString('en-US', { month: 'long' })}`;
  }, [selectedWeek]);

  return (
    <div
      className="discipline-scorecard-print space-y-4"
      data-print-target="active"
    >
      <PrintPageDecorations
        settings={printSettings}
        context={{ weekEnding: weekEndingLabel }}
      />
      {weekLocked && (
        <div
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 print:hidden"
          data-feature-status="discipline-week-locked"
        >
          <i className="fas fa-lock" />
          Coin edits are locked for this week.
        </div>
      )}
      {showRecommendation && recommendations.length > 0 && (
        <section
          className="grid gap-3 md:grid-cols-2 print:hidden"
          data-feature="discipline-recommendation-editor"
        >
          {recommendations.map((entry) => {
            const key = String(entry.categoryId);
            const selected = (recommendationPicks[key] || entry.recommendedIds).map(String);
            const direct = (winnersByCategory?.[key] || []).filter((winner) => !winner._rule5);
            return (
              <div
                key={key}
                className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-dark-primary">{entry.categoryName}</h3>
                    <p className="mt-0.5 text-[10px] font-semibold text-dark-muted">
                      Rule 5 tie · select up to {entry.placesToConfirm} of the tied classes
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-900">
                    Yellow recommendation
                  </span>
                </div>
                {direct.length > 0 && (
                  <p className="mt-2 text-[10px] font-bold text-emerald-800">
                    Already recommended: {direct.map((winner) => winner.className).join(', ')}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {entry.candidates.map((candidate) => {
                    const classId = String(candidate.classId);
                    const isSelected = selected.includes(classId);
                    return (
                      <button
                        key={classId}
                        type="button"
                        onClick={() => {
                          let next;
                          if (isSelected) {
                            next = selected.filter((id) => id !== classId);
                          } else if (selected.length >= entry.placesToConfirm) {
                            next = [...selected.slice(1), classId];
                          } else {
                            next = [...selected, classId];
                          }
                          onRecommendationSelection?.(entry.categoryId, next);
                        }}
                        className={`rounded-full border px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-200 text-amber-950'
                            : 'border-light-border bg-white text-dark-primary hover:bg-light-lbg'
                        }`}
                        title={`${isSelected ? 'Click to remove' : selected.length >= entry.placesToConfirm ? 'Click to replace the oldest selected class' : 'Click to select'} · ${candidate.coins} coins; tie frequency ${candidate.tieFrequency}; shields held ${candidate.shieldsHeld}`}
                      >
                        {isSelected && <i className="fas fa-check mr-1" />}
                        {candidate.className}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}
      {columns.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-light-border p-10 text-center">
          <i className="fas fa-coins text-2xl text-dark-soft" />
          <p className="mt-2 text-sm font-bold text-dark-primary">No classes to show</p>
          <p className="text-xs font-semibold text-dark-muted mt-1">
            Adjust the programme or class filter.
          </p>
        </div>
      ) : (
        <>
          <div
            className={`overflow-x-auto rounded-2xl print:rounded-none border border-light-border bg-white ${
              view === 'table' ? '' : 'hidden print:block'
            }`}
          >
            <table
              className="w-full border-collapse text-xs discipline-scorecard-table"
              data-print-target="discipline-scorecard"
            >
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
                        <span className="text-[9px] font-bold text-dark-soft print:hidden">
                          {row.programme || '—'}
                        </span>
                        {classesHoldingAShield.has(String(row.classId)) && (
                          <i
                            className={`fas fa-shield-halved text-[9px] print:hidden ${
                              shields.some(
                                (shield) =>
                                  String(shield.classId) === String(row.classId) && shield.rule5
                              )
                                ? 'text-yellow-600'
                                : 'text-emerald-600'
                            }`}
                            title="Holds a shield this week"
                          />
                        )}
                        {canTakeCoins && (
                          <button
                            onClick={() => onOpenClass?.(row.classId)}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-800 hover:bg-amber-100 transition-all cursor-pointer print:hidden"
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
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-white border border-light-border px-3 py-2 text-left"
                      >
                        <div
                          className="grid items-center gap-2"
                          style={{ gridTemplateColumns: '26px minmax(0, 1fr)' }}
                        >
                          <CoinArt
                            image={category.coin_image}
                            accent={category.coin_accent}
                            shape={category.coin_shape}
                            face={category.coin_face}
                            size={26}
                            alt={category.name}
                          />
                          <span className="font-bold text-dark-primary leading-tight uppercase">
                            {splitLabelIntoLines(category.name).map((line, index) => (
                              <span key={`${category.id}-line-${index}`} className="block">
                                {line || '\u00a0'}
                              </span>
                            ))}
                          </span>
                        </div>
                      </th>
                      {columns.map((row) => {
                        const value = Number(row.balances?.[category.code] || 0);
                        const isRed = value <= Number(category.red_zone_threshold ?? 4);
                        const winnerIds = winnerIdsByCategory[String(category.id)];
                        // Green only for the classes that were actually awarded this discipline's
                        // shield, even when other classes hold the same number of coins.
                        const holdsShield = Boolean(
                          winnerIds && winnerIds.has(String(row.classId))
                        );
                        const provisional =
                          showRecommendation ||
                          Boolean(
                            provisionalIdsByCategory[String(category.id)]?.has(String(row.classId))
                          );
                        const reason =
                          shieldReasonByCategory[String(category.id)]?.filter || 'highest coins';
                        return (
                          <td
                            key={row.classId}
                            className={`border border-light-border px-2 py-2 text-center font-black tabular-nums ${
                              holdsShield
                                ? provisional
                                  ? 'bg-yellow-200/90 text-yellow-950 ring-2 ring-inset ring-yellow-500/70'
                                  : 'text-green-950'
                                : isRed
                                  ? 'bg-red-500 text-white'
                                  : 'text-dark-primary'
                            }`}
                            style={
                              holdsShield && !provisional ? { backgroundColor: '#92D050' } : undefined
                            }
                            title={
                              isRed
                                ? `Red zone: ${value} of ${category.weekly_coins} coins left`
                                : `${value} of ${category.weekly_coins} coins left` +
                                  (holdsShield
                                    ? provisional
                                      ? ' · Rule 5 recommendation'
                                      : ` · saved shield recommendation (${reason})`
                                    : '')
                            }
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>{value}</span>
                              {holdsShield && (
                                <i
                                  className={`${
                                    provisional
                                      ? 'fas fa-wand-magic-sparkles'
                                      : 'fas fa-shield-halved'
                                  } text-[9px] print:hidden ${
                                    isRed
                                      ? 'text-white'
                                      : provisional
                                        ? 'text-yellow-700'
                                        : 'opacity-80'
                                  }`}
                                  title={
                                    provisional
                                      ? 'Rule 5 recommendation'
                                      : `Saved shield recommendation: ${reason}`
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

                <TotalRow
                  label="Total coins"
                  columns={columns}
                  pick={(row) => row.totalCoins}
                  strong
                  printRow="total-coins"
                />

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
                  printRow="this-week-points"
                />
                <TotalRow
                  label="Previous total"
                  printLabel="Previous week total"
                  columns={columns}
                  pick={(row) => row.previousTotal}
                  muted
                  printRow="previous-total"
                />
                <TotalRow
                  label="Red zone count"
                  columns={columns}
                  pick={(row) => row.redZones}
                  muted
                  printRow="red-zones"
                  printOnly
                />
                <TotalRow
                  label="Total points"
                  columns={columns}
                  pick={(row) =>
                    `${row.totalPoints}${row.redZones > 0 ? ` · ${row.redZones} RZ` : ''}`
                  }
                  printPick={(row) => row.totalPoints}
                  onSort={() => toggleSort('totalPoints')}
                  sorted={sortConfig.key === 'totalPoints' ? sortConfig.direction : null}
                  strong
                  printRow="total-points"
                />
              </tbody>
            </table>
          </div>
          <div
            className={`rounded-2xl border border-light-border bg-white p-4 print:hidden ${
              view === 'graph' ? '' : 'hidden'
            }`}
          >
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
                        <Bar
                          key="coins"
                          dataKey="totalCoins"
                          name="Coins left"
                          fill="#10b981"
                          stackId="p"
                        />,
                        <Bar
                          key="silver"
                          dataKey="silver"
                          name="Silver points"
                          fill="#94a3b8"
                          stackId="p"
                        />,
                        <Bar
                          key="golden"
                          dataKey="golden"
                          name="Gold points"
                          fill="#eab308"
                          stackId="p"
                        />,
                        <Bar
                          key="rz"
                          dataKey="redZones"
                          name="Red-zone penalty"
                          fill="#ef4444"
                          stackId="p"
                        />,
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
                <div
                  key={row.classId}
                  className="flex-1 min-w-[130px] rounded-xl border border-light-border p-2"
                >
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
        </>
      )}

    </div>
  );
};

const TotalRow = ({
  label,
  columns,
  pick,
  printPick,
  printLabel,
  printOnly,
  hint,
  strong,
  muted,
  onSort,
  sorted,
  printRow,
}) => (
  <tr
    className={`${strong ? 'bg-slate-50' : muted ? 'bg-white' : ''} ${
      printOnly ? 'hidden print:table-row' : ''
    }`}
    data-print-row={printRow}
  >
    <th className="sticky left-0 z-10 bg-inherit border border-light-border px-3 py-2 text-left">
      <button
        onClick={onSort}
        disabled={!onSort}
        className={`font-black text-dark-primary ${onSort ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {printLabel ? (
          <>
            <span className="print:hidden">{label}</span>
            <span className="hidden print:inline">{printLabel}</span>
          </>
        ) : (
          label
        )}
        {onSort && (
          <i
            className={`fas ml-1 text-[9px] print:hidden ${
              sorted === 'asc'
                ? 'fa-sort-up'
                : sorted === 'desc'
                  ? 'fa-sort-down'
                  : 'fa-sort text-dark-soft/50'
            }`}
          />
        )}
      </button>
      {hint && <div className="text-[9px] font-semibold text-dark-soft print:hidden">{hint}</div>}
    </th>
    {columns.map((row) => (
      <td
        key={row.classId}
        className={`border border-light-border px-2 py-2 text-center font-black tabular-nums ${
          strong ? 'text-dark-primary' : 'text-dark-muted'
        }`}
      >
        {printPick ? (
          <>
            <span className="screen-only">{pick(row)}</span>
            <span className="hidden print:inline">{printPick(row)}</span>
          </>
        ) : (
          pick(row)
        )}
      </td>
    ))}
  </tr>
);

const AppreciationRow = ({ label, hint, columns, pick, accent, image, face }) => (
  <tr data-print-row="appreciation">
    <th className="sticky left-0 z-10 bg-white border border-light-border px-3 py-2 text-left">
      <div className="flex items-center gap-2">
        <CoinArt accent={accent} image={image} size={24} alt={label} face={face} />
        <span className="font-bold text-dark-primary leading-tight">{label}</span>
      </div>
      <div className="text-[9px] font-semibold text-dark-soft print:hidden">{hint}</div>
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
              <span className="print:hidden">
                <CoinArt accent={accent} image={image} size={18} alt={label} face={face} />
              </span>
              <span>{value}</span>
            </div>
          ) : (
            <>
              <span className="screen-only">-</span>
              <span className="hidden print:inline">0</span>
            </>
          )}
        </td>
      );
    })}
  </tr>
);

export default ScorecardTab;
