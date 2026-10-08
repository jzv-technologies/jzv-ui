import React from 'react';
import { createPortal } from 'react-dom';
import { getGradeColor } from '../utils';

/**
 * GradeRuleModal
 * Modal for adding / editing a grading-scale tier.
 * Rendered via createPortal to document.body with z-[9999] to ensure it always appears
 * above the live preview canvas and all page layers.
 */
const GradeRuleModal = ({
  editingGradeIdx,
  gradeForm,
  handleSaveGradeForm,
  setGradeForm,
  setShowGradeModal,
}) => {
  const autoColor = getGradeColor(gradeForm.grade);
  const effectiveColor = gradeForm.color || autoColor || '#059669';

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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

        {/* Custom Grade Color Option */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-dark-slate">
              Grade Badge Color (Optional)
            </label>
            {gradeForm.color && (
              <button
                type="button"
                onClick={() => setGradeForm({ ...gradeForm, color: '' })}
                className="text-[10px] text-rose-600 hover:underline cursor-pointer font-bold"
              >
                Reset to Auto
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={effectiveColor}
              onChange={(e) => setGradeForm({ ...gradeForm, color: e.target.value })}
              className="w-8 h-8 rounded-lg cursor-pointer border border-light-border p-0.5 bg-white shrink-0"
              title="Pick custom color"
            />
            <input
              type="text"
              placeholder={autoColor ? `Auto (${autoColor})` : 'e.g. #059669'}
              value={gradeForm.color || ''}
              onChange={(e) => setGradeForm({ ...gradeForm, color: e.target.value })}
              className="flex-1 px-3 py-1.5 text-xs border border-light-border rounded-xl font-mono focus:ring-2 focus:ring-rose-300 outline-none"
            />
            <span
              className="inline-flex items-center justify-center min-w-[36px] px-2.5 py-1 rounded-lg text-xs font-black shadow-2xs border"
              style={{
                color: effectiveColor,
                backgroundColor: `${effectiveColor}18`,
                borderColor: `${effectiveColor}40`,
              }}
            >
              {gradeForm.grade || 'A+'}
            </span>
          </div>

          {/* Quick preset color swatches */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] text-dark-muted font-bold mr-0.5">Presets:</span>
            {[
              { label: 'Emerald', color: '#059669' },
              { label: 'Green', color: '#10b981' },
              { label: 'Blue', color: '#0284c7' },
              { label: 'Amber', color: '#d97706' },
              { label: 'Orange', color: '#ea580c' },
              { label: 'Red', color: '#dc2626' },
              { label: 'Purple', color: '#7c3aed' },
              { label: 'Rose', color: '#e11d48' },
            ].map((sw) => (
              <button
                key={sw.color}
                type="button"
                onClick={() => setGradeForm({ ...gradeForm, color: sw.color })}
                className={`w-5 h-5 rounded-full transition-transform hover:scale-110 cursor-pointer border ${
                  (gradeForm.color || '').toLowerCase() === sw.color.toLowerCase()
                    ? 'ring-2 ring-offset-1 ring-slate-800 scale-110'
                    : 'border-white/80 shadow-2xs'
                }`}
                style={{ backgroundColor: sw.color }}
                title={sw.label}
              />
            ))}
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default GradeRuleModal;
