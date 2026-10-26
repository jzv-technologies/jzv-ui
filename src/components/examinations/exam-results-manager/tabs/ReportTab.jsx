import React, { useMemo } from 'react';
import { ConditionalBlock, useCanAccess } from '../../../portal-shared/ConditionalBlock';
import { ReportCardGenerator } from '../../report-card-generator';
import ReleaseToParentsPanel from '../../report-card-generator/ReleaseToParentsPanel';

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

  const canAccess = useCanAccess(userRoles);
  const canReleaseReports = canAccess('exam-progress-report-publish');

  // The generator renders its own control bar only when it is used standalone, so the per-ward
  // release list has to live here where the schedule and class are already selected.
  const selectedSchedule = useMemo(
    () => (schedules || []).find((s) => String(s.id) === String(selectedScheduleId)) || null,
    [schedules, selectedScheduleId]
  );
  const showReleasePanel =
    reportType === 'progress' && Boolean(selectedSchedule) && Boolean(selectedClassId);

  return (
    <ConditionalBlock name="exam-results-tab-report" roles={userRoles}>
      {showReleasePanel && (
        <div className="mb-4">
          <ReleaseToParentsPanel
            schedule={selectedSchedule}
            classId={selectedClassId}
            students={students || []}
            canRelease={canReleaseReports}
          />
          {!selectedSchedule.is_report_published && (
            <p className="mt-2 text-[11px] font-semibold text-amber-700">
              <i className="fas fa-triangle-exclamation mr-1.5" />
              This report is not published yet — individual releases only reach parents once the
              report is published.
            </p>
          )}
        </div>
      )}
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