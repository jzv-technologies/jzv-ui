import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import RolePortal from "./RolePortal";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const AdminPortal = ({ userRoles, subView, onSetSubView }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("admin_users_view").select("*");
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
    if (subView === "users") {
      fetchAllUsers();
    }
  }, [subView]);

  const handleUpdateUser = async (userId, roleIds, studentIds) => {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ 
          user_id: userId, 
          role_ids: roleIds, 
          student_ids: studentIds 
        }, { 
          onConflict: 'user_id' 
        });

      if (error) throw error;
      
      setMessage({ type: "success", text: "User updated successfully!" });
      fetchAllUsers(); 
    } catch (err) {
      console.error("Error updating user:", err);
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleInvalidateCache = async () => {
    if (cacheLoading) return;
    setCacheLoading(true);
    setMessage({ type: "info", text: "Invalidating form cache..." });
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({
          action: "invalidate-form-cache",
          uuid: "admin"
        }),
      });
      
      const result = await res.json();
      if (result.success) {
        setMessage({ 
          type: "success", 
          text: result.data?.message || "Form cache invalidated successfully!" 
        });
      } else {
        throw new Error(result.error || "Failed to invalidate cache");
      }
    } catch (err) {
      console.error("Cache error:", err);
      setMessage({ type: "error", text: "Failed to invalidate cache. Please check console." });
    } finally {
      setCacheLoading(false);
    }
  };

  const adminTiles = [
    {
      id: "users",
      title: "User Management",
      description: "Manage roles and permissions for all users.",
      icon: "fa-users",
      buttonColor: "bg-orange-primary text-white",
      shadow: "shadow-orange-200",
      onClick: () => onSetSubView('users')
    },
    {
      id: "students",
      title: "Student Database",
      description: "View and assign student records to parents.",
      icon: "fa-user-graduate",
      buttonColor: "bg-green-dark text-white",
      shadow: "shadow-green-200",
      onClick: () => onSetSubView('students')
    },
    {
      id: "clear-cache",
      title: "Clear Form Cache",
      description: cacheLoading ? "Processing request..." : "Force refresh dynamic form configurations from source.",
      icon: cacheLoading ? "fa-spinner fa-spin" : "fa-sync-alt",
      buttonColor: "bg-red-600 text-white",
      shadow: "shadow-red-200",
      onClick: handleInvalidateCache
    }
  ];

  return (
    <RolePortal 
      userRoles={userRoles} 
      role="admin" 
      tiles={adminTiles}
      subView={subView}
      onSetSubView={onSetSubView}
    >
      <div className="mb-6 h-10 flex items-center justify-center">
        {message.text && (
          <div className={`px-6 py-2 rounded-full text-sm font-bold shadow-lg animate-in fade-in zoom-in duration-300 ${
            message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 
            message.type === 'info' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
            'bg-green-50 text-green-600 border border-green-100'
          }`}>
            <i className={`fas ${message.type === 'error' ? 'fa-exclamation-circle' : message.type === 'info' ? 'fa-info-circle' : 'fa-check-circle'} mr-2`}></i>
            {message.text}
          </div>
        )}
      </div>

      {subView === "users" ? (
        <div className="bg-white border border-light-border shadow-xl overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-light-border flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="text-2xl font-bold text-dark-deepblue">Manage Users</h3>
              <p className="text-sm text-dark-muted">Assign role shorthand (A,M,T,P) and student IDs.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-dark-deepblue uppercase text-xs font-bold tracking-wider">
                  <th className="p-6 border-b">Name & Email</th>
                  <th className="p-6 border-b text-center">Roles (A,M,T,P)</th>
                  <th className="p-6 border-b">Student IDs</th>
                  <th className="p-6 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
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
        </div>
      ) : subView === "students" ? (
        <div className="bg-white p-20 rounded-3xl border border-light-border text-center shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 bg-green-50 text-green-primary rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <h3 className="text-2xl font-bold text-dark-deepblue mb-2">Student Database</h3>
          <p className="text-dark-muted">Student management module is coming soon.</p>
          <button 
            onClick={() => onSetSubView(null)}
            className="mt-8 text-orange-primary font-bold hover:underline"
          >
            Go Back
          </button>
        </div>
      ) : null}
    </RolePortal>
  );
};

const UserRow = ({ user, onSave, saving }) => {
  const [roles, setRoles] = useState(user.role_ids || "");
  const [students, setStudents] = useState(user.student_ids || "");

  const hasChanges = roles !== (user.role_ids || "") || students !== (user.student_ids || "");

  return (
    <tr className="hover:bg-gray-50/50 transition-colors border-b border-light-border last:border-0 group">
      <td className="p-6">
        <div className="font-bold text-dark-deepblue text-base">{user.full_name || "New User"}</div>
        <div className="text-sm text-dark-muted">{user.email}</div>
      </td>
      <td className="p-6 text-center">
        <input 
          type="text"
          value={roles}
          onChange={(e) => setRoles(e.target.value.toUpperCase())}
          placeholder="e.g. P,T"
          className="w-24 px-3 py-2 border border-light-border rounded-xl text-center focus:border-orange-primary focus:ring-4 focus:ring-orange-50 outline-none transition-all"
        />
      </td>
      <td className="p-6">
        <input 
          type="text"
          value={students}
          onChange={(e) => setStudents(e.target.value)}
          placeholder="e.g. 101, 102"
          className="w-full px-4 py-2 border border-light-border rounded-xl focus:border-orange-primary focus:ring-4 focus:ring-orange-50 outline-none transition-all"
        />
      </td>
      <td className="p-6 text-right">
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

export default AdminPortal;
