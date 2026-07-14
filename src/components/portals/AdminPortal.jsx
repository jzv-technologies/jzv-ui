// src/components/portals/AdminPortal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import RolePortal from './RolePortal';
import AdminUsersView from './admin/AdminUsersView';
import AdminFormConfigsView from './admin/AdminFormConfigsView';
import TimetableManager from './admin/timetable/TimetableManager';
import AdminStudentsView from './admin/AdminStudentsView';
import SyllabusManager from './admin/syllabus/SyllabusManager';
import SyllabusTrackerPortal from './shared-components/SyllabusTrackerPortal';
import LessonManager from './teacher/LessonManager/LessonManager';
import ConfirmModal from '../ConfirmModal';
import { showToast } from '../../utils/toast';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const AdminPortal = ({ userRoles, subView, onSetSubView, user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState([]);

  // Form configs state
  const [configs, setConfigs] = useState([]);
  const [dbTableMissing, setDbTableMissing] = useState(false);
  const [appsScriptError, setAppsScriptError] = useState('');
  const [configsLoading, setConfigsLoading] = useState(false);
  const [sheetMappings, setSheetMappings] = useState([]);

  const fetchingRef = useRef(false);
  const lastSubViewRef = useRef(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // ----- User Management -----
  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase.from('teachers').select('*');
      if (error) throw error;
      setTeachers(data || []);
    } catch (err) {
      console.warn(
        'Error fetching teachers from Supabase, loading from LocalStorage:',
        err.message
      );
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
      const { data, error } = await supabase.from('admin_users_view').select('*');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('Failed to load users.', 'error');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const handleUpdateUser = async (userId, role, teacherId) => {
    setSaving(true);
    try {
      // 1. Upsert roles and students
      const { error: roleErr } = await supabase.from('user_roles').upsert(
        {
          user_id: userId,
          role: role,
        },
        { onConflict: 'user_id' }
      );
      if (roleErr) throw roleErr;

      // 2. Map teacher auth_id
      // Clear previous mapping for this user
      await supabase.from('teachers').update({ auth_id: null }).eq('auth_id', userId);

      // Link new mapping if selected
      if (teacherId) {
        const { error: teachErr } = await supabase
          .from('teachers')
          .update({ auth_id: userId })
          .eq('id', teacherId);
        if (teachErr) throw teachErr;
      }

      // 3. Fallback/Local storage sync
      const raw = localStorage.getItem('jzv_timetable_data');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const nextTeachers = (parsed.teachers || []).map((t) => {
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

      showToast('User updated successfully!', 'success');
      fetchAllUsers(); // refresh
      fetchTeachers(); // refresh mapping state
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTeacherFromUser = async (userId, fullName) => {
    setSaving(true);
    try {
      // 1. Create the teacher in the database
      const { data: newTeacherData, error: insertErr } = await supabase
        .from('teachers')
        .insert([
          {
            name: fullName,
            auth_id: userId,
            is_active: true,
          },
        ])
        .select();

      if (insertErr) throw insertErr;
      const newTeacher = newTeacherData[0];

      // 2. Update the user's role to include Teacher role (8)
      const user = users.find((u) => String(u.user_id) === String(userId));
      const currentRole = user ? parseInt(user.role, 10) || 0 : 0;
      const newRoleSum = String(currentRole | 8);

      const { error: roleErr } = await supabase.from('user_roles').upsert(
        {
          user_id: userId,
          role: newRoleSum,
        },
        { onConflict: 'user_id' }
      );
      if (roleErr) throw roleErr;

      // 3. Fallback/Local storage sync
      const raw = localStorage.getItem('jzv_timetable_data');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const localTeachers = parsed.teachers || [];
          const nextTeachers = localTeachers.map((t) =>
            String(t.auth_id) === String(userId) ? { ...t, auth_id: null } : t
          );
          nextTeachers.push({
            id: newTeacher.id,
            name: fullName,
            is_male: true,
            auth_id: userId,
            is_active: true,
            subjects: [],
          });
          parsed.teachers = nextTeachers;
          localStorage.setItem('jzv_timetable_data', JSON.stringify(parsed));
        } catch (e) {
          console.error(e);
        }
      }

      showToast(`Teacher record created and mapped for "${fullName}"`, 'success');
      fetchAllUsers();
      fetchTeachers();
    } catch (err) {
      showToast('Failed to add teacher: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTeacherActiveFromUser = async (teacherId, currentStatus) => {
    setSaving(true);
    const nextStatus = !currentStatus;
    try {
      const { error } = await supabase
        .from('teachers')
        .update({ is_active: nextStatus })
        .eq('id', teacherId);

      if (error) throw error;

      // Local storage sync
      const raw = localStorage.getItem('jzv_timetable_data');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          parsed.teachers = (parsed.teachers || []).map((t) =>
            String(t.id) === String(teacherId) ? { ...t, is_active: nextStatus } : t
          );
          localStorage.setItem('jzv_timetable_data', JSON.stringify(parsed));
        } catch (e) {
          console.error(e);
        }
      }

      showToast(`Teacher status updated to ${nextStatus ? 'Active' : 'Inactive'}`, 'success');
      fetchAllUsers();
      fetchTeachers();
    } catch (err) {
      showToast('Failed to update status: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ----- Form Configurations & Sheet Mappings -----
  const fetchConfigs = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setConfigsLoading(true);
    setDbTableMissing(false);
    setAppsScriptError('');
    try {
      // 1. Fetch form configs from Supabase
      const { data: supabaseConfigs, error: configsError } = await supabase
        .from('dynamic_form_configs')
        .select('*');
      if (configsError) {
        if (configsError.code === '42P01') setDbTableMissing(true);
        throw configsError;
      }

      // 2. Fetch sheet mappings from Supabase
      const { data: sheetMappingsData, error: mappingsError } = await supabase
        .from('google_sheet_mappings')
        .select('*');
      if (mappingsError) {
        throw mappingsError;
      }

      setConfigs(supabaseConfigs || []);
      setSheetMappings(sheetMappingsData || []);
    } catch (err) {
      console.error('fetchConfigs error:', err);
      showToast('Failed to load form configurations and sheet mappings: ' + err.message, 'error');
    } finally {
      setConfigsLoading(false);
      fetchingRef.current = false;
    }
  };

  const handleSaveConfig = async (
    formName,
    displayName,
    fields,
    dataId,
    idPattern,
    description,
    icon,
    formVisibility,
    dataVisibility,
    conversationVisibility,
    cardTheme
  ) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('dynamic_form_configs').upsert(
        {
          form_name: formName.trim(),
          display_name: displayName || null,
          fields,
          data_id: dataId || null,
          id_pattern: idPattern || 'ID-XXXXX',
          description: description || null,
          icon: icon || null,
          form_visibility: formVisibility || null,
          data_visibility: dataVisibility || null,
          conversation_visibility: conversationVisibility || null,
          card_theme: cardTheme || 'orange',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'form_name' }
      );
      if (error) throw error;
      showToast(`Form schema "${formName}" saved.`, 'success');
      fetchConfigs();
    } catch (err) {
      showToast('Failed to save config: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = (config) => {
    setConfirmConfig({
      title: 'Delete Configuration',
      message: `Delete "${config.form_name}" from database?`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        setSaving(true);
        try {
          const { error } = await supabase
            .from('dynamic_form_configs')
            .delete()
            .eq('form_name', config.form_name);
          if (error) throw error;
          showToast(`Form schema "${config.form_name}" removed.`, 'success');
          fetchConfigs();
        } catch (err) {
          showToast('Failed to delete config: ' + err.message, 'error');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleSaveMapping = async (mapping) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('google_sheet_mappings').upsert(
        {
          id: mapping.id || undefined,
          data_id: mapping.data_id.trim(),
          google_sheet_id: mapping.google_sheet_id.trim(),
          data_sheet_name: mapping.data_sheet_name.trim(),
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
      showToast(`Google Sheet Mapping "${mapping.data_id}" saved.`, 'success');
      fetchConfigs();
    } catch (err) {
      showToast('Failed to save mapping: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = (mapping) => {
    setConfirmConfig({
      title: 'Delete Mapping',
      message: `Delete Google Sheet Mapping "${mapping.data_id}"? This will unlink it from any forms.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        setSaving(true);
        try {
          const { error } = await supabase
            .from('google_sheet_mappings')
            .delete()
            .eq('id', mapping.id);
          if (error) throw error;
          showToast(`Google Sheet Mapping "${mapping.data_id}" removed.`, 'success');
          fetchConfigs();
        } catch (err) {
          showToast('Failed to delete mapping: ' + err.message, 'error');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // ----- View switching -----
  useEffect(() => {
    if (subView === lastSubViewRef.current) return;
    lastSubViewRef.current = subView;
    if (subView === 'user-management') {
      fetchAllUsers();
      fetchTeachers();
    } else if (subView === 'form-configurations') {
      fetchConfigs();
    }
  }, [subView]);

  // Admin tiles (same as before, but "Clear cache" removed – can be re-added if needed)
  const adminTiles = [
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage roles and permissions for all users.',
      icon: 'fa-users',
      buttonColor: 'bg-orange-primary text-white',
      shadow: 'shadow-orange-200',
      onClick: () => onSetSubView('user-management'),
    },
    {
      id: 'form-configurations',
      title: 'Form Configurations',
      description: 'Configure fields, validation, and overrides in the database.',
      icon: 'fa-sliders-h',
      buttonColor: 'bg-blue-600 text-white',
      shadow: 'shadow-blue-200',
      onClick: () => onSetSubView('form-configurations'),
    },
    {
      id: 'student-database',
      title: 'Student Database',
      description: 'View and assign student records to parents.',
      icon: 'fa-user-graduate',
      buttonColor: 'bg-green-dark text-white',
      shadow: 'shadow-green-200',
      onClick: () => onSetSubView('student-database'),
    },
    {
      id: 'timetable-planner',
      title: 'Timetable Planner',
      description: 'Manage classes, teachers, subjects, and schedule conflict-free timetables.',
      icon: 'fa-calendar-alt',
      buttonColor: 'bg-brand-primary text-white',
      shadow: 'shadow-brand-lbg',
      onClick: () => onSetSubView('timetable-planner'),
    },
    {
      id: 'syllabus-manager',
      title: 'Syllabus Manager',
      description: 'Manage curriculum nodes, subjects, books, units, chapters, and lessons.',
      icon: 'fa-book-open',
      buttonColor: 'bg-purple-600 text-white',
      shadow: 'shadow-purple-200',
      onClick: () => onSetSubView('syllabus-manager'),
    },
    {
      id: 'syllabus-progress-tracker',
      title: 'Syllabus Progress Tracker',
      description: 'View coverage percentages, average class days spent, and revision metrics.',
      icon: 'fa-chart-line',
      buttonColor: 'bg-blue-600 text-white',
      shadow: 'shadow-blue-200',
      onClick: () => onSetSubView('syllabus-progress-tracker'),
    },
    {
      id: 'lesson-planner',
      title: 'Lesson Planner',
      description: 'View and manage lesson plans across all classes, subjects, and teachers.',
      icon: 'fa-calendar-check',
      buttonColor: 'bg-indigo-600 text-white',
      shadow: 'shadow-indigo-200',
      onClick: () => onSetSubView('lesson-planner'),
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
      {/* Users view (now using DataGrid + Modal) */}
      {subView === 'user-management' && (
        <div data-user-management="true">
          <AdminUsersView
            users={users}
            loading={loading}
            onUpdateUser={handleUpdateUser}
            saving={saving}
            teachers={teachers}
            onAddTeacher={handleAddTeacherFromUser}
            onToggleTeacherActive={handleToggleTeacherActiveFromUser}
          />
        </div>
      )}

      {/* Form configs view (kept as before) */}
      {subView === 'form-configurations' && (
        <div data-form-configurations="true">
          <AdminFormConfigsView
            configs={configs}
            sheetMappings={sheetMappings}
            loading={configsLoading}
            dbTableMissing={dbTableMissing}
            appsScriptError={appsScriptError}
            onRefresh={fetchConfigs}
            onSaveConfig={handleSaveConfig}
            onDeleteConfig={handleDeleteConfig}
            onSaveMapping={handleSaveMapping}
            onDeleteMapping={handleDeleteMapping}
            onBack={() => onSetSubView(null)}
          />
        </div>
      )}

      {/* Timetable Planner view */}
      {subView === 'timetable-planner' && (
        <div data-timetable-planner="true">
          <TimetableManager />
        </div>
      )}

      {/* Student Database view */}
      {subView === 'student-database' && (
        <div data-student-database="true">
          <AdminStudentsView />
        </div>
      )}

      {/* Syllabus Manager view */}
      {subView === 'syllabus-manager' && (
        <div data-syllabus-manager="true">
          <SyllabusManager role="admin" />
        </div>
      )}

      {/* Syllabus Progress Report view */}
      {subView === 'syllabus-progress-tracker' && (
        <div data-syllabus-progress-tracker="true">
          <SyllabusTrackerPortal role="admin" />
        </div>
      )}

      {/* Lesson Manager view */}
      {subView === 'lesson-planner' && (
        <div data-lesson-planner="true">
          <LessonManager role="admin" user={user} />
        </div>
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
