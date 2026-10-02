import React from 'react';

export const renderBlockTitle = (style = {}, defaultTitle = '') => {
  if (!style || !style.showTitle) return null;
  const titleText = style.title !== undefined && style.title !== '' ? style.title : defaultTitle;
  if (!titleText) return null;
  const align = style.titleAlign || 'left';
  const alignClass =
    align === 'center'
      ? 'text-center justify-center'
      : align === 'right'
        ? 'text-right justify-end'
        : 'text-left justify-start';

  return (
    <div className={`w-full flex items-center mb-1.5 ${alignClass}`}>
      <h3
        className="font-black uppercase tracking-wider text-xs"
        style={{
          color: style.labelColor || '#1e293b',
          fontSize: style.labelFontSize ? `${style.labelFontSize + 2}px` : '11px',
        }}
      >
        {titleText}
      </h3>
    </div>
  );
};
