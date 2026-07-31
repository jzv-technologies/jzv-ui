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

const DESIGNATIONS = DEFAULT_ROLES;

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

// Error Boundary Component to isolate modal rendering exceptions
class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Modal Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-dark-almostblack/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-red-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className="text-base font-black text-dark-primary">Modal Component Error</h3>
            <p className="text-xs text-dark-muted font-bold">
              An unexpected error occurred while displaying this modal:
            </p>
            <div className="p-3 bg-red-50 text-red-800 text-[11px] font-mono rounded-xl border border-red-200 text-left overflow-x-auto max-h-32">
              {this.state.error?.toString()}
            </div>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onClose) this.props.onClose();
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              Close & Reset Modal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

  // Bulk Apply Increments State & Selection
  const [isBulkApplyModalOpen, setIsBulkApplyModalOpen] = useState(false);
  const [bulkApplyFilterMode, setBulkApplyFilterMode] = useState('month');
  const [bulkApplyDateValue, setBulkApplyDateValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedBulkEmpIds, setSelectedBulkEmpIds] = useState([]);

  // Section Editability in Edit Modal (Sections 1-4 read-only by default, Section 5 editable by default)
  const [editableSections, setEditableSections] = useState({
    sec1: false,
    sec2: false,
    sec3: false,
    sec4: false,
    sec5: true,
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [navConfirmModal, setNavConfirmModal] = useState(null);

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
    is_teacher: true,
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
            name: emp.name || '',
            primary_mobile: emp.primary_mobile || '',
            secondary_mobile: emp.secondary_mobile || '',
            designation: emp.designation || 'Teacher',
            communication_address: emp.communication_address || '',
            compensation_history: Array.isArray(emp.compensation_history)
              ? emp.compensation_history
              : [],
            is_teacher: emp.is_teacher !== false,
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
          emp.primary_mobile || '',
          emp.secondary_mobile || '',
          emp.designation || '',
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

  // Current index in filtered list for Prev/Next navigation
  const currentIndex = useMemo(() => {
    if (!selectedEmployee || !Array.isArray(filteredEmployees)) return -1;
    const targetId = selectedEmployee.id || selectedEmployee.emp_id;
    if (targetId == null) return -1;
    return filteredEmployees.findIndex(
      (e) => e && (String(e.id) === String(targetId) || String(e.emp_id) === String(targetId))
    );
  }, [selectedEmployee, filteredEmployees]);

  // Matching list for Bulk Apply Increments Modal based on date/month
  const matchingBulkIncrements = useMemo(() => {
    if (!bulkApplyDateValue || !Array.isArray(employees)) return [];
    const list = [];
    employees.forEach((emp) => {
      if (!emp) return;
      const history = Array.isArray(emp.compensation_history)
        ? emp.compensation_history
        : [];

      const match = history.find((h) => {
        if (!h || !h.date) return false;
        if (bulkApplyFilterMode === 'month') {
          return String(h.date).startsWith(bulkApplyDateValue);
        }
        return String(h.date) === bulkApplyDateValue;
      });

      if (match) {
        const currentSal = Number(emp.current_salary) || 0;
        const hikeAmt = Number(match.amount) || 0;
        const proposedSalary = match.updated_salary
          ? Number(match.updated_salary)
          : currentSal + hikeAmt;
        list.push({
          emp,
          matchingEntry: match,
          currentSalary: currentSal,
          proposedSalary,
        });
      }
    });
    return list;
  }, [employees, bulkApplyDateValue, bulkApplyFilterMode]);

  // Synchronize selective employee checkboxes when matchingBulkIncrements list changes
  useEffect(() => {
    if (Array.isArray(matchingBulkIncrements) && matchingBulkIncrements.length > 0) {
      setSelectedBulkEmpIds(matchingBulkIncrements.map((item) => String(item.emp.id)));
    } else {
      setSelectedBulkEmpIds([]);
    }
  }, [matchingBulkIncrements]);

  // Safe Contact Parser Helper
  const parseContact = (c) => {
    if (c && typeof c === 'object' && !Array.isArray(c)) {
      return {
        name: c.name || '',
        relation: c.relation || '',
        phone: c.phone || c.contact || '',
        address: c.address || '',
      };
    }
    if (typeof c === 'string' && c.trim().startsWith('{')) {
      try {
        const p = JSON.parse(c);
        if (p && typeof p === 'object') {
          return {
            name: p.name || '',
            relation: p.relation || '',
            phone: p.phone || p.contact || '',
            address: p.address || '',
          };
        }
      } catch (e) {}
    }
    return { name: typeof c === 'string' ? c : '', relation: '', phone: '', address: '' };
  };

  const handleOpenModal = (mode, emp = null) => {
    setModalMode(mode);
    const targetEmp = emp || selectedEmployee || currentSelfEmployee;
    let loaded = null;
    if ((mode === 'edit' || mode === 'self_edit') && targetEmp) {
      setSelectedEmployee(targetEmp);
      const empToLoad = targetEmp;
      const matchedAuthUser =
        empToLoad.auth_id && Array.isArray(authUsers)
          ? authUsers.find((u) => u && String(u.user_id) === String(empToLoad.auth_id))
          : null;

      loaded = {
        name: empToLoad.name || '',
        father_husband_name: empToLoad.father_husband_name || '',
        is_male: empToLoad.is_male !== false,
        date_of_birth: empToLoad.date_of_birth || '',
        blood_group: empToLoad.blood_group || '',
        marital_status: empToLoad.marital_status || 'Single',
        highest_education: empToLoad.highest_education || '',
        primary_mobile: empToLoad.primary_mobile || '',
        secondary_mobile: empToLoad.secondary_mobile || '',
        email: empToLoad.email || '',
        communication_address: empToLoad.communication_address || '',

        bank_account_name: empToLoad.bank_account_name || '',
        bank_account_number: empToLoad.bank_account_number || '',
        bank_ifsc_code: empToLoad.bank_ifsc_code || '',
        bank_name: empToLoad.bank_name || '',
        bank_branch_name: empToLoad.bank_branch_name || '',

        emergency_contact_1: parseContact(empToLoad.emergency_contact_1),
        emergency_contact_2: parseContact(empToLoad.emergency_contact_2),

        emp_id: empToLoad.emp_id || (empToLoad.id ? `EMP-${String(empToLoad.id).padStart(3, '0')}` : 'EMP-001'),
        organization: empToLoad.organization || 'Jamia Zaytoonah',
        designation: empToLoad.designation || 'Teacher',
        joining_date: empToLoad.joining_date || '',
        is_salaried_employee:
          empToLoad.is_salaried_employee !== false &&
          empToLoad.is_salaried_employee !== 'false' &&
          empToLoad.is_salaried_employee !== 'Service' &&
          empToLoad.is_salaried_employee !== 'service' &&
          empToLoad.is_salaried_employee !== 0,
        current_salary: empToLoad.current_salary || '',
        compensation_history: Array.isArray(empToLoad.compensation_history)
          ? empToLoad.compensation_history
          : [],
        is_teacher: empToLoad.is_teacher !== false,
        is_active: empToLoad.is_active !== false,

        login_allowed: empToLoad.login_allowed === true,
        auth_id: empToLoad.auth_id || '',
        mapped_roles_sum: matchedAuthUser?.role ? String(matchedAuthUser.role) : '8',
        update_history: Array.isArray(empToLoad.update_history) ? empToLoad.update_history : [],
      };
      setEditableSections({ sec1: false, sec2: false, sec3: false, sec4: false, sec5: false });
    } else {
      loaded = {
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
        is_teacher: true,
        is_active: true,

        login_allowed: false,
        auth_id: '',
        mapped_roles_sum: '8',
        update_history: [],
      };
      setEditableSections({ sec1: true, sec2: true, sec3: true, sec4: true, sec5: true });
    }
    setFormData(loaded);
    setInitialFormData(JSON.stringify(loaded));
    setNewIncrement({ date: '', amount: '', percentage: '', notes: '' });
  };

  // Direct Record Switch Helper for Prev/Next Navigation
  const switchRecordDirect = (emp) => {
    if (!emp) return;
    setSelectedEmployee(emp);
    const matchedAuthUser =
      emp?.auth_id && Array.isArray(authUsers)
        ? authUsers.find((u) => u && String(u.user_id) === String(emp.auth_id))
        : null;
    const loaded = {
      name: emp.name || '',
      father_husband_name: emp.father_husband_name || '',
      is_male: emp.is_male !== false,
      date_of_birth: emp.date_of_birth || '',
      blood_group: emp.blood_group || '',
      marital_status: emp.marital_status || 'Single',
      highest_education: emp.highest_education || '',
      primary_mobile: emp.primary_mobile || '',
      secondary_mobile: emp.secondary_mobile || '',
      email: emp.email || '',
      communication_address: emp.communication_address || '',
      bank_account_name: emp.bank_account_name || '',
      bank_account_number: emp.bank_account_number || '',
      bank_ifsc_code: emp.bank_ifsc_code || '',
      bank_name: emp.bank_name || '',
      bank_branch_name: emp.bank_branch_name || '',
      emergency_contact_1: parseContact(emp.emergency_contact_1),
      emergency_contact_2: parseContact(emp.emergency_contact_2),
      emp_id: emp.emp_id || (emp.id ? `EMP-${String(emp.id).padStart(3, '0')}` : 'EMP-001'),
      organization: emp.organization || 'Jamia Zaytoonah',
      designation: emp.designation || 'Teacher',
      joining_date: emp.joining_date || '',
      is_salaried_employee: emp.is_salaried_employee !== false,
      current_salary: emp.current_salary || '',
      compensation_history: Array.isArray(emp.compensation_history)
        ? emp.compensation_history
        : [],
      is_teacher: emp.is_teacher !== false,
      is_active: emp.is_active !== false,
      login_allowed: emp.login_allowed === true,
      auth_id: emp.auth_id || '',
      mapped_roles_sum: matchedAuthUser?.role ? String(matchedAuthUser.role) : '8',
      update_history: Array.isArray(emp.update_history) ? emp.update_history : [],
    };
    setFormData(loaded);
    setInitialFormData(JSON.stringify(loaded));
    setEditableSections({ sec1: false, sec2: false, sec3: false, sec4: false, sec5: true });
    setNavConfirmModal(null);
  };

  const handleNavigateRecord = (targetIndex) => {
    if (targetIndex < 0 || targetIndex >= filteredEmployees.length) return;
    const targetEmp = filteredEmployees[targetIndex];
    if (!targetEmp) return;

    if (isFormDirty) {
      setNavConfirmModal({ targetEmp });
    } else {
      switchRecordDirect(targetEmp);
    }
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
          const matched = Array.isArray(authUsers)
            ? authUsers.find(
                (u) =>
                  u &&
                  ((u.email && emp.email && u.email.toLowerCase() === emp.email.toLowerCase()) ||
                    (u.full_name &&
                      emp.name &&
                      u.full_name.toLowerCase() === emp.name.toLowerCase()))
              )
            : null;

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
    if (!newIncrement.date && !newIncrement.amount && !newIncrement.updated_salary) {
      showToast('Please specify date, amount, or updated salary for increment', 'error');
      return;
    }
    const currentSal = Number(formData.current_salary) || 0;
    const hikeAmt = Number(newIncrement.amount) || 0;
    const computedUpdated = currentSal + hikeAmt;

    const itemToAdd = {
      ...newIncrement,
      updated_salary: newIncrement.updated_salary || (computedUpdated > 0 ? String(computedUpdated) : ''),
      id: Date.now(),
    };

    setFormData((prev) => ({
      ...prev,
      compensation_history: [...prev.compensation_history, itemToAdd],
    }));
    setNewIncrement({ date: '', amount: '', percentage: '', updated_salary: '', notes: '' });
  };

  // Bulk Apply Increments Execution Handler for Selected Employees
  const handleExecuteBulkApplyIncrements = async () => {
    const selectedList = matchingBulkIncrements.filter((item) =>
      selectedBulkEmpIds.includes(String(item.emp.id))
    );
    if (!selectedList || selectedList.length === 0) {
      showToast('Please select at least one employee to apply increments', 'error');
      return;
    }
    setSaving(true);
    let updatedCount = 0;
    try {
      const updatedEmployees = [...employees];

      for (let i = 0; i < selectedList.length; i++) {
        const item = selectedList[i];
        const empId = item.emp.id;
        const newSalary = item.proposedSalary;

        const { error } = await supabase
          .from('employees')
          .update({ current_salary: newSalary })
          .eq('id', empId);

        if (!error) {
          updatedCount++;
          const idx = updatedEmployees.findIndex((e) => String(e.id) === String(empId));
          if (idx !== -1) {
            updatedEmployees[idx] = {
              ...updatedEmployees[idx],
              current_salary: newSalary,
            };
          }
        }
      }

      setEmployees(updatedEmployees);
      localStorage.setItem('jzv_employees_local_data', JSON.stringify(updatedEmployees));
      showToast(
        `Successfully updated Current Salary for ${updatedCount} selected employees!`,
        'success'
      );
      setIsBulkApplyModalOpen(false);
    } catch (err) {
      console.error('Error applying bulk increments:', err);
      showToast('Failed to apply increments: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
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
      'is_teacher',
      'is_active',
      'login_allowed',
      'auth_id',
      'mapped_roles_sum',
    ];
    if (!oldObj) return ['record_created'];

    const changed = [];
    keys.forEach((k) => {
      const oldVal = oldObj[k];
      const newVal = newObj[k];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changed.push(k);
      }
    });
    return changed;
  };

  // Helper to build payload matching strictly 'employees' table schema
  const buildEmployeePayload = (data) => ({
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
    is_teacher: data.is_teacher !== false,
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

  const buildTeacherPayload = buildEmployeePayload;

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

      // 2. Sync Employee Link in employees table if modified
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
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Employee name is required', 'error');
      return false;
    }

    const isSalariedType =
      formData.is_salaried_employee === true ||
      (formData.is_salaried_employee !== false &&
        formData.is_salaried_employee !== 'false' &&
        formData.is_salaried_employee !== 'Service' &&
        formData.is_salaried_employee !== 'service' &&
        formData.is_salaried_employee !== 0);

    // Only validate salary if employee is Salaried and NOT in self_edit mode
    if (modalMode !== 'self_edit' && isSalariedType) {
      const salaryNum = Number(formData.current_salary);
      if (!formData.current_salary || isNaN(salaryNum) || salaryNum <= 0) {
        showToast(
          'Current Salary is required and must be a valid amount greater than ₹0 for salaried employees.',
          'error'
        );
        return false;
      }
    }

    setSaving(true);
    try {
      const currentUserEmail = user?.email || 'Admin / Management User';

      const employeePayload = buildEmployeePayload(formData);

      // Compute changed fields & update history
      const changedFields = getChangedFields(selectedEmployee, employeePayload);
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
      employeePayload.update_history = updatedHistoryList;

      let updatedList = [...employees];
      let dbError = null;

      if (modalMode === 'edit' && selectedEmployee?.id) {
        const { error: eErr } = await supabase
          .from('employees')
          .update(employeePayload)
          .eq('id', selectedEmployee.id);

        if (eErr) dbError = eErr;

        if (dbError) {
          showToast('Failed to update record: ' + (dbError.message || 'Database error'), 'error');
          return false;
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
          String(emp.id) === String(selectedEmployee.id) ? { ...emp, ...employeePayload } : emp
        );
        showToast('Employee record updated successfully!', 'success');
      } else if (modalMode === 'self_edit' && (currentSelfEmployee?.id || selectedEmployee?.id || teacherRecord?.id)) {
        const targetId = currentSelfEmployee?.id || selectedEmployee?.id || teacherRecord?.id;
        const selfEditPayload = {
          name: formData.name.trim(),
          father_husband_name: formData.father_husband_name || '',
          is_male: formData.is_male !== false,
          date_of_birth: formData.date_of_birth || null,
          blood_group: formData.blood_group || '',
          marital_status: formData.marital_status || 'Single',
          highest_education: formData.highest_education || '',
          primary_mobile: formData.primary_mobile || '',
          secondary_mobile: formData.secondary_mobile || '',
          communication_address: formData.communication_address || '',
          bank_account_name: formData.bank_account_name || '',
          bank_account_number: formData.bank_account_number || '',
          bank_ifsc_code: formData.bank_ifsc_code || '',
          bank_name: formData.bank_name || '',
          bank_branch_name: formData.bank_branch_name || '',
          emergency_contact_1: formData.emergency_contact_1 || {},
          emergency_contact_2: formData.emergency_contact_2 || {},
          update_history: updatedHistoryList,
        };

        const { error: eErr } = await supabase
          .from('employees')
          .update(selfEditPayload)
          .eq('id', targetId);

        if (eErr) dbError = eErr;

        if (dbError) {
          showToast(
            'Failed to update profile info: ' + (dbError.message || 'Database error'),
            'error'
          );
          return false;
        }

        updatedList = updatedList.map((emp) =>
          String(emp.id) === String(targetId)
            ? { ...emp, ...selfEditPayload }
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
          .insert([employeePayload])
          .select();

        if (!eErr && eData?.[0]) {
          newRecord = eData[0];
        } else {
          dbError = eErr;
        }

        if (dbError) {
          showToast('Failed to add employee: ' + (dbError.message || 'Database error'), 'error');
          return false;
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

        updatedList = [newRecord, ...updatedList];
        showToast('New employee added successfully!', 'success');
      }

      setEmployees(updatedList);
      localStorage.setItem('jzv_employees_local_data', JSON.stringify(updatedList));
      setInitialFormData(JSON.stringify(formData));
      setModalMode(null);
      return true;
    } catch (err) {
      showToast('Error saving record: ' + err.message, 'error');
      return false;
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
      'Primary Mobile': emp.primary_mobile || '',
      'Secondary Mobile': emp.secondary_mobile || '',
      Email: emp.email || '',
      'Communication Address': emp.communication_address || '',
      Designation: emp.designation || 'Teacher',
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
      'Is Teaching Staff': emp.is_teacher !== false ? 'TRUE' : 'FALSE',
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
              (matchedExisting ? matchedExisting.designation : 'Teacher'),
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
                (matchedExisting ? matchedExisting.primary_mobile : '')
            ),
            secondary_mobile: String(
              row['Secondary Mobile'] ||
                row['secondary_mobile'] ||
                (matchedExisting ? matchedExisting.secondary_mobile : '')
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
              (matchedExisting ? matchedExisting.communication_address : ''),
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
            is_teacher:
              String(
                row['Is Teacher'] ??
                  row['is_teacher'] ??
                  (matchedExisting ? matchedExisting.is_teacher : 'true')
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

  // Helper to render Add / Edit Employee Modal
  const renderEditModal = () => {
    if (!modalMode || (modalMode !== 'add' && modalMode !== 'edit' && modalMode !== 'self_edit')) {
return null;
    }
    return (
      <ModalErrorBoundary onClose={() => setModalMode(null)}>
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
            {/* Fixed Top Header with Title, Actions, and Close Button at Top Right */}
            <div className="px-5 py-4 bg-white border-b shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 z-20 relative">
              {/* Header Title + Close button on mobile */}
              <div className="flex items-center justify-between gap-2 w-full sm:w-auto min-w-0 flex-1">
                <h3 className="text-base font-black text-dark-primary flex items-center gap-2 truncate">
                  {modalMode === 'add' ? (
                    <>
                      <i className="fas fa-user-plus text-brand-primary shrink-0"></i>{' '}
                      <span>Add New Employee Record</span>
                    </>
                  ) : modalMode === 'self_edit' ? (
                    <>
                      <i className="fas fa-user-pen text-brand-primary shrink-0"></i>{' '}
                      <span className="truncate">
                        Edit Profile Details:{' '}
                        <span className="text-purple-950 font-extrabold">
                          {formData.name || selectedEmployee?.name || currentSelfEmployee?.name}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-id-card text-purple-600 shrink-0"></i>{' '}
                      <span className="truncate">
                        Edit Record:{' '}
                        <span className="text-purple-950 font-extrabold">
                          {formData.name || selectedEmployee?.name}
                        </span>
                      </span>
                    </>
                  )}
                </h3>

                {/* Close Button on mobile (top right of mobile title row) */}
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex sm:hidden items-center justify-center transition-all shrink-0"
                  title="Close (Esc)"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>

              {/* Action Buttons (Prev/Next & Save Record & Close on desktop) */}
              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                {/* Prev / Next Record Navigation (Edit Mode) */}
                {modalMode === 'edit' && filteredEmployees.length > 1 && (
                  <div className="flex items-center gap-1 bg-purple-50 p-1 rounded-xl border border-purple-200">
                    <button
                      type="button"
                      disabled={currentIndex <= 0 || saving}
                      onClick={() => handleNavigateRecord(currentIndex - 1)}
                      className="px-2 py-1 text-xs font-extrabold bg-white hover:bg-purple-100 text-purple-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-purple-300 shadow-xs flex items-center gap-1"
                      title="Previous Employee Record"
                    >
                      <i className="fas fa-chevron-left text-[10px]"></i> Prev
                    </button>
                    <span className="text-[10px] font-extrabold px-1 text-purple-950">
                      {currentIndex + 1} / {filteredEmployees.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentIndex >= filteredEmployees.length - 1 || saving}
                      onClick={() => handleNavigateRecord(currentIndex + 1)}
                      className="px-2 py-1 text-xs font-extrabold bg-white hover:bg-purple-100 text-purple-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-purple-300 shadow-xs flex items-center gap-1"
                      title="Next Employee Record"
                    >
                      Next <i className="fas fa-chevron-right text-[10px]"></i>
                    </button>
                  </div>
                )}

                {/* Save Record button */}
                <button
                  type="button"
                  onClick={handleSaveEmployee}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <i className="fas fa-floppy-disk"></i> {saving ? 'Saving...' : 'Save Record'}
                </button>

                {/* Close Button on Desktop */}
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 hidden sm:flex items-center justify-center transition-all shrink-0"
                  title="Close (Esc)"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>
            </div>

            {/* Scrollable Form Body Container */}
            <form
              onSubmit={handleSaveEmployee}
              className="p-6 overflow-y-auto flex-1 space-y-6 text-xs font-bold"
            >
              {/* Section 1: Personal Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-1">
                  <h4 className="text-xs uppercase tracking-wider text-brand-primary font-black">
                    Section 1: Personal Details
                  </h4>
                  {modalMode !== 'add' && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditableSections((prev) => ({ ...prev, sec1: !prev.sec1 }))
                      }
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                        editableSections.sec1
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      <i className={`fas ${editableSections.sec1 ? 'fa-check' : 'fa-pen'}`}></i>
                      {editableSections.sec1 ? 'Editing Enabled' : 'Edit Section 1'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-dark-soft mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Father / Husband Name</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.father_husband_name}
                      onChange={(e) =>
                        setFormData({ ...formData, father_husband_name: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Gender</label>
                    <select
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.is_male ? 'Male' : 'Female'}
                      onChange={(e) =>
                        setFormData({ ...formData, is_male: e.target.value === 'Male' })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Date of Birth</label>
                    <input
                      type="date"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.date_of_birth}
                      onChange={(e) =>
                        setFormData({ ...formData, date_of_birth: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Blood Group</label>
                    <select
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
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
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.marital_status}
                      onChange={(e) =>
                        setFormData({ ...formData, marital_status: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
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
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      placeholder="e.g. M.Sc, M.Ed, B.Tech"
                      value={formData.highest_education}
                      onChange={(e) =>
                        setFormData({ ...formData, highest_education: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">
                      Primary Mobile (10 digits)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.primary_mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, primary_mobile: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Email Address</label>
                    <input
                      type="email"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-dark-soft mb-1">Communication Address</label>
                    <textarea
                      rows="2"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.communication_address}
                      onChange={(e) =>
                        setFormData({ ...formData, communication_address: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Bank Detail */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-1">
                  <h4 className="text-xs uppercase tracking-wider text-emerald-700 font-black">
                    Section 2: Bank Detail
                  </h4>
                  {modalMode !== 'add' && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditableSections((prev) => ({ ...prev, sec2: !prev.sec2 }))
                      }
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                        editableSections.sec2
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <i className={`fas ${editableSections.sec2 ? 'fa-check' : 'fa-pen'}`}></i>
                      {editableSections.sec2 ? 'Editing Enabled' : 'Edit Section 2'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-dark-soft mb-1">Account Name</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2}
                      placeholder="Account Holder Name"
                      value={formData.bank_account_name}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_account_name: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Account Number</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2}
                      placeholder="Bank Account Number"
                      value={formData.bank_account_number}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_account_number: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-mono font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">IFSC Code</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2}
                      placeholder="e.g. SBIN0001234"
                      value={formData.bank_ifsc_code}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_ifsc_code: e.target.value.toUpperCase() })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-mono uppercase font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Bank Name</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2}
                      placeholder="e.g. State Bank of India"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-dark-soft mb-1">Branch Name</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2}
                      placeholder="Bank Branch Location"
                      value={formData.bank_branch_name}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_branch_name: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Emergency Contacts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-1">
                  <h4 className="text-xs uppercase tracking-wider text-rose-700 font-black">
                    Section 3: Emergency Contacts
                  </h4>
                  {modalMode !== 'add' && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditableSections((prev) => ({ ...prev, sec3: !prev.sec3 }))
                      }
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                        editableSections.sec3
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <i className={`fas ${editableSections.sec3 ? 'fa-check' : 'fa-pen'}`}></i>
                      {editableSections.sec3 ? 'Editing Enabled' : 'Edit Section 3'}
                    </button>
                  )}
                </div>
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
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_1?.name || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...(formData?.emergency_contact_1 || {}),
                                name: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Relation</label>
                        <select
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_1?.relation || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...(formData?.emergency_contact_1 || {}),
                                relation: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
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
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_1?.phone || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...(formData?.emergency_contact_1 || {}),
                                phone: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Address</label>
                        <input
                          type="text"
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_1?.address || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...(formData?.emergency_contact_1 || {}),
                                address: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
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
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_2?.name || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...(formData?.emergency_contact_2 || {}),
                                name: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Relation</label>
                        <select
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_2?.relation || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...(formData?.emergency_contact_2 || {}),
                                relation: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
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
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_2?.phone || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...(formData?.emergency_contact_2 || {}),
                                phone: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Address</label>
                        <input
                          type="text"
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_2?.address || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...(formData?.emergency_contact_2 || {}),
                                address: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </ModalErrorBoundary>
    );
  };

  // Render Employee Personal Info Card (for teacher/employee self mode)
  if (isEmployeeSelf) {
    const emp = currentSelfEmployee || {};
    const authUserEmail = user?.email || emp.email || 'Not Available';

    return (
      <>
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
                  {emp.primary_mobile || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Secondary Mobile
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.secondary_mobile || 'Unknown'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-dark-muted block text-[10px] uppercase font-bold">
                  Communication Address
                </span>
                <span className="text-dark-primary font-bold">
                  {emp.communication_address || 'Not Provided'}
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
                  {emp.is_teacher !== false ? 'Yes' : 'No'}
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
    </div>
    {renderEditModal()}
  </>
  );
}

  // Admin & Management View
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Unified Header Card with Search, Filters, and Action Icons */}
      <div className="bg-white p-5 rounded-3xl border border-light-border shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-dark-primary tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-primary/10 text-orange-primary flex items-center justify-center shrink-0">
              <i className="fas fa-users-gear text-xl"></i>
            </div>
            Employee Records
          </h1>
        </div>

        {/* Search, Filter & Action Controls */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <i className="fas fa-search absolute left-3.5 top-3 text-gray-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search Name, ID, Mobile, Role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
            title="Filter by Designation"
          >
            <option value="">All Designations</option>
            {DEFAULT_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
            title="Filter by Status"
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Statuses</option>
          </select>

          {/* Action Icon Buttons */}
          <div className="flex items-center gap-2 shrink-0 justify-end sm:justify-start">
            <button
              onClick={handleExportEmployeesExcel}
              className="w-10 h-10 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-bold border border-blue-200 transition-all flex items-center justify-center shadow-sm active:scale-95 shrink-0"
              title="Export Excel"
            >
              <i className="fas fa-file-excel text-blue-600 text-base"></i>
            </button>

            {(isAdmin || isManagement) && (
              <>
                <button
                  onClick={() => setIsUserRolesModalOpen(true)}
                  className="w-10 h-10 bg-purple-50 text-purple-800 hover:bg-purple-100 rounded-xl text-sm font-bold border border-purple-200 transition-all flex items-center justify-center shadow-sm active:scale-95 shrink-0"
                  title="Manage Portal User Roles"
                >
                  <i className="fas fa-user-shield text-purple-600 text-base"></i>
                </button>
                <button
                  onClick={() => setIsBulkApplyModalOpen(true)}
                  className="w-10 h-10 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-sm font-bold border border-emerald-200 transition-all flex items-center justify-center shadow-sm active:scale-95 shrink-0"
                  title="Apply Increment Salaries by Effective Date/Month ($)"
                >
                  <i className="fas fa-dollar-sign text-emerald-600 text-base"></i>
                </button>
                <button
                  onClick={() => setIsCsvImportOpen(true)}
                  className="w-10 h-10 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-bold border border-emerald-200 transition-all flex items-center justify-center shadow-sm active:scale-95 shrink-0"
                  title="Bulk Import / Update"
                >
                  <i className="fas fa-file-arrow-up text-emerald-600 text-base"></i>
                </button>
                <button
                  onClick={() => handleOpenModal('add')}
                  className="w-10 h-10 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-sm font-extrabold shadow-md transition-all flex items-center justify-center active:scale-95 shrink-0"
                  title="Add Employee"
                >
                  <i className="fas fa-plus text-base"></i>
                </button>
              </>
            )}
          </div>
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
            <table className="w-full text-left text-xs font-semibold min-w-[900px]">
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
                          {emp.primary_mobile || 'No Phone'}
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
      {(modalMode === 'add' || modalMode === 'edit' || modalMode === 'self_edit') && (
        <ModalErrorBoundary onClose={() => setModalMode(null)}>
          <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
              {/* Fixed Top Header with Prev/Next, Save Record, and Close */}
              <div className="px-6 py-4 bg-white border-b shadow-xs flex items-center justify-between gap-2 shrink-0 z-20">
                <div>
                  <h3 className="text-base font-black text-dark-primary flex items-center gap-2">
                    {modalMode === 'add' ? (
                      <>
                        <i className="fas fa-user-plus text-brand-primary"></i> Add New Employee
                        Record
                      </>
                    ) : (
                      <>
                        <i className="fas fa-id-card text-purple-600"></i> Edit Record:{' '}
                        <span className="text-purple-950 font-extrabold">
                          {selectedEmployee?.name}
                        </span>
                      </>
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Prev / Next Record Navigation (Edit Mode) */}
                  {(modalMode === 'edit' || modalMode === 'self_edit') &&
                    filteredEmployees.length > 1 && (
                      <div className="flex items-center gap-1 bg-purple-50 p-1 rounded-xl border border-purple-200">
                        <button
                          type="button"
                          disabled={currentIndex <= 0 || saving}
                          onClick={() => handleNavigateRecord(currentIndex - 1)}
                          className="px-2 py-1 text-xs font-extrabold bg-white hover:bg-purple-100 text-purple-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-purple-300 shadow-xs flex items-center gap-1"
                          title="Previous Employee Record"
                        >
                          <i className="fas fa-chevron-left text-[10px]"></i> Prev
                        </button>
                        <span className="text-[10px] font-extrabold px-1 text-purple-950">
                          {currentIndex + 1} / {filteredEmployees.length}
                        </span>
                        <button
                          type="button"
                          disabled={currentIndex >= filteredEmployees.length - 1 || saving}
                          onClick={() => handleNavigateRecord(currentIndex + 1)}
                          className="px-2 py-1 text-xs font-extrabold bg-white hover:bg-purple-100 text-purple-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-purple-300 shadow-xs flex items-center gap-1"
                          title="Next Employee Record"
                        >
                          Next <i className="fas fa-chevron-right text-[10px]"></i>
                        </button>
                      </div>
                    )}

                  {/* Move Save Employee Record to Sticky Header and Rename to Save Record */}
                  <button
                    type="button"
                    onClick={handleSaveEmployee}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <i className="fas fa-floppy-disk"></i> {saving ? 'Saving...' : 'Save Record'}
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-all"
                    title="Close (Esc)"
                  >
                    <i className="fas fa-times text-base"></i>
                  </button>
                </div>
              </div>

              {/* Scrollable Form Body Container */}
              <form
                onSubmit={handleSaveEmployee}
                className="p-6 overflow-y-auto flex-1 space-y-6 text-xs font-bold"
              >
                {/* Section 1: Personal Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-1">
                    <h4 className="text-xs uppercase tracking-wider text-brand-primary font-black">
                      Section 1: Personal Details
                    </h4>
                    {modalMode !== 'add' && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditableSections((prev) => ({ ...prev, sec1: !prev.sec1 }))
                        }
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                          editableSections.sec1
                            ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                            : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        <i className={`fas ${editableSections.sec1 ? 'fa-check' : 'fa-pen'}`}></i>
                        {editableSections.sec1 ? 'Editing Enabled' : 'Edit Section 1'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-dark-soft mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        disabled={modalMode === 'edit' && !editableSections.sec1}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec1
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Father / Husband Name</label>
                      <input
                        type="text"
                        disabled={modalMode === 'edit' && !editableSections.sec1}
                        value={formData.father_husband_name}
                        onChange={(e) =>
                          setFormData({ ...formData, father_husband_name: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec1
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Gender</label>
                      <select
                        disabled={modalMode === 'edit' && !editableSections.sec1}
                        value={formData.is_male ? 'Male' : 'Female'}
                        onChange={(e) =>
                          setFormData({ ...formData, is_male: e.target.value === 'Male' })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec1
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Date of Birth</label>
                      <input
                        type="date"
                        disabled={modalMode === 'edit' && !editableSections.sec1}
                        value={formData.date_of_birth}
                        onChange={(e) =>
                          setFormData({ ...formData, date_of_birth: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec1
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Blood Group</label>
                      <select
                        disabled={modalMode === 'edit' && !editableSections.sec1}
                        value={formData.blood_group}
                        onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec1
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
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
                        disabled={modalMode === 'edit' && !editableSections.sec1}
                        value={formData.marital_status}
                        onChange={(e) =>
                          setFormData({ ...formData, marital_status: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec1
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
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
                        disabled={modalMode === 'edit' && !editableSections.sec1}
                        placeholder="e.g. M.Sc, M.Ed, B.Tech"
                        value={formData.highest_education}
                        onChange={(e) =>
                          setFormData({ ...formData, highest_education: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec1
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">
                        Primary Mobile (10 digits)
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        disabled={modalMode === 'edit' && !editableSections.sec1}
                        value={formData.primary_mobile}
                        onChange={(e) =>
                          setFormData({ ...formData, primary_mobile: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec1
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Email Address</label>
                      <input
                        type="email"
                        disabled={modalMode === 'edit' && !editableSections.sec1}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec1
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="block text-dark-soft mb-1">Communication Address</label>
                      <textarea
                        rows="2"
                        disabled={modalMode === 'edit' && !editableSections.sec1}
                        value={formData.communication_address}
                        onChange={(e) =>
                          setFormData({ ...formData, communication_address: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec1
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Bank Detail */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-1">
                    <h4 className="text-xs uppercase tracking-wider text-emerald-700 font-black">
                      Section 2: Bank Detail
                    </h4>
                    {modalMode !== 'add' && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditableSections((prev) => ({ ...prev, sec2: !prev.sec2 }))
                        }
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                          editableSections.sec2
                            ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <i className={`fas ${editableSections.sec2 ? 'fa-check' : 'fa-pen'}`}></i>
                        {editableSections.sec2 ? 'Editing Enabled' : 'Edit Section 2'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-dark-soft mb-1">Account Name</label>
                      <input
                        type="text"
                        disabled={modalMode === 'edit' && !editableSections.sec2}
                        placeholder="Account Holder Name"
                        value={formData.bank_account_name}
                        onChange={(e) =>
                          setFormData({ ...formData, bank_account_name: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec2
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Account Number</label>
                      <input
                        type="text"
                        disabled={modalMode === 'edit' && !editableSections.sec2}
                        placeholder="Bank Account Number"
                        value={formData.bank_account_number}
                        onChange={(e) =>
                          setFormData({ ...formData, bank_account_number: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-mono font-bold ${
                          modalMode === 'edit' && !editableSections.sec2
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">IFSC Code</label>
                      <input
                        type="text"
                        disabled={modalMode === 'edit' && !editableSections.sec2}
                        placeholder="e.g. SBIN0001234"
                        value={formData.bank_ifsc_code}
                        onChange={(e) =>
                          setFormData({ ...formData, bank_ifsc_code: e.target.value.toUpperCase() })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-mono uppercase font-bold ${
                          modalMode === 'edit' && !editableSections.sec2
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Bank Name</label>
                      <input
                        type="text"
                        disabled={modalMode === 'edit' && !editableSections.sec2}
                        placeholder="e.g. State Bank of India"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec2
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-dark-soft mb-1">Branch Name</label>
                      <input
                        type="text"
                        disabled={modalMode === 'edit' && !editableSections.sec2}
                        placeholder="Bank Branch Location"
                        value={formData.bank_branch_name}
                        onChange={(e) =>
                          setFormData({ ...formData, bank_branch_name: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec2
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Emergency Contacts */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-1">
                    <h4 className="text-xs uppercase tracking-wider text-rose-700 font-black">
                      Section 3: Emergency Contacts
                    </h4>
                    {modalMode !== 'add' && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditableSections((prev) => ({ ...prev, sec3: !prev.sec3 }))
                        }
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                          editableSections.sec3
                            ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        <i className={`fas ${editableSections.sec3 ? 'fa-check' : 'fa-pen'}`}></i>
                        {editableSections.sec3 ? 'Editing Enabled' : 'Edit Section 3'}
                      </button>
                    )}
                  </div>
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
                            disabled={modalMode === 'edit' && !editableSections.sec3}
                            value={formData?.emergency_contact_1?.name || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_1: {
                                  ...(formData?.emergency_contact_1 || {}),
                                  name: e.target.value,
                                },
                              })
                            }
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                              modalMode === 'edit' && !editableSections.sec3
                                ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                                : 'bg-white text-dark-primary border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-dark-muted block">Relation</label>
                          <select
                            disabled={modalMode === 'edit' && !editableSections.sec3}
                            value={formData?.emergency_contact_1?.relation || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_1: {
                                  ...(formData?.emergency_contact_1 || {}),
                                  relation: e.target.value,
                                },
                              })
                            }
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                              modalMode === 'edit' && !editableSections.sec3
                                ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                                : 'bg-white text-dark-primary border-gray-300'
                            }`}
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
                            disabled={modalMode === 'edit' && !editableSections.sec3}
                            value={formData?.emergency_contact_1?.phone || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_1: {
                                  ...(formData?.emergency_contact_1 || {}),
                                  phone: e.target.value,
                                },
                              })
                            }
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                              modalMode === 'edit' && !editableSections.sec3
                                ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                                : 'bg-white text-dark-primary border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-dark-muted block">Address</label>
                          <input
                            type="text"
                            disabled={modalMode === 'edit' && !editableSections.sec3}
                            value={formData?.emergency_contact_1?.address || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_1: {
                                  ...(formData?.emergency_contact_1 || {}),
                                  address: e.target.value,
                                },
                              })
                            }
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                              modalMode === 'edit' && !editableSections.sec3
                                ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                                : 'bg-white text-dark-primary border-gray-300'
                            }`}
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
                            disabled={modalMode === 'edit' && !editableSections.sec3}
                            value={formData?.emergency_contact_2?.name || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_2: {
                                  ...(formData?.emergency_contact_2 || {}),
                                  name: e.target.value,
                                },
                              })
                            }
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                              modalMode === 'edit' && !editableSections.sec3
                                ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                                : 'bg-white text-dark-primary border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-dark-muted block">Relation</label>
                          <select
                            disabled={modalMode === 'edit' && !editableSections.sec3}
                            value={formData?.emergency_contact_2?.relation || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_2: {
                                  ...(formData?.emergency_contact_2 || {}),
                                  relation: e.target.value,
                                },
                              })
                            }
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                              modalMode === 'edit' && !editableSections.sec3
                                ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                                : 'bg-white text-dark-primary border-gray-300'
                            }`}
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
                            disabled={modalMode === 'edit' && !editableSections.sec3}
                            value={formData?.emergency_contact_2?.phone || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_2: {
                                  ...(formData?.emergency_contact_2 || {}),
                                  phone: e.target.value,
                                },
                              })
                            }
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                              modalMode === 'edit' && !editableSections.sec3
                                ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                                : 'bg-white text-dark-primary border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-dark-muted block">Address</label>
                          <input
                            type="text"
                            disabled={modalMode === 'edit' && !editableSections.sec3}
                            value={formData?.emergency_contact_2?.address || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergency_contact_2: {
                                  ...(formData?.emergency_contact_2 || {}),
                                  address: e.target.value,
                                },
                              })
                            }
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                              modalMode === 'edit' && !editableSections.sec3
                                ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                                : 'bg-white text-dark-primary border-gray-300'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Employee Detail */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-1">
                    <h4 className="text-xs uppercase tracking-wider text-blue-primary font-black">
                      Section 4: Employee Detail
                    </h4>
                    {modalMode !== 'add' && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditableSections((prev) => ({ ...prev, sec4: !prev.sec4 }))
                        }
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                          editableSections.sec4
                            ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                            : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        <i className={`fas ${editableSections.sec4 ? 'fa-check' : 'fa-pen'}`}></i>
                        {editableSections.sec4 ? 'Editing Enabled' : 'Edit Section 4'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* First Field: Is Salaried Employee Toggle */}
                    <div>
                      <label className="block text-dark-soft mb-1 font-bold">
                        Is Salaried Employee?
                      </label>
                      <div
                        className={`inline-flex p-1 rounded-xl border ${
                          modalMode === 'edit' && !editableSections.sec4
                            ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                            : 'bg-gray-100 border-gray-200'
                        }`}
                      >
                        <button
                          type="button"
                          disabled={modalMode === 'edit' && !editableSections.sec4}
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
                          disabled={modalMode === 'edit' && !editableSections.sec4}
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
                        disabled={
                          (modalMode === 'edit' && !editableSections.sec4) ||
                          !formData.is_salaried_employee
                        }
                        value={formData.emp_id}
                        onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          (modalMode === 'edit' && !editableSections.sec4) ||
                          !formData.is_salaried_employee
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Organization</label>
                      <select
                        disabled={modalMode === 'edit' && !editableSections.sec4}
                        value={formData.organization}
                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec4
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      >
                        <option value="">-- Select Organization --</option>
                        {DEFAULT_ORGANIZATIONS.map((org) => (
                          <option key={org} value={org}>
                            {org}
                          </option>
                        ))}
                        {formData.organization &&
                          !DEFAULT_ORGANIZATIONS.includes(formData.organization) && (
                            <option value={formData.organization}>{formData.organization}</option>
                          )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Designation</label>
                      <select
                        disabled={modalMode === 'edit' && !editableSections.sec4}
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec4
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      >
                        {DESIGNATIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">Joining Date</label>
                      <input
                        type="date"
                        disabled={modalMode === 'edit' && !editableSections.sec4}
                        value={formData.joining_date}
                        onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          modalMode === 'edit' && !editableSections.sec4
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-soft mb-1">
                        Current Salary (₹){' '}
                        {formData.is_salaried_employee && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        disabled={
                          (modalMode === 'edit' && !editableSections.sec4) ||
                          !formData.is_salaried_employee
                        }
                        placeholder={
                          formData.is_salaried_employee
                            ? 'Required salary amount'
                            : 'Disabled for Service'
                        }
                        value={formData.current_salary}
                        onChange={(e) =>
                          setFormData({ ...formData, current_salary: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          (modalMode === 'edit' && !editableSections.sec4) ||
                          !formData.is_salaried_employee
                            ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-white text-dark-primary border-gray-300'
                        }`}
                      />
                    </div>
                    {/* Employee Status Toggle */}
                    <div>
                      <label
                        className={`block text-dark-soft mb-1 font-bold ${modalMode === 'edit' && !editableSections.sec4 ? 'text-gray-400' : ''}`}
                      >
                        Employee Status
                      </label>
                      <div
                        className={`inline-flex p-1 rounded-xl border ${
                          (modalMode === 'edit' && !editableSections.sec4) ||
                          !formData.is_salaried_employee
                            ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                            : 'bg-gray-100 border-gray-200'
                        }`}
                      >
                        <button
                          type="button"
                          disabled={
                            (modalMode === 'edit' && !editableSections.sec4) ||
                            !formData.is_salaried_employee
                          }
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
                          disabled={
                            (modalMode === 'edit' && !editableSections.sec4) ||
                            !formData.is_salaried_employee
                          }
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
                      Compensation History (
                      {
                        (Array.isArray(formData?.compensation_history)
                          ? formData.compensation_history
                          : []
                        ).length
                      }{' '}
                      entries)
                    </span>

                    {Array.isArray(formData?.compensation_history) &&
                      formData.compensation_history.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {formData.compensation_history.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-white p-2.5 rounded-xl border text-[11px]"
                            >
                              <div className="space-y-0.5">
                                <div className="font-bold text-dark-primary flex items-center gap-2 flex-wrap">
                                  <span>{item.date ? item.date : 'N/A'}</span>
                                  <span className="text-emerald-700 font-extrabold">
                                    +₹{item.amount || '0'} ({item.percentage || 0}%)
                                  </span>
                                  <span className="bg-emerald-100 text-emerald-950 font-black px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                                    Updated Salary: ₹
                                    {(item.updated_salary
                                      ? Number(item.updated_salary)
                                      : Number(formData.current_salary) || 0
                                    ).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                {item.notes && (
                                  <span className="text-dark-muted block text-[10px]">
                                    {item.notes}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={!formData.is_salaried_employee}
                                  onClick={() => {
                                    const revised = item.updated_salary
                                      ? Number(item.updated_salary)
                                      : Number(formData.current_salary) +
                                        (Number(item.amount) || 0);
                                    setFormData({ ...formData, current_salary: String(revised) });
                                    showToast(
                                      `Applied updated salary: ₹${revised.toLocaleString('en-IN')}`,
                                      'success'
                                    );
                                  }}
                                  className="p-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-md font-extrabold text-[10px] flex items-center gap-1 transition-all"
                                  title="Set as Current Salary"
                                >
                                  <i className="fas fa-check-circle text-xs"></i> Apply
                                </button>
                                <button
                                  type="button"
                                  disabled={!formData.is_salaried_employee}
                                  onClick={() => handleRemoveIncrementItem(idx)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Remove Increment"
                                >
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    <div className="grid grid-cols-5 gap-2 pt-1 items-end">
                      <div>
                        <label className="text-[10px] text-dark-muted block font-bold">
                          Revision Date
                        </label>
                        <input
                          type="date"
                          disabled={!formData.is_salaried_employee}
                          value={newIncrement.date}
                          onChange={(e) =>
                            setNewIncrement({ ...newIncrement, date: e.target.value })
                          }
                          className="w-full px-2 py-1 border rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block font-bold">
                          Hike (₹)
                        </label>
                        <input
                          type="number"
                          disabled={!formData.is_salaried_employee}
                          placeholder="e.g. 3000"
                          value={newIncrement.amount}
                          onChange={(e) => {
                            const amtVal = e.target.value;
                            const currentSal = Number(formData.current_salary) || 0;
                            let pctVal = newIncrement.percentage;
                            let updSal = '';
                            if (amtVal !== '') {
                              const amtNum = Number(amtVal);
                              if (currentSal > 0) {
                                pctVal = ((amtNum / currentSal) * 100).toFixed(2);
                                updSal = String(currentSal + amtNum);
                              }
                            }
                            setNewIncrement({
                              ...newIncrement,
                              amount: amtVal,
                              percentage: pctVal,
                              updated_salary: updSal,
                            });
                          }}
                          className="w-full px-2 py-1 border rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block font-bold">
                          Hike (%)
                        </label>
                        <input
                          type="number"
                          disabled={!formData.is_salaried_employee}
                          placeholder="10%"
                          value={newIncrement.percentage}
                          onChange={(e) => {
                            const pctVal = e.target.value;
                            const currentSal = Number(formData.current_salary) || 0;
                            let amtVal = newIncrement.amount;
                            let updSal = '';
                            if (pctVal !== '') {
                              const pctNum = Number(pctVal);
                              if (currentSal > 0) {
                                amtVal = String(Math.round((currentSal * pctNum) / 100));
                                updSal = String(currentSal + Number(amtVal));
                              }
                            }
                            setNewIncrement({
                              ...newIncrement,
                              percentage: pctVal,
                              amount: amtVal,
                              updated_salary: updSal,
                            });
                          }}
                          className="w-full px-2 py-1 border rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block font-bold">
                          Updated Salary (₹)
                        </label>
                        <input
                          type="number"
                          disabled={!formData.is_salaried_employee}
                          placeholder="Updated Sal"
                          value={
                            newIncrement.updated_salary ||
                            Number(formData.current_salary) + Number(newIncrement.amount || 0) ||
                            ''
                          }
                          onChange={(e) => {
                            const updVal = e.target.value;
                            const currentSal = Number(formData.current_salary) || 0;
                            let amtVal = newIncrement.amount;
                            let pctVal = newIncrement.percentage;
                            if (updVal !== '' && currentSal > 0) {
                              const diff = Number(updVal) - currentSal;
                              amtVal = String(diff);
                              pctVal = ((diff / currentSal) * 100).toFixed(2);
                            }
                            setNewIncrement({
                              ...newIncrement,
                              updated_salary: updVal,
                              amount: amtVal,
                              percentage: pctVal,
                            });
                          }}
                          className="w-full px-2 py-1 border rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border-emerald-300"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Apply Salary Icon Button */}
                        <button
                          type="button"
                          disabled={
                            !formData.is_salaried_employee ||
                            (!newIncrement.amount && !newIncrement.updated_salary)
                          }
                          onClick={() => {
                            const revised =
                              Number(newIncrement.updated_salary) ||
                              Number(formData.current_salary) + Number(newIncrement.amount || 0);
                            if (revised > 0) {
                              setFormData({ ...formData, current_salary: String(revised) });
                              showToast(
                                `Applied updated salary: ₹${revised.toLocaleString('en-IN')}`,
                                'success'
                              );
                            }
                          }}
                          className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-extrabold disabled:opacity-40 transition-all flex items-center justify-center h-8 w-8 shrink-0 shadow-xs"
                          title="Apply Updated Salary directly to Current Salary"
                        >
                          <i className="fas fa-check-double text-xs"></i>
                        </button>
                        {/* Renamed button to + */}
                        <button
                          type="button"
                          disabled={!formData.is_salaried_employee}
                          onClick={handleAddIncrementItem}
                          className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-black disabled:opacity-40 transition-all flex items-center justify-center shadow-xs"
                          title="Add to Compensation History (+)"
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                    </div>

                    {/* Revised Salary Preview & Update Button for New Increment */}
                    {Number(formData.current_salary) > 0 && Number(newIncrement.amount) > 0 && (
                      <div className="flex items-center justify-between bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 text-xs mt-2">
                        <div>
                          <span className="font-extrabold text-emerald-950">
                            Revised Salary Preview:{' '}
                            <span className="text-emerald-700 font-black">
                              ₹
                              {(
                                Number(formData.current_salary) + Number(newIncrement.amount)
                              ).toLocaleString('en-IN')}
                            </span>
                          </span>
                          <span className="text-[10px] text-emerald-800 font-semibold block">
                            (Current ₹{Number(formData.current_salary).toLocaleString('en-IN')} +
                            Hike ₹{Number(newIncrement.amount).toLocaleString('en-IN')})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const revised =
                              Number(formData.current_salary) + Number(newIncrement.amount);
                            setFormData({ ...formData, current_salary: String(revised) });
                            showToast(
                              `Updated Current Salary to ₹${revised.toLocaleString('en-IN')}`,
                              'success'
                            );
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <i className="fas fa-check-circle"></i> Set as Current Salary
                        </button>
                      </div>
                    )}
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
                          onClick={() => setFormData({ ...formData, is_teacher: true })}
                          className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                            formData.is_teacher
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          disabled={!formData.login_allowed}
                          onClick={() => setFormData({ ...formData, is_teacher: false })}
                          className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                            !formData.is_teacher
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
                          const matched =
                            selectedId && Array.isArray(authUsers)
                              ? authUsers.find((u) => u && String(u.user_id) === String(selectedId))
                              : null;
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
                        {(Array.isArray(authUsers) ? authUsers : []).map((u) => {
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
              </form>
            </div>
          </div>
        </ModalErrorBoundary>
      )}

      {/* Unsaved Changes Confirmation Modal for Record Navigation */}
      {navConfirmModal && (
        <div className="fixed inset-0 bg-dark-almostblack/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-lg shrink-0">
                <i className="fas fa-triangle-exclamation"></i>
              </div>
              <div>
                <h4 className="text-base font-black text-dark-primary">Unsaved Changes</h4>
                <p className="text-xs text-dark-muted font-semibold mt-0.5">
                  You have modified fields for <strong>{selectedEmployee?.name}</strong>. Choose how
                  to proceed before switching:
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 font-bold">
              <button
                type="button"
                onClick={async () => {
                  const targetEmp = navConfirmModal.targetEmp;
                  const success = await handleSaveEmployee(null);
                  if (success) {
                    switchRecordDirect(targetEmp);
                  }
                }}
                disabled={saving}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-floppy-disk"></i> Save & Move to{' '}
                {navConfirmModal.targetEmp?.name}
              </button>
              <button
                type="button"
                onClick={() => switchRecordDirect(navConfirmModal.targetEmp)}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs rounded-xl border border-red-200 transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-trash-arrow-up"></i> Discard & Move
              </button>
              <button
                type="button"
                onClick={() => setNavConfirmModal(null)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
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
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAutoLinkAuthAccounts}
                  disabled={saving}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
                  title="Automatically link employees to auth users by email/name"
                >
                  <i className="fas fa-link"></i>{' '}
                  {saving ? 'Linking...' : 'Auto-Link Auth Accounts'}
                </button>
                <button
                  onClick={() => {
                    setIsUserRolesModalOpen(false);
                    setEditingAuthUser(null);
                  }}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-all"
                >
                  <i className="fas fa-times text-base"></i>
                </button>
              </div>
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
                  {(Array.isArray(authUsers) ? authUsers : [])
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

      {/* Bulk Apply Increments by Date/Month Modal */}
      {isBulkApplyModalOpen && (
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-dark-primary flex items-center gap-2">
                  <i className="fas fa-calendar-check text-emerald-600"></i> Bulk Apply Increments
                  to Current Salary
                </h3>
                <p className="text-xs text-dark-muted font-semibold mt-0.5">
                  Select a target month or exact date to find matching compensation history entries
                  and update employees' Current Salary in bulk.
                </p>
              </div>
              <button
                onClick={() => setIsBulkApplyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {/* Date/Month Selection Controls */}
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-3">
              <div className="flex items-center gap-4 text-xs font-bold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="filterMode"
                    checked={bulkApplyFilterMode === 'month'}
                    onChange={() => {
                      setBulkApplyFilterMode('month');
                      const now = new Date();
                      setBulkApplyDateValue(
                        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                      );
                    }}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  Filter by Month (YYYY-MM)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="filterMode"
                    checked={bulkApplyFilterMode === 'date'}
                    onChange={() => {
                      setBulkApplyFilterMode('date');
                      const now = new Date();
                      setBulkApplyDateValue(now.toISOString().split('T')[0]);
                    }}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  Filter by Specific Date (YYYY-MM-DD)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-extrabold text-emerald-950 shrink-0">
                  Target {bulkApplyFilterMode === 'month' ? 'Effective Month' : 'Effective Date'}:
                </label>
                <input
                  type={bulkApplyFilterMode === 'month' ? 'month' : 'date'}
                  value={bulkApplyDateValue}
                  onChange={(e) => setBulkApplyDateValue(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-extrabold text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* Matching Preview List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-dark-primary">
                <span>
                  Matching Employees ({matchingBulkIncrements.length} found,{' '}
                  {selectedBulkEmpIds.length} selected):
                </span>
              </div>

              {matchingBulkIncrements.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed text-xs text-dark-muted font-semibold">
                  <i className="fas fa-calendar-xmark text-2xl text-gray-300 mb-2 block"></i>
                  No employees found with compensation history entry matching "{bulkApplyDateValue}
                  ".
                </div>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-emerald-50 border-b text-[10px] uppercase tracking-wider text-emerald-950 font-bold">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              matchingBulkIncrements.length > 0 &&
                              selectedBulkEmpIds.length === matchingBulkIncrements.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBulkEmpIds(
                                  matchingBulkIncrements.map((item) => String(item.emp.id))
                                );
                              } else {
                                setSelectedBulkEmpIds([]);
                              }
                            }}
                            className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            title="Select All / Deselect All"
                          />
                        </th>
                        <th className="p-2.5">Employee</th>
                        <th className="p-2.5">Revision Date</th>
                        <th className="p-2.5">Hike Amount</th>
                        <th className="p-2.5">Current Salary</th>
                        <th className="p-2.5">Proposed Salary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold">
                      {matchingBulkIncrements.map((item, idx) => {
                        const isChecked = selectedBulkEmpIds.includes(String(item.emp.id));
                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-emerald-50/30 ${isChecked ? 'bg-emerald-50/20' : 'opacity-60'}`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const empIdStr = String(item.emp.id);
                                  if (e.target.checked) {
                                    setSelectedBulkEmpIds((prev) => [...prev, empIdStr]);
                                  } else {
                                    setSelectedBulkEmpIds((prev) =>
                                      prev.filter((id) => id !== empIdStr)
                                    );
                                  }
                                }}
                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-2.5">
                              <div className="font-extrabold text-dark-primary">
                                {item.emp.name}
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono">
                                {item.emp.emp_id || `ID: ${item.emp.id}`}
                              </div>
                            </td>
                            <td className="p-2.5 font-mono">{item.matchingEntry.date || 'N/A'}</td>
                            <td className="p-2.5 text-emerald-700 font-bold">
                              +₹{(Number(item.matchingEntry.amount) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-gray-600">
                              ₹{(Number(item.currentSalary) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 font-extrabold text-emerald-800">
                              ₹{item.proposedSalary.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsBulkApplyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-light-ui text-dark-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedBulkEmpIds.length === 0 || saving}
                onClick={handleExecuteBulkApplyIncrements}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <i className="fas fa-check-double"></i>
                {saving
                  ? 'Updating Salaries...'
                  : `Apply to ${selectedBulkEmpIds.length} Selected Employees`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Top-Level View Error Boundary to isolate component exceptions and display friendly fallback
class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('EmployeeRecordsView Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-4xl mx-auto my-8 bg-white rounded-3xl border border-red-200 shadow-xl space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl">
            <i className="fas fa-bug"></i>
          </div>
          <h3 className="text-lg font-black text-dark-primary">
            Something went wrong in Employee Records
          </h3>
          <p className="text-xs text-dark-muted font-bold">
            An unexpected error occurred while rendering the view:
          </p>
          <div className="p-3 bg-red-50 text-red-800 text-xs font-mono rounded-xl border border-red-200 text-left overflow-x-auto max-h-40">
            {this.state.error?.toString()}
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-extrabold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
          >
            <i className="fas fa-rotate"></i> Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SafeEmployeeRecordsView = (props) => (
  <ViewErrorBoundary>
    <EmployeeRecordsView {...props} />
  </ViewErrorBoundary>
);

export default SafeEmployeeRecordsView;
