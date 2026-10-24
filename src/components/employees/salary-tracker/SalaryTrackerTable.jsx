import React from 'react';

const StatusBadge = ({ status }) => {
  if (status === 'paid') {
    return (
      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1 shrink-0">
        <i className="fas fa-check-circle"></i> Paid
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black inline-flex items-center gap-1 shrink-0">
        <i className="fas fa-spinner"></i> Partial
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black inline-flex items-center gap-1 shrink-0">
      <i className="fas fa-clock"></i> Unpaid
    </span>
  );
};

const buildDisplayItem = (item, idx) => {
  const emp = item.emp || {};
  const baseSalary = Number(item.baseSalary) || 0;
  const extras = Number(item.extras) || 0;
  const deductions = Number(item.deductions) || 0;
  const totalPayable =
    Number(item.totalPayable ?? item.payableAmt) || baseSalary + extras - deductions;
  const totalPaid = Number(item.totalPaid) || 0;
  const balance = Number(item.balance) || Math.max(0, totalPayable - totalPaid);

  let status = 'unpaid';
  if (balance <= 0 && totalPaid > 0) status = 'paid';
  else if (totalPaid > 0) status = 'partial';

  const rowClass =
    status === 'paid'
      ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
      : status === 'partial'
        ? 'bg-amber-50/20 hover:bg-amber-50/40'
        : 'hover:bg-teal-50/20';

  return {
    key: emp.id || item.id || idx,
    emp,
    empCode: emp.emp_id || `EMP-${emp.id || idx}`,
    baseSalary,
    extras,
    deductions,
    totalPayable,
    totalPaid,
    balance,
    status,
    rowClass,
    lastPaymentDate: item.lastPaymentDate || item.lastDate,
    lastPaidBy: item.lastPaidBy || item.lastBy,
  };
};

const SalaryTrackerTable = ({ items, onOpenExtras, onOpenPayment, onOpenHistory, canUpdate }) => {
  return (
    <>
      {/* Mobile: card layout */}
      <div className="md:hidden space-y-2.5">
        {items.map((item, idx) => {
          const {
            key,
            emp,
            empCode,
            baseSalary,
            extras,
            deductions,
            totalPayable,
            totalPaid,
            balance,
            status,
            lastPaymentDate,
            lastPaidBy,
          } = buildDisplayItem(item, idx);

          return (
            <div
              key={key}
              className={`rounded-2xl border border-gray-200 shadow-2xs overflow-hidden p-3.5 space-y-3 ${
                status === 'paid'
                  ? 'bg-emerald-50/30'
                  : status === 'partial'
                    ? 'bg-amber-50/20'
                    : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-extrabold text-dark-primary text-sm break-words">
                    {emp.name || 'Unknown Employee'}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">
                      {empCode}
                    </span>
                    <span className="text-teal-800 font-bold">
                      {emp.designation || 'Not Defined'}
                    </span>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/80 rounded-xl border border-gray-200/80 p-2 text-center">
                  <div className="text-[9px] font-extrabold uppercase tracking-wide text-gray-500">
                    Payable
                  </div>
                  <div className="text-xs font-black text-dark-primary mt-0.5">
                    ₹{totalPayable.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-white/80 rounded-xl border border-emerald-200/80 p-2 text-center">
                  <div className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                    Paid
                  </div>
                  <div className="text-xs font-black text-emerald-700 mt-0.5">
                    ₹{totalPaid.toLocaleString('en-IN')}
                  </div>
                </div>
                <div
                  className={`bg-white/80 rounded-xl border p-2 text-center ${
                    balance > 0 ? 'border-rose-200/80' : 'border-gray-200/80'
                  }`}
                >
                  <div
                    className={`text-[9px] font-extrabold uppercase tracking-wide ${
                      balance > 0 ? 'text-rose-700' : 'text-gray-500'
                    }`}
                  >
                    Balance
                  </div>
                  <div
                    className={`text-xs font-black mt-0.5 ${
                      balance > 0 ? 'text-rose-600' : 'text-gray-400'
                    }`}
                  >
                    ₹{balance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-gray-500">
                <span>Base: ₹{baseSalary.toLocaleString('en-IN')}</span>
                {extras > 0 && (
                  <span className="text-blue-700 font-bold">
                    Extras: +₹{extras.toLocaleString('en-IN')}
                  </span>
                )}
                {deductions > 0 && (
                  <span className="text-rose-700 font-bold">
                    Deductions: -₹{deductions.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-gray-200/70 pt-2 text-[10px] font-semibold">
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-gray-400">
                  Last Settlement
                </span>
                {lastPaymentDate ? (
                  <span className="text-right">
                    <span className="font-bold text-dark-primary">{lastPaymentDate}</span>{' '}
                    <span className="text-gray-400">by {lastPaidBy || 'Admin'}</span>
                  </span>
                ) : (
                  <span className="text-gray-400 font-normal">No payment history</span>
                )}
              </div>

              <div className={`grid gap-2 ${onOpenHistory ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {onOpenHistory && (
                  <button
                    type="button"
                    disabled={!canUpdate}
                    onClick={() => onOpenHistory(emp)}
                    className="h-9 rounded-xl text-[10px] font-extrabold bg-blue-600 hover:bg-blue-800 text-blue-50 transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Compensation History & Salary Revisions"
                    aria-label="Compensation History & Salary Revisions"
                  >
                    <i className="fas fa-chart-line"></i> Increaments
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canUpdate}
                  onClick={() => onOpenExtras(item)}
                  className="h-9 rounded-xl text-[10px] font-extrabold bg-yellow-600 hover:bg-yellow-800 text-yellow-50 transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Edit Extras & Deductions"
                  aria-label="Edit Extras and Deductions"
                >
                  <i className="fas fa-sack-dollar"></i> Extras
                </button>
                <button
                  type="button"
                  disabled={!canUpdate}
                  onClick={() => onOpenPayment(item)}
                  className="h-9 rounded-xl text-[10px] font-black bg-teal-600 hover:bg-teal-800 text-white transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Record Payment"
                  aria-label="Record Payment"
                >
                  <i className="fa-brands fa-amazon-pay"></i> Pay
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-2xl shadow-2xs">
        <table className="w-full text-left text-xs font-semibold min-w-[850px]">
          <thead className="bg-gray-50/80 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-600 font-extrabold">
            <tr>
              <th className="p-3.5 w-48 sm:w-56 min-w-[170px] sticky left-0 z-20 bg-gray-50 border-r border-gray-200 shadow-xs">
                Employee Details
              </th>
              <th className="p-3.5 text-right min-w-[130px]">Total Payable</th>
              <th className="p-3.5 text-right min-w-[110px]">Total Paid</th>
              <th className="p-3.5 text-right min-w-[110px]">Balance</th>
              <th className="p-3.5 min-w-[100px]">Status</th>
              <th className="p-3.5 min-w-[140px]">Last Settlement</th>
              <th className="p-3.5 text-center min-w-[130px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => {
              const {
                key,
                emp,
                empCode,
                baseSalary,
                extras,
                deductions,
                totalPayable,
                totalPaid,
                balance,
                status,
                rowClass,
                lastPaymentDate,
                lastPaidBy,
              } = buildDisplayItem(item, idx);

              return (
                <tr key={key} className={`transition-colors ${rowClass}`}>
                  {/* Single Combined Column for ID, Employee & Designation (Sticky) */}
                  <td className="p-3.5 w-48 sm:w-56 min-w-[170px] sticky left-0 z-10 bg-white border-r border-gray-200 shadow-xs">
                    <div className="font-extrabold text-dark-primary text-xs truncate max-w-[150px] sm:max-w-none">
                      {emp.name || 'Unknown Employee'}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700 shrink-0">
                        {empCode}
                      </span>
                      <span className="text-teal-800 font-bold truncate max-w-[100px]">
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
                  <td className="p-3.5">
                    <StatusBadge status={status} />
                  </td>

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
                        <i className="fa-brands fa-amazon-pay"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default SalaryTrackerTable;
