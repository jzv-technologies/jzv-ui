import React from 'react';
import { ColorPicker } from '../ColorPicker';
import { DEFAULT_BLOCK_TITLES } from '../constants';

/**
 * BlockCommonSettings
 * Settings shared by every block: visibility, size, title, background, typography.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const BlockCommonSettings = ({
  blockKey,
  blockSize,
  bs,
  isVisible,
  setBlockSize,
  setBlockStyle,
  toggleBlockVisibility,
}) => {
  return (
    <>
      {/* Block Visibility & Size Settings Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-white rounded-xl border border-light-border shadow-2xs">
        {/* Visibility Toggle */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-dark-slate">Visibility:</span>
          <button
            type="button"
            role="switch"
            aria-checked={isVisible}
            onClick={() => toggleBlockVisibility(blockKey)}
            className="flex items-center gap-2 cursor-pointer select-none group focus:outline-hidden"
            title={isVisible ? 'Click to turn visibility Off' : 'Click to turn visibility On'}
          >
            <div
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isVisible ? 'bg-emerald-600' : 'bg-slate-300'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isVisible ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </div>
            <span
              className={`text-xs font-black min-w-[34px] flex items-center gap-1 uppercase tracking-wide transition-colors ${isVisible ? 'text-emerald-700' : 'text-slate-500'}`}
            >
              <i
                className={`fas ${isVisible ? 'fa-eye text-emerald-600' : 'fa-eye-slash text-slate-400'} text-[10px]`}
              />
              <span>{isVisible ? 'On' : 'Off'}</span>
            </span>
          </button>
        </div>

        {/* Block Size Segmented Control */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-black">
          {['compact', 'standard', 'large'].map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => setBlockSize(blockKey, sz)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer capitalize ${blockSize === sz ? 'bg-white text-rose-700 shadow-2xs font-black' : 'text-dark-muted hover:text-dark-primary'}`}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* ── Block Title Settings (Show/Hide, Custom Title, Alignment) ── */}
      <div className="p-3 bg-white rounded-xl border border-light-border shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h5 className="text-[11px] font-black text-dark-primary uppercase tracking-wider flex items-center gap-1.5">
            <i className="fas fa-heading text-rose-500 text-[10px]" />
            <span>Component Title</span>
          </h5>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-dark-slate">Show Title:</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!bs.showTitle}
              onClick={() => setBlockStyle({ showTitle: !bs.showTitle })}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer ${
                bs.showTitle ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  bs.showTitle ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-[10px] font-black uppercase min-w-[24px] ${
                bs.showTitle ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {bs.showTitle ? 'On' : 'Off'}
            </span>
          </div>
        </div>

        {bs.showTitle && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
            <div>
              <label className="block text-[9.5px] font-bold text-dark-muted mb-1">
                Title Text
              </label>
              <input
                type="text"
                value={bs.title !== undefined ? bs.title : ''}
                onChange={(e) => setBlockStyle({ title: e.target.value })}
                placeholder={DEFAULT_BLOCK_TITLES[blockKey] || 'Block Title'}
                className="w-full px-2.5 py-1 text-xs border border-light-border rounded-lg bg-slate-50/50 font-bold text-dark-primary focus:bg-white focus:ring-2 focus:ring-rose-300 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[9.5px] font-bold text-dark-muted mb-1">
                Position / Alignment
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-center">
                {[
                  { id: 'left', label: 'Left', icon: 'fa-align-left' },
                  {
                    id: 'center',
                    label: 'Center',
                    icon: 'fa-align-center',
                  },
                  { id: 'right', label: 'Right', icon: 'fa-align-right' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setBlockStyle({ titleAlign: pos.id })}
                    className={`py-1 px-1 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      (bs.titleAlign || 'left') === pos.id
                        ? 'bg-white text-rose-700 shadow-2xs font-black'
                        : 'text-dark-muted hover:text-dark-primary'
                    }`}
                  >
                    <i className={`fas ${pos.icon} text-[9px]`} />
                    <span>{pos.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Per-Block Style Controls ── */}
      <div className="p-3 bg-white rounded-xl border border-light-border shadow-2xs space-y-3">
        <h5 className="text-[11px] font-black text-dark-primary uppercase tracking-wider flex items-center gap-1.5">
          <i className="fas fa-palette text-rose-500 text-[10px]" />
          Block Styling
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
          {/* Background & Transparency */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-light-border space-y-2.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-black text-dark-primary uppercase tracking-wider">
                Background
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-dark-slate select-none">
                <input
                  type="checkbox"
                  checked={!!bs.noBackground}
                  onChange={(e) => setBlockStyle({ noBackground: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
                />
                <span>Transparent</span>
              </label>
            </div>
            {!bs.noBackground ? (
              <div className="space-y-2.5 min-w-0">
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 items-end min-w-0">
                  <div className="min-w-0">
                    <ColorPicker
                      label="Fill Color"
                      value={bs.background || ''}
                      placeholder="#ffffff"
                      allowClear={true}
                      onChange={(c) =>
                        setBlockStyle({
                          background: c === '#ffffff' ? '' : c,
                        })
                      }
                    />
                  </div>
                  <div className="min-w-0 space-y-1 pb-1">
                    <div className="flex justify-between text-[10px] font-bold text-dark-slate">
                      <span>Opacity</span>
                      <span className="font-mono">{bs.backgroundOpacity ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={bs.backgroundOpacity ?? 100}
                      onChange={(e) =>
                        setBlockStyle({
                          backgroundOpacity: Number(e.target.value),
                        })
                      }
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Background Width Option */}
                <div className="pt-2 border-t border-slate-200/80 space-y-1">
                  <label className="block text-[9.5px] font-bold text-dark-muted">
                    Background Width
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-center">
                    <button
                      type="button"
                      onClick={() => setBlockStyle({ bgWidth: 'component' })}
                      className={`py-1 px-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        (bs.bgWidth || 'component') === 'component'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs font-black'
                          : 'text-dark-muted hover:text-dark-primary'
                      }`}
                    >
                      <i className="fas fa-arrows-left-right-to-line text-[9px]" />
                      <span>Component Width</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlockStyle({ bgWidth: 'page' })}
                      className={`py-1 px-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        bs.bgWidth === 'page'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs font-black'
                          : 'text-dark-muted hover:text-dark-primary'
                      }`}
                    >
                      <i className="fas fa-arrows-left-right text-[9px]" />
                      <span>Page Width</span>
                    </button>
                  </div>
                </div>

                {/* Header Cover Top Option */}
                {blockKey === 'schoolHeader' && (
                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <i className="fas fa-arrow-up-from-bracket text-rose-500 text-[10px]" />
                      <div>
                        <span className="text-[10px] font-bold text-dark-slate block leading-tight">
                          Cover Page Top (Header Block)
                        </span>
                        <span className="text-[8.5px] text-dark-muted block">
                          Bleed background to top edge of page
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!bs.coverTop}
                      onClick={() => {
                        const next = !bs.coverTop;
                        setBlockStyle({
                          coverTop: next,
                          ...(next ? { bgWidth: 'page' } : {}),
                        });
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer ${
                        bs.coverTop ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          bs.coverTop ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Signatures Cover Bottom Option */}
                {blockKey === 'signatures' && (
                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <i className="fas fa-arrow-down-from-bracket text-rose-500 text-[10px]" />
                      <div>
                        <span className="text-[10px] font-bold text-dark-slate block leading-tight">
                          Cover Page Bottom (Footer Block)
                        </span>
                        <span className="text-[8.5px] text-dark-muted block">
                          Bleed background to bottom edge of page
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!bs.coverBottom}
                      onClick={() => {
                        const next = !bs.coverBottom;
                        setBlockStyle({
                          coverBottom: next,
                          ...(next ? { bgWidth: 'page' } : {}),
                        });
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer ${
                        bs.coverBottom ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          bs.coverBottom ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[9.5px] text-dark-muted italic bg-white p-2 rounded-lg border border-slate-200">
                Transparent background active &mdash; extraComponent and canvas show through
                directly.
              </p>
            )}
          </div>

          {/* Typography & Text Colors */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-light-border space-y-2.5 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black text-dark-primary uppercase tracking-wider block">
                Typography &amp; Colors
              </span>
              <button
                type="button"
                onClick={() =>
                  setBlockStyle({
                    background: '',
                    noBackground: false,
                    backgroundOpacity: 100,
                    labelFontSize: 9,
                    labelColor: '',
                    contentFontSize: 11,
                    contentColor: '',
                  })
                }
                className="text-[9.5px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                title="Reset to default block styling"
              >
                <i className="fas fa-undo text-[8px]" />
                <span>Reset</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 min-w-0 items-end">
              <div className="min-w-0">
                <label className="block text-[10px] font-bold text-dark-muted mb-1 truncate">
                  Label Size (px)
                </label>
                <input
                  type="number"
                  min="7"
                  max="20"
                  step="1"
                  value={bs.labelFontSize || 9}
                  onChange={(e) =>
                    setBlockStyle({
                      labelFontSize: Number(e.target.value),
                    })
                  }
                  className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl font-mono bg-white font-bold"
                />
              </div>
              <div className="min-w-0">
                <ColorPicker
                  label="Label Color"
                  value={bs.labelColor || ''}
                  placeholder="#64748b"
                  allowClear={true}
                  onChange={(c) =>
                    setBlockStyle({
                      labelColor: c === '#64748b' ? '' : c,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 min-w-0 items-end">
              <div className="min-w-0">
                <label className="block text-[10px] font-bold text-dark-muted mb-1 truncate">
                  Content Size (px)
                </label>
                <input
                  type="number"
                  min="7"
                  max="24"
                  step="1"
                  value={bs.contentFontSize || 11}
                  onChange={(e) =>
                    setBlockStyle({
                      contentFontSize: Number(e.target.value),
                    })
                  }
                  className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl font-mono bg-white font-bold"
                />
              </div>
              <div className="min-w-0">
                <ColorPicker
                  label="Content Color"
                  value={bs.contentColor || ''}
                  placeholder="#0f172a"
                  allowClear={true}
                  onChange={(c) =>
                    setBlockStyle({
                      contentColor: c === '#0f172a' ? '' : c,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlockCommonSettings;
