import React, { useState, useEffect } from 'react';
import { showToast } from '../../../utils/toast';

const PAYMENT_MODES = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Other'];

const EXTRA_OPTIONS = ['Leave Encashment', 'Bonus', 'Rewards', 'Gift'];
const DEDUCTION_OPTIONS = ['transport', 'loss of pay', 'loan'];

const PaymentSettlementModal = ({
  selectedPaymentItem,
  setSelectedPaymentItem,
  settlementForm,
  setSettlementForm,
  handleSavePaymentSettlement,
  handleDeletePaymentEntry,
  saving,
  canUpdateSalaryTracker,
}) => {
  const [step, setStep] = useState(1); // Step 1: Input | Step 2: Resolution
  const [settlementType, setSettlementType] = useState('complete'); // 'complete' | 'partial'
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    setStep(1);
    setSettlementType('complete');
    setSelectedReasons([]);
    setDeleteTargetIndex(null);
  }, [selectedPaymentItem]);

  if (!selectedPaymentItem) return null;

  // Breakdown calculations
  const pastPaid = selectedPaymentItem.totalPaid || 0;
  const baseSalary = selectedPaymentItem.baseSalary || 0;
  const currentExtras = selectedPaymentItem.extras || 0;
  const currentDeductions = selectedPaymentItem.deductions || 0;
  const totalPayable = selectedPaymentItem.totalPayable || 0;
  const currentBalance = selectedPaymentItem.balance || 0;

  const enteredAmount = Number(settlementForm.amount) || 0;
  const projectedTotalPaid = pastPaid + enteredAmount;
  const diffAmount = projectedTotalPaid - totalPayable;
  const hasDifference = diffAmount !== 0;
  const isLesser = projectedTotalPaid < totalPayable;
  const isGreater = projectedTotalPaid > totalPayable;

  // Toggle reason pill select
  const toggleReason = (opt) => {
    if (selectedReasons.includes(opt)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== opt));
    } else {
      setSelectedReasons([...selectedReasons, opt]);
    }
  };

  const handleFirstStepSubmit = (e) => {
    e.preventDefault();
    if (enteredAmount <= 0) return;

    if (hasDifference) {
      if (isGreater) {
        setSettlementType('complete');
      } else {
        setSettlementType('complete'); // default to complete
      }
      setSelectedReasons([]);
      setStep(2);
    } else {
      // Direct save if no difference
      handleSavePaymentSettlement(e, {
        settlementType: 'complete',
        selectedReasons: [],
      });
    }
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    // Requirement: When there is a difference and Complete Salary is selected, notes / reasons are mandatory
    if (hasDifference && settlementType === 'complete') {
      if (!settlementForm.notes?.trim() && selectedReasons.length === 0) {
        showToast(
          'Notes or at least one reason tag is mandatory for Complete Salary settlement with price difference.',
          'error'
        );
        return;
      }
    }
    handleSavePaymentSettlement(e, {
      settlementType,
      selectedReasons,
    });
  };

  return (
    <div
      onClick={() => setSelectedPaymentItem(null)}
      className="fixed inset-0 bg-dark-almostblack/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200 my-6 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-hand-holding-dollar text-teal-600"></i> Monthly Payment
              Settlement
            </h3>
            <p className="text-xs text-dark-muted font-semibold mt-0.5">
              {selectedPaymentItem.emp?.name} ({selectedPaymentItem.organization}) — Target Month:{' '}
              {selectedPaymentItem.targetMonth}/{selectedPaymentItem.targetYear}
            </p>
          </div>
          <button
            onClick={() => setSelectedPaymentItem(null)}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Breakdown Card */}
        <div className="bg-teal-50/50 p-3.5 rounded-2xl border border-teal-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Base Salary</span>
            <span className="font-black text-dark-primary">
              ₹{baseSalary.toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">
              Extras / Deduc.
            </span>
            <span className="font-black text-blue-700">
              +₹{currentExtras} / -₹{currentDeductions}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">
              Total Payable
            </span>
            <span className="font-black text-dark-primary">
              ₹{totalPayable.toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">
              Remaining Bal
            </span>
            <span className="font-black text-rose-600">
              ₹{currentBalance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* STEP 1: Main Payment Input Screen */}
        {step === 1 ? (
          <div className="space-y-4">
            {/* Existing Payment History */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-black text-dark-primary flex items-center justify-between">
                <span>
                  <i className="fas fa-history text-gray-400 mr-1.5"></i> Previous Payments
                </span>
                <span className="text-emerald-700 font-extrabold">
                  Total Paid: ₹{pastPaid.toLocaleString('en-IN')}
                </span>
              </h4>

              {selectedPaymentItem.history.length === 0 ? (
                <div className="p-2.5 bg-gray-50 rounded-xl text-center text-xs text-gray-400 font-medium italic">
                  No payments recorded yet for this month.
                </div>
              ) : (
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-[10px] font-bold text-gray-600 uppercase sticky top-0">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Paid By</th>
                        <th className="p-2">Mode</th>
                        <th className="p-2">Notes</th>
                        <th className="p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-xs">
                      {selectedPaymentItem.history.map((h, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2 font-mono text-[11px]">{h.date || 'N/A'}</td>
                          <td className="p-2 text-emerald-700 font-bold">
                            ₹{(Number(h.amount) || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2">{h.by || 'Admin'}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                              {h.paid_through || 'N/A'}
                            </span>
                          </td>
                          <td
                            className="p-2 text-gray-500 text-[11px] truncate max-w-[100px]"
                            title={h.notes}
                          >
                            {h.notes || '-'}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              disabled={saving || !canUpdateSalaryTracker}
                              onClick={() => setDeleteTargetIndex(idx)}
                              className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-xs disabled:opacity-50"
                              title="Revert / Delete this payment record"
                            >
                              <i className="fas fa-trash-can"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <form
              onSubmit={handleFirstStepSubmit}
              className="bg-teal-50/40 p-4 rounded-2xl border border-teal-100 space-y-3"
            >
              <h4 className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                <i className="fas fa-plus-circle text-teal-600"></i> Enter Payment Amount
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                <div>
                  <label className="block text-dark-soft mb-1">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={settlementForm.amount}
                    onChange={(e) =>
                      setSettlementForm({ ...settlementForm, amount: e.target.value })
                    }
                    placeholder="Enter amount paid"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-teal-400 text-emerald-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-dark-soft mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={settlementForm.date}
                    onChange={(e) => setSettlementForm({ ...settlementForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-dark-soft mb-1">Paid By (Person Name)</label>
                  <input
                    type="text"
                    value={settlementForm.paid_by}
                    onChange={(e) =>
                      setSettlementForm({ ...settlementForm, paid_by: e.target.value })
                    }
                    placeholder="Admin / Cashier name"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-dark-soft mb-1">Paid Through (Mode)</label>
                  <select
                    value={settlementForm.paid_through}
                    onChange={(e) =>
                      setSettlementForm({ ...settlementForm, paid_through: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {PAYMENT_MODES.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-dark-soft mb-1">Notes / Reference No.</label>
                  <input
                    type="text"
                    value={settlementForm.notes}
                    onChange={(e) =>
                      setSettlementForm({ ...settlementForm, notes: e.target.value })
                    }
                    placeholder="e.g. Transaction ID, cheque no., or memo notes"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-200 text-dark-soft hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !canUpdateSalaryTracker}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <i className="fas fa-arrow-right"></i>
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* STEP 2: Simple & Clean Resolution Screen */
          <form
            onSubmit={handleFinalSubmit}
            className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200 space-y-4 animate-in fade-in duration-150 text-xs font-bold"
          >
            {/* Minimal Header Summary */}
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-500 text-[11px] block">Paying Amount</span>
                <span className="text-emerald-700 font-extrabold text-sm">
                  ₹{enteredAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 text-[11px] block">
                  {isGreater ? 'Excess Amount' : 'Shortage Amount'}
                </span>
                <span
                  className={`font-extrabold text-sm ${
                    isGreater ? 'text-blue-700' : 'text-rose-700'
                  }`}
                >
                  {isGreater ? '+' : '-'}₹{Math.abs(diffAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* When payment is LESSER: Show 2 Radio Buttons (Complete Salary vs Partial Salary) */}
            {isLesser ? (
              <div className="space-y-3">
                <label className="block text-dark-primary font-black text-xs">
                  Settlement Option:
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label
                    onClick={() => setSettlementType('complete')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                      settlementType === 'complete'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs'
                        : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="settlementType"
                      checked={settlementType === 'complete'}
                      onChange={() => setSettlementType('complete')}
                      className="accent-emerald-600"
                    />
                    <div>
                      <div className="font-black text-xs">Complete Salary</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        Add difference to deduction (Bal = ₹0)
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setSettlementType('partial')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                      settlementType === 'partial'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-xs'
                        : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="settlementType"
                      checked={settlementType === 'partial'}
                      onChange={() => setSettlementType('partial')}
                      className="accent-amber-600"
                    />
                    <div>
                      <div className="font-black text-xs">Partial Salary</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        Keep remaining balance unpaid
                      </div>
                    </div>
                  </label>
                </div>

                {/* Multi-Select Options for Deduction (Shown when Complete Salary is selected) */}
                {settlementType === 'complete' && (
                  <div className="pt-2 space-y-2 animate-in fade-in">
                    <label className="block text-rose-900 font-extrabold text-xs">
                      Deduction Reasons (Select multi-options):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DEDUCTION_OPTIONS.map((opt) => {
                        const isSelected = selectedReasons.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleReason(opt)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border ${
                              isSelected
                                ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-rose-50'
                            }`}
                          >
                            <i
                              className={`fas ${isSelected ? 'fa-check' : 'fa-plus'} text-[10px]`}
                            ></i>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* When payment is MORE: Auto Complete Salary & show Extra Multi-Select */
              <div className="space-y-3">
                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 text-blue-950 font-extrabold flex items-center justify-between">
                  <span>Complete Salary Settlement</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                    Adds +₹{Math.abs(diffAmount).toLocaleString('en-IN')} to Extras
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-blue-900 font-extrabold text-xs">
                    Extra Reasons (Select multi-options):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EXTRA_OPTIONS.map((opt) => {
                      const isSelected = selectedReasons.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleReason(opt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                          }`}
                        >
                          <i
                            className={`fas ${isSelected ? 'fa-check' : 'fa-plus'} text-[10px]`}
                          ></i>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Mandatory Notes Field on Screen 2 when Complete Salary is selected */}
            {settlementType === 'complete' && (
              <div className="pt-2 space-y-1">
                <label className="block text-dark-primary font-extrabold text-xs">
                  Settlement Notes / Memo{' '}
                  <span className="text-rose-600 font-bold">* (Mandatory)</span>
                </label>
                <input
                  type="text"
                  value={settlementForm.notes}
                  onChange={(e) => setSettlementForm({ ...settlementForm, notes: e.target.value })}
                  placeholder="Enter mandatory note explaining reason for full settlement..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 rounded-xl text-xs font-extrabold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all flex items-center gap-1.5"
              >
                <i className="fas fa-chevron-left"></i> Back
              </button>
              <button
                type="submit"
                disabled={saving || !canUpdateSalaryTracker}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <i className="fas fa-check"></i>
                {saving ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </form>
        )}

        {/* CUSTOM CONFIRMATION MODAL (Replaces Native Window Alert) */}
        {deleteTargetIndex !== null && (
          <div
            onClick={() => setDeleteTargetIndex(null)}
            className="fixed inset-0 bg-dark-almostblack/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl mx-auto">
                <i className="fas fa-trash-can"></i>
              </div>
              <div>
                <h4 className="text-base font-black text-dark-primary">Revert Payment Record?</h4>
                <p className="text-xs text-dark-muted font-medium mt-1">
                  Are you sure you want to revert/delete this payment record of{' '}
                  <strong className="text-rose-700">
                    ₹
                    {(
                      Number(selectedPaymentItem.history[deleteTargetIndex]?.amount) || 0
                    ).toLocaleString('en-IN')}
                  </strong>
                  ? This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetIndex(null)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    const idx = deleteTargetIndex;
                    setDeleteTargetIndex(null);
                    if (handleDeletePaymentEntry) {
                      await handleDeletePaymentEntry(selectedPaymentItem, idx);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <i className="fas fa-check"></i>
                  {saving ? 'Reverting...' : 'Yes, Revert Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSettlementModal;
