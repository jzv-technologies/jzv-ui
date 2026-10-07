import React from 'react';
import AttendanceHorizontalStackBar from '../../AttendanceHorizontalStackBar';

/**
 * renderAttendanceBar
 * Print renderer for the attendance bar block.
 * Extracted from the original ReportCardGenerator.jsx
 */
export const renderAttendanceBar = ({ activeTemplate, student, attendanceBarPrint }) => {
  if (!activeTemplate.showAttendanceBar) return null;
  return (
    <div key="attendanceBar">
      <AttendanceHorizontalStackBar
        student={student}
        config={activeTemplate.attendanceBarConfig}
        isCompact={false}
      />
    </div>
  );
};