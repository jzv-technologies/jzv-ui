import React from 'react';

/**
 * GradeRuleModal
 * Modal for adding / editing a grading-scale tier.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const GradeRuleModal = ({
  editingGradeIdx,
  gradeForm,
  handleSaveGradeForm,
  setGradeForm,
  setShowGradeModal,
}) => {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <form
        onSubmit={handleSaveGradeForm}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-200 border border-slate-200"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
            <i className="fas fa-graduation-cap text-rose-600" />
            <span>{editingGradeIdx !== null ? 'Edit Grade Rule' : 'New Grade Rule'}</span>
          </h3>
          <button
            type="button"
            onClick={() => setShowGradeModal(false)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-dark-slate mb-1">
              Grade Code / Letter <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. A+, B, O"
              value={gradeForm.grade}
              onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold uppercase focus:ring-2 focus:ring-rose-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-dark-slate mb-1">
              GPA Points (Optional)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={gradeForm.gpa}
              onChange={(e) => setGradeForm({ ...gradeForm, gpa: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold focus:ring-2 focus:ring-rose-300 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-dark-slate mb-1">
              Min Percentage (%) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              max="100"
              step="0.01"
              value={gradeForm.minPercentage}
              onChange={(e) => setGradeForm({ ...gradeForm, minPercentage: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold focus:ring-2 focus:ring-rose-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-dark-slate mb-1">
              Max Percentage (%) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              max="100"
              step="0.01"
              value={gradeForm.maxPercentage}
              onChange={(e) => setGradeForm({ ...gradeForm, maxPercentage: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold focus:ring-2 focus:ring-rose-300 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-dark-slate mb-1">
            Performance Description / Remark
          </label>
          <input
            type="text"
            placeholder="e.g. Outstanding, Excellent, Pass"
            value={gradeForm.description}
            onChange={(e) => setGradeForm({ ...gradeForm, description: e.target.value })}
            className="w-full px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold focus:ring-2 focus:ring-rose-300 outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-light-border">
          <button
            type="button"
            onClick={() => setShowGradeModal(false)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all cursor-pointer shadow-xs"
          >
            Save Grade Tier
          </button>
        </div>
      </form>
    </div>
  );
};

export default GradeRuleModal;
