import React from 'react';
import {
  DEFAULT_BLOCK_STYLE,
  DEFAULT_TABLE_COLUMN_HEADERS,
  TABLE_COLUMN_LABELS,
} from '../constants';
import { getActiveTableColumns, hexToRgba } from '../utils';

/**
 * renderSubjectTablePreview
 * Live-preview renderer for one report-card block.
 * This is a render function (not a component): it returns null when the block is hidden/empty so
 * PreviewPanel can skip the block wrapper, exactly like the original switch statement did.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
export const renderSubjectTablePreview = ({ bleed, blockSize, currentConfig, previewData }) => {
  if (!currentConfig.showSubjectTable) return null;
  const tbl = currentConfig.subjectTableConfig || {};
  const isCompact = blockSize === 'compact';
  const tblSt = { ...DEFAULT_BLOCK_STYLE, ...(tbl.style || {}) };
  const cellPad = isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2.5';
  const activeCols = getActiveTableColumns(tbl);
  const tblLabelStyle = {
    fontSize: `${tblSt.labelFontSize || 10}px`,
    color: tblSt.labelColor || undefined,
  };
  const tblValueStyle = {
    fontSize: `${tblSt.contentFontSize || 11}px`,
    color: tblSt.contentColor || undefined,
  };

  const showOutline = tbl.showOutlineBorder !== false;
  const outlineStyle = showOutline
    ? `${tbl.outlineBorderWidth || 1}px ${tbl.outlineBorderStyle || 'solid'} ${tbl.outlineBorderColor || '#cbd5e1'}`
    : 'none';

  const showInline = tbl.showInlineBorders !== false;
  const inlineBorderBottom = showInline
    ? `1px ${tbl.inlineBorderStyle || 'solid'} ${tbl.inlineBorderColor || '#e2e8f0'}`
    : 'none';
  const inlineBorderRight = showInline
    ? `1px ${tbl.inlineBorderStyle || 'solid'} ${tbl.inlineBorderColor || '#e2e8f0'}`
    : 'none';

  const bandedBg = tbl.bandedRows
    ? hexToRgba(tbl.bandedRowColor || '#f8fafc', (tbl.bandedRowOpacity ?? 50) / 100)
    : 'transparent';

  return (
    <div key="subjectTable" className="space-y-1" style={bleed.innerBgStyle('transparent')}>
      <div className="overflow-x-auto rounded-xl" style={{ border: outlineStyle }}>
        <table
          className={`w-full text-left border-collapse ${isCompact ? 'text-[10px]' : 'text-xs'}`}
        >
          <thead
            className="text-[10px] uppercase font-black tracking-wider"
            style={{
              backgroundColor:
                currentConfig.subjectTableConfig?.headerBgColor ||
                currentConfig.accentColor ||
                '#1e293b',
              ...tblLabelStyle,
              color: currentConfig.subjectTableConfig?.headerTextColor || '#ffffff',
              borderBottom: inlineBorderBottom,
            }}
          >
            <tr>
              {activeCols.map((colId, cIdx) => {
                const isLast = cIdx === activeCols.length - 1;
                const thBorder = !isLast ? { borderRight: inlineBorderRight } : {};
                const headerText =
                  currentConfig.subjectTableConfig?.columnLabels?.[colId] ||
                  DEFAULT_TABLE_COLUMN_HEADERS[colId] ||
                  TABLE_COLUMN_LABELS[colId] ||
                  colId;
                if (colId === 'subject') {
                  return (
                    <th key={colId} className={`${cellPad}`} style={thBorder}>
                      {headerText}
                    </th>
                  );
                }
                if (colId === 'arabicName') {
                  return (
                    <th
                      key={colId}
                      className={`${cellPad} text-center font-arabic`}
                      dir="rtl"
                      style={thBorder}
                    >
                      {headerText}
                    </th>
                  );
                }
                if (colId === 'maxMarks') {
                  return (
                    <th key={colId} className={`${cellPad} text-center`} style={thBorder}>
                      {headerText}
                    </th>
                  );
                }
                if (colId === 'passMarks') {
                  return (
                    <th key={colId} className={`${cellPad} text-center`} style={thBorder}>
                      {headerText}
                    </th>
                  );
                }
                if (colId === 'marksObtained') {
                  return (
                    <th key={colId} className={`${cellPad} text-center`} style={thBorder}>
                      {headerText}
                    </th>
                  );
                }
                if (colId === 'percentage') {
                  return (
                    <th key={colId} className={`${cellPad} text-center`} style={thBorder}>
                      {headerText}
                    </th>
                  );
                }
                if (colId === 'grade') {
                  return (
                    <th key={colId} className={`${cellPad} text-center`} style={thBorder}>
                      {headerText}
                    </th>
                  );
                }
                if (colId === 'status') {
                  return (
                    <th key={colId} className={`${cellPad} text-center`} style={thBorder}>
                      {headerText}
                    </th>
                  );
                }
                return null;
              })}
            </tr>
          </thead>
          <tbody>
            {/* Grouped Sections */}
            {previewData.sections.map((grp) => (
              <React.Fragment key={grp.groupName}>
                <tr
                  className="font-black text-[10px] text-rose-900"
                  style={{
                    backgroundColor: hexToRgba('#ffe4e6', 0.6),
                    borderBottom: inlineBorderBottom,
                  }}
                >
                  <td colSpan={activeCols.length} className="py-1 px-2.5 uppercase tracking-wider">
                    <i className="fas fa-layer-group text-[9px] mr-1.5 text-rose-600" />
                    <span>Group: {grp.groupName}</span>
                    <span className="ml-2 font-normal text-slate-600">
                      (Subtotal: {grp.groupTotalObt} / {grp.groupTotalMax} · {grp.groupPct}%)
                    </span>
                  </td>
                </tr>
                {grp.members.map((s) => (
                  <tr
                    key={s.subjectId}
                    style={{
                      borderBottom: inlineBorderBottom,
                    }}
                  >
                    {activeCols.map((colId, cIdx) => {
                      const isLast = cIdx === activeCols.length - 1;
                      const tdBorder = !isLast ? { borderRight: inlineBorderRight } : {};
                      if (colId === 'subject') {
                        return (
                          <td
                            key={colId}
                            className={`${cellPad} pl-5 font-semibold`}
                            style={{ ...tblValueStyle, ...tdBorder }}
                          >
                            • {s.subjectName}
                          </td>
                        );
                      }
                      if (colId === 'arabicName') {
                        return (
                          <td
                            key={colId}
                            className={`${cellPad} text-center font-arabic font-semibold text-slate-700`}
                            dir="rtl"
                            style={tdBorder}
                          >
                            {s.arabicName || s.arabic_name || '—'}
                          </td>
                        );
                      }
                      if (colId === 'maxMarks') {
                        return (
                          <td
                            key={colId}
                            className={`${cellPad} text-center font-mono`}
                            style={tdBorder}
                          >
                            {s.maxMarks}
                          </td>
                        );
                      }
                      if (colId === 'passMarks') {
                        return (
                          <td
                            key={colId}
                            className={`${cellPad} text-center font-mono`}
                            style={tdBorder}
                          >
                            {s.passMarks}
                          </td>
                        );
                      }
                      if (colId === 'marksObtained') {
                        const pct =
                          s.maxMarks > 0 && typeof s.marksObtained === 'number'
                            ? Math.min(
                                100,
                                Math.max(0, Math.round((s.marksObtained / s.maxMarks) * 100))
                              )
                            : 0;
                        const showBar = Boolean(tbl.showMarksBarFill) && pct > 0;
                        const isVert = tbl.marksBarDirection === 'vertical';
                        return (
                          <td
                            key={colId}
                            className={`${cellPad} text-center font-black text-dark-primary font-mono relative overflow-hidden`}
                            style={tdBorder}
                          >
                            {showBar && (
                              <div
                                className="absolute pointer-events-none transition-all"
                                style={{
                                  width: isVert ? '100%' : `${pct}%`,
                                  height: isVert ? `${pct}%` : '100%',
                                  left: 0,
                                  bottom: 0,
                                  top: isVert ? 'auto' : 0,
                                  backgroundColor: tbl.marksBarColor || '#10b981',
                                  opacity:
                                    (tbl.marksBarOpacity !== undefined
                                      ? Number(tbl.marksBarOpacity)
                                      : 25) / 100,
                                }}
                              />
                            )}
                            <span className="relative z-10">{s.marksObtained}</span>
                          </td>
                        );
                      }
                      if (colId === 'percentage') {
                        return (
                          <td
                            key={colId}
                            className={`${cellPad} text-center font-mono font-bold text-dark-slate`}
                            style={tdBorder}
                          >
                            {Math.round((s.marksObtained / s.maxMarks) * 100)}%
                          </td>
                        );
                      }
                      if (colId === 'grade') {
                        return (
                          <td
                            key={colId}
                            className={`${cellPad} text-center font-bold`}
                            style={{
                              color: tblSt.contentColor || '#047857',
                              ...tdBorder,
                            }}
                          >
                            {s.grade}
                          </td>
                        );
                      }
                      if (colId === 'status') {
                        return (
                          <td
                            key={colId}
                            className={`${cellPad} text-center font-bold`}
                            style={{
                              fontSize: `${tblSt.labelFontSize || 10}px`,
                              color: tblSt.contentColor || '#047857',
                              ...tdBorder,
                            }}
                          >
                            {s.status}
                          </td>
                        );
                      }
                      return null;
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}

            {/* Ungrouped Sections */}
            {previewData.ungrouped.map((s, uIdx) => {
              const rowBg = tbl.bandedRows && uIdx % 2 === 1 ? bandedBg : 'transparent';
              return (
                <tr
                  key={s.subjectId}
                  style={{
                    backgroundColor: rowBg,
                    borderBottom: inlineBorderBottom,
                  }}
                >
                  {activeCols.map((colId, cIdx) => {
                    const isLast = cIdx === activeCols.length - 1;
                    const tdBorder = !isLast ? { borderRight: inlineBorderRight } : {};
                    if (colId === 'subject') {
                      return (
                        <td
                          key={colId}
                          className={`${cellPad} font-semibold`}
                          style={{ ...tblValueStyle, ...tdBorder }}
                        >
                          {s.subjectName}
                        </td>
                      );
                    }
                    if (colId === 'arabicName') {
                      return (
                        <td
                          key={colId}
                          className={`${cellPad} text-center font-arabic font-semibold text-slate-700`}
                          dir="rtl"
                          style={tdBorder}
                        >
                          {s.arabicName || s.arabic_name || '—'}
                        </td>
                      );
                    }
                    if (colId === 'maxMarks') {
                      return (
                        <td
                          key={colId}
                          className={`${cellPad} text-center font-mono`}
                          style={tdBorder}
                        >
                          {s.maxMarks}
                        </td>
                      );
                    }
                    if (colId === 'passMarks') {
                      return (
                        <td
                          key={colId}
                          className={`${cellPad} text-center font-mono`}
                          style={tdBorder}
                        >
                          {s.passMarks}
                        </td>
                      );
                    }
                    if (colId === 'marksObtained') {
                      const pct =
                        s.maxMarks > 0 && typeof s.marksObtained === 'number'
                          ? Math.min(
                              100,
                              Math.max(0, Math.round((s.marksObtained / s.maxMarks) * 100))
                            )
                          : 0;
                      const showBar = Boolean(tbl.showMarksBarFill) && pct > 0;
                      const isVert = tbl.marksBarDirection === 'vertical';
                      return (
                        <td
                          key={colId}
                          className={`${cellPad} text-center font-black text-dark-primary font-mono relative overflow-hidden`}
                          style={tdBorder}
                        >
                          {showBar && (
                            <div
                              className="absolute pointer-events-none transition-all"
                              style={{
                                width: isVert ? '100%' : `${pct}%`,
                                height: isVert ? `${pct}%` : '100%',
                                left: 0,
                                bottom: 0,
                                top: isVert ? 'auto' : 0,
                                backgroundColor: tbl.marksBarColor || '#10b981',
                                opacity:
                                  (tbl.marksBarOpacity !== undefined
                                    ? Number(tbl.marksBarOpacity)
                                    : 25) / 100,
                              }}
                            />
                          )}
                          <span className="relative z-10">{s.marksObtained}</span>
                        </td>
                      );
                    }
                    if (colId === 'percentage') {
                      return (
                        <td
                          key={colId}
                          className={`${cellPad} text-center font-mono font-bold text-dark-slate`}
                          style={tdBorder}
                        >
                          {Math.round((s.marksObtained / s.maxMarks) * 100)}%
                        </td>
                      );
                    }
                    if (colId === 'grade') {
                      return (
                        <td
                          key={colId}
                          className={`${cellPad} text-center font-bold`}
                          style={{
                            color: tblSt.contentColor || '#047857',
                            ...tdBorder,
                          }}
                        >
                          {s.grade}
                        </td>
                      );
                    }
                    if (colId === 'status') {
                      return (
                        <td
                          key={colId}
                          className={`${cellPad} text-center font-bold`}
                          style={{
                            fontSize: `${tblSt.labelFontSize || 10}px`,
                            color: tblSt.contentColor || '#047857',
                            ...tdBorder,
                          }}
                        >
                          {s.status}
                        </td>
                      );
                    }
                    return null;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
