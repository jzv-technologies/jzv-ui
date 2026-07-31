import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';

const PAYMENT_MODES = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Other'];
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

const SalaryTrackerView = ({ user, userRoles }) => {
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

  // View Mode: 'matrix' (Salary Tracker / Matrix Swatches) | 'monthly' (Payment Update)
  const [viewMode, setViewMode] = useState('matrix');

  // Month Selection State: YYYY-MM
  const [selectedMonthStr, setSelectedMonthStr] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [salYear, salMonth] = useMemo(() => {
    const [y, m] = selectedMonthStr.split('-');
    return [
      parseInt(y, 10) || new Date().getFullYear(),
      parseInt(m, 10) || new Date().getMonth() + 1,
    ];
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

  // Filters & Options
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'partial' | 'unpaid'

  // Selected Item for Modals
  const [selectedExtrasItem, setSelectedExtrasItem] = useState(null);
  const [editExtrasValue, setEditExtrasValue] = useState('0');
  const [extrasNotes, setExtrasNotes] = useState('');

  const [selectedPaymentItem, setSelectedPaymentItem] = useState(null);
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paid_by: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin',
    paid_through: 'Bank Transfer',
    notes: '',
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
      const { data: curTrackData, error: curTrackErr } = await supabase
        .from('salary_tracker')
        .select('*')
        .eq('sal_year', salYear)
        .eq('sal_month', salMonth);

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
      const { data: prevTrackData, error: prevTrackErr } = await supabase
        .from('salary_tracker')
        .select('*')
        .eq('sal_year', prevYear)
        .eq('sal_month', prevMonth);

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
        const { data: matData, error: matErr } = await supabase.from('salary_tracker').select('*');

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
  const handleInitializeMonthRecords = async () => {
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return;
    }
    if (!Array.isArray(employees) || employees.length === 0) {
      showToast('No active salaried employees found to initialize', 'error');
      return;
    }

    setInitializing(true);
    try {
      const existingMap = new Map();
      trackerRecords.forEach((tr) => {
        const key = `${tr.employee_id}_${tr.organization || ''}`;
        existingMap.set(key, tr);
      });

      const newPayloads = [];
      employees.forEach((emp) => {
        const org = emp.organization || 'Jamia Zaytoonah';
        const key = `${emp.id}_${org}`;
        if (!existingMap.has(key)) {
          const baseSalary = Number(emp.current_salary) || 0;
          newPayloads.push({
            employee_id: emp.id,
            organization: org,
            sal_year: salYear,
            sal_month: salMonth,
            salary: baseSalary,
            extras: 0,
            total_paid: 0,
            history: [],
          });
        }
      });

      if (newPayloads.length === 0) {
        showToast(
          `All salaried employee records for ${salMonth}/${salYear} are already initialized!`,
          'info'
        );
        setInitializing(false);
        return;
      }

      // Try Supabase Upsert
      const { data: upsertedData, error: upsertErr } = await supabase
        .from('salary_tracker')
        .upsert(newPayloads, { onConflict: 'employee_id,organization,sal_year,sal_month' })
        .select();

      if (upsertErr) {
        console.warn(
          'Supabase initialization upsert warning (local fallback used):',
          upsertErr.message
        );
      }

      const added =
        upsertedData && upsertedData.length > 0
          ? upsertedData
          : newPayloads.map((p, i) => ({ ...p, id: Date.now() + i }));
      const updatedTrackerRecords = [...trackerRecords, ...added];
      setTrackerRecords(updatedTrackerRecords);
      localStorage.setItem(
        `jzv_salary_tracker_${salYear}_${salMonth}`,
        JSON.stringify(updatedTrackerRecords)
      );

      // Refresh Matrix
      setMatrixTrackerRecords((prev) => [...prev, ...added]);

      showToast(
        `Successfully initialized ${added.length} salary records for ${salMonth}/${salYear}!`,
        'success'
      );
    } catch (err) {
      console.error('Error initializing month salary records:', err);
      showToast('Failed to initialize records: ' + err.message, 'error');
    } finally {
      setInitializing(false);
    }
  };

  // Tracker-Only Display for Current Selected Month
  const trackerItems = useMemo(() => {
    if (!Array.isArray(trackerRecords) || !Array.isArray(employees)) return [];

    const empMap = new Map();
    employees.forEach((e) => empMap.set(String(e.id), e));

    const items = [];
    trackerRecords.forEach((tr) => {
      const emp = empMap.get(String(tr.employee_id));
      if (!emp) return;

      const org = tr.organization || emp.organization || 'Jamia Zaytoonah';
      const baseSalary = Number(tr.salary != null ? tr.salary : emp.current_salary) || 0;
      const extras = Number(tr.extras) || 0;
      const totalPayable = baseSalary + extras;
      const totalPaid = Number(tr.total_paid) || 0;
      const balance = totalPayable - totalPaid;

      let status = 'unpaid';
      if (totalPaid >= totalPayable && totalPayable > 0) {
        status = 'paid';
      } else if (totalPaid > 0 && totalPaid < totalPayable) {
        status = 'partial';
      }

      items.push({
        emp,
        organization: org,
        trackRecord: tr,
        baseSalary,
        extras,
        totalPayable,
        totalPaid,
        balance: Math.max(0, balance),
        lastPaymentDate: tr.last_payment_date || null,
        lastPaidBy: tr.last_paid_by || null,
        history: Array.isArray(tr.history) ? tr.history : [],
        status,
        targetYear: salYear,
        targetMonth: salMonth,
      });
    });

    return items;
  }, [trackerRecords, employees, salYear, salMonth]);

  // Previous Month Map for Org-level Last Month Pending Tile
  const prevMonthPendingMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(prevTrackerRecords)) return map;

    prevTrackerRecords.forEach((tr) => {
      const baseSal = Number(tr.salary) || 0;
      const extras = Number(tr.extras) || 0;
      const totPayable = baseSal + extras;
      const totPaid = Number(tr.total_paid) || 0;
      if (totPayable - totPaid > 0) {
        const key = `${tr.employee_id}_${tr.organization || ''}`;
        map.set(key, true);
      }
    });
    return map;
  }, [prevTrackerRecords]);

  // Filtered Tracker Items
  const filteredItems = useMemo(() => {
    return trackerItems.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.emp.name?.toLowerCase().includes(q);
        const matchEmpId = (item.emp.emp_id || `EMP-${item.emp.id}`).toLowerCase().includes(q);
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
    const map = new Map();
    filteredItems.forEach((item) => {
      const org = item.organization || 'Jamia Zaytoonah';
      if (!map.has(org)) map.set(org, []);
      map.get(org).push(item);
    });
    return Array.from(map.entries());
  }, [filteredItems]);

  // 1. Open Extras Modal
  const handleOpenExtrasModal = (item) => {
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return;
    }
    setSelectedExtrasItem(item);
    setEditExtrasValue(String(item.extras || 0));
    setExtrasNotes(item.trackRecord?.notes || '');
  };

  // Save Extras Only
  const handleSaveExtrasOnly = async (e) => {
    e.preventDefault();
    if (!selectedExtrasItem) return;
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return;
    }

    const extrasNum = Number(editExtrasValue) || 0;
    setSaving(true);
    try {
      const emp = selectedExtrasItem.emp;
      const org = selectedExtrasItem.organization;
      const targetY = selectedExtrasItem.targetYear || salYear;
      const targetM = selectedExtrasItem.targetMonth || salMonth;

      const payload = {
        employee_id: emp.id,
        organization: org,
        sal_year: targetY,
        sal_month: targetM,
        salary: selectedExtrasItem.baseSalary,
        extras: extrasNum,
        total_paid: selectedExtrasItem.totalPaid,
        last_payment_date: selectedExtrasItem.lastPaymentDate,
        last_paid_by: selectedExtrasItem.lastPaidBy,
        history: selectedExtrasItem.history,
        notes: extrasNotes || undefined,
      };

      const { data: upsertData, error: upsertErr } = await supabase
        .from('salary_tracker')
        .upsert(payload, { onConflict: 'employee_id,organization,sal_year,sal_month' })
        .select();

      if (upsertErr) {
        console.warn('Supabase upsert error (using local cache fallback):', upsertErr.message);
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

      showToast(`Extras updated for ${emp.name}!`, 'success');
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
      notes: '',
    });
  };

  // Open Payment Settlement Modal directly from Matrix Swatch Click
  const handleOpenMatrixPaymentModal = (emp, m) => {
    if (!canUpdateSalaryTracker) {
      showToast('Salary Tracker can be updated by Management and above level only', 'error');
      return;
    }

    const org = emp.organization || 'Jamia Zaytoonah';
    const key = `${emp.id}_${org}_${m.year}_${m.month}`;
    const existing = matrixLookupMap.get(key);

    const baseSalary = Number(existing?.salary != null ? existing.salary : emp.current_salary) || 0;
    const extras = Number(existing?.extras) || 0;
    const totalPayable = baseSalary + extras;
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
      totalPayable,
      totalPaid,
      balance,
      lastPaymentDate: existing?.last_payment_date || null,
      lastPaidBy: existing?.last_paid_by || null,
      history: Array.isArray(existing?.history) ? existing.history : [],
      status,
      targetYear: m.year,
      targetMonth: m.month,
    };

    setSelectedPaymentItem(item);
    setSettlementForm({
      amount: balance > 0 ? String(balance) : '',
      date: new Date().toISOString().split('T')[0],
      paid_by: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin',
      paid_through: 'Bank Transfer',
      notes: '',
    });
  };

  // Save Payment Settlement
  const handleSavePaymentSettlement = async (e) => {
    e.preventDefault();
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

      const updatedHistory = [
        ...existingHistory,
        {
          id: Date.now(),
          amount: amountNum,
          date: settlementForm.date,
          by: settlementForm.paid_by,
          paid_through: settlementForm.paid_through,
          notes: settlementForm.notes,
        },
      ];

      const newTotalPaid = updatedHistory.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

      const payload = {
        employee_id: emp.id,
        organization: org,
        sal_year: targetY,
        sal_month: targetM,
        salary: selectedPaymentItem.baseSalary,
        extras: selectedPaymentItem.extras,
        total_paid: newTotalPaid,
        last_payment_date: settlementForm.date,
        last_paid_by: settlementForm.paid_by,
        history: updatedHistory,
        notes: settlementForm.notes || undefined,
      };

      const { data: upsertData, error: upsertErr } = await supabase
        .from('salary_tracker')
        .upsert(payload, { onConflict: 'employee_id,organization,sal_year,sal_month' })
        .select();

      if (upsertErr) {
        console.warn('Supabase upsert error (using local cache fallback):', upsertErr.message);
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

      showToast(
        `Payment settlement of ₹${amountNum.toLocaleString('en-IN')} recorded for ${emp.name} (${targetM}/${targetY})!`,
        'success'
      );
      setSelectedPaymentItem(null);
    } catch (err) {
      console.error('Failed to record payment settlement:', err);
      showToast('Failed to record payment settlement: ' + err.message, 'error');
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
          const payable = baseSal + extras;
          const paid = Number(record.total_paid) || 0;
          const bal = payable - paid;

          if (paid >= payable && payable > 0) {
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

    const map = new Map();
    filtered.forEach((emp) => {
      const org = emp.organization || 'Jamia Zaytoonah';
      if (!map.has(org)) map.set(org, []);
      map.get(org).push(emp);
    });
    return Array.from(map.entries());
  }, [employees, searchQuery, statusFilter, salYear, salMonth, matrixLookupMap]);
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Top Header Card */}
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

      {/* MAIN VIEW CONTENT */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-light-border">
          <i className="fas fa-circle-notch fa-spin text-3xl text-teal-600 mb-3"></i>
          <p className="text-xs font-bold text-dark-muted">Loading salary tracker data...</p>
        </div>
      ) : viewMode === 'monthly' ? (
        /* ================= TAB 1: PAYMENT LOG ================= */
        trackerRecords.length === 0 ? (
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
        ) : (
          <div className="space-y-6">
            {groupedByOrgItems.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-light-border border-dashed">
                <i className="fas fa-folder-open text-4xl text-gray-300 mb-3"></i>
                <h3 className="text-base font-extrabold text-dark-primary">
                  No Matching Records Found
                </h3>
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
        )
      ) : /* ================= TAB 2: SALARY DASHBOARD (MATRIX SWATCHES VIEW) ================= */
      matrixFilteredGroupedEmployees.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-light-border border-dashed">
          <i className="fas fa-folder-open text-4xl text-gray-300 mb-3"></i>
          <h3 className="text-base font-extrabold text-dark-primary">No Matching Records Found</h3>
          <p className="text-xs text-dark-muted mt-1">
            No salaried employees match your search criteria.
          </p>
        </div>
      ) : (
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
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>{' '}
                    Paid
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>{' '}
                    Partial
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>{' '}
                    Unpaid
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
                            <div className="font-extrabold text-dark-primary text-xs">
                              {emp.name}
                            </div>
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
                                Number(
                                  record.salary != null ? record.salary : emp.current_salary
                                ) || 0;
                              const extras = Number(record.extras) || 0;
                              payableAmt = baseSal + extras;
                              paidAmt = Number(record.total_paid) || 0;
                              const bal = payableAmt - paidAmt;

                              if (paidAmt >= payableAmt && payableAmt > 0) {
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
                                className={`p-2 text-center ${m.isCurrent ? 'bg-teal-50/40 border-x border-teal-100' : ''}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleOpenMatrixPaymentModal(emp, m)}
                                  className={`w-full py-1.5 px-1 rounded-xl text-[10px] transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95 ${swatchStyle}`}
                                  title={`${emp.name} (${m.label}): ${swatchStatus} - Paid ₹${paidAmt.toLocaleString('en-IN')} of ₹${payableAmt.toLocaleString('en-IN')}. Click to record payment settlement.`}
                                >
                                  <span>{m.label.split(' ')[0]}</span>
                                  {record ? (
                                    <span className="text-[9px] opacity-90 font-mono">
                                      ₹
                                      {paidAmt >= 1000
                                        ? `${(paidAmt / 1000).toFixed(0)}k`
                                        : paidAmt}
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
      )}

      {/* Modals */}
      {/* 1. Dedicated Extras Update Modal */}
      {selectedExtrasItem && (
        <div
          onClick={() => setSelectedExtrasItem(null)}
          className="fixed inset-0 bg-dark-almostblack/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-md w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-dark-primary flex items-center gap-2">
                  <i className="fas fa-coins text-amber-600"></i> Update Extras & Allowances
                </h3>
                <p className="text-xs text-dark-muted font-semibold mt-0.5">
                  Set extra allowance or bonus for <strong>{selectedExtrasItem.emp.name}</strong> (
                  {selectedExtrasItem.targetMonth || salMonth}/
                  {selectedExtrasItem.targetYear || salYear}).
                </p>
              </div>
              <button
                onClick={() => setSelectedExtrasItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveExtrasOnly} className="space-y-4 text-xs font-bold">
              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 space-y-1.5">
                <div className="flex justify-between text-dark-soft">
                  <span>Base Salary:</span>
                  <span className="font-extrabold text-dark-primary">
                    ₹{selectedExtrasItem.baseSalary.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-dark-soft">
                  <span>Current Extras:</span>
                  <span className="font-extrabold text-emerald-800">
                    +₹{selectedExtrasItem.extras.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-dark-soft mb-1">
                  Extras / Bonus / Allowance Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  value={editExtrasValue}
                  onChange={(e) => setEditExtrasValue(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-extrabold text-sm outline-none focus:ring-2 focus:ring-amber-400 text-amber-900"
                />
                <p className="text-[10px] text-gray-500 font-semibold mt-1">
                  Enter positive amount for bonus/allowance, or 0 to clear.
                </p>
              </div>

              <div>
                <label className="block text-dark-soft mb-1">Notes / Reason for Extras</label>
                <input
                  type="text"
                  value={extrasNotes}
                  onChange={(e) => setExtrasNotes(e.target.value)}
                  placeholder="e.g. Festival bonus, Overtime pay, Performance allowance"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedExtrasItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-200 text-dark-soft hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <i className="fas fa-check"></i>
                  {saving ? 'Saving...' : 'Update Extras'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Dedicated Payment Settlement Modal */}
      {selectedPaymentItem && (
        <div
          onClick={() => setSelectedPaymentItem(null)}
          className="fixed inset-0 bg-dark-almostblack/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-dark-primary flex items-center gap-2">
                  <i className="fas fa-hand-holding-dollar text-teal-600"></i>{' '}
                  {selectedPaymentItem.emp.name} for {selectedPaymentItem.targetMonth || salMonth}/
                  {selectedPaymentItem.targetYear || salYear}.
                </h3>
                <p className="text-xs text-dark-muted font-semibold mt-0.5">
                  {selectedPaymentItem.organization}
                </p>
              </div>
              <button
                onClick={() => setSelectedPaymentItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-teal-800 uppercase font-bold block">
                  Base Salary
                </span>
                <span className="font-extrabold text-dark-primary text-sm">
                  ₹{selectedPaymentItem.baseSalary.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-teal-800 uppercase font-bold block">
                  Extras / Allowance
                </span>
                <span className="font-extrabold text-emerald-800 text-sm">
                  +₹{selectedPaymentItem.extras.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-teal-800 uppercase font-bold block">
                  Total Paid
                </span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  ₹{selectedPaymentItem.totalPaid.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-rose-800 uppercase font-bold block">
                  Remaining Balance
                </span>
                <span className="font-black text-rose-700 text-sm">
                  ₹{selectedPaymentItem.balance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-dark-primary flex items-center gap-1.5">
                <i className="fas fa-history text-teal-600"></i> Past Settlements (
                {selectedPaymentItem.history.length})
              </h4>

              {selectedPaymentItem.history.length === 0 ? (
                <div className="p-4 text-center bg-gray-50 rounded-xl border border-dashed text-xs text-dark-muted font-medium">
                  No prior settlement entries logged for this month yet.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-700 border-b">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Amount Paid</th>
                        <th className="p-2">Paid By</th>
                        <th className="p-2">Mode</th>
                        <th className="p-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold">
                      {selectedPaymentItem.history.map((h, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2 font-mono">{h.date || 'N/A'}</td>
                          <td className="p-2 text-emerald-700 font-bold">
                            ₹{(Number(h.amount) || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2">{h.by || 'Admin'}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                              {h.paid_through || 'N/A'}
                            </span>
                          </td>
                          <td className="p-2 text-gray-500 text-[11px] truncate max-w-[120px]">
                            {h.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <form
              onSubmit={handleSavePaymentSettlement}
              className="bg-teal-50/40 p-4 rounded-2xl border border-teal-100 space-y-3"
            >
              <h4 className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                <i className="fas fa-plus-circle text-teal-600"></i> Add New Settlement / Payment
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                <div>
                  <label className="block text-dark-soft mb-1">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={settlementForm.amount}
                    onChange={(e) =>
                      setSettlementForm({ ...settlementForm, amount: e.target.value })
                    }
                    placeholder="Enter amount paid"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-teal-400 text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-dark-soft mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={settlementForm.date}
                    onChange={(e) => setSettlementForm({ ...settlementForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-dark-soft mb-1">Paid By (Person Name)</label>
                  <input
                    type="text"
                    value={settlementForm.paid_by}
                    onChange={(e) =>
                      setSettlementForm({ ...settlementForm, paid_by: e.target.value })
                    }
                    placeholder="Admin / Cashier name"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-dark-soft mb-1">Paid Through (Mode)</label>
                  <select
                    value={settlementForm.paid_through}
                    onChange={(e) =>
                      setSettlementForm({ ...settlementForm, paid_through: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {PAYMENT_MODES.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-dark-soft mb-1">Notes / Reference No.</label>
                  <input
                    type="text"
                    value={settlementForm.notes}
                    onChange={(e) =>
                      setSettlementForm({ ...settlementForm, notes: e.target.value })
                    }
                    placeholder="e.g. Transaction ID, cheque no., or memo notes"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-200 text-dark-soft hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <i className="fas fa-check"></i>
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal Sub-Table Component for Monthly Salary Table
const SalaryTrackerTable = ({ items, onOpenExtras, onOpenPayment, canUpdate }) => {
  return (
    <table className="w-full text-left text-xs font-semibold min-w-[850px]">
      <thead className="bg-gray-50/80 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-600 font-extrabold">
        <tr>
          <th className="p-3.5">Employee Details</th>
          <th className="p-3.5">Designation</th>
          <th className="p-3.5 text-right">Total Payable</th>
          <th className="p-3.5 text-right">Total Paid</th>
          <th className="p-3.5 text-right">Balance</th>
          <th className="p-3.5">Status</th>
          <th className="p-3.5">Last Settlement</th>
          <th className="p-3.5 text-center">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {items.map((item, idx) => {
          const emp = item.emp;
          const isZeroBalance = item.balance <= 0 && item.totalPaid > 0;

          const statusBadge =
            item.status === 'paid' ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1">
                <i className="fas fa-check-circle"></i> Paid
              </span>
            ) : item.status === 'partial' ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black inline-flex items-center gap-1">
                <i className="fas fa-circle-half-stroke"></i> Partial
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black inline-flex items-center gap-1">
                <i className="fas fa-times-circle"></i> Unpaid
              </span>
            );

          return (
            <tr
              key={idx}
              className={`transition-colors ${
                isZeroBalance
                  ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500 hover:bg-emerald-100/70 font-semibold text-emerald-950'
                  : 'hover:bg-teal-50/20'
              }`}
            >
              {/* Single Combined Column for ID, Employee & Org */}
              <td className="p-3.5">
                <div className="font-extrabold text-dark-primary text-xs">{emp.name}</div>
                <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                  <span>{emp.emp_id || `ID: ${emp.id}`} | </span>
                  <span className="text-teal-800 font-bold">{item.organization}</span>
                </div>
              </td>

              {/* Designation */}
              <td className="p-3.5 text-dark-soft font-bold text-xs">
                {emp.designation || 'Teacher'}
              </td>

              {/* Total Payable with Base + Extras Subtext */}
              <td className="p-3.5 text-right">
                <div className="font-black text-dark-primary text-sm">
                  ₹{item.totalPayable.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  Base: ₹{item.baseSalary.toLocaleString('en-IN')} | Extras: +₹
                  {item.extras.toLocaleString('en-IN')}
                </div>
              </td>

              {/* Total Paid */}
              <td className="p-3.5 text-right font-extrabold text-emerald-700">
                ₹{item.totalPaid.toLocaleString('en-IN')}
              </td>

              {/* Balance */}
              <td className="p-3.5 text-right font-black text-rose-700">
                ₹{item.balance.toLocaleString('en-IN')}
              </td>

              {/* Status */}
              <td className="p-3.5">{statusBadge}</td>

              {/* Last Settlement */}
              <td className="p-3.5 text-[11px]">
                {item.lastPaymentDate ? (
                  <div>
                    <div className="font-mono text-dark-primary">{item.lastPaymentDate}</div>
                    <div className="text-[10px] text-gray-500">by {item.lastPaidBy || 'Admin'}</div>
                  </div>
                ) : (
                  <span className="text-gray-400 font-normal">No payments</span>
                )}
              </td>

              {/* 2 Action Icon Buttons */}
              <td className="p-3.5 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  {/* Button 1: Update Extras */}
                  <button
                    onClick={() => onOpenExtras(item)}
                    disabled={!canUpdate}
                    className={`w-8 h-8 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center shadow-2xs ${
                      canUpdate
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 active:scale-95'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                    }`}
                    title={
                      canUpdate
                        ? 'Update Extras / Bonus / Allowance'
                        : 'Salary Tracker can be updated by management and above level only'
                    }
                  >
                    <i className="fas fa-coins text-amber-600 text-sm"></i>
                  </button>

                  {/* Button 2: Update Payment */}
                  <button
                    onClick={() => onOpenPayment(item)}
                    disabled={!canUpdate}
                    className={`w-8 h-8 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center shadow-2xs ${
                      canUpdate
                        ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 active:scale-95'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                    }`}
                    title={
                      canUpdate
                        ? 'Record Payment Settlement'
                        : 'Salary Tracker can be updated by management and above level only'
                    }
                  >
                    <i className="fas fa-hand-holding-dollar text-teal-600 text-sm"></i>
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default SalaryTrackerView;
