import React from 'react';
import { DEFAULT_BLOCK_STYLE, DEFAULT_BLOCK_TITLES } from '../constants';
import { ExtraComponentLayers } from '../components/ExtraComponent';
import GradingScaleLegend from '../components/GradingScaleLegend';
import { getBlockBleedStyles } from '../utils';
import { renderAttendanceBarPreview } from './renderAttendanceBarPreview';
import { renderRankHoldersPreview } from './renderRankHoldersPreview';
import { renderBlockTitle } from '../renderBlockTitle';
import { renderChartsPreview } from './renderChartsPreview';
import { renderRemarksPreview } from './renderRemarksPreview';
import { renderSchoolHeaderPreview } from './renderSchoolHeaderPreview';
import { renderSignaturesPreview } from './renderSignaturesPreview';
import { renderStudentInfoPreview } from './renderStudentInfoPreview';
import { renderSubjectTablePreview } from './renderSubjectTablePreview';
import { renderSummaryPreview } from './renderSummaryPreview';

/**
 * PreviewPanel
 * Right-hand live preview: toolbar, zoom, ExtraComponent layers and every rendered block.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const PreviewPanel = ({
  currentConfig,
  getBlockSize,
  isDraggingSplitter,
  isLgScreen,
  leftWidthPercent,
  mobileView,
  overallPreviewGrade,
  overallPreviewPct,
  previewData,
  previewScoresWithGrades,
  previewZoom,
  setPreviewZoom,
}) => {
  return (
    <div
      className={`flex flex-col bg-slate-100/90 overflow-hidden ${
        mobileView === 'config' ? 'hidden lg:flex' : 'flex'
      }`}
      style={{
        width: isLgScreen ? `${100 - leftWidthPercent}%` : '100%',
        minWidth: isLgScreen ? '320px' : undefined,
      }}
    >
      {/* Live Preview Sub-Header */}
      <div className="px-4 py-2.5 border-b border-light-border bg-white flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-black text-dark-primary uppercase tracking-wider">
            Real-Time Live Preview
          </span>
          <span className="text-[10px] text-dark-muted hidden md:inline">
            Updates dynamically with any configuration changes
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 border border-light-border rounded-xl p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPreviewZoom((z) => Math.max(z - 10, 60))}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-dark-muted hover:text-dark-primary cursor-pointer transition-all"
              title="Zoom Out"
            >
              <i className="fas fa-minus text-[9px]" />
            </button>
            <span className="text-[11px] font-black text-dark-primary px-1 min-w-[34px] text-center">
              {previewZoom}%
            </span>
            <button
              type="button"
              onClick={() => setPreviewZoom((z) => Math.min(z + 10, 140))}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-dark-muted hover:text-dark-primary cursor-pointer transition-all"
              title="Zoom In"
            >
              <i className="fas fa-plus text-[9px]" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewZoom(100)}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-dark-muted hover:text-dark-primary cursor-pointer transition-all"
              title="Reset 100%"
            >
              <i className="fas fa-undo text-[9px]" />
            </button>
          </div>

          <span className="text-[10px] font-bold text-dark-muted uppercase px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 hidden sm:inline">
            A4 Portrait
          </span>
        </div>
      </div>

      {/* Live Preview Scrollable Canvas */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex justify-center items-start">
        <div
          style={{
            transform: previewZoom !== 100 ? `scale(${previewZoom / 100})` : undefined,
            transformOrigin: 'top center',
            transition: isDraggingSplitter ? 'none' : 'transform 0.15s ease',
          }}
          className="w-full max-w-3xl"
        >
          {/* Sample Report Card Container */}
          <div
            className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col min-h-[920px]"
            style={{
              '--page-pad-x': '24px',
              '--page-pad-y': '24px',
            }}
          >
            {/* ── ExtraComponent / Logo Layers: Background layers (z-0, behind content) ── */}
            <ExtraComponentLayers currentConfig={currentConfig} position="background" />

            <div
              className="relative z-10 flex flex-col flex-1 h-full min-h-0"
              style={{ gap: `${currentConfig.blockSpacing ?? 12}px` }}
            >
              {currentConfig.blockOrder.map((blockKey) => {
                const blockSize = getBlockSize(blockKey);

                const getBlockStyleObj = () => {
                  switch (blockKey) {
                    case 'schoolHeader':
                      return {
                        ...DEFAULT_BLOCK_STYLE,
                        ...(currentConfig.schoolHeader?.style || {}),
                      };
                    case 'studentInfo':
                      return {
                        ...DEFAULT_BLOCK_STYLE,
                        ...(currentConfig.studentInfoConfig?.style || {}),
                      };
                    case 'attendanceBar':
                      return {
                        ...DEFAULT_BLOCK_STYLE,
                        ...(currentConfig.attendanceBarConfig?.style || {}),
                      };
                    case 'rankHolders':
                      return {
                        ...DEFAULT_BLOCK_STYLE,
                        ...(currentConfig.rankHoldersConfig?.style || {}),
                      };
                    case 'subjectTable':
                      return {
                        ...DEFAULT_BLOCK_STYLE,
                        ...(currentConfig.subjectTableConfig?.style || {}),
                      };
                    case 'summaryCalculations':
                      return {
                        ...DEFAULT_BLOCK_STYLE,
                        ...(currentConfig.summaryConfig?.style || {}),
                      };
                    case 'charts':
                      return {
                        ...DEFAULT_BLOCK_STYLE,
                        ...(currentConfig.chartConfig?.style || {}),
                      };
                    case 'remarks':
                      return {
                        ...DEFAULT_BLOCK_STYLE,
                        ...(currentConfig.remarksConfig?.style || {}),
                      };
                    case 'signatures':
                      return {
                        ...DEFAULT_BLOCK_STYLE,
                        ...(currentConfig.signaturesConfig?.style || {}),
                      };
                    default:
                      return DEFAULT_BLOCK_STYLE;
                  }
                };

                const blockSt = getBlockStyleObj();
                const bleed = getBlockBleedStyles(blockSt, blockKey);

                const blockContent = (() => {
                  switch (blockKey) {
                    case 'schoolHeader': {
                      return renderSchoolHeaderPreview({ bleed, blockSize, currentConfig });
                    }

                    case 'studentInfo': {
                      return renderStudentInfoPreview({ bleed, blockSize, currentConfig });
                    }

                    case 'attendanceBar': {
                      return renderAttendanceBarPreview({ blockSize, currentConfig });
                    }

                    case 'rankHolders': {
                      return renderRankHoldersPreview({ blockSize, currentConfig });
                    }

                    case 'subjectTable': {
                      return renderSubjectTablePreview({
                        bleed,
                        blockSize,
                        currentConfig,
                        previewData,
                      });
                    }

                    case 'summaryCalculations': {
                      return renderSummaryPreview({
                        bleed,
                        blockSize,
                        currentConfig,
                        overallPreviewGrade,
                        overallPreviewPct,
                      });
                    }

                    case 'charts': {
                      return renderChartsPreview({
                        bleed,
                        blockSize,
                        currentConfig,
                        overallPreviewPct,
                        previewScoresWithGrades,
                      });
                    }

                    case 'remarks': {
                      return renderRemarksPreview({ bleed, blockSize, currentConfig });
                    }

                    case 'signatures': {
                      return renderSignaturesPreview({ bleed, blockSize, currentConfig });
                    }

                    default:
                      return null;
                  }
                })();

                if (!blockContent) return null;

                return (
                  <div
                    key={blockKey}
                    className={`relative transition-all ${!bleed.isPageWidth ? 'w-full' : ''} ${blockKey === 'signatures' ? 'mt-auto' : ''}`}
                    style={bleed.wrapperStyle}
                    {...bleed.wrapperAttrs}
                  >
                    {renderBlockTitle(blockSt, DEFAULT_BLOCK_TITLES[blockKey])}
                    {blockContent}
                  </div>
                );
              })}

              {/* Optional Grading Scale Legend on Preview */}
              {currentConfig.showGradingScale && currentConfig.gradingScale?.length > 0 && (
                <GradingScaleLegend currentConfig={currentConfig} />
              )}
            </div>

            {/* ── ExtraComponent / Logo Layers: Foreground layers (z-30, above content) ── */}
            <ExtraComponentLayers currentConfig={currentConfig} position="foreground" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
