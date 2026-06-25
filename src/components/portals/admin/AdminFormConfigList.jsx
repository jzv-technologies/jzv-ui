// src/components/portals/admin/AdminFormConfigList.jsx
import React from "react";

const AdminFormConfigList = ({
  configs,
  loading,
  dbTableMissing,
  appsScriptError,
  onRefresh,
  onEdit,
  onClone,
  onDelete,
  onCreateNew,
  onBack,
  onValidate,
  validatingUuid,
  onClearCache,
  clearingCacheUuid,
}) => {
  return (
    <div className="bg-white border-0 overflow-hidden">
      <div className="p-8 border-b border-light-border flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-dark-deepblue">
            Form Schemas
          </h3>
          <p className="text-sm text-dark-muted">
            Manage UI structures, validations, and field parameters for dynamic forms.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={onCreateNew}
            disabled={dbTableMissing}
            className="flex-1 md:flex-initial bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
          >
            <i className="fas fa-plus"></i> Add New Form
          </button>
          <button
            onClick={onRefresh}
            className="flex-1 md:flex-initial bg-white border border-light-border text-dark-deepblue px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {dbTableMissing && (
        <div className="m-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-3">
          <i className="fas fa-exclamation-triangle mt-0.5 text-lg"></i>
          <div>
            <p className="font-bold">Database Setup Required</p>
            <p>
              The Supabase table <code>dynamic_form_configs</code> was not
              found. Please verify that the table has been successfully configured.
            </p>
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
          <p>
            No form configurations found. Click "Add New Form" to define a schema.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-dark-deepblue uppercase text-xs font-bold tracking-wider">
                <th className="p-6 border-b">Form Name</th>
                <th className="p-6 border-b">ID Pattern</th>
                <th className="p-6 border-b">Google Sheet Mapping</th>
                <th className="p-6 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr
                  key={config.form_name}
                  className="hover:bg-gray-50/50 transition-colors border-b border-light-border last:border-0"
                >
                  <td className="p-6 text-dark-deepblue text-base">
                    <span className="font-bold block">{config.display_name || config.form_name}</span>
                    {config.display_name && (
                      <span className="block text-xs font-normal text-dark-muted font-mono mt-0.5">
                        ID: {config.form_name}
                      </span>
                    )}
                  </td>
                  <td className="p-6 font-mono text-sm text-dark-muted">
                    {config.id_pattern || "ID-XXXXX"}
                  </td>
                  <td className="p-6 text-sm text-dark-primary font-semibold">
                    {config.data_id ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                        {config.data_id}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        None (Not mapped)
                      </span>
                    )}
                  </td>
                  <td className="p-6 text-right font-medium">
                    <div className="flex justify-end items-center gap-3">
                      {config.data_id && (
                        <>
                          <button
                            onClick={() => onValidate(config)}
                            disabled={dbTableMissing || validatingUuid !== null || clearingCacheUuid !== null}
                            className="bg-blue-50 border border-blue-200 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-30"
                            title="Validate sheet columns match form schema fields"
                          >
                            {validatingUuid === (config.form_name || config.uuid) ? (
                              <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fas fa-check-double"></i>
                            )}
                            Validate
                          </button>
                          <button
                            onClick={() => onClearCache(config)}
                            disabled={dbTableMissing || validatingUuid !== null || clearingCacheUuid !== null}
                            className="bg-amber-50 border border-amber-200 text-amber-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-amber-100 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-30"
                            title="Clear cached sheet, configs, and headers for this form"
                          >
                            {clearingCacheUuid === (config.form_name || config.uuid) ? (
                              <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fas fa-trash-alt"></i>
                            )}
                            Clear Cache
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onEdit(config)}
                        disabled={dbTableMissing}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-green-700 transition-all flex items-center gap-1.5 disabled:opacity-30 shadow-md shadow-green-100"
                        title="Update form schema in DB"
                      >
                        <i className="fas fa-edit"></i> Edit
                      </button>
                      <button
                        onClick={() => onClone(config)}
                        disabled={dbTableMissing}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-1.5 disabled:opacity-30 shadow-md shadow-indigo-100"
                        title="Clone configuration with a new name"
                      >
                        <i className="fas fa-copy"></i> Clone
                      </button>
                      <button
                        onClick={() => onDelete(config)}
                        disabled={dbTableMissing}
                        className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-red-700 transition-all flex items-center gap-1.5 disabled:opacity-30 shadow-md shadow-red-100"
                        title="Delete configuration from DB"
                      >
                        <i className="fas fa-trash-alt"></i> Delete
                      </button>
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

export default AdminFormConfigList;
