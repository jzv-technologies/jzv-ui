import React from 'react';
import MultiSelectDropdown from '../../../MultiSelectDropdown';

/**
 * SignaturesSettings
 * Block-specific settings for the footer signatures.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const SignaturesSettings = ({ currentConfig, setCurrentConfig }) => {
  const sigCfg = currentConfig.signaturesConfig || {};
  const isSig1 = !!sigCfg.showSignature1;
  const isSig2 = !!sigCfg.showSignature2;
  const isSig3 = !!sigCfg.showSignature3;
  const isSig4 = !!sigCfg.showSignature4;
  const activeCount = [isSig1, isSig2, isSig3, isSig4].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="max-w-md">
        <MultiSelectDropdown
          label="Details to Display"
          placeholder="Select signature lines to display..."
          options={[
            { id: 'signature1', label: 'Signature 1' },
            { id: 'signature2', label: 'Signature 2' },
            { id: 'signature3', label: 'Signature 3' },
            { id: 'signature4', label: 'Signature 4' },
          ]}
          selected={[
            isSig1 ? 'signature1' : null,
            isSig2 ? 'signature2' : null,
            isSig3 ? 'signature3' : null,
            isSig4 ? 'signature4' : null,
          ].filter(Boolean)}
          onChange={(selectedIds) => {
            const arr = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
            setCurrentConfig((prev) => ({
              ...prev,
              signaturesConfig: {
                ...prev.signaturesConfig,
                showSignature1: arr.includes('signature1'),
                showSignature2: arr.includes('signature2'),
                showSignature3: arr.includes('signature3'),
                showSignature4: arr.includes('signature4'),
              },
            }));
          }}
          icon="fa-file-signature"
          fullWidth={true}
        />
      </div>

      {/* Custom Signature Titles: ONLY VISIBLE WHEN SELECTED */}
      {activeCount > 0 && (
        <div
          className={`grid gap-3 pt-1 ${
            activeCount === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {isSig1 && (
            <div>
              <label className="block text-[11px] font-bold text-dark-slate mb-1">
                Signature 1 Title
              </label>
              <input
                type="text"
                value={currentConfig.signatures?.signature1 ?? 'Signature 1'}
                onChange={(e) =>
                  setCurrentConfig({
                    ...currentConfig,
                    signatures: {
                      ...currentConfig.signatures,
                      signature1: e.target.value,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                placeholder="e.g. Class Teacher"
              />
            </div>
          )}
          {isSig2 && (
            <div>
              <label className="block text-[11px] font-bold text-dark-slate mb-1">
                Signature 2 Title
              </label>
              <input
                type="text"
                value={currentConfig.signatures?.signature2 ?? 'Signature 2'}
                onChange={(e) =>
                  setCurrentConfig({
                    ...currentConfig,
                    signatures: {
                      ...currentConfig.signatures,
                      signature2: e.target.value,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                placeholder="e.g. Academic Coordinator"
              />
            </div>
          )}
          {isSig3 && (
            <div>
              <label className="block text-[11px] font-bold text-dark-slate mb-1">
                Signature 3 Title
              </label>
              <input
                type="text"
                value={currentConfig.signatures?.signature3 ?? 'Signature 3'}
                onChange={(e) =>
                  setCurrentConfig({
                    ...currentConfig,
                    signatures: {
                      ...currentConfig.signatures,
                      signature3: e.target.value,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                placeholder="e.g. Principal"
              />
            </div>
          )}
          {isSig4 && (
            <div>
              <label className="block text-[11px] font-bold text-dark-slate mb-1">
                Signature 4 Title
              </label>
              <input
                type="text"
                value={currentConfig.signatures?.signature4 ?? 'Signature 4'}
                onChange={(e) =>
                  setCurrentConfig({
                    ...currentConfig,
                    signatures: {
                      ...currentConfig.signatures,
                      signature4: e.target.value,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
                placeholder="e.g. Parent / Guardian"
              />
            </div>
          )}
        </div>
      )}

      {/* Page Printing Rules & Preserve Block Space */}
      <div className="pt-3 border-t border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-dark-slate mb-1">
              Print on Pages
            </label>
            <select
              value={currentConfig.signaturesConfig?.printPages || 'everyPage'}
              onChange={(e) =>
                setCurrentConfig((prev) => ({
                  ...prev,
                  signaturesConfig: {
                    ...prev.signaturesConfig,
                    printPages: e.target.value,
                  },
                }))
              }
              className="w-full min-w-0 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-slate cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="firstPage">First Page</option>
              <option value="everyPage">Every Page</option>
              <option value="oddPage">Odd Page</option>
              <option value="evenPage">Even Page</option>
              <option value="lastPage">Last Page</option>
            </select>
            <p className="text-[10px] text-dark-muted mt-1">
              Controls which pages or records will print footer signatures.
            </p>
          </div>

          <div className="min-w-0 sm:pt-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!currentConfig.signaturesConfig?.preserveSpace}
                onChange={(e) =>
                  setCurrentConfig((prev) => ({
                    ...prev,
                    signaturesConfig: {
                      ...prev.signaturesConfig,
                      preserveSpace: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 accent-rose-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-dark-slate">
                Preserve Block Space
              </span>
            </label>
            <p className="text-[10px] text-dark-muted mt-1 ml-6">
              When selected, block space is reserved. When unchecked, other components can use that space.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignaturesSettings;
