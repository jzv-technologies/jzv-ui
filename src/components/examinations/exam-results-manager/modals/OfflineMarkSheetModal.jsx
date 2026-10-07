import React from 'react';

/**
 * OfflineMarkSheetModal
 * Modal for printing blank mark sheets
 */
const OfflineMarkSheetModal = ({
  isOpen,
  onClose,
  schedule,
  selectedClass,
  subjects = [],
  students = [],
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-light-border bg-indigo-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm shadow-2xs">
              <i className="fas fa-print" />
            </div>
            <div>
              <h3 className="text-base font-bold text-dark-primary">Print Blank Mark Sheet</h3>
              <p className="text-xs text-dark-muted mt-0.5">
                {schedule?.name} · {selectedClass?.name}
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

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-slate-50 border border-light-border rounded-xl p-4">
            <h4 className="text-xs font-bold text-dark-primary mb-3">Subjects to Include</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {subjects.map((sub) => (
                <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded text-indigo-600 focus:ring-indigo-400"
                  />
                  <span className="text-xs font-bold text-dark-primary">{sub.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-light-border rounded-xl p-4">
            <h4 className="text-xs font-bold text-dark-primary mb-3">Students ({students.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {students.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded text-indigo-600 focus:ring-indigo-400"
                  />
                  <span className="text-xs font-bold text-dark-primary">
                    {s.student_name} ({s.admission_no})
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-light-border bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-white transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              window.print();
              onClose();
            }}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <i className="fas fa-print text-xs" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineMarkSheetModal;