// src/components/portals/admin/timetable/TimetableSetupTabs.jsx
import React, { useState } from "react";

// Helper to generate UUIDs locally when offline
const generateLocalId = () => {
  return "local-" + Math.random().toString(36).substr(2, 9);
};

// ==========================================
// 1. SUBJECTS SETUP
// ==========================================
export const SubjectsSetup = ({ subjects, onAddSubject, onUpdateSubject, onDeleteSubject, slots, assignments }) => {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddSubject(name.trim());
    setName("");
  };

  const handleStartEdit = (sub) => {
    setEditingId(sub.id);
    setEditName(sub.name);
  };

  const handleSaveEdit = (id) => {
    if (!editName.trim()) return;
    onUpdateSubject(id, editName.trim());
    setEditingId(null);
  };

  const handleDelete = (subId, name) => {
    // Check usage using String comparisons for robustness
    const isUsedInSlots = slots.some((s) => String(s.subject_id) === String(subId));
    const isUsedInAssignments = assignments.some((a) => String(a.subject_id) === String(subId));

    let warning = `Are you sure you want to delete the subject "${name}"?`;
    if (isUsedInSlots || isUsedInAssignments) {
      warning += `\n\nWARNING: This subject is currently assigned to classes or scheduled in the timetable. Deleting it will clear those assignments/slots!`;
    }

    if (window.confirm(warning)) {
      onDeleteSubject(subId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-light-lbg/50 border border-light-border p-5 rounded-2xl">
        <h4 className="text-sm font-bold text-dark-deepblue uppercase tracking-wide mb-3">Add New Subject</h4>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. Mathematics, Islamic Studies, English"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
          />
          <button
            type="submit"
            className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all"
          >
            <i className="fas fa-plus"></i> Add Subject
          </button>
        </form>
      </div>

      <div className="border border-light-border rounded-2xl overflow-hidden bg-white">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-light-lbg border-b border-light-border">
              <th className="py-3.5 px-4 font-bold text-xs text-dark-primary tracking-wider uppercase">Subject Name</th>
              <th className="py-3.5 px-4 font-bold text-xs text-dark-primary tracking-wider uppercase text-right w-[150px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light-border">
            {subjects.length === 0 ? (
              <tr>
                <td colSpan="2" className="py-8 text-center text-dark-muted text-sm">
                  No subjects configured. Add one above!
                </td>
              </tr>
            ) : (
              subjects.map((sub) => (
                <tr key={sub.id} className="hover:bg-light-bg/20 transition-colors">
                  <td className="py-3 px-4 font-bold text-sm text-dark-deepblue">
                    {editingId === sub.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-white border border-light-border rounded-lg px-3 py-1.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft w-full max-w-xs"
                      />
                    ) : (
                      sub.name
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {editingId === sub.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSaveEdit(sub.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg text-xs font-bold transition-all"
                          title="Save"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-light-ui hover:bg-light-border text-dark-soft p-2 rounded-lg text-xs font-bold transition-all"
                          title="Cancel"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleStartEdit(sub)}
                          className="text-blue-medium hover:text-blue-dark p-2 rounded-lg hover:bg-blue-lbg transition-all"
                          title="Rename"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id, sub.name)}
                          className="text-red-primary hover:text-red-dark p-2 rounded-lg hover:bg-red-lbg transition-all"
                          title="Delete"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// ==========================================
// 2. TEACHERS SETUP
// ==========================================
export const TeachersSetup = ({ teachers, subjects, onAddTeacher, onUpdateTeacher, onDeleteTeacher, slots, assignments }) => {
  const [name, setName] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [isMale, setIsMale] = useState(true);
  
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSelectedSubjects, setEditSelectedSubjects] = useState([]);
  const [editIsMale, setEditIsMale] = useState(true);

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

    if (window.confirm(warning)) {
      onDeleteTeacher(teacherId);
    }
  };

  const getSubjectNamesStr = (subjectIds = []) => {
    if (subjectIds.length === 0) return <span className="text-red-primary font-semibold italic text-xs">No qualifications set</span>;
    return subjectIds
      .map(id => subjects.find(s => String(s.id) === String(id))?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      {!editingTeacher && (
        <div className="bg-light-lbg/50 border border-light-border p-5 rounded-2xl">
          <h4 className="text-sm font-bold text-dark-deepblue uppercase tracking-wide mb-3">Add New Teacher</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <input
                type="text"
                placeholder="Teacher's Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
              />
              <select
                value={isMale ? "male" : "female"}
                onChange={(e) => setIsMale(e.target.value === "male")}
                className="bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft min-w-[120px]"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <button
                type="submit"
                className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all md:w-auto w-full justify-center"
              >
                <i className="fas fa-plus"></i> Add Teacher
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-dark-soft mb-2">Select Subjects Qualified to Teach:</p>
              {subjects.length === 0 ? (
                <p className="text-xs text-dark-muted italic">Please add subjects first.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {subjects.map(sub => (
                    <label key={sub.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-light-border hover:bg-light-bg/20 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.some(sid => String(sid) === String(sub.id))}
                        onChange={() => handleSubjectToggle(sub.id)}
                        className="rounded text-brand-primary focus:ring-brand-soft w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-dark-primary truncate">{sub.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Edit Overlay / Panel */}
      {editingTeacher && (
        <div className="bg-blue-50/50 border border-blue-200 p-5 rounded-2xl animate-in fade-in duration-300">
          <h4 className="text-sm font-bold text-blue-dark uppercase tracking-wide mb-3">Edit Teacher: {editingTeacher.name}</h4>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
              />
              <select
                value={editIsMale ? "male" : "female"}
                onChange={(e) => setEditIsMale(e.target.value === "male")}
                className="bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft min-w-[120px]"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingTeacher(null)}
                  className="bg-light-ui hover:bg-light-border text-dark-soft px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-dark-soft mb-2">Update Qualified Subjects:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {subjects.map(sub => (
                  <label key={sub.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-light-border hover:bg-light-bg/20 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editSelectedSubjects.some(sid => String(sid) === String(sub.id))}
                      onChange={() => handleSubjectToggle(sub.id, true)}
                      className="rounded text-brand-primary focus:ring-brand-soft w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-dark-primary truncate">{sub.name}</span>
                  </label>
                ))}
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
              teachers.map((teacher) => (
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

    if (window.confirm(warning)) {
      onDeleteClass(clsId);
      if (String(selectedClassId) === String(clsId)) {
        setSelectedClassId(classes.find((c) => String(c.id) !== String(clsId))?.id || "");
      }
    }
  };

  // Filter teachers based on chosen subject
  const getQualifiedTeachers = (subjectId) => {
    if (!subjectId) return [];
    return teachers.filter(t => t.subjects && t.subjects.some(sid => String(sid) === String(subjectId)));
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

    if (window.confirm(warning)) {
      onRemoveAssignment(assId);
    }
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
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
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
    </div>
  );
};


// ==========================================
// 4. PERIODS CONFIGURATION
// ==========================================
export const PeriodsSetup = ({ periods, onSavePeriods, slots }) => {
  const [periodCount, setPeriodCount] = useState(periods.length || 11);
  const [periodList, setPeriodList] = useState(periods);

  React.useEffect(() => {
    setPeriodCount(periods.length);
    setPeriodList(periods);
  }, [periods]);

  const handleCountChange = (newCount) => {
    const count = Math.max(1, Math.min(15, parseInt(newCount) || 1));
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
          is_break: false
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

  const handleSave = () => {
    // Check if slots would be truncated and lost
    const remainingPeriodIds = periodList.map(p => p.id);
    const truncatedSlots = slots.filter(s => !remainingPeriodIds.includes(s.period_id));
    
    let warning = "Save period configuration changes?";
    if (truncatedSlots.length > 0) {
      warning += `\n\nWARNING: You are reducing the number of periods! Doing so will PERMANENTLY DELETE ${truncatedSlots.length} scheduled slots from the timetable!`;
    }

    if (window.confirm(warning)) {
      onSavePeriods(periodList);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-light-lbg/50 border border-light-border p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-dark-deepblue uppercase tracking-wide mb-1">Set Daily Periods Count</h4>
          <p className="text-xs text-dark-soft">Configure the number of periods (academic slots) in a school day.</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            max="15"
            value={periodCount}
            onChange={(e) => handleCountChange(e.target.value)}
            className="w-20 bg-white border border-light-border rounded-xl px-4 py-2 text-center text-sm font-bold text-dark-primary focus:ring-2 focus:ring-brand-soft outline-none"
          />
          <button
            onClick={handleSave}
            className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Adjust Individual period times */}
      <div className="bg-white border border-light-border rounded-2xl p-5">
        <h4 className="text-sm font-bold text-dark-deepblue uppercase tracking-wide mb-4">Period Labels and Times</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periodList.map((period, idx) => (
            <div key={period.id || period.period_number} className="bg-light-bg/40 border border-light-border p-3.5 rounded-xl flex items-center justify-between gap-3">
              <div className="bg-brand-lbg text-brand-primary w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm">
                P{period.period_number}
              </div>
              
              <div className="flex-1 flex gap-2">
                <div>
                  <label className="block text-[8px] font-bold text-dark-soft uppercase mb-0.5">Start Time</label>
                  <input
                    type="text"
                    value={period.start_time || ""}
                    placeholder="e.g. 08:30"
                    onChange={(e) => handleFieldChange(idx, "start_time", e.target.value)}
                    className="w-full bg-white border border-light-border rounded px-2 py-1 text-xs font-semibold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft text-center"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-dark-soft uppercase mb-0.5">End Time</label>
                  <input
                    type="text"
                    value={period.end_time || ""}
                    placeholder="e.g. 09:15"
                    onChange={(e) => handleFieldChange(idx, "end_time", e.target.value)}
                    className="w-full bg-white border border-light-border rounded px-2 py-1 text-xs font-semibold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft text-center"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
