import React, { useEffect, useState } from 'react';

/**
 * Finalising a discipline's shields.
 *
 * The engine never leaves a place empty: when the criteria cannot separate a tie it fills the place
 * with a RECOMMENDATION (shown highlighted on the scorecard) and reports the discipline as pending.
 * This dialog is where a management user confirms that recommendation or replaces it, and it works
 * per place, so Language Excellence's three shields can be settled in one go.
 *
 * Only the places that are still open are editable here; the shields the management already
 * finalised earlier are listed above and kept.
 */
const DecisionDialog = ({
  entry,
  decided = [],
  maxPlaces = 2,
  saving = false,
  onClose,
  onConfirm,
  onClear,
}) => {
  const [picked, setPicked] = useState([]);

  // The system's recommendation is what the dialog starts with.
  useEffect(() => {
    setPicked((entry?.recommendedIds || []).map(String));
  }, [entry]);

  if (!entry) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-4 sm:p-6" data-feature="discipline-shield-decision">
          <p className="text-xs font-semibold text-dark-muted">
            This discipline no longer needs a decision.
          </p>
          <button
            onClick={onClose}
            className="mt-3 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const decidedIds = decided.map((winner) => String(winner.classId));
  const openPlaces = Math.max(1, Number(entry.placesToConfirm ?? entry.placesLeft ?? 1));
  const room = Math.max(0, Number(maxPlaces) - decidedIds.length);
  const recommendedIds = (entry.recommendedIds || []).map(String);

  const toggle = (classId) => {
    const key = String(classId);
    setPicked((prev) => {
      if (prev.includes(key)) return prev.filter((id) => id !== key);
      if (prev.length >= room) return prev;
      return [...prev, key];
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        data-feature="discipline-shield-decision"
      >
        <div className="flex items-start justify-between px-4 sm:px-6 py-3 border-b border-light-border">
          <div>
            <h4 className="text-sm font-black text-dark-primary">
              Finalise the shields · {entry.categoryName}
            </h4>
            <p className="text-[11px] font-semibold text-dark-muted">
              {openPlaces} place{openPlaces === 1 ? '' : 's'} to settle
              {entry.coins != null ? ` · all on ${entry.coins} coins` : ''}
              {entry.filtersExhausted ? ' · the criteria left every class standing' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-dark-soft hover:bg-light-lbg transition-all cursor-pointer"
            title="Close"
          >
            <i className="fas fa-xmark" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-3">
          {decided.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-dark-soft mb-1">
                Already finalised
              </p>
              <div className="flex flex-wrap gap-1.5">
                {decided.map((winner) => (
                  <span
                    key={winner.classId}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800"
                  >
                    <i className="fas fa-shield-halved text-[9px]" />
                    {winner.className}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-dark-soft mb-1">
              {room === 1 ? 'Pick the class for the open place' : `Pick up to ${room} classes`}
            </p>
            <div className="space-y-1.5">
              {(entry.candidates || []).map((candidate) => {
                const key = String(candidate.classId);
                const isDecided = decidedIds.includes(key);
                const isRecommended = recommendedIds.includes(key);
                const isPicked = picked.includes(key);
                const atLimit = !isPicked && picked.length >= room;
                return (
                  <button
                    key={candidate.classId}
                    onClick={() => !isDecided && !atLimit && toggle(candidate.classId)}
                    disabled={saving || isDecided || atLimit}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-all cursor-pointer disabled:opacity-60 ${
                      isDecided
                        ? 'border-emerald-300 bg-emerald-50/60'
                        : isPicked
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-light-border hover:bg-light-lbg'
                    }`}
                    title={isDecided ? 'Already finalised' : atLimit ? 'No places left' : 'Use this class'}
                  >
                    <div className="flex items-center gap-2">
                      <i
                        className={`${
                          isDecided
                            ? 'fas fa-shield-halved text-emerald-600'
                            : isPicked
                              ? 'fas fa-circle-check text-amber-600'
                              : 'far fa-circle text-dark-soft'
                        } text-[11px]`}
                      />
                      <span className="text-xs font-black text-dark-primary">
                        {candidate.className}
                      </span>
                      {isRecommended && (
                        <span className="text-[9px] font-black uppercase tracking-wide text-amber-800 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5">
                          system pick
                        </span>
                      )}
                    </div>
                    <span className="ml-5 text-[10px] font-bold text-dark-muted tabular-nums">
                      silver {candidate.silverCoins} · total coins {candidate.totalCoins} · red{' '}
                      {candidate.redZones} · strength {candidate.strength} · shields held{' '}
                      {candidate.shieldsHeld}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-light-border">
          <button
            onClick={() => onClear({ categoryId: entry.categoryId })}
            disabled={saving}
            className="px-3 py-2 rounded-xl border border-light-border text-[11px] font-bold text-dark-muted hover:bg-light-lbg transition-all cursor-pointer disabled:opacity-50"
            title="Forget the decision and let the criteria decide again"
          >
            <i className="fas fa-rotate-left mr-1" />
            Reset to the criteria
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-light-border text-xs font-bold text-dark-soft hover:bg-light-lbg transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm({ categoryId: entry.categoryId, classIds: [...decidedIds, ...picked] })}
              disabled={saving || picked.length === 0}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <i className="fas fa-check mr-1" />
              Finalise {picked.length + decidedIds.length} shield
              {picked.length + decidedIds.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionDialog;
