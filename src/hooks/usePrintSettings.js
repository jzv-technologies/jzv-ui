// src/hooks/usePrintSettings.js
/**
 * React Hook for Print Settings Management
 */

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_PRINT_SETTINGS } from '../types/print-settings';
import { injectPrintCSS, removePrintCSS } from '../utils/printUtils';

const STORAGE_KEY = 'jzv_timetable_print_settings';

/**
 * Custom hook for managing print settings
 * @returns {Object} Print settings state and actions
 */
export const usePrintSettings = (storageKey = STORAGE_KEY, defaults = DEFAULT_PRINT_SETTINGS) => {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const pageHeaders = parsed.headerLines?.length
          ? parsed.headerLines.map((line, index) => ({
              id: line.id || `header-${index}`,
              label: line.label || `Header ${index + 1}`,
              type: 'text',
              text:
                line.text === 'JAMIA ZAYTOONAH VELLORE'
                  ? ''
                  : line.text || '',
              imageUrl: '',
              fontSize: line.fontSize || 12,
              color: line.color || '#0f172a',
              bold: Boolean(line.bold),
              alignment: 'center',
              imageSize: 80,
              imageSizing: 'ratio',
              imageHeight: 20,
              imagePosition: 'center',
              visible: line.visible !== false,
            }))
          : parsed.pageHeaders || defaults.pageHeaders;
        const normalizedPageHeaders = pageHeaders.map((header) => ({
          imageSizing: 'ratio',
          imageHeight: 20,
          ...header,
          text:
            ['JAMIA ZAYTOONAH VELLORE', '{timetableName}', '{className}{teacherName}'].includes(
              header.text
            )
              ? ''
              : header.text,
        }));
        return {
          ...defaults,
          ...parsed,
          tableHeader: {
            ...defaults.tableHeader,
            ...parsed.tableHeader,
            visible: parsed.showHeaders ?? parsed.tableHeader?.visible ?? defaults.tableHeader.visible,
          },
          tableStyle: {
            ...defaults.tableStyle,
            ...parsed.tableStyle,
            showBorders:
              parsed.showGridLines ?? parsed.tableStyle?.showBorders ?? defaults.tableStyle.showBorders,
          },
          pageHeaders: normalizedPageHeaders,
          pageFooter: {
            ...defaults.pageFooter,
            ...parsed.pageFooter,
            text: parsed.footerText ?? parsed.pageFooter?.text ?? defaults.pageFooter.text,
          },
        };
      }
    } catch (err) {
      console.warn('Failed to load print settings:', err);
    }
    return defaults;
  });

  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to save print settings:', err);
    }
  }, [settings, storageKey]);

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => ({ ...prev, ...(updates || {}) }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaults);
  }, [defaults]);

  const openPrint = useCallback(() => setIsPrintOpen(true), []);
  const closePrint = useCallback(() => setIsPrintOpen(false), []);

  const triggerPrint = useCallback(
    (mode = 'sheet') => {
      // The print document stays mounted, so the mode-aware CSS drives what is printed.
      injectPrintCSS(settings, mode);
      window.addEventListener('afterprint', removePrintCSS, { once: true });
      window.print();
    },
    [settings]
  );

  return {
    settings,
    updateSettings,
    resetSettings,
    isPrintOpen,
    openPrint,
    closePrint,
    triggerPrint,
  };
};

export default usePrintSettings;
