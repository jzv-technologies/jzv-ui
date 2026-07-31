import React, { useState, useEffect } from 'react';
import { showToast } from '../../../../../utils/toast';

const CompensationHistoryModal = ({
  isOpen,
  onClose,
  employee,
  onSaveHistory,
  saving,
  user,
}) => {
  const [historyList, setHistoryList] = useState([]);
  const [currentSalary, setCurrentSalary] = useState('');
  const [newIncrement, setNewIncrement] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    percentage: '',
    updated_salary: '',
    notes: '',
  });

  useEffect(() => {
    if (employee) {
      setHistoryList(
        Array.isArray(employee.compensation_history) ? [...employee.compensation_history] : []
      );
      setCurrentSalary(employee.current_salary ? String(employee.current_salary) : '0');
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleHikeAmountChange = (amtVal) => {
    const curSal = Number(currentSalary) || 0;
    let pctVal = newIncrement.percentage;
    let newSalVal = newIncrement.updated_salary;

    if (amtVal && !isNaN(amtVal)) {
      const amtNum = Number(amtVal);
      if (curSal > 0) {
        pctVal = ((amtNum / curSal) * 100).toFixed(1);
      }
      newSalVal = String(curSal + amtNum);
    }
    setNewIncrement({
      ...newIncrement,
      amount: amtVal,
      percentage: pctVal,
      updated_salary: newSalVal,
    });
  };

  const handleHikePctChange = (pctVal) => {
    const curSal = Number(currentSalary) || 0;
    let amtVal = newIncrement.amount;
    let newSalVal = newIncrement.updated_salary;

    if (pctVal && !isNaN(pctVal)) {
      const pctNum = Number(pctVal);
      const calculatedHike = Math.round((curSal * pctNum) / 100);
      amtVal = String(calculatedHike);
      newSalVal = String(curSal + calculatedHike);
    }

    setNewIncrement({
      ...newIncrement,
      percentage: pctVal,
      amount: amtVal,
      updated_salary: newSalVal,
    });
  };

  const handleUpdatedSalaryChange = (newSalVal) => {
    const curSal = Number(currentSalary) || 0;
    let amtVal = '';
    let pctVal = '';

    if (newSalVal !== '' && !isNaN(newSalVal)) {
      const newSalNum = Number(newSalVal);
      const hikeNum = newSalNum - curSal;
      amtVal = String(hikeNum);
      if (curSal > 0) {
        pctVal = ((hikeNum / curSal) * 100).toFixed(1);
      } else {
        pctVal = '0';
      }
    }

    setNewIncrement({
      ...newIncrement,
      updated_salary: newSalVal,
      amount: amtVal,
      percentage: pctVal,
    });
  };

  const handleAddIncrementEntry = () => {
    if (!newIncrement.amount && !newIncrement.updated_salary) {
      showToast('Please enter a hike amount or updated salary value.', 'error');
      return;
    }

    const userName =
      user?.user_metadata?.full_name || user?.email?.split('@')[0] || user?.email || 'Admin';

    const itemToAdd = {
      date: newIncrement.date || new Date().toISOString().split('T')[0],
      amount: newIncrement.amount || '0',
      percentage: newIncrement.percentage || '0',
      updated_salary: newIncrement.updated_salary || currentSalary,
      notes: newIncrement.notes || '',
      created_at: new Date().toISOString(),
      created_by: userName,
    };

    const updatedList = [...historyList, itemToAdd];
    const newSal = itemToAdd.updated_salary ? itemToAdd.updated_salary : currentSalary;

    setHistoryList(updatedList);
    setCurrentSalary(String(newSal));
    setNewIncrement({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      percentage: '',
      updated_salary: '',
      notes: '',
    });

    showToast('Salary increment entry added!', 'success');
  };

  const handleRemoveEntry = (idx) => {
    const updatedList = [...historyList];
    updatedList.splice(idx, 1);
    setHistoryList(updatedList);
  };

  const handleSave = () => {
    onSaveHistory(employee.id, historyList, currentSalary);
  };

  return (
    <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-lg">
              <i className="fas fa-chart-line"></i>
            </div>
            <div>
              <h3 className="text-lg font-black text-dark-primary flex items-center gap-2">
                Compensation History & Revisions
              </h3>
              <p className="text-xs text-dark-muted font-semibold mt-0.5">
                {employee.name} — {employee.organization || 'Jamia Zaytoonah'} ({employee.designation || 'Teacher'})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Current Salary Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-900 block">
              Current Base Salary
            </span>
            <span className="text-2xl font-black text-emerald-950">
              ₹{Number(currentSalary || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <span className="px-3 py-1 bg-white border border-emerald-300 text-emerald-800 rounded-full text-xs font-black shadow-xs">
            {historyList.length} Revision(s) Recorded
          </span>
        </div>

        {/* Existing History List */}
        <div className="space-y-2">
          <h4 className="text-xs font-black text-dark-primary flex items-center justify-between">
            <span>Increment History Timeline</span>
          </h4>

          {historyList.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 rounded-2xl border border-dashed text-xs text-gray-400 font-semibold">
              <i className="fas fa-calendar-xmark text-2xl text-gray-300 mb-1 block"></i>
              No past salary revision records found for this employee.
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {historyList.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-200 text-xs shadow-2xs hover:border-amber-300 transition-all"
                >
                  <div className="space-y-1">
                    <div className="font-extrabold text-dark-primary flex items-center gap-2 flex-wrap">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-lg border text-dark-soft">
                        <i className="fas fa-calendar-day text-gray-400 mr-1"></i>
                        {item.date || 'N/A'}
                      </span>
                      <span className="text-emerald-700 font-black">
                        +₹{Number(item.amount || 0).toLocaleString('en-IN')} ({item.percentage || 0}%)
                      </span>
                      <span className="bg-emerald-100 text-emerald-950 font-black px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                        Revised Salary: ₹
                        {(item.updated_salary
                          ? Number(item.updated_salary)
                          : Number(currentSalary)
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-dark-muted text-[11px] font-semibold flex items-center gap-1">
                        <i className="fas fa-note-sticky text-amber-500"></i> {item.notes}
                      </p>
                    )}
                    <div className="text-[10px] text-dark-muted font-semibold flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="text-purple-900 font-extrabold flex items-center gap-1">
                        <i className="fas fa-user-shield text-purple-600"></i>
                        By: {item.created_by || item.updated_by || 'Admin'}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <i className="fas fa-clock text-gray-400"></i>
                        Recorded:{' '}
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : item.date || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEntry(idx)}
                    className="w-7 h-7 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg flex items-center justify-center transition-all shrink-0 ml-2"
                    title="Remove entry"
                  >
                    <i className="fas fa-trash-alt text-xs"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Revision Entry Form */}
        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 space-y-3">
          <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
            <i className="fas fa-[#d97706] fa-plus-circle text-amber-700"></i> Add New Salary Revision
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-extrabold text-dark-muted block mb-1">
                Effective Date
              </label>
              <input
                type="date"
                value={newIncrement.date}
                onChange={(e) => setNewIncrement({ ...newIncrement, date: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-dark-muted block mb-1">
                Hike Amount (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 3000"
                value={newIncrement.amount}
                onChange={(e) => handleHikeAmountChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-dark-muted block mb-1">
                Hike (%)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 10"
                value={newIncrement.percentage}
                onChange={(e) => handleHikePctChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-dark-muted block mb-1">
                Updated Salary (₹)
              </label>
              <input
                type="number"
                placeholder="Resulting Base"
                value={newIncrement.updated_salary}
                onChange={(e) => handleUpdatedSalaryChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl font-extrabold text-emerald-800 bg-emerald-50/50 outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Notes / Reason for revision (e.g. Annual Increment 2026)..."
              value={newIncrement.notes}
              onChange={(e) => setNewIncrement({ ...newIncrement, notes: e.target.value })}
              className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-xl font-semibold text-xs outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              type="button"
              onClick={handleAddIncrementEntry}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-extrabold text-xs shadow-xs transition-all shrink-0 active:scale-95"
            >
              <i className="fas fa-plus mr-1"></i> Add Entry
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-dark-primary rounded-xl font-bold text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <i className="fas fa-save"></i> {saving ? 'Saving...' : 'Save Compensation History'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompensationHistoryModal;
