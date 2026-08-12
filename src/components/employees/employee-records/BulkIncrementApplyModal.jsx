import React from 'react';

const BulkIncrementApplyModal = ({
  isBulkApplyModalOpen,
  setIsBulkApplyModalOpen,
  bulkApplyFilterMode,
  setBulkApplyFilterMode,
  bulkApplyDateValue,
  setBulkApplyDateValue,
  matchingBulkIncrements,
  selectedBulkEmpIds,
  setSelectedBulkEmpIds,
  handleExecuteBulkApplyIncrements,
  saving,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setIsBulkApplyModalOpen(false);
      }
    };
    if (isBulkApplyModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBulkApplyModalOpen, setIsBulkApplyModalOpen]);

  if (!isBulkApplyModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-lg font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-calendar-check text-emerald-600"></i> Apply Increment to Current
              Salary
            </h3>
            <p className="text-xs text-dark-muted font-semibold mt-0.5">Salary Increment Data.</p>
          </div>
          <button
            onClick={() => setIsBulkApplyModalOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Date/Month Selection Controls */}
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-extrabold text-emerald-950 shrink-0">
              Effective Month:
            </label>
            <input
              type="month"
              value={bulkApplyDateValue}
              onChange={(e) => setBulkApplyDateValue(e.target.value)}
              className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-extrabold text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* Matching Preview List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-dark-primary">
            <span>
              Matching Employees ({matchingBulkIncrements.length} found, {selectedBulkEmpIds.length}{' '}
              selected):
            </span>
          </div>

          {matchingBulkIncrements.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed text-xs text-dark-muted font-semibold">
              <i className="fas fa-calendar-xmark text-2xl text-gray-300 mb-2 block"></i>
              No employees found with compensation history entry matching "{bulkApplyDateValue}".
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-emerald-50 border-b text-[10px] uppercase tracking-wider text-emerald-950 font-bold">
                  <tr>
                    <th className="p-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          matchingBulkIncrements.length > 0 &&
                          selectedBulkEmpIds.length === matchingBulkIncrements.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBulkEmpIds(
                              matchingBulkIncrements.map((item) => String(item.emp.id))
                            );
                          } else {
                            setSelectedBulkEmpIds([]);
                          }
                        }}
                        className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title="Select All / Deselect All"
                      />
                    </th>
                    <th className="p-2.5">Employee</th>
                    <th className="p-2.5">Revision Date</th>
                    <th className="p-2.5">Hike Amount</th>
                    <th className="p-2.5">Current Salary</th>
                    <th className="p-2.5">Proposed Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold">
                  {matchingBulkIncrements.map((item, idx) => {
                    const isChecked = selectedBulkEmpIds.includes(String(item.emp.id));
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-emerald-50/30 ${
                          isChecked ? 'bg-emerald-50/20' : 'opacity-60'
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const empIdStr = String(item.emp.id);
                              if (e.target.checked) {
                                setSelectedBulkEmpIds((prev) => [...prev, empIdStr]);
                              } else {
                                setSelectedBulkEmpIds((prev) =>
                                  prev.filter((id) => id !== empIdStr)
                                );
                              }
                            }}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5">
                          <div className="font-extrabold text-dark-primary">{item.emp.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {item.emp.emp_id || `ID: ${item.emp.id}`}
                          </div>
                        </td>
                        <td className="p-2.5 font-mono">{item.matchingEntry.date || 'N/A'}</td>
                        <td className="p-2.5 text-emerald-700 font-bold">
                          +₹{(Number(item.matchingEntry.amount) || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-gray-600">
                          ₹{(Number(item.currentSalary) || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 font-extrabold text-emerald-800">
                          ₹{item.proposedSalary.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t">
          <button
            type="button"
            onClick={() => setIsBulkApplyModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-light-ui text-dark-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedBulkEmpIds.length === 0 || saving}
            onClick={handleExecuteBulkApplyIncrements}
            className="px-5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <i className="fas fa-check-double"></i>
            {saving
              ? 'Updating Salaries...'
              : `Apply to ${selectedBulkEmpIds.length} Selected Employees`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkIncrementApplyModal;
