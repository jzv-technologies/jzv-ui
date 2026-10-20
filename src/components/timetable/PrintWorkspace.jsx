// src/components/timetable/PrintWorkspace.jsx
/**
 * PrintWorkspace Component
 * One dialog showing print settings beside a live preview, mirroring the report card designer.
 * Supports printing either the generated timetable grid ('sheet') or the subview currently on
 * screen ('dom').
 */

import React from 'react';
import PrintConfigurationModal from '../PrintConfigurationModal';
import PrintSettingsPanel from './PrintSettingsPanel';
import PrintPreview from './PrintPreview';
import PrintDocument from './PrintDocument';
const mapHeaderLinesToPageHeaders = (lines, existingHeaders = []) => [
  ...(lines || []).map((line, index) => ({
    ...(existingHeaders.find((header) => header.id === line.id) || {}),
    id: line.id || `header-${index}`,
    label: line.label || `Header ${index + 1}`,
    type: 'text',
    text: line.text || '',
    fontSize: line.fontSize || 12,
    color: line.color || '#0f172a',
    bold: Boolean(line.bold),
    alignment: 'center',
    visible: line.visible !== false,
  })),
  ...existingHeaders.filter((header) => header.type === 'image'),
];

const mapPageHeadersToLines = (headers, existingLines = []) =>
  (headers || [])
    .filter((header) => header.type !== 'image')
    .map((header, index) => ({
      ...(existingLines.find((line) => line.id === header.id) || {}),
      id: header.id || `header-${index}`,
      label: header.label || `Header ${index + 1}`,
      text: header.text || '',
      fontSize: header.fontSize || 12,
      color: header.color || '#0f172a',
      bold: Boolean(existingLines.find((line) => line.id === header.id)?.bold),
      visible: header.visible !== false,
    }));

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
  allClassesData = null,
  title = 'Print Timetable',
  subtitle = null,
  domViewLabel = null,
}) => {
  if (!isOpen) return null;

  const isDomMode = mode === 'dom';
  // One page per class when that scope is chosen; the active view alone otherwise.
  const classDatasets =
    !isDomMode && settings?.printScope === 'all-classes' && allClassesData?.length
      ? allClassesData
      : null;
  const sheetCount = classDatasets?.length || 1;
  const contextData = classDatasets?.[0] || timetableData;
  const entityName = contextData?.entityName || '';
  const previewContext = {
    className: variant === 'teacher' ? '' : entityName,
    teacherName: variant === 'teacher' ? entityName : '',
    viewLabel: contextData?.viewLabel || (variant === 'teacher' ? 'Teacher View' : 'Class View'),
    timetableName: variant === 'teacher' ? 'Teacher Timetable' : 'Class Timetable',
  };

  const handleSettingsChange = (nextSettings) => {
    const next = { ...nextSettings };
    const pageHeadersChanged =
      JSON.stringify(next.pageHeaders) !== JSON.stringify(settings?.pageHeaders);
    const headerLinesChanged =
      JSON.stringify(next.headerLines) !== JSON.stringify(settings?.headerLines);
    if (headerLinesChanged && !pageHeadersChanged) {
      next.pageHeaders = mapHeaderLinesToPageHeaders(next.headerLines, settings?.pageHeaders);
    } else if (pageHeadersChanged) {
      next.headerLines = mapPageHeadersToLines(next.pageHeaders, settings?.headerLines);
    }

    const pageFooterChanged =
      JSON.stringify(next.pageFooter) !== JSON.stringify(settings?.pageFooter);
    if (next.footerText !== settings?.footerText && !pageFooterChanged) {
      next.pageFooter = {
        ...next.pageFooter,
        text: next.footerText || '',
        visible: Boolean(next.footerText),
      };
    } else if (pageFooterChanged) {
      next.footerText = next.pageFooter?.text || '';
    }

    const tableHeaderChanged =
      JSON.stringify(next.tableHeader) !== JSON.stringify(settings?.tableHeader);
    if (next.showHeaders !== settings?.showHeaders && !tableHeaderChanged) {
      next.tableHeader = { ...next.tableHeader, visible: next.showHeaders };
    } else if (tableHeaderChanged) {
      next.showHeaders = next.tableHeader?.visible !== false;
    }

    const tableStyleChanged =
      JSON.stringify(next.tableStyle) !== JSON.stringify(settings?.tableStyle);
    if (next.showGridLines !== settings?.showGridLines && !tableStyleChanged) {
      next.tableStyle = { ...next.tableStyle, showBorders: next.showGridLines };
    } else if (tableStyleChanged) {
      next.showGridLines = next.tableStyle?.showBorders !== false;
    }

    onSettingsChange(next);
  };

  return (
    <>
      <PrintConfigurationModal
        isOpen={isOpen}
        onClose={onClose}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onReset={onReset}
        onPrint={() => onPrint(mode)}
        title={subtitle ? `${title} - ${subtitle}` : title}
        previewContext={previewContext}
        exclusiveContent={
          <PrintSettingsPanel
            settings={settings}
            onChange={handleSettingsChange}
            onReset={onReset}
            timetableData={timetableData}
            isDomMode={isDomMode}
            variant={variant}
            classCount={allClassesData?.length || 0}
            exclusiveOnly
          />
        }
        previewContent={
          isDomMode ? (
            <div className="p-6 sm:p-10 flex items-start justify-center">
              <div className="max-w-lg w-full rounded-2xl border border-light-border bg-white p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl mb-3">
                  <i className="fas fa-print" />
                </div>
                <h4 className="text-sm font-black text-dark-primary">Printing the current view</h4>
                <p className="text-xs font-semibold text-dark-soft mt-2">
                  This prints
                  {domViewLabel ? (
                    <span className="font-black text-dark-primary"> {domViewLabel} </span>
                  ) : (
                    ' the subview currently on screen '
                  )}
                  exactly as displayed. Use the Exclusive tab to filter days and periods.
                </p>
              </div>
            </div>
          ) : (
            <PrintPreview
              timetableData={timetableData}
              datasets={classDatasets}
              settings={settings}
              variant={variant}
            />
          )
        }
      />
      {/* Print-only document, mounted outside the app tree */}
      {isOpen && !isDomMode && (
        <PrintDocument
          timetableData={timetableData}
          datasets={classDatasets}
          settings={settings}
          variant={variant}
        />
      )}
      {classDatasets && isOpen && (
        <span className="sr-only" aria-live="polite">
          {sheetCount} classes, one page each
        </span>
      )}
    </>
  );
};

export default PrintWorkspace;
