import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

const AdminPortal = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_users_view")
        .select("*");

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setMessage({ type: "error", text: "Failed to load users." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllUsers();
    }
  }, [isOpen]);

  const handleUpdateUser = async (userId, roleIds, studentIds) => {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role_ids: roleIds, student_ids: studentIds })
        .eq("user_id", userId);

      if (error) throw error;
      
      setMessage({ type: "success", text: "User updated successfully!" });
      fetchAllUsers(); // Refresh
    } catch (err) {
      console.error("Error updating user:", err);
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-dark-almostblack bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-orange-primary text-white flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">Admin Management</h3>
            <p className="text-orange-100 text-sm">Manage user roles and student assignments</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all flex items-center justify-center"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {message.text && (
            <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${
              message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
            }`}>
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center py-20">
              <div className="w-12 h-12 border-4 border-orange-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-dark-muted font-medium">Loading user database...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-dark-deepblue uppercase text-xs font-bold tracking-wider">
                    <th className="p-4 border-b">Name</th>
                    <th className="p-4 border-b text-center">Roles (A,M,T,P)</th>
                    <th className="p-4 border-b">Student IDs (Comma separated)</th>
                    <th className="p-4 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.map((u) => (
                    <UserRow 
                      key={u.user_id} 
                      user={u} 
                      onSave={(roles, students) => handleUpdateUser(u.user_id, roles, students)}
                      saving={saving}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UserRow = ({ user, onSave, saving }) => {
  const [roles, setRoles] = useState(user.role_ids || "");
  const [students, setStudents] = useState(user.student_ids || "");

  return (
    <tr className="hover:bg-gray-50 border-b border-light-border group">
      <td className="p-4">
        <div className="font-bold text-dark-deepblue">{user.full_name || "No Name"}</div>
        <div className="text-xs text-dark-muted">{user.email}</div>
      </td>
      <td className="p-4 text-center">
        <input 
          type="text"
          value={roles}
          onChange={(e) => setRoles(e.target.value.toUpperCase())}
          placeholder="e.g. P,T"
          className="w-20 px-2 py-1 border border-light-border rounded text-center focus:border-orange-primary outline-none"
        />
      </td>
      <td className="p-4">
        <input 
          type="text"
          value={students}
          onChange={(e) => setStudents(e.target.value)}
          placeholder="e.g. 101, 102"
          className="w-full px-3 py-1 border border-light-border rounded focus:border-orange-primary outline-none"
        />
      </td>
      <td className="p-4 text-right">
        <button
          onClick={() => onSave(roles, students)}
          disabled={saving || (roles === user.role_ids && students === user.student_ids)}
          className="bg-orange-primary text-white px-4 py-1 rounded font-bold text-xs hover:bg-orange-600 disabled:opacity-30 transition-all active:scale-95"
        >
          {saving ? "..." : "Save"}
        </button>
      </td>
    </tr>
  );
};

export default AdminPortal;
