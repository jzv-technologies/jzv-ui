import React from 'react';

/**
 * SaveModeToggle
 * Toggle between auto and manual save modes
 */
const SaveModeToggle = ({ saveMode, setSaveMode, canEditMap = {}, activeResults = [], isTeacherLocked }) => {
  const hasEditableSubjects = activeResults.some(
    (r) => canEditMap[r.id] ?? canEditMap[String(r.id)]
  );

  if (!hasEditableSubjects) return null;

  return (
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
  );
};

export default SaveModeToggle;