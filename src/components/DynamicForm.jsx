import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Square, SquareCheckBig, Check, Circle, CircleCheckBig } from 'lucide-react';
import { CARD_THEMES } from '../utils/cardTheme';
import { supabase } from '../utils/supabase';
import { useAuth } from '../hooks/useAuth';

const SUPABASE_FORM_CONFIG_TABLE = 'dynamic_form_configs';
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const getLocalMappingFallback = (uuid) => {
  const mappings = {
    complaint: {
      google_sheet_id: '1E97QNg6HM6ZJlTGdYUlK5FiD-WwhNYl3vTDRixRgA9A',
      data_sheet_name: 'complaint_data',
    },
    career: {
      google_sheet_id: '1rtxVBXFij9ZxwQhjRhzB8X6Phb0oxOKgxWgBYpSQ6xI',
      data_sheet_name: 'career_data',
    },
  };
  return mappings[uuid] || null;
};

// Helper: parse "Required" column
const isRequired = (value) => {
  if (typeof value === 'boolean') return value;
  const str = String(value).toLowerCase().trim();
  return str === 'true' || str === 'yes' || str === '1';
};

// Helper: evaluate conditional criteria
const evaluateCriteria = (criteria, formData) => {
  if (!criteria || typeof criteria !== 'string') return true;

  const trimmed = criteria.trim();

  const operators = ['!~', '!=', '~', '=', '>', '<', '^'];

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

  const actualString = String(actualValue ?? '').toLowerCase();
  const expectedString = String(expectedValue ?? '').toLowerCase();

  switch (operator) {
    case '=':
      return actualString === expectedString;

    case '!=':
      return actualString !== expectedString;

    case '~':
      return actualString.includes(expectedString);

    case '!~':
      return !actualString.includes(expectedString);

    case '>':
      return Number(actualValue) > Number(expectedString);

    case '<':
      return Number(actualValue) < Number(expectedString);

    case '^':
      try {
        // Example: role^[admin,teacher]
        const values = expectedString
          .replace(/[\[\]]/g, '')
          .split(',')
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
  error = '',
  textColor = 'text-gray-800',
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = value !== undefined && value !== null && value !== '';

  const isActive = isFocused || hasValue;
  const isDate = type === 'date';

  const baseInput = `
  w-full rounded-2xl border
  bg-white/90 backdrop-blur-sm

  px-6 sm:px-8

  ${isDate ? 'pt-7 pb-2' : 'pt-5 sm:pt-6 pb-2.5 sm:pb-3'}

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
      : 'top-3.5 sm:top-4 text-sm text-gray-400'
  }
`;

  const wrapperClass = 'relative group';

  if (type === 'textarea') {
    return (
      <div className={`${wrapperClass} md:col-span-2`}>
        <textarea
          rows={5}
          placeholder=" "
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`${baseInput} resize-none disabled:bg-gray-100/70 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200/60 ${
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

  if (type === 'select') {
    return (
      <div className={wrapperClass}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`${baseInput} appearance-none disabled:bg-gray-100/70 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200/60 ${
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
        placeholder={isDate ? undefined : ' '}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className={`${baseInput} disabled:bg-gray-100/70 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200/60 ${error ? errorStyle : normalStyle}`}
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
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);

    return () => document.removeEventListener('keydown', handleEsc);
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
// EMBEDDED CONVERSATION CHAT
// =========================

const EmbeddedConversationChat = ({
  label,
  value,
  onChange,
  required = false,
  error = '',
  textColor = 'text-gray-800',
  currentUserName = 'Reporter',
}) => {
  const [newMsg, setNewMsg] = useState('');

  let parsed = [];
  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) parsed = [];
  } catch (e) {
    parsed = [];
  }

  const handleAdd = () => {
    if (!newMsg.trim()) return;
    const newMsgObj = {
      sender: currentUserName,
      'time-stamp': new Date().toLocaleString(),
      message: newMsg.trim(),
    };
    const updated = [...parsed, newMsgObj];
    onChange(JSON.stringify(updated));
    setNewMsg('');
  };

  return (
    <div className="flex flex-col space-y-3 font-sans md:col-span-2 w-full">
      <label className={`text-sm font-semibold ${textColor} flex items-center gap-2`}>
        <i className="fas fa-comments text-indigo-600"></i> {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Chat bubbles container */}
      <div className="border border-gray-200 bg-gray-50/50 rounded-2xl p-4 max-h-[250px] overflow-y-auto space-y-4 shadow-inner">
        {parsed.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs italic">
            No messages in this conversation thread yet.
          </div>
        ) : (
          parsed.map((msg, index) => {
            const isSelf = ['admin', 'management', 'reviewer', 'staff', 'teacher'].includes(
              String(msg.sender).toLowerCase()
            );
            return (
              <div key={index} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm transition-all duration-250 ${
                    isSelf
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-100'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="break-words leading-relaxed">{msg.message}</p>
                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-gray-400 font-semibold">
                  <span className="font-bold">{msg.sender}</span>
                  <span>•</span>
                  <span>{msg['time-stamp'] || msg.timestamp || ''}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input panel */}
      <div className="flex flex-col gap-2">
        <textarea
          rows={3}
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Type your message here..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm resize-none"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newMsg.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 shadow-lg shadow-blue-100/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <i className="fas fa-plus text-xs"></i>
            <span>Add Message</span>
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-xs mt-1 ml-2">{error}</p>}
    </div>
  );
};

// =========================
// MAIN FORM
// =========================

const DynamicForm = ({ uuid, textColor, additionalData = {}, userRoles = [] }) => {
  const auth = useAuth();
  const currentUserObj = auth?.user;
  const currentFullName = auth?.fullName;
  const currentRoles = auth?.userRoles || [];

  const effectiveRoles = userRoles && userRoles.length > 0 ? userRoles : currentRoles;

  const bgColor = textColor.replace('text-', 'bg-');
  const borderColor = textColor.replace('text-', 'border-');

  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [idPattern, setIdPattern] = useState('ID-XXXXX');
  const [sheetMapping, setSheetMapping] = useState(null);

  const stringToArray = (str) => {
    if (Array.isArray(str)) return str;
    if (!str || str === '') return [];
    return str.split(',').map((s) => s.trim());
  };

  useEffect(() => {
    const fetchPeople = async () => {
      try {
        const [teachersRes, usersRes] = await Promise.all([
          supabase.from('employees').select('name'),
          supabase.from('admin_users_view').select('full_name'),
        ]);
        const names = new Set();
        if (teachersRes.data) {
          teachersRes.data.forEach((t) => {
            if (t.name) names.add(t.name.trim());
          });
        }
        if (usersRes.data) {
          usersRes.data.forEach((u) => {
            if (u.full_name) names.add(u.full_name.trim());
          });
        }
        setPeople(Array.from(names).sort((a, b) => a.localeCompare(b)));
      } catch (err) {
        console.warn('Failed to fetch person list:', err);
      }
    };
    fetchPeople();
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError('');

      const CACHE_KEY = `form_config_${uuid}`;
      const CACHE_TIME_KEY = `form_config_${uuid}_time`;
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache expiry

      // Check localStorage cache first
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        const now = Date.now();

        if (cachedData && cachedTime && now - Number(cachedTime) < CACHE_DURATION) {
          const parsed = JSON.parse(cachedData);
          const fieldsList = Array.isArray(parsed) ? parsed : parsed.fields || [];
          const idPat = !Array.isArray(parsed) && parsed.idPattern ? parsed.idPattern : 'ID-XXXXX';
          const sMap = !Array.isArray(parsed) && parsed.sheetMapping ? parsed.sheetMapping : null;

          if (fieldsList.length > 0) {
            console.log(`[DynamicForm] Loaded config for ${uuid} from localStorage cache`);
            setFields(fieldsList);
            setIdPattern(idPat);
            setSheetMapping(sMap);

            const defaults = {};
            fieldsList.forEach((field) => {
              const key = field['Field Name'].trim();
              const type = field['Field Type']?.trim().toLowerCase();
              let defaultVal = field['Default Value']?.toString() || '';

              if (type === 'checkbox') {
                defaults[key] = defaultVal === 'true';
              } else if (type === 'multi-checkbox') {
                defaults[key] = stringToArray(defaultVal);
              } else {
                defaults[key] = defaultVal;
              }
            });

            setFormData(defaults);
            setValidationErrors({});
            setLoading(false);
            return;
          }
        }
      } catch (cacheErr) {
        console.warn('Failed to retrieve or parse form config cache:', cacheErr);
      }

      try {
        const queryPromise = supabase
          .from(SUPABASE_FORM_CONFIG_TABLE)
          .select('*')
          .eq('form_name', uuid);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timeout')), 5000)
        );

        const { data, error: supabaseError } = await Promise.race([queryPromise, timeoutPromise]);

        if (supabaseError) throw supabaseError;

        if (!data || data.length === 0) {
          throw new Error(`No form configuration record found for "${uuid}"`);
        }

        const configRecord = data[0];
        const configField = configRecord.fields;
        let fieldsFromSupabase = [];
        if (configField) {
          fieldsFromSupabase =
            typeof configField === 'string' ? JSON.parse(configField) : configField;
        }

        if (!fieldsFromSupabase || !fieldsFromSupabase.length) {
          throw new Error('No form config fields found');
        }

        let resolvedMapping = null;
        if (configRecord.data_id) {
          const { data: mappingData, error: mappingError } = await supabase
            .from('google_sheet_mappings')
            .select('*')
            .eq('data_id', configRecord.data_id);

          if (mappingError) {
            console.warn('Failed to fetch sheet mapping:', mappingError);
          } else if (mappingData && mappingData.length > 0) {
            resolvedMapping = mappingData[0];
          }
        }

        const cleanFields = fieldsFromSupabase.filter((f) => f['Field Name']?.trim());
        const finalIdPattern = configRecord.id_pattern || 'ID-XXXXX';

        // Cache the retrieved config
        try {
          const cacheObj = {
            fields: cleanFields,
            idPattern: finalIdPattern,
            sheetMapping: resolvedMapping,
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
          localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
        } catch (cacheWriteErr) {
          console.warn('Failed to write form config to cache:', cacheWriteErr);
        }

        setFields(cleanFields);
        setIdPattern(finalIdPattern);
        setSheetMapping(resolvedMapping);

        const defaults = {};

        cleanFields.forEach((field) => {
          const key = field['Field Name'].trim();
          const type = field['Field Type']?.trim().toLowerCase();

          let defaultVal = field['Default Value']?.toString() || '';

          if (type === 'checkbox') {
            defaults[key] = defaultVal === 'true';
          } else if (type === 'multi-checkbox') {
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

  // Auto-populate currentTimeStamp and currentUser when fields or auth changes
  useEffect(() => {
    if (fields.length > 0) {
      setFormData((prev) => {
        let updated = false;
        const next = { ...prev };
        fields.forEach((field) => {
          const key = field['Field Name']?.trim();
          if (!key) return;
          const type = field['Field Type']?.trim().toLowerCase();

          if (type === 'currenttimestamp' && !next[key]) {
            next[key] = new Date().toLocaleString();
            updated = true;
          } else if (type === 'currentuser' && !next[key]) {
            const currentUserName =
              currentFullName || currentUserObj?.email || currentUserObj?.id || '';
            if (currentUserName) {
              next[key] = currentUserName;
              updated = true;
            }
          } else if (type === 'status' && !next[key]) {
            next[key] = 'Open';
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    }
  }, [fields, currentUserObj, currentFullName]);

  const validateField = (field, value) => {
    const type = field['Field Type']?.trim().toLowerCase();
    if (type === 'button' || type === 'link') return '';

    const required = isRequired(field['Required']);

    if (required) {
      if (value === undefined || value === null || value === '') {
        return `${field['Label'] || field['Field Name']} is required.`;
      }

      const type = field['Field Type']?.toLowerCase();

      if (type === 'checkbox' && !value) {
        return `${field['Label'] || field['Field Name']} must be checked.`;
      }

      if (type === 'multi-checkbox' && (!Array.isArray(value) || value.length === 0)) {
        return `${field['Label'] || field['Field Name']} must select at least one option.`;
      }

      if (type === 'conversation') {
        let msgCount = 0;
        try {
          const parsed = JSON.parse(value || '[]');
          if (Array.isArray(parsed)) msgCount = parsed.length;
        } catch {}
        if (msgCount === 0) {
          return `${field['Label'] || field['Field Name']} requires at least one message.`;
        }
      }
    }

    return '';
  };

  const validateAllFields = () => {
    const errors = {};

    fields.forEach((field) => {
      const key = field['Field Name'].trim();

      if (isFieldRendered(field, formData)) {
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
        [key]: '',
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
        [key]: '',
      }));
    }
  };

  const isFieldVisibleToUser = (field) => {
    const visibility = field['Field Visibility'];
    if (visibility === undefined || visibility === null || visibility === '') {
      return true;
    }
    const allowed = String(visibility)
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allowed.length === 0) return true;

    if (allowed.includes('all')) return true;
    if (allowed.includes('none')) return false;

    const rolesLower = (effectiveRoles || []).map((r) => r.toLowerCase());
    if (rolesLower.length === 0) {
      rolesLower.push('parent', 'reporter');
    }
    if (!rolesLower.includes('reporter')) {
      rolesLower.push('reporter');
    }

    return rolesLower.some((r) => allowed.includes(r));
  };

  const isFieldReadOnly = (field) => {
    const type = field['Field Type']?.trim().toLowerCase();

    // Auto-populated and status fields are read-only during new form submission
    if (type === 'currenttimestamp' || type === 'currentuser') {
      return true;
    }
    if (type === 'status') {
      return true;
    }

    return false;
  };

  const isFieldVisible = (field, data) => {
    const criteria = field['Show When'];

    if (!criteria) return true;

    return evaluateCriteria(criteria, data);
  };

  const isFieldRendered = (field, data) => {
    if (!isFieldVisible(field, data)) return false;
    if (!isFieldVisibleToUser(field)) return false;
    const displayIn = field['Screen'];
    if (displayIn !== undefined && displayIn !== null && displayIn !== '') {
      const options = String(displayIn)
        .split(',')
        .map((s) => s.trim().toLowerCase());
      if (options.length > 0 && !options.includes('new')) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submittingRef.current) return;

    setError('');
    setSuccessMessage('');
    setShowSuccessModal(false);

    if (!validateAllFields()) {
      return;
    }

    const submitData = {};

    Object.keys(formData).forEach((key) => {
      const fieldConfig = fields.find((f) => f['Field Name']?.trim() === key);

      const type = fieldConfig?.['Field Type']?.toLowerCase();

      if (type === 'multi-checkbox' && Array.isArray(formData[key])) {
        submitData[key] = formData[key].join(',');
      } else if (type === 'conversation' || key === 'conversation') {
        if (formData[key]) {
          try {
            JSON.parse(formData[key]);
            submitData[key] = formData[key];
          } catch {
            submitData[key] = JSON.stringify([
              {
                sender: 'Reporter',
                'time-stamp': new Date().toLocaleString(),
                message: formData[key],
              },
            ]);
          }
        } else {
          submitData[key] = JSON.stringify([]);
        }
      } else {
        submitData[key] = formData[key];
      }
    });

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const body = {
        uuid: uuid,
        data: {
          ...submitData,
          ...additionalData,
        },
        id_pattern: idPattern,
      };

      const mapping = sheetMapping || getLocalMappingFallback(uuid);
      if (mapping) {
        body.google_sheet_id = mapping.google_sheet_id;
        body.data_sheet_name = mapping.data_sheet_name;
      }

      const url = `${APPS_SCRIPT_URL}?action=submit`;

      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Submission failed');
      }

      const submittedId = result.data?.id ?? '';

      const msg = `${uuid} form submitted successfully! Your tracking ID: ${submittedId}`;

      setSuccessMessage(msg);
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // =========================
  // RENDER FIELD
  // =========================

  const renderField = (field) => {
    const key = field['Field Name']?.trim();

    if (!key) return null;

    const label = field['Label'] || key;

    const type = field['Field Type']?.trim().toLowerCase();

    const listValues = field['List']
      ?.split(',')
      .map((v) => v.trim())
      .filter((v) => v);

    const required = isRequired(field['Required']);

    const error = validationErrors[key] || '';

    const disabled = isFieldReadOnly(field);

    switch (type) {
      case 'text':
      case 'email':
      case 'number':
      case 'phone':
      case 'date':
      case 'textarea':
      case 'dropdown':
      case 'select':
      case 'currenttimestamp':
      case 'currentuser':
        return (
          <FloatingLabelField
            key={key}
            label={label}
            type={
              type === 'dropdown' || type === 'select'
                ? 'select'
                : type === 'currenttimestamp' || type === 'currentuser'
                  ? 'text'
                  : type
            }
            value={formData[key] || ''}
            onChange={(val) => handleChange(key, val)}
            listValues={listValues}
            required={required}
            error={error}
            textColor={textColor}
            disabled={disabled}
          />
        );

      case 'status':
        return (
          <FloatingLabelField
            key={key}
            label={label}
            type="select"
            value={formData[key] || 'Open'}
            onChange={(val) => handleChange(key, val)}
            listValues={['Open', 'In Review', 'In Progress', 'Resolved', 'Closed']}
            required={required}
            error={error}
            textColor={textColor}
            disabled={disabled}
          />
        );

      case 'person':
      case 'currentassignee':
        return (
          <FloatingLabelField
            key={key}
            label={label}
            type="select"
            value={formData[key] || ''}
            onChange={(val) => handleChange(key, val)}
            listValues={people}
            required={required}
            error={error}
            textColor={textColor}
            disabled={disabled}
          />
        );

      case 'conversation':
        const currentUserName =
          currentFullName || currentUserObj?.email || currentUserObj?.id || 'Reporter';
        return (
          <EmbeddedConversationChat
            key={key}
            label={label}
            value={formData[key] || ''}
            onChange={(val) => handleChange(key, val)}
            required={required}
            error={error}
            textColor={textColor}
            currentUserName={currentUserName}
          />
        );

      case 'description':
        return (
          <FloatingLabelField
            key={key}
            label={label}
            type="textarea"
            value={formData[key] || ''}
            onChange={(val) => handleChange(key, val)}
            required={required}
            error={error}
            textColor={textColor}
            disabled={disabled}
          />
        );

      // =========================
      // MULTI CHECKBOX
      // =========================

      case 'multi-select':
      case 'multi-checkbox':
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
                const checked = Array.isArray(formData[key]) && formData[key].includes(option);

                return (
                  <button
                    type="button"
                    key={option}
                    disabled={disabled}
                    onClick={() => handleMultiCheckboxChange(key, option, !checked)}
                    className={`
                      px-4 py-3 rounded-2xl text-sm font-medium
                      border transition-all duration-200
                      flex items-center gap-3
                      disabled:opacity-60 disabled:cursor-not-allowed

                      ${
                        checked
                          ? `${borderColor} ${bgColor} text-white shadow-md`
                          : `${borderColor} bg-white hover:${bgColor}/50 `
                      }
                    `}
                  >
                    {checked ? (
                      <SquareCheckBig className="w-5 h-5 shrink-0" strokeWidth={2.4} />
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

      case 'radio':
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
                    disabled={disabled}
                    onClick={() => handleChange(key, val)}
                    className={`
                flex items-center gap-3
                rounded-2xl border p-4
                text-sm font-medium text-left
                transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                ${
                  active
                    ? `${borderColor} ${bgColor} text-white shadow-md`
                    : `border-gray-200 bg-white hover:${bgColor}/50 `
                }
              `}
                  >
                    <div className={`transition-all duration-200`}>
                      {active ? (
                        <CircleCheckBig size={16} className="sm:w-5 sm:h-5 shrink-0" />
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

      case 'checkbox':
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
              disabled={disabled}
              onChange={(e) => handleChange(key, e.target.checked)}
              className="
                mt-1 h-5 w-5 rounded
                accent-blue-600
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            />

            <div>
              <label className="font-medium text-gray-800">{label}</label>

              {required && <span className="text-red-500 ml-1">*</span>}

              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            </div>
          </div>
        );

      // =========================
      // BUTTON & LINK (PREMIUM CARDS)
      // =========================
      case 'button':
      case 'link':
        let linkUrl = field.Link || field.link || field['Link'];
        if (!linkUrl || linkUrl === '#') {
          if (uuid === 'online-teacher-test') {
            linkUrl = 'https://forms.gle/ATKnvGZhtkaANDsk7';
          } else {
            linkUrl = '#';
          }
        }

        let icon = 'fa-external-link-alt';
        let cardGradient = 'from-teal-600 to-emerald-600 hover:shadow-teal-100/50';
        let iconBg = 'bg-white/20 text-white';
        let titleColor = 'text-white';
        let subtitleColor = 'text-white/80';
        let arrowColor = 'text-white bg-white/10 hover:bg-white/20';
        let badgeText = 'Evaluation Test';
        let badgeBg = 'bg-white/10 text-white';

        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('english')) {
          icon = 'fa-language';
          cardGradient = 'from-indigo-600 to-blue-500 hover:shadow-indigo-200/50';
          badgeText = 'Language Test';
        } else if (lowerLabel.includes('tamil')) {
          icon = 'fa-font';
          cardGradient = 'from-amber-500 to-orange-600 hover:shadow-amber-200/50';
          badgeText = 'Regional Language Test';
        } else if (lowerLabel.includes('arabic')) {
          icon = 'fa-feather-alt';
          cardGradient = 'from-emerald-600 to-teal-500 hover:shadow-emerald-200/50';
          badgeText = 'Classical Language Test';
        } else if (lowerLabel.includes('urdu')) {
          icon = 'fa-pen-nib';
          cardGradient = 'from-purple-600 to-violet-500 hover:shadow-purple-200/50';
          badgeText = 'Literary Language Test';
        }

        return (
          <div key={key} className="md:col-span-1 my-3">
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                relative overflow-hidden group block p-6 rounded-[2rem] border-0
                bg-gradient-to-br ${cardGradient}
                shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer
              `}
            >
              {/* Decorative background blur shape */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-xl transition-all duration-500 group-hover:scale-125"></div>

              <div className="flex flex-col gap-4">
                {/* Top bar with Badge and Arrow */}
                <div className="flex justify-between items-center">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full backdrop-blur-sm ${badgeBg}`}
                  >
                    {badgeText}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 ${arrowColor}`}
                  >
                    <i className="fas fa-arrow-right text-xs"></i>
                  </div>
                </div>

                {/* Main details with Icon and Title */}
                <div className="flex items-center gap-4 mt-2">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md ${iconBg} transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105 shrink-0`}
                  >
                    <i className={`fas ${icon}`}></i>
                  </div>
                  <div>
                    <h4
                      className={`font-extrabold text-xl sm:text-2xl tracking-tight leading-tight ${titleColor}`}
                    >
                      {label} Test
                    </h4>
                    <p className={`text-xs mt-1 font-medium ${subtitleColor}`}>
                      Click to begin your assessment in {label}
                    </p>
                  </div>
                </div>
              </div>
            </a>
          </div>
        );

      default:
        return (
          <FloatingLabelField
            key={key}
            label={label}
            type="text"
            value={formData[key] || ''}
            onChange={(val) => handleChange(key, val)}
            required={required}
            error={error}
            textColor={textColor}
          />
        );
    }
  };

  const visibleFields = fields
    .filter((field) => {
      if (!isFieldRendered(field, formData)) return false;
      // For candidate sessions on the teacher test form, only show their enabled tests
      if (
        uuid === 'online-teacher-test' &&
        currentUserObj?.candidateMode &&
        currentUserObj?.enabledTests &&
        ['button', 'link'].includes(field['Field Type']?.trim().toLowerCase())
      ) {
        const label = (field.Label || '').trim();
        const enabledTests = currentUserObj.enabledTests;
        // enabledTests stores values like "English Test", "Tamil Test" etc.
        // field Label is "English", "Tamil" etc. — match either way
        return enabledTests.some(
          (t) =>
            t.toLowerCase() === label.toLowerCase() ||
            t.toLowerCase() === `${label.toLowerCase()} test`
        );
      }
      return true;
    })
    .sort((a, b) => {
      const aType = a['Field Type']?.trim().toLowerCase();
      const bType = b['Field Type']?.trim().toLowerCase();
      if (aType === 'conversation' && bType !== 'conversation') return 1;
      if (bType === 'conversation' && aType !== 'conversation') return -1;
      return 0;
    });

  const hasSubmitButton = !visibleFields.every((field) =>
    ['button', 'link'].includes(field['Field Type']?.trim().toLowerCase())
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
          border ${textColor.replace('text-', 'border-')}/50 bg-white p-6 shadow-md
          ${textColor}
            shadow-2xl
            p-6 md:p-8
          `}
        >
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleFields.map(renderField)}
            </div>

            {hasSubmitButton && (
              <button
                type="submit"
                disabled={submitting}
                className={`
                  mt-8 w-full
                  rounded-2xl
                  ${textColor.replace('text-', 'bg-')} hover:bg-blue-700
                  text-white font-semibold
                  py-4
                  transition-all duration-300
                  shadow-lg hover:shadow-xl
                  disabled:opacity-50`}
              >
                {submitting ? 'Submitting...' : 'Submit Form'}
              </button>
            )}
          </form>
        </div>
      )}

      {!loading && visibleFields.length === 0 && !error && (
        <p className="text-gray-500 text-center py-8">No form fields configured.</p>
      )}

      {showSuccessModal && (
        <SuccessModal message={successMessage} onClose={() => setShowSuccessModal(false)} />
      )}
    </div>
  );
};

export default DynamicForm;
