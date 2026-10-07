import React from 'react';
import { getExtraComponentLayers } from '../../report-card-designer/components/ExtraComponent';

/**
 * ExtraComponentLayers
 * Renders the watermark / logo layers on top of the report card canvas.
 *   position="background" → behind the content blocks (z-0)
 *   position="foreground" → above the content blocks (z-30)
 * Renders nothing when `currentConfig.showExtraComponent` is off.
 * Re-exported from report-card-designer for generator use.
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
          className={`absolute pointer-events-none select-none ${isBackground ? 'z-0' : 'z-30'} flex items-center justify-center print:print-color-adjust-exact`}
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

export default ExtraComponentLayers;