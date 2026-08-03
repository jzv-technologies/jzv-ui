import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';
import * as XLSX from 'xlsx';

import MultiSelectRolesDropdown from './employee-records/MultiSelectRolesDropdown';
import ModalErrorBoundary from './employee-records/ModalErrorBoundary';
import EmployeeRecordsTable from './employee-records/EmployeeRecordsTable';
import EmployeeSelfProfileCard from './employee-records/EmployeeSelfProfileCard';
import EmployeeEditModal from './employee-records/EmployeeEditModal';
import BulkImportModal from './employee-records/BulkImportModal';
import UserRolesManagementModal from './employee-records/UserRolesManagementModal';
import BulkIncrementApplyModal from './employee-records/BulkIncrementApplyModal';
import ConfirmModal from '../../../ConfirmModal';

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
  const [sortField, setSortField] = useState('emp_id');
  const [sortOrder, setSortOrder] = useState('asc');

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

  // Bulk Apply Increments State
  const [isBulkApplyModalOpen, setIsBulkApplyModalOpen] = useState(false);
  const [bulkApplyFilterMode, setBulkApplyFilterMode] = useState('month');
  const [bulkApplyDateValue, setBulkApplyDateValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedBulkEmpIds, setSelectedBulkEmpIds] = useState([]);

  // Section Editability
  const [editableSections, setEditableSections] = useState({
    sec1: false,
    sec2: false,
    sec3: false,
    sec4: false,
    sec5: true,
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [navConfirmModal, setNavConfirmModal] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

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

  // Form State
  const [formData, setFormData] = useState({
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
    emp_id: '',
    organization: 'Jamia Zaytoonah',
    designation: 'Teacher',
    joining_date: '',
    is_salaried_employee: true,
    current_salary: '',
    compensation_history: [],
    is_teacher: true,
    is_active: true,
    login_allowed: false,
    auth_id: '',
    mapped_roles_sum: '8',
  });

  const [newIncrement, setNewIncrement] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    percentage: '',
    updated_salary: '',
    notes: '',
  });

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      if (isEmployeeSelf) {
        // Security-first: do not send user-identifying query params from client.
        // Backend should resolve current user from auth context (auth.uid()).
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_current_teacher_details'
        );

        if (rpcError) {
          console.warn('Supabase get_current_teacher_details RPC error:', rpcError.message);
        }

        const selfList = Array.isArray(rpcData) ? rpcData : rpcData ? [rpcData] : [];
        if (selfList.length > 0) {
          setEmployees(selfList);
          localStorage.setItem('jzv_employees_local_data', JSON.stringify(selfList));
        } else if (teacherRecord) {
          setEmployees([teacherRecord]);
        } else {
          setEmployees([]);
        }

        setAuthUsers([]);
        return;
      }

      const { data, error } = await supabase.from('employees').select('*');
      if (error) {
        console.warn(
          'Supabase fetch employees error (using local storage fallback):',
          error.message
        );
        const localData = localStorage.getItem('jzv_employees_local_data');
        if (localData) {
          try {
            setEmployees(JSON.parse(localData));
          } catch (e) {}
        }
      } else if (data) {
        setEmployees(data);
        localStorage.setItem('jzv_employees_local_data', JSON.stringify(data));
      }

      // Fetch Auth Users & Roles via secure RPC bound to authenticated user context.
      let usersList = [];
      try {
        const { data: authData, error: authErr } = await supabase.rpc(
          'get_auth_users_with_roles_secure',
          {
            p_auth_id: user?.id || null,
          }
        );
        if (!authErr && Array.isArray(authData) && authData.length > 0) {
          usersList = authData;
        }
      } catch (e) {
        console.warn('get_auth_users_with_roles_secure RPC failed:', e);
      }

      // Offline / Local state fallback if usersList is still empty
      if (usersList.length === 0) {
        const localEmpsRaw = localStorage.getItem('jzv_employees_local_data');
        if (localEmpsRaw) {
          try {
            const localEmps = JSON.parse(localEmpsRaw);
            const constructedMap = new Map();
            localEmps.forEach((e) => {
              if (e.auth_id || e.email) {
                const uid = e.auth_id || `local_user_${e.id}`;
                constructedMap.set(uid, {
                  user_id: uid,
                  email:
                    e.email ||
                    `${(e.name || 'user').toLowerCase().replace(/\s+/g, '')}@zaytoonah.in`,
                  full_name: e.name,
                  role: Number(e.mapped_roles_sum) || 8,
                });
              }
            });
            usersList = Array.from(constructedMap.values());
          } catch (e) {}
        }
      }

      setAuthUsers(usersList);
    } catch (err) {
      console.error('Error fetching employees or auth users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Mapped Auth User Map
  const mappedAuthUserMap = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      if (emp.auth_id) {
        map.set(String(emp.auth_id), {
          emp_id: emp.id,
          emp_code: emp.emp_id || `EMP-${emp.id}`,
          emp_name: emp.name,
        });
      }
    });
    return map;
  }, [employees]);

  // Current Self Employee
  const currentSelfEmployee = useMemo(() => {
    if (!isEmployeeSelf) return null;
    if (teacherRecord) return teacherRecord;
    if (user?.id) {
      const match = employees.find((e) => String(e.auth_id) === String(user.id));
      if (match) return match;
    }
    if (user?.email) {
      const match = employees.find(
        (e) => e.email && e.email.toLowerCase() === user.email.toLowerCase()
      );
      if (match) return match;
    }
    return employees[0] || null;
  }, [isEmployeeSelf, teacherRecord, user, employees]);

  // Filtered & Sorted Employees
  const filteredEmployees = useMemo(() => {
    let list = [...employees];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          (e.name || '').toLowerCase().includes(q) ||
          (e.emp_id || '').toLowerCase().includes(q) ||
          (e.primary_mobile || '').toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q) ||
          (e.designation || '').toLowerCase().includes(q) ||
          (e.organization || '').toLowerCase().includes(q)
      );
    }

    if (roleFilter) {
      list = list.filter((e) => (e.designation || e.role) === roleFilter);
    }

    if (statusFilter === 'active') {
      list = list.filter((e) => e.is_active !== false);
    } else if (statusFilter === 'inactive') {
      list = list.filter((e) => e.is_active === false);
    }

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [employees, searchQuery, roleFilter, statusFilter, sortField, sortOrder]);

  const currentIndex = useMemo(() => {
    if (!selectedEmployee) return -1;
    return filteredEmployees.findIndex((e) => String(e.id) === String(selectedEmployee.id));
  }, [filteredEmployees, selectedEmployee]);

  // Open Add / Edit Modal
  const handleOpenModal = (mode, emp = null) => {
    setModalMode(mode);
    setSelectedEmployee(emp);

    if (mode === 'add') {
      setEditableSections({ sec1: true, sec2: true, sec3: true, sec4: true, sec5: true });
      const nextData = {
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
        emp_id: `EMP-${100 + employees.length + 1}`,
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
      };
      setFormData(nextData);
      setInitialFormData(nextData);
    } else {
      const targetEmp = emp || currentSelfEmployee;
      setEditableSections({ sec1: false, sec2: false, sec3: false, sec4: false, sec5: true });
      if (targetEmp) {
        const nextData = {
          name: targetEmp.name || '',
          father_husband_name: targetEmp.father_husband_name || '',
          is_male: targetEmp.is_male !== false,
          date_of_birth: targetEmp.date_of_birth || '',
          blood_group: targetEmp.blood_group || '',
          marital_status: targetEmp.marital_status || 'Single',
          highest_education: targetEmp.highest_education || '',
          primary_mobile: targetEmp.primary_mobile || '',
          secondary_mobile: targetEmp.secondary_mobile || '',
          email: targetEmp.email || '',
          communication_address: targetEmp.communication_address || '',
          bank_account_name: targetEmp.bank_account_name || '',
          bank_account_number: targetEmp.bank_account_number || '',
          bank_ifsc_code: targetEmp.bank_ifsc_code || '',
          bank_name: targetEmp.bank_name || '',
          bank_branch_name: targetEmp.bank_branch_name || '',
          emergency_contact_1: targetEmp.emergency_contact_1 || {
            name: '',
            relation: '',
            phone: '',
            address: '',
          },
          emergency_contact_2: targetEmp.emergency_contact_2 || {
            name: '',
            relation: '',
            phone: '',
            address: '',
          },
          emp_id: targetEmp.emp_id || `EMP-${targetEmp.id}`,
          organization: targetEmp.organization || 'Jamia Zaytoonah',
          designation: targetEmp.designation || targetEmp.role || 'Teacher',
          joining_date: targetEmp.joining_date || '',
          is_salaried_employee: targetEmp.is_salaried_employee !== false,
          current_salary: targetEmp.current_salary ? String(targetEmp.current_salary) : '',
          compensation_history: Array.isArray(targetEmp.compensation_history)
            ? targetEmp.compensation_history
            : [],
          is_teacher: targetEmp.is_teacher !== false,
          is_active: targetEmp.is_active !== false,
          login_allowed: targetEmp.login_allowed || false,
          auth_id: targetEmp.auth_id || '',
          mapped_roles_sum: String(targetEmp.mapped_roles_sum || '8'),
        };
        setFormData(nextData);
        setInitialFormData(nextData);
      }
    }
  };

  const isFormDirty = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const switchRecordDirect = (targetEmp) => {
    setSelectedEmployee(targetEmp);
    setEditableSections({ sec1: false, sec2: false, sec3: false, sec4: false, sec5: true });
    const nextData = {
      name: targetEmp.name || '',
      father_husband_name: targetEmp.father_husband_name || '',
      is_male: targetEmp.is_male !== false,
      date_of_birth: targetEmp.date_of_birth || '',
      blood_group: targetEmp.blood_group || '',
      marital_status: targetEmp.marital_status || 'Single',
      highest_education: targetEmp.highest_education || '',
      primary_mobile: targetEmp.primary_mobile || '',
      secondary_mobile: targetEmp.secondary_mobile || '',
      email: targetEmp.email || '',
      communication_address: targetEmp.communication_address || '',
      bank_account_name: targetEmp.bank_account_name || '',
      bank_account_number: targetEmp.bank_account_number || '',
      bank_ifsc_code: targetEmp.bank_ifsc_code || '',
      bank_name: targetEmp.bank_name || '',
      bank_branch_name: targetEmp.bank_branch_name || '',
      emergency_contact_1: targetEmp.emergency_contact_1 || {
        name: '',
        relation: '',
        phone: '',
        address: '',
      },
      emergency_contact_2: targetEmp.emergency_contact_2 || {
        name: '',
        relation: '',
        phone: '',
        address: '',
      },
      emp_id: targetEmp.emp_id || `EMP-${targetEmp.id}`,
      organization: targetEmp.organization || 'Jamia Zaytoonah',
      designation: targetEmp.designation || targetEmp.role || 'Teacher',
      joining_date: targetEmp.joining_date || '',
      is_salaried_employee: targetEmp.is_salaried_employee !== false,
      current_salary: targetEmp.current_salary ? String(targetEmp.current_salary) : '',
      compensation_history: Array.isArray(targetEmp.compensation_history)
        ? targetEmp.compensation_history
        : [],
      is_teacher: targetEmp.is_teacher !== false,
      is_active: targetEmp.is_active !== false,
      login_allowed: targetEmp.login_allowed || false,
      auth_id: targetEmp.auth_id || '',
      mapped_roles_sum: String(targetEmp.mapped_roles_sum || '8'),
    };
    setFormData(nextData);
    setInitialFormData(nextData);
    setNavConfirmModal(null);
  };

  const handleNavigateRecord = (newIdx) => {
    if (newIdx < 0 || newIdx >= filteredEmployees.length) return;
    const targetEmp = filteredEmployees[newIdx];
    if (!targetEmp) return;

    if (isFormDirty) {
      setNavConfirmModal({ targetEmp });
    } else {
      switchRecordDirect(targetEmp);
    }
  };

  const normalizeDateToISO = (val) => {
    if (!val) return null;
    const str = String(val).trim();
    if (!str) return null;

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = ddmmyyyyMatch[1].padStart(2, '0');
      const month = ddmmyyyyMatch[2].padStart(2, '0');
      const year = ddmmyyyyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // YYYY/MM/DD or YYYY.MM.DD
    const yyyymmddMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (yyyymmddMatch) {
      const year = yyyymmddMatch[1];
      const month = yyyymmddMatch[2].padStart(2, '0');
      const day = yyyymmddMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Try JS Date parsing fallback
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return null;
  };

  const buildTeacherPayload = (data) => ({
    name: data.name,
    father_husband_name: data.father_husband_name || null,
    is_male: data.is_male !== false,
    date_of_birth: normalizeDateToISO(data.date_of_birth),
    blood_group: data.blood_group || null,
    marital_status: data.marital_status || null,
    highest_education: data.highest_education || null,
    primary_mobile: data.primary_mobile || null,
    secondary_mobile: data.secondary_mobile || null,
    email: data.email || null,
    communication_address: data.communication_address || null,
    bank_account_name: data.bank_account_name || null,
    bank_account_number: data.bank_account_number || null,
    bank_ifsc_code: data.bank_ifsc_code || null,
    bank_name: data.bank_name || null,
    bank_branch_name: data.bank_branch_name || null,
    emergency_contact_1: data.emergency_contact_1 || {},
    emergency_contact_2: data.emergency_contact_2 || {},
    emp_id: data.is_salaried_employee ? data.emp_id || null : null,
    organization: data.organization || 'Jamia Zaytoonah',
    designation: data.designation || 'Teacher',
    joining_date: normalizeDateToISO(data.joining_date),
    is_salaried_employee: data.is_salaried_employee !== false,
    current_salary: data.is_salaried_employee ? Number(data.current_salary) || 0 : 0,
    compensation_history: Array.isArray(data.compensation_history) ? data.compensation_history : [],
    is_teacher: data.is_teacher !== false,
    is_active: data.is_active !== false,
    login_allowed: data.login_allowed === true,
    auth_id: data.auth_id || null,
  });

  const buildEmployeePayload = buildTeacherPayload;

  const getChangedFields = (oldObj, newObj) => {
    if (!oldObj) return ['record_created'];
    const fields = [];
    const checkKeys = [
      'name',
      'emp_id',
      'designation',
      'organization',
      'current_salary',
      'is_salaried_employee',
      'is_active',
      'primary_mobile',
      'email',
      'auth_id',
    ];
    checkKeys.forEach((key) => {
      if (String(oldObj[key] ?? '') !== String(newObj[key] ?? '')) {
        fields.push(key);
      }
    });
    return fields;
  };

  const handleSaveEmployee = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Employee Full Name is required', 'error');
      return false;
    }

    if (formData.is_salaried_employee) {
      if (!formData.emp_id.trim()) {
        showToast('Employee ID is required for salaried employees', 'error');
        return false;
      }
      if (!formData.current_salary || Number(formData.current_salary) <= 0) {
        showToast('Current Monthly Salary is required for salaried employees', 'error');
        return false;
      }
    }

    setSaving(true);
    try {
      const currentUserEmail = user?.email || 'Admin';
      const teacherPayload = buildTeacherPayload(formData);
      const employeePayload = buildEmployeePayload(formData);

      if (modalMode === 'add') {
        teacherPayload.update_history = [
          {
            timestamp: new Date().toISOString(),
            updated_by: currentUserEmail,
            fields_changed: ['record_created'],
          },
        ];

        const { data: eData, error: eErr } = await supabase
          .from('employees')
          .insert([teacherPayload])
          .select();

        if (eErr) {
          console.warn(
            'Supabase insert employee error (using local state fallback):',
            eErr.message
          );
          const localNew = { ...teacherPayload, id: Date.now() };
          const updatedList = [localNew, ...employees];
          setEmployees(updatedList);
          localStorage.setItem('jzv_employees_local_data', JSON.stringify(updatedList));
        } else if (eData?.[0]) {
          const updatedList = [eData[0], ...employees];
          setEmployees(updatedList);
          localStorage.setItem('jzv_employees_local_data', JSON.stringify(updatedList));
        }

        if (formData.auth_id && formData.mapped_roles_sum) {
          await supabase.rpc('update_user_role_admin', {
            p_user_id: formData.auth_id,
            p_role: parseInt(formData.mapped_roles_sum, 10) || 1,
          });
        }

        showToast('New employee record created successfully!', 'success');
      } else {
        const targetId = selectedEmployee?.id || currentSelfEmployee?.id;
        const existingRec = employees.find((e) => String(e.id) === String(targetId));
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

        const { data: eData, error: eErr } = await supabase
          .from('employees')
          .update(teacherPayload)
          .eq('id', targetId)
          .select();

        if (eErr) {
          console.warn(
            'Supabase update employee error (using local state fallback):',
            eErr.message
          );
          const updatedList = employees.map((e) =>
            String(e.id) === String(targetId) ? { ...e, ...teacherPayload } : e
          );
          setEmployees(updatedList);
          localStorage.setItem('jzv_employees_local_data', JSON.stringify(updatedList));
        } else if (eData?.[0]) {
          const updatedList = employees.map((e) =>
            String(e.id) === String(targetId) ? eData[0] : e
          );
          setEmployees(updatedList);
          localStorage.setItem('jzv_employees_local_data', JSON.stringify(updatedList));
        }

        if (formData.auth_id && formData.mapped_roles_sum) {
          await supabase.rpc('update_user_role_admin', {
            p_user_id: formData.auth_id,
            p_role: parseInt(formData.mapped_roles_sum, 10) || 1,
          });
        }

        showToast('Employee record updated successfully!', 'success');
      }

      setInitialFormData({ ...formData });
      setModalMode(null);
      await fetchEmployees();
      return true;
    } catch (err) {
      console.error('Error saving employee:', err);
      showToast('Error saving record: ' + err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = (emp) => {
    if (!isAdmin && !isManagement) {
      showToast('Only Admin or Management can delete employee records', 'error');
      return;
    }
    setEmployeeToDelete(emp);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    const emp = employeeToDelete;
    setEmployeeToDelete(null);

    setSaving(true);
    try {
      const { error } = await supabase.from('employees').delete().eq('id', emp.id);
      if (error) {
        console.warn('Supabase delete employee error (using local state fallback):', error.message);
        const updatedList = employees.filter((e) => String(e.id) !== String(emp.id));
        setEmployees(updatedList);
        localStorage.setItem('jzv_employees_local_data', JSON.stringify(updatedList));
      } else {
        const updatedList = employees.filter((e) => String(e.id) !== String(emp.id));
        setEmployees(updatedList);
        localStorage.setItem('jzv_employees_local_data', JSON.stringify(updatedList));
      }

      showToast(`Employee "${emp.name}" deleted successfully!`, 'success');
      await fetchEmployees();
    } catch (err) {
      console.error('Error deleting employee:', err);
      showToast('Error deleting employee: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddIncrementItem = () => {
    if (!newIncrement.amount && !newIncrement.updated_salary) {
      showToast('Please enter increment hike amount (₹) or updated salary amount', 'error');
      return;
    }
    const list = Array.isArray(formData.compensation_history)
      ? [...formData.compensation_history]
      : [];
    const itemToAdd = {
      date: newIncrement.date || new Date().toISOString().split('T')[0],
      amount: newIncrement.amount || '0',
      percentage: newIncrement.percentage || '0',
      updated_salary: newIncrement.updated_salary || '',
      notes: newIncrement.notes || '',
    };
    list.push(itemToAdd);
    setFormData({ ...formData, compensation_history: list });
    setNewIncrement({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      percentage: '',
      updated_salary: '',
      notes: '',
    });
    showToast('Increment entry added to compensation history!', 'success');
  };

  const handleRemoveIncrementItem = (idx) => {
    const list = [...(formData.compensation_history || [])];
    list.splice(idx, 1);
    setFormData({ ...formData, compensation_history: list });
  };

  const handleExportEmployeesExcel = () => {
    const exportData = filteredEmployees.map((e) => ({
      'Employee ID': e.emp_id || `EMP-${e.id}`,
      Name: e.name,
      'Father/Husband Name': e.father_husband_name || '',
      Gender: e.is_male !== false ? 'Male' : 'Female',
      'Date of Birth': e.date_of_birth || '',
      'Blood Group': e.blood_group || '',
      'Marital Status': e.marital_status || '',
      'Highest Education': e.highest_education || '',
      Designation: e.designation || e.role || 'Teacher',
      Organization: e.organization || 'Jamia Zaytoonah',
      'Joining Date': e.joining_date || '',
      'Is Salaried': e.is_salaried_employee !== false ? 'YES' : 'NO',
      'Current Salary': e.current_salary || 0,
      'Primary Mobile': e.primary_mobile || '',
      'Secondary Mobile': e.secondary_mobile || '',
      Email: e.email || '',
      'Communication Address': e.communication_address || '',
      'Bank Account Name': e.bank_account_name || '',
      'Bank Account Number': e.bank_account_number || '',
      'Bank IFSC Code': e.bank_ifsc_code || '',
      'Bank Name': e.bank_name || '',
      'Bank Branch': e.bank_branch_name || '',
      Status: e.is_active !== false ? 'Active' : 'Inactive',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, `Employee_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Employee records exported to Excel successfully!', 'success');
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json(ws);

        const parsedRows = rawRows.map((row, idx) => {
          const rawEmpId = row['Employee ID'] || row['emp_id'] || row['Emp ID'];
          const rawId = row['ID'] || row['id'];
          const rawName = row['Name'] || row['name'];

          let matchedExisting = null;
          if (rawEmpId) {
            matchedExisting = employees.find(
              (e) => String(e.emp_id).toLowerCase() === String(rawEmpId).toLowerCase()
            );
          }
          if (!matchedExisting && rawId) {
            matchedExisting = employees.find((e) => String(e.id) === String(rawId));
          }
          if (!matchedExisting && rawName) {
            matchedExisting = employees.find(
              (e) => String(e.name).toLowerCase() === String(rawName).toLowerCase()
            );
          }

          let ec1 = { name: '', relation: '', phone: '', address: '' };
          let ec2 = { name: '', relation: '', phone: '', address: '' };
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

  const handleSaveUserRoleDirect = async (targetUserId, newRoleSum, targetEmpId) => {
    setSaving(true);
    try {
      const sumNum = parseInt(newRoleSum, 10) || 8;
      const { error: rpcErr } = await supabase.rpc('update_user_role_admin', {
        p_user_id: targetUserId,
        p_role: sumNum,
      });

      if (rpcErr) {
        console.warn('RPC update_user_role_admin error:', rpcErr.message);
      }

      const prevEmpLinked = employees.find((e) => String(e.auth_id) === String(targetUserId));
      if (prevEmpLinked && String(prevEmpLinked.id) !== String(targetEmpId)) {
        await supabase.from('employees').update({ auth_id: null }).eq('id', prevEmpLinked.id);
      }

      if (targetEmpId) {
        await supabase
          .from('employees')
          .update({
            auth_id: targetUserId,
            login_allowed: true,
            mapped_roles_sum: sumNum,
          })
          .eq('id', targetEmpId);
      }

      setAuthUsers((prev) =>
        prev.map((u) => (String(u.user_id) === String(targetUserId) ? { ...u, role: sumNum } : u))
      );

      setEditingAuthUser(null);
      await fetchEmployees();
      showToast('Portal User role permissions updated successfully!', 'success');
    } catch (err) {
      console.error('Error saving user role:', err);
      showToast('Error updating role: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoLinkAuthAccounts = async () => {
    setSaving(true);
    try {
      let linkedCount = 0;
      for (const emp of employees) {
        if (!emp.auth_id && (emp.email || emp.name)) {
          const matchedAuth = authUsers.find((u) => {
            if (emp.email && u.email && emp.email.toLowerCase() === u.email.toLowerCase()) {
              return true;
            }
            if (
              emp.name &&
              u.full_name &&
              emp.name.toLowerCase().trim() === u.full_name.toLowerCase().trim()
            ) {
              return true;
            }
            return false;
          });

          if (matchedAuth) {
            await supabase
              .from('employees')
              .update({ auth_id: matchedAuth.user_id, login_allowed: true })
              .eq('id', emp.id);
            linkedCount++;
          }
        }
      }

      await fetchEmployees();
      showToast(
        linkedCount > 0
          ? `Auto-linked ${linkedCount} employee account(s) to auth users!`
          : 'No unlinked matching auth users found.',
        linkedCount > 0 ? 'success' : 'info'
      );
    } catch (err) {
      showToast('Auto-link error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const matchingBulkIncrements = useMemo(() => {
    if (!bulkApplyDateValue) return [];

    const matches = [];
    employees.forEach((emp) => {
      if (emp.is_salaried_employee !== false && Array.isArray(emp.compensation_history)) {
        emp.compensation_history.forEach((h) => {
          if (!h.date) return;

          let isMatch = false;
          if (bulkApplyFilterMode === 'month') {
            isMatch = h.date.startsWith(bulkApplyDateValue);
          } else {
            isMatch = h.date === bulkApplyDateValue;
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
      await fetchEmployees();
    } catch (err) {
      showToast('Bulk update error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Render Employee Personal Info Card for self mode
  if (isEmployeeSelf) {
    return (
      <>
        <EmployeeSelfProfileCard
          currentSelfEmployee={currentSelfEmployee}
          user={user}
          handleOpenModal={handleOpenModal}
        />
        <EmployeeEditModal
          modalMode={modalMode}
          setModalMode={setModalMode}
          formData={formData}
          setFormData={setFormData}
          selectedEmployee={selectedEmployee}
          currentSelfEmployee={currentSelfEmployee}
          filteredEmployees={filteredEmployees}
          currentIndex={currentIndex}
          handleNavigateRecord={handleNavigateRecord}
          handleSaveEmployee={handleSaveEmployee}
          saving={saving}
          editableSections={editableSections}
          setEditableSections={setEditableSections}
          newIncrement={newIncrement}
          setNewIncrement={setNewIncrement}
          handleAddIncrementItem={handleAddIncrementItem}
          handleRemoveIncrementItem={handleRemoveIncrementItem}
          authUsers={authUsers}
          mappedAuthUserMap={mappedAuthUserMap}
          navConfirmModal={navConfirmModal}
          setNavConfirmModal={setNavConfirmModal}
          switchRecordDirect={switchRecordDirect}
          showToast={showToast}
        />
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
              onClick={fetchEmployees}
              disabled={loading}
              className="w-10 h-10 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-bold border border-gray-200 transition-all flex items-center justify-center shadow-sm active:scale-95 shrink-0"
              title="Refresh Employee Records"
            >
              <i
                className={`fas fa-rotate-right ${
                  loading ? 'fa-spin text-brand-primary' : 'text-gray-600'
                } text-base`}
              ></i>
            </button>
            <button
              onClick={handleExportEmployeesExcel}
              className="w-10 h-10 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-bold border border-blue-200 transition-all flex items-center justify-center shadow-sm active:scale-95 shrink-0"
              title="Download"
            >
              <i className="fas fa-download text-blue-600 text-base"></i>
            </button>

            {(isAdmin || isManagement) && (
              <>
                <button
                  onClick={() => setIsUserRolesModalOpen(true)}
                  className="w-10 h-10 bg-purple-50 text-purple-800 hover:bg-purple-100 rounded-xl text-sm font-bold border border-purple-200 transition-all flex items-center justify-center shadow-sm active:scale-95 shrink-0"
                  title="Manage Portal User Roles"
                >
                  <i className="fas fa-link text-purple-600 text-base"></i>
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
      <EmployeeRecordsTable
        filteredEmployees={filteredEmployees}
        loading={loading}
        sortField={sortField}
        sortOrder={sortOrder}
        handleSort={handleSort}
        handleOpenModal={handleOpenModal}
        handleDeleteEmployee={handleDeleteEmployee}
        isAdmin={isAdmin}
        isManagement={isManagement}
        authUsers={authUsers}
      />

      {/* Add / Edit Employee Modal */}
      <EmployeeEditModal
        modalMode={modalMode}
        setModalMode={setModalMode}
        formData={formData}
        setFormData={setFormData}
        selectedEmployee={selectedEmployee}
        currentSelfEmployee={currentSelfEmployee}
        filteredEmployees={filteredEmployees}
        currentIndex={currentIndex}
        handleNavigateRecord={handleNavigateRecord}
        handleSaveEmployee={handleSaveEmployee}
        saving={saving}
        editableSections={editableSections}
        setEditableSections={setEditableSections}
        newIncrement={newIncrement}
        setNewIncrement={setNewIncrement}
        handleAddIncrementItem={handleAddIncrementItem}
        handleRemoveIncrementItem={handleRemoveIncrementItem}
        authUsers={authUsers}
        mappedAuthUserMap={mappedAuthUserMap}
        navConfirmModal={navConfirmModal}
        setNavConfirmModal={setNavConfirmModal}
        switchRecordDirect={switchRecordDirect}
        showToast={showToast}
      />

      {/* User Roles Management Modal */}
      <UserRolesManagementModal
        isUserRolesModalOpen={isUserRolesModalOpen}
        setIsUserRolesModalOpen={setIsUserRolesModalOpen}
        handleAutoLinkAuthAccounts={handleAutoLinkAuthAccounts}
        userRolesSearch={userRolesSearch}
        setUserRolesSearch={setUserRolesSearch}
        authUsers={authUsers}
        mappedAuthUserMap={mappedAuthUserMap}
        editingAuthUser={editingAuthUser}
        setEditingAuthUser={setEditingAuthUser}
        editingRoleSum={editingRoleSum}
        setEditingRoleSum={setEditingRoleSum}
        editingEmpId={editingEmpId}
        setEditingEmpId={setEditingEmpId}
        employees={employees}
        handleSaveUserRoleDirect={handleSaveUserRoleDirect}
        saving={saving}
      />

      {/* Bulk CSV Import Modal */}
      <BulkImportModal
        isCsvImportOpen={isCsvImportOpen}
        setIsCsvImportOpen={setIsCsvImportOpen}
        handleCsvFileChange={handleCsvFileChange}
        csvPreviewRows={csvPreviewRows}
        setCsvPreviewRows={setCsvPreviewRows}
        handleBulkImportSubmit={handleBulkImportSubmit}
        saving={saving}
      />

      {/* Bulk Increment Apply Modal */}
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

      {/* Delete Employee Confirmation Modal */}
      <ConfirmModal
        isOpen={!!employeeToDelete}
        title="Delete Employee Record"
        message={`Are you sure you want to delete employee record "${employeeToDelete?.name}"? This action cannot be undone.`}
        type="danger"
        confirmText="Delete Record"
        onConfirm={confirmDeleteEmployee}
        onCancel={() => setEmployeeToDelete(null)}
      />
    </div>
  );
};

// Top-Level View Error Boundary
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
