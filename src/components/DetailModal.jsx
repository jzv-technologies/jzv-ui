import React, { useEffect } from "react";

const DetailModal = ({
  record,
  onClose,
  onSave,
  onPrevRecord,
  onNextRecord,
  hasPrevRecord = false,
  hasNextRecord = false,
  currentRecordIndex = 0,
  totalRecords = 0,
  isSaving = false,
  excludeFields = ["uuid"],
  title = "Record Details",
  editableFields = {},
  renderField = null,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left">
        {/* Modal Header */}
        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center shrink-0">
          <div className="flex-1">
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-xs opacity-75 font-mono mt-0.5">
              ID: {record.id || "N/A"} | Record {currentRecordIndex + 1} of{" "}
              {totalRecords}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onPrevRecord}
              disabled={!hasPrevRecord}
              className="w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-white font-bold"
              title="Previous record"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              onClick={onNextRecord}
              disabled={!hasNextRecord}
              className="w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-white font-bold"
              title="Next record"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center transition-all text-white font-bold"
              title="Close"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl border border-light-border">
            {Object.entries(record)
              .filter(([key]) => !excludeFields.includes(key))
              .map(([key, val]) => {
                const isEditable = editableFields && editableFields[key];
                if (renderField) {
                  return renderField(key, val, isEditable);
                }
                return (
                  <div key={key} className="flex flex-col">
                    <span className="text-xs font-bold text-dark-muted uppercase tracking-wider">
                      {key}
                    </span>
                    <span className="text-sm font-semibold text-dark-deepblue mt-0.5 break-words">
                      {String(val ?? "") || (
                        <span className="text-gray-300 italic">None</span>
                      )}
                    </span>
                  </div>
                );
              })}
          </div>

          {editableFields && Object.keys(editableFields).length > 0 && (
            <div className="border-t border-light-border pt-6 space-y-4">
              <h4 className="text-base font-bold text-dark-deepblue flex items-center gap-2">
                <i className="fas fa-edit text-indigo-600"></i> Update Record
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(editableFields).map(
                  ([fieldName, fieldConfig]) => {
                    const {
                      value,
                      onChange,
                      type = "text",
                      options = [],
                    } = fieldConfig;

                    if (type === "select") {
                      return (
                        <div key={fieldName}>
                          <label className="block text-sm font-bold text-dark-deepblue mb-1.5">
                            {fieldName}
                          </label>
                          <select
                            value={value || ""}
                            onChange={(e) =>
                              onChange(fieldName, e.target.value)
                            }
                            className="w-full px-4 py-2.5 border border-light-border bg-white rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-semibold text-dark-deepblue cursor-pointer"
                          >
                            <option value="">Select {fieldName}</option>
                            {options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    if (type === "textarea") {
                      return (
                        <div key={fieldName} className="md:col-span-2">
                          <label className="block text-sm font-bold text-dark-deepblue mb-1.5">
                            {fieldName}
                          </label>
                          <textarea
                            rows={3}
                            placeholder={`Enter ${fieldName}...`}
                            value={value || ""}
                            onChange={(e) =>
                              onChange(fieldName, e.target.value)
                            }
                            className="w-full px-4 py-3 border border-light-border rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm resize-none"
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={fieldName}>
                        <label className="block text-sm font-bold text-dark-deepblue mb-1.5">
                          {fieldName}
                        </label>
                        <input
                          type={type}
                          placeholder={`Enter ${fieldName}...`}
                          value={value || ""}
                          onChange={(e) => onChange(fieldName, e.target.value)}
                          className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm"
                        />
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}
        </div>

        {onSave && (
          <div className="p-6 border-t border-light-border bg-gray-50 flex justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-light-border hover:bg-gray-100 text-dark-deepblue rounded-xl font-bold text-sm transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-100"
            >
              {isSaving ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-save"></i>
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailModal;
