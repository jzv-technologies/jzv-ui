import React, { useState, useEffect } from 'react';
import { showToast } from '../../../../utils/toast';
import ConfirmModal from '../../../ConfirmModal';
import { CARD_THEMES } from '../../../../utils/cardTheme';

const ThemeSelect = ({ value, onChange, className = '', dropdownPosition = 'bottom' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTheme = CARD_THEMES[value] || CARD_THEMES.blue;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-full flex items-center justify-between gap-1.5 bg-white border border-light-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-dark-primary outline-none hover:bg-light-lbg/20 transition-all text-left"
      >
        <div className="flex items-center gap-1.5 truncate">
          <span
            className={`w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 ${currentTheme.color}`}
          />
          <span className="truncate">{value}</span>
        </div>
        <i
          className={`fas fa-chevron-${open ? 'up' : 'down'} text-[9px] text-dark-muted shrink-0`}
        ></i>
      </button>

      {open && (
        <div
          className={`absolute left-0 ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'mt-1'} w-40 max-h-48 overflow-y-auto bg-white border border-light-border rounded-xl shadow-xl z-50 p-1 divide-y divide-gray-50 scrollbar-thin animate-in fade-in slide-in-from-top-1 duration-100`}
        >
          {Object.keys(CARD_THEMES).map((t) => {
            const isSelected = t === value;
            const theme = CARD_THEMES[t];
            return (
              <button
                key={t}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(t);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-left transition-colors rounded-lg ${
                  isSelected
                    ? 'bg-brand-lbg text-brand-primary'
                    : 'text-dark-primary hover:bg-light-lbg/30'
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full shrink-0 border border-black/10 ${theme.color}`}
                />
                <span className="truncate flex-1">{t}</span>
                {isSelected && (
                  <i className="fas fa-check text-[9px] text-brand-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ClassificationsModal = ({
  isOpen,
  onClose,
  classifications = [],
  subjects = [],
  onSaveClassifications,
  onBulkMapSubjects,
}) => {
  const [activeClsId, setActiveClsId] = useState(null);
  const [newClsName, setNewClsName] = useState('');
  const [newClsTheme, setNewClsTheme] = useState('blue');

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingTheme, setEditingTheme] = useState('blue');

  // Right-panel selection state
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideMapped, setHideMapped] = useState(true);
  const [savingMap, setSavingMap] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState(null);

  // Auto-select first classification on mount or state load
  useEffect(() => {
    if (classifications.length > 0 && !activeClsId) {
      setActiveClsId(classifications[0].id);
    }
  }, [classifications, activeClsId]);

  // Sync selected subject checkboxes when active classification changes
  useEffect(() => {
    if (activeClsId) {
      const mappedIds = subjects
        .filter((sub) => String(sub.classification_id) === String(activeClsId))
        .map((sub) => sub.id);
      setSelectedSubjectIds(mappedIds);
    } else {
      setSelectedSubjectIds([]);
    }
  }, [activeClsId, subjects]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmConfig) {
          setConfirmConfig(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmConfig, onClose]);

  if (!isOpen) return null;

  const activeClassification = classifications.find((c) => String(c.id) === String(activeClsId));

  // Form handlers
  const handleAddCls = async (e) => {
    e.preventDefault();
    if (!newClsName.trim()) return;

    // Check duplicate
    if (classifications.some((c) => c.name.toLowerCase() === newClsName.trim().toLowerCase())) {
      showToast('A classification with this name already exists.', 'error');
      return;
    }

    const newId = 'local-' + Math.random().toString(36).substr(2, 9);
    const updated = [
      ...classifications,
      { id: newId, name: newClsName.trim(), theme: newClsTheme },
    ];

    await onSaveClassifications(updated);
    setNewClsName('');
    setNewClsTheme('blue');
    setActiveClsId(newId); // auto select newly created
  };

  const handleStartRename = (cls) => {
    setEditingId(cls.id);
    setEditingName(cls.name);
    setEditingTheme(cls.theme || 'blue');
  };

  const handleRename = async (id) => {
    if (!editingName.trim()) return;

    // Check duplicate excluding self
    if (
      classifications.some(
        (c) =>
          String(c.id) !== String(id) && c.name.toLowerCase() === editingName.trim().toLowerCase()
      )
    ) {
      showToast('A classification with this name already exists.', 'error');
      return;
    }

    const updated = classifications.map((c) =>
      String(c.id) === String(id) ? { ...c, name: editingName.trim(), theme: editingTheme } : c
    );
    await onSaveClassifications(updated);
    setEditingId(null);
  };

  const handleDeleteCls = (cls) => {
    const mappedCount = subjects.filter(
      (s) => String(s.classification_id) === String(cls.id)
    ).length;
    let warning = `Are you sure you want to delete classification "${cls.name}"?`;
    if (mappedCount > 0) {
      warning += `\n\nWARNING: ${mappedCount} subjects are currently mapped to this classification. They will become Unclassified!`;
    }

    setConfirmConfig({
      title: 'Delete Classification',
      message: warning,
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setConfirmConfig(null);
        const updated = classifications.filter((c) => String(c.id) !== String(cls.id));
        await onSaveClassifications(updated, cls.id);

        if (String(activeClsId) === String(cls.id)) {
          setActiveClsId(updated.length > 0 ? updated[0].id : null);
        }
      },
    });
  };

  // Bulk mapping selection toggle
  const handleToggleSubject = (subId) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const handleSelectAllFiltered = (filteredIds) => {
    setSelectedSubjectIds((prev) => {
      // Add all filtered ones that aren't already selected
      const toAdd = filteredIds.filter((id) => !prev.includes(id));
      return [...prev, ...toAdd];
    });
  };

  const handleDeselectAllFiltered = (filteredIds) => {
    setSelectedSubjectIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
  };

  // Save bulk mappings
  const handleSaveBulkMappings = async () => {
    if (!activeClsId) return;
    setSavingMap(true);
    try {
      await onBulkMapSubjects(activeClsId, selectedSubjectIds);
      showToast('Subject mappings saved successfully!', 'success');
    } catch (err) {
      showToast('Error saving mappings: ' + err.message, 'error');
    } finally {
      setSavingMap(false);
    }
  };

  // Filter subjects based on query
  const filteredSubjects = [...subjects]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((sub) => {
      const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (hideMapped) {
        const isMappedToOther =
          sub.classification_id && String(sub.classification_id) !== String(activeClsId);
        if (isMappedToOther) return false;
      }
      return true;
    });

  const filteredSubjectIds = filteredSubjects.map((s) => s.id);
  const areAllFilteredSelected =
    filteredSubjectIds.length > 0 &&
    filteredSubjectIds.every((id) => selectedSubjectIds.includes(id));

  return (
    <>
      <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] border border-light-border shadow-2xl max-w-4xl w-full h-[650px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-brand-primary p-5 text-white flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <i className="fas fa-sliders-h"></i>
                Manage Subject Classifications
              </h3>
              <p className="text-xs text-brand-lbg/80 mt-0.5">
                Create, rename, or delete classifications and map multiple subjects at once.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-all text-xl outline-none p-1"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Dual Panel Body */}
          <div className="flex-1 flex min-h-0">
            {/* Left Panel: Classifications List */}
            <div className="w-1/2 border-r border-light-border flex flex-col p-5 bg-light-bg/10">
              <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider mb-3">
                1. Classifications List ({classifications.length})
              </h4>

              {/* Add form */}
              <form
                onSubmit={handleAddCls}
                className="flex gap-2 mb-4 shrink-0 flex-col sm:flex-row items-center"
              >
                <input
                  type="text"
                  required
                  placeholder="New classification name..."
                  value={newClsName}
                  onChange={(e) => setNewClsName(e.target.value)}
                  className="flex-1 bg-white border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft w-full sm:w-auto"
                />
                <ThemeSelect
                  value={newClsTheme}
                  onChange={setNewClsTheme}
                  className="w-32 shrink-0"
                  dropdownPosition="bottom"
                />
                <button
                  type="submit"
                  className="bg-brand-primary hover:bg-brand-dark text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-all shrink-0 w-full sm:w-auto"
                >
                  Add
                </button>
              </form>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {classifications.length === 0 ? (
                  <div className="text-center text-xs italic text-dark-muted py-12">
                    No classifications created yet.
                  </div>
                ) : (
                  classifications.map((cls) => {
                    const isActive = String(cls.id) === String(activeClsId);
                    const isEditing = String(cls.id) === String(editingId);

                    // Count mapped subjects
                    const mappedCount = subjects.filter(
                      (s) => String(s.classification_id) === String(cls.id)
                    ).length;

                    return (
                      <div
                        key={cls.id}
                        onClick={() => !isEditing && setActiveClsId(cls.id)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-brand-primary text-white border-brand-soft shadow-sm'
                            : 'bg-white text-dark-deepblue border-light-border hover:bg-light-lbg/30'
                        }`}
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          {isEditing ? (
                            <div className="flex flex-col gap-1 w-full">
                              <input
                                type="text"
                                required
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-white border border-light-border text-dark-primary rounded px-2 py-1 outline-none font-semibold text-xs"
                              />
                              <ThemeSelect
                                value={editingTheme}
                                onChange={setEditingTheme}
                                className="w-full mt-1"
                                dropdownPosition="top"
                              />
                            </div>
                          ) : (
                            <div className="truncate flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${cls.theme ? CARD_THEMES[cls.theme]?.color : 'bg-blue-500'}`}
                              />
                              <i className="fas fa-folder text-[10px]"></i>
                              <span>{cls.name}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded-full border ${
                                  isActive
                                    ? 'bg-brand-dark text-white border-brand-soft/20'
                                    : 'bg-light-lbg text-dark-muted border-light-border'
                                }`}
                              >
                                {mappedCount} subjects
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleRename(cls.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-dark-soft hover:bg-light-ui rounded"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartRename(cls)}
                                className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-light-border transition-all ${
                                  isActive ? 'text-white hover:text-dark-primary' : 'text-blue-500'
                                }`}
                                title="Rename"
                              >
                                <i className="fas fa-edit text-[10px]"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteCls(cls)}
                                className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all ${
                                  isActive
                                    ? 'text-white hover:text-red-primary'
                                    : 'text-red-primary'
                                }`}
                                title="Delete"
                              >
                                <i className="fas fa-trash-alt text-[10px]"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Map Subjects */}
            <div className="w-1/2 flex flex-col p-5 bg-white">
              {activeClassification ? (
                <>
                  {/* Panel Header */}
                  <div className="mb-4 shrink-0">
                    <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider">
                      2. Map Subjects to:
                    </h4>
                    <p className="text-sm font-extrabold text-brand-primary truncate mt-0.5">
                      {activeClassification.name}
                    </p>
                  </div>

                  {/* Filter & Selection Control */}
                  <div className="space-y-2.5 mb-4 shrink-0">
                    <input
                      type="text"
                      placeholder="Search subjects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                    />

                    <div className="flex items-center gap-2 px-1 py-0.5">
                      <input
                        type="checkbox"
                        id="hide-mapped-subjects"
                        checked={hideMapped}
                        onChange={(e) => setHideMapped(e.target.checked)}
                        className="rounded text-brand-primary focus:ring-brand-soft w-3.5 h-3.5 cursor-pointer"
                      />
                      <label
                        htmlFor="hide-mapped-subjects"
                        className="text-[10px] font-bold text-dark-soft cursor-pointer select-none"
                      >
                        Hide subjects mapped to other classifications
                      </label>
                    </div>

                    {filteredSubjects.length > 0 && (
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] text-dark-muted font-bold">
                          {selectedSubjectIds.length} of {subjects.length} selected
                        </span>
                        <div className="flex gap-2">
                          {areAllFilteredSelected ? (
                            <button
                              type="button"
                              onClick={() => handleDeselectAllFiltered(filteredSubjectIds)}
                              className="text-[10px] font-bold text-red-primary hover:underline"
                            >
                              Deselect Filtered
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectAllFiltered(filteredSubjectIds)}
                              className="text-[10px] font-bold text-brand-primary hover:underline"
                            >
                              Select Filtered
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subjects Checkbox list */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 border border-light-border/40 rounded-2xl p-3 bg-light-lbg/10 pr-1.5">
                    {filteredSubjects.length === 0 ? (
                      <div className="text-center text-xs italic text-dark-muted py-12">
                        {searchQuery
                          ? 'No matching subjects found.'
                          : 'No subjects configured in the school.'}
                      </div>
                    ) : (
                      filteredSubjects.map((sub) => {
                        const isChecked = selectedSubjectIds.includes(sub.id);

                        // Identify current classification mapping for context
                        const currentMapping = classifications.find(
                          (c) => String(c.id) === String(sub.classification_id)
                        );

                        return (
                          <label
                            key={sub.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer bg-white ${
                              isChecked
                                ? 'border-brand-soft bg-brand-lbg/10 font-bold'
                                : 'border-light-border/40 hover:bg-light-lbg/20 font-semibold'
                            }`}
                          >
                            <span className="flex items-center gap-2.5 truncate mr-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSubject(sub.id)}
                                className="rounded text-brand-primary focus:ring-brand-soft w-4 h-4 shrink-0"
                              />
                              <span className="text-xs text-dark-primary truncate">{sub.name}</span>
                            </span>

                            {/* Show if mapped elsewhere */}
                            {!isChecked && currentMapping && (
                              <span className="text-[8px] bg-light-ui text-dark-muted border border-light-border px-1.5 py-0.5 rounded-full shrink-0 font-bold max-w-[120px] truncate">
                                Mapped: {currentMapping.name}
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>

                  {/* Bulk Map Footer Action */}
                  <div className="pt-4 border-t border-light-border mt-4 shrink-0 flex justify-end">
                    <button
                      onClick={handleSaveBulkMappings}
                      disabled={savingMap}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <i className="fas fa-check-circle"></i>
                      {savingMap ? 'Saving...' : 'Save Mappings'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-light-bg/5 rounded-2xl border border-dashed border-light-border">
                  <i className="fas fa-folder-open text-4xl text-light-muted mb-3"></i>
                  <h5 className="text-sm font-bold text-dark-deepblue">
                    No Classification Selected
                  </h5>
                  <p className="text-xs text-dark-muted mt-1 max-w-[220px]">
                    Select or create a subject classification on the left panel to map subjects.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmConfig}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </>
  );
};

export default ClassificationsModal;
