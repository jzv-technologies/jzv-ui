import React, { useEffect, useMemo, useState } from 'react';
import CoinArt from '../CoinArt';
import { showToast } from '../../../utils/toast';
import { splitCategories } from '../../../utils/disciplineScoring';

/**
 * Coin artwork size and the exact distance between two coins in a pile.
 *
 * The stack artwork is a wide ellipse (300x162), so a coin is rendered 96px wide and 52px tall - the
 * image letter-boxes inside that box, which means every discipline's coins come out the same height
 * and the pile keeps an even rhythm. COIN_PITCH is the distance from one coin's top to the next one's,
 * so consecutive coins overlap by COIN_HEIGHT - COIN_PITCH and each one shows that band. A pile is
 * drawn upward from a fixed floor (see the pile markup), so its bottom coin never moves.
 */
const COIN_WIDTH = 96;
const COIN_HEIGHT = 52;
const COIN_PITCH = 13;

/**
 * The coin stacks for one class.
 *
 * This is what replaced the "Log coins" form: the teacher opens the class from the scorecard and
 * clicks a coin in a stack to take it out. One click takes ONE coin. The piles are drawn as real
 * stacks - each coin overlaps the one below it, and the coins already taken sit greyed out on top of
 * the pile. A coin that has been taken stays taken; only a management or coordinator user may put
 * one back.
 *
 * Every coin is attributed to a teacher. By default the coins are recorded against the logged-in user
 * (the "submit as" side of the toggle); flipping the toggle to "Submit for others" swaps in a picker
 * of the staff list, for when a different teacher collected the coins.
 */
const ClassCoinStackModal = ({
  open,
  onClose,
  classRow,
  classOptions = [],
  onChangeClass,
  categories,
  coins,
  teachers = [],
  currentTeacher = null,
  weekStart,
  weekLabel,
  canRestore,
  canGold,
  saving,
  onSubmit,
}) => {
  const {
    disciplines,
    silver: silverCategory,
    golden: goldenCategory,
  } = useMemo(() => splitCategories(categories), [categories]);
  const [removed, setRemoved] = useState(null); // { key, categoryId, columnIndex, offset }
  const [submitForOthers, setSubmitForOthers] = useState(false);
  const [otherTeacherId, setOtherTeacherId] = useState('');
  const [busyCoin, setBusyCoin] = useState(0);

  useEffect(() => {
    if (!open) return;
    setSubmitForOthers(!currentTeacher);
    setOtherTeacherId('');
    setRemoved(null);
    setBusyCoin(0);
  }, [open, classRow?.classId, currentTeacher]);

  const takenByCategory = useMemo(() => {
    const map = {};
    (coins || [])
      .filter((c) => String(c.class_id) === String(classRow?.classId))
      .forEach((c) => {
        map[String(c.category_id)] = Number(c.coins || 0);
      });
    return map;
  }, [coins, classRow]);

  /** The teacher the coins are recorded against. */
  const actingTeacher = useMemo(() => {
    if (!submitForOthers) return currentTeacher;
    return teachers.find((t) => String(t.id) === String(otherTeacherId)) || null;
  }, [submitForOthers, currentTeacher, teachers, otherTeacherId]);

  const requireTeacher = () => {
    if (actingTeacher) return actingTeacher;
    showToast(
      submitForOthers
        ? 'Choose the teacher the coins are for'
        : 'Your login is not linked to a staff record - use "Submit for others"',
      'error'
    );
    return null;
  };

  const takeCoin = async (category, flight = null) => {
    if (!weekStart) {
      showToast('Choose a week first', 'error');
      return;
    }
    const who = requireTeacher();
    if (!who) return;

    setBusyCoin(category.id);
    // Animate the coin leaving the stack while the counter is written.
    // The fly-out ghost is drawn where the coin actually was, and a pile grows upward from its floor,
    // so that slot is not a fixed position on screen - the caller passes the slot the coin left.
    setRemoved({
      key: `${category.id}-${Date.now()}`,
      categoryId: category.id,
      columnIndex: flight?.columnIndex ?? 0,
      offset: flight?.offset ?? 0,
    });
    try {
      const ok = await onSubmit({
        classId: classRow.classId,
        categoryId: category.id,
        teacherId: who.id,
        coins: 1,
        weekStart,
      });
      if (!ok) setRemoved(null);
    } finally {
      setBusyCoin(0);
      setTimeout(() => setRemoved(null), 420);
    }
  };

  /** Award an appreciation coin (silver by a teacher, gold by management). */
  const awardCoin = async (category) => {
    if (!category || !weekStart) return;
    let who = null;
    if (category.coin_kind !== 'golden') {
      who = requireTeacher();
      if (!who) return;
    }

    setBusyCoin(category.id);
    try {
      await onSubmit({
        classId: classRow.classId,
        categoryId: category.id,
        teacherId: who?.id || null,
        coins: 1,
        weekStart,
      });
    } finally {
      setBusyCoin(0);
    }
  };

  const restoreCoin = async (category) => {
    const taken = takenByCategory[String(category.id)] || 0;
    if (taken <= 0) {
      showToast('No coin has been taken from this discipline', 'error');
      return;
    }
    setBusyCoin(category.id);
    try {
      await onSubmit({
        classId: classRow.classId,
        categoryId: category.id,
        // The counter holds coins TAKEN, so putting one back is a negative delta.
        delta: -1,
        teacherId: actingTeacher?.id || null,
        weekStart,
        restore: true,
      });
    } finally {
      setBusyCoin(0);
    }
  };

  if (!open || !classRow) return null;

  const totalTaken = disciplines.reduce(
    (sum, category) => sum + (takenByCategory[String(category.id)] || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50">
      <div
        className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl max-h-[92vh] flex flex-col"
        data-feature="discipline-coin-stack"
      >
        <div className="flex items-start justify-between px-4 sm:px-6 py-4 border-b border-light-border">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-dark-primary">
                {classRow.className} · coin stacks
              </h3>
              {onChangeClass && classOptions.length > 1 && (
                <select
                  value={String(classRow.classId)}
                  onChange={(e) => onChangeClass(e.target.value)}
                  className="max-w-[190px] border border-light-border rounded-xl px-2 py-1 text-[11px] font-bold text-dark-primary bg-white outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                  title="Switch class"
                  data-feature-filter="coin-stack-class"
                >
                  {classOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-[11px] font-semibold text-dark-muted">
              {weekLabel || weekStart} · {totalTaken} coin{totalTaken === 1 ? '' : 's'} taken this
              week
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

        {/* Who the coins are recorded against. */}
        <div className="px-4 sm:px-6 py-3 border-b border-light-border bg-light-bg/40 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="text-[11px] font-black uppercase tracking-wide text-dark-soft shrink-0">
            Coins taken by
          </span>

          <div
            className="inline-flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0"
            data-feature-tab="discipline-coin-attribution"
          >
            <button
              onClick={() => setSubmitForOthers(false)}
              disabled={!currentTeacher}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-40 ${
                !submitForOthers
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-dark-muted hover:text-dark-primary'
              }`}
              title={
                currentTeacher
                  ? 'Record the coins against your own staff record'
                  : 'Your login is not linked to a staff record'
              }
            >
              <i className="fas fa-user-check text-[10px] mr-1" />
              Submit as {(currentTeacher?.name || '').split(' ')[0] || 'me'}
            </button>
            <button
              onClick={() => setSubmitForOthers(true)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                submitForOthers
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-dark-muted hover:text-dark-primary'
              }`}
              title="Record the coins against another teacher"
            >
              <i className="fas fa-user-group text-[10px] mr-1" />
              Submit for others
            </button>
          </div>

          {submitForOthers ? (
            <select
              value={otherTeacherId}
              onChange={(e) => setOtherTeacherId(e.target.value)}
              className="w-full sm:w-64 border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary bg-white outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
              data-feature-filter="coin-stack-teacher"
            >
              <option value="">Choose a teacher…</option>
              {teachers.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name}
                  {option.emp_id ? ` (${option.emp_id})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-[11px] font-bold text-emerald-700">
              <i className="fas fa-check-circle mr-1" />
              {currentTeacher?.name || 'No staff record linked'}
              {currentTeacher?.emp_id ? ` · ${currentTeacher.emp_id}` : ''}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            data-feature="discipline-coin-stacks"
          >
            {disciplines.map((category) => {
              const taken = takenByCategory[String(category.id)] || 0;
              const total = Number(category.weekly_coins || 0);
              const left = Math.max(0, total - taken);
              const isRed = left <= Number(category.red_zone_threshold ?? 4);
              const flying = removed?.categoryId === category.id;
              // The pile is what is LEFT in the class, so it shrinks as coins are taken. Language
              // Excellence starts with 20 coins, so its pile is laid out in two columns instead of
              // one very tall column. The column layout follows the ENTITLEMENT rather than what is
              // left, so it never re-flows while coins are being taken.
              const pileColumns = total > 10 ? 2 : 1;
              const perColumn = Math.ceil(total / pileColumns);
              // Every pile is drawn in a box of the same height. The bottom coin sits on the floor of
              // that box and each coin above it is lifted by COIN_PITCH, so taking a coin off the top
              // leaves every remaining coin exactly where it was instead of sliding the stack up.
              const stageHeight = (perColumn - 1) * COIN_PITCH + COIN_HEIGHT;
              // Coins come off the FIRST stack until it is empty, and only then off the second one, so
              // one click never pulls a coin out of both stacks at once. Both stacks keep their slots
              // for as long as they hold a coin, so neither ever slides sideways.
              const columnCounts = Array.from({ length: pileColumns }, (_, columnIndex) =>
                Math.max(0, Math.min(perColumn, left - (pileColumns - 1 - columnIndex) * perColumn))
              );
              const lastFilled = columnCounts.reduce((last, n, i) => (n > 0 ? i : last), -1);
              const columnsShown = lastFilled + 1;
              // The stack being drained - the first one that still holds a coin. Only its top coin is
              // live, which is what keeps the order above true.
              const activeColumn = columnCounts.findIndex((n) => n > 0);

              return (
                <div
                  key={category.id}
                  className={`flex flex-col rounded-2xl border p-3 ${
                    isRed ? 'border-red-300 bg-red-50/60' : 'border-light-border bg-white'
                  }`}
                  data-discipline={category.code}
                >
                  <div className="flex items-start gap-2">
                    <CoinArt
                      image={category.coin_image}
                      variant="small"
                      accent={category.coin_accent}
                      shape={category.coin_shape}
                      face={category.coin_face}
                      size={28}
                      alt={category.name}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-dark-primary leading-tight">
                        {category.name}
                      </p>
                      <p className="text-[10px] font-semibold text-dark-muted tabular-nums">
                        {left} of {total} left
                        {isRed && (
                          <span className="ml-1.5 text-[9px] font-black text-white bg-red-500 rounded-full px-1.5 py-0.5 uppercase">
                            red zone
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* The pile: the coins still in the class, drawn in a box of a fixed height so the
                      floor of the pile never moves. Each coin sits COIN_PITCH above the one below it,
                      so the stack keeps the same rhythm whatever the artwork size. The first stack is
                      drained before the second one, and only the top coin of the stack being drained
                      is live - clicking it takes that coin and the next one becomes the top. */}
                  <div className="relative mt-3 mb-2 flex min-h-[90px] flex-col items-center justify-center">
                    {left > 0 ? (
                      <div className="flex items-end gap-1.5">
                        {Array.from({ length: columnsShown }).map((_, columnIndex) => {
                          const columnCount = columnCounts[columnIndex];
                          const isActiveStack = columnIndex === activeColumn;
                          return (
                            <div
                              key={columnIndex}
                              className="relative"
                              style={{ width: `${COIN_WIDTH}px`, height: `${stageHeight}px` }}
                            >
                              {Array.from({ length: columnCount }).map((__, index) => {
                                const isTop = isActiveStack && index === 0;
                                return (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={
                                      isTop
                                        ? () =>
                                            takeCoin(category, {
                                              columnIndex,
                                              offset: (columnCount - 1) * COIN_PITCH,
                                            })
                                        : undefined
                                    }
                                    disabled={!isTop || saving || busyCoin === category.id}
                                    style={{
                                      bottom: `${(columnCount - 1 - index) * COIN_PITCH}px`,
                                      zIndex: 60 - index,
                                    }}
                                    title={
                                      isTop
                                        ? `Take the top coin from ${category.name}`
                                        : `${category.name} coin ${index + 1}`
                                    }
                                    aria-hidden={!isTop}
                                    data-stack={columnIndex}
                                    data-coin-top={isTop ? 'true' : undefined}
                                    className={`absolute left-0 flex rounded-full ${
                                      isTop
                                        ? 'cursor-pointer hover:-translate-y-1 hover:drop-shadow-lg'
                                        : 'pointer-events-none'
                                    }`}
                                  >
                                    <CoinArt
                                      image={category.coin_image}
                                      variant="stack"
                                      accent={category.coin_accent}
                                      shape={category.coin_shape}
                                      face={category.coin_face}
                                      size={COIN_WIDTH}
                                      height={COIN_HEIGHT}
                                      alt={category.name}
                                    />
                                  </button>
                                );
                              })}

                              {/* The coin leaving the pile is drawn as a separate ghost so the
                                  animation is not disturbed when the counter reloads and the pile
                                  becomes one coin shorter. */}
                              {flying && removed.columnIndex === columnIndex && (
                                <span
                                  key={removed.key}
                                  className="pointer-events-none absolute left-0 flex"
                                  style={{
                                    bottom: `${removed.offset}px`,
                                    animation: 'disciplineCoinOut 420ms ease-out forwards',
                                  }}
                                  aria-hidden="true"
                                >
                                  <CoinArt
                                    image={category.coin_image}
                                    variant="stack"
                                    accent={category.coin_accent}
                                    shape={category.coin_shape}
                                    size={COIN_WIDTH}
                                    height={COIN_HEIGHT}
                                    alt=""
                                  />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] font-bold text-red-600">All coins taken</p>
                    )}
                  </div>

                  {taken > 0 && (
                    <div
                      className="mb-2 flex flex-wrap items-center justify-center gap-0.5"
                      title={`${taken} coin${taken === 1 ? '' : 's'} already taken`}
                      data-feature="discipline-taken-coins"
                    >
                      {Array.from({ length: Math.min(taken, 10) }).map((_, index) => (
                        <CoinArt
                          key={index}
                          image={category.coin_image}
                          variant="stack"
                          accent={category.coin_accent}
                          shape={category.coin_shape}
                          size={16}
                          alt=""
                          dim
                        />
                      ))}
                      {taken > 10 && (
                        <span className="text-[10px] font-black text-dark-muted">
                          +{taken - 10}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto space-y-1.5">
                    <button
                      onClick={() =>
                        takeCoin(category, {
                          columnIndex: Math.max(0, activeColumn),
                          offset: (columnCounts[Math.max(0, activeColumn)] - 1) * COIN_PITCH,
                        })
                      }
                      disabled={saving || left <= 0 || busyCoin === category.id}
                      className="w-full px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-all cursor-pointer disabled:opacity-40"
                      title="Take one coin out of the class"
                    >
                      <i className="fas fa-hand-holding-dollar mr-1" />
                      Take a coin
                    </button>

                    {canRestore && (
                      <button
                        onClick={() => restoreCoin(category)}
                        disabled={saving || taken <= 0}
                        className="w-full px-2 py-1.5 rounded-xl border border-light-border text-[10px] font-bold text-dark-muted hover:bg-light-lbg transition-all cursor-pointer disabled:opacity-40"
                        title="Put a taken coin back (management or coordinator)"
                      >
                        <i className="fas fa-rotate-left mr-1" />
                        Put back ({taken})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Appreciation coins get their own boxes: blank until something is added to them. */}
            {[silverCategory, goldenCategory].map((category) => {
              if (!category) return null;
              const added = takenByCategory[String(category.id)] || 0;
              const isSilver = category.coin_kind === 'silver';
              const canAward = isSilver || canGold;
              return (
                <div
                  key={category.id}
                  className={`flex flex-col rounded-2xl border p-3 ${
                    isSilver ? 'border-slate-300 bg-slate-50/70' : 'border-amber-300 bg-amber-50/60'
                  }`}
                  data-discipline={category.code}
                >
                  <div className="flex items-start gap-2">
                    <CoinArt
                      image={category.coin_image}
                      variant="small"
                      accent={category.coin_accent}
                      shape={category.coin_shape}
                      face={category.coin_face}
                      size={28}
                      alt={category.name}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-dark-primary leading-tight">
                        {category.name}
                      </p>
                      <p className="text-[10px] font-semibold text-dark-muted tabular-nums">
                        {added > 0
                          ? `${added} coin${added === 1 ? '' : 's'} this week`
                          : 'No coins yet'}
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-3 mb-2 flex min-h-[90px] items-center justify-center">
                    {added > 0 ? (
                      <div
                        className="relative"
                        style={{
                          width: `${COIN_WIDTH}px`,
                          height: `${(added - 1) * COIN_PITCH + COIN_HEIGHT}px`,
                        }}
                        data-feature="discipline-appreciation-coins"
                      >
                        {Array.from({ length: added }).map((_, index) => (
                          <span
                            key={index}
                            className="absolute left-0"
                            style={{ top: `${index * COIN_PITCH}px`, zIndex: 60 - index }}
                          >
                            <CoinArt
                              image={category.coin_image}
                              variant="stack"
                              accent={category.coin_accent}
                              shape={category.coin_shape}
                              face={category.coin_face}
                              size={COIN_WIDTH}
                              height={COIN_HEIGHT}
                              alt={category.name}
                            />
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="flex h-[74px] w-full items-center justify-center rounded-xl border border-dashed border-light-border text-[10px] font-semibold text-dark-soft"
                        data-feature="discipline-appreciation-empty"
                      >
                        Nothing yet
                      </div>
                    )}
                  </div>

                  <div className="mt-auto">
                    <button
                      onClick={() => awardCoin(category)}
                      disabled={saving || !canAward || busyCoin === category.id || !weekStart}
                      className={`w-full px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer disabled:opacity-40 ${
                        isSilver
                          ? 'bg-slate-600 hover:bg-slate-700 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                      title={
                        isSilver
                          ? 'Add a silver teacher coin (+3 points)'
                          : 'Add a gold management coin (+30 points)'
                      }
                    >
                      <i className={`fas ${isSilver ? 'fa-medal' : 'fa-crown'} mr-1`} />
                      Add {isSilver ? 'silver' : 'gold'} coin
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-light-border">
          <p className="text-[10px] font-semibold text-dark-muted">
            One click takes one coin, recorded against the teacher shown above.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      <style>{`
        @keyframes disciplineCoinOut {
          0%   { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
          60%  { transform: translate(48px, -34px) scale(1.18) rotate(18deg); opacity: .95; }
          100% { transform: translate(120px, -74px) scale(.55) rotate(40deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ClassCoinStackModal;
