import React, { useMemo, useState } from 'react';
import CoinArt from '../CoinArt';
import DecisionDialog from '../modals/DecisionDialog';

/**
 * Weekly shields, monthly cups and the best class of the year.
 *
 * Nothing is stored for this: the honours are derived from the coin counters like everything else,
 * so they can never drift from the scorecard. A tie explains itself through the `filter` that
 * decided it, which is shown next to the winner so the result is never a mystery.
 */
const AwardsTab = ({
  categories,
  shields,
  winnersByCategory,
  shieldCounts,
  pending = [],
  notes = [],
  monthlyCups,
  bestOfYear,
  selectedWeek,
  canDecide,
  saving,
  onDecide,
}) => {
  const [openShield, setOpenShield] = useState(null);
  const [decisionFor, setDecisionFor] = useState(null);

  const categoryById = useMemo(
    () =>
      (categories || []).reduce((acc, category) => {
        acc[String(category.id)] = category;
        return acc;
      }, {}),
    [categories]
  );

  const anyTie = (shields || []).some((s) => s.filter !== 'Highest coins in this discipline');

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-black text-dark-primary">Weekly shields</h3>
        <p className="text-[11px] font-semibold text-dark-muted mb-2">
          {selectedWeek
            ? `Week of ${selectedWeek} · the class with the most coins left in each discipline`
            : 'Choose a week to see its shields'}
          {anyTie ? ' · the “tie-break” tag explains how a tie was settled' : ''}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(categories || [])
            .filter((category) => (category.coin_kind || 'discipline') === 'discipline')
            .map((category) => {
              const winners = winnersByCategory?.[String(category.id)] || [];
              const tied = winners.filter((w) => w._reason && w._reason !== 'Highest coins in this discipline');
              const pendingEntry = (pending || []).find(
                (p) => String(p.categoryId) === String(category.id)
              );
              const needsDecision = Boolean(pendingEntry);
              // The recommendation the management is asked to confirm: the provisional shields, or,
              // when nothing could be shown yet, the classes the system picked out of the tie.
              const recommendedIds = (pendingEntry?.recommendedIds || []).map(String);
              const recommended = winners.some((w) => w._provisional)
                ? winners.filter((w) => w._provisional)
                : (pendingEntry?.candidates || []).filter((c) =>
                    recommendedIds.includes(String(c.classId))
                  );
              return (
                <div
                  key={category.id}
                  className={`rounded-2xl border p-3 flex flex-col gap-2 ${
                    needsDecision ? 'border-amber-400 bg-amber-50/70' : 'border-light-border bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CoinArt
                        image={category.coin_image}
                        accent={category.coin_accent}
                        shape={category.coin_shape}
                        face={category.coin_face}
                        size={28}
                        alt={category.name}
                      />
                      <span className="text-xs font-black text-dark-primary leading-tight">
                        {category.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-dark-soft">
                      {winners.length}/{category.shields_count} shields
                    </span>
                  </div>

                  {/* A discipline must award every shield it owes; if the payload says otherwise the
                      reason has to be visible rather than silent. */}
                  {!needsDecision &&
                    winners.length < Number(category.shields_count || 0) && (
                      <p className="text-[10px] font-bold text-red-600">
                        <i className="fas fa-triangle-exclamation mr-1" />
                        {Number(category.shields_count) - winners.length} shield
                        {Number(category.shields_count) - winners.length === 1 ? '' : 's'} not awarded -
                        check the shield count in Setup
                      </p>
                    )}

                  <ul className="space-y-1">
                    {winners.map((winner, index) => (
                      // A class can hold more than one shield in a discipline (the cap is relaxed
                      // when no other class is left), so the class id alone is not a unique key.
                      <li key={`${winner.classId}-${index}`} className="flex items-center gap-2">
                        <i
                          className={`${
                            winner._provisional
                              ? 'fas fa-hourglass-half text-amber-600'
                              : 'fas fa-shield-halved text-emerald-600'
                          } text-[11px]`}
                        />
                        <span className="text-sm font-black text-dark-primary">
                          {winner.className}
                        </span>
                        <span className="text-[11px] font-bold text-dark-muted tabular-nums">
                          {winner._coins} coins
                        </span>
                        {winner._provisional && (
                          <span className="text-[9px] font-black uppercase tracking-wide text-amber-800 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5">
                            recommended
                          </span>
                        )}
                      </li>
                    ))}
                    {winners.length === 0 && !needsDecision && (
                      <li className="text-[11px] font-semibold text-dark-muted">
                        No coins logged in this discipline yet.
                      </li>
                    )}
                  </ul>

                  {needsDecision && (
                    <div className="rounded-xl border border-amber-300 bg-white p-2">
                      <p className="text-[11px] font-bold text-amber-900">
                        <i className="fas fa-scale-balanced mr-1" />
                        {recommended.length > 0
                          ? `The system recommends ${recommended
                              .map((r) => r.className)
                              .join(' and ')} - confirm it, or pick another class.`
                          : 'The criteria could not separate the tied classes - the management decides.'}
                      </p>
                      {canDecide ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setDecisionFor(category.id)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-all cursor-pointer"
                          >
                            {recommended.length > 0 ? 'Confirm or change' : 'Choose the class'}
                          </button>
                          {recommended.length > 0 && (
                            <button
                              onClick={() =>
                                onDecide({
                                  categoryId: category.id,
                                  classIds: recommended.map((r) => r.classId),
                                })
                              }
                              disabled={saving}
                              className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                              title="Accept the system's recommendation"
                            >
                              <i className="fas fa-check mr-1" />
                              Confirm recommendation
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-[10px] font-semibold text-dark-muted">
                          Waiting for management.
                        </p>
                      )}
                    </div>
                  )}

                  {tied.length > 0 && (
                    <button
                      onClick={() => setOpenShield(openShield === category.id ? null : category.id)}
                      className="self-start text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 cursor-pointer"
                      title="How this shield was decided"
                    >
                      tie-break
                    </button>
                  )}

                  {openShield === category.id && tied.length > 0 && (
                    <ul className="text-[10px] font-semibold text-dark-muted space-y-0.5">
                      {tied.map((winner) => (
                        <li key={winner.classId}>
                          {winner.className}: {winner._reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
        </div>

        {notes.length > 0 && (
          <details className="mt-2">
            <summary className="text-[11px] font-bold text-dark-muted cursor-pointer">
              How the shields were decided ({notes.length} notes)
            </summary>
            <ul className="mt-1 space-y-0.5">
              {notes.map((note, index) => (
                <li key={index} className="text-[10px] font-semibold text-dark-muted">
                  <i
                    className={`mr-1 ${
                      note.type === 'pending'
                        ? 'fas fa-scale-balanced text-amber-600'
                        : 'fas fa-filter text-slate-400'
                    }`}
                  />
                  {note.text}
                </li>
              ))}
            </ul>
          </details>
        )}

        {Object.keys(shieldCounts || {}).length > 0 && (
          <p className="mt-2 text-[11px] font-semibold text-dark-muted">
            Shields per class this week:{' '}
            {Object.entries(shieldCounts)
              .map(([classId, count]) => {
                const name = (shields || []).find((s) => String(s.classId) === classId)?.className;
                return `${name || classId}: ${count}`;
              })
              .join(' · ')}{' '}
            (a class can hold at most 2 before FILTER I applies)
          </p>
        )}
      </section>

      {decisionFor && (
        <DecisionDialog
          entry={(pending || []).find((p) => String(p.categoryId) === String(decisionFor))}
          decided={((winnersByCategory || {})[String(decisionFor)] || []).filter(
            (w) => !w._provisional
          )}
          maxPlaces={
            (categoryById[String(decisionFor)]?.shields_count ?? 2) || 2
          }
          saving={saving}
          onClose={() => setDecisionFor(null)}
          onConfirm={async ({ categoryId, classIds }) => {
            const ok = await onDecide({ categoryId, classIds });
            if (ok) setDecisionFor(null);
          }}
          onClear={async ({ categoryId }) => {
            const ok = await onDecide({ categoryId, clear: true });
            if (ok) setDecisionFor(null);
          }}
        />
      )}

      <section>
        <h3 className="text-sm font-black text-dark-primary">Monthly cups</h3>
        <p className="text-[11px] font-semibold text-dark-muted mb-2">
          Cup 1 goes to the highest points overall; cup 2 to the best class in the other programme.
          Points are the sum of every week in the month.
        </p>

        <div className="space-y-3">
          {(monthlyCups || []).map((month) => (
            <div key={month.monthKey} className="rounded-2xl border border-light-border bg-white p-3">
              <span className="text-xs font-black text-dark-primary">{month.monthKey}</span>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {month.cups.map((cup) => (
                  <div
                    key={`${month.monthKey}-${cup.position}`}
                    className={`rounded-xl border p-2 flex items-center gap-2 ${
                      cup.position === 1
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-light-border bg-light-bg/40'
                    }`}
                  >
                    <i
                      className={`fas fa-trophy ${
                        cup.position === 1 ? 'text-amber-500' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide text-dark-soft">
                        Cup {cup.position}
                        {cup.programme ? ` · ${cup.programme}` : ''}
                      </p>
                      <p className="text-xs font-black text-dark-primary">
                        {cup.className}
                        <span className="ml-1.5 text-[10px] font-bold text-dark-muted tabular-nums">
                          {cup.points} pts
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(monthlyCups || []).length === 0 && (
            <p className="text-xs font-semibold text-dark-muted">
              No weeks recorded for this academic year yet.
            </p>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-black text-dark-primary">Best class of the year</h3>
        <p className="text-[11px] font-semibold text-dark-muted">
          Highest cumulative points across the academic year.
        </p>

        {bestOfYear ? (
          <div className="mt-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
            <i className="fas fa-crown text-2xl text-amber-500" />
            <div>
              <p className="text-sm font-black text-dark-primary">
                {bestOfYear.className}
                {bestOfYear.programme ? ` · ${bestOfYear.programme}` : ''}
              </p>
              <p className="text-xs font-bold text-dark-muted tabular-nums">
                {bestOfYear.points} points
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold text-dark-muted">
            No scores recorded for this academic year yet.
          </p>
        )}
      </section>
    </div>
  );
};

export default AwardsTab;
