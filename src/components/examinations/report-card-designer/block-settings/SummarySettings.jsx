import React from 'react';
import { DEFAULT_TEMPLATE } from '../constants';

/**
 * SummarySettings
 * Block-specific settings for the summary calculations table.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const SummarySettings = ({ currentConfig, setCurrentConfig }) => {
  const SUMMARY_ITEM_LABELS = {
    showGrandTotal: 'Grand Total (Obtained / Max)',
    showPercentage: 'Percentage (%)',
    showGrade: 'Overall Grade',
    showClassRank: 'Class Rank (#)',
    showPassFail: 'Result Status (PASS/FAIL)',
    showTotalSubjects: 'Total Subjects Evaluated',
  };
  const itemOrder =
    currentConfig.summaryConfig?.itemOrder || DEFAULT_TEMPLATE.summaryConfig.itemOrder;
  const moveSummaryItem = (idx, dir) => {
    const newOrder = [...itemOrder];
    const toIdx = idx + dir;
    if (toIdx < 0 || toIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[idx]];
    setCurrentConfig((p) => ({
      ...p,
      summaryConfig: { ...p.summaryConfig, itemOrder: newOrder },
    }));
  };
  return (
    <div className="space-y-4">
      {/* Columns control */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-bold text-dark-slate">Columns per Row:</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4, 5, 6].map((col) => (
            <button
              key={col}
              type="button"
              onClick={() =>
                setCurrentConfig((p) => ({
                  ...p,
                  summaryConfig: {
                    ...p.summaryConfig,
                    columns: col,
                  },
                }))
              }
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black border cursor-pointer transition-all ${
                (currentConfig.summaryConfig?.columns ?? 0) === col
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                  : 'bg-white text-dark-slate border-light-border hover:bg-slate-50'
              }`}
            >
              {col === 0 ? 'Auto' : col}
            </button>
          ))}
        </div>
      </div>

      {/* Items to display + sequence */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-[11px] font-black text-dark-primary flex items-center gap-1.5">
            <i className="fas fa-arrows-alt-v text-rose-500 text-[10px]" />
            Metrics & Sequence
          </h5>
          <button
            type="button"
            onClick={() =>
              setCurrentConfig((p) => ({
                ...p,
                summaryConfig: {
                  ...p.summaryConfig,
                  itemOrder: DEFAULT_TEMPLATE.summaryConfig.itemOrder,
                },
              }))
            }
            className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
          >
            <i className="fas fa-undo-alt mr-1 text-[9px]" />
            Reset Order
          </button>
        </div>
        <div className="space-y-1.5">
          {itemOrder.map((key, idx) => (
            <div
              key={key}
              className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-light-border shadow-2xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!currentConfig.summaryConfig?.[key]}
                  onChange={(e) =>
                    setCurrentConfig((p) => ({
                      ...p,
                      summaryConfig: {
                        ...p.summaryConfig,
                        [key]: e.target.checked,
                      },
                    }))
                  }
                  className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                />
                <span className="text-xs font-bold text-dark-primary">
                  {SUMMARY_ITEM_LABELS[key] || key}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveSummaryItem(idx, -1)}
                  className="w-6 h-6 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-600 cursor-pointer"
                >
                  <i className="fas fa-arrow-up text-[10px]" />
                </button>
                <button
                  type="button"
                  disabled={idx === itemOrder.length - 1}
                  onClick={() => moveSummaryItem(idx, 1)}
                  className="w-6 h-6 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-600 cursor-pointer"
                >
                  <i className="fas fa-arrow-down text-[10px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation / Testing Toggle */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-black text-dark-primary block">
            Simulate Subject Failure in Preview
          </span>
          <span className="text-[10px] text-dark-muted block">
            Test how Summary Table displays when a student fails a subject (Grade F in Red &amp; blank Class Rank)
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={!!currentConfig.summaryConfig?.simulateFailPreview}
            onChange={(e) =>
              setCurrentConfig((p) => ({
                ...p,
                summaryConfig: {
                  ...p.summaryConfig,
                  simulateFailPreview: e.target.checked,
                },
              }))
            }
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600" />
        </label>
      </div>
    </div>
  );
};

export default SummarySettings;
