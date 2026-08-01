import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { showToast } from '../../../../../utils/toast';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const SalaryTrackerExportModal = ({
  isOpen,
  onClose,
  employees = [],
  matrixTrackerRecords = [],
}) => {
  // Generate last 12 months array (including current month)
  const last12Months = useMemo(() => {
    const months = [];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1; // 1-based

    for (let i = 11; i >= 0; i--) {
      let d = new Date(curYear, curMonth - 1 - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[month - 1]} ${year}`;
      const isCurrent = year === curYear && month === curMonth;
      months.push({ year, month, monthStr, label, isCurrent });
    }
    return months;
  }, []);

  // Default selection: Previous month
  const defaultPrevMonthKey = useMemo(() => {
    const now = new Date();
    let prevYear = now.getFullYear();
    let prevMonth = now.getMonth(); // 0-based for prev month
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  }, []);

  const [selectedMonthKeys, setSelectedMonthKeys] = useState(() => [defaultPrevMonthKey]);

  if (!isOpen) return null;

  const toggleMonth = (key) => {
    if (selectedMonthKeys.includes(key)) {
      if (selectedMonthKeys.length === 1) {
        showToast('At least one month must be selected for download.', 'info');
        return;
      }
      setSelectedMonthKeys(selectedMonthKeys.filter((k) => k !== key));
    } else {
      setSelectedMonthKeys([...selectedMonthKeys, key]);
    }
  };

  const handleSelectAll = () => {
    setSelectedMonthKeys(last12Months.map((m) => m.monthStr));
  };

  const handleSelectPrevOnly = () => {
    setSelectedMonthKeys([defaultPrevMonthKey]);
  };

  const handleExecuteExport = () => {
    if (selectedMonthKeys.length === 0) {
      showToast('Please select at least one month to export.', 'error');
      return;
    }

    // Map records for quick lookup: `${emp_id}_${org}_${sal_year}_${sal_month}`
    const trackerLookup = new Map();
    if (Array.isArray(matrixTrackerRecords)) {
      matrixTrackerRecords.forEach((tr) => {
        const key = `${tr.employee_id}_${tr.organization || ''}_${tr.sal_year}_${tr.sal_month}`;
        trackerLookup.set(key, tr);
      });
    }

    const exportRows = [];

    // Filter target months
    const targetMonths = last12Months.filter((m) => selectedMonthKeys.includes(m.monthStr));

    targetMonths.forEach((m) => {
      employees.forEach((emp) => {
        const org = emp.organization || 'Jamia Zaytoonah';
        const key = `${emp.id}_${org}_${m.year}_${m.month}`;
        const record = trackerLookup.get(key);

        const baseSalary = Number(record?.salary != null ? record.salary : emp.current_salary) || 0;
        const extras = Number(record?.extras) || 0;
        const deductions = Number(record?.deductions) || 0;
        const totalPayable = baseSalary + extras - deductions;
        const totalPaid = Number(record?.total_paid) || 0;
        const balance = Math.max(0, totalPayable - totalPaid);

        exportRows.push({
          'Emp ID': emp.emp_id || `EMP-${String(emp.id).padStart(3, '0')}`,
          Name: emp.name,
          Org: org,
          sal_year: m.year,
          sal_month: m.month,
          salary: baseSalary,
          extras: extras,
          deduction: deductions,
          total_paid: totalPaid,
          balance: balance,
        });
      });
    });

    if (exportRows.length === 0) {
      showToast('No employee salary data found for the selected month(s).', 'warning');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Tracker');

    const fileName =
      targetMonths.length === 1
        ? `Salary_Tracker_${targetMonths[0].monthStr}.xlsx`
        : `Salary_Tracker_${targetMonths.length}_Months.xlsx`;

    XLSX.writeFile(workbook, fileName);
    showToast(`Successfully downloaded ${exportRows.length} records in Excel!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-dark-almostblack/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-200 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-black text-lg shadow-2xs">
              <i className="fas fa-file-excel text-teal-600"></i>
            </div>
            <div>
              <h3 className="text-base font-black text-dark-primary">Download Salary Tracker</h3>
              <p className="text-xs text-dark-muted font-bold">
                Select one or multiple months (Last 12 Months)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all"
          >
            <i className="fas fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex items-center justify-between text-xs font-extrabold text-dark-soft">
          <span>Select Months to Download ({selectedMonthKeys.length} selected):</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectPrevOnly}
              className="text-teal-700 hover:text-teal-900 underline text-[11px]"
            >
              Default (Previous Month)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-teal-700 hover:text-teal-900 underline text-[11px]"
            >
              Select All 12 Months
            </button>
          </div>
        </div>

        {/* 12 Month Swatches */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
          {last12Months.map((m) => {
            const isSelected = selectedMonthKeys.includes(m.monthStr);
            const isPrevMonth = m.monthStr === defaultPrevMonthKey;

            return (
              <button
                key={m.monthStr}
                type="button"
                onClick={() => toggleMonth(m.monthStr)}
                className={`p-3 rounded-2xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer relative ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-300/60'
                    : 'bg-white text-dark-soft border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'
                }`}
              >
                {isPrevMonth && (
                  <span
                    className={`absolute -top-2 px-1.5 py-0.2 text-[8px] uppercase tracking-wider rounded-full font-black ${
                      isSelected
                        ? 'bg-amber-400 text-amber-950'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    Default
                  </span>
                )}
                <span className="text-xs tracking-tight">{m.label}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-teal-700/80 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Click to select'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Export Column Summary */}
        <div className="bg-teal-50/60 p-3 rounded-2xl border border-teal-200/80 space-y-1">
          <span className="text-[11px] font-black text-teal-950 uppercase tracking-wider block">
            Included Columns in Export:
          </span>
          <p className="text-[11px] font-bold text-teal-900 leading-relaxed">
            Emp ID, Name, Org, sal_year, sal_month, salary, extras, deduction, total_paid, balance
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteExport}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <i className="fas fa-download"></i> Download Excel (.xlsx)
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalaryTrackerExportModal;
