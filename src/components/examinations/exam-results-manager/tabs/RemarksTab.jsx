import React from 'react';
import { ConditionalBlock } from '../../../portal-shared/ConditionalBlock';
import ExamRemarksTabView from '../../ExamRemarksTabView';

/**
 * RemarksTab
 * Remarks & Feedback Management tab content
 */
const RemarksTab = ({
  selectedSchedule,
  schedules = [],
  classes = [],
  students = [],
  userRoles = [],
  selectedClassIds = [],
  onClassIdsChange,
  onOpenUploadModal,
  isLocked,
  remarksTabRef,
}) => {
  return (
    <ConditionalBlock
      name="exam-results-tab-remarks"
      roles={userRoles}
      fallback={
        <ExamRemarksTabView
          ref={remarksTabRef}
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
      <ExamRemarksTabView
        ref={remarksTabRef}
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

export default RemarksTab;