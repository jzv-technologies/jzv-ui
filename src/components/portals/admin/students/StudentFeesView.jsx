// src/components/portals/admin/students/StudentFeesView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';

const STUDENT_FEES_STORAGE_KEY = 'jzv_student_fees_local_data';

// Helper to format currency in INR
const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StudentFeesView = ({
  students = [],
  classes = [],
  onRefreshStudents,
  onRegisterControls,
}) => {
  const [feesData, setFeesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    admission_no: '',
    previous_balance: '0',
    mrqu_sponsorship: '0',
    external_sponsorship: '0',
    student_payable: '0',
    write_off: '0',
    total_paid: '0',
  });

  // Bulk Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState('file'); // 'file' | 'text'
  const [importCsvText, setImportCsvText] = useState('');
  const [parsedPreviewRows, setParsedPreviewRows] = useState([]);
  const [importedFileName, setImportedFileName] = useState('');
  const [importing, setImporting] = useState(false);

  // Fetch fees data from Supabase or LocalStorage
  const loadFeesData = async () => {
    setLoading(true);
    try {
      const { data, error: dbErr } = await supabase.from('student_fees').select('*');
      if (dbErr) throw dbErr;

      setFeesData(data || []);
      setIsSupabaseMode(true);
    } catch (e) {
      console.warn('Supabase student_fees table unavailable, using LocalStorage:', e.message);
      setIsSupabaseMode(false);
      const raw = localStorage.getItem(STUDENT_FEES_STORAGE_KEY);
      if (raw) {
        try {
          setFeesData(JSON.parse(raw) || []);
        } catch (err) {
          console.error('Error reading local student fees:', err);
          setFeesData([]);
        }
      } else {
        setFeesData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeesData();
  }, []);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isEditModalOpen) {
          setIsEditModalOpen(false);
        }
        if (isImportModalOpen) {
          setIsImportModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen, isImportModalOpen]);

  // Register controls to parent top panel if callback provided
  useEffect(() => {
    if (onRegisterControls) {
      onRegisterControls({
        searchQuery,
        setSearchQuery,
        selectedClassFilter,
        setSelectedClassFilter,
        loading,
        onRefresh: loadFeesData,
        onOpenImport: () => setIsImportModalOpen(true),
        onExportCsv: handleExportCsv,
      });
    }
  }, [searchQuery, selectedClassFilter, loading, onRegisterControls]);

  // Merge student records with fee records
  const mergedFeeRecords = useMemo(() => {
    const feeMap = new Map();
    feesData.forEach((f) => {
      if (f.admission_no) {
        feeMap.set(String(f.admission_no).trim().toLowerCase(), f);
      }
    });

    return students.map((std) => {
      const admKey = String(std.admission_no || '').trim().toLowerCase();
      const fee = feeMap.get(admKey) || {};

      const prevBal = parseFloat(fee.previous_balance) || 0;
      const mrquSponsor = parseFloat(fee.mrqu_sponsorship) || 0;
      const extSponsor = parseFloat(fee.external_sponsorship) || 0;
      const stdPayable = parseFloat(fee.student_payable) || 0;
      const writeOff = parseFloat(fee.write_off) || 0;
      const totalPaid = parseFloat(fee.total_paid) || 0;

      // Fees Total Payable = sum of (Previous Balance, MRQU Sponsorship, External Sponsorship, Student Payable) - Write-Off
      const totalPayable = prevBal + mrquSponsor + extSponsor + stdPayable - writeOff;
      // Balance = Total Payable - Total Paid
      const balance = totalPayable - totalPaid;

      const cls = classes.find((c) => String(c.id) === String(std.class_id));

      return {
        studentId: std.id,
        admission_no: std.admission_no || 'N/A',
        student_name: std.student_name || 'N/A',
        className: cls ? cls.name : 'Unassigned',
        class_id: std.class_id,
        enrollment: std.enrollment || 'Active',
        fee_id: fee.id || null,
        previous_balance: prevBal,
        mrqu_sponsorship: mrquSponsor,
        external_sponsorship: extSponsor,
        student_payable: stdPayable,
        write_off: writeOff,
        fees_total_payable: totalPayable,
        total_paid: totalPaid,
        balance: balance,
      };
    });
  }, [students, feesData, classes]);

  // Filtered records for search and class selection
  const filteredRecords = useMemo(() => {
    return mergedFeeRecords.filter((rec) => {
      const matchSearch =
        rec.admission_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.student_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = selectedClassFilter
        ? String(rec.class_id) === String(selectedClassFilter)
        : true;
      return matchSearch && matchClass;
    });
  }, [mergedFeeRecords, searchQuery, selectedClassFilter]);

  // Metric sums
  const metrics = useMemo(() => {
    let totalPayableSum = 0;
    let totalPaidSum = 0;
    let totalBalanceSum = 0;

    filteredRecords.forEach((r) => {
      totalPayableSum += r.fees_total_payable;
      totalPaidSum += r.total_paid;
      totalBalanceSum += r.balance;
    });

    return {
      totalPayable: totalPayableSum,
      totalPaid: totalPaidSum,
      totalBalance: totalBalanceSum,
    };
  }, [filteredRecords]);

  // Live modal form calculations
  const liveFormCalculations = useMemo(() => {
    const prev = parseFloat(formData.previous_balance) || 0;
    const mrqu = parseFloat(formData.mrqu_sponsorship) || 0;
    const ext = parseFloat(formData.external_sponsorship) || 0;
    const stdPay = parseFloat(formData.student_payable) || 0;
    const wOff = parseFloat(formData.write_off) || 0;
    const paid = parseFloat(formData.total_paid) || 0;

    const totalPayable = prev + mrqu + ext + stdPay - wOff;
    const balance = totalPayable - paid;

    return { totalPayable, balance };
  }, [formData]);

  // Handle Edit Open
  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setFormData({
      admission_no: rec.admission_no,
      previous_balance: String(rec.previous_balance),
      mrqu_sponsorship: String(rec.mrqu_sponsorship),
      external_sponsorship: String(rec.external_sponsorship),
      student_payable: String(rec.student_payable),
      write_off: String(rec.write_off),
      total_paid: String(rec.total_paid),
    });
    setIsEditModalOpen(true);
  };

  // Save Edit Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!formData.admission_no.trim()) {
      showToast('Admission Number is required.', 'error');
      return;
    }

    setLoading(true);
    const payload = {
      admission_no: formData.admission_no.trim(),
      previous_balance: parseFloat(formData.previous_balance) || 0,
      mrqu_sponsorship: parseFloat(formData.mrqu_sponsorship) || 0,
      external_sponsorship: parseFloat(formData.external_sponsorship) || 0,
      student_payable: parseFloat(formData.student_payable) || 0,
      write_off: parseFloat(formData.write_off) || 0,
      total_paid: parseFloat(formData.total_paid) || 0,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseMode) {
      try {
        const { error } = await supabase
          .from('student_fees')
          .upsert(payload, { onConflict: 'admission_no' });
        if (error) throw error;

        showToast(`Fee record for "${formData.admission_no}" updated successfully.`, 'success');
        setIsEditModalOpen(false);
        await loadFeesData();
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // LocalStorage Mode
      let updatedFees = [...feesData];
      const idx = updatedFees.findIndex(
        (f) =>
          String(f.admission_no).trim().toLowerCase() ===
          String(formData.admission_no).trim().toLowerCase()
      );

      if (idx >= 0) {
        updatedFees[idx] = { ...updatedFees[idx], ...payload };
      } else {
        updatedFees.push({ id: Date.now(), ...payload });
      }

      setFeesData(updatedFees);
      localStorage.setItem(STUDENT_FEES_STORAGE_KEY, JSON.stringify(updatedFees));
      showToast(`Fee record for "${formData.admission_no}" saved locally.`, 'success');
      setIsEditModalOpen(false);
      setLoading(false);
    }
  };

  // Export CSV / XLSX
  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      showToast('No records available to export.', 'error');
      return;
    }

    const exportRows = filteredRecords.map((r) => ({
      'Admission No': r.admission_no,
      'Student Name': r.student_name,
      Class: r.className,
      Enrollment: r.enrollment,
      'Previous Balance': r.previous_balance,
      'MRQU Sponsorship': r.mrqu_sponsorship,
      'External Sponsorship': r.external_sponsorship,
      'Student Payable': r.student_payable,
      'Write-Off': r.write_off,
      'Fees Total Payable': r.fees_total_payable,
      'Total Paid': r.total_paid,
      Balance: r.balance,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Fees');
    XLSX.writeFile(workbook, `Student_Fees_Records_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Student Fees Excel exported successfully.', 'success');
  };

  // Download Template (.xlsx)
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'Admission No': '2024-001',
        'Previous Balance': 1000,
        'MRQU Sponsorship': 500,
        'External Sponsorship': 0,
        'Student Payable': 4000,
        'Write-Off': 0,
        'Total Paid': 2500,
      },
      {
        'Admission No': '2024-002',
        'Previous Balance': 0,
        'MRQU Sponsorship': 1000,
        'External Sponsorship': 500,
        'Student Payable': 3500,
        'Write-Off': 200,
        'Total Paid': 3000,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fees Template');
    XLSX.writeFile(workbook, 'Student_Fees_Template.xlsx');
    showToast('Downloaded XLSX import template!', 'success');
  };

  // Process Raw Objects (from XLSX or CSV parsing) into normalized rows
  const processRawObjectsToPreview = (rawObjects) => {
    if (!Array.isArray(rawObjects) || rawObjects.length === 0) {
      showToast('No valid rows found in file.', 'error');
      setParsedPreviewRows([]);
      return;
    }

    const previewList = rawObjects.map((row) => {
      const getVal = (keys) => {
        const foundKey = Object.keys(row).find((k) =>
          keys.some((key) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(key))
        );
        return foundKey ? row[foundKey] : undefined;
      };

      const admNo = String(
        getVal(['admissionno', 'admission', 'admno', 'enrollment']) || ''
      ).trim();
      const prevBal = parseFloat(getVal(['previousbalance', 'prevbalance', 'previous', 'prev'])) || 0;
      const mrquSpon = parseFloat(getVal(['mrqusponsorship', 'mrqu'])) || 0;
      const extSpon = parseFloat(getVal(['externalsponsorship', 'external', 'ext'])) || 0;
      const stdPay = parseFloat(getVal(['studentpayable', 'payable'])) || 0;
      const wOff = parseFloat(getVal(['writeoff', 'write'])) || 0;
      const paid = parseFloat(getVal(['totalpaid', 'paid'])) || 0;

      const totalPayable = prevBal + mrquSpon + extSpon + stdPay - wOff;
      const balance = totalPayable - paid;

      const matchedStudent = students.find(
        (s) => String(s.admission_no || '').trim().toLowerCase() === admNo.toLowerCase()
      );

      return {
        admission_no: admNo,
        student_name: matchedStudent ? matchedStudent.student_name : 'Unknown Student',
        previous_balance: prevBal,
        mrqu_sponsorship: mrquSpon,
        external_sponsorship: extSpon,
        student_payable: stdPay,
        write_off: wOff,
        fees_total_payable: totalPayable,
        total_paid: paid,
        balance: balance,
        isValid: !!admNo,
        isExisting: !!feesData.find(
          (f) => String(f.admission_no).trim().toLowerCase() === admNo.toLowerCase()
        ),
      };
    });

    setParsedPreviewRows(previewList.filter((r) => r.isValid));
  };

  // Handle File Change (.xlsx, .xls, .csv)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        processRawObjectsToPreview(rawData);
      } catch (err) {
        showToast('Error reading file: ' + err.message, 'error');
        setParsedPreviewRows([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Parse Raw Text CSV
  const handleParseTextCsv = () => {
    if (!importCsvText.trim()) {
      showToast('Please paste CSV content to parse.', 'error');
      return;
    }

    try {
      const workbook = XLSX.read(importCsvText, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      processRawObjectsToPreview(rawData);
      showToast(`Parsed ${rawData.length} rows from pasted text.`, 'success');
    } catch (err) {
      showToast('Error parsing text: ' + err.message, 'error');
    }
  };

  // Confirm and Execute Bulk Import
  const handleConfirmImportSubmit = async () => {
    if (parsedPreviewRows.length === 0) {
      showToast('No parsed rows to import.', 'error');
      return;
    }

    setImporting(true);
    try {
      const payloadList = parsedPreviewRows.map((item) => ({
        admission_no: item.admission_no,
        previous_balance: item.previous_balance,
        mrqu_sponsorship: item.mrqu_sponsorship,
        external_sponsorship: item.external_sponsorship,
        student_payable: item.student_payable,
        write_off: item.write_off,
        total_paid: item.total_paid,
        updated_at: new Date().toISOString(),
      }));

      if (isSupabaseMode) {
        const { error } = await supabase
          .from('student_fees')
          .upsert(payloadList, { onConflict: 'admission_no' });
        if (error) throw error;
        showToast(`Successfully imported/updated ${payloadList.length} fee records.`, 'success');
        await loadFeesData();
      } else {
        let updatedFees = [...feesData];
        payloadList.forEach((item) => {
          const idx = updatedFees.findIndex(
            (f) =>
              String(f.admission_no).trim().toLowerCase() ===
              String(item.admission_no).trim().toLowerCase()
          );
          if (idx >= 0) {
            updatedFees[idx] = { ...updatedFees[idx], ...item };
          } else {
            updatedFees.push({ id: Date.now() + Math.random(), ...item });
          }
        });
        setFeesData(updatedFees);
        localStorage.setItem(STUDENT_FEES_STORAGE_KEY, JSON.stringify(updatedFees));
        showToast(`Locally saved ${payloadList.length} fee records.`, 'success');
      }

      setIsImportModalOpen(false);
      setParsedPreviewRows([]);
      setImportCsvText('');
      setImportedFileName('');
    } catch (err) {
      showToast('Import Error: ' + err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-5">
      {/* ── Unified Responsive Dashboard Header ── */}
      <div className="bg-white border border-light-border rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
        {/* Metric Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-gradient-to-br from-blue-50/60 to-white border border-blue-100 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-blue-900/70 uppercase tracking-wider block truncate">
                Total Fees Payable
              </span>
              <span className="text-lg sm:text-xl font-black text-dark-deepblue block truncate">
                {formatCurrency(metrics.totalPayable)}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-100 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-emerald-900/70 uppercase tracking-wider block truncate">
                Total Paid
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-700 block truncate">
                {formatCurrency(metrics.totalPaid)}
              </span>
            </div>
          </div>

          <div
            className={`bg-gradient-to-br border rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs hover:shadow-xs transition-shadow ${
              metrics.totalBalance > 0
                ? 'from-red-50/60 to-white border-red-100'
                : 'from-green-50/60 to-white border-green-100'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl text-white flex items-center justify-center text-lg shrink-0 shadow-sm ${
                metrics.totalBalance > 0 ? 'bg-red-600' : 'bg-green-600'
              }`}
            >
              <i
                className={`fas ${
                  metrics.totalBalance > 0 ? 'fa-exclamation-circle' : 'fa-check-double'
                }`}
              ></i>
            </div>
            <div className="min-w-0">
              <span
                className={`text-[10px] font-black uppercase tracking-wider block truncate ${
                  metrics.totalBalance > 0 ? 'text-red-900/70' : 'text-green-900/70'
                }`}
              >
                Total Balance
              </span>
              <span
                className={`text-lg sm:text-xl font-black block truncate ${
                  metrics.totalBalance > 0 ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {formatCurrency(metrics.totalBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Unified Search & Filters Toolbar (rendered if not registered to top panel) */}
        {!onRegisterControls && (
          <div className="pt-2 border-t border-light-border/60 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px]">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted text-xs"></i>
                <input
                  type="text"
                  placeholder="Search by Admission No or Student Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50/70 focus:bg-white border border-light-border rounded-xl text-xs font-semibold text-dark-primary outline-none focus:border-brand-primary transition-all"
                />
              </div>

              {/* Class Filter Dropdown */}
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50/70 focus:bg-white border border-light-border rounded-xl text-xs font-extrabold text-dark-primary outline-none focus:border-brand-primary transition-all cursor-pointer"
              >
                <option value="">All Classes</option>
                {classes
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={loadFeesData}
                disabled={loading}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                title="Refresh database"
              >
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <i className="fas fa-file-import"></i>
                Bulk Import
              </button>

              <button
                onClick={handleExportCsv}
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <i className="fas fa-file-excel"></i>
                Export Excel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Student Fees Data Table ── */}
      <div className="bg-white border border-light-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs font-semibold border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-gray-50 border-b border-light-border text-[10px] uppercase tracking-wider text-dark-muted font-extrabold">
                <th className="p-4">Admission No / Enrollment</th>
                <th className="p-4">Name / Class</th>
                <th className="p-4 text-right">Previous Balance</th>
                <th className="p-4 text-right">MRQU Sponsorship</th>
                <th className="p-4 text-right">External Sponsorship</th>
                <th className="p-4 text-right">Student Payable</th>
                <th className="p-4 text-right">Write-Off</th>
                <th className="p-4 text-right bg-blue-50/50 text-blue-900">Fees Total Payable</th>
                <th className="p-4 text-right bg-emerald-50/50 text-emerald-900">Total Paid</th>
                <th className="p-4 text-right bg-red-50/40 text-red-900">Balance</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-dark-muted font-semibold">
                    <i className="fas fa-search text-3xl opacity-30 block mb-2"></i>
                    No fee records match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.studentId} className="hover:bg-blue-50/30 transition-colors">
                    {/* Admission No / Enrollment */}
                    <td className="p-4">
                      <div className="font-extrabold text-dark-primary text-xs bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 inline-block font-mono">
                        {rec.admission_no}
                      </div>
                      <div className="mt-1">
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-block ${
                            rec.enrollment === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {rec.enrollment}
                        </span>
                      </div>
                    </td>

                    {/* Name / Class */}
                    <td className="p-4">
                      <div className="font-extrabold text-dark-deepblue text-sm">
                        {rec.student_name}
                      </div>
                      <div className="text-[10px] text-dark-muted font-bold mt-0.5">
                        {rec.className}
                      </div>
                    </td>

                    {/* Previous Balance */}
                    <td className="p-4 text-right text-dark-soft">
                      {formatCurrency(rec.previous_balance)}
                    </td>

                    {/* MRQU Sponsorship */}
                    <td className="p-4 text-right text-purple-700">
                      {formatCurrency(rec.mrqu_sponsorship)}
                    </td>

                    {/* External Sponsorship */}
                    <td className="p-4 text-right text-indigo-700">
                      {formatCurrency(rec.external_sponsorship)}
                    </td>

                    {/* Student Payable */}
                    <td className="p-4 text-right text-dark-primary font-bold">
                      {formatCurrency(rec.student_payable)}
                    </td>

                    {/* Write-Off */}
                    <td className="p-4 text-right text-amber-700">
                      {formatCurrency(rec.write_off)}
                    </td>

                    {/* Fees Total Payable */}
                    <td className="p-4 text-right font-black text-blue-900 bg-blue-50/30">
                      {formatCurrency(rec.fees_total_payable)}
                    </td>

                    {/* Total Paid */}
                    <td className="p-4 text-right font-black text-emerald-700 bg-emerald-50/30">
                      {formatCurrency(rec.total_paid)}
                    </td>

                    {/* Balance */}
                    <td className="p-4 text-right font-black bg-red-50/20">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-black inline-block ${
                          rec.balance > 0
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {formatCurrency(rec.balance)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(rec)}
                        className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center transition-all shadow-2xs active:scale-95 mx-auto"
                        title="Edit Fee Record"
                      >
                        <i className="fas fa-pen text-xs"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Fee Modal ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-almostblack/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-light-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="bg-brand-primary px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <i className="fas fa-edit"></i>
                  Edit Student Fee Record
                </h3>
                <p className="text-xs text-white/80 font-semibold mt-0.5">
                  Admission No: <span className="font-mono">{formData.admission_no}</span>
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors text-xl font-bold"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">
                    Previous Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.previous_balance}
                    onChange={(e) => setFormData({ ...formData, previous_balance: e.target.value })}
                    className="w-full px-3 py-2 border border-light-border rounded-xl text-xs font-bold text-dark-primary outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">
                    MRQU Sponsorship (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mrqu_sponsorship}
                    onChange={(e) => setFormData({ ...formData, mrqu_sponsorship: e.target.value })}
                    className="w-full px-3 py-2 border border-light-border rounded-xl text-xs font-bold text-dark-primary outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">
                    External Sponsorship (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.external_sponsorship}
                    onChange={(e) =>
                      setFormData({ ...formData, external_sponsorship: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-light-border rounded-xl text-xs font-bold text-dark-primary outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">
                    Student Payable (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.student_payable}
                    onChange={(e) => setFormData({ ...formData, student_payable: e.target.value })}
                    className="w-full px-3 py-2 border border-light-border rounded-xl text-xs font-bold text-dark-primary outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">
                    Write-Off (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.write_off}
                    onChange={(e) => setFormData({ ...formData, write_off: e.target.value })}
                    className="w-full px-3 py-2 border border-light-border rounded-xl text-xs font-bold text-dark-primary outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1">
                    Total Paid (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_paid}
                    onChange={(e) => setFormData({ ...formData, total_paid: e.target.value })}
                    className="w-full px-3 py-2 border border-light-border rounded-xl text-xs font-bold text-dark-primary outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Calculated Live Preview Box */}
              <div className="bg-light-lbg border border-light-border rounded-2xl p-4 space-y-2 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-dark-muted">Fees Total Payable (Auto):</span>
                  <span className="font-black text-blue-900">
                    {formatCurrency(liveFormCalculations.totalPayable)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-light-border pt-2">
                  <span className="font-bold text-dark-muted">Remaining Balance (Auto):</span>
                  <span
                    className={`font-black ${
                      liveFormCalculations.balance > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(liveFormCalculations.balance)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-dark-soft rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-brand-primary hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  {loading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-save"></i>
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Import Modal (.csv / .xlsx) ── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-almostblack/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-light-border w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <i className="fas fa-file-import"></i>
                  Bulk Import Student Fees
                </h3>
                <p className="text-xs text-white/80 font-semibold mt-0.5">
                  Upload Excel (.xlsx/.xls) or CSV file, or paste raw text
                </p>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedPreviewRows([]);
                  setImportedFileName('');
                }}
                className="text-white/80 hover:text-white transition-colors text-xl font-bold"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Top Template Bar */}
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-xs font-bold text-dark-muted">
                  Upload an Excel (.xlsx/.xls) or CSV file with fee details
                </span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                >
                  <i className="fas fa-download text-emerald-600"></i>
                  Download Template (.xlsx)
                </button>
              </div>

              {/* File Upload Box */}
              <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl p-6 text-center space-y-3">
                <i className="fas fa-cloud-arrow-up text-4xl text-indigo-600 mb-1"></i>
                <div>
                  <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-extrabold text-xs inline-flex items-center gap-2 shadow-sm transition-all active:scale-95">
                    <i className="fas fa-folder-open"></i> Choose Excel or CSV File
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {importedFileName && (
                  <p className="text-xs font-bold text-indigo-900 bg-indigo-100/60 px-3 py-1 rounded-full inline-block">
                    Selected File: {importedFileName}
                  </p>
                )}
                <p className="text-[10px] text-gray-500 font-semibold">
                  Supported extensions: .xlsx, .xls, .csv
                </p>
              </div>

              {/* Live Preview Table of Parsed Rows */}
              {parsedPreviewRows.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between text-xs font-extrabold text-dark-primary">
                    <span className="flex items-center gap-2">
                      <i className="fas fa-[#10B981] fa-list-check text-emerald-600"></i>
                      Detected {parsedPreviewRows.length} Valid Row(s)
                    </span>
                    <span className="text-indigo-700">
                      {parsedPreviewRows.filter((r) => r.isExisting).length} Existing Update(s) |{' '}
                      {parsedPreviewRows.filter((r) => !r.isExisting).length} New Record(s)
                    </span>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs font-semibold">
                      <thead className="bg-gray-100 border-b text-[10px] uppercase tracking-wider text-dark-muted font-bold">
                        <tr>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Admission No</th>
                          <th className="p-2.5">Student Name</th>
                          <th className="p-2.5 text-right">Payable (Auto)</th>
                          <th className="p-2.5 text-right">Total Paid</th>
                          <th className="p-2.5 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedPreviewRows.map((r, idx) => (
                          <tr key={idx} className={r.isExisting ? 'bg-blue-50/30' : 'bg-white'}>
                            <td className="p-2.5">
                              {r.isExisting ? (
                                <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200 inline-block">
                                  UPDATE
                                </span>
                              ) : (
                                <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 inline-block">
                                  NEW
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-bold font-mono">{r.admission_no}</td>
                            <td className="p-2.5 font-bold">{r.student_name}</td>
                            <td className="p-2.5 text-right font-black text-blue-900">
                              {formatCurrency(r.fees_total_payable)}
                            </td>
                            <td className="p-2.5 text-right text-emerald-700">
                              {formatCurrency(r.total_paid)}
                            </td>
                            <td className="p-2.5 text-right font-black">
                              <span
                                className={r.balance > 0 ? 'text-red-600' : 'text-emerald-600'}
                              >
                                {formatCurrency(r.balance)}
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

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedPreviewRows([]);
                  setImportedFileName('');
                }}
                className="px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 text-dark-soft rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImportSubmit}
                disabled={parsedPreviewRows.length === 0 || importing}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
              >
                {importing ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-upload"></i>
                )}
                Confirm Import ({parsedPreviewRows.length} Rows)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFeesView;
