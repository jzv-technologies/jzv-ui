import React from 'react';

const ExtrasUpdateModal = ({
  selectedExtrasItem,
  setSelectedExtrasItem,
  editExtrasValue,
  setEditExtrasValue,
  editDeductionsValue,
  setEditDeductionsValue,
  extrasNotes,
  setExtrasNotes,
  handleSaveExtrasOnly,
  saving,
  canUpdateSalaryTracker,
}) => {
  if (!selectedExtrasItem) return null;

  return (
    <div
      onClick={() => setSelectedExtrasItem(null)}
      className="fixed inset-0 bg-dark-almostblack/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-edit text-blue-600"></i> Update Extras & Deductions
            </h3>
            <p className="text-xs text-dark-muted font-semibold mt-0.5">
              {selectedExtrasItem.emp?.name} ({selectedExtrasItem.organization})
            </p>
          </div>
          <button
            onClick={() => setSelectedExtrasItem(null)}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSaveExtrasOnly} className="space-y-4 text-xs font-bold">
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-1">
            <div className="flex justify-between text-dark-soft">
              <span>Base Monthly Salary:</span>
              <span className="font-extrabold text-dark-primary">
                ₹{selectedExtrasItem.baseSalary.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-dark-soft">
              <span>Current Extras (Bonuses / Allowances):</span>
              <span className="font-extrabold text-blue-700">
                +₹{selectedExtrasItem.extras.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-dark-soft">
              <span>Current Deductions (LOP / Transport / Loan):</span>
              <span className="font-extrabold text-rose-700">
                -₹{(selectedExtrasItem.deductions || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-dark-soft border-t pt-1 mt-1">
              <span>Total Payable Amount:</span>
              <span className="font-black text-emerald-700">
                ₹{selectedExtrasItem.totalPayable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-blue-900 mb-1 font-extrabold">
                Extras Amount (+₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={editExtrasValue}
                onChange={(e) => setEditExtrasValue(e.target.value)}
                placeholder="e.g. 1500 (Bonus, Encashment)"
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-400 text-blue-900"
              />
            </div>

            <div>
              <label className="block text-rose-900 mb-1 font-extrabold">
                Deductions Amount (-₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={editDeductionsValue}
                onChange={(e) => setEditDeductionsValue(e.target.value)}
                placeholder="e.g. 500 (LOP, Transport, Loan)"
                className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-rose-400 text-rose-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-dark-primary mb-1">Notes / Reason for Adjustment</label>
            <input
              type="text"
              value={extrasNotes}
              onChange={(e) => setExtrasNotes(e.target.value)}
              placeholder="e.g. Festival Bonus, Loss of Pay 2 Days, Transport Charge"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSelectedExtrasItem(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-200 text-dark-soft hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !canUpdateSalaryTracker}
              className="px-5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <i className="fas fa-check"></i>
              {saving ? 'Saving...' : 'Save Adjustments'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExtrasUpdateModal;
