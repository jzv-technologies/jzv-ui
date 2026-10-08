import React from 'react';
import { getGradeColor } from '../utils';

/**
 * GradingTab
 * The "Grading Rules" tab: grading-scale table with add / edit / delete / reset.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const GradingTab = ({
  currentConfig,
  handleDeleteGrade,
  handleOpenAddGrade,
  handleOpenEditGrade,
  handleResetGradingScale,
  setCurrentConfig,
}) => {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-50/70 to-amber-50/70 p-4 rounded-2xl border border-rose-200">
        <div>
          <h3 className="text-xs font-black text-dark-primary uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-graduation-cap text-rose-600 text-sm" />
            <span>Grading Scale & Performance Rules</span>
          </h3>
          <p className="text-xs text-dark-muted mt-0.5 max-w-xl">
            Configure the grading rules used to compute letter grades for subjects and the overall
            grand percentage. Define custom percentages, grade codes, and descriptions.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetGradingScale}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-dark-slate border border-light-border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleOpenAddGrade}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fas fa-plus text-[10px]" />
            <span>Add Grade Tier</span>
          </button>
        </div>
      </div>

      {/* Toggle to Show Grade Legend on Report Card */}
      <div className="bg-white p-3.5 rounded-2xl border border-light-border shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs">
            <i className="fas fa-table-list" />
          </div>
          <div>
            <h4 className="text-xs font-black text-dark-primary">
              Display Grading Scale Legend on Report Card
            </h4>
            <p className="text-[11px] text-dark-muted">
              Prints a compact grade criteria key at the bottom of the card for parents and students
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(currentConfig.showGradingScale)}
            onChange={(e) =>
              setCurrentConfig({ ...currentConfig, showGradingScale: e.target.checked })
            }
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
        </label>
      </div>

      {/* Grading Table */}
      <div className="overflow-x-auto rounded-2xl border border-light-border bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-dark-muted font-black text-[10px] uppercase tracking-wider border-b border-light-border">
              <th className="py-3 px-4">Grade</th>
              <th className="py-3 px-4">Marks Range (%)</th>
              <th className="py-3 px-4">Performance Description</th>
              <th className="py-3 px-4 text-center">Grade Points (GPA)</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light-border font-medium">
            {currentConfig.gradingScale.map((tier, idx) => {
              const tierColor = tier.color || getGradeColor(tier.grade, currentConfig.gradingScale) || '#059669';
              return (
                <tr key={tier.grade + idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <span
                      className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-lg text-xs font-black shadow-2xs border"
                      style={{
                        color: tierColor,
                        backgroundColor: `${tierColor}15`,
                        borderColor: `${tierColor}40`,
                      }}
                    >
                      {tier.grade}
                    </span>
                  </td>
                <td className="py-3 px-4 font-mono font-bold text-dark-primary">
                  {tier.minPercentage}% - {tier.maxPercentage}%
                </td>
                <td className="py-3 px-4 text-dark-slate">{tier.description || '—'}</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-dark-muted">
                  {tier.gpa != null ? Number(tier.gpa).toFixed(1) : '—'}
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditGrade(idx)}
                      className="p-1.5 text-slate-500 hover:text-dark-primary cursor-pointer"
                      title="Edit grade tier"
                    >
                      <i className="fas fa-pen text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGrade(idx)}
                      className="p-1.5 text-rose-400 hover:text-rose-700 cursor-pointer"
                      title="Delete grade tier"
                    >
                      <i className="fas fa-trash text-xs" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GradingTab;
