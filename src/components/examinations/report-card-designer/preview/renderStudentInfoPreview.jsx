import React from 'react';
import { DEFAULT_BLOCK_STYLE, PREVIEW_STUDENT } from '../constants';

/**
 * renderStudentInfoPreview
 * Live-preview renderer for one report-card block.
 * This is a render function (not a component): it returns null when the block is hidden/empty so
 * PreviewPanel can skip the block wrapper, exactly like the original switch statement did.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
export const renderStudentInfoPreview = ({ bleed, blockSize, currentConfig }) => {
  if (!currentConfig.showStudentInfo) return null;
  const flds = currentConfig.studentFields || {};
  const cols = currentConfig.studentInfoConfig?.columns || 4;
  const isCompact = blockSize === 'compact';
  const siSt = {
    ...DEFAULT_BLOCK_STYLE,
    ...(currentConfig.studentInfoConfig?.style || {}),
  };
  const colClass = cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4';

  // Reusable label/value style for studentInfo fields
  const siLabelStyle = {
    fontSize: `${siSt.labelFontSize || 9}px`,
    color: siSt.labelColor || '#64748b',
  };
  const siValueStyle = {
    fontSize: `${siSt.contentFontSize || 11}px`,
    color: siSt.contentColor || '#0f172a',
  };

  return (
    <div
      key="studentInfo"
      className={`grid grid-cols-2 ${colClass} gap-2 rounded-xl border border-slate-200 ${
        isCompact ? 'p-2 text-[10px]' : 'p-3 text-xs'
      }`}
      style={bleed.innerBgStyle('#f8fafc')}
    >
      {flds.name && (
        <div>
          <span className="font-bold uppercase block" style={siLabelStyle}>
            Student Name
          </span>
          <span className="font-black" style={siValueStyle}>
            {PREVIEW_STUDENT.student_name}
          </span>
        </div>
      )}
      {flds.admissionNo && (
        <div>
          <span className="font-bold uppercase block" style={siLabelStyle}>
            Admission No
          </span>
          <span className="font-bold font-mono" style={siValueStyle}>
            {PREVIEW_STUDENT.admission_no}
          </span>
        </div>
      )}
      {flds.className && (
        <div>
          <span className="font-bold uppercase block" style={siLabelStyle}>
            Class / Grade
          </span>
          <span className="font-bold" style={siValueStyle}>
            {PREVIEW_STUDENT.class_name}
          </span>
        </div>
      )}
      {flds.rollNo && (
        <div>
          <span className="font-bold uppercase block" style={siLabelStyle}>
            Roll No
          </span>
          <span className="font-bold font-mono" style={siValueStyle}>
            #{PREVIEW_STUDENT.roll_no}
          </span>
        </div>
      )}
      {flds.fatherName && (
        <div>
          <span className="font-bold uppercase block" style={siLabelStyle}>
            Father / Guardian
          </span>
          <span className="font-bold" style={siValueStyle}>
            {PREVIEW_STUDENT.father_name}
          </span>
        </div>
      )}
      {flds.dob && (
        <div>
          <span className="font-bold uppercase block" style={siLabelStyle}>
            Date of Birth
          </span>
          <span className="font-bold font-mono" style={siValueStyle}>
            {PREVIEW_STUDENT.dob}
          </span>
        </div>
      )}
      {flds.gender && (
        <div>
          <span className="font-bold uppercase block" style={siLabelStyle}>
            Gender
          </span>
          <span className="font-bold" style={siValueStyle}>
            {PREVIEW_STUDENT.gender}
          </span>
        </div>
      )}
      {flds.bloodGroup && (
        <div>
          <span className="font-bold uppercase block" style={siLabelStyle}>
            Blood Group
          </span>
          <span className="font-bold font-mono" style={siValueStyle}>
            {PREVIEW_STUDENT.blood_group}
          </span>
        </div>
      )}
      {flds.attendance && (
        <div>
          <span className="font-bold uppercase block" style={siLabelStyle}>
            Attendance
          </span>
          <span
            className="font-bold font-mono"
            style={{
              ...siValueStyle,
              color: siSt.contentColor || '#047857',
            }}
          >
            {PREVIEW_STUDENT.attendance}
          </span>
        </div>
      )}
    </div>
  );
};
