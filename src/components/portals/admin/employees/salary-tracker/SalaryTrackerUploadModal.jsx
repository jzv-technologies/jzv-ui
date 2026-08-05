import React, { useState, useEffect, useMemo } from 'react';
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

const SalaryTrackerUploadModal = ({
  isOpen,
  onClose,
  employees = [],
  matrixTrackerRecords = [],
  onBulkUpsert,
  saving,
}) => {
  const [activeTab, setActiveTab] = useState('grid'); // 'upload' | 'grid'

  // Tab 1: File Upload State
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);

  // Tab 2: Bulk Editable Grid State
  const [gridMonthStr, setGridMonthStr] = useState(() => {
    const now = new Date();
    let prevYear = now.getFullYear();
    let prevMonth = now.getMonth();
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  });

  const [gridData, setGridData] = useState([]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Map for quick existing record lookup: `${emp_id}_${org}_${sal_year}_${sal_month}`
  const existingRecordMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(matrixTrackerRecords)) {
      matrixTrackerRecords.forEach((tr) => {
        const key = `${tr.employee_id}_${tr.organization || ''}_${tr.sal_year}_${tr.sal_month}`;
        map.set(key, tr);
      });
    }
    return map;
  }, [matrixTrackerRecords]);

  // Initialize Grid Data for Tab 2 when gridMonthStr or employees change
  useEffect(() => {
    if (!gridMonthStr) return;
    const parts = gridMonthStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    const rows = employees.map((emp) => {
      const org = emp.organization || 'Jamia Zaytoonah';
      const key = `${emp.id}_${org}_${year}_${month}`;
      const rec = existingRecordMap.get(key);

      const baseSalary = Number(rec?.salary != null ? rec.salary : emp.current_salary) || 0;
      const extras = Number(rec?.extras) || 0;
      const deductions = Number(rec?.deductions) || 0;
      const totalPaid = Number(rec?.total_paid) || 0;
      const notes = rec?.notes || '';

      return {
        emp_id: emp.emp_id || `EMP-${String(emp.id).padStart(3, '0')}`,
        employee_id: emp.id,
        name: emp.name,
        organization: org,
        sal_year: year,
        sal_month: month,
        salary: baseSalary,
        extras: extras,
        deductions: deductions,
        total_paid: totalPaid,
        notes: notes,
        isExisting: !!rec,
        recordId: rec?.id || null,
        isModified: false,
      };
    });

    setGridData(rows);
  }, [gridMonthStr, employees, existingRecordMap]);

  if (!isOpen) return null;

  // --- TAB 1: TEMPLATE DOWNLOAD ---
  const handleDownloadTemplate = () => {
    const templateRows = employees.slice(0, 5).map((emp) => ({
      emp_id: emp.emp_id || `EMP-${String(emp.id).padStart(3, '0')}`,
      org: emp.organization || 'Jamia Zaytoonah',
      sal_year: new Date().getFullYear(),
      sal_month: new Date().getMonth() + 1,
      salary: emp.current_salary || 25000,
      extras: 0,
      deduction: 0,
      total_paid: 0,
      notes: 'Sample Salary Tracker Upload Entry',
    }));

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    XLSX.writeFile(workbook, 'Salary_Tracker_Template.xlsx');
    showToast('Salary Tracker upload template downloaded!', 'success');
  };

  // --- TAB 1: FILE UPLOAD PARSING ---
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!Array.isArray(rawData) || rawData.length === 0) {
          showToast('File is empty or invalid format.', 'error');
          setParsedRows([]);
          setParsing(false);
          return;
        }

        // Match rows with employees (by emp_id AND org, or name AND org)
        const processed = rawData.map((row, idx) => {
          const empIdStr = String(row.emp_id || row.employee_id || row['Emp ID'] || '').trim();
          const orgStr = String(row.org || row.organization || row.Organization || '')
            .trim()
            .toLowerCase();
          const nameStr = String(row.name || row.Name || '')
            .trim()
            .toLowerCase();

          let emp = employees.find((e) => {
            const eEmpId = String(e.emp_id || `EMP-${String(e.id).padStart(3, '0')}`).trim();
            const eOrg = String(e.organization || 'Jamia Zaytoonah')
              .trim()
              .toLowerCase();
            const idMatch = eEmpId === empIdStr || String(e.id) === empIdStr;

            if (orgStr) {
              return idMatch && eOrg === orgStr;
            }
            return idMatch;
          });

          if (!emp && nameStr) {
            emp = employees.find((e) => {
              const eName = String(e.name).trim().toLowerCase();
              const eOrg = String(e.organization || 'Jamia Zaytoonah')
                .trim()
                .toLowerCase();
              if (orgStr) return eName === nameStr && eOrg === orgStr;
              return eName === nameStr;
            });
          }

          const year = parseInt(row.sal_year || row.year || new Date().getFullYear(), 10);
          const month = parseInt(row.sal_month || row.month || new Date().getMonth() + 1, 10);
          const salary = Number(row.salary) || Number(emp?.current_salary) || 0;
          const extras = Number(row.extras) || 0;
          const deduction = Number(row.deduction || row.deductions) || 0;
          const total_paid = Number(row.total_paid || row.paid) || 0;
          const notes = String(row.notes || '');

          const org = emp?.organization || row.org || row.organization || 'Jamia Zaytoonah';
          const key = emp ? `${emp.id}_${org}_${year}_${month}` : '';
          const isExisting = key ? existingRecordMap.has(key) : false;

          return {
            rowIndex: idx + 1,
            emp_id: empIdStr || emp?.emp_id || 'N/A',
            employee_id: emp?.id || null,
            name: emp?.name || nameStr || 'Unknown Employee',
            organization: org,
            sal_year: year,
            sal_month: month,
            salary,
            extras,
            deductions: deduction,
            total_paid,
            notes,
            isValid: !!emp,
            isExisting,
            statusLabel: !emp ? 'Invalid Employee' : isExisting ? 'Update' : 'Insert',
          };
        });

        setParsedRows(processed);
        showToast(`Loaded ${processed.length} row(s) for preview!`, 'info');
      } catch (err) {
        console.error('Failed to parse upload file:', err);
        showToast('Failed to parse file: ' + err.message, 'error');
      } finally {
        setParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteUploadSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showToast('No valid rows found to upload/update.', 'error');
      return;
    }

    const payload = validRows.map((r) => ({
      employee_id: r.employee_id,
      organization: r.organization,
      sal_year: r.sal_year,
      sal_month: r.sal_month,
      salary: r.salary,
      extras: r.extras,
      deductions: r.deductions,
      total_paid: r.total_paid,
      notes: r.notes,
    }));

    await onBulkUpsert(payload);
    setParsedRows([]);
    setFileName('');
    onClose();
  };

  // --- TAB 2: BULK EDITABLE GRID HANDLERS ---
  const handleGridCellChange = (index, field, value) => {
    const updated = [...gridData];
    const item = { ...updated[index], [field]: value, isModified: true };
    updated[index] = item;
    setGridData(updated);
  };

  const handleSaveGridBulk = async () => {
    const modifiedRows = gridData.filter((r) => r.isModified);
    if (modifiedRows.length === 0) {
      showToast('No rows modified in the grid.', 'info');
      return;
    }

    const payload = modifiedRows.map((r) => ({
      employee_id: r.employee_id,
      organization: r.organization,
      sal_year: r.sal_year,
      sal_month: r.sal_month,
      salary: Number(r.salary) || 0,
      extras: Number(r.extras) || 0,
      deductions: Number(r.deductions) || 0,
      total_paid: Number(r.total_paid) || 0,
      notes: r.notes || '',
    }));

    await onBulkUpsert(payload);
    showToast(`Bulk updated ${payload.length} row(s) successfully!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-dark-almostblack/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-4xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg shadow-2xs">
              <i className="fas fa-file-csv text-emerald-600"></i>
            </div>
            <div>
              <h3 className="text-base font-black text-dark-primary">
                Update Monthly Salary Tracker
              </h3>
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'grid'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-gray-100 text-dark-soft hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-table text-amber-500"></i> Bulk Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-gray-100 text-dark-soft hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-cloud-arrow-up"></i> Bulk Upload
          </button>
        </div>

        {/* --- TAB 1 CONTENT: EXCEL / CSV BULK UPLOAD --- */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* Controls: Template Download & File Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-teal-50/50 p-4 rounded-2xl border border-teal-200">
              <div>
                <h4 className="text-xs font-extrabold text-teal-950">Bulk File Upload</h4>
                <p className="text-[11px] text-teal-800 font-semibold">
                  Required columns:{' '}
                  <code>
                    emp_id, org, sal_year, sal_month, salary, extras, deduction, total_paid, notes
                  </code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 rounded-xl text-xs font-extrabold transition-all shadow-2xs flex items-center gap-1.5 active:scale-95 shrink-0"
                >
                  <i className="fas fa-download text-teal-600"></i> Template (.xlsx)
                </button>

                <label className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0">
                  <i className="fas fa-folder-open"></i> Select File
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {fileName && (
              <div className="text-xs font-bold text-dark-primary flex items-center gap-2">
                <i className="fas fa-file-arrow-up text-teal-600"></i>
                Loaded File:{' '}
                <span className="font-mono text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {fileName}
                </span>
              </div>
            )}

            {/* File Data Preview Grid */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-dark-primary">
                  <span>Pre-Validation Preview ({parsedRows.length} Rows):</span>
                  <span className="text-[10px] text-gray-500 font-semibold">
                    Green = Update existing DB row, Blue = Insert new DB row
                  </span>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-2xl max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead className="bg-gray-50 border-b text-[10px] uppercase font-bold text-gray-600 sticky top-0 bg-gray-50">
                      <tr>
                        <th className="p-2.5 text-center">Row</th>
                        <th className="p-2.5">Emp ID / Name</th>
                        <th className="p-2.5">Org</th>
                        <th className="p-2.5 text-center">Month/Year</th>
                        <th className="p-2.5 text-right">Salary</th>
                        <th className="p-2.5 text-right">Extras</th>
                        <th className="p-2.5 text-right">Deductions</th>
                        <th className="p-2.5 text-right">Total Paid</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedRows.map((r) => (
                        <tr
                          key={r.rowIndex}
                          className={!r.isValid ? 'bg-rose-50/60' : 'hover:bg-gray-50'}
                        >
                          <td className="p-2.5 text-center font-bold text-gray-500">
                            #{r.rowIndex}
                          </td>
                          <td className="p-2.5">
                            <div className="font-black text-dark-primary">{r.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{r.emp_id}</div>
                          </td>
                          <td className="p-2.5 font-bold text-gray-600 truncate max-w-[120px]">
                            {r.organization}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {r.sal_month}/{r.sal_year}
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            ₹{r.salary.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-700">
                            ₹{r.extras.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-right font-mono text-rose-700">
                            ₹{r.deductions.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-right font-black text-teal-800">
                            ₹{r.total_paid.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                !r.isValid
                                  ? 'bg-rose-100 text-rose-800'
                                  : r.isExisting
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                            >
                              {r.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2 CONTENT: INTERACTIVE BULK EDITABLE GRID --- */}
        {activeTab === 'grid' && (
          <div className="space-y-4">
            {/* Month Selector for Grid */}
            <div className="flex items-center justify-between gap-3 bg-amber-50/60 p-3 rounded-2xl border border-amber-200">
              <div className="flex items-center gap-2">
                <i className="fas fa-calendar-days text-amber-700 text-sm"></i>
                <span className="text-xs font-black text-amber-950">
                  Select Target Month for Grid Edit:
                </span>
                <input
                  type="month"
                  value={gridMonthStr}
                  onChange={(e) => setGridMonthStr(e.target.value)}
                  className="px-3 py-1 bg-white border border-amber-300 rounded-xl text-xs font-extrabold text-amber-950 outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-2xs"
                />
              </div>
              <span className="text-[11px] font-extrabold text-amber-800">
                Editing {gridData.length} Employee(s)
              </span>
            </div>

            {/* Editable Spreadsheet Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-2xl max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs font-semibold min-w-[750px]">
                <thead className="bg-gray-100 border-b text-[10px] uppercase font-bold text-gray-700 sticky top-0">
                  <tr>
                    <th className="p-3 w-44">Employee</th>
                    <th className="p-3 w-28">Base Salary (₹)</th>
                    <th className="p-3 w-24">Extras (₹)</th>
                    <th className="p-3 w-24">Deductions (₹)</th>
                    <th className="p-3 w-28">Total Paid (₹)</th>
                    <th className="p-3 w-24 text-right">Balance</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gridData.map((row, idx) => {
                    const payable =
                      (Number(row.salary) || 0) +
                      (Number(row.extras) || 0) -
                      (Number(row.deductions) || 0);
                    const bal = Math.max(0, payable - (Number(row.total_paid) || 0));

                    return (
                      <tr
                        key={row.employee_id}
                        className={row.isModified ? 'bg-amber-50/50' : 'hover:bg-gray-50'}
                      >
                        <td className="p-2.5">
                          <div className="font-extrabold text-dark-primary">{row.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{row.emp_id}</div>
                        </td>

                        {/* Salary Input */}
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.salary}
                            onChange={(e) => handleGridCellChange(idx, 'salary', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-teal-400"
                          />
                        </td>

                        {/* Extras Input */}
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.extras}
                            onChange={(e) => handleGridCellChange(idx, 'extras', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50/40 outline-none focus:ring-2 focus:ring-teal-400"
                          />
                        </td>

                        {/* Deductions Input */}
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.deductions}
                            onChange={(e) =>
                              handleGridCellChange(idx, 'deductions', e.target.value)
                            }
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-rose-800 bg-rose-50/40 outline-none focus:ring-2 focus:ring-teal-400"
                          />
                        </td>

                        {/* Total Paid Input */}
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.total_paid}
                            onChange={(e) =>
                              handleGridCellChange(idx, 'total_paid', e.target.value)
                            }
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-black text-teal-900 bg-teal-50/40 outline-none focus:ring-2 focus:ring-teal-400"
                          />
                        </td>

                        {/* Calculated Balance */}
                        <td className="p-2.5 text-right font-black">
                          <span
                            className={
                              bal === 0
                                ? 'text-emerald-700'
                                : row.total_paid > 0
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                            }
                          >
                            ₹{bal.toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Notes Input */}
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Optional notes..."
                            value={row.notes}
                            onChange={(e) => handleGridCellChange(idx, 'notes', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-dark-soft outline-none focus:ring-2 focus:ring-teal-400"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between border-t pt-3.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
          >
            Cancel
          </button>

          {activeTab === 'upload' ? (
            <button
              type="button"
              disabled={parsedRows.length === 0 || saving}
              onClick={handleExecuteUploadSubmit}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-check-double"></i> Upload & Upsert Rows (
              {parsedRows.filter((r) => r.isValid).length})
            </button>
          ) : (
            <button
              type="button"
              disabled={gridData.filter((r) => r.isModified).length === 0 || saving}
              onClick={handleSaveGridBulk}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-floppy-disk"></i> Save Grid Payments (
              {gridData.filter((r) => r.isModified).length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalaryTrackerUploadModal;
