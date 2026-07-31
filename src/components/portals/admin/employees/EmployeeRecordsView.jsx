import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';
import * as XLSX from 'xlsx';

const DEFAULT_ROLES = [
  'Teacher',
  'Admin',
  'Management',
  'Accountant',
  'Staff',
  'Principal',
  'Vice Principal',
  'Librarian',
];

const DEFAULT_ORGANIZATIONS = [
  'MRQU Educational & Charitable Trust',
  'Jamia Zaytoonah',
  'Idara e Faizul Makatib',
  'Madrasa Rahmaniya Lilbanath',
  'Bunyaan Food Service',
  'Barika Transport',
  'Rahmaniya Masjid',
];

const SYSTEM_ROLES = [
  { id: 1, name: 'Guest' },
  { id: 2, name: 'Parents' },
  { id: 4, name: 'Staff' },
  { id: 8, name: 'Teacher' },
  { id: 16, name: 'Management' },
  { id: 32, name: 'Administrator' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const EMERGENCY_RELATIONS = [
  'Parent',
  'Spouse',
  'Sibling',
  'Cousin',
  'Friend',
  'Colleague',
  'Other',
];

// Helper to format Portal Roles from bitmask sum
const formatPortalRoles = (sum) => {
  const num = parseInt(sum, 10) || 0;
  if (!num) return <span className="text-gray-400 font-normal">None</span>;
  const roles = SYSTEM_ROLES.filter((r) => (num & r.id) !== 0).map(
    (r) => `${r.name.slice(0, 2).toUpperCase()}(${r.id})`
  );
  if (roles.length === 0) return <span className="text-gray-400 font-normal">None</span>;
  return roles.join(', ');
};

// Multi-select Bitmask Roles Dropdown
const MultiSelectRolesDropdown = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSum = parseInt(value, 10) || 0;
  const selectedRoles = SYSTEM_ROLES.filter((r) => (currentSum & r.id) !== 0);

  const handleToggle = (roleId) => {
    if (disabled) return;
    let nextSum;
    if ((currentSum & roleId) !== 0) {
      nextSum = currentSum - roleId;
    } else {
      nextSum = currentSum + roleId;
    }
    onChange(String(nextSum));
  };

  const displayText =
    selectedRoles.length > 0
      ? selectedRoles.map((r) => `${r.name} (${r.id})`).join(', ')
      : 'Select portal roles...';

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-xl outline-none transition-all font-bold text-xs shadow-sm ${
          disabled
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-purple-200 text-purple-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
        }`}
      >
        <span className="truncate pr-2">{displayText}</span>
        <i
          className={`fas fa-chevron-${open ? 'up' : 'down'} text-[9px] ${disabled ? 'text-gray-300' : 'text-purple-400'}`}
        ></i>
      </button>
      {!disabled && open && (
        <div className="absolute left-0 right-0 mt-1 p-2 bg-white border border-purple-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto scrollbar-thin animate-in fade-in duration-100">
          <div className="space-y-1">
            {SYSTEM_ROLES.map((role) => {
              const isChecked = (currentSum & role.id) !== 0;
              return (
                <label
                  key={role.id}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                    isChecked
                      ? 'bg-purple-100 text-purple-900'
                      : 'text-dark-soft hover:bg-purple-50 hover:text-dark-primary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(role.id)}
                    className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 border-gray-300"
                  />
                  <span className="truncate flex-1">
                    {role.name} ({role.id})
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const EmployeeRecordsView = ({ role = 'admin', user = null, teacherRecord = null }) => {
  const isAdmin = role === 'admin';
  const isManagement = role === 'management';
  const isEmployeeSelf = role === 'employee' || role === 'teacher';

  const [employees, setEmployees] = useState([]);
  const [authUsers, setAuthUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters, Search & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'
  const [sortField, setSortField] = useState('emp_id'); // Default sort by Emp ID asc
  const [sortOrder, setSortOrder] = useState('asc'); // Default asc

  // Modals
  const [modalMode, setModalMode] = useState(null); // null | 'add' | 'edit' | 'self_edit'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState([]);
  const [isUserRolesModalOpen, setIsUserRolesModalOpen] = useState(false);
  const [userRolesSearch, setUserRolesSearch] = useState('');
  const [editingAuthUser, setEditingAuthUser] = useState(null);
  const [editingRoleSum, setEditingRoleSum] = useState('8');
  const [editingEmpId, setEditingEmpId] = useState('');

  // Keyboard shortcut listener for Esc key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (modalMode) setModalMode(null);
        if (isCsvImportOpen) setIsCsvImportOpen(false);
        if (isUserRolesModalOpen) setIsUserRolesModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalMode, isCsvImportOpen, isUserRolesModalOpen]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Form State structured for 5 Sections with clean relevant field names
  const [formData, setFormData] = useState({
    // Section 1: Personal Details
    name: '',
    father_husband_name: '',
    is_male: true,
    date_of_birth: '',
    blood_group: '',
    marital_status: 'Single',
    highest_education: '',
    primary_mobile: '',
    secondary_mobile: '',
    email: '',
    communication_address: '',

    // Section 2: Bank Detail
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_name: '',
    bank_branch_name: '',

    // Section 3: Emergency Contacts
    emergency_contact_1: { name: '', relation: '', phone: '', address: '' },
    emergency_contact_2: { name: '', relation: '', phone: '', address: '' },

    // Section 4: Employee Detail
    emp_id: '',
    organization: 'Jamia Zaytoonah',
    designation: 'Teacher',
    joining_date: '',
    is_salaried_employee: true,
    current_salary: '',
    compensation_history: [],
    is_teaching_staff: true,
    is_active: true,

    // Section 5: Portal Access
    login_allowed: false,
    auth_id: '',
    mapped_roles_sum: '8',
    update_history: [],
  });

  // Map of auth_id -> linked employee details (to indicate already mapped accounts)
  const mappedAuthUserMap = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(employees) ? employees : [];
    list.forEach((emp) => {
      if (emp && emp.auth_id) {
        map.set(String(emp.auth_id), {
          emp_id: emp.id,
          emp_code: emp.emp_id || `EMP-${emp.id}`,
          emp_name: emp.name || 'Employee',
        });
      }
    });
    return map;
  }, [employees]);

  // New Increment Form Item in Edit Modal
  const [newIncrement, setNewIncrement] = useState({
    date: '',
    amount: '',
    percentage: '',
    notes: '',
  });

  // Fetch employees and auth users data
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let data = null;

      // Fetch admin_users_view to map auth_id -> email & full_name & role
      let fetchedUsers = [];
      try {
        const { data: usersData } = await supabase
          .from('admin_users_view')
          .select('user_id, email, full_name, role');
        if (Array.isArray(usersData)) {
          fetchedUsers = usersData;
          setAuthUsers(usersData);
        } else {
          setAuthUsers([]);
        }
      } catch (err) {
        setAuthUsers([]);
      }

      const userEmailMap = new Map();
      const userRoleMap = new Map();
      fetchedUsers.forEach((u) => {
        if (u && u.user_id) {
          if (u.email) userEmailMap.set(String(u.user_id), u.email);
          if (u.role != null) userRoleMap.set(String(u.user_id), u.role);
        }
      });

      // Fetch employees data
      try {
        const { data: empData, error: empErr } = await supabase
          .from('employees')
          .select('*')
          .order('id', { ascending: true });

        if (!empErr && Array.isArray(empData)) {
          data = empData;
        }
      } catch (e) {
        console.warn('DB query error:', e);
      }

      if (Array.isArray(data)) {
        const resolved = data.map((emp) => {
          if (!emp) return {};
          const authEmail = emp.auth_id ? userEmailMap.get(String(emp.auth_id)) : null;
          const authRole = emp.auth_id ? userRoleMap.get(String(emp.auth_id)) : null;
          return {
            ...emp,
            name: emp.name || emp.full_name || '',
            primary_mobile: emp.primary_mobile || emp.phone1 || '',
            secondary_mobile: emp.secondary_mobile || emp.phone2 || '',
            designation: emp.designation || emp.role || 'Teacher',
            communication_address: emp.communication_address || emp.full_address || '',
            compensation_history: Array.isArray(emp.compensation_history)
              ? emp.compensation_history
              : Array.isArray(emp.previous_increment_history)
                ? emp.previous_increment_history
                : [],
            is_teaching_staff: emp.is_teaching_staff !== false && emp.is_teacher !== false,
            is_salaried_employee: emp.is_salaried_employee !== false,
            email: emp.email || authEmail || '',
            login_allowed: emp.login_allowed === true,
            mapped_roles_sum: String(emp.mapped_roles_sum || authRole || '8'),
            update_history: Array.isArray(emp.update_history) ? emp.update_history : [],
          };
        });
        setEmployees(resolved);
        localStorage.setItem('jzv_employees_local_data', JSON.stringify(resolved));
      } else {
        loadLocalEmployees();
      }
    } catch (err) {
      console.warn('Error fetching employees, loading local cache:', err.message);
      loadLocalEmployees();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalEmployees = () => {
    const raw =
      localStorage.getItem('jzv_employees_local_data') ||
      localStorage.getItem('jzv_timetable_local_data');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.teachers)
            ? parsed.teachers
            : [];
        setEmployees(list);
      } catch (e) {
        setEmployees([]);
      }
    } else {
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Self employee record (for teacher/employee mode)
  const currentSelfEmployee = useMemo(() => {
    if (!isEmployeeSelf) return null;
    const empList = Array.isArray(employees) ? employees : [];
    if (teacherRecord?.id) {
      const found = empList.find((e) => e && String(e.id) === String(teacherRecord.id));
      if (found) return found;
    }
    if (user?.id) {
      const foundAuth = empList.find((e) => e && String(e.auth_id) === String(user.id));
      if (foundAuth) return foundAuth;
    }
    return teacherRecord || (empList.length > 0 ? empList[0] : null);
  }, [isEmployeeSelf, teacherRecord, user, employees]);

  // Filtered + Sorted employees list
  const filteredEmployees = useMemo(() => {
    const empList = Array.isArray(employees) ? employees : [];
    let result = empList.filter((emp) => {
      if (!emp) return false;

      // Status filter
      if (statusFilter === 'active' && emp.is_active === false) return false;
      if (statusFilter === 'inactive' && emp.is_active !== false) return false;

      // Designation / role filter
      if (roleFilter) {
        const desig = (emp.designation || emp.role || '').toLowerCase();
        if (!desig.includes(roleFilter.toLowerCase())) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          emp.name || '',
          emp.emp_id || '',
          emp.primary_mobile || emp.phone1 || '',
          emp.secondary_mobile || emp.phone2 || '',
          emp.designation || emp.role || '',
          emp.organization || '',
          emp.email || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      let aVal = a[sortField] ?? '';
      let bVal = b[sortField] ?? '';

      // Numeric fields
      if (sortField === 'current_salary' || sortField === 'mapped_roles_sum') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (sortField === 'is_active') {
        aVal = a.is_active !== false ? 1 : 0;
        bVal = b.is_active !== false ? 1 : 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [employees, searchQuery, roleFilter, statusFilter, sortField, sortOrder]);

  // Open Add/Edit Modal
  const handleOpenModal = (mode, emp = null) => {
    setModalMode(mode);
    setSelectedEmployee(emp);

    if (emp) {
      const matchedAuthUser = authUsers.find((u) => String(u.user_id) === String(emp.auth_id));
      setFormData({
        // Section 1: Personal Details
        name: emp.name || emp.full_name || '',
        father_husband_name: emp.father_husband_name || '',
        is_male: emp.is_male !== false,
        date_of_birth: emp.date_of_birth || '',
        blood_group: emp.blood_group || '',
        marital_status: emp.marital_status || 'Single',
        highest_education: emp.highest_education || '',
        primary_mobile: emp.primary_mobile || emp.phone1 || '',
        secondary_mobile: emp.secondary_mobile || emp.phone2 || '',
        email: emp.email || '',
        communication_address: emp.communication_address || emp.full_address || '',

        // Section 2: Bank Detail
        bank_account_name: emp.bank_account_name || '',
        bank_account_number: emp.bank_account_number || '',
        bank_ifsc_code: emp.bank_ifsc_code || '',
        bank_name: emp.bank_name || '',
        bank_branch_name: emp.bank_branch_name || '',

        // Section 3: Emergency Contacts
        emergency_contact_1: emp.emergency_contact_1 || {
          name: '',
          relation: '',
          phone: '',
          address: '',
        },
        emergency_contact_2: emp.emergency_contact_2 || {
          name: '',
          relation: '',
          phone: '',
          address: '',
        },

        // Section 4: Employee Detail
        emp_id: emp.emp_id || `EMP-${String(emp.id).padStart(3, '0')}`,
        organization: emp.organization || 'Jamia Zaytoonah',
        designation: emp.designation || emp.role || 'Teacher',
        joining_date: emp.joining_date || '',
        is_salaried_employee: emp.is_salaried_employee !== false,
        current_salary: emp.current_salary || '',
        compensation_history: Array.isArray(emp.compensation_history)
          ? emp.compensation_history
          : Array.isArray(emp.previous_increment_history)
            ? emp.previous_increment_history
            : [],
        is_teaching_staff: emp.is_teaching_staff !== false && emp.is_teacher !== false,
        is_active: emp.is_active !== false,

        // Section 5: Portal Access
        login_allowed: emp.login_allowed === true,
        auth_id: emp.auth_id || '',
        mapped_roles_sum: matchedAuthUser?.role ? String(matchedAuthUser.role) : '8',
        update_history: Array.isArray(emp.update_history) ? emp.update_history : [],
      });
    } else {
      setFormData({
        name: '',
        father_husband_name: '',
        is_male: true,
        date_of_birth: '',
        blood_group: '',
        marital_status: 'Single',
        highest_education: '',
        primary_mobile: '',
        secondary_mobile: '',
        email: '',
        communication_address: '',

        bank_account_name: '',
        bank_account_number: '',
        bank_ifsc_code: '',
        bank_name: '',
        bank_branch_name: '',

        emergency_contact_1: { name: '', relation: '', phone: '', address: '' },
        emergency_contact_2: { name: '', relation: '', phone: '', address: '' },

        emp_id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        organization: 'Jamia Zaytoonah',
        designation: 'Teacher',
        joining_date: new Date().toISOString().split('T')[0],
        is_salaried_employee: true,
        current_salary: '',
        compensation_history: [],
        is_teaching_staff: true,
        is_active: true,

        login_allowed: false,
        auth_id: '',
        mapped_roles_sum: '8',
        update_history: [],
      });
    }
    setNewIncrement({ date: '', amount: '', percentage: '', notes: '' });
  };

  // Auto-link Auth Accounts
  const handleAutoLinkAuthAccounts = async () => {
    setSaving(true);
    let linkedCount = 0;
    try {
      const updatedList = [...employees];

      for (let i = 0; i < updatedList.length; i++) {
        const emp = updatedList[i];
        if (!emp.auth_id) {
          const matched = authUsers.find(
            (u) =>
              (u.email && emp.email && u.email.toLowerCase() === emp.email.toLowerCase()) ||
              (u.full_name && emp.name && u.full_name.toLowerCase() === emp.name.toLowerCase())
          );

          if (matched) {
            linkedCount++;
            const auth_id = matched.user_id;
            const email = emp.email || matched.email;

            emp.auth_id = auth_id;
            emp.email = email;

            try {
              await supabase.from('employees').update({ auth_id, email }).eq('id', emp.id);
            } catch (err) {}
          }
        }
      }

      setEmployees(updatedList);
      localStorage.setItem('jzv_employees_local_data', JSON.stringify(updatedList));

      if (linkedCount > 0) {
        showToast(`Auto-linked ${linkedCount} employee(s) to auth accounts!`, 'success');
      } else {
        showToast('All employee records already linked or no matching auth users found.', 'info');
      }
    } catch (err) {
      showToast('Auto-link error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Add Increment Item
  const handleAddIncrementItem = () => {
    if (!newIncrement.date && !newIncrement.amount) {
      showToast('Please specify date or amount for increment', 'error');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      compensation_history: [...prev.compensation_history, { ...newIncrement, id: Date.now() }],
    }));
    setNewIncrement({ date: '', amount: '', percentage: '', notes: '' });
  };

  // Remove Increment Item
  const handleRemoveIncrementItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      compensation_history: prev.compensation_history.filter((_, i) => i !== index),
    }));
  };

  // Helper to compute list of changed fields for update_history
  const getChangedFields = (oldObj, newObj) => {
    const keys = [
      'name',
      'father_husband_name',
      'is_male',
      'date_of_birth',
      'blood_group',
      'marital_status',
      'highest_education',
      'primary_mobile',
      'secondary_mobile',
      'email',
      'communication_address',
      'bank_account_name',
      'bank_account_number',
      'bank_ifsc_code',
      'bank_name',
      'bank_branch_name',
      'emergency_contact_1',
      'emergency_contact_2',
      'emp_id',
      'organization',
      'designation',
      'joining_date',
      'is_salaried_employee',
      'current_salary',
      'is_teaching_staff',
      'is_active',
      'login_allowed',
      'auth_id',
      'mapped_roles_sum',
    ];
    if (!oldObj) return ['record_created'];

    const changed = [];
    keys.forEach((k) => {
      const oldVal =
        oldObj[k] !== undefined
          ? oldObj[k]
          : oldObj[
              k === 'primary_mobile'
                ? 'phone1'
                : k === 'secondary_mobile'
                  ? 'phone2'
                  : k === 'designation'
                    ? 'role'
                    : k
            ];
      const newVal = newObj[k];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changed.push(k);
      }
    });
    return changed;
  };

  // Helper to build payload matching strictly 'teachers' table schema
  const buildTeacherPayload = (data) => ({
    name: (data.name || '').trim(),
    father_husband_name: data.father_husband_name || '',
    is_male: data.is_male !== false,
    date_of_birth: data.date_of_birth || null,
    blood_group: data.blood_group || '',
    marital_status: data.marital_status || 'Single',
    highest_education: data.highest_education || '',
    primary_mobile: data.primary_mobile || '',
    secondary_mobile: data.secondary_mobile || '',
    email: data.email || '',
    communication_address: data.communication_address || '',
    emp_id: data.emp_id || '',
    organization: data.organization || 'Jamia Zaytoonah',
    designation: data.designation || 'Teacher',
    joining_date: data.joining_date || null,
    is_salaried_employee: data.is_salaried_employee !== false,
    current_salary: data.current_salary ? Number(data.current_salary) : 0,
    compensation_history: Array.isArray(data.compensation_history) ? data.compensation_history : [],
    is_teaching_staff: data.is_teaching_staff !== false,
    bank_account_name: data.bank_account_name || '',
    bank_account_number: data.bank_account_number || '',
    bank_ifsc_code: data.bank_ifsc_code || '',
    bank_name: data.bank_name || '',
    bank_branch_name: data.bank_branch_name || '',
    emergency_contact_1: data.emergency_contact_1 || {},
    emergency_contact_2: data.emergency_contact_2 || {},
    is_active: data.is_active !== false,
    auth_id: data.auth_id || null,
    login_allowed: data.login_allowed === true,
    update_history: Array.isArray(data.update_history) ? data.update_history : [],
  });

  // Helper to build payload matching strictly 'employees' view schema
  const buildEmployeePayload = (data) => ({
    name: (data.name || '').trim(),
    is_male: data.is_male !== false,
    auth_id: data.auth_id || null,
    is_active: data.is_active !== false,
    emp_id: data.emp_id || '',
    organization: data.organization || 'Jamia Zaytoonah',
    role: data.designation || 'Teacher',
    joining_date: data.joining_date || null,
    phone1: data.primary_mobile || '',
    phone2: data.secondary_mobile || '',
    email: data.email || '',
    date_of_birth: data.date_of_birth || null,
    blood_group: data.blood_group || '',
    full_address: data.communication_address || '',
    highest_education: data.highest_education || '',
    current_salary: data.current_salary ? Number(data.current_salary) : 0,
    previous_increment_history: Array.isArray(data.compensation_history)
      ? data.compensation_history
      : [],
    is_teacher: data.is_teaching_staff !== false,
  });

  // Direct User Roles & Employee Link Update for Non-Employees / Any Auth Account
  const handleSaveUserRoleDirect = async (userId, roleSum, selectedEmpId = '') => {
    setSaving(true);
    try {
      // 1. Upsert integer role into user_roles table
      const roleNum = parseInt(roleSum, 10) || 0;
      const { error: roleErr } = await supabase.from('user_roles').upsert(
        {
          user_id: userId,
          role: roleNum,
        },
        { onConflict: 'user_id' }
      );
      if (roleErr) throw roleErr;

      // 2. Sync Employee Link in teachers / employees table if modified
      const currentMapped = mappedAuthUserMap.get(String(userId));
      const currentEmpId = currentMapped ? String(currentMapped.emp_id) : '';
      const targetEmpId = selectedEmpId ? String(selectedEmpId) : '';

      if (currentEmpId !== targetEmpId) {
        if (currentEmpId) {
          try {
            await supabase.from('employees').update({ auth_id: null }).eq('id', currentEmpId);
          } catch (e) {}
        }
        if (targetEmpId) {
          try {
            await supabase.from('employees').update({ auth_id: userId }).eq('id', targetEmpId);
          } catch (e) {}
        }
      }

      showToast('User portal role and employee mapping updated successfully!', 'success');
      setEditingAuthUser(null);
      await fetchEmployees();
    } catch (err) {
      showToast('Failed to update user role: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Employee Form
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Employee name is required', 'error');
      return;
    }

    if (formData.is_salaried_employee) {
      const salaryNum = Number(formData.current_salary);
      if (!formData.current_salary || isNaN(salaryNum) || salaryNum <= 0) {
        showToast(
          'Current Salary is required and must be a valid amount greater than ₹0 for salaried employees.',
          'error'
        );
        return;
      }
    }

    setSaving(true);
    try {
      const currentUserEmail = user?.email || 'Admin / Management User';

      const teacherPayload = buildTeacherPayload(formData);
      const employeePayload = buildEmployeePayload(formData);

      // Compute changed fields & update history
      const changedFields = getChangedFields(selectedEmployee, teacherPayload);
      let updatedHistoryList = Array.isArray(formData.update_history)
        ? [...formData.update_history]
        : [];

      if (changedFields.length > 0) {
        updatedHistoryList.push({
          timestamp: new Date().toISOString(),
          updated_by: currentUserEmail,
          fields_changed: changedFields,
        });
      }
      teacherPayload.update_history = updatedHistoryList;

      let updatedList = [...employees];
      let dbError = null;

      if (modalMode === 'edit' && selectedEmployee?.id) {
        const { error: eErr } = await supabase
          .from('employees')
          .update(teacherPayload)
          .eq('id', selectedEmployee.id);

        if (eErr) {
          dbError = eErr;
        }

        if (dbError) {
          showToast('Failed to update record: ' + (dbError.message || 'Database error'), 'error');
          return;
        }

        if (formData.auth_id) {
          const roleNum = parseInt(formData.mapped_roles_sum, 10) || 8;
          const { error: roleErr } = await supabase.from('user_roles').upsert(
            {
              user_id: formData.auth_id,
              role: roleNum,
            },
            { onConflict: 'user_id' }
          );
          if (roleErr) {
            console.warn('user_roles upsert error (int):', roleErr.message);
            const { error: roleErr2 } = await supabase.from('user_roles').upsert(
              {
                user_id: formData.auth_id,
                role: String(roleNum),
              },
              { onConflict: 'user_id' }
            );
            if (roleErr2) {
              console.warn('user_roles upsert error (str):', roleErr2.message);
              showToast(
                'Warning: Record saved, but user_roles table update failed: ' + roleErr2.message,
                'warning'
              );
            }
          }
        }

        updatedList = updatedList.map((emp) =>
          String(emp.id) === String(selectedEmployee.id) ? { ...emp, ...teacherPayload } : emp
        );
        showToast('Employee record updated successfully!', 'success');
      } else if (modalMode === 'self_edit' && currentSelfEmployee?.id) {
        const teachersSelfPayload = {
          name: formData.name.trim(),
          father_husband_name: formData.father_husband_name,
          is_male: formData.is_male,
          date_of_birth: formData.date_of_birth || null,
          blood_group: formData.blood_group,
          marital_status: formData.marital_status,
          highest_education: formData.highest_education,
          primary_mobile: formData.primary_mobile,
          secondary_mobile: formData.secondary_mobile,
          communication_address: formData.communication_address,
          bank_account_name: formData.bank_account_name,
          bank_account_number: formData.bank_account_number,
          bank_ifsc_code: formData.bank_ifsc_code,
          bank_name: formData.bank_name,
          bank_branch_name: formData.bank_branch_name,
          emergency_contact_1: formData.emergency_contact_1,
          emergency_contact_2: formData.emergency_contact_2,
          update_history: updatedHistoryList,
        };

        const { error: eErr } = await supabase
          .from('employees')
          .update(teachersSelfPayload)
          .eq('id', currentSelfEmployee.id);

        if (eErr) {
          dbError = eErr;
        }

        if (dbError) {
          showToast(
            'Failed to update profile info: ' + (dbError.message || 'Database error'),
            'error'
          );
          return;
        }

        updatedList = updatedList.map((emp) =>
          String(emp.id) === String(currentSelfEmployee.id)
            ? { ...emp, ...teachersSelfPayload }
            : emp
        );
        showToast(
          'Personal info, bank details, and emergency contacts updated successfully!',
          'success'
        );
      } else {
        // Add new employee
        let newRecord = null;
        const { data: eData, error: eErr } = await supabase
          .from('employees')
          .insert([teacherPayload])
          .select();

        if (!eErr && eData?.[0]) {
          newRecord = eData[0];
        } else {
          dbError = eErr;
        }

        if (dbError) {
          showToast('Failed to add employee: ' + (dbError.message || 'Database error'), 'error');
          return;
        }

        if (formData.auth_id && newRecord) {
          const roleNum = parseInt(formData.mapped_roles_sum, 10) || 8;
          const { error: roleErr } = await supabase.from('user_roles').upsert(
            {
              user_id: formData.auth_id,
              role: roleNum,
            },
            { onConflict: 'user_id' }
          );
          if (roleErr) {
            console.warn('user_roles upsert error (int):', roleErr.message);
            const { error: roleErr2 } = await supabase.from('user_roles').upsert(
              {
                user_id: formData.auth_id,
                role: String(roleNum),
              },
              { onConflict: 'user_id' }
            );
            if (roleErr2) {
              console.warn('user_roles upsert error (str):', roleErr2.message);
            }
          }
        }

        if (newRecord) {
          updatedList.push(newRecord);
        }
        showToast('New employee added successfully!', 'success');
      }

      setEmployees(updatedList);
      localStorage.setItem('jzv_employees_local_data', JSON.stringify(updatedList));
      setModalMode(null);
    } catch (err) {
      showToast('Error saving record: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Download / Export All Employee Data to Excel
  const handleExportEmployeesExcel = () => {
    const listToExport = filteredEmployees.length > 0 ? filteredEmployees : employees;
    if (listToExport.length === 0) {
      showToast('No employee records available to export', 'error');
      return;
    }

    const exportRows = listToExport.map((emp) => ({
      ID: emp.id,
      'Emp ID': emp.emp_id || `EMP-${String(emp.id).padStart(3, '0')}`,
      Name: emp.name || '',
      'Father/Husband Name': emp.father_husband_name || '',
      Gender: emp.is_male !== false ? 'Male' : 'Female',
      'Date of Birth': emp.date_of_birth || '',
      'Blood Group': emp.blood_group || '',
      'Marital Status': emp.marital_status || 'Single',
      'Highest Education': emp.highest_education || '',
      'Primary Mobile': emp.primary_mobile || emp.phone1 || '',
      'Secondary Mobile': emp.secondary_mobile || emp.phone2 || '',
      Email: emp.email || '',
      'Communication Address': emp.communication_address || emp.full_address || '',
      Designation: emp.designation || emp.role || 'Teacher',
      Organization: emp.organization || 'Jamia Zaytoonah',
      'Joining Date': emp.joining_date || '',
      'Is Salaried Employee': emp.is_salaried_employee !== false ? 'TRUE' : 'FALSE',
      'Current Salary': emp.current_salary || 0,
      'Bank Account Name': emp.bank_account_name || '',
      'Bank Account Number': emp.bank_account_number || '',
      'Bank IFSC Code': emp.bank_ifsc_code || '',
      'Bank Name': emp.bank_name || '',
      'Bank Branch Name': emp.bank_branch_name || '',
      'Emergency Contact 1': JSON.stringify(emp.emergency_contact_1 || {}),
      'Emergency Contact 2': JSON.stringify(emp.emergency_contact_2 || {}),
      'Is Teaching Staff':
        emp.is_teaching_staff !== false && emp.is_teacher !== false ? 'TRUE' : 'FALSE',
      'Is Active': emp.is_active !== false ? 'TRUE' : 'FALSE',
      'Login Allowed': emp.login_allowed === true ? 'TRUE' : 'FALSE',
      'Auth ID': emp.auth_id || '',
      'Update History': JSON.stringify(emp.update_history || []),
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employee_Records');
    XLSX.writeFile(wb, `JZV_Employee_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast(`Exported ${exportRows.length} employee record(s) to Excel!`, 'success');
  };

  // CSV Sample Template Download (All 5 Section Fields Included)
  const handleDownloadSampleCsv = () => {
    const sampleData = [
      {
        ID: 1,
        'Emp ID': 'EMP-101',
        Name: 'John Doe',
        'Father/Husband Name': 'Richard Doe',
        Gender: 'Male',
        'Date of Birth': '1990-05-15',
        'Blood Group': 'O+',
        'Marital Status': 'Married',
        'Highest Education': 'M.Sc Mathematics',
        'Primary Mobile': '9876543210',
        'Secondary Mobile': '',
        Email: 'john@example.com',
        'Communication Address': '123 Main Street, City',
        Designation: 'Teacher',
        Organization: 'Jamia Zaytoonah',
        'Joining Date': '2025-06-01',
        'Is Salaried Employee': 'TRUE',
        'Current Salary': 35000,
        'Bank Account Name': 'John Doe',
        'Bank Account Number': '12345678901',
        'Bank IFSC Code': 'SBIN0001234',
        'Bank Name': 'State Bank of India',
        'Bank Branch Name': 'Main Branch',
        'Emergency Contact 1':
          '{"name":"Jane Doe","relation":"Spouse","phone":"9876543211","address":"123 Main St"}',
        'Emergency Contact 2': '',
        'Is Teaching Staff': 'TRUE',
        'Is Active': 'TRUE',
        'Login Allowed': 'FALSE',
        'Auth ID': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees_Template');
    XLSX.writeFile(wb, 'Employee_Import_Template.xlsx');
  };

  // CSV/Excel File Import Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          showToast('No data found in uploaded file', 'error');
          return;
        }

        const parsedRows = data.map((row, idx) => {
          const rawId = row['ID'] || row['id'];
          const rawEmpId = row['Emp ID'] || row['emp_id'];

          let matchedExisting = null;
          if (rawId) {
            matchedExisting = employees.find((e) => String(e.id) === String(rawId));
          }
          if (!matchedExisting && rawEmpId) {
            matchedExisting = employees.find(
              (e) => String(e.emp_id).toLowerCase() === String(rawEmpId).toLowerCase()
            );
          }

          let ec1 = {};
          let ec2 = {};
          try {
            if (row['Emergency Contact 1']) {
              ec1 =
                typeof row['Emergency Contact 1'] === 'object'
                  ? row['Emergency Contact 1']
                  : JSON.parse(row['Emergency Contact 1']);
            }
          } catch (e) {}
          try {
            if (row['Emergency Contact 2']) {
              ec2 =
                typeof row['Emergency Contact 2'] === 'object'
                  ? row['Emergency Contact 2']
                  : JSON.parse(row['Emergency Contact 2']);
            }
          } catch (e) {}

          const rawGender = row['Gender'] ?? row['gender'] ?? row['is_male'];
          let isMale = true;
          if (rawGender !== undefined && rawGender !== null) {
            const s = String(rawGender).trim().toLowerCase();
            isMale = s !== 'female' && s !== 'f' && s !== 'false' && s !== '0';
          } else if (matchedExisting) {
            isMale = matchedExisting.is_male !== false;
          }

          return {
            previewIndex: idx + 1,
            existingId: matchedExisting ? matchedExisting.id : rawId ? Number(rawId) : null,
            isUpdate: Boolean(matchedExisting),
            emp_id: rawEmpId || (matchedExisting ? matchedExisting.emp_id : `EMP-${100 + idx}`),
            name:
              row['Name'] || row['name'] || (matchedExisting ? matchedExisting.name : 'Unnamed'),
            father_husband_name:
              row['Father/Husband Name'] ||
              row['father_husband_name'] ||
              (matchedExisting ? matchedExisting.father_husband_name : ''),
            designation:
              row['Designation'] ||
              row['designation'] ||
              row['Role'] ||
              row['role'] ||
              (matchedExisting ? matchedExisting.designation || matchedExisting.role : 'Teacher'),
            organization:
              row['Organization'] ||
              row['organization'] ||
              (matchedExisting ? matchedExisting.organization : 'Jamia Zaytoonah'),
            joining_date:
              row['Joining Date'] ||
              row['joining_date'] ||
              (matchedExisting ? matchedExisting.joining_date : null),
            email: row['Email'] || row['email'] || (matchedExisting ? matchedExisting.email : ''),
            primary_mobile: String(
              row['Primary Mobile'] ||
                row['primary_mobile'] ||
                row['Phone1'] ||
                row['phone1'] ||
                (matchedExisting ? matchedExisting.primary_mobile || matchedExisting.phone1 : '')
            ),
            secondary_mobile: String(
              row['Secondary Mobile'] ||
                row['secondary_mobile'] ||
                row['Phone2'] ||
                row['phone2'] ||
                (matchedExisting ? matchedExisting.secondary_mobile || matchedExisting.phone2 : '')
            ),
            date_of_birth:
              row['Date of Birth'] ||
              row['date_of_birth'] ||
              (matchedExisting ? matchedExisting.date_of_birth : null),
            blood_group:
              row['Blood Group'] ||
              row['blood_group'] ||
              (matchedExisting ? matchedExisting.blood_group : ''),
            marital_status:
              row['Marital Status'] ||
              row['marital_status'] ||
              (matchedExisting ? matchedExisting.marital_status : 'Single'),
            communication_address:
              row['Communication Address'] ||
              row['communication_address'] ||
              row['Full Address'] ||
              row['full_address'] ||
              (matchedExisting
                ? matchedExisting.communication_address || matchedExisting.full_address
                : ''),
            highest_education:
              row['Highest Education'] ||
              row['highest_education'] ||
              (matchedExisting ? matchedExisting.highest_education : ''),
            is_salaried_employee:
              String(
                row['Is Salaried Employee'] ??
                  row['is_salaried_employee'] ??
                  (matchedExisting ? matchedExisting.is_salaried_employee : 'true')
              ).toLowerCase() !== 'false',
            current_salary: Number(
              row['Current Salary'] ||
                row['current_salary'] ||
                (matchedExisting ? matchedExisting.current_salary : 0)
            ),
            bank_account_name:
              row['Bank Account Name'] ||
              row['bank_account_name'] ||
              (matchedExisting ? matchedExisting.bank_account_name : ''),
            bank_account_number:
              row['Bank Account Number'] ||
              row['bank_account_number'] ||
              (matchedExisting ? matchedExisting.bank_account_number : ''),
            bank_ifsc_code:
              row['Bank IFSC Code'] ||
              row['bank_ifsc_code'] ||
              (matchedExisting ? matchedExisting.bank_ifsc_code : ''),
            bank_name:
              row['Bank Name'] ||
              row['bank_name'] ||
              (matchedExisting ? matchedExisting.bank_name : ''),
            bank_branch_name:
              row['Bank Branch Name'] ||
              row['bank_branch_name'] ||
              (matchedExisting ? matchedExisting.bank_branch_name : ''),
            emergency_contact_1: ec1,
            emergency_contact_2: ec2,
            is_teaching_staff:
              String(
                row['Is Teaching Staff'] ??
                  row['is_teaching_staff'] ??
                  row['Is Teacher'] ??
                  row['is_teacher'] ??
                  (matchedExisting ? matchedExisting.is_teaching_staff : 'true')
              ).toLowerCase() !== 'false',
            login_allowed:
              String(
                row['Login Allowed'] ??
                  row['login_allowed'] ??
                  (matchedExisting ? matchedExisting.login_allowed : 'false')
              ).toLowerCase() === 'true',
            auth_id:
              row['Auth ID'] || row['auth_id'] || (matchedExisting ? matchedExisting.auth_id : ''),
            is_active:
              String(
                row['Is Active'] ??
                  row['is_active'] ??
                  (matchedExisting ? matchedExisting.is_active : 'true')
              ).toLowerCase() !== 'false',
            is_male: isMale,
          };
        });

        setCsvPreviewRows(parsedRows);
      } catch (err) {
        showToast('Error reading file: ' + err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit CSV Import
  const handleBulkImportSubmit = async () => {
    if (csvPreviewRows.length === 0) return;
    setSaving(true);
    try {
      let updatedCount = 0;
      let insertedCount = 0;
      let failedRows = [];
      const currentUserEmail = user?.email || 'Bulk Import Admin';

      for (const r of csvPreviewRows) {
        const teacherPayload = buildTeacherPayload(r);
        const employeePayload = buildEmployeePayload(r);

        if (r.isUpdate && r.existingId) {
          const existingRec = employees.find((e) => String(e.id) === String(r.existingId));
          const changedFields = getChangedFields(existingRec, teacherPayload);
          let historyList = Array.isArray(existingRec?.update_history)
            ? [...existingRec.update_history]
            : [];
          if (changedFields.length > 0) {
            historyList.push({
              timestamp: new Date().toISOString(),
              updated_by: currentUserEmail,
              fields_changed: changedFields,
            });
          }
          teacherPayload.update_history = historyList;

          const { error: eErr } = await supabase
            .from('employees')
            .update(teacherPayload)
            .eq('id', r.existingId);

          if (!eErr) {
            updatedCount++;
          } else {
            failedRows.push({
              row: r.previewIndex,
              name: r.name,
              error: eErr.message,
            });
          }
        } else {
          teacherPayload.update_history = [
            {
              timestamp: new Date().toISOString(),
              updated_by: currentUserEmail,
              fields_changed: ['record_created_via_bulk_import'],
            },
          ];

          const { data: eData, error: eErr } = await supabase
            .from('employees')
            .insert([teacherPayload])
            .select();

          if (!eErr && eData?.[0]) {
            insertedCount++;
          } else {
            failedRows.push({
              row: r.previewIndex,
              name: r.name,
              error: eErr ? eErr.message : 'Insert failed',
            });
          }
        }
      }

      if (failedRows.length > 0) {
        const firstErr = failedRows[0];
        showToast(
          `Import finished with errors: ${updatedCount} updated, ${insertedCount} added, ${failedRows.length} failed. Error on Row ${firstErr.row} (${firstErr.name}): ${firstErr.error}`,
          'error'
        );
      } else {
        showToast(
          `Import process complete! ${updatedCount} record(s) updated, ${insertedCount} new record(s) added.`,
          'success'
        );
      }

      setIsCsvImportOpen(false);
      setCsvPreviewRows([]);
      await fetchEmployees();
    } catch (err) {
      showToast('Import error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Render Employee Personal Info Card (for teacher/employee self mode)
  if (isEmployeeSelf) {
    const emp = currentSelfEmployee || {};
    const authUserEmail = user?.email || emp.email || 'Not Available';

    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Profile Card Header */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-soft text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-4xl font-extrabold shadow-inner shrink-0">
              {emp.name ? emp.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap mb-1">
                <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-white/30">
                  {emp.emp_id || `EMP-${String(emp.id || 1).padStart(3, '0')}`}
                </span>
                <span className="bg-amber-400 text-dark-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                  {emp.designation || emp.role || 'Teacher'}
                </span>
                <span className="bg-emerald-400 text-dark-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                  {emp.organization || 'Jamia Zaytoonah'}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                {emp.name || 'Teacher Profile'}
              </h1>
              <p className="text-xs text-white/80 font-medium mt-1">
                Joining Date: {emp.joining_date || 'N/A'} &bull; Status:{' '}
                {emp.is_active !== false ? 'Active Employee' : 'Inactive'}
              </p>
            </div>
            <button
              onClick={() => handleOpenModal('self_edit', emp)}
              className="bg-white text-brand-primary hover:bg-white/90 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0"
            >
              <i className="fas fa-user-pen"></i> Edit Profile Details
            </button>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Personal Details */}
          <div className="bg-white p-6 rounded-3xl border border-light-border shadow-sm space-y-4">
            <h3 className="text-base font-black text-dark-primary flex items-center gap-2 border-b pb-3">
              <i className="fas fa-user-circle text-brand-primary"></i> Personal Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Full Name
                </span>
                <span className="text-dark-primary font-bold">{emp.name || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Father / Husband Name
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.father_husband_name || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Gender
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.is_male ? 'Male' : 'Female'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Date of Birth
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.date_of_birth || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Blood Group
                </span>
                <span className="text-dark-primary font-bold">{emp.blood_group || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Marital Status
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.marital_status || 'Single'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Highest Qualification
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.highest_education || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Email (From User Auth)
                </span>
                <span className="text-purple-700 font-extrabold">{authUserEmail}</span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Primary Mobile
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.primary_mobile || emp.phone1 || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Secondary Mobile
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.secondary_mobile || emp.phone2 || 'Unknown'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Communication Address
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.communication_address || emp.full_address || 'Not Provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Bank Details */}
          <div className="bg-white p-6 rounded-3xl border border-light-border shadow-sm space-y-4">
            <h3 className="text-base font-black text-dark-primary flex items-center gap-2 border-b pb-3">
              <i className="fas fa-university text-emerald-600"></i> Bank Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Account Name
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.bank_account_name || 'Not Provided'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Account Number
                </span>
                <span className="text-dark-primary font-bold font-mono">
                  {emp.bank_account_number || 'Not Provided'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  IFSC Code
                </span>
                <span className="text-dark-primary font-bold font-mono">
                  {emp.bank_ifsc_code || 'Not Provided'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Bank Name
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.bank_name || 'Not Provided'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Branch Name
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.bank_branch_name || 'Not Provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Emergency Contacts */}
          <div className="bg-white p-6 rounded-3xl border border-light-border shadow-sm space-y-4 md:col-span-2">
            <h3 className="text-base font-black text-dark-primary flex items-center gap-2 border-b pb-3">
              <i className="fas fa-phone-alt text-rose-600"></i> Emergency Contacts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2 text-xs">
                <span className="font-extrabold text-rose-900 block text-xs">
                  Emergency Contact 1
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-dark-muted block text-[10px]">Name:</span>{' '}
                    <strong>{emp.emergency_contact_1?.name || 'Not Provided'}</strong>
                  </div>
                  <div>
                    <span className="text-dark-muted block text-[10px]">Relation:</span>{' '}
                    <strong>{emp.emergency_contact_1?.relation || 'Not Provided'}</strong>
                  </div>
                  <div>
                    <span className="text-dark-muted block text-[10px]">Phone:</span>{' '}
                    <strong>{emp.emergency_contact_1?.phone || 'Not Provided'}</strong>
                  </div>
                  <div>
                    <span className="text-dark-muted block text-[10px]">Address:</span>{' '}
                    <strong>{emp.emergency_contact_1?.address || 'Not Provided'}</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2 text-xs">
                <span className="font-extrabold text-rose-900 block text-xs">
                  Emergency Contact 2
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-dark-muted block text-[10px]">Name:</span>{' '}
                    <strong>{emp.emergency_contact_2?.name || 'Not Provided'}</strong>
                  </div>
                  <div>
                    <span className="text-dark-muted block text-[10px]">Relation:</span>{' '}
                    <strong>{emp.emergency_contact_2?.relation || 'Not Provided'}</strong>
                  </div>
                  <div>
                    <span className="text-dark-muted block text-[10px]">Phone:</span>{' '}
                    <strong>{emp.emergency_contact_2?.phone || 'Not Provided'}</strong>
                  </div>
                  <div>
                    <span className="text-dark-muted block text-[10px]">Address:</span>{' '}
                    <strong>{emp.emergency_contact_2?.address || 'Not Provided'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Employee Details (Read-Only / Display Purpose Only) */}
          <div className="bg-white p-6 rounded-3xl border border-light-border shadow-sm space-y-4 md:col-span-2">
            <h3 className="text-base font-black text-dark-primary flex items-center gap-2 border-b pb-3">
              <i className="fas fa-briefcase text-blue-primary"></i> Employee Details (Read-Only)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Employee ID
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.emp_id || `EMP-${String(emp.id || 1).padStart(3, '0')}`}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Organization
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.organization || 'Jamia Zaytoonah'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Designation
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.designation || emp.role || 'Teacher'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Joining Date
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.joining_date || 'Not Updated'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Salaried Employee
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.is_salaried_employee !== false ? 'Salaried' : 'Service'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Current Monthly Salary
                </span>
                <span className="text-emerald-700 font-extrabold">
                  {emp.current_salary
                    ? `₹${Number(emp.current_salary).toLocaleString('en-IN')}`
                    : 'Not Updated'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Teaching Staff
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.is_teaching_staff !== false && emp.is_teacher !== false ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Active Status
                </span>
                <span className="text-emerald-700 font-extrabold">
                  {emp.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-[11px] text-blue-900 font-medium">
              <i className="fas fa-info-circle text-blue-600 mr-1.5"></i>
              Official employment classification and administrative designations are managed by HR /
              Administration.
            </div>
          </div>
        </div>

        {/* Self Edit Modal */}
        {modalMode === 'self_edit' && (
          <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-extrabold text-dark-primary flex items-center gap-2">
                  <i className="fas fa-user-pen text-brand-primary"></i> Edit Personal, Bank &
                  Emergency Details
                </h3>
                <button
                  onClick={() => setModalMode(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>
              <form onSubmit={handleSaveEmployee} className="space-y-6 text-xs font-bold">
                {/* Section 1: Personal Details */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-brand-primary font-black border-b pb-1">
                    Section 1: Personal Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-dark-soft mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Father / Husband Name</label>
                      <input
                        type="text"
                        value={formData.father_husband_name}
                        onChange={(e) =>
                          setFormData({ ...formData, father_husband_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Gender</label>
                      <select
                        value={formData.is_male ? 'Male' : 'Female'}
                        onChange={(e) =>
                          setFormData({ ...formData, is_male: e.target.value === 'Male' })
                        }
                        className="w-full px-3 py-2 border rounded-xl"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) =>
                          setFormData({ ...formData, date_of_birth: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Blood Group</label>
                      <select
                        value={formData.blood_group}
                        onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl"
                      >
                        <option value="">Select Blood Group</option>
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Marital Status</label>
                      <select
                        value={formData.marital_status}
                        onChange={(e) =>
                          setFormData({ ...formData, marital_status: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-xl"
                      >
                        {MARITAL_STATUSES.map((ms) => (
                          <option key={ms} value={ms}>
                            {ms}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Highest Qualification</label>
                      <input
                        type="text"
                        placeholder="e.g. M.Sc, M.Ed, B.Tech"
                        value={formData.highest_education}
                        onChange={(e) =>
                          setFormData({ ...formData, highest_education: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">
                        Email Address{' '}
                        <span className="text-purple-600 font-normal">(From User Auth Table)</span>
                      </label>
                      <input
                        type="email"
                        disabled
                        value={user?.email || formData.email}
                        className="w-full px-3 py-2 border rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">
                        Primary Mobile (10 digits)
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.primary_mobile}
                        onChange={(e) =>
                          setFormData({ ...formData, primary_mobile: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">
                        Secondary Mobile (10 digits)
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.secondary_mobile}
                        onChange={(e) =>
                          setFormData({ ...formData, secondary_mobile: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-dark-soft mb-1">Communication Address</label>
                      <textarea
                        rows="2"
                        value={formData.communication_address}
                        onChange={(e) =>
                          setFormData({ ...formData, communication_address: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Bank Details */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-emerald-700 font-black border-b pb-1">
                    Section 2: Bank Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-dark-soft mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={formData.bank_account_name}
                        onChange={(e) =>
                          setFormData({ ...formData, bank_account_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Account Number</label>
                      <input
                        type="text"
                        value={formData.bank_account_number}
                        onChange={(e) =>
                          setFormData({ ...formData, bank_account_number: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={formData.bank_ifsc_code}
                        onChange={(e) =>
                          setFormData({ ...formData, bank_ifsc_code: e.target.value.toUpperCase() })
                        }
                        className="w-full px-3 py-2 border rounded-xl font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-dark-soft mb-1">Branch Name</label>
                      <input
                        type="text"
                        value={formData.bank_branch_name}
                        onChange={(e) =>
                          setFormData({ ...formData, bank_branch_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Emergency Contacts */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-rose-700 font-black border-b pb-1">
                    Section 3: Emergency Contacts
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contact 1 */}
                    <div className="p-3 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-2">
                      <span className="text-[11px] font-black text-rose-900 block">
                        Emergency Contact 1
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-dark-muted block">Name</label>
                          <input
                            type="text"
                            value={formData.emergency_contact_1.name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_1: {
                                  ...formData.emergency_contact_1,
                                  name: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-dark-muted block">Relation</label>
                          <select
                            value={formData.emergency_contact_1.relation}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_1: {
                                  ...formData.emergency_contact_1,
                                  relation: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                          >
                            <option value="">Select Relation</option>
                            {EMERGENCY_RELATIONS.map((rel) => (
                              <option key={rel} value={rel}>
                                {rel}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-dark-muted block">
                            Contact Number
                          </label>
                          <input
                            type="text"
                            maxLength={10}
                            value={formData.emergency_contact_1.phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_1: {
                                  ...formData.emergency_contact_1,
                                  phone: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-dark-muted block">Address</label>
                          <input
                            type="text"
                            value={formData.emergency_contact_1.address}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_1: {
                                  ...formData.emergency_contact_1,
                                  address: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact 2 */}
                    <div className="p-3 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-2">
                      <span className="text-[11px] font-black text-rose-900 block">
                        Emergency Contact 2
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-dark-muted block">Name</label>
                          <input
                            type="text"
                            value={formData.emergency_contact_2.name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_2: {
                                  ...formData.emergency_contact_2,
                                  name: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-dark-muted block">Relation</label>
                          <select
                            value={formData.emergency_contact_2.relation}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_2: {
                                  ...formData.emergency_contact_2,
                                  relation: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                          >
                            <option value="">Select Relation</option>
                            {EMERGENCY_RELATIONS.map((rel) => (
                              <option key={rel} value={rel}>
                                {rel}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-dark-muted block">
                            Contact Number
                          </label>
                          <input
                            type="text"
                            maxLength={10}
                            value={formData.emergency_contact_2.phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_2: {
                                  ...formData.emergency_contact_2,
                                  phone: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-dark-muted block">Address</label>
                          <input
                            type="text"
                            value={formData.emergency_contact_2.address}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_2: {
                                  ...formData.emergency_contact_2,
                                  address: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-4 py-2 bg-light-ui rounded-xl text-dark-soft font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-md"
                  >
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Admin & Management View
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-light-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-dark-primary tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-primary/10 text-orange-primary flex items-center justify-center shrink-0">
              <i className="fas fa-users-gear text-xl"></i>
            </div>
            Employee Records {isManagement ? '(Management View)' : ''}
          </h1>
          <p className="text-xs font-bold text-dark-soft mt-1">
            {isManagement
              ? 'View and manage employee profile details, qualifications, and salary records.'
              : 'Add, import, export, edit, and link employee records to user accounts.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            onClick={handleExportEmployeesExcel}
            className="px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold border border-blue-200 transition-all flex items-center gap-2 shadow-sm"
            title="Download all employee records to Excel"
          >
            <i className="fas fa-file-excel text-blue-600"></i> Export Excel
          </button>

          {(isAdmin || isManagement) && (
            <>
              <button
                onClick={() => setIsUserRolesModalOpen(true)}
                className="px-3.5 py-2.5 bg-purple-50 text-purple-800 hover:bg-purple-100 rounded-xl text-xs font-bold border border-purple-200 transition-all flex items-center gap-2 shadow-sm"
                title="Manage portal roles for all Auth Users (including non-employees)"
              >
                <i className="fas fa-user-shield text-purple-600"></i> Manage User Roles
              </button>
              <button
                onClick={handleAutoLinkAuthAccounts}
                disabled={saving}
                className="px-3.5 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold border border-purple-200 transition-all flex items-center gap-2 shadow-sm"
                title="Automatically link employees to auth users by email/name"
              >
                <i className="fas fa-link"></i> Auto-Link Auth
              </button>
              <button
                onClick={() => setIsCsvImportOpen(true)}
                className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200 transition-all flex items-center gap-2 shadow-sm"
              >
                <i className="fas fa-file-arrow-up"></i> Bulk Import/Update
              </button>
              <button
                onClick={() => handleOpenModal('add')}
                className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center gap-2 active:scale-95"
              >
                <i className="fas fa-plus"></i> Add Employee
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <i className="fas fa-search absolute left-3.5 top-3 text-gray-400 text-xs"></i>
          <input
            type="text"
            placeholder="Search by Name, Emp ID, Mobile, Designation, Org..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
          >
            <option value="">All Designations</option>
            {DEFAULT_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-light-border">
          <i className="fas fa-circle-notch fa-spin text-3xl text-brand-primary mb-3"></i>
          <p className="text-xs font-bold text-dark-muted">Loading employee records...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-light-border border-dashed">
          <i className="fas fa-users-slash text-4xl text-gray-300 mb-3"></i>
          <h3 className="text-base font-extrabold text-dark-primary">No Employee Records Found</h3>
          <p className="text-xs text-dark-muted mt-1">
            Try adjusting search filters or add a new record.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-light-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead className="bg-gray-50 border-b text-[10px] uppercase tracking-wider text-dark-muted font-bold">
                <tr>
                  <th
                    onClick={() => handleSort('emp_id')}
                    className="p-4 cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Emp ID
                      <i
                        className={`fas ${sortField === 'emp_id' ? (sortOrder === 'asc' ? 'fa-sort-up text-brand-primary' : 'fa-sort-down text-brand-primary') : 'fa-sort text-gray-300'}`}
                      ></i>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="p-4 cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Employee
                      <i
                        className={`fas ${sortField === 'name' ? (sortOrder === 'asc' ? 'fa-sort-up text-brand-primary' : 'fa-sort-down text-brand-primary') : 'fa-sort text-gray-300'}`}
                      ></i>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('designation')}
                    className="p-4 cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Designation & Org
                      <i
                        className={`fas ${sortField === 'designation' ? (sortOrder === 'asc' ? 'fa-sort-up text-brand-primary' : 'fa-sort-down text-brand-primary') : 'fa-sort text-gray-300'}`}
                      ></i>
                    </div>
                  </th>
                  <th className="p-4">Contact</th>
                  <th
                    onClick={() => handleSort('mapped_roles_sum')}
                    className="p-4 cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Portal Role
                      <i
                        className={`fas ${sortField === 'mapped_roles_sum' ? (sortOrder === 'asc' ? 'fa-sort-up text-brand-primary' : 'fa-sort-down text-brand-primary') : 'fa-sort text-gray-300'}`}
                      ></i>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('current_salary')}
                    className="p-4 cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Salary
                      <i
                        className={`fas ${sortField === 'current_salary' ? (sortOrder === 'asc' ? 'fa-sort-up text-brand-primary' : 'fa-sort-down text-brand-primary') : 'fa-sort text-gray-300'}`}
                      ></i>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('is_active')}
                    className="p-4 text-center cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Status
                      <i
                        className={`fas ${sortField === 'is_active' ? (sortOrder === 'asc' ? 'fa-sort-up text-brand-primary' : 'fa-sort-down text-brand-primary') : 'fa-sort text-gray-300'}`}
                      ></i>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => {
                  return (
                    <tr
                      key={emp.id}
                      onDoubleClick={() =>
                        (isAdmin || isManagement) && handleOpenModal('edit', emp)
                      }
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                      title="Double-click record to open edit modal"
                    >
                      <td className="p-4">
                        <span className="font-extrabold text-dark-primary text-xs bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 inline-block">
                          {emp.emp_id || `EMP-${String(emp.id).padStart(3, '0')}`}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-extrabold text-dark-primary text-sm flex items-center gap-2">
                              {emp.is_male ? (
                                <i className="fa fa-male text-blue-600"></i>
                              ) : (
                                <i className="fa fa-female text-pink-600"></i>
                              )}
                              {emp.name}
                            </div>
                            <span className="text-[10px] text-dark-muted">
                              {emp.designation || emp.role || 'Teacher'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className="font-bold text-dark-primary block"
                          title={emp.organization}
                        >
                          {emp.organization || 'Jamia Zaytoonah'}
                        </span>
                        <span className="text-[10px] text-dark-muted font-bold block max-w-[180px] truncate">
                          Joined: {emp.joining_date || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-dark-primary font-bold">
                          {emp.primary_mobile || emp.phone1 || 'No Phone'}
                        </div>
                        <div className="text-[10px] text-dark-muted font-semibold">
                          {emp.email || 'No Email'}
                        </div>
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="font-extrabold text-purple-950 text-xs">
                          {formatPortalRoles(emp.mapped_roles_sum)}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-emerald-700">
                        {emp.is_salaried_employee !== false ? (
                          emp.current_salary ? (
                            `₹${Number(emp.current_salary).toLocaleString('en-IN')}`
                          ) : (
                            <span className="text-red-500 font-extrabold">Required</span>
                          )
                        ) : (
                          <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-extrabold">
                            Service
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center gap-1 flex-wrap">
                          {emp.auth_id ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700  px-1 py-0.5 rounded-full">
                              <i className="fas fa-link text-purple-500" title="Login Linked"></i>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700  px-1 py-0.5 rounded-full">
                              <i
                                className="fas fa-unlink text-amber-500"
                                title="No Login Linked"
                              ></i>
                            </span>
                          )}
                          {emp.login_allowed ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700  px-1 py-0.5 rounded-full">
                              <i className="fas fa-user text-emerald-500" title="Login Allowed"></i>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500  px-1 py-0.5 rounded-full">
                              <i
                                className="fas fa-user-slash text-red-400"
                                title="Login Not Allowed"
                              ></i>
                            </span>
                          )}
                          {emp.is_active ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700  px-1 py-0.5 rounded-full">
                              <i
                                className="fas fa-plug-circle-check text-emerald-500"
                                title="Active Employee"
                              ></i>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500  px-1 py-0.5 rounded-full">
                              <i
                                className="fas fa-plug-circle-xmark text-red-400"
                                title="Inactive Employee"
                              ></i>
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenModal('edit', emp)}
                            className="px-2 py-1 text-blue-700  text-xs transition-all"
                          >
                            {isAdmin || isManagement ? (
                              <i className="fas fa-edit mr-1"></i>
                            ) : (
                              <i className="fas fa-eye mr-1"></i>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal - 5 Structured Sections */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-3xl w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-dark-primary">
                {modalMode === 'add'
                  ? 'Add New Employee Record'
                  : `Edit Employee Record: ${selectedEmployee?.name}`}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-6 text-xs font-bold">
              {/* Section 1: Personal Details */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-brand-primary font-black border-b pb-1">
                  Section 1: Personal Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-dark-soft mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Father / Husband Name</label>
                    <input
                      type="text"
                      value={formData.father_husband_name}
                      onChange={(e) =>
                        setFormData({ ...formData, father_husband_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Gender</label>
                    <select
                      value={formData.is_male ? 'Male' : 'Female'}
                      onChange={(e) =>
                        setFormData({ ...formData, is_male: e.target.value === 'Male' })
                      }
                      className="w-full px-3 py-2 border rounded-xl"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Blood Group</label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Marital Status</label>
                    <select
                      value={formData.marital_status}
                      onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    >
                      {MARITAL_STATUSES.map((ms) => (
                        <option key={ms} value={ms}>
                          {ms}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Highest Education</label>
                    <input
                      type="text"
                      placeholder="e.g. M.Sc, M.Ed, B.Tech"
                      value={formData.highest_education}
                      onChange={(e) =>
                        setFormData({ ...formData, highest_education: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Primary Mobile (10 digits)</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={formData.primary_mobile}
                      onChange={(e) => setFormData({ ...formData, primary_mobile: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-dark-soft mb-1">Communication Address</label>
                    <textarea
                      rows="2"
                      value={formData.communication_address}
                      onChange={(e) =>
                        setFormData({ ...formData, communication_address: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Bank Detail */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-emerald-700 font-black border-b pb-1">
                  Section 2: Bank Detail
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-dark-soft mb-1">Account Name</label>
                    <input
                      type="text"
                      placeholder="Account Holder Name"
                      value={formData.bank_account_name}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_account_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="Bank Account Number"
                      value={formData.bank_account_number}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_account_number: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={formData.bank_ifsc_code}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_ifsc_code: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 border rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-dark-soft mb-1">Branch Name</label>
                    <input
                      type="text"
                      placeholder="Bank Branch Location"
                      value={formData.bank_branch_name}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_branch_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Emergency Contacts */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-rose-700 font-black border-b pb-1">
                  Section 3: Emergency Contacts
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Emergency Contact 1 */}
                  <div className="p-3.5 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-2">
                    <span className="text-[11px] font-black text-rose-900 block">
                      Emergency Contact 1
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-dark-muted block">Name</label>
                        <input
                          type="text"
                          value={formData.emergency_contact_1.name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...formData.emergency_contact_1,
                                name: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Relation</label>
                        <select
                          value={formData.emergency_contact_1.relation}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...formData.emergency_contact_1,
                                relation: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                        >
                          <option value="">Select Relation</option>
                          {EMERGENCY_RELATIONS.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Contact Number</label>
                        <input
                          type="text"
                          maxLength={10}
                          value={formData.emergency_contact_1.phone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...formData.emergency_contact_1,
                                phone: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Address</label>
                        <input
                          type="text"
                          value={formData.emergency_contact_1.address}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...formData.emergency_contact_1,
                                address: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact 2 */}
                  <div className="p-3.5 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-2">
                    <span className="text-[11px] font-black text-rose-900 block">
                      Emergency Contact 2
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-dark-muted block">Name</label>
                        <input
                          type="text"
                          value={formData.emergency_contact_2.name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...formData.emergency_contact_2,
                                name: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Relation</label>
                        <select
                          value={formData.emergency_contact_2.relation}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...formData.emergency_contact_2,
                                relation: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                        >
                          <option value="">Select Relation</option>
                          {EMERGENCY_RELATIONS.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Contact Number</label>
                        <input
                          type="text"
                          maxLength={10}
                          value={formData.emergency_contact_2.phone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...formData.emergency_contact_2,
                                phone: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Address</label>
                        <input
                          type="text"
                          value={formData.emergency_contact_2.address}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...formData.emergency_contact_2,
                                address: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Employee Detail */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-blue-primary font-black border-b pb-1">
                  Section 4: Employee Detail
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* First Field: Is Salaried Employee Toggle */}
                  <div>
                    <label className="block text-dark-soft mb-1 font-bold">
                      Is Salaried Employee?
                    </label>
                    <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_salaried_employee: true })}
                        className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          formData.is_salaried_employee
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Salaried
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_salaried_employee: false })}
                        className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          !formData.is_salaried_employee
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Service
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-dark-soft mb-1">Employee ID *</label>
                    <input
                      type="text"
                      required={formData.is_salaried_employee}
                      disabled={!formData.is_salaried_employee}
                      value={formData.emp_id}
                      onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl ${
                        !formData.is_salaried_employee
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : ''
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Organization</label>
                    <input
                      type="text"
                      list="organizations-list"
                      disabled={!formData.is_salaried_employee}
                      placeholder="Select Organization..."
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl ${
                        !formData.is_salaried_employee
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : ''
                      }`}
                    />
                    <datalist id="organizations-list">
                      {DEFAULT_ORGANIZATIONS.map((org) => (
                        <option key={org} value={org} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Designation</label>
                    <input
                      type="text"
                      list="roles-list"
                      disabled={!formData.is_salaried_employee}
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl ${
                        !formData.is_salaried_employee
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : ''
                      }`}
                    />
                    <datalist id="roles-list">
                      {DEFAULT_ROLES.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Joining Date</label>
                    <input
                      type="date"
                      disabled={!formData.is_salaried_employee}
                      value={formData.joining_date}
                      onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl ${
                        !formData.is_salaried_employee
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : ''
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-dark-soft mb-1">
                      Current Monthly Salary (₹) {formData.is_salaried_employee && '*'}
                    </label>
                    <input
                      type="number"
                      step="100"
                      disabled={!formData.is_salaried_employee}
                      required={formData.is_salaried_employee}
                      placeholder={formData.is_salaried_employee ? 'Must be > ₹0' : 'Optional'}
                      value={formData.current_salary}
                      onChange={(e) => setFormData({ ...formData, current_salary: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        !formData.is_salaried_employee
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'text-emerald-700'
                      }`}
                    />
                  </div>

                  {/* Employee Status Toggle */}
                  <div>
                    <label
                      className={`block text-dark-soft mb-1 font-bold ${!formData.is_salaried_employee ? 'text-gray-400' : ''}`}
                    >
                      Employee Status
                    </label>
                    <div
                      className={`inline-flex p-1 rounded-xl border ${
                        !formData.is_salaried_employee
                          ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                          : 'bg-gray-100 border-gray-200'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!formData.is_salaried_employee}
                        onClick={() => setFormData({ ...formData, is_active: true })}
                        className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          formData.is_active
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        disabled={!formData.is_salaried_employee}
                        onClick={() => setFormData({ ...formData, is_active: false })}
                        className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          !formData.is_active
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compensation History Builder */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 mt-2 ${
                    !formData.is_salaried_employee
                      ? 'bg-gray-100 border-gray-200 opacity-60 pointer-events-none'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className="text-[11px] font-extrabold text-dark-primary block">
                    Compensation History ({formData.compensation_history.length} entries)
                  </span>

                  {formData.compensation_history.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {formData.compensation_history.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white p-2.5 rounded-xl border text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-dark-primary">
                              {item.date ? item.date : 'N/A'} &bull; +₹{item.amount || '0'} (
                              {item.percentage || 0}%)
                            </span>
                            {item.notes && (
                              <span className="text-dark-muted block text-[10px]">
                                {item.notes}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={!formData.is_salaried_employee}
                            onClick={() => handleRemoveIncrementItem(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2 pt-1 items-end">
                    <div>
                      <label className="text-[10px] text-dark-muted block">Revision Date</label>
                      <input
                        type="date"
                        disabled={!formData.is_salaried_employee}
                        value={newIncrement.date}
                        onChange={(e) => setNewIncrement({ ...newIncrement, date: e.target.value })}
                        className="w-full px-2 py-1 border rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-dark-muted block">Hike (₹)</label>
                      <input
                        type="number"
                        disabled={!formData.is_salaried_employee}
                        placeholder="e.g. 3000"
                        value={newIncrement.amount}
                        onChange={(e) =>
                          setNewIncrement({ ...newIncrement, amount: e.target.value })
                        }
                        className="w-full px-2 py-1 border rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-dark-muted block">Hike (%)</label>
                      <input
                        type="number"
                        disabled={!formData.is_salaried_employee}
                        placeholder="10%"
                        value={newIncrement.percentage}
                        onChange={(e) =>
                          setNewIncrement({ ...newIncrement, percentage: e.target.value })
                        }
                        className="w-full px-2 py-1 border rounded-lg text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!formData.is_salaried_employee}
                      onClick={handleAddIncrementItem}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:bg-gray-400"
                    >
                      + Add Increment
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 5: Portal Access */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-purple-700 font-black border-b pb-1">
                  Section 5: Portal Access
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50/30 p-4 rounded-2xl border border-purple-100">
                  {/* Field 1: Portal Access */}
                  <div>
                    <label className="block text-dark-soft mb-1 font-extrabold text-purple-950">
                      Portal Access
                    </label>
                    <div className="inline-flex p-1 bg-white rounded-xl border border-purple-200 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, login_allowed: true })}
                        className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          formData.login_allowed
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Allowed
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, login_allowed: false })}
                        className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          !formData.login_allowed
                            ? 'bg-gray-700 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Not Allowed
                      </button>
                    </div>
                  </div>

                  {/* Field 2: Consider As Teacher */}
                  <div>
                    <label
                      className={`block text-dark-soft mb-1 font-extrabold ${!formData.login_allowed ? 'text-gray-400' : 'text-purple-950'}`}
                    >
                      Consider As Teacher
                    </label>
                    <div
                      className={`inline-flex p-1 rounded-xl border ${
                        !formData.login_allowed
                          ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-purple-200 shadow-sm'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!formData.login_allowed}
                        onClick={() => setFormData({ ...formData, is_teaching_staff: true })}
                        className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          formData.is_teaching_staff
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        disabled={!formData.login_allowed}
                        onClick={() => setFormData({ ...formData, is_teaching_staff: false })}
                        className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          !formData.is_teaching_staff
                            ? 'bg-gray-700 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Field 3: Auth User Mapping */}
                  <div>
                    <label
                      className={`block text-dark-soft mb-1 font-extrabold ${!formData.login_allowed ? 'text-gray-400' : 'text-purple-950'}`}
                    >
                      Auth User Mapping
                    </label>
                    <select
                      disabled={!formData.login_allowed}
                      value={formData.auth_id}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const matched = authUsers.find(
                          (u) => String(u.user_id) === String(selectedId)
                        );
                        setFormData({
                          ...formData,
                          auth_id: selectedId,
                          email: formData.email || (matched ? matched.email : formData.email),
                          mapped_roles_sum: matched?.role
                            ? String(matched.role)
                            : formData.mapped_roles_sum,
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-xl font-bold outline-none ${
                        !formData.login_allowed
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-purple-900 border-purple-200'
                      }`}
                    >
                      <option value="">-- Unlinked / No Auth Account --</option>
                      {authUsers.map((u) => {
                        const mapped = mappedAuthUserMap.get(String(u.user_id));
                        const isMappedToOther =
                          mapped && String(mapped.emp_id) !== String(selectedEmployee?.id);

                        return (
                          <option key={u.user_id} value={u.user_id} disabled={isMappedToOther}>
                            {u.full_name ? u.full_name : 'User'} - {u.email}
                            {isMappedToOther
                              ? ` 🔒 [${mapped.emp_name}]`
                              : mapped && String(mapped.emp_id) === String(selectedEmployee?.id)
                                ? ' ✓ (Currently Linked)'
                                : ''}
                          </option>
                        );
                      })}
                    </select>

                    {/* Status Helper Badge */}
                    {formData.auth_id && formData.login_allowed && (
                      <div className="text-[11px] font-bold mt-1">
                        {(() => {
                          const mapped = mappedAuthUserMap.get(String(formData.auth_id));
                          if (!mapped || String(mapped.emp_id) === String(selectedEmployee?.id)) {
                            return (
                              <span className="inline-flex items-center gap-1.5 text-purple-700 bg-purple-100/60 px-3 py-1 rounded-lg border border-purple-200">
                                <i className="fas fa-link text-purple-600"></i> Linked to this
                                employee account
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-100/80 px-3 py-1 rounded-lg border border-amber-300">
                              <i className="fas fa-exclamation-triangle text-amber-600"></i>
                              Already mapped to employee: <strong>{mapped.emp_name}</strong> (
                              {mapped.emp_code})
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Field 4: Portal Roles */}
                  <div>
                    <label
                      className={`block text-dark-soft mb-1 font-extrabold ${!formData.login_allowed || !formData.auth_id ? 'text-gray-400' : 'text-purple-950'}`}
                    >
                      Portal Roles
                    </label>
                    <MultiSelectRolesDropdown
                      disabled={!formData.login_allowed || !formData.auth_id}
                      value={formData.mapped_roles_sum}
                      onChange={(nextSum) =>
                        setFormData({ ...formData, mapped_roles_sum: nextSum })
                      }
                    />
                    {!formData.auth_id && formData.login_allowed && (
                      <div className="text-[11px] font-medium text-amber-700 mt-1 flex items-center gap-1">
                        <i className="fas fa-lock text-amber-600"></i> Auth Mapping is required.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-5 py-2.5 rounded-xl font-bold bg-light-ui text-dark-soft"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl font-extrabold bg-brand-primary text-white shadow-md"
                >
                  {saving ? 'Saving...' : 'Save Employee Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV / Excel Upload Modal (Supports Updates by ID / Emp ID) */}
      {isCsvImportOpen && (
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-dark-primary">
                Bulk Import / Update Employee Records
              </h3>
              <button
                onClick={() => setIsCsvImportOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <div className="text-xs text-blue-900 font-semibold leading-relaxed">
                Download current data template. Include existing <strong>ID</strong> or{' '}
                <strong>Emp ID</strong> to update existing records, or leave blank to insert new
                records.
              </div>
              <button
                onClick={handleDownloadSampleCsv}
                className="px-4 py-2 bg-blue-primary text-white rounded-xl text-xs font-bold shrink-0 shadow-sm"
              >
                <i className="fas fa-download mr-1"></i> Sample Template
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center bg-gray-50/50">
              <i className="fas fa-file-arrow-up text-3xl text-gray-400 mb-2"></i>
              <p className="text-xs font-bold text-dark-primary mb-2">
                Select Excel or CSV file to import / update
              </p>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="text-xs text-dark-soft file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-primary file:text-white cursor-pointer"
              />
            </div>

            {csvPreviewRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-dark-primary">
                  <span>
                    Preview Import ({csvPreviewRows.length} total rows:{' '}
                    <span className="text-blue-600 font-black">
                      {csvPreviewRows.filter((r) => r.isUpdate).length} Updates
                    </span>
                    ,{' '}
                    <span className="text-emerald-600 font-black">
                      {csvPreviewRows.filter((r) => !r.isUpdate).length} New
                    </span>
                    )
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-gray-100 font-bold border-b">
                      <tr>
                        <th className="p-2">Action</th>
                        <th className="p-2">ID / Emp ID</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Designation</th>
                        <th className="p-2">Organization</th>
                        <th className="p-2">Salaried</th>
                        <th className="p-2">Login Allowed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {csvPreviewRows.map((r, i) => (
                        <tr key={i} className={r.isUpdate ? 'bg-blue-50/40' : ''}>
                          <td className="p-2">
                            {r.isUpdate ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                                <i className="fas fa-sync-alt text-[8px]"></i> UPDATE (#
                                {r.existingId})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                <i className="fas fa-plus text-[8px]"></i> NEW
                              </span>
                            )}
                          </td>
                          <td className="p-2 font-bold">{r.emp_id}</td>
                          <td className="p-2 font-bold">{r.name}</td>
                          <td className="p-2">{r.designation}</td>
                          <td className="p-2 truncate max-w-[120px]">{r.organization}</td>
                          <td className="p-2 font-bold">
                            {r.is_salaried_employee ? (
                              <span className="text-emerald-600">TRUE (₹{r.current_salary})</span>
                            ) : (
                              <span className="text-gray-400">FALSE</span>
                            )}
                          </td>
                          <td className="p-2 font-bold">
                            {r.login_allowed ? (
                              <span className="text-emerald-600">TRUE</span>
                            ) : (
                              <span className="text-gray-400">FALSE</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsCsvImportOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-light-ui text-dark-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={csvPreviewRows.length === 0 || saving}
                onClick={handleBulkImportSubmit}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 text-white shadow-md disabled:opacity-50"
              >
                {saving
                  ? 'Processing Import...'
                  : `Confirm Import / Update (${csvPreviewRows.length} Rows)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Non-Employee / Auth User Roles Modal */}
      {isUserRolesModalOpen && (
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-3xl w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-dark-primary flex items-center gap-2">
                  <i className="fas fa-user-shield text-purple-600"></i> Manage Portal User Roles
                  (Auth Users)
                </h3>
                <p className="text-xs text-dark-muted font-semibold mt-0.5">
                  Update role bitmask permissions for any registered Auth User (including
                  non-employees).
                </p>
              </div>
              <button
                onClick={() => {
                  setIsUserRolesModalOpen(false);
                  setEditingAuthUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {/* Search filter */}
            <div className="relative">
              <i className="fas fa-search absolute left-3.5 top-3 text-gray-400 text-xs"></i>
              <input
                type="text"
                placeholder="Search Auth Users by Name or Email..."
                value={userRolesSearch}
                onChange={(e) => setUserRolesSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-200 outline-none"
              />
            </div>

            {/* User Roles Table / List */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead className="bg-purple-50/60 border-b text-[10px] uppercase tracking-wider text-purple-950 font-bold">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Employee Link</th>
                    <th className="p-3">Current Portal Roles</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {authUsers
                    .filter((u) => {
                      if (!userRolesSearch.trim()) return true;
                      const q = userRolesSearch.toLowerCase();
                      return (
                        (u.full_name || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q)
                      );
                    })
                    .map((u) => {
                      const mappedEmp = mappedAuthUserMap.get(String(u.user_id));
                      const isEditingThis = editingAuthUser === u.user_id;

                      return (
                        <tr key={u.user_id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="p-3">
                            <div className="font-extrabold text-dark-primary text-xs flex items-center gap-1.5">
                              <i className="fas fa-user-circle text-purple-600"></i>
                              {u.full_name || 'User'}
                            </div>
                            <div className="text-[10px] text-purple-700 font-semibold">
                              {u.email}
                            </div>
                          </td>
                          <td className="p-3">
                            {isEditingThis ? (
                              <select
                                value={editingEmpId}
                                onChange={(e) => setEditingEmpId(e.target.value)}
                                className="w-full px-2 py-1 border rounded-lg text-xs bg-white font-bold outline-none border-purple-300"
                              >
                                <option value="">-- External User --</option>
                                {employees.map((emp) => {
                                  const isOtherLinked =
                                    emp.auth_id && String(emp.auth_id) !== String(u.user_id);
                                  return (
                                    <option key={emp.id} value={emp.id} disabled={isOtherLinked}>
                                      {emp.name} ({emp.emp_id || `EMP-${emp.id}`})
                                      {isOtherLinked ? ' 🔒 [Mapped]' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            ) : mappedEmp ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg text-[10px] font-black border border-emerald-200 shadow-xs">
                                <i className="fas fa-id-badge text-emerald-600"></i>{' '}
                                {mappedEmp.emp_name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-200 shadow-xs">
                                <i className="fas fa-user-tag text-amber-600"></i> External User
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {isEditingThis ? (
                              <div className="w-56">
                                <MultiSelectRolesDropdown
                                  value={editingRoleSum}
                                  onChange={(nextSum) => setEditingRoleSum(nextSum)}
                                />
                              </div>
                            ) : (
                              <div className="font-extrabold text-purple-950 text-xs">
                                {formatPortalRoles(u.role)}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {isEditingThis ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSaveUserRoleDirect(
                                      u.user_id,
                                      editingRoleSum,
                                      editingEmpId
                                    )
                                  }
                                  disabled={saving}
                                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm"
                                >
                                  {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingAuthUser(null)}
                                  className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAuthUser(u.user_id);
                                  setEditingRoleSum(String(u.role || '8'));
                                  setEditingEmpId(mappedEmp ? String(mappedEmp.emp_id) : '');
                                }}
                                className="px-3 py-1 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-lg text-xs font-bold transition-all"
                              >
                                <i className="fas fa-edit mr-1"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsUserRolesModalOpen(false);
                  setEditingAuthUser(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-dark-primary rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeRecordsView;
