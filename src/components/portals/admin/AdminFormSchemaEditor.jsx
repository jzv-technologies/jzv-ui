// src/components/portals/admin/AdminFormSchemaEditor.jsx
import React from "react";

const AdminFormSchemaEditor = ({
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
  saving,
}) => {
  const fieldTypes = [
    "text",
    "email",
    "number",
    "phone",
    "date",
    "textarea",
    "dropdown",
    "select",
    "checkbox",
    "radio",
    "multi-checkbox",
  ];

  return (
    <div className="bg-white border border-light-border shadow-xl overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-light-border flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-dark-deepblue">
            {isNew ? "Create New Form Schema" : `Edit Form Schema: ${uuid}`}
          </h3>
          <p className="text-sm text-dark-muted">
            Define the field elements, types, validation, and visibility
            conditions.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 md:flex-initial bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
          >
            {saving ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-save"></i>
            )}{" "}
            Save to DB
          </button>
          <button
            onClick={onCancel}
            className="flex-1 md:flex-initial bg-white border border-light-border text-dark-deepblue px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="p-8 border-b border-light-border">
        <div className="max-w-md">
          <label className="block text-sm font-bold text-dark-deepblue mb-2">
            Form Identifier (UUID)
          </label>
          <input
            type="text"
            value={uuid}
            onChange={(e) =>
              onChangeUuid(
                e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
              )
            }
            disabled={!isNew}
            placeholder="e.g. admission_form"
            className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-mono"
          />
          {isNew && (
            <p className="text-xs text-dark-muted mt-1.5">
              Only lowercase letters, numbers, hyphens, and underscores are
              allowed.
            </p>
          )}
        </div>
      </div>

      <div className="border-b border-light-border px-8 bg-gray-50/30 flex justify-between items-center">
        <div className="flex gap-4">
          <button
            onClick={() => setJsonMode(false)}
            className={`py-4 px-2 border-b-2 font-bold text-sm transition-all ${
              !jsonMode
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-dark-muted hover:text-dark-deepblue"
            }`}
          >
            UI Builder
          </button>
          <button
            onClick={() => setJsonMode(true)}
            className={`py-4 px-2 border-b-2 font-bold text-sm transition-all ${
              jsonMode
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-dark-muted hover:text-dark-deepblue"
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
            <label className="block text-sm font-bold text-dark-deepblue mb-2">
              JSON Configuration Schema
            </label>
            <textarea
              rows={16}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full p-4 border border-light-border rounded-2xl outline-none font-mono text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50"
              placeholder='[\n  {\n    "Field Name": "example",\n    "Label": "Example Field"\n  }\n]'
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
                    <tr
                      key={index}
                      className="hover:bg-gray-50/30 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field["Field Name"] || ""}
                          onChange={(e) =>
                            onFieldChange(index, "Field Name", e.target.value)
                          }
                          placeholder="e.g. email"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all font-mono"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field.Label || ""}
                          onChange={(e) =>
                            onFieldChange(index, "Label", e.target.value)
                          }
                          placeholder="e.g. Email Address"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={field["Field Type"] || "text"}
                          onChange={(e) =>
                            onFieldChange(index, "Field Type", e.target.value)
                          }
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                        >
                          {fieldTypes.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field.List || ""}
                          onChange={(e) =>
                            onFieldChange(index, "List", e.target.value)
                          }
                          disabled={
                            ![
                              "select",
                              "dropdown",
                              "radio",
                              "multi-checkbox",
                            ].includes(field["Field Type"])
                          }
                          placeholder="e.g. Admin, User"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all disabled:bg-gray-50 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <input
                          type="checkbox"
                          checked={
                            field.Required === true ||
                            field.Required === "Yes" ||
                            field.Required === "true" ||
                            field.Required === 1
                          }
                          onChange={(e) =>
                            onFieldChange(index, "Required", e.target.checked)
                          }
                          className="h-4.5 w-4.5 rounded accent-blue-600 focus:ring-2 focus:ring-blue-50 transition-all cursor-pointer"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field["Default Value"] || ""}
                          onChange={(e) =>
                            onFieldChange(
                              index,
                              "Default Value",
                              e.target.value,
                            )
                          }
                          placeholder="e.g. Guest"
                          className="w-full px-3 py-1.5 border border-light-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={field.Criteria || ""}
                          onChange={(e) =>
                            onFieldChange(index, "Criteria", e.target.value)
                          }
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

export default AdminFormSchemaEditor;
