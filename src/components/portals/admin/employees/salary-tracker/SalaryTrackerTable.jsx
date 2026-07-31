import React from 'react';

const SalaryTrackerTable = ({ items, onOpenExtras, onOpenPayment, canUpdate }) => {
  return (
    <table className="w-full text-left text-xs font-semibold min-w-[850px]">
      <thead className="bg-gray-50/80 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-600 font-extrabold">
        <tr>
          <th className="p-3.5">Employee Details</th>
          <th className="p-3.5">Designation</th>
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
          const emp = item.emp;
          const isZeroBalance = item.balance <= 0 && item.totalPaid > 0;

          const statusBadge =
            item.balance <= 0 && item.totalPaid > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1">
                <i className="fas fa-check-circle"></i> Paid
              </span>
            ) : item.balance > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black inline-flex items-center gap-1">
                <i className="fas fa-circle-half-stroke"></i> Partial
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black inline-flex items-center gap-1">
                <i className="fas fa-times-circle"></i> Unpaid
              </span>
            );

          return (
            <tr
              key={idx}
              className={`transition-colors ${
                isZeroBalance
                  ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500 hover:bg-emerald-100/70 font-semibold text-emerald-950'
                  : 'hover:bg-teal-50/20'
              }`}
            >
              {/* Single Combined Column for ID, Employee & Org */}
              <td className="p-3.5">
                <div className="font-extrabold text-dark-primary text-xs">{emp.name}</div>
                <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                  <span>{emp.emp_id || `ID: ${emp.id}`} | </span>
                  <span className="text-teal-800 font-bold">{item.organization}</span>
                </div>
              </td>

              {/* Designation */}
              <td className="p-3.5 text-dark-soft font-bold text-xs">
                {emp.designation || 'Teacher'}
              </td>

              {/* Total Payable with Base, Extras & Deductions Subtext */}
              <td className="p-3.5 text-right">
                <div className="font-black text-dark-primary text-sm">
                  ₹{item.totalPayable.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  Base: ₹{item.baseSalary.toLocaleString('en-IN')}
                  {item.extras > 0 && (
                    <span className="text-blue-700 font-bold"> | Extras: +₹{item.extras.toLocaleString('en-IN')}</span>
                  )}
                  {item.deductions > 0 && (
                    <span className="text-rose-700 font-bold"> | Deductions: -₹{item.deductions.toLocaleString('en-IN')}</span>
                  )}
                </div>
              </td>

              {/* Total Paid */}
              <td className="p-3.5 text-right font-extrabold text-emerald-700">
                ₹{item.totalPaid.toLocaleString('en-IN')}
              </td>

              {/* Balance */}
              <td className="p-3.5 text-right font-black text-rose-700">
                ₹{item.balance.toLocaleString('en-IN')}
              </td>

              {/* Status */}
              <td className="p-3.5">{statusBadge}</td>

              {/* Last Settlement */}
              <td className="p-3.5">
                {item.lastPaymentDate ? (
                  <div>
                    <div className="font-bold text-dark-primary text-xs">
                      {item.lastPaymentDate}
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium">
                      By: {item.lastPaidBy || 'Admin'}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400 font-normal italic text-[11px]">None</span>
                )}
              </td>

              {/* Actions */}
              <td className="p-3.5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={!canUpdate}
                    onClick={() => onOpenExtras(item)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-blue-50 hover:bg-blue-100 text-blue-800 transition-all border border-blue-200 flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Edit Extras / Deductions"
                  >
                    <i className="fas fa-indian-rupee-sign"></i> Extras
                  </button>
                  <button
                    type="button"
                    disabled={!canUpdate}
                    onClick={() => onOpenPayment(item)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Settle / Record Monthly Payment"
                  >
                    <i className="fas fa-hand-holding-dollar"></i>
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
