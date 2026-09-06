// src/components/portal-shared/CandidateTestAccessManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import DynamicForm from '../DynamicForm';

const TEST_NAMES = ['English Test', 'Tamil Test', 'Arabic Test', 'Urdu Test'];

export const CandidateTestAccessManager = () => {
  const [enabledTestsMap, setEnabledTestsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [enableMobile, setEnableMobile] = useState('');
  const [enableSelectedTests, setEnableSelectedTests] = useState([]);
  const [enableExpiryHours, setEnableExpiryHours] = useState(2);
  const [saving, setSaving] = useState(false);

  const fetchEnabledTests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_configruation')
        .select('val')
        .eq('key', 'enable_test')
        .maybeSingle();
      if (!error && data?.val) {
        setEnabledTestsMap(typeof data.val === 'string' ? JSON.parse(data.val) : data.val);
      } else {
        setEnabledTestsMap({});
      }
    } catch (err) {
      console.warn('Failed to load enabled tests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnabledTests();
  }, [fetchEnabledTests]);

  const handleEnableAccess = async (e) => {
    e.preventDefault();
    const cleanMobile = enableMobile.replace(/\D/g, '');
    if (!cleanMobile) {
      showToast('Please enter a valid mobile number.', 'error');
      return;
    }
    if (enableSelectedTests.length === 0) {
      showToast('Please select at least one test.', 'error');
      return;
    }
    setSaving(true);
    try {
      const expireOn = new Date(Date.now() + enableExpiryHours * 60 * 60 * 1000).toISOString();
      const updatedMap = {
        ...enabledTestsMap,
        [cleanMobile]: { test: enableSelectedTests, expire_on: expireOn },
      };
      const { error } = await supabase
        .from('admin_configruation')
        .upsert({ key: 'enable_test', val: updatedMap }, { onConflict: 'key' });
      if (error) throw error;
      setEnabledTestsMap(updatedMap);
      setEnableMobile('');
      setEnableSelectedTests([]);
      setEnableExpiryHours(2);
      showToast(`Test access enabled for ${cleanMobile}`, 'success');
    } catch (err) {
      showToast('Failed to enable test access: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (mobile) => {
    const updatedMap = { ...enabledTestsMap };
    delete updatedMap[mobile];
    try {
      const { error } = await supabase
        .from('admin_configruation')
        .upsert({ key: 'enable_test', val: updatedMap }, { onConflict: 'key' });
      if (error) throw error;
      setEnabledTestsMap(updatedMap);
      showToast(`Access revoked for ${mobile}`, 'success');
    } catch (err) {
      showToast('Failed to revoke access: ' + err.message, 'error');
    }
  };

  const now = new Date();
  const activeEntries = Object.entries(enabledTestsMap).filter(
    ([, conf]) => new Date(conf.expire_on) > now
  );
  const expiredEntries = Object.entries(enabledTestsMap).filter(
    ([, conf]) => new Date(conf.expire_on) <= now
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-6">
      {/* Enable test access form */}
      <div className="bg-white border border-light-border rounded-[2rem] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl">
            <i className="fas fa-user-clock"></i>
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-dark-deepblue">
              Candidate Test Access Management
            </h3>
            <p className="text-xs text-dark-muted">
              Grant temporary test access to candidate mobile numbers
            </p>
          </div>
        </div>

        <form onSubmit={handleEnableAccess} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={enableMobile}
                onChange={(e) => setEnableMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-4 py-2.5 rounded-xl border border-light-border text-sm focus:outline-none focus:border-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                Access Duration
              </label>
              <select
                value={enableExpiryHours}
                onChange={(e) => setEnableExpiryHours(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-light-border text-sm focus:outline-none focus:border-teal-500 bg-white"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
              Available Tests <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TEST_NAMES.map((testName) => {
                const isSelected = enableSelectedTests.includes(testName);
                return (
                  <button
                    key={testName}
                    type="button"
                    onClick={() =>
                      setEnableSelectedTests((prev) =>
                        isSelected ? prev.filter((t) => t !== testName) : [...prev, testName]
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white text-dark-muted border-light-border hover:border-teal-400'
                    }`}
                  >
                    <i className={`fas ${isSelected ? 'fa-check-circle' : 'fa-circle'} mr-1.5`}></i>
                    {testName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <i className="fas fa-spinner fa-spin"></i>}
              Grant Access
            </button>
          </div>
        </form>

        {/* Active grants list */}
        <div className="mt-8 border-t border-light-border/60 pt-6">
          <h4 className="text-sm font-bold text-dark-deepblue mb-3 flex items-center gap-2">
            <span>Active Access Grants</span>
            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs">
              {activeEntries.length}
            </span>
          </h4>

          {loading ? (
            <div className="py-4 text-center text-xs text-dark-muted">Loading access records...</div>
          ) : activeEntries.length === 0 ? (
            <p className="text-xs text-dark-muted py-2">No active test access grants currently.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-light-border text-dark-muted font-bold">
                    <th className="py-2 px-3">Mobile</th>
                    <th className="py-2 px-3">Granted Tests</th>
                    <th className="py-2 px-3">Expires</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEntries.map(([mobile, conf]) => (
                    <tr key={mobile} className="border-b border-light-border/40 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-semibold text-dark-deepblue">{mobile}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(conf.test || []).map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-medium"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-dark-muted">
                        {new Date(conf.expire_on).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleRevoke(mobile)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {expiredEntries.length > 0 && (
            <div className="mt-4 pt-4 border-t border-light-border/50 flex items-center justify-between">
              <p className="text-xs text-dark-muted">
                <i className="fas fa-clock mr-1 text-amber-500"></i>
                {expiredEntries.length} expired grant(s)
              </p>
              <button
                onClick={async () => {
                  const cleaned = {};
                  for (const [m, c] of Object.entries(enabledTestsMap)) {
                    if (new Date(c.expire_on) > now) cleaned[m] = c;
                  }
                  const { error } = await supabase
                    .from('admin_configruation')
                    .upsert({ key: 'enable_test', val: cleaned }, { onConflict: 'key' });
                  if (!error) {
                    setEnabledTestsMap(cleaned);
                    showToast('Expired grants cleaned up', 'success');
                  }
                }}
                className="text-xs text-red-500 hover:underline font-bold"
              >
                Clean up expired
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Online test preview/form */}
      <div className="bg-white border border-light-border rounded-[2rem] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl">
            <i className="fas fa-vial"></i>
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-dark-deepblue">Online Evaluation Form</h3>
            <p className="text-xs text-dark-muted">Staff test submission interface</p>
          </div>
        </div>
        <DynamicForm uuid="online-teacher-test" textColor="text-teal-600" />
      </div>
    </div>
  );
};

export default CandidateTestAccessManager;
