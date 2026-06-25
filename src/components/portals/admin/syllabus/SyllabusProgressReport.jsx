import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';

const SyllabusProgressReport = () => {
  const [loading, setLoading] = useState(true);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [books, setBooks] = useState([]);
  const [syllabusData, setSyllabusData] = useState([]);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');

  const [progressList, setProgressList] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);

  useEffect(() => {
    const fetchBase = async () => {
      setLoading(true);
      try {
        const [
          { data: dbClasses },
          { data: dbSubjects },
          { data: dbBooks },
          { data: dbSyllabusData }
        ] = await Promise.all([
          supabase.from('classes').select('*'),
          supabase.from('subjects').select('*'),
          supabase.from('syllabus_books').select('*'),
          supabase.from('syllabus_book_lessons').select('*')
        ]);

        setClasses(dbClasses || []);
        setSubjects(dbSubjects || []);
        setBooks(dbBooks || []);
        setSyllabusData(dbSyllabusData || []);

        if (dbClasses && dbClasses.length > 0) setSelectedClassId(String(dbClasses[0].id));
        if (dbSubjects && dbSubjects.length > 0) setSelectedSubjectId(String(dbSubjects[0].id));
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchBase();
  }, []);

  const filteredBooks = books.filter(b => String(b.subject_id) === String(selectedSubjectId));

  useEffect(() => {
    if (filteredBooks.length > 0) setSelectedBookId(String(filteredBooks[0].id));
    else setSelectedBookId('');
  }, [selectedSubjectId]);

  const fetchReportData = async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    try {
      const [
        { data: progressData },
        { data: logsData }
      ] = await Promise.all([
        supabase.from('syllabus_node_progress').select('*').eq('class_id', selectedClassId),
        supabase
          .from('syllabus_tracker_logs')
          .select(`id, date, teacher:teachers(name), syllabus_tracker_log_items (id, item_type, item_id, adhoc_name, status)`)
          .eq('class_id', selectedClassId)
          .eq('subject_id', selectedSubjectId)
          .order('date', { ascending: false })
      ]);
      setProgressList(progressData || []);
      setHistoryLogs(logsData || []);
    } catch (err) {}
  };

  useEffect(() => { fetchReportData(); }, [selectedClassId, selectedSubjectId]);

  const getNodeProgress = (id) => progressList.find(p => p.item_type === 'node' && String(p.item_id) === String(id));

  const activeBook = filteredBooks.find(b => String(b.id) === String(selectedBookId));
  const bookData = syllabusData.filter(d => String(d.book_id) === String(selectedBookId));

  const renderTree = () => {
    if (!activeBook) return <div className="p-8 text-center bg-white rounded-xl shadow-sm text-gray-500">No books found for this subject.</div>;

    const completedNodes = bookData.filter(n => getNodeProgress(n.id)?.status === 'completed');
    const totalNodes = bookData.length;
    const pct = totalNodes === 0 ? 0 : Math.round((completedNodes.length / totalNodes) * 100);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-light-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{activeBook.name}</h2>
            <p className="text-sm text-gray-500">Overall Progress</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-brand-primary">{pct}%</span>
            <p className="text-xs font-bold text-gray-400">{completedNodes.length} / {totalNodes} Completed</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-light-border overflow-hidden">
          <div className="p-4 border-b bg-gray-50"><h3 className="font-bold">Syllabus Details</h3></div>
          <div className="p-4 space-y-3">
            {bookData.map(node => {
              const progress = getNodeProgress(node.id);
              const status = progress?.status || 'not_started';
              const title = [node.level1, node.level2, node.level3].filter(Boolean).join(' > ');
              
              let statusBadge = <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs font-bold">Not Started</span>;
              if (status === 'completed') statusBadge = <span className="text-emerald-700 bg-emerald-100 px-2 py-1 rounded text-xs font-bold">Completed</span>;
              else if (status === 'in_progress') statusBadge = <span className="text-blue-700 bg-blue-100 px-2 py-1 rounded text-xs font-bold">In Progress</span>;

              return (
                <div key={node.id} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50">
                  <div>
                    <span className="font-semibold text-sm">{title}</span>
                    {progress?.completed_at && <p className="text-xs text-emerald-600 mt-1">Completed on {new Date(progress.completed_at).toLocaleDateString()}</p>}
                  </div>
                  <div>{statusBadge}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center">Loading Progress Report...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-light-bg font-sans p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-6">Class Progress Report</h1>
        <div className="flex gap-4">
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="border p-2 rounded-xl bg-white min-w-[200px]">
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
          <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="border p-2 rounded-xl bg-white min-w-[200px]">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)} className="border p-2 rounded-xl bg-white min-w-[200px]">
            {filteredBooks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          {renderTree()}
        </div>
        <div className="col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-light-border">
            <h3 className="font-bold border-b pb-2 mb-4">Activity Logs</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {historyLogs.length === 0 ? <p className="text-xs text-gray-500">No activity logged.</p> : historyLogs.map(log => (
                <div key={log.id} className="border-l-2 border-brand-primary pl-3">
                  <p className="text-xs font-bold text-gray-500 mb-1">{new Date(log.date).toLocaleDateString()} - {log.teacher?.name || 'Teacher'}</p>
                  {log.syllabus_tracker_log_items.map(item => (
                    <div key={item.id} className="text-sm bg-gray-50 p-2 rounded mb-1">
                      {item.item_type === 'adhoc' ? item.adhoc_name : syllabusData.find(d => String(d.id) === String(item.item_id))?.level3 || 'Unknown Node'}
                      <span className="ml-2 font-bold text-[10px] text-brand-primary">[{item.status}]</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SyllabusProgressReport;
