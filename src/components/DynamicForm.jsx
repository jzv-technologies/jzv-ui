import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  Square,
  SquareCheckBig,
  Check,
  Circle,
  CircleCheckBig,
} from "lucide-react";
import { CARD_THEMES } from "../utils/cardTheme";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

// Helper: parse "Required" column
const isRequired = (value) => {
  if (typeof value === "boolean") return value;
  const str = String(value).toLowerCase().trim();
  return str === "true" || str === "yes" || str === "1";
};

// Helper: evaluate conditional criteria
const evaluateCriteria = (criteria, formData) => {
  if (!criteria || typeof criteria !== "string") return true;

  const trimmed = criteria.trim();

  const operators = ["!~", "!=", "~", "=", ">", "<", "^"];

  let operator = null;

  for (const op of operators) {
    if (trimmed.includes(op)) {
      operator = op;
      break;
    }
  }

  if (!operator) return true;

  const parts = trimmed.split(operator);

  if (parts.length !== 2) return true;

  const fieldName = parts[0].trim();
  const expectedValue = parts[1].trim();
  const actualValue = formData[fieldName];

  const actualString = String(actualValue ?? "").toLowerCase();
  const expectedString = String(expectedValue ?? "").toLowerCase();

  switch (operator) {
    case "=":
      return actualString === expectedString;

    case "!=":
      return actualString !== expectedString;

    case "~":
      return actualString.includes(expectedString);

    case "!~":
      return !actualString.includes(expectedString);

    case ">":
      return Number(actualValue) > Number(expectedString);

    case "<":
      return Number(actualValue) < Number(expectedString);

    case "^":
      try {
        // Example: role^[admin,teacher]
        const values = expectedString
          .replace(/[\[\]]/g, "")
          .split(",")
          .map((v) => v.trim());

        return values.includes(actualString);
      } catch {
        return false;
      }

    default:
      return true;
  }
};

// =========================
// MODERN FLOATING FIELD
// =========================

const FloatingLabelField = ({
  label,
  type,
  value,
  onChange,
  listValues = [],
  required = false,
  error = "",
  textColor = "text-gray-800",
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = value !== undefined && value !== null && value !== "";

  const isActive = isFocused || hasValue;
  const isDate = type === "date";

  const baseInput = `
  w-full rounded-2xl border
  bg-white/90 backdrop-blur-sm

  px-6 sm:px-8

  ${isDate ? "pt-7 pb-2" : "pt-5 sm:pt-6 pb-2.5 sm:pb-3"}

  text-sm text-gray-800
  shadow-sm
  transition-all duration-300
  focus:outline-none
  focus:ring-4
`;

  const normalStyle = `
    border-gray-200
    focus:border-blue-500
    focus:ring-blue-100
    hover:border-blue-300
  `;

  const errorStyle = `
    border-red-400
    focus:ring-red-100
  `;

  const labelClass = `
  absolute
  left-6 sm:left-8
  transition-all duration-200
  pointer-events-none
  z-10

  ${
    isActive || isDate
      ? `top-1.5 sm:top-2 text-[10px] sm:text-[11px] font-semibold ${textColor}`
      : "top-3.5 sm:top-4 text-sm text-gray-400"
  }
`;

  const wrapperClass = "relative group";

  if (type === "textarea") {
    return (
      <div className={`${wrapperClass} md:col-span-2`}>
        <textarea
          rows={5}
          placeholder=" "
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`${baseInput} resize-none ${
            error ? errorStyle : normalStyle
          }`}
        />

        <label className={labelClass}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {error && <p className="text-red-500 text-xs mt-2 ml-2">{error}</p>}
      </div>
    );
  }

  if (type === "select") {
    return (
      <div className={wrapperClass}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`${baseInput} appearance-none ${
            error ? errorStyle : normalStyle
          }`}
        >
          <option value=""></option>

          {listValues.map((val) => (
            <option key={val} value={val}>
              {val}
            </option>
          ))}
        </select>

        <ChevronDown
          size={18}
          className="absolute right-4 top-5 text-gray-400 pointer-events-none"
        />

        <label className={labelClass}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {error && <p className="text-red-500 text-xs mt-2 ml-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <input
        type={type}
        placeholder={isDate ? undefined : " "}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`${baseInput} ${error ? errorStyle : normalStyle}`}
      />

      <label className={labelClass}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {error && <p className="text-red-500 text-xs mt-2 ml-2">{error}</p>}
    </div>
  );
};

// =========================
// SUCCESS MODAL
// =========================

const SuccessModal = ({ message, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);

    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-5">
            <Check className="h-8 w-8 text-green-600" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>

          <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>

          <button
            onClick={onClose}
            className="
              w-full rounded-2xl
              bg-blue-600 hover:bg-blue-700
              text-white font-semibold
              py-3 transition-all duration-200
              shadow-lg hover:shadow-xl
            "
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================
// MAIN FORM
// =========================

const DynamicForm = ({ uuid, textColor, additionalData = {} }) => {
  const bgColor = textColor.replace('text-', 'bg-');
  const borderColor = textColor.replace('text-', 'border-');

  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
        return `${
          field["Label"] || field["Field Name"]
        } must select at least one option.`;
      }
    }

    return "";
  };

  const validateAllFields = () => {
    const errors = {};

    fields.forEach((field) => {
      const key = field["Field Name"].trim();

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
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (validationErrors[key]) {
      setValidationErrors((prev) => ({
        ...prev,
        [key]: "",
      }));
    }
  };

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
      setValidationErrors((prev) => ({
        ...prev,
        [key]: "",
      }));
    }
  };

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
        data: {
          ...submitData,
          ...additionalData,
        },
      };

      const url = `${APPS_SCRIPT_URL}?action=submit`;

      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "text/plain",
        },
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

  // =========================
  // RENDER FIELD
  // =========================

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
      case "phone":
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

      // =========================
      // MULTI CHECKBOX
      // =========================

      case "multi-select":
      case "multi-checkbox":
        return (
          <fieldset
            key={key}
            className="
              rounded-3xl border border-gray-200
              bg-white p-5 shadow-sm
              md:col-span-2
            "
          >
            <legend
              className={`pt-6 sm:pt-8 text-[10px] sm:text-[11px] font-semibold ${textColor}`}
            >
              {label}

              {required && <span className="text-red-500 ml-1">*</span>}
            </legend>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
              {listValues.map((option) => {
                const checked =
                  Array.isArray(formData[key]) &&
                  formData[key].includes(option);

                return (
                  <button
                    type="button"
                    key={option}
                    onClick={() =>
                      handleMultiCheckboxChange(key, option, !checked)
                    }
                    className={`
                      px-4 py-3 rounded-2xl text-sm font-medium
                      border transition-all duration-200
                      flex items-center gap-3

                      ${
                        checked
                          ? `${borderColor} ${bgColor} text-white shadow-md`
                          : `${borderColor} bg-white hover:${bgColor}/50 `
                      }
                    `}
                  >
                    {checked ? (
                      <SquareCheckBig
                        className="w-5 h-5 shrink-0"
                        strokeWidth={2.4}
                      />
                    ) : (
                      <Square className="w-5 h-5 shrink-0" strokeWidth={2.2} />
                    )}

                    <span className="text-left">{option}</span>
                  </button>
                );
              })}
            </div>

            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
          </fieldset>
        );

      // =========================
      // RADIO
      // =========================

      case "radio":
        return (
          <fieldset
            key={key}
            className="
        rounded-3xl border border-gray-200
        bg-white p-5 shadow-sm
        md:col-span-2
      "
          >
            <legend
              className={`pt-6 sm:pt-8 text-[10px] sm:text-[11px] font-semibold ${textColor}`}
            >
              {label}

              {required && <span className="text-red-500 ml-1">*</span>}
            </legend>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
              {listValues.map((val) => {
                const active = formData[key] === val;

                return (
                  <button
                    type="button"
                    key={val}
                    onClick={() => handleChange(key, val)}
                    className={`
                flex items-center gap-3
                rounded-2xl border p-4
                text-sm font-medium text-left
                transition-all duration-200
                ${
                  active
                    ? `${borderColor} ${bgColor} text-white shadow-md`
                    : `border-gray-200 bg-white hover:${bgColor}/50 `
                }
              `}
                  >
                    <div className={`transition-all duration-200`}>
                      {active ? (
                        <CircleCheckBig
                          size={16}
                          className="sm:w-5 sm:h-5 shrink-0"
                        />
                      ) : (
                        <Circle size={16} className="sm:w-5 sm:h-5 shrink-0" />
                      )}
                    </div>

                    <span>{val}</span>
                  </button>
                );
              })}
            </div>

            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
          </fieldset>
        );
      // =========================
      // SINGLE CHECKBOX
      // =========================

      case "checkbox":
        return (
          <div
            key={key}
            className="
              flex items-start gap-4
              rounded-3xl border border-gray-200
              bg-white p-5 shadow-sm
              md:col-span-2
            "
          >
            <input
              type="checkbox"
              checked={!!formData[key]}
              onChange={(e) => handleChange(key, e.target.checked)}
              className="
                mt-1 h-5 w-5 rounded
                accent-blue-600
              "
            />

            <div>
              <label className="font-medium text-gray-800">{label}</label>

              {required && <span className="text-red-500 ml-1">*</span>}

              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            </div>
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

  const visibleFields = fields.filter((field) =>
    isFieldVisible(field, formData),
  );

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // =========================
  // MAIN UI
  // =========================

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 text-gray-800">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6 text-sm font-medium">
          {error}
        </div>
      )}

      {visibleFields.length > 0 && (
        <div
          className={`
            rounded-[32px]
           bg-white
          border ${textColor.replace("text-", "border-")}/50 bg-white p-6 shadow-md
          ${textColor}
            shadow-2xl
            p-6 md:p-8
          `}
        >
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleFields.map(renderField)}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`
                mt-8 w-full
                rounded-2xl
                ${textColor.replace("text-", "bg-")} hover:bg-blue-700
                text-white font-semibold
                py-4
                transition-all duration-300
                shadow-lg hover:shadow-xl
                disabled:opacity-50`}
            >
              {submitting ? "Submitting..." : "Submit Form"}
            </button>
          </form>
        </div>
      )}

      {!loading && visibleFields.length === 0 && !error && (
        <p className="text-gray-500 text-center py-8">
          No form fields configured.
        </p>
      )}

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
