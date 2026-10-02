import React from 'react';

/**
 * DesignerHeader
 * Top bar: back button, title, mobile Config/Preview switcher, Cancel and Save buttons.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const DesignerHeader = ({ canEdit, handleSaveAll, mobileView, onClose, setMobileView }) => {
  return (
    <div className="px-4 sm:px-6 py-3.5 border-b border-light-border bg-slate-50/90 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl border border-light-border bg-white hover:bg-slate-100 text-xs font-bold text-dark-primary flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
          title="Return to Portal"
        >
          <i className="fas fa-arrow-left text-[11px] text-dark-muted" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shadow-2xs">
          <i className="fas fa-palette" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-black text-dark-primary tracking-tight flex items-center gap-2">
            <span>Report Card Designer</span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hidden md:inline">
              Administration & System
            </span>
          </h2>
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mobile view switcher (< lg) */}
        <div className="lg:hidden flex items-center bg-slate-200/80 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => setMobileView('config')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mobileView === 'config'
                ? 'bg-white text-rose-700 shadow-2xs'
                : 'text-dark-muted hover:text-dark-primary'
            }`}
          >
            Config
          </button>
          <button
            type="button"
            onClick={() => setMobileView('preview')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mobileView === 'preview'
                ? 'bg-white text-rose-700 shadow-2xs'
                : 'text-dark-muted hover:text-dark-primary'
            }`}
          >
            Live Preview
          </button>
        </div>

        {/* Cancel button */}
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-muted hover:bg-slate-100 transition-all cursor-pointer"
        >
          Cancel
        </button>

        {/* Save button / Read-Only indicator */}
        {canEdit ? (
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fas fa-check text-xs" />
            <span>Save Template</span>
          </button>
        ) : (
          <span
            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200 flex items-center gap-1.5"
            title="Read-only view. Edit permission requires report-card-designer-edit role access."
          >
            <i className="fas fa-lock text-[10px]" />
            <span>Read Only</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default DesignerHeader;
