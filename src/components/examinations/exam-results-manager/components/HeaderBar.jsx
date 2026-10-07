import React from 'react';
import { useCanAccess } from '../../../portal-shared/ConditionalBlock';
import { MANAGEMENT_ROLES } from '../constants';

/**
 * HeaderBar
 * Top header with title, exam selector, refresh, and publish button
 */
const HeaderBar = ({
  isReportOnly,
  selectedSchedule,
  schedules,
  selectedScheduleId,
  setSelectedScheduleId,
  canManageAllMarks,
  userRoles,
  teacherRecord,
  canPublishReport,
  isScheduleReportPublished,
  publishingReport,
  onTogglePublishReport,
  onRefreshResults,
}) => {
  const canAccess = useCanAccess(userRoles);

  return (
    <div className="w-full bg-white border-b border-light-border rounded-none px-4 sm:px-6 py-3 print:hidden shadow-2xs space-y-3">
      {/* Row 1: Title, Active Status, Exam Selector, and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shadow-2xs shrink-0 ${
              isReportOnly ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <i className={`fas ${isReportOnly ? 'fa-file-invoice' : 'fa-clipboard-check'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                {isReportOnly ? 'Progress Reports' : 'Exam Results'}
              </h1>
              {selectedSchedule && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    selectedSchedule.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : selectedSchedule.status === 'finished'
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  <i
                    className={`fas ${
                      selectedSchedule.status === 'published'
                        ? 'fa-circle-check'
                        : selectedSchedule.status === 'finished'
                          ? 'fa-flag-checkered'
                          : 'fa-pen-ruler'
                    } text-[8px]`}
                  />
                  {selectedSchedule.status}
                </span>
              )}

              {selectedSchedule && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isScheduleReportPublished(selectedSchedule)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  title={
                    isScheduleReportPublished(selectedSchedule)
                      ? 'Progress Report cards are published to parent portal'
                      : 'Progress Report cards are draft/unpublished to parents'
                  }
                >
                  <i
                    className={`fas ${
                      isScheduleReportPublished(selectedSchedule) ? 'fa-globe' : 'fa-lock'
                    } text-[8px]`}
                  />
                  {isScheduleReportPublished(selectedSchedule)
                    ? 'Report Published'
                    : 'Report Unpublished'}
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-dark-muted hidden sm:block">
              {isReportOnly
                ? 'Generate, customize, print, and export student examination report cards'
                : canManageAllMarks
                  ? 'Coordinator / Admin view — enter, review, or override marks for any subject'
                  : teacherRecord?.name
                    ? `Teacher view (${teacherRecord.name}) — enter marks for assigned invigilation subjects`
                    : 'Enter and manage examination marks per subject and class'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto ">
          {schedules.length > 0 && (
            <select
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="w-48 sm:w-56 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold text-dark-primary outline-none focus:ring-2 focus:ring-emerald-300"
            >
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          )}
          <button
            onClick={onRefreshResults}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 hover:text-dark-primary transition-all shadow-2xs cursor-pointer shrink-0"
            title="Refresh Results"
          >
            <i className="fas fa-sync-alt text-xs" />
          </button>

          {canPublishReport && selectedSchedule && (
            <button
              type="button"
              onClick={onTogglePublishReport}
              disabled={publishingReport}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60 shrink-0 ${
                isScheduleReportPublished(selectedSchedule)
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title={
                isScheduleReportPublished(selectedSchedule)
                  ? 'Click to unpublish progress reports from the parent portal'
                  : 'Click to publish progress reports to the parent portal'
              }
              data-feature="exam-progress-report-publish"
            >
              {publishingReport ? (
                <>
                  <i className="fas fa-spinner fa-spin text-xs" />
                  <span>Updating...</span>
                </>
              ) : isScheduleReportPublished(selectedSchedule) ? (
                <>
                  <i className="fas fa-eye-slash text-xs" />
                  <span>Unpublish Report</span>
                </>
              ) : (
                <>
                  <i className="fas fa-bullhorn text-xs" />
                  <span>Publish Progress Report</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderBar;