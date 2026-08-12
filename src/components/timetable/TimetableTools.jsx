// src/components/portals/admin/timetable/TimetableTools.jsx
import React, { useState } from 'react';

export const TimetableTools = ({
  teachers = [],
  classes = [],
  subjects = [],
  slots = [],
  assignments = [],
  onSwapTeachers,
  onReassignTeacher,
}) => {
  const [activeTool, setActiveTool] = useState('swap'); // 'swap' | 'reassign'

  // Consolidated form states
  const [teacherA, setTeacherA] = useState('');
  const [teacherB, setTeacherB] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [qualificationMode, setQualificationMode] = useState('qualified_only');
  const [showConfirm, setShowConfirm] = useState(false);

  // General sorted teachers/classes
  const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name));

  const handleToggleClass = (classId) => {
    if (selectedClasses.includes(classId)) {
      setSelectedClasses(selectedClasses.filter((id) => id !== classId));
    } else {
      setSelectedClasses([...selectedClasses, classId]);
    }
  };

  const handleSelectAllClasses = () => {
    setSelectedClasses(classes.map((c) => c.id));
  };

  const handleClearAllClasses = () => {
    setSelectedClasses([]);
  };

  const handleExecute = () => {
    if (!teacherA || !teacherB || selectedClasses.length === 0) return;

    if (activeTool === 'swap') {
      onSwapTeachers({
        teacherAId: teacherA,
        teacherBId: teacherB,
        classIds: selectedClasses,
        mapMode: qualificationMode,
      });
    } else {
      onReassignTeacher({
        existingTeacherId: teacherA,
        newTeacherId: teacherB,
        classIds: selectedClasses,
        mapMode: qualificationMode,
      });
    }
    setShowConfirm(false);
  };

  const teacherAName = teachers.find((t) => String(t.id) === String(teacherA))?.name || '';
  const teacherBName = teachers.find((t) => String(t.id) === String(teacherB))?.name || '';

  return (
    <div className="space-y-6 p-1">
      {/* Introduction Card */}
      <div className="bg-white border border-light-border/60 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          {/* Dynamic Header */}
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold shadow-sm ${
                activeTool === 'swap' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'
              }`}
            >
              <i className={`fas ${activeTool === 'swap' ? 'fa-sync-alt' : 'fa-user-slash'}`}></i>
            </div>
            <div>
              <h2 className="text-md font-black text-dark-primary">
                {activeTool === 'swap' ? 'Swap Teachers Mode' : 'Release & Reassign Mode'}
              </h2>
              <p className="text-[10px] text-dark-muted font-bold">
                {activeTool === 'swap'
                  ? 'Swaps scheduled slots between two teachers for chosen classes'
                  : 'Migrates scheduled slots from an existing teacher to a new teacher'}
              </p>
            </div>
          </div>
          {/* Tool Selector Toggle */}
          <div className="flex border border-light-border bg-white p-1 rounded-2xl w-full max-w-md mx-auto shadow-sm">
            <button
              onClick={() => {
                setActiveTool('swap');
                setTeacherA('');
                setTeacherB('');
                setSelectedClasses([]);
                setQualificationMode('qualified_only');
                setShowConfirm(false);
              }}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTool === 'swap'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-dark-soft hover:bg-light-lbg'
              }`}
            >
              <i className="fas fa-sync-alt"></i>
              Swap Teachers
            </button>
            <button
              onClick={() => {
                setActiveTool('reassign');
                setTeacherA('');
                setTeacherB('');
                setSelectedClasses([]);
                setQualificationMode('qualified_only');
                setShowConfirm(false);
              }}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTool === 'reassign'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-dark-soft hover:bg-light-lbg'
              }`}
            >
              <i className="fas fa-user-slash"></i>
              Release & Reassign
            </button>
          </div>
        </div>
      </div>

      {/* Main Consolidated Control Card */}
      <div className="max-w-full mx-auto bg-white border border-light-border rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between relative hover:border-brand-soft/50 transition-colors animate-in slide-in-from-bottom-4 duration-300">
        <div>
          {/* Form Controls */}
          <div className="space-y-5">
            {/* Teacher Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-dark-soft uppercase tracking-wide block mb-1">
                  {activeTool === 'swap' ? 'Teacher A' : 'Existing Teacher (To Release)'}
                </label>
                <select
                  value={teacherA}
                  onChange={(e) => {
                    setTeacherA(e.target.value);
                    if (e.target.value === teacherB) setTeacherB('');
                  }}
                  className="w-full bg-light-lbg/35 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                >
                  <option value="">Select Teacher</option>
                  {sortedTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-dark-soft uppercase tracking-wide block mb-1">
                  {activeTool === 'swap' ? 'Teacher B' : 'New Teacher (To Assign)'}
                </label>
                <select
                  value={teacherB}
                  onChange={(e) => setTeacherB(e.target.value)}
                  className="w-full bg-light-lbg/35 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                >
                  <option value="">Select Teacher</option>
                  {sortedTeachers
                    .filter((t) => String(t.id) !== String(teacherA))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Class Selection */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-bold text-dark-soft uppercase tracking-wide block">
                  Select Classes
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAllClasses}
                    className="text-[10px] text-brand-primary font-bold hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-[10px] text-light-border">|</span>
                  <button
                    onClick={handleClearAllClasses}
                    className="text-[10px] text-red-500 font-bold hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="border border-light-border rounded-2xl p-4 bg-light-lbg/10 max-h-[140px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sortedClasses.map((cls) => (
                  <label
                    key={cls.id}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-light-lbg cursor-pointer text-xs font-semibold text-dark-soft select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(cls.id)}
                      onChange={() => handleToggleClass(cls.id)}
                      className="w-4 h-4 text-brand-primary border-light-border rounded focus:ring-brand-soft"
                    />
                    <span className="truncate">{cls.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Subject Qualification Mapping Options */}
            <div className="bg-light-lbg/30 border border-light-border rounded-2xl p-4 space-y-2">
              <label className="text-[10px] font-bold text-dark-soft uppercase tracking-wide block">
                Subject Qualification Mapping
              </label>
              <div className="space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="qualificationMode"
                    value="qualified_only"
                    checked={qualificationMode === 'qualified_only'}
                    onChange={() => setQualificationMode('qualified_only')}
                    className="mt-0.5 text-brand-primary border-light-border focus:ring-brand-soft"
                  />
                  <div className="text-[11px] font-semibold text-dark-soft leading-tight">
                    Map only qualified subjects
                    <span className="block text-[9px] text-dark-muted mt-0.5 font-medium">
                      {activeTool === 'swap'
                        ? 'Only swap slots where the respective teacher is qualified for the subject. Other slots remain unchanged.'
                        : 'Only assign slots where the new teacher is qualified for the subject. Other slots remain unchanged.'}
                    </span>
                  </div>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="qualificationMode"
                    value="auto_qualify"
                    checked={qualificationMode === 'auto_qualify'}
                    onChange={() => setQualificationMode('auto_qualify')}
                    className="mt-0.5 text-brand-primary border-light-border focus:ring-brand-soft"
                  />
                  <div className="text-[11px] font-semibold text-dark-soft leading-tight">
                    Make everything qualified
                    <span className="block text-[9px] text-dark-muted mt-0.5 font-medium">
                      Automatically add missing subjects to target teachers qualifications and
                      execute changes for all matching periods.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!teacherA || !teacherB || selectedClasses.length === 0}
            className={`w-full text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-md transition-all ${
              teacherA && teacherB && selectedClasses.length > 0
                ? 'bg-brand-primary hover:bg-brand-dark cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed opacity-60'
            }`}
          >
            {activeTool === 'swap' ? 'Execute Swap' : 'Execute Reassignment'}
          </button>
        </div>

        {/* Confirmation Modal Overlay */}
        {showConfirm && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 flex flex-col justify-center items-center text-center z-10 animate-in zoom-in-95 duration-200">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg mb-3 ${
                activeTool === 'swap' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
              }`}
            >
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h4 className="text-sm font-black text-dark-primary">
              {activeTool === 'swap' ? 'Confirm Teacher Swap' : 'Confirm Teacher Reassignment'}
            </h4>
            <p className="text-[11px] text-dark-muted font-bold max-w-sm mt-1.5 mb-6 leading-relaxed">
              {activeTool === 'swap' ? (
                <>
                  Are you sure you want to swap timetables between{' '}
                  <strong className="text-brand-primary">{teacherAName}</strong> and{' '}
                  <strong className="text-brand-primary">{teacherBName}</strong> across{' '}
                  <strong className="text-dark-primary">{selectedClasses.length} class(es)</strong>?
                </>
              ) : (
                <>
                  Are you sure you want to release{' '}
                  <strong className="text-red-primary">{teacherAName}</strong> and reassign all
                  their slots to <strong className="text-brand-primary">{teacherBName}</strong>{' '}
                  across{' '}
                  <strong className="text-dark-primary">{selectedClasses.length} class(es)</strong>?
                </>
              )}
              <span className="block mt-1 text-[10px] text-dark-muted font-semibold">
                This action will edit timetable slots and class assignments.
              </span>
            </p>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-light-lbg hover:bg-light-border text-dark-soft border border-light-border font-bold py-2 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                className="flex-1 bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 rounded-xl text-xs shadow-md transition-colors"
              >
                {activeTool === 'swap' ? 'Yes, Swap' : 'Yes, Reassign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
