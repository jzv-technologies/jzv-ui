import React from 'react';

const SalaryTrackerHeader = ({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  selectedMonthStr,
  setSelectedMonthStr,
  cumulativeStats,
  statusFilter,
  setStatusFilter,
}) => {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-3xl border border-light-border shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-dark-primary tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <i className="fas fa-sack-dollar text-xl"></i>
            </div>
            Salary Distribution Log
          </h1>
        </div>

        {/* Top Controls: Search Input, View Switcher Tabs & Month Selector */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Main Header Search Input */}
          <div className="relative w-full sm:w-64">
            <i className="fas fa-search absolute left-3.5 top-2.5 text-gray-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search Employee, ID, Designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-300 outline-none"
            />
          </div>

          {/* View Mode Switcher */}
          <div className="inline-flex p-1 bg-gray-100 rounded-2xl border border-gray-200 justify-center">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-dark-soft hover:bg-gray-200/80'
              }`}
            >
              <i className="fas fa-table-cells"></i> Dashboard
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                viewMode === 'monthly'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-dark-soft hover:bg-gray-200/80'
              }`}
            >
              <i className="fas fa-building"></i> Payment Log
            </button>
          </div>

          {/* Month Selector */}
          <div className="flex items-center justify-between gap-2 bg-teal-50/70 p-1.5 rounded-2xl border border-teal-200">
            <label className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5 px-1 shrink-0">
              <i className="fas fa-calendar-day text-teal-600"></i>
            </label>
            <input
              type="month"
              value={selectedMonthStr}
              onChange={(e) => setSelectedMonthStr(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-white border border-teal-300 rounded-xl text-xs font-extrabold text-teal-950 outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Cumulative Stats Tiles Across All Organizations */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 border-t pt-4">
        <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 space-y-0.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">
            <span>Last Month Pending</span>
            <i className="fas fa-clock-rotate-left text-amber-600"></i>
          </div>
          <div className="text-xl font-black text-amber-950">
            {cumulativeStats.prevPendingCount}{' '}
            <span className="text-[11px] font-bold text-amber-700">staff</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 space-y-0.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">
            <span>Paid Count</span>
            <i className="fas fa-circle-check text-emerald-600"></i>
          </div>
          <div className="text-xl font-black text-emerald-950">{cumulativeStats.paidCount} </div>
        </div>

        <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200 space-y-0.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-rose-800 tracking-wider">
            <span>Unpaid / Partial</span>
            <i className="fas fa-hourglass-half text-rose-600"></i>
          </div>
          <div className="text-xl font-black text-rose-950">
            {cumulativeStats.unpaidCount}{' '}
            <span className="text-[11px] font-bold text-rose-700">staff</span>
          </div>
        </div>

        <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200 space-y-0.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-blue-800 tracking-wider">
            <span>Total Paid</span>
            <i className="fas fa-money-bill-wave text-blue-600"></i>
          </div>
          <div className="text-lg font-black text-blue-950">
            ₹{cumulativeStats.totalPaid.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200 space-y-0.5 shadow-2xs min-[420px]:col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-purple-800 tracking-wider">
            <span>Balance To Pay</span>
            <i className="fas fa-wallet text-purple-600"></i>
          </div>
          <div className="text-lg font-black text-purple-950">
            ₹{cumulativeStats.totalBalance.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Global Status Filter Bar */}
      <div className="flex items-center gap-2 border-t pt-3 flex-wrap">
        <span className="text-xs font-extrabold text-dark-primary flex items-center gap-1.5 mr-1">
          <i className="fas fa-filter text-teal-600"></i>
        </span>

        {/* Paid Tickbox */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-extrabold transition-all cursor-pointer ${
            statusFilter === 'paid'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
              : 'bg-white border-emerald-500 text-emerald-700 hover:bg-emerald-50/60'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] transition-colors ${
              statusFilter === 'paid'
                ? 'border-white bg-white text-emerald-600'
                : 'border-emerald-500 bg-white text-transparent'
            }`}
          >
            <i className="fas fa-check"></i>
          </span>
          Paid
        </button>

        {/* Partial Tickbox */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'partial' ? 'all' : 'partial')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-extrabold transition-all cursor-pointer ${
            statusFilter === 'partial'
              ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
              : 'bg-white border-amber-500 text-amber-700 hover:bg-amber-50/60'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] transition-colors ${
              statusFilter === 'partial'
                ? 'border-white bg-white text-amber-600'
                : 'border-amber-500 bg-white text-transparent'
            }`}
          >
            <i className="fas fa-check"></i>
          </span>
          Partial
        </button>

        {/* Unpaid Tickbox */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'unpaid' ? 'all' : 'unpaid')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-extrabold transition-all cursor-pointer ${
            statusFilter === 'unpaid'
              ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
              : 'bg-white border-rose-500 text-rose-700 hover:bg-rose-50/60'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] transition-colors ${
              statusFilter === 'unpaid'
                ? 'border-white bg-white text-rose-600'
                : 'border-rose-500 bg-white text-transparent'
            }`}
          >
            <i className="fas fa-check"></i>
          </span>
          Unpaid
        </button>
      </div>
    </div>
  );
};

export default SalaryTrackerHeader;
