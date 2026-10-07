import React from 'react';
import AttendanceBarSettings from './AttendanceBarSettings';
import RankHoldersSettings from './RankHoldersSettings';
import BlockCommonSettings from './BlockCommonSettings';
import ChartsSettings from './ChartsSettings';
import { DEFAULT_BLOCK_STYLE } from '../constants';
import RemarksSettings from './RemarksSettings';
import SchoolHeaderSettings from './SchoolHeaderSettings';
import SignaturesSettings from './SignaturesSettings';
import StudentInfoSettings from './StudentInfoSettings';
import SubjectTableSettings from './SubjectTableSettings';
import SummarySettings from './SummarySettings';

/**
 * BlockSettingsPanel
 * Expandable settings panel for a block (common settings + the block-specific section).
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const BlockSettingsPanel = ({
  blockKey,
  blockSize,
  currentConfig,
  isVisible,
  setBlockSize,
  setCurrentConfig,
  toggleBlockVisibility,
}) => {
  // Helper to get/set block style
  const getBlockStyle = () => {
    switch (blockKey) {
      case 'schoolHeader':
        return currentConfig.schoolHeader?.style || {};
      case 'studentInfo':
        return currentConfig.studentInfoConfig?.style || {};
      case 'attendanceBar':
        return currentConfig.attendanceBarConfig?.style || {};
      case 'rankHolders':
        return currentConfig.rankHoldersConfig?.style || {};
      case 'subjectTable':
        return currentConfig.subjectTableConfig?.style || {};
      case 'summaryCalculations':
        return currentConfig.summaryConfig?.style || {};
      case 'charts':
        return currentConfig.chartConfig?.style || {};
      case 'remarks':
        return currentConfig.remarksConfig?.style || {};
      case 'signatures':
        return currentConfig.signaturesConfig?.style || {};
      default:
        return {};
    }
  };
  const setBlockStyle = (stylePatch) => {
    const merged = {
      ...DEFAULT_BLOCK_STYLE,
      ...getBlockStyle(),
      ...stylePatch,
    };
    switch (blockKey) {
      case 'schoolHeader':
        setCurrentConfig((p) => ({
          ...p,
          schoolHeader: { ...p.schoolHeader, style: merged },
        }));
        break;
      case 'studentInfo':
        setCurrentConfig((p) => ({
          ...p,
          studentInfoConfig: { ...p.studentInfoConfig, style: merged },
        }));
        break;
      case 'attendanceBar':
        setCurrentConfig((p) => ({
          ...p,
          attendanceBarConfig: {
            ...p.attendanceBarConfig,
            style: merged,
          },
        }));
        break;
      case 'rankHolders':
        setCurrentConfig((p) => ({
          ...p,
          rankHoldersConfig: {
            ...p.rankHoldersConfig,
            style: merged,
          },
        }));
        break;
      case 'subjectTable':
        setCurrentConfig((p) => ({
          ...p,
          subjectTableConfig: { ...p.subjectTableConfig, style: merged },
        }));
        break;
      case 'summaryCalculations':
        setCurrentConfig((p) => ({
          ...p,
          summaryConfig: { ...p.summaryConfig, style: merged },
        }));
        break;
      case 'charts':
        setCurrentConfig((p) => ({
          ...p,
          chartConfig: { ...p.chartConfig, style: merged },
        }));
        break;
      case 'remarks':
        setCurrentConfig((p) => ({
          ...p,
          remarksConfig: { ...p.remarksConfig, style: merged },
        }));
        break;
      case 'signatures':
        setCurrentConfig((p) => ({
          ...p,
          signaturesConfig: { ...p.signaturesConfig, style: merged },
        }));
        break;
      default:
        break;
    }
  };
  const bs = { ...DEFAULT_BLOCK_STYLE, ...getBlockStyle() };
  return (
    <div className="border-t border-slate-100 bg-slate-50/70 p-2 sm:p-3 space-y-2 animate-in fade-in duration-150">
      <BlockCommonSettings
        blockKey={blockKey}
        blockSize={blockSize}
        bs={bs}
        isVisible={isVisible}
        setBlockSize={setBlockSize}
        setBlockStyle={setBlockStyle}
        toggleBlockVisibility={toggleBlockVisibility}
      />

      {/* 1. School Header Details */}
      {blockKey === 'schoolHeader' && (
        <SchoolHeaderSettings currentConfig={currentConfig} setCurrentConfig={setCurrentConfig} />
      )}

      {/* 2. Student Info Details */}
      {blockKey === 'studentInfo' && (
        <StudentInfoSettings currentConfig={currentConfig} setCurrentConfig={setCurrentConfig} />
      )}

      {/* Attendance Horizontal Stack Bar Details */}
      {blockKey === 'attendanceBar' && (
        <AttendanceBarSettings currentConfig={currentConfig} setCurrentConfig={setCurrentConfig} />
      )}

      {/* Rank Holders Details */}
      {blockKey === 'rankHolders' && (
        <RankHoldersSettings currentConfig={currentConfig} setCurrentConfig={setCurrentConfig} />
      )}

      {/* 3. Subject Table Details */}
      {blockKey === 'subjectTable' && (
        <SubjectTableSettings currentConfig={currentConfig} setCurrentConfig={setCurrentConfig} />
      )}

      {/* 4. Performance Summary Details */}
      {blockKey === 'summaryCalculations' && (
        <SummarySettings currentConfig={currentConfig} setCurrentConfig={setCurrentConfig} />
      )}

      {/* 5. Charts Details — Multi-Column Configurator */}
      {blockKey === 'charts' && (
        <ChartsSettings currentConfig={currentConfig} setCurrentConfig={setCurrentConfig} />
      )}

      {/* 6. Teacher Remarks Details */}
      {blockKey === 'remarks' && (
        <RemarksSettings currentConfig={currentConfig} setCurrentConfig={setCurrentConfig} />
      )}

      {/* 7. Signatures Details */}
      {blockKey === 'signatures' && (
        <SignaturesSettings currentConfig={currentConfig} setCurrentConfig={setCurrentConfig} />
      )}
    </div>
  );
};

export default BlockSettingsPanel;
