import React from 'react';
import { ConditionalBlock } from '../../../portal-shared/ConditionalBlock';
import ExamResultsEntryGrid from '../../ExamResultsEntryGrid';

/**
 * EntryTab
 * Marks Entry tab content
 */
const EntryTab = ({
  selectedScheduleId,
  selectedClassId,
  scheduleReady,
  entrySupportReady,
  activeResults,
  activeSubjects,
  classStudents,
  canEditMarksForSubject,
  activeInvigilatorNames,
  canManageAllMarks,
  userRoles,
  studentSearchQuery,
  onReload,
  saveMode,
  setSaveMode,
  pendingChanges,
  setPendingChanges,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  showQuickFillModal,
  setShowQuickFillModal,
  quickFillSubjectId,
  setQuickFillSubjectId,
  quickFillValue,
  setQuickFillValue,
  saveAllPendingChanges,
  handleQuickFill,
  onRemoveSubject,
  canRemoveSubject,
  isTeacherLocked,
  onStatusUpdate,
}) => {
  if (!selectedScheduleId || !selectedClassId) {
    return (
      <div className="text-center py-20 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm p-8">
        <i className="fas fa-clipboard-list text-4xl text-slate-300 mb-4 block" />
        <p className="text-base font-bold text-dark-primary">
          Select an Exam Schedule and Class
        </p>
        <p className="text-xs text-dark-muted mt-1 max-w-md mx-auto">
          Choose an examination event and class section from the dropdowns above to view
          scheduled subjects and record student marks.
        </p>
      </div>
    );
  }

  return (
    <ConditionalBlock name="exam-mark-entry-tab" roles={userRoles}>
      {!scheduleReady || !entrySupportReady ? (
        <div className="flex items-center justify-center py-20 bg-white border border-light-border rounded-2xl shadow-xs">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-dark-muted font-medium">
              Loading examination marks and teacher allocation...
            </p>
          </div>
        </div>
      ) : activeResults.length > 0 ? (
        <div className="w-full space-y-4">
          <ExamResultsEntryGrid
            results={activeResults}
            subjects={activeSubjects}
            students={classStudents}
            onStatusUpdate={onStatusUpdate}
            canEditMap={canEditMarksForSubject}
            invigilatorNames={activeInvigilatorNames}
            canOverrideInvigilator={canManageAllMarks}
            userRoles={userRoles}
            searchQuery={studentSearchQuery}
            onReload={onReload}
            saveMode={saveMode}
            setSaveMode={setSaveMode}
            pendingChanges={pendingChanges}
            setPendingChanges={setPendingChanges}
            hasUnsavedChanges={hasUnsavedChanges}
            setHasUnsavedChanges={setHasUnsavedChanges}
            showQuickFillModal={showQuickFillModal}
            setShowQuickFillModal={setShowQuickFillModal}
            quickFillSubjectId={quickFillSubjectId}
            setQuickFillSubjectId={setQuickFillSubjectId}
            quickFillValue={quickFillValue}
            setQuickFillValue={setQuickFillValue}
            saveAllPendingChanges={saveAllPendingChanges}
            handleQuickFill={handleQuickFill}
            onRemoveSubject={onRemoveSubject}
            canRemoveSubject={canRemoveSubject}
            isLocked={isTeacherLocked}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full min-h-[360px] bg-white border border-light-border rounded-2xl sm:rounded-3xl p-8 shadow-xs">
          {isTeacherLocked && (
            <div className="w-full mb-4 flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold shadow-2xs">
              <i className="fas fa-lock text-amber-600 text-sm shrink-0" />
              <span>
                Progress Report is published for this examination. Marks editing is locked
                for teachers.
              </span>
            </div>
          )}
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-3 shadow-2xs">
            <i className="fas fa-hand-pointer" />
          </div>
          <p className="text-sm font-bold text-dark-primary">
            Select Subject(s) to Enter Marks
          </p>
          <p className="text-xs text-dark-muted mt-1 max-w-sm text-center">
            Use the dropdown above to select one or more subjects, then enter marks for
            all selected subjects in the grid below.
          </p>
        </div>
      )}
    </ConditionalBlock>
  );
};

export default EntryTab;