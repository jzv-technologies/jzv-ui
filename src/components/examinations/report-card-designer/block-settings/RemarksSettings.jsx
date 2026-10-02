import React from 'react';
import MultiSelectDropdown from '../../../MultiSelectDropdown';

/**
 * RemarksSettings
 * Block-specific settings for the teacher remarks block.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const RemarksSettings = ({ currentConfig, setCurrentConfig }) => {
  return (
    <div className="space-y-3">
      <div className="max-w-md">
        <MultiSelectDropdown
          label="Details to Display"
          placeholder="Select remarks options..."
          options={[
            {
              id: 'showRecommendations',
              label: 'Recommendations & Action Plan Line',
            },
            {
              id: 'showSignatureLine',
              label: 'Teacher Signature & Date Line',
            },
            {
              id: 'showPromotion',
              label: 'Promotion / Next Class Eligibility Line',
            },
          ]}
          selected={[
            currentConfig.remarksConfig?.showRecommendations !== false
              ? 'showRecommendations'
              : null,
            currentConfig.remarksConfig?.showSignatureLine ? 'showSignatureLine' : null,
            currentConfig.remarksConfig?.showPromotion ? 'showPromotion' : null,
          ].filter(Boolean)}
          onChange={(selectedIds) => {
            const arr = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
            setCurrentConfig((prev) => ({
              ...prev,
              remarksConfig: {
                ...prev.remarksConfig,
                showRecommendations: arr.includes('showRecommendations'),
                showSignatureLine: arr.includes('showSignatureLine'),
                showPromotion: arr.includes('showPromotion'),
              },
            }));
          }}
          icon="fa-comment-dots"
          fullWidth={true}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="min-w-0">
          <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
            Section Heading
          </label>
          <input
            type="text"
            value={currentConfig.remarksConfig?.title || "Teacher's Remarks"}
            onChange={(e) =>
              setCurrentConfig({
                ...currentConfig,
                remarksConfig: {
                  ...currentConfig.remarksConfig,
                  title: e.target.value,
                },
              })
            }
            className="w-full min-w-0 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
          />
        </div>
        <div className="min-w-0">
          <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
            Default Remarks Text
          </label>
          <input
            type="text"
            value={currentConfig.remarksText || currentConfig.remarksConfig?.defaultRemarks || ''}
            onChange={(e) =>
              setCurrentConfig({
                ...currentConfig,
                remarksText: e.target.value,
                remarksConfig: {
                  ...currentConfig.remarksConfig,
                  defaultRemarks: e.target.value,
                },
              })
            }
            className="w-full min-w-0 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
          />
        </div>
      </div>

      {currentConfig.remarksConfig?.showRecommendations !== false && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
              Recommendations Heading
            </label>
            <input
              type="text"
              value={
                currentConfig.remarksConfig?.recommendationsTitle || 'Recommendations & Action Plan'
              }
              onChange={(e) =>
                setCurrentConfig({
                  ...currentConfig,
                  remarksConfig: {
                    ...currentConfig.remarksConfig,
                    recommendationsTitle: e.target.value,
                  },
                })
              }
              className="w-full min-w-0 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
              Default Recommendations Text
            </label>
            <input
              type="text"
              value={currentConfig.remarksConfig?.defaultRecommendations || ''}
              onChange={(e) =>
                setCurrentConfig({
                  ...currentConfig,
                  remarksConfig: {
                    ...currentConfig.remarksConfig,
                    defaultRecommendations: e.target.value,
                  },
                })
              }
              placeholder="e.g. Continue consistent revision and active class participation."
              className="w-full min-w-0 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RemarksSettings;
