// src/components/timetable/DraftActions.jsx
/**
 * DraftActions Component
 * Action panel for selected draft
 */

import React from 'react';

const DraftActions = ({
  draft,
  onCompare,
  onDuplicate,
  onSchedule,
  onPublish,
  onDiscard,
  onCancelSchedule,
  onRename,
  onRollback,
  onEdit,
  isReadOnly,
  getStatusBadgeClass,
  getStatusIcon,
  formatDate,
}) => {
  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'published':
        return 'Published';
      case 'scheduled':
        return 'Scheduled';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  };

  const getAvailableActions = () => {
    const actions = [];
    
    switch (draft.status) {
      case 'draft':
        actions.push(
          { label: 'Edit Draft', icon: 'fa-edit', onClick: onEdit, variant: 'primary' },
          { label: 'Rename', icon: 'fa-pen', onClick: onRename, variant: 'secondary' },
          { label: 'Compare with Live', icon: 'fa-balance-scale', onClick: onCompare, variant: 'primary' },
          { label: 'Duplicate', icon: 'fa-copy', onClick: onDuplicate, variant: 'secondary' },
          { label: 'Schedule Publication', icon: 'fa-clock', onClick: onSchedule, variant: 'secondary' },
          { label: 'Publish Now', icon: 'fa-check-circle', onClick: onPublish, variant: 'success', disabled: isReadOnly },
          { label: 'Rollback to This', icon: 'fa-undo', onClick: onRollback, variant: 'info', disabled: isReadOnly },
          { label: 'Discard', icon: 'fa-trash', onClick: onDiscard, variant: 'danger' }
        );
        break;
      case 'scheduled':
        actions.push(
          { label: 'Rename', icon: 'fa-pen', onClick: onRename, variant: 'secondary' },
          { label: 'Compare with Live', icon: 'fa-balance-scale', onClick: onCompare, variant: 'primary' },
          { label: 'Duplicate', icon: 'fa-copy', onClick: onDuplicate, variant: 'secondary' },
          { label: 'Publish Now', icon: 'fa-check-circle', onClick: onPublish, variant: 'success', disabled: isReadOnly },
          { label: 'Cancel Schedule', icon: 'fa-times-circle', onClick: onCancelSchedule, variant: 'danger' }
        );
        break;
      case 'published':
        actions.push(
          { label: 'Rename', icon: 'fa-pen', onClick: onRename, variant: 'secondary' },
          { label: 'Compare with Live', icon: 'fa-balance-scale', onClick: onCompare, variant: 'primary' },
          { label: 'Duplicate', icon: 'fa-copy', onClick: onDuplicate, variant: 'secondary' },
          { label: 'Rollback to This', icon: 'fa-undo', onClick: onRollback, variant: 'info', disabled: isReadOnly }
        );
        break;
      case 'archived':
        actions.push(
          { label: 'Rename', icon: 'fa-pen', onClick: onRename, variant: 'secondary' },
          { label: 'Restore as New Draft', icon: 'fa-copy', onClick: onDuplicate, variant: 'primary' }
        );
        break;
    }
    
    return actions;
  };

  const getVariantClass = (variant) => {
    switch (variant) {
      case 'primary':
        return 'bg-brand-primary hover:bg-brand-dark text-white';
      case 'secondary':
        return 'bg-light-bg hover:bg-light-border text-dark-primary border border-light-border';
      case 'success':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'info':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white';
      default:
        return 'bg-light-bg hover:bg-light-border text-dark-primary border border-light-border';
    }
  };

  const actions = getAvailableActions();

  return (
    <div className="bg-white border border-light-border rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-light-lbg/50 px-4 py-3 border-b border-light-border">
        <h3 className="text-sm font-extrabold text-dark-primary uppercase tracking-wider">Draft Actions</h3>
      </div>

      {/* Draft Info */}
      <div className="p-4 border-b border-light-border">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-dark-primary truncate">{draft.name}</h4>
            {draft.description && (
              <p className="text-sm text-dark-soft mt-1 line-clamp-2">{draft.description}</p>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border shrink-0 ${getStatusBadgeClass(draft.status)}`}>
            <i className={`fas ${getStatusIcon(draft.status)} text-[10px]`}></i>
            {getStatusLabel(draft.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div className="bg-light-bg/50 rounded-lg p-2">
            <span className="text-dark-soft block">Version</span>
            <span className="font-bold text-dark-primary">v{draft.versionNumber}</span>
          </div>
          <div className="bg-light-bg/50 rounded-lg p-2">
            <span className="text-dark-soft block">Created</span>
            <span className="font-bold text-dark-primary">{formatDate(draft.createdAt)}</span>
          </div>
          <div className="bg-light-bg/50 rounded-lg p-2">
            <span className="text-dark-soft block">Updated</span>
            <span className="font-bold text-dark-primary">{formatDate(draft.updatedAt)}</span>
          </div>
          {draft.scheduledAt && (
            <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-100">
              <span className="text-yellow-700 block">Scheduled</span>
              <span className="font-bold text-yellow-800">{formatDate(draft.scheduledAt)}</span>
            </div>
          )}
          {draft.publishedAt && (
            <div className="bg-green-50 rounded-lg p-2 border border-green-100">
              <span className="text-green-700 block">Published</span>
              <span className="font-bold text-green-800">{formatDate(draft.publishedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled || isReadOnly}
            className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${getVariantClass(action.variant)} ${action.disabled || isReadOnly ? 'opacity-50 cursor-not-allowed' : 'shadow-sm hover:shadow-md'}`}
          >
            <i className={`fas ${action.icon} text-[12px]`}></i>
            {action.label}
          </button>
        ))}

        {/* Info */}
        <div className="pt-4 border-t border-light-border">
          <p className="text-[11px] text-dark-soft text-center">
            {draft.status === 'draft' && 'Draft changes are not visible to teachers or students until published.'}
            {draft.status === 'scheduled' && 'This draft will be automatically published at the scheduled time.'}
            {draft.status === 'published' && 'This version is currently live. Rolling back will replace the current timetable.'}
            {draft.status === 'archived' && 'Archived drafts are read-only. Create a copy to make changes.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DraftActions;