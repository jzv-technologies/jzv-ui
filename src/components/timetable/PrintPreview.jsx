// src/components/timetable/PrintPreview.jsx
/**
 * PrintPreview Component
 * On-screen preview of the printable sheet. Renders the exact same TimetableSheet used by the
 * print document, so what is previewed is what is printed.
 */

import React from 'react';
import TimetableSheet from './TimetableSheet';

const PrintPreview = ({ timetableData, settings, variant = 'class', className = '' }) => (
  <div className={`bg-gray-100 p-4 sm:p-6 flex items-start justify-center ${className}`}>
    <TimetableSheet timetableData={timetableData} settings={settings} variant={variant} />
  </div>
);

export default PrintPreview;
