/**
 * Employee option lists.
 *
 * IMPORTANT: "Designation" is the HR/employment classification stored in
 * `employees.designation`. It is NOT a portal role (portal roles live in
 * `user_roles` / app roles and are edited in the Portal Access section).
 * Keep the two lists separate so new designations never leak into role lists
 * and vice versa.
 */
export const DEFAULT_DESIGNATIONS = [
  'Teacher',
  'Principal',
  'Vice Principal',
  'Management',
  'Coordinator',
  'Accountant',
  'Librarian',
  'Office Staff',
  'Staff',
  'Security',
  'Driver',
  'Agent',
];

/**
 * Options for a designation dropdown: the defaults plus any value already saved
 * on the record or used by other employees, so editing never drops a value that
 * is not in the static list.
 */
export const getDesignationOptions = (...extraValues) => {
  const options = [...DEFAULT_DESIGNATIONS];
  extraValues.flat().forEach((value) => {
    const label = String(value ?? '').trim();
    if (label && !options.some((option) => option.toLowerCase() === label.toLowerCase())) {
      options.push(label);
    }
  });
  return options;
};
