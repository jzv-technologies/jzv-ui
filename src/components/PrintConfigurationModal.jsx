import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_PRINT_SETTINGS, PAGE_SIZES, PRINT_VARIABLES } from '../types/print-settings';
import { resolvePrintText } from '../utils/printUtils';
import { getAdminConfig, saveAdminConfig } from '../utils/adminConfigUtils';
import { showToast } from '../utils/toast';

const PRINT_CONFIG_INDEX_KEY = 'print_config_index';
const getPrintConfigKey = (name) => `print_config_${name}`;
const TABS = [
  { id: 'page', label: 'Page', icon: 'fa-file-lines' },
  { id: 'table', label: 'Table data', icon: 'fa-table' },
];

const fieldClass =
  'w-full rounded-lg border border-light-border bg-white px-2.5 py-2 text-xs font-semibold text-dark-primary';

const Field = ({ label, children }) => (
  <label className="block space-y-1">
    <span className="text-[10px] font-bold uppercase tracking-wide text-dark-soft">{label}</span>
    {children}
  </label>
);

const NumberField = ({ label, value, min, max, unit = '', onChange }) => (
  <Field label={label}>
    <div className="flex items-center gap-2">
      <input
        type="number"
        className={fieldClass}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {unit && <span className="text-xs font-semibold text-dark-soft">{unit}</span>}
    </div>
  </Field>
);

const SizeModeField = ({
  label,
  mode,
  size,
  min,
  max,
  unit = 'px',
  onModeChange,
  onSizeChange,
}) => (
  <div className="grid grid-cols-2 gap-2">
    <Field label={label}>
      <select
        className={fieldClass}
        value={mode}
        onChange={(event) => onModeChange(event.target.value)}
      >
        <option value="auto">Auto</option>
        <option value="fixed">Fixed size</option>
      </select>
    </Field>
    {mode === 'fixed' && (
      <NumberField
        label="Size"
        value={size}
        min={min}
        max={max}
        unit={unit}
        onChange={onSizeChange}
      />
    )}
  </div>
);

const ColorField = ({ label, value, onChange }) => (
  <Field label={label}>
    <input
      type="color"
      className="h-9 w-full cursor-pointer rounded-lg border border-light-border bg-white p-1"
      value={value || '#000000'}
      onChange={(event) => onChange(event.target.value)}
    />
  </Field>
);

const CheckField = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 rounded-lg border border-light-border bg-white px-2.5 py-2 text-xs font-semibold text-dark-primary">
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onChange(event.target.checked)}
    />
    {label}
  </label>
);

const ToggleField = ({ label, checked, onChange, ariaLabel = label }) => (
  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-dark-primary">
    {label && <span>{label}</span>}
    <span className="relative inline-flex h-5 w-9 items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={ariaLabel}
      />
      <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-primary peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary peer-focus-visible:ring-offset-2" />
      <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
    </span>
  </label>
);

const PrintConfigurationModal = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onReset,
  onPrint,
  title = 'Print configuration',
  previewSelector,
  previewContext = {},
  exclusiveContent = null,
  previewContent = null,
}) => {
  const [activeTab, setActiveTab] = useState('page');
  const [hasPreview, setHasPreview] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(75);
  const [savedConfigNames, setSavedConfigNames] = useState([]);
  const [configName, setConfigName] = useState('');
  const [selectedConfigName, setSelectedConfigName] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const pageRef = useRef(null);
  const s = useMemo(
    () => ({
      ...DEFAULT_PRINT_SETTINGS,
      ...settings,
      tableHeader: { ...DEFAULT_PRINT_SETTINGS.tableHeader, ...settings?.tableHeader },
      tableStyle: { ...DEFAULT_PRINT_SETTINGS.tableStyle, ...settings?.tableStyle },
      pageHeaders: settings?.pageHeaders || DEFAULT_PRINT_SETTINGS.pageHeaders,
      pageFooter: { ...DEFAULT_PRINT_SETTINGS.pageFooter, ...settings?.pageFooter },
    }),
    [settings]
  );

  useEffect(() => {
    if (!isOpen || !previewSelector) return undefined;
    const source = document.querySelector(previewSelector);
    if (!source) {
      setHasPreview(false);
      return undefined;
    }
    const refreshPreview = () => {
      const previewClone = source.cloneNode(true);
      previewClone.removeAttribute('data-print-target');
      previewClone
        .querySelectorAll('[data-print-target="active"]')
        .forEach((element) => element.removeAttribute('data-print-target'));
      pageRef.current?.replaceChildren(previewClone);
      setHasPreview(true);
    };
    refreshPreview();
    const observer = new MutationObserver(refreshPreview);
    observer.observe(source, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [isOpen, previewSelector, settings, previewContext]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    const loadSavedConfigNames = async () => {
      try {
        const names = await getAdminConfig(PRINT_CONFIG_INDEX_KEY, []);
        if (!cancelled) {
          setSavedConfigNames(
            Array.isArray(names)
              ? [...new Set(names.filter((name) => typeof name === 'string' && name.trim()))].sort(
                  (a, b) => a.localeCompare(b)
                )
              : []
          );
        }
      } catch {
        if (!cancelled) showToast('Unable to load saved print configuration names.');
      }
    };
    loadSavedConfigNames();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (key, value) => onSettingsChange({ ...s, [key]: value });
  const updateNested = (key, patch) => update(key, { ...s[key], ...patch });
  const updateHeader = (id, patch) =>
    update(
      'pageHeaders',
      s.pageHeaders.map((header) => (header.id === id ? { ...header, ...patch } : header))
    );
  const updateTable = (key, value) => updateNested('tableStyle', { [key]: value });
  const saveConfiguration = async () => {
    const name = configName.trim();
    if (!name) {
      showToast('Enter a name for this print configuration.');
      return;
    }
    setIsSavingConfig(true);
    try {
      if (!(await saveAdminConfig(getPrintConfigKey(name), settings))) {
        throw new Error('Configuration save failed');
      }
      const nextNames = [...new Set([...savedConfigNames, name])].sort((a, b) =>
        a.localeCompare(b)
      );
      if (!(await saveAdminConfig(PRINT_CONFIG_INDEX_KEY, nextNames))) {
        throw new Error('Configuration list save failed');
      }
      setSavedConfigNames(nextNames);
      setSelectedConfigName(name);
      showToast(`Print configuration "${name}" saved.`, 'success');
    } catch {
      showToast('Unable to save this print configuration. Please try again.');
    } finally {
      setIsSavingConfig(false);
    }
  };
  const loadConfiguration = async () => {
    if (!selectedConfigName) return;
    setIsLoadingConfig(true);
    try {
      const saved = await getAdminConfig(getPrintConfigKey(selectedConfigName), null);
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
        throw new Error('Saved configuration is missing or invalid');
      }
      onSettingsChange({
        ...DEFAULT_PRINT_SETTINGS,
        ...saved,
        tableHeader: { ...DEFAULT_PRINT_SETTINGS.tableHeader, ...saved.tableHeader },
        tableStyle: { ...DEFAULT_PRINT_SETTINGS.tableStyle, ...saved.tableStyle },
        pageHeaders: saved.pageHeaders || DEFAULT_PRINT_SETTINGS.pageHeaders,
        pageFooter: { ...DEFAULT_PRINT_SETTINGS.pageFooter, ...saved.pageFooter },
      });
      showToast(`Print configuration "${selectedConfigName}" loaded.`, 'success');
    } catch {
      showToast('Unable to load this print configuration. Please try again.');
    } finally {
      setIsLoadingConfig(false);
    }
  };
  const tableStyle = s.tableStyle;
  const pageDimensions = PAGE_SIZES.find((size) => size.id === s.pageSize) || PAGE_SIZES[0];
  const alwaysAvailableVariables = new Set(['date', 'time', 'page', 'totalPages']);
  const availablePrintVariables = PRINT_VARIABLES.filter((variable) => {
    const key = variable.token.slice(1, -1);
    return (
      alwaysAvailableVariables.has(key) ||
      Object.prototype.hasOwnProperty.call(previewContext, key)
    );
  });
  const tabs = exclusiveContent
    ? [...TABS, { id: 'exclusive', label: 'Exclusive', icon: 'fa-sliders' }]
    : TABS;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-2 backdrop-blur-sm sm:p-4"
      data-feature="print-configuration-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-light-border bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-light-border bg-brand-primary px-4 py-3 text-white sm:px-6">
          <div>
            <h2 className="text-base font-black sm:text-lg">{title}</h2>
            <p className="text-[10px] font-semibold opacity-80">
              Configure settings and review a live page preview.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-white/10 px-1.5 py-1">
              <button
                type="button"
                onClick={() => setPreviewZoom((current) => Math.max(50, current - 10))}
                disabled={previewZoom <= 50}
                aria-label="Zoom out"
                className="flex h-7 w-7 items-center justify-center rounded-md text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <i className="fas fa-minus" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom(100)}
                aria-label="Reset zoom to 100 percent"
                className="min-w-12 rounded-md px-1.5 py-1 text-xs font-bold text-white hover:bg-white/15"
              >
                {previewZoom}%
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom((current) => Math.min(150, current + 10))}
                disabled={previewZoom >= 150}
                aria-label="Zoom in"
                className="flex h-7 w-7 items-center justify-center rounded-md text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <i className="fas fa-plus" />
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/15 px-3 py-2 text-xs font-bold hover:bg-white/25"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-black text-brand-primary hover:bg-slate-100"
            >
              <i className="fas fa-print" /> Print
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)]">
          <section className="flex min-h-0 flex-col border-b border-light-border lg:border-b-0 lg:border-r">
            <nav className="flex gap-1 overflow-x-auto border-b border-light-border bg-slate-50 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                    activeTab === tab.id
                      ? 'bg-white text-brand-primary shadow-sm'
                      : 'text-dark-soft hover:bg-white'
                  }`}
                >
                  <i className={`fas ${tab.icon}`} /> {tab.label}
                </button>
              ))}
            </nav>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {activeTab === 'page' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Page size">
                      <select
                        className={fieldClass}
                        value={s.pageSize}
                        onChange={(e) => update('pageSize', e.target.value)}
                      >
                        {PAGE_SIZES.map((size) => (
                          <option key={size.id} value={size.id}>
                            {size.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Orientation">
                      <select
                        className={fieldClass}
                        value={s.orientation}
                        onChange={(e) => update('orientation', e.target.value)}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </Field>
                    <NumberField
                      label="Font size"
                      value={s.fontSize}
                      min={6}
                      max={32}
                      unit="pt"
                      onChange={(value) => update('fontSize', value)}
                    />
                    <NumberField
                      label="Page margin"
                      value={s.margin}
                      min={0}
                      max={40}
                      unit="mm"
                      onChange={(value) => update('margin', value)}
                    />
                    <NumberField
                      label="Header margin"
                      value={s.headerMargin}
                      min={0}
                      max={40}
                      unit="mm"
                      onChange={(value) => update('headerMargin', value)}
                    />
                    <NumberField
                      label="Footer margin"
                      value={s.footerMargin}
                      min={0}
                      max={40}
                      unit="mm"
                      onChange={(value) => update('footerMargin', value)}
                    />
                  </div>
                </>
              )}

              {activeTab === 'page' && (
                <>
                  <aside className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-900">
                      Available text variables
                    </p>
                    <p className="mt-1 text-[10px] text-blue-800">
                      Use these in page headers, footers, or the table heading. Availability is
                      based on the current print view.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {availablePrintVariables.map((variable) => (
                        <span
                          key={variable.token}
                          title={variable.label}
                          className="rounded-md border border-blue-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-blue-900"
                        >
                          {variable.token}
                          <span className="ml-1 text-blue-700">· {variable.label}</span>
                        </span>
                      ))}
                    </div>
                  </aside>
                  {s.pageHeaders.map((header, headerIndex) => (
                    <fieldset key={header.id} className="rounded-xl border border-light-border p-3">
                      <legend className="px-1">
                        <span className="flex items-center gap-3">
                          <span className="text-xs font-black text-dark-primary">
                            Header {headerIndex + 1}
                          </span>
                          <ToggleField
                            label=""
                            ariaLabel={`Show Header ${headerIndex + 1}`}
                            checked={header.visible}
                            onChange={(visible) => updateHeader(header.id, { visible })}
                          />
                        </span>
                      </legend>
                      {header.visible !== false && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Content type">
                              <select
                                className={fieldClass}
                                value={header.type}
                                onChange={(e) => updateHeader(header.id, { type: e.target.value })}
                              >
                                <option value="text">Text</option>
                                <option value="image">Image</option>
                              </select>
                            </Field>
                            <Field label="Alignment / position">
                              <select
                                className={fieldClass}
                                value={
                                  header.type === 'image' ? header.imagePosition : header.alignment
                                }
                                onChange={(e) =>
                                  updateHeader(
                                    header.id,
                                    header.type === 'image'
                                      ? { imagePosition: e.target.value }
                                      : { alignment: e.target.value }
                                  )
                                }
                              >
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                              </select>
                            </Field>
                          </div>
                          {header.type === 'image' ? (
                            <>
                              <Field label="Image URL">
                                <input
                                  className={fieldClass}
                                  value={header.imageUrl || ''}
                                  onChange={(e) =>
                                    updateHeader(header.id, { imageUrl: e.target.value })
                                  }
                                  placeholder="https://… or /media/logo.png"
                                />
                              </Field>
                              <Field label="Image sizing">
                                <select
                                  className={fieldClass}
                                  value={header.imageSizing || 'ratio'}
                                  onChange={(event) =>
                                    updateHeader(header.id, { imageSizing: event.target.value })
                                  }
                                >
                                  <option value="ratio">Preserve aspect ratio</option>
                                  <option value="fixed">Fixed height</option>
                                </select>
                              </Field>
                              <NumberField
                                label="Image width"
                                value={header.imageSize || 80}
                                min={5}
                                max={100}
                                unit="%"
                                onChange={(value) => updateHeader(header.id, { imageSize: value })}
                              />
                              {header.imageSizing === 'fixed' && (
                                <NumberField
                                  label="Image height"
                                  value={header.imageHeight || 20}
                                  min={5}
                                  max={100}
                                  unit="mm"
                                  onChange={(value) =>
                                    updateHeader(header.id, { imageHeight: value })
                                  }
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <Field label="Text">
                                <input
                                  className={fieldClass}
                                  value={header.text || ''}
                                  onChange={(e) =>
                                    updateHeader(header.id, { text: e.target.value })
                                  }
                                />
                              </Field>
                              <div className="grid grid-cols-3 gap-2">
                                <Field label="Font style">
                                  <select
                                    className={fieldClass}
                                    value={header.fontStyle || (header.bold ? 'bold' : 'normal')}
                                    onChange={(event) =>
                                      updateHeader(header.id, {
                                        fontStyle: event.target.value,
                                        bold:
                                          event.target.value === 'bold' ||
                                          event.target.value === 'bold-italic',
                                      })
                                    }
                                  >
                                    <option value="normal">Normal</option>
                                    <option value="bold">Bold</option>
                                    <option value="italic">Italic</option>
                                    <option value="bold-italic">Bold Italic</option>
                                  </select>
                                </Field>
                                <NumberField
                                  label="Size"
                                  value={header.fontSize || 12}
                                  min={6}
                                  max={48}
                                  unit="px"
                                  onChange={(value) => updateHeader(header.id, { fontSize: value })}
                                />
                                <ColorField
                                  label="Color"
                                  value={header.color}
                                  onChange={(value) => updateHeader(header.id, { color: value })}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </fieldset>
                  ))}
                  <fieldset className="rounded-xl border border-light-border p-3">
                    <legend className="px-1">
                      <span className="flex items-center gap-3">
                        <span className="text-xs font-black text-dark-primary">Footer</span>
                        <ToggleField
                          label="Show footer"
                          checked={s.pageFooter.visible}
                          onChange={(visible) => updateNested('pageFooter', { visible })}
                        />
                      </span>
                    </legend>
                    {s.pageFooter.visible !== false && (
                      <div className="mt-2 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Content type">
                            <select
                              className={fieldClass}
                              value={s.pageFooter.type}
                              onChange={(e) => updateNested('pageFooter', { type: e.target.value })}
                            >
                              <option value="text">Text</option>
                              <option value="image">Image</option>
                            </select>
                          </Field>
                          <Field label="Alignment / position">
                            <select
                              className={fieldClass}
                              value={
                                s.pageFooter.type === 'image'
                                  ? s.pageFooter.imagePosition
                                  : s.pageFooter.alignment
                              }
                              onChange={(e) =>
                                updateNested(
                                  'pageFooter',
                                  s.pageFooter.type === 'image'
                                    ? { imagePosition: e.target.value }
                                    : { alignment: e.target.value }
                                )
                              }
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </Field>
                        </div>
                        {s.pageFooter.type === 'image' ? (
                          <>
                            <Field label="Image URL">
                              <input
                                className={fieldClass}
                                value={s.pageFooter.imageUrl || ''}
                                onChange={(e) =>
                                  updateNested('pageFooter', { imageUrl: e.target.value })
                                }
                              />
                            </Field>
                            <Field label="Image sizing">
                              <select
                                className={fieldClass}
                                value={s.pageFooter.imageSizing || 'ratio'}
                                onChange={(event) =>
                                  updateNested('pageFooter', { imageSizing: event.target.value })
                                }
                              >
                                <option value="ratio">Preserve aspect ratio</option>
                                <option value="fixed">Fixed height</option>
                              </select>
                            </Field>
                            <NumberField
                              label="Image width"
                              value={s.pageFooter.imageSize || 80}
                              min={5}
                              max={100}
                              unit="%"
                              onChange={(value) => updateNested('pageFooter', { imageSize: value })}
                            />
                            {s.pageFooter.imageSizing === 'fixed' && (
                              <NumberField
                                label="Image height"
                                value={s.pageFooter.imageHeight || 20}
                                min={5}
                                max={100}
                                unit="mm"
                                onChange={(value) =>
                                  updateNested('pageFooter', { imageHeight: value })
                                }
                              />
                            )}
                          </>
                        ) : (
                          <>
                            <Field label="Text">
                              <input
                                className={fieldClass}
                                value={s.pageFooter.text || ''}
                                onChange={(e) =>
                                  updateNested('pageFooter', { text: e.target.value })
                                }
                              />
                            </Field>
                            <div className="grid grid-cols-2 gap-2">
                              <NumberField
                                label="Size"
                                value={s.pageFooter.fontSize || 9}
                                min={6}
                                max={48}
                                unit="px"
                                onChange={(value) =>
                                  updateNested('pageFooter', { fontSize: value })
                                }
                              />
                              <ColorField
                                label="Color"
                                value={s.pageFooter.color}
                                onChange={(value) => updateNested('pageFooter', { color: value })}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </fieldset>
                </>
              )}

              {activeTab === 'table' && (
                <>
                  <fieldset className="space-y-3 rounded-xl border border-light-border p-3">
                    <legend className="px-1 text-xs font-black text-dark-primary">
                      <span className="flex items-center gap-3">
                        <span>Table header</span>
                        <ToggleField
                          label=""
                          ariaLabel="Show table header"
                          checked={s.tableHeader.visible}
                          onChange={(visible) => updateNested('tableHeader', { visible })}
                        />
                      </span>
                    </legend>
                    {s.tableHeader.visible && (
                      <div className="space-y-3">
                        <Field label="Heading text">
                          <input
                            className={fieldClass}
                            value={s.tableHeader.headingText || ''}
                            onChange={(event) =>
                              updateNested('tableHeader', { headingText: event.target.value })
                            }
                            placeholder="e.g. Weekly Timetable"
                          />
                        </Field>
                        <CheckField
                          label="Repeat column headings on every page"
                          checked={s.tableHeader.repeat}
                          onChange={(repeat) => updateNested('tableHeader', { repeat })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <ColorField
                            label="Background color"
                            value={s.tableHeader.backgroundColor}
                            onChange={(backgroundColor) =>
                              updateNested('tableHeader', { backgroundColor })
                            }
                          />
                          <ColorField
                            label="Font color"
                            value={s.tableHeader.color}
                            onChange={(color) => updateNested('tableHeader', { color })}
                          />
                          <NumberField
                            label="Font size"
                            value={s.tableHeader.fontSize}
                            min={6}
                            max={32}
                            unit="pt"
                            onChange={(fontSize) => updateNested('tableHeader', { fontSize })}
                          />
                          <Field label="Alignment">
                            <select
                              className={fieldClass}
                              value={s.tableHeader.alignment}
                              onChange={(e) =>
                                updateNested('tableHeader', { alignment: e.target.value })
                              }
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </Field>
                        </div>
                        <SizeModeField
                          label="Table header height"
                          mode={s.tableHeader.heightMode}
                          size={s.tableHeader.height}
                          min={10}
                          max={300}
                          onModeChange={(heightMode) => updateNested('tableHeader', { heightMode })}
                          onSizeChange={(height) => updateNested('tableHeader', { height })}
                        />
                      </div>
                    )}
                  </fieldset>
                  <fieldset className="space-y-3 rounded-xl border border-light-border p-3">
                    <legend className="px-1 text-xs font-black text-dark-primary">
                      Table banding and first column
                    </legend>
                    <CheckField
                      label="Banded rows"
                      checked={tableStyle.bandedRows}
                      onChange={(value) => updateTable('bandedRows', value)}
                    />
                    <CheckField
                      label="Banded columns"
                      checked={tableStyle.bandedColumns}
                      onChange={(value) => updateTable('bandedColumns', value)}
                    />
                    <ColorField
                      label="Banded color"
                      value={tableStyle.bandedColor}
                      onChange={(value) => updateTable('bandedColor', value)}
                    />
                    <CheckField
                      label="First column has distinct style"
                      checked={tableStyle.firstColumnDifferent}
                      onChange={(value) => updateTable('firstColumnDifferent', value)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <ColorField
                        label="Color"
                        value={tableStyle.firstColumnColor}
                        onChange={(value) => updateTable('firstColumnColor', value)}
                      />
                      <NumberField
                        label="Font"
                        value={tableStyle.firstColumnFontSize}
                        min={6}
                        max={32}
                        unit="pt"
                        onChange={(value) => updateTable('firstColumnFontSize', value)}
                      />
                      <Field label="Alignment">
                        <select
                          className={fieldClass}
                          value={tableStyle.firstColumnAlignment}
                          onChange={(e) => updateTable('firstColumnAlignment', e.target.value)}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </Field>
                    </div>
                    <SizeModeField
                      label="Width"
                      mode={tableStyle.firstColumnWidthMode}
                      size={tableStyle.firstColumnWidth}
                      min={20}
                      max={1000}
                      onModeChange={(firstColumnWidthMode) =>
                        updateTable('firstColumnWidthMode', firstColumnWidthMode)
                      }
                      onSizeChange={(firstColumnWidth) =>
                        updateTable('firstColumnWidth', firstColumnWidth)
                      }
                    />
                  </fieldset>
                  <fieldset className="space-y-3 rounded-xl border border-light-border p-3">
                    <legend className="px-1 text-xs font-black text-dark-primary">Cells</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <ColorField
                        label="Font color"
                        value={tableStyle.cellColor}
                        onChange={(value) => updateTable('cellColor', value)}
                      />
                      <NumberField
                        label="Font size"
                        value={tableStyle.cellFontSize}
                        min={6}
                        max={32}
                        unit="pt"
                        onChange={(value) => updateTable('cellFontSize', value)}
                      />
                      <Field label="Alignment">
                        <select
                          className={fieldClass}
                          value={tableStyle.cellAlignment}
                          onChange={(e) => updateTable('cellAlignment', e.target.value)}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </Field>
                      <NumberField
                        label="Margin"
                        value={tableStyle.cellMargin}
                        min={0}
                        max={24}
                        unit="px"
                        onChange={(value) => updateTable('cellMargin', value)}
                      />
                      <NumberField
                        label="Padding"
                        value={tableStyle.cellPadding}
                        min={0}
                        max={24}
                        unit="px"
                        onChange={(value) => updateTable('cellPadding', value)}
                      />
                      <SizeModeField
                        label="width"
                        mode={tableStyle.columnWidthMode}
                        size={tableStyle.columnWidth}
                        min={20}
                        max={1000}
                        onModeChange={(columnWidthMode) =>
                          updateTable('columnWidthMode', columnWidthMode)
                        }
                        onSizeChange={(columnWidth) => updateTable('columnWidth', columnWidth)}
                      />
                      <SizeModeField
                        label="height"
                        mode={tableStyle.rowHeightMode}
                        size={tableStyle.rowHeight}
                        min={10}
                        max={500}
                        onModeChange={(rowHeightMode) =>
                          updateTable('rowHeightMode', rowHeightMode)
                        }
                        onSizeChange={(rowHeight) => updateTable('rowHeight', rowHeight)}
                      />
                    </div>
                  </fieldset>
                  <fieldset className="space-y-3 rounded-xl border border-light-border p-3">
                    <legend className="px-1 text-xs font-black text-dark-primary">Borders</legend>
                    <CheckField
                      label="Show borders"
                      checked={tableStyle.showBorders}
                      onChange={(value) => updateTable('showBorders', value)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <NumberField
                        label="Thickness"
                        value={tableStyle.borderThickness}
                        min={0}
                        max={8}
                        unit="px"
                        onChange={(value) => updateTable('borderThickness', value)}
                      />
                      <ColorField
                        label="Color"
                        value={tableStyle.borderColor}
                        onChange={(value) => updateTable('borderColor', value)}
                      />
                      <NumberField
                        label="Opacity"
                        value={tableStyle.borderOpacity}
                        min={0}
                        max={100}
                        unit="%"
                        onChange={(value) => updateTable('borderOpacity', value)}
                      />
                    </div>
                  </fieldset>
                </>
              )}
              {activeTab === 'exclusive' && exclusiveContent}
            </div>
            <footer className="flex flex-col gap-3 border-t border-light-border p-3">
              <div className="space-y-2">
                <label
                  htmlFor="saved-print-configuration"
                  className="block text-[10px] font-bold uppercase tracking-wide text-dark-soft"
                >
                  Saved configurations
                </label>
                <div className="flex gap-2">
                  <select
                    id="saved-print-configuration"
                    value={selectedConfigName}
                    onChange={(event) => {
                      const name = event.target.value;
                      setSelectedConfigName(name);
                      if (name) setConfigName(name);
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-light-border bg-white px-2 py-2 text-xs font-semibold text-dark-primary"
                  >
                    <option value="">Select a configuration</option>
                    {savedConfigNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={loadConfiguration}
                    disabled={!selectedConfigName || isLoadingConfig}
                    className="rounded-lg bg-brand-primary px-3 py-2 text-xs font-bold text-white hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoadingConfig ? 'Loading…' : 'Load'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={configName}
                    onChange={(event) => setConfigName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveConfiguration();
                    }}
                    placeholder="New configuration name"
                    aria-label="New print configuration name"
                    className="min-w-0 flex-1 rounded-lg border border-light-border bg-white px-2 py-2 text-xs font-semibold text-dark-primary"
                  />
                  <button
                    type="button"
                    onClick={saveConfiguration}
                    disabled={!configName.trim() || isSavingConfig}
                    className="rounded-lg border border-brand-primary px-3 py-2 text-xs font-bold text-brand-primary hover:bg-brand-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingConfig
                      ? 'Saving…'
                      : savedConfigNames.includes(configName.trim())
                        ? 'Overwrite'
                        : 'Save'}
                  </button>
                </div>
                <p className="text-[10px] text-dark-soft">
                  Saving an existing name replaces its configuration.
                </p>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="self-start rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
              >
                Reset defaults
              </button>
            </footer>
          </section>

          <section
            className="flex min-h-0 flex-col overflow-hidden bg-slate-100 p-3 sm:p-6"
            aria-label="Print preview"
          >
            <div className="min-h-0 flex-1 overflow-auto">
              <div
                className="mx-auto min-h-full w-fit min-w-full origin-top"
                style={{ zoom: previewZoom / 100 }}
              >
                {previewContent ? (
                  previewContent
                ) : (
                  <div
                    className="mx-auto min-h-[500px] bg-white p-6 shadow-xl"
                    style={{
                      width: `min(100%, ${
                        s.orientation === 'landscape' ? pageDimensions.height : pageDimensions.width
                      })`,
                      minHeight:
                        s.orientation === 'landscape'
                          ? pageDimensions.width
                          : pageDimensions.height,
                      padding: `${s.margin}mm`,
                      fontSize: `${s.fontSize}pt`,
                    }}
                  >
                    <div className="mb-3 space-y-1" style={{ marginBottom: `${s.headerMargin}mm` }}>
                      {s.pageHeaders.map(
                        (header, headerIndex) =>
                          header.visible !== false &&
                          (header.type === 'image'
                            ? header.imageUrl && (
                                <div
                                  key={header.id}
                                  className="flex"
                                  style={{
                                    justifyContent:
                                      header.imagePosition === 'left'
                                        ? 'flex-start'
                                        : header.imagePosition === 'right'
                                          ? 'flex-end'
                                          : 'center',
                                  }}
                                >
                                  <img
                                    src={header.imageUrl}
                                    alt={`Header ${headerIndex + 1}`}
                                    style={{
                                      width: `${header.imageSize || 80}%`,
                                      height:
                                        header.imageSizing === 'fixed'
                                          ? `${header.imageHeight || 20}mm`
                                          : 'auto',
                                      maxHeight: header.imageSizing === 'fixed' ? undefined : 85,
                                      objectFit: 'contain',
                                    }}
                                  />
                                </div>
                              )
                            : header.text && (
                                <div
                                  key={header.id}
                                  style={{
                                    color: header.color,
                                    fontSize: `${header.fontSize}px`,
                                    fontWeight:
                                      header.fontStyle?.includes('bold') ||
                                      (!header.fontStyle && header.bold)
                                        ? 800
                                        : 600,
                                    fontStyle: header.fontStyle?.includes('italic')
                                      ? 'italic'
                                      : 'normal',
                                    textAlign: header.alignment,
                                  }}
                                >
                                  {resolvePrintText(header.text, previewContext)}
                                </div>
                              ))
                      )}
                    </div>
                    <div
                      ref={pageRef}
                      data-preview-clone="true"
                      className={[
                        'print-config-preview',
                        tableStyle.columnWidthMode === 'fixed' && 'has-fixed-column-width',
                        tableStyle.columnWidthMode === 'fixed' &&
                          tableStyle.firstColumnWidthMode !== 'fixed' &&
                          'has-auto-first-column-width',
                        tableStyle.rowHeightMode === 'fixed' && 'has-fixed-row-height',
                        tableStyle.firstColumnWidthMode === 'fixed' &&
                          'has-fixed-first-column-width',
                        s.tableHeader.heightMode === 'fixed' && 'has-fixed-table-header-height',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{
                        '--pc-cell-color': tableStyle.cellColor,
                        '--pc-cell-size': `${tableStyle.cellFontSize}pt`,
                        '--pc-cell-align': tableStyle.cellAlignment,
                        '--pc-cell-margin': `${tableStyle.cellMargin}px`,
                        '--pc-cell-padding': `${tableStyle.cellPadding}px`,
                        '--pc-band-color': tableStyle.bandedColor,
                        '--pc-border-color': tableStyle.borderColor,
                        '--pc-border-width': `${tableStyle.borderThickness}px`,
                        '--pc-border-opacity': `${tableStyle.borderOpacity}%`,
                        '--pc-first-color': tableStyle.firstColumnDifferent
                          ? tableStyle.firstColumnColor
                          : tableStyle.cellColor,
                        '--pc-first-size': `${
                          tableStyle.firstColumnDifferent
                            ? tableStyle.firstColumnFontSize
                            : tableStyle.cellFontSize
                        }pt`,
                        '--pc-first-align': tableStyle.firstColumnDifferent
                          ? tableStyle.firstColumnAlignment
                          : tableStyle.cellAlignment,
                        '--pc-header-color': s.tableHeader.color,
                        '--pc-header-bg': s.tableHeader.backgroundColor,
                        '--pc-header-size': `${s.tableHeader.fontSize}pt`,
                        '--pc-header-align': s.tableHeader.alignment,
                        '--pc-header-visible': s.tableHeader.visible ? 'table-row-group' : 'none',
                        '--pc-header-repeat': s.tableHeader.repeat
                          ? 'table-header-group'
                          : 'table-row-group',
                        '--pc-row-band': tableStyle.bandedRows
                          ? tableStyle.bandedColor
                          : 'transparent',
                        '--pc-column-band': tableStyle.bandedColumns
                          ? tableStyle.bandedColor
                          : 'transparent',
                        '--pc-column-width': `${tableStyle.columnWidth}px`,
                        '--pc-row-height': `${tableStyle.rowHeight}px`,
                        '--pc-first-column-width': `${tableStyle.firstColumnWidth}px`,
                        '--pc-table-header-height': `${s.tableHeader.height}px`,
                      }}
                    />
                    {!hasPreview && (
                      <p className="py-10 text-center text-xs font-semibold text-dark-soft">
                        Preview will appear when the printable content is available.
                      </p>
                    )}
                    {s.pageFooter.visible !== false &&
                      (s.pageFooter.text || s.pageFooter.imageUrl) && (
                        <div
                          className="mt-4"
                          style={{
                            marginTop: `${s.footerMargin}mm`,
                            textAlign: s.pageFooter.alignment,
                            color: s.pageFooter.color,
                            fontSize: `${s.pageFooter.fontSize}px`,
                          }}
                        >
                          {s.pageFooter.type === 'image' ? (
                            <img
                              className="inline-block"
                              src={s.pageFooter.imageUrl}
                              alt="Footer"
                              style={{
                                width: `${s.pageFooter.imageSize || 80}%`,
                                height:
                                  s.pageFooter.imageSizing === 'fixed'
                                    ? `${s.pageFooter.imageHeight || 20}mm`
                                    : 'auto',
                                objectFit: 'contain',
                              }}
                            />
                          ) : (
                            resolvePrintText(s.pageFooter.text, previewContext)
                          )}
                        </div>
                      )}
                    <p className="mt-2 text-center text-[9px] text-dark-soft">
                      {pageDimensions.name} · {s.orientation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PrintConfigurationModal;
