import React from 'react';

const SalaryDashboardMatrixView = ({
  matrixFilteredGroupedEmployees,
  matrixMonths,
  matrixLookupMap,
  handleOpenMatrixPaymentModal,
}) => {
  return (
    <div className="space-y-8">
      {matrixFilteredGroupedEmployees.map(([orgName, orgEmps]) => (
        <div
          key={orgName}
          className="bg-white rounded-3xl border border-light-border shadow-sm overflow-hidden space-y-4 p-5"
        >
          {/* Organization Header */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-base font-black shadow-xs">
                <i className="fas fa-building"></i>
              </div>
              <div>
                <h3 className="text-base font-black text-dark-primary">{orgName}</h3>
                <span className="text-xs font-bold text-teal-800">
                  {orgEmps.length} Salaried Employee(s)
                </span>
              </div>
            </div>
            {/* Legend indicators */}
            <div className="flex items-center gap-3 text-[11px] font-extrabold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Paid
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Partial
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span> Unpaid
              </span>
              <span className="flex items-center gap-1.5 text-gray-500">
                <span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300 inline-block"></span> Uninitialized
              </span>
            </div>
          </div>

          {/* Matrix Grid Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-2xs">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead className="bg-gray-50 border-b text-[10px] uppercase tracking-wider text-dark-muted font-bold">
                <tr>
                  <th className="p-3.5 w-56">Employee</th>
                  <th className="p-3.5 w-28 text-right">Base Salary</th>
                  {matrixMonths.map((m) => (
                    <th
                      key={`${m.year}-${m.month}`}
                      className={`p-3 text-center ${
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
                      {/* Employee Info */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-dark-primary text-xs">{emp.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">
                            {emp.emp_id || `EMP-${emp.id}`}
                          </span>
                          <span className="text-teal-800 font-bold truncate max-w-[110px]">
                            {emp.designation || 'Teacher'}
                          </span>
                        </div>
                      </td>

                      {/* Current Salary */}
                      <td className="p-3.5 text-right font-black text-emerald-700 text-xs">
                        ₹{Number(emp.current_salary || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Month Swatches */}
                      {matrixMonths.map((m) => {
                        const key = `${emp.id}_${org}_${m.year}_${m.month}`;
                        const record = matrixLookupMap.get(key);

                        let swatchStyle =
                          'bg-gray-100 text-gray-400 border border-gray-300 hover:bg-gray-200';
                        let swatchStatus = 'Uninitialized';
                        let paidAmt = 0;
                        let payableAmt = Number(emp.current_salary) || 0;

                        if (record) {
                          const baseSal =
                            Number(record.salary != null ? record.salary : emp.current_salary) ||
                            0;
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
                            className={`p-2 text-center ${
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
                                  ₹{paidAmt >= 1000 ? `${(paidAmt / 1000).toFixed(0)}k` : paidAmt}
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
      ))}
    </div>
  );
};

export default SalaryDashboardMatrixView;
