// src/components/examinations/ExamScheduleViewer.jsx
import React from 'react';
import ExamScheduleManager from './ExamScheduleManager';

const EXAM_VIEWER_ALLOWED_TABS = [
  'exam-sched-tab-scheduler',
  'exam-sched-tab-teacher',
  'exam-sched-tab-notice-print',
];

/**
 * ExamScheduleViewer
 * A dedicated view component displaying only the scheduler, teacher, and notice board print tabs.
 * Configured as a top-level tile under Examinations in app_view_controller.
 */
const ExamScheduleViewer = ({ userRoles = [], user, teacherRecord }) => {
  return (
    <ExamScheduleManager
      user={user}
      userRoles={userRoles}
      teacherRecord={teacherRecord}
      allowedTabs={EXAM_VIEWER_ALLOWED_TABS}
      title="Exam Schedule Viewer"
      subtitle="View class exam schedules, teacher invigilation assignments, and notice board printouts"
      dataFeature="exam-schedule-viewer"
    />
  );
};

export default ExamScheduleViewer;
