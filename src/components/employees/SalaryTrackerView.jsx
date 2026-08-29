import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

import SalaryTrackerHeader from './salary-tracker/SalaryTrackerHeader';
import SalaryPaymentLogView from './salary-tracker/SalaryPaymentLogView';
import SalaryDashboardMatrixView from './salary-tracker/SalaryDashboardMatrixView';
import ExtrasUpdateModal from './salary-tracker/ExtrasUpdateModal';
import PaymentSettlementModal from './salary-tracker/PaymentSettlementModal';
import CompensationHistoryModal from './salary-tracker/CompensationHistoryModal';
import BulkIncrementApplyModal from './employee-records/BulkIncrementApplyModal';
import SalaryTrackerExportModal from './salary-tracker/SalaryTrackerExportModal';
import SalaryTrackerUploadModal from './salary-tracker/SalaryTrackerUploadModal';
import InitializeMonthPromptModal from './salary-tracker/InitializeMonthPromptModal';
import { isMonthBeforeJoining } from './salary-tracker/joiningDateHelper';

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

const SalaryTrackerView = ({
  user,
  userRoles,
  viewMode: externalViewMode,
  setViewMode: externalSetViewMode,
  onRegisterControls,
  hideHeaderTopRow = false,
}) => {
  // Role Permission Check: Management and above level can update
  const canUpdateSalaryTracker = useMemo(() => {
    if (!Array.isArray(userRoles) || userRoles.length === 0) return true;
    const rolesLower = userRoles.map((r) => String(r).toLowerCase());
    return (
      rolesLower.includes('admin') ||
      rolesLower.includes('management') ||
      rolesLower.includes('superadmin')
    );
  }, [userRoles]);

  // View Mode: 'matrix' (Salary Credit Dashboard) | 'monthly' (Salary List View)
  const [internalViewMode, setInternalViewMode] = useState('matrix');
  const viewMode = externalViewMode || internalViewMode;
  const setViewMode = externalSetViewMode || setInternalViewMode;

  // Month Selection State: YYYY-MM (Defaults to Previous Month)
  const [selectedMonthStr, setSelectedMonthStr] = useState(() => {
    const now = new Date();
    let prevYear = now.getFullYear();
    let prevMonth = now.getMonth(); // 0-indexed month gives previous month 1-based number
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  });

  const [salYear, salMonth] = useMemo(() => {
    if (!selectedMonthStr || typeof selectedMonthStr !== 'string') {
      const now = new Date();
      return [now.getFullYear(), now.getMonth() + 1];
    }
    const parts = selectedMonthStr.split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = parseInt(parts[1], 10) || new Date().getMonth() + 1;
    return [y, m];
  }, [selectedMonthStr]);

  // Previous Month YYYY-MM
  const [prevYear, prevMonth] = useMemo(() => {
    let y = salYear;
    let m = salMonth - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    return [y, m];
  }, [salYear, salMonth]);

  // Compute 9 Months Array around current selected month (-6M to +2M)
  const matrixMonths = useMemo(() => {
    const months = [];
    const baseDate = new Date(salYear, salMonth - 1, 1);
    for (let i = -6; i <= 2; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const label = `${MONTH_NAMES[m - 1]} '${String(y).slice(-2)}`;
      const isCurrent = i === 0;
      months.push({ year: y, month: m, label, isCurrent, offset: i });
    }
    return months;
  }, [salYear, salMonth]);

  // States
  const [employees, setEmployees] = useState([]);
  const [trackerRecords, setTrackerRecords] = useState([]); // Selected month records
  const [prevTrackerRecords, setPrevTrackerRecords] = useState([]); // Previous month records
  const [matrixTrackerRecords, setMatrixTrackerRecords] = useState([]); // All records for 9 months
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // Options & Grouping
  const [groupByOrg, setGroupByOrg] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'partial' | 'unpaid'

  // Selected Item for Modals
  const [selectedExtrasItem, setSelectedExtrasItem] = useState(null);
  const [editExtrasValue, setEditExtrasValue] = useState('0');
  const [editDeductionsValue, setEditDeductionsValue] = useState('0');
  const [extrasNotes, setExtrasNotes] = useState('');

  const [selectedPaymentItem, setSelectedPaymentItem] = useState(null);
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paid_by: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin',
    paid_through: 'Bank Transfer',
    settlement_type: 'complete',
    adjustment_reason: '',
    notes: '',
  });

  // Compensation History Modal State
  const [selectedHistoryEmployee, setSelectedHistoryEmployee] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Bulk Apply Increments State
  const [isBulkApplyModalOpen, setIsBulkApplyModalOpen] = useState(false);
  const [bulkApplyFilterMode, setBulkApplyFilterMode] = useState('month');
  const [bulkApplyDateValue, setBulkApplyDateValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedBulkEmpIds, setSelectedBulkEmpIds] = useState([]);

  // Export & Upload Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Uninitialized Month Prompt Modal State
  const [uninitializedPromptState, setUninitializedPromptState] = useState({
    isOpen: false,
    monthObj: null,
    employee: null,
  });

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Salaried Employees
      let empList = [];
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .eq('is_salaried_employee', true)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!empErr && Array.isArray(empData) && empData.length > 0) {
        empList = empData;
      } else {
        const localEmpsRaw = localStorage.getItem('jzv_employees_local_data');
        if (localEmpsRaw) {
          const parsed = JSON.parse(localEmpsRaw);
          empList = parsed.filter((e) => e.is_salaried_employee !== false && e.is_active !== false);
        }
      }
      setEmployees(empList);

      // 2. Fetch Selected Month Tracker Records
      let currentTrackers = [];
      let { data: curTrackData, error: curTrackErr } = await supabase
        .from('trk_emp_salary')
        .select('*')
        .eq('sal_year', salYear)
        .eq('sal_month', salMonth);

      if (curTrackErr) {
        const fb = await supabase
          .from('salary_tracker')
          .select('*')
          .eq('sal_year', salYear)
          .eq('sal_month', salMonth);
        if (!fb.error && fb.data) {
          curTrackData = fb.data;
          curTrackErr = null;
        }
      }

      if (!curTrackErr && Array.isArray(curTrackData)) {
        currentTrackers = curTrackData;
      } else {
        const localTrackersRaw = localStorage.getItem(`jzv_salary_tracker_${salYear}_${salMonth}`);
        if (localTrackersRaw) {
          currentTrackers = JSON.parse(localTrackersRaw);
        }
      }
      setTrackerRecords(currentTrackers);

      // 3. Fetch Previous Month Tracker Records
      let prevTrackers = [];
      let { data: prevTrackData, error: prevTrackErr } = await supabase
        .from('trk_emp_salary')
        .select('*')
        .eq('sal_year', prevYear)
        .eq('sal_month', prevMonth);

      if (prevTrackErr) {
        const fb = await supabase
          .from('salary_tracker')
          .select('*')
          .eq('sal_year', prevYear)
          .eq('sal_month', prevMonth);
        if (!fb.error && fb.data) {
          prevTrackData = fb.data;
          prevTrackErr = null;
        }
      }

      if (!prevTrackErr && Array.isArray(prevTrackData)) {
        prevTrackers = prevTrackData;
      } else {
        const localPrevRaw = localStorage.getItem(`jzv_salary_tracker_${prevYear}_${prevMonth}`);
        if (localPrevRaw) {
          prevTrackers = JSON.parse(localPrevRaw);
        }
      }
      setPrevTrackerRecords(prevTrackers);

      // 4. Fetch 9-Month Matrix Records
      try {
        let { data: matData, error: matErr } = await supabase.from('trk_emp_salary').select('*');
        if (matErr) {
          const fb = await supabase.from('salary_tracker').select('*');
          if (!fb.error && fb.data) {
            matData = fb.data;
            matErr = null;
          }
        }

        if (!matErr && Array.isArray(matData)) {
          setMatrixTrackerRecords(matData);
        } else {
          const localMat = [];
          matrixMonths.forEach(({ year, month }) => {
            const raw = localStorage.getItem(`jzv_salary_tracker_${year}_${month}`);
            if (raw) {
              try {
                localMat.push(...JSON.parse(raw));
              } catch (e) {}
            }
          });
          setMatrixTrackerRecords(localMat);
        }
      } catch (e) {
        console.warn('Matrix tracker fetch error:', e);
      }
    } catch (err) {
      console.error('Error loading salary tracker data:', err);
      showToast('Error loading salary tracker data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [salYear, salMonth]);

  // Close modals on Esc keypress
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedPaymentItem) {
          setSelectedPaymentItem(null);
        }
        if (selectedExtrasItem) {
          setSelectedExtrasItem(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPaymentItem, selectedExtrasItem]);

  // Requirement 5: Initialize Month Records in DB & State
  // Initialize Month Records in DB & State (Batch or Single Employee)
  const handleInitializeSpecificMonth = async (
    targetYear,
    targetMonth,
    targetEmp = null,
    onlyTarget = false
  ) => {
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return false;
    }
    if (!Array.isArray(employees) || employees.length === 0) {
      showToast('No active salaried employees found to initialize', 'error');
      return false;
    }

    setInitializing(true);
    try {
      const existingSet = new Set();
      matrixTrackerRecords
        .filter((tr) => tr.sal_year === targetYear && tr.sal_month === targetMonth)
        .forEach((tr) => {
          existingSet.add(`${tr.employee_id}_${tr.organization || ''}`);
        });

      const employeesToInit = onlyTarget && targetEmp ? [targetEmp] : employees;
      const newPayloads = [];

      employeesToInit.forEach((emp) => {
        const org = emp.organization || 'Jamia Zaytoonah';
        const key = `${emp.id}_${org}`;
        if (!existingSet.has(key)) {
          const baseSalary = Number(emp.current_salary) || 0;
          newPayloads.push({
            employee_id: emp.id,
            employee_name: emp.name || '',
            organization: org,
            sal_year: targetYear,
            sal_month: targetMonth,
            salary: baseSalary,
            extras: 0,
            deductions: 0,
            total_paid: 0,
            history: [],
          });
        }
      });

      if (newPayloads.length === 0) {
        if (onlyTarget && targetEmp) {
          showToast(`Salary record for ${targetEmp.name} already exists for this month.`, 'info');
        } else {
          showToast('All salaried employees already initialized for this month.', 'info');
        }
        setInitializing(false);
        return true;
      }

      let { data: insertedData, error: insertErr } = await supabase
        .from('trk_emp_salary')
        .insert(newPayloads)
        .select();

      if (insertErr) {
        const fb = await supabase
          .from('salary_tracker')
          .insert(newPayloads)
          .select();
        if (!fb.error && fb.data) {
          insertedData = fb.data;
          insertErr = null;
        } else {
          console.warn(
            'Supabase error during initialization (using local fallback):',
            insertErr.message
          );
        }
      }

      const generatedRecords =
        insertedData || newPayloads.map((p, idx) => ({ ...p, id: Date.now() + idx }));

      if (targetYear === salYear && targetMonth === salMonth) {
        setTrackerRecords((prev) => {
          const updated = [...prev, ...generatedRecords];
          localStorage.setItem(
            `jzv_salary_tracker_${targetYear}_${targetMonth}`,
            JSON.stringify(updated)
          );
          return updated;
        });
      }

      setMatrixTrackerRecords((prev) => [...prev, ...generatedRecords]);

      const monthLabel = MONTH_NAMES[targetMonth - 1]
        ? `${MONTH_NAMES[targetMonth - 1]} '${String(targetYear).slice(-2)}`
        : `${targetMonth}/${targetYear}`;

      if (onlyTarget && targetEmp) {
        showToast(
          `Successfully initialized salary record for ${targetEmp.name} for ${monthLabel}!`,
          'success'
        );
      } else {
        showToast(
          `Successfully initialized salary records for ${newPayloads.length} employee(s) for ${monthLabel}!`,
          'success'
        );
      }
      return true;
    } catch (err) {
      console.error('Failed to initialize month records:', err);
      showToast('Failed to initialize month records: ' + err.message, 'error');
      return false;
    } finally {
      setInitializing(false);
    }
  };

  const handleInitializeMonthRecords = async () => {
    return handleInitializeSpecificMonth(salYear, salMonth);
  };

  // Map of Previous Month Pending Balances
  const prevMonthPendingMap = useMemo(() => {
    const map = new Map();
    prevTrackerRecords.forEach((r) => {
      const baseSal = Number(r.salary) || 0;
      const extras = Number(r.extras) || 0;
      const deductions = Number(r.deductions) || 0;
      const payable = baseSal + extras - deductions;
      const paid = Number(r.total_paid) || 0;
      const bal = payable - paid;
      if (bal > 0) {
        const key = `${r.employee_id}_${r.organization || ''}`;
        map.set(key, bal);
      }
    });
    return map;
  }, [prevTrackerRecords]);

  // Combined Monthly Salary Data (Employees merged with Tracker records)
  const trackerItems = useMemo(() => {
    const trackerMap = new Map();
    trackerRecords.forEach((tr) => {
      const key = `${tr.employee_id}_${tr.organization || ''}`;
      trackerMap.set(key, tr);
    });

    const items = [];
    employees.forEach((emp) => {
      const org = emp.organization || 'Jamia Zaytoonah';
      const key = `${emp.id}_${org}`;
      const record = trackerMap.get(key);

      // Only include employees who have an explicit salary_tracker entry for this month
      if (trackerRecords.length > 0 && !record) {
        return;
      }

      const baseSalary = Number(record?.salary != null ? record.salary : emp.current_salary) || 0;
      const extras = Number(record?.extras) || 0;
      const deductions = Number(record?.deductions) || 0;
      const totalPayable = baseSalary + extras - deductions;
      const totalPaid = Number(record?.total_paid) || 0;
      const balance = Math.max(0, totalPayable - totalPaid);

      let status = 'unpaid';
      if (balance <= 0 && totalPaid > 0) {
        status = 'paid';
      } else if (totalPaid > 0 && balance > 0) {
        status = 'partial';
      }

      items.push({
        emp,
        organization: org,
        trackRecord: record || null,
        baseSalary,
        extras,
        deductions,
        totalPayable,
        totalPaid,
        balance,
        lastPaymentDate: record?.last_payment_date || null,
        lastPaidBy: record?.last_paid_by || null,
        history: Array.isArray(record?.history) ? record.history : [],
        status,
        targetYear: salYear,
        targetMonth: salMonth,
      });
    });

    return items;
  }, [employees, trackerRecords, salYear, salMonth]);

  // Search Filtered Items
  const filteredItems = useMemo(() => {
    return trackerItems.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.emp.name.toLowerCase().includes(q);
        const matchEmpId = (item.emp.emp_id || `ID: ${item.emp.id}`).toLowerCase().includes(q);
        const matchDesig = (item.emp.designation || '').toLowerCase().includes(q);
        const matchOrg = item.organization.toLowerCase().includes(q);
        if (!matchName && !matchEmpId && !matchDesig && !matchOrg) return false;
      }
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [trackerItems, searchQuery, statusFilter]);

  // Grouped by Organization
  const groupedByOrgItems = useMemo(() => {
    if (!groupByOrg) {
      return [['All Organizations', filteredItems]];
    }
    const map = new Map();
    filteredItems.forEach((item) => {
      const org = item.organization || 'Jamia Zaytoonah';
      if (!map.has(org)) map.set(org, []);
      map.get(org).push(item);
    });
    return Array.from(map.entries());
  }, [filteredItems, groupByOrg]);

  // 1. Open Extras Modal
  const handleOpenExtrasModal = (item) => {
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return;
    }
    setSelectedExtrasItem(item);
    setEditExtrasValue(String(item.extras || 0));
    setEditDeductionsValue(String(item.deductions || 0));
    setExtrasNotes(item.trackRecord?.notes || '');
  };

  // Save Extras & Deductions
  const handleSaveExtrasOnly = async (e) => {
    e.preventDefault();
    if (!selectedExtrasItem) return;
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return;
    }

    const extrasNum = Number(editExtrasValue) || 0;
    const deductionsNum = Number(editDeductionsValue) || 0;
    setSaving(true);
    try {
      const emp = selectedExtrasItem.emp;
      const org = selectedExtrasItem.organization;
      const targetY = selectedExtrasItem.targetYear || salYear;
      const targetM = selectedExtrasItem.targetMonth || salMonth;

      const payload = {
        employee_id: emp.id,
        employee_name: emp.name || '',
        organization: org,
        sal_year: targetY,
        sal_month: targetM,
        salary: selectedExtrasItem.baseSalary,
        extras: extrasNum,
        deductions: deductionsNum,
        total_paid: selectedExtrasItem.totalPaid,
        last_payment_date: selectedExtrasItem.lastPaymentDate,
        last_paid_by: selectedExtrasItem.lastPaidBy,
        history: selectedExtrasItem.history,
        notes: extrasNotes || undefined,
      };

      let { data: upsertData, error: upsertErr } = await supabase
        .from('trk_emp_salary')
        .upsert(payload, { onConflict: 'employee_id,organization,sal_year,sal_month' })
        .select();

      if (upsertErr) {
        const fb = await supabase
          .from('salary_tracker')
          .upsert(payload, { onConflict: 'employee_id,organization,sal_year,sal_month' })
          .select();
        if (!fb.error && fb.data) {
          upsertData = fb.data;
          upsertErr = null;
        } else {
          console.warn('Supabase upsert error (using local cache fallback):', upsertErr.message);
        }
      }

      const newTrackerList = [...trackerRecords];
      const matchIdx = newTrackerList.findIndex(
        (r) =>
          String(r.employee_id) === String(emp.id) &&
          (r.organization || '') === org &&
          r.sal_year === targetY &&
          r.sal_month === targetM
      );

      const recordToSave =
        upsertData && upsertData[0] ? upsertData[0] : { ...payload, id: Date.now() };

      if (matchIdx !== -1) {
        newTrackerList[matchIdx] = recordToSave;
      } else if (targetY === salYear && targetM === salMonth) {
        newTrackerList.push(recordToSave);
      }

      setTrackerRecords(newTrackerList);
      localStorage.setItem(
        `jzv_salary_tracker_${targetY}_${targetM}`,
        JSON.stringify(newTrackerList)
      );
      setMatrixTrackerRecords((prev) => {
        const filtered = prev.filter(
          (r) =>
            !(
              String(r.employee_id) === String(emp.id) &&
              r.organization === org &&
              r.sal_year === targetY &&
              r.sal_month === targetM
            )
        );
        return [...filtered, recordToSave];
      });

      showToast(`Extras & Deductions updated for ${emp.name}!`, 'success');
      setSelectedExtrasItem(null);
    } catch (err) {
      console.error('Failed to update extras:', err);
      showToast('Failed to update extras: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // 2. Open Payment Settlement Modal
  const handleOpenPaymentModal = (item) => {
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return;
    }
    setSelectedPaymentItem(item);
    setSettlementForm({
      amount: item.balance > 0 ? String(item.balance) : '',
      date: new Date().toISOString().split('T')[0],
      paid_by: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin',
      paid_through: 'Bank Transfer',
      settlement_type: 'complete',
      adjustment_reason: '',
      notes: '',
    });
  };

  // Open Payment Settlement Modal directly from Matrix Swatch Click
  const handleOpenMatrixPaymentModal = (emp, m, skipPrompt = false) => {
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return;
    }

    // Requirement 2: Check if target month has 0 initialized entries across all staff
    if (!skipPrompt) {
      const monthEntries = matrixTrackerRecords.filter(
        (r) => r.sal_year === m.year && r.sal_month === m.month
      );
      if (monthEntries.length === 0) {
        setUninitializedPromptState({
          isOpen: true,
          monthObj: m,
          employee: emp,
        });
        return;
      }
    }

    const org = emp.organization || 'Jamia Zaytoonah';
    const key = `${emp.id}_${org}_${m.year}_${m.month}`;
    const existing = matrixLookupMap.get(key);

    const baseSalary = Number(existing?.salary != null ? existing.salary : emp.current_salary) || 0;
    const extras = Number(existing?.extras) || 0;
    const deductions = Number(existing?.deductions) || 0;
    const totalPayable = baseSalary + extras - deductions;
    const totalPaid = Number(existing?.total_paid) || 0;
    const balance = Math.max(0, totalPayable - totalPaid);

    let status = 'unpaid';
    if (totalPaid >= totalPayable && totalPayable > 0) {
      status = 'paid';
    } else if (totalPaid > 0 && totalPaid < totalPayable) {
      status = 'partial';
    }

    const item = {
      emp,
      organization: org,
      trackRecord: existing || null,
      baseSalary,
      extras,
      deductions,
      totalPayable,
      totalPaid,
      balance,
      lastPaymentDate: existing?.last_payment_date || null,
      lastPaidBy: existing?.last_paid_by || null,
      history: Array.isArray(existing?.history) ? existing.history : [],
      status,
      targetYear: m.year,
      targetMonth: m.month,
      isNewEntry: !existing,
    };

    setSelectedPaymentItem(item);
    setSettlementForm({
      amount: balance > 0 ? String(balance) : (baseSalary > 0 ? String(baseSalary) : ''),
      date: new Date().toISOString().split('T')[0],
      paid_by: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin',
      paid_through: 'Bank Transfer',
      settlement_type: 'complete',
      adjustment_reason: '',
      notes: '',
    });
  };

  // Save Payment Settlement
  const handleSavePaymentSettlement = async (e, resolutionData = {}) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedPaymentItem) return;
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return;
    }

    const amountNum = Number(settlementForm.amount) || 0;
    if (amountNum <= 0) {
      showToast('Please enter a valid payment amount greater than ₹0', 'error');
      return;
    }

    setSaving(true);
    try {
      const emp = selectedPaymentItem.emp;
      const org = selectedPaymentItem.organization;
      const targetY = selectedPaymentItem.targetYear || salYear;
      const targetM = selectedPaymentItem.targetMonth || salMonth;
      const existingHistory = selectedPaymentItem.history || [];

      const baseSalary = selectedPaymentItem.baseSalary || 0;
      const totalPayable = selectedPaymentItem.totalPayable || 0;
      let finalExtras = selectedPaymentItem.extras || 0;
      let finalDeductions = selectedPaymentItem.deductions || 0;

      const { settlementType = 'complete', selectedReasons = [] } = resolutionData;
      const isCompleteSalary = settlementType === 'complete';

      // Formatted note combining selected multi-options tags + manual note
      let noteContent = settlementForm.notes || '';
      if (selectedReasons && selectedReasons.length > 0) {
        const reasonTag = `[${selectedReasons.join(', ')}]`;
        noteContent = noteContent ? `${reasonTag} ${noteContent}` : reasonTag;
      }

      const updatedHistory = [
        ...existingHistory,
        {
          id: Date.now(),
          amount: amountNum,
          date: settlementForm.date,
          by: settlementForm.paid_by,
          paid_through: settlementForm.paid_through,
          notes: noteContent,
          settlement_type: settlementType,
          reasons: selectedReasons,
        },
      ];

      const newTotalPaid = updatedHistory.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

      // Rule 1: Less payment than balance + partial salary selected -> normal calculation
      // Rule 2: Less payment than balance + complete salary selected -> add difference to deduction
      // Rule 3: More payment than balance + complete salary selected -> add difference to extras
      if (isCompleteSalary) {
        if (newTotalPaid > totalPayable) {
          finalExtras = finalExtras + (newTotalPaid - totalPayable);
        } else if (newTotalPaid < totalPayable) {
          finalDeductions = finalDeductions + (totalPayable - newTotalPaid);
        }
      }

      const payload = {
        employee_id: emp.id,
        employee_name: emp.name || '',
        organization: org,
        sal_year: targetY,
        sal_month: targetM,
        salary: baseSalary,
        extras: finalExtras,
        deductions: finalDeductions,
        total_paid: newTotalPaid,
        last_payment_date: settlementForm.date,
        last_paid_by: settlementForm.paid_by,
        history: updatedHistory,
        notes: noteContent || undefined,
      };

      let { data: upsertData, error: upsertErr } = await supabase
        .from('trk_emp_salary')
        .upsert(payload, { onConflict: 'employee_id,organization,sal_year,sal_month' })
        .select();

      if (upsertErr) {
        const fb = await supabase
          .from('salary_tracker')
          .upsert(payload, { onConflict: 'employee_id,organization,sal_year,sal_month' })
          .select();
        if (!fb.error && fb.data) {
          upsertData = fb.data;
          upsertErr = null;
        } else {
          console.warn('Supabase upsert error (using local cache fallback):', upsertErr.message);
        }
      }

      const newTrackerList = [...trackerRecords];
      const matchIdx = newTrackerList.findIndex(
        (r) =>
          String(r.employee_id) === String(emp.id) &&
          (r.organization || '') === org &&
          r.sal_year === targetY &&
          r.sal_month === targetM
      );

      const recordToSave =
        upsertData && upsertData[0] ? upsertData[0] : { ...payload, id: Date.now() };

      if (matchIdx !== -1) {
        newTrackerList[matchIdx] = recordToSave;
      } else if (targetY === salYear && targetM === salMonth) {
        newTrackerList.push(recordToSave);
      }

      setTrackerRecords(newTrackerList);
      localStorage.setItem(
        `jzv_salary_tracker_${targetY}_${targetM}`,
        JSON.stringify(newTrackerList)
      );
      setMatrixTrackerRecords((prev) => {
        const filtered = prev.filter(
          (r) =>
            !(
              String(r.employee_id) === String(emp.id) &&
              r.organization === org &&
              r.sal_year === targetY &&
              r.sal_month === targetM
            )
        );
        return [...filtered, recordToSave];
      });

      const toastMsg = selectedPaymentItem.isNewEntry
        ? `Salary entry initialized and payment of ₹${amountNum.toLocaleString('en-IN')} recorded for ${emp.name}!`
        : `Payment settlement of ₹${amountNum.toLocaleString('en-IN')} recorded for ${emp.name}!`;

      showToast(toastMsg, 'success');
      setSelectedPaymentItem(null);
    } catch (err) {
      console.error('Failed to record payment settlement:', err);
      showToast('Failed to record payment settlement: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Revert / Delete Individual Payment Entry from History
  const handleDeletePaymentEntry = async (item, historyIndex) => {
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return;
    }

    setSaving(true);
    try {
      const emp = item.emp;
      const org = item.organization;
      const targetY = item.targetYear || salYear;
      const targetM = item.targetMonth || salMonth;

      const currentHistory = item.history || [];
      const deletedRecord = currentHistory[historyIndex];
      const updatedHistory = currentHistory.filter((_, idx) => idx !== historyIndex);

      const newTotalPaid = updatedHistory.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
      const lastRec = updatedHistory[updatedHistory.length - 1];

      const payload = {
        employee_id: emp.id,
        employee_name: emp.name || '',
        organization: org,
        sal_year: targetY,
        sal_month: targetM,
        salary: item.baseSalary,
        extras: item.extras,
        deductions: item.deductions,
        total_paid: newTotalPaid,
        last_payment_date: lastRec?.date || null,
        last_paid_by: lastRec?.by || null,
        history: updatedHistory,
        notes: lastRec?.notes || undefined,
      };

      let { data: upsertData, error: upsertErr } = await supabase
        .from('trk_emp_salary')
        .upsert(payload, { onConflict: 'employee_id,organization,sal_year,sal_month' })
        .select();

      if (upsertErr) {
        const fb = await supabase
          .from('salary_tracker')
          .upsert(payload, { onConflict: 'employee_id,organization,sal_year,sal_month' })
          .select();
        if (!fb.error && fb.data) {
          upsertData = fb.data;
          upsertErr = null;
        } else {
          console.warn('Supabase upsert error (using local cache fallback):', upsertErr.message);
        }
      }

      const newTrackerList = [...trackerRecords];
      const matchIdx = newTrackerList.findIndex(
        (r) =>
          String(r.employee_id) === String(emp.id) &&
          (r.organization || '') === org &&
          r.sal_year === targetY &&
          r.sal_month === targetM
      );

      const recordToSave =
        upsertData && upsertData[0] ? upsertData[0] : { ...payload, id: Date.now() };

      if (matchIdx !== -1) {
        newTrackerList[matchIdx] = recordToSave;
      } else if (targetY === salYear && targetM === salMonth) {
        newTrackerList.push(recordToSave);
      }

      setTrackerRecords(newTrackerList);
      localStorage.setItem(
        `jzv_salary_tracker_${targetY}_${targetM}`,
        JSON.stringify(newTrackerList)
      );
      setMatrixTrackerRecords((prev) => {
        const filtered = prev.filter(
          (r) =>
            !(
              String(r.employee_id) === String(emp.id) &&
              r.organization === org &&
              r.sal_year === targetY &&
              r.sal_month === targetM
            )
        );
        return [...filtered, recordToSave];
      });

      const newTotalPayable = item.baseSalary + item.extras - item.deductions;
      const newBalance = Math.max(0, newTotalPayable - newTotalPaid);
      let newStatus = 'unpaid';
      if (newBalance <= 0 && newTotalPaid > 0) newStatus = 'paid';
      else if (newTotalPaid > 0 && newBalance > 0) newStatus = 'partial';

      setSelectedPaymentItem({
        ...item,
        totalPaid: newTotalPaid,
        balance: newBalance,
        history: updatedHistory,
        status: newStatus,
        trackRecord: recordToSave,
      });

      showToast(
        `Payment entry of ₹${(Number(deletedRecord?.amount) || 0).toLocaleString(
          'en-IN'
        )} reverted successfully!`,
        'success'
      );
    } catch (err) {
      console.error('Failed to revert payment:', err);
      showToast('Failed to revert payment: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Matrix Lookup Map
  const matrixLookupMap = useMemo(() => {
    const map = new Map();
    matrixTrackerRecords.forEach((tr) => {
      const key = `${tr.employee_id}_${tr.organization || ''}_${tr.sal_year}_${tr.sal_month}`;
      map.set(key, tr);
    });
    return map;
  }, [matrixTrackerRecords]);

  // Matrix View Grouped by Organization
  const matrixFilteredGroupedEmployees = useMemo(() => {
    const filtered = employees.filter((emp) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.name?.toLowerCase().includes(q);
        const matchEmpId = (emp.emp_id || `EMP-${emp.id}`).toLowerCase().includes(q);
        const matchDesig = (emp.designation || '').toLowerCase().includes(q);
        const matchOrg = (emp.organization || '').toLowerCase().includes(q);
        if (!matchName && !matchEmpId && !matchDesig && !matchOrg) return false;
      }

      if (statusFilter !== 'all') {
        const org = emp.organization || 'Jamia Zaytoonah';
        const key = `${emp.id}_${org}_${salYear}_${salMonth}`;
        const record = matrixLookupMap.get(key);

        let empStatus = 'unpaid';
        if (record) {
          const baseSal = Number(record.salary != null ? record.salary : emp.current_salary) || 0;
          const extras = Number(record.extras) || 0;
          const deductions = Number(record.deductions) || 0;
          const payable = baseSal + extras - deductions;
          const paid = Number(record.total_paid) || 0;
          const bal = payable - paid;

          if (bal <= 0 && paid > 0) {
            empStatus = 'paid';
          } else if (paid > 0 && bal > 0) {
            empStatus = 'partial';
          } else {
            empStatus = 'unpaid';
          }
        }

        if (empStatus !== statusFilter) return false;
      }

      return true;
    });

    if (!groupByOrg) {
      return [['All Organizations', filtered]];
    }

    const map = new Map();
    filtered.forEach((emp) => {
      const org = emp.organization || 'Jamia Zaytoonah';
      if (!map.has(org)) map.set(org, []);
      map.get(org).push(emp);
    });
    return Array.from(map.entries());
  }, [employees, searchQuery, statusFilter, salYear, salMonth, matrixLookupMap, groupByOrg]);

  // Cumulative Overall Stats Across Organizations
  const cumulativeStats = useMemo(() => {
    let prevPendingCount = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    trackerItems.forEach((item) => {
      if (item.status === 'paid') paidCount++;
      else unpaidCount++;
      totalPaid += item.totalPaid || 0;
      totalBalance += item.balance || 0;

      const prevKey = `${item.emp.id}_${item.organization}`;
      if (prevMonthPendingMap.has(prevKey)) prevPendingCount++;
    });

    return {
      prevPendingCount,
      paidCount,
      unpaidCount,
      totalPaid,
      totalBalance,
      totalEmployees: trackerItems.length,
    };
  }, [trackerItems, prevMonthPendingMap]);



  const handleOpenHistoryModal = (emp) => {
    setSelectedHistoryEmployee(emp);
    setIsHistoryModalOpen(true);
  };

  const handleSaveCompensationHistory = async (
    empId,
    updatedHistory,
    updatedSalary,
    trackerUpdateMonths = []
  ) => {
    setSaving(true);
    try {
      const newSalaryNum = Number(updatedSalary) || 0;
      const { error } = await supabase
        .from('employees')
        .update({
          compensation_history: updatedHistory,
          current_salary: newSalaryNum,
        })
        .eq('id', empId);

      if (error) throw error;

      // Retroactively update selected Salary Tracker records
      if (Array.isArray(trackerUpdateMonths) && trackerUpdateMonths.length > 0) {
        for (const mObj of trackerUpdateMonths) {
          let { error: trError } = await supabase
            .from('trk_emp_salary')
            .update({ salary: newSalaryNum })
            .eq('employee_id', empId)
            .eq('sal_year', mObj.year)
            .eq('sal_month', mObj.month);

          if (trError) {
            await supabase
              .from('salary_tracker')
              .update({ salary: newSalaryNum })
              .eq('employee_id', empId)
              .eq('sal_year', mObj.year)
              .eq('sal_month', mObj.month);
          }
        }
        showToast(
          `Updated current salary and ${trackerUpdateMonths.length} month(s) in Salary Tracker!`,
          'success'
        );
      } else {
        showToast('Employee compensation history updated successfully!', 'success');
      }

      setIsHistoryModalOpen(false);
      setSelectedHistoryEmployee(null);
      await fetchData();
    } catch (err) {
      showToast('Error saving compensation history: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const matchingBulkIncrements = useMemo(() => {
    if (!bulkApplyDateValue) return [];

    const matches = [];
    if (Array.isArray(employees)) {
      employees.forEach((emp) => {
        if (emp && emp.is_salaried_employee !== false && Array.isArray(emp.compensation_history)) {
          emp.compensation_history.forEach((h) => {
            if (!h || !h.date) return;
            const dateStr = String(h.date).trim();
            const targetVal = String(bulkApplyDateValue).trim();

            let isMatch = false;
            if (bulkApplyFilterMode === 'month') {
              isMatch = dateStr.startsWith(targetVal);
            } else {
              isMatch = dateStr === targetVal;
            }

            if (isMatch) {
              const currentSalary = Number(emp.current_salary) || 0;
              const hikeAmount = Number(h.amount) || 0;
              const proposedSalary = h.updated_salary
                ? Number(h.updated_salary)
                : currentSalary + hikeAmount;

              matches.push({
                emp,
                matchingEntry: h,
                currentSalary,
                hikeAmount,
                proposedSalary,
              });
            }
          });
        }
      });
    }

    return matches;
  }, [employees, bulkApplyFilterMode, bulkApplyDateValue]);

  const handleExecuteBulkApplyIncrements = async () => {
    if (selectedBulkEmpIds.length === 0) return;
    setSaving(true);
    try {
      let updatedCount = 0;
      const currentUserEmail = user?.email || 'Admin Bulk Apply';

      for (const empIdStr of selectedBulkEmpIds) {
        const item = matchingBulkIncrements.find((m) => String(m.emp.id) === empIdStr);
        if (item && item.proposedSalary > 0) {
          const emp = item.emp;
          const newSalary = item.proposedSalary;

          let historyList = Array.isArray(emp.update_history) ? [...emp.update_history] : [];
          historyList.push({
            timestamp: new Date().toISOString(),
            updated_by: currentUserEmail,
            fields_changed: ['current_salary_bulk_applied_from_increment'],
          });

          const { error: updErr } = await supabase
            .from('employees')
            .update({
              current_salary: newSalary,
              update_history: historyList,
            })
            .eq('id', emp.id);

          if (!updErr) {
            updatedCount++;
          }
        }
      }

      showToast(
        `Successfully updated current salary for ${updatedCount} selected employee(s)!`,
        'success'
      );
      setIsBulkApplyModalOpen(false);
      setSelectedBulkEmpIds([]);
      await fetchData();
    } catch (err) {
      showToast('Bulk apply error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpsertSalaryTracker = async (payloadRows) => {
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return;
    }
    if (!Array.isArray(payloadRows) || payloadRows.length === 0) return;

    setSaving(true);
    try {
      const empMap = new Map();
      employees.forEach((e) => empMap.set(String(e.id), e.name));
      const enrichedRows = payloadRows.map((r) => ({
        ...r,
        employee_name: r.employee_name || empMap.get(String(r.employee_id)) || '',
      }));

      const { data: upsertedData, error } = await supabase
        .from('salary_tracker')
        .upsert(enrichedRows, { onConflict: 'employee_id,sal_year,sal_month' })
        .select();

      if (error) {
        console.warn('Supabase bulk upsert error (using local state fallback):', error.message);
      }

      showToast(`Successfully processed ${payloadRows.length} salary record(s)!`, 'success');
      await fetchData();
    } catch (err) {
      console.error('Error during bulk upsert salary tracker:', err);
      showToast('Error saving bulk entries: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (onRegisterControls) {
      onRegisterControls({
        loading,
        onRefresh: fetchData,
        onOpenExport: () => setIsExportModalOpen(true),
        onOpenUpload: () => setIsUploadModalOpen(true),
        onOpenBulkIncrement: () => setIsBulkApplyModalOpen(true),
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        selectedMonthStr,
        setSelectedMonthStr,
        groupByOrg,
        setGroupByOrg,
      });
    }
  }, [
    loading,
    onRegisterControls,
    searchQuery,
    statusFilter,
    selectedMonthStr,
    groupByOrg,
  ]);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      {/* Top Header Card */}
      <SalaryTrackerHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        groupByOrg={groupByOrg}
        setGroupByOrg={setGroupByOrg}
        selectedMonthStr={selectedMonthStr}
        setSelectedMonthStr={setSelectedMonthStr}
        cumulativeStats={cumulativeStats}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onRefresh={fetchData}
        loading={loading}
        onOpenBulkIncrement={() => setIsBulkApplyModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onInitializeMonth={handleInitializeMonthRecords}
        isMonthInitialized={trackerRecords.length > 0}
        initializing={initializing}
        canUpdateSalaryTracker={canUpdateSalaryTracker}
        hideHeaderTopRow={hideHeaderTopRow}
      />

      {/* MAIN VIEW CONTENT */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-light-border">
          <i className="fas fa-circle-notch fa-spin text-3xl text-teal-600 mb-3"></i>
          <p className="text-xs font-bold text-dark-muted">Loading salary tracker data...</p>
        </div>
      ) : viewMode === 'monthly' ? (
        /* ================= TAB 1: PAYMENT LOG ================= */
        <SalaryPaymentLogView
          trackerRecords={trackerRecords}
          groupedByOrgItems={groupedByOrgItems}
          prevMonthPendingMap={prevMonthPendingMap}
          salMonth={salMonth}
          salYear={salYear}
          initializing={initializing}
          canUpdateSalaryTracker={canUpdateSalaryTracker}
          handleInitializeMonthRecords={handleInitializeMonthRecords}
          handleOpenExtrasModal={handleOpenExtrasModal}
          handleOpenPaymentModal={handleOpenPaymentModal}
          handleOpenHistoryModal={handleOpenHistoryModal}
          groupByOrg={groupByOrg}
        />
      ) : (
        /* ================= TAB 2: SALARY DASHBOARD (MATRIX SWATCHES VIEW) ================= */
        <SalaryDashboardMatrixView
          matrixFilteredGroupedEmployees={matrixFilteredGroupedEmployees}
          matrixMonths={matrixMonths}
          matrixLookupMap={matrixLookupMap}
          handleOpenMatrixPaymentModal={handleOpenMatrixPaymentModal}
          groupByOrg={groupByOrg}
          prevMonthPendingMap={prevMonthPendingMap}
        />
      )}

      {/* Modals */}
      <ExtrasUpdateModal
        selectedExtrasItem={selectedExtrasItem}
        setSelectedExtrasItem={setSelectedExtrasItem}
        editExtrasValue={editExtrasValue}
        setEditExtrasValue={setEditExtrasValue}
        editDeductionsValue={editDeductionsValue}
        setEditDeductionsValue={setEditDeductionsValue}
        extrasNotes={extrasNotes}
        setExtrasNotes={setExtrasNotes}
        handleSaveExtrasOnly={handleSaveExtrasOnly}
        saving={saving}
        canUpdateSalaryTracker={canUpdateSalaryTracker}
      />

      <PaymentSettlementModal
        selectedPaymentItem={selectedPaymentItem}
        setSelectedPaymentItem={setSelectedPaymentItem}
        settlementForm={settlementForm}
        setSettlementForm={setSettlementForm}
        handleSavePaymentSettlement={handleSavePaymentSettlement}
        handleDeletePaymentEntry={handleDeletePaymentEntry}
        saving={saving}
        canUpdateSalaryTracker={canUpdateSalaryTracker}
      />

      <CompensationHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedHistoryEmployee(null);
        }}
        employee={selectedHistoryEmployee}
        onSaveHistory={handleSaveCompensationHistory}
        matrixTrackerRecords={matrixTrackerRecords}
        saving={saving}
        user={user}
      />

      <BulkIncrementApplyModal
        isBulkApplyModalOpen={isBulkApplyModalOpen}
        setIsBulkApplyModalOpen={setIsBulkApplyModalOpen}
        bulkApplyFilterMode={bulkApplyFilterMode}
        setBulkApplyFilterMode={setBulkApplyFilterMode}
        bulkApplyDateValue={bulkApplyDateValue}
        setBulkApplyDateValue={setBulkApplyDateValue}
        matchingBulkIncrements={matchingBulkIncrements}
        selectedBulkEmpIds={selectedBulkEmpIds}
        setSelectedBulkEmpIds={setSelectedBulkEmpIds}
        handleExecuteBulkApplyIncrements={handleExecuteBulkApplyIncrements}
        saving={saving}
      />

      <SalaryTrackerExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        employees={employees}
        matrixTrackerRecords={matrixTrackerRecords}
      />

      <SalaryTrackerUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        employees={employees}
        matrixTrackerRecords={matrixTrackerRecords}
        onBulkUpsert={handleBulkUpsertSalaryTracker}
        saving={saving}
      />

      <InitializeMonthPromptModal
        isOpen={uninitializedPromptState.isOpen}
        onClose={() =>
          setUninitializedPromptState({ isOpen: false, monthObj: null, employee: null })
        }
        monthObj={uninitializedPromptState.monthObj}
        employee={uninitializedPromptState.employee}
        totalEmployees={employees.length}
        onInitializeAll={async () => {
          const { monthObj, employee } = uninitializedPromptState;
          if (!monthObj || !employee) return;
          const success = await handleInitializeSpecificMonth(
            monthObj.year,
            monthObj.month,
            employee,
            false
          );
          if (success) {
            setUninitializedPromptState({ isOpen: false, monthObj: null, employee: null });
            handleOpenMatrixPaymentModal(employee, monthObj, true);
          }
        }}
        onInitializeSingle={async () => {
          const { monthObj, employee } = uninitializedPromptState;
          if (!monthObj || !employee) return;
          const success = await handleInitializeSpecificMonth(
            monthObj.year,
            monthObj.month,
            employee,
            true
          );
          if (success) {
            setUninitializedPromptState({ isOpen: false, monthObj: null, employee: null });
            handleOpenMatrixPaymentModal(employee, monthObj, true);
          }
        }}
        initializing={initializing}
      />
    </div>
  );
};

class SalaryTrackerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SalaryTrackerErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
            <i className="fas fa-triangle-exclamation"></i>
          </div>
          <div>
            <h3 className="text-base font-extrabold text-dark-primary">Salary Tracker Exception</h3>
            <p className="text-xs text-rose-700 font-mono mt-1 bg-rose-50 p-2 rounded-xl border border-rose-100">
              {this.state.error?.message || 'Unexpected rendering error'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
          >
            Reload Salary Tracker
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SalaryTrackerViewWithErrorBoundary = (props) => (
  <SalaryTrackerErrorBoundary>
    <SalaryTrackerView {...props} />
  </SalaryTrackerErrorBoundary>
);

export default SalaryTrackerViewWithErrorBoundary;
