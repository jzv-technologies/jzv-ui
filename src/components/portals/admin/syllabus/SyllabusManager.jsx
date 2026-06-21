// src/components/portals/admin/syllabus/SyllabusManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';
import ClassificationsModal from '../timetable/ClassificationsModal';
import ConfirmModal from '../../../ConfirmModal';

// Safe ID generator for offline/local storage usage
const generateLocalId = () => 'local-' + Math.random().toString(36).substr(2, 9);

const SyllabusManager = ({ role }) => {
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  const [activeSubjectId, setActiveSubjectId] = useState('');
  const [collapsedClassifications, setCollapsedClassifications] = useState({});
  const [isClassificationsModalOpen, setIsClassificationsModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  
  // Data lists
  const [classifications, setClassifications] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [books, setBooks] = useState([]);
  const [units, setUnits] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);

  // Tree collapse states
  const [collapsedNodes, setCollapsedNodes] = useState({}); // key: 'book-id' or 'unit-id' or 'chapter-id'

  // DB vs Offline State
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modal State
  const [modal, setModal] = useState(null); // { type: 'add'|'edit', level: 'subject'|'book'|'unit'|'chapter'|'lesson', parentId?, node? }

  // Load Data
  const loadData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // 1. Try to fetch from Supabase
      const [
        { data: dbClassifications },
        { data: dbSubjects },
        { data: dbBooks },
        { data: dbUnits },
        { data: dbChapters },
        { data: dbLessons },
      ] = await Promise.all([
        supabase.from('subject_classifications').select('*').order('name', { ascending: true }),
        supabase.from('subjects').select('*'),
        supabase.from('syllabus_books').select('*'),
        supabase.from('syllabus_units').select('*'),
        supabase.from('syllabus_chapters').select('*'),
        supabase.from('syllabus_lessons').select('*'),
      ]);

      setClassifications(dbClassifications || []);
      setSubjects(dbSubjects || []);
      setBooks(dbBooks || []);
      setUnits(dbUnits || []);
      setChapters(dbChapters || []);
      setLessons(dbLessons || []);
      setIsSupabaseMode(true);

      if (dbSubjects && dbSubjects.length > 0) {
        setActiveSubjectId(dbSubjects[0].id);
      }
    } catch (err) {
      console.warn('Syllabus DB tables not found, falling back to LocalStorage:', err.message);
      setIsSupabaseMode(false);
      loadLocalData();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalData = () => {
    const raw = localStorage.getItem('jzv_syllabus_data');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setClassifications(parsed.classifications || []);
        setSubjects(parsed.subjects || []);
        setBooks(parsed.books || []);
        setUnits(parsed.units || []);
        setChapters(parsed.chapters || []);
        setLessons(parsed.lessons || []);
        
        if (parsed.subjects && parsed.subjects.length > 0) {
          setActiveSubjectId(parsed.subjects[0].id);
        }
      } catch (e) {
        console.error('Failed to parse local syllabus data', e);
        initializeMockData();
      }
    } else {
      initializeMockData();
    }
  };

  const initializeMockData = () => {
    const mockClassifications = [
      { id: 'cls-1', name: 'Modern Education' },
      { id: 'cls-2', name: 'English Literacy' }
    ];
    const mockSubjects = [
      { id: 'sub-1', name: 'Mathematics', classification_id: 'cls-1' },
      { id: 'sub-2', name: 'Science', classification_id: 'cls-1' },
    ];
    const mockBooks = [
      { id: 'book-1', subject_id: 'sub-1', name: 'Grade 10 Algebra' },
      { id: 'book-2', subject_id: 'sub-2', name: 'Biology Part I' },
    ];
    const mockUnits = [
      { id: 'unit-1', book_id: 'book-1', name: 'Unit 1: Quadratic Equations' },
      { id: 'unit-2', book_id: 'book-2', name: 'Unit 2: Cell Structure' },
    ];
    const mockChapters = [
      { id: 'chap-1', unit_id: 'unit-1', name: 'Chapter 1: Factoring' },
      { id: 'chap-2', unit_id: 'unit-2', name: 'Chapter 3: Cell Wall' },
    ];
    const mockLessons = [
      { id: 'less-1', chapter_id: 'chap-1', name: 'Factoring Trinomials', page_count: 12, complexity: 'Moderate' },
      { id: 'less-2', chapter_id: 'chap-1', name: 'Quadratic Formula Method', page_count: 15, complexity: 'Complex' },
      { id: 'less-3', chapter_id: 'chap-2', name: 'Cell Wall Components', page_count: 8, complexity: 'Easy' },
    ];

    setClassifications(mockClassifications);
    setSubjects(mockSubjects);
    setBooks(mockBooks);
    setUnits(mockUnits);
    setChapters(mockChapters);
    setLessons(mockLessons);
    setActiveSubjectId(mockSubjects[0].id);

    saveState({
      classifications: mockClassifications,
      subjects: mockSubjects,
      books: mockBooks,
      units: mockUnits,
      chapters: mockChapters,
      lessons: mockLessons,
    });
  };

  const saveState = (updates) => {
    const nextClassifications = updates.classifications !== undefined ? updates.classifications : classifications;
    const nextSubjects = updates.subjects !== undefined ? updates.subjects : subjects;
    const nextBooks = updates.books !== undefined ? updates.books : books;
    const nextUnits = updates.units !== undefined ? updates.units : units;
    const nextChapters = updates.chapters !== undefined ? updates.chapters : chapters;
    const nextLessons = updates.lessons !== undefined ? updates.lessons : lessons;

    // Redundant Offline Backup Copy
    const offlineState = {
      classifications: nextClassifications,
      subjects: nextSubjects,
      books: nextBooks,
      units: nextUnits,
      chapters: nextChapters,
      lessons: nextLessons,
    };
    localStorage.setItem('jzv_syllabus_data', JSON.stringify(offlineState));

    if (updates.classifications !== undefined) setClassifications(updates.classifications);
    if (updates.subjects !== undefined) setSubjects(updates.subjects);
    if (updates.books !== undefined) setBooks(updates.books);
    if (updates.units !== undefined) setUnits(updates.units);
    if (updates.chapters !== undefined) setChapters(updates.chapters);
    if (updates.lessons !== undefined) setLessons(updates.lessons);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-expand classification containing selected subject
  useEffect(() => {
    if (activeSubjectId && subjects.length > 0) {
      const activeSub = subjects.find(s => String(s.id) === String(activeSubjectId));
      if (activeSub) {
        const activeCls = classifications.find(c => String(c.id) === String(activeSub.classification_id));
        const clsName = activeCls ? activeCls.name : 'Unclassified';
        setCollapsedClassifications(prev => ({
          ...prev,
          [clsName]: false // false means expanded
        }));
      }
    }
  }, [activeSubjectId, subjects, classifications]);

  // Collapsible toggle helper
  const toggleCollapse = (id) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Node CRUD Action Handlers
  const handleSaveNode = async (formData) => {
    const { level, type, name, classificationId, pageCount, complexity, parentId, node } = formData;
    setLoading(true);

    try {
      if (type === 'add') {
        const newId = generateLocalId();
        let payload = { name };

        if (level === 'subject') {
          let updatedList = [...subjects, { id: newId, name, classification_id: classificationId }];
          if (isSupabaseMode) {
            const { data, error } = await supabase.from('subjects').insert([{ name, classification_id: classificationId }]).select();
            if (error) throw error;
            updatedList = [...subjects, data[0]];
            setActiveSubjectId(data[0].id);
          } else {
            setActiveSubjectId(newId);
          }
          saveState({ subjects: updatedList });
        } else if (level === 'book') {
          payload.subject_id = parentId;
          let updatedList = [...books, { id: newId, subject_id: parentId, name }];
          if (isSupabaseMode) {
            const { data, error } = await supabase.from('syllabus_books').insert([payload]).select();
            if (error) throw error;
            updatedList = [...books, data[0]];
          }
          saveState({ books: updatedList });
        } else if (level === 'unit') {
          payload.book_id = parentId;
          let updatedList = [...units, { id: newId, book_id: parentId, name }];
          if (isSupabaseMode) {
            const { data, error } = await supabase.from('syllabus_units').insert([payload]).select();
            if (error) throw error;
            updatedList = [...units, data[0]];
          }
          saveState({ units: updatedList });
        } else if (level === 'chapter') {
          payload.unit_id = parentId;
          let updatedList = [...chapters, { id: newId, unit_id: parentId, name }];
          if (isSupabaseMode) {
            const { data, error } = await supabase.from('syllabus_chapters').insert([payload]).select();
            if (error) throw error;
            updatedList = [...chapters, data[0]];
          }
          saveState({ chapters: updatedList });
        } else if (level === 'lesson') {
          payload.chapter_id = parentId;
          payload.page_count = Number(pageCount || 0);
          payload.complexity = complexity;
          let updatedList = [...lessons, { id: newId, chapter_id: parentId, name, page_count: payload.page_count, complexity }];
          if (isSupabaseMode) {
            const { data, error } = await supabase.from('syllabus_lessons').insert([payload]).select();
            if (error) throw error;
            updatedList = [...lessons, data[0]];
          }
          saveState({ lessons: updatedList });
        }
      } else if (type === 'edit') {
        const targetId = node.id;
        const startLocal = String(targetId).startsWith('local-');

        if (level === 'subject') {
          let updatedList = subjects.map(s => String(s.id) === String(targetId) ? { ...s, name, classification_id: classificationId } : s);
          if (isSupabaseMode && !startLocal) {
            const { error } = await supabase.from('subjects').update({ name, classification_id: classificationId }).eq('id', targetId);
            if (error) throw error;
          }
          saveState({ subjects: updatedList });
        } else if (level === 'book') {
          let updatedList = books.map(b => String(b.id) === String(targetId) ? { ...b, name } : b);
          if (isSupabaseMode && !startLocal) {
            const { error } = await supabase.from('syllabus_books').update({ name }).eq('id', targetId);
            if (error) throw error;
          }
          saveState({ books: updatedList });
        } else if (level === 'unit') {
          let updatedList = units.map(u => String(u.id) === String(targetId) ? { ...u, name } : u);
          if (isSupabaseMode && !startLocal) {
            const { error } = await supabase.from('syllabus_units').update({ name }).eq('id', targetId);
            if (error) throw error;
          }
          saveState({ units: updatedList });
        } else if (level === 'chapter') {
          let updatedList = chapters.map(c => String(c.id) === String(targetId) ? { ...c, name } : c);
          if (isSupabaseMode && !startLocal) {
            const { error } = await supabase.from('syllabus_chapters').update({ name }).eq('id', targetId);
            if (error) throw error;
          }
          saveState({ chapters: updatedList });
        } else if (level === 'lesson') {
          const pg = Number(pageCount || 0);
          let updatedList = lessons.map(l => String(l.id) === String(targetId) ? { ...l, name, page_count: pg, complexity } : l);
          if (isSupabaseMode && !startLocal) {
            const { error } = await supabase.from('syllabus_lessons').update({ name, page_count: pg, complexity }).eq('id', targetId);
            if (error) throw error;
          }
          saveState({ lessons: updatedList });
        }
      }
      setModal(null);
      setMessage({ type: 'success', text: `Saved syllabus level successfully.` });
    } catch (err) {
      showToast('Error updating database: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClassifications = async (updatedList, deletedId = null) => {
    if (isSupabaseMode) {
      try {
        if (deletedId && !deletedId.toString().startsWith('local-')) {
          const { error } = await supabase.from('subject_classifications').delete().eq('id', deletedId);
          if (error) throw error;
        }

        const promises = updatedList.map(async (cls) => {
          const isLocal = cls.id.toString().startsWith('local-');
          if (isLocal) {
            const { data, error } = await supabase
              .from('subject_classifications')
              .insert([{ name: cls.name }])
              .select();
            if (error) throw error;
            return data[0];
          } else {
            const { error } = await supabase
              .from('subject_classifications')
              .update({ name: cls.name })
              .eq('id', cls.id);
            if (error) throw error;
            return cls;
          }
        });

        const nextDbList = await Promise.all(promises);
        
        const { data: refetched } = await supabase
          .from('subject_classifications')
          .select('*')
          .order('name', { ascending: true });
        
        const finalClassifications = refetched || nextDbList;
        saveState({ classifications: finalClassifications });

        if (deletedId) {
          const { data: refetchedSubjects } = await supabase.from('subjects').select('*');
          if (refetchedSubjects) {
            saveState({ 
              classifications: finalClassifications,
              subjects: refetchedSubjects 
            });
          }
        }
        return;
      } catch (err) {
        showToast('Database Sync Error: ' + err.message, 'error');
        return;
      }
    }

    let nextSubjects = subjects;
    if (deletedId) {
      nextSubjects = subjects.map(s => String(s.classification_id) === String(deletedId) ? { ...s, classification_id: null } : s);
    }
    saveState({
      classifications: updatedList,
      subjects: nextSubjects
    });
  };

  const handleBulkMapSubjects = async (classificationId, selectedSubjectIds) => {
    if (isSupabaseMode) {
      try {
        if (!classificationId.toString().startsWith('local-')) {
          await supabase
            .from('subjects')
            .update({ classification_id: null })
            .eq('classification_id', classificationId);

          const realSubjectIds = selectedSubjectIds.filter(id => !id.toString().startsWith('local-'));
          if (realSubjectIds.length > 0) {
            const { error } = await supabase
              .from('subjects')
              .update({ classification_id: classificationId })
              .in('id', realSubjectIds);
            if (error) throw error;
          }
        }
        
        const { data: refetchedSubjects } = await supabase.from('subjects').select('*');
        if (refetchedSubjects) {
          saveState({ subjects: refetchedSubjects });
        }
        return;
      } catch (err) {
        showToast('Database Sync Error: ' + err.message, 'error');
        return;
      }
    }

    const nextSubjects = subjects.map(s => {
      const isSelected = selectedSubjectIds.includes(s.id);
      const isCurrentlyMappedToThis = String(s.classification_id) === String(classificationId);

      if (isSelected) {
        return { ...s, classification_id: classificationId };
      } else if (isCurrentlyMappedToThis) {
        return { ...s, classification_id: null };
      }
      return s;
    });

    saveState({ subjects: nextSubjects });
  };

  const handleDeleteNode = (level, id) => {
    const isLocal = String(id).startsWith('local-');

    setConfirmConfig({
      title: `Delete ${level.charAt(0).toUpperCase() + level.slice(1)}`,
      message: `Are you sure you want to delete this ${level}? All child elements will be deleted.`,
      type: "danger",
      confirmText: "Delete",
      onConfirm: async () => {
        setConfirmConfig(null);
        setLoading(true);
        try {
          if (level === 'subject') {
            let updatedList = subjects.filter(s => String(s.id) !== String(id));
            if (isSupabaseMode && !isLocal) {
              const { error } = await supabase.from('subjects').delete().eq('id', id);
              if (error) throw error;
            }
            // Cleanup cascading states
            const nextBooks = books.filter(b => String(b.subject_id) !== String(id));
            const deletedBookIds = books.filter(b => String(b.subject_id) === String(id)).map(b => b.id);
            const nextUnits = units.filter(u => !deletedBookIds.includes(u.book_id));
            const deletedUnitIds = units.filter(u => deletedBookIds.includes(u.book_id)).map(u => u.id);
            const nextChapters = chapters.filter(c => !deletedUnitIds.includes(c.unit_id));
            const deletedChapterIds = chapters.filter(c => deletedUnitIds.includes(c.unit_id)).map(c => c.id);
            const nextLessons = lessons.filter(l => !deletedChapterIds.includes(l.chapter_id));

            saveState({
              subjects: updatedList,
              books: nextBooks,
              units: nextUnits,
              chapters: nextChapters,
              lessons: nextLessons
            });
            if (updatedList.length > 0) {
              setActiveSubjectId(updatedList[0].id);
            } else {
              setActiveSubjectId('');
            }
          } else if (level === 'book') {
            let updatedList = books.filter(b => String(b.id) !== String(id));
            if (isSupabaseMode && !isLocal) {
              const { error } = await supabase.from('syllabus_books').delete().eq('id', id);
              if (error) throw error;
            }
            const nextUnits = units.filter(u => String(u.book_id) !== String(id));
            const deletedUnitIds = units.filter(u => String(u.book_id) === String(id)).map(u => u.id);
            const nextChapters = chapters.filter(c => !deletedUnitIds.includes(c.unit_id));
            const deletedChapterIds = chapters.filter(c => deletedUnitIds.includes(c.unit_id)).map(c => c.id);
            const nextLessons = lessons.filter(l => !deletedChapterIds.includes(l.chapter_id));

            saveState({
              books: updatedList,
              units: nextUnits,
              chapters: nextChapters,
              lessons: nextLessons
            });
          } else if (level === 'unit') {
            let updatedList = units.filter(u => String(u.id) !== String(id));
            if (isSupabaseMode && !isLocal) {
              const { error } = await supabase.from('syllabus_units').delete().eq('id', id);
              if (error) throw error;
            }
            const nextChapters = chapters.filter(c => String(c.unit_id) !== String(id));
            const deletedChapterIds = chapters.filter(c => String(c.unit_id) === String(id)).map(c => c.id);
            const nextLessons = lessons.filter(l => !deletedChapterIds.includes(l.chapter_id));

            saveState({
              units: updatedList,
              chapters: nextChapters,
              lessons: nextLessons
            });
          } else if (level === 'chapter') {
            let updatedList = chapters.filter(c => String(c.id) !== String(id));
            if (isSupabaseMode && !isLocal) {
              const { error } = await supabase.from('syllabus_chapters').delete().eq('id', id);
              if (error) throw error;
            }
            const nextLessons = lessons.filter(l => String(l.chapter_id) !== String(id));

            saveState({
              chapters: updatedList,
              lessons: nextLessons
            });
          } else if (level === 'lesson') {
            let updatedList = lessons.filter(l => String(l.id) !== String(id));
            if (isSupabaseMode && !isLocal) {
              const { error } = await supabase.from('syllabus_lessons').delete().eq('id', id);
              if (error) throw error;
            }
            saveState({ lessons: updatedList });
          }
          setMessage({ type: 'success', text: `Deleted syllabus node successfully.` });
        } catch (err) {
          showToast('Error updating database: ' + err.message, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const currentSubject = subjects.find(s => String(s.id) === String(activeSubjectId));
  const activeBooks = books.filter(b => String(b.subject_id) === String(activeSubjectId));

  return (
    <div className="w-full bg-light-lbg/50 border border-light-border rounded-[2rem] shadow-sm p-6 animate-in fade-in duration-500 min-h-[500px]">
      
      {/* Syllabus Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-light-border mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-dark-primary flex items-center gap-2">
            <i className="fas fa-book-open text-brand-primary"></i>
            Syllabus & Curriculum Manager
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              isSupabaseMode ? 'bg-green-100 text-green-dark' : 'bg-orange-100 text-orange-dark'
            }`}>
              {isSupabaseMode ? 'Live Database' : 'Offline Mode'}
            </span>
          </h2>
          <p className="text-xs text-dark-soft mt-1">
            Manage curriculum nodes. Teachers can add/edit nodes, but can only delete Chapters and Lessons.
          </p>
        </div>

        {/* Global Action Banner */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadData}
            disabled={loading}
            className="text-light-text hover:text-brand-primary transition-all p-2 rounded-lg hover:bg-light-ui"
            title="Refresh Syllabus Data"
          >
            <i className={`fas fa-sync-alt ${loading ? 'animate-spin text-brand-primary' : ''}`}></i>
          </button>
        </div>
      </div>

      {message.text && (
        <div className="mb-6 flex justify-center">
          <div className="px-6 py-2 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100 shadow-sm animate-pulse">
            <i className="fas fa-check-circle mr-2"></i>
            {message.text}
          </div>
        </div>
      )}

      {/* Main Grid: Left side Subject Selector, Right side tree view */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Subjects Grouped by Classification Directory Tree */}
        <div className="w-full lg:w-80 lg:shrink-0 space-y-4">
          <div className="bg-white border border-light-border p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-light-border pb-2.5">
              <span className="text-xs font-bold text-dark-soft uppercase tracking-wider">
                Subjects Classification
              </span>
              <div className="flex gap-1.5">
                {isAdmin && (
                  <button
                    onClick={() => setIsClassificationsModalOpen(true)}
                    className="text-brand-primary hover:text-brand-dark hover:bg-brand-lbg/20 p-1.5 rounded-lg text-xs font-bold transition-all outline-none"
                    title="Manage Classifications"
                  >
                    <i className="fas fa-sliders-h"></i>
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setModal({ type: 'add', level: 'subject' })}
                    className="bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white p-1.5 rounded-lg text-xs font-bold transition-all"
                    title="Add New Subject"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Folder Tree */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {(() => {
                // Initialize groups
                const groups = { Unclassified: [] };
                classifications.forEach(cls => {
                  groups[cls.name] = [];
                });

                subjects.forEach(sub => {
                  const activeCls = classifications.find(c => String(c.id) === String(sub.classification_id));
                  const groupName = activeCls ? activeCls.name : 'Unclassified';
                  if (!groups[groupName]) {
                    groups[groupName] = [];
                  }
                  groups[groupName].push(sub);
                });

                // Filter out empty groups
                const activeGroups = Object.keys(groups).filter(g => groups[g].length > 0);

                if (activeGroups.length === 0) {
                  return (
                    <div className="text-center text-xs italic text-dark-muted py-6">
                      No subjects added yet.
                    </div>
                  );
                }

                return activeGroups.map(groupName => {
                  const groupSubjects = groups[groupName];
                  const isCollapsed = collapsedClassifications[groupName] ?? false;
                  const hasActive = groupSubjects.some(s => String(s.id) === String(activeSubjectId));

                  return (
                    <div key={groupName} className="space-y-1">
                      {/* Classification Folder Header */}
                      <button
                        onClick={() => setCollapsedClassifications(prev => ({ ...prev, [groupName]: !isCollapsed }))}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left transition-all ${
                          hasActive 
                            ? 'bg-brand-lbg/20 text-brand-primary border border-brand-soft/20' 
                            : 'bg-light-lbg/30 text-dark-deepblue hover:bg-light-lbg/60 border border-light-border/40'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <i className={`fas ${isCollapsed ? 'fa-folder' : 'fa-folder-open'} ${
                            hasActive ? 'text-brand-primary' : 'text-orange-primary'
                          }`} />
                          <span className="truncate">{groupName}</span>
                          <span className="text-[9px] text-dark-muted bg-white px-1.5 py-0.2 rounded-full border border-light-border">
                            {groupSubjects.length}
                          </span>
                        </span>
                        <i className={`fas fa-chevron-${isCollapsed ? 'right' : 'down'} text-[9px] text-dark-soft`} />
                      </button>

                      {/* Subjects inside Classification */}
                      {!isCollapsed && (
                        <div className="pl-4 space-y-1 border-l border-light-border border-dashed ml-3">
                          {groupSubjects.map(sub => {
                            const isSelected = String(sub.id) === String(activeSubjectId);
                            return (
                              <div
                                key={sub.id}
                                className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-brand-primary text-white font-bold'
                                    : 'text-dark-soft hover:bg-light-ui hover:text-dark-primary'
                                }`}
                                onClick={() => setActiveSubjectId(sub.id)}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <i className={`fas fa-book-open text-[10px] ${isSelected ? 'text-white' : 'text-brand-primary/60'}`} />
                                  <span className="truncate">{sub.name}</span>
                                </span>

                                {/* Quick inline actions for admin */}
                                {isAdmin && (
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setModal({ type: 'edit', level: 'subject', node: sub });
                                      }}
                                      className={`p-1 rounded hover:bg-light-border transition-colors ${
                                        isSelected ? 'text-white hover:text-dark-primary' : 'text-blue-500'
                                      }`}
                                      title="Rename Subject"
                                    >
                                      <i className="fas fa-edit text-[9px]"></i>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNode('subject', sub.id);
                                      }}
                                      className={`p-1 rounded hover:bg-red-50 transition-colors ${
                                        isSelected ? 'text-white hover:text-red-primary' : 'text-red-primary'
                                      }`}
                                      title="Delete Subject"
                                    >
                                      <i className="fas fa-trash-alt text-[9px]"></i>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Right Side: Hierarchical Tree View */}
        <div className="flex-1">
          {!activeSubjectId ? (
            <div className="bg-white rounded-3xl border border-dashed border-light-border p-12 text-center">
              <i className="fas fa-book-open text-4xl text-light-muted mb-4 block"></i>
              <p className="text-dark-soft text-base font-semibold">No Subject Selected</p>
              <p className="text-dark-muted text-xs mt-1">Please select or add a subject to load the curriculum tree.</p>
            </div>
          ) : (
            <div className="bg-white border border-light-border rounded-3xl p-6 shadow-sm min-h-[400px]">
              
              {/* Header Title with stats */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-light-border">
                <div>
                  <span className="text-[10px] text-dark-muted font-bold uppercase tracking-wider block">Syllabus Tree for</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold text-dark-deepblue">{currentSubject?.name}</span>
                    {(() => {
                      const activeCls = classifications.find(c => String(c.id) === String(currentSubject?.classification_id));
                      return activeCls ? (
                        <span className="bg-orange-50 text-orange-primary border border-orange-200/50 px-2 py-0.5 rounded-full text-[9px] font-bold">
                          {activeCls.name}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => setModal({ type: 'add', level: 'book', parentId: activeSubjectId })}
                  className="bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <i className="fas fa-plus"></i> Add Book
                </button>
              </div>

              {/* Book Nodes */}
              {activeBooks.length === 0 ? (
                <div className="py-16 text-center italic text-dark-muted text-xs">
                  No books added yet. Click "+ Add Book" to begin building the syllabus.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBooks.map((book) => {
                    const isBookCollapsed = collapsedNodes[book.id];
                    const bookUnits = units.filter(u => String(u.book_id) === String(book.id));

                    return (
                      <div key={book.id} className="border border-light-border rounded-2xl overflow-hidden shadow-sm">
                        {/* Book Header Bar */}
                        <div className="bg-light-bg/15 hover:bg-light-bg/30 transition-colors p-4 flex items-center justify-between gap-4">
                          <button
                            onClick={() => toggleCollapse(book.id)}
                            className="flex items-center gap-3 text-left focus:outline-none flex-1 min-w-0"
                          >
                            <i className={`fas fa-chevron-${isBookCollapsed ? 'right' : 'down'} text-[10px] text-dark-soft`} />
                            <i className="fas fa-book text-brand-primary text-sm" />
                            <span className="font-extrabold text-sm text-dark-deepblue truncate">{book.name}</span>
                            <span className="text-[10px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold ml-1">
                              {bookUnits.length} Units
                            </span>
                          </button>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setModal({ type: 'add', level: 'unit', parentId: book.id })}
                              className="p-1.5 rounded-lg text-[10px] font-bold bg-white border border-light-border hover:bg-brand-lbg/10 hover:text-brand-primary hover:border-brand-soft transition-all"
                              title="Add Unit"
                            >
                              <i className="fas fa-plus"></i> Add Unit
                            </button>
                            <button
                              onClick={() => setModal({ type: 'edit', level: 'book', node: book })}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Rename Book"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteNode('book', book.id)}
                                className="p-1.5 text-red-primary hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Book"
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Units Container */}
                        {!isBookCollapsed && (
                          <div className="p-4 bg-white border-t border-light-border space-y-4">
                            {bookUnits.length === 0 ? (
                              <div className="text-[10px] italic text-dark-muted pl-6 py-2">
                                No units added under this book.
                              </div>
                            ) : (
                              bookUnits.map((unit) => {
                                const isUnitCollapsed = collapsedNodes[unit.id];
                                const unitChapters = chapters.filter(c => String(c.unit_id) === String(unit.id));

                                return (
                                  <div key={unit.id} className="border border-dashed border-light-border rounded-xl overflow-hidden pl-2">
                                    {/* Unit Header */}
                                    <div className="bg-light-lbg/10 p-3 flex items-center justify-between gap-4 border-b border-light-border/40 border-dashed">
                                      <button
                                        onClick={() => toggleCollapse(unit.id)}
                                        className="flex items-center gap-3 text-left focus:outline-none flex-1 min-w-0"
                                      >
                                        <i className={`fas fa-chevron-${isUnitCollapsed ? 'right' : 'down'} text-[9px] text-dark-soft`} />
                                        <i className="fas fa-folder-open text-orange-primary text-xs" />
                                        <span className="font-extrabold text-xs text-dark-deepblue truncate">{unit.name}</span>
                                        <span className="text-[9px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold ml-1">
                                          {unitChapters.length} Chapters
                                        </span>
                                      </button>

                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => setModal({ type: 'add', level: 'chapter', parentId: unit.id })}
                                          className="px-2 py-1 rounded-md text-[9px] font-bold bg-white border border-light-border hover:bg-orange-50 hover:text-orange-primary hover:border-orange-200 transition-all"
                                        >
                                          <i className="fas fa-plus"></i> Add Chapter
                                        </button>
                                        <button
                                          onClick={() => setModal({ type: 'edit', level: 'unit', node: unit })}
                                          className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                        >
                                          <i className="fas fa-edit text-xs"></i>
                                        </button>
                                        {isAdmin && (
                                          <button
                                            onClick={() => handleDeleteNode('unit', unit.id)}
                                            className="p-1 text-red-primary hover:bg-red-50 rounded transition-colors"
                                          >
                                            <i className="fas fa-trash-alt text-xs"></i>
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Chapters Container */}
                                    {!isUnitCollapsed && (
                                      <div className="p-3 bg-white space-y-3">
                                        {unitChapters.length === 0 ? (
                                          <div className="text-[10px] italic text-dark-muted pl-6 py-1">
                                            No chapters added under this unit.
                                          </div>
                                        ) : (
                                          unitChapters.map((chap) => {
                                            const isChapCollapsed = collapsedNodes[chap.id];
                                            const chapLessons = lessons.filter(l => String(l.chapter_id) === String(chap.id));

                                            return (
                                              <div key={chap.id} className="border border-light-border/40 rounded-lg overflow-hidden pl-4">
                                                {/* Chapter Header */}
                                                <div className="bg-light-lbg/5 p-2.5 flex items-center justify-between gap-4">
                                                  <button
                                                    onClick={() => toggleCollapse(chap.id)}
                                                    className="flex items-center gap-2.5 text-left focus:outline-none flex-1 min-w-0"
                                                  >
                                                    <i className={`fas fa-chevron-${isChapCollapsed ? 'right' : 'down'} text-[8px] text-dark-soft`} />
                                                    <i className="fas fa-bookmark text-emerald-600 text-[10px]" />
                                                    <span className="font-extrabold text-xs text-dark-primary truncate">{chap.name}</span>
                                                    <span className="text-[9px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold">
                                                      {chapLessons.length} Lessons
                                                    </span>
                                                  </button>

                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      onClick={() => setModal({ type: 'add', level: 'lesson', parentId: chap.id })}
                                                      className="px-2 py-0.5 rounded text-[8px] font-bold bg-white border border-light-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
                                                    >
                                                      <i className="fas fa-plus"></i> Add Lesson
                                                    </button>
                                                    <button
                                                      onClick={() => setModal({ type: 'edit', level: 'chapter', node: chap })}
                                                      className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                    >
                                                      <i className="fas fa-edit text-[10px]"></i>
                                                    </button>
                                                    {/* Chapters can be deleted by both Admin and Teacher */}
                                                    {(isAdmin || isTeacher) && (
                                                      <button
                                                        onClick={() => handleDeleteNode('chapter', chap.id)}
                                                        className="p-1 text-red-primary hover:bg-red-50 rounded transition-colors"
                                                      >
                                                        <i className="fas fa-trash-alt text-[10px]"></i>
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Lessons Container */}
                                                {!isChapCollapsed && (
                                                  <div className="p-2 bg-white space-y-1.5">
                                                    {chapLessons.length === 0 ? (
                                                      <div className="text-[10px] italic text-dark-muted pl-6 py-1">
                                                        No lessons added under this chapter.
                                                      </div>
                                                    ) : (
                                                      chapLessons.map((less) => {
                                                        let compColor = 'bg-green-100 text-green-700 border-green-200';
                                                        if (less.complexity === 'Moderate') {
                                                          compColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                                                        } else if (less.complexity === 'Complex') {
                                                          compColor = 'bg-red-100 text-red-700 border-red-200';
                                                        }

                                                        return (
                                                          <div key={less.id} className="p-2 border border-light-border/30 rounded-md hover:bg-light-lbg/10 transition-colors flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                              <i className="fas fa-file-alt text-dark-soft text-[10px]" />
                                                              <span className="text-xs font-semibold text-dark-primary truncate">{less.name}</span>
                                                              <span className="text-[9px] font-bold text-dark-muted shrink-0">
                                                                <i className="far fa-file-lines mr-1" />
                                                                {less.page_count} pages
                                                              </span>
                                                              <span className={`text-[8px] font-bold px-1.5 py-0.5 border rounded-full shrink-0 ${compColor}`}>
                                                                {less.complexity}
                                                              </span>
                                                            </div>

                                                            <div className="flex items-center gap-0.5 shrink-0">
                                                              <button
                                                                onClick={() => setModal({ type: 'edit', level: 'lesson', node: less })}
                                                                className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                                              >
                                                                <i className="fas fa-edit text-[10px]"></i>
                                                              </button>
                                                              {/* Lessons can be deleted by both Admin and Teacher */}
                                                              {(isAdmin || isTeacher) && (
                                                                <button
                                                                  onClick={() => handleDeleteNode('lesson', less.id)}
                                                                  className="p-1 text-red-primary hover:bg-red-50 rounded"
                                                                >
                                                                  <i className="fas fa-trash-alt text-[10px]"></i>
                                                                </button>
                                                              )}
                                                            </div>
                                                          </div>
                                                        );
                                                      })
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit/Add Node Modal Dialog */}
      {modal && (
        <SyllabusFormModal
          modal={modal}
          classifications={classifications}
          onClose={() => setModal(null)}
          onSave={handleSaveNode}
        />
      )}

      {/* Classifications Manager Modal */}
      <ClassificationsModal
        isOpen={isClassificationsModalOpen}
        onClose={() => setIsClassificationsModalOpen(false)}
        classifications={classifications}
        subjects={subjects}
        onSaveClassifications={handleSaveClassifications}
        onBulkMapSubjects={handleBulkMapSubjects}
      />

      <ConfirmModal
        isOpen={!!confirmConfig}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </div>
  );
};

// Internal Modal Form Component
const SyllabusFormModal = ({ modal, classifications = [], onClose, onSave }) => {
  const { type, level, parentId, node } = modal;
  const isEdit = type === 'edit';

  const [name, setName] = useState(isEdit ? node.name : '');
  const [classificationId, setClassificationId] = useState(isEdit && level === 'subject' ? (node.classification_id || '') : '');
  const [pageCount, setPageCount] = useState(isEdit && level === 'lesson' ? node.page_count : 5);
  const [complexity, setComplexity] = useState(isEdit && level === 'lesson' ? node.complexity : 'Easy');

  const title = `${isEdit ? 'Edit' : 'Add New'} ${level.charAt(0).toUpperCase() + level.slice(1)}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name field cannot be empty.', 'error');
      return;
    }
    onSave({
      level,
      type,
      name: name.trim(),
      classificationId,
      pageCount,
      complexity,
      parentId,
      node,
    });
  };

  return (
    <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-brand-primary p-5 text-white flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <i className={`fas ${isEdit ? 'fa-edit' : 'fa-plus'}`}></i>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-all text-xl outline-none"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Form body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-dark-soft uppercase tracking-wider mb-1.5">
              {level.charAt(0).toUpperCase() + level.slice(1)} Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-light-bg/25 border border-light-border rounded-xl focus:border-brand-primary focus:ring-2 focus:ring-brand-soft outline-none text-sm font-semibold text-dark-primary transition-all"
              placeholder={`Enter ${level} name...`}
            />
          </div>

          {level === 'subject' && (
            <div>
              <label className="block text-xs font-bold text-dark-soft uppercase tracking-wider mb-1.5">
                Classification
              </label>
              <select
                value={classificationId}
                onChange={(e) => setClassificationId(e.target.value)}
                className="w-full px-3 py-2.5 bg-light-bg/25 border border-light-border rounded-xl focus:border-brand-primary focus:ring-2 focus:ring-brand-soft outline-none text-sm font-semibold text-dark-primary transition-all"
              >
                <option value="">No Classification</option>
                {classifications.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Lesson specifics */}
          {level === 'lesson' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-dark-soft uppercase tracking-wider mb-1.5">
                  Page Count
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={pageCount}
                  onChange={(e) => setPageCount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-light-bg/25 border border-light-border rounded-xl focus:border-brand-primary focus:ring-2 focus:ring-brand-soft outline-none text-sm font-semibold text-dark-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-soft uppercase tracking-wider mb-1.5">
                  Complexity
                </label>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value)}
                  className="w-full px-3 py-2.5 bg-light-bg/25 border border-light-border rounded-xl focus:border-brand-primary focus:ring-2 focus:ring-brand-soft outline-none text-sm font-semibold text-dark-primary transition-all"
                >
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Complex">Complex</option>
                </select>
              </div>
            </div>
          )}

          {/* Form Actions footer */}
          <div className="pt-4 flex justify-end gap-3 border-t border-light-border mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-light-ui text-dark-soft hover:bg-light-border px-4 py-2 rounded-xl text-xs font-bold transition-all outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm outline-none"
            >
              Save Level
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SyllabusManager;
