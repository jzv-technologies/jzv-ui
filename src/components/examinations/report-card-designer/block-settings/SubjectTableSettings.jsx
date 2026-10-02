import React from 'react';
import { ColorPicker } from '../ColorPicker';
import {
  DEFAULT_TABLE_COLUMN_HEADERS,
  DEFAULT_TABLE_COLUMN_ORDER,
  TABLE_COLUMN_LABELS,
} from '../constants';
import MultiSelectDropdown from '../../../MultiSelectDropdown';
import { getActiveTableColumns } from '../utils';

/**
 * SubjectTableSettings
 * Block-specific settings for the marks table (columns, labels, grouping, colours).
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const SubjectTableSettings = ({ currentConfig, setCurrentConfig }) => {
  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <MultiSelectDropdown
          label="Details to Display"
          placeholder="Select columns & options..."
          options={[
            { id: 'showArabicName', label: 'Arabic Subject Name' },
            { id: 'showMaxMarks', label: 'Max Marks' },
            { id: 'showPassMarks', label: 'Pass Marks' },
            { id: 'showMarksObtained', label: 'Marks Scored' },
            { id: 'showPercentage', label: 'Subject %' },
            { id: 'showGrade', label: 'Letter Grade' },
            { id: 'showStatus', label: 'Pass / Fail' },
            { id: 'bandedRows', label: 'Banded Row Colors' },
          ]}
          selected={Object.keys(currentConfig.subjectTableConfig || {}).filter(
            (k) => currentConfig.subjectTableConfig[k]
          )}
          onChange={(selectedIds) => {
            const arr = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
            const allKeys = [
              'showArabicName',
              'showMaxMarks',
              'showPassMarks',
              'showMarksObtained',
              'showPercentage',
              'showGrade',
              'showStatus',
              'bandedRows',
            ];
            const updated = { ...currentConfig.subjectTableConfig };
            allKeys.forEach((k) => {
              updated[k] = arr.includes(k);
            });
            setCurrentConfig((prev) => ({
              ...prev,
              subjectTableConfig: updated,
            }));
          }}
          icon="fa-table-cells"
          fullWidth={true}
        />
      </div>

      {/* Column Sequence & Order Control */}
      <div className="pt-3 border-t border-light-border/70 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-xs font-black text-dark-primary flex items-center gap-1.5">
              <i className="fas fa-arrows-alt-v text-rose-500 text-[11px]" />
              <span>Column Sequence &amp; Order</span>
            </h5>
            <p className="text-[11px] text-dark-muted font-medium">
              Reorder columns from left to right using up/down arrows.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCurrentConfig((prev) => ({
                ...prev,
                subjectTableConfig: {
                  ...prev.subjectTableConfig,
                  columnOrder: DEFAULT_TABLE_COLUMN_ORDER,
                },
              }));
            }}
            className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline px-2 py-1 rounded cursor-pointer transition-colors"
            title="Reset to default column order"
          >
            <i className="fas fa-undo-alt mr-1 text-[9px]" />
            Reset Order
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {getActiveTableColumns(currentConfig.subjectTableConfig).map((colId, cIdx, arr) => (
            <div
              key={colId}
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-light-border bg-white shadow-2xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-black text-slate-700 flex items-center justify-center shrink-0">
                  {cIdx + 1}
                </span>
                <span className="text-xs font-bold text-dark-primary truncate">
                  {TABLE_COLUMN_LABELS[colId] || colId}
                </span>
                {colId === 'arabicName' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0 font-arabic">
                    عربي
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  disabled={cIdx === 0}
                  onClick={() => {
                    const activeCols = getActiveTableColumns(currentConfig.subjectTableConfig);
                    const currentOrder = [
                      ...activeCols,
                      ...(currentConfig.subjectTableConfig?.columnOrder || []).filter(
                        (id) => !activeCols.includes(id)
                      ),
                    ];
                    const fromIdx = currentOrder.indexOf(colId);
                    const toIdx = fromIdx - 1;
                    if (toIdx < 0) return;
                    const nextOrder = [...currentOrder];
                    const temp = nextOrder[fromIdx];
                    nextOrder[fromIdx] = nextOrder[toIdx];
                    nextOrder[toIdx] = temp;
                    setCurrentConfig((prev) => ({
                      ...prev,
                      subjectTableConfig: {
                        ...prev.subjectTableConfig,
                        columnOrder: nextOrder,
                      },
                    }));
                  }}
                  className="w-6 h-6 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-600 transition-all cursor-pointer"
                  title="Move Column Left / Up"
                >
                  <i className="fas fa-arrow-up text-[10px]" />
                </button>
                <button
                  type="button"
                  disabled={cIdx === arr.length - 1}
                  onClick={() => {
                    const activeCols = getActiveTableColumns(currentConfig.subjectTableConfig);
                    const currentOrder = [
                      ...activeCols,
                      ...(currentConfig.subjectTableConfig?.columnOrder || []).filter(
                        (id) => !activeCols.includes(id)
                      ),
                    ];
                    const fromIdx = currentOrder.indexOf(colId);
                    const toIdx = fromIdx + 1;
                    if (toIdx >= currentOrder.length) return;
                    const nextOrder = [...currentOrder];
                    const temp = nextOrder[fromIdx];
                    nextOrder[fromIdx] = nextOrder[toIdx];
                    nextOrder[toIdx] = temp;
                    setCurrentConfig((prev) => ({
                      ...prev,
                      subjectTableConfig: {
                        ...prev.subjectTableConfig,
                        columnOrder: nextOrder,
                      },
                    }));
                  }}
                  className="w-6 h-6 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-600 transition-all cursor-pointer"
                  title="Move Column Right / Down"
                >
                  <i className="fas fa-arrow-down text-[10px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Header Colors (Background & Text) */}
      <div className="pt-3 border-t border-light-border/70 space-y-3">
        <div>
          <h5 className="text-xs font-black text-dark-primary flex items-center gap-1.5">
            <i className="fas fa-heading text-rose-500 text-[11px]" />
            <span>Table Header Colors</span>
          </h5>
          <p className="text-[11px] text-dark-muted font-medium">
            Customize the table header row background and text colors. Defaults to theme accent
            color.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white border border-light-border rounded-xl">
          <div className="min-w-0">
            <ColorPicker
              label="Header Background Color"
              value={currentConfig.subjectTableConfig?.headerBgColor || ''}
              placeholder={currentConfig.accentColor || '#1e293b'}
              allowClear={true}
              onChange={(val) =>
                setCurrentConfig((p) => ({
                  ...p,
                  subjectTableConfig: {
                    ...p.subjectTableConfig,
                    headerBgColor: val,
                  },
                }))
              }
            />
          </div>
          <div className="min-w-0">
            <ColorPicker
              label="Header Text Color"
              value={currentConfig.subjectTableConfig?.headerTextColor || ''}
              placeholder="#ffffff"
              allowClear={true}
              onChange={(val) =>
                setCurrentConfig((p) => ({
                  ...p,
                  subjectTableConfig: {
                    ...p.subjectTableConfig,
                    headerTextColor: val,
                  },
                }))
              }
              presets={[
                '#ffffff',
                '#f8fafc',
                '#f1f5f9',
                '#0f172a',
                '#1e293b',
                '#fbbf24',
                '#38bdf8',
              ]}
            />
          </div>
        </div>
      </div>

      {/* Custom Column Header Titles */}
      <div className="pt-3 border-t border-light-border/70 space-y-3">
        <div>
          <h5 className="text-xs font-black text-dark-primary flex items-center gap-1.5">
            <i className="fas fa-font text-rose-500 text-[11px]" />
            <span>Custom Column Header Titles</span>
          </h5>
          <p className="text-[11px] text-dark-muted font-medium">
            Override default header display names for each active column in the Marks Table.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {getActiveTableColumns(currentConfig.subjectTableConfig).map((colId) => {
            const defaultLabel =
              DEFAULT_TABLE_COLUMN_HEADERS[colId] || TABLE_COLUMN_LABELS[colId] || colId;
            const currentLabel = currentConfig.subjectTableConfig?.columnLabels?.[colId] ?? '';
            return (
              <div
                key={colId}
                className="p-2.5 bg-white border border-light-border rounded-xl space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-dark-slate">
                    {TABLE_COLUMN_LABELS[colId] || colId}
                  </span>
                  {currentLabel && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentConfig((p) => {
                          const nextLabels = {
                            ...(p.subjectTableConfig?.columnLabels || {}),
                          };
                          delete nextLabels[colId];
                          return {
                            ...p,
                            subjectTableConfig: {
                              ...p.subjectTableConfig,
                              columnLabels: nextLabels,
                            },
                          };
                        });
                      }}
                      className="text-[9px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                      title="Reset to default label"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={currentLabel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentConfig((p) => ({
                      ...p,
                      subjectTableConfig: {
                        ...p.subjectTableConfig,
                        columnLabels: {
                          ...(p.subjectTableConfig?.columnLabels || {}),
                          [colId]: val,
                        },
                      },
                    }));
                  }}
                  placeholder={defaultLabel}
                  className="w-full px-2.5 py-1 text-xs border border-light-border rounded-lg bg-slate-50/50 font-bold text-dark-primary focus:bg-white focus:ring-2 focus:ring-rose-300 outline-none transition-all"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* In-Cell Graph: Marks Obtained Background Bar Fill */}
      <div className="pt-3 border-t border-light-border/70 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-xs font-black text-dark-primary flex items-center gap-1.5">
              <i className="fas fa-chart-simple text-emerald-600 text-[11px]" />
              <span>Marks Obtained Cell Bar Fill (In-Cell Graph)</span>
            </h5>
            <p className="text-[11px] text-dark-muted font-medium">
              Fills cell background proportional to the percentage scored, acting as a visual
              horizontal bar graph without an extra component.
            </p>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-dark-slate">
            <input
              type="checkbox"
              checked={!!currentConfig.subjectTableConfig?.showMarksBarFill}
              onChange={(e) =>
                setCurrentConfig((p) => ({
                  ...p,
                  subjectTableConfig: {
                    ...p.subjectTableConfig,
                    showMarksBarFill: e.target.checked,
                  },
                }))
              }
              className="rounded text-emerald-600 focus:ring-emerald-400 cursor-pointer"
            />
            <span>Enable</span>
          </label>
        </div>

        {Boolean(currentConfig.subjectTableConfig?.showMarksBarFill) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white border border-light-border rounded-xl">
            {/* Fill Color */}
            <div className="min-w-0">
              <ColorPicker
                label="Fill Color"
                value={currentConfig.subjectTableConfig?.marksBarColor || ''}
                placeholder="#10b981"
                allowClear={true}
                onChange={(val) =>
                  setCurrentConfig((p) => ({
                    ...p,
                    subjectTableConfig: {
                      ...p.subjectTableConfig,
                      marksBarColor: val || '#10b981',
                    },
                  }))
                }
                presets={[
                  '#10b981',
                  '#059669',
                  '#3b82f6',
                  '#2563eb',
                  '#f59e0b',
                  '#e11d48',
                  '#8b5cf6',
                ]}
              />
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-dark-slate">
                <span>Fill Opacity</span>
                <span className="font-mono text-emerald-600">
                  {currentConfig.subjectTableConfig?.marksBarOpacity ?? 25}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={currentConfig.subjectTableConfig?.marksBarOpacity ?? 25}
                onChange={(e) =>
                  setCurrentConfig((p) => ({
                    ...p,
                    subjectTableConfig: {
                      ...p.subjectTableConfig,
                      marksBarOpacity: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex items-center gap-1 justify-end">
                {[
                  { label: 'Subtle (15%)', val: 15 },
                  { label: 'Default (25%)', val: 25 },
                  { label: 'Medium (40%)', val: 40 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() =>
                      setCurrentConfig((p) => ({
                        ...p,
                        subjectTableConfig: {
                          ...p.subjectTableConfig,
                          marksBarOpacity: preset.val,
                        },
                      }))
                    }
                    className="px-1.5 py-0.5 text-[8.5px] font-bold bg-slate-100 hover:bg-slate-200 rounded text-dark-muted cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-dark-muted">Fill Direction</label>
              <div className="grid grid-cols-2 gap-1 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentConfig((p) => ({
                      ...p,
                      subjectTableConfig: {
                        ...p.subjectTableConfig,
                        marksBarDirection: 'horizontal',
                      },
                    }))
                  }
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    (currentConfig.subjectTableConfig?.marksBarDirection || 'horizontal') ===
                    'horizontal'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-black'
                      : 'bg-slate-50 border-slate-200 text-dark-muted hover:bg-slate-100'
                  }`}
                >
                  <i className="fas fa-arrows-left-right text-[9px]" />
                  <span>Horizontal</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentConfig((p) => ({
                      ...p,
                      subjectTableConfig: {
                        ...p.subjectTableConfig,
                        marksBarDirection: 'vertical',
                      },
                    }))
                  }
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    currentConfig.subjectTableConfig?.marksBarDirection === 'vertical'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-black'
                      : 'bg-slate-50 border-slate-200 text-dark-muted hover:bg-slate-100'
                  }`}
                >
                  <i className="fas fa-arrows-up-down text-[9px]" />
                  <span>Vertical</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Borders, Outline & Banded Rows Styling */}
      <div className="pt-3 border-t border-light-border/70 space-y-3">
        <div>
          <h5 className="text-xs font-black text-dark-primary flex items-center gap-1.5">
            <i className="fas fa-border-all text-rose-500 text-[11px]" />
            <span>Table Borders, Outline &amp; Banded Rows</span>
          </h5>
          <p className="text-[11px] text-dark-muted font-medium">
            Configure outer table borders, inner cell borders, and alternating row colors with
            opacity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Outline Border */}
          <div className="p-3 bg-white border border-light-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-dark-slate flex items-center gap-1">
                <i className="fas fa-square text-rose-500 text-[9px]" />
                Outline Border
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-dark-slate">
                <input
                  type="checkbox"
                  checked={currentConfig.subjectTableConfig?.showOutlineBorder !== false}
                  onChange={(e) =>
                    setCurrentConfig((p) => ({
                      ...p,
                      subjectTableConfig: {
                        ...p.subjectTableConfig,
                        showOutlineBorder: e.target.checked,
                      },
                    }))
                  }
                  className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                />
                <span>Show</span>
              </label>
            </div>

            {currentConfig.subjectTableConfig?.showOutlineBorder !== false ? (
              <div className="space-y-1.5 pt-1">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[9px] font-bold text-dark-muted mb-0.5">
                      Style
                    </label>
                    <select
                      value={currentConfig.subjectTableConfig?.outlineBorderStyle || 'solid'}
                      onChange={(e) =>
                        setCurrentConfig((p) => ({
                          ...p,
                          subjectTableConfig: {
                            ...p.subjectTableConfig,
                            outlineBorderStyle: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-2 py-1 text-[10px] border border-light-border rounded-lg bg-white font-bold"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                      <option value="double">Double</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-dark-muted mb-0.5">
                      Width
                    </label>
                    <select
                      value={currentConfig.subjectTableConfig?.outlineBorderWidth ?? 1}
                      onChange={(e) =>
                        setCurrentConfig((p) => ({
                          ...p,
                          subjectTableConfig: {
                            ...p.subjectTableConfig,
                            outlineBorderWidth: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-2 py-1 text-[10px] border border-light-border rounded-lg bg-white font-bold"
                    >
                      <option value={1}>1px</option>
                      <option value={2}>2px</option>
                      <option value={3}>3px</option>
                      <option value={4}>4px</option>
                    </select>
                  </div>
                </div>
                <div className="min-w-0">
                  <ColorPicker
                    label="Border Color"
                    value={currentConfig.subjectTableConfig?.outlineBorderColor || '#cbd5e1'}
                    placeholder="#cbd5e1"
                    allowClear={false}
                    onChange={(val) =>
                      setCurrentConfig((p) => ({
                        ...p,
                        subjectTableConfig: {
                          ...p.subjectTableConfig,
                          outlineBorderColor: val,
                        },
                      }))
                    }
                    presets={['#cbd5e1', '#94a3b8', '#64748b', '#334155', '#1e293b', '#e2e8f0']}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[9.5px] text-dark-muted italic bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                No outline border &mdash; table outer edge is borderless.
              </p>
            )}
          </div>

          {/* 2. Inline (Cell) Borders */}
          <div className="p-3 bg-white border border-light-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-dark-slate flex items-center gap-1">
                <i className="fas fa-table text-indigo-500 text-[9px]" />
                Inline Borders
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-dark-slate">
                <input
                  type="checkbox"
                  checked={currentConfig.subjectTableConfig?.showInlineBorders !== false}
                  onChange={(e) =>
                    setCurrentConfig((p) => ({
                      ...p,
                      subjectTableConfig: {
                        ...p.subjectTableConfig,
                        showInlineBorders: e.target.checked,
                      },
                    }))
                  }
                  className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                />
                <span>Show</span>
              </label>
            </div>

            {currentConfig.subjectTableConfig?.showInlineBorders !== false ? (
              <div className="space-y-1.5 pt-1">
                <div>
                  <label className="block text-[9px] font-bold text-dark-muted mb-0.5">Style</label>
                  <select
                    value={currentConfig.subjectTableConfig?.inlineBorderStyle || 'solid'}
                    onChange={(e) =>
                      setCurrentConfig((p) => ({
                        ...p,
                        subjectTableConfig: {
                          ...p.subjectTableConfig,
                          inlineBorderStyle: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-2 py-1 text-[10px] border border-light-border rounded-lg bg-white font-bold"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <ColorPicker
                    label="Inline Border Color"
                    value={currentConfig.subjectTableConfig?.inlineBorderColor || '#e2e8f0'}
                    placeholder="#e2e8f0"
                    allowClear={false}
                    onChange={(val) =>
                      setCurrentConfig((p) => ({
                        ...p,
                        subjectTableConfig: {
                          ...p.subjectTableConfig,
                          inlineBorderColor: val,
                        },
                      }))
                    }
                    presets={['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#f1f5f9', '#d1d5db']}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[9.5px] text-dark-muted italic bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                No inline borders &mdash; cells render with clean, seamless spacing.
              </p>
            )}
          </div>

          {/* 3. Banded Rows & Opacity */}
          <div className="p-3 bg-white border border-light-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-dark-slate flex items-center gap-1">
                <i className="fas fa-layer-group text-emerald-500 text-[9px]" />
                Banded Rows
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-dark-slate">
                <input
                  type="checkbox"
                  checked={!!currentConfig.subjectTableConfig?.bandedRows}
                  onChange={(e) =>
                    setCurrentConfig((p) => ({
                      ...p,
                      subjectTableConfig: {
                        ...p.subjectTableConfig,
                        bandedRows: e.target.checked,
                      },
                    }))
                  }
                  className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                />
                <span>Banded</span>
              </label>
            </div>

            {currentConfig.subjectTableConfig?.bandedRows ? (
              <div className="space-y-1.5 pt-1">
                <div className="min-w-0">
                  <ColorPicker
                    label="Banded Row Color"
                    value={currentConfig.subjectTableConfig?.bandedRowColor || '#f8fafc'}
                    placeholder="#f8fafc"
                    allowClear={false}
                    onChange={(val) =>
                      setCurrentConfig((p) => ({
                        ...p,
                        subjectTableConfig: {
                          ...p.subjectTableConfig,
                          bandedRowColor: val,
                        },
                      }))
                    }
                    presets={['#f8fafc', '#f1f5f9', '#f3f4f6', '#fef2f2', '#f0fdf4', '#eff6ff']}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[9px] font-bold text-dark-muted mb-0.5">
                    <span>Banded Opacity</span>
                    <span className="font-mono text-dark-primary font-bold">
                      {currentConfig.subjectTableConfig?.bandedRowOpacity ?? 60}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={currentConfig.subjectTableConfig?.bandedRowOpacity ?? 60}
                    onChange={(e) =>
                      setCurrentConfig((p) => ({
                        ...p,
                        subjectTableConfig: {
                          ...p.subjectTableConfig,
                          bandedRowOpacity: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <p className="text-[9.5px] text-dark-muted italic bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                Banded rows disabled &mdash; all rows use consistent background.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectTableSettings;
