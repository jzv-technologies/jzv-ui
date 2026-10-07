import React from 'react';
import { ConditionalBlock } from '../../../portal-shared/ConditionalBlock';
import ExamAttendanceTabView from '../../ExamAttendanceTabView';

/**
 * AttendanceTab
 * Attendance Management tab content
 */
const AttendanceTab = ({
  selectedSchedule,
  schedules = [],
  classes = [],
  students = [],
  userRoles = [],
  selectedClassIds = [],
  onClassIdsChange,
  onOpenUploadModal,
  isLocked,
  attendanceTabRef,
}) => {
  return (
    <ConditionalBlock
      name="exam-results-tab-attendance"
      roles={userRoles}
      fallback={
        <ExamAttendanceTabView
          ref={attendanceTabRef}
          schedule={selectedSchedule}
          schedules={schedules}
          classes={classes}
          students={students}
          userRoles={userRoles}
          selectedClassIds={selectedClassIds}
          onClassIdsChange={onClassIdsChange}
          onOpenUploadModal={onOpenUploadModal}
          isLocked={isLocked}
        />
      }
    >
      <ExamAttendanceTabView
        ref={attendanceTabRef}
        schedule={selectedSchedule}
        schedules={schedules}
        classes={classes}
        students={students}
        userRoles={userRoles}
        selectedClassIds={selectedClassIds}
        onClassIdsChange={onClassIdsChange}
        onOpenUploadModal={onOpenUploadModal}
        isLocked={isLocked}
      />
    </ConditionalBlock>
  );
};

export default AttendanceTab;