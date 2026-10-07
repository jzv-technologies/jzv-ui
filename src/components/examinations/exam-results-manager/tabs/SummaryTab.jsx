import React from 'react';
import { ConditionalBlock } from '../../../portal-shared/ConditionalBlock';
import ExamClassSummaryView from '../../ExamClassSummaryView';

/**
 * SummaryTab
 * Class Summary & Analytics tab content
 */
const SummaryTab = ({
  selectedScheduleId,
  scheduleReady,
  scheduleLoading,
  schedules = [],
  classes = [],
  subjects = [],
  students = [],
  slots = [],
  results = [],
  summaryEntries = [],
  summaryLoading,
  onOpenEntryRegister,
  onRefresh,
  userRoles = [],
  ENTRY_STATUS_CONFIG,
  filterClassId,
  isAllExpanded,
}) => {
  if (!scheduleReady) {
    return (
      <div className="flex items-center justify-center py-20 bg-white border border-light-border rounded-2xl shadow-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-dark-muted font-medium">
            Loading examination summary data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ConditionalBlock name="exam-results-tab-summary" roles={userRoles}>
      <ExamClassSummaryView
        schedules={schedules}
        selectedScheduleId={selectedScheduleId}
        classes={classes}
        subjects={subjects}
        students={students}
        slots={slots}
        results={results}
        summaryEntries={summaryEntries}
        summaryLoading={summaryLoading || scheduleLoading}
        onOpenEntryRegister={onOpenEntryRegister}
        onRefresh={onRefresh}
        userRoles={userRoles}
        ENTRY_STATUS_CONFIG={ENTRY_STATUS_CONFIG}
        filterClassId={filterClassId}
        isAllExpanded={isAllExpanded}
      />
    </ConditionalBlock>
  );
};

export default SummaryTab;