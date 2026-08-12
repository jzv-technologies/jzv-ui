// src/components/portals/admin/AdminFormConfigsView.jsx
import React, { useState } from 'react';
import AdminFormConfigList from './AdminFormConfigList';
import AdminFormSchemaEditor from './AdminFormSchemaEditor';
import ConfirmModal from '../ConfirmModal';
import { showToast } from '../../utils/toast';
import AdminLinksView from '../admin-settings/AdminLinksView';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const AdminFormConfigsView = ({
  configs,
  sheetMappings = [],
  loading,
  dbTableMissing,
  appsScriptError,
  onRefresh,
  onSaveConfig,
  onDeleteConfig,
  onSaveMapping,
  onDeleteMapping,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState('configs');
  const [addLinkTrigger, setAddLinkTrigger] = useState(0);
  const [linksSearchQuery, setLinksSearchQuery] = useState('');

  // Form Config Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [editorFields, setEditorFields] = useState([]);
  const [editorUuid, setEditorUuid] = useState('');
  const [editorDisplayName, setEditorDisplayName] = useState('');
  const [editorDataId, setEditorDataId] = useState('');
  const [editorIdPattern, setEditorIdPattern] = useState('ID-XXXXX');
  const [editorDescription, setEditorDescription] = useState('');
  const [editorIcon, setEditorIcon] = useState('');
  const [editorFormVisibility, setEditorFormVisibility] = useState('');
  const [editorDataVisibility, setEditorDataVisibility] = useState('');
  const [editorConversationVisibility, setEditorConversationVisibility] = useState('');
  const [editorCardTheme, setEditorCardTheme] = useState('orange');
  const [isNewForm, setIsNewForm] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('[]');
  const [jsonError, setJsonError] = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [validatingUuid, setValidatingUuid] = useState(null);
  const [creatingMappingId, setCreatingMappingId] = useState(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [clearingCacheUuid, setClearingCacheUuid] = useState(null);

  // Mapping Editor states
  const [isEditingMapping, setIsEditingMapping] = useState(false);
  const [isNewMapping, setIsNewMapping] = useState(false);
  const [mappingId, setMappingId] = useState(null);
  const [mappingDataId, setMappingDataId] = useState('');
  const [mappingSheetId, setMappingSheetId] = useState('');
  const [mappingSheetName, setMappingSheetName] = useState('');

  // Connection Test states
  const [testingMappingId, setTestingMappingId] = useState(null);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [inlineTesting, setInlineTesting] = useState(false);

  const handleCreateNewForm = () => {
    setIsNewForm(true);
    setEditorUuid('');
    setEditorDisplayName('');
    setEditorDataId('');
    setEditorIdPattern('ID-XXXXX');
    setEditorDescription('');
    setEditorIcon('');
    setEditorFormVisibility('');
    setEditorDataVisibility('');
    setEditorConversationVisibility('');
    setEditorCardTheme('orange');
    setJsonError('');
    setJsonMode(false);
    setEditorFields([]);
    setJsonText('[]');
    setSelectedConfig(null);
    setIsEditing(true);
  };

  const handleEditConfig = (config) => {
    setIsNewForm(false);
    setEditorUuid(config.form_name || config.uuid);
    setEditorDisplayName(config.display_name || '');
    setEditorDataId(config.data_id || '');
    setEditorIdPattern(config.id_pattern || 'ID-XXXXX');
    setEditorDescription(config.description || '');
    setEditorIcon(config.icon || '');
    setEditorFormVisibility(config.form_visibility || '');
    setEditorDataVisibility(config.data_visibility || '');
    setEditorConversationVisibility(config.conversation_visibility || '');
    setEditorCardTheme(config.card_theme || 'orange');
    setJsonError('');
    setJsonMode(false);

    const initialFields = (config.fields || []).map((f) => {
      const newField = { ...f };
      if (newField['Criteria'] !== undefined) {
        newField['Show When'] = newField['Criteria'];
        delete newField['Criteria'];
      }
      if (newField['Display In'] !== undefined) {
        newField['Screen'] = newField['Display In'];
        delete newField['Display In'];
      }
      if (newField['Read Only For'] !== undefined) {
        newField['Update Allowed'] = newField['Read Only For'];
        delete newField['Read Only For'];
      }
      if (newField['Update Allowed'] === undefined) {
        newField['Update Allowed'] = '';
      }
      return newField;
    });
    setEditorFields(initialFields);
    setJsonText(JSON.stringify(initialFields, null, 2));
    setSelectedConfig(config);
    setIsEditing(true);
  };

  const handleCloneConfig = async (config) => {
    const newNameRaw = window.prompt(
      'Enter new form identifier name for the clone:',
      `${config.form_name}_copy`
    );
    if (newNameRaw === null) return; // User cancelled

    const newName = newNameRaw
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .trim();
    if (!newName) {
      showToast(
        'Invalid form name. Only lowercase letters, numbers, hyphens, and underscores are allowed.',
        'error'
      );
      return;
    }

    const exists = configs.some((c) => c.form_name === newName);
    if (exists) {
      showToast(`Form schema "${newName}" already exists. Please choose a unique name.`, 'error');
      return;
    }

    const newDisplayName = config.display_name ? `${config.display_name} Copy` : '';

    try {
      await onSaveConfig(
        newName,
        newDisplayName,
        config.fields,
        config.data_id,
        config.id_pattern,
        config.description,
        config.icon,
        config.form_visibility,
        config.data_visibility,
        config.conversation_visibility,
        config.card_theme || 'orange'
      );
      showToast(`Form schema cloned successfully as "${newName}"!`, 'success');
    } catch (err) {
      showToast(`Failed to clone schema: ${err.message}`, 'error');
    }
  };

  const handleSave = async () => {
    let finalFields = [];
    if (jsonMode) {
      try {
        finalFields = JSON.parse(jsonText);
        if (!Array.isArray(finalFields)) throw new Error('Must be an array');
      } catch (err) {
        setJsonError(err.message);
        return;
      }
    } else {
      finalFields = editorFields;
    }
    // Normalize fields before saving to DB
    const normalizedFields = finalFields.map((f) => {
      const newField = { ...f };
      if (newField['Criteria'] !== undefined) {
        newField['Show When'] = newField['Criteria'];
        delete newField['Criteria'];
      }
      if (newField['Display In'] !== undefined) {
        newField['Screen'] = newField['Display In'];
        delete newField['Display In'];
      }
      if (newField['Read Only For'] !== undefined) {
        newField['Update Allowed'] = newField['Read Only For'];
        delete newField['Read Only For'];
      }
      if (newField['Update Allowed'] === undefined) {
        newField['Update Allowed'] = '';
      }
      return newField;
    });
    await onSaveConfig(
      editorUuid,
      editorDisplayName,
      normalizedFields,
      editorDataId,
      editorIdPattern,
      editorDescription,
      editorIcon,
      editorFormVisibility,
      editorDataVisibility,
      editorConversationVisibility,
      editorCardTheme
    );
    setIsEditing(false);
  };

  const handleValidateConfig = async (config) => {
    const selectedMapping = sheetMappings.find((m) => m.data_id === config.data_id);
    if (!selectedMapping) {
      showToast(
        `No Google Sheet mapping found for data ID "${config.data_id}". Please create a mapping first.`,
        'error'
      );
      return;
    }

    setValidatingUuid(config.form_name || config.uuid);
    try {
      const fieldsList = Array.isArray(config.fields) ? config.fields : [];
      const fieldNames = fieldsList.map((f) => f['Field Name']?.trim()).filter(Boolean);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'validate-fields',
          google_sheet_id: selectedMapping.google_sheet_id,
          data_sheet_name: selectedMapping.data_sheet_name,
          fields: fieldNames,
        }),
      });

      const result = await response.json();
      if (result.success) {
        showToast(result.data.message || 'Schema validation completed!', 'success');
      } else {
        showToast(result.error || 'Schema validation failed.', 'error');
      }
    } catch (err) {
      showToast('Request failed: ' + err.message, 'error');
    } finally {
      setValidatingUuid(null);
    }
  };

  const handleCreateSheetTabClick = async (sheetId, sheetName, mappingIdToCreate = null) => {
    if (!sheetId || !sheetName) {
      showToast('Please provide both Google Sheet ID and Sheet Tab Name.', 'error');
      return;
    }
    if (mappingIdToCreate !== null) {
      setCreatingMappingId(mappingIdToCreate);
    } else {
      setInlineTesting(true);
    }
    setTestResult(null);
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'create-sheet',
          google_sheet_id: sheetId,
          data_sheet_name: sheetName,
        }),
      });
      const resData = await response.json();
      if (resData.success) {
        setTestResult({
          success: true,
          message: resData.data?.message || 'Sheet created successfully!',
        });
        showToast(resData.data?.message || 'Sheet created successfully!', 'success');
      } else {
        setTestResult({
          success: false,
          message: resData.error || 'Failed to create sheet.',
        });
        showToast(resData.error || 'Failed to create sheet.', 'error');
      }
    } catch (err) {
      const errMsg = 'Request failed: ' + err.message;
      setTestResult({
        success: false,
        message: errMsg,
      });
      showToast(errMsg, 'error');
    } finally {
      setCreatingMappingId(null);
      setInlineTesting(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?action=invalidate-form-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'invalidate-form-cache' }),
      });
      const result = await response.json();
      if (result.success) {
        // Clear local storage configs
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('form_config_')) {
            localStorage.removeItem(key);
          }
        });
        showToast(result.data?.message || 'Cache cleared successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to clear cache.', 'error');
      }
    } catch (err) {
      showToast('Clear cache request failed: ' + err.message, 'error');
    } finally {
      setClearingCache(false);
    }
  };

  const handleClearIndividualCache = async (config) => {
    const uuid = config.form_name || config.uuid;
    setClearingCacheUuid(uuid);
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?action=invalidate-form-cache&uuid=${encodeURIComponent(uuid)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'invalidate-form-cache', uuid }),
      });
      const result = await response.json();
      if (result.success) {
        // Clear local storage config
        localStorage.removeItem(`form_config_${uuid}`);
        localStorage.removeItem(`form_config_${uuid}_time`);
        showToast(result.data?.message || `Cache cleared for ${uuid}!`, 'success');
      } else {
        showToast(result.error || 'Failed to clear cache.', 'error');
      }
    } catch (err) {
      showToast('Clear cache request failed: ' + err.message, 'error');
    } finally {
      setClearingCacheUuid(null);
    }
  };

  // Mapping Handlers
  const handleCreateMapping = () => {
    setIsNewMapping(true);
    setMappingId(null);
    setMappingDataId('');
    setMappingSheetId('');
    setMappingSheetName('');
    setTestResult(null);
    setIsEditingMapping(true);
  };

  const handleEditMapping = (mapping) => {
    setIsNewMapping(false);
    setMappingId(mapping.id);
    setMappingDataId(mapping.data_id);
    setMappingSheetId(mapping.google_sheet_id);
    setMappingSheetName(mapping.data_sheet_name);
    setTestResult(null);
    setIsEditingMapping(true);
  };

  const handleSaveMappingClick = async () => {
    if (!mappingDataId.trim()) {
      showToast('Mapping Name is required.', 'error');
      return;
    }
    if (!mappingSheetId.trim()) {
      showToast('Google Sheet ID is required.', 'error');
      return;
    }
    if (!mappingSheetName.trim()) {
      showToast('Sheet Tab Name is required.', 'error');
      return;
    }

    await onSaveMapping({
      id: mappingId,
      data_id: mappingDataId,
      google_sheet_id: mappingSheetId,
      data_sheet_name: mappingSheetName,
    });
    setIsEditingMapping(false);
  };

  // Test Connection
  const handleTestConnection = async (sheetId, sheetName, mappingIdToTest = null) => {
    if (!sheetId || !sheetName) {
      showToast('Please provide both Google Sheet ID and Sheet Tab Name.', 'error');
      return;
    }

    if (mappingIdToTest !== null) {
      setTestingMappingId(mappingIdToTest);
    } else {
      setInlineTesting(true);
    }
    setTestResult(null);

    try {
      const url = `${APPS_SCRIPT_URL}?action=test-connection&google_sheet_id=${encodeURIComponent(sheetId)}&data_sheet_name=${encodeURIComponent(sheetName)}`;
      const res = await fetch(url);
      const resData = await res.json();

      if (resData.success) {
        const msg = resData.data?.message || 'Successfully connected!';
        setTestResult({
          success: true,
          message: msg,
        });
        showToast(msg, 'success');
      } else {
        const msg = resData.error || 'Failed to connect to sheet.';
        setTestResult({
          success: false,
          message: msg,
        });
        showToast(msg, 'error');
      }
    } catch (err) {
      const errMsg = 'Connection request failed: ' + err.message;
      setTestResult({
        success: false,
        message: errMsg,
      });
      showToast(errMsg, 'error');
    } finally {
      setTestingMappingId(null);
      setInlineTesting(false);
    }
  };

  if (isEditing) {
    return (
      <AdminFormSchemaEditor
        uuid={editorUuid}
        isNew={isNewForm}
        displayName={editorDisplayName}
        fields={editorFields}
        dataId={editorDataId}
        idPattern={editorIdPattern}
        description={editorDescription}
        icon={editorIcon}
        formVisibility={editorFormVisibility}
        dataVisibility={editorDataVisibility}
        conversationVisibility={editorConversationVisibility}
        cardTheme={editorCardTheme}
        sheetMappings={sheetMappings}
        jsonMode={jsonMode}
        setJsonMode={setJsonMode}
        jsonText={jsonText}
        setJsonText={setJsonText}
        jsonError={jsonError}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
        onChangeUuid={setEditorUuid}
        onChangeDisplayName={setEditorDisplayName}
        onChangeDataId={setEditorDataId}
        onChangeIdPattern={setEditorIdPattern}
        onChangeDescription={setEditorDescription}
        onChangeIcon={setEditorIcon}
        onChangeFormVisibility={setEditorFormVisibility}
        onChangeDataVisibility={setEditorDataVisibility}
        onChangeConversationVisibility={setEditorConversationVisibility}
        onChangeCardTheme={setEditorCardTheme}
        onAddField={() => {
          const newFields = [
            ...editorFields,
            {
              'Field Name': '',
              Label: '',
              'Field Type': 'text',
              List: '',
              Required: false,
              'Default Value': '',
              'Show When': '',
              Screen: 'New, Update, Data Grid',
              'Field Visibility': 'All',
              'Update Allowed': 'None',
            },
          ];
          setEditorFields(newFields);
          setJsonText(JSON.stringify(newFields, null, 2));
        }}
        onRemoveField={(index) => {
          const newFields = editorFields.filter((_, i) => i !== index);
          setEditorFields(newFields);
          setJsonText(JSON.stringify(newFields, null, 2));
        }}
        onMoveField={(index, direction) => {
          const newFields = [...editorFields];
          const target = index + direction;
          if (target < 0 || target >= newFields.length) return;
          [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
          setEditorFields(newFields);
          setJsonText(JSON.stringify(newFields, null, 2));
        }}
        onFieldChange={(index, key, value) => {
          const newFields = [...editorFields];
          newFields[index] = { ...newFields[index], [key]: value };
          setEditorFields(newFields);
          setJsonText(JSON.stringify(newFields, null, 2));
        }}
        saving={loading}
      />
    );
  }

  return (
    <>
      <div className="bg-white border border-light-border shadow-xl overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Tabs Bar */}
        <div className="flex justify-between items-center bg-gray-50 border-b border-light-border px-8">
          <div className="flex gap-6">
            <button
              onClick={() => {
                setActiveTab('configs');
                setTestResult(null);
              }}
              className={`py-4 px-2 border-b-2 font-bold text-sm transition-all ${
                activeTab === 'configs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-dark-muted hover:text-dark-deepblue'
              }`}
            >
              Form Schemas
            </button>
            <button
              onClick={() => {
                setActiveTab('mappings');
                setTestResult(null);
              }}
              className={`py-4 px-2 border-b-2 font-bold text-sm transition-all ${
                activeTab === 'mappings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-dark-muted hover:text-dark-deepblue'
              }`}
            >
              Google Sheet Mappings
            </button>
            <button
              onClick={() => {
                setActiveTab('links');
                setTestResult(null);
              }}
              className={`py-4 px-2 border-b-2 font-bold text-sm transition-all ${
                activeTab === 'links'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-dark-muted hover:text-dark-deepblue'
              }`}
            >
              Useful Links
            </button>
          </div>
          {activeTab === 'configs' && (
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <button
                    onClick={onRefresh}
                    className="bg-white border border-light-border text-dark-deepblue px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <i className="fas fa-sync-alt"></i> Refresh
                  </button>
                  <button
                    onClick={handleCreateNewForm}
                    disabled={dbTableMissing}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                  >
                    <i className="fas fa-plus"></i> Add New Form
                  </button>
                </>
              )}
              <button
                onClick={onBack}
                className="bg-white border border-light-border text-dark-deepblue px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
              >
                Go Back
              </button>
            </div>
          )}
          {activeTab === 'links' && (
            <div className="flex gap-3 items-center">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-dark-muted text-sm">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  placeholder="Search links..."
                  value={linksSearchQuery}
                  onChange={(e) => setLinksSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-light-border rounded-xl focus:border-blue-500 outline-none text-xs font-semibold text-dark-primary shadow-sm w-48 sm:w-64 transition-all bg-white"
                />
              </div>
              <button
                onClick={() => setAddLinkTrigger((prev) => prev + 1)}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
              >
                <i className="fas fa-plus"></i> Add Link
              </button>
              <button
                onClick={onBack}
                className="bg-white border border-light-border text-dark-deepblue px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
              >
                Go Back
              </button>
            </div>
          )}
          {activeTab === 'mappings' && (
            <div className="flex gap-2">
              {!isEditingMapping && (
                <>
                  <button
                    onClick={handleClearCache}
                    disabled={clearingCache}
                    className="bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-700 transition-all flex items-center gap-2 shadow-lg shadow-amber-100 disabled:opacity-50"
                  >
                    {clearingCache ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Clearing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-trash-alt"></i> Clear Cache
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCreateMapping}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                  >
                    <i className="fas fa-plus"></i> Add Sheet Mapping
                  </button>
                </>
              )}
              <button
                onClick={onBack}
                className="bg-white border border-light-border text-dark-deepblue px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
              >
                Go Back
              </button>
            </div>
          )}
        </div>

        {activeTab === 'configs' ? (
          <AdminFormConfigList
            configs={configs}
            loading={loading}
            dbTableMissing={dbTableMissing}
            appsScriptError={appsScriptError}
            onRefresh={onRefresh}
            onEdit={handleEditConfig}
            onClone={handleCloneConfig}
            onDelete={onDeleteConfig}
            onBack={onBack}
            onValidate={handleValidateConfig}
            validatingUuid={validatingUuid}
            onClearCache={handleClearIndividualCache}
            clearingCacheUuid={clearingCacheUuid}
            onCreateNew={() => {
              setIsNewForm(true);
              setEditorUuid('');
              setEditorDisplayName('');
              setEditorDataId('');
              setEditorIdPattern('ID-XXXXX');
              setEditorDescription('');
              setEditorIcon('');
              setEditorFormVisibility('');
              setEditorDataVisibility('');
              setEditorConversationVisibility('');
              setEditorCardTheme('orange');
              setEditorFields([]);
              setJsonText('[]');
              setJsonError('');
              setJsonMode(false);
              setIsEditing(true);
            }}
          />
        ) : activeTab === 'mappings' ? (
          <div className="p-8">

            {/* Inline Mapping Editor */}
            {isEditingMapping && (
              <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-light-border animate-in fade-in slide-in-from-top-4 duration-300">
                <h4 className="font-bold text-dark-deepblue text-lg mb-4">
                  {isNewMapping ? 'Create Sheet Mapping' : 'Edit Sheet Mapping'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Mapping ID / Lookup Name
                    </label>
                    <input
                      type="text"
                      value={mappingDataId}
                      onChange={(e) =>
                        setMappingDataId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))
                      }
                      disabled={!isNewMapping}
                      placeholder="e.g. registration_sheet"
                      className="w-full px-4 py-2 border border-light-border rounded-xl focus:border-blue-500 outline-none bg-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Google Sheet Spreadsheet ID
                    </label>
                    <input
                      type="text"
                      value={mappingSheetId}
                      onChange={(e) => setMappingSheetId(e.target.value.trim())}
                      placeholder="e.g. 1DEAcXyine..."
                      className="w-full px-4 py-2 border border-light-border rounded-xl focus:border-blue-500 outline-none bg-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                      Worksheet Tab Name
                    </label>
                    <input
                      type="text"
                      value={mappingSheetName}
                      onChange={(e) => setMappingSheetName(e.target.value)}
                      placeholder="e.g. Sheet1"
                      className="w-full px-4 py-2 border border-light-border rounded-xl focus:border-blue-500 outline-none bg-white text-sm"
                    />
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`mb-6 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    <i
                      className={`fas ${testResult.success ? 'fa-check-circle' : 'fa-exclamation-circle'}`}
                    ></i>
                    <span>{testResult.message}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleSaveMappingClick}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-md"
                  >
                    Save Mapping
                  </button>
                  <button
                    onClick={() => handleTestConnection(mappingSheetId, mappingSheetName)}
                    disabled={inlineTesting}
                    className="bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100/70 px-5 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {inlineTesting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Testing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plug"></i> Test Connection
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateSheetTabClick(mappingSheetId, mappingSheetName)}
                    disabled={inlineTesting}
                    className="bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100/70 px-5 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {inlineTesting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Processing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus-square"></i> Create Sheet
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingMapping(false);
                      setTestResult(null);
                    }}
                    className="bg-white border border-light-border text-dark-deepblue px-5 py-2 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Mappings List */}
            {loading ? (
              <div className="py-12 text-center text-dark-muted">
                <i className="fas fa-spinner fa-spin text-2xl text-blue-600 mb-3"></i>
                <p>Loading mappings...</p>
              </div>
            ) : sheetMappings.length === 0 ? (
              <div className="py-16 text-center text-dark-muted border border-dashed border-gray-200 rounded-2xl bg-gray-50/20">
                <i className="fas fa-network-wired text-3xl mb-3 text-gray-300"></i>
                <p className="mb-4">No sheet mappings configured yet.</p>
                <button
                  onClick={handleCreateMapping}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg"
                >
                  Create Your First Mapping
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-light-border rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-dark-deepblue uppercase text-xs font-bold tracking-wider border-b border-light-border">
                      <th className="p-4">Mapping ID</th>
                      <th className="p-4">Spreadsheet ID</th>
                      <th className="p-4">Sheet Name</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetMappings.map((mapping) => {
                      const isTestingThis = testingMappingId === mapping.id;
                      return (
                        <tr
                          key={mapping.id}
                          className="hover:bg-gray-50/30 transition-colors border-b border-light-border last:border-0"
                        >
                          <td className="p-4 font-bold text-dark-deepblue font-mono text-sm">
                            {mapping.data_id}
                          </td>
                          <td className="p-4 text-xs font-mono text-dark-muted break-all max-w-xs">
                            {mapping.google_sheet_id}
                          </td>
                          <td className="p-4 text-sm text-dark-primary font-semibold">
                            {mapping.data_sheet_name}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() =>
                                  handleTestConnection(
                                    mapping.google_sheet_id,
                                    mapping.data_sheet_name,
                                    mapping.id
                                  )
                                }
                                disabled={testingMappingId !== null}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-100 flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
                                title="Verify Google Sheet connection"
                              >
                                {isTestingThis ? (
                                  <>
                                    <i className="fas fa-spinner fa-spin"></i> Testing
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-plug"></i> Test
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  handleCreateSheetTabClick(
                                    mapping.google_sheet_id,
                                    mapping.data_sheet_name,
                                    mapping.id
                                  )
                                }
                                disabled={creatingMappingId !== null || testingMappingId !== null}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-100 flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
                                title="Create sheet tab if not available"
                              >
                                {creatingMappingId === mapping.id ? (
                                  <>
                                    <i className="fas fa-spinner fa-spin"></i> Creating
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-plus-square"></i> Create Sheet
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleEditMapping(mapping)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-green-100 flex items-center gap-1.5 cursor-pointer"
                                title="Edit mapping"
                              >
                                <i className="fas fa-edit"></i> Edit
                              </button>
                              <button
                                onClick={() => onDeleteMapping(mapping)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-red-100 flex items-center gap-1.5 cursor-pointer"
                                title="Delete mapping"
                              >
                                <i className="fas fa-trash-alt"></i> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 flex flex-col">
            <AdminLinksView addLinkTrigger={addLinkTrigger} searchQuery={linksSearchQuery} />
          </div>
        )}
      </div>

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

export default AdminFormConfigsView;
