// src/components/timetable/PrintSettingsPanel.jsx
/**
 * PrintSettingsPanel Component
 * Tabbed print configuration pane. Rendered inside PrintWorkspace next to the live
 * preview, so it owns no dialog chrome and has no print/cancel actions of its own.
 */

import React, { useState } from 'react';
import MultiSelectDropdown from '../MultiSelectDropdown';
import {
  PAGE_SIZES,
  ORIENTATIONS,
  PAGE_BREAK_OPTIONS,
  CELL_DATA_OPTIONS,
  ROW_HEADER_OPTIONS,
  CELL_MODES,
  PRINT_VARIABLES,
  HEADER_LINE_LIMIT,
  DEFAULT_HEADER_LINES,
  DEFAULT_PRINT_SETTINGS,
} from '../../types/print-settings';

const TABS = [
  { id: 'layout', label: 'Layout', icon: 'fa-file-alt' },
  { id: 'content', label: 'Content', icon: 'fa-list' },
  { id: 'appearance', label: 'Appearance', icon: 'fa-palette' },
  { id: 'advanced', label: 'Advanced', icon: 'fa-cog' },
];

const OptionButton = ({ active, onClick, children, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
      active
        ? 'border-brand-primary bg-brand-primary/5 text-brand-primary'
        : 'border-light-border text-dark-soft hover:border-brand-soft hover:bg-brand-primary/5'
    } ${className}`}
  >
    {children}
  </button>
);

const PrintSettingsPanel = ({
  settings,
  onChange,
  onReset,
  timetableData,
  className = '',
  isDomMode = false,
  variant = 'class',
  classCount = 0,
  exclusiveOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState('layout');
  // Header line the variable chips insert into (the last one the user typed in).
  const [activeLineId, setActiveLineId] = useState(null);

  // Always read from the shared settings object so the preview can never drift out of sync.
  const s = { ...DEFAULT_PRINT_SETTINGS, ...settings };
  const update = (key, value) => onChange({ ...s, [key]: value });

  const headerLines = s.headerLines?.length ? s.headerLines : DEFAULT_HEADER_LINES;
  const setHeaderLines = (lines) => update('headerLines', lines);
  const patchHeaderLine = (id, patch) =>
    setHeaderLines(headerLines.map((line) => (line.id === id ? { ...line, ...patch } : line)));

  const insertHeaderVariable = (token) => {
    const target = headerLines.find((line) => line.id === activeLineId) || headerLines[0];
    if (!target) return;
    patchHeaderLine(target.id, { text: `${target.text || ''}${token}` });
    setActiveLineId(target.id);
  };

  const addHeaderLine = () => {
    if (headerLines.length >= HEADER_LINE_LIMIT) return;
    const id = `line-${Date.now()}`;
    setHeaderLines([
      ...headerLines,
      {
        id,
        label: `Extra line ${headerLines.length + 1}`,
        text: '',
        fontSize: 12,
        color: '#0f172a',
        bold: false,
        visible: true,
      },
    ]);
    setActiveLineId(id);
  };

  const removeHeaderLine = (id) => {
    const next = headerLines.filter((line) => line.id !== id);
    if (next.length === 0) return;
    setHeaderLines(next);
    if (activeLineId === id) setActiveLineId(next[0].id);
  };

  const dayOptions = (timetableData?.days || []).map((day) => ({ id: day, label: day }));
  const periodOptions = (timetableData?.periods || []).map((p) => ({
    id: String(p.id),
    label: p.name || `Period ${p.period_number}`,
  }));
  const visibleTabs = exclusiveOnly
    ? TABS.filter((tab) => !['appearance', 'advanced'].includes(tab.id))
    : TABS;

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      {/* Tab Navigation */}
      <div className="bg-light-lbg/50 border-b border-light-border px-3 py-2 overflow-x-auto shrink-0">
        <div className="flex gap-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-dark-soft hover:text-dark-primary hover:bg-white'
              }`}
            >
              <i className={`fas ${tab.icon} text-[11px]`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        {activeTab === 'layout' && (
          <div className="space-y-5">
            {!exclusiveOnly && <div>
              <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-2">
                Page Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAGE_SIZES.map((size) => (
                  <OptionButton
                    key={size.id}
                    active={s.pageSize === size.id}
                    onClick={() => update('pageSize', size.id)}
                  >
                    <div className="font-bold text-sm">{size.name}</div>
                    <div className="text-[10px] text-dark-soft">
                      {size.width} × {size.height}
                    </div>
                  </OptionButton>
                ))}
              </div>
            </div>}

            {!exclusiveOnly && <div>
              <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-2">
                Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ORIENTATIONS.map((orient) => (
                  <OptionButton
                    key={orient.id}
                    active={s.orientation === orient.id}
                    onClick={() => update('orientation', orient.id)}
                    className="p-4"
                  >
                    <i className={`fas ${orient.icon} text-xl mb-1`} />
                    <div className="font-bold text-sm capitalize">{orient.name}</div>
                  </OptionButton>
                ))}
              </div>
            </div>}

            {!exclusiveOnly && <div>
              <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-2 flex items-center justify-between">
                Font Size
                <span className="text-brand-primary font-bold">{s.fontSize}pt</span>
              </label>
              <input
                type="range"
                min="6"
                max="14"
                step="1"
                value={s.fontSize}
                onChange={(e) => update('fontSize', parseInt(e.target.value, 10))}
                className="w-full h-2 bg-light-border rounded-lg appearance-none accent-brand-primary"
              />
              <div className="flex justify-between text-[10px] text-dark-soft mt-1">
                <span>6pt (Small)</span>
                <span>14pt (Large)</span>
              </div>
            </div>}

            {!exclusiveOnly && <div>
              <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-2 flex items-center justify-between">
                Page Margin
                <span className="text-brand-primary font-bold">{s.margin}mm</span>
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={s.margin}
                onChange={(e) => update('margin', parseInt(e.target.value, 10))}
                className="w-full h-2 bg-light-border rounded-lg appearance-none accent-brand-primary"
              />
              <div className="flex justify-between text-[10px] text-dark-soft mt-1">
                <span>5mm (Narrow)</span>
                <span>30mm (Wide)</span>
              </div>
            </div>}

            <div>
              <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-2">
                Page Breaks
              </label>
              <div className="space-y-2">
                {PAGE_BREAK_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      s.pageBreak === option.id
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-light-border hover:border-brand-soft hover:bg-brand-primary/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pageBreak"
                      value={option.id}
                      checked={s.pageBreak === option.id}
                      onChange={(e) => update('pageBreak', e.target.value)}
                      className="w-4 h-4 text-brand-primary border-light-border focus:ring-brand-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-dark-primary text-sm">{option.name}</div>
                      <div className="text-[11px] text-dark-soft">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {!isDomMode && variant === 'class' && (
              <div data-feature-filter="print-scope">
                <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-2">
                  What to Print
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      s.printScope !== 'all-classes'
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-light-border hover:border-brand-soft hover:bg-brand-primary/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="printScope"
                      value="current"
                      checked={s.printScope !== 'all-classes'}
                      onChange={() => update('printScope', 'current')}
                      className="w-4 h-4 text-brand-primary border-light-border focus:ring-brand-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-dark-primary text-sm">Current view</div>
                      <div className="text-[11px] text-dark-soft">
                        The class currently selected in Class View
                      </div>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      classCount === 0
                        ? 'border-light-border opacity-60 cursor-not-allowed'
                        : s.printScope === 'all-classes'
                          ? 'border-brand-primary bg-brand-primary/5 cursor-pointer'
                          : 'border-light-border hover:border-brand-soft hover:bg-brand-primary/5 cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="printScope"
                      value="all-classes"
                      checked={s.printScope === 'all-classes'}
                      disabled={classCount === 0}
                      onChange={() => update('printScope', 'all-classes')}
                      className="w-4 h-4 text-brand-primary border-light-border focus:ring-brand-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-dark-primary text-sm">
                        All classes in one go
                      </div>
                      <div className="text-[11px] text-dark-soft">
                        {classCount > 0
                          ? `${classCount} classes, one page each — each page shows its own class name`
                          : 'No classes available'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-5">
            {isDomMode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                This subview prints as shown on screen, so the cell content options only affect
                the Class View and Teacher View grids. The days and periods filters below also
                trim this view.
              </div>
            )}

            <MultiSelectDropdown
              label="Cell Data to Display"
              placeholder="Choose cell content"
              options={CELL_DATA_OPTIONS}
              selected={s.cellData}
              onChange={(val) => update('cellData', Array.isArray(val) ? val : [val])}
              fullWidth
            />

            <MultiSelectDropdown
              label="First Column Data"
              placeholder="Period and time"
              options={ROW_HEADER_OPTIONS}
              selected={s.rowHeaderData}
              onChange={(val) =>
                update('rowHeaderData', (Array.isArray(val) ? val : [val]).slice(0, 2))
              }
              fullWidth
            />

            <div>
              <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-2">
                Cell Display Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CELL_MODES.map((mode) => (
                  <OptionButton
                    key={mode.id}
                    active={s.cellMode === mode.id}
                    onClick={() => update('cellMode', mode.id)}
                    className="p-4"
                  >
                    <i className={`fas ${mode.icon} text-xl mb-1`} />
                    <div className="font-bold text-sm">{mode.name}</div>
                    <div className="text-[10px] text-dark-soft">{mode.description}</div>
                  </OptionButton>
                ))}
              </div>
            </div>

            <MultiSelectDropdown
              label={isDomMode ? 'Days (Rows)' : 'Days (Columns)'}
              placeholder="All days"
              options={dayOptions}
              selected={s.selectedColumns}
              onChange={(val) => update('selectedColumns', Array.isArray(val) ? val : [val])}
              fullWidth
            />

            <MultiSelectDropdown
              label={isDomMode ? 'Periods (Columns)' : 'Periods (Rows)'}
              placeholder="All periods"
              options={periodOptions}
              selected={s.selectedRows}
              onChange={(val) => update('selectedRows', Array.isArray(val) ? val : [val])}
              fullWidth
            />
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-light-border cursor-pointer transition-all bg-white hover:bg-light-bg/50">
                <input
                  type="checkbox"
                  checked={s.showGridLines}
                  onChange={(e) => update('showGridLines', e.target.checked)}
                  className="w-5 h-5 text-brand-primary border-light-border rounded focus:ring-brand-primary"
                />
                <div>
                  <div className="font-medium text-dark-primary text-sm">Show Grid Lines</div>
                  <div className="text-[11px] text-dark-soft">Display borders between cells</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-light-border cursor-pointer transition-all bg-white hover:bg-light-bg/50">
                <input
                  type="checkbox"
                  checked={s.showHeaders}
                  onChange={(e) => update('showHeaders', e.target.checked)}
                  className="w-5 h-5 text-brand-primary border-light-border rounded focus:ring-brand-primary"
                />
                <div>
                  <div className="font-medium text-dark-primary text-sm">Show Headers</div>
                  <div className="text-[11px] text-dark-soft">Display day and period headers</div>
                </div>
              </label>
            </div>

            <div data-feature="print-header-lines">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide">
                  Header Lines
                </label>
                <button
                  type="button"
                  onClick={addHeaderLine}
                  disabled={headerLines.length >= HEADER_LINE_LIMIT}
                  className="px-2.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  title={`Add another header line (max ${HEADER_LINE_LIMIT})`}
                >
                  <i className="fas fa-plus" />
                  Add line
                </button>
              </div>

              <div className="space-y-2">
                {headerLines.map((line, idx) => (
                  <div
                    key={line.id}
                    className={`rounded-xl border-2 p-2.5 space-y-2 bg-white transition-all ${
                      activeLineId === line.id ? 'border-brand-soft' : 'border-light-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => patchHeaderLine(line.id, { visible: line.visible === false })}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[11px] transition-all cursor-pointer ${
                          line.visible === false
                            ? 'border-light-border bg-light-bg text-dark-muted'
                            : 'border-brand-primary bg-brand-primary/5 text-brand-primary'
                        }`}
                        title={line.visible === false ? 'Hidden — click to show' : 'Visible — click to hide'}
                      >
                        <i className={`fas ${line.visible === false ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>

                      <span className="flex-1 text-[11px] font-bold text-dark-soft truncate">
                        Header {idx + 1}
                      </span>

                      <input
                        type="color"
                        value={line.color || '#0f172a'}
                        onChange={(e) => patchHeaderLine(line.id, { color: e.target.value })}
                        className="w-7 h-7 rounded-lg border border-light-border cursor-pointer bg-white p-0.5"
                        title="Font colour"
                      />

                      <input
                        type="number"
                        min="6"
                        max="40"
                        value={line.fontSize || 12}
                        onChange={(e) =>
                          patchHeaderLine(line.id, { fontSize: Number(e.target.value) || 12 })
                        }
                        className="w-14 bg-white border border-light-border rounded-lg px-1.5 py-1 text-xs font-bold text-dark-primary text-center outline-none focus:ring-2 focus:ring-brand-primary"
                        title="Font size in pixels"
                      />

                      <button
                        type="button"
                        onClick={() => removeHeaderLine(line.id)}
                        disabled={headerLines.length <= 1}
                        className="w-7 h-7 rounded-lg border border-light-border text-dark-muted hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-[11px] transition-all cursor-pointer"
                        title="Remove this line"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={line.text || ''}
                      onFocus={() => setActiveLineId(line.id)}
                      onChange={(e) => patchHeaderLine(line.id, { text: e.target.value })}
                      placeholder="e.g., {className} timetable"
                      className="w-full bg-white border border-light-border rounded-lg px-3 py-2 text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-2.5">
                <div className="text-[10px] font-bold text-dark-soft uppercase tracking-wide mb-1">
                  Insert into the line you last edited
                </div>
                <div className="flex flex-wrap gap-1">
                  {PRINT_VARIABLES.map((variable) => (
                    <button
                      key={variable.token}
                      type="button"
                      onClick={() => insertHeaderVariable(variable.token)}
                      className="px-2 py-1 rounded-lg bg-light-bg border border-light-border text-[10px] font-bold text-dark-soft hover:text-brand-primary hover:bg-white transition-all cursor-pointer"
                      title={variable.label}
                    >
                      {variable.token}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-dark-soft mt-1">
                  A line is skipped automatically when its text resolves to nothing, so one line can
                  cover both class and teacher names.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-2">
                Footer Text
              </label>
              <input
                type="text"
                value={s.footerText}
                onChange={(e) => update('footerText', e.target.value)}
                placeholder="e.g., Generated on {date} | Page {page}"
                className="w-full bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <p className="text-[10px] text-dark-soft mt-1">
                Available placeholders: {'{date}'}, {'{page}'}, {'{totalPages}'}, {'{time}'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-5">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h5 className="font-bold text-yellow-800 mb-2 flex items-center gap-2 text-sm">
                <i className="fas fa-info-circle" />
                Print Tips
              </h5>
              <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                <li>Landscape fits more period columns on one page</li>
                <li>Print to PDF first to check pagination before printing on paper</li>
                <li>Reduce the font size if cell content is being cut off</li>
                <li>Deselect periods or days to shorten the printed grid</li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-dark-primary mb-2 text-sm">Reset Settings</h5>
              <button
                type="button"
                onClick={onReset}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintSettingsPanel;
