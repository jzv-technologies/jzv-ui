// src/components/portals/admin/AdminFormConfigsView.jsx
import React, { useState } from "react";
import AdminFormConfigList from "./AdminFormConfigList";
import AdminFormSchemaEditor from "./AdminFormSchemaEditor";

const AdminFormConfigsView = ({
  configs,
  loading,
  dbTableMissing,
  appsScriptError,
  onRefresh,
  onSaveConfig, // function to save config (uuid, fields)
  onDeleteConfig, // function to delete config (config object)
  onBack,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [editorFields, setEditorFields] = useState([]);
  const [editorUuid, setEditorUuid] = useState("");
  const [isNewForm, setIsNewForm] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("[]");
  const [jsonError, setJsonError] = useState("");

  const handleEditConfig = async (config) => {
    setIsNewForm(false);
    setEditorUuid(config.uuid);
    setJsonError("");
    setJsonMode(false);

    let initialFields = [];
    if (config.isDb && config.fields) {
      initialFields = config.fields;
    } else {
      // fetch from Apps Script if needed - we'll call a prop or handle inside
      // For simplicity, we'll assume the parent provides a fetchConfigFields function
      if (window.fetchConfigFields) {
        // Placeholder; better to pass as prop
      }
    }

    setEditorFields(initialFields);
    setJsonText(JSON.stringify(initialFields, null, 2));
    setSelectedConfig(config);
    setIsEditing(true);
  };

  const handleImport = async (config) => {
    // Similar to original – we can invoke a prop
    if (window.confirm(`Import ${config.uuid} from Google Sheets?`)) {
      // onImport callback
    }
  };

  const handleSave = async () => {
    let finalFields = [];
    if (jsonMode) {
      try {
        finalFields = JSON.parse(jsonText);
        if (!Array.isArray(finalFields)) throw new Error("Must be an array");
        // sanitize fields...
      } catch (err) {
        setJsonError(err.message);
        return;
      }
    } else {
      finalFields = editorFields;
    }
    await onSaveConfig(editorUuid, finalFields);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <AdminFormSchemaEditor
        uuid={editorUuid}
        isNew={isNewForm}
        fields={editorFields}
        jsonMode={jsonMode}
        setJsonMode={setJsonMode}
        jsonText={jsonText}
        setJsonText={setJsonText}
        jsonError={jsonError}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
        onChangeUuid={setEditorUuid}
        onAddField={() => {
          const newFields = [
            ...editorFields,
            {
              "Field Name": "",
              Label: "",
              "Field Type": "text",
              List: "",
              Required: false,
              "Default Value": "",
              Criteria: "",
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
          [newFields[index], newFields[target]] = [
            newFields[target],
            newFields[index],
          ];
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
    <AdminFormConfigList
      configs={configs}
      loading={loading}
      dbTableMissing={dbTableMissing}
      appsScriptError={appsScriptError}
      onRefresh={onRefresh}
      onEdit={handleEditConfig}
      onDelete={onDeleteConfig}
      onImport={handleImport}
      onCreateNew={() => {
        setIsNewForm(true);
        setEditorUuid("");
        setEditorFields([]);
        setJsonText("[]");
        setJsonError("");
        setJsonMode(false);
        setIsEditing(true);
      }}
      onBack={onBack}
    />
  );
};

export default AdminFormConfigsView;
