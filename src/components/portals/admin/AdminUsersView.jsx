// src/components/portals/admin/AdminUsersView.jsx
import React, { useState } from "react";

const UserRow = ({ user, onSave, saving }) => {
  const [roles, setRoles] = useState(user.role_ids || "");
  const [students, setStudents] = useState(user.student_ids || "");

  const hasChanges =
    roles !== (user.role_ids || "") || students !== (user.student_ids || "");

  return (
    <tr className="hover:bg-gray-50/50 transition-colors border-b border-light-border last:border-0 group">
      <td className="p-4">
        <div className="font-bold text-dark-deepblue text-base">
          {user.full_name || "New User"}
        </div>
        <div className="text-sm text-dark-muted">{user.email}</div>
      </td>
      <td className="p-4">
        <input
          type="text"
          value={roles}
          onChange={(e) => setRoles(e.target.value.toUpperCase())}
          placeholder="e.g. A,M,T,P"
          className="w-28 px-3 py-2 border border-light-border rounded-xl text-center focus:border-orange-primary focus:ring-4 focus:ring-orange-50 outline-none transition-all"
        />
      </td>
      <td className="p-4">
        <input
          type="text"
          value={students}
          onChange={(e) => setStudents(e.target.value)}
          placeholder="e.g. 101, 102"
          className="w-full min-w-[150px] px-4 py-2 border border-light-border rounded-xl focus:border-orange-primary focus:ring-4 focus:ring-orange-50 outline-none transition-all"
        />
      </td>
      <td className="p-4 text-right">
        <button
          onClick={() => onSave(roles, students)}
          disabled={saving || !hasChanges}
          className="bg-orange-primary text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-20 transition-all active:scale-95 shadow-lg shadow-orange-100"
        >
          {saving ? "..." : "Save"}
        </button>
      </td>
    </tr>
  );
};

const AdminUsersView = ({ users, loading, onUpdateUser, saving }) => {
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
          Assign role shorthand (A=admin, M=management, T=teacher, P=parent) and
          student IDs.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-gray-50/50 text-dark-deepblue uppercase text-xs font-bold tracking-wider">
              <th className="p-5 border-b">Name & Email</th>
              <th className="p-5 border-b">Roles (A,M,T,P)</th>
              <th className="p-5 border-b">Student IDs</th>
              <th className="p-5 border-b text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.user_id}
                user={u}
                onSave={(roles, students) =>
                  onUpdateUser(u.user_id, roles, students)
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
