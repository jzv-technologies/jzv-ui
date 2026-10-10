// src/components/timetable/DraftVersionList.jsx
/**
 * DraftVersionList Component
 * Displays list of draft versions with actions
 */

import React from 'react';

const DraftVersionList = ({
  drafts,
  selectedDraftId,
  onSelect,
  onCompare,
  onDuplicate,
  onSchedule,
  onPublish,
  onDiscard,
  onRollback,
  isLoading,
  getStatusBadgeClass,
  getStatusIcon,
  formatDate,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-light-border rounded-2xl p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-brand-primary border-t-transparent mx-auto mb-4"></div>
        <p className="text-dark-soft">Loading drafts...</p>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="bg-white border border-light-border rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-light-bg/50 flex items-center justify-center text-light-border">
          <i className="fas fa-file-alt text-2xl"></i>
        </div>
        <h3 className="text-lg font-bold text-dark-primary mb-2">No Drafts Found</h3>
        <p className="text-dark-soft text-sm mb-4">Create your first draft to start working on timetable changes</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-light-border rounded-2xl overflow-hidden">
      <div className="bg-light-lbg/50 px-4 py-3 border-b border-light-border">
        <h3 className="text-sm font-extrabold text-dark-primary uppercase tracking-wider">
          Draft Versions ({drafts.length})
        </h3>
      </div>
      
      <div className="divide-y divide-light-border">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            onClick={() => onSelect(draft.id)}
            className={`p-4 transition-all cursor-pointer ${
              selectedDraftId === draft.id
                ? 'bg-brand-primary/5 border-l-4 border-brand-primary'
                : 'hover:bg-light-bg/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h4 className="font-bold text-dark-primary truncate">{draft.name}</h4>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(draft.status)}`}>
                    <i className={`fas ${getStatusIcon(draft.status)} text-[9px]`}></i>
                    {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
                  </span>
                  {draft.versionNumber && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                      v{draft.versionNumber}
                    </span>
                  )}
                </div>
                
                {draft.description && (
                  <p className="text-sm text-dark-soft truncate mb-2">{draft.description}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-dark-soft">
                  <span className="flex items-center gap-1">
                    <i className="fas fa-calendar"></i>
                    {formatDate(draft.updatedAt)}
                  </span>
                  {draft.scheduledAt && (
                    <span className="flex items-center gap-1 text-yellow-700">
                      <i className="fas fa-clock"></i>
                      Scheduled: {formatDate(draft.scheduledAt)}
                    </span>
                  )}
                  {draft.publishedAt && (
                    <span className="flex items-center gap-1 text-green-700">
                      <i className="fas fa-check-circle"></i>
                      Published: {formatDate(draft.publishedAt)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompare(draft.id);
                  }}
                  className="p-2 text-dark-soft hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
                  title="Compare with Live"
                >
                  <i className="fas fa-balance-scale text-sm"></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(draft.id);
                  }}
                  className="p-2 text-dark-soft hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Duplicate"
                >
                  <i className="fas fa-copy text-sm"></i>
                </button>
              </div>
            </div>
            
            {/* Action buttons for selected draft */}
            {selectedDraftId === draft.id && (
              <div className="mt-3 pt-3 border-t border-light-border flex flex-wrap gap-2">
                {draft.status === 'draft' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPublish();
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                    >
                      <i className="fas fa-check-circle text-[10px]"></i>
                      Publish
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSchedule();
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                    >
                      <i className="fas fa-clock text-[10px]"></i>
                      Schedule
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRollback();
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                    >
                      <i className="fas fa-undo text-[10px]"></i>
                      Rollback
                    </button>
                  </>
                )}
                {draft.status === 'scheduled' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPublish();
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                    >
                      <i className="fas fa-check-circle text-[10px]"></i>
                      Publish Now
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDiscard();
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                    >
                      <i className="fas fa-trash text-[10px]"></i>
                      Cancel Schedule
                    </button>
                  </>
                )}
                {draft.status === 'published' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRollback();
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                    >
                      <i className="fas fa-undo text-[10px]"></i>
                      Rollback to This
                    </button>
                  </>
                )}
                {draft.status === 'archived' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(draft.id);
                    }}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                  >
                    <i className="fas fa-copy text-[10px]"></i>
                    Restore as New Draft
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DraftVersionList;