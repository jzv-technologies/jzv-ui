import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';

const SyllabusTracker = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teacher, setTeacher] = useState(null);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [books, setBooks] = useState([]);
  const [syllabusData, setSyllabusData] = useState([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');

  const [progressList, setProgressList] = useState([]);
  const [activeTab, setActiveTab] = useState('curriculum');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

  const [historyLogs, setHistoryLogs] = useState([]);
  const [adhocName, setAdhocName] = useState('');
  const [revisionSelections, setRevisionSelections] = useState({});

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        if (!user || !user.id) throw new Error('User session not found.');
        const { data: teacherData, error: teachErr } = await supabase.from('teachers').select('*').eq('auth_id', user.id).maybeSingle();
        if (teachErr) throw teachErr;
        if (!teacherData) throw new Error('User not mapped to Teacher record.');
        setTeacher(teacherData);

        const [
          { data: dbClasses }, { data: dbSubjects }, { data: dbAssignments }, { data: dbBooks }, { data: dbSyllabusData }
        ] = await Promise.all([
          supabase.from('classes').select('*'),
          supabase.from('subjects').select('*'),
          supabase.from('class_assignments').select('*').eq('teacher_id', teacherData.id),
          supabase.from('syllabus_books').select('*'),
          supabase.from('syllabus_book_lessons').select('*')
        ]);

        setClasses(dbClasses || []);
        setSubjects(dbSubjects || []);
        setAssignments(dbAssignments || []);
        setBooks(dbBooks || []);
        setSyllabusData(dbSyllabusData || []);

        const assignedClassIds = (dbAssignments || []).map(a => String(a.class_id));
        const filteredClasses = (dbClasses || []).filter(c => assignedClassIds.includes(String(c.id)));
        if (filteredClasses.length > 0) setSelectedClassId(String(filteredClasses[0].id));
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [user]);

  const filteredSubjects = subjects.filter(s => assignments.some(a => String(a.class_id) === String(selectedClassId) && String(a.subject_id) === String(s.id)));

  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!filteredSubjects.some(s => String(s.id) === String(selectedSubjectId))) setSelectedSubjectId(String(filteredSubjects[0].id));
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedClassId, assignments]);

  const filteredBooks = books.filter(b => String(b.subject_id) === String(selectedSubjectId));

  useEffect(() => {
    if (filteredBooks.length > 0) setSelectedBookId(String(filteredBooks[0].id));
    else setSelectedBookId('');
  }, [selectedSubjectId]);

  const fetchProgress = async () => {
    if (!selectedClassId) return;
    try {
      const { data, error } = await supabase.from('syllabus_node_progress').select('*').eq('class_id', selectedClassId);
      if (error) throw error;
      setProgressList(data || []);
    } catch (err) {}
  };

  const fetchHistory = async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    try {
      const { data, error } = await supabase
        .from('syllabus_tracker_logs')
        .select(`id, date, syllabus_tracker_log_items (id, item_type, item_id, adhoc_name, status)`)
        .eq('class_id', selectedClassId)
        .eq('subject_id', selectedSubjectId)
        .order('date', { ascending: false });
      if (error) throw error;
      setHistoryLogs(data || []);
    } catch (err) {}
  };

  useEffect(() => {
    if (selectedClassId) fetchProgress();
    if (selectedClassId && selectedSubjectId) fetchHistory();
  }, [selectedClassId, selectedSubjectId]);

  const getNodeProgress = (id) => progressList.find(p => p.item_type === 'node' && String(p.item_id) === String(id));

  const handleStatusUpdate = async (nodeId, newStatus) => {
    setSubmitting(true);
    try {
      const existing = getNodeProgress(nodeId);
      let progressId = existing?.id;
      if (!existing) {
        const { data, error } = await supabase.from('syllabus_node_progress').insert([{
          class_id: selectedClassId,
          item_type: 'node',
          item_id: nodeId,
          status: newStatus,
          revision_count: 0,
          first_worked_at: logDate,
          completed_at: newStatus === 'completed' ? logDate : null
        }]).select();
        if (error) throw error;
        progressId = data[0].id;
      } else {
        const { error } = await supabase.from('syllabus_node_progress').update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? logDate : null,
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
        if (error) throw error;
      }

      const { data: logData, error: logErr } = await supabase.from('syllabus_tracker_logs').insert([{
        date: logDate, class_id: selectedClassId, subject_id: selectedSubjectId, teacher_id: teacher.id
      }]).select();
      if (logErr) throw logErr;

      await supabase.from('syllabus_tracker_log_items').insert([{
        log_id: logData[0].id, item_type: 'node', item_id: nodeId, status: newStatus
      }]);

      showToast('Progress logged!', 'success');
      fetchProgress();
      fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdhocSubmit = async (e) => {
    e.preventDefault();
    if (!adhocName.trim()) return showToast('Description required.', 'warning');
    setSubmitting(true);
    try {
      const { data: logData } = await supabase.from('syllabus_tracker_logs').insert([{
        date: logDate, class_id: selectedClassId, subject_id: selectedSubjectId, teacher_id: teacher.id
      }]).select();
      
      await supabase.from('syllabus_tracker_log_items').insert([{
        log_id: logData[0].id, item_type: 'adhoc', item_id: null, adhoc_name: adhocName.trim(), status: 'completed'
      }]);
      
      showToast('Adhoc activity logged!', 'success');
      setAdhocName('');
      fetchHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Tracker...</div>;
  if (assignments.length === 0) return <div className="p-8 text-center text-red-500">No class assignments found.</div>;

  const activeBook = filteredBooks.find(b => String(b.id) === String(selectedBookId));
  const bookData = syllabusData.filter(d => String(d.book_id) === String(selectedBookId));

  const renderCurriculum = () => {
    if (!activeBook) return <div className="p-4 text-center">No syllabus book selected.</div>;
    return (
      <div className="space-y-4">
        {bookData.map(node => {
          const progress = getNodeProgress(node.id);
          const status = progress?.status || 'not_started';
          const title = [node.level1, node.level2, node.level3].filter(Boolean).join(' > ');

          return (
            <div key={node.id} className="flex justify-between items-center p-3 bg-white border rounded-xl shadow-sm">
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="text-xs text-gray-500">Status: {status}</p>
              </div>
              <div className="flex gap-2">
                {status !== 'completed' && (
                  <>
                    <button onClick={() => handleStatusUpdate(node.id, 'in_progress')} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200">Start</button>
                    <button onClick={() => handleStatusUpdate(node.id, 'completed')} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-200">Complete</button>
                  </>
                )}
                {status === 'completed' && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold"><i className="fas fa-check mr-1"></i> Completed</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-light-bg font-sans">
      <div className="bg-white border-b p-6 shadow-sm">
        <h1 className="text-2xl font-black mb-4">Syllabus Tracker</h1>
        <div className="flex gap-4">
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="border p-2 rounded-lg">
            {classes.filter(c => assignments.some(a => String(a.class_id) === String(c.id))).map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
          <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="border p-2 rounded-lg">
            {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={selectedBookId} onChange={e => setSelectedBookId(e.target.value)} className="border p-2 rounded-lg">
            {filteredBooks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="border p-2 rounded-lg" />
        </div>
      </div>

      <div className="p-6 overflow-y-auto">
        <div className="flex gap-4 border-b mb-6 pb-2">
          {['curriculum', 'adhoc', 'history'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-bold rounded-lg ${activeTab === tab ? 'bg-brand-primary text-white' : 'bg-white text-gray-600'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'curriculum' && renderCurriculum()}

        {activeTab === 'adhoc' && (
          <form onSubmit={handleAdhocSubmit} className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="font-bold mb-4">Log Adhoc Activity</h2>
            <input type="text" value={adhocName} onChange={e => setAdhocName(e.target.value)} placeholder="Activity description..." className="border p-2 w-full rounded-lg mb-4" required />
            <button disabled={submitting} type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-lg font-bold">Submit</button>
          </form>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyLogs.map(log => (
              <div key={log.id} className="bg-white p-4 border rounded-xl">
                <p className="font-bold text-sm text-gray-500 mb-2">{new Date(log.date).toLocaleDateString()}</p>
                {log.syllabus_tracker_log_items.map(item => (
                  <div key={item.id} className="text-sm p-2 border-l-2 border-brand-primary bg-gray-50 mb-2">
                    <span className="font-bold mr-2 uppercase text-[10px] bg-gray-200 px-2 rounded">{item.item_type}</span>
                    {item.item_type === 'adhoc' ? item.adhoc_name : syllabusData.find(d => String(d.id) === String(item.item_id))?.level3 || 'Unknown Node'}
                    <span className="ml-2 text-blue-600">[{item.status}]</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default SyllabusTracker;
