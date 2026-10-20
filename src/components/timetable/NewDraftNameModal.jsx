// src/components/timetable/NewDraftNameModal.jsx
/**
 * NewDraftNameModal Component
 * Collects the version name (and optional description) before a draft is created from the
 * live timetable.
 */

import React, { useState } from 'react';

const NewDraftNameModal = ({
  initialName = '',
  initialDescription = '',
  creationSources = false,
  drafts = [],
  eyebrow = 'New Draft Version',
  heading = 'Create a new draft',
  hint = 'Choose a starting point. Live data stays untouched until you publish a draft.',
  confirmLabel = 'Create Draft',
  confirmIcon = 'fa-plus',
  onCancel,
  onConfirm,
}) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [sourceType, setSourceType] = useState('live');
  const [sourceDraftId, setSourceDraftId] = useState(drafts[0]?.id || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (creationSources && sourceType === 'clone' && !sourceDraftId) return;
    onConfirm(name, description, { type: sourceType, draftId: sourceDraftId });
  };

  return (
    <div className="fixed inset-0 bg-dark-almostblack/50 backdrop-blur-sm z-[85] flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-light-border shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="bg-amber-500 px-5 py-3 text-white">
          <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-90 block">
            {eyebrow}
          </span>
          <h3 className="text-base font-bold">{heading}</h3>
        </div>

        <div className="p-5 space-y-4">
          {creationSources && (
            <fieldset className="space-y-2">
              <legend className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-1.5">
                Start from
              </legend>
              {[
                { id: 'live', label: 'Live data', detail: 'Copy the current live timetable.' },
                { id: 'clone', label: 'Clone version', detail: 'Copy a saved draft version.' },
                { id: 'blank', label: 'Blank table', detail: 'Keep setup data and clear scheduled slots.' },
              ].map((option) => (
                <label
                  key={option.id}
                  className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 ${
                    sourceType === option.id
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-light-border bg-white'
                  } ${option.id === 'clone' && drafts.length === 0 ? 'opacity-50' : 'cursor-pointer'}`}
                >
                  <input
                    type="radio"
                    name="draft-source"
                    value={option.id}
                    checked={sourceType === option.id}
                    disabled={option.id === 'clone' && drafts.length === 0}
                    onChange={() => setSourceType(option.id)}
                    className="mt-0.5 accent-amber-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-dark-primary">{option.label}</span>
                    <span className="block text-[11px] font-medium text-dark-soft">{option.detail}</span>
                    {option.id === 'clone' && sourceType === 'clone' && drafts.length > 0 && (
                      <select
                        value={sourceDraftId}
                        onChange={(e) => setSourceDraftId(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-amber-400"
                        aria-label="Version to clone"
                      >
                        {drafts.map((draft) => (
                          <option key={draft.id} value={draft.id}>
                            {draft.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <div>
            <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-1.5">
              Version Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Term 2 revision"
              className="w-full bg-white border border-light-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this version for?"
              className="w-full bg-white border border-light-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-dark-primary outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            {hint}
          </p>
        </div>

        <div className="bg-light-lbg/50 border-t border-light-border px-5 py-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-light-ui text-dark-soft hover:bg-light-border rounded-xl text-sm font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || (creationSources && sourceType === 'clone' && !sourceDraftId)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <i className={`fas ${confirmIcon}`} />
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewDraftNameModal;
