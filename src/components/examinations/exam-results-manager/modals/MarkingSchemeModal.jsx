import React, { useState } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';

/**
 * MarkingSchemeModal
 * Modal for configuring marking scheme (max marks, pass marks) for all subjects
 */
const MarkingSchemeModal = ({
  isOpen,
  onClose,
  allSubjectsToShow,
  schemeEdits,
  setSchemeEdits,
  selectedScheduleId,
  selectedClassId,
  classResultsIndex,
  refreshResults,
  isTeacherLocked,
  userRoles,
  slots = [],
  teacherMap = {},
  classAssignments = [],
  handleRemoveSubject,
}) => {
  const [bulkMaxMarks, setBulkMaxMarks] = useState('100');
  const [bulkPassMarks, setBulkPassMarks] = useState('35');
  const [savingScheme, setSavingScheme] = useState(false);

  const handleBulkApplyScheme = () => {
    const maxVal = Number(bulkMaxMarks) || 100;
    const passVal = bulkPassMarks !== '' ? Number(bulkPassMarks) : null;
    const updated = {};
    allSubjectsToShow.forEach((sub) => {
      updated[String(sub.id)] = {
        max_marks: maxVal,
        pass_marks: passVal,
      };
    });
    setSchemeEdits(updated);
    showToast(`Applied ${maxVal} Max Marks to all ${allSubjectsToShow.length} subjects`, 'info');
  };

  const handleSaveScheme = async () => {
    setSavingScheme(true);
    try {
      for (const sub of allSubjectsToShow) {
        const edit = schemeEdits[String(sub.id)];
        if (!edit) continue;
        const existing = classResultsIndex[String(sub.id)];
        const maxVal = Number(edit.max_marks) || 100;
        const passVal =
          edit.pass_marks !== '' && edit.pass_marks !== null ? Number(edit.pass_marks) : null;

        if (existing && !String(existing.id).startsWith('temp_')) {
          await supabase
            .from('exam_results')
            .update({
              max_marks: maxVal,
              pass_marks: passVal,
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('exam_results').upsert(
            {
              schedule_id: Number(selectedScheduleId),
              class_id: Number(selectedClassId),
              subject_id: Number(sub.id),
              max_marks: maxVal,
              pass_marks: passVal,
              entry_status: 'pending',
              is_from_schedule: !sub.isAdHoc,
            },
            { onConflict: 'schedule_id,class_id,subject_id' }
          );
        }
      }
      await refreshResults();
      showToast('Marking scheme updated successfully', 'success');
      onClose();
    } catch (err) {
      showToast('Failed to save marking scheme: ' + err.message, 'error');
    } finally {
      setSavingScheme(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-light-border bg-emerald-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm shadow-2xs">
              <i className="fas fa-sliders" />
            </div>
            <div>
              <h3 className="text-base font-bold text-dark-primary">Marking Scheme</h3>
              <p className="text-xs text-dark-muted mt-0.5">
                Configure max marks and pass marks for all subjects
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-200 text-dark-muted flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="fas fa-times text-xs" />
          </button>
        </div>

        {/* Quick Bulk Apply Bar */}
        <div className="p-4 bg-slate-50 border-b border-light-border shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-dark-primary flex items-center gap-1.5">
                <i className="fas fa-bolt text-amber-500 text-xs" />
                Apply in One Go:
              </span>
              <div className="flex items-center gap-1.5 bg-white border border-light-border px-2.5 py-1 rounded-xl shadow-2xs">
                <span className="text-[11px] font-bold text-dark-muted">Max:</span>
                <input
                  type="number"
                  value={bulkMaxMarks}
                  onChange={(e) => setBulkMaxMarks(e.target.value)}
                  className="w-14 text-xs font-bold text-dark-primary outline-none"
                  placeholder="100"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-light-border px-2.5 py-1 rounded-xl shadow-2xs">
                <span className="text-[11px] font-bold text-dark-muted">Pass:</span>
                <input
                  type="number"
                  value={bulkPassMarks}
                  onChange={(e) => setBulkPassMarks(e.target.value)}
                  className="w-14 text-xs font-bold text-dark-primary outline-none"
                  placeholder="35"
                />
              </div>
              <button
                type="button"
                onClick={handleBulkApplyScheme}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <i className="fas fa-check-double text-[10px]" />
                <span>Apply to All</span>
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] text-dark-muted font-semibold">
                {allSubjectsToShow.length} {allSubjectsToShow.length === 1 ? 'subject' : 'subjects'}
              </span>
            </div>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {allSubjectsToShow.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-dark-muted text-xs font-semibold">
                No subjects found for this class.
              </p>
            </div>
          ) : (
            <div className="border border-light-border rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-light-border text-dark-muted font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Teacher / Invigilator</th>
                    <th className="py-2.5 px-3 w-28">Max Marks</th>
                    <th className="py-2.5 px-3 w-28">Pass Marks</th>
                    <th className="py-2.5 px-3 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allSubjectsToShow.map((sub) => {
                    const edit = schemeEdits[String(sub.id)] || {
                      max_marks: 100,
                      pass_marks: 35,
                    };
                    const slot = slots.find(
                      (s) =>
                        String(s.schedule_id) === String(selectedScheduleId) &&
                        String(s.class_id) === String(selectedClassId) &&
                        String(s.subject_id) === String(sub.id)
                    );
                    const slotTeacher = slot?.teacher_id
                      ? teacherMap[String(slot.teacher_id)]
                      : null;
                    const ca = classAssignments.find(
                      (a) =>
                        String(a.class_id) === String(selectedClassId) &&
                        String(a.subject_id) === String(sub.id)
                    );
                    const caTeacher = ca?.teacher_id ? teacherMap[String(ca.teacher_id)] : null;
                    const teacherDisplay = slotTeacher || caTeacher || '—';

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-dark-primary">
                          <div className="flex items-center gap-1.5">
                            <span>{sub.name}</span>
                            {sub.code && (
                              <span className="text-[10px] text-dark-muted font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                {sub.code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {sub.isAdHoc ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <i className="fas fa-tag text-[8px]" />
                              Ad-Hoc
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              <i className="fas fa-calendar-check text-[8px]" />
                              Scheduled
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-dark-muted">
                          <span className="truncate max-w-[140px] block" title={teacherDisplay}>
                            {teacherDisplay}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={edit.max_marks ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSchemeEdits((prev) => ({
                                ...prev,
                                [String(sub.id)]: {
                                  ...prev[String(sub.id)],
                                  max_marks: val === '' ? '' : Number(val),
                                },
                              }));
                            }}
                            className="w-24 px-2.5 py-1.5 text-xs font-bold border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
                            placeholder="100"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            value={edit.pass_marks ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSchemeEdits((prev) => ({
                                ...prev,
                                [String(sub.id)]: {
                                  ...prev[String(sub.id)],
                                  pass_marks: val === '' ? '' : Number(val),
                                },
                              }));
                            }}
                            className="w-24 px-2.5 py-1.5 text-xs font-bold border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
                            placeholder="35"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveSubject(sub.id)}
                            className="w-7 h-7 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 transition-all flex items-center justify-center cursor-pointer shadow-2xs mx-auto"
                            title={`Remove ${sub.name} from Mark Entry`}
                          >
                            <i className="fas fa-trash-alt text-xs" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-light-border bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-dark-muted font-medium">
            Changes apply across this class examination results.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={savingScheme}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-white transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveScheme}
              disabled={savingScheme}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {savingScheme ? (
                <>
                  <i className="fas fa-spinner fa-spin text-xs" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-save text-xs" />
                  <span>Save Marking Scheme</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkingSchemeModal;