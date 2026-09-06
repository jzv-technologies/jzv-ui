// src/components/portal-shared/AdminFormConfigsContainer.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import AdminFormConfigsView from '../form-config/AdminFormConfigsView';
import ConfirmModal from '../ConfirmModal';
import { invalidateViewConfigCache } from '../../hooks/useViewConfig';

export const AdminFormConfigsContainer = ({ onBack }) => {
  const [configs, setConfigs] = useState([]);
  const [sheetMappings, setSheetMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dbTableMissing, setDbTableMissing] = useState(false);
  const [appsScriptError, setAppsScriptError] = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setDbTableMissing(false);
    setAppsScriptError('');
    try {
      const { data: supabaseConfigs, error: configsError } = await supabase
        .from('dynamic_form_configs')
        .select('*');
      if (configsError) {
        if (configsError.code === '42P01') setDbTableMissing(true);
        throw configsError;
      }

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
      showToast('Failed to load form configurations: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

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
      invalidateViewConfigCache();
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
          invalidateViewConfigCache();
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

  return (
    <>
      <AdminFormConfigsView
        configs={configs}
        sheetMappings={sheetMappings}
        loading={loading || saving}
        dbTableMissing={dbTableMissing}
        appsScriptError={appsScriptError}
        onRefresh={fetchConfigs}
        onSaveConfig={handleSaveConfig}
        onDeleteConfig={handleDeleteConfig}
        onSaveMapping={handleSaveMapping}
        onDeleteMapping={handleDeleteMapping}
        onBack={onBack}
      />
      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </>
  );
};

export default AdminFormConfigsContainer;
