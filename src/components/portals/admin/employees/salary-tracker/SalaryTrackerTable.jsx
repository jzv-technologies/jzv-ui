import React from 'react';

const SalaryTrackerTable = ({ items, onOpenExtras, onOpenPayment, onOpenHistory, canUpdate }) => {
  return (
    <table className="w-full text-left text-xs font-semibold min-w-[850px]">
      <thead className="bg-gray-50/80 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-600 font-extrabold">
        <tr>
          <th className="p-3.5">Employee Details</th>
          <th className="p-3.5 text-right">Total Payable</th>
          <th className="p-3.5 text-right">Total Paid</th>
          <th className="p-3.5 text-right">Balance</th>
          <th className="p-3.5">Status</th>
          <th className="p-3.5">Last Settlement</th>
          <th className="p-3.5 text-center">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {items.map((item, idx) => {
          const emp = item.emp || {};
          const baseSalary = Number(item.baseSalary) || 0;
          const extras = Number(item.extras) || 0;
          const deductions = Number(item.deductions) || 0;
          const totalPayable =
            Number(item.totalPayable ?? item.payableAmt) || baseSalary + extras - deductions;
          const totalPaid = Number(item.totalPaid) || 0;
          const balance = Number(item.balance) || Math.max(0, totalPayable - totalPaid);

          const isZeroBalance = balance <= 0 && totalPaid > 0;
          const lastPaymentDate = item.lastPaymentDate || item.lastDate;
          const lastPaidBy = item.lastPaidBy || item.lastBy;

          const statusBadge =
            balance <= 0 && totalPaid > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1">
                <i className="fas fa-check-circle"></i> Paid
              </span>
            ) : totalPaid > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black inline-flex items-center gap-1">
                <i className="fas fa-spinner"></i> Partial
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black inline-flex items-center gap-1">
                <i className="fas fa-clock"></i> Unpaid
              </span>
            );

          return (
            <tr
              key={emp.id || item.id || idx}
              className={`transition-colors ${
                isZeroBalance
                  ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
                  : totalPaid > 0
                    ? 'bg-amber-50/20 hover:bg-amber-50/40'
                    : 'hover:bg-teal-50/20'
              }`}
            >
              {/* Single Combined Column for ID, Employee & Designation */}
              <td className="p-3.5">
                <div className="font-extrabold text-dark-primary text-xs">
                  {emp.name || 'Unknown Employee'}
                </div>
                <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">
                    {emp.emp_id || `EMP-${emp.id || idx}`}
                  </span>
                  <span className="text-teal-800 font-bold">
                    {emp.designation || 'Not Defined'}
                  </span>
                </div>
              </td>

              {/* Total Payable with Base, Extras & Deductions Subtext */}
              <td className="p-3.5 text-right font-black text-xs text-dark-primary">
                ₹{totalPayable.toLocaleString('en-IN')}
                <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  Base: ₹{baseSalary.toLocaleString('en-IN')}
                  {extras > 0 && (
                    <span className="text-blue-700 font-bold">
                      {' '}
                      | Extras: +₹{extras.toLocaleString('en-IN')}
                    </span>
                  )}
                  {deductions > 0 && (
                    <span className="text-rose-700 font-bold">
                      {' '}
                      | Deductions: -₹{deductions.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </td>

              {/* Total Paid */}
              <td className="p-3.5 text-right font-extrabold text-xs text-emerald-700">
                ₹{totalPaid.toLocaleString('en-IN')}
              </td>

              {/* Balance */}
              <td className="p-3.5 text-right font-extrabold text-xs">
                {balance > 0 ? (
                  <span className="text-rose-600">₹{balance.toLocaleString('en-IN')}</span>
                ) : (
                  <span className="text-gray-400">₹0</span>
                )}
              </td>

              {/* Status */}
              <td className="p-3.5">{statusBadge}</td>

              {/* Last Settlement Info */}
              <td className="p-3.5 text-gray-500 text-[11px]">
                {lastPaymentDate ? (
                  <div>
                    <div className="font-bold text-dark-primary">{lastPaymentDate}</div>
                    <div className="text-[10px] text-gray-400 font-semibold">
                      by {lastPaidBy || 'Admin'}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400 font-normal">No payment history</span>
                )}
              </td>

              {/* Actions */}
              <td className="p-3.5 text-center">
                <div className="flex items-center justify-center gap-2">
                  {onOpenHistory && (
                    <button
                      type="button"
                      disabled={!canUpdate}
                      onClick={() => onOpenHistory(emp)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-blue-600 hover:bg-blue-800 text-blue-50 transition-all border border-amber-200 flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Compensation History & Salary Revisions"
                    >
                      <i className="fas fa-chart-line"></i>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!canUpdate}
                    onClick={() => onOpenExtras(item)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-yellow-600 hover:bg-yellow-800 text-yellow-50 transition-all border border-yellow-200 flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Edit Extras & Deductions"
                  >
                    <i className="fas fa-sack-dollar"></i>
                  </button>
                  <button
                    type="button"
                    disabled={!canUpdate}
                    onClick={() => onOpenPayment(item)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-teal-600 hover:bg-teal-800 text-white shadow-xs transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Record Payment"
                  >
                    <i class="fa-brands fa-amazon-pay"></i>
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default SalaryTrackerTable;
