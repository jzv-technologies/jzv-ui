/**
 * Utility helper to parse employee joining date and check if a target month/year
 * is prior to the employee's joining date.
 */

export const getEmployeeJoiningYearMonth = (joiningDateStr) => {
  if (!joiningDateStr || typeof joiningDateStr !== 'string') return null;
  const str = joiningDateStr.trim();
  if (!str) return null;

  // Handle ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (!isNaN(year) && !isNaN(month)) return { year, month };
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY format
  if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/.test(str)) {
    const parts = str.split(/[-\/]/);
    const year = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    if (!isNaN(year) && !isNaN(month)) return { year, month };
  }

  return null;
};

export const isMonthBeforeJoining = (empJoiningDate, targetYear, targetMonth) => {
  const joining = getEmployeeJoiningYearMonth(empJoiningDate);
  if (!joining) return false;

  if (targetYear < joining.year) return true;
  if (targetYear === joining.year && targetMonth < joining.month) return true;
  return false;
};
