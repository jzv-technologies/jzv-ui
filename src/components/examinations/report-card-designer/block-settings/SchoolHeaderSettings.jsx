import React from 'react';
import MultiSelectDropdown from '../../../MultiSelectDropdown';

/**
 * SchoolHeaderSettings
 * Block-specific settings for the school header.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const SchoolHeaderSettings = ({ currentConfig, setCurrentConfig }) => {
  return (
    <div className="space-y-3">
      <div className="max-w-md">
        <MultiSelectDropdown
          label="Details to Display"
          placeholder="Select details to display..."
          options={[
            {
              id: 'showHeaderImage',
              label: 'Complete Header Image (Full Width)',
            },
            { id: 'showTitle', label: 'School Name' },
            { id: 'showLogo', label: 'School Logo' },
            { id: 'showSubtitle', label: 'Subtitle / Motto' },
            { id: 'showAddress', label: 'Campus Address' },
            { id: 'showExamTitle', label: 'Exam Title Badge' },
          ]}
          selected={[
            currentConfig.schoolHeader?.showHeaderImage ? 'showHeaderImage' : null,
            currentConfig.schoolHeader?.showTitle !== false ? 'showTitle' : null,
            currentConfig.schoolHeader?.showLogo !== false ? 'showLogo' : null,
            currentConfig.schoolHeader?.showSubtitle !== false ? 'showSubtitle' : null,
            currentConfig.schoolHeader?.showAddress !== false ? 'showAddress' : null,
            currentConfig.schoolHeader?.showExamTitle !== false ? 'showExamTitle' : null,
          ].filter(Boolean)}
          onChange={(selectedIds) => {
            const arr = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
            setCurrentConfig((prev) => ({
              ...prev,
              schoolHeader: {
                ...prev.schoolHeader,
                showHeaderImage: arr.includes('showHeaderImage'),
                showTitle: arr.includes('showTitle'),
                showLogo: arr.includes('showLogo'),
                showSubtitle: arr.includes('showSubtitle'),
                showAddress: arr.includes('showAddress'),
                showExamTitle: arr.includes('showExamTitle'),
              },
            }));
          }}
          icon="fa-heading"
          fullWidth={true}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {Boolean(currentConfig.schoolHeader?.showHeaderImage) && (
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-[11px] font-bold text-dark-slate mb-1">
              Complete Header Image URL or Path (Full Width)
            </label>
            <input
              type="text"
              value={currentConfig.schoolHeader?.headerImageUrl || ''}
              onChange={(e) =>
                setCurrentConfig({
                  ...currentConfig,
                  schoolHeader: {
                    ...currentConfig.schoolHeader,
                    headerImageUrl: e.target.value,
                  },
                })
              }
              placeholder="e.g. /media/jzv-header-banner.png or https://example.com/banner.png"
              className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
            />
            <p className="text-[10px] text-dark-muted mt-1">
              This banner image will occupy the complete width across the header.
            </p>
          </div>
        )}

        {currentConfig.schoolHeader?.showTitle !== false && (
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
              School Name
            </label>
            <input
              type="text"
              value={currentConfig.schoolHeader?.title || ''}
              onChange={(e) =>
                setCurrentConfig({
                  ...currentConfig,
                  schoolHeader: {
                    ...currentConfig.schoolHeader,
                    title: e.target.value,
                  },
                })
              }
              className="w-full min-w-0 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
            />
          </div>
        )}

        {currentConfig.schoolHeader?.showSubtitle !== false && (
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
              Subtitle / Motto
            </label>
            <input
              type="text"
              value={currentConfig.schoolHeader?.subtitle || ''}
              onChange={(e) =>
                setCurrentConfig({
                  ...currentConfig,
                  schoolHeader: {
                    ...currentConfig.schoolHeader,
                    subtitle: e.target.value,
                  },
                })
              }
              className="w-full min-w-0 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
            />
          </div>
        )}

        {currentConfig.schoolHeader?.showAddress !== false && (
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
              Campus Address
            </label>
            <input
              type="text"
              value={currentConfig.schoolHeader?.address || ''}
              onChange={(e) =>
                setCurrentConfig({
                  ...currentConfig,
                  schoolHeader: {
                    ...currentConfig.schoolHeader,
                    address: e.target.value,
                  },
                })
              }
              className="w-full min-w-0 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
            />
          </div>
        )}

        {currentConfig.schoolHeader?.showLogo !== false && (
          <div className="col-span-1 sm:col-span-2 p-3 bg-slate-50/80 border border-light-border rounded-xl space-y-3">
            <div className="min-w-0">
              <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
                Logo URL or Path
              </label>
              <input
                type="text"
                value={currentConfig.schoolHeader?.logoUrl || ''}
                onChange={(e) =>
                  setCurrentConfig({
                    ...currentConfig,
                    schoolHeader: {
                      ...currentConfig.schoolHeader,
                      logoUrl: e.target.value,
                    },
                  })
                }
                className="w-full min-w-0 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
              />
            </div>

            {/* Logo Size (Height in px) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-dark-slate">
                <span className="flex items-center gap-1">
                  <i className="fas fa-up-right-and-down-left-from-center text-rose-500 text-[9px]" />
                  Logo Size (Height)
                </span>
                <span className="font-mono text-rose-600">
                  {currentConfig.schoolHeader?.logoSize ?? 48}px
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={140}
                step={2}
                value={currentConfig.schoolHeader?.logoSize ?? 48}
                onChange={(e) =>
                  setCurrentConfig((p) => ({
                    ...p,
                    schoolHeader: {
                      ...p.schoolHeader,
                      logoSize: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="flex items-center gap-1 justify-end flex-wrap">
                {[
                  { label: 'Compact (32px)', val: 32 },
                  { label: 'Standard (48px)', val: 48 },
                  { label: 'Large (64px)', val: 64 },
                  { label: 'XL (80px)', val: 80 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() =>
                      setCurrentConfig((p) => ({
                        ...p,
                        schoolHeader: {
                          ...p.schoolHeader,
                          logoSize: preset.val,
                        },
                      }))
                    }
                    className="px-1.5 py-0.5 text-[8.5px] font-bold bg-white hover:bg-slate-100 rounded text-dark-muted border border-light-border cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontal Position: Left / Center / Right */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-dark-muted">
                Horizontal Position
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  {
                    id: 'left',
                    label: 'Left',
                    icon: 'fa-align-left',
                  },
                  {
                    id: 'center',
                    label: 'Center',
                    icon: 'fa-align-center',
                  },
                  {
                    id: 'right',
                    label: 'Right',
                    icon: 'fa-align-right',
                  },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() =>
                      setCurrentConfig((p) => ({
                        ...p,
                        schoolHeader: {
                          ...p.schoolHeader,
                          logoAlign: pos.id,
                        },
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      (currentConfig.schoolHeader?.logoAlign || 'center') === pos.id
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-black shadow-2xs'
                        : 'bg-white border-light-border text-dark-muted hover:bg-slate-100'
                    }`}
                  >
                    <i className={`fas ${pos.icon} text-[9px]`} />
                    <span>{pos.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Position: Above / Inline / Below */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-dark-muted">
                Vertical Position (Relative to Text)
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  {
                    id: 'above',
                    label: 'Above Text',
                    icon: 'fa-arrow-up',
                  },
                  {
                    id: 'inline',
                    label: 'Inline / Beside',
                    icon: 'fa-columns',
                  },
                  {
                    id: 'below',
                    label: 'Below Text',
                    icon: 'fa-arrow-down',
                  },
                ].map((vpos) => (
                  <button
                    key={vpos.id}
                    type="button"
                    onClick={() =>
                      setCurrentConfig((p) => ({
                        ...p,
                        schoolHeader: {
                          ...p.schoolHeader,
                          logoVerticalAlign: vpos.id,
                        },
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      (currentConfig.schoolHeader?.logoVerticalAlign || 'above') === vpos.id
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-black shadow-2xs'
                        : 'bg-white border-light-border text-dark-muted hover:bg-slate-100'
                    }`}
                  >
                    <i className={`fas ${vpos.icon} text-[9px]`} />
                    <span>{vpos.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fine Vertical Offset (Y Offset in px) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-dark-slate">
                <span>Vertical Fine Offset (Y Offset)</span>
                <span className="font-mono text-rose-600">
                  {currentConfig.schoolHeader?.logoOffsetY ?? 0}px
                </span>
              </div>
              <input
                type="range"
                min={-30}
                max={30}
                step={1}
                value={currentConfig.schoolHeader?.logoOffsetY ?? 0}
                onChange={(e) =>
                  setCurrentConfig((p) => ({
                    ...p,
                    schoolHeader: {
                      ...p.schoolHeader,
                      logoOffsetY: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="flex items-center gap-1 justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentConfig((p) => ({
                      ...p,
                      schoolHeader: {
                        ...p.schoolHeader,
                        logoOffsetY: 0,
                      },
                    }))
                  }
                  className="px-1.5 py-0.5 text-[8.5px] font-bold bg-white hover:bg-slate-100 rounded text-dark-muted border border-light-border cursor-pointer"
                >
                  Reset 0px
                </button>
              </div>
            </div>
          </div>
        )}

        {currentConfig.schoolHeader?.showExamTitle !== false && (
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
              Exam Title Badge
            </label>
            <input
              type="text"
              value={currentConfig.schoolHeader?.examTitle || ''}
              onChange={(e) =>
                setCurrentConfig({
                  ...currentConfig,
                  schoolHeader: {
                    ...currentConfig.schoolHeader,
                    examTitle: e.target.value,
                  },
                })
              }
              className="w-full min-w-0 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolHeaderSettings;
