import React, { useState } from 'react';
import { ColorPicker } from '../ColorPicker';

/**
 * Normalises the ExtraComponent layer list.
 * Older templates stored a single `extraComponentConfig` object; newer ones store an
 * `extraComponentLayers` array. Both shapes are returned as an array of layers.
 */
export const getExtraComponentLayers = (config = {}, legacyId = 'wm-0') => {
  if (Array.isArray(config.extraComponentLayers) && config.extraComponentLayers.length > 0) {
    return config.extraComponentLayers;
  }
  if (config.extraComponentConfig) {
    return [{ ...config.extraComponentConfig, layer: 'background', id: legacyId }];
  }
  if (config.watermarkConfig) {
    return [{ ...config.watermarkConfig, layer: 'background', id: legacyId }];
  }
  return [];
};

/**
 * <ExtraComponentLayers />
 * Renders the watermark / logo layers on top of the report card canvas.
 *   position="background" → behind the content blocks (z-0)
 *   position="foreground" → above the content blocks (z-30)
 * Renders nothing when `currentConfig.showExtraComponent` is off.
 */
export const ExtraComponentLayers = ({ currentConfig, position = 'background' }) => {
  if (!currentConfig?.showExtraComponent && !currentConfig?.showWatermark) return null;

  const isBackground = position === 'background';
  const layers = getExtraComponentLayers(currentConfig, 'wm-legacy');
  const visibleLayers = layers.filter((l) =>
    isBackground ? (l.layer || 'background') === 'background' : l.layer === 'foreground'
  );

  return (
    <>
      {visibleLayers.map((lyr, idx) => (
        <div
          key={lyr.id || `${isBackground ? 'bg' : 'fg'}-${idx}`}
          className={`absolute pointer-events-none select-none ${
            isBackground ? 'z-0' : 'z-30'
          } flex items-center justify-center print:print-color-adjust-exact`}
          style={{
            left: `${lyr.xPos ?? 50}%`,
            top: `${lyr.yPos ?? 50}%`,
            transform: `translate(-50%, -50%) rotate(${lyr.rotate ?? 0}deg)`,
            opacity: (lyr.opacity ?? 15) / 100,
          }}
        >
          {lyr.type === 'image' && lyr.imageUrl ? (
            <img
              src={lyr.imageUrl}
              alt="ExtraComponent"
              style={{
                width: `${lyr.size ?? 250}px`,
                maxWidth: '90vw',
                objectFit: 'contain',
              }}
            />
          ) : (
            <span
              style={{
                fontSize: `${lyr.size ?? 50}px`,
                color: lyr.color || '#0f172a',
                fontWeight: 900,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}
            >
              {lyr.text || 'WATERMARK'}
            </span>
          )}
        </div>
      ))}
    </>
  );
};

/**
 * <ExtraComponentConfig />
 * The "Extra Components" settings card (enable switch + multi-layer editor).
 *
 * Props
 *  - currentConfig / setCurrentConfig : the template config state
 *  - expanded / onExpandedChange      : optional – control the open/closed state from outside
 *                                       (omit both and the card manages its own state)
 */
const ExtraComponentConfig = ({
  currentConfig,
  setCurrentConfig,
  expanded,
  onExpandedChange,
  defaultExpanded = false,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = expanded !== undefined;
  const isExtraComponentExpanded = isControlled ? !!expanded : internalExpanded;
  const setIsExtraComponentExpanded = (next) => {
    const value = typeof next === 'function' ? next(isExtraComponentExpanded) : next;
    if (!isControlled) setInternalExpanded(value);
    if (onExpandedChange) onExpandedChange(value);
  };

  return (
    <div className="bg-white border border-light-border shadow-2xs overflow-hidden transition-all">
      <div
        onClick={() => setIsExtraComponentExpanded((prev) => !prev)}
        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs shrink-0 shadow-2xs">
            <i className="fas fa-layer-group" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-dark-primary tracking-tight">
                Extra Components
              </h4>
              {currentConfig.showExtraComponent ? (
                <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-700">
                  {
                    (
                      currentConfig.extraComponentLayers || [currentConfig.extraComponentConfig]
                    ).filter(Boolean).length
                  }{' '}
                  layer(s)
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded-full bg-slate-100 text-slate-500">
                  Off
                </span>
              )}
            </div>
            <p className="text-[10px] text-dark-muted leading-tight">
              Stack multiple text or image layers — each independently positioned as background or
              foreground
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            role="switch"
            aria-checked={!!currentConfig.showExtraComponent}
            onClick={() => {
              setCurrentConfig((p) => ({
                ...p,
                showExtraComponent: !p.showExtraComponent,
              }));
              if (!currentConfig.showExtraComponent) setIsExtraComponentExpanded(true);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              currentConfig.showExtraComponent ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                currentConfig.showExtraComponent ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setIsExtraComponentExpanded((prev) => !prev)}
            className="px-2.5 py-1 rounded-xl text-xs font-black border border-light-border bg-white text-dark-slate hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>{isExtraComponentExpanded ? 'Collapse' : 'Expand'}</span>
            <i
              className={`fas fa-chevron-down text-[8px] transition-transform duration-200 ${
                isExtraComponentExpanded ? 'rotate-180 text-indigo-600' : 'text-slate-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ExtraComponent Layers Editor */}
      {isExtraComponentExpanded &&
        (() => {
          // Normalize: migrate old single extraComponentConfig → new extraComponentLayers array
          const layers = getExtraComponentLayers(currentConfig, 'wm-0');

          const updateLayers = (newLayers) =>
            setCurrentConfig((p) => ({ ...p, extraComponentLayers: newLayers }));

          const updateLayer = (idx, patch) =>
            updateLayers(layers.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

          const addLayer = () =>
            updateLayers([
              ...layers,
              {
                id: `wm-${Date.now()}`,
                type: 'text',
                layer: 'background',
                text: 'WATERMARK',
                color: '#0f172a',
                imageUrl: '',
                xPos: 50,
                yPos: 50,
                opacity: 8,
                size: 60,
                rotate: -30,
              },
            ]);

          const removeLayer = (idx) => updateLayers(layers.filter((_, i) => i !== idx));

          const duplicateLayer = (idx) =>
            updateLayers([
              ...layers.slice(0, idx + 1),
              { ...layers[idx], id: `wm-${Date.now()}` },
              ...layers.slice(idx + 1),
            ]);

          const moveLayer = (idx, dir) => {
            const next = [...layers];
            const swap = idx + dir;
            if (swap < 0 || swap >= next.length) return;
            [next[idx], next[swap]] = [next[swap], next[idx]];
            updateLayers(next);
          };

          return (
            <div className="border-t border-slate-100 bg-slate-50/70 p-2 sm:p-3 space-y-3 animate-in fade-in duration-150">
              {layers.length === 0 && (
                <p className="text-xs text-dark-muted text-center py-3">
                  No layers yet — click <strong>+ Add Layer</strong> below.
                </p>
              )}

              {layers.map((lyr, idx) => {
                const isText = (lyr.type || 'text') === 'text';
                return (
                  <div
                    key={lyr.id || idx}
                    className="bg-white border border-light-border rounded-xl overflow-hidden shadow-2xs"
                  >
                    {/* Layer Header */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-dark-slate uppercase tracking-wide">
                          Layer {idx + 1}
                        </span>
                        {/* Background / Foreground toggle */}
                        <div className="flex items-center bg-slate-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => updateLayer(idx, { layer: 'background' })}
                            className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all cursor-pointer ${
                              (lyr.layer || 'background') === 'background'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                            title="Renders behind all content blocks"
                          >
                            <i className="fas fa-layer-group mr-0.5" /> BG
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLayer(idx, { layer: 'foreground' })}
                            className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all cursor-pointer ${
                              lyr.layer === 'foreground'
                                ? 'bg-violet-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                            title="Renders above all content blocks"
                          >
                            <i className="fas fa-arrow-up mr-0.5" /> FG
                          </button>
                        </div>
                        {/* Text / Image toggle */}
                        <div className="flex items-center bg-slate-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => updateLayer(idx, { type: 'text' })}
                            className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all cursor-pointer ${
                              isText
                                ? 'bg-white text-indigo-700 shadow-xs'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <i className="fas fa-font mr-0.5" /> Text
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLayer(idx, { type: 'image' })}
                            className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all cursor-pointer ${
                              !isText
                                ? 'bg-white text-indigo-700 shadow-xs'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <i className="fas fa-image mr-0.5" /> Image
                          </button>
                        </div>
                      </div>
                      {/* Layer actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveLayer(idx, -1)}
                          disabled={idx === 0}
                          title="Move up"
                          className="w-5 h-5 flex items-center justify-center rounded text-[9px] text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <i className="fas fa-chevron-up" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLayer(idx, 1)}
                          disabled={idx === layers.length - 1}
                          title="Move down"
                          className="w-5 h-5 flex items-center justify-center rounded text-[9px] text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <i className="fas fa-chevron-down" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateLayer(idx)}
                          title="Duplicate"
                          className="w-5 h-5 flex items-center justify-center rounded text-[9px] text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          <i className="fas fa-copy" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLayer(idx)}
                          title="Remove layer"
                          className="w-5 h-5 flex items-center justify-center rounded text-[9px] text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>

                    {/* Layer Body */}
                    <div className="p-3 space-y-3">
                      {/* Content Input */}
                      {isText ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-dark-slate mb-1">
                              Text
                            </label>
                            <input
                              type="text"
                              value={lyr.text ?? 'WATERMARK'}
                              onChange={(e) => updateLayer(idx, { text: e.target.value })}
                              placeholder="e.g. CONFIDENTIAL"
                              className="w-full px-2 py-1.5 text-xs border border-light-border rounded-lg bg-white font-bold"
                            />
                          </div>
                          <div className="min-w-0">
                            <ColorPicker
                              label="Text Color"
                              value={lyr.color || '#0f172a'}
                              placeholder="#0f172a"
                              allowClear={false}
                              onChange={(c) => updateLayer(idx, { color: c })}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-dark-slate">
                            Image URL
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={lyr.imageUrl || ''}
                              onChange={(e) => updateLayer(idx, { imageUrl: e.target.value })}
                              placeholder="/media/logo.png or https://..."
                              className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-light-border rounded-lg bg-white font-bold"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateLayer(idx, {
                                  imageUrl:
                                    currentConfig.schoolHeader?.logoUrl ||
                                    '/media/jzv-cap-logo.png',
                                })
                              }
                              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-dark-slate rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0"
                            >
                              Use Logo
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Numeric Controls Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-2">
                        {/* X Position */}
                        <div>
                          <label className="block text-[10px] font-bold text-dark-slate mb-1">
                            X Position
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={lyr.xPos ?? 50}
                              onChange={(e) => updateLayer(idx, { xPos: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 pr-7 text-xs border border-light-border rounded-lg bg-white font-mono font-bold text-right"
                            />
                            <span className="absolute right-2 text-[10px] text-dark-muted font-bold pointer-events-none">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Y Position */}
                        <div>
                          <label className="block text-[10px] font-bold text-dark-slate mb-1">
                            Y Position
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={lyr.yPos ?? 50}
                              onChange={(e) => updateLayer(idx, { yPos: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 pr-7 text-xs border border-light-border rounded-lg bg-white font-mono font-bold text-right"
                            />
                            <span className="absolute right-2 text-[10px] text-dark-muted font-bold pointer-events-none">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Opacity */}
                        <div>
                          <label className="block text-[10px] font-bold text-dark-slate mb-1">
                            Opacity
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={lyr.opacity ?? 8}
                              onChange={(e) =>
                                updateLayer(idx, { opacity: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1.5 pr-7 text-xs border border-light-border rounded-lg bg-white font-mono font-bold text-right"
                            />
                            <span className="absolute right-2 text-[10px] text-dark-muted font-bold pointer-events-none">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Size */}
                        <div>
                          <label className="block text-[10px] font-bold text-dark-slate mb-1">
                            {isText ? 'Font Size' : 'Width'}
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={isText ? 8 : 20}
                              max={isText ? 200 : 800}
                              value={lyr.size ?? (isText ? 60 : 260)}
                              onChange={(e) => updateLayer(idx, { size: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 pr-7 text-xs border border-light-border rounded-lg bg-white font-mono font-bold text-right"
                            />
                            <span className="absolute right-2 text-[10px] text-dark-muted font-bold pointer-events-none">
                              px
                            </span>
                          </div>
                        </div>

                        {/* Rotation */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-dark-slate mb-1">
                            Rotation
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={-180}
                              max={180}
                              value={lyr.rotate ?? -30}
                              onChange={(e) => updateLayer(idx, { rotate: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 pr-7 text-xs border border-light-border rounded-lg bg-white font-mono font-bold text-right"
                            />
                            <span className="absolute right-2 text-[10px] text-dark-muted font-bold pointer-events-none">
                              °
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Layer Button */}
              <button
                type="button"
                onClick={addLayer}
                className="w-full py-2 border-2 border-dashed border-indigo-200 hover:border-indigo-400 text-indigo-600 hover:text-indigo-800 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fas fa-plus" />
                Add Layer
              </button>
            </div>
          );
        })()}
    </div>
  );
};

export default ExtraComponentConfig;
