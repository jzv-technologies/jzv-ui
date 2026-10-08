import React from 'react';
import { createPortal } from 'react-dom';

/**
 * GroupModal
 * Modal for creating / editing a subject group and choosing its subjects.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const GroupModal = ({
  availableSubjects,
  editingGroupId,
  groupNameInput,
  groupSubjectIds,
  handleSaveGroup,
  setGroupNameInput,
  setGroupSubjectIds,
  setShowGroupModal,
}) => {
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <form
        onSubmit={handleSaveGroup}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
            <i className="fas fa-folder-plus text-rose-600" />
            <span>{editingGroupId ? 'Edit Subject Group' : 'New Subject Group'}</span>
          </h3>
          <button
            type="button"
            onClick={() => setShowGroupModal(false)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <p className="text-xs text-dark-muted">
          Specify a custom title to group multiple subjects under one header (e.g. Science, Social,
          Languages).
        </p>

        <div>
          <label className="block text-xs font-bold text-dark-slate mb-1">
            Custom Group Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Science or Languages"
            value={groupNameInput}
            onChange={(e) => setGroupNameInput(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white font-bold focus:ring-2 focus:ring-rose-300 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-dark-slate mb-2">
            Select Subjects to Group
          </label>
          <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-light-border rounded-xl">
            {availableSubjects.map((sub) => {
              const isChecked = groupSubjectIds.includes(String(sub.id));
              return (
                <label
                  key={sub.id}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-white border-light-border text-dark-primary hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setGroupSubjectIds([...groupSubjectIds, String(sub.id)]);
                      } else {
                        setGroupSubjectIds(groupSubjectIds.filter((id) => id !== String(sub.id)));
                      }
                    }}
                    className="rounded text-rose-600 focus:ring-rose-400"
                  />
                  <span>{sub.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-light-border">
          <button
            type="button"
            onClick={() => setShowGroupModal(false)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all cursor-pointer shadow-xs"
          >
            Save Grouping
          </button>
        </div>
      </form>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default GroupModal;
