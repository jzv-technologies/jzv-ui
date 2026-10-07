import React from 'react';
import { DEFAULT_BLOCK_STYLE } from '../../report-card-designer/constants';

/**
 * renderStudentInfo
 * Print renderer for the student info block.
 * Extracted from the original ReportCardGenerator.jsx
 */
export const renderStudentInfo = ({ bleed, activeTemplate, studentInfoPrint }) => {
  if (!activeTemplate.showStudentInfo) return null;
  const flds = activeTemplate.studentFields || {};
  const stuCfg = activeTemplate.studentInfoConfig || {};
  const cols = stuCfg.columns || 4;
  const align = stuCfg.align || stuCfg.contentAlign || 'left';
  const textAlignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  const isCompact = stuCfg.size === 'compact';
  const siSt = { ...DEFAULT_BLOCK_STYLE, ...(stuCfg.style || {}) };
  const colClass = cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4';

  const siLabelStyle = {
    fontSize: `${studentInfoPrint.labelFontSize}px`,
    color: siSt.labelColor || '#64748b',
  };
  const siValueStyle = {
    fontSize: `${studentInfoPrint.contentFontSize}px`,
    color: siSt.contentColor || '#0f172a',
  };

  return (
    <div
      key="studentInfo"
      className={`grid grid-cols-2 ${colClass} ${textAlignClass} gap-2 rounded-xl border border-slate-200 ${
        isCompact ? 'p-2 text-[10px]' : 'p-3 text-xs'
      }`}
      style={bleed.innerBgStyle('#f8fafc')}
    >
      {flds.name && (
        <div>
          <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
            Student Name
          </span>
          <span className="font-black student-info-value" style={siValueStyle}>
            {''}
          </span>
        </div>
      )}
      {flds.admissionNo && (
        <div>
          <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
            Admission No
          </span>
          <span className="font-bold font-mono student-info-value" style={siValueStyle}>
            {''}
          </span>
        </div>
      )}
      {flds.className && (
        <div>
          <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
            Class / Grade
          </span>
          <span className="font-bold student-info-value" style={siValueStyle}>
            {''}
          </span>
        </div>
      )}
      {flds.rollNo && (
        <div>
          <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
            Roll No
          </span>
          <span className="font-bold font-mono student-info-value" style={siValueStyle}>
            {''}
          </span>
        </div>
      )}
      {flds.fatherName && (
        <div>
          <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
            Father / Guardian
          </span>
          <span className="font-bold student-info-value" style={siValueStyle}>
            {''}
          </span>
        </div>
      )}
      {flds.dob && (
        <div>
          <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
            Date of Birth
          </span>
          <span className="font-bold font-mono student-info-value" style={siValueStyle}>
            {''}
          </span>
        </div>
      )}
      {flds.gender && (
        <div>
          <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
            Gender
          </span>
          <span className="font-bold student-info-value" style={siValueStyle}>
            {''}
          </span>
        </div>
      )}
      {flds.bloodGroup && (
        <div>
          <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
            Blood Group
          </span>
          <span className="font-bold font-mono student-info-value" style={siValueStyle}>
            {''}
          </span>
        </div>
      )}
      {flds.attendance && (
        <div>
          <span className="font-bold uppercase block student-info-label" style={siLabelStyle}>
            Attendance
          </span>
          <span className="font-bold font-mono student-info-value" style={{ ...siValueStyle, color: siSt.contentColor || '#047857' }}>
            {''}
          </span>
        </div>
      )}
    </div>
  );
};