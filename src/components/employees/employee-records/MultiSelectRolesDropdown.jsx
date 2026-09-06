import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SYSTEM_ROLES,
  normalizeRoles,
  fetchAllAppRoles,
} from '../../../utils/roleUtils';

const MultiSelectRolesDropdown = ({ value, onChange, disabled, rolesList }) => {
  const [open, setOpen] = useState(false);
  const [allRoles, setAllRoles] = useState(rolesList || SYSTEM_ROLES);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    if (!rolesList) {
      fetchAllAppRoles().then((roles) => {
        if (mounted && Array.isArray(roles) && roles.length > 0) {
          setAllRoles(roles);
        }
      });
    } else {
      setAllRoles(rolesList);
    }
    return () => {
      mounted = false;
    };
  }, [rolesList]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse incoming value into an array of string role keys
  const selectedRoleKeys = useMemo(() => {
    return normalizeRoles(value);
  }, [value]);

  const selectedRoles = useMemo(() => {
    return allRoles.filter((r) => selectedRoleKeys.includes(r.id));
  }, [allRoles, selectedRoleKeys]);

  const handleToggle = (roleKey) => {
    if (disabled) return;
    const cleanKey = String(roleKey).toLowerCase().trim();
    let nextRoles;
    if (selectedRoleKeys.includes(cleanKey)) {
      nextRoles = selectedRoleKeys.filter((k) => k !== cleanKey);
    } else {
      nextRoles = [...selectedRoleKeys, cleanKey];
    }
    if (onChange) {
      onChange(nextRoles);
    }
  };

  const displayText =
    selectedRoles.length > 0
      ? selectedRoles.map((r) => r.label || r.name).join(', ')
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
        <div className="absolute left-0 right-0 mt-1 p-2 bg-white border border-purple-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto scrollbar-thin animate-in fade-in duration-100 space-y-1">
          {allRoles.map((role) => {
            const isChecked = selectedRoleKeys.includes(role.id);
            return (
              <label
                key={role.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${
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
                  {role.label || role.name}
                </span>
                {role.is_system_role === false && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-200/80 text-purple-800">
                    Custom
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultiSelectRolesDropdown;
