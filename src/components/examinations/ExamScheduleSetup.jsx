import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import ConfirmModal from '../ConfirmModal';
import { formatDateDisplay } from '../../utils/dateUtils';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'fa-pencil' },
  published: { label: 'Published', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'fa-eye' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'fa-play' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'fa-flag-checkered' },
};

const EMPTY_SCHEDULE = { name: '', description: '', start_date: '', end_date: '', status: 'draft' };
const EMPTY_SESSION = { name: '', start_time: '', end_time: '', session_order: 1 };

const ExamScheduleSetup = ({ schedules, sessions, selectedScheduleId, onScheduleSelect, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);
  const [form, setForm] = useState(EMPTY_SCHEDULE);
  const [saving, setSaving] = useState(false);

  // Session form
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION);
  const [savingSession, setSavingSession] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);

  const selectedSchedule = schedules.find((s) => String(s.id) === String(selectedScheduleId));
  const isPublished = selectedSchedule?.status === 'published';

  const selectedSessions = sessions.filter(
    (s) => String(s.schedule_id) === String(selectedScheduleId)
  ).sort((a, b) => a.session_order - b.session_order);

  const handleOpenCreate = () => {
    setEditSchedule(null);
    setForm(EMPTY_SCHEDULE);
    setShowForm(true);
  };

  const handleOpenEdit = (sched) => {
    setEditSchedule(sched);
    setForm({
      name: sched.name,
      description: sched.description || '',
      start_date: sched.start_date,
      end_date: sched.end_date,
      status: sched.status,
    });
    setShowForm(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!form.name || !form.start_date || !form.end_date) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
      };

      if (editSchedule) {
        const { error } = await supabase.from('exam_schedules').update(payload).eq('id', editSchedule.id);
        if (error) throw error;
        showToast('Exam schedule updated', 'success');
      } else {
        const { error } = await supabase.from('exam_schedules').insert(payload);
        if (error) throw error;
        showToast('Exam schedule created', 'success');
      }
      setShowForm(false);
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = (sched) => {
    setConfirmModalData({
      title: 'Delete Schedule',
      message: `Delete "${sched.name}"? All sessions and slots will also be deleted. This action cannot be undone.`,
      confirmText: 'Delete Schedule',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModalData(null);
        try {
          const { error } = await supabase.from('exam_schedules').delete().eq('id', sched.id);
          if (error) throw error;
          showToast('Schedule deleted', 'success');
          if (String(selectedScheduleId) === String(sched.id)) onScheduleSelect(null);
          onRefresh();
        } catch (err) {
          showToast(err.message || 'Delete failed', 'error');
        }
      },
    });
  };

  const handleStatusChange = async (sched, newStatus) => {
    try {
      const { error } = await supabase.from('exam_schedules').update({ status: newStatus }).eq('id', sched.id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleOpenAddSession = () => {
    if (isPublished) {
      showToast('Cannot add sessions to a published schedule', 'error');
      return;
    }
    setEditingSession(null);
    setSessionForm({ ...EMPTY_SESSION, session_order: selectedSessions.length + 1 });
    setShowSessionForm(true);
  };

  const handleOpenEditSession = (sess) => {
    if (isPublished) {
      showToast('Cannot edit sessions of a published schedule', 'error');
      return;
    }
    setEditingSession(sess);
    setSessionForm({
      name: sess.name,
      start_time: sess.start_time ? sess.start_time.slice(0, 5) : '',
      end_time: sess.end_time ? sess.end_time.slice(0, 5) : '',
      session_order: sess.session_order,
    });
    setShowSessionForm(true);
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    if (!selectedScheduleId || !sessionForm.name || !sessionForm.start_time || !sessionForm.end_time) return;
    if (isPublished) {
      showToast('Cannot modify sessions of a published schedule', 'error');
      return;
    }
    setSavingSession(true);
    try {
      const payload = {
        schedule_id: selectedScheduleId,
        name: sessionForm.name.trim(),
        start_time: sessionForm.start_time,
        end_time: sessionForm.end_time,
        session_order: Number(sessionForm.session_order),
      };

      if (editingSession) {
        const { error } = await supabase
          .from('exam_sessions')
          .update({
            name: payload.name,
            start_time: payload.start_time,
            end_time: payload.end_time,
            session_order: payload.session_order,
          })
          .eq('id', editingSession.id);
        if (error) throw error;
        showToast('Session updated', 'success');
      } else {
        const { error } = await supabase.from('exam_sessions').insert(payload);
        if (error) throw error;
        showToast('Session added', 'success');
      }
      setEditingSession(null);
      setSessionForm({ ...EMPTY_SESSION, session_order: selectedSessions.length + 2 });
      setShowSessionForm(false);
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to save session', 'error');
    } finally {
      setSavingSession(false);
    }
  };

  const handleDeleteSession = (session) => {
    if (isPublished) {
      showToast('Cannot delete sessions of a published schedule', 'error');
      return;
    }
    setConfirmModalData({
      title: 'Delete Session',
      message: `Delete session "${session.name}"? Any slots assigned to this session will also be deleted.`,
      confirmText: 'Delete Session',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModalData(null);
        try {
          const { error } = await supabase.from('exam_sessions').delete().eq('id', session.id);
          if (error) throw error;
          showToast('Session deleted', 'success');
          onRefresh();
        } catch (err) {
          showToast(err.message || 'Failed to delete session', 'error');
        }
      },
    });
  };

  const fmt = (d) => formatDateDisplay(d, { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Schedules list */}
      <div className="bg-white border border-light-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-light-border bg-slate-50">
          <h3 className="text-sm font-bold text-dark-deepblue">Exam Schedules</h3>
          <button
            onClick={handleOpenCreate}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all"
          >
            <i className="fas fa-plus mr-1.5" />
            New Schedule
          </button>
        </div>

        {schedules.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-calendar-plus text-3xl text-slate-300 mb-3 block" />
            <p className="text-sm font-bold text-dark-deepblue mb-1">No exam schedules yet</p>
            <p className="text-xs text-dark-muted">Create your first exam schedule to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-light-border">
            {schedules.map((sched) => {
              const cfg = STATUS_CONFIG[sched.status] || STATUS_CONFIG.draft;
              const isSelected = String(selectedScheduleId) === String(sched.id);
              const schedSessions = sessions.filter((s) => String(s.schedule_id) === String(sched.id));

              return (
                <div
                  key={sched.id}
                  onClick={() => onScheduleSelect(sched.id)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 cursor-pointer transition-all ${
                    isSelected ? 'bg-rose-50 border-l-4 border-rose-500' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Icon & Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-rose-100' : 'bg-slate-100'
                    }`}>
                      <i className={`fas fa-file-circle-check text-sm ${isSelected ? 'text-rose-600' : 'text-slate-500'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isSelected ? 'text-rose-700' : 'text-dark-deepblue'}`}>
                        {sched.name}
                      </p>
                      <p className="text-xs text-dark-muted">
                        {fmt(sched.start_date)} → {fmt(sched.end_date)}
                        <span className="mx-1.5 opacity-40">·</span>
                        {schedSessions.length} session{schedSessions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Status badge & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-100 sm:border-0 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.color}`}>
                      <i className={`fas ${cfg.icon} mr-1`} />
                      {cfg.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={sched.status}
                        onChange={(e) => handleStatusChange(sched, e.target.value)}
                        className="text-[10px] px-1.5 py-1 border border-light-border rounded-lg bg-white outline-none cursor-pointer"
                      >
                        {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                          <option key={v} value={v}>{c.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleOpenEdit(sched)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                        title="Edit schedule"
                      >
                        <i className="fas fa-edit text-[11px]" />
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(sched)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                        title="Delete schedule"
                      >
                        <i className="fas fa-trash-alt text-[11px]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sessions for selected schedule */}
      {selectedScheduleId && (
        <div className="bg-white border border-light-border rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-light-border bg-slate-50">
            <h3 className="text-sm font-bold text-dark-deepblue">
              Exam Sessions
              <span className="ml-2 text-xs font-normal text-dark-muted hidden sm:inline">
                (Time slots within this exam)
              </span>
            </h3>
            {!isPublished ? (
              <button
                type="button"
                onClick={handleOpenAddSession}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-700 text-white hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
              >
                <i className="fas fa-plus text-[10px]" />
                Add Session
              </button>
            ) : (
              <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl flex items-center gap-1 self-start sm:self-auto">
                <i className="fas fa-lock text-[10px]" /> Published (Read-Only)
              </span>
            )}
          </div>

          {selectedSessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-dark-muted">
              <i className="fas fa-clock text-2xl mb-2 block opacity-30" />
              No sessions defined. Add at least one (e.g., Morning, Afternoon).
            </div>
          ) : (
            <div className="divide-y divide-light-border">
              {selectedSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 sm:px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <i className="fas fa-clock text-amber-600 text-xs" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-dark-deepblue">{sess.name}</p>
                      <p className="text-[11px] text-dark-muted">
                        {sess.start_time?.slice(0, 5)} – {sess.end_time?.slice(0, 5)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0">
                    <span className="text-[10px] text-dark-muted px-2 py-0.5 bg-slate-100 rounded-full shrink-0">
                      #{sess.session_order}
                    </span>

                    {isPublished ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg flex items-center gap-1">
                        <i className="fas fa-lock text-[9px]" /> Locked
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSession(sess)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                          title="Edit session"
                        >
                          <i className="fas fa-pencil text-[11px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(sess)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                          title="Delete session"
                        >
                          <i className="fas fa-trash-alt text-[11px]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit session inline form */}
          {showSessionForm && !isPublished && (
            <form onSubmit={handleSaveSession} className="p-4 border-t border-light-border bg-amber-50/30 flex flex-wrap gap-3 items-end">
              <div className="w-full pb-1 border-b border-amber-200/60 mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">
                  <i className={`fas ${editingSession ? 'fa-pen' : 'fa-plus'} mr-1.5 text-amber-600`} />
                  {editingSession ? `Edit Session: ${editingSession.name}` : 'New Exam Session'}
                </span>
                {editingSession && (
                  <span className="text-[10px] text-amber-700 font-medium">
                    (Schedule must not be published to modify)
                  </span>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dark-slate mb-1">Session Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Morning"
                  value={sessionForm.name}
                  onChange={(e) => setSessionForm((p) => ({ ...p, name: e.target.value }))}
                  className="px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-amber-300"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dark-slate mb-1">Start Time *</label>
                <input
                  type="time"
                  value={sessionForm.start_time}
                  onChange={(e) => setSessionForm((p) => ({ ...p, start_time: e.target.value }))}
                  className="px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-amber-300"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dark-slate mb-1">End Time *</label>
                <input
                  type="time"
                  value={sessionForm.end_time}
                  onChange={(e) => setSessionForm((p) => ({ ...p, end_time: e.target.value }))}
                  className="px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-amber-300"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dark-slate mb-1">Order</label>
                <input
                  type="number"
                  min="1"
                  value={sessionForm.session_order}
                  onChange={(e) => setSessionForm((p) => ({ ...p, session_order: e.target.value }))}
                  className="w-16 px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-amber-300"
                />
              </div>
              <button
                type="submit"
                disabled={savingSession}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {savingSession ? <i className="fas fa-spinner fa-spin mr-1.5" /> : null}
                {editingSession ? 'Update Session' : 'Save Session'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSessionForm(false);
                  setEditingSession(null);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-light-border text-dark-muted hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      )}

      {/* Create / Edit Schedule Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg my-auto overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-light-border shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-dark-deepblue">
                {editSchedule ? 'Edit Exam Schedule' : 'Create Exam Schedule'}
              </h3>
            </div>
            <form onSubmit={handleSaveSchedule} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1.5">Schedule Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Quarterly Exam — October 2026"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm border border-light-border rounded-xl focus:ring-2 focus:ring-rose-300 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1.5">Description</label>
                <textarea
                  placeholder="Optional notes about this exam..."
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm border border-light-border rounded-xl focus:ring-2 focus:ring-rose-300 resize-none outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm border border-light-border rounded-xl focus:ring-2 focus:ring-rose-300 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1.5">End Date *</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm border border-light-border rounded-xl focus:ring-2 focus:ring-rose-300 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm border border-light-border rounded-xl focus:ring-2 focus:ring-rose-300 bg-white outline-none cursor-pointer"
                >
                  {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                    <option key={v} value={v}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all disabled:opacity-60 cursor-pointer shadow-xs"
                >
                  {saving ? <i className="fas fa-spinner fa-spin mr-2" /> : null}
                  {editSchedule ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModalData && (
        <ConfirmModal
          isOpen={!!confirmModalData}
          title={confirmModalData.title}
          message={confirmModalData.message}
          type={confirmModalData.type || 'danger'}
          confirmText={confirmModalData.confirmText || 'Confirm'}
          cancelText={confirmModalData.cancelText || 'Cancel'}
          onConfirm={confirmModalData.onConfirm}
          onCancel={() => setConfirmModalData(null)}
        />
      )}
    </div>
  );
};

export default ExamScheduleSetup;
