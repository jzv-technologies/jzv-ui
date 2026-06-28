// src/components/portals/admin/AdminUsersView.jsx
import React, { useState, useEffect, useRef } from "react";

const ROLES = [
  { id: 1, name: "Guest" },
  { id: 2, name: "Parents" },
  { id: 4, name: "Staff" },
  { id: 8, name: "Teacher" },
  { id: 16, name: "Management" },
  { id: 32, name: "Administrator" },
];

const getInitialRolesSum = (roleIds) => {
  if (!roleIds) return "0";
  const sumValue = parseInt(roleIds, 10);
  if (!isNaN(sumValue)) return String(sumValue);

  // Parse legacy format (e.g. "A,T")
  const roleMap = {
    A: 32, // admin
    M: 16, // management
    T: 8,  // teacher
    S: 4,  // staff
    P: 2,  // parent
    G: 1,  // guest
  };
  const legacySum = roleIds
    .split(",")
    .map((code) => roleMap[code.trim().toUpperCase()] || 0)
    .reduce((acc, val) => acc + val, 0);

  return String(legacySum);
};

const MultiSelectRolesDropdown = ({ value, onChange }) => {
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

  const currentSum = parseInt(value, 10) || 0;
  const selectedRoles = ROLES.filter((r) => (currentSum & r.id) !== 0);

  const handleToggle = (roleId) => {
    let nextSum;
    if ((currentSum & roleId) !== 0) {
      nextSum = currentSum - roleId;
    } else {
      nextSum = currentSum + roleId;
    }
    onChange(String(nextSum));
  };

  const displayText = selectedRoles.length > 0
    ? selectedRoles.map((r) => `${r.name} (${r.id})`).join(", ")
    : "Select roles...";

  return (
    <div className="relative w-full min-w-[200px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white border border-light-border rounded-xl focus:border-orange-primary focus:ring-4 focus:ring-orange-50 outline-none transition-all font-semibold text-xs text-dark-primary text-left shadow-sm"
      >
        <span className="truncate pr-2">{displayText}</span>
        <i className={`fas fa-chevron-${open ? "up" : "down"} text-[9px] text-dark-muted`}></i>
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 p-1 bg-white border border-light-border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="space-y-0.5">
            {ROLES.map((role) => {
              const isChecked = (currentSum & role.id) !== 0;
              return (
                <label
                  key={role.id}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                    isChecked
                      ? "bg-orange-50 text-orange-primary"
                      : "text-dark-soft hover:bg-light-lbg/50 hover:text-dark-primary"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(role.id)}
                    className="rounded text-orange-primary focus:ring-orange-soft w-3.5 h-3.5 border-light-border"
                  />
                  <span className="truncate flex-1">{role.name} ({role.id})</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const UserRow = ({ user, onSave, saving, teachers = [] }) => {
  const [roles, setRoles] = useState(() => getInitialRolesSum(user.role));
  
  // Find which teacher is currently linked to this user's user_id
  const initiallyLinkedTeacher = teachers.find((t) => String(t.auth_id) === String(user.user_id));
  const [selectedTeacherId, setSelectedTeacherId] = useState(initiallyLinkedTeacher?.id || "");

  const initialSum = getInitialRolesSum(user.role);
  const hasChanges =
    roles !== initialSum ||
    String(selectedTeacherId) !== String(initiallyLinkedTeacher?.id || "");

  return (
    <tr className="hover:bg-gray-50/50 transition-colors border-b border-light-border last:border-0 group">
      <td className="p-4">
        <div className="font-bold text-dark-deepblue text-base">
          {user.full_name || "New User"}
        </div>
        <div className="text-sm text-dark-muted">{user.email}</div>
      </td>
      <td className="p-4">
        <MultiSelectRolesDropdown
          value={roles}
          onChange={setRoles}
        />
      </td>
      <td className="p-4">
        <select
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          className="w-full min-w-[150px] px-3 py-2 bg-white border border-light-border rounded-xl focus:border-orange-primary focus:ring-4 focus:ring-orange-50 outline-none transition-all font-semibold text-xs text-dark-primary"
        >
          <option value="">-- None --</option>
          {teachers.map((t) => {
            const isAlreadyMappedToOther = t.auth_id && String(t.auth_id) !== String(user.user_id);
            return (
              <option
                key={t.id}
                value={t.id}
                disabled={isAlreadyMappedToOther}
              >
                {t.name} {isAlreadyMappedToOther ? "(Mapped)" : ""}
              </option>
            );
          })}
        </select>
      </td>
      <td className="p-4 text-right">
        <button
          onClick={() => onSave(roles, selectedTeacherId)}
          disabled={saving || !hasChanges}
          className="bg-orange-primary text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-20 transition-all active:scale-95 shadow-lg shadow-orange-100"
        >
          {saving ? "..." : "Save"}
        </button>
      </td>
    </tr>
  );
};

const AdminUsersView = ({ users, loading, onUpdateUser, saving, teachers = [] }) => {
  if (loading) {
    return (
      <div className="bg-white p-20 text-center">
        <i className="fas fa-spinner fa-spin text-3xl text-orange-primary"></i>
        <p className="mt-4 text-dark-muted">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-light-border shadow-xl overflow-hidden rounded-2xl">
      <div className="p-5 border-b border-light-border bg-gray-50/50">
        <h3 className="text-2xl font-bold text-dark-deepblue">Manage Users</h3>
        <p className="text-sm text-dark-muted">
          Assign user roles using multi-select and map teachers.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/50 text-dark-deepblue uppercase text-xs font-bold tracking-wider">
              <th className="p-5 border-b">Name & Email</th>
              <th className="p-5 border-b">Roles</th>
              <th className="p-5 border-b">Linked Teacher</th>
              <th className="p-5 border-b text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.user_id}
                user={u}
                teachers={teachers}
                onSave={(roles, teacherId) =>
                  onUpdateUser(u.user_id, roles, teacherId)
                }
                saving={saving}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsersView;
