// src/components/examinations/OfflineMarkSheetModal.jsx
import React, { useState } from 'react';

/**
 * OfflineMarkSheetModal
 * Allows coordinators and teachers to print a manual mark entry sheet for paper-based
 * invigilation or evaluation.
 * 
 * Features:
 * - Option to show or hide subject names in the column headers
 * - Orientation selector (Portrait / Landscape)
 * - Clean ruled layout with generous writing boxes
 * - Signature footers for teacher, invigilator, and principal
 */
const OfflineMarkSheetModal = ({
  isOpen,
  onClose,
  schedule,
  selectedClass,
  subjects = [],
  students = [],
  schoolName = 'Jamia Zaytoonah High School',
}) => {
  const [showSubjectNames, setShowSubjectNames] = useState(true);
  const [orientation, setOrientation] = useState(subjects.length > 5 ? 'landscape' : 'portrait');
  const [blankSubjectCount, setBlankSubjectCount] = useState(5);
  const [extraBlankRows, setExtraBlankRows] = useState(2);

  if (!isOpen) return null;

  // Decide columns to display
  const subjectColumns = showSubjectNames && subjects.length > 0
    ? subjects
    : Array.from({ length: subjects.length > 0 ? subjects.length : blankSubjectCount }, (_, i) => ({
        id: `blank_${i + 1}`,
        name: `Subject ${i + 1}`,
        isBlank: true,
      }));

  // Extra blank rows for walk-ins or unlisted students
  const blankRows = Array.from({ length: Number(extraBlankRows) || 0 }, (_, i) => ({
    id: `extra_${i + 1}`,
    roll_no: '',
    admission_no: '',
    student_name: '',
    isExtra: true,
  }));

  const allDisplayStudents = [...students, ...blankRows];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Dynamic print stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 8mm !important;
          }
          body * {
            visibility: hidden !important;
          }
          #offline-print-sheet, #offline-print-sheet * {
            visibility: visible !important;
          }
          #offline-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print-modal-controls {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Container */}
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-light-border bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print-modal-controls">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm shadow-2xs shrink-0">
              <i className="fas fa-print" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-dark-primary">
                Print Offline Marks Sheet
              </h3>
              <p className="text-[11px] font-semibold text-dark-muted">
                {selectedClass?.name || 'Class'} · {schedule?.name || 'Examination'}
              </p>
            </div>
          </div>

          {/* Quick Config Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Show / Hide Subject Name Toggle */}
            <label className="flex items-center gap-2 text-xs font-bold text-dark-slate cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-light-border shadow-2xs hover:bg-slate-50 select-none">
              <input
                type="checkbox"
                checked={showSubjectNames}
                onChange={(e) => setShowSubjectNames(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Show Subject Names</span>
            </label>

            {/* Orientation Pills */}
            <div className="flex items-center bg-white border border-light-border rounded-xl p-1 shadow-2xs text-xs font-bold">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                Landscape
              </button>
            </div>

            {/* Print Action Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <i className="fas fa-print text-xs" />
              <span>Print Sheet</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-light-border text-dark-muted hover:bg-slate-200 hover:text-dark-primary flex items-center justify-center transition-all cursor-pointer"
            >
              <i className="fas fa-times text-xs" />
            </button>
          </div>
        </div>

        {/* Printable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          <div
            id="offline-print-sheet"
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 max-w-4xl mx-auto space-y-4"
          >
            {/* Sheet Header */}
            <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                {schoolName}
              </h1>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
                Manual Examination Mark Entry Register
              </h2>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 pt-2 px-1 flex-wrap gap-2">
                <span>
                  Examination: <strong className="font-black">{schedule?.name || '—'}</strong>
                </span>
                <span>
                  Class & Section: <strong className="font-black">{selectedClass?.name || '—'}</strong>
                </span>
                <span>
                  Date: <span className="underline decoration-dotted font-normal">____________________</span>
                </span>
                <span>
                  Max Marks: <span className="underline decoration-dotted font-normal">___________</span>
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-slate-900 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-900">
                    <th className="border border-slate-900 py-2 px-1.5 text-center w-10">S.No</th>
                    <th className="border border-slate-900 py-2 px-2 text-center w-14">Roll</th>
                    <th className="border border-slate-900 py-2 px-2 text-center w-24">Adm No</th>
                    <th className="border border-slate-900 py-2 px-2.5 text-left min-w-[140px]">
                      Student Name
                    </th>
                    {subjectColumns.map((sub, idx) => (
                      <th
                        key={sub.id || idx}
                        className="border border-slate-900 py-2 px-1.5 text-center min-w-[75px]"
                      >
                        {showSubjectNames && !sub.isBlank ? (
                          <div>
                            <span className="block font-black leading-tight">{sub.name}</span>
                            {sub.max_marks && (
                              <span className="text-[9px] font-normal text-slate-600 block">
                                (Max: {sub.max_marks})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="py-1">
                            <span className="text-[9px] text-slate-500 font-normal block">Subject</span>
                            <span className="inline-block w-14 border-b border-slate-400 mt-1">&nbsp;</span>
                          </div>
                        )}
                      </th>
                    ))}
                    <th className="border border-slate-900 py-2 px-2 text-center w-16">Total</th>
                    <th className="border border-slate-900 py-2 px-2 text-center w-20">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {allDisplayStudents.map((student, idx) => (
                    <tr
                      key={student.id}
                      className={`h-8 border-b border-slate-300 ${
                        idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                      }`}
                    >
                      <td className="border border-slate-300 py-1 px-1.5 text-center font-mono text-[11px] text-slate-700">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 py-1 px-1 text-center font-mono text-[11px]">
                        {student.roll_no || ''}
                      </td>
                      <td className="border border-slate-300 py-1 px-1 text-center font-mono text-[11px]">
                        {student.admission_no || ''}
                      </td>
                      <td className="border border-slate-300 py-1 px-2.5 font-bold text-slate-900 truncate max-w-[180px]">
                        {student.student_name || ''}
                      </td>
                      {subjectColumns.map((sub, cIdx) => (
                        <td
                          key={sub.id || cIdx}
                          className="border border-slate-300 py-1 px-1 text-center font-mono"
                        >
                          &nbsp;
                        </td>
                      ))}
                      <td className="border border-slate-300 py-1 px-1 text-center">&nbsp;</td>
                      <td className="border border-slate-300 py-1 px-1 text-center">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature Footer */}
            <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-800">
              <div className="border-t border-slate-900 pt-1.5">
                <span>Subject Teacher Signature</span>
              </div>
              <div className="border-t border-slate-900 pt-1.5">
                <span>Invigilator Signature</span>
              </div>
              <div className="border-t border-slate-900 pt-1.5">
                <span>Principal / Exam Coordinator</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineMarkSheetModal;
