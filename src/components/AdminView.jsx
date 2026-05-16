import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

const AdminView = ({ currentView, subView, onSetSubView, onGoHome }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      // Use upsert to handle case where user_id might be new to user_roles table
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

  const Breadcrumbs = () => (
    <div className="flex items-center gap-2 text-sm text-dark-muted mb-8 bg-green-50 p-4 border border-light-border">
      <button onClick={onGoHome} className="hover:text-orange-primary flex items-center gap-1 transition-colors">
        <i className="fas fa-home"></i> Home
      </button>
      <i className="fas fa-chevron-right text-[10px] opacity-30"></i>
      <button 
        onClick={() => onSetSubView(null)} 
        className={`${!subView ? 'text-orange-primary font-bold' : 'hover:text-orange-primary'} transition-colors`}
      >
        Admin Portal
      </button>
      {subView && (
        <>
          <i className="fas fa-chevron-right text-[10px] opacity-30"></i>
          <span className="text-orange-primary font-bold capitalize">{subView}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="max-w-9xl">
      <Breadcrumbs />

      {!subView ? (
        <div className="max-w-9xl space-y-12 px mx-auto px-6 py-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button 
              onClick={() => onSetSubView('users')}
              className="group p-10 bg-white border border-light-border rounded-3xl hover:border-orange-primary hover:shadow-2xl transition-all flex items-center gap-8 text-left"
            >
              <div className="w-20 h-20 bg-orange-50 text-orange-primary rounded-2xl flex items-center justify-center text-3xl group-hover:bg-orange-primary group-hover:text-white transition-all">
                <i className="fas fa-users"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-dark-deepblue">User Management</h3>
                <p className="text-dark-muted">Manage roles and permissions for all users.</p>
              </div>
            </button>

            <button 
              onClick={() => onSetSubView('students')}
              className="group p-10 bg-white border border-light-border rounded-3xl hover:border-green-primary hover:shadow-2xl transition-all flex items-center gap-8 text-left"
            >
              <div className="w-20 h-20 bg-green-50 text-green-primary rounded-2xl flex items-center justify-center text-3xl group-hover:bg-green-primary group-hover:text-white transition-all">
                <i className="fas fa-user-graduate"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-dark-deepblue">Student Database</h3>
                <p className="text-dark-muted">View and assign student records to parents.</p>
              </div>
            </button>
          </div>
        </div>
      ) : subView === "users" ? (
        <div className="bg-white border border-light-border shadow-xl overflow-hidden">
          <div className="p-8 border-b border-light-border flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="text-2xl font-bold text-dark-deepblue">Manage Users</h3>
              <p className="text-sm text-dark-muted">Assign role shorthand (A,M,T,P) and student IDs.</p>
            </div>
            {message.text && (
              <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              }`}>
                {message.text}
              </div>
            )}
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
      ) : (
        <div className="bg-white p-20 rounded-3xl border border-light-border text-center">
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
      )}
      </div>
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

export default AdminView;
