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
export const usePrintSettings = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (err) {
      console.warn('Failed to load print settings:', err);
    }
    return DEFAULT_PRINT_SETTINGS;
  });

  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to save print settings:', err);
    }
  }, [settings]);

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => ({ ...prev, ...(updates || {}) }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_PRINT_SETTINGS);
  }, []);

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
