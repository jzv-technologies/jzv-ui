// src/components/examinations/ExamAttendanceUploadModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

const LOCAL_ATTENDANCE_STORAGE_PREFIX = 'jzv_exam_attendance_';

/**
 * ExamAttendanceUploadModal Component
 * Allows uploading student attendance records (Present, Absent, On Leave)
 * mapped to the active Examination Schedule via CSV or Excel (.xlsx).
 * Persists records into public.exam_attendance_entries with fallback caching.
 */
const ExamAttendanceUploadModal = ({
  isOpen,
  onClose,
  schedule = null,
  students = [],
  displayedStudents = [],
  attendanceMap = {},
  onUploadSuccess,
}) => {
  const [mainView, setMainView] = useState('upload'); // 'upload' | 'students'
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'paste' for upload view
  const [fileName, setFileName] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [rawRowsData, setRawRowsData] = useState([]);
  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    admission_no: '',
    present: '',
    absent: '',
    on_leave: '',
    total_days: '',
  });
  const [showMappingPanel, setShowMappingPanel] = useState(false);
  const [missingMandatory, setMissingMandatory] = useState(false);
  const [missingFieldNames, setMissingFieldNames] = useState([]);
  const [mappingError, setMappingError] = useState('');
  const [saving, setSaving] = useState(false);

  // States for 'students' view
  const [liveAttendanceMap, setLiveAttendanceMap] = useState({});
  const [unsavedEdits, setUnsavedEdits] = useState({});
  const [studentSearch, setStudentSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'recorded' | 'missing' | 'low'

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset upload state when closed
  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setPasteContent('');
      setParsedRows([]);
      setRawRowsData([]);
      setDetectedHeaders([]);
      setColumnMapping({
        admission_no: '',
        present: '',
        absent: '',
        on_leave: '',
        total_days: '',
      });
      setShowMappingPanel(false);
      setMissingMandatory(false);
      setMissingFieldNames([]);
      setMappingError('');
      setSaving(false);
      setUnsavedEdits({});
      setStudentSearch('');
      setAttendanceFilter('all');
    }
  }, [isOpen]);

  const normalize = (str) =>
    String(str || '')
      .trim()
      .toLowerCase();

  const studentList = useMemo(() => {
    return displayedStudents.length > 0 ? displayedStudents : students;
  }, [displayedStudents, students]);

  // Create student lookup map by admission number
  const studentMap = useMemo(() => {
    const map = new Map();
    studentList.forEach((s) => {
      const adm = s.admission_no || s.admission_number;
      if (adm) {
        map.set(normalize(adm), s);
      }
    });
    return map;
  }, [studentList]);

  // Fetch existing attendance from Supabase / local storage / props
  const fetchSavedAttendance = async () => {
    if (!schedule?.id) return;
    try {
      const { data, error } = await supabase
        .from('exam_attendance_entries')
        .select('*')
        .eq('schedule_id', schedule.id);

      let list = [];
      if (!error && Array.isArray(data) && data.length > 0) {
        list = data;
      } else {
        const local = localStorage.getItem(`${LOCAL_ATTENDANCE_STORAGE_PREFIX}${schedule.id}`);
        if (local) {
          try {
            list = JSON.parse(local);
          } catch (_) {}
        }
      }

      const map = {};
      list.forEach((item) => {
        if (item.admission_no) {
          const norm = normalize(item.admission_no);
          const pres = Number(item.present) || 0;
          const abs = Number(item.absent) || 0;
          const leave = Number(item.on_leave) || 0;
          map[norm] = {
            present: pres,
            absent: abs,
            on_leave: leave,
            total_days: pres + abs + leave,
          };
        }
      });

      // Merge with attendanceMap prop if provided
      if (attendanceMap && typeof attendanceMap === 'object') {
        Object.entries(attendanceMap).forEach(([k, v]) => {
          const norm = normalize(k);
          if (!map[norm]) {
            const pres = Number(v.present) || 0;
            const abs = Number(v.absent) || 0;
            const leave = Number(v.on_leave) || 0;
            map[norm] = {
              present: pres,
              absent: abs,
              on_leave: leave,
              total_days: pres + abs + leave,
            };
          }
        });
      }

      setLiveAttendanceMap(map);
    } catch (err) {
      console.warn('[ExamAttendanceUploadModal] Error fetching saved attendance:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSavedAttendance();
    }
  }, [isOpen, schedule?.id]);

  // Calculate high-level attendance KPIs across enrolled students
  const kpis = useMemo(() => {
    const total = studentList.length;
    let recorded = 0;
    let perfect = 0;
    let low = 0;
    let totalPct = 0;

    studentList.forEach((s) => {
      const adm = normalize(s.admission_no || s.admission_number);
      const record = unsavedEdits[adm] || liveAttendanceMap[adm];
      if (record && (record.present > 0 || record.absent > 0 || record.on_leave > 0)) {
        recorded++;
        const tot = record.present + record.absent + record.on_leave;
        const pct = tot > 0 ? Math.round((record.present / tot) * 100) : 0;
        totalPct += pct;
        if (pct === 100) perfect++;
        if (pct < 75) low++;
      }
    });

    const avg = recorded > 0 ? (totalPct / recorded).toFixed(1) : 0;
    return { total, recorded, perfect, low, avg };
  }, [studentList, liveAttendanceMap, unsavedEdits]);

  // Filter and search students for the table view
  const filteredStudents = useMemo(() => {
    return studentList.filter((s) => {
      const name = String(s.student_name || '').toLowerCase();
      const adm = String(s.admission_no || s.admission_number || '').toLowerCase();
      const roll = String(s.roll_no || '').toLowerCase();
      const q = studentSearch.toLowerCase().trim();

      const matchesSearch = !q || name.includes(q) || adm.includes(q) || roll.includes(q);
      if (!matchesSearch) return false;

      const normAdm = normalize(s.admission_no || s.admission_number);
      const record = unsavedEdits[normAdm] || liveAttendanceMap[normAdm];
      const hasAttendance = !!(
        record &&
        (record.present > 0 || record.absent > 0 || record.on_leave > 0)
      );

      if (attendanceFilter === 'recorded') return hasAttendance;
      if (attendanceFilter === 'missing') return !hasAttendance;
      if (attendanceFilter === 'low') {
        if (!hasAttendance) return false;
        const tot = record.present + record.absent + record.on_leave;
        const pct = tot > 0 ? (record.present / tot) * 100 : 0;
        return pct < 75;
      }
      return true;
    });
  }, [studentList, studentSearch, attendanceFilter, liveAttendanceMap, unsavedEdits]);

  // Handle direct in-table editing of a student's attendance fields
  const handleUpdateStudentField = (admNorm, field, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    const existing = unsavedEdits[admNorm] || liveAttendanceMap[admNorm] || {
      present: 0,
      absent: 0,
      on_leave: 0,
      total_days: 0,
    };

    const updated = {
      ...existing,
      [field]: num,
    };
    updated.total_days = updated.present + updated.absent + updated.on_leave;

    setUnsavedEdits((prev) => ({
      ...prev,
      [admNorm]: updated,
    }));
  };

  const handleStepStudentField = (admNorm, field, delta) => {
    const existing = unsavedEdits[admNorm] || liveAttendanceMap[admNorm] || {
      present: 0,
      absent: 0,
      on_leave: 0,
      total_days: 0,
    };
    const currentVal = existing[field] || 0;
    const newVal = Math.max(0, currentVal + delta);
    handleUpdateStudentField(admNorm, field, newVal);
  };

  // Save manual attendance modifications made in the table view
  const handleSaveStudentEdits = async () => {
    if (!schedule?.id) return;
    const modifiedAdmissions = Object.keys(unsavedEdits);
    if (modifiedAdmissions.length === 0) {
      showToast('No modifications to save.', 'info');
      return;
    }

    setSaving(true);
    const scheduleId = Number(schedule.id);

    const merged = { ...liveAttendanceMap, ...unsavedEdits };
    const payload = Object.entries(merged).map(([admNorm, rec]) => {
      const matched = studentList.find(
        (s) => normalize(s.admission_no || s.admission_number) === admNorm
      );
      const admission_no = matched?.admission_no || matched?.admission_number || admNorm;
      return {
        schedule_id: scheduleId,
        admission_no,
        present: rec.present,
        absent: rec.absent,
        on_leave: rec.on_leave,
        updated_at: new Date().toISOString(),
      };
    });

    try {
      const { data, error } = await supabase
        .from('exam_attendance_entries')
        .upsert(payload, { onConflict: 'schedule_id,admission_no' })
        .select();

      const storageKey = `${LOCAL_ATTENDANCE_STORAGE_PREFIX}${scheduleId}`;
      localStorage.setItem(storageKey, JSON.stringify(payload));

      if (error && error.code !== 'PGRST205') {
        console.warn('Database upsert note:', error.message);
      }

      setLiveAttendanceMap(merged);
      setUnsavedEdits({});
      showToast(
        `Successfully updated attendance for ${modifiedAdmissions.length} student(s).`,
        'success'
      );
      onUploadSuccess?.(payload);
    } catch (err) {
      console.error('Error saving student edits:', err);
      const storageKey = `${LOCAL_ATTENDANCE_STORAGE_PREFIX}${scheduleId}`;
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setLiveAttendanceMap(merged);
      setUnsavedEdits({});
      showToast('Saved attendance updates to local storage.', 'warning');
      onUploadSuccess?.(payload);
    } finally {
      setSaving(false);
    }
  };

  // Export current attendance view to Excel (.xlsx)
  const handleExportCurrentAttendance = () => {
    const rows = studentList.map((s, idx) => {
      const adm = s.admission_no || s.admission_number || '';
      const rec = unsavedEdits[normalize(adm)] || liveAttendanceMap[normalize(adm)] || {
        present: 0,
        absent: 0,
        on_leave: 0,
        total_days: 0,
      };
      const tot = rec.present + rec.absent + rec.on_leave;
      const pct = tot > 0 ? Math.round((rec.present / tot) * 100) : 0;
      return {
        '#': idx + 1,
        'Admission No': adm,
        'Student Name': s.student_name || '',
        'Roll No': s.roll_no || '',
        'Present Days': rec.present,
        'Absent Days': rec.absent,
        'On Leave Days': rec.on_leave,
        'Total Working Days': tot,
        'Attendance %': pct + '%',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, `student_attendance_${schedule?.name || 'schedule'}.xlsx`);
  };

  // Quick bulk action: Set uniform working days for class
  const handleSetWorkingDaysForAll = () => {
    const input = prompt('Enter total working days for all students (e.g. 200):', '200');
    if (!input) return;
    const totalWorkingDays = parseInt(input, 10);
    if (isNaN(totalWorkingDays) || totalWorkingDays <= 0) {
      showToast('Please enter a valid positive number.', 'error');
      return;
    }

    const newEdits = { ...unsavedEdits };
    studentList.forEach((s) => {
      const adm = normalize(s.admission_no || s.admission_number);
      const existing = newEdits[adm] || liveAttendanceMap[adm] || {
        present: totalWorkingDays,
        absent: 0,
        on_leave: 0,
        total_days: totalWorkingDays,
      };

      const present = existing.present > 0 ? existing.present : totalWorkingDays;
      const on_leave = existing.on_leave || 0;
      const absent = Math.max(0, totalWorkingDays - present - on_leave);

      newEdits[adm] = {
        present,
        absent,
        on_leave,
        total_days: totalWorkingDays,
      };
    });

    setUnsavedEdits(newEdits);
    showToast(
      `Updated attendance working days for ${studentList.length} students. Click 'Save Attendance Changes' to persist.`,
      'info'
    );
  };

  // Helper to extract values from multiple possible column aliases
  const findMatch = (headers, candidateList) => {
    const lower = candidateList.map((c) => c.toLowerCase().trim());
    return (
      headers.find((h) => {
        const cleanH = h.toLowerCase().trim();
        return lower.some(
          (c) =>
            cleanH === c ||
            cleanH.replace(/[^a-z0-9]/g, '') === c.replace(/[^a-z0-9]/g, '')
        );
      }) || ''
    );
  };

  const processWithMapping = (rawRows, mapping) => {
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      setParsedRows([]);
      return;
    }

    const admKey = mapping.admission_no;
    const presKey = mapping.present;

    // Both admission_no and present are mandatory fields
    if (!admKey || !presKey) {
      setParsedRows([]);
      return;
    }

    const processed = [];
    rawRows.forEach((row, idx) => {
      const admission_no = String(row[admKey] || '').trim();
      if (!admission_no) return;

      const rawPresent = row[presKey];
      const rawAbsent = mapping.absent ? row[mapping.absent] : null;
      const rawLeave = mapping.on_leave ? row[mapping.on_leave] : 0;
      const rawTotal = mapping.total_days ? row[mapping.total_days] : null;

      const present = Math.max(0, Number(rawPresent) || 0);
      const on_leave = Math.max(0, Number(rawLeave) || 0);

      let absent = 0;
      let total_days = 0;

      if (rawAbsent !== null && rawAbsent !== undefined && String(rawAbsent).trim() !== '') {
        absent = Math.max(0, Number(rawAbsent) || 0);
        total_days = present + absent + on_leave;
      } else if (rawTotal !== null && rawTotal !== undefined && String(rawTotal).trim() !== '') {
        total_days = Math.max(0, Number(rawTotal) || 0);
        absent = Math.max(0, total_days - present - on_leave);
      } else {
        absent = 0;
        total_days = present + on_leave;
      }

      const matchedStudent = studentMap.get(normalize(admission_no));

      processed.push({
        rowIndex: idx + 1,
        admission_no,
        student_name: matchedStudent?.student_name || '—',
        present,
        absent,
        on_leave,
        total_days,
        pct: total_days > 0 ? Math.round((present / total_days) * 100) : (present > 0 ? 100 : 0),
        isMatched: !!matchedStudent,
      });
    });

    setParsedRows(processed);
    if (processed.length > 0) {
      showToast(`Parsed ${processed.length} attendance records successfully.`, 'success');
    } else {
      showToast('No valid attendance rows found for selected column.', 'error');
    }
  };

  const handleAnalyzeRawData = (rawData) => {
    if (!Array.isArray(rawData) || rawData.length === 0) {
      showToast('No data rows found in file.', 'error');
      setParsedRows([]);
      setRawRowsData([]);
      setDetectedHeaders([]);
      return;
    }

    const headers = Object.keys(rawData[0]);
    setRawRowsData(rawData);
    setDetectedHeaders(headers);

    const matchedAdm = findMatch(headers, [
      'admission_no',
      'admission no',
      'admission number',
      'admission_number',
      'admissionno',
      'adm no',
      'adm_no',
      'admno',
      'adm',
      'student id',
      'student_id',
      'studentid',
      'roll no',
      'roll_no',
      'rollno',
      'roll',
      'reg no',
      'reg_no',
      'registration no',
      'registration_no',
      'id',
    ]);

    const matchedPresent = findMatch(headers, [
      'present',
      'present days',
      'present_days',
      'days_present',
      'attended',
      'attended days',
      'days attended',
      'attendance',
      'attendance days',
      'present (days)',
      'total present',
      'total_present',
      'no of days present',
      'no. of days present',
      'p',
      'pres',
    ]);

    const matchedAbsent = findMatch(headers, [
      'absent',
      'absent days',
      'absent_days',
      'days_absent',
      'absent (days)',
      'total absent',
      'total_absent',
      'no of days absent',
      'no. of days absent',
      'a',
      'abs',
    ]);

    const matchedLeave = findMatch(headers, [
      'on_leave',
      'on leave',
      'leave',
      'leave days',
      'leave_days',
      'on_leave_days',
      'leaves',
      'l',
    ]);

    const matchedTotal = findMatch(headers, [
      'total_days',
      'total days',
      'working_days',
      'working days',
      'total working days',
      'total_working_days',
      'max days',
      'school days',
      'total',
    ]);

    const initialMapping = {
      admission_no: matchedAdm,
      present: matchedPresent,
      absent: matchedAbsent,
      on_leave: matchedLeave,
      total_days: matchedTotal,
    };

    setColumnMapping(initialMapping);

    const missing = [];
    if (!matchedAdm) missing.push('Admission Number');
    if (!matchedPresent) missing.push('Present Days');

    if (missing.length > 0) {
      // Mandatory column(s) missing! Prompt user to map columns
      setMissingMandatory(true);
      setMissingFieldNames(missing);
      setShowMappingPanel(true);
      setParsedRows([]);
      setMappingError(`Mandatory column(s) [${missing.join(', ')}] could not be detected. Please select the matching columns.`);
      showToast(
        `Mandatory column(s) [${missing.join(', ')}] not found in file. Please map the columns.`,
        'warning'
      );
    } else {
      setMissingMandatory(false);
      setMissingFieldNames([]);
      setShowMappingPanel(false);
      setMappingError('');
      processWithMapping(rawData, initialMapping);
    }
  };

  const handleApplyMapping = () => {
    const missing = [];
    if (!columnMapping.admission_no) missing.push('Admission Number');
    if (!columnMapping.present) missing.push('Present Days');

    if (missing.length > 0) {
      setMappingError(`Please select columns for mandatory fields: ${missing.join(', ')}.`);
      showToast(`Please select columns for mandatory fields: ${missing.join(', ')}.`, 'error');
      return;
    }

    // Check duplicate mappings among chosen columns
    const selectedCols = [
      columnMapping.admission_no,
      columnMapping.present,
      columnMapping.absent,
      columnMapping.on_leave,
      columnMapping.total_days,
    ].filter(Boolean);

    const uniqueCols = new Set(selectedCols);
    if (uniqueCols.size !== selectedCols.length) {
      setMappingError('Duplicate column mappings detected. Each attendance field must map to a unique column.');
      showToast('Each target field must map to a unique column.', 'error');
      return;
    }

    setMappingError('');
    setMissingMandatory(false);
    setMissingFieldNames([]);
    setShowMappingPanel(false);
    processWithMapping(rawRowsData, columnMapping);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        handleAnalyzeRawData(rawData);
      } catch (err) {
        showToast('Error reading file: ' + err.message, 'error');
        setParsedRows([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleParsePaste = () => {
    if (!pasteContent.trim()) {
      showToast('Please paste CSV text to parse.', 'error');
      return;
    }

    try {
      const workbook = XLSX.read(pasteContent, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      handleAnalyzeRawData(rawData);
    } catch (err) {
      showToast('Error parsing pasted CSV: ' + err.message, 'error');
    }
  };

  // Download Sample Template (.csv)
  const handleDownloadTemplateCsv = () => {
    const headers = ['admission_no', 'present', 'absent', 'on_leave', 'total_days'];
    const sampleRows = students
      .slice(0, 3)
      .map((s, idx) => [
        s.admission_no || `JZV-2024-${100 + idx}`,
        180 - idx * 5,
        12 + idx * 3,
        8 + idx * 2,
        200,
      ]);

    if (sampleRows.length === 0) {
      sampleRows.push(['JZV-2024-001', 180, 12, 8, 200], ['JZV-2024-002', 195, 3, 2, 200]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `exam_attendance_template_${schedule?.id || 'schedule'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Sample Template (.xlsx)
  const handleDownloadTemplateXlsx = () => {
    const sampleRows = students.slice(0, 4).map((s, idx) => ({
      admission_no: s.admission_no || `JZV-2024-${100 + idx}`,
      present: 180 - idx * 5,
      absent: 12 + idx * 3,
      on_leave: 8 + idx * 2,
      total_days: 200,
    }));

    if (sampleRows.length === 0) {
      sampleRows.push(
        { admission_no: 'JZV-2024-001', present: 180, absent: 12, on_leave: 8, total_days: 200 },
        { admission_no: 'JZV-2024-002', present: 195, absent: 3, on_leave: 2, total_days: 200 }
      );
    }

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, `exam_attendance_template_${schedule?.id || 'schedule'}.xlsx`);
  };

  const handleSaveAttendance = async () => {
    if (!schedule?.id) {
      showToast('Please select a valid Examination Schedule first.', 'error');
      return;
    }
    if (parsedRows.length === 0) {
      showToast('No valid rows to save.', 'error');
      return;
    }

    setSaving(true);
    const scheduleId = Number(schedule.id);

    const payload = parsedRows.map((r) => ({
      schedule_id: scheduleId,
      admission_no: r.admission_no,
      present: r.present,
      absent: r.absent,
      on_leave: r.on_leave,
      updated_at: new Date().toISOString(),
    }));

    try {
      const { data, error } = await supabase
        .from('exam_attendance_entries')
        .upsert(payload, { onConflict: 'schedule_id,admission_no' })
        .select();

      const storageKey = `${LOCAL_ATTENDANCE_STORAGE_PREFIX}${scheduleId}`;
      localStorage.setItem(storageKey, JSON.stringify(payload));

      const updatedLive = { ...liveAttendanceMap };
      payload.forEach((item) => {
        const norm = normalize(item.admission_no);
        updatedLive[norm] = {
          present: item.present,
          absent: item.absent,
          on_leave: item.on_leave,
          total_days: item.present + item.absent + item.on_leave,
        };
      });
      setLiveAttendanceMap(updatedLive);
      setUnsavedEdits({});

      if (error) {
        if (
          error.code === 'PGRST205' ||
          error.message?.includes('does not exist') ||
          error.message?.includes('schema cache')
        ) {
          console.warn(
            '[ExamAttendanceUpload] Table exam_attendance_entries not yet migrated. Storing in local cache.'
          );
          showToast(
            'Attendance saved locally! Note: Execute /debug-files/execute-query.sql in Supabase SQL editor to create the permanent table.',
            'info'
          );
          onUploadSuccess?.(payload);
          setMainView('students');
          return;
        }
        throw error;
      }

      showToast(
        `Successfully saved attendance for ${data?.length || payload.length} students in "${schedule.name}".`,
        'success'
      );
      onUploadSuccess?.(payload);
      setMainView('students');
    } catch (err) {
      console.error('Failed to upsert exam attendance:', err);
      const storageKey = `${LOCAL_ATTENDANCE_STORAGE_PREFIX}${scheduleId}`;
      localStorage.setItem(storageKey, JSON.stringify(payload));

      const updatedLive = { ...liveAttendanceMap };
      payload.forEach((item) => {
        const norm = normalize(item.admission_no);
        updatedLive[norm] = {
          present: item.present,
          absent: item.absent,
          on_leave: item.on_leave,
          total_days: item.present + item.absent + item.on_leave,
        };
      });
      setLiveAttendanceMap(updatedLive);
      setUnsavedEdits({});

      showToast(
        `Database notice: ${err.message}. Attendance saved to local cache for "${schedule.name}".`,
        'warning'
      );
      onUploadSuccess?.(payload);
      setMainView('students');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-light-border bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0 shadow-2xs">
              <i className="fas fa-calendar-check" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-dark-primary tracking-tight truncate flex items-center gap-2">
                <span>Student Attendance Manager</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {schedule?.name || 'Selected Schedule'}
                </span>
              </h3>
              <p className="text-xs text-dark-muted truncate flex items-center gap-1.5">
                <span>Academic Year:</span>
                <span className="font-bold text-dark-slate">
                  {schedule?.academic_year || 'Current Term'}
                </span>
                <span className="text-slate-300">•</span>
                <span>Enrolled:</span>
                <span className="font-bold text-emerald-700">
                  {kpis.total} Students
                </span>
                <span className="text-slate-300">•</span>
                <span>Recorded:</span>
                <span className="font-bold text-emerald-700">
                  {kpis.recorded} / {kpis.total}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* View Mode Switcher Pills */}
            <div className="flex items-center bg-slate-200/80 p-1 rounded-2xl gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setMainView('upload')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mainView === 'upload'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-cloud-arrow-up text-xs" />
                <span>Upload / Import</span>
              </button>
              <button
                type="button"
                onClick={() => setMainView('students')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mainView === 'students'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-users-viewfinder text-xs" />
                <span>View Students &amp; Attendance</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    mainView === 'students'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-300/80 text-dark-slate'
                  }`}
                >
                  {kpis.recorded}/{kpis.total}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all cursor-pointer"
            >
              <i className="fas fa-times text-sm" />
            </button>
          </div>
        </div>

        {/* ── View 1: Enrolled Students & Attendance ── */}
        {mainView === 'students' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-light-border rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider block">
                  Enrolled Students
                </span>
                <div className="text-xl font-black text-dark-primary flex items-baseline gap-1">
                  <span>{kpis.total}</span>
                  <span className="text-xs text-dark-muted font-normal">Students</span>
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Attendance Recorded
                </span>
                <div className="text-xl font-black text-emerald-700 flex items-baseline gap-1">
                  <span>{kpis.recorded}</span>
                  <span className="text-xs text-emerald-600 font-bold">
                    ({kpis.total > 0 ? Math.round((kpis.recorded / kpis.total) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                  Class Avg Attendance
                </span>
                <div className="text-xl font-black text-blue-700 flex items-baseline gap-1">
                  <span>{kpis.avg}%</span>
                  <span className="text-xs text-blue-600 font-normal">Average</span>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Perfect Attendance (100%)
                </span>
                <div className="text-xl font-black text-amber-700 flex items-baseline gap-1">
                  <span>{kpis.perfect}</span>
                  <span className="text-xs text-amber-600 font-normal">Students</span>
                </div>
              </div>
            </div>

            {/* Filter and Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-light-border">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student by name, admission no, or roll..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-light-border bg-white text-dark-primary outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 shrink-0 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'All', count: kpis.total },
                  { id: 'recorded', label: 'Recorded', count: kpis.recorded },
                  { id: 'missing', label: 'Missing', count: kpis.total - kpis.recorded },
                  { id: 'low', label: 'Low (<75%)', count: kpis.low },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAttendanceFilter(f.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      attendanceFilter === f.id
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-dark-muted hover:text-dark-primary border border-light-border'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`text-[10px] px-1 rounded-full ${
                        attendanceFilter === f.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-dark-slate'
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSetWorkingDaysForAll}
                  className="px-2.5 py-1 text-xs font-bold text-dark-slate bg-white hover:bg-slate-100 border border-light-border rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Set uniform working days for all students"
                >
                  <i className="fas fa-calculator text-slate-500 text-[10px]" />
                  <span>Set Working Days</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCurrentAttendance}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Export student attendance to Excel spreadsheet"
                >
                  <i className="fas fa-file-excel text-emerald-600 text-xs" />
                  <span>Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMainView('upload')}
                  className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <i className="fas fa-cloud-arrow-up text-[10px]" />
                  <span>Upload File</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="border border-light-border rounded-2xl bg-white overflow-hidden shadow-2xs">
              <div className="max-h-[50vh] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-dark-muted font-black text-[10px] uppercase tracking-wider sticky top-0 border-b border-light-border z-10">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Admission No</th>
                      <th className="py-2.5 px-3 text-center">Present</th>
                      <th className="py-2.5 px-3 text-center">Absent</th>
                      <th className="py-2.5 px-3 text-center">On Leave</th>
                      <th className="py-2.5 px-3 text-center">Total Days</th>
                      <th className="py-2.5 px-3 text-center">Attendance %</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border font-medium">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-dark-muted">
                          <div className="space-y-1.5">
                            <i className="fas fa-user-slash text-2xl text-slate-300" />
                            <p className="text-xs font-bold text-dark-slate">No students found</p>
                            <p className="text-[11px] text-dark-muted">
                              Try adjusting your search query or filter selection.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s, idx) => {
                        const admNorm = normalize(s.admission_no || s.admission_number);
                        const isEdited = !!unsavedEdits[admNorm];
                        const record = unsavedEdits[admNorm] || liveAttendanceMap[admNorm] || {
                          present: 0,
                          absent: 0,
                          on_leave: 0,
                          total_days: 0,
                        };
                        const tot = record.present + record.absent + record.on_leave;
                        const pct = tot > 0 ? Math.round((record.present / tot) * 100) : (record.present > 0 ? 100 : 0);
                        const hasData = tot > 0 || record.present > 0;

                        return (
                          <tr
                            key={s.id || admNorm || idx}
                            className={`transition-colors hover:bg-slate-50/80 ${
                              isEdited ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-dark-muted font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            {/* Student Name */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {s.student_name ? s.student_name.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-dark-primary block truncate">
                                    {s.student_name || 'Unnamed Student'}
                                  </span>
                                  {s.roll_no && (
                                    <span className="text-[10px] text-dark-muted block">
                                      Roll: #{s.roll_no}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Admission No */}
                            <td className="py-2 px-3 font-mono font-bold text-dark-slate text-[11px]">
                              {s.admission_no || s.admission_number || '—'}
                            </td>

                            {/* Present Days with inline controls */}
                            <td className="py-1.5 px-2 text-center">
                              <div className="inline-flex items-center justify-center border border-light-border rounded-lg bg-white overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleStepStudentField(admNorm, 'present', -1)}
                                  className="w-5 h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[10px] cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={record.present}
                                  onChange={(e) =>
                                    handleUpdateStudentField(admNorm, 'present', e.target.value)
                                  }
                                  className="w-11 h-6 text-center text-xs font-bold text-emerald-700 font-mono outline-none border-x border-light-border bg-transparent"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStepStudentField(admNorm, 'present', 1)}
                                  className="w-5 h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[10px] cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Absent Days with inline controls */}
                            <td className="py-1.5 px-2 text-center">
                              <div className="inline-flex items-center justify-center border border-light-border rounded-lg bg-white overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleStepStudentField(admNorm, 'absent', -1)}
                                  className="w-5 h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[10px] cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={record.absent}
                                  onChange={(e) =>
                                    handleUpdateStudentField(admNorm, 'absent', e.target.value)
                                  }
                                  className="w-11 h-6 text-center text-xs font-bold text-rose-600 font-mono outline-none border-x border-light-border bg-transparent"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStepStudentField(admNorm, 'absent', 1)}
                                  className="w-5 h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[10px] cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* On Leave Days with inline controls */}
                            <td className="py-1.5 px-2 text-center">
                              <div className="inline-flex items-center justify-center border border-light-border rounded-lg bg-white overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleStepStudentField(admNorm, 'on_leave', -1)}
                                  className="w-5 h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[10px] cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={record.on_leave}
                                  onChange={(e) =>
                                    handleUpdateStudentField(admNorm, 'on_leave', e.target.value)
                                  }
                                  className="w-11 h-6 text-center text-xs font-bold text-amber-600 font-mono outline-none border-x border-light-border bg-transparent"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStepStudentField(admNorm, 'on_leave', 1)}
                                  className="w-5 h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[10px] cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Total Days */}
                            <td className="py-2 px-3 text-center font-bold text-dark-slate font-mono text-[11px]">
                              {tot}
                            </td>

                            {/* Attendance % */}
                            <td className="py-2 px-3 text-center">
                              {hasData ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                                    pct >= 90
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : pct >= 75
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {pct}%
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono italic">
                                  —
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-2 px-3 text-right">
                              {isEdited ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                                  <i className="fas fa-pencil text-[9px]" />
                                  Unsaved
                                </span>
                              ) : hasData ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <i className="fas fa-check text-[9px]" />
                                  Recorded
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unsaved Changes Banner */}
            {Object.keys(unsavedEdits).length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center text-sm shadow-2xs">
                    <i className="fas fa-floppy-disk" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-amber-950 block">
                      Unsaved Attendance Changes
                    </span>
                    <span className="text-[11px] text-amber-800">
                      You have modified attendance records for {Object.keys(unsavedEdits).length} student(s).
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setUnsavedEdits({})}
                    className="px-3 py-1.5 text-xs font-bold text-dark-muted hover:text-dark-primary bg-white border border-light-border rounded-xl cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStudentEdits}
                    disabled={saving}
                    className="px-4 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin text-xs" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check text-xs" />
                        <span>Save Attendance Changes ({Object.keys(unsavedEdits).length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── View 2: Upload / Import Attendance ── */}
        {mainView === 'upload' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* Instructions and Download Template Bar */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fas fa-info-circle text-emerald-600" />
                  <span>File Format Requirements</span>
                </h4>
                <p className="text-xs text-emerald-800">
                  Upload CSV or Excel containing columns:{' '}
                  <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded font-bold">
                    admission_no
                  </code>
                  ,{' '}
                  <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded font-bold">
                    present
                  </code>
                  ,{' '}
                  <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded font-bold">
                    absent
                  </code>
                  ,{' '}
                  <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded font-bold">
                    on_leave
                  </code>
                  .
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadTemplateCsv}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <i className="fas fa-file-csv text-emerald-600" />
                  <span>Sample CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTemplateXlsx}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <i className="fas fa-file-excel text-emerald-600" />
                  <span>Sample Excel</span>
                </button>
              </div>
            </div>

            {/* Input Method Tabs */}
            <div className="flex items-center gap-2 border-b border-light-border pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 rounded-xl ${
                  activeTab === 'file'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary hover:bg-slate-100'
                }`}
              >
                <i className="fas fa-file-arrow-up" />
                <span>Spreadsheet File (.xlsx, .csv)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 rounded-xl ${
                  activeTab === 'paste'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary hover:bg-slate-100'
                }`}
              >
                <i className="fas fa-paste" />
                <span>Paste CSV / Text</span>
              </button>
            </div>

            {/* Tab 1: File Upload */}
            {activeTab === 'file' && (
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/50 transition-colors">
                <input
                  type="file"
                  id="attendance-file-input"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <label
                  htmlFor="attendance-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shadow-inner">
                    <i className="fas fa-cloud-arrow-up" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-dark-primary block">
                      {fileName ? fileName : 'Choose an Excel or CSV attendance file'}
                    </span>
                    <span className="text-[11px] text-dark-muted">
                      Click to browse or drag and drop spreadsheet
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Tab 2: Paste CSV */}
            {activeTab === 'paste' && (
              <div className="space-y-2">
                <textarea
                  rows={5}
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="admission_no,present,absent,on_leave&#10;JZV-2024-001,180,12,8&#10;JZV-2024-002,195,3,2"
                  className="w-full px-3 py-2 text-xs font-mono border border-light-border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
                />
                <button
                  type="button"
                  onClick={handleParsePaste}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fas fa-check" />
                  <span>Parse CSV Content</span>
                </button>
              </div>
            )}

            {/* Column Mapping Interface (Prompted when mandatory fields are missing or toggled by user) */}
            {(showMappingPanel || missingMandatory) && detectedHeaders.length > 0 && (
              <div
                className={`p-4 sm:p-5 rounded-2xl border-2 space-y-4 animate-in fade-in duration-200 ${
                  missingMandatory
                    ? 'bg-amber-50/95 border-amber-400 shadow-md ring-2 ring-amber-200/50'
                    : 'bg-slate-50 border-emerald-300 shadow-xs'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-xs shrink-0 mt-0.5 ${
                        missingMandatory ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      <i className="fas fa-table-columns" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-black text-dark-primary tracking-tight">
                          Map File Columns to Attendance Fields
                        </h4>
                        {missingMandatory ? (
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs flex items-center gap-1">
                            <i className="fas fa-exclamation-circle text-[9px]" />
                            Mandatory Mapping Required
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Adjusting Columns
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-dark-muted font-medium mt-0.5">
                        {missingMandatory ? (
                          <span>
                            The required column(s){' '}
                            <strong className="text-rose-700 font-black">
                              {missingFieldNames.join(' and ')}
                            </strong>{' '}
                            were not detected automatically in{' '}
                            <strong className="text-dark-primary">{fileName || 'your file'}</strong>.
                            Please select the matching columns below to proceed:
                          </span>
                        ) : (
                          <span>
                            Review or adjust how columns from{' '}
                            <strong className="text-dark-primary">{fileName || 'your file'}</strong>{' '}
                            are mapped to attendance fields:
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {!missingMandatory && (
                    <button
                      type="button"
                      onClick={() => setShowMappingPanel(false)}
                      className="text-xs text-dark-muted hover:text-dark-primary font-bold px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  )}
                </div>

                {/* Error banner if any */}
                {mappingError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
                    <i className="fas fa-exclamation-triangle shrink-0 text-sm" />
                    <span>{mappingError}</span>
                  </div>
                )}

                {/* Mapping Selectors Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                  {/* 1. Admission Number (Mandatory) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-dark-primary flex items-center justify-between">
                      <span>Admission No</span>
                      <span className="text-rose-600 font-bold text-[10px]">* Required</span>
                    </label>
                    <select
                      value={columnMapping.admission_no}
                      onChange={(e) => {
                        setColumnMapping((prev) => ({ ...prev, admission_no: e.target.value }));
                        setMappingError('');
                      }}
                      className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-white outline-none transition-all cursor-pointer ${
                        columnMapping.admission_no
                          ? 'border-emerald-500 ring-2 ring-emerald-100 text-dark-primary'
                          : 'border-rose-400 ring-2 ring-rose-200 text-rose-700 font-bold'
                      }`}
                    >
                      <option value="">-- Select Column --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-dark-muted block">Student ID or Roll No</span>
                  </div>

                  {/* 2. Present Days (Mandatory) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-dark-primary flex items-center justify-between">
                      <span>Present Days</span>
                      <span className="text-rose-600 font-bold text-[10px]">* Required</span>
                    </label>
                    <select
                      value={columnMapping.present}
                      onChange={(e) => {
                        setColumnMapping((prev) => ({ ...prev, present: e.target.value }));
                        setMappingError('');
                      }}
                      className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-white outline-none transition-all cursor-pointer ${
                        columnMapping.present
                          ? 'border-emerald-500 ring-2 ring-emerald-100 text-dark-primary'
                          : 'border-rose-400 ring-2 ring-rose-200 text-rose-700 font-bold'
                      }`}
                    >
                      <option value="">-- Select Column --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-dark-muted block">Days attended / present</span>
                  </div>

                  {/* 3. Absent Days (Optional) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-dark-primary flex items-center justify-between">
                      <span>Absent Days</span>
                      <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                    </label>
                    <select
                      value={columnMapping.absent}
                      onChange={(e) => {
                        setColumnMapping((prev) => ({ ...prev, absent: e.target.value }));
                        setMappingError('');
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-light-border bg-white text-dark-primary outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Optional / None --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-dark-muted block">Days absent from school</span>
                  </div>

                  {/* 4. On Leave Days (Optional) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-dark-primary flex items-center justify-between">
                      <span>On Leave Days</span>
                      <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                    </label>
                    <select
                      value={columnMapping.on_leave}
                      onChange={(e) => {
                        setColumnMapping((prev) => ({ ...prev, on_leave: e.target.value }));
                        setMappingError('');
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-light-border bg-white text-dark-primary outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Optional / None --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-dark-muted block">Approved / medical leaves</span>
                  </div>

                  {/* 5. Total Working Days (Optional) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-dark-primary flex items-center justify-between">
                      <span>Working Days</span>
                      <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                    </label>
                    <select
                      value={columnMapping.total_days}
                      onChange={(e) => {
                        setColumnMapping((prev) => ({ ...prev, total_days: e.target.value }));
                        setMappingError('');
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-light-border bg-white text-dark-primary outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Optional / None --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-dark-muted block">Total working days in term</span>
                  </div>
                </div>

                {/* Data Preview Table of Uploaded File (First 5 rows) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-dark-primary tracking-wider flex items-center gap-1.5">
                      <i className="fas fa-eye text-emerald-600" />
                      <span>File Data Preview (First 5 Rows)</span>
                    </span>
                    <span className="text-[10px] text-dark-muted font-semibold">
                      Showing first {Math.min(5, rawRowsData.length)} of {rawRowsData.length} records in file
                    </span>
                  </div>
                  <div className="max-h-36 overflow-x-auto overflow-y-auto border border-light-border rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-light-border text-dark-muted font-bold">
                          <th className="py-1 px-2.5">#</th>
                          {detectedHeaders.map((h) => {
                            const isMappedAdm = columnMapping.admission_no === h;
                            const isMappedPres = columnMapping.present === h;
                            const isMappedAbs = columnMapping.absent === h;
                            const isMappedLeave = columnMapping.on_leave === h;
                            const isMappedTot = columnMapping.total_days === h;
                            const isAny =
                              isMappedAdm ||
                              isMappedPres ||
                              isMappedAbs ||
                              isMappedLeave ||
                              isMappedTot;
                            return (
                              <th
                                key={h}
                                className={`py-1 px-2.5 truncate max-w-[140px] ${
                                  isAny ? 'bg-emerald-50 text-emerald-950 font-black' : ''
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  <span>{h}</span>
                                  {isMappedAdm && (
                                    <span className="text-[9px] px-1 py-0.2 bg-emerald-600 text-white rounded font-bold">
                                      Adm
                                    </span>
                                  )}
                                  {isMappedPres && (
                                    <span className="text-[9px] px-1 py-0.2 bg-emerald-600 text-white rounded font-bold">
                                      Pres
                                    </span>
                                  )}
                                  {isMappedAbs && (
                                    <span className="text-[9px] px-1 py-0.2 bg-rose-600 text-white rounded font-bold">
                                      Abs
                                    </span>
                                  )}
                                  {isMappedLeave && (
                                    <span className="text-[9px] px-1 py-0.2 bg-amber-600 text-white rounded font-bold">
                                      Leave
                                    </span>
                                  )}
                                  {isMappedTot && (
                                    <span className="text-[9px] px-1 py-0.2 bg-blue-600 text-white rounded font-bold">
                                      Total
                                    </span>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-light-border text-dark-slate font-medium">
                        {rawRowsData.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/70">
                            <td className="py-1 px-2.5 text-dark-muted font-mono text-[10px]">
                              {rIdx + 1}
                            </td>
                            {detectedHeaders.map((h) => (
                              <td key={h} className="py-1 px-2.5 truncate max-w-[140px] font-mono">
                                {String(row[h] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-dark-slate font-semibold">
                      {columnMapping.admission_no && columnMapping.present ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <i className="fas fa-check-circle text-xs" />
                          Mandatory columns mapped: [Admission No: "{columnMapping.admission_no}", Present: "{columnMapping.present}"]
                        </span>
                      ) : (
                        <span className="text-amber-800 font-bold flex items-center gap-1">
                          <i className="fas fa-info-circle text-xs text-amber-600" />
                          Please select both Admission No and Present Days columns
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {missingMandatory && (
                      <button
                        type="button"
                        onClick={() => {
                          setFileName('');
                          setPasteContent('');
                          setRawRowsData([]);
                          setDetectedHeaders([]);
                          setMissingMandatory(false);
                          setShowMappingPanel(false);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-dark-muted hover:text-dark-primary rounded-xl border border-light-border hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Choose Different File
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleApplyMapping}
                      disabled={!columnMapping.admission_no || !columnMapping.present}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <i className="fas fa-check" />
                      <span>Apply Mapping &amp; Parse</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Parsed Rows Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-dark-primary uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fas fa-list-check text-emerald-600" />
                    <span>Preview Attendance Records ({parsedRows.length})</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-dark-muted font-semibold">
                      {parsedRows.filter((r) => r.isMatched).length} matched with enrolled students
                    </span>
                    {detectedHeaders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowMappingPanel((prev) => !prev)}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Adjust or reconfigure column mapping"
                      >
                        <i className="fas fa-table-columns text-[10px]" />
                        <span>{showMappingPanel ? 'Hide Mapping' : 'Adjust Mapping'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMainView('students')}
                      className="px-2.5 py-1 text-xs font-bold text-dark-slate hover:text-dark-primary bg-slate-100 hover:bg-slate-200 border border-light-border rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="View enrolled students table"
                    >
                      <i className="fas fa-users-viewfinder text-[10px]" />
                      <span>View in Students List</span>
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-light-border rounded-2xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-dark-muted font-black text-[10px] uppercase tracking-wider sticky top-0 border-b border-light-border">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Admission No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3 text-center">Present</th>
                        <th className="py-2.5 px-3 text-center">Absent</th>
                        <th className="py-2.5 px-3 text-center">On Leave</th>
                        <th className="py-2.5 px-3 text-center">Total Days</th>
                        <th className="py-2.5 px-3 text-center">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border font-medium">
                      {parsedRows.map((r, i) => (
                        <tr key={r.admission_no + i} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 text-dark-muted font-mono">{i + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-dark-primary">
                            {r.admission_no}
                          </td>
                          <td className="py-2 px-3 text-dark-slate">
                            {r.student_name}
                            {!r.isMatched && (
                              <span className="ml-1 text-[9px] text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                Unmatched
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-700 font-mono">
                            {r.present}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-rose-600 font-mono">
                            {r.absent}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-amber-600 font-mono">
                            {r.on_leave}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-dark-slate font-mono">
                            {r.total_days}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                                r.pct >= 90
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : r.pct >= 75
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {r.pct}%
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

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-light-border flex items-center justify-between shrink-0">
          {mainView === 'students' ? (
            <>
              <button
                type="button"
                onClick={() => setMainView('upload')}
                className="px-4 py-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <i className="fas fa-cloud-arrow-up text-xs" />
                <span>Upload Spreadsheet File Instead</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-dark-muted hover:text-dark-primary transition-colors cursor-pointer"
                >
                  Close
                </button>
                {Object.keys(unsavedEdits).length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveStudentEdits}
                    disabled={saving}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin text-xs" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check text-xs" />
                        <span>Save Changes ({Object.keys(unsavedEdits).length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMainView('students')}
                className="px-4 py-2 text-xs font-bold text-dark-slate hover:text-dark-primary bg-white hover:bg-slate-100 border border-light-border rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <i className="fas fa-users-viewfinder text-xs text-emerald-600" />
                <span>View Students &amp; Attendance ({kpis.recorded}/{kpis.total})</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-dark-muted hover:text-dark-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={parsedRows.length === 0 || saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-xs" />
                      <span>Saving Attendance...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-cloud-arrow-up text-xs" />
                      <span>Upload &amp; Save Attendance ({parsedRows.length})</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamAttendanceUploadModal;
