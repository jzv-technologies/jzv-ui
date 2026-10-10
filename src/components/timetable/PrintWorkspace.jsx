// src/components/timetable/PrintWorkspace.jsx
/**
 * PrintWorkspace Component
 * One dialog showing print settings beside a live preview, mirroring the report card designer.
 * Supports printing either the generated timetable grid ('sheet') or the subview currently on
 * screen ('dom').
 */

import React from 'react';
import PrintSettingsPanel from './PrintSettingsPanel';
import PrintPreview from './PrintPreview';
import PrintDocument from './PrintDocument';

const PrintWorkspace = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onReset,
  onPrint,
  mode = 'sheet',
  variant = 'class',
  timetableData,
  title = 'Print Timetable',
  subtitle = null,
  domViewLabel = null,
}) => {
  if (!isOpen) return null;

  const isDomMode = mode === 'dom';

  return (
    <div className="print-workspace-overlay fixed inset-0 bg-dark-almostblack/50 backdrop-blur-sm z-[80] flex items-center justify-center p-2 sm:p-4">
      <div className="print-workspace-shell bg-white rounded-2xl sm:rounded-3xl border border-light-border shadow-2xl w-full max-w-[1400px] h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-brand-primary px-4 sm:px-6 py-3 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-80 block">
              Print Configuration
            </span>
            <h3 className="text-base sm:text-lg font-bold truncate">
              {title}
              {subtitle ? <span className="opacity-80 font-semibold"> - {subtitle}</span> : null}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              title="Back to the timetable"
            >
              <i className="fas fa-arrow-left" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <button
              type="button"
              onClick={() => onPrint(mode)}
              className="px-4 py-2 bg-white text-brand-primary hover:bg-light-bg rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <i className="fas fa-print" />
              Print
            </button>
          </div>
        </div>

        {/* Side-by-side body */}
        <div className="print-workspace-body flex-1 min-h-0 flex flex-col lg:flex-row">
          <div className="print-workspace-settings w-full lg:w-[380px] lg:max-w-[380px] border-b lg:border-b-0 lg:border-r border-light-border flex flex-col min-h-0 max-h-[45vh] lg:max-h-none">
            <PrintSettingsPanel
              settings={settings}
              onChange={onSettingsChange}
              onReset={onReset}
              timetableData={timetableData}
              isDomMode={isDomMode}
            />
          </div>

          <div className="print-workspace-preview flex-1 min-h-0 overflow-auto">
            {isDomMode ? (
              <div className="p-6 sm:p-10 flex items-start justify-center">
                <div className="max-w-lg w-full rounded-2xl border border-light-border bg-white p-6 text-center">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl mb-3">
                    <i className="fas fa-print" />
                  </div>
                  <h4 className="text-sm font-black text-dark-primary">
                    Printing the current view
                  </h4>
                  <p className="text-xs font-semibold text-dark-soft mt-2">
                    This prints
                    {domViewLabel ? (
                      <span className="font-black text-dark-primary"> {domViewLabel} </span>
                    ) : (
                      ' the subview currently on screen '
                    )}
                    exactly as displayed. Page size, orientation, margins and grid lines apply, and
                    the days and periods filters trim the printed rows and columns.
                  </p>
                </div>
              </div>
            ) : (
              <PrintPreview
                timetableData={timetableData}
                settings={settings}
                variant={variant}
              />
            )}
          </div>
        </div>
      </div>

      {/* Print-only document, mounted outside the app tree */}
      {isOpen && !isDomMode && (
        <PrintDocument
          timetableData={timetableData}
          settings={settings}
          variant={variant}
        />
      )}
    </div>
  );
};

export default PrintWorkspace;
