import React from 'react';
import { DEFAULT_BLOCK_STYLE } from '../constants';

/**
 * renderSignaturesPreview
 * Live-preview renderer for one report-card block.
 * This is a render function (not a component): it returns null when the block is hidden/empty so
 * PreviewPanel can skip the block wrapper, exactly like the original switch statement did.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
export const renderSignaturesPreview = ({ bleed, blockSize, currentConfig }) => {
  if (!currentConfig.showSignatures) return null;
  const sigCfg = currentConfig.signaturesConfig || {};
  const isCompact = blockSize === 'compact';
  const sigSt = { ...DEFAULT_BLOCK_STYLE, ...(sigCfg.style || {}) };

  const activeSigs = [
    sigCfg.showSignature1 && {
      id: 'signature1',
      title: currentConfig.signatures?.signature1 || 'Signature 1',
    },
    sigCfg.showSignature2 && {
      id: 'signature2',
      title: currentConfig.signatures?.signature2 || 'Signature 2',
    },
    sigCfg.showSignature3 && {
      id: 'signature3',
      title: currentConfig.signatures?.signature3 || 'Signature 3',
    },
    sigCfg.showSignature4 && {
      id: 'signature4',
      title: currentConfig.signatures?.signature4 || 'Signature 4',
    },
  ].filter(Boolean);

  if (activeSigs.length === 0) return null;

  return (
    <div
      key="signatures"
      className={`${!bleed.isPageWidth ? 'border-t-2 border-slate-300' : ''} grid gap-4 text-center ${
        activeSigs.length === 1 ? 'max-w-xs mx-auto' : ''
      } ${isCompact ? 'pt-3' : 'pt-6'}`}
      style={{
        gridTemplateColumns: `repeat(${activeSigs.length}, minmax(0, 1fr))`,
        ...bleed.innerBgStyle('transparent'),
      }}
    >
      {activeSigs.map((sig) => (
        <div key={sig.id} className="space-y-1">
          <div className="h-5 border-b border-dashed border-slate-400 mx-auto w-3/4" />
          <span
            className="font-bold block uppercase"
            style={{
              fontSize: `${sigSt.labelFontSize || 10}px`,
              color: sigSt.labelColor || '#64748b',
            }}
          >
            {sig.title}
          </span>
        </div>
      ))}
    </div>
  );
};
