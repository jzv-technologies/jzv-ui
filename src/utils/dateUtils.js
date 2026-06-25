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
