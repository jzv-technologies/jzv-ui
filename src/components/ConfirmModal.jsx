// src/components/ConfirmModal.jsx
import React from 'react';

const ConfirmModal = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // danger, warning, info
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  // Icons based on type
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <i className="fas fa-exclamation-triangle text-red-500 text-3xl"></i>;
      case 'warning':
        return <i className="fas fa-exclamation-circle text-amber-500 text-3xl"></i>;
      case 'info':
      default:
        return <i className="fas fa-info-circle text-blue-500 text-3xl"></i>;
    }
  };

  // Button styles based on type
  const getConfirmBtnClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white shadow-red-100';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100';
      case 'info':
      default:
        return 'bg-brand-primary hover:bg-brand-dark text-white shadow-brand-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col items-center text-center space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-dark-deepblue">
            {getIcon()} {title}
          </h3>
          <p className="text-xs text-dark-soft font-semibold leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        <div className="flex gap-3 w-full pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-light-ui text-dark-soft hover:bg-light-border rounded-xl text-xs font-bold transition-all outline-none"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all outline-none active:scale-95 ${getConfirmBtnClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
