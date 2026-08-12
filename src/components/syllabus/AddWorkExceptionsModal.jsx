import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

const AddWorkExceptionsModal = ({ isOpen, onClose, onUpdate, user, fullName }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'

  const currentApproverName =
    fullName ||
    user?.full_name ||
    user?.fullName ||
    user?.user_metadata?.full_name ||
    user?.email ||
    'Management';

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('request_tracker')
        .select('*')
        .order('id', { ascending: false });

      if (!error && data) {
        setRequests(data);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.warn('Error fetching exception requests:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const historyRequests = requests.filter((r) => r.status !== 'pending');

  const handleApprove = async (req) => {
    setProcessingId(req.id);
    try {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const expireAt = endOfToday.toISOString();
      const nowIso = new Date().toISOString();

      const { error } = await supabase
        .from('request_tracker')
        .update({
          status: 'approved',
          approved_by: currentApproverName,
          approved_at: nowIso,
          active_from: nowIso,
          expire_at: expireAt,
          updated_at: nowIso,
        })
        .eq('id', req.id);

      if (error) throw error;

      const updatedRequests = requests.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: 'approved',
              approved_by: currentApproverName,
              approved_at: nowIso,
              active_from: nowIso,
              expire_at: expireAt,
            }
          : r
      );

      setRequests(updatedRequests);
      showToast(`Approved request for ${req.requester_name || req.teacher_name} by ${currentApproverName}.`, 'success');
      if (onUpdate) onUpdate();
    } catch (err) {
      showToast('Failed to approve request: ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req) => {
    setProcessingId(req.id);
    try {
      const nowIso = new Date().toISOString();

      const { error } = await supabase
        .from('request_tracker')
        .update({
          status: 'rejected',
          rejected_by: currentApproverName,
          rejected_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', req.id);

      if (error) throw error;

      const updatedRequests = requests.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: 'rejected',
              rejected_by: currentApproverName,
              rejected_at: nowIso,
            }
          : r
      );

      setRequests(updatedRequests);
      showToast(`Rejected request for ${req.requester_name || req.teacher_name} by ${currentApproverName}.`, 'info');
      if (onUpdate) onUpdate();
    } catch (err) {
      showToast('Failed to reject request: ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-light-border max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-light-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shadow-sm">
              <i className="fas fa-comment-dots text-lg animate-bounce"></i>
            </div>
            <div>
              <h3 className="text-base font-black text-dark-deepblue">
                Requests & Exception Approvals
              </h3>
              <p className="text-[11px] text-dark-muted font-semibold">
                Manage teacher requests, permissions & activity logging exceptions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-dark-primary font-bold text-lg p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-light-border px-1 mt-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shadow-sm">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            History ({historyRequests.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 mt-2">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400">
              <i className="fas fa-spinner fa-spin mr-2"></i> Loading requests...
            </div>
          ) : activeTab === 'pending' ? (
            pendingRequests.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl">
                <i className="fas fa-check-circle text-3xl text-emerald-400 mb-2"></i>
                <p className="text-xs font-bold text-gray-500">No pending requests</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Teacher exception and permission requests will appear here.
                </p>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2.5 transition-all shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-dark-primary flex items-center gap-1.5">
                          <i className="fas fa-user-circle text-brand-primary"></i>
                          {req.requester_name || req.teacher_name}
                        </h4>
                        <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                          {req.request_type || req.type || 'Add Work Access'}
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-gray-500 mt-0.5">
                        Requested for Date: <span className="font-bold text-gray-700">{req.date || (req.created_at ? new Date(req.created_at).toISOString().split('T')[0] : '')}</span> •{' '}
                        {req.created_at &&
                          new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                      Pending
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-amber-200/60 text-xs text-gray-700 font-semibold italic">
                    "{req.notes}"
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <p className="text-[9px] text-gray-400 italic">
                      Approving as: <span className="font-bold text-gray-600">{currentApproverName}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={processingId === req.id}
                        onClick={() => handleReject(req)}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition-all disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={processingId === req.id}
                        onClick={() => handleApprove(req)}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {processingId === req.id ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i> Approving...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check"></i> Approve for Today
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : historyRequests.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl">
              <p className="text-xs font-bold text-gray-400">No request history yet.</p>
            </div>
          ) : (
            historyRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 bg-gray-50 border border-light-border rounded-2xl space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-dark-primary">{req.requester_name || req.teacher_name}</span>
                    <span className="text-[9px] font-bold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                      {req.request_type || req.type || 'Add Work Access'}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                <p className="text-xs text-gray-700 italic">"{req.notes}"</p>
                <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1 border-t border-gray-200/60 mt-1">
                  <span>Date: {req.date || (req.created_at ? new Date(req.created_at).toISOString().split('T')[0] : '')}</span>
                  <span className="font-semibold text-gray-600">
                    {req.status === 'approved'
                      ? `Approved by: ${req.approved_by || 'Management'}`
                      : `Rejected by: ${req.rejected_by || 'Management'}`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AddWorkExceptionsModal;

