import React, { useEffect, useState } from 'react';
import CoinArt, { COIN_FILES } from '../CoinArt';

/**
 * Setup: the coin rules (entitlement, coins per incident, red-zone threshold, coin art), the
 * scoring weights, and the programme overrides used by the monthly cups.
 *
 * There is no class-config table: the programme is read from the class name (PCC/GCC) and this tab
 * only stores an override for a class whose name does not say which programme it belongs to.
 */
const ConfigTab = ({
  categories,
  settings,
  classes,
  canConfigure,
  saving,
  onSaveCategory,
  onSaveSettings,
}) => {
  const [draftCategories, setDraftCategories] = useState([]);
  const [draftSettings, setDraftSettings] = useState(settings);
  const [overrides, setOverrides] = useState({});
  const [newOverrideClass, setNewOverrideClass] = useState('');
  const [newOverrideProgramme, setNewOverrideProgramme] = useState('PCC');

  useEffect(() => {
    setDraftCategories((categories || []).map((category) => ({ ...category })));
  }, [categories]);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    setOverrides((settings?.programme_overrides || {}) || {});
  }, [settings]);

  const unassigned = (classes || []).filter((cls) => !cls.programme);
  const overrideNames = Object.keys(overrides);

  const setCategoryField = (id, field, value) =>
    setDraftCategories((prev) =>
      prev.map((category) => (category.id === id ? { ...category, [field]: value } : category))
    );

  const saveOverrides = (next) => onSaveSettings({ programme_overrides: next });

  return (
    <div className="space-y-5">
      {!canConfigure && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
          <i className="fas fa-lock mr-1.5" />
          You can view the discipline setup but not change it.
        </div>
      )}

      <section className="rounded-2xl border border-light-border bg-white p-4">
        <h3 className="text-sm font-black text-dark-primary">Disciplines and coin rules</h3>
        <p className="text-[11px] font-semibold text-dark-muted mb-3">
          Each class starts the week with the entitlement below. Taking a coin takes one coin, and a
          red zone is a discipline left with the threshold or fewer. Shields is how many classes win
          that discipline each week - at most two per class unless the filters have to be relaxed.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50">
                {['Coin', 'Discipline', 'Weekly coins', 'Shields', 'Red zone at', 'Artwork', ''].map(
                  (head) => (
                    <th
                      key={head}
                      className="border border-light-border px-3 py-2 text-left font-black text-dark-primary whitespace-nowrap"
                    >
                      {head}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {draftCategories.map((category) => {
                const isDiscipline = (category.coin_kind || 'discipline') === 'discipline';
                return (
                  <tr key={category.id}>
                    <td className="border border-light-border px-3 py-2">
                      <CoinArt
                        image={category.coin_image}
                        accent={category.coin_accent}
                        shape={category.coin_shape}
                        face={category.coin_face}
                        size={26}
                        alt={category.name}
                      />
                    </td>
                    <td className="border border-light-border px-3 py-2 font-bold text-dark-primary whitespace-nowrap">
                      {category.name}
                      {!isDiscipline && (
                        <span className="ml-2 text-[10px] font-black uppercase tracking-wide text-dark-soft">
                          {category.coin_kind}
                        </span>
                      )}
                    </td>
                    {[
                      { field: 'weekly_coins', min: 0, max: 100, disabled: !isDiscipline },
                      { field: 'shields_count', min: 1, max: 20, disabled: !isDiscipline },
                      { field: 'red_zone_threshold', min: 0, max: 99, disabled: !isDiscipline },
                    ].map(({ field, min, max, disabled }) => (
                      <td key={field} className="border border-light-border px-2 py-1.5">
                        <input
                          type="number"
                          min={min}
                          max={max}
                          value={category[field] ?? 0}
                          disabled={!canConfigure || disabled}
                          onChange={(e) => setCategoryField(category.id, field, Number(e.target.value))}
                          className="w-20 border border-light-border rounded-lg px-2 py-1 text-xs font-bold tabular-nums text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-light-bg disabled:text-dark-soft"
                        />
                      </td>
                    ))}
                    <td className="border border-light-border px-2 py-1.5">
                      <select
                        value={category.coin_image || ''}
                        disabled={!canConfigure}
                        onChange={(e) => setCategoryField(category.id, 'coin_image', e.target.value)}
                        className="border border-light-border rounded-lg px-2 py-1 text-[11px] font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-light-bg"
                      >
                        <option value="">CSS coin</option>
                        {COIN_FILES.map((file) => (
                          <option key={file} value={file}>
                            {file}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-light-border px-3 py-2">
                      {canConfigure && isDiscipline && (
                        <button
                          onClick={() =>
                            onSaveCategory(category.id, {
                              weekly_coins: Number(category.weekly_coins),
                              // A discipline always hands out at least one shield; a stray 0 here
                              // would silently stop the discipline awarding anything.
                              shields_count: Math.max(1, Number(category.shields_count) || 1),
                              red_zone_threshold: Number(category.red_zone_threshold),
                              coin_image: category.coin_image || null,
                            })
                          }
                          disabled={saving}
                          className="px-3 py-1.5 rounded-xl bg-brand-primary text-white text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          Save
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-light-border bg-white p-4">
        <h3 className="text-sm font-black text-dark-primary mb-3">Coin weights</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { field: 'silver_coin_points', label: "Teacher's (silver) coin", suffix: 'points each' },
            { field: 'golden_coin_points', label: 'Management (gold) coin', suffix: 'points each' },
            { field: 'red_zone_penalty', label: 'Red zone penalty', suffix: 'points off' },
            { field: 'max_shields_per_class', label: 'Shields per class', suffix: 'per week, max' },
          ].map(({ field, label, suffix }) => (
            <label key={field} className="block">
              <span className="text-[11px] font-black uppercase tracking-wide text-dark-soft">
                {label}
              </span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={draftSettings?.[field] ?? 0}
                  disabled={!canConfigure}
                  onChange={(e) =>
                    setDraftSettings((prev) => ({ ...prev, [field]: Number(e.target.value) }))
                  }
                  className="w-24 border border-light-border rounded-xl px-3 py-2 text-xs font-black tabular-nums text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-light-bg"
                />
                <span className="text-[11px] font-semibold text-dark-muted">{suffix}</span>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-[11px] font-semibold text-amber-900 leading-snug">
            The red-zone penalty is currently{' '}
            <strong>{Number(draftSettings?.red_zone_penalty ?? 0)}</strong> points. The school&rsquo;s
            printed scorecard for 09 Mar 2024 was produced with no red-zone deduction (1C kept 3
            classroom coins and still scored 55), so set this to 0 to match that sheet.
          </p>
        </div>

        {canConfigure && (
          <button
            onClick={() =>
              onSaveSettings({
                silver_coin_points: Number(draftSettings?.silver_coin_points ?? 3),
                golden_coin_points: Number(draftSettings?.golden_coin_points ?? 30),
                red_zone_penalty: Number(draftSettings?.red_zone_penalty ?? 5),
                max_shields_per_class: Number(draftSettings?.max_shields_per_class ?? 2),
              })
            }
            disabled={saving}
            className="mt-3 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <i className="fas fa-floppy-disk mr-1.5 text-[11px]" />
            Save weights
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-light-border bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-black text-dark-primary">Programme (GCC / PCC)</h3>
            <p className="text-[11px] font-semibold text-dark-muted">
              Read from the class name, so nothing needs storing. The monthly cups use it: cup 2 is
              awarded in the programme that did not take cup 1.
            </p>
          </div>
          {unassigned.length > 0 && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <i className="fas fa-triangle-exclamation mr-1" />
              {unassigned.length} class{unassigned.length > 1 ? 'es' : ''} not named PCC/GCC
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {(classes || []).map((cls) => (
            <div
              key={cls.id}
              className={`rounded-xl border p-2 ${
                cls.programme ? 'border-light-border bg-white' : 'border-amber-200 bg-amber-50/60'
              }`}
            >
              <p className="text-xs font-black text-dark-primary truncate">{cls.name}</p>
              <p className="text-[10px] font-semibold text-dark-muted">
                {cls.programme || 'Not set'} · {cls.strength} students
              </p>
            </div>
          ))}
        </div>

        {canConfigure && (
          <div className="mt-4 border-t border-light-border pt-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-dark-soft mb-1.5">
              Overrides for classes not named PCC/GCC
            </p>

            {overrideNames.length > 0 ? (
              <ul className="space-y-1.5">
                {overrideNames.map((name) => (
                  <li key={name} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-dark-primary flex-1 truncate">{name}</span>
                    <select
                      value={overrides[name]}
                      onChange={(e) => {
                        const next = { ...overrides, [name]: e.target.value };
                        setOverrides(next);
                        saveOverrides(next);
                      }}
                      className="border border-light-border rounded-lg px-2 py-1 text-[11px] font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="PCC">PCC</option>
                      <option value="GCC">GCC</option>
                    </select>
                    <button
                      onClick={() => {
                        const next = { ...overrides };
                        delete next[name];
                        setOverrides(next);
                        saveOverrides(next);
                      }}
                      className="px-2 py-1 rounded-lg border border-light-border text-[11px] font-bold text-dark-muted hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] font-semibold text-dark-muted">
                None. Every class name says PCC or GCC.
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              <input
                value={newOverrideClass}
                onChange={(e) => setNewOverrideClass(e.target.value)}
                placeholder="Class name exactly as in Classes Setup"
                className="flex-1 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <select
                value={newOverrideProgramme}
                onChange={(e) => setNewOverrideProgramme(e.target.value)}
                className="border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="PCC">PCC</option>
                <option value="GCC">GCC</option>
              </select>
              <button
                onClick={() => {
                  const name = newOverrideClass.trim();
                  if (!name) return;
                  const next = { ...overrides, [name]: newOverrideProgramme };
                  setOverrides(next);
                  setNewOverrideClass('');
                  saveOverrides(next);
                }}
                disabled={saving || !newOverrideClass.trim()}
                className="px-3 py-2 rounded-xl bg-brand-primary text-white text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ConfigTab;
