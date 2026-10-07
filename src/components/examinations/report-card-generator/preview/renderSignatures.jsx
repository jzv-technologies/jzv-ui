import React from 'react';
import { DEFAULT_BLOCK_STYLE } from '../../report-card-designer/constants';

/**
 * renderSignatures
 * Print renderer for the signatures block.
 * Extracted from the original ReportCardGenerator.jsx
 */
export const renderSignatures = ({ bleed, activeTemplate, signaturesPrint }) => {
  if (!activeTemplate.showSignatures) return null;
  const sigCfg = activeTemplate.signaturesConfig || {};
  const sigSt = { ...DEFAULT_BLOCK_STYLE, ...(sigCfg.style || {}) };
  const isCompact = sigCfg.size === 'compact';
  const isTall = sigCfg.size === 'tall';
  const ptClass = isCompact ? 'pt-3 print:pt-1.5' : isTall ? 'pt-8 print:pt-3' : 'pt-6 print:pt-2';

  const isSig1 = sigCfg.showSignature1 !== undefined ? !!sigCfg.showSignature1 : true;
  const isSig2 = sigCfg.showSignature2 !== undefined ? !!sigCfg.showSignature2 : true;
  const isSig3 = sigCfg.showSignature3 !== undefined ? !!sigCfg.showSignature3 : true;
  const isSig4 = sigCfg.showSignature4 !== undefined ? !!sigCfg.showSignature4 : true;

  const activeSigs = [
    isSig1 && { id: 'signature1', title: activeTemplate.signatures?.signature1 || 'Signature 1', subtitle: 'Signature' },
    isSig2 && { id: 'signature2', title: activeTemplate.signatures?.signature2 || 'Signature 2', subtitle: 'Signature' },
    isSig3 && { id: 'signature3', title: activeTemplate.signatures?.signature3 || 'Signature 3', subtitle: 'Seal & Signature' },
    isSig4 && { id: 'signature4', title: activeTemplate.signatures?.signature4 || 'Signature 4', subtitle: 'Signature' },
  ].filter(Boolean);

  if (activeSigs.length === 0) return null;

  return (
    <div
      key="signatures"
      className={`report-card-signatures ${ptClass} grid gap-4 print:gap-2 text-center ${activeSigs.length === 1 ? 'max-w-xs mx-auto' : ''}`}
      style={{ gridTemplateColumns: `repeat(${activeSigs.length}, minmax(0, 1fr))`, ...bleed.innerBgStyle('transparent') }}
    >
      {activeSigs.map((sig) => (
        <div key={sig.id} className="border-t border-slate-900 pt-1.5 print:pt-0.5 space-y-0.5">
          <span className="font-bold text-dark-slate block truncate signature-title" style={{ fontSize: `${signaturesPrint.labelFontSize}px`, color: sigSt.labelColor || undefined }}>
            {sig.title}
          </span>
          <span className="text-dark-muted block truncate signature-subtitle" style={{ fontSize: `${signaturesPrint.contentFontSize}px` }}>
            {sig.subtitle}
          </span>
        </div>
      ))}
    </div>
  );
};