// src/components/timetable/PrintDocument.jsx
/**
 * PrintDocument Component
 * The dedicated print output, rendered through a portal directly under <body>. Living outside
 * the app tree means no ancestor can clip it, so every column prints. Several datasets (one per
 * class) produce one sheet per page.
 */

import { createPortal } from 'react-dom';
import TimetableSheet from './TimetableSheet';

const PrintDocument = ({ timetableData, datasets = null, settings, variant = 'class' }) => {
  if (typeof document === 'undefined') return null;

  const sheets = datasets && datasets.length > 0 ? datasets : timetableData ? [timetableData] : [];
  if (sheets.length === 0) return null;

  return createPortal(
    <div className="timetable-print-area">
      {sheets.map((data, idx) => (
        <TimetableSheet
          key={data?.classId ?? data?.entityName ?? idx}
          timetableData={data}
          settings={settings}
          variant={variant}
          forPrint
        />
      ))}
    </div>,
    document.body
  );
};

export default PrintDocument;
