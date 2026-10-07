// src/components/examinations/report-card-designer/block-settings/RankHoldersSettings.jsx
import React from 'react';

/**
 * RankHoldersSettings
 * Block-specific settings for the Rank Holders component in Report Card Designer.
 * Configures:
 * - Display Size: Top X or Upto X
 * - Limit count X
 * - Number of items to display in a row
 * - Repeat for Every Class Yes/No
 * - Class Name badge controls
 * - Podium stepped height toggle & bar base height
 * - Element toggles: photo, percentage, rank, student name
 */
const RankHoldersSettings = ({ currentConfig, setCurrentConfig }) => {
  const rkCfg = currentConfig.rankHoldersConfig || {};

  const updateRk = (patch) => {
    setCurrentConfig((p) => ({
      ...p,
      rankHoldersConfig: {
        ...(p.rankHoldersConfig || {}),
        ...patch,
      },
    }));
  };

  return (
    <div className="space-y-3">
      {/* ── Row 1: Section Heading & Custom Class Name ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
            Section Heading
          </label>
          <input
            type="text"
            value={rkCfg.title ?? 'Class Rank Holders'}
            onChange={(e) => updateRk({ title: e.target.value })}
            placeholder="Class Rank Holders"
            className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
          />
        </div>

        <div className="min-w-0">
          <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
            Custom Class Name Badge Override
          </label>
          <input
            type="text"
            value={rkCfg.classNameText ?? ''}
            onChange={(e) => updateRk({ classNameText: e.target.value })}
            placeholder="Auto from student class (e.g. PLATINUM - 3)"
            className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
          />
        </div>
      </div>

      {/* ── Row 2: Display Filter Mode (Top X vs Upto X) & Limit Count X ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Display Size / Mode */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-dark-slate">
              Display Filter Mode
            </span>
            <span className="text-[10px] text-dark-muted font-mono font-bold">
              {rkCfg.displayFilterMode === 'upto_x' ? 'Upto Rank X' : 'Top X Students'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => updateRk({ displayFilterMode: 'top_x' })}
              className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                (rkCfg.displayFilterMode || 'top_x') === 'top_x'
                  ? 'bg-white text-rose-700 shadow-2xs font-black'
                  : 'text-dark-muted hover:text-dark-primary'
              }`}
            >
              <i className="fas fa-arrow-down-short-wide text-[9px]" />
              <span>Top X</span>
            </button>
            <button
              type="button"
              onClick={() => updateRk({ displayFilterMode: 'upto_x' })}
              className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                rkCfg.displayFilterMode === 'upto_x'
                  ? 'bg-white text-rose-700 shadow-2xs font-black'
                  : 'text-dark-muted hover:text-dark-primary'
              }`}
            >
              <i className="fas fa-medal text-[9px]" />
              <span>Upto Rank X</span>
            </button>
          </div>
          <p className="text-[9.5px] text-dark-muted leading-tight">
            {(rkCfg.displayFilterMode || 'top_x') === 'top_x'
              ? 'Shows the top X scoring students in descending order.'
              : 'Shows all students achieving up to Rank X (includes tied ranks).'}
          </p>
        </div>

        {/* Count Limit X */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-dark-slate">
              Limit Count (X)
            </span>
            <span className="text-xs font-mono font-black text-rose-600">
              {rkCfg.displayLimit ?? 3}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 5, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => updateRk({ displayLimit: num })}
                className={`flex-1 py-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                  (rkCfg.displayLimit ?? 3) === num
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-black'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {num}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={50}
              value={rkCfg.displayLimit ?? 3}
              onChange={(e) => updateRk({ displayLimit: Math.max(1, Number(e.target.value) || 1) })}
              className="w-14 px-2 py-1 text-xs border border-light-border rounded-lg bg-white font-mono font-bold text-center"
              title="Custom count"
            />
          </div>
          <p className="text-[9.5px] text-dark-muted leading-tight">
            Number of rank holders to display (default 3 for Top 3 podium).
          </p>
        </div>
      </div>

      {/* ── Row 3: Items per Row & Repeat for Every Class ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Items per row */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-dark-slate">
              Items Per Row
            </span>
            <span className="text-xs font-mono font-black text-rose-600">
              {rkCfg.itemsPerRow ?? 3} / row
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((cols) => (
              <button
                key={cols}
                type="button"
                onClick={() => updateRk({ itemsPerRow: cols })}
                className={`flex-1 py-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                  (rkCfg.itemsPerRow ?? 3) === cols
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-black'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cols}
              </button>
            ))}
          </div>
          <p className="text-[9.5px] text-dark-muted leading-tight">
            How many rank cards to render side-by-side per row.
          </p>
        </div>

        {/* Repeat for Every Class Toggle */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-dark-slate block leading-tight">
                Repeat for Every Class
              </span>
              <span className="text-[9.5px] text-dark-muted block">
                Show rank holders for all classes in this exam session
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!rkCfg.repeatForEveryClass}
              onClick={() => updateRk({ repeatForEveryClass: !rkCfg.repeatForEveryClass })}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer ${
                rkCfg.repeatForEveryClass ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  rkCfg.repeatForEveryClass ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="pt-2 text-[10px] font-bold flex items-center gap-1 text-dark-muted">
            <i className={`fas ${rkCfg.repeatForEveryClass ? 'fa-check text-emerald-600' : 'fa-times text-slate-400'}`} />
            <span>
              {rkCfg.repeatForEveryClass
                ? 'Repeated across all examination classes'
                : 'Rendered only for student’s class'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 4: Bar Base Height & Podium Stepped Height ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Bar Height */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl">
          <div className="flex justify-between text-[10px] font-bold text-dark-slate mb-1">
            <span>Bar Base Height</span>
            <span className="font-mono text-rose-600 font-black">{rkCfg.barBaseHeight ?? 220}px</span>
          </div>
          <input
            type="range"
            min={160}
            max={320}
            step={10}
            value={rkCfg.barBaseHeight ?? 220}
            onChange={(e) => updateRk({ barBaseHeight: Number(e.target.value) })}
            className="w-full accent-rose-600 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-dark-muted mt-1 font-mono">
            <span>Compact (160px)</span>
            <span>Standard (220px)</span>
            <span>Tall (320px)</span>
          </div>
        </div>

        {/* Podium Heights & Class Badge */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl flex flex-col justify-center gap-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[10px] font-bold text-dark-primary">
              Podium Stepped Heights (Rank 1 Highest)
            </span>
            <input
              type="checkbox"
              checked={rkCfg.podiumHeights !== false}
              onChange={(e) => updateRk({ podiumHeights: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[10px] font-bold text-dark-primary">
              Show Left Class Name Badge
            </span>
            <input
              type="checkbox"
              checked={rkCfg.showClassName !== false}
              onChange={(e) => updateRk({ showClassName: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* ── Row 5: Element Toggles (Photo, Percentage, Rank, Name) ── */}
      <div className="p-2.5 bg-white border border-light-border rounded-xl">
        <span className="text-[10.5px] font-black text-dark-primary uppercase tracking-wider block mb-2">
          Displayed Elements
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-dark-slate">
            <input
              type="checkbox"
              checked={rkCfg.showPhoto !== false}
              onChange={(e) => updateRk({ showPhoto: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
            />
            <span>Student Photo</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-dark-slate">
            <input
              type="checkbox"
              checked={rkCfg.showPercentage !== false}
              onChange={(e) => updateRk({ showPercentage: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
            />
            <span>Percentage Scored</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-dark-slate">
            <input
              type="checkbox"
              checked={rkCfg.showRank !== false}
              onChange={(e) => updateRk({ showRank: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
            />
            <span>Rank Position</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-dark-slate">
            <input
              type="checkbox"
              checked={rkCfg.showStudentName !== false}
              onChange={(e) => updateRk({ showStudentName: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
            />
            <span>Student Name</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default RankHoldersSettings;
