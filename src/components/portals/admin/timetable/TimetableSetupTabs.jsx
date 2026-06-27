// src/components/portals/admin/timetable/TimetableSetupTabs.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import ConfirmModal from "../../../ConfirmModal";
import { CARD_THEMES } from "../../../../utils/cardTheme";


// Helper to generate UUIDs locally when offline
export const generateLocalId = () => {
  return "local-" + Math.random().toString(36).substr(2, 9);
};

export const renderSubjectOptionsGroupedByClassification = (subjectsList, classificationsList, getOptionLabel = (sub) => sub.name, currentSelectedSubjectId = null) => {
  const sortedClassifications = [...classificationsList].sort((a, b) => a.name.localeCompare(b.name));
  
  const grouped = {};
  const unclassified = [];

  subjectsList.forEach((sub) => {
    // Skip deactivated subjects unless currently selected
    const isDeactivated = sub.deactivated === true || sub.deactivate === true;
    if (isDeactivated && String(sub.id) !== String(currentSelectedSubjectId)) {
      return;
    }

    const cls = sub.classification_id
      ? classificationsList.find((c) => String(c.id) === String(sub.classification_id))
      : null;
    if (cls) {
      if (!grouped[cls.id]) grouped[cls.id] = [];
      grouped[cls.id].push(sub);
    } else {
      unclassified.push(sub);
    }
  });

  const elements = [];

  sortedClassifications.forEach((cls) => {
    const clsSubjects = grouped[cls.id];
    if (clsSubjects && clsSubjects.length > 0) {
      const sortedClsSubjects = [...clsSubjects].sort((a, b) => a.name.localeCompare(b.name));
      elements.push(
        <optgroup key={cls.id} label={cls.name}>
          {sortedClsSubjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {getOptionLabel(sub)}
            </option>
          ))}
        </optgroup>
      );
    }
  });

  if (unclassified.length > 0) {
    const sortedUnclassified = [...unclassified].sort((a, b) => a.name.localeCompare(b.name));
    elements.push(
      <optgroup key="unclassified" label="Unclassified">
        {sortedUnclassified.map((sub) => (
          <option key={sub.id} value={sub.id}>
            {getOptionLabel(sub)}
          </option>
        ))}
      </optgroup>
    );
  }

  return elements;
};





// ==========================================
// 2. TEACHERS SETUP
// ==========================================
// Custom multi-select component grouping subjects by classification with a search filter
const GroupedSubjectMultiSelect = ({
  subjects = [],
  classifications = [],
  selectedIds = [],
  onChange,
  placeholder = "Select qualified subjects..."
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const [controlWidth, setControlWidth] = useState(0);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setControlWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const colsClass = useMemo(() => {
    if (controlWidth < 250) return "grid-cols-1";
    if (controlWidth < 450) return "grid-cols-2";
    if (controlWidth < 650) return "grid-cols-3";
    if (controlWidth < 850) return "grid-cols-4";
    return "grid-cols-5";
  }, [controlWidth]);

  // Filter subjects based on search query
  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group filtered subjects by classification
  const grouped = useMemo(() => {
    const groups = {};

    // Initialize groups for classifications to preserve classification order/existence
    classifications.forEach(c => {
      groups[c.id] = {
        name: c.name,
        theme: c.theme,
        items: []
      };
    });

    const unclassifiedKey = "unclassified";
    groups[unclassifiedKey] = {
      name: "Unclassified Subjects",
      theme: "charcoal",
      items: []
    };

    filteredSubjects.forEach(s => {
      const key = s.classification_id && groups[s.classification_id] ? s.classification_id : unclassifiedKey;
      groups[key].items.push(s);
    });

    return Object.keys(groups)
      .map(id => ({ id, ...groups[id] }))
      .filter(g => g.items.length > 0);
  }, [filteredSubjects, classifications]);

  const selectedCount = selectedIds.length;
  
  const handleToggleSubject = (subId) => {
    const current = selectedIds.map(String);
    const subStr = String(subId);
    let updated;
    if (current.includes(subStr)) {
      updated = selectedIds.filter(id => String(id) !== subStr);
    } else {
      updated = [...selectedIds, subId];
    }
    onChange(updated);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft hover:bg-light-lbg/10 transition-all text-left"
      >
        <span className="truncate">
          {selectedCount === 0 
            ? placeholder 
            : `${selectedCount} subject${selectedCount > 1 ? "s" : ""} selected`}
        </span>
        <span className="flex items-center gap-1.5 shrink-0 text-dark-muted">
          {selectedCount > 0 && (
            <span className="text-[10px] bg-brand-primary text-white font-extrabold px-1.5 py-0.5 rounded-full">
              {selectedCount}
            </span>
          )}
          <i className={`fas fa-chevron-${open ? "up" : "down"} text-xs`}></i>
        </span>
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-full bg-white border border-light-border rounded-xl shadow-xl z-50 p-2.5 max-h-96 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search box */}
          <div className="relative mb-2 shrink-0">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted text-xs"></i>
            <input
              type="text"
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-light-lbg/40 border border-light-border/60 rounded-lg outline-none font-semibold text-dark-primary focus:border-brand-soft"
            />
          </div>

          {/* Grouped list */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 scrollbar-thin">
            {grouped.length === 0 ? (
              <div className="text-center text-xs italic text-dark-muted py-6">
                No matching subjects found.
              </div>
            ) : (
              grouped.map((group) => {
                const groupTheme = CARD_THEMES[group.theme] || CARD_THEMES.charcoal;
                return (
                  <div key={group.id} className="space-y-1.5">
                    {/* Header */}
                    <div className="flex items-center gap-1.5 px-1.5 shrink-0">
                      <span className={`w-2.5 h-2.5 rounded-full bg-${groupTheme.color}`} />
                      <span className="text-[10px] font-extrabold text-dark-deepblue uppercase tracking-wider">
                        {group.name} ({group.items.length})
                      </span>
                    </div>

                    {/* Group Items Grid */}
                    <div className={`grid gap-1.5 pl-3.5 ${colsClass}`}>
                      {group.items.map((sub) => {
                        const isChecked = selectedIds.some(sid => String(sid) === String(sub.id));
                        return (
                          <label
                            key={sub.id}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all cursor-pointer text-xs font-semibold ${
                              isChecked
                                ? "bg-brand-lbg/10 border-brand-soft text-brand-primary"
                                : "bg-white border-light-border/40 hover:bg-light-lbg/20 text-dark-primary"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSubject(sub.id)}
                              className="rounded text-brand-primary focus:ring-brand-soft w-3.5 h-3.5"
                            />
                            <span className="truncate flex-1">{sub.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const TeachersSetup = ({
  teachers,
  subjects,
  classifications = [],
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  slots,
  assignments
}) => {
  const [name, setName] = useState("");
  const [isMale, setIsMale] = useState(true);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editName, setEditName] = useState("");
  const [editIsMale, setEditIsMale] = useState(true);
  const [editSelectedSubjects, setEditSelectedSubjects] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState(null);

  const [activeSubjectDropdownId, setActiveSubjectDropdownId] = useState(null);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveSubjectDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInlineSubjectToggle = (teacher, subjectId) => {
    const currentSubjects = teacher.subjects || [];
    let newSubjects;
    if (currentSubjects.some(sid => String(sid) === String(subjectId))) {
      newSubjects = currentSubjects.filter(id => String(id) !== String(subjectId));
    } else {
      newSubjects = [...currentSubjects, subjectId];
    }
    onUpdateTeacher(teacher.id, teacher.name, teacher.is_male, newSubjects);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddTeacher(name.trim(), selectedSubjects, isMale);
    setName("");
    setSelectedSubjects([]);
    setIsMale(true);
  };

  const handleSubjectToggle = (subId, isEdit = false) => {
    if (isEdit) {
      setEditSelectedSubjects(prev =>
        prev.some(sid => String(sid) === String(subId))
          ? prev.filter(sid => String(sid) !== String(subId))
          : [...prev, subId]
      );
    } else {
      setSelectedSubjects(prev =>
        prev.some(sid => String(sid) === String(subId))
          ? prev.filter(sid => String(sid) !== String(subId))
          : [...prev, subId]
      );
    }
  };

  const handleStartEdit = (teacher) => {
    setEditingTeacher(teacher);
    setEditName(teacher.name);
    setEditSelectedSubjects(teacher.subjects || []);
    setEditIsMale(teacher.is_male !== false);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    onUpdateTeacher(editingTeacher.id, editName.trim(), editSelectedSubjects, editIsMale);
    setEditingTeacher(null);
  };

  const handleDelete = (teacherId, teacherName) => {
    const isUsedInSlots = slots.some((s) => String(s.teacher_id) === String(teacherId));
    const isUsedInAssignments = assignments.some((a) => String(a.teacher_id) === String(teacherId));

    let warning = `Are you sure you want to delete teacher "${teacherName}"?`;
    if (isUsedInSlots || isUsedInAssignments) {
      warning += `\n\nWARNING: This teacher is currently assigned to classes or scheduled in the timetable. Deleting will clear those schedules!`;
    }

    setConfirmConfig({
      title: "Delete Teacher",
      message: warning,
      confirmText: "Delete",
      type: "danger",
      onConfirm: () => {
        setConfirmConfig(null);
        onDeleteTeacher(teacherId);
      }
    });
  };

  const getSubjectNamesStr = (subjectIds = []) => {
    if (subjectIds.length === 0) return <span className="text-red-primary font-semibold italic text-xs">No qualifications set</span>;
    return subjectIds
      .map(id => subjects.find(s => String(s.id) === String(id))?.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      {!editingTeacher && (
        <div className="bg-light-lbg/50 border border-light-border p-5 rounded-2xl">
          <h4 className="text-sm font-bold text-dark-deepblue uppercase tracking-wide mb-3">Add New Teacher</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-dark-soft mb-1.5">Teacher Name</label>
                <input
                  type="text"
                  required
                  placeholder="Teacher's Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-bold text-dark-soft mb-1.5">Gender</label>
                <select
                  value={isMale ? "male" : "female"}
                  onChange={(e) => setIsMale(e.target.value === "male")}
                  className="w-full bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-dark-soft mb-1.5">Qualified Subjects</label>
                {subjects.length === 0 ? (
                  <p className="text-xs text-dark-muted italic py-2.5">Please add subjects first.</p>
                ) : (
                  <GroupedSubjectMultiSelect
                    subjects={subjects}
                    classifications={classifications}
                    selectedIds={selectedSubjects}
                    onChange={setSelectedSubjects}
                    placeholder="Select qualified subjects..."
                  />
                )}
              </div>
              <button
                type="submit"
                className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all shrink-0 justify-center h-[42px] md:w-auto w-full"
              >
                <i className="fas fa-plus"></i> Add Teacher
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Overlay / Panel */}
      {editingTeacher && (
        <div className="bg-blue-50/50 border border-blue-200 p-5 rounded-2xl animate-in fade-in duration-300">
          <h4 className="text-sm font-bold text-blue-dark uppercase tracking-wide mb-3">Edit Teacher: {editingTeacher.name}</h4>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-dark-soft mb-1.5">Teacher Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-bold text-dark-soft mb-1.5">Gender</label>
                <select
                  value={editIsMale ? "male" : "female"}
                  onChange={(e) => setEditIsMale(e.target.value === "male")}
                  className="w-full bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-dark-soft mb-1.5">Qualified Subjects</label>
                {subjects.length === 0 ? (
                  <p className="text-xs text-dark-muted italic py-2.5">Please add subjects first.</p>
                ) : (
                  <GroupedSubjectMultiSelect
                    subjects={subjects}
                    classifications={classifications}
                    selectedIds={editSelectedSubjects}
                    onChange={setEditSelectedSubjects}
                    placeholder="Select qualified subjects..."
                  />
                )}
              </div>
              <div className="flex gap-2 shrink-0 md:w-auto w-full">
                <button
                  onClick={handleSaveEdit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all h-[42px] flex-1 md:flex-initial"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingTeacher(null)}
                  className="bg-light-ui hover:bg-light-border text-dark-soft px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all h-[42px] flex-1 md:flex-initial"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teachers List */}
      <div className="border border-light-border rounded-2xl overflow-hidden bg-white">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-light-lbg border-b border-light-border">
              <th className="py-3.5 px-4 font-bold text-xs text-dark-primary tracking-wider uppercase">Teacher Name</th>
              <th className="py-3.5 px-4 font-bold text-xs text-dark-primary tracking-wider uppercase">Gender</th>
              <th className="py-3.5 px-4 font-bold text-xs text-dark-primary tracking-wider uppercase">Qualified Subjects</th>
              <th className="py-3.5 px-4 font-bold text-xs text-dark-primary tracking-wider uppercase text-right w-[150px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light-border">
            {teachers.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-dark-muted text-sm">
                  No teachers configured. Add one above!
                </td>
              </tr>
            ) : (
              [...teachers]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((teacher) => (
                <tr key={teacher.id} className="hover:bg-light-bg/20 transition-colors">
                  <td className="py-3 px-4 font-bold text-sm text-dark-deepblue">
                    {teacher.name}
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold text-dark-soft">
                    {teacher.is_male !== false ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        <i className="fas fa-mars text-[10px]"></i> Male
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                        <i className="fas fa-venus text-[10px]"></i> Female
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold text-dark-soft max-w-md">
                    {getSubjectNamesStr(teacher.subjects)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <div className="relative" ref={activeSubjectDropdownId === teacher.id ? dropdownRef : null}>
                        <button
                          onClick={() => setActiveSubjectDropdownId(activeSubjectDropdownId === teacher.id ? null : teacher.id)}
                          className="text-brand-primary hover:text-brand-dark p-2 rounded-lg hover:bg-brand-lbg transition-all"
                          title="Assign Subjects"
                          disabled={!!editingTeacher}
                        >
                          <i className="fas fa-book-medical"></i>
                        </button>
                        {activeSubjectDropdownId === teacher.id && (
                          <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-light-border rounded-xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto">
                            <h5 className="text-xs font-bold text-dark-deepblue mb-2 px-1 border-b border-light-border pb-1">Assign Subjects to {teacher.name}</h5>
                            <div className="flex flex-col gap-1">
                              {subjects.length === 0 ? (
                                <span className="text-[10px] text-dark-muted px-1">No subjects available</span>
                              ) : (
                                [...subjects].sort((a,b) => a.name.localeCompare(b.name)).map(sub => (
                                  <label key={sub.id} className="flex items-center gap-2 p-1.5 hover:bg-light-lbg rounded cursor-pointer transition-colors">
                                    <input 
                                      type="checkbox" 
                                      className="rounded text-brand-primary focus:ring-brand-soft w-3.5 h-3.5 border-light-border"
                                      checked={(teacher.subjects || []).some(sid => String(sid) === String(sub.id))}
                                      onChange={() => handleInlineSubjectToggle(teacher, sub.id)}
                                    />
                                    <span className="text-xs font-semibold text-dark-primary truncate">{sub.name}</span>
                                  </label>
                                ))
                              )}
                            </div>
                            <div className="mt-2 pt-2 border-t border-light-border text-right">
                              <button
                                onClick={() => setActiveSubjectDropdownId(null)}
                                className="bg-brand-primary hover:bg-brand-dark text-white px-3 py-1 rounded-md text-[10px] font-bold"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleStartEdit(teacher)}
                        className="text-blue-medium hover:text-blue-dark p-2 rounded-lg hover:bg-blue-lbg transition-all"
                        title="Edit Teacher"
                        disabled={!!editingTeacher}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id, teacher.name)}
                        className="text-red-primary hover:text-red-dark p-2 rounded-lg hover:bg-red-lbg transition-all"
                        title="Delete"
                        disabled={!!editingTeacher}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </div>
  );
};


// ==========================================
// 3. CLASSES SETUP (CRUD + Teacher assignments)
// ==========================================
export const ClassesSetup = ({
  classes,
  teachers,
  subjects,
  classifications = [],
  assignments,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onAddAssignment,
  onRemoveAssignment,
  slots
}) => {
  const [classNameInput, setClassNameInput] = useState("");
  const [editingClassId, setEditingClassId] = useState(null);
  const [editClassName, setEditClassName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  // Assignment states
  const [newSubId, setNewSubId] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [confirmConfig, setConfirmConfig] = useState(null);


  React.useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes]);

  const handleCreateClass = (e) => {
    e.preventDefault();
    if (!classNameInput.trim()) return;
    onAddClass(classNameInput.trim());
    setClassNameInput("");
  };

  const handleStartEdit = (cls) => {
    setEditingClassId(cls.id);
    setEditClassName(cls.name);
  };

  const handleSaveEdit = (id) => {
    if (!editClassName.trim()) return;
    onUpdateClass(id, editClassName.trim());
    setEditingClassId(null);
  };

  const handleDeleteClass = (clsId, name) => {
    const isUsedInSlots = slots.some((s) => String(s.class_id) === String(clsId));
    const classAss = assignments.filter((a) => String(a.class_id) === String(clsId));

    let warning = `Are you sure you want to delete class "${name}"?`;
    if (isUsedInSlots || classAss.length > 0) {
      warning += `\n\nWARNING: This class has mappings or scheduled periods. Deleting it will clear everything associated with this class!`;
    }

    setConfirmConfig({
      title: "Delete Class",
      message: warning,
      confirmText: "Delete",
      type: "danger",
      onConfirm: () => {
        setConfirmConfig(null);
        onDeleteClass(clsId);
        if (String(selectedClassId) === String(clsId)) {
          setSelectedClassId(classes.find((c) => String(c.id) !== String(clsId))?.id || "");
        }
      }
    });
  };

  // Filter teachers based on chosen subject
  const getQualifiedTeachers = (subjectId) => {
    if (!subjectId) return [];
    return teachers
      .filter(t => t.subjects && t.subjects.some(sid => String(sid) === String(subjectId)))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleAddAssignment = (e) => {
    e.preventDefault();
    if (!selectedClassId || !newSubId || !newTeacherId) return;
    
    // Add mapping
    onAddAssignment(selectedClassId, newTeacherId, newSubId);
    setNewSubId("");
    setNewTeacherId("");
  };

  const handleRemoveAssignment = (assId, subjectName, teacherName) => {
    // Check if slot assignments are scheduled in timetable with this mapping
    const ass = assignments.find(a => String(a.id) === String(assId));
    const isScheduled = slots.some(
      s => String(s.class_id) === String(selectedClassId) && String(s.subject_id) === String(ass.subject_id) && String(s.teacher_id) === String(ass.teacher_id)
    );

    let warning = `Remove "${teacherName}" teaching "${subjectName}" from this class?`;
    if (isScheduled) {
      warning += `\n\nWARNING: This assignment is scheduled in the weekly timetable! Removing it will set those timetable slots to "Free Period".`;
    }

    setConfirmConfig({
      title: "Remove Assignment",
      message: warning,
      confirmText: "Remove",
      type: "danger",
      onConfirm: () => {
        setConfirmConfig(null);
        onRemoveAssignment(assId);
      }
    });
  };

  const activeClass = classes.find(c => String(c.id) === String(selectedClassId));
  const activeAssignments = assignments.filter(a => String(a.class_id) === String(selectedClassId));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Manage Classes (CRUD) */}
      <div className="space-y-4 lg:col-span-1 border-r border-light-border pr-0 lg:pr-6">
        <div className="bg-light-lbg/50 border border-light-border p-4 rounded-xl">
          <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wide mb-2">Create Class</h4>
          <form onSubmit={handleCreateClass} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Class 1A, Grade 8"
              value={classNameInput}
              onChange={(e) => setClassNameInput(e.target.value)}
              className="flex-1 bg-white border border-light-border rounded-lg px-3 py-1.5 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
            />
            <button
              type="submit"
              className="bg-brand-primary hover:bg-brand-dark text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              Add
            </button>
          </form>
        </div>

        {/* Classes List */}
        <div className="bg-white border border-light-border rounded-xl overflow-hidden">
          <div className="bg-light-lbg px-4 py-2 border-b border-light-border text-xs font-bold text-dark-primary uppercase tracking-wide">
            School Classes ({classes.length})
          </div>
          <div className="divide-y divide-light-border max-h-[300px] overflow-y-auto">
            {classes.length === 0 ? (
              <div className="p-4 text-center text-xs text-dark-muted">No classes configured.</div>
            ) : (
              classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`flex items-center justify-between px-4 py-2 text-xs font-semibold cursor-pointer transition-all ${
                    String(selectedClassId) === String(cls.id)
                      ? "bg-brand-lbg/50 border-l-4 border-brand-primary font-bold text-brand-primary"
                      : "text-dark-primary hover:bg-light-bg/40"
                  }`}
                >
                  {editingClassId === cls.id ? (
                    <input
                      type="text"
                      value={editClassName}
                      onChange={(e) => setEditClassName(e.target.value)}
                      className="bg-white border border-light-border rounded px-2 py-1 outline-none text-xs font-bold text-dark-primary w-24"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span>{cls.name}</span>
                  )}

                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {editingClassId === cls.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(cls.id)}
                          className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          onClick={() => setEditingClassId(null)}
                          className="text-dark-soft hover:bg-light-ui p-1 rounded"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(cls)}
                          className="text-blue-medium hover:bg-blue-lbg/50 p-1 rounded"
                          title="Rename"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteClass(cls.id, cls.name)}
                          className="text-red-primary hover:bg-red-lbg/50 p-1 rounded"
                          title="Delete Class"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Class Teachers and Subjects Mapping */}
      <div className="lg:col-span-2 space-y-6">
        {activeClass ? (
          <>
            <div>
              <h3 className="text-lg font-bold text-dark-deepblue mb-1">
                Configure Mappings for: <span className="text-brand-primary">{activeClass.name}</span>
              </h3>
              <p className="text-xs text-dark-soft">
                Assign teachers to specific subjects for this class. (Only qualified teachers can teach each subject).
              </p>
            </div>

            {/* Add Assignment form */}
            <div className="bg-light-lbg/50 border border-light-border p-4 rounded-xl">
              <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wide mb-2.5">Assign Teacher to Subject</h4>
              <form onSubmit={handleAddAssignment} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                {/* Subject selection */}
                <div>
                  <label className="block text-[10px] font-bold text-dark-soft uppercase tracking-wide mb-1">Select Subject</label>
                  <select
                    value={newSubId}
                    onChange={(e) => {
                      setNewSubId(e.target.value);
                      setNewTeacherId(""); // reset teacher
                    }}
                    className="w-full bg-white border border-light-border rounded-lg px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {renderSubjectOptionsGroupedByClassification(subjects, classifications, undefined, newSubId)}
                  </select>
                </div>

                {/* Teacher selection */}
                <div>
                  <label className="block text-[10px] font-bold text-dark-soft uppercase tracking-wide mb-1">Select Qualified Teacher</label>
                  <select
                    value={newTeacherId}
                    onChange={(e) => setNewTeacherId(e.target.value)}
                    className="w-full bg-white border border-light-border rounded-lg px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                    disabled={!newSubId}
                    required
                  >
                    <option value="">-- Choose Teacher --</option>
                    {getQualifiedTeachers(newSubId).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!newSubId || !newTeacherId}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all h-[38px] flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-link"></i> Map Teacher
                </button>
              </form>
            </div>

            {/* Mapped Assignments List */}
            <div className="border border-light-border rounded-xl overflow-hidden bg-white">
              <div className="bg-light-lbg px-4 py-2.5 border-b border-light-border text-xs font-bold text-dark-primary uppercase tracking-wide">
                Active Teacher-Subject Assignments for {activeClass.name}
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-light-border bg-light-bg/20">
                    <th className="py-2.5 px-4 font-bold text-dark-soft uppercase">Subject</th>
                    <th className="py-2.5 px-4 font-bold text-dark-soft uppercase">Teacher</th>
                    <th className="py-2.5 px-4 font-bold text-dark-soft uppercase text-right w-[80px]">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border">
                  {activeAssignments.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-6 text-center text-dark-muted font-medium italic">
                        No subject assignments mapped for this class. Add one above!
                      </td>
                    </tr>
                  ) : (
                    activeAssignments.map((ass) => {
                      const subName = subjects.find(s => String(s.id) === String(ass.subject_id))?.name || "Unknown Subject";
                      const tName = teachers.find(t => String(t.id) === String(ass.teacher_id))?.name || "Unknown Teacher";
                      return (
                        <tr key={ass.id} className="hover:bg-light-bg/10">
                          <td className="py-2.5 px-4 font-bold text-dark-primary">{subName}</td>
                          <td className="py-2.5 px-4 font-semibold text-dark-soft">{tName}</td>
                          <td className="py-2 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveAssignment(ass.id, subName, tName)}
                              className="text-red-primary hover:text-red-dark hover:bg-red-lbg/50 p-1.5 rounded transition-all"
                            >
                              <i className="fas fa-unlink"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-light-bg/10 border border-dashed border-light-border rounded-xl">
            <p className="text-dark-muted font-bold">Please select or add a class first.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </div>
  );
};


// ==========================================
// 4. PERIODS CONFIGURATION
// ==========================================
export const PeriodsSetup = ({
  periods,
  onSavePeriods,
  slots,
  seasonsConfig,
  onSaveSeasonsConfig,
  onCopySeason
}) => {
  const [periodCount, setPeriodCount] = useState(periods.length || 11);
  const [periodList, setPeriodList] = useState(periods);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Seasons states
  const [localSeasonsConfig, setLocalSeasonsConfig] = useState(seasonsConfig);
  const [copySource, setCopySource] = useState('summer');
  const [copyTarget, setCopyTarget] = useState('winter');
  const [copyType, setCopyType] = useState('all');

  React.useEffect(() => {
    setPeriodCount(periods.length);
    setPeriodList(periods);
  }, [periods]);

  React.useEffect(() => {
    setLocalSeasonsConfig(seasonsConfig);
  }, [seasonsConfig]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setConfirmConfig(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!localSeasonsConfig) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-dark-soft font-bold">Loading season configurations...</span>
      </div>
    );
  }

  const activeSeasonId = localSeasonsConfig.active_season_id || 'summer';
  const activeSeason = localSeasonsConfig.seasons[activeSeasonId];
  const weekdayConfig = activeSeason?.weekday_config || {
    Monday: 'Weekday',
    Tuesday: 'Weekday',
    Wednesday: 'Weekday',
    Thursday: 'Weekday',
    Friday: 'Weekday',
    Saturday: 'Working Weekend',
    Sunday: 'Holiday Weekend'
  };

  const handleCountChange = (newCount) => {
    const count = Math.max(1, Math.min(24, parseInt(newCount) || 1));
    setPeriodCount(count);

    // Adjust list size
    let newList = [...periodList];
    if (count > newList.length) {
      // Add default periods
      for (let i = newList.length + 1; i <= count; i++) {
        newList.push({
          id: generateLocalId(),
          period_number: i,
          name: `Period ${i}`,
          start_time: "08:00",
          end_time: "08:45",
          is_break: false,
          icon: null,
          applicable_on_weekends: false
        });
      }
    } else if (count < newList.length) {
      newList = newList.slice(0, count);
    }
    setPeriodList(newList);
  };

  const handleFieldChange = (index, field, value) => {
    const newList = [...periodList];
    newList[index] = {
      ...newList[index],
      [field]: value
    };
    setPeriodList(newList);
  };

  const handleSavePeriodsConfig = () => {
    // Check if slots would be truncated and lost
    const remainingPeriodIds = periodList.map(p => p.id);
    const truncatedSlots = slots.filter(s => !remainingPeriodIds.includes(s.period_id));
    
    let warning = `Save period configuration changes for the active season (${activeSeason.name})?`;
    if (truncatedSlots.length > 0) {
      warning += `\n\nWARNING: You are reducing the number of periods! Doing so will PERMANENTLY DELETE ${truncatedSlots.length} scheduled slots from the timetable!`;
    }

    setConfirmConfig({
      title: "Save Periods",
      message: warning,
      confirmText: "Save",
      type: truncatedSlots.length > 0 ? "danger" : "warning",
      onConfirm: () => {
        setConfirmConfig(null);
        onSavePeriods(periodList);
      }
    });
  };

  const handleRenameSeason = (seasonId, newName) => {
    const updated = {
      ...localSeasonsConfig,
      seasons: {
        ...localSeasonsConfig.seasons,
        [seasonId]: {
          ...localSeasonsConfig.seasons[seasonId],
          name: newName
        }
      }
    };
    setLocalSeasonsConfig(updated);
  };

  const handleSaveSeasonSettings = () => {
    setConfirmConfig({
      title: "Save Season Settings",
      message: "Are you sure you want to save the season names and weekday configuration?",
      confirmText: "Save Settings",
      type: "primary",
      onConfirm: () => {
        setConfirmConfig(null);
        onSaveSeasonsConfig(localSeasonsConfig);
      }
    });
  };

  const handleSwitchSeason = (seasonId) => {
    const targetSeasonName = localSeasonsConfig.seasons[seasonId]?.name || seasonId;
    setConfirmConfig({
      title: "Switch Active Season",
      message: `Are you sure you want to switch the active season to "${targetSeasonName}"? The timetable grid will load this season's configuration and scheduled slots.`,
      confirmText: "Switch Season",
      type: "warning",
      onConfirm: () => {
        setConfirmConfig(null);
        onSaveSeasonsConfig(localSeasonsConfig, seasonId);
      }
    });
  };

  const handleWeekdayChange = (day, type) => {
    const updated = {
      ...localSeasonsConfig,
      seasons: {
        ...localSeasonsConfig.seasons,
        [activeSeasonId]: {
          ...localSeasonsConfig.seasons[activeSeasonId],
          weekday_config: {
            ...weekdayConfig,
            [day]: type
          }
        }
      }
    };
    setLocalSeasonsConfig(updated);
  };

  const handleTriggerCopy = () => {
    if (copySource === copyTarget) {
      alert("Source and target seasons must be different.");
      return;
    }
    const srcName = localSeasonsConfig.seasons[copySource]?.name || copySource;
    const tgtName = localSeasonsConfig.seasons[copyTarget]?.name || copyTarget;

    setConfirmConfig({
      title: "Copy Season Configuration",
      message: `WARNING: This will overwrite settings in "${tgtName}" with data from "${srcName}". Are you sure you want to copy?`,
      confirmText: "Perform Copy",
      type: "danger",
      onConfirm: () => {
        setConfirmConfig(null);
        onCopySeason(copySource, copyTarget, copyType);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Seasons Switcher & Names */}
      <div className="bg-white border border-light-border rounded-2xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-dark-deepblue uppercase tracking-wide mb-1">Season Setup</h4>
          <p className="text-xs text-dark-soft">Manage 4 different seasonal configurations. Rename seasons or swap active timetables.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(localSeasonsConfig.seasons).map((season) => {
            const isActive = season.id === activeSeasonId;
            return (
              <div
                key={season.id}
                className={`bg-white border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${
                  isActive
                    ? 'border-brand-primary ring-2 ring-brand-soft/50 shadow-sm'
                    : 'border-light-border hover:border-dark-soft/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    isActive ? 'bg-brand-lbg text-brand-primary' : 'bg-light-bg text-dark-soft'
                  }`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[10px] text-dark-soft font-bold">
                    {(season.periods || []).length} Periods
                  </span>
                </div>
                <div>
                  <label className="block text-[8px] font-extrabold text-dark-soft uppercase mb-1">Season Label</label>
                  <input
                    type="text"
                    value={season.name}
                    onChange={(e) => handleRenameSeason(season.id, e.target.value)}
                    className="w-full bg-light-bg/40 border border-light-border rounded-xl px-3 py-1.5 text-xs font-bold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft"
                  />
                </div>
                <button
                  onClick={() => handleSwitchSeason(season.id)}
                  disabled={isActive}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-lbg text-brand-primary cursor-default'
                      : 'bg-brand-primary text-white hover:bg-brand-dark'
                  }`}
                >
                  {isActive ? 'Currently Active' : 'Switch to Season'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveSeasonSettings}
            className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            Save Season Names
          </button>
        </div>
      </div>

      {/* 2. Weekday & Day Configuration */}
      <div className="bg-white border border-light-border rounded-2xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-dark-deepblue uppercase tracking-wide mb-1">
            Weekday & Weekend configuration ({activeSeason.name})
          </h4>
          <p className="text-xs text-dark-soft">
            Define working days and holidays. On "Working Weekend" days, only weekend-applicable periods will run.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
            const value = weekdayConfig[day] || 'Weekday';
            return (
              <div
                key={day}
                className={`border p-3.5 rounded-2xl flex flex-col justify-between gap-3 transition-all ${
                  value === 'Weekday'
                    ? 'bg-blue-50/10 border-blue-100/60'
                    : value === 'Working Weekend'
                    ? 'bg-orange-50/10 border-orange-100/60'
                    : 'bg-gray-50/50 border-gray-200'
                }`}
              >
                <div>
                  <span className="block text-xs font-extrabold text-dark-primary">{day}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                    value === 'Weekday'
                      ? 'text-brand-primary'
                      : value === 'Working Weekend'
                      ? 'text-orange-500'
                      : 'text-dark-soft'
                  }`}>
                    {value}
                  </span>
                </div>
                <select
                  value={value}
                  onChange={(e) => handleWeekdayChange(day, e.target.value)}
                  className="w-full bg-white border border-light-border rounded-lg px-2 py-1 text-[10px] font-bold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft cursor-pointer"
                >
                  <option value="Weekday">Weekday</option>
                  <option value="Working Weekend">Working Weekend</option>
                  <option value="Holiday Weekend">Holiday Weekend</option>
                </select>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveSeasonSettings}
            className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            Save Day Configurations
          </button>
        </div>
      </div>

      {/* 3. Daily Period Labels & Details */}
      <div className="bg-white border border-light-border rounded-2xl p-5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-dark-deepblue uppercase tracking-wide mb-1">
              Period Labels and Details ({activeSeason.name})
            </h4>
            <p className="text-xs text-dark-soft">Configure names, break toggles, weekend availability, and FontAwesome icons for each period.</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div>
              <label className="block text-[8px] font-bold text-dark-soft uppercase mb-0.5">Periods Count</label>
              <input
                type="number"
                min="1"
                max="24"
                value={periodCount}
                onChange={(e) => handleCountChange(e.target.value)}
                className="w-20 bg-white border border-light-border rounded-xl px-4 py-2 text-center text-sm font-bold text-dark-primary focus:ring-2 focus:ring-brand-soft outline-none"
              />
            </div>
            <button
              onClick={handleSavePeriodsConfig}
              className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all mt-3.5"
            >
              Save Periods
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periodList.map((period, idx) => (
            <div
              key={period.id || period.period_number}
              className={`bg-light-bg/40 border border-light-border p-4 rounded-2xl flex flex-col gap-3 transition-all ${
                period.is_break ? 'border-orange-200 bg-orange-50/5' : 'hover:border-brand-soft'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="bg-brand-lbg text-brand-primary w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm shrink-0">
                  P{period.period_number}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={period.name || ""}
                    placeholder={`Period ${period.period_number}`}
                    onChange={(e) => handleFieldChange(idx, "name", e.target.value)}
                    className="w-full bg-white border border-light-border rounded-xl px-3 py-1 text-xs font-bold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] font-bold text-dark-soft uppercase mb-0.5">Start Time</label>
                  <input
                    type="text"
                    value={period.start_time || ""}
                    placeholder="e.g. 08:30"
                    onChange={(e) => handleFieldChange(idx, "start_time", e.target.value)}
                    className="w-full bg-white border border-light-border rounded-lg px-2 py-1 text-xs font-semibold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft text-center"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-dark-soft uppercase mb-0.5">End Time</label>
                  <input
                    type="text"
                    value={period.end_time || ""}
                    placeholder="e.g. 09:15"
                    onChange={(e) => handleFieldChange(idx, "end_time", e.target.value)}
                    className="w-full bg-white border border-light-border rounded-lg px-2 py-1 text-xs font-semibold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft text-center"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-light-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-dark-primary flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={period.is_break || false}
                      onChange={(e) => handleFieldChange(idx, "is_break", e.target.checked)}
                      className="rounded border-light-border text-brand-primary focus:ring-brand-soft"
                    />
                    Is Break
                  </label>
                  <label className="text-[10px] font-bold text-dark-primary flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={period.applicable_on_weekends || false}
                      onChange={(e) => handleFieldChange(idx, "applicable_on_weekends", e.target.checked)}
                      className="rounded border-light-border text-brand-primary focus:ring-brand-soft"
                    />
                    Weekend Applicable
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[8px] font-bold text-dark-soft uppercase">Icon</label>
                    {period.icon && <i className={`fas ${period.icon} text-brand-primary text-xs`}></i>}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      placeholder="e.g. fa-coffee"
                      value={period.icon || ""}
                      onChange={(e) => handleFieldChange(idx, "icon", e.target.value)}
                      className="flex-1 bg-white border border-light-border rounded-lg px-2 py-1 text-[10px] font-semibold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft"
                    />
                    <div className="flex gap-1">
                      {[
                        { icon: 'fa-coffee', text: '☕' },
                        { icon: 'fa-mosque', text: '🕌' },
                        { icon: 'fa-utensils', text: '🍽️' },
                        { icon: 'fa-book', text: '📖' },
                        { icon: 'fa-volleyball-ball', text: '⚽' }
                      ].map((item) => (
                        <button
                          key={item.icon}
                          onClick={() => handleFieldChange(idx, "icon", item.icon)}
                          title={item.icon}
                          className={`px-1.5 py-0.5 rounded border text-xs hover:bg-light-ui transition-all ${
                            period.icon === item.icon ? 'border-brand-primary bg-brand-lbg' : 'border-light-border bg-white'
                          }`}
                        >
                          {item.text}
                        </button>
                      ))}
                      {period.icon && (
                        <button
                          onClick={() => handleFieldChange(idx, "icon", null)}
                          title="Clear icon"
                          className="px-1.5 py-0.5 rounded border border-light-border bg-white text-red-500 hover:bg-red-50 text-[10px] font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Copy Season Panel */}
      <div className="bg-white border border-light-border rounded-2xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-dark-deepblue uppercase tracking-wide mb-1">Copy / Map Season Configurations</h4>
          <p className="text-xs text-dark-soft">Replicate period setups, daily schedules, or complete structures from one season to another to save configuration time.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">Source Season</label>
            <select
              value={copySource}
              onChange={(e) => setCopySource(e.target.value)}
              className="w-full bg-white border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft cursor-pointer"
            >
              {Object.values(localSeasonsConfig.seasons).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">Target Season</label>
            <select
              value={copyTarget}
              onChange={(e) => setCopyTarget(e.target.value)}
              className="w-full bg-white border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft cursor-pointer"
            >
              {Object.values(localSeasonsConfig.seasons).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">Configuration to Copy</label>
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value)}
              className="w-full bg-white border border-light-border rounded-xl px-3 py-2 text-xs font-bold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft cursor-pointer"
            >
              <option value="all">All (Periods Config & Schedule Slots)</option>
              <option value="periods_only">Periods & Day Configurations Only</option>
              <option value="slots_only">Scheduled Slots Only</option>
            </select>
          </div>
          <button
            onClick={handleTriggerCopy}
            disabled={copySource === copyTarget}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-center ${
              copySource === copyTarget
                ? 'bg-light-ui text-dark-soft cursor-not-allowed border border-light-border'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
            }`}
          >
            <i className="fas fa-copy mr-1.5"></i> Copy Season Data
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </div>
  );
};
