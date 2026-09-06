import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import RolePortal from './RolePortal';
import AdminFormConfigsView from '../form-config/AdminFormConfigsView';
import TimetableManager from '../timetable/TimetableManager';
import AdminStudentsView from '../students/AdminStudentsView';
import SyllabusManager from '../syllabus/SyllabusManager';
import EmployeeRecordsView from '../employees/EmployeeRecordsView';
import SyllabusTrackerPortal from '../syllabus/SyllabusTrackerPortal';
import LessonManager from '../syllabus/lesson-manager/LessonManager';
import ViewControllerManager from '../admin-settings/ViewControllerManager';
import ConfirmModal from '../ConfirmModal';
import { showToast } from '../../utils/toast';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const AdminPortal = ({ userRoles, subView, onSetSubView, user }) => {
  const [saving, setSaving] = useState(false);

  // Form configs state
  const [configs, setConfigs] = useState([]);
  const [dbTableMissing, setDbTableMissing] = useState(false);
  const [appsScriptError, setAppsScriptError] = useState('');
  const [configsLoading, setConfigsLoading] = useState(false);
  const [sheetMappings, setSheetMappings] = useState([]);

  const fetchingRef = useRef(false);
  const lastSubViewRef = useRef(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

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
    if (subView === 'form-configurations') {
      fetchConfigs();
    }
  }, [subView]);

  // Admin tiles (same as before, but "Clear cache" removed – can be re-added if needed)
  const adminTiles = [
    {
      id: 'employee-management',
      title: 'Employee Management',
      description: 'Manage employee records, roles, designations, salaries, and bulk imports.',
      icon: 'fa-users-gear',
      buttonColor: 'bg-orange-primary text-white',
      shadow: 'shadow-orange-200',
      onClick: () => onSetSubView('employee-management'),
    },
    {
      id: 'student-records',
      title: 'Students Management',
      description: 'View and assign student records to parents.',
      icon: 'fa-user-graduate',
      buttonColor: 'bg-green-dark text-white',
      shadow: 'shadow-green-200',
      onClick: () => onSetSubView('student-records'),
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
      id: 'timetable-planner',
      title: 'Timetable',
      description: 'View schedules, manage classes, teachers, subjects, and plan conflict-free timetables.',
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
      id: 'lesson-planner-tracker',
      title: 'Lesson Planner & Tracker',
      description: 'View coverage percentages, average class days spent, and revision metrics.',
      icon: 'fa-chart-line',
      buttonColor: 'bg-blue-600 text-white',
      shadow: 'shadow-blue-200',
      onClick: () => onSetSubView('lesson-planner-tracker'),
    },

    {
      id: 'display-dashboard',
      title: 'TV Display Board',
      description: 'Open the full-screen auto-navigating TV display dashboard.',
      icon: 'fa-tv',
      buttonColor: 'bg-emerald-600 text-white',
      shadow: 'shadow-emerald-200',
      onClick: () => window.open('/portal/display', '_blank'),
    },
    {
      id: 'avc-admin-manager',
      title: 'View Controller Manager',
      description: 'Manage app_view_controller table — tile visibility, ordering, and access roles.',
      icon: 'fa-cubes',
      buttonColor: 'bg-purple-700 text-white',
      shadow: 'shadow-purple-200',
      onClick: () => onSetSubView('avc-admin-manager'),
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
      {/* Employee Management view */}
      {(subView === 'employee-management' || subView === 'user-management') && (
        <div data-feature="employee-management">
          <EmployeeRecordsView role="admin" user={user} userRoles={userRoles} />
        </div>
      )}

      {/* Form configs view (kept as before) */}
      {subView === 'form-configurations' && (
        <div data-feature="form-configurations">
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
        <div data-feature="timetable-planner">
          <TimetableManager userRoles={userRoles} user={user} />
        </div>
      )}

      {/* Student Database view */}
      {subView === 'student-records' && (
        <div data-feature="student-records">
          <AdminStudentsView />
        </div>
      )}

      {/* Syllabus Manager view */}
      {subView === 'syllabus-manager' && (
        <div data-feature="syllabus-manager">
          <SyllabusManager role="admin" />
        </div>
      )}

      {/* Syllabus Progress Report view */}
      {subView === 'lesson-planner-tracker' && (
        <div data-feature="lesson-planner-tracker">
          <SyllabusTrackerPortal role="admin" />
        </div>
      )}

      {/* Lesson Manager view */}
      {subView === 'lesson-planner' && (
        <div data-feature="lesson-planner">
          <LessonManager role="admin" user={user} />
        </div>
      )}

      {/* View Controller Manager view */}
      {subView === 'avc-admin-manager' && (
        <div data-feature="avc-admin-manager">
          <ViewControllerManager onBack={() => onSetSubView(null)} />
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
