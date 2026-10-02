import React from 'react';
import AttendanceHorizontalStackBar from '../../AttendanceHorizontalStackBar';
import { PREVIEW_STUDENT } from '../constants';

/**
 * renderAttendanceBarPreview
 * Live-preview renderer for one report-card block.
 * This is a render function (not a component): it returns null when the block is hidden/empty so
 * PreviewPanel can skip the block wrapper, exactly like the original switch statement did.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
export const renderAttendanceBarPreview = ({ blockSize, currentConfig }) => {
  if (!currentConfig.showAttendanceBar) return null;
  return (
    <div key="attendanceBar">
      <AttendanceHorizontalStackBar
        student={PREVIEW_STUDENT}
        config={currentConfig.attendanceBarConfig}
        isCompact={blockSize === 'compact'}
      />
    </div>
  );
};
