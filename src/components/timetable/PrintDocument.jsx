// src/components/timetable/PrintDocument.jsx
/**
 * PrintDocument Component
 * The dedicated print output, rendered through a portal directly under <body>. Living outside
 * the app tree means no ancestor can clip it, so every column prints.
 */

import { createPortal } from 'react-dom';
import TimetableSheet from './TimetableSheet';

const PrintDocument = ({ timetableData, settings, variant = 'class' }) => {
  if (typeof document === 'undefined' || !timetableData) return null;

  return createPortal(
    <div className="timetable-print-area">
      <TimetableSheet
        timetableData={timetableData}
        settings={settings}
        variant={variant}
        forPrint
      />
    </div>,
    document.body
  );
};

export default PrintDocument;
