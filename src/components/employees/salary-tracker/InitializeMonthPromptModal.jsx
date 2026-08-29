import React from 'react';

const InitializeMonthPromptModal = ({
  isOpen,
  onClose,
  monthObj,
  employee,
  totalEmployees,
  onInitializeAll,
  onInitializeSingle,
  initializing = false,
}) => {
  if (!isOpen || !monthObj || !employee) return null;

  const monthLabel = monthObj.label || `${monthObj.month}/${monthObj.year}`;
  const empName = employee.name || 'Selected Employee';
  const empId = employee.emp_id || `ID: ${employee.id}`;
  const empSalary = Number(employee.current_salary) || 0;
  const orgName = employee.organization || 'Jamia Zaytoonah';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden space-y-0 transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-teal-100 border border-white/20 text-lg">
              <i className="fas fa-calendar-plus"></i>
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Initialize Salary Records
              </h3>
              <p className="text-xs text-teal-100 font-medium">
                Target Period: {monthLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={initializing}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 text-sm">
              <i className="fas fa-info"></i>
            </div>
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-bold">
                Salary records for <span className="font-extrabold text-amber-950 underline">{monthLabel}</span> are not initialized yet.
              </p>
              <p className="mt-1 text-[11px] text-amber-800">
                Would you like to initialize salary entries for all active salaried staff for this month, or initialize and update only for <strong>{empName}</strong>?
              </p>
            </div>
          </div>

          {/* Selected Employee Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-2">
            <div className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider">
              Selected Employee Details
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-dark-primary">{empName}</div>
                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                  <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-700 font-bold mr-1.5">
                    {empId}
                  </span>
                  <span>{employee.designation || 'Staff'}</span> • <span>{orgName}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 font-bold">Current Base Salary</div>
                <div className="text-sm font-black text-teal-700">
                  ₹{empSalary.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-2">
            {/* Option 1: Initialize All */}
            <button
              type="button"
              disabled={initializing}
              onClick={onInitializeAll}
              className="w-full p-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-between active:scale-[0.99] disabled:opacity-50 cursor-pointer group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <i className={`fas ${initializing ? 'fa-spinner fa-spin' : 'fa-users'}`}></i>
                </div>
                <div>
                  <div className="font-black text-xs">
                    Initialize for All Staff ({totalEmployees} employees)
                  </div>
                  <div className="text-[10px] text-teal-100 font-normal">
                    Create records for all active employees and proceed to payment
                  </div>
                </div>
              </div>
              <i className="fas fa-arrow-right text-teal-200 group-hover:translate-x-1 transition-transform"></i>
            </button>

            {/* Option 2: Only Selected Employee */}
            <button
              type="button"
              disabled={initializing}
              onClick={onInitializeSingle}
              className="w-full p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-extrabold text-xs transition-all flex items-center justify-between active:scale-[0.99] disabled:opacity-50 cursor-pointer group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-xl bg-blue-200/70 text-blue-800 flex items-center justify-center">
                  <i className="fas fa-user-check"></i>
                </div>
                <div>
                  <div className="font-black text-xs">
                    Only for {empName.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-blue-700 font-normal">
                    Create entry for {empName} only and open payment settlement
                  </div>
                </div>
              </div>
              <i className="fas fa-arrow-right text-blue-500 group-hover:translate-x-1 transition-transform"></i>
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              disabled={initializing}
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs transition-all text-center active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitializeMonthPromptModal;
