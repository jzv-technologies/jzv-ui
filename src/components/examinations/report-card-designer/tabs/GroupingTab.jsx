import React from 'react';

/**
 * GroupingTab
 * The "Subject Groups" tab: custom subject groups list with add / edit / delete.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const GroupingTab = ({
  availableSubjects,
  currentConfig,
  handleDeleteGroup,
  handleEditGroup,
  handleOpenNewGroup,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-light-border shadow-2xs">
        <div>
          <h3 className="text-xs font-black text-dark-primary uppercase tracking-wider">
            Subject Grouping System
          </h3>
          <p className="text-xs text-dark-muted mt-0.5 max-w-lg">
            Group individual subjects under a custom parent title (e.g. place Physics, Chemistry,
            and Biology under "Science").
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenNewGroup}
          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <i className="fas fa-plus text-[10px]" />
          <span>Add Subject Group</span>
        </button>
      </div>

      {currentConfig.subjectGroups.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-light-border rounded-2xl p-6">
          <i className="fas fa-layer-group text-3xl text-slate-300 mb-2 block" />
          <p className="text-xs font-bold text-dark-primary">No Subject Groups Defined</p>
          <p className="text-[11px] text-dark-muted mt-1 max-w-sm mx-auto">
            All subjects will render as individual rows in the table. Click "Add Subject Group" to
            combine related subjects under a single category title.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentConfig.subjectGroups.map((group) => {
            const memberSubjects = availableSubjects.filter((s) =>
              group.subjectIds.map(String).includes(String(s.id))
            );

            return (
              <div
                key={group.id}
                className="bg-white p-4 rounded-2xl border border-light-border shadow-2xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                      <i className="fas fa-folder" />
                    </div>
                    <h4 className="text-xs font-black text-dark-primary">{group.name}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditGroup(group)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Edit group"
                    >
                      <i className="fas fa-pen text-[10px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-700 cursor-pointer"
                      title="Delete group"
                    >
                      <i className="fas fa-trash text-[10px]" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {memberSubjects.length > 0 ? (
                    memberSubjects.map((s) => (
                      <span
                        key={s.id}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 text-dark-slate text-[10px] font-bold"
                      >
                        {s.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-dark-muted italic">
                      {group.subjectIds.length} subjects mapped
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GroupingTab;
