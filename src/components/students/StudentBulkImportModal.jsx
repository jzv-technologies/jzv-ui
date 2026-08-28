import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { showToast } from '../../utils/toast';

const IMPORTABLE_COLUMNS = [
  { key: 'student_name', label: 'Student Name' },
  { key: 'father_name', label: 'Father Name' },
  { key: 'mobile1', label: 'Mobile 1' },
  { key: 'mobile2', label: 'Mobile 2' },
  { key: 'birth_date', label: 'Birth Date' },
  { key: 'blood_group', label: 'Blood Group' },
  { key: 'area', label: 'Area' },
  { key: 'transport_point', label: 'Transport Point' },
  { key: 'edsoft_id', label: 'Edsoft ID' },
  { key: 'class_id', label: 'Class' },
  { key: 'photo_id', label: 'Photo ID' },
  { key: 'hostel', label: 'Hostel' },
];

const StudentBulkImportModal = ({
  isOpen,
  onClose,
  existingStudents = [],
  classes = [],
  onImportSuccess,
  isSupabaseMode = true,
}) => {
  const [activeInputTab, setActiveInputTab] = useState('file'); // 'file' | 'paste'
  const [fileName, setFileName] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [updateMode, setUpdateMode] = useState('full'); // 'full' | 'selected'
  const [selectedColumns, setSelectedColumns] = useState(
    IMPORTABLE_COLUMNS.map((c) => c.key)
  );
  const [importing, setImporting] = useState(false);

  // Toggle single column for 'selected' update mode
  const handleToggleColumn = (colKey) => {
    setSelectedColumns((prev) =>
      prev.includes(colKey) ? prev.filter((k) => k !== colKey) : [...prev, colKey]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(IMPORTABLE_COLUMNS.map((c) => c.key));
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  // Helper to normalize strings for comparison
  const normalize = (str) => String(str || '').trim().toLowerCase();

  // Helper to resolve Class ID from string or number (ID or Name)
  const resolveClassId = (classVal) => {
    if (!classVal) return null;
    const str = String(classVal).trim();
    // 1. Direct ID match
    const directMatch = classes.find((c) => String(c.id) === str);
    if (directMatch) return directMatch.id;

    // 2. Name match (case-insensitive)
    const nameMatch = classes.find(
      (c) => normalize(c.name) === normalize(str)
    );
    if (nameMatch) return nameMatch.id;

    return classVal;
  };

  // Parse raw JSON rows from XLSX / CSV into standard schema objects
  const processRawData = (rawRows) => {
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      showToast('No data rows found in the file.', 'error');
      setParsedRows([]);
      return;
    }

    const processed = [];
    const existingAdmMap = new Map();
    existingStudents.forEach((std) => {
      if (std.admission_no) {
        existingAdmMap.set(normalize(std.admission_no), std);
      }
    });

    rawRows.forEach((row, idx) => {
      // Find values with flexible key naming
      const getVal = (...keys) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
            return String(row[k]).trim();
          }
        }
        return '';
      };

      const admission_no = getVal('admission_no', 'Admission No', 'Admission Number', 'Adm No', 'adm_no');
      const student_name = getVal('student_name', 'Student Name', 'Name', 'name', 'student');
      const father_name = getVal(
        'father_name',
        'Father Name',
        'guardian_name',
        'Guardian Name',
        'Father / Guardian Name',
        'Parent Name',
        'parent_name'
      );
      const mobile1 = getVal('mobile1', 'Mobile 1', 'Mobile1', 'Primary Mobile', 'Mobile', 'Phone', 'mobile');
      const mobile2 = getVal('mobile2', 'Mobile 2', 'Mobile2', 'Secondary Mobile', 'Alt Mobile');
      let birth_date = getVal('birth_date', 'Birth Date', 'DOB', 'Date of Birth', 'birthdate');
      
      // Handle Excel date numbers if applicable
      if (birth_date && typeof row['birth_date'] === 'number') {
        try {
          const dateObj = XLSX.SSF.parse_date_code(row['birth_date']);
          if (dateObj) {
            birth_date = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
          }
        } catch (_) {}
      }

      const blood_group = getVal('blood_group', 'Blood Group', 'BloodGroup', 'blood');
      const area = getVal('area', 'Area', 'Location', 'Address Area');
      const transport_point = getVal('transport_point', 'Transport Point', 'Transport', 'Bus Point', 'Route');
      const edsoft_id = getVal('edsoft_id', 'Edsoft ID', 'EdsoftId', 'EDSOFT ID');
      const rawClass = getVal('class_id', 'Class', 'Class ID', 'Class Name', 'grade');
      const class_id = resolveClassId(rawClass);
      const photo_id = getVal('photo_id', 'Photo ID', 'PhotoId', 'Photo', 'photo');
      const hostelVal = getVal('hostel', 'Hostel', 'Hostel Accommodation');
      const hostel = ['yes', 'y', 'true', '1'].includes(normalize(hostelVal))
        ? 'Yes'
        : ['no', 'n', 'false', '0'].includes(normalize(hostelVal))
        ? 'No'
        : hostelVal || 'No';

      if (!admission_no) {
        // Skip empty rows
        return;
      }

      const matchedExisting = existingAdmMap.get(normalize(admission_no));
      const isUpdate = !!matchedExisting;

      processed.push({
        rowIndex: idx + 1,
        admission_no,
        student_name: student_name || (matchedExisting ? matchedExisting.student_name : ''),
        father_name: father_name || (matchedExisting ? (matchedExisting.father_name || matchedExisting.guardian_name) : ''),
        mobile1,
        mobile2,
        birth_date,
        blood_group,
        area,
        transport_point,
        edsoft_id,
        class_id,
        photo_id,
        hostel,
        isUpdate,
        existingId: matchedExisting?.id,
        existingRecord: matchedExisting,
      });
    });

    setParsedRows(processed);
    if (processed.length > 0) {
      showToast(`Parsed ${processed.length} students successfully.`, 'success');
    } else {
      showToast('No valid student rows found (Admission No is required for each row).', 'error');
    }
  };

  // Handle File Change
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
        processRawData(rawData);
      } catch (err) {
        showToast('Error reading file: ' + err.message, 'error');
        setParsedRows([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Handle Paste CSV
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
      processRawData(rawData);
    } catch (err) {
      showToast('Error parsing CSV text: ' + err.message, 'error');
      setParsedRows([]);
    }
  };

  // Download Sample Template (.csv)
  const handleDownloadTemplateCsv = () => {
    const headers = [
      'admission_no',
      'student_name',
      'father_name',
      'mobile1',
      'mobile2',
      'birth_date',
      'blood_group',
      'area',
      'transport_point',
      'edsoft_id',
      'class_id',
      'photo_id',
      'hostel',
    ];

    const sampleRow1 = [
      '105',
      'Ayaan Khan',
      'Farooq Khan',
      '9876543210',
      '9876543211',
      '2015-06-15',
      'O+',
      'Central Colony',
      'Main Gate',
      'ED-10005',
      classes[0]?.name || 'Class 1',
      'PH-105',
      'No',
    ];

    const sampleRow2 = [
      '101',
      'Zayd Ahmed',
      'Abdur Rahman',
      '7339398700',
      '9876543220',
      '2015-05-12',
      'B+',
      'Downtown Area',
      'Point A',
      'ED-10001',
      classes[0]?.name || 'Class 1',
      'PH-101',
      'Yes',
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), sampleRow1.join(','), sampleRow2.join(',')].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'students_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Sample Template (.xlsx)
  const handleDownloadTemplateXlsx = () => {
    const rows = [
      {
        admission_no: '105',
        student_name: 'Ayaan Khan',
        father_name: 'Farooq Khan',
        mobile1: '9876543210',
        mobile2: '9876543211',
        birth_date: '2015-06-15',
        blood_group: 'O+',
        area: 'Central Colony',
        transport_point: 'Main Gate',
        edsoft_id: 'ED-10005',
        class_id: classes[0]?.name || 'Class 1',
        photo_id: 'PH-105',
        hostel: 'No',
      },
      {
        admission_no: '101',
        student_name: 'Zayd Ahmed',
        father_name: 'Abdur Rahman',
        mobile1: '7339398700',
        mobile2: '9876543220',
        birth_date: '2015-05-12',
        blood_group: 'B+',
        area: 'Downtown Area',
        transport_point: 'Point A',
        edsoft_id: 'ED-10001',
        class_id: classes[0]?.name || 'Class 1',
        photo_id: 'PH-101',
        hostel: 'Yes',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'students_import_template.xlsx');
  };

  // Execute Import Submit
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      showToast('No students parsed for import.', 'error');
      return;
    }

    if (updateMode === 'selected' && selectedColumns.length === 0) {
      showToast('Please select at least one column to update for existing records.', 'error');
      return;
    }

    setImporting(true);
    try {
      await onImportSuccess({
        rows: parsedRows,
        updateMode,
        selectedColumns,
      });
      onClose();
    } catch (err) {
      showToast('Import failed: ' + err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const updateCount = useMemo(() => parsedRows.filter((r) => r.isUpdate).length, [parsedRows]);
  const newCount = useMemo(() => parsedRows.filter((r) => !r.isUpdate).length, [parsedRows]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left my-6">
        {/* Header */}
        <div className="p-6 bg-green-dark text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <i className="fas fa-file-import"></i> Bulk Import Students
            </h3>
            <p className="text-xs opacity-80 mt-0.5">
              Import student profiles via Excel/CSV. Existing admission numbers will update; new ones will be created.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all text-white font-bold"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Source Tabs & Template Download */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-light-border pb-4">
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveInputTab('file')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeInputTab === 'file'
                    ? 'bg-white text-dark-primary shadow-sm'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-file-excel mr-1.5 text-emerald-600"></i> File Upload
              </button>
              <button
                type="button"
                onClick={() => setActiveInputTab('paste')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeInputTab === 'paste'
                    ? 'bg-white text-dark-primary shadow-sm'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-paste mr-1.5 text-blue-600"></i> Paste CSV
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-dark-muted hidden sm:inline">Templates:</span>
              <button
                type="button"
                onClick={handleDownloadTemplateCsv}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95"
              >
                <i className="fas fa-download"></i> .CSV Template
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplateXlsx}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95"
              >
                <i className="fas fa-file-excel"></i> .XLSX Template
              </button>
            </div>
          </div>

          {/* Tab 1: File Upload */}
          {activeInputTab === 'file' && (
            <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-2xl p-6 text-center space-y-3">
              <i className="fas fa-cloud-arrow-up text-3xl text-emerald-600 mb-1"></i>
              <div>
                <p className="text-xs font-bold text-dark-primary">
                  {fileName ? (
                    <span className="text-emerald-700">Selected File: {fileName}</span>
                  ) : (
                    'Upload an Excel (.xlsx, .xls) or CSV file'
                  )}
                </p>
                <p className="text-[11px] text-dark-muted mt-0.5">
                  Headers will automatically be mapped to student properties.
                </p>
              </div>
              <label className="cursor-pointer bg-green-dark hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-extrabold text-xs inline-flex items-center gap-2 shadow-sm transition-all active:scale-95">
                <i className="fas fa-folder-open"></i> Choose File
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Tab 2: Paste CSV */}
          {activeInputTab === 'paste' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-dark-deepblue">
                Paste CSV or Tab-Separated Data
              </label>
              <textarea
                rows={4}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="admission_no,student_name,father_name,mobile1,mobile2,birth_date,blood_group,area,transport_point,edsoft_id,class_id,photo_id,hostel..."
                className="w-full p-3 font-mono text-xs border border-light-border rounded-xl focus:border-green-dark focus:ring-4 focus:ring-green-50 outline-none transition-all"
              />
              <button
                type="button"
                onClick={handleParsePaste}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95"
              >
                <i className="fas fa-cog"></i> Parse CSV Text
              </button>
            </div>
          )}

          {/* Update Mode Selection */}
          <div className="bg-gray-50/80 border border-light-border rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <h4 className="text-xs font-black text-dark-deepblue uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-sliders text-emerald-600"></i> Existing Records Update Mode
              </h4>
              <p className="text-[11px] text-dark-muted font-medium mt-0.5">
                Choose how existing students (matching Admission No) should be updated. New students will always be created with all provided columns.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Update Option */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  updateMode === 'full'
                    ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white border-light-border hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="updateMode"
                  value="full"
                  checked={updateMode === 'full'}
                  onChange={() => setUpdateMode('full')}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <span className="text-xs font-extrabold text-dark-primary block">
                    Full Update (All Columns)
                  </span>
                  <span className="text-[11px] text-dark-muted leading-tight block mt-0.5">
                    Overwrites all student fields from the import file for existing admission numbers.
                  </span>
                </div>
              </label>

              {/* Selected Columns Update Option */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  updateMode === 'selected'
                    ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white border-light-border hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="updateMode"
                  value="selected"
                  checked={updateMode === 'selected'}
                  onChange={() => setUpdateMode('selected')}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <span className="text-xs font-extrabold text-dark-primary block">
                    Selected Columns Only
                  </span>
                  <span className="text-[11px] text-dark-muted leading-tight block mt-0.5">
                    Update only chosen fields for existing records, preserving other existing values.
                  </span>
                </div>
              </label>
            </div>

            {/* Column Checkboxes (Only shown if 'selected' mode is active) */}
            {updateMode === 'selected' && (
              <div className="pt-3 border-t border-light-border/80 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-dark-deepblue">
                    Choose columns to update for existing records:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllColumns}
                      className="text-[10px] font-bold text-emerald-700 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllColumns}
                      className="text-[10px] font-bold text-gray-500 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {IMPORTABLE_COLUMNS.map((col) => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        selectedColumns.includes(col.key)
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-white border-light-border text-dark-muted hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(col.key)}
                        onChange={() => handleToggleColumn(col.key)}
                        className="rounded accent-emerald-600"
                      />
                      <span className="truncate">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-black text-dark-primary flex items-center gap-2">
                  <span>Import Preview ({parsedRows.length} Rows Detected)</span>
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    <i className="fas fa-sync-alt text-[9px]"></i> {updateCount} Update(s)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <i className="fas fa-plus text-[9px]"></i> {newCount} New Student(s)
                  </span>
                </div>
              </div>

              <div className="border border-light-border rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs font-semibold">
                  <thead className="bg-gray-100 border-b border-light-border text-[10px] uppercase tracking-wider text-dark-muted sticky top-0 bg-gray-100">
                    <tr>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Admission No</th>
                      <th className="p-2.5">Student Name</th>
                      <th className="p-2.5">Father Name</th>
                      <th className="p-2.5">Class</th>
                      <th className="p-2.5">Mobile 1</th>
                      <th className="p-2.5">Blood Group</th>
                      <th className="p-2.5">Area</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border">
                    {parsedRows.map((r, i) => {
                      const clsObj = classes.find((c) => String(c.id) === String(r.class_id));
                      return (
                        <tr key={i} className={r.isUpdate ? 'bg-blue-50/30' : ''}>
                          <td className="p-2.5">
                            {r.isUpdate ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
                                <i className="fas fa-sync-alt text-[8px]"></i> UPDATE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                                <i className="fas fa-plus text-[8px]"></i> NEW
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-bold text-dark-primary">{r.admission_no}</td>
                          <td className="p-2.5 font-bold text-dark-primary">{r.student_name || '—'}</td>
                          <td className="p-2.5 text-dark-soft">{r.father_name || '—'}</td>
                          <td className="p-2.5 text-dark-soft">{clsObj ? clsObj.name : r.class_id || '—'}</td>
                          <td className="p-2.5 text-dark-soft">{r.mobile1 || '—'}</td>
                          <td className="p-2.5 text-dark-soft">{r.blood_group || '—'}</td>
                          <td className="p-2.5 text-dark-soft">{r.area || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-light-border bg-gray-50 flex justify-between items-center gap-3 shrink-0 rounded-b-[2rem]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-light-border hover:bg-gray-100 text-dark-deepblue rounded-xl font-bold text-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0 || importing}
            onClick={handleExecuteImport}
            className="px-6 py-2.5 bg-green-dark hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-green-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {importing ? (
              <>
                <i className="fas fa-spinner animate-spin"></i> Processing Import...
              </>
            ) : (
              <>
                <i className="fas fa-check-circle"></i> Confirm Import ({parsedRows.length} Students)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentBulkImportModal;
