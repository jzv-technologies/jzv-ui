import React from 'react';
import { resolvePrintText } from '../utils/printUtils';

const alignmentStyle = (alignment) => ({
  textAlign: alignment || 'center',
  justifyContent:
    alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center',
});

const PageDecoration = ({ item, context = {} }) => {
  if (!item || item.visible === false) return null;
  const style = {
    ...alignmentStyle(item.alignment),
    color: item.color || '#0f172a',
    fontSize: `${item.fontSize || 12}px`,
    fontWeight:
      item.fontStyle?.includes('bold') || (!item.fontStyle && item.bold) ? 800 : 600,
    fontStyle: item.fontStyle?.includes('italic') ? 'italic' : 'normal',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    margin: 0,
  };

  if (item.type === 'image') {
    if (!item.imageUrl) return null;
    const fixedHeight = item.imageSizing === 'fixed';
    return (
      <div className="flex w-full" style={alignmentStyle(item.imagePosition)}>
        <img
          src={item.imageUrl}
          alt={item.label || 'Print header image'}
          style={{
            width: `${item.imageSize || 80}%`,
            height: fixedHeight ? `${item.imageHeight || 20}mm` : 'auto',
            maxHeight: fixedHeight ? undefined : '35mm',
            objectFit: 'contain',
          }}
        />
      </div>
    );
  }

  const text = resolvePrintText(item.text || '', context);
  if (!text) return null;
  return (
    <div style={style} className="font-semibold">
      {text}
    </div>
  );
};

const PrintPageDecorations = ({ settings = {}, context = {} }) => {
  const headers = settings.pageHeaders || [];
  const footer = settings.pageFooter || { type: 'text', text: settings.footerText };
  const visibleHeaders = headers.filter((item) => item?.visible !== false);
  const showFooter = footer?.visible !== false && (footer?.text || footer?.imageUrl);

  return (
    <>
      {visibleHeaders.length > 0 && (
        <header
          className="print-config-header hidden print:block"
          style={{ marginBottom: `${settings.headerMargin ?? 5}mm` }}
          data-print-header="configured"
        >
          {visibleHeaders.map((item, index) => (
            <PageDecoration key={item.id || index} item={item} context={context} />
          ))}
        </header>
      )}
      {showFooter && (
        <footer
          className="print-config-footer hidden print:flex"
          style={{
            marginTop: `${settings.footerMargin ?? 5}mm`,
            ...alignmentStyle(footer.alignment),
          }}
          data-print-footer="configured"
        >
          <PageDecoration item={footer} context={context} />
        </footer>
      )}
    </>
  );
};

export default PrintPageDecorations;
