// src/components/timetable/DraftManager.jsx
/**
 * DraftManager Component
 * Main UI for managing timetable draft versions
 */

import React, { useState, useMemo } from 'react';
import { useTimetableDrafts } from '../../hooks/useTimetableDrafts';
import DraftVersionList from './DraftVersionList';
import DraftComparison from './DraftComparison';
import DraftActions from './DraftActions';
import { showToast } from '../../utils/toast';

const DraftManager = ({ 
  liveData, 
  onPublish, 
  onRollback,
  onEditDraft,
  classId,
  isReadOnly = false,
  highlightDraftId = null,
}) => {
  const {
    drafts,
    selectedDraft,
    selectedDraftId,
    comparisonResult,
    showComparison,
    filter,
    stats,
    isLoading,
    error,
    createDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
    scheduleDraft,
    cancelScheduledDraft,
    archiveDraft,
    duplicateDraft,
    compareWithLive,
    createBackup,
    setFilter,
    setSelectedDraftId,
    setShowComparison,
    clearError,
    clearComparison,
  } = useTimetableDrafts(liveData, (data) => {
    // Scheduled publication must not be recorded as published if there is no live writer, so the
    // failure to write has to surface as a rejection rather than a silent success.
    if (typeof onPublish !== 'function') throw new Error('No live writer is available');
    return onPublish(data);
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDraftName, setNewDraftName] = useState('');
  const [newDraftDescription, setNewDraftDescription] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('00:00');
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Rename a draft version.
  const handleRename = (draftId) => {
    const target = resolveDraft(draftId);
    if (!target) return;
    setRenameTarget(target);
    setRenameValue(target.name || '');
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    const nextName = renameValue.trim();
    if (!nextName) {
      showToast('Draft name cannot be empty', 'error');
      return;
    }
    try {
      // The hook's updateDraft refreshes the list for us.
      await updateDraft(renameTarget.id, { name: nextName });
      showToast(`Draft renamed to "${nextName}"`, 'success');
    } catch (err) {
      showToast('Failed to rename draft: ' + err.message, 'error');
    } finally {
      setRenameTarget(null);
    }
  };

  // Preselect the draft the user is already working on when opened from Draft Settings.
  React.useEffect(() => {
    if (highlightDraftId) setSelectedDraftId(highlightDraftId);
  }, [highlightDraftId, setSelectedDraftId]);

  // Status badge colors
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft':
        return 'fa-edit';
      case 'published':
        return 'fa-check-circle';
      case 'scheduled':
        return 'fa-clock';
      case 'archived':
        return 'fa-archive';
      default:
        return 'fa-file';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  const handleCreateDraft = async () => {
    if (!newDraftName.trim()) {
      showToast('Please enter a draft name', 'error');
      return;
    }
    
      const draft = await createDraft(newDraftName.trim(), newDraftDescription.trim());
    if (draft) {
      showToast(`Draft "${draft.name}" created successfully`, 'success');
      setShowCreateModal(false);
      setNewDraftName('');
      setNewDraftDescription('');
    }
  };

  const handleScheduleDraft = async () => {
    if (!scheduleDate || !scheduleTime) {
      showToast('Please select date and time', 'error');
      return;
    }
    
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    if (new Date(scheduledAt) <= new Date()) {
      showToast('Scheduled time must be in the future', 'error');
      return;
    }
    
      const updated = await scheduleDraft(selectedDraftId, scheduledAt, notifyUsers);
    if (updated) {
      showToast(`Draft scheduled for ${new Date(scheduledAt).toLocaleString()}`, 'success');
      setShowScheduleModal(false);
      setScheduleDate('');
      setScheduleTime('00:00');
    }
  };

  const resolveDraft = (draftId) =>
    drafts.find((d) => d.id === (draftId || selectedDraftId)) || selectedDraft;

  const handlePublish = async (draftId) => {
    const target = resolveDraft(draftId);
    if (!target) return;

    setConfirmAction({
      title: 'Publish Draft',
      message: `Are you sure you want to publish "${target.name}"? This will replace the live timetable. A backup of the current state is created first.`,
      type: 'warning',
      confirmText: 'Publish',
      onConfirm: async () => {
        setConfirmAction(null);
        // Publishing destroys the previous live timetable, so it is snapshotted first - the same
        // safety net rollback uses. A publish that cannot create the snapshot must not run.
        const backup = await createBackup(`Auto-backup before publishing "${target.name}"`);
        if (!backup) {
          showToast(
            'Publish cancelled: a safety backup of the current timetable could not be created, so nothing was changed',
            'error'
          );
          return;
        }

        // The draft is only marked published once this has actually written live, so a refusal
        // leaves the version list telling the truth.
        try {
          showToast(`Publishing "${target.name}" to the live timetable...`, 'info');
          await publishDraft(target.id, onPublish);
        } catch (err) {
          // handlePublishDraftToLive prefixes the failure with Publish/Rollback, so it is not
          // repeated here; the backup name is added because it is the recovery path.
          showToast(
            `${err.message}. The current timetable was backed up as "${backup.name}".`,
            'error'
          );
        }
      },
      onCancel: () => setConfirmAction(null),
    });
  };

  const handleDiscard = async (draftId) => {
    const target = resolveDraft(draftId);
    if (!target) return;

    setConfirmAction({
      title: 'Discard Draft',
      message: `Are you sure you want to discard "${target.name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Discard',
      onConfirm: async () => {
        setConfirmAction(null);
        await deleteDraft(target.id);
        showToast(`Draft "${target.name}" discarded`, 'success');
      },
      onCancel: () => setConfirmAction(null),
    });
  };

  // Cancelling a scheduled publication keeps the draft; it only clears the schedule.
  const handleCancelSchedule = async (draftId) => {
    const target = resolveDraft(draftId);
    if (!target) return;
    try {
      await cancelScheduledDraft(target.id);
      showToast(`Scheduled publication cancelled for "${target.name}"`, 'success');
    } catch (err) {
      showToast('Failed to cancel schedule: ' + err.message, 'error');
    }
  };

  const handleRollback = async (draftId) => {
    const target = resolveDraft(draftId);
    if (!target) return;

    setConfirmAction({
      title: 'Rollback to This Version',
      message: `Are you sure you want to rollback to "${target.name}"? This will replace the current live timetable. A backup of the current state is created first.`,
      type: 'warning',
      confirmText: 'Rollback',
      onConfirm: async () => {
        setConfirmAction(null);
        // The snapshot of the current state is the only way back, so a rollback that cannot create
        // one must not run at all.
        const backup = await createBackup(`Auto-backup before rollback to ${target.name}`);
        if (!backup) {
          showToast(
            'Rollback cancelled: a safety backup of the current timetable could not be created, so nothing was changed',
            'error'
          );
          return;
        }

        // As with publish, the target is only marked published after it is actually live.
        try {
          await publishDraft(target.id, onRollback);
        } catch (err) {
          showToast(
            `${err.message}. The current timetable was backed up as "${backup.name}".`,
            'error'
          );
        }
      },
      onCancel: () => setConfirmAction(null),
    });
  };

  const handleDuplicate = async (draftId) => {
    const target = resolveDraft(draftId);
    if (!target) return;
    const duplicated = await duplicateDraft(target.id, `${target.name} (Copy)`);
    if (duplicated) {
      setSelectedDraftId(duplicated.id);
      showToast(`Draft duplicated as "${duplicated.name}"`, 'success');
    }
  };

  const handleCompare = async (draftId) => {
    const target = resolveDraft(draftId);
    if (!target) return;
    await compareWithLive(target.id);
  };

  const handleEdit = (draftId) => {
    const target = resolveDraft(draftId);
    if (target && onEditDraft) onEditDraft(target);
  };

  const handleFilterChange = (key, value) => {
    setFilter({ ...filter, [key]: value });
  };

  const handleClearFilters = () => {
    setFilter({
      status: [],
      search: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
  };

  // Render confirmation modal
  if (confirmAction) {
    return (
      <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
          <div className={`p-6 ${confirmAction.type === 'danger' ? 'bg-red-50' : confirmAction.type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'} border-b border-light-border`}>
            <h3 className="text-lg font-bold text-dark-primary flex items-center gap-2">
              <i className={`fas ${confirmAction.type === 'danger' ? 'fa-exclamation-triangle text-red-500' : 'fa-question-circle text-yellow-500'}`}></i>
              {confirmAction.title}
            </h3>
          </div>
          <div className="p-6">
            <p className="text-dark-soft mb-6">{confirmAction.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={confirmAction.onCancel}
                className="px-4 py-2 rounded-xl text-sm font-bold text-dark-soft bg-light-bg hover:bg-light-border transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-all ${
                  confirmAction.type === 'danger' 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-brand-primary hover:bg-brand-dark'
                }`}
              >
                {confirmAction.confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-feature="timetable-draft-manager">
      {/* Purpose banner - what drafts are for */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <i className="fas fa-shield-halved"></i>
        </div>
        <div>
          <p className="text-sm font-black text-emerald-900">
            Draft versions are a safe workspace
          </p>
          <p className="text-xs font-semibold text-emerald-800">
            Create a version from the current live timetable, adjust it in Scheduler Setup, then
            publish it when it is ready. Nothing reaches teachers, parents or the live timetable
            until you publish.
          </p>
        </div>
      </div>

      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white border border-light-border rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <i className="fas fa-file-alt text-xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-dark-primary">Timetable Drafts</h2>
            <p className="text-sm text-dark-soft">Manage draft versions, compare changes, and schedule publications</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-800">
            Total: {stats.total}
          </div>
          <div className="px-3 py-1.5 bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-800">
            Drafts: {stats.draft}
          </div>
          <div className="px-3 py-1.5 bg-green-100 border border-green-200 rounded-xl text-xs font-bold text-green-800">
            Published: {stats.published}
          </div>
          <div className="px-3 py-1.5 bg-yellow-100 border border-yellow-200 rounded-xl text-xs font-bold text-yellow-800">
            Scheduled: {stats.scheduled}
          </div>
          <div className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-800">
            Archived: {stats.archived}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-800">
            <i className="fas fa-exclamation-circle"></i>
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white border border-light-border rounded-2xl">
        {/* Search */}
        <div className="flex-1 relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-dark-soft"></i>
          <input
            type="text"
            placeholder="Search drafts by name or description..."
            value={filter.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-light-border rounded-xl text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-dark-soft uppercase tracking-wide">Status:</label>
          <select
            value={filter.status.join(',')}
            onChange={(e) => handleFilterChange('status', e.target.value ? e.target.value.split(',') : [])}
            multiple
            className="bg-white border border-light-border rounded-xl px-3 py-2 text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary min-w-[180px]"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-dark-soft uppercase tracking-wide">Sort:</label>
          <select
            value={filter.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="bg-white border border-light-border rounded-xl px-3 py-2 text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="updatedAt">Last Updated</option>
            <option value="createdAt">Created Date</option>
            <option value="name">Name</option>
            <option value="versionNumber">Version</option>
          </select>
          <button
            onClick={() => handleFilterChange('sortOrder', filter.sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-white border border-light-border rounded-xl text-dark-soft hover:text-brand-primary transition-all"
            title={filter.sortOrder === 'asc' ? 'Descending' : 'Ascending'}
          >
            <i className={`fas fa-sort-${filter.sortOrder === 'asc' ? 'up' : 'down'} text-xs`}></i>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={isReadOnly || !liveData}
            className="px-4 py-2.5 bg-brand-primary hover:bg-brand-dark text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            New Draft
          </button>
          
          {filter.status.length > 0 || filter.search && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2.5 bg-light-bg hover:bg-light-border text-dark-soft rounded-xl text-sm font-bold transition-all flex items-center gap-1"
            >
              <i className="fas fa-times text-xs"></i>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Draft List */}
        <div className="lg:col-span-2">
          <DraftVersionList
            drafts={drafts}
            selectedDraftId={selectedDraftId}
            onSelect={setSelectedDraftId}
            onCompare={handleCompare}
            onDuplicate={handleDuplicate}
            onSchedule={() => setShowScheduleModal(true)}
            onPublish={handlePublish}
            onDiscard={handleDiscard}
            onRollback={handleRollback}
            isLoading={isLoading}
            getStatusBadgeClass={getStatusBadgeClass}
            getStatusIcon={getStatusIcon}
            formatDate={formatDate}
          />
        </div>

        {/* Detail Panel / Comparison */}
        <div className="lg:col-span-1">
          {showComparison && comparisonResult ? (
            <DraftComparison
              comparison={comparisonResult}
              onClose={clearComparison}
            />
          ) : selectedDraft ? (
            <DraftActions
              draft={selectedDraft}
              onCompare={handleCompare}
              onDuplicate={handleDuplicate}
              onSchedule={() => setShowScheduleModal(true)}
              onPublish={handlePublish}
              onDiscard={handleDiscard}
              onCancelSchedule={handleCancelSchedule}
              onRename={handleRename}
              onRollback={handleRollback}
              onEdit={handleEdit}
              isReadOnly={isReadOnly}
              getStatusBadgeClass={getStatusBadgeClass}
              getStatusIcon={getStatusIcon}
              formatDate={formatDate}
            />
          ) : (
            <div className="bg-white border border-light-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-light-bg/50 flex items-center justify-center text-light-border">
                <i className="fas fa-file-alt text-2xl"></i>
              </div>
              <h3 className="text-lg font-bold text-dark-primary mb-2">Select a Draft</h3>
              <p className="text-dark-soft text-sm">Choose a draft from the list to view details and actions</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Draft Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-brand-primary p-6 text-white flex justify-between items-center">
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold opacity-80">Create Draft</span>
                <h3 className="text-lg font-bold">New Timetable Draft</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white transition-all text-xl"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-1.5">
                  Draft Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newDraftName}
                  onChange={(e) => setNewDraftName(e.target.value)}
                  placeholder="e.g., Winter Schedule v2"
                  className="w-full bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-1.5">
                  Description
                </label>
                <textarea
                  value={newDraftDescription}
                  onChange={(e) => setNewDraftDescription(e.target.value)}
                  placeholder="Optional description of changes..."
                  rows={3}
                  className="w-full bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                />
              </div>
            </div>
            <div className="bg-light-lbg/40 px-6 py-4 flex justify-end gap-3 border-t border-light-border">
              <button
                onClick={() => setShowCreateModal(false)}
                className="bg-light-ui text-dark-soft hover:bg-light-border px-4 py-2 rounded-xl text-sm font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDraft}
                className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                Create Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Draft Modal */}
      {showScheduleModal && selectedDraft && (
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-brand-primary p-6 text-white flex justify-between items-center">
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold opacity-80">Schedule Publication</span>
                <h3 className="text-lg font-bold">{selectedDraft.name}</h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-white/80 hover:text-white transition-all text-xl"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-1.5">
                  Publication Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-1.5">
                  Publication Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifyUsers"
                  checked={notifyUsers}
                  onChange={(e) => setNotifyUsers(e.target.checked)}
                  className="w-4 h-4 text-brand-primary border-light-border rounded focus:ring-brand-primary"
                />
                <label htmlFor="notifyUsers" className="text-sm font-medium text-dark-primary">
                  Notify affected users (teachers, students)
                </label>
              </div>
            </div>
            <div className="bg-light-lbg/40 px-6 py-4 flex justify-end gap-3 border-t border-light-border">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="bg-light-ui text-dark-soft hover:bg-light-border px-4 py-2 rounded-xl text-sm font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleDraft}
                className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                Schedule Publication
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename draft version */}
      {renameTarget && (
        <div className="fixed inset-0 bg-dark-almostblack/50 backdrop-blur-sm z-[85] flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitRename();
            }}
            className="bg-white rounded-3xl border border-light-border shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="bg-brand-primary px-5 py-3 text-white">
              <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-90 block">
                Draft Version
              </span>
              <h3 className="text-base font-bold">Rename draft</h3>
            </div>
            <div className="p-5">
              <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-1.5">
                Version Name
              </label>
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full bg-white border border-light-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div className="bg-light-lbg/50 border-t border-light-border px-5 py-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="px-4 py-2 bg-light-ui text-dark-soft hover:bg-light-border rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renameValue.trim()}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DraftManager;
