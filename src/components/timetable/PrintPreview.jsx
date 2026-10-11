// src/components/timetable/PrintPreview.jsx
/**
 * PrintPreview Component
 * On-screen preview of the printable sheet(s). Renders the exact same TimetableSheet used by the
 * print document, so what is previewed is what is printed. When several datasets are given (one
 * per class) the sheets are stacked in the same order the pages will be printed.
 */

import React from 'react';
import TimetableSheet from './TimetableSheet';

const PrintPreview = ({ timetableData, datasets = null, settings, variant = 'class', className = '' }) => {
  const sheets = datasets && datasets.length > 0 ? datasets : timetableData ? [timetableData] : [];

  return (
    <div className={`bg-gray-100 p-4 sm:p-6 flex flex-col items-center gap-6 ${className}`}>
      {sheets.map((data, idx) => (
        <TimetableSheet
          key={data?.classId ?? data?.entityName ?? idx}
          timetableData={data}
          settings={settings}
          variant={variant}
        />
      ))}
    </div>
  );
};

export default PrintPreview;
