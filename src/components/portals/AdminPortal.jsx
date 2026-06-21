// src/components/portals/AdminPortal.jsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../utils/supabase";
import RolePortal from "./RolePortal";
import AdminUsersView from "./admin/AdminUsersView";
import AdminFormConfigsView from "./admin/AdminFormConfigsView";
import TimetableManager from "./admin/timetable/TimetableManager";
import AdminStudentsView from "./admin/AdminStudentsView";
import SyllabusManager from "./admin/syllabus/SyllabusManager";
import ConfirmModal from "../ConfirmModal";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const AdminPortal = ({ userRoles, subView, onSetSubView }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [teachers, setTeachers] = useState([]);

  // Form configs state
  const [configs, setConfigs] = useState([]);
  const [dbTableMissing, setDbTableMissing] = useState(false);
  const [appsScriptError, setAppsScriptError] = useState("");
  const [configsLoading, setConfigsLoading] = useState(false);

  const fetchingRef = useRef(false);
  const lastSubViewRef = useRef(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // ----- User Management -----
  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase.from("teachers").select("*");
      if (error) throw error;
      setTeachers(data || []);
    } catch (err) {
      console.warn("Error fetching teachers from Supabase, loading from LocalStorage:", err.message);
      const raw = localStorage.getItem('jzv_timetable_data');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setTeachers(parsed.teachers || []);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const fetchAllUsers = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
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
      fetchingRef.current = false;
    }
  };

  const handleUpdateUser = async (userId, roleIds, studentIds, teacherId) => {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      // 1. Upsert roles and students
      const { error: roleErr } = await supabase.from("user_roles").upsert(
        {
          user_id: userId,
          role_ids: roleIds,
          student_ids: studentIds,
        },
        { onConflict: "user_id" },
      );
      if (roleErr) throw roleErr;

      // 2. Map teacher auth_id
      // Clear previous mapping for this user
      await supabase
        .from("teachers")
        .update({ auth_id: null })
        .eq("auth_id", userId);

      // Link new mapping if selected
      if (teacherId) {
        const { error: teachErr } = await supabase
          .from("teachers")
          .update({ auth_id: userId })
          .eq("id", teacherId);
        if (teachErr) throw teachErr;
      }

      // 3. Fallback/Local storage sync
      const raw = localStorage.getItem('jzv_timetable_data');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const nextTeachers = (parsed.teachers || []).map(t => {
            if (String(t.auth_id) === String(userId)) {
              return { ...t, auth_id: null };
            }
            if (teacherId && String(t.id) === String(teacherId)) {
              return { ...t, auth_id: userId };
            }
            return t;
          });
          parsed.teachers = nextTeachers;
          localStorage.setItem('jzv_timetable_data', JSON.stringify(parsed));
        } catch (e) {
          console.error(e);
        }
      }

      setMessage({ type: "success", text: "User updated successfully!" });
      fetchAllUsers(); // refresh
      fetchTeachers(); // refresh mapping state
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ----- Form Configurations -----
  const fetchConfigs = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setConfigsLoading(true);
    setDbTableMissing(false);
    setAppsScriptError("");
    try {
      // 1. Apps Script configs
      let appsScriptConfigs = [];
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=list-configs`);
        const resData = await res.json();
        if (resData.success) {
          appsScriptConfigs = resData.data || [];
        } else {
          setAppsScriptError(
            resData.error || "Failed to retrieve configurations.",
          );
        }
      } catch (err) {
        setAppsScriptError("Connection failed. Check Apps Script deployment.");
      }

      // 2. Supabase configs
      let supabaseConfigs = [];
      try {
        const { data, error } = await supabase
          .from("dynamic_form_configs")
          .select("*");
        if (error) {
          if (error.code === "42P01") setDbTableMissing(true);
          throw error;
        }
        supabaseConfigs = data || [];
      } catch (err) {
        console.warn("Supabase configs fetch failed:", err);
      }

      // 3. Merge
      const merged = [];
      appsScriptConfigs.forEach((ac) => {
        const matchingDb = supabaseConfigs.find((sc) => sc.uuid === ac.uuid);
        merged.push({
          uuid: ac.uuid,
          dataSheetName: ac.dataSheetName,
          configSheetName: ac.configSheetName,
          idPattern: ac.idPattern,
          isDb: !!matchingDb,
          dbId: matchingDb?.id || null,
          fields: matchingDb?.fields || null,
        });
      });
      supabaseConfigs.forEach((sc) => {
        if (!merged.some((m) => m.uuid === sc.uuid)) {
          merged.push({
            uuid: sc.uuid,
            dataSheetName: "N/A (DB Only)",
            configSheetName: "N/A (DB Only)",
            idPattern: "ID-XXXXX",
            isDb: true,
            dbId: sc.id,
            fields: sc.fields,
          });
        }
      });
      setConfigs(merged);
    } catch (err) {
      setMessage({
        type: "error",
        text: "Failed to load form configurations.",
      });
    } finally {
      setConfigsLoading(false);
      fetchingRef.current = false;
    }
  };

  const handleSaveConfig = async (uuid, fields) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("dynamic_form_configs")
        .upsert(
          { uuid: uuid.trim(), fields, updated_at: new Date().toISOString() },
          { onConflict: "uuid" },
        );
      if (error) throw error;
      setMessage({ type: "success", text: `Form schema "${uuid}" saved.` });
      fetchConfigs();
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = (config) => {
    setConfirmConfig({
      title: "Delete Configuration",
      message: `Delete "${config.uuid}" from database?`,
      confirmText: "Delete",
      type: "danger",
      onConfirm: async () => {
        setConfirmConfig(null);
        setSaving(true);
        try {
          const { error } = await supabase
            .from("dynamic_form_configs")
            .delete()
            .eq("uuid", config.uuid);
          if (error) throw error;
          setMessage({
            type: "success",
            text: `Form schema "${config.uuid}" removed.`,
          });
          fetchConfigs();
        } catch (err) {
          setMessage({ type: "error", text: "Failed to delete: " + err.message });
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // ----- View switching -----
  useEffect(() => {
    if (subView === lastSubViewRef.current) return;
    lastSubViewRef.current = subView;
    if (subView === "users") {
      fetchAllUsers();
      fetchTeachers();
    } else if (subView === "configs") {
      fetchConfigs();
    }
  }, [subView]);

  // Admin tiles (same as before, but "Clear cache" removed – can be re-added if needed)
  const adminTiles = [
    {
      id: "users",
      title: "User Management",
      description: "Manage roles and permissions for all users.",
      icon: "fa-users",
      buttonColor: "bg-orange-primary text-white",
      shadow: "shadow-orange-200",
      onClick: () => onSetSubView("users"),
    },
    {
      id: "configs",
      title: "Form Configurations",
      description:
        "Configure fields, validation, and overrides in the database.",
      icon: "fa-sliders-h",
      buttonColor: "bg-blue-600 text-white",
      shadow: "shadow-blue-200",
      onClick: () => onSetSubView("configs"),
    },
    {
      id: "students",
      title: "Student Database",
      description: "View and assign student records to parents.",
      icon: "fa-user-graduate",
      buttonColor: "bg-green-dark text-white",
      shadow: "shadow-green-200",
      onClick: () => onSetSubView("students"),
    },
    {
      id: "timetable",
      title: "Timetable Planner",
      description: "Manage classes, teachers, subjects, and schedule conflict-free timetables.",
      icon: "fa-calendar-alt",
      buttonColor: "bg-brand-primary text-white",
      shadow: "shadow-brand-lbg",
      onClick: () => onSetSubView("timetable"),
    },
    {
      id: "syllabus",
      title: "Syllabus Manager",
      description: "Manage curriculum nodes, subjects, books, units, chapters, and lessons.",
      icon: "fa-book-open",
      buttonColor: "bg-emerald-600 text-white",
      shadow: "shadow-emerald-200",
      onClick: () => onSetSubView("syllabus"),
    },
  ];

  return (
    <RolePortal
      userRoles={userRoles}
      role="admin"
      tiles={adminTiles}
      subView={subView}
      onSetSubView={onSetSubView}
    >
      {/* Toast message */}
      {message.text && (
        <div className="mb-6 flex justify-center">
          <div
            className={`px-6 py-2 rounded-full text-sm font-bold shadow-lg animate-in fade-in zoom-in duration-300 ${
              message.type === "error"
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-green-50 text-green-600 border border-green-100"
            }`}
          >
            <i
              className={`fas ${message.type === "error" ? "fa-exclamation-circle" : "fa-check-circle"} mr-2`}
            ></i>
            {message.text}
          </div>
        </div>
      )}

      {/* Users view (now using DataGrid + Modal) */}
      {subView === "users" && (
        <AdminUsersView
          users={users}
          loading={loading}
          onUpdateUser={handleUpdateUser}
          saving={saving}
          teachers={teachers}
        />
      )}

      {/* Form configs view (kept as before) */}
      {subView === "configs" && (
        <AdminFormConfigsView
          configs={configs}
          loading={configsLoading}
          dbTableMissing={dbTableMissing}
          appsScriptError={appsScriptError}
          onRefresh={fetchConfigs}
          onSaveConfig={handleSaveConfig}
          onDeleteConfig={handleDeleteConfig}
          onBack={() => onSetSubView(null)}
        />
      )}

      {/* Timetable Planner view */}
      {subView === "timetable" && (
        <TimetableManager />
      )}

      {/* Student Database view */}
      {subView === "students" && (
        <AdminStudentsView />
      )}

      {/* Syllabus Manager view */}
      {subView === "syllabus" && (
        <SyllabusManager role="admin" />
      )}

      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </RolePortal>
  );
};

export default AdminPortal;
