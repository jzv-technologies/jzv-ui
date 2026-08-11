import React from 'react';

const SalaryDashboardMatrixView = ({
  matrixFilteredGroupedEmployees,
  matrixMonths,
  matrixLookupMap,
  handleOpenMatrixPaymentModal,
  groupByOrg = true,
  prevMonthPendingMap,
}) => {
  const currentMonthObj = matrixMonths.find((m) => m.isCurrent) || matrixMonths[0];

  return (
    <div className="space-y-8">
      {matrixFilteredGroupedEmployees.map(([orgName, orgEmps]) => {
        let orgPaidCount = 0;
        let orgUnpaidCount = 0;
        let orgTotalPaid = 0;
        let orgBalance = 0;
        let orgPrevPendingCount = 0;

        orgEmps.forEach((emp) => {
          const org = emp.organization || 'Jamia Zaytoonah';
          if (currentMonthObj) {
            const key = `${emp.id}_${org}_${currentMonthObj.year}_${currentMonthObj.month}`;
            const record = matrixLookupMap.get(key);
            let paidAmt = 0;
            let payableAmt = Number(emp.current_salary) || 0;
            if (record) {
              const baseSal = Number(record.salary != null ? record.salary : emp.current_salary) || 0;
              const extras = Number(record.extras) || 0;
              const deductions = Number(record.deductions) || 0;
              payableAmt = baseSal + extras - deductions;
              paidAmt = Number(record.total_paid) || 0;
            }
            const bal = Math.max(0, payableAmt - paidAmt);
            if (bal <= 0 && paidAmt > 0) orgPaidCount++;
            else orgUnpaidCount++;
            orgTotalPaid += paidAmt;
            orgBalance += bal;
          }

          const prevKey = `${emp.id}_${org}`;
          if (prevMonthPendingMap && prevMonthPendingMap.has(prevKey)) {
            orgPrevPendingCount++;
          }
        });

        return (
          <div
            key={orgName}
            className="bg-white rounded-3xl border border-light-border shadow-sm overflow-hidden space-y-4 p-5"
          >
            {/* Organization Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-base font-black shadow-xs shrink-0">
                  <i className="fas fa-building"></i>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-dark-primary tracking-tight truncate">
                    {orgName}
                  </h3>
                  <span className="text-xs font-bold text-teal-800 block">
                    {orgEmps.length} Salaried Employee(s)
                  </span>
                </div>
              </div>
              {/* Legend indicators */}
              <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-extrabold flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 justify-start md:justify-end">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs"></span> Paid
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-2xs"></span> Partial
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-2xs"></span> Unpaid
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-600 border border-gray-200/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300 border border-gray-400 inline-block"></span> N/A
                </span>
              </div>
            </div>

            {/* 5 Org-Specific Stat Tiles (Only shown when Grouping is ON) */}
            {groupByOrg && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200 space-y-0.5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-amber-800">
                    <span>Last Month Pending</span>
                    <i className="fas fa-clock-rotate-left text-amber-600"></i>
                  </div>
                  <div className="text-xl font-black text-amber-950">
                    {orgPrevPendingCount}{' '}
                    <span className="text-[11px] font-bold text-amber-700">staff</span>
                  </div>
                </div>

                <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 space-y-0.5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-emerald-800">
                    <span>Paid Count</span>
                    <i className="fas fa-circle-check text-emerald-600"></i>
                  </div>
                  <div className="text-xl font-black text-emerald-950">
                    {orgPaidCount}{' '}
                    <span className="text-[11px] font-bold text-emerald-700">staff</span>
                  </div>
                </div>

                <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-200 space-y-0.5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-rose-800">
                    <span>Unpaid / Partial</span>
                    <i className="fas fa-hourglass-half text-rose-600"></i>
                  </div>
                  <div className="text-xl font-black text-rose-950">
                    {orgUnpaidCount}{' '}
                    <span className="text-[11px] font-bold text-rose-700">staff</span>
                  </div>
                </div>

                <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-200 space-y-0.5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-blue-800">
                    <span>Total Paid</span>
                    <i className="fas fa-money-bill-wave text-blue-600"></i>
                  </div>
                  <div className="text-lg font-black text-blue-950">
                    ₹{orgTotalPaid.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-purple-50/60 p-3 rounded-2xl border border-purple-200 space-y-0.5 col-span-2 sm:col-span-1 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-purple-800">
                    <span>Balance To Pay</span>
                    <i className="fas fa-wallet text-purple-600"></i>
                  </div>
                  <div className="text-lg font-black text-purple-950">
                    ₹{orgBalance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

          {/* Matrix Grid Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-2xs">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead className="bg-gray-50 border-b text-[10px] uppercase tracking-wider text-dark-muted font-bold">
                <tr>
                  <th className="p-3 w-44 sm:w-52 md:w-56 min-w-[170px] sticky left-0 z-20 bg-gray-50 border-r border-gray-200 shadow-xs">
                    Employee
                  </th>
                  {matrixMonths.map((m) => (
                    <th
                      key={`${m.year}-${m.month}`}
                      className={`p-2.5 text-center min-w-[80px] w-24 ${
                        m.isCurrent
                          ? 'bg-teal-100/70 text-teal-900 font-black border-x border-teal-200'
                          : ''
                      }`}
                    >
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orgEmps.map((emp) => {
                  const org = emp.organization || 'Jamia Zaytoonah';
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Employee Info (Sticky Column) */}
                      <td className="p-3 w-44 sm:w-52 md:w-56 min-w-[170px] sticky left-0 z-10 bg-white border-r border-gray-200 shadow-xs">
                        <div className="font-extrabold text-dark-primary text-xs truncate max-w-[150px] sm:max-w-none">
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700 shrink-0">
                            {emp.emp_id || `EMP-${emp.id}`}
                          </span>
                          <span className="text-teal-800 font-bold truncate max-w-[100px]">
                            {emp.designation || 'Teacher'}
                          </span>
                        </div>
                      </td>

                      {/* Month Swatches */}
                      {matrixMonths.map((m) => {
                        const key = `${emp.id}_${org}_${m.year}_${m.month}`;
                        const record = matrixLookupMap.get(key);

                        let swatchStyle =
                          'bg-gray-100 text-gray-400 border border-gray-300 hover:bg-gray-200';
                        let swatchStatus = 'N/A';
                        let paidAmt = 0;
                        let payableAmt = Number(emp.current_salary) || 0;

                        if (record) {
                          const baseSal =
                            Number(record.salary != null ? record.salary : emp.current_salary) || 0;
                          const extras = Number(record.extras) || 0;
                          const deductions = Number(record.deductions) || 0;
                          payableAmt = baseSal + extras - deductions;
                          paidAmt = Number(record.total_paid) || 0;
                          const bal = Math.max(0, payableAmt - paidAmt);

                          if (bal <= 0 && paidAmt > 0) {
                            swatchStyle =
                              'bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-2xs';
                            swatchStatus = 'Fully Paid';
                          } else if (paidAmt > 0 && bal > 0) {
                            swatchStyle =
                              'bg-amber-500 hover:bg-amber-600 text-white font-black shadow-2xs';
                            swatchStatus = 'Partially Paid';
                          } else {
                            swatchStyle =
                              'bg-rose-500 hover:bg-rose-600 text-white font-black shadow-2xs';
                            swatchStatus = 'Unpaid';
                          }
                        }

                        return (
                          <td
                            key={`${m.year}-${m.month}`}
                            className={`p-2 text-center min-w-[80px] w-24 ${
                              m.isCurrent ? 'bg-teal-50/40 border-x border-teal-100' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenMatrixPaymentModal(emp, m)}
                              className={`w-full py-1.5 px-1 rounded-xl text-[10px] transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95 ${swatchStyle}`}
                              title={`${emp.name} (${m.label}): ${swatchStatus} - Paid ₹${paidAmt.toLocaleString(
                                'en-IN'
                              )} of ₹${payableAmt.toLocaleString(
                                'en-IN'
                              )}. Click to record payment settlement.`}
                            >
                              <span>{m.label.split(' ')[0]}</span>
                              {record ? (
                                <span className="text-[9px] opacity-90 font-mono">
                                  ₹{paidAmt >= 1000 ? `${(paidAmt / 1000).toFixed(2)}k` : paidAmt}
                                </span>
                              ) : (
                                <span className="text-[8px] opacity-60">-</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    })}
    </div>
  );
};

export default SalaryDashboardMatrixView;
