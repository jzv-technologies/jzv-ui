// src/utils/dateUtils.js

/**
 * Calculates age based on a birth date string (YYYY-MM-DD)
 * @param {string} birthDateStr
 * @returns {string} age with 1 decimal point, or empty string
 */
export const calculateAge = (birthDateStr) => {
  if (!birthDateStr) return "";
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  const diffTime = today.getTime() - birthDate.getTime();
  if (diffTime < 0) return "0.0";
  const ageYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return ageYears.toFixed(1);
};

/**
 * Parses a date string (YYYY-MM-DD) into a local Date object without UTC offset distortion.
 * @param {string|Date} dateStr
 * @returns {Date|null}
 */
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  const str = String(dateStr).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Formats a local Date object as a YYYY-MM-DD string using local calendar year, month, and day.
 * @param {Date} dateObj
 * @returns {string}
 */
export const formatLocalDateStr = (dateObj) => {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Generates an inclusive array of YYYY-MM-DD strings between startDateStr and endDateStr.
 * Uses local calendar date arithmetic to avoid any UTC timezone shift.
 * @param {string} startDateStr
 * @param {string} endDateStr
 * @returns {string[]}
 */
export const generateDateRange = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return [];
  const cur = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  if (!cur || !end || isNaN(cur.getTime()) || isNaN(end.getTime())) return [];
  if (cur > end) return [];

  const dates = [];
  while (cur <= end) {
    dates.push(formatLocalDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

/**
 * Formats a date string into a user-friendly localized string.
 * @param {string|Date} dateStr
 * @param {Intl.DateTimeFormatOptions} options
 * @param {string} locale
 * @returns {string}
 */
export const formatDateDisplay = (
  dateStr,
  options = { day: '2-digit', month: 'short', year: 'numeric' },
  locale = 'en-IN'
) => {
  if (!dateStr) return '—';
  const dateObj = parseLocalDate(dateStr);
  if (!dateObj) return '—';
  return dateObj.toLocaleDateString(locale, options);
};
