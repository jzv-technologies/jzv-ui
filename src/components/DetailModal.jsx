import React, { useEffect, useState } from "react";

const ConversationChatLog = ({ label, messages, onSendMessage, isSending, isClosed = false }) => {
  const [newMsg, setNewMsg] = useState("");

  let parsed = [];
  try {
    parsed = typeof messages === "string" ? JSON.parse(messages) : messages;
    if (!Array.isArray(parsed)) parsed = [];
  } catch (e) {
    parsed = [];
  }

  const handleSend = () => {
    if (!newMsg.trim()) return;
    onSendMessage(newMsg);
    setNewMsg("");
  };

  return (
    <div className="flex flex-col space-y-3 font-sans mt-6">
      <h4 className="text-sm font-bold text-dark-deepblue uppercase tracking-wider flex items-center gap-2">
        <i className="fas fa-comments text-indigo-600"></i> {label || "Conversation"}
      </h4>
      
      {/* Chat bubbles container */}
      <div className="border border-light-border bg-gray-50/50 rounded-2xl p-4 max-h-[300px] overflow-y-auto space-y-4">
        {parsed.length === 0 ? (
          <div className="text-center py-6 text-dark-muted text-xs italic">
            No messages in this conversation thread yet.
          </div>
        ) : (
          parsed.map((msg, index) => {
            const isSelf = ["admin", "management", "reviewer", "staff", "teacher"].includes(String(msg.sender).toLowerCase());
            return (
              <div key={index} className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  isSelf 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-white border border-light-border text-dark-deepblue rounded-tl-none shadow-sm"
                }`}>
                  <p className="break-words leading-relaxed">{msg.message}</p>
                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-dark-muted font-semibold">
                  <span className="font-bold">{msg.sender}</span>
                  <span>•</span>
                  <span>{msg["time-stamp"] || msg.timestamp || ""}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input panel */}
      {onSendMessage && (
        <div className="flex flex-col gap-2">
          <textarea
            rows={3}
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            disabled={isSending || isClosed}
            placeholder={isClosed ? "This conversation is closed." : "Type your response here..."}
            className="w-full px-4 py-3 border border-light-border rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm resize-none disabled:bg-gray-100/70 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || isClosed || !newMsg.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-50"
            >
              {isSending ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
              <span>Send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
  conversationFields = [],
  fieldLabels = {},
}) => {
  const getLabel = (k) => {
    if (!k) return "";
    return (fieldLabels && fieldLabels[k.toLowerCase()]) || k;
  };

  const getStatusValue = (rec) => {
    if (!rec) return "";
    const exactKey = Object.keys(rec).find(k => k.toLowerCase() === "status");
    if (exactKey) return rec[exactKey];
    const containsKey = Object.keys(rec).find(k => k.toLowerCase().includes("status"));
    if (containsKey) return rec[containsKey];
    return rec.status || rec.Status || "";
  };

  const isClosed = record && String(getStatusValue(record)).toLowerCase() === "closed";

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
              .filter(([key]) => {
                if (excludeFields && excludeFields.some((ef) => ef.toLowerCase() === key.toLowerCase())) return false;
                if (editableFields) {
                  const exists = Object.keys(editableFields).some(
                    (ek) => ek.toLowerCase() === key.toLowerCase()
                  );
                  if (exists) return false;
                }
                if (conversationFields) {
                  const isConversation = conversationFields.some(
                    (cf) => cf.key && cf.key.toLowerCase() === key.toLowerCase()
                  );
                  if (isConversation) return false;
                }
                return true;
              })
              .map(([key, val]) => {
                const isEditable = editableFields && editableFields[key];
                if (renderField) {
                  return renderField(key, val, isEditable);
                }
                const valStr = String(val ?? "");
                const isLongField =
                  valStr.length > 80 ||
                  valStr.includes("\n") ||
                  ["comments", "resolution", "description", "details", "reason", "message"].includes(key.toLowerCase());

                return (
                  <div key={key} className={`flex flex-col ${isLongField ? "sm:col-span-2" : ""}`}>
                    <span className="text-xs font-bold text-dark-muted uppercase tracking-wider">
                      {getLabel(key)}
                    </span>
                    <span className="text-sm font-semibold text-dark-deepblue mt-0.5 break-words whitespace-pre-line">
                      {valStr || (
                        <span className="text-gray-300 italic">None</span>
                      )}
                    </span>
                  </div>
                );
              })}
          </div>

          {editableFields && Object.keys(editableFields).length > 0 && !isClosed && (
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
                            {getLabel(fieldName)}
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

                    if (type === "textarea" || type === "description" || type === "conversation") {
                      return (
                        <div key={fieldName} className="md:col-span-2">
                          <label className="block text-sm font-bold text-dark-deepblue mb-1.5">
                            {getLabel(fieldName)}
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

                    if (type === "checkbox") {
                      return (
                        <div key={fieldName} className="flex items-center gap-2 mt-6 select-none">
                          <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) =>
                              onChange(fieldName, e.target.checked)
                            }
                            className="h-5 w-5 rounded border-light-border text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                          />
                          <label className="text-sm font-bold text-dark-deepblue cursor-pointer">
                            {getLabel(fieldName)}
                          </label>
                        </div>
                      );
                    }

                    return (
                      <div key={fieldName}>
                        <label className="block text-sm font-bold text-dark-deepblue mb-1.5">
                          {getLabel(fieldName)}
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
          {conversationFields && conversationFields.length > 0 && (
            <div className="border-t border-light-border pt-6 space-y-6">
              {conversationFields.map((cf) => (
                <ConversationChatLog
                  key={cf.key}
                  label={cf.label}
                  messages={cf.value}
                  onSendMessage={(msg) => cf.onSendMessage(cf.key, msg)}
                  isSending={cf.isSending}
                  isClosed={isClosed}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-light-border bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-light-border hover:bg-gray-100 text-dark-deepblue rounded-xl font-bold text-sm transition-all"
          >
            {onSave && !isClosed ? "Cancel" : "Close"}
          </button>
          {onSave && !isClosed && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
