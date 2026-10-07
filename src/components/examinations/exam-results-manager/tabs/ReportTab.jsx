import React from 'react';
import { ConditionalBlock } from '../../../portal-shared/ConditionalBlock';
import ReportCardGenerator from '../../ReportCardGenerator';

/**
 * ReportTab
 * Exam Reports tab content
 */
const ReportTab = ({
  schedules,
  classes,
  subjects,
  students,
  selectedScheduleId,
  selectedClassId,
  rankHolderClassIds,
  reportType,
  userRoles,
  reportSelectedStudentIds,
  setReportSelectedStudentIds,
  reportTemplateId,
  setReportTemplateId,
  reportTemplates,
  setReportTemplates,
  paperSize,
  setPaperSize,
  orientation,
  setOrientation,
  hideControlBar,
  isAttendanceModalOpen,
  setIsAttendanceModalOpen,
  onAttendanceModalOpenChange,
  isRemarksModalOpen,
  setIsRemarksModalOpen,
  onRemarksModalOpenChange,
  onAttendanceCountChange,
  onRemarksCountChange,
  onSchedulePublishedChange,
}) => {
  const handleAttendanceModalOpenChange = onAttendanceModalOpenChange || setIsAttendanceModalOpen;
  const handleRemarksModalOpenChange = onRemarksModalOpenChange || setIsRemarksModalOpen;

  return (
    <ConditionalBlock name="exam-results-tab-report" roles={userRoles}>
      <ReportCardGenerator
        schedules={schedules}
        classes={classes}
        subjects={subjects}
        students={students}
        initialScheduleId={selectedScheduleId}
        initialClassId={selectedClassId}
        selectedClassIds={
          reportType === 'rank_holder'
            ? rankHolderClassIds
            : selectedClassId
              ? [selectedClassId]
              : []
        }
        reportMode={reportType}
        userRoles={userRoles}
        selectedStudentIds={reportSelectedStudentIds}
        onSelectedStudentIdsChange={setReportSelectedStudentIds}
        selectedTemplateId={reportTemplateId}
        onSelectedTemplateIdChange={setReportTemplateId}
        onTemplatesLoaded={setReportTemplates}
        paperSize={paperSize}
        orientation={orientation}
        hideControlBar={hideControlBar}
        isAttendanceModalOpen={isAttendanceModalOpen}
        onAttendanceModalOpenChange={handleAttendanceModalOpenChange}
        isRemarksModalOpen={isRemarksModalOpen}
        onRemarksModalOpenChange={handleRemarksModalOpenChange}
        onAttendanceCountChange={onAttendanceCountChange}
        onRemarksCountChange={onRemarksCountChange}
        onSchedulePublishedChange={onSchedulePublishedChange}
      />
    </ConditionalBlock>
  );
};

export default ReportTab;