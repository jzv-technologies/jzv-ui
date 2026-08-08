// src/components/portals/admin/AdminStudentsView.jsx
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';
import { calculateAge } from '../../../utils/dateUtils';
import DataGrid from '../../DataGrid';
import ConfirmModal from '../../ConfirmModal';
import StudentFeesView from './students/StudentFeesView';

const STUDENTS_STORAGE_KEY = 'jzv_students_local_data';
const TIMETABLE_STORAGE_KEY = 'jzv_timetable_local_data';

const AdminStudentsView = () => {
  const [activeTab, setActiveTab] = useState('records'); // "records" | "fees"
  const [feesControls, setFeesControls] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [recordsSearchQuery, setRecordsSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null); // null if adding
  const [formData, setFormData] = useState({
    admission_no: '',
    edsoft_id: '',
    student_name: '',
    birth_date: '',
    age: '',
    gender: 'Male',
    father_name: '',
    class_id: '',
    mobile1: '',
    mobile2: '',
    enrollment: 'Active',
    hostel: 'No',
    transport_point: '',
  });

  // Load classes from Supabase or LocalStorage
  const loadClasses = async () => {
    try {
      const { data, error: dbErr } = await supabase.from('classes').select('*');
      if (!dbErr && data) {
        setClasses(data);
        return data;
      }
    } catch (e) {
      console.warn('Failed to fetch classes from DB:', e);
    }

    // Fallback to local storage classes
    try {
      const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const localCls = parsed.classes || [];
        setClasses(localCls);
        return localCls;
      }
    } catch (e) {
      console.error('Error reading local classes:', e);
    }
    return [];
  };

  // Load students from Supabase or LocalStorage
  const loadStudents = async (loadedClasses = []) => {
    setLoading(true);
    setError('');
    try {
      const { data, error: dbErr } = await supabase.from('students').select('*');
      if (dbErr) throw dbErr;

      setStudents(data || []);
      setIsSupabaseMode(true);
    } catch (e) {
      console.warn(
        'Supabase students table not available, falling back to LocalStorage:',
        e.message
      );
      setIsSupabaseMode(false);

      const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setStudents(parsed || []);
        } catch (err) {
          console.error('Error parsing local students data:', err);
          setStudents(DEFAULT_MOCK_STUDENTS);
          localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_STUDENTS));
        }
      } else {
        // Seed first-time local storage with mock data
        let seedData = [...DEFAULT_MOCK_STUDENTS];
        // Attempt to match mock classes with loaded class IDs if available
        if (loadedClasses.length > 0) {
          seedData = seedData.map((std, idx) => ({
            ...std,
            class_id: loadedClasses[idx % loadedClasses.length]?.id || std.class_id,
          }));
        }
        setStudents(seedData);
        localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(seedData));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const loadedClasses = await loadClasses();
      await loadStudents(loadedClasses);
    };
    init();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Sync state & save locally/remotely
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!formData.admission_no.trim() || !formData.student_name.trim()) {
      showToast('Admission Number and Student Name are required.', 'error');
      return;
    }

    setLoading(true);
    const calculatedAgeVal = calculateAge(formData.birth_date);
    const savePayload = {
      ...formData,
      age: calculatedAgeVal ? parseFloat(calculatedAgeVal) : null,
      class_id: formData.class_id || null,
    };

    if (isSupabaseMode) {
      try {
        const { age, gender, ...dbPayload } = savePayload;
        if (editingStudent) {
          // Update
          const { error: dbErr } = await supabase
            .from('students')
            .update(dbPayload)
            .eq('id', editingStudent.id);
          if (dbErr) throw dbErr;
        } else {
          // Insert
          const { error: dbErr } = await supabase.from('students').insert([dbPayload]);
          if (dbErr) throw dbErr;
        }
        setIsModalOpen(false);
        await loadStudents(classes);
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // Local Storage Mode
      let updatedStudents = [...students];
      if (editingStudent) {
        // Check uniqueness for admission number among other records
        const duplicate = updatedStudents.some(
          (s) =>
            s.admission_no.toLowerCase() === formData.admission_no.toLowerCase() &&
            s.id !== editingStudent.id
        );
        if (duplicate) {
          showToast('A student with this Admission Number already exists!', 'error');
          setLoading(false);
          return;
        }

        updatedStudents = updatedStudents.map((s) =>
          s.id === editingStudent.id ? { ...s, ...savePayload } : s
        );
      } else {
        // Check uniqueness for admission number
        const duplicate = updatedStudents.some(
          (s) => s.admission_no.toLowerCase() === formData.admission_no.toLowerCase()
        );
        if (duplicate) {
          showToast('A student with this Admission Number already exists!', 'error');
          setLoading(false);
          return;
        }

        const newId =
          updatedStudents.length > 0 ? Math.max(...updatedStudents.map((s) => s.id)) + 1 : 1;
        updatedStudents.push({ id: newId, ...savePayload });
      }

      setStudents(updatedStudents);
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(updatedStudents));
      setIsModalOpen(false);
      setLoading(false);
    }
  };

  const handleDeleteStudent = (studentId) => {
    setConfirmConfig({
      title: 'Delete Student',
      message: 'Are you sure you want to delete this student record?',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        setLoading(true);
        if (isSupabaseMode) {
          try {
            const { error: dbErr } = await supabase.from('students').delete().eq('id', studentId);
            if (dbErr) throw dbErr;
            setIsModalOpen(false);
            await loadStudents(classes);
          } catch (err) {
            showToast('DB Error: ' + err.message, 'error');
          } finally {
            setLoading(false);
          }
        } else {
          const updatedStudents = students.filter((s) => s.id !== studentId);
          setStudents(updatedStudents);
          localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(updatedStudents));
          setIsModalOpen(false);
          setLoading(false);
        }
      },
    });
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      admission_no: '',
      edsoft_id: '',
      student_name: '',
      birth_date: '',
      age: '',
      gender: 'Male',
      father_name: '',
      class_id: classes[0]?.id || '',
      mobile1: '',
      mobile2: '',
      enrollment: 'Active',
      hostel: 'No',
      transport_point: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (displayRow) => {
    const original = students.find((s) => String(s.id) === String(displayRow.id));
    if (original) {
      setEditingStudent(original);
      setFormData({
        admission_no: original.admission_no || '',
        edsoft_id: original.edsoft_id || '',
        student_name: original.student_name || '',
        birth_date: original.birth_date || '',
        age: original.age || '',
        gender: original.gender || 'Male',
        father_name: original.father_name || '',
        class_id: original.class_id || '',
        mobile1: original.mobile1 || '',
        mobile2: original.mobile2 || '',
        enrollment: original.enrollment || 'Active',
        hostel: original.hostel || 'No',
        transport_point: original.transport_point || '',
      });
      setIsModalOpen(true);
    }
  };

  // Calculate Class Distribution Statistics
  const classStats = React.useMemo(() => {
    const countsMap = new Map();
    students.forEach((s) => {
      const cId = s.class_id ? String(s.class_id) : 'unassigned';
      countsMap.set(cId, (countsMap.get(cId) || 0) + 1);
    });

    const stats = classes.map((cls) => ({
      id: String(cls.id),
      name: cls.name,
      count: countsMap.get(String(cls.id)) || 0,
    }));

    const unassignedCount = countsMap.get('unassigned') || 0;
    if (unassignedCount > 0) {
      stats.push({
        id: 'unassigned',
        name: 'Unassigned',
        count: unassignedCount,
      });
    }

    return stats;
  }, [students, classes]);

  // Map students array to pretty headers for DataGrid rendering
  const displayData = React.useMemo(() => {
    let mapped = students.map((s) => {
      const cls = classes.find((c) => String(c.id) === String(s.class_id));
      return {
        id: s.id,
        class_id: s.class_id,
        'Admission No': s.admission_no || '',
        'Edsoft ID': s.edsoft_id || '',
        'Student Name': s.student_name || '',
        Class: cls ? cls.name : 'Unassigned',
        'Father Name': s.father_name || '',
        'Birth Date': s.birth_date || '',
        Age: calculateAge(s.birth_date),
        'Mobile 1': s.mobile1 || '',
        'Mobile 2': s.mobile2 || '',
        Enrollment: s.enrollment || 'Active',
        Hostel: s.hostel || 'No',
        'Transport Point': s.transport_point || '',
      };
    });

    if (selectedClassId !== 'all') {
      if (selectedClassId === 'unassigned') {
        mapped = mapped.filter((s) => !s.class_id);
      } else {
        mapped = mapped.filter((s) => String(s.class_id) === String(selectedClassId));
      }
    }

    if (recordsSearchQuery.trim()) {
      const q = recordsSearchQuery.trim().toLowerCase();
      mapped = mapped.filter(
        (s) =>
          String(s['Student Name'] || '')
            .toLowerCase()
            .includes(q) ||
          String(s['Admission No'] || '')
            .toLowerCase()
            .includes(q) ||
          String(s['Father Name'] || '')
            .toLowerCase()
            .includes(q) ||
          String(s['Mobile 1'] || '')
            .toLowerCase()
            .includes(q)
      );
    }

    return mapped;
  }, [students, classes, selectedClassId, recordsSearchQuery]);

  // Export Student Records to Excel
  const handleExportRecordsExcel = () => {
    if (displayData.length === 0) {
      showToast('No records available to export.', 'error');
      return;
    }
    const exportRows = displayData.map((r) => ({
      'Admission No': r['Admission No'],
      'Edsoft ID': r['Edsoft ID'],
      'Student Name': r['Student Name'],
      Class: r['Class'],
      'Father Name': r['Father Name'],
      'Birth Date': r['Birth Date'],
      Age: r['Age'],
      'Mobile 1': r['Mobile 1'],
      'Mobile 2': r['Mobile 2'],
      Enrollment: r['Enrollment'],
      Hostel: r['Hostel'],
      'Transport Point': r['Transport Point'],
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Records');
    XLSX.writeFile(workbook, `Student_Records_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Student Records exported to Excel!', 'success');
  };

  return (
    <div className="flex flex-col min-h-[500px] space-y-6">
      {/* ── Unified Responsive Top Header ── */}
      <div className="bg-white border border-light-border p-4 sm:p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-light-border/60">
          {/* Main Title & Subtitle */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-graduation-cap text-green-dark"></i>
              Student Portal
            </h2>
            <p className="text-xs text-dark-muted font-semibold mt-0.5">
              Manage admission database, student profiles, and fee allocations.
              {!isSupabaseMode && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <i className="fas fa-wifi-slash text-[9px]"></i> Offline Mode
                </span>
              )}
            </p>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="bg-light-lbg border border-light-border p-1 rounded-2xl flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-hide w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('records')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex-1 sm:flex-initial ${
                activeTab === 'records'
                  ? 'bg-green-dark text-white shadow-sm'
                  : 'text-dark-soft hover:text-dark-primary hover:bg-white/50'
              }`}
            >
              <i className="fas fa-user-graduate"></i>
              Students Record
            </button>

            <button
              onClick={() => setActiveTab('fees')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex-1 sm:flex-initial ${
                activeTab === 'fees'
                  ? 'bg-green-dark text-white shadow-sm'
                  : 'text-dark-soft hover:text-dark-primary hover:bg-white/50'
              }`}
            >
              <i className="fas fa-file-invoice-dollar"></i>
              Student Fees
            </button>
          </div>
        </div>

        {/* Action Controls Bar for Student Records tab */}
        {activeTab === 'records' && (
          <div className="pt-1 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px]">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted text-xs"></i>
                <input
                  type="text"
                  placeholder="Search by Admission No, Student Name..."
                  value={recordsSearchQuery}
                  onChange={(e) => setRecordsSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50/70 focus:bg-white border border-light-border rounded-xl text-xs font-semibold text-dark-primary outline-none focus:border-brand-primary transition-all"
                />
              </div>

              {/* Class Filter Dropdown */}
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-2 bg-gray-50/70 focus:bg-white border border-light-border rounded-xl text-xs font-extrabold text-dark-primary outline-none focus:border-brand-primary transition-all cursor-pointer"
              >
                <option value="all">All Classes</option>
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
                onClick={() => loadStudents(classes)}
                disabled={loading}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                title="Refresh database"
              >
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>

              <button
                onClick={handleExportRecordsExcel}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <i className="fas fa-file-excel text-emerald-600"></i>
                Export Excel
              </button>

              <button
                onClick={openAddModal}
                className="flex-1 sm:flex-none px-4 py-2 bg-green-dark hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <i className="fas fa-user-plus"></i>
                Add Student
              </button>
            </div>
          </div>
        )}

        {/* Action Controls Bar for Student Fees tab */}
        {activeTab === 'fees' && feesControls && (
          <div className="pt-1 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px]">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted text-xs"></i>
                <input
                  type="text"
                  placeholder="Search by Admission No, Student Name..."
                  value={feesControls.searchQuery}
                  onChange={(e) => feesControls.setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50/70 focus:bg-white border border-light-border rounded-xl text-xs font-semibold text-dark-primary outline-none focus:border-brand-primary transition-all"
                />
              </div>

              {/* Class Filter Dropdown */}
              <select
                value={feesControls.selectedClassFilter}
                onChange={(e) => feesControls.setSelectedClassFilter(e.target.value)}
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
                onClick={feesControls.onRefresh}
                disabled={feesControls.loading}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                title="Refresh database"
              >
                <i className={`fas fa-sync-alt ${feesControls.loading ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>

              <button
                onClick={feesControls.onExportCsv}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <i className="fas fa-file-excel text-emerald-600"></i>
                Export Excel
              </button>

              <button
                onClick={feesControls.onOpenImport}
                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <i className="fas fa-file-import"></i>
                Bulk Import
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'fees' ? (
        <StudentFeesView
          students={students}
          classes={classes}
          onRefreshStudents={() => loadStudents(classes)}
          onRegisterControls={setFeesControls}
        />
      ) : (
        <div className="space-y-6">
          {/* ── Class Summary Tiles Panel ── */}
          <div className="bg-white border border-light-border rounded-3xl p-4 sm:p-6 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-light-border/60">
              {selectedClassId !== 'all' && (
                <button
                  onClick={() => setSelectedClassId('all')}
                  className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-all active:scale-95 flex items-center gap-1"
                >
                  <i className="fas fa-times text-[10px]"></i>
                  Reset Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <button
                type="button"
                onClick={() => setSelectedClassId('all')}
                className={`flex flex-col p-3 rounded-2xl border text-left transition-all cursor-pointer active:scale-95 ${
                  selectedClassId === 'all'
                    ? 'bg-green-dark text-white border-green-dark shadow-sm ring-2 ring-emerald-300/40'
                    : 'bg-light-lbg/60 hover:bg-white border-light-border text-dark-primary hover:border-brand-primary/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full mb-1">
                  <span
                    className={`text-xs font-black truncate ${
                      selectedClassId === 'all' ? 'text-white' : 'text-dark-deepblue'
                    }`}
                  >
                    All Classes
                  </span>
                  <i
                    className={`fas fa-users text-[10px] ${
                      selectedClassId === 'all' ? 'text-white/80' : 'text-brand-primary'
                    }`}
                  ></i>
                </div>
                <div className="flex items-baseline justify-between w-full mt-auto">
                  <span
                    className={`text-[10px] font-bold ${
                      selectedClassId === 'all' ? 'text-white/80' : 'text-dark-muted'
                    }`}
                  >
                    Total
                  </span>
                  <span
                    className={`text-sm font-black ${
                      selectedClassId === 'all' ? 'text-white' : 'text-emerald-700'
                    }`}
                  >
                    {students.length}
                  </span>
                </div>
              </button>

              {classStats.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClassId(selectedClassId === cls.id ? 'all' : cls.id)}
                  className={`flex flex-col p-3 rounded-2xl border text-left transition-all cursor-pointer active:scale-95 ${
                    selectedClassId === cls.id
                      ? 'bg-green-dark text-white border-green-dark shadow-sm ring-2 ring-emerald-300/40'
                      : 'bg-light-lbg/60 hover:bg-white border-light-border text-dark-primary hover:border-brand-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full mb-1">
                    <span
                      className={`text-xs font-black truncate ${
                        selectedClassId === cls.id ? 'text-white' : 'text-dark-deepblue'
                      }`}
                    >
                      {cls.name}
                    </span>
                    <i
                      className={`fas fa-[#10B981] fa-user-graduate text-[10px] ${
                        selectedClassId === cls.id ? 'text-white/80' : 'text-emerald-600'
                      }`}
                    ></i>
                  </div>
                  <div className="flex items-baseline justify-between w-full mt-auto">
                    <span
                      className={`text-[10px] font-bold ${
                        selectedClassId === cls.id ? 'text-white/80' : 'text-dark-muted'
                      }`}
                    >
                      Students
                    </span>
                    <span
                      className={`text-sm font-black ${
                        selectedClassId === cls.id ? 'text-white' : 'text-emerald-700'
                      }`}
                    >
                      {cls.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Student Records Grid */}
          <div className="flex-1 bg-white border border-light-border rounded-3xl overflow-hidden shadow-sm">
            <DataGrid
              data={displayData}
              loading={loading}
              error={error}
              onRetry={() => loadStudents(classes)}
              onRowClick={openEditModal}
              excludeColumns={['id', 'class_id']}
            />
          </div>
        </div>
      )}

      {/* Custom Modal for Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            {/* Modal Header */}
            <div className="p-6 bg-green-dark text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold">
                  {editingStudent
                    ? `Edit Student: ${editingStudent.student_name}`
                    : 'Add New Student'}
                </h3>
                <p className="text-xs opacity-75 mt-0.5">
                  {editingStudent
                    ? `Admission No: ${editingStudent.admission_no}`
                    : 'Enter details for student enrollment'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center transition-all text-white font-bold"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={handleSaveStudent}
              className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6"
            >
              {/* Core Information Section */}
              <div>
                <h4 className="text-xs font-bold text-dark-soft uppercase tracking-wider mb-4 border-b border-light-border pb-2">
                  <i className="fas fa-id-card mr-1.5 text-green-dark"></i> Core Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Admission No *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 101"
                      required
                      value={formData.admission_no}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, admission_no: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Class
                    </label>
                    <select
                      value={formData.class_id}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, class_id: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-light-border bg-white rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Enrollment ID
                    </label>
                    <input
                      type="text"
                      placeholder="000126B000"
                      value={formData.enrollment}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, enrollment: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Edsoft ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ED-10001"
                      value={formData.edsoft_id}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, edsoft_id: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Details Section */}
              <div>
                <h4 className="text-xs font-bold text-dark-soft uppercase tracking-wider mb-4 border-b border-light-border pb-2">
                  <i className="fas fa-user mr-1.5 text-green-dark"></i> Personal Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Student Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={formData.student_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, student_name: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, birth_date: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">Age</label>
                    <input
                      type="text"
                      placeholder="Age (calculated)"
                      readOnly
                      value={calculateAge(formData.birth_date)}
                      className="w-full px-4 py-2.5 border border-light-border bg-gray-50 text-dark-muted cursor-not-allowed rounded-xl outline-none transition-all text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-light-border bg-white rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Father Name
                    </label>
                    <input
                      type="text"
                      placeholder="Father's Name"
                      value={formData.father_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, father_name: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Mobile 1
                    </label>
                    <input
                      type="tel"
                      placeholder="Primary Mobile"
                      value={formData.mobile1}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, mobile1: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Mobile 2
                    </label>
                    <input
                      type="tel"
                      placeholder="Secondary Mobile"
                      value={formData.mobile2}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, mobile2: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Options Section */}
              <div>
                <h4 className="text-xs font-bold text-dark-soft uppercase tracking-wider mb-4 border-b border-light-border pb-2">
                  <i className="fas fa-sliders-h mr-1.5 text-green-dark"></i> Facilities
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Hostel Accommodation
                    </label>
                    <select
                      value={formData.hostel}
                      onChange={(e) => setFormData((prev) => ({ ...prev, hostel: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-light-border bg-white rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary cursor-pointer"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Transport Point
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bus Stop A, Landmark X"
                      value={formData.transport_point}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, transport_point: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="p-6 border-t border-light-border bg-gray-50 flex justify-between gap-3 shrink-0 rounded-b-[2rem] -mx-8 -mb-8">
                {editingStudent ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteStudent(editingStudent.id)}
                    className="px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5"
                  >
                    <i className="fas fa-trash-alt"></i> Delete Record
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-white border border-light-border hover:bg-gray-100 text-dark-deepblue rounded-xl font-bold text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-green-dark hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 shadow-lg shadow-green-100"
                  >
                    <i className="fas fa-save"></i> Save Student
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </div>
  );
};

export default AdminStudentsView;
