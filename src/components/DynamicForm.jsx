import React, { useState, useEffect } from "react";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwS2bblVpkeTGWnSV-_lPopLrZaKtzx3snoUz0KriiURqJfXet9wHcR6qQF9ywZ7sq_/exec";

// Helper: parse "Required" column
const isRequired = (value) => {
  if (typeof value === "boolean") return value;
  const str = String(value).toLowerCase().trim();
  return str === "true" || str === "yes" || str === "1";
};

// Helper: evaluate conditional criteria
// Format: "fieldName = value" or "fieldName != value"
const evaluateCriteria = (criteria, formData) => {
  if (!criteria || typeof criteria !== "string") return true;
  const trimmed = criteria.trim();
  let operator = "=";
  let parts;
  if (trimmed.includes("!=")) {
    operator = "!=";
    parts = trimmed.split("!=");
  } else if (trimmed.includes("=")) {
    operator = "=";
    parts = trimmed.split("=");
  } else {
    return true; // invalid criteria, show field
  }
  if (parts.length !== 2) return true;
  const fieldName = parts[0].trim();
  const expectedValue = parts[1].trim();
  const actualValue = formData[fieldName];
  if (operator === "=") {
    return String(actualValue) === expectedValue;
  } else {
    return String(actualValue) !== expectedValue;
  }
};

// FloatingLabelField (removed mb-4 for grid compatibility)
const FloatingLabelField = ({
  label,
  type,
  value,
  onChange,
  listValues = [],
  required = false,
  error = "",
  textColor = "text-blue-600",
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== "";
  const isActive = isFocused || hasValue;

  const labelBase =
    "absolute left-3 cursor-text transition-all duration-200 pointer-events-none select-none";
  const labelActive = `top-1 text-xs ${textColor}`;
  const labelInactive = "top-3 text-base text-gray-400";

  const inputClasses = `
    w-full pt-6 pb-2 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white placeholder-transparent
    ${error ? "border-red-500 focus:ring-red-400" : "border-gray-300"}
  `;

  const renderLabel = () => (
    <label className={`${labelBase} ${isActive ? labelActive : labelInactive}`}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  if (type === "textarea") {
    return (
      <div className="relative">
        <textarea
          rows={4}
          placeholder=" "
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`${inputClasses} resize-none`}
        />
        {renderLabel()}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }

  if (type === "select" || type === "dropdown") {
    return (
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`${inputClasses} appearance-none`}
        >
          <option value="" disabled hidden></option>
          {listValues.map((val) => (
            <option key={val} value={val}>
              {val}
            </option>
          ))}
        </select>
        {renderLabel()}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type={type}
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={inputClasses}
      />
      {renderLabel()}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

// Simple Modal component
const SuccessModal = ({ message, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Success!</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Main DynamicForm Component
const DynamicForm = ({ uuid, textColor = "text-blue-600" }) => {
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Helper: convert array to comma string for storage
  const arrayToString = (arr) => (Array.isArray(arr) ? arr.join(",") : arr);
  // Helper: convert comma string to array for editing
  const stringToArray = (str) => {
    if (Array.isArray(str)) return str;
    if (!str || str === "") return [];
    return str.split(",").map((s) => s.trim());
  };

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError("");
      try {
        const url = `${APPS_SCRIPT_URL}?action=config&uuid=${encodeURIComponent(
          uuid,
        )}`;
        const res = await fetch(url);
        const result = await res.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to load form");
        }

        let fieldsArray = result.data || [];
        fieldsArray = fieldsArray.filter((f) => f["Field Name"]?.trim());
        setFields(fieldsArray);

        const defaults = {};
        fieldsArray.forEach((field) => {
          const key = field["Field Name"].trim();
          const type = field["Field Type"]?.trim().toLowerCase();
          let defaultVal = field["Default Value"]?.toString() || "";
          if (type === "checkbox") {
            defaults[key] = defaultVal === "true";
          } else if (type === "multi-checkbox") {
            defaults[key] = stringToArray(defaultVal);
          } else {
            defaults[key] = defaultVal;
          }
        });
        setFormData(defaults);
        setValidationErrors({});
      } catch (err) {
        setError(err.message);
        setFields([]);
      } finally {
        setLoading(false);
      }
    };

    if (uuid) fetchConfig();
  }, [uuid]);

  const validateField = (field, value) => {
    const required = isRequired(field["Required"]);
    if (required) {
      if (value === undefined || value === null || value === "") {
        return `${field["Label"] || field["Field Name"]} is required.`;
      }
      const type = field["Field Type"]?.toLowerCase();
      if (type === "checkbox" && !value) {
        return `${field["Label"] || field["Field Name"]} must be checked.`;
      }
      if (
        type === "multi-checkbox" &&
        (!Array.isArray(value) || value.length === 0)
      ) {
        return `${field["Label"] || field["Field Name"]} must select at least one option.`;
      }
    }
    return "";
  };

  const validateAllFields = () => {
    const errors = {};
    fields.forEach((field) => {
      const key = field["Field Name"].trim();
      // Only validate visible fields
      if (isFieldVisible(field, formData)) {
        const value = formData[key];
        const errMsg = validateField(field, value);
        if (errMsg) errors[key] = errMsg;
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  // Toggle value in multi-checkbox array
  const handleMultiCheckboxChange = (key, option, checked) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      let newArray;
      if (checked) {
        newArray = [...current, option];
      } else {
        newArray = current.filter((v) => v !== option);
      }
      return { ...prev, [key]: newArray };
    });
    if (validationErrors[key]) {
      setValidationErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  // Determine if a field should be displayed based on "Criteria" column
  const isFieldVisible = (field, data) => {
    const criteria = field["Criteria"];
    if (!criteria) return true;
    return evaluateCriteria(criteria, data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setShowSuccessModal(false);

    if (!validateAllFields()) {
      return;
    }

    // Prepare data for submission: convert any array to comma-separated string
    const submitData = {};
    Object.keys(formData).forEach((key) => {
      const fieldConfig = fields.find((f) => f["Field Name"]?.trim() === key);
      const type = fieldConfig?.["Field Type"]?.toLowerCase();
      if (type === "multi-checkbox" && Array.isArray(formData[key])) {
        submitData[key] = formData[key].join(",");
      } else {
        submitData[key] = formData[key];
      }
    });

    setSubmitting(true);
    try {
      const body = {
        uuid: uuid,
        data: submitData,
      };
      const url = `${APPS_SCRIPT_URL}?action=submit`;
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "text/plain" },
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || "Submission failed");
      }

      const submittedId = result.data?.id ?? "";
      const msg = `${uuid} form submitted successfully! Your tracking ID: ${submittedId}`;
      setSuccessMessage(msg);
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const key = field["Field Name"]?.trim();
    if (!key) return null;

    const label = field["Label"] || key;
    const type = field["Field Type"]?.trim().toLowerCase();
    const listValues = field["List"]
      ?.split(",")
      .map((v) => v.trim())
      .filter((v) => v);
    const required = isRequired(field["Required"]);
    const error = validationErrors[key] || "";

    switch (type) {
      case "text":
      case "email":
      case "number":
      case "date":
      case "textarea":
      case "dropdown":
      case "select":
        return (
          <FloatingLabelField
            key={key}
            label={label}
            type={type === "dropdown" ? "select" : type}
            value={formData[key] || ""}
            onChange={(val) => handleChange(key, val)}
            listValues={listValues}
            required={required}
            error={error}
            textColor={textColor}
          />
        );

      case "multi-select":
      case "multi-checkbox":
        return (
          <fieldset key={key} className="">
            <legend className="text-sm font-semibold text-gray-700 mb-1">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </legend>
            <div className="flex flex-wrap gap-4">
              {listValues.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    value={option}
                    checked={
                      Array.isArray(formData[key]) &&
                      formData[key].includes(option)
                    }
                    onChange={(e) =>
                      handleMultiCheckboxChange(key, option, e.target.checked)
                    }
                    className="accent-blue-600 h-4 w-4"
                  />
                  {option}
                </label>
              ))}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </fieldset>
        );

      case "radio":
        return (
          <fieldset key={key} className="">
            <legend className="text-sm font-semibold text-gray-700 mb-1">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </legend>
            <div className="flex flex-wrap gap-4">
              {listValues.map((val) => (
                <label key={val} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={key}
                    value={val}
                    checked={formData[key] === val}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="accent-blue-600"
                  />
                  {val}
                </label>
              ))}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </fieldset>
        );

      case "checkbox":
        return (
          <div key={key} className="">
            <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={!!formData[key]}
                onChange={(e) => handleChange(key, e.target.checked)}
                className="accent-blue-600 h-4 w-4"
              />
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        );

      default:
        return (
          <FloatingLabelField
            key={key}
            label={label}
            type="text"
            value={formData[key] || ""}
            onChange={(val) => handleChange(key, val)}
            required={required}
            error={error}
            textColor={textColor}
          />
        );
    }
  };

  // Filter visible fields before rendering grid
  const visibleFields = fields.filter((field) =>
    isFieldVisible(field, formData),
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      {visibleFields.length > 0 && (
        <form onSubmit={handleSubmit}>
          {/* Two-column grid on medium screens and up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {visibleFields.map(renderField)}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      )}

      {!loading && visibleFields.length === 0 && !error && (
        <p className="text-gray-500 text-center py-8">
          No form fields configured.
        </p>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <SuccessModal
          message={successMessage}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </div>
  );
};

export default DynamicForm;
