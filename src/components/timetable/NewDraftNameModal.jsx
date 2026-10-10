// src/components/timetable/NewDraftNameModal.jsx
/**
 * NewDraftNameModal Component
 * Collects the version name (and optional description) before a draft is created from the
 * live timetable.
 */

import React, { useState } from 'react';

const NewDraftNameModal = ({ initialName = '', onCancel, onConfirm }) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name, description);
  };

  return (
    <div className="fixed inset-0 bg-dark-almostblack/50 backdrop-blur-sm z-[85] flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-light-border shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="bg-amber-500 px-5 py-3 text-white">
          <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-90 block">
            New Draft Version
          </span>
          <h3 className="text-base font-bold">Create draft from live data</h3>
        </div>

        <div className="p-5 space-y-4">
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
            The draft starts as a copy of the live timetable. Live data stays untouched until you
            publish it.
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
            disabled={!name.trim()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <i className="fas fa-plus" />
            Create Draft
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewDraftNameModal;
