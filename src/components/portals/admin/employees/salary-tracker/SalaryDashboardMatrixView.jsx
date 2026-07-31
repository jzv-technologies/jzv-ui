import React from 'react';

const SalaryDashboardMatrixView = ({
  matrixFilteredGroupedEmployees,
  matrixMonths,
  matrixLookupMap,
  handleOpenMatrixPaymentModal,
}) => {
  if (matrixFilteredGroupedEmployees.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-3xl border border-light-border border-dashed">
        <i className="fas fa-folder-open text-4xl text-gray-300 mb-3"></i>
        <h3 className="text-base font-extrabold text-dark-primary">No Matching Records Found</h3>
        <p className="text-xs text-dark-muted mt-1">
          No salaried employees match your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {matrixFilteredGroupedEmployees.map(([orgName, orgEmps]) => (
        <div
          key={orgName}
          className="bg-white rounded-3xl border border-light-border shadow-sm overflow-hidden space-y-4 p-5"
        >
          {/* Organization Card Header with Table Color Legends */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
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

            {/* Table Status Color Legends */}
            <div className="flex items-center gap-3 text-xs font-bold shrink-0 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Paid
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Partial
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Unpaid
              </span>
              <span className="inline-flex items-center gap-1 text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-200 border border-gray-300 inline-block"></span>{' '}
                Uninitialized
              </span>
            </div>
          </div>

          {/* Dedicated Table for this Org */}
          <div className="overflow-x-auto border border-gray-200 rounded-2xl">
            <table className="w-full text-left text-xs font-semibold min-w-[850px]">
              <thead className="bg-teal-50/70 border-b border-teal-100 text-[10px] uppercase tracking-wider text-teal-950 font-black">
                <tr>
                  <th className="p-3 min-w-[240px]">Employee Details</th>
                  {matrixMonths.map((m) => (
                    <th
                      key={`${m.year}-${m.month}`}
                      className={`p-2.5 text-center min-w-[75px] ${
                        m.isCurrent
                          ? 'bg-teal-100 text-teal-950 font-black border-x border-teal-200'
                          : ''
                      }`}
                    >
                      {m.label}
                      {m.isCurrent && (
                        <span className="block text-[8px] uppercase tracking-tighter text-teal-800">
                          (Selected)
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orgEmps.map((emp) => {
                  const org = emp.organization || 'Jamia Zaytoonah';
                  return (
                    <tr key={emp.id} className="hover:bg-teal-50/20 transition-colors">
                      {/* Single Combined Column for ID, Employee & Org */}
                      <td className="p-3">
                        <div className="font-extrabold text-dark-primary text-xs">{emp.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{emp.emp_id || `ID: ${emp.id}`} | </span>
                          <span className="text-teal-800 font-bold">{org}</span>
                        </div>
                      </td>

                      {/* 9 Month Swatches */}
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
