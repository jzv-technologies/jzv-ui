import React from 'react';
import {
  AGGREGATION_LABELS,
  CHART_DATA_LABELS,
  CHART_TYPE_LABELS,
  DEFAULT_CHART_COLUMN,
} from '../constants';
import { ColorPicker } from '../ColorPicker';

/**
 * ChartsSettings
 * Block-specific settings for the graph component (chart types, labels, series).
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const ChartsSettings = ({ currentConfig, setCurrentConfig }) => {
  const chCfg = currentConfig.chartConfig || {};
  const isTight = !!chCfg.tightMargins;
  const currentHeight = chCfg.height || 180;
  const cols = chCfg.columns || [{ ...DEFAULT_CHART_COLUMN }];
  const updateCol = (colIdx, patch) => {
    const next = cols.map((c, i) => (i === colIdx ? { ...c, ...patch } : c));
    setCurrentConfig((p) => ({
      ...p,
      chartConfig: { ...p.chartConfig, columns: next },
    }));
  };
  const addCol = () => {
    if (cols.length >= 3) return;
    setCurrentConfig((p) => ({
      ...p,
      chartConfig: {
        ...p.chartConfig,
        columns: [
          ...cols,
          {
            ...DEFAULT_CHART_COLUMN,
            title: `Column ${cols.length + 1}`,
          },
        ],
      },
    }));
  };
  const removeCol = (colIdx) => {
    if (cols.length <= 1) return;
    setCurrentConfig((p) => ({
      ...p,
      chartConfig: {
        ...p.chartConfig,
        columns: cols.filter((_, i) => i !== colIdx),
      },
    }));
  };
  return (
    <div className="space-y-4">
      {/* ── Chart Dimensions & Spacing Card ── */}
      <div className="p-3 bg-gradient-to-r from-rose-50/80 via-pink-50/50 to-slate-50 border border-rose-200/80 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-xs">
              <i className="fas fa-expand-arrows-alt" />
            </div>
            <div>
              <h5 className="text-[11px] font-black text-dark-primary leading-tight">
                Chart Sizing & Spacing
              </h5>
              <p className="text-[9.5px] text-dark-muted">
                Control chart height and eliminate padding/margins for maximum chart size
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-rose-100">
          {/* Maximize Size / Tight Fit Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-rose-100/90 shadow-2xs">
            <div>
              <span className="text-[10px] font-black text-dark-primary block">
                Maximize Chart Size
              </span>
              <span className="text-[9px] text-dark-muted font-medium block leading-snug">
                Remove margins & padding (full bleed)
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isTight}
              onClick={() =>
                setCurrentConfig((p) => ({
                  ...p,
                  chartConfig: {
                    ...p.chartConfig,
                    tightMargins: !isTight,
                  },
                }))
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isTight ? 'bg-rose-600' : 'bg-slate-300'}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isTight ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Chart Height Presets + Numeric Input */}
          <div className="p-2.5 bg-white rounded-xl border border-rose-100/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-dark-primary">Height</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={80}
                  max={600}
                  step={10}
                  value={currentHeight}
                  onChange={(e) => {
                    const val = Math.max(80, Math.min(600, Number(e.target.value) || 180));
                    setCurrentConfig((p) => ({
                      ...p,
                      chartConfig: {
                        ...p.chartConfig,
                        height: val,
                      },
                    }));
                  }}
                  className="w-14 px-1.5 py-0.5 text-right font-mono text-[10px] font-black border border-slate-200 rounded-md bg-slate-50"
                />
                <span className="text-[9px] font-bold text-dark-muted">px</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[
                { label: 'Compact', h: 130 },
                { label: 'Standard', h: 180 },
                { label: 'Large', h: 240 },
                { label: 'XL', h: 320 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    setCurrentConfig((p) => ({
                      ...p,
                      chartConfig: {
                        ...p.chartConfig,
                        height: preset.h,
                        size:
                          preset.label === 'Compact'
                            ? 'compact'
                            : preset.label === 'Large'
                              ? 'large'
                              : 'standard',
                      },
                    }))
                  }
                  className={`flex-1 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer ${currentHeight === preset.h ? 'bg-rose-600 text-white shadow-2xs' : 'bg-slate-100 text-dark-muted hover:bg-slate-200'}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Column count control */}
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-[11px] font-black text-dark-primary flex items-center gap-1.5">
            <i className="fas fa-columns text-rose-500 text-[10px]" />
            Chart Columns ({cols.length} / 3)
          </h5>
          <p className="text-[10px] text-dark-muted">
            Configure up to 3 chart columns. Each column can show a different chart or data.
          </p>
        </div>
        {cols.length < 3 && (
          <button
            type="button"
            onClick={addCol}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black shadow-xs transition-all flex items-center gap-1 cursor-pointer"
          >
            <i className="fas fa-plus text-[9px]" /> Add Column
          </button>
        )}
      </div>

      {/* Column Delegation / Width % Manager */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-dark-primary flex items-center gap-1.5">
              <i className="fas fa-percent text-rose-500 text-[9px]" />
              Column Width Delegation (%)
            </span>
            <p className="text-[9px] text-dark-muted">
              Delegate column size percentage per column across the chart row.
            </p>
          </div>
          {cols.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const evenPct = Math.floor(100 / cols.length);
                const remainder = 100 - evenPct * cols.length;
                const next = cols.map((c, i) => ({
                  ...c,
                  widthPercent: i === 0 ? evenPct + remainder : evenPct,
                }));
                setCurrentConfig((p) => ({
                  ...p,
                  chartConfig: {
                    ...p.chartConfig,
                    columns: next,
                  },
                }));
              }}
              className="text-[9px] font-black text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg cursor-pointer transition-all"
            >
              Distribute Evenly
            </button>
          )}
        </div>
        <div
          className={`grid gap-2 ${cols.length === 1 ? 'grid-cols-1' : cols.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
        >
          {cols.map((col, cIdx) => (
            <div
              key={cIdx}
              className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <span className="text-[9.5px] font-bold text-dark-slate">Col {cIdx + 1} Width:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={10}
                  max={90}
                  value={col.widthPercent ?? Math.round(100 / cols.length)}
                  onChange={(e) => {
                    const val = Math.max(10, Math.min(90, Number(e.target.value) || 30));
                    updateCol(cIdx, { widthPercent: val });
                  }}
                  className="w-12 px-1.5 py-0.5 text-right font-mono text-[10px] font-black border border-slate-300 rounded bg-white"
                />
                <span className="text-[9px] font-bold text-dark-muted">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-column config */}
      {cols.map((col, colIdx) => (
        <div
          key={colIdx}
          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 relative"
        >
          {/* Column header */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
              Column {colIdx + 1}
            </span>
            {cols.length > 1 && (
              <button
                type="button"
                onClick={() => removeCol(colIdx)}
                className="p-1.5 text-rose-400 hover:text-rose-700 cursor-pointer"
                title="Remove this column"
              >
                <i className="fas fa-trash text-[10px]" />
              </button>
            )}
          </div>

          {/* Independent Height for Column */}
          <div className="flex items-center justify-between p-2.5 bg-white border border-light-border rounded-xl">
            <div>
              <span className="text-[10px] font-black text-dark-primary block">
                Independent Height
              </span>
              <span className="text-[8.5px] text-dark-muted block">
                Custom height for this chart column
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={80}
                max={600}
                placeholder={String(currentHeight)}
                value={col.height ?? ''}
                onChange={(e) => {
                  const val =
                    e.target.value === ''
                      ? null
                      : Math.max(80, Math.min(600, Number(e.target.value)));
                  updateCol(colIdx, { height: val });
                }}
                className="w-16 px-1.5 py-1 text-right font-mono text-[10px] font-black border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
              />
              <span className="text-[9px] font-bold text-dark-muted">px</span>
              {col.height && (
                <button
                  type="button"
                  onClick={() => updateCol(colIdx, { height: null })}
                  className="text-[9px] text-rose-500 hover:text-rose-700 underline font-bold cursor-pointer"
                  title="Reset to global height"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold text-dark-muted mb-1">
              Column Title (optional)
            </label>
            <input
              type="text"
              value={col.title || ''}
              onChange={(e) => updateCol(colIdx, { title: e.target.value })}
              placeholder={`e.g. Subject Performance`}
              className="w-full px-2.5 py-1.5 text-[10px] border border-light-border rounded-xl bg-white font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Chart Type */}
            <div>
              <label className="block text-[10px] font-bold text-dark-muted mb-1">Chart Type</label>
              <select
                value={col.chartType}
                onChange={(e) => updateCol(colIdx, { chartType: e.target.value })}
                className="w-full px-2 py-1.5 text-[10px] border border-light-border rounded-xl bg-white font-bold"
              >
                {Object.entries(CHART_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {/* Chart Data */}
            <div>
              <label className="block text-[10px] font-bold text-dark-muted mb-1">Chart Data</label>
              <select
                value={
                  col.chartData === 'classification'
                    ? 'grade_classification'
                    : col.chartData || 'subject_marks'
                }
                onChange={(e) => updateCol(colIdx, { chartData: e.target.value })}
                className="w-full px-2 py-1.5 text-[10px] border border-light-border rounded-xl bg-white font-bold"
              >
                {Object.entries(CHART_DATA_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {/* Aggregation */}
            <div>
              <label className="block text-[10px] font-bold text-dark-muted mb-1">
                Aggregation {col.chartData === 'subject_classification' ? '(Category)' : ''}
              </label>
              <select
                value={col.aggregation || 'none'}
                onChange={(e) =>
                  updateCol(colIdx, {
                    aggregation: e.target.value,
                  })
                }
                className="w-full px-2 py-1.5 text-[10px] border border-light-border rounded-xl bg-white font-bold"
              >
                {Object.entries(AGGREGATION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {col.chartData === 'subject_classification' && v === 'none'
                      ? 'Average % (Default)'
                      : l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Color Palette ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black text-dark-slate flex items-center gap-1">
                <i className="fas fa-palette text-rose-500 text-[9px]" />
                Custom Colors
              </label>
              {(col.colors || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => updateCol(colIdx, { colors: [] })}
                  className="text-[9px] font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5 items-start">
              {(col.colors || []).map((c, ci) => (
                <div key={ci} className="relative group w-24 min-w-0">
                  <ColorPicker
                    value={c || '#e11d48'}
                    placeholder="#e11d48"
                    allowClear={false}
                    onChange={(newVal) => {
                      const nc = [...(col.colors || [])];
                      nc[ci] = newVal;
                      updateCol(colIdx, { colors: nc });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateCol(colIdx, {
                        colors: (col.colors || []).filter((_, i) => i !== ci),
                      })
                    }
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-[10px] opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer shadow-xs z-10 font-bold"
                    title="Remove color"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateCol(colIdx, {
                    colors: [...(col.colors || []), '#e11d48'],
                  })
                }
                className="w-14 h-13 rounded-xl border-2 border-dashed border-rose-300 hover:border-rose-500 hover:bg-rose-50 flex flex-col items-center justify-center text-rose-500 cursor-pointer text-xs font-black transition-all gap-0.5 mt-0.5"
                title="Add color"
              >
                <span className="text-base leading-none">+</span>
                <span className="text-[8.5px] font-bold">Add</span>
              </button>
            </div>
            <p className="text-[9px] text-dark-muted mt-1.5 leading-snug">
              Colors assigned in order. Extra data points beyond this list get auto-generated random
              colors.
            </p>
          </div>

          {/* ── Data Labels + Legend + Max Scale ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Data Labels */}
            <div className="bg-white border border-light-border rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-dark-slate flex items-center gap-1">
                  <i className="fas fa-tag text-rose-500 text-[9px]" />
                  Data Labels
                </label>
              </div>

              <div className="min-w-0">
                <ColorPicker
                  label="Label Text Color"
                  value={col.dataLabelColor || '#1e293b'}
                  placeholder="#1e293b"
                  allowClear={false}
                  onChange={(val) =>
                    updateCol(colIdx, {
                      dataLabelColor: val,
                    })
                  }
                  presets={['#1e293b', '#ffffff', '#e11d48', '#059669', '#2563eb', '#7c3aed']}
                />
              </div>

              {/* Checkboxes: Show Values & Show Labels */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!col.showValues}
                    onChange={(e) =>
                      updateCol(colIdx, {
                        showValues: e.target.checked,
                      })
                    }
                    className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-dark-primary">Show Values</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!col.showLabels}
                    onChange={(e) =>
                      updateCol(colIdx, {
                        showLabels: e.target.checked,
                      })
                    }
                    className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-dark-primary">Show Labels</span>
                </label>
              </div>

              {/* Position dropdown (when either showValues or showLabels is active) */}
              {(!!col.showValues || !!col.showLabels) && (
                <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                  <div>
                    <label className="block text-[10px] font-bold text-dark-muted mb-0.5">
                      Position
                    </label>
                    <select
                      value={col.dataLabelPosition || 'top'}
                      onChange={(e) =>
                        updateCol(colIdx, {
                          dataLabelPosition: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1 text-[10px] border border-light-border rounded-xl bg-white font-bold"
                    >
                      <option value="top">Top / Outside (Bar End)</option>
                      <option value="center">Center (Middle)</option>
                      <option value="inside">Inside End / Tip</option>
                      <option value="insideTop">Inside Top</option>
                      <option value="insideBottom">Inside Bottom (Base)</option>
                    </select>
                  </div>

                  {/* Value & Label Separator (when both showValues and showLabels are active) */}
                  {!!col.showValues && !!col.showLabels && (
                    <div>
                      <label className="block text-[10px] font-bold text-dark-muted mb-0.5">
                        Value &amp; Label Separator
                      </label>
                      <select
                        value={col.dataLabelSeparator || 'colon'}
                        onChange={(e) =>
                          updateCol(colIdx, {
                            dataLabelSeparator: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1 text-[10px] border border-light-border rounded-xl bg-white font-bold"
                      >
                        <option value="colon">Colon (Label: Value)</option>
                        <option value="newline">Line Break (Label &para; Value)</option>
                        <option value="comma">Comma (Label, Value)</option>
                        <option value="semicolon">Semicolon (Label; Value)</option>
                        <option value="space">Space (Label Value)</option>
                        <option value="bracket">Within Brackets (Label (Value))</option>
                        <option value="hyphen">Hyphen (Label - Value)</option>
                        <option value="slash">Slash (Label / Value)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chart Legend */}
            <div className="bg-white border border-light-border rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-dark-slate flex items-center gap-1">
                  <i className="fas fa-list-ul text-rose-500 text-[9px]" />
                  Chart Legend
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={
                    col.showLegend !== undefined
                      ? !!col.showLegend
                      : col.chartType === 'donut' || col.chartType === 'pie'
                  }
                  onClick={() => {
                    const cur =
                      col.showLegend !== undefined
                        ? !!col.showLegend
                        : col.chartType === 'donut' || col.chartType === 'pie';
                    updateCol(colIdx, { showLegend: !cur });
                  }}
                  className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${(col.showLegend !== undefined ? !!col.showLegend : col.chartType === 'donut' || col.chartType === 'pie') ? 'bg-rose-600' : 'bg-slate-300'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${(col.showLegend !== undefined ? !!col.showLegend : col.chartType === 'donut' || col.chartType === 'pie') ? 'translate-x-3.5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      col.showLegend !== undefined
                        ? !!col.showLegend
                        : col.chartType === 'donut' || col.chartType === 'pie'
                    }
                    onChange={(e) =>
                      updateCol(colIdx, {
                        showLegend: e.target.checked,
                      })
                    }
                    className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-dark-primary">Show Legend</span>
                </label>
              </div>

              {/* Position selector: left, right, top, bottom */}
              {(col.showLegend !== undefined
                ? !!col.showLegend
                : col.chartType === 'donut' || col.chartType === 'pie') && (
                <div className="pt-1.5 border-t border-slate-100">
                  <label className="block text-[10px] font-bold text-dark-muted mb-1">
                    Legend Position
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      {
                        id: 'top',
                        label: 'Top',
                        icon: 'fa-arrow-up',
                      },
                      {
                        id: 'bottom',
                        label: 'Bottom',
                        icon: 'fa-arrow-down',
                      },
                      {
                        id: 'left',
                        label: 'Left',
                        icon: 'fa-arrow-left',
                      },
                      {
                        id: 'right',
                        label: 'Right',
                        icon: 'fa-arrow-right',
                      },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() =>
                          updateCol(colIdx, {
                            legendPosition: pos.id,
                          })
                        }
                        className={`py-1 px-1 rounded-lg text-[9px] flex flex-col items-center gap-0.5 border transition-all cursor-pointer ${(col.legendPosition || 'bottom') === pos.id ? 'bg-rose-50 border-rose-300 text-rose-700 font-black shadow-2xs' : 'bg-slate-50 border-slate-200 text-dark-muted hover:bg-slate-100'}`}
                      >
                        <i className={`fas ${pos.icon} text-[7.5px]`} />
                        <span>{pos.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Legend Text Color Option */}
                  <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
                    <label className="block text-[9.5px] font-bold text-dark-slate">
                      Legend Text Color (
                      <code className="text-[8px] bg-slate-100 px-1 py-0.2 rounded">
                        .recharts-legend-item-text
                      </code>
                      )
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateCol(colIdx, {
                            legendTextColorMode: 'data_labels_color',
                          })
                        }
                        className={`p-1.5 rounded-lg text-[9px] border font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          (col.legendTextColorMode || 'data_labels_color') === 'data_labels_color'
                            ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-dark-muted hover:bg-slate-100'
                        }`}
                      >
                        <i className="fas fa-font text-[8px]" />
                        <span>Data Labels Color</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateCol(colIdx, {
                            legendTextColorMode: 'chart_color',
                          })
                        }
                        className={`p-1.5 rounded-lg text-[9px] border font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          col.legendTextColorMode === 'chart_color'
                            ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-dark-muted hover:bg-slate-100'
                        }`}
                      >
                        <i className="fas fa-palette text-[8px]" />
                        <span>Chart Color</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Max Scale */}
            <div className="bg-white border border-light-border rounded-xl p-3 space-y-2">
              <label className="text-[10px] font-black text-dark-slate flex items-center gap-1">
                <i className="fas fa-ruler-vertical text-rose-500 text-[9px]" />
                Max Scale (Y Axis)
              </label>
              <div className="space-y-1">
                {[
                  { v: 'auto', label: 'Auto (Max Data)' },
                  { v: 'pct100', label: 'Fixed 100' },
                  { v: 'custom', label: 'Custom Number' },
                ].map((opt) => (
                  <label key={opt.v} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`maxScale-col-${colIdx}`}
                      value={opt.v}
                      checked={(col.maxScale || 'auto') === opt.v}
                      onChange={() => updateCol(colIdx, { maxScale: opt.v })}
                      className="text-rose-600 focus:ring-rose-400 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-dark-primary">{opt.label}</span>
                  </label>
                ))}
              </div>
              {(col.maxScale || 'auto') === 'custom' && (
                <input
                  type="number"
                  min={1}
                  value={col.maxScaleValue || 100}
                  onChange={(e) =>
                    updateCol(colIdx, {
                      maxScaleValue: Number(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-[10px] border border-light-border rounded-xl bg-white font-bold"
                  placeholder="e.g. 100"
                />
              )}
            </div>

            {/* ── Type-Specific Geometry: Explosion, Width, Gap ── */}
            <div className="bg-white border border-light-border rounded-xl p-3 space-y-2.5 sm:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-1.5">
                <i className="fas fa-sliders text-rose-500 text-[10px]" />
                <span className="text-[10px] font-black text-dark-slate">
                  {col.chartType === 'donut' || col.chartType === 'pie'
                    ? 'Pie / Donut Explosion & Sizing'
                    : col.chartType === 'line' || col.chartType === 'area'
                      ? 'Line & Area Stroke Geometry'
                      : 'Bar Width, Gap & Spacing'}
                </span>
              </div>

              {/* Pie / Donut Controls */}
              {(col.chartType === 'donut' || col.chartType === 'pie') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Explosion / Slice Gap */}
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-dark-slate mb-1">
                      <span>Slice Explosion / Gap</span>
                      <span className="font-mono">{col.sliceGap ?? 2}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      step={1}
                      value={col.sliceGap ?? 2}
                      onChange={(e) =>
                        updateCol(colIdx, {
                          sliceGap: Number(e.target.value),
                        })
                      }
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>

                  {/* Chart Outer Size Scale */}
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-dark-slate mb-1">
                      <span>Outer Radius Scale</span>
                      <span className="font-mono">{col.pieSizePercent ?? 80}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={95}
                      step={5}
                      value={col.pieSizePercent ?? 80}
                      onChange={(e) =>
                        updateCol(colIdx, {
                          pieSizePercent: Number(e.target.value),
                        })
                      }
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>

                  {/* Donut Hole Size (Only for donut) */}
                  {col.chartType === 'donut' && (
                    <div className="sm:col-span-2">
                      <div className="flex justify-between text-[9px] font-bold text-dark-slate mb-1">
                        <span>Donut Hole Width</span>
                        <span className="font-mono">{col.donutHolePercent ?? 44}%</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={70}
                        step={2}
                        value={col.donutHolePercent ?? 44}
                        onChange={(e) =>
                          updateCol(colIdx, {
                            donutHolePercent: Number(e.target.value),
                          })
                        }
                        className="w-full accent-rose-600 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Bar / Horizontal Bar / Stacked Bar Controls */}
              {['bar', 'horizontal_bar', 'stacked_bar', 'stacked_bar_h'].includes(
                col.chartType
              ) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Bar Size / Thickness */}
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-dark-slate mb-1">
                      <span>Bar Width</span>
                      <span className="font-mono">{col.barSize ? `${col.barSize}px` : 'Auto'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={4}
                        max={50}
                        placeholder="Auto"
                        value={col.barSize ?? ''}
                        onChange={(e) =>
                          updateCol(colIdx, {
                            barSize: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 text-[10px] font-mono font-bold border border-slate-300 rounded-lg bg-white"
                      />
                      {col.barSize && (
                        <button
                          type="button"
                          onClick={() => updateCol(colIdx, { barSize: null })}
                          className="text-[8.5px] text-rose-500 font-bold hover:underline cursor-pointer"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bar Gap */}
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-dark-slate mb-1">
                      <span>Bar Gap</span>
                      <span className="font-mono">{col.barGap ?? 4}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={16}
                      step={1}
                      value={col.barGap ?? 4}
                      onChange={(e) =>
                        updateCol(colIdx, {
                          barGap: Number(e.target.value),
                        })
                      }
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>

                  {/* Bar Category Gap */}
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-dark-slate mb-1">
                      <span>Category Gap</span>
                      <span className="font-mono">{col.barCategoryGap || '15%'}</span>
                    </div>
                    <select
                      value={col.barCategoryGap || '15%'}
                      onChange={(e) =>
                        updateCol(colIdx, {
                          barCategoryGap: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1 text-[10px] font-bold border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="5%">5% (Compact)</option>
                      <option value="10%">10% (Tight)</option>
                      <option value="15%">15% (Normal)</option>
                      <option value="20%">20% (Wide)</option>
                      <option value="30%">30% (Spacious)</option>
                      <option value="40%">40% (Extra Spaced)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Line / Area Controls */}
              {['line', 'area'].includes(col.chartType) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Stroke Width */}
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-dark-slate mb-1">
                      <span>Line Width</span>
                      <span className="font-mono">{col.lineWidth ?? 2}px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      step={1}
                      value={col.lineWidth ?? 2}
                      onChange={(e) =>
                        updateCol(colIdx, {
                          lineWidth: Number(e.target.value),
                        })
                      }
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>

                  {/* Dot Size */}
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-dark-slate mb-1">
                      <span>Point Dot Size</span>
                      <span className="font-mono">
                        {(col.dotSize ?? 3) === 0 ? 'None' : `${col.dotSize ?? 3}px`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={1}
                      value={col.dotSize ?? 3}
                      onChange={(e) =>
                        updateCol(colIdx, {
                          dotSize: Number(e.target.value),
                        })
                      }
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChartsSettings;
