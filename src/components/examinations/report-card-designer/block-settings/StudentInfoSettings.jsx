import React from 'react';
import MultiSelectDropdown from '../../../MultiSelectDropdown';

/**
 * StudentInfoSettings
 * Block-specific settings for the student details block.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const StudentInfoSettings = ({ currentConfig, setCurrentConfig }) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <MultiSelectDropdown
            label="Details to Display"
            placeholder="Select student details..."
            options={[
              { id: 'name', label: 'Student Full Name' },
              { id: 'admissionNo', label: 'Admission / ID Number' },
              { id: 'className', label: 'Class & Section' },
              { id: 'rollNo', label: 'Roll Number' },
              { id: 'fatherName', label: 'Father / Guardian Name' },
              { id: 'dob', label: 'Date of Birth (DOB)' },
              { id: 'gender', label: 'Gender' },
              { id: 'bloodGroup', label: 'Blood Group' },
              { id: 'attendance', label: 'Attendance Percentage' },
            ]}
            selected={Object.keys(currentConfig.studentFields || {}).filter(
              (k) => currentConfig.studentFields[k]
            )}
            onChange={(selectedIds) => {
              const arr = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
              const allKeys = [
                'name',
                'admissionNo',
                'className',
                'rollNo',
                'fatherName',
                'dob',
                'gender',
                'bloodGroup',
                'attendance',
              ];
              const updatedFields = {};
              allKeys.forEach((k) => {
                updatedFields[k] = arr.includes(k);
              });
              setCurrentConfig((prev) => ({
                ...prev,
                studentFields: updatedFields,
              }));
            }}
            icon="fa-id-card"
            fullWidth={true}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-end sm:self-auto">
          {/* Content Alignment */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-dark-muted">Align:</span>
            {[
              { id: 'left', label: 'Left', icon: 'fa-align-left' },
              { id: 'center', label: 'Center', icon: 'fa-align-center' },
              { id: 'right', label: 'Right', icon: 'fa-align-right' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setCurrentConfig((prev) => ({
                    ...prev,
                    studentInfoConfig: {
                      ...prev.studentInfoConfig,
                      align: item.id,
                    },
                  }))
                }
                title={`Align content ${item.label}`}
                className={`px-2 py-1 rounded-lg text-[10px] font-black border cursor-pointer transition-all flex items-center gap-1 ${
                  (currentConfig.studentInfoConfig?.align || 'left') === item.id
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-white text-dark-slate border-light-border hover:bg-slate-50'
                }`}
              >
                <i className={`fas ${item.icon}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Grid Columns */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-dark-muted">Grid:</span>
            {[2, 3, 4].map((col) => (
              <button
                key={col}
                type="button"
                onClick={() =>
                  setCurrentConfig((prev) => ({
                    ...prev,
                    studentInfoConfig: {
                      ...prev.studentInfoConfig,
                      columns: col,
                    },
                  }))
                }
                className={`px-2 py-1 rounded-lg text-[10px] font-black border cursor-pointer transition-all ${
                  (currentConfig.studentInfoConfig?.columns || 4) === col
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-white text-dark-slate border-light-border hover:bg-slate-50'
                }`}
              >
                {col} Cols
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInfoSettings;
