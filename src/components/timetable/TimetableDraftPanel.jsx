// src/components/timetable/TimetableDraftPanel.jsx
import React from 'react';

/** Backup versions are named "Backup …" by createBackupDraft(). */
export const isBackupVersion = (draft) => /^backup\b/i.test(String(draft?.name || '').trim());

const formatDraftDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatVersionLabel = (draft) =>
  `${draft.name} (v_${String(draft.id).match(/_(\d+)_/)?.[1] ?? draft.id})`;

/**
 * Draft version controls for Scheduler Setup: version picker, save state, local-copy recovery
 * and the per-version actions (publish, compare, rename, delete, multi-select, exit).
 * Purely presentational — the manager owns the state and side effects.
 */
const TimetableDraftPanel = ({
  activeDraft = null,
  draftList = [],
  isDraftListOpen = false,
  onToggleDraftList,
  onCloseDraftList,
  isDraftListLoading = false,
  onSelectDraft,
  onCreateNewDraft,
  draftSaveStatusTitle = '',
  draftSaveStatusColor = 'text-emerald-500',
  isSavingDraft = false,
  canSaveDraft = false,
  isDraftSyncBusy = false,
  onSaveNow,
  onDiscardChanges,
  draftSaveError = '',
  localDraftRecovery = [],
  isRestoringLocalDrafts = false,
  onRestoreLocalDrafts,
  showActions = false,
  isMultiSelectEnabled = false,
  onToggleMultiSelect,
  selectedCellCount = 0,
  onOpenBulkClear,
  actions = [],
  actionBusy = null,
  onExitDraft,
}) => (
  <div
    className="rounded-2xl border border-amber-300 bg-amber-50 px-3 flex flex-col lg:flex-row lg:flex-wrap lg:items-center justify-between gap-2"
    data-feature="scheduler-setup-draft-mode"
  >
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <div className="relative w-full sm:w-80">
        <button
          type="button"
          onClick={onToggleDraftList}
          disabled={isDraftListLoading}
          className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-left shadow-sm disabled:opacity-60"
          aria-expanded={isDraftListOpen}
          aria-haspopup="listbox"
          title="Select a draft version to load"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="truncate text-xs font-extrabold text-dark-primary">
              {isDraftListLoading
                ? 'Loading versions…'
                : activeDraft
                  ? formatVersionLabel(activeDraft)
                  : `Select a version (${draftList.length})`}
            </span>
            <i
              className={`fas ${isDraftListOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] text-dark-soft`}
            />
          </span>
        </button>
        {isDraftListOpen && (
          <div
            className="absolute left-0 top-full z-[110] mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-amber-200 bg-white p-1.5 shadow-2xl"
            role="listbox"
            aria-label="Draft versions"
          >
            {draftList.map((draft) => (
              <button
                key={draft.id}
                type="button"
                role="option"
                aria-selected={draft.id === activeDraft?.id}
                onClick={() => {
                  onCloseDraftList?.();
                  onSelectDraft?.(draft.id);
                }}
                className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                  draft.id === activeDraft?.id ? 'bg-amber-50' : 'hover:bg-light-lbg/60'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate text-xs font-bold text-dark-primary">
                  {isBackupVersion(draft) ? '⤺ ' : ''}
                  <span className="truncate">{draft.name}</span>
                  {isBackupVersion(draft) && (
                    <span className="shrink-0 rounded bg-amber-200 px-1 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-900">
                      Backup
                    </span>
                  )}
                </span>
                <span className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] font-medium text-gray-400">
                  <span>Created {formatDraftDate(draft.createdAt)}</span>
                  <span>Updated {formatDraftDate(draft.updatedAt)}</span>
                  <span className="font-mono">{draft.id}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                onCloseDraftList?.();
                onCreateNewDraft?.();
              }}
              className="mt-1 w-full rounded-lg border-t border-light-border px-2.5 py-2 text-left text-xs font-extrabold text-amber-700 hover:bg-amber-50"
            >
              <i className="fas fa-plus mr-2" />
              Create new draft
            </button>
          </div>
        )}
      </div>

      {activeDraft && (
        <div
          className="flex shrink-0 items-center gap-1 rounded-xl border border-amber-300 bg-white px-1.5 py-1"
          data-feature="draft-save-status"
        >
          <span className="flex items-center px-0.5" title={draftSaveStatusTitle}>
            <i
              className={`fas fa-lightbulb text-xl ${draftSaveStatusColor} ${
                isSavingDraft ? 'animate-pulse' : ''
              }`}
              aria-hidden="true"
            />
            <span className="sr-only">{draftSaveStatusTitle}</span>
          </span>
          <button
            type="button"
            onClick={onSaveNow}
            disabled={!canSaveDraft || isDraftSyncBusy}
            className="rounded-lg p-1 text-dark-soft transition-colors hover:bg-amber-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            title="Save the draft to the database now"
            aria-label="Save the draft to the database now"
          >
            <i className={`fas fa-save text-xl ${isDraftSyncBusy ? 'fa-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onDiscardChanges}
            disabled={!canSaveDraft || isDraftSyncBusy}
            className="rounded-lg p-1 text-dark-soft transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            title="Discard unsaved changes and reload the saved version"
            aria-label="Discard unsaved changes and reload the saved version"
          >
            <i className="fas fa-rotate-left text-xl" />
          </button>
        </div>
      )}
    </div>

    {draftSaveError && (
      <div
        className="w-full rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-800"
        data-feature="draft-save-error"
        role="alert"
      >
        <i className="fas fa-triangle-exclamation mr-1" />
        Not saved to the database: {draftSaveError}
      </div>
    )}

    {localDraftRecovery.length > 0 && (
      <div
        className="w-full rounded-lg border border-amber-400 bg-amber-100 px-2.5 py-2 text-[10px] font-semibold text-amber-900 space-y-1"
        data-feature="draft-local-recovery"
        role="status"
      >
        <div>
          <i className="fas fa-hard-drive mr-1" />
          {localDraftRecovery.length} version(s) in this browser are newer than the database and
          were never stored there:
        </div>
        <ul className="space-y-0.5">
          {localDraftRecovery.map((item) => (
            <li key={item.id} className="font-mono">
              {item.name} · {item.changedSlots} period(s) differ · {item.localSlotCount} slots ·
              browser copy from{' '}
              {item.localUpdatedAt ? formatDraftDate(item.localUpdatedAt) : 'unknown'}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onRestoreLocalDrafts}
          disabled={isRestoringLocalDrafts}
          className="rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {isRestoringLocalDrafts ? 'Recovering…' : 'Recover to database'}
        </button>
      </div>
    )}

    {showActions && (
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button
          type="button"
          onClick={onToggleMultiSelect}
          aria-pressed={isMultiSelectEnabled}
          className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
            isMultiSelectEnabled
              ? 'bg-brand-primary border-brand-primary text-white'
              : 'bg-white border-amber-300 text-dark-primary hover:bg-amber-100'
          }`}
          title={
            isMultiSelectEnabled ? 'Turn off multi-select editing' : 'Turn on multi-select editing'
          }
        >
          <i className="fas fa-list-check" />
          <span>Multi-select {isMultiSelectEnabled ? 'On' : 'Off'}</span>
        </button>
        <button
          type="button"
          onClick={onOpenBulkClear}
          disabled={!isMultiSelectEnabled || selectedCellCount === 0}
          className="px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            selectedCellCount
              ? `Clear ${selectedCellCount} selected periods`
              : 'Select at least one period to clear'
          }
        >
          <i className="fas fa-eraser" />
          <span>Clear</span>
          {selectedCellCount > 0 && <span>({selectedCellCount})</span>}
        </button>
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={!!actionBusy}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${action.className}`}
            title={action.title}
          >
            <i
              className={`fas ${actionBusy === action.label ? 'fa-spinner fa-spin' : action.icon}`}
            />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        ))}
        <button
          onClick={onExitDraft}
          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          title="Exit draft mode"
        >
          <i className="fas fa-arrow-left" />
          Exit
        </button>
      </div>
    )}
  </div>
);

export default TimetableDraftPanel;
