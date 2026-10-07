import React, { useState } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';

/**
 * AdHocSubjectModal
 * Modal for adding an ad-hoc subject to the exam
 */
const AdHocSubjectModal = ({
  isOpen,
  onClose,
  availableAdHocSubjects = [],
  adHocSubjectId,
  setAdHocSubjectId,
  adHocMaxMarks,
  setAdHocMaxMarks,
  adHocPassMarks,
  setAdHocPassMarks,
  selectedScheduleId,
  selectedClassId,
  classResultsIndex = {},
  refreshResults,
  isTeacherLocked,
}) => {
  const [savingAdHoc, setSavingAdHoc] = useState(false);

  const handleAddAdHoc = async (e) => {
    e.preventDefault();
    if (!adHocSubjectId) return;
    setSavingAdHoc(true);
    try {
      const existingRes = classResultsIndex[String(adHocSubjectId)];
      let error = null;
      if (existingRes) {
        const res = await supabase
          .from('exam_results')
          .update({
            max_marks: Number(adHocMaxMarks) || 100,
            pass_marks: adHocPassMarks ? Number(adHocPassMarks) : null,
            is_from_schedule: false,
          })
          .eq('id', existingRes.id);
        error = res.error;
      } else {
        const res = await supabase.from('exam_results').insert({
          schedule_id: Number(selectedScheduleId),
          class_id: Number(selectedClassId),
          subject_id: Number(adHocSubjectId),
          max_marks: Number(adHocMaxMarks) || 100,
          pass_marks: adHocPassMarks ? Number(adHocPassMarks) : null,
          is_from_schedule: false,
          entry_status: 'pending',
        });
        error = res.error;
      }
      if (error) throw error;
      const addedSubId = String(adHocSubjectId);
      showToast('Ad-hoc subject added', 'success');
      onClose();
      setAdHocSubjectId('');
      setAdHocMaxMarks('100');
      setAdHocPassMarks('');
      await refreshResults();
    } catch (err) {
      showToast(err.message || 'Failed to add ad-hoc subject', 'error');
    } finally {
      setSavingAdHoc(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-light-border bg-emerald-50/50">
          <h3 className="text-base font-bold text-dark-primary">Add Ad-Hoc Subject</h3>
          <p className="text-[11px] text-dark-muted mt-0.5">
            Add a curriculum subject outside the formal exam timetable for this class.
          </p>
        </div>
        <form onSubmit={handleAddAdHoc} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-dark-slate mb-1.5">Subject *</label>
            <select
              value={adHocSubjectId}
              onChange={(e) => setAdHocSubjectId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300"
              required
            >
              <option value="">— Select subject —</option>
              {availableAdHocSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
            {availableAdHocSubjects.length === 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                <i className="fas fa-info-circle mr-1" />
                All curriculum subjects for this class are already added to the exam.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-dark-slate mb-1.5">
                Max Marks
              </label>
              <input
                type="number"
                value={adHocMaxMarks}
                onChange={(e) => setAdHocMaxMarks(e.target.value)}
                className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark-slate mb-1.5">
                Pass Marks
              </label>
              <input
                type="number"
                value={adHocPassMarks}
                onChange={(e) => setAdHocPassMarks(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={savingAdHoc || availableAdHocSubjects.length === 0 || !adHocSubjectId}
              className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-60 cursor-pointer"
            >
              {savingAdHoc ? 'Adding...' : 'Add Subject'}
            </button>
            <button
              type="button"
              onClick={() => onClose()}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdHocSubjectModal;