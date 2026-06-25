import React, { useState, useEffect, useRef } from "react";
import { showToast } from "../../../utils/toast";
import { CARD_THEMES } from "../../../utils/cardTheme";

const MultiSelectDropdown = ({ label, options, selected, onChange, placeholder = "Select roles..." }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedList = selected ? selected.split(",").map(s => s.trim()).filter(Boolean) : [];

  const handleToggle = (option) => {
    let next;
    if (selectedList.includes(option)) {
      next = selectedList.filter(item => item !== option);
    } else {
      next = [...selectedList, option];
    }
    onChange(next.join(", "));
  };

  const displayText = selectedList.length > 0 ? selectedList.join(", ") : placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 border border-light-border bg-white rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-semibold text-dark-deepblue text-left"
      >
        <span className="truncate pr-2">{displayText}</span>
        <i className={`fas fa-chevron-${open ? "up" : "down"} text-xs text-dark-muted`}></i>
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1.5 p-2 bg-white border border-light-border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-0.5">
            {options.map((option) => {
              const isChecked = selectedList.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-colors ${
                    isChecked
                      ? "bg-blue-50 text-blue-700"
                      : "text-dark-primary hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(option)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ScreenDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = ["New", "Update", "Data Grid"];
  const selectedList = value !== undefined && value !== null && value !== ""
    ? String(value).split(",").map(s => s.trim()).filter(Boolean)
    : options;

  const handleToggle = (option) => {
    let next;
    if (selectedList.includes(option)) {
      next = selectedList.filter(item => item !== option);
    } else {
      next = [...selectedList, option];
    }
    onChange(next.join(", "));
  };

  const handleToggleOpen = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenAbove(spaceBelow < 250);
    }
    setOpen(!open);
  };

  const displayText = selectedList.length === 3 ? "All" : selectedList.length === 0 ? "None" : selectedList.join(", ");

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        className="w-full flex items-center justify-between px-3 py-1.5 border border-light-border bg-white rounded-lg text-xs font-semibold text-dark-deepblue transition-all"
      >
        <span className="truncate pr-1 max-w-[80px]">{displayText}</span>
        <i className={`fas fa-chevron-${open ? "up" : "down"} text-[10px] text-dark-muted`}></i>
      </button>
      {open && (
        <div className={`absolute right-0 ${openAbove ? "bottom-full mb-1" : "mt-1"} p-1 bg-white border border-light-border rounded-lg shadow-xl z-50 min-w-[120px] text-left animate-in fade-in slide-in-from-top-1 duration-150 font-sans`}>
          <div className="space-y-0.5">
            {options.map((option) => {
              const isChecked = selectedList.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs font-medium transition-colors ${
                    isChecked
                      ? "bg-blue-50 text-blue-700"
                      : "text-dark-primary hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(option)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const UpdateAllowedDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = ["All", "None", "Reporter", "Reviewer", "Parent", "Teacher", "Management", "Admin"];
  const selectedList = value !== undefined && value !== null && value !== ""
    ? String(value).split(",").map(s => s.trim()).filter(Boolean)
    : ["None"];

  const handleToggle = (option) => {
    let next = [];
    if (option === "All") {
      next = ["All"];
    } else if (option === "None") {
      next = ["None"];
    } else {
      const filtered = selectedList.filter(item => item !== "All" && item !== "None");
      if (filtered.includes(option)) {
        next = filtered.filter(item => item !== option);
      } else {
        next = [...filtered, option];
      }
      if (next.length === 0) {
        next = ["None"];
      }
    }
    onChange(next.join(", "));
  };

  const handleToggleOpen = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenAbove(spaceBelow < 250);
    }
    setOpen(!open);
  };

  const displayText = selectedList.includes("All")
    ? "All"
    : selectedList.includes("None") || selectedList.length === 0
      ? "None"
      : selectedList.join(", ");

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        className="w-full flex items-center justify-between px-3 py-1.5 border border-light-border bg-white rounded-lg text-xs font-semibold text-dark-deepblue transition-all"
      >
        <span className="truncate pr-1 max-w-[80px]">{displayText}</span>
        <i className={`fas fa-chevron-${open ? "up" : "down"} text-[10px] text-dark-muted`}></i>
      </button>
      {open && (
        <div className={`absolute right-0 ${openAbove ? "bottom-full mb-1" : "mt-1"} p-1 bg-white border border-light-border rounded-lg shadow-xl z-50 min-w-[120px] text-left animate-in fade-in slide-in-from-top-1 duration-150 font-sans`}>
          <div className="space-y-0.5">
            {options.map((option) => {
              const isChecked = selectedList.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs font-medium transition-colors ${
                    isChecked
                      ? "bg-blue-50 text-blue-700"
                      : "text-dark-primary hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(option)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const FieldVisibilityDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = ["All", "None", "Reporter", "Reviewer", "Parent", "Teacher", "Management", "Admin"];
  const selectedList = value !== undefined && value !== null && value !== ""
    ? String(value).split(",").map(s => s.trim()).filter(Boolean)
    : ["All"];

  const handleToggle = (option) => {
    let next = [];
    if (option === "All") {
      next = ["All"];
    } else if (option === "None") {
      next = ["None"];
    } else {
      const filtered = selectedList.filter(item => item !== "All" && item !== "None");
      if (filtered.includes(option)) {
        next = filtered.filter(item => item !== option);
      } else {
        next = [...filtered, option];
      }
      if (next.length === 0) {
        next = ["None"];
      }
    }
    onChange(next.join(", "));
  };

  const handleToggleOpen = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenAbove(spaceBelow < 250);
    }
    setOpen(!open);
  };

  const displayText = selectedList.includes("All")
    ? "All"
    : selectedList.includes("None") || selectedList.length === 0
      ? "None"
      : selectedList.join(", ");

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        className="w-full flex items-center justify-between px-3 py-1.5 border border-light-border bg-white rounded-lg text-xs font-semibold text-dark-deepblue transition-all"
      >
        <span className="truncate pr-1 max-w-[90px]">{displayText}</span>
        <i className={`fas fa-chevron-${open ? "up" : "down"} text-[10px] text-dark-muted`}></i>
      </button>
      {open && (
        <div className={`absolute right-0 ${openAbove ? "bottom-full mb-1" : "mt-1"} p-1 bg-white border border-light-border rounded-lg shadow-xl z-50 min-w-[140px] text-left animate-in fade-in slide-in-from-top-1 duration-150 font-sans`}>
          <div className="space-y-0.5">
            {options.map((option) => {
              const isChecked = selectedList.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs font-medium transition-colors ${
                    isChecked
                      ? "bg-blue-50 text-blue-700"
                      : "text-dark-primary hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(option)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminFormSchemaEditor = ({
  uuid,
  isNew,
  displayName,
  fields,
  dataId,
  idPattern,
  description,
  icon,
  formVisibility,
  dataVisibility,
  conversationVisibility,
  cardTheme,
  sheetMappings = [],
  jsonMode,
  setJsonMode,
  jsonText,
  setJsonText,
  jsonError,
  onSave,
  onCancel,
  onChangeUuid,
  onChangeDisplayName,
  onChangeDataId,
  onChangeIdPattern,
  onChangeDescription,
  onChangeIcon,
  onChangeFormVisibility,
  onChangeDataVisibility,
  onChangeConversationVisibility,
  onChangeCardTheme,
  onAddField,
  onRemoveField,
  onMoveField,
  onFieldChange,
  saving,
}) => {
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const formRoles = ["Parent", "Teacher", "Management", "Admin"];
  const dataRoles = ["Reporter", "Reviewer", "Parent", "Teacher", "Management", "Admin"];
  const conversationRoles = ["Reporter", "Reviewer", "Parent", "Teacher", "Management", "Admin"];

  const toggleFormVisibility = (role) => {
    const current = formVisibility ? formVisibility.split(",").map(r => r.trim()).filter(Boolean) : [];
    let updated;
    if (current.includes(role)) {
      updated = current.filter((r) => r !== role);
    } else {
      updated = [...current, role];
    }
    onChangeFormVisibility(updated.join(", "));
  };

  const toggleDataVisibility = (role) => {
    const current = dataVisibility ? dataVisibility.split(",").map(r => r.trim()).filter(Boolean) : [];
    let updated;
    if (current.includes(role)) {
      updated = current.filter((r) => r !== role);
    } else {
      updated = [...current, role];
    }
    onChangeDataVisibility(updated.join(", "));
  };

  const isFormRoleActive = (role) => {
    const current = formVisibility ? formVisibility.split(",").map(r => r.trim()).filter(Boolean) : [];
    return current.includes(role);
  };

  const isDataRoleActive = (role) => {
    const current = dataVisibility ? dataVisibility.split(",").map(r => r.trim()).filter(Boolean) : [];
    return current.includes(role);
  };

  const toggleConversationVisibility = (role) => {
    const current = conversationVisibility ? conversationVisibility.split(",").map(r => r.trim()).filter(Boolean) : [];
    let updated;
    if (current.includes(role)) {
      updated = current.filter((r) => r !== role);
    } else {
      updated = [...current, role];
    }
    onChangeConversationVisibility(updated.join(", "));
  };

  const isConversationRoleActive = (role) => {
    const current = conversationVisibility ? conversationVisibility.split(",").map(r => r.trim()).filter(Boolean) : [];
    return current.includes(role);
  };

  const fieldTypes = [
    "text",
    "email",
    "number",
    "phone",
    "date",
    "textarea",
    "dropdown",
    "select",
    "checkbox",
    "radio",
    "multi-checkbox",
    "conversation",
    "person",
    "currentTimeStamp",
    "currentUser",
    "status",
    "description",
    "currentAssignee",
  ];

  const handleTest = async () => {
    const selected = sheetMappings.find((m) => m.data_id === dataId);
    if (!selected) {
      showToast("Please select a valid mapping target first.", "error");
      return;
    }
    setTestingConnection(true);
    setTestResult(null);
    try {
      const url = `${import.meta.env.VITE_APPS_SCRIPT_URL}?action=test-connection&google_sheet_id=${encodeURIComponent(
        selected.google_sheet_id,
      )}&data_sheet_name=${encodeURIComponent(selected.data_sheet_name)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const msg = data.data?.message || "Connected successfully!";
        setTestResult({
          success: true,
          message: msg,
        });
        showToast(msg, "success");
      } else {
        const msg = data.error || "Connection failed.";
        setTestResult({
          success: false,
          message: msg,
        });
        showToast(msg, "error");
      }
    } catch (err) {
      const errMsg = "Connection request failed: " + err.message;
      setTestResult({
        success: false,
        message: errMsg,
      });
      showToast(errMsg, "error");
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="bg-white border border-light-border shadow-xl overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-light-border flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-dark-deepblue">
            {isNew ? "Create New Form Schema" : `Edit Form Schema: ${uuid}`}
          </h3>
          <p className="text-sm text-dark-muted">
            Define the field elements, types, validation, and visibility
            conditions.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 md:flex-initial bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
          >
            {saving ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-save"></i>
            )}{" "}
            Save to DB
          </button>
          <button
            onClick={onCancel}
            className="flex-1 md:flex-initial bg-white border border-light-border text-dark-deepblue px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="p-8 border-b border-light-border bg-gray-50/20 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Form Name Input */}
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2">
              Form Identifier (Form Name)
            </label>
            <input
              type="text"
              value={uuid}
              onChange={(e) =>
                onChangeUuid(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                )
              }
              disabled={!isNew}
              placeholder="e.g. admission_form"
              className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-mono bg-white"
            />
            {isNew && (
              <p className="text-[10px] text-dark-muted mt-1.5">
                Only lowercase letters, numbers, hyphens, and underscores allowed.
              </p>
            )}
          </div>

          {/* Form Display Name Input */}
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2">
              Form Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => onChangeDisplayName(e.target.value)}
              placeholder="e.g. Admission Form"
              className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-white font-semibold"
            />
            <p className="text-[10px] text-dark-muted mt-1.5">
              Friendly title displayed in lists and portal views.
            </p>
          </div>

          {/* Sheet Mapping Target Select */}
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2">
              Google Sheet Mapping Target
            </label>
            <div className="flex gap-2">
              <select
                value={dataId}
                onChange={(e) => onChangeDataId(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-light-border bg-white rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-semibold"
              >
                <option value="">-- No Mapping Target --</option>
                {sheetMappings.map((m) => (
                  <option key={m.id} value={m.data_id}>
                    {m.data_id} ({m.data_sheet_name})
                  </option>
                ))}
              </select>
              {dataId && (
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testingConnection}
                  className="bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100/70 px-4 rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center shrink-0"
                >
                  {testingConnection ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-plug"></i>
                  )}
                </button>
              )}
            </div>
            {testResult && (
              <div
                className={`mt-2 p-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${
                  testResult.success
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                <i className={`fas ${testResult.success ? "fa-check-circle" : "fa-exclamation-circle"}`}></i>
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* ID Pattern Input */}
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2">
              ID Pattern
            </label>
            <input
              type="text"
              value={idPattern}
              onChange={(e) => onChangeIdPattern(e.target.value)}
              placeholder="e.g. ADM-XXXXX"
              className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-mono bg-white"
            />
            <p className="text-[10px] text-dark-muted mt-1.5">
              Unique ID prefix & digit padding count (e.g. ADM-XXXXX).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-100 pt-6">
          {/* Description Input */}
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2">
              Form Description
            </label>
            <textarea
              value={description}
              onChange={(e) => onChangeDescription(e.target.value)}
              placeholder="Provide a brief description of the form's purpose..."
              rows={2}
              className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm bg-white resize-none"
            />
          </div>

          {/* Icon Name Input */}
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2">
              Icon FontAwesome Class
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => onChangeIcon(e.target.value)}
              placeholder="e.g. fa-clipboard-list"
              className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-mono text-sm bg-white"
            />
            <p className="text-[10px] text-dark-muted mt-1.5">
              Specify a FontAwesome class prefix (e.g. <code>fa-clipboard-list</code>, <code>fa-briefcase</code>).
            </p>
          </div>

          {/* Card Theme Dropdown */}
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2">
              Card Theme
            </label>
            <select
              value={cardTheme || "orange"}
              onChange={(e) => onChangeCardTheme(e.target.value)}
              className="w-full px-4 py-2.5 border border-light-border bg-white rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-semibold text-dark-deepblue cursor-pointer"
            >
              {Object.keys(CARD_THEMES).map((themeName) => (
                <option key={themeName} value={themeName}>
                  {themeName}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-dark-muted mt-1.5">
              Select a color palette style from CARD_THEMES to apply to this card.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-100 pt-6">
          {/* Form Visibility Roles Checkboxes */}
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2.5">
              Form Visibility (Roles)
            </label>
            <MultiSelectDropdown
              label="Form Visibility"
              options={formRoles}
              selected={formVisibility}
              onChange={onChangeFormVisibility}
              placeholder="Select roles for form access..."
            />
            <p className="text-[10px] text-dark-muted mt-1.5">
              Select which user roles can see and fill out this form.
            </p>
          </div>

          {/* Data Visibility Roles Checkboxes */}
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2.5">
              Submitted Data Visibility (Roles)
            </label>
            <MultiSelectDropdown
              label="Data Visibility"
              options={dataRoles}
              selected={dataVisibility}
              onChange={onChangeDataVisibility}
              placeholder="Select roles for data access..."
            />
            <p className="text-[10px] text-dark-muted mt-1.5">
              Select which user roles can view and search through submitted response records.
            </p>
          </div>

          {/* Conversation Visibility Roles Checkboxes */}
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2.5">
              Conversation Visibility (Roles)
            </label>
            <MultiSelectDropdown
              label="Conversation Visibility"
              options={conversationRoles}
              selected={conversationVisibility}
              onChange={onChangeConversationVisibility}
              placeholder="Select roles for conversation access..."
            />
            <p className="text-[10px] text-dark-muted mt-1.5">
              Select which user roles can view and participate in form-related conversation threads.
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-light-border px-8 bg-gray-50/30 flex justify-between items-center">
        <div className="flex gap-4">
          <button
            onClick={() => setJsonMode(false)}
            className={`py-4 px-2 border-b-2 font-bold text-sm transition-all ${
              !jsonMode
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-dark-muted hover:text-dark-deepblue"
            }`}
          >
            UI Builder
          </button>
          <button
            onClick={() => setJsonMode(true)}
            className={`py-4 px-2 border-b-2 font-bold text-sm transition-all ${
              jsonMode
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-dark-muted hover:text-dark-deepblue"
            }`}
          >
            JSON Editor
          </button>
        </div>
        {!jsonMode && (
          <button
            onClick={onAddField}
            className="bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100/70 px-4 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <i className="fas fa-plus"></i> Add Field
          </button>
        )}
      </div>

      <div className="p-8">
        {jsonMode ? (
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2">
              JSON Configuration Schema
            </label>
            <textarea
              rows={16}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full p-4 border border-light-border rounded-2xl outline-none font-mono text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50"
              placeholder='[\n  {\n    "Field Name": "example",\n    "Label": "Example Field"\n  }\n]'
            />
            {jsonError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-mono">
                {jsonError}
              </div>
            )}
          </div>
        ) : fields.length === 0 ? (
          <div className="p-16 text-center text-dark-muted border-2 border-dashed border-gray-200 rounded-2xl">
            <i className="fas fa-list-ul text-3xl mb-3 text-gray-300"></i>
            <p className="mb-4">No fields defined for this form schema.</p>
            <button
              onClick={onAddField}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              Add Your First Field
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-8">
            <div className="inline-block min-w-full align-middle px-8 text-left">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="text-dark-deepblue uppercase text-xs font-bold tracking-wider border-b border-light-border pb-4">
                    <th className="pb-3 pr-4 w-44">Field Name</th>
                    <th className="pb-3 pr-4 w-48">Label</th>
                    <th className="pb-3 pr-4 w-40">Type</th>
                    <th className="pb-3 pr-4 w-56">List Options</th>
                    <th className="pb-3 pr-4 w-16 text-center">Req?</th>
                    <th className="pb-3 pr-4 w-36">Default</th>
                    <th className="pb-3 pr-4 w-48">Show When</th>
                    <th className="pb-3 pr-4 w-36">Screen</th>
                    <th className="pb-3 pr-4 w-44">Field Visibility</th>
                    <th className="pb-3 pr-4 w-44">Update Allowed</th>
                    <th className="pb-3 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fields.map((field, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50/30 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field["Field Name"] || ""}
                          onChange={(e) =>
                            onFieldChange(index, "Field Name", e.target.value)
                          }
                          placeholder="e.g. email"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all font-mono"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field.Label || ""}
                          onChange={(e) =>
                            onFieldChange(index, "Label", e.target.value)
                          }
                          placeholder="e.g. Email Address"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={field["Field Type"] || "text"}
                          onChange={(e) =>
                            onFieldChange(index, "Field Type", e.target.value)
                          }
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                        >
                          {fieldTypes.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field.List || ""}
                          onChange={(e) =>
                            onFieldChange(index, "List", e.target.value)
                          }
                          disabled={
                            ![
                              "select",
                              "dropdown",
                              "radio",
                              "multi-checkbox",
                            ].includes(field["Field Type"])
                          }
                          placeholder="e.g. Admin, User"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all disabled:bg-gray-50 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <input
                          type="checkbox"
                          checked={
                            field.Required === true ||
                            field.Required === "Yes" ||
                            field.Required === "true" ||
                            field.Required === 1
                          }
                          onChange={(e) =>
                            onFieldChange(index, "Required", e.target.checked)
                          }
                          className="h-4.5 w-4.5 rounded accent-blue-600 focus:ring-2 focus:ring-blue-50 transition-all cursor-pointer"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field["Default Value"] || ""}
                          onChange={(e) =>
                            onFieldChange(
                              index,
                              "Default Value",
                              e.target.value,
                            )
                          }
                          placeholder="e.g. Guest"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                        />
                      </td>
                       <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field["Show When"] || ""}
                          onChange={(e) =>
                            onFieldChange(index, "Show When", e.target.value)
                          }
                          placeholder="e.g. role=admin"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <ScreenDropdown
                          value={field["Screen"]}
                          onChange={(val) => onFieldChange(index, "Screen", val)}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <FieldVisibilityDropdown
                          value={field["Field Visibility"]}
                          onChange={(val) => onFieldChange(index, "Field Visibility", val)}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <UpdateAllowedDropdown
                          value={field["Update Allowed"]}
                          onChange={(val) => onFieldChange(index, "Update Allowed", val)}
                        />
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => onMoveField(index, -1)}
                            disabled={index === 0}
                            className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-10 transition-all"
                            title="Move Up"
                          >
                            <i className="fas fa-chevron-up text-xs"></i>
                          </button>
                          <button
                            onClick={() => onMoveField(index, 1)}
                            disabled={index === fields.length - 1}
                            className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-10 transition-all"
                            title="Move Down"
                          >
                            <i className="fas fa-chevron-down text-xs"></i>
                          </button>
                          <button
                            onClick={() => onRemoveField(index)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-all"
                            title="Delete Field"
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFormSchemaEditor;
