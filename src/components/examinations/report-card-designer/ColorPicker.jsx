import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getColorName, hexToRgb, rgbToHex } from './utils';

/**
 * Premium Self-Contained ColorPicker Component
 * Renders an interactive swatch with the color name at the bottom.
 * Clicking opens a popover with:
 * - Native Eyedropper / Palette
 * - Hex code input option
 * - RGB inputs option
 * - Quick Preset Swatches
 * - Clear / Reset to default
 * 
 * Uses React Portal to render popover at document body level to avoid
 * z-index and overflow clipping issues in nested containers.
 */
export const ColorPicker = ({
  value = '',
  onChange,
  placeholder = '#0f172a',
  label = '',
  allowClear = true,
  className = '',
  presets,
  presetColors = presets || [
    '#ffffff',
    '#f8fafc',
    '#e2e8f0',
    '#cbd5e1',
    '#64748b',
    '#0f172a',
    '#e11d48',
    '#dc2626',
    '#ea580c',
    '#d97706',
    '#f59e0b',
    '#059669',
    '#10b981',
    '#0891b2',
    '#2563eb',
    '#7c3aed',
  ],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  const effectiveColor = value || '';
  const isDefault = !effectiveColor;
  const activeColor = effectiveColor || placeholder || '#0f172a';
  const colorName = getColorName(activeColor);
  const codeLabel = isDefault
    ? `${(placeholder || '#0f172a').toUpperCase()} (Default)`
    : effectiveColor.toUpperCase();

  // Local state for Hex and RGB editing inside popover
  const [hexInput, setHexInput] = useState(effectiveColor || placeholder || '#ffffff');
  const initialRgb = hexToRgb(effectiveColor || placeholder || '#ffffff') || {
    r: 15,
    g: 23,
    b: 42,
  };
  const [rVal, setRVal] = useState(initialRgb.r);
  const [gVal, setGVal] = useState(initialRgb.g);
  const [bVal, setBVal] = useState(initialRgb.b);

  // Sync internal state when external value changes
  useEffect(() => {
    const col = value || placeholder || '#ffffff';
    setHexInput(col);
    const parsed = hexToRgb(col);
    if (parsed) {
      setRVal(parsed.r);
      setGVal(parsed.g);
      setBVal(parsed.b);
    }
  }, [value, placeholder]);

  // Local state for portal popover coordinates
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });

  // Compute fixed position for portal popover relative to trigger button
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 256;
      const popoverHeight = 360;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let left = rect.left;
      if (left + popoverWidth > viewportW - 12) {
        left = Math.max(12, viewportW - popoverWidth - 12);
      }
      if (left < 12) {
        left = 12;
      }

      let top = rect.bottom + 6;
      if (top + popoverHeight > viewportH - 12 && rect.top - popoverHeight - 6 > 12) {
        top = rect.top - popoverHeight - 6;
      }

      setPopoverCoords({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // Click outside listener to close popover
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  const handleHexChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('#') && val.length > 0) {
      val = '#' + val;
    }
    setHexInput(val);
    const parsed = hexToRgb(val);
    if (parsed) {
      setRVal(parsed.r);
      setGVal(parsed.g);
      setBVal(parsed.b);
      onChange?.(val);
    }
  };

  const handleRgbChange = (newR, newG, newB) => {
    const clampedR = Math.max(0, Math.min(255, Number(newR) || 0));
    const clampedG = Math.max(0, Math.min(255, Number(newG) || 0));
    const clampedB = Math.max(0, Math.min(255, Number(newB) || 0));
    setRVal(clampedR);
    setGVal(clampedG);
    setBVal(clampedB);
    const newHex = rgbToHex(clampedR, clampedG, clampedB);
    setHexInput(newHex);
    onChange?.(newHex);
  };

  const handleNativePicker = (e) => {
    const val = e.target.value;
    setHexInput(val);
    const parsed = hexToRgb(val);
    if (parsed) {
      setRVal(parsed.r);
      setGVal(parsed.g);
      setBVal(parsed.b);
    }
    onChange?.(val);
  };

  const handleSelectPreset = (c) => {
    setHexInput(c);
    const parsed = hexToRgb(c);
    if (parsed) {
      setRVal(parsed.r);
      setGVal(parsed.g);
      setBVal(parsed.b);
    }
    onChange?.(c);
  };

  const handleClear = () => {
    onChange?.('');
    setIsOpen(false);
  };

  const popoverContent = (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${popoverCoords.top}px`,
        left: `${popoverCoords.left}px`,
      }}
      className="z-[9999] w-64 bg-white rounded-2xl border border-light-border shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-light-border">
        <div className="flex items-center justify-center gap-2 min-w-0">
          <div
            className="w-5 h-5 rounded-md border border-slate-300 shrink-0 shadow-2xs"
            style={{ backgroundColor: hexInput || '#ffffff' }}
          />
          <div className="min-w-0">
            <span className="text-[11px] font-black text-dark-primary block truncate">
              {getColorName(hexInput, 'Custom Color')}
            </span>
            <span className="text-[9px] font-mono text-dark-muted block">
              {hexInput.toUpperCase()}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs cursor-pointer"
        >
          &times;
        </button>
      </div>

      {/* Visual Eyedropper / Palette Picker Button */}
      <label className="flex items-center justify-center gap-2 w-full py-1.5 px-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-light-border cursor-pointer transition-all">
        <i className="fas fa-eye-dropper text-rose-500 text-xs" />
        <span className="text-[10px] font-bold text-dark-slate">
          Visual Palette / Eyedropper
        </span>
        <input
          type="color"
          value={hexInput.startsWith('#') && hexInput.length === 7 ? hexInput : '#0f172a'}
          onChange={handleNativePicker}
          className="sr-only"
        />
      </label>

      {/* Hex Code Input */}
      <div>
        <label className="block text-[9px] font-black text-dark-muted uppercase tracking-wider mb-1">
          Hexcode
        </label>
        <input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          placeholder="#RRGGBB"
          className="w-full px-2.5 py-1 text-xs border border-light-border rounded-lg font-mono font-bold text-dark-primary focus:ring-2 focus:ring-rose-300 outline-none uppercase"
        />
      </div>

      {/* RGB Values Inputs */}
      <div>
        <label className="block text-[9px] font-black text-dark-muted uppercase tracking-wider mb-1">
          RGB Values (0 - 255)
        </label>
        <div className="grid grid-cols-3 gap-1.5 font-mono">
          <div className="flex items-center bg-slate-50 border border-light-border rounded-lg px-1.5 py-0.5">
            <span className="text-[9px] font-bold text-rose-600 mr-1">R</span>
            <input
              type="number"
              min="0"
              max="255"
              value={rVal}
              onChange={(e) => handleRgbChange(e.target.value, gVal, bVal)}
              className="w-full text-xs font-bold text-dark-slate bg-transparent outline-none p-0 text-center"
            />
          </div>
          <div className="flex items-center bg-slate-50 border border-light-border rounded-lg px-1.5 py-0.5">
            <span className="text-[9px] font-bold text-emerald-600 mr-1">G</span>
            <input
              type="number"
              min="0"
              max="255"
              value={gVal}
              onChange={(e) => handleRgbChange(rVal, e.target.value, bVal)}
              className="w-full text-xs font-bold text-dark-slate bg-transparent outline-none p-0 text-center"
            />
          </div>
          <div className="flex items-center bg-slate-50 border border-light-border rounded-lg px-1.5 py-0.5">
            <span className="text-[9px] font-bold text-blue-600 mr-1">B</span>
            <input
              type="number"
              min="0"
              max="255"
              value={bVal}
              onChange={(e) => handleRgbChange(rVal, gVal, e.target.value)}
              className="w-full text-xs font-bold text-dark-slate bg-transparent outline-none p-0 text-center"
            />
          </div>
        </div>
      </div>

      {/* Quick Presets Swatches */}
      <div>
        <label className="block text-[9px] font-black text-dark-muted uppercase tracking-wider mb-1.5">
          Quick Swatches
        </label>
        <div className="grid grid-cols-8 gap-1.5">
          {presetColors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleSelectPreset(c)}
              className={`w-5 h-5 rounded-md border transition-transform hover:scale-115 cursor-pointer shadow-2xs ${
                hexInput.toLowerCase() === c.toLowerCase()
                  ? 'border-rose-600 ring-2 ring-rose-400 scale-105'
                  : 'border-slate-300'
              }`}
              style={{ backgroundColor: c }}
              title={getColorName(c)}
            />
          ))}
        </div>
      </div>

      {/* Clear & Done Actions */}
      <div className="pt-1 border-t border-light-border flex items-center justify-between">
        {allowClear ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] font-bold text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <i className="fas fa-times text-[8px]" />
            <span>Reset Default</span>
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 transition-colors px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className={`relative min-w-0 ${className}`}>
      {label && (
        <label className="block text-[10px] font-bold text-dark-muted mb-1 truncate">{label}</label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full group text-left rounded-xl border border-light-border bg-white hover:border-slate-400/80 shadow-2xs hover:shadow-xs transition-all p-1.5 flex flex-col items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-300 min-w-0"
        title={`Color: ${colorName} (${codeLabel})`}
      >
        {/* Color Swatch Preview Box */}
        <div
          className="w-full h-7 rounded-lg border border-slate-300/80 shadow-inner relative overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[1.01]"
          style={{
            backgroundColor: activeColor,
          }}
        >
          {isDefault && (
            <span className="text-[8px] font-black text-slate-700 bg-white/85 px-1.5 py-0.5 rounded shadow-2xs uppercase tracking-wider backdrop-blur-xs">
              Default
            </span>
          )}
        </div>

        {/* Color Name at bottom of swatch */}
        <div className="w-full text-center px-0.5 min-w-0">
          <span
            className="text-[10px] font-black text-dark-primary block truncate leading-tight"
            title={colorName}
          >
            {colorName}
          </span>
          <span
            className="text-[8.5px] font-mono text-dark-muted block truncate leading-none mt-0.5"
            title={codeLabel}
          >
            {codeLabel}
          </span>
        </div>
      </button>

      {/* Expandable Color Configuration Popover - Rendered via Portal to avoid z-index/overflow issues */}
      {isOpen && createPortal(popoverContent, document.body)}
    </div>
  );
};

export default ColorPicker;

