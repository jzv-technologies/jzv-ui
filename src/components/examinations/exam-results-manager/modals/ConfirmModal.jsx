import React from 'react';

/**
 * ConfirmModal
 * Generic confirmation modal
 */
const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    warning: 'bg-amber-600 hover:bg-amber-700',
    danger: 'bg-rose-600 hover:bg-rose-700',
    success: 'bg-emerald-600 hover:bg-emerald-700',
    info: 'bg-indigo-600 hover:bg-indigo-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`px-6 py-4 border-b border-light-border ${type === 'danger' ? 'bg-rose-50' : type === 'success' ? 'bg-emerald-50' : 'bg-amber-50'} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-2xs ${type === 'danger' ? 'bg-rose-100 text-rose-700' : type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              <i className={`fas ${type === 'danger' ? 'fa-exclamation-triangle' : type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
            </div>
            <h3 className="text-base font-bold text-dark-primary">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-xl hover:bg-slate-200 text-dark-muted flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="fas fa-times text-xs" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-dark-muted">{message}</p>
        </div>

        <div className="px-6 py-3.5 border-t border-light-border bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-white transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-xs font-bold rounded-xl text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5 ${typeStyles[type] || typeStyles.warning}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;