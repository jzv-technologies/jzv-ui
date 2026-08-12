import React from 'react';

const ProgressPanel = ({
  classes,
  subjects,
  books,
  bookClasses,
  progressRecords
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
      <i className="fas fa-chart-pie text-4xl text-gray-300 mb-3"></i>
      <h3 className="text-sm font-bold text-gray-500">Progress Panel</h3>
      <p className="text-xs text-gray-400 mt-1 max-w-sm">
        Overall class progress will appear here.
      </p>
    </div>
  );
};

export default ProgressPanel;
