import React from 'react';
import { DEFAULT_BLOCK_STYLE } from '../../report-card-designer/constants';

/**
 * renderSchoolHeader
 * Print renderer for the school header block.
 * Extracted from the original ReportCardGenerator.jsx
 */
export const renderSchoolHeader = ({ bleed, activeTemplate, schoolHeaderPrint }) => {
  if (!activeTemplate.showSchoolHeader) return null;
  const hdr = activeTemplate.schoolHeader || {};
  const isCompact = hdr.size === 'compact';
  const isLarge = hdr.size === 'large';
  const hdrSt = { ...DEFAULT_BLOCK_STYLE, ...(hdr.style || {}) };
  const logoSize = hdr?.logoSize ? Number(hdr.logoSize) : isCompact ? 32 : isLarge ? 64 : 48;
  const logoAlign = hdr?.logoAlign || 'center';
  const logoVAlign = hdr?.logoVerticalAlign || 'above';
  const logoOffsetY = hdr?.logoOffsetY ? Number(hdr.logoOffsetY) : 0;

  const logoEl =
    hdr?.showLogo !== false && hdr?.logoUrl ? (
      <div
        className={`flex ${
          logoAlign === 'left'
            ? 'justify-start'
            : logoAlign === 'right'
              ? 'justify-end'
              : 'justify-center'
        }`}
        style={{
          transform: logoOffsetY ? `translateY(${logoOffsetY}px)` : undefined,
        }}
      >
        <img
          src={hdr.logoUrl}
          alt="School Logo"
          style={{ height: `${logoSize}px` }}
          className="object-contain print:print-color-adjust-exact"
        />
      </div>
    ) : null;

  const textContentEl = (
    <div
      className={`space-y-1 print:space-y-0.5 ${
        logoAlign === 'left' && logoVAlign === 'inline'
          ? 'text-left'
          : logoAlign === 'right' && logoVAlign === 'inline'
            ? 'text-right'
            : 'text-center'
      }`}
    >
      {hdr?.showTitle !== false && hdr?.title && (
        <h1
          className={`font-black tracking-tight uppercase school-header-title ${
            isCompact ? 'text-lg' : isLarge ? 'text-2xl' : 'text-xl'
          }`}
          style={{
            color: hdrSt.contentColor || activeTemplate.accentColor || '#1e293b',
            fontSize: hdrSt.contentFontSize ? `${hdrSt.contentFontSize}px` : undefined,
          }}
        >
          {hdr.title}
        </h1>
      )}
      {hdr?.showSubtitle !== false && hdr?.subtitle && (
        <p
          className="font-bold uppercase tracking-wider school-header-subtitle"
          style={{
            fontSize: `${schoolHeaderPrint.subtitleFontSize}px`,
            color: hdrSt.labelColor || '#64748b',
          }}
        >
          {hdr.subtitle}
        </p>
      )}
      {hdr?.showAddress !== false && hdr?.address && (
        <p
          className="font-semibold school-header-address"
          style={{
            fontSize: `${schoolHeaderPrint.addressFontSize}px`,
            color: hdrSt.labelColor || '#94a3b8',
          }}
        >
          {hdr.address}
        </p>
      )}
      {hdr?.showExamTitle !== false && (
        <div className="pt-1">
          <span
            className="inline-block px-3 py-0.5 rounded-full text-white font-black uppercase tracking-widest school-header-exam-badge"
            style={{
              backgroundColor: activeTemplate.accentColor || '#0f172a',
              fontSize: `${schoolHeaderPrint.examTitleFontSize}px`,
            }}
          >
            {hdr?.examTitle || 'Official Progress Report'}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div
      key="schoolHeader"
      className={`${!bleed.isPageWidth ? 'border-b-2 border-slate-900' : ''} space-y-1 relative ${
        isCompact ? 'pb-2' : isLarge ? 'pb-4' : 'pb-3'
      }`}
      style={bleed.innerBgStyle('transparent')}
    >
      {hdr?.showHeaderImage && hdr?.headerImageUrl && (
        <div className="w-full mb-2 overflow-hidden rounded-xl">
          <img
            src={hdr.headerImageUrl}
            alt="School Header Banner"
            className="w-full h-auto object-contain max-h-48 rounded-lg mx-auto block"
          />
        </div>
      )}

      {logoVAlign === 'above' && logoEl}

      {logoVAlign === 'inline' ? (
        <div
          className={`flex items-center gap-3 ${
            logoAlign === 'right'
              ? 'flex-row-reverse'
              : logoAlign === 'left'
                ? 'flex-row'
                : 'flex-row justify-center'
          }`}
        >
          {logoEl}
          <div className="flex-1 min-w-0">{textContentEl}</div>
        </div>
      ) : (
        textContentEl
      )}

      {logoVAlign === 'below' && logoEl}
    </div>
  );
};