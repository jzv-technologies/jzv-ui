import React from 'react';
import SalaryTrackerTable from './SalaryTrackerTable';

const SalaryPaymentLogView = ({
  trackerRecords,
  groupedByOrgItems,
  prevMonthPendingMap,
  salMonth,
  salYear,
  initializing,
  canUpdateSalaryTracker,
  handleInitializeMonthRecords,
  handleOpenExtrasModal,
  handleOpenPaymentModal,
}) => {
  if (trackerRecords.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-3xl border border-teal-200 border-dashed space-y-4">
        <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto text-3xl">
          <i className="fas fa-calendar-plus"></i>
        </div>
        <div>
          <h3 className="text-base font-extrabold text-dark-primary">
            Salary Records Not Initialized for {salMonth}/{salYear}
          </h3>
          <p className="text-xs text-dark-muted mt-1 max-w-md mx-auto">
            No salary tracker entries exist for this month in the database yet. Click below to
            populate tracker records from active salaried employees.
          </p>
        </div>
        <button
          onClick={handleInitializeMonthRecords}
          disabled={initializing || !canUpdateSalaryTracker}
          className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all inline-flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <i
            className={`fas ${initializing ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}
          ></i>
          {initializing
            ? 'Initializing Month Records...'
            : `Initialize ${salMonth}/${salYear} Salary Records`}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedByOrgItems.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-light-border border-dashed">
          <i className="fas fa-folder-open text-4xl text-gray-300 mb-3"></i>
          <h3 className="text-base font-extrabold text-dark-primary">No Matching Records Found</h3>
          <p className="text-xs text-dark-muted mt-1">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByOrgItems.map(([orgName, orgItems]) => {
            let orgPaidCount = 0;
            let orgUnpaidCount = 0;
            let orgTotalPaid = 0;
            let orgBalance = 0;
            let orgPrevPendingCount = 0;

            orgItems.forEach((item) => {
              if (item.status === 'paid') orgPaidCount++;
              else orgUnpaidCount++;
              orgTotalPaid += item.totalPaid;
              orgBalance += item.balance;

              const prevKey = `${item.emp.id}_${orgName}`;
              if (prevMonthPendingMap.has(prevKey)) orgPrevPendingCount++;
            });

            return (
              <div
                key={orgName}
                className="bg-white rounded-3xl border border-light-border shadow-sm overflow-hidden space-y-4 p-5"
              >
                {/* Organization Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-base font-black shadow-xs">
                      <i className="fas fa-building"></i>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-dark-primary">{orgName}</h3>
                      <span className="text-xs font-bold text-teal-800">
                        {orgItems.length} Salaried Employee(s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5 Org-Specific Stat Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-amber-800">
                      <span>Last Month Pending</span>
                      <i className="fas fa-clock-rotate-left text-amber-600"></i>
                    </div>
                    <div className="text-xl font-black text-amber-950">
                      {orgPrevPendingCount}{' '}
                      <span className="text-[11px] font-bold text-amber-700">staff</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-emerald-800">
                      <span>Paid Count</span>
                      <i className="fas fa-circle-check text-emerald-600"></i>
                    </div>
                    <div className="text-xl font-black text-emerald-950">
                      {orgPaidCount}{' '}
                      <span className="text-[11px] font-bold text-emerald-700">staff</span>
                    </div>
                  </div>

                  <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-200 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-rose-800">
                      <span>Unpaid / Partial</span>
                      <i className="fas fa-hourglass-half text-rose-600"></i>
                    </div>
                    <div className="text-xl font-black text-rose-950">
                      {orgUnpaidCount}{' '}
                      <span className="text-[11px] font-bold text-rose-700">staff</span>
                    </div>
                  </div>

                  <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-200 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-blue-800">
                      <span>Total Paid</span>
                      <i className="fas fa-money-bill-wave text-blue-600"></i>
                    </div>
                    <div className="text-lg font-black text-blue-950">
                      ₹{orgTotalPaid.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="bg-purple-50/60 p-3 rounded-2xl border border-purple-200 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-purple-800">
                      <span>Balance To Pay</span>
                      <i className="fas fa-wallet text-purple-600"></i>
                    </div>
                    <div className="text-lg font-black text-purple-950">
                      ₹{orgBalance.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Org Salary Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-2xs">
                  <SalaryTrackerTable
                    items={orgItems}
                    onOpenExtras={handleOpenExtrasModal}
                    onOpenPayment={handleOpenPaymentModal}
                    canUpdate={canUpdateSalaryTracker}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SalaryPaymentLogView;
