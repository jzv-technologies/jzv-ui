import React from 'react';

const BulkImportModal = ({
  isCsvImportOpen,
  setIsCsvImportOpen,
  handleCsvFileChange,
  csvPreviewRows,
  setCsvPreviewRows,
  handleBulkImportSubmit,
  saving,
}) => {
  if (!isCsvImportOpen) return null;

  return (
    <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-4xl w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-lg font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-file-arrow-up text-emerald-600"></i> Bulk Import / Update
              Employee Records
            </h3>
            <p className="text-xs text-dark-muted font-semibold mt-0.5">
              Upload an Excel (.xlsx/.xls) or CSV file. Matching Employee IDs or Names will update
              existing records, while new IDs will be added.
            </p>
          </div>
          <button
            onClick={() => {
              setIsCsvImportOpen(false);
              setCsvPreviewRows([]);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* File Upload Box */}
        <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-2xl p-6 text-center space-y-3">
          <i className="fas fa-cloud-arrow-up text-3xl text-emerald-600 mb-1"></i>
          <div>
            <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-extrabold text-xs inline-flex items-center gap-2 shadow-sm transition-all">
              <i className="fas fa-file-excel"></i> Choose Excel / CSV File
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleCsvFileChange}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-gray-500 font-semibold mt-2">
              Supported formats: .xlsx, .xls, .csv
            </p>
          </div>
        </div>

        {/* Preview Table */}
        {csvPreviewRows.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-black text-dark-primary flex items-center justify-between">
              <span>Import Preview ({csvPreviewRows.length} Rows Detected)</span>
              <span className="text-emerald-700 font-extrabold">
                {csvPreviewRows.filter((r) => r.isUpdate).length} Update(s) |{' '}
                {csvPreviewRows.filter((r) => !r.isUpdate).length} New Record(s)
              </span>
            </h4>

            <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead className="bg-gray-100 border-b text-[10px] uppercase tracking-wider text-dark-muted">
                  <tr>
                    <th className="p-2">Action</th>
                    <th className="p-2">ID / Emp ID</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Designation</th>
                    <th className="p-2">Organization</th>
                    <th className="p-2">Salaried</th>
                    <th className="p-2">Login Allowed</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {csvPreviewRows.map((r, i) => (
                    <tr key={i} className={r.isUpdate ? 'bg-blue-50/40' : ''}>
                      <td className="p-2">
                        {r.isUpdate ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                            <i className="fas fa-sync-alt text-[8px]"></i> UPDATE (#{r.existingId})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            <i className="fas fa-plus text-[8px]"></i> NEW
                          </span>
                        )}
                      </td>
                      <td className="p-2 font-bold">{r.emp_id}</td>
                      <td className="p-2 font-bold">{r.name}</td>
                      <td className="p-2">{r.designation}</td>
                      <td className="p-2 truncate max-w-[120px]">{r.organization}</td>
                      <td className="p-2 font-bold">
                        {r.is_salaried_employee ? (
                          <span className="text-emerald-600">TRUE (₹{r.current_salary})</span>
                        ) : (
                          <span className="text-gray-400">FALSE</span>
                        )}
                      </td>
                      <td className="p-2 font-bold">
                        {r.login_allowed ? (
                          <span className="text-emerald-600">TRUE</span>
                        ) : (
                          <span className="text-gray-400">FALSE</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t">
          <button
            type="button"
            onClick={() => {
              setIsCsvImportOpen(false);
              setCsvPreviewRows([]);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-light-ui text-dark-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={csvPreviewRows.length === 0 || saving}
            onClick={handleBulkImportSubmit}
            className="px-5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all disabled:opacity-50"
          >
            {saving
              ? 'Processing Import...'
              : `Confirm Import / Update (${csvPreviewRows.length} Rows)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
