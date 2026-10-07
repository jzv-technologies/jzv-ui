import React from 'react';
import MultiSelectDropdown from '../../../MultiSelectDropdown';
import { ConditionalBlock } from '../../../portal-shared/ConditionalBlock';

/**
 * FilterBar
 * Consolidated filters for class, subjects, students, and other tab-specific controls
 */
const FilterBar = ({
  activeTab,
  selectedScheduleId,
  selectedClassId,
  setSelectedClassId,
  classes,
  allSubjectsToShow,
  selectedSubjectIds,
  setSelectedSubjectIds,
  handleRemoveSubject,
  canManageAllMarks,
  isTeacherLocked,
  scheduleReady,
  classStudents,
  studentSearchQuery,
  setStudentSearchQuery,
  attendanceClassIds,
  setAttendanceClassIds,
  remarksClassIds,
  setRemarksClassIds,
  rankHolderClassIds,
  setRankHolderClassIds,
  reportType,
  setReportType,
  summaryClassFilter,
  setSummaryClassFilter,
  isAllExpanded,
  setIsAllExpanded,
  reportSelectedStudentIds,
  setReportSelectedStudentIds,
  reportTemplates,
  reportTemplateId,
  setReportTemplateId,
  paperSize,
  setPaperSize,
  orientation,
  setOrientation,
  onPrint,
  attendanceTabRef,
  remarksTabRef,
  onOpenAttendanceUpload,
  onOpenRemarksUpload,
  onOpenRemarksIndividual,
  onExportAttendance,
  onExportRemarks,
  onRefreshAttendance,
  onRefreshRemarks,
  canUploadAttendance,
  canUploadRemarks,
  userRoles,
  saveMode,
  setSaveMode,
  hasUnsavedChanges,
  saveAllPendingChanges,
  showQuickFillModal,
  setShowQuickFillModal,
  quickFillSubjectId,
  setQuickFillSubjectId,
  quickFillValue,
  setQuickFillValue,
  handleQuickFill,
  onOpenSchemeModal,
  onOpenPrintSheetModal,
  onOpenImportModal,
  onExportMarks,
  activeResults = [],
  canEditMarksForSubject = {},
}) => {
  return (
    <div
      className={`flex items-center gap-2.5 flex-wrap w-full ${
        activeTab === 'report' ? 'justify-between' : 'justify-start md:justify-end'
      }`}
      data-feature-filter={activeTab}
    >
        {/* Class Selector Dropdown */}
        {activeTab === 'summary' && (
          <div className="flex items-center gap-2">
            <MultiSelectDropdown
              label="Filter Class"
              icon="fa-chalkboard-user"
              singleSelect={true}
              disabled={!selectedScheduleId}
              options={[
                { id: '', label: 'All Classes' },
                ...classes.map((c) => ({
                  id: String(c.id),
                  label: c.name,
                })),
              ]}
              selected={summaryClassFilter}
              onChange={(val) => setSummaryClassFilter(val)}
              placeholder="All Classes"
              fullWidth={false}
            />
            <button
              type="button"
              onClick={() => setIsAllExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 h-9 sm:h-8 bg-white hover:bg-slate-50 text-dark-slate border border-gray-250 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
              title={isAllExpanded ? 'Collapse All' : 'Expand All'}
            >
              <i className={`fas ${isAllExpanded ? 'fa-angles-up' : 'fa-angles-down'} text-emerald-600 text-xs`} />
              <span>{isAllExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Attendance Multi-Class Filter */}
            <div className="min-w-[170px] max-w-[260px]">
              <MultiSelectDropdown
                label="Class"
                icon="fa-chalkboard-user"
                disabled={!selectedScheduleId}
                options={classes.map((c) => ({
                  id: String(c.id),
                  label: c.name,
                }))}
                selected={attendanceClassIds}
                onChange={setAttendanceClassIds}
                placeholder="All Classes"
                fullWidth={false}
              />
            </div>

            {/* Upload Attendance Button */}
            {(canUploadAttendance || canManageAllMarks) && (
              <button
                type="button"
                onClick={onOpenAttendanceUpload}
                disabled={!selectedScheduleId || isTeacherLocked}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 h-9 sm:h-8 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-250 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
                title={
                  isTeacherLocked
                    ? 'Progress report is published for this examination. Attendance editing is locked for teachers.'
                    : 'Upload Attendance from Excel or CSV'
                }
              >
                <i className="fas fa-file-arrow-up text-indigo-600 text-xs" />
                <span>Upload Attendance</span>
              </button>
            )}

            {/* Export Attendance Button */}
            <button
              type="button"
              onClick={onExportAttendance}
              disabled={!selectedScheduleId}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 h-9 sm:h-8 bg-white hover:bg-slate-50 text-dark-slate border border-gray-250 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
              title="Export Attendance to Excel"
            >
              <i className="fas fa-file-excel text-emerald-600 text-xs" />
              <span>Export</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefreshAttendance}
              disabled={!selectedScheduleId}
              className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl border border-gray-250 bg-white hover:bg-slate-50 text-dark-muted hover:text-dark-primary transition-all shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
              title="Refresh Attendance"
            >
              <i className="fas fa-sync-alt text-xs" />
            </button>
          </div>
        )}

        {activeTab === 'remarks' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Remarks Multi-Class Filter */}
            <div className="min-w-[170px] max-w-[260px]">
              <MultiSelectDropdown
                label="Class"
                icon="fa-chalkboard-user"
                disabled={!selectedScheduleId}
                options={classes.map((c) => ({
                  id: String(c.id),
                  label: c.name,
                }))}
                selected={remarksClassIds}
                onChange={setRemarksClassIds}
                placeholder="All Classes"
                fullWidth={false}
              />
            </div>

            {/* Upload Remarks Button */}
            {(canUploadRemarks || canManageAllMarks) && (
              <button
                type="button"
                onClick={onOpenRemarksUpload}
                disabled={!selectedScheduleId || isTeacherLocked}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 h-9 sm:h-8 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-250 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
                title={
                  isTeacherLocked
                    ? 'Progress report is published for this examination. Remarks editing is locked for teachers.'
                    : 'Upload Remarks & Feedback from Excel or CSV'
                }
              >
                <i className="fas fa-file-arrow-up text-amber-600 text-xs" />
                <span>Upload Remarks</span>
              </button>
            )}

            {/* Export Remarks Button */}
            <button
              type="button"
              onClick={onExportRemarks}
              disabled={!selectedScheduleId}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 h-9 sm:h-8 bg-white hover:bg-slate-50 text-dark-slate border border-gray-250 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
              title="Export Remarks to Excel"
            >
              <i className="fas fa-file-excel text-emerald-600 text-xs" />
              <span>Export</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefreshRemarks}
              disabled={!selectedScheduleId}
              className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl border border-gray-250 bg-white hover:bg-slate-50 text-dark-muted hover:text-dark-primary transition-all shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
              title="Refresh Remarks"
            >
              <i className="fas fa-sync-alt text-xs" />
            </button>
          </div>
        )}

        {/* Entry Tab Class Selector */}
        {activeTab === 'entry' && (
          <MultiSelectDropdown
            label="Class"
            icon="fa-chalkboard-user"
            singleSelect={true}
            disabled={!selectedScheduleId}
            options={classes.map((c) => ({
              id: String(c.id),
              label: c.name,
            }))}
            selected={selectedClassId}
            onChange={(val) => {
              setSelectedClassId(val);
              setSelectedSubjectIds([]);
            }}
            placeholder="Select Class..."
            fullWidth={false}
          />
        )}

        {/* Subject Selector MultiSelectDropdown in top filter bar */}
        {activeTab === 'entry' && selectedClassId && (
          <div className="min-w-[190px] max-w-[320px]">
            <MultiSelectDropdown
              label="Subjects"
              icon="fa-book-open"
              options={allSubjectsToShow.map((sub) => ({
                id: String(sub.id),
                label: sub.name,
                badge: sub.isAdHoc ? 'Ad-Hoc' : 'Scheduled',
                removeTitle: `Remove ${sub.name} from Mark Entry (${sub.isAdHoc ? 'Ad-Hoc' : 'Scheduled'})`,
              }))}
              selected={selectedSubjectIds}
              onChange={setSelectedSubjectIds}
              onRemoveOption={
                canManageAllMarks && !isTeacherLocked ? (val) => handleRemoveSubject(val) : null
              }
              placeholder={scheduleReady ? 'Select subjects...' : 'Loading subjects...'}
              fullWidth={false}
              disabled={!scheduleReady}
            />
          </div>
        )}

        {/* Student Search Field */}
        {activeTab === 'entry' && selectedClassId && classStudents.length > 0 && (
          <div className="relative min-w-[170px] max-w-[240px]">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-dark-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search student / adm..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 sm:py-2 h-9 sm:h-8 text-xs font-semibold border border-gray-250 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
            />
            {studentSearchQuery && (
              <button
                type="button"
                onClick={() => setStudentSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark-muted hover:text-dark-primary cursor-pointer"
              >
                <i className="fas fa-times-circle" />
              </button>
            )}
          </div>
        )}

        {/* Marking Scheme button */}
        {activeTab === 'entry' && selectedScheduleId && selectedClassId && (
          <ConditionalBlock name="exam-results-marking-scheme" roles={userRoles}>
            <button
              type="button"
              onClick={onOpenSchemeModal}
              disabled={isTeacherLocked}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-dark-slate text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
              title={
                isTeacherLocked
                  ? 'Progress report is published. Marking scheme is locked for teachers.'
                  : 'Configure Marks'
              }
            >
              <i className="fas fa-gears text-emerald-600 text-xl" />
            </button>
          </ConditionalBlock>
        )}

        {/* Offline Mark Sheet Print button */}
        {activeTab === 'entry' && selectedScheduleId && selectedClassId && (
          <button
            type="button"
            onClick={onOpenPrintSheetModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 h-9 sm:h-8 bg-white hover:bg-slate-50 text-dark-slate  text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
            title="Print Blank Sheet"
          >
            <i className="fas fa-print text-indigo-600 text-xl" />
          </button>
        )}

        {/* Export Marks to CSV */}
        {activeTab === 'entry' && selectedScheduleId && selectedClassId && (
          <button
            type="button"
            onClick={onExportMarks}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 h-9 sm:h-8 bg-white hover:bg-slate-50 text-dark-slate  text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
            title="Download Marks"
          >
            <i className="fas fa-download text-teal-600 text-xl" />
          </button>
        )}

        {/* Import Marks from CSV */}
        {activeTab === 'entry' && selectedScheduleId && selectedClassId && (
          <ConditionalBlock name="exam-results-import" roles={userRoles}>
            <button
              type="button"
              onClick={onOpenImportModal}
              disabled={isTeacherLocked}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 h-9 sm:h-8 bg-emerald-50 hover:bg-emerald-100 text-emerald-800  text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
              title={
                isTeacherLocked
                  ? 'Progress report is published. Importing marks is locked for teachers.'
                  : 'Import marks from CSV with override/ignore options'
              }
            >
              <i className="fas fa-upload text-emerald-700 text-xl" />
            </button>
          </ConditionalBlock>
        )}

        {/* Save Mode Toggle - Icon based */}
        {activeTab === 'entry' &&
          selectedScheduleId &&
          selectedClassId &&
          activeResults.some(
            (r) => canEditMarksForSubject[r.id] ?? canEditMarksForSubject[String(r.id)]
          ) && (
            <div className="flex items-center gap-2" data-feature-filter="exam-results-save-mode">
              <label
                className="inline-flex items-center gap-2 cursor-pointer"
                title={saveMode === 'auto' ? 'Auto Save (debounced)' : 'Manual Save (batch)'}
              >
                <input
                  type="checkbox"
                  className="peer absolute opacity-0 w-9 h-5 cursor-pointer"
                  aria-label={saveMode === 'auto' ? 'Auto Save' : 'Manual Save'}
                  checked={saveMode === 'manual'}
                  onChange={(e) => setSaveMode(e.target.checked ? 'manual' : 'auto')}
                />
                <span className="relative h-5 w-9 rounded-full bg-emerald-700 transition-colors peer-checked:bg-rose-700 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-xs after:transition-transform peer-checked:after:translate-x-4"></span>
                {saveMode === 'manual' && (
                  <i className="fa-solid fa-floppy-disk text-xl text-emerald-700 transition-colors" />
                )}
              </label>
            </div>
          )}

        {/* Save All Button - only in manual mode with unsaved changes */}
        {activeTab === 'entry' &&
          selectedScheduleId &&
          selectedClassId &&
          activeResults.length > 0 &&
          saveMode === 'manual' &&
          hasUnsavedChanges && (
            <button
              type="button"
              onClick={saveAllPendingChanges}
              disabled={isTeacherLocked}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              title={
                isTeacherLocked
                  ? 'Progress report is published for this examination. Saving marks is locked for teachers.'
                  : 'Save all pending changes'
              }
              data-feature-filter="exam-results-save-all"
            >
              <i className="fa-solid fa-floppy-disk text-xl" />
              <span>Save All</span>
            </button>
          )}

        {/* Report Top Filters */}
        {activeTab === 'report' && (
          <div className="flex items-center justify-between gap-2.5 flex-wrap w-full">
            {/* Report Type Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0 mr-auto">
              <button
                type="button"
                onClick={() => setReportType('progress')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  reportType === 'progress'
                    ? 'bg-white text-rose-700 shadow-2xs font-black'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-file-invoice text-[10px]" />
                <span>Progress Report</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('rank_holder')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  reportType === 'rank_holder'
                    ? 'bg-white text-rose-700 shadow-2xs font-black'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-trophy text-[10px]" />
                <span>Rank Holder Report</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('excellence')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  reportType === 'excellence'
                    ? 'bg-white text-rose-700 shadow-2xs font-black'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-award text-[10px]" />
                <span>Excellence Report</span>
              </button>
            </div>

            {/* Right-aligned filters for Report */}
            <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
              {/* Class filter for reports */}
            {reportType === 'rank_holder' ? (
              <div className="min-w-[170px] max-w-[260px]">
                <MultiSelectDropdown
                  label="Class"
                  icon="fa-chalkboard-user"
                  disabled={!selectedScheduleId}
                  options={classes.map((c) => ({
                    id: String(c.id),
                    label: c.name,
                  }))}
                  selected={rankHolderClassIds}
                  onChange={setRankHolderClassIds}
                  placeholder="All Classes"
                  fullWidth={false}
                />
              </div>
            ) : (
              <MultiSelectDropdown
                label="Class"
                icon="fa-chalkboard-user"
                singleSelect={true}
                disabled={!selectedScheduleId}
                options={classes.map((c) => ({
                  id: String(c.id),
                  label: c.name,
                }))}
                selected={selectedClassId}
                onChange={(val) => {
                  setSelectedClassId(val);
                  setSelectedSubjectIds([]);
                }}
                placeholder="Select Class..."
                fullWidth={false}
              />
            )}

            {/* Progress Report Specific Student Filter */}
            {reportType === 'progress' && selectedClassId && classStudents.length > 0 && (
              <div className="min-w-[170px] max-w-[260px]">
                <MultiSelectDropdown
                  label="Students"
                  icon="fa-user-graduate"
                  options={classStudents.map((s) => ({
                    id: String(s.id),
                    label: `${s.student_name} (${s.admission_no})`,
                  }))}
                  selected={reportSelectedStudentIds}
                  onChange={setReportSelectedStudentIds}
                  placeholder="Select students..."
                  fullWidth={false}
                />
              </div>
            )}

            {/* Shared Template, Paper Size, and Orientation Selectors */}
            {reportType !== 'excellence' && (
              <>
                <MultiSelectDropdown
                  label="Template"
                  icon="fa-file-lines"
                  singleSelect={true}
                  options={reportTemplates.map((t) => ({
                    id: String(t.id),
                    label: t.name,
                  }))}
                  selected={reportTemplateId}
                  onChange={setReportTemplateId}
                  placeholder="Select Template..."
                  fullWidth={false}
                />

                <MultiSelectDropdown
                  label="Size"
                  icon="fa-file"
                  singleSelect={true}
                  options={[
                    { id: 'a4', label: 'A4' },
                    { id: 'letter', label: 'Letter' },
                    { id: 'legal', label: 'Legal' },
                    { id: 'a3', label: 'A3' },
                  ]}
                  selected={paperSize}
                  onChange={setPaperSize}
                  placeholder="Paper Size..."
                  fullWidth={false}
                />

                <MultiSelectDropdown
                  label="Layout"
                  icon="fa-repeat"
                  singleSelect={true}
                  options={[
                    { id: 'portrait', label: 'Portrait' },
                    { id: 'landscape', label: 'Landscape' },
                  ]}
                  selected={orientation}
                  onChange={setOrientation}
                  placeholder="Orientation..."
                  fullWidth={false}
                />

                <button
                  type="button"
                  onClick={onPrint}
                  disabled={reportType === 'progress' && classStudents.length === 0}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                  title="Print or Save as PDF"
                >
                  <i className="fas fa-print text-xs" />
                  <span>Print / Export PDF</span>
                </button>
              </>
            )}
            </div>
          </div>
        )}
      </div>
  );
};

export default FilterBar;