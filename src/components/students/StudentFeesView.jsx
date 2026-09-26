// src/components/portals/admin/students/StudentFeesView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { useCanAccess } from '../portal-shared/ConditionalBlock';
import { useAuth } from '../../hooks/useAuth';

const STUDENT_FEES_STORAGE_KEY = 'jzv_student_fees_local_data';

// Helper to format currency in INR
const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper for percentage formatting
const formatPercent = (numerator, denominator) => {
  const den = parseFloat(denominator) || 0;
  if (den <= 0) return '0%';
  const num = parseFloat(numerator) || 0;
  const pct = Math.min(Math.max((num / den) * 100, 0), 100);
  return `${pct.toFixed(1)}%`;
};

const StudentFeesView = ({
  students = [],
  classes = [],
  userRoles = [],
  onRefreshStudents,
  onRegisterControls,
}) => {
  const { userRoles: authUserRoles } = useAuth();
  const effectiveRoles = useMemo(() => {
    if (Array.isArray(userRoles) && userRoles.length > 0) return userRoles;
    if (Array.isArray(authUserRoles) && authUserRoles.length > 0) return authUserRoles;
    return [];
  }, [userRoles, authUserRoles]);

  const canAccess = useCanAccess(effectiveRoles);
  const canEditFees =
    canAccess('student-fees-edit') ||
    effectiveRoles.some((r) => ['admin', 'management', 'accountant'].includes(r));

  const [feesData, setFeesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);

  // Table view filter: 'all' | 'reconciliation' | 'allocations'
  const [columnViewMode, setColumnViewMode] = useState('all');

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'admission_no', direction: 'asc' });

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
    mrqu_paid: '0',
    external_paid: '0',
    student_paid: '0',
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
      let data = null;
      let dbErr = null;
      const { data: primaryData, error: primaryErr } = await supabase
        .from('trk_student_fees')
        .select('*');
      if (!primaryErr && primaryData) {
        data = primaryData;
      } else {
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('student_fees')
          .select('*');
        if (!fallbackErr && fallbackData) {
          data = fallbackData;
        } else {
          dbErr = primaryErr || fallbackErr;
        }
      }
      if (dbErr) throw dbErr;

      setFeesData(data || []);
      setIsSupabaseMode(true);
    } catch (e) {
      console.warn('Supabase trk_student_fees table unavailable, using LocalStorage:', e.message);
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

  // Merge student records with fee records & compute breakdown
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

      // Distinct payments received
      const mrquPaid = parseFloat(fee.mrqu_paid) || 0;
      const extPaid = parseFloat(fee.external_paid) || 0;
      let stdPaid = parseFloat(fee.student_paid) || 0;

      // Backward compatibility: if specific paid columns are 0 but legacy total_paid > 0, attribute to stdPaid
      let totalPaid = mrquPaid + extPaid + stdPaid;
      if (totalPaid === 0 && parseFloat(fee.total_paid) > 0) {
        totalPaid = parseFloat(fee.total_paid);
        stdPaid = totalPaid;
      }

      // Fees Total Payable = sum of (Previous Balance, MRQU Sponsorship, External Sponsorship, Student Payable) - Write-Off
      const totalPayable = prevBal + mrquSponsor + extSponsor + stdPayable - writeOff;
      // Balance = Total Payable - Total Paid
      const balance = totalPayable - totalPaid;

      // Component-level balances
      const mrquBalance = mrquSponsor - mrquPaid;
      const extBalance = extSponsor - extPaid;
      const studentNetPayable = prevBal + stdPayable - writeOff;
      const studentBalance = studentNetPayable - stdPaid;

      const cls = classes.find((c) => String(c.id) === String(std.class_id));

      return {
        studentId: std.id,
        admission_no: std.admission_no || 'N/A',
        student_name: std.student_name || 'N/A',
        className: cls ? cls.name : 'Unassigned',
        class_id: std.class_id,
        enrollment: std.enrollment || 'Active',
        fee_id: fee.id || null,
        // Allocations
        previous_balance: prevBal,
        mrqu_sponsorship: mrquSponsor,
        external_sponsorship: extSponsor,
        student_payable: stdPayable,
        student_net_payable: studentNetPayable,
        write_off: writeOff,
        fees_total_payable: totalPayable,
        // Receipts (Clear distinction)
        mrqu_paid: mrquPaid,
        external_paid: extPaid,
        student_paid: stdPaid,
        total_paid: totalPaid,
        // Component-level balances
        mrqu_balance: mrquBalance,
        external_balance: extBalance,
        student_balance: studentBalance,
        balance: balance,
      };
    });
  }, [students, feesData, classes]);

  // Filtered and Sorted records
  const filteredRecords = useMemo(() => {
    let list = mergedFeeRecords.filter((rec) => {
      const matchSearch =
        rec.admission_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.student_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = selectedClassFilter
        ? String(rec.class_id) === String(selectedClassFilter)
        : true;
      return matchSearch && matchClass;
    });

    if (sortConfig.key) {
      list = [...list].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = (valB || '').toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [mergedFeeRecords, searchQuery, selectedClassFilter, sortConfig]);

  // Handle Sort Toggle
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Comprehensive Metric Sums with distinct pillar breakdown
  const metrics = useMemo(() => {
    let totalPayableSum = 0;
    let totalPaidSum = 0;
    let totalBalanceSum = 0;

    let mrquAllocatedSum = 0;
    let mrquReceivedSum = 0;
    let mrquPendingSum = 0;

    let externalAllocatedSum = 0;
    let externalReceivedSum = 0;
    let externalPendingSum = 0;

    let studentNetPayableSum = 0;
    let studentPaidSum = 0;
    let studentPendingSum = 0;

    let prevBalSum = 0;
    let writeOffSum = 0;

    filteredRecords.forEach((r) => {
      totalPayableSum += r.fees_total_payable;
      totalPaidSum += r.total_paid;
      totalBalanceSum += r.balance;

      mrquAllocatedSum += r.mrqu_sponsorship;
      mrquReceivedSum += r.mrqu_paid;
      mrquPendingSum += r.mrqu_balance;

      externalAllocatedSum += r.external_sponsorship;
      externalReceivedSum += r.external_paid;
      externalPendingSum += r.external_balance;

      studentNetPayableSum += r.student_net_payable;
      studentPaidSum += r.student_paid;
      studentPendingSum += r.student_balance;

      prevBalSum += r.previous_balance;
      writeOffSum += r.write_off;
    });

    return {
      totalPayable: totalPayableSum,
      totalPaid: totalPaidSum,
      totalBalance: totalBalanceSum,
      overallCollectionRate:
        totalPayableSum > 0 ? (totalPaidSum / totalPayableSum) * 100 : 0,

      // MRQU Pillar
      mrquAllocated: mrquAllocatedSum,
      mrquReceived: mrquReceivedSum,
      mrquPending: mrquPendingSum,
      mrquCollectionRate:
        mrquAllocatedSum > 0 ? (mrquReceivedSum / mrquAllocatedSum) * 100 : 0,

      // External Pillar
      externalAllocated: externalAllocatedSum,
      externalReceived: externalReceivedSum,
      externalPending: externalPendingSum,
      externalCollectionRate:
        externalAllocatedSum > 0 ? (externalReceivedSum / externalAllocatedSum) * 100 : 0,

      // Student Pillar
      studentNetPayable: studentNetPayableSum,
      studentPaid: studentPaidSum,
      studentPending: studentPendingSum,
      studentCollectionRate:
        studentNetPayableSum > 0 ? (studentPaidSum / studentNetPayableSum) * 100 : 0,

      // Adjustments
      totalPreviousBalance: prevBalSum,
      totalWriteOff: writeOffSum,
    };
  }, [filteredRecords]);

  // Live modal form calculations
  const liveFormCalculations = useMemo(() => {
    const prev = parseFloat(formData.previous_balance) || 0;
    const mrqu = parseFloat(formData.mrqu_sponsorship) || 0;
    const ext = parseFloat(formData.external_sponsorship) || 0;
    const stdPay = parseFloat(formData.student_payable) || 0;
    const wOff = parseFloat(formData.write_off) || 0;

    const mrquP = parseFloat(formData.mrqu_paid) || 0;
    const extP = parseFloat(formData.external_paid) || 0;
    const stdP = parseFloat(formData.student_paid) || 0;

    const totalPayable = prev + mrqu + ext + stdPay - wOff;
    const totalPaid = mrquP + extP + stdP;
    const balance = totalPayable - totalPaid;

    const mrquDue = mrqu - mrquP;
    const extDue = ext - extP;
    const studentNet = prev + stdPay - wOff;
    const studentDue = studentNet - stdP;

    return {
      totalPayable,
      totalPaid,
      balance,
      mrquDue,
      extDue,
      studentDue,
      studentNet,
    };
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
      mrqu_paid: String(rec.mrqu_paid),
      external_paid: String(rec.external_paid),
      student_paid: String(rec.student_paid),
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
    const mrquPaidNum = parseFloat(formData.mrqu_paid) || 0;
    const extPaidNum = parseFloat(formData.external_paid) || 0;
    const stdPaidNum = parseFloat(formData.student_paid) || 0;
    const totalPaidCalc = mrquPaidNum + extPaidNum + stdPaidNum;

    // Database payload excludes generated columns (fees_total_payable, balance)
    const dbPayload = {
      admission_no: formData.admission_no.trim(),
      previous_balance: parseFloat(formData.previous_balance) || 0,
      mrqu_sponsorship: parseFloat(formData.mrqu_sponsorship) || 0,
      external_sponsorship: parseFloat(formData.external_sponsorship) || 0,
      student_payable: parseFloat(formData.student_payable) || 0,
      write_off: parseFloat(formData.write_off) || 0,
      mrqu_paid: mrquPaidNum,
      external_paid: extPaidNum,
      student_paid: stdPaidNum,
      total_paid: totalPaidCalc,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseMode) {
      try {
        let { error } = await supabase
          .from('trk_student_fees')
          .upsert(dbPayload, { onConflict: 'admission_no' });

        if (error) {
          // If distinct columns don't exist yet on database, fallback gracefully to total_paid
          if (
            error.message?.includes('mrqu_paid') ||
            error.message?.includes('column') ||
            error.code === '42703'
          ) {
            console.warn(
              'Database table lacks mrqu_paid / external_paid columns. Run /debug-files/execute-query.sql in Supabase to activate distinct columns.'
            );
            const legacyPayload = {
              admission_no: dbPayload.admission_no,
              previous_balance: dbPayload.previous_balance,
              mrqu_sponsorship: dbPayload.mrqu_sponsorship,
              external_sponsorship: dbPayload.external_sponsorship,
              student_payable: dbPayload.student_payable,
              write_off: dbPayload.write_off,
              total_paid: dbPayload.total_paid,
              updated_at: dbPayload.updated_at,
            };
            const { error: fallbackErr } = await supabase
              .from('trk_student_fees')
              .upsert(legacyPayload, { onConflict: 'admission_no' });
            if (fallbackErr) throw fallbackErr;
            showToast(
              'Saved. Notice: Run /debug-files/execute-query.sql in Supabase to enable distinct DB columns.',
              'info'
            );
          } else {
            throw error;
          }
        } else {
          showToast(`Fee record for "${formData.admission_no}" updated successfully.`, 'success');
        }

        setIsEditModalOpen(false);
        await loadFeesData();
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // LocalStorage Mode
      const localRecord = {
        ...dbPayload,
        fees_total_payable: liveFormCalculations.totalPayable,
        balance: liveFormCalculations.balance,
      };
      let updatedFees = [...feesData];
      const idx = updatedFees.findIndex(
        (f) =>
          String(f.admission_no).trim().toLowerCase() ===
          String(formData.admission_no).trim().toLowerCase()
      );

      if (idx >= 0) {
        updatedFees[idx] = { ...updatedFees[idx], ...localRecord };
      } else {
        updatedFees.push({ id: Date.now(), ...localRecord });
      }

      setFeesData(updatedFees);
      localStorage.setItem(STUDENT_FEES_STORAGE_KEY, JSON.stringify(updatedFees));
      showToast(`Fee record for "${formData.admission_no}" saved locally.`, 'success');
      setIsEditModalOpen(false);
      setLoading(false);
    }
  };

  // Export Comprehensive Excel (.xlsx)
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
      'MRQU Sponsorship (Allocated)': r.mrqu_sponsorship,
      'MRQU Sponsorship Received': r.mrqu_paid,
      'MRQU Due': r.mrqu_balance,
      'External Sponsorship (Allocated)': r.external_sponsorship,
      'External Sponsorship Received': r.external_paid,
      'External Due': r.external_balance,
      'Student Payable': r.student_payable,
      'Student Paid': r.student_paid,
      'Student Due': r.student_balance,
      'Write-Off': r.write_off,
      'Fees Total Payable': r.fees_total_payable,
      'Total Paid': r.total_paid,
      'Total Balance': r.balance,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Fees');
    XLSX.writeFile(
      workbook,
      `Student_Fees_Distinction_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    showToast('Student Fees Excel exported successfully with all distinct pillars.', 'success');
  };

  // Download XLSX Import Template
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'Admission No': '101',
        'Previous Balance': 500,
        'MRQU Sponsorship': 2000,
        'External Sponsorship': 1500,
        'Student Payable': 6000,
        'Write-Off': 0,
        'MRQU Paid': 2000,
        'External Paid': 1500,
        'Student Paid': 4000,
      },
      {
        'Admission No': '102',
        'Previous Balance': 0,
        'MRQU Sponsorship': 3000,
        'External Sponsorship': 0,
        'Student Payable': 7000,
        'Write-Off': 500,
        'MRQU Paid': 1500,
        'External Paid': 0,
        'Student Paid': 6500,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fees Template');
    XLSX.writeFile(workbook, 'Student_Fees_Template_With_Sponsorship_Pillars.xlsx');
    showToast('Downloaded XLSX import template with MRQU, External & Student Paid!', 'success');
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
        return foundKey !== undefined ? row[foundKey] : undefined;
      };

      const admNo = String(
        getVal(['admissionno', 'admission', 'admno', 'enrollment', 'studentno']) || ''
      ).trim();
      const prevBal =
        parseFloat(getVal(['previousbalance', 'prevbalance', 'previous', 'prevbal', 'prev'])) || 0;
      const mrquSpon =
        parseFloat(getVal(['mrqusponsorship', 'mrqualloc', 'mrquallocation', 'mrqu'])) || 0;
      const extSpon =
        parseFloat(
          getVal(['externalsponsorship', 'externalalloc', 'externalallocation', 'extspon', 'external'])
        ) || 0;
      const stdPay = parseFloat(getVal(['studentpayable', 'stdpayable', 'payable'])) || 0;
      const wOff = parseFloat(getVal(['writeoff', 'discount', 'concession', 'waiver'])) || 0;

      // Payments breakdown
      const mrquPaidRaw = getVal(['mrqupaid', 'mrqureceived', 'mrqurecv', 'mrqucollection']);
      const extPaidRaw = getVal([
        'externalpaid',
        'extpaid',
        'externalreceived',
        'extrecv',
        'externalcollection',
      ]);
      const stdPaidRaw = getVal([
        'studentpaid',
        'stdpaid',
        'feepaid',
        'studentreceived',
        'studentrecv',
      ]);
      const legacyPaidRaw = getVal(['totalpaid', 'paid', 'totalreceived']);

      let mrquP = parseFloat(mrquPaidRaw) || 0;
      let extP = parseFloat(extPaidRaw) || 0;
      let stdP = parseFloat(stdPaidRaw) || 0;

      // Fallback if file only has total_paid without breakdown
      let totalP = mrquP + extP + stdP;
      if (totalP === 0 && legacyPaidRaw !== undefined) {
        totalP = parseFloat(legacyPaidRaw) || 0;
        stdP = totalP;
      }

      const totalPayable = prevBal + mrquSpon + extSpon + stdPay - wOff;
      const balance = totalPayable - totalP;

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
        mrqu_paid: mrquP,
        external_paid: extP,
        student_paid: stdP,
        total_paid: totalP,
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
      // DB Payload excludes generated columns (fees_total_payable, balance)
      const payloadList = parsedPreviewRows.map((item) => ({
        admission_no: item.admission_no,
        previous_balance: item.previous_balance,
        mrqu_sponsorship: item.mrqu_sponsorship,
        external_sponsorship: item.external_sponsorship,
        student_payable: item.student_payable,
        write_off: item.write_off,
        mrqu_paid: item.mrqu_paid,
        external_paid: item.external_paid,
        student_paid: item.student_paid,
        total_paid: item.total_paid,
        updated_at: new Date().toISOString(),
      }));

      if (isSupabaseMode) {
        let { error } = await supabase
          .from('trk_student_fees')
          .upsert(payloadList, { onConflict: 'admission_no' });

        if (error) {
          // If distinct columns not created yet on database, fallback to legacy structure
          if (
            error.message?.includes('mrqu_paid') ||
            error.message?.includes('column') ||
            error.code === '42703'
          ) {
            const legacyList = payloadList.map((p) => ({
              admission_no: p.admission_no,
              previous_balance: p.previous_balance,
              mrqu_sponsorship: p.mrqu_sponsorship,
              external_sponsorship: p.external_sponsorship,
              student_payable: p.student_payable,
              write_off: p.write_off,
              total_paid: p.total_paid,
              updated_at: p.updated_at,
            }));
            const { error: fallbackErr } = await supabase
              .from('trk_student_fees')
              .upsert(legacyList, { onConflict: 'admission_no' });
            if (fallbackErr) throw fallbackErr;
            showToast(
              'Imported. Notice: Run /debug-files/execute-query.sql in Supabase to activate distinct columns in DB.',
              'info'
            );
          } else {
            throw error;
          }
        } else {
          showToast(
            `Successfully imported/updated ${payloadList.length} fee records.`,
            'success'
          );
        }
        await loadFeesData();
      } else {
        let updatedFees = [...feesData];
        parsedPreviewRows.forEach((item) => {
          const localItem = {
            admission_no: item.admission_no,
            previous_balance: item.previous_balance,
            mrqu_sponsorship: item.mrqu_sponsorship,
            external_sponsorship: item.external_sponsorship,
            student_payable: item.student_payable,
            write_off: item.write_off,
            mrqu_paid: item.mrqu_paid,
            external_paid: item.external_paid,
            student_paid: item.student_paid,
            total_paid: item.total_paid,
            fees_total_payable: item.fees_total_payable,
            balance: item.balance,
            updated_at: new Date().toISOString(),
          };
          const idx = updatedFees.findIndex(
            (f) =>
              String(f.admission_no).trim().toLowerCase() ===
              String(item.admission_no).trim().toLowerCase()
          );
          if (idx >= 0) {
            updatedFees[idx] = { ...updatedFees[idx], ...localItem };
          } else {
            updatedFees.push({ id: Date.now() + Math.random(), ...localItem });
          }
        });
        setFeesData(updatedFees);
        localStorage.setItem(STUDENT_FEES_STORAGE_KEY, JSON.stringify(updatedFees));
        showToast(`Locally saved ${parsedPreviewRows.length} fee records.`, 'success');
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
    <div className="flex flex-col space-y-5" data-feature="student-fees-view">
      {/* ── Executive Dashboard Header: Clear Distinction of Pillars ── */}
      <div className="bg-white border border-light-border rounded-3xl p-4 sm:p-6 shadow-sm space-y-6">
        {/* Tier 1: High Level Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Total Fees Payable */}
          <div className="bg-gradient-to-br from-blue-50/70 via-white to-blue-50/20 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center gap-3.5 min-w-0">
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
            <div className="text-right hidden sm:block shrink-0">
              <span className="text-[9px] font-bold text-dark-muted block">Write-Off</span>
              <span className="text-xs font-black text-amber-700">
                {formatCurrency(metrics.totalWriteOff)}
              </span>
            </div>
          </div>

          {/* Total Paid / Received */}
          <div className="bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                <i className="fas fa-hand-holding-dollar"></i>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-emerald-900/70 uppercase tracking-wider block truncate">
                  Total Collected / Paid
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-700 block truncate">
                  {formatCurrency(metrics.totalPaid)}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full block border border-emerald-200">
                {formatPercent(metrics.totalPaid, metrics.totalPayable)}
              </span>
              <span className="text-[9px] font-semibold text-dark-muted block mt-0.5">Rate</span>
            </div>
          </div>

          {/* Total Balance Due */}
          <div
            className={`bg-gradient-to-br border rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all ${
              metrics.totalBalance > 0
                ? 'from-rose-50/70 via-white to-rose-50/20 border-rose-200/80'
                : 'from-green-50/70 via-white to-green-50/20 border-green-200/80'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-11 h-11 rounded-xl text-white flex items-center justify-center text-lg shrink-0 shadow-sm ${
                  metrics.totalBalance > 0 ? 'bg-rose-600' : 'bg-green-600'
                }`}
              >
                <i
                  className={`fas ${
                    metrics.totalBalance > 0 ? 'fa-clock' : 'fa-check-double'
                  }`}
                ></i>
              </div>
              <div className="min-w-0">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider block truncate ${
                    metrics.totalBalance > 0 ? 'text-rose-900/70' : 'text-green-900/70'
                  }`}
                >
                  Total Balance Due
                </span>
                <span
                  className={`text-lg sm:text-xl font-black block truncate ${
                    metrics.totalBalance > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {formatCurrency(metrics.totalBalance)}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span
                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-block border ${
                  metrics.totalBalance > 0
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                {metrics.totalBalance > 0 ? 'Pending' : 'Cleared'}
              </span>
            </div>
          </div>
        </div>

        {/* Tier 2: The 3 Distinct Pillars (MRQU, External, Student) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-black text-dark-deepblue uppercase tracking-wider flex items-center gap-1.5">
              <i className="fas fa-layer-group text-brand-primary"></i>
              Payment & Sponsorship Distinction Breakdown
            </h4>
            <span className="text-[11px] font-bold text-dark-muted hidden sm:inline">
              Allocated vs. Received vs. Outstanding
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Pillar 1: MRQU Sponsorship */}
            <div className="bg-gradient-to-br from-purple-50/50 to-white border border-purple-200 rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs shadow-2xs">
                    <i className="fas fa-hand-holding-hand"></i>
                  </span>
                  <div>
                    <span className="text-xs font-black text-purple-950 block leading-tight">
                      MRQU Sponsorship
                    </span>
                    <span className="text-[9px] font-bold text-purple-700/80">Institutional</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200">
                  {formatPercent(metrics.mrquReceived, metrics.mrquAllocated)} Recv
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-purple-100 text-left">
                <div>
                  <span className="text-[9px] font-bold text-dark-muted block">Allocated</span>
                  <span className="text-xs font-black text-purple-950">
                    {formatCurrency(metrics.mrquAllocated)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-purple-700 block">Received</span>
                  <span className="text-xs font-black text-purple-700">
                    {formatCurrency(metrics.mrquReceived)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-rose-600 block">Pending</span>
                  <span className="text-xs font-black text-rose-600">
                    {formatCurrency(metrics.mrquPending)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-purple-100/70 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      metrics.mrquAllocated > 0
                        ? (metrics.mrquReceived / metrics.mrquAllocated) * 100
                        : 0,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Pillar 2: External Sponsorship */}
            <div className="bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-200 rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shadow-2xs">
                    <i className="fas fa-building-columns"></i>
                  </span>
                  <div>
                    <span className="text-xs font-black text-indigo-950 block leading-tight">
                      External Sponsorship
                    </span>
                    <span className="text-[9px] font-bold text-indigo-700/80">Donors / Trusts</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md border border-indigo-200">
                  {formatPercent(metrics.externalReceived, metrics.externalAllocated)} Recv
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-indigo-100 text-left">
                <div>
                  <span className="text-[9px] font-bold text-dark-muted block">Allocated</span>
                  <span className="text-xs font-black text-indigo-950">
                    {formatCurrency(metrics.externalAllocated)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-indigo-700 block">Received</span>
                  <span className="text-xs font-black text-indigo-700">
                    {formatCurrency(metrics.externalReceived)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-rose-600 block">Pending</span>
                  <span className="text-xs font-black text-rose-600">
                    {formatCurrency(metrics.externalPending)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-indigo-100/70 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      metrics.externalAllocated > 0
                        ? (metrics.externalReceived / metrics.externalAllocated) * 100
                        : 0,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Pillar 3: Student Share */}
            <div className="bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-200 rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs shadow-2xs">
                    <i className="fas fa-user-graduate"></i>
                  </span>
                  <div>
                    <span className="text-xs font-black text-emerald-950 block leading-tight">
                      Student Direct Share
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700/80">Parent / Student</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                  {formatPercent(metrics.studentPaid, metrics.studentNetPayable)} Paid
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-100 text-left">
                <div>
                  <span className="text-[9px] font-bold text-dark-muted block">Net Payable</span>
                  <span className="text-xs font-black text-emerald-950">
                    {formatCurrency(metrics.studentNetPayable)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-emerald-700 block">Student Paid</span>
                  <span className="text-xs font-black text-emerald-700">
                    {formatCurrency(metrics.studentPaid)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-rose-600 block">Due</span>
                  <span className="text-xs font-black text-rose-600">
                    {formatCurrency(metrics.studentPending)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-emerald-100/70 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      metrics.studentNetPayable > 0
                        ? (metrics.studentPaid / metrics.studentNetPayable) * 100
                        : 0,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Segmented Switcher & Search Bar */}
        <div className="pt-2 border-t border-light-border/60 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5">
          {/* Left: View Filter Switcher */}
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setColumnViewMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                columnViewMode === 'all'
                  ? 'bg-white text-dark-deepblue shadow-2xs'
                  : 'text-dark-muted hover:text-dark-primary'
              }`}
            >
              All Columns
            </button>
            <button
              type="button"
              onClick={() => setColumnViewMode('reconciliation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                columnViewMode === 'reconciliation'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-dark-muted hover:text-dark-primary'
              }`}
            >
              <i className="fas fa-receipt mr-1 text-[10px]"></i>
              Collections Focus
            </button>
            <button
              type="button"
              onClick={() => setColumnViewMode('allocations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                columnViewMode === 'allocations'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-dark-muted hover:text-dark-primary'
              }`}
            >
              <i className="fas fa-hand-holding-dollar mr-1 text-[10px]"></i>
              Allocations Focus
            </button>
          </div>

          {/* Fallback Search & Action controls (when top panel registration not active) */}
          {!onRegisterControls && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
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

              <div className="flex items-center gap-2">
                <button
                  onClick={loadFeesData}
                  disabled={loading}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                  Refresh
                </button>
                {canEditFees && (
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <i className="fas fa-file-import"></i>
                    Import
                  </button>
                )}
                <button
                  onClick={handleExportCsv}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <i className="fas fa-file-excel"></i>
                  Export
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Student Fees Data Table with Clear Distinction of Pillars ── */}
      <div className="bg-white border border-light-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs font-semibold border-collapse min-w-[1200px]">
            <thead>
              {/* Pillar Classification Header Row */}
              <tr className="bg-slate-100/70 border-b border-light-border text-[9px] font-black uppercase tracking-wider text-dark-muted">
                <th colSpan={2} className="px-4 py-2 text-dark-deepblue">
                  Student Information
                </th>
                {(columnViewMode === 'all' || columnViewMode === 'allocations') && (
                  <th
                    colSpan={columnViewMode === 'all' ? 6 : 6}
                    className="px-4 py-2 text-blue-900 bg-blue-50/50 text-center border-l border-r border-blue-200/50"
                  >
                    Fee Allocations & Adjustments (₹)
                  </th>
                )}
                {(columnViewMode === 'all' || columnViewMode === 'reconciliation') && (
                  <th
                    colSpan={4}
                    className="px-4 py-2 text-emerald-900 bg-emerald-50/50 text-center border-r border-emerald-200/50"
                  >
                    Distinct Receipts & Payments Collected (₹)
                  </th>
                )}
                <th colSpan={2} className="px-4 py-2 text-center text-rose-900 bg-rose-50/30">
                  Reconciliation & Actions
                </th>
              </tr>

              {/* Column Level Header Row */}
              <tr className="bg-gray-50/90 border-b border-light-border text-[10px] uppercase tracking-wider text-dark-muted font-extrabold select-none">
                {/* Admission No */}
                <th
                  onClick={() => handleSort('admission_no')}
                  className="p-3.5 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Admission No</span>
                    <i
                      className={`fas ${
                        sortConfig.key === 'admission_no'
                          ? sortConfig.direction === 'asc'
                            ? 'fa-sort-up text-brand-primary'
                            : 'fa-sort-down text-brand-primary'
                          : 'fa-sort text-gray-300'
                      } text-[10px]`}
                    ></i>
                  </div>
                </th>

                {/* Name / Class */}
                <th
                  onClick={() => handleSort('student_name')}
                  className="p-3.5 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Student / Class</span>
                    <i
                      className={`fas ${
                        sortConfig.key === 'student_name'
                          ? sortConfig.direction === 'asc'
                            ? 'fa-sort-up text-brand-primary'
                            : 'fa-sort-down text-brand-primary'
                          : 'fa-sort text-gray-300'
                      } text-[10px]`}
                    ></i>
                  </div>
                </th>

                {/* ALLOCATIONS */}
                {(columnViewMode === 'all' || columnViewMode === 'allocations') && (
                  <>
                    <th
                      onClick={() => handleSort('previous_balance')}
                      className="p-3.5 text-right cursor-pointer hover:bg-blue-50/30"
                    >
                      Prev Bal
                    </th>
                    <th
                      onClick={() => handleSort('mrqu_sponsorship')}
                      className="p-3.5 text-right text-purple-800 cursor-pointer hover:bg-purple-50/40"
                    >
                      MRQU Spon
                    </th>
                    <th
                      onClick={() => handleSort('external_sponsorship')}
                      className="p-3.5 text-right text-indigo-800 cursor-pointer hover:bg-indigo-50/40"
                    >
                      Ext Spon
                    </th>
                    <th
                      onClick={() => handleSort('student_payable')}
                      className="p-3.5 text-right text-dark-deepblue cursor-pointer hover:bg-blue-50/30"
                    >
                      Std Payable
                    </th>
                    <th
                      onClick={() => handleSort('write_off')}
                      className="p-3.5 text-right text-amber-700 cursor-pointer hover:bg-amber-50/30"
                    >
                      Write-Off
                    </th>
                    <th
                      onClick={() => handleSort('fees_total_payable')}
                      className="p-3.5 text-right bg-blue-50/70 text-blue-950 font-black cursor-pointer hover:bg-blue-100/70 border-r border-blue-200/50"
                    >
                      Total Payable
                    </th>
                  </>
                )}

                {/* RECEIPTS (DISTINCT PILLARS) */}
                {(columnViewMode === 'all' || columnViewMode === 'reconciliation') && (
                  <>
                    <th
                      onClick={() => handleSort('mrqu_paid')}
                      className="p-3.5 text-right bg-purple-50/50 text-purple-900 font-extrabold cursor-pointer hover:bg-purple-100/60"
                      title="Sponsorship received from MRQU"
                    >
                      MRQU Recv
                    </th>
                    <th
                      onClick={() => handleSort('external_paid')}
                      className="p-3.5 text-right bg-indigo-50/50 text-indigo-900 font-extrabold cursor-pointer hover:bg-indigo-100/60"
                      title="Sponsorship received from External Donor"
                    >
                      Ext Recv
                    </th>
                    <th
                      onClick={() => handleSort('student_paid')}
                      className="p-3.5 text-right bg-teal-50/50 text-teal-900 font-extrabold cursor-pointer hover:bg-teal-100/60"
                      title="Fee paid directly by student/parent"
                    >
                      Student Paid
                    </th>
                    <th
                      onClick={() => handleSort('total_paid')}
                      className="p-3.5 text-right bg-emerald-50/70 text-emerald-950 font-black cursor-pointer hover:bg-emerald-100/70 border-r border-emerald-200/50"
                    >
                      Total Paid
                    </th>
                  </>
                )}

                {/* BALANCE */}
                <th
                  onClick={() => handleSort('balance')}
                  className="p-3.5 text-right bg-rose-50/40 text-rose-950 font-black cursor-pointer hover:bg-rose-100/50"
                >
                  Balance Due
                </th>

                {/* ACTIONS */}
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-light-border/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-dark-muted font-semibold">
                    <i className="fas fa-search text-3xl opacity-30 block mb-2"></i>
                    No fee records match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.studentId} className="hover:bg-blue-50/30 transition-colors">
                    {/* Admission No / Enrollment */}
                    <td className="p-3.5">
                      <div className="font-extrabold text-dark-primary text-xs bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200 inline-block font-mono">
                        {rec.admission_no}
                      </div>
                      <div className="mt-1">
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.2 rounded-full inline-block ${
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
                    <td className="p-3.5">
                      <div className="font-extrabold text-dark-deepblue text-xs sm:text-sm">
                        {rec.student_name}
                      </div>
                      <div className="text-[10px] text-dark-muted font-bold mt-0.5">
                        {rec.className}
                      </div>
                    </td>

                    {/* ALLOCATIONS */}
                    {(columnViewMode === 'all' || columnViewMode === 'allocations') && (
                      <>
                        {/* Previous Balance */}
                        <td className="p-3.5 text-right text-dark-soft">
                          {formatCurrency(rec.previous_balance)}
                        </td>

                        {/* MRQU Sponsorship (Allocated) */}
                        <td className="p-3.5 text-right text-purple-700 font-bold">
                          {formatCurrency(rec.mrqu_sponsorship)}
                        </td>

                        {/* External Sponsorship (Allocated) */}
                        <td className="p-3.5 text-right text-indigo-700 font-bold">
                          {formatCurrency(rec.external_sponsorship)}
                        </td>

                        {/* Student Payable */}
                        <td className="p-3.5 text-right text-dark-primary font-bold">
                          {formatCurrency(rec.student_payable)}
                        </td>

                        {/* Write-Off */}
                        <td className="p-3.5 text-right text-amber-700">
                          {formatCurrency(rec.write_off)}
                        </td>

                        {/* Total Fees Payable */}
                        <td className="p-3.5 text-right font-black text-blue-950 bg-blue-50/40 border-r border-blue-100">
                          {formatCurrency(rec.fees_total_payable)}
                        </td>
                      </>
                    )}

                    {/* RECEIPTS: DISTINCT PILLARS */}
                    {(columnViewMode === 'all' || columnViewMode === 'reconciliation') && (
                      <>
                        {/* MRQU Received */}
                        <td className="p-3.5 text-right bg-purple-50/20 font-bold text-purple-800">
                          <div>{formatCurrency(rec.mrqu_paid)}</div>
                          {rec.mrqu_sponsorship > 0 && (
                            <div className="text-[9px] font-semibold text-purple-600/70">
                              {rec.mrqu_balance > 0
                                ? `Due: ${formatCurrency(rec.mrqu_balance)}`
                                : 'Recv Full'}
                            </div>
                          )}
                        </td>

                        {/* External Received */}
                        <td className="p-3.5 text-right bg-indigo-50/20 font-bold text-indigo-800">
                          <div>{formatCurrency(rec.external_paid)}</div>
                          {rec.external_sponsorship > 0 && (
                            <div className="text-[9px] font-semibold text-indigo-600/70">
                              {rec.external_balance > 0
                                ? `Due: ${formatCurrency(rec.external_balance)}`
                                : 'Recv Full'}
                            </div>
                          )}
                        </td>

                        {/* Student Paid */}
                        <td className="p-3.5 text-right bg-teal-50/20 font-bold text-teal-800">
                          <div>{formatCurrency(rec.student_paid)}</div>
                          {rec.student_net_payable > 0 && (
                            <div className="text-[9px] font-semibold text-teal-600/70">
                              {rec.student_balance > 0
                                ? `Due: ${formatCurrency(rec.student_balance)}`
                                : 'Paid Full'}
                            </div>
                          )}
                        </td>

                        {/* Total Paid */}
                        <td className="p-3.5 text-right font-black text-emerald-800 bg-emerald-50/40 border-r border-emerald-100">
                          {formatCurrency(rec.total_paid)}
                        </td>
                      </>
                    )}

                    {/* Total Balance */}
                    <td className="p-3.5 text-right font-black bg-rose-50/20">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-black inline-block ${
                          rec.balance > 0
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {formatCurrency(rec.balance)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      {canEditFees ? (
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center transition-all shadow-2xs active:scale-95 mx-auto cursor-pointer"
                          title="Edit Fee & Sponsorship Record"
                        >
                          <i className="fas fa-pen text-xs"></i>
                        </button>
                      ) : (
                        <span className="text-[10px] text-dark-muted font-bold">View Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Fee Modal with Distinct Payment Breakdown ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-almostblack/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-light-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="bg-brand-primary px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <i className="fas fa-edit"></i>
                  Edit Student Fees & Sponsorships
                </h3>
                <p className="text-xs text-white/80 font-semibold mt-0.5">
                  Admission No: <span className="font-mono font-bold">{formData.admission_no}</span>
                  {editingRecord && (
                    <span className="ml-2 font-normal">({editingRecord.student_name})</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors text-xl font-bold cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Section 1: Fee Allocations & Adjustments */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-light-border pb-1.5">
                  <i className="fas fa-layer-group text-brand-primary text-xs"></i>
                  <span className="text-xs font-black text-dark-deepblue uppercase tracking-wider">
                    1. Fee Allocations & Adjustments
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1">
                      Previous Balance (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.previous_balance}
                      onChange={(e) =>
                        setFormData({ ...formData, previous_balance: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-light-border rounded-xl text-xs font-bold text-dark-primary outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-900 mb-1">
                      MRQU Sponsorship (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.mrqu_sponsorship}
                      onChange={(e) =>
                        setFormData({ ...formData, mrqu_sponsorship: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-purple-200 bg-purple-50/20 rounded-xl text-xs font-bold text-purple-900 outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">
                      External Sponsorship (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.external_sponsorship}
                      onChange={(e) =>
                        setFormData({ ...formData, external_sponsorship: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/20 rounded-xl text-xs font-bold text-indigo-900 outline-none focus:border-indigo-600"
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
                      onChange={(e) =>
                        setFormData({ ...formData, student_payable: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-light-border rounded-xl text-xs font-bold text-dark-primary outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">
                      Write-Off (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.write_off}
                      onChange={(e) => setFormData({ ...formData, write_off: e.target.value })}
                      className="w-full px-3 py-2 border border-amber-200 bg-amber-50/20 rounded-xl text-xs font-bold text-amber-900 outline-none focus:border-amber-600"
                    />
                  </div>

                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-blue-800">Total Payable:</span>
                    <span className="text-sm font-black text-blue-950">
                      {formatCurrency(liveFormCalculations.totalPayable)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Distinct Receipts & Payments Collected */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-light-border pb-1.5">
                  <i className="fas fa-hand-holding-dollar text-emerald-600 text-xs"></i>
                  <span className="text-xs font-black text-dark-deepblue uppercase tracking-wider">
                    2. Distinct Receipts & Payments Collected (₹)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* MRQU Paid */}
                  <div className="bg-purple-50/40 p-3 rounded-2xl border border-purple-200 space-y-1.5">
                    <label className="block text-xs font-extrabold text-purple-950">
                      MRQU Received (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.mrqu_paid}
                      onChange={(e) => setFormData({ ...formData, mrqu_paid: e.target.value })}
                      className="w-full px-3 py-2 border border-purple-300 rounded-xl text-xs font-black text-purple-900 bg-white outline-none focus:border-purple-600 shadow-2xs"
                    />
                    <div className="flex justify-between items-center text-[10px] pt-1 text-purple-900 font-semibold">
                      <span>Alloc: {formatCurrency(formData.mrqu_sponsorship)}</span>
                      <span className="font-extrabold">
                        Due: {formatCurrency(liveFormCalculations.mrquDue)}
                      </span>
                    </div>
                  </div>

                  {/* External Paid */}
                  <div className="bg-indigo-50/40 p-3 rounded-2xl border border-indigo-200 space-y-1.5">
                    <label className="block text-xs font-extrabold text-indigo-950">
                      External Received (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.external_paid}
                      onChange={(e) =>
                        setFormData({ ...formData, external_paid: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-indigo-300 rounded-xl text-xs font-black text-indigo-900 bg-white outline-none focus:border-indigo-600 shadow-2xs"
                    />
                    <div className="flex justify-between items-center text-[10px] pt-1 text-indigo-900 font-semibold">
                      <span>Alloc: {formatCurrency(formData.external_sponsorship)}</span>
                      <span className="font-extrabold">
                        Due: {formatCurrency(liveFormCalculations.extDue)}
                      </span>
                    </div>
                  </div>

                  {/* Student Paid */}
                  <div className="bg-emerald-50/40 p-3 rounded-2xl border border-emerald-200 space-y-1.5">
                    <label className="block text-xs font-extrabold text-emerald-950">
                      Student Paid (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.student_paid}
                      onChange={(e) => setFormData({ ...formData, student_paid: e.target.value })}
                      className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-xs font-black text-emerald-900 bg-white outline-none focus:border-emerald-600 shadow-2xs"
                    />
                    <div className="flex justify-between items-center text-[10px] pt-1 text-emerald-900 font-semibold">
                      <span>Net: {formatCurrency(liveFormCalculations.studentNet)}</span>
                      <span className="font-extrabold">
                        Due: {formatCurrency(liveFormCalculations.studentDue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculated Live Preview Box */}
              <div className="bg-light-lbg border border-light-border rounded-2xl p-4 space-y-2 mt-2">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="font-bold text-dark-muted block">Fees Total Payable:</span>
                    <span className="font-black text-blue-900 text-sm">
                      {formatCurrency(liveFormCalculations.totalPayable)}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-dark-muted block">Total Paid (Auto):</span>
                    <span className="font-black text-emerald-700 text-sm">
                      {formatCurrency(liveFormCalculations.totalPaid)}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-dark-muted block">Total Balance Due:</span>
                    <span
                      className={`font-black text-sm ${
                        liveFormCalculations.balance > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(liveFormCalculations.balance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-dark-soft rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-brand-primary hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
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

      {/* ── Bulk Import Modal with Sponsorship Distinction ── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-almostblack/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-light-border w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[92vh]"
          >
            {/* Header */}
            <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <i className="fas fa-file-import"></i>
                  Bulk Import Student Fees & Sponsorships
                </h3>
                <p className="text-xs text-white/80 font-semibold mt-0.5">
                  Import separate MRQU Sponsorship, External Sponsorship, and Student Paid amounts
                </p>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedPreviewRows([]);
                  setImportedFileName('');
                }}
                className="text-white/80 hover:text-white transition-colors text-xl font-bold cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Template download bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
                <div>
                  <span className="text-xs font-extrabold text-dark-primary block">
                    Upload an Excel (.xlsx / .xls) or CSV spreadsheet
                  </span>
                  <span className="text-[11px] text-dark-muted font-medium">
                    Supports distinct columns for MRQU Paid, External Paid, and Student Paid.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 shrink-0 cursor-pointer"
                >
                  <i className="fas fa-download text-emerald-600"></i>
                  Download Template (.xlsx)
                </button>
              </div>

              {/* Upload tabs: File vs Paste */}
              <div className="flex items-center gap-2 border-b border-light-border pb-2">
                <button
                  type="button"
                  onClick={() => setImportTab('file')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    importTab === 'file'
                      ? 'bg-indigo-600 text-white'
                      : 'text-dark-muted hover:text-dark-primary'
                  }`}
                >
                  <i className="fas fa-file-excel mr-1.5"></i>
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('text')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    importTab === 'text'
                      ? 'bg-indigo-600 text-white'
                      : 'text-dark-muted hover:text-dark-primary'
                  }`}
                >
                  <i className="fas fa-paste mr-1.5"></i>
                  Paste CSV Text
                </button>
              </div>

              {importTab === 'file' ? (
                /* File Upload Box */
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
              ) : (
                /* Paste CSV Area */
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={importCsvText}
                    onChange={(e) => setImportCsvText(e.target.value)}
                    placeholder="Paste CSV rows here (including header row: Admission No, MRQU Sponsorship, MRQU Paid, External Sponsorship, External Paid, Student Payable, Student Paid, ...)"
                    className="w-full p-3 font-mono text-xs border border-light-border rounded-xl bg-gray-50 focus:bg-white outline-none focus:border-indigo-600"
                  ></textarea>
                  <button
                    type="button"
                    onClick={handleParseTextCsv}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Parse CSV Text
                  </button>
                </div>
              )}

              {/* Live Preview Table of Parsed Rows */}
              {parsedPreviewRows.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between text-xs font-extrabold text-dark-primary">
                    <span className="flex items-center gap-2">
                      <i className="fas fa-list-check text-emerald-600"></i>
                      Detected {parsedPreviewRows.length} Valid Row(s)
                    </span>
                    <span className="text-indigo-700">
                      {parsedPreviewRows.filter((r) => r.isExisting).length} Existing Update(s) |{' '}
                      {parsedPreviewRows.filter((r) => !r.isExisting).length} New Record(s)
                    </span>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs font-semibold">
                      <thead className="bg-gray-100 border-b text-[9px] uppercase tracking-wider text-dark-muted font-bold">
                        <tr>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Admission No</th>
                          <th className="p-2.5">Student Name</th>
                          <th className="p-2.5 text-right text-blue-900">Total Payable</th>
                          <th className="p-2.5 text-right text-purple-700">MRQU Recv</th>
                          <th className="p-2.5 text-right text-indigo-700">Ext Recv</th>
                          <th className="p-2.5 text-right text-teal-700">Std Paid</th>
                          <th className="p-2.5 text-right text-emerald-700">Total Paid</th>
                          <th className="p-2.5 text-right text-rose-700">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedPreviewRows.map((r, idx) => (
                          <tr key={idx} className={r.isExisting ? 'bg-blue-50/20' : 'bg-white'}>
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
                            <td className="p-2.5 text-right font-bold text-purple-700">
                              {formatCurrency(r.mrqu_paid)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-indigo-700">
                              {formatCurrency(r.external_paid)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-teal-700">
                              {formatCurrency(r.student_paid)}
                            </td>
                            <td className="p-2.5 text-right font-black text-emerald-700">
                              {formatCurrency(r.total_paid)}
                            </td>
                            <td className="p-2.5 text-right font-black">
                              <span
                                className={r.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}
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
                className="px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 text-dark-soft rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImportSubmit}
                disabled={parsedPreviewRows.length === 0 || importing}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
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
