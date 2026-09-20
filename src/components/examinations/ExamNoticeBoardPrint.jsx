// src/components/examinations/ExamNoticeBoardPrint.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { formatDateDisplay, generateDateRange, normalizeDateStr } from '../../utils/dateUtils';
import { getAdminConfig, saveAdminConfig } from '../../utils/adminConfigUtils';
import { showToast } from '../../utils/toast';
import MultiSelectDropdown from '../MultiSelectDropdown';

const CONFIG_KEY = 'exam_notice_board_config';

/**
 * Notice Board Printable View
 * Allows selecting multiple classes and rendering a high-contrast, professional
 * examination schedule table designed specifically for notice board printing.
 */
const ExamNoticeBoardPrint = ({
  schedule,
  sessions = [],
  classes = [],
  subjects = [],
  teachers = [],
  slots = [],
  viewMode: controlledViewMode,
  onViewModeChange,
  printOrientation: controlledPrintOrientation,
  onPrintOrientationChange,
  selectedClassIds: controlledClassIds,
  onSelectClassIds,
  showConfigModal: controlledShowConfigModal,
  onCloseConfigModal,
  hideHeader = false,
}) => {
  // Selection state for classes to print - using array for MultiSelectDropdown
  const [internalSelectedClassIds, setInternalSelectedClassIds] = useState(
    () => classes.map((c) => String(c.id))
  );
  const selectedClassIds = controlledClassIds !== undefined ? controlledClassIds : internalSelectedClassIds;
  const setSelectedClassIds = onSelectClassIds || setInternalSelectedClassIds;

  const [internalViewMode, setInternalViewMode] = useState('table'); // 'table' | 'scheduler' | 'class-cards'
  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;
  const setViewMode = onViewModeChange || setInternalViewMode;

  const [internalPrintOrientation, setInternalPrintOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const printOrientation = controlledPrintOrientation !== undefined ? controlledPrintOrientation : internalPrintOrientation;
  const setPrintOrientation = onPrintOrientationChange || setInternalPrintOrientation;

  // Gear icon config modal state
  const [internalShowConfigModal, setInternalShowConfigModal] = useState(false);
  const showConfigModal = controlledShowConfigModal !== undefined ? controlledShowConfigModal : internalShowConfigModal;
  const setShowConfigModal = (val) => {
    if (!val && onCloseConfigModal) {
      onCloseConfigModal();
    }
    setInternalShowConfigModal(val);
  };

  const [noticeBoardConfig, setNoticeBoardConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Load saved config strictly via RPC call with local cache fallback
  useEffect(() => {
    const loadConfig = async () => {
      const defaultConfig = {
        headerColor: '#1e293b', // slate-900
        headerTextColor: '#ffffff', // header font color
        fontSize: '11px',
        rowHeight: '28px',
        border: true,
        bandedRow: true,
        bandedColumn: false,
        columnWidth: 'auto',
        primaryFontColor: '#1e293b',
        secondaryFontColor: '#64748b',
        headerText: 'Jamia Zaytoonah',
        headerImage: '',
      };

      try {
        const data = await getAdminConfig(CONFIG_KEY, defaultConfig);
        setNoticeBoardConfig(data || defaultConfig);
      } catch (err) {
        console.warn('[ExamNoticeBoardPrint] Remote config fetch fallback:', err?.message);
        setNoticeBoardConfig(defaultConfig);
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async (config) => {
    try {
      setNoticeBoardConfig(config);
      const success = await saveAdminConfig(CONFIG_KEY, config);
      if (success) {
        showToast('Configuration saved successfully', 'success');
      } else {
        showToast('Configuration saved to local cache', 'info');
      }
    } catch (err) {
      setNoticeBoardConfig(config);
      showToast('Saved locally: ' + err.message, 'warning');
    }
  };

  // Sync initial selection if classes load asynchronously
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && classes.length > 0 && selectedClassIds.length === 0) {
      setSelectedClassIds(classes.map((c) => String(c.id)));
      initializedRef.current = true;
    }
  }, [classes, selectedClassIds.length]);

  const selectedClassesList = useMemo(() => {
    return classes.filter((c) => selectedClassIds.includes(String(c.id)));
  }, [classes, selectedClassIds]);

  // Chronologically sorted sessions
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.sort_order !== undefined && b.sort_order !== undefined) {
        return a.sort_order - b.sort_order;
      }
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
  }, [sessions]);

  // Unique exam dates sorted chronologically with normalized YYYY-MM-DD
  const examDates = useMemo(() => {
    const dates = new Set();
    slots.forEach((s) => {
      const d = normalizeDateStr(s.exam_date);
      if (d) dates.add(d);
    });
    return Array.from(dates).sort((a, b) => a.localeCompare(b));
  }, [slots]);

  // Inclusive date range matching Scheduler view
  const schedulerDates = useMemo(() => {
    if (schedule?.start_date && schedule?.end_date) {
      const sStart = normalizeDateStr(schedule.start_date);
      const sEnd = normalizeDateStr(schedule.end_date);
      const range = generateDateRange(sStart, sEnd);
      if (range && range.length > 0) return range;
    }
    return examDates;
  }, [schedule, examDates]);

  // Lookup maps
  const subjectMap = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      map[String(s.id)] = s.name;
    });
    return map;
  }, [subjects]);

  const teacherMap = useMemo(() => {
    const map = {};
    teachers.forEach((t) => {
      map[String(t.id)] = t.name;
    });
    return map;
  }, [teachers]);

  // Multi-key index for instant slot lookup: `date__sessionId__classId`
  const slotMatrix = useMemo(() => {
    const matrix = {};
    slots.forEach((slot) => {
      const d = normalizeDateStr(slot.exam_date);
      const key = `${d}__${slot.session_id}__${slot.class_id}`;
      matrix[key] = slot;
    });
    return matrix;
  }, [slots]);

  const handlePrint = () => {
    window.print();
  };


  return (
    <div className={hideHeader ? '' : '-mx-4 sm:-mx-6 -mt-4 sm:-mt-6'}>
      {/* Print Controls Header (Hidden when printing or when hideHeader is true) */}
      {!hideHeader && (
        <div className="print:hidden w-full bg-white border-b border-light-border rounded-none px-4 sm:px-6 py-2.5 sticky top-[88px] sm:top-[96px] z-20 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left side: Icon, Title & View Mode Tabs */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-base shadow-2xs shrink-0">
              <i className="fas fa-print" />
            </div>
            <div>
              <h2 className="text-base font-black text-dark-primary tracking-tight leading-tight">
                Notice Board Printout
              </h2>
              <p className="text-[11px] font-semibold text-dark-muted hidden sm:block">
                Multi-class printable timetable formatted for school notice boards
              </p>
            </div>

            {/* View Mode Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 ml-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white text-purple-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Consolidated Table Matrix"
              >
                <i className="fas fa-table-cells mr-1" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('scheduler')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'scheduler' ? 'bg-white text-purple-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Class Schedule"
              >
                <i className="fas fa-calendar-week mr-1" />
                <span className="hidden sm:inline">Schedule</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('class-cards')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'class-cards' ? 'bg-white text-purple-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Class Cards"
              >
                <i className="fas fa-id-card mr-1" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>
          </div>

          {/* Right side: Class Filter, Orientation, Gear Config, and Print Button all on the above line */}
          <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
            {/* Class Filter */}
            <div className="min-w-[160px] max-w-[220px]">
              <MultiSelectDropdown
                label="Classes"
                options={classes.map((c) => ({ id: c.id, label: c.name }))}
                selected={selectedClassIds}
                onChange={setSelectedClassIds}
                placeholder="Select classes..."
                fullWidth={false}
              />
            </div>

            {/* Print Orientation Selector */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setPrintOrientation('landscape')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  printOrientation === 'landscape'
                    ? 'bg-white text-purple-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Print Landscape"
              >
                <i className="fas fa-file-lines text-xs fa-rotate-270" />
                <span className="hidden sm:inline">Landscape</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation('portrait')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  printOrientation === 'portrait'
                    ? 'bg-white text-purple-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Print Portrait"
              >
                <i className="fas fa-file-lines text-xs" />
                <span className="hidden sm:inline">Portrait</span>
              </button>
            </div>

            {/* Gear Icon for Config */}
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
              title="Notice Board Design Settings"
            >
              <i className="fas fa-cog text-xs" />
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={selectedClassIds.length === 0 || configLoading}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <i className="fas fa-print text-xs" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-light-border bg-slate-50/50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-base font-bold text-dark-primary">Notice Board Design Settings</h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Header Background Color */}
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">Header Background Color</label>
                  <input
                    type="color"
                    value={noticeBoardConfig?.headerColor || '#1e293b'}
                    onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, headerColor: e.target.value})}
                    className="w-full h-10 rounded-xl border border-light-border cursor-pointer"
                  />
                </div>
                {/* Header Font Color */}
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">Header Font Color</label>
                  <input
                    type="color"
                    value={noticeBoardConfig?.headerTextColor || '#ffffff'}
                    onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, headerTextColor: e.target.value})}
                    className="w-full h-10 rounded-xl border border-light-border cursor-pointer"
                  />
                </div>
                {/* Font Size */}
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">Font Size</label>
                  <select
                    value={noticeBoardConfig?.fontSize || '11px'}
                    onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, fontSize: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="10px">10px</option>
                    <option value="11px">11px</option>
                    <option value="12px">12px</option>
                    <option value="13px">13px</option>
                    <option value="14px">14px</option>
                  </select>
                </div>
                {/* Row Height */}
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">Row Height</label>
                  <select
                    value={noticeBoardConfig?.rowHeight || '28px'}
                    onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, rowHeight: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="24px">24px</option>
                    <option value="28px">28px</option>
                    <option value="32px">32px</option>
                    <option value="36px">36px</option>
                    <option value="40px">40px</option>
                  </select>
                </div>
                {/* Column Width */}
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">Column Width</label>
                  <select
                    value={noticeBoardConfig?.columnWidth || 'auto'}
                    onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, columnWidth: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="auto">Auto</option>
                    <option value="120px">120px</option>
                    <option value="140px">140px</option>
                    <option value="160px">160px</option>
                    <option value="180px">180px</option>
                  </select>
                </div>
                {/* Primary Font Color */}
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">Primary Font Color</label>
                  <input
                    type="color"
                    value={noticeBoardConfig?.primaryFontColor || '#1e293b'}
                    onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, primaryFontColor: e.target.value})}
                    className="w-full h-10 rounded-xl border border-light-border cursor-pointer"
                  />
                </div>
                {/* Secondary Font Color */}
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">Secondary Font Color</label>
                  <input
                    type="color"
                    value={noticeBoardConfig?.secondaryFontColor || '#64748b'}
                    onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, secondaryFontColor: e.target.value})}
                    className="w-full h-10 rounded-xl border border-light-border cursor-pointer"
                  />
                </div>
                {/* Header Text */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-dark-slate mb-1">Header Text</label>
                  <input
                    type="text"
                    value={noticeBoardConfig?.headerText || 'Jamia Zaytoonah'}
                    onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, headerText: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                {/* Header Image URL */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-dark-slate mb-1">Header Image URL (optional)</label>
                  <input
                    type="text"
                    value={noticeBoardConfig?.headerImage || ''}
                    onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, headerImage: e.target.value})}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Toggle Options */}
              <div className="border-t border-light-border pt-4">
                <h4 className="text-xs font-bold text-dark-slate uppercase tracking-wider mb-3">Table Style Options</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeBoardConfig?.border !== false}
                      onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, border: e.target.checked})}
                      className="rounded border-light-border text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-bold text-dark-primary">Border</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeBoardConfig?.bandedRow !== false}
                      onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, bandedRow: e.target.checked})}
                      className="rounded border-light-border text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-bold text-dark-primary">Banded Row</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeBoardConfig?.bandedColumn === true}
                      onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, bandedColumn: e.target.checked})}
                      className="rounded border-light-border text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-bold text-dark-primary">Banded Column</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeBoardConfig?.headerImage !== '' && noticeBoardConfig?.headerImage !== undefined}
                      onChange={(e) => setNoticeBoardConfig({...noticeBoardConfig, showHeaderImage: e.target.checked})}
                      className="rounded border-light-border text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-bold text-dark-primary">Header Image</span>
                  </label>
                </div>
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex justify-end gap-3 border-t border-light-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveConfig(noticeBoardConfig)}
                  disabled={configLoading}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-700 text-white hover:bg-purple-800 transition-all disabled:opacity-50"
                >
                  {configLoading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content wrapper with body padding */}
      <div className={hideHeader ? 'space-y-4' : 'px-4 sm:px-6 pt-4 space-y-4'}>
        {/* Printable Area */}
        <div
        className={`print:m-0 print:p-0 bg-white rounded-2xl border border-light-border p-6 sm:p-8 shadow-sm space-y-6 print:border-none print:shadow-none ${
          printOrientation === 'portrait' ? 'print-portrait max-w-4xl mx-auto' : 'print-landscape'
        }`}
        style={{
          '--header-color': noticeBoardConfig?.headerColor || '#1e293b',
          '--font-size': noticeBoardConfig?.fontSize || '11px',
          '--row-height': noticeBoardConfig?.rowHeight || '28px',
          '--primary-font-color': noticeBoardConfig?.primaryFontColor || '#1e293b',
          '--secondary-font-color': noticeBoardConfig?.secondaryFontColor || '#64728b',
          '--column-width': noticeBoardConfig?.columnWidth || 'auto',
        }}
      >
        {/* Printable Official Header */}
        <div className="text-center border-b-2 border-black pb-4 print:pb-2">
          {noticeBoardConfig?.headerImage && (
            <img
              src={noticeBoardConfig.headerImage}
              alt="Header"
              className="mx-auto mb-2 max-h-16"
              style={{ maxHeight: '60px' }}
            />
          )}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase" style={{ color: noticeBoardConfig?.headerColor || '#1e293b' }}>
            {noticeBoardConfig?.headerText || 'Jamia Zaytoonah'}
          </h1>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-700 mt-0.5">
            <strong className="uppercase">
              {schedule?.name || '______________________ Examination'}
            </strong>
          </p>
        </div>

        {selectedClassesList.length === 0 ? (
          <div className="text-center py-12 text-dark-muted text-xs font-bold">
            No classes selected. Please select at least one class from the filter above.
          </div>
        ) : schedulerDates.length === 0 && examDates.length === 0 ? (
          <div className="text-center py-12 text-dark-muted text-xs font-bold">
            No exam dates scheduled yet for this examination.
          </div>
        ) : viewMode === 'scheduler' ? (
          /* Scheduler View: Displayed like the Scheduler with dark headings and banded rows */
          <div className="space-y-6">
            {selectedClassesList.map((cls) => {
              const classSlots = slots.filter((s) => String(s.class_id) === String(cls.id));

              return (
                <div
                  key={cls.id}
                  className="sched-table-card border-2 border-slate-900 rounded-xl overflow-hidden shadow-xs bg-white break-inside-avoid"
                >
                  {/* Dark Header Banner for Class */}
                  <div className="sched-dark-header bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-slate-800 text-slate-200 flex items-center justify-center text-xs font-bold">
                        <i className="fas fa-chalkboard" />
                      </div>
                      <h3 className="font-black text-sm uppercase tracking-wide text-white">
                        {cls.name}
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      {classSlots.length} Papers Scheduled
                    </span>
                  </div>

                  {/* Table with dark header and banded rows */}
                  <div className="overflow-x-auto">
                    <table 
                      className="w-full text-left border-collapse" 
                      style={{ 
                        fontSize: noticeBoardConfig?.fontSize || '11px',
                        borderCollapse: noticeBoardConfig?.border !== false ? 'collapse' : 'separate',
                        borderSpacing: 0,
                      }}
                    >
                      <thead className="sched-dark-header">
                        <tr className="border-b-2" style={{ 
                          backgroundColor: noticeBoardConfig?.headerColor || '#1e293b',
                          color: noticeBoardConfig?.headerTextColor || '#ffffff',
                          borderColor: noticeBoardConfig?.border !== false ? '#334155' : 'transparent',
                        }}>
                          <th 
                            className="py-2.5 px-3 text-left font-black uppercase text-[11px] tracking-wider" 
                            style={{ 
                              border: noticeBoardConfig?.border !== false ? '1px solid #334155' : 'none',
                              width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                              minWidth: '120px',
                              color: noticeBoardConfig?.headerTextColor || '#ffffff',
                            }}
                          >
                            Date & Day
                          </th>
                          {sortedSessions.map((sess) => (
                            <th
                              key={sess.id}
                              className="py-2.5 px-3 text-center font-black uppercase text-[11px] tracking-wider"
                              style={{ 
                                border: noticeBoardConfig?.border !== false ? '1px solid #334155' : 'none',
                                width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                                minWidth: '130px',
                                color: noticeBoardConfig?.headerTextColor || '#ffffff',
                              }}
                            >
                              <div className="font-black" style={{ color: noticeBoardConfig?.headerTextColor || '#ffffff' }}>{sess.name}</div>
                              {sess.start_time && (
                                <div className="text-[10px] font-normal opacity-80 normal-case mt-0.5" style={{ color: noticeBoardConfig?.headerTextColor || '#ffffff' }}>
                                  {sess.start_time.slice(0, 5)} – {sess.end_time?.slice(0, 5)}
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {schedulerDates.map((dateStr, rIdx) => {
                          const dayName = formatDateDisplay(dateStr, { weekday: 'short' });
                          const formattedDate = formatDateDisplay(dateStr, {
                            month: 'short',
                            day: 'numeric',
                          });
                          const isOdd = rIdx % 2 === 1;
                          const showBandedRow = noticeBoardConfig?.bandedRow !== false;
                          const showBandedColumn = noticeBoardConfig?.bandedColumn === true;

                          return (
                            <tr
                              key={dateStr}
                              className="transition-colors"
                              style={{
                                backgroundColor: showBandedRow && isOdd ? '#f1f5f9' : '#ffffff',
                                height: noticeBoardConfig?.rowHeight || '28px',
                              }}
                            >
                              <td
                                className="py-2.5 px-3 font-bold whitespace-nowrap align-top"
                                style={{
                                  border: noticeBoardConfig?.border !== false ? '1px solid #cbd5e1' : 'none',
                                  backgroundColor: showBandedRow && isOdd ? '#e2e8f0' : '#f8fafc',
                                  color: noticeBoardConfig?.primaryFontColor || '#1e293b',
                                  width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                                  minWidth: '120px',
                                }}
                              >
                                <span className="font-black text-xs block leading-tight" style={{ color: noticeBoardConfig?.primaryFontColor || '#1e293b' }}>
                                  {formattedDate}
                                </span>
                                <span className="text-[10px] uppercase font-bold block" style={{ color: noticeBoardConfig?.secondaryFontColor || '#64748b' }}>
                                  {dayName}
                                </span>
                              </td>

                              {sortedSessions.map((sess, colIdx) => {
                                const showColumnBand = showBandedColumn && colIdx % 2 === 1;
                                const slot = slotMatrix[`${dateStr}__${sess.id}__${cls.id}`];

                                if (!slot) {
                                  return (
                                    <td
                                      key={sess.id}
                                      className="p-2 text-center text-slate-300 font-mono text-xs align-middle"
                                      style={{
                                        border: noticeBoardConfig?.border !== false ? '1px solid #cbd5e1' : 'none',
                                        backgroundColor: showColumnBand ? '#f8fafc' : '#ffffff',
                                        width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                                        minWidth: '130px',
                                        height: noticeBoardConfig?.rowHeight || '28px',
                                      }}
                                    >
                                      —
                                    </td>
                                  );
                                }

                                const subName =
                                  subjectMap[String(slot.subject_id)] ||
                                  `Subject #${slot.subject_id}`;
                                const tName = teacherMap[String(slot.teacher_id)];

                                return (
                                  <td
                                    key={sess.id}
                                    className="p-2.5 text-center align-top"
                                    style={{
                                      border: noticeBoardConfig?.border !== false ? '1px solid #cbd5e1' : 'none',
                                      backgroundColor: showColumnBand ? '#f8fafc' : '#ffffff',
                                      width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                                      minWidth: '130px',
                                      height: noticeBoardConfig?.rowHeight || '28px',
                                    }}
                                  >
                                    <span className="font-black text-xs block leading-tight" style={{ color: noticeBoardConfig?.primaryFontColor || '#1e293b' }}>
                                      {subName}
                                    </span>
                                    {tName && (
                                      <span className="text-[10px] block font-semibold mt-0.5" style={{ color: noticeBoardConfig?.secondaryFontColor || '#64748b' }}>
                                        Inv: {tName}
                                      </span>
                                    )}
                                    {slot.room_no && (
                                      <span className="text-[9px] block font-mono" style={{ color: noticeBoardConfig?.secondaryFontColor || '#64748b' }}>
                                        Rm: {slot.room_no}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'table' ? (
          /* Consolidated Matrix Table */
          <div className="overflow-x-auto">
            <table 
              className="w-full text-left border-collapse" 
              style={{ 
                fontSize: noticeBoardConfig?.fontSize || '11px',
                borderCollapse: noticeBoardConfig?.border !== false ? 'collapse' : 'separate',
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr style={{ 
                  backgroundColor: noticeBoardConfig?.headerColor || '#1e293b',
                  color: noticeBoardConfig?.headerTextColor || '#ffffff',
                }}>
                  <th 
                    className="p-2 font-black uppercase text-[11px]" 
                    style={{ 
                      border: noticeBoardConfig?.border !== false ? '1px solid #000' : 'none',
                      width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                      minWidth: '100px',
                      color: noticeBoardConfig?.headerTextColor || '#ffffff',
                    }}
                  >
                    Date & Day
                  </th>
                  <th 
                    className="p-2 font-black uppercase text-[11px]" 
                    style={{ 
                      border: noticeBoardConfig?.border !== false ? '1px solid #000' : 'none',
                      width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                      minWidth: '110px',
                      color: noticeBoardConfig?.headerTextColor || '#ffffff',
                    }}
                  >
                    Session / Time
                  </th>
                  {selectedClassesList.map((c) => (
                    <th 
                      key={c.id} 
                      className="p-2 font-black uppercase text-[11px] text-center" 
                      style={{ 
                        border: noticeBoardConfig?.border !== false ? '1px solid #000' : 'none',
                        width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                        minWidth: '120px',
                        color: noticeBoardConfig?.headerTextColor || '#ffffff',
                      }}
                    >
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(schedulerDates.length > 0 ? schedulerDates : examDates).map((dateStr) => {
                  const dayName = formatDateDisplay(dateStr, { weekday: 'short' });
                  const formattedDate = formatDateDisplay(dateStr, {
                    month: 'short',
                    day: 'numeric',
                  });
                  const showBandedRow = noticeBoardConfig?.bandedRow !== false;

                  return sortedSessions.map((sess, sessIdx) => {
                    const isOdd = sessIdx % 2 === 1;
                    return (
                      <tr
                        key={`${dateStr}__${sess.id}`}
                        style={{
                          backgroundColor: showBandedRow && isOdd ? '#f1f5f9' : '#ffffff',
                          height: noticeBoardConfig?.rowHeight || '28px',
                        }}
                      >
                        {sessIdx === 0 && (
                          <td
                            rowSpan={sessions.length}
                            className="p-2 align-top font-bold"
                            style={{ 
                              border: noticeBoardConfig?.border !== false ? '1px solid #000' : 'none',
                              backgroundColor: showBandedRow && isOdd ? '#e2e8f0' : '#f8fafc',
                              color: noticeBoardConfig?.primaryFontColor || '#1e293b',
                              width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                              minWidth: '100px',
                            }}
                          >
                            <span className="font-extrabold text-sm block" style={{ color: noticeBoardConfig?.primaryFontColor || '#1e293b' }}>
                              {formattedDate}
                            </span>
                            <span className="uppercase text-[10px] block" style={{ color: noticeBoardConfig?.secondaryFontColor || '#64748b' }}>
                              {dayName}
                            </span>
                          </td>
                        )}
                        <td 
                          className="p-2 align-top" 
                          style={{ 
                            border: noticeBoardConfig?.border !== false ? '1px solid #000' : 'none',
                            width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                            minWidth: '110px',
                          }}
                        >
                          <span className="font-bold block" style={{ color: noticeBoardConfig?.primaryFontColor || '#1e293b' }}>{sess.name}</span>
                          <span className="text-[10px] font-mono" style={{ color: noticeBoardConfig?.secondaryFontColor || '#64748b' }}>
                            {sess.start_time?.slice(0, 5)} – {sess.end_time?.slice(0, 5)}
                          </span>
                        </td>
                        {selectedClassesList.map((c, colIdx) => {
                          const showColumnBand = noticeBoardConfig?.bandedColumn === true && colIdx % 2 === 1;
                          const slot = slotMatrix[`${dateStr}__${sess.id}__${c.id}`];
                          if (!slot) {
                            return (
                              <td
                                key={c.id}
                                className="p-2 text-center text-gray-300 font-mono text-[10px]"
                                style={{
                                  border: noticeBoardConfig?.border !== false ? '1px solid #000' : 'none',
                                  backgroundColor: showColumnBand ? '#f8fafc' : '#ffffff',
                                  width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                                  minWidth: '120px',
                                  height: noticeBoardConfig?.rowHeight || '28px',
                                }}
                              >
                                —
                              </td>
                            );
                          }

                          const subName =
                            subjectMap[String(slot.subject_id)] || `Subject #${slot.subject_id}`;
                          const teacherName = teacherMap[String(slot.teacher_id)];

                          return (
                            <td
                              key={c.id}
                              className="p-2 align-top text-center"
                              style={{ 
                                border: noticeBoardConfig?.border !== false ? '1px solid #000' : 'none',
                                backgroundColor: showColumnBand ? '#f8fafc' : '#ffffff',
                                width: noticeBoardConfig?.columnWidth !== 'auto' ? noticeBoardConfig?.columnWidth : 'auto',
                                minWidth: '120px',
                                height: noticeBoardConfig?.rowHeight || '28px',
                              }}
                            >
                              <span className="font-black text-xs block leading-tight" style={{ color: noticeBoardConfig?.primaryFontColor || '#1e293b' }}>
                                {subName}
                              </span>
                              {teacherName && (
                                <span className="text-[10px] block font-medium mt-0.5" style={{ color: noticeBoardConfig?.secondaryFontColor || '#64748b' }}>
                                  Inv: {teacherName}
                                </span>
                              )}
                              {slot.room_no && (
                                <span className="text-[9px] block" style={{ color: noticeBoardConfig?.secondaryFontColor || '#64748b' }}>
                                  Rm: {slot.room_no}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Class-wise Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">
            {selectedClassesList.map((cls) => {
              const classSlots = slots
                .filter((s) => String(s.class_id) === String(cls.id))
                .sort((a, b) => (a.exam_date || '').localeCompare(b.exam_date || ''));

              return (
                <div
                  key={cls.id}
                  className="border-2 rounded-lg p-3 bg-white space-y-2 break-inside-avoid"
                  style={{ 
                    borderColor: noticeBoardConfig?.border !== false ? '#000' : 'transparent',
                    borderWidth: noticeBoardConfig?.border !== false ? '2px' : '0',
                  }}
                >
                  <div className="border-b pb-1.5 flex justify-between items-center" style={{ borderColor: noticeBoardConfig?.border !== false ? '#000' : 'transparent' }}>
                    <h3 className="font-black text-base uppercase" style={{ color: noticeBoardConfig?.primaryFontColor || '#1e293b' }}>{cls.name}</h3>
                    <span className="text-[10px] font-bold" style={{ color: noticeBoardConfig?.secondaryFontColor || '#64748b' }}>
                      {classSlots.length} Papers
                    </span>
                  </div>

                  {classSlots.length === 0 ? (
                    <p className="text-xs italic py-3 text-center" style={{ color: noticeBoardConfig?.secondaryFontColor || '#64748b' }}>
                      No examination scheduled
                    </p>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      {classSlots.map((slot, sIdx) => {
                        const sess = sessions.find((s) => String(s.id) === String(slot.session_id));
                        const subName =
                          subjectMap[String(slot.subject_id)] || `Subject #${slot.subject_id}`;
                        const teacherName = teacherMap[String(slot.teacher_id)];
                        const formatted = formatDateDisplay(slot.exam_date, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        });

                        return (
                          <div
                            key={slot.id || sIdx}
                            className="flex items-start justify-between border-b pb-1"
                            style={{ borderStyle: 'dashed', borderColor: noticeBoardConfig?.border !== false ? '#d1d5db' : 'transparent' }}
                          >
                            <div>
                              <span className="font-extrabold block" style={{ color: noticeBoardConfig?.primaryFontColor || '#1e293b' }}>{subName}</span>
                              <span className="text-[10px] block" style={{ color: noticeBoardConfig?.secondaryFontColor || '#64748b' }}>
                                {formatted} • {sess?.name || 'Session'} (
                                {sess?.start_time?.slice(0, 5)})
                              </span>
                            </div>
                            {teacherName && (
                              <span className="text-[10px] font-medium text-right shrink-0" style={{ color: noticeBoardConfig?.secondaryFontColor || '#64748b' }}>
                                {teacherName}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Printable Footer / Signatures */}
        <div className="border-t border-black pt-6 mt-8 flex justify-between items-end text-xs font-bold text-black print:flex">
          <div>
            <p>Notice Board Copy — Display with Official Seal</p>
            <p className="text-[10px] text-gray-600 font-normal">
              Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-12 text-center">
            <div>
              <div className="w-32 border-b border-black mb-1" />
              <p className="text-[11px] font-bold uppercase">Exam Incharge</p>
            </div>
            <div>
              <div className="w-32 border-b border-black mb-1" />
              <p className="text-[11px] font-bold uppercase">Principal / Admin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scoped CSS for @media print */}
      <style>{`
        @media print {
          @page {
            size: A4 ${printOrientation};
            margin: ${printOrientation === 'portrait' ? '8mm 6mm' : '8mm'};
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, header, aside, .print-hide, .portal-header, [data-feature="portal-header"] {
            display: none !important;
          }
          .sched-dark-header {
            background-color: ${noticeBoardConfig?.headerColor || '#1e293b'} !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sched-dark-header th, .sched-dark-header div, .sched-dark-header h3 {
            color: #ffffff !important;
          }
          .sched-dark-header .text-slate-300 {
            color: #cbd5e1 !important;
          }
          .sched-row-even {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sched-row-odd {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sched-table-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 1.25rem !important;
          }
          .print-portrait .sched-table-card {
            margin-bottom: 1rem !important;
          }
          .print-portrait table {
            font-size: ${noticeBoardConfig?.fontSize || '11px'} !important;
          }
          .print-portrait th, .print-portrait td {
            padding: 3px 5px !important;
          }
          .print-portrait h1 {
            font-size: 1.35rem !important;
            color: ${noticeBoardConfig?.headerColor || '#1e293b'} !important;
          }
          .print-portrait .grid {
            grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          }
          /* Apply config styles for print */
          table {
            font-size: ${noticeBoardConfig?.fontSize || '11px'} !important;
            border-collapse: ${noticeBoardConfig?.border !== false ? 'collapse' : 'separate'} !important;
          }
          th, td {
            height: ${noticeBoardConfig?.rowHeight || '28px'} !important;
            ${noticeBoardConfig?.columnWidth !== 'auto' ? `width: ${noticeBoardConfig?.columnWidth} !important; min-width: ${noticeBoardConfig?.columnWidth} !important;` : ''}
          }
          th {
            background-color: ${noticeBoardConfig?.headerColor || '#1e293b'} !important;
            color: #ffffff !important;
            border-color: ${noticeBoardConfig?.border !== false ? '#334155' : 'transparent'} !important;
          }
          td {
            color: ${noticeBoardConfig?.primaryFontColor || '#1e293b'} !important;
            border-color: ${noticeBoardConfig?.border !== false ? '#cbd5e1' : 'transparent'} !important;
          }
          .sched-row-odd td {
            background-color: #e2e8f0 !important;
          }
          .sched-row-even td {
            background-color: #f8fafc !important;
          }
        }
      `}</style>
      </div>
    </div>
  );
};

export default ExamNoticeBoardPrint;
