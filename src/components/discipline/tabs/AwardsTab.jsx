import React, { useState } from 'react';
import CoinArt from '../CoinArt';

/**
 * Weekly shields, monthly cups and the best class of the year.
 *
 * Weekly shields come only from a saved controller recommendation unless the recommendation preview
 * is explicitly enabled on the scorecard.
 */
const AwardsTab = ({
  categories,
  shields,
  winnersByCategory,
  shieldCounts,
  notes = [],
  monthlyCups,
  bestOfYear,
  selectedWeek,
}) => {
  const [openShield, setOpenShield] = useState(null);
  const anyTie = (shields || []).some((shield) => shield.rule5);

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-black text-dark-primary">Weekly shields</h3>
        <p className="text-[11px] font-semibold text-dark-muted mb-2">
          {selectedWeek
            ? `Week of ${selectedWeek} · saved shield recommendations`
            : 'Choose a week to see its shields'}
          {anyTie ? ' · yellow marks a shield selected through Rule 5' : ''}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(categories || [])
            .filter((category) => (category.coin_kind || 'discipline') === 'discipline')
            .map((category) => {
              const winners = winnersByCategory?.[String(category.id)] || [];
              const tied = winners.filter((winner) => winner._rule5);
              return (
                <div
                  key={category.id}
                  className="rounded-2xl border border-light-border bg-white p-3 flex flex-col gap-2"
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
                  {winners.length < Number(category.shields_count || 0) && (
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
                            winner._rule5
                              ? 'fas fa-shield-halved text-yellow-600'
                              : 'fas fa-shield-halved text-emerald-600'
                          } text-[11px]`}
                        />
                        <span className="text-sm font-black text-dark-primary">
                          {winner.className}
                        </span>
                        <span className="text-[11px] font-bold text-dark-muted tabular-nums">
                          {winner._coins} coins
                        </span>
                        {winner._rule5 && !winner._saved && (
                          <span className="text-[9px] font-black uppercase tracking-wide text-yellow-900 bg-yellow-100 border border-yellow-300 rounded-full px-1.5 py-0.5">
                            Rule 5 recommendation
                          </span>
                        )}
                      </li>
                    ))}
                    {winners.length === 0 && (
                      <li className="text-[11px] font-semibold text-dark-muted">
                        No coins logged in this discipline yet.
                      </li>
                    )}
                  </ul>

                  {tied.length > 0 && (
                    <button
                      onClick={() => setOpenShield(openShield === category.id ? null : category.id)}
                      className="self-start text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 cursor-pointer"
                      title="Show Rule 5 selection"
                    >
                      tie-break
                    </button>
                  )}

                  {openShield === category.id && tied.length > 0 && (
                    <ul className="text-[10px] font-semibold text-dark-muted space-y-0.5">
                      {tied.map((winner) => (
                        <li key={winner.classId}>
                          {winner.className}: selected from the tied rank group using Rule 5.
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
                      note.type === 'recommendation'
                        ? 'fas fa-scale-balanced text-yellow-600'
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
