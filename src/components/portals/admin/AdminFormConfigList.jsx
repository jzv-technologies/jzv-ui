// src/components/portals/admin/AdminFormConfigList.jsx
import React from "react";

const AdminFormConfigList = ({
  configs,
  loading,
  dbTableMissing,
  appsScriptError,
  onRefresh,
  onEdit,
  onDelete,
  onImport,
  onCreateNew,
  onBack,
}) => {
  return (
    <div className="bg-white border border-light-border shadow-xl overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-light-border flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-dark-deepblue">
            Form Configurations
          </h3>
          <p className="text-sm text-dark-muted">
            Manage structures and data mappings for dynamic form portals.
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
          <button
            onClick={onBack}
            className="flex-1 md:flex-initial bg-white border border-light-border text-dark-deepblue px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
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
            <p>
              The Supabase table <code>dynamic_form_configs</code> was not
              found. Forms will continue to run in fallback mode from Google
              Sheets, but database edits are disabled. Please see the setup
              instructions in <code>SUPABASE_SETUP.md</code> to create the
              table.
            </p>
          </div>
        </div>
      )}

      {appsScriptError && (
        <div className="m-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-3">
          <i className="fas fa-exclamation-triangle mt-0.5 text-lg"></i>
          <div>
            <p className="font-bold">Google Apps Script Fetch Warning</p>
            <p>{appsScriptError}</p>
            <p className="mt-1 text-xs text-amber-700">
              If you just updated your Apps Script code, make sure you published
              a <strong>New Version</strong> of the Web App deployment in Google
              Sheets editor.
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
            No form configurations found. Make sure Apps Script API is set up or
            add one.
          </p>
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
                <tr
                  key={config.uuid}
                  className="hover:bg-gray-50/50 transition-colors border-b border-light-border last:border-0"
                >
                  <td className="p-6">
                    <div className="font-bold text-dark-deepblue text-base font-mono">
                      {config.uuid}
                    </div>
                    <div className="text-xs text-dark-muted font-mono">
                      {config.idPattern || "ID-XXXXX"}
                    </div>
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
                      <span className="font-semibold text-dark-muted">
                        Data Sheet:
                      </span>{" "}
                      {config.dataSheetName}
                    </div>
                    <div className="text-xs text-dark-muted">
                      <span className="font-semibold">Config Sheet:</span>{" "}
                      {config.configSheetName}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end items-center gap-3">
                      {!config.isDb ? (
                        <button
                          onClick={() => onImport(config)}
                          disabled={dbTableMissing}
                          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-1.5 disabled:opacity-30 shadow-md shadow-blue-100"
                          title="Add configuration to Supabase DB"
                        >
                          <i className="fas fa-plus"></i> Add to DB
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onEdit(config)}
                            disabled={dbTableMissing}
                            className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-green-700 transition-all flex items-center gap-1.5 disabled:opacity-30 shadow-md shadow-green-100"
                            title="Update form schema in DB"
                          >
                            <i className="fas fa-edit"></i> Update
                          </button>
                          <button
                            onClick={() => onDelete(config)}
                            disabled={dbTableMissing}
                            className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-red-700 transition-all flex items-center gap-1.5 disabled:opacity-30 shadow-md shadow-red-100"
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

export default AdminFormConfigList;
