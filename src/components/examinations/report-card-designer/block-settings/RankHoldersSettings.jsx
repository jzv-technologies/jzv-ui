import React from 'react';
import { ColorPicker } from '../ColorPicker';
import { getDynamicClassesPerPage } from '../utils';
import { RANK_BADGE_POSITIONS } from '../constants';

/**
 * RankHoldersSettings
 * Block-specific settings for the Rank Holders component in Report Card Designer.
 * Configures:
 * - Display Filter Mode: Top X or Upto Rank X
 * - Limit Count (X) via text box
 * - Items Per Row via text box
 * - Repeat for Every Class Yes/No
 * - Stacked Classes Per Page via text box
 * - Class Name badge toggle and 8-position selector
 * - Podium stepped height toggle & bar base height slider
 * - Element toggles and Photo Size control via text box
 * - Student name font size (via text box) and color selection
 */
const RankHoldersSettings = ({ currentConfig, setCurrentConfig }) => {
  const rkCfg = currentConfig.rankHoldersConfig || {};
  const dynamicClassesPerPage = getDynamicClassesPerPage(rkCfg);

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
            className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-slate focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
            className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-slate focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
      </div>

      {/* ── Row 2: Display Filter Mode & Limit Count (X) Text Box ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Display Filter Mode */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-dark-slate">Display Filter Mode</span>
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

        {/* Limit Count (X) Text Box */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-dark-slate">Limit Count (X)</span>
            <span className="text-xs font-mono font-black text-rose-600">
              {rkCfg.displayLimit ?? 3}
            </span>
          </div>
          <input
            type="number"
            min={1}
            max={50}
            value={rkCfg.displayLimit ?? 3}
            onChange={(e) => {
              const val = e.target.value;
              updateRk({ displayLimit: val === '' ? '' : Math.max(1, Number(val)) });
            }}
            onBlur={(e) => {
              if (!e.target.value || Number(e.target.value) < 1) updateRk({ displayLimit: 3 });
            }}
            placeholder="e.g. 3"
            className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-mono font-bold text-dark-slate focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          <p className="text-[9.5px] text-dark-muted leading-tight">
            Number of rank holders to display (default 3 for Top 3 podium).
          </p>
        </div>
      </div>

      {/* ── Row 3: Items Per Row Text Box & Repeat for Every Class ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Items Per Row Text Box */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-dark-slate">Items Per Row</span>
            <span className="text-xs font-mono font-black text-rose-600">
              {rkCfg.itemsPerRow ?? 3} / row
            </span>
          </div>
          <input
            type="number"
            min={1}
            max={12}
            value={rkCfg.itemsPerRow ?? 3}
            onChange={(e) => {
              const val = e.target.value;
              updateRk({ itemsPerRow: val === '' ? '' : Math.max(1, Number(val)) });
            }}
            onBlur={(e) => {
              if (!e.target.value || Number(e.target.value) < 1) updateRk({ itemsPerRow: 3 });
            }}
            placeholder="e.g. 3"
            className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-mono font-bold text-dark-slate focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          <p className="text-[9.5px] text-dark-muted leading-tight">
            Count of rank holder cards to display in each row for the class (default 3).
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
                Repeat this component for each class one after another
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
            <i
              className={`fas ${
                rkCfg.repeatForEveryClass ? 'fa-check text-emerald-600' : 'fa-times text-slate-400'
              }`}
            />
            <span>
              {rkCfg.repeatForEveryClass
                ? 'Enabled: Repeats and stacks classes dynamically'
                : 'Disabled: Renders only for the student/target class'}
            </span>
          </div>
        </div>

        {/* Dynamic Stacked Classes Per Page Text Box When Repeat is Enabled */}
        {rkCfg.repeatForEveryClass && (
          <div className="col-span-1 sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[11px] font-bold text-dark-slate block">
                  Stacked Classes Per Page
                </span>
              </div>
            </div>
            <input
              type="text"
              value={rkCfg.classesPerPage ?? 'auto'}
              onChange={(e) => updateRk({ classesPerPage: e.target.value })}
              placeholder="auto or 1, 2, 3..."
              className="w-24 min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-mono font-bold text-dark-slate focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <p className="text-[9.5px] text-dark-muted leading-tight">
              Enter &quot;auto&quot; for dynamic stacking or a fixed number of classes per page
              (e.g. 1, 2, 3).
            </p>
          </div>
        )}
      </div>

      {/* ── Row 4: Bar Base Height Slider & Class Name Badge Controls ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Bar Height */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl">
          <div className="flex justify-between text-[10px] font-bold text-dark-slate mb-1">
            <span>Bar Base Height</span>
            <span className="font-mono text-rose-600 font-black">
              {rkCfg.barBaseHeight ?? 220}px
            </span>
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

        {/* Podium Heights & Class Name Badge Position */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl flex flex-col justify-between gap-2.5">
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

          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-dark-primary">
                <input
                  type="checkbox"
                  checked={rkCfg.showClassName !== false}
                  onChange={(e) => updateRk({ showClassName: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                />
                <span>Show Class Name Badge</span>
              </label>
            </div>

            {rkCfg.showClassName !== false && (
              <div className="pt-1">
                <label className="block text-[10px] font-bold text-dark-slate mb-1">
                  Badge Position
                </label>
                <select
                  value={rkCfg.classNameBadgePosition || 'left'}
                  onChange={(e) => updateRk({ classNameBadgePosition: e.target.value })}
                  className="w-full min-w-0 px-2 py-1 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-slate cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  {(
                    RANK_BADGE_POSITIONS || [
                      { value: 'left', label: 'Left Side (Vertical)' },
                      { value: 'right', label: 'Right Side (Vertical)' },
                      { value: 'top-left', label: 'Top Left' },
                      { value: 'top-center', label: 'Top Center' },
                      { value: 'top-right', label: 'Top Right' },
                      { value: 'bottom-left', label: 'Bottom Left' },
                      { value: 'bottom-center', label: 'Bottom Center' },
                      { value: 'bottom-right', label: 'Bottom Right' },
                    ]
                  ).map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-dark-muted mt-0.5">
                  Choose vertical sidebar (Left/Right) or horizontal badge (Top/Bottom).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 5: Element Toggles & Photo Size Text Box ── */}
      <div className="p-2.5 bg-white border border-light-border rounded-xl space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10.5px] font-black text-dark-primary uppercase tracking-wider block">
            Displayed Elements
          </span>

          {/* Photo Size Text Box */}
          {rkCfg.showPhoto !== false && (
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-dark-slate whitespace-nowrap">
                Photo Size (px):
              </label>
              <input
                type="number"
                min={32}
                max={160}
                value={rkCfg.photoSize ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  updateRk({ photoSize: val === '' ? '' : Number(val) });
                }}
                placeholder="Auto (e.g. 72)"
                className="w-24 px-2 py-1 text-xs border border-light-border rounded-lg bg-white font-mono font-bold text-dark-slate text-center focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                title="Diameter in pixels (leave empty for automatic layout sizing)"
              />
            </div>
          )}
        </div>

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

      {/* ── Row 6: Student Name Typography & Color Selection ── */}
      <div className="p-3 bg-white border border-light-border rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-dark-primary uppercase tracking-wider flex items-center gap-1.5">
            <i className="fas fa-font text-rose-500 text-[10px]" />
            <span>Student Name Typography &amp; Appearance</span>
          </span>
          <span className="text-[10px] text-dark-muted font-bold font-mono">
            Longer names wrap into 2 lines
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          {/* Name Font Size Text Box */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-[10.5px] font-bold text-dark-slate">Name Font Size (px)</label>
              <span className="text-xs font-mono font-black text-rose-600">
                {rkCfg.nameFontSize ?? 13}px
              </span>
            </div>
            <input
              type="number"
              min={8}
              max={28}
              value={rkCfg.nameFontSize ?? 13}
              onChange={(e) => {
                const val = e.target.value;
                updateRk({ nameFontSize: val === '' ? '' : Math.max(8, Number(val)) });
              }}
              onBlur={(e) => {
                if (!e.target.value || Number(e.target.value) < 8) updateRk({ nameFontSize: 13 });
              }}
              placeholder="e.g. 13"
              className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-mono font-bold text-dark-slate focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <p className="text-[9.5px] text-dark-muted leading-tight">
              Font size in px for student names under the cards (default 13px).
            </p>
          </div>

          {/* Name Font Color */}
          <div className="space-y-1.5 min-w-0">
            <label className="block text-[10.5px] font-bold text-dark-slate">Name Font Color</label>
            <ColorPicker
              label=""
              value={rkCfg.nameColor || ''}
              placeholder="#0f172a"
              allowClear={true}
              onChange={(c) => updateRk({ nameColor: c })}
            />
            <p className="text-[9.5px] text-dark-muted leading-tight">
              Custom color for student names under the rank cards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankHoldersSettings;
