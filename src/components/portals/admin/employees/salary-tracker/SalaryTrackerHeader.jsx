import React from 'react';
import MonthSwatches from './MonthSwatches';

const SalaryTrackerHeader = ({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  groupByOrg = true,
  setGroupByOrg,
  selectedMonthStr,
  setSelectedMonthStr,
  cumulativeStats,
  statusFilter,
  setStatusFilter,
  onRefresh,
  loading,
  onOpenBulkIncrement,
  onOpenExport,
  onOpenUpload,
  hideHeaderTopRow = false,
}) => {
  // If top row is hidden AND grouping is ON (so middle stats tiles are also hidden), hide header box completely
  if (hideHeaderTopRow && groupByOrg) {
    return null;
  }

  return (
    <div className="bg-white border border-light-border p-4 sm:p-6 rounded-3xl shadow-sm space-y-4">
      {/* TOP ROW: Title, Download, Upload & View Mode Switcher */}
      {!hideHeaderTopRow && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-auto flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-black text-dark-primary tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <i className="fas fa-sack-dollar text-xl"></i>
              </div>
              Salary Distribution Log
            </h1>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Download & Upload Buttons (50/50 split on mobile) */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
              {onOpenExport && (
                <button
                  type="button"
                  onClick={onOpenExport}
                  className="w-full sm:w-auto px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                  title="Download Salary Tracker Log (Excel)"
                >
                  <i className="fas fa-download text-teal-600"></i>
                  <span>Download</span>
                </button>
              )}

              {onOpenUpload && (
                <button
                  type="button"
                  onClick={onOpenUpload}
                  className="w-full sm:w-auto px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                  title="Upload CSV/Excel or Bulk Edit Payments"
                >
                  <i className="fas fa-file-excel text-amber-600"></i>
                  <span className="truncate">Upload / Bulk Edit</span>
                </button>
              )}
            </div>

            {/* View Mode & Grouping Controls */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Org Grouping Toggle Button */}
              {typeof setGroupByOrg === 'function' && (
                <button
                  type="button"
                  onClick={() => setGroupByOrg((v) => !v)}
                  className={`px-3 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 border cursor-pointer active:scale-95 flex-1 sm:flex-none ${
                    groupByOrg
                      ? 'bg-teal-50 border-teal-200 text-teal-800 shadow-2xs'
                      : 'bg-gray-100 border-gray-200 text-dark-soft hover:bg-gray-200'
                  }`}
                  title={
                    groupByOrg
                      ? 'Currently grouped by Organization. Click for single view for all organizations.'
                      : 'Currently showing single view for all. Click to enable Org grouping.'
                  }
                >
                  <i className={`fas ${groupByOrg ? 'fa-layer-group text-teal-600' : 'fa-list-ul text-gray-500'}`}></i>
                  <span>{groupByOrg ? 'Grouping On' : 'Grouping Off'}</span>
                </button>
              )}

              {/* View Mode Switcher */}
              <div className="inline-flex p-1 bg-gray-100 rounded-2xl border border-gray-200 justify-center flex-1 sm:flex-none">
                <button
                  onClick={() => setViewMode('matrix')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none ${
                    viewMode === 'matrix'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-dark-soft hover:bg-gray-200/80'
                  }`}
                >
                  <i className="fas fa-table-cells"></i> Dashboard
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none ${
                    viewMode === 'monthly'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-dark-soft hover:bg-gray-200/80'
                  }`}
                >
                  <i className="fas fa-building"></i> List View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MIDDLE SECTION: Cumulative Stats Tiles (Only shown when Grouping is OFF) */}
      {!groupByOrg && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 border-t pt-4">
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

          <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200 space-y-0.5 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-purple-800 tracking-wider">
              <span>Balance To Pay</span>
              <i className="fas fa-wallet text-purple-600"></i>
            </div>
            <div className="text-lg font-black text-purple-950">
              ₹{cumulativeStats.totalBalance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM ROW (3rd Row): Search, Month Selector, Refresh & Status Filters (Hidden when controls are in top portal header) */}
      {!hideHeaderTopRow && (
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 border-t pt-3.5">
          {/* Left Side: Search, Month Selector & Refresh Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto">
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

            {/* Month Selector + Refresh Pair */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Org Grouping Toggle Button */}
              {typeof setGroupByOrg === 'function' && (
                <button
                  type="button"
                  onClick={() => setGroupByOrg((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 border cursor-pointer active:scale-95 shrink-0 ${
                    groupByOrg
                      ? 'bg-teal-50 border-teal-200 text-teal-800 shadow-2xs'
                      : 'bg-white border-teal-300 text-dark-soft hover:bg-gray-100'
                  }`}
                  title={
                    groupByOrg
                      ? 'Currently grouped by Organization. Click for single view for all.'
                      : 'Currently showing single view for all. Click to enable Org grouping.'
                  }
                >
                  <i className={`fas ${groupByOrg ? 'fa-layer-group text-teal-600' : 'fa-list-ul text-gray-500'}`}></i>
                  <span>{groupByOrg ? 'Grouping On' : 'Grouping Off'}</span>
                </button>
              )}

              {/* Month Selector Swatches */}
              <MonthSwatches
                selectedMonthStr={selectedMonthStr}
                onChangeMonth={setSelectedMonthStr}
              />

              {/* Refresh Button */}
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={loading}
                  className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 shrink-0"
                  title="Refresh Salary Data"
                >
                  <i
                    className={`fas fa-rotate-right ${
                      loading ? 'fa-spin text-teal-600' : 'text-teal-700'
                    } text-xs`}
                  ></i>
                </button>
              )}
            </div>
          </div>

          {/* Right Side: Bulk Increment & Global Status Filter Badges */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto justify-start xl:justify-end">
            {/* Bulk Increment Button */}
            {onOpenBulkIncrement && (
              <button
                type="button"
                onClick={onOpenBulkIncrement}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 w-full sm:w-auto shrink-0"
                title="Apply Increments in Bulk by Effective Date/Month"
              >
                <i className="fas fa-calendar-check text-emerald-600"></i>
                <span>Bulk Increment</span>
              </button>
            )}

            {/* Filter Badges Container */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start bg-gray-50 sm:bg-transparent p-1.5 sm:p-0 rounded-2xl border border-gray-200 sm:border-0">
              <span className="text-xs font-extrabold text-dark-primary flex items-center gap-1 shrink-0 px-1 sm:px-0">
                <i className="fas fa-filter text-teal-600 text-xs"></i>
                <span>Filter:</span>
              </span>

              {/* Paid Tickbox */}
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
                className={`inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer flex-1 sm:flex-none ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-white border-emerald-500 text-emerald-700 hover:bg-emerald-50/60'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center text-[9px] sm:text-[10px] transition-colors shrink-0 ${
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
                className={`inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer flex-1 sm:flex-none ${
                  statusFilter === 'partial'
                    ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                    : 'bg-white border-amber-500 text-amber-700 hover:bg-amber-50/60'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center text-[9px] sm:text-[10px] transition-colors shrink-0 ${
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
                className={`inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer flex-1 sm:flex-none ${
                  statusFilter === 'unpaid'
                    ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                    : 'bg-white border-rose-500 text-rose-700 hover:bg-rose-50/60'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center text-[9px] sm:text-[10px] transition-colors shrink-0 ${
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
        </div>
      )}
    </div>
  );
};

export default SalaryTrackerHeader;
