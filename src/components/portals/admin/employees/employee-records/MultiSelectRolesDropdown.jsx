import React, { useState, useEffect, useRef } from 'react';

const SYSTEM_ROLES = [
  { id: 1, name: 'Guest' },
  { id: 2, name: 'Parents' },
  { id: 4, name: 'Staff' },
  { id: 8, name: 'Teacher' },
  { id: 16, name: 'Management' },
  { id: 32, name: 'Administrator' },
];

const MultiSelectRolesDropdown = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSum = parseInt(value, 10) || 0;
  const selectedRoles = SYSTEM_ROLES.filter((r) => (currentSum & r.id) !== 0);

  const handleToggle = (roleId) => {
    if (disabled) return;
    let nextSum;
    if ((currentSum & roleId) !== 0) {
      nextSum = currentSum - roleId;
    } else {
      nextSum = currentSum + roleId;
    }
    onChange(String(nextSum));
  };

  const displayText =
    selectedRoles.length > 0
      ? selectedRoles.map((r) => `${r.name} (${r.id})`).join(', ')
      : 'Select portal roles...';

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-xl outline-none transition-all font-bold text-xs shadow-sm ${
          disabled
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-purple-200 text-purple-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
        }`}
      >
        <span className="truncate pr-2">{displayText}</span>
        <i
          className={`fas fa-chevron-${open ? 'up' : 'down'} text-[9px] ${
            disabled ? 'text-gray-300' : 'text-purple-400'
          }`}
        ></i>
      </button>
      {!disabled && open && (
        <div className="absolute left-0 right-0 mt-1 p-2 bg-white border border-purple-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto scrollbar-thin animate-in fade-in duration-100">
          <div className="space-y-1">
            {SYSTEM_ROLES.map((role) => {
              const isChecked = (currentSum & role.id) !== 0;
              return (
                <label
                  key={role.id}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                    isChecked
                      ? 'bg-purple-100 text-purple-900'
                      : 'text-dark-soft hover:bg-purple-50 hover:text-dark-primary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(role.id)}
                    className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 border-gray-300"
                  />
                  <span className="truncate flex-1">
                    {role.name} ({role.id})
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectRolesDropdown;
