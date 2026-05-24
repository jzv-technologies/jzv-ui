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

  // --- Form Configurations States ---
  const [configs, setConfigs] = useState([]);
  const [dbTableMissing, setDbTableMissing] = useState(false);
  const [appsScriptError, setAppsScriptError] = useState("");
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [editorFields, setEditorFields] = useState([]);
  const [editorUuid, setEditorUuid] = useState("");
  const [isNewForm, setIsNewForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("[]");
  const [jsonError, setJsonError] = useState("");

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

  const fetchConfigs = async () => {
    setLoading(true);
    setDbTableMissing(false);
    setAppsScriptError("");
    try {
      // 1. Fetch from Apps Script
      let appsScriptConfigs = [];
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=list-configs`);
        const resData = await res.json();
        if (resData.success) {
          appsScriptConfigs = resData.data || [];
        } else {
          setAppsScriptError(resData.error || "Failed to retrieve configurations from Google Apps Script.");
          console.warn("Apps Script list-configs failed:", resData.error);
        }
      } catch (err) {
        setAppsScriptError("Connection failed. Make sure your Google Apps Script is deployed/published with access for 'Anyone'.");
        console.error("Failed to fetch Apps Script configs:", err);
      }

      // 2. Fetch from Supabase
      let supabaseConfigs = [];
      try {
        const { data, error } = await supabase
          .from("dynamic_form_configs")
          .select("*");
        
        if (error) {
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            setDbTableMissing(true);
          }
          throw error;
        }
        supabaseConfigs = data || [];
      } catch (err) {
        console.warn("Supabase configs fetch failed:", err);
      }

      // 3. Merge configs
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

      // Add Supabase configs that are not in Apps Script (DB only)
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
      console.error("Error fetching configs:", err);
      setMessage({ type: "error", text: "Failed to load form configurations." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subView === "users") {
      fetchAllUsers();
    } else if (subView === "configs") {
      fetchConfigs();
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

  // --- Form Schema Editor Handlers ---
  const handleEditConfig = async (config) => {
    setIsNewForm(false);
    setEditorUuid(config.uuid);
    setJsonError("");
    setJsonMode(false);
    
    let initialFields = [];
    if (config.isDb && config.fields) {
      initialFields = config.fields;
    } else {
      setLoading(true);
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=config&uuid=${encodeURIComponent(config.uuid)}`);
        const result = await res.json();
        if (result.success) {
          initialFields = result.data || [];
        }
      } catch (err) {
        console.error("Failed to fetch default config from App Script:", err);
      } finally {
        setLoading(false);
      }
    }
    
    setEditorFields(initialFields);
    setJsonText(JSON.stringify(initialFields, null, 2));
    setSelectedConfig(config);
    setIsEditing(true);
  };

  const handleSaveConfig = async () => {
    let finalFields = [];
    setJsonError("");

    if (jsonMode) {
      try {
        finalFields = JSON.parse(jsonText);
        if (!Array.isArray(finalFields)) {
          throw new Error("Configuration must be a JSON array of fields");
        }
        // Normalize field keys if user inputted standard lower snake/camel case
        finalFields = finalFields.map((f) => {
          return {
            "Field Name": f["Field Name"] ?? f.field_name ?? f.name ?? "",
            Label: f.Label ?? f.label ?? "",
            "Field Type": f["Field Type"] ?? f.field_type ?? f.type ?? "text",
            List: f.List ?? f.list ?? f.options ?? "",
            Required: f.Required ?? f.required ?? false,
            "Default Value": f["Default Value"] ?? f.default_value ?? f.defaultValue ?? "",
            Criteria: f.Criteria ?? f.criteria ?? "",
            Link: f.Link ?? f.link ?? "",
          };
        });
      } catch (err) {
        setJsonError("Invalid JSON: " + err.message);
        return;
      }
    } else {
      finalFields = editorFields;
    }

    finalFields = finalFields.filter((f) => f["Field Name"]?.trim());

    if (!editorUuid.trim()) {
      setMessage({ type: "error", text: "UUID is required." });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("dynamic_form_configs")
        .upsert({
          uuid: editorUuid.trim(),
          fields: finalFields,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'uuid'
        });

      if (error) throw error;

      setMessage({ type: "success", text: `Form schema for "${editorUuid}" saved to database successfully!` });
      setIsEditing(false);
      fetchConfigs();
    } catch (err) {
      console.error("Error saving form config:", err);
      setMessage({ type: "error", text: "Failed to save: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (config) => {
    if (!window.confirm(`Are you sure you want to delete form schema "${config.uuid}" from the database? It will fall back to the default Google Sheets configuration.`)) {
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("dynamic_form_configs")
        .delete()
        .eq("uuid", config.uuid);

      if (error) throw error;

      setMessage({ type: "success", text: `Form schema "${config.uuid}" removed from database.` });
      fetchConfigs();
    } catch (err) {
      console.error("Error deleting form config:", err);
      setMessage({ type: "error", text: "Failed to delete: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const moveField = (index, direction) => {
    const newFields = [...editorFields];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;
    
    setEditorFields(newFields);
    setJsonText(JSON.stringify(newFields, null, 2));
  };

  const removeField = (index) => {
    const newFields = editorFields.filter((_, idx) => idx !== index);
    setEditorFields(newFields);
    setJsonText(JSON.stringify(newFields, null, 2));
  };

  const addField = () => {
    const newFields = [
      ...editorFields,
      {
        "Field Name": "",
        Label: "",
        "Field Type": "text",
        List: "",
        Required: false,
        "Default Value": "",
        Criteria: ""
      }
    ];
    setEditorFields(newFields);
    setJsonText(JSON.stringify(newFields, null, 2));
  };

  const handleFieldChange = (index, key, value) => {
    const newFields = [...editorFields];
    newFields[index] = {
      ...newFields[index],
      [key]: value
    };
    setEditorFields(newFields);
    setJsonText(JSON.stringify(newFields, null, 2));
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
      id: "configs",
      title: "Form Configurations",
      description: "Configure fields, validation, and overrides in the database.",
      icon: "fa-sliders-h",
      buttonColor: "bg-blue-600 text-white",
      shadow: "shadow-blue-200",
      onClick: () => onSetSubView('configs')
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
      ) : subView === "configs" ? (
        isEditing ? (
          <FormSchemaEditor
            uuid={editorUuid}
            isNew={isNewForm}
            fields={editorFields}
            jsonMode={jsonMode}
            setJsonMode={setJsonMode}
            jsonText={jsonText}
            setJsonText={setJsonText}
            jsonError={jsonError}
            onSave={handleSaveConfig}
            onCancel={() => setIsEditing(false)}
            onChangeUuid={setEditorUuid}
            onAddField={addField}
            onRemoveField={removeField}
            onMoveField={moveField}
            onFieldChange={handleFieldChange}
            saving={saving}
          />
        ) : (
          <FormConfigList
            configs={configs}
            loading={loading}
            dbTableMissing={dbTableMissing}
            appsScriptError={appsScriptError}
            onRefresh={fetchConfigs}
            onEdit={handleEditConfig}
            onDelete={handleDeleteConfig}
            onImport={async (config) => {
              setLoading(true);
              try {
                const res = await fetch(`${APPS_SCRIPT_URL}?action=config&uuid=${encodeURIComponent(config.uuid)}`);
                const result = await res.json();
                if (result.success) {
                  const fieldsData = result.data || [];
                  setEditorUuid(config.uuid);
                  setEditorFields(fieldsData);
                  setJsonText(JSON.stringify(fieldsData, null, 2));
                  setSelectedConfig(config);
                  setIsNewForm(false);
                  setIsEditing(true);
                  setMessage({ type: "info", text: "Form structure imported from Google Sheets. Review and save to database." });
                } else {
                  throw new Error(result.error);
                }
              } catch (err) {
                setMessage({ type: "error", text: "Failed to import: " + err.message });
              } finally {
                setLoading(false);
              }
            }}
            onCreateNew={() => {
              setIsNewForm(true);
              setEditorUuid("");
              setEditorFields([]);
              setJsonText("[]");
              setJsonError("");
              setJsonMode(false);
              setIsEditing(true);
            }}
            onBack={() => onSetSubView(null)}
          />
        )
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

const FormConfigList = ({
  configs,
  loading,
  dbTableMissing,
  appsScriptError,
  onRefresh,
  onEdit,
  onDelete,
  onImport,
  onCreateNew,
  onBack
}) => {
  return (
    <div className="bg-white border border-light-border shadow-xl overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-light-border flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-dark-deepblue">Form Configurations</h3>
          <p className="text-sm text-dark-muted">Manage structures and data mappings for dynamic form portals.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={onCreateNew}
            disabled={dbTableMissing}
            className="flex-1 md:flex-initial bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 font-bold"
          >
            <i className="fas fa-plus"></i> Add New Form
          </button>
          <button
            onClick={onRefresh}
            className="flex-1 md:flex-initial bg-white border border-light-border text-dark-deepblue px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 font-bold"
          >
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
          <button
            onClick={onBack}
            className="flex-1 md:flex-initial bg-white border border-light-border text-dark-deepblue px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 font-bold"
          >
            Go Back
          </button>
        </div>
      </div>

      {dbTableMissing && (
        <div className="m-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-3">
          <i className="fas fa-exclamation-triangle mt-0.5 text-lg"></i>
          <div>
            <p className="font-bold">Database Setup Required</p>
            <p>The Supabase table <code>dynamic_form_configs</code> was not found. Forms will continue to run in fallback mode from Google Sheets, but database edits are disabled. Please see the setup instructions in <code>SUPABASE_SETUP.md</code> to create the table.</p>
          </div>
        </div>
      )}

      {appsScriptError && (
        <div className="m-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-3">
          <i className="fas fa-exclamation-triangle mt-0.5 text-lg"></i>
          <div>
            <p className="font-bold">Google Apps Script Fetch Warning</p>
            <p>{appsScriptError}</p>
            <p className="mt-1 text-xs text-amber-700">If you just updated your Apps Script code, make sure you published a <strong>New Version</strong> of the Web App deployment in Google Sheets editor.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-20 text-center text-dark-muted">
          <i className="fas fa-spinner fa-spin text-3xl mb-4 text-blue-600"></i>
          <p>Loading configurations...</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="p-20 text-center text-dark-muted">
          <i className="fas fa-sliders-h text-4xl mb-4 text-gray-300"></i>
          <p>No form configurations found. Make sure Apps Script API is set up or add one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-dark-deepblue uppercase text-xs font-bold tracking-wider">
                <th className="p-6 border-b">Form UUID</th>
                <th className="p-6 border-b text-center">Status Source</th>
                <th className="p-6 border-b">Google Sheets Target</th>
                <th className="p-6 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.uuid} className="hover:bg-gray-50/50 transition-colors border-b border-light-border last:border-0">
                  <td className="p-6">
                    <div className="font-bold text-dark-deepblue text-base font-mono">{config.uuid}</div>
                    <div className="text-xs text-dark-muted font-mono">{config.idPattern || "ID-XXXXX"}</div>
                  </td>
                  <td className="p-6 text-center">
                    {config.isDb ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                        Supabase DB
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Google Sheets Only
                      </span>
                    )}
                  </td>
                  <td className="p-6">
                    <div className="text-sm text-dark-deepblue">
                      <span className="font-semibold text-dark-muted">Data Sheet:</span> {config.dataSheetName}
                    </div>
                    <div className="text-xs text-dark-muted">
                      <span className="font-semibold">Config Sheet:</span> {config.configSheetName}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end items-center gap-3">
                      {!config.isDb ? (
                        <button
                          onClick={() => onImport(config)}
                          disabled={dbTableMissing}
                          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-1.5 disabled:opacity-30 shadow-md shadow-blue-100 font-bold animate-in fade-in"
                          title="Add configuration to Supabase DB"
                        >
                          <i className="fas fa-plus"></i> Add to DB
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onEdit(config)}
                            disabled={dbTableMissing}
                            className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-green-700 transition-all flex items-center gap-1.5 disabled:opacity-30 shadow-md shadow-green-100 font-bold"
                            title="Update form schema in DB"
                          >
                            <i className="fas fa-edit"></i> Update
                          </button>
                          <button
                            onClick={() => onDelete(config)}
                            disabled={dbTableMissing}
                            className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-red-700 transition-all flex items-center gap-1.5 disabled:opacity-30 shadow-md shadow-red-100 font-bold"
                            title="Delete configuration from DB"
                          >
                            <i className="fas fa-trash-alt"></i> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const FormSchemaEditor = ({
  uuid,
  isNew,
  fields,
  jsonMode,
  setJsonMode,
  jsonText,
  setJsonText,
  jsonError,
  onSave,
  onCancel,
  onChangeUuid,
  onAddField,
  onRemoveField,
  onMoveField,
  onFieldChange,
  saving
}) => {
  const fieldTypes = [
    "text", "email", "number", "phone", "date", "textarea", "dropdown", "select", "checkbox", "radio", "multi-checkbox"
  ];

  return (
    <div className="bg-white border border-light-border shadow-xl overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-light-border flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-dark-deepblue">
            {isNew ? "Create New Form Schema" : `Edit Form Schema: ${uuid}`}
          </h3>
          <p className="text-sm text-dark-muted">Define the field elements, types, validation, and visibility conditions.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 md:flex-initial bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 font-bold"
          >
            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Save to DB
          </button>
          <button
            onClick={onCancel}
            className="flex-1 md:flex-initial bg-white border border-light-border text-dark-deepblue px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all font-bold"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="p-8 border-b border-light-border">
        <div className="max-w-md">
          <label className="block text-sm font-bold text-dark-deepblue mb-2">Form Identifier (UUID)</label>
          <input
            type="text"
            value={uuid}
            onChange={(e) => onChangeUuid(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
            disabled={!isNew}
            placeholder="e.g. admission_form"
            className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-mono"
          />
          {isNew && <p className="text-xs text-dark-muted mt-1.5">Only lowercase letters, numbers, hyphens, and underscores are allowed.</p>}
        </div>
      </div>

      <div className="border-b border-light-border px-8 bg-gray-50/30 flex justify-between items-center">
        <div className="flex gap-4">
          <button
            onClick={() => setJsonMode(false)}
            className={`py-4 px-2 border-b-2 font-bold text-sm transition-all ${
              !jsonMode ? "border-blue-600 text-blue-600" : "border-transparent text-dark-muted hover:text-dark-deepblue"
            }`}
          >
            UI Builder
          </button>
          <button
            onClick={() => setJsonMode(true)}
            className={`py-4 px-2 border-b-2 font-bold text-sm transition-all ${
              jsonMode ? "border-blue-600 text-blue-600" : "border-transparent text-dark-muted hover:text-dark-deepblue"
            }`}
          >
            JSON Editor
          </button>
        </div>
        {!jsonMode && (
          <button
            onClick={onAddField}
            className="bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100/70 px-4 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <i className="fas fa-plus"></i> Add Field
          </button>
        )}
      </div>

      <div className="p-8">
        {jsonMode ? (
          <div>
            <label className="block text-sm font-bold text-dark-deepblue mb-2">JSON Configuration Schema</label>
            <textarea
              rows={16}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full p-4 border border-light-border rounded-2xl outline-none font-mono text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50"
              placeholder="[\n  {\n    &quot;Field Name&quot;: &quot;example&quot;,\n    &quot;Label&quot;: &quot;Example Field&quot;\n  }\n]"
            />
            {jsonError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-mono">
                {jsonError}
              </div>
            )}
          </div>
        ) : fields.length === 0 ? (
          <div className="p-16 text-center text-dark-muted border-2 border-dashed border-gray-200 rounded-2xl">
            <i className="fas fa-list-ul text-3xl mb-3 text-gray-300"></i>
            <p className="mb-4">No fields defined for this form schema.</p>
            <button
              onClick={onAddField}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              Add Your First Field
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-8">
            <div className="inline-block min-w-full align-middle px-8 text-left">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="text-dark-deepblue uppercase text-xs font-bold tracking-wider border-b border-light-border pb-4">
                    <th className="pb-3 pr-4 w-1/5">Field Name</th>
                    <th className="pb-3 pr-4 w-1/5">Label</th>
                    <th className="pb-3 pr-4 w-32">Type</th>
                    <th className="pb-3 pr-4">List Options</th>
                    <th className="pb-3 pr-4 w-20 text-center">Req?</th>
                    <th className="pb-3 pr-4 w-1/6">Default</th>
                    <th className="pb-3 pr-4 w-1/6">Criteria</th>
                    <th className="pb-3 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fields.map((field, index) => (
                    <tr key={index} className="hover:bg-gray-50/30 transition-colors">
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field["Field Name"] || ""}
                          onChange={(e) => onFieldChange(index, "Field Name", e.target.value)}
                          placeholder="e.g. email"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all font-mono"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field.Label || ""}
                          onChange={(e) => onFieldChange(index, "Label", e.target.value)}
                          placeholder="e.g. Email Address"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={field["Field Type"] || "text"}
                          onChange={(e) => onFieldChange(index, "Field Type", e.target.value)}
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                        >
                          {fieldTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field.List || ""}
                          onChange={(e) => onFieldChange(index, "List", e.target.value)}
                          disabled={!["select", "dropdown", "radio", "multi-checkbox"].includes(field["Field Type"])}
                          placeholder="e.g. Admin, User"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all disabled:bg-gray-50 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <input
                          type="checkbox"
                          checked={field.Required === true || field.Required === "Yes" || field.Required === "true" || field.Required === 1}
                          onChange={(e) => onFieldChange(index, "Required", e.target.checked)}
                          className="h-4.5 w-4.5 rounded accent-blue-600 focus:ring-2 focus:ring-blue-50 transition-all cursor-pointer"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field["Default Value"] || ""}
                          onChange={(e) => onFieldChange(index, "Default Value", e.target.value)}
                          placeholder="e.g. Guest"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field.Criteria || ""}
                          onChange={(e) => onFieldChange(index, "Criteria", e.target.value)}
                          placeholder="e.g. role=admin"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                        />
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => onMoveField(index, -1)}
                            disabled={index === 0}
                            className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-10 transition-all"
                            title="Move Up"
                          >
                            <i className="fas fa-chevron-up text-xs"></i>
                          </button>
                          <button
                            onClick={() => onMoveField(index, 1)}
                            disabled={index === fields.length - 1}
                            className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-10 transition-all"
                            title="Move Down"
                          >
                            <i className="fas fa-chevron-down text-xs"></i>
                          </button>
                          <button
                            onClick={() => onRemoveField(index)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-all"
                            title="Delete Field"
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPortal;
