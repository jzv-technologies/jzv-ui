// src/components/portals/admin/syllabus/SyllabusManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';
import ClassificationsModal from '../timetable/ClassificationsModal';
import ConfirmModal from '../../../ConfirmModal';

// Safe ID generator for offline/local storage usage
const generateLocalId = () => 'local-' + Math.random().toString(36).substr(2, 9);

// Calculate rolled-up complexity for a chapter based on its lessons list
const getRolledUpComplexity = (chapLessons) => {
  if (!chapLessons || chapLessons.length === 0) return null;
  const complexities = chapLessons.map(l => l.complexity);
  if (complexities.includes('Complex')) return 'Complex';
  if (complexities.includes('Moderate')) return 'Moderate';
  return 'Easy';
};

const SyllabusManager = ({ role }) => {
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  const [activeSubjectId, setActiveSubjectId] = useState('');
  const [collapsedClassifications, setCollapsedClassifications] = useState({});
  const [isClassificationsModalOpen, setIsClassificationsModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // CSV Import State
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [isCsvMappingOpen, setIsCsvMappingOpen] = useState(false);
  const [importBookId, setImportBookId] = useState(null);
  const fileInputRef = useRef(null);

  const handleCsvClick = (bookId) => {
    setImportBookId(bookId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      processCsvText(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  const processCsvText = (text) => {
    const rawRows = parseCSV(text);
    
    // Filter out completely empty rows
    const cleanRows = rawRows.map(r => r.map(cell => cell.trim())).filter(r => r.some(cell => cell !== ""));
    
    if (cleanRows.length < 2) {
      showToast("CSV must contain a header row and at least one data row.", "error");
      return;
    }

    const headers = cleanRows[0];
    
    // Validate number of columns: must be min 2 and max 5
    if (headers.length < 2 || headers.length > 5) {
      showToast(`Invalid CSV column count (${headers.length}). The file must contain between 2 and 5 columns.`, "error");
      return;
    }

    setCsvHeaders(headers);
    setCsvRows(cleanRows.slice(1));
    setIsCsvMappingOpen(true);
  };

  const handleExecuteCsvImport = async (mappings) => {
    setIsCsvMappingOpen(false);
    setLoading(true);

    const { unitCol, chapterCol, lessonCol, complexityCol, pageCol } = mappings;

    // Map column names to indices
    const unitIdx = unitCol ? csvHeaders.indexOf(unitCol) : -1;
    const chapterIdx = chapterCol ? csvHeaders.indexOf(chapterCol) : -1;
    const lessonIdx = lessonCol ? csvHeaders.indexOf(lessonCol) : -1;
    const complexityIdx = complexityCol ? csvHeaders.indexOf(complexityCol) : -1;
    const pageIdx = pageCol ? csvHeaders.indexOf(pageCol) : -1;

    try {
      const targetBook = books.find(b => String(b.id) === String(importBookId));
      const hierarchy = targetBook?.hierarchy_type || 'Book > Unit > Chapter > Lesson';
      const hasUnits = hierarchy.includes('Unit');
      const hasChapters = hierarchy.includes('Chapter');
      const hasLessons = hierarchy.includes('Lesson');

      // Local lists that we modify as we import, to avoid duplicate DB insertions during the same import
      let currentUnits = [...units];
      let currentChapters = [...chapters];
      let currentLessons = [...lessons];
      
      let rowsImported = 0;

      for (const row of csvRows) {
        const unitName = hasUnits && unitIdx !== -1 ? row[unitIdx] : null;
        const chapterName = hasChapters && chapterIdx !== -1 ? row[chapterIdx] : null;
        const lessonName = hasLessons && lessonIdx !== -1 ? row[lessonIdx] : null;
        
        // Skip rows that don't have mandatory values matching the hierarchy
        if (hasUnits && !unitName) continue;
        if (hasChapters && !chapterName) continue;
        if (hasLessons && !lessonName) continue;

        // 1. Process Unit (if active)
        let unitObj = null;
        if (hasUnits) {
          unitObj = currentUnits.find(
            u => String(u.book_id) === String(importBookId) && u.name.toLowerCase().trim() === unitName.toLowerCase().trim()
          );

          if (!unitObj) {
            const newId = generateLocalId();
            if (isSupabaseMode) {
              const { data, error } = await supabase
                .from('syllabus_units')
                .insert([{ book_id: importBookId, name: unitName }])
                .select();
              if (error) throw error;
              unitObj = data[0];
            } else {
              unitObj = { id: newId, book_id: importBookId, name: unitName };
            }
            currentUnits.push(unitObj);
          }
        }

        // 2. Process Chapter (if active)
        let chapterObj = null;
        if (hasChapters) {
          chapterObj = currentChapters.find(c => {
            if (hasUnits) {
              return String(c.unit_id) === String(unitObj.id) && c.name.toLowerCase().trim() === chapterName.toLowerCase().trim();
            } else {
              return String(c.book_id) === String(importBookId) && c.name.toLowerCase().trim() === chapterName.toLowerCase().trim();
            }
          });

          if (!chapterObj) {
            const newId = generateLocalId();
            if (isSupabaseMode) {
              const insertData = hasUnits
                ? { unit_id: unitObj.id, book_id: null, name: chapterName }
                : { book_id: importBookId, unit_id: null, name: chapterName };
              const { data, error } = await supabase
                .from('syllabus_chapters')
                .insert([insertData])
                .select();
              if (error) throw error;
              chapterObj = data[0];
            } else {
              chapterObj = hasUnits
                ? { id: newId, unit_id: unitObj.id, book_id: null, name: chapterName }
                : { id: newId, book_id: importBookId, unit_id: null, name: chapterName };
            }
            currentChapters.push(chapterObj);
          }
        }

        // 3. Process Lesson (if active)
        if (hasLessons) {
          let lessonObj = currentLessons.find(l => {
            if (hasChapters) {
              return String(l.chapter_id) === String(chapterObj.id) && l.name.toLowerCase().trim() === lessonName.toLowerCase().trim();
            } else {
              return String(l.unit_id) === String(unitObj.id) && l.name.toLowerCase().trim() === lessonName.toLowerCase().trim();
            }
          });

          const pageVal = pageIdx !== -1 ? parseInt(row[pageIdx]) || 0 : 0;
          let complexityVal = complexityIdx !== -1 ? row[complexityIdx] : 'Easy';
          // Normalize complexity
          if (complexityVal) {
            complexityVal = complexityVal.charAt(0).toUpperCase() + complexityVal.slice(1).toLowerCase();
            if (!['Easy', 'Moderate', 'Complex'].includes(complexityVal)) {
              complexityVal = 'Easy';
            }
          } else {
            complexityVal = 'Easy';
          }

          if (!lessonObj) {
            const newId = generateLocalId();
            if (isSupabaseMode) {
              const insertData = hasChapters
                ? { chapter_id: chapterObj.id, unit_id: null, name: lessonName, page_count: pageVal, complexity: complexityVal }
                : { unit_id: unitObj.id, chapter_id: null, name: lessonName, page_count: pageVal, complexity: complexityVal };
              const { data, error } = await supabase
                .from('syllabus_lessons')
                .insert([insertData])
                .select();
              if (error) throw error;
              lessonObj = data[0];
            } else {
              lessonObj = hasChapters
                ? { id: newId, chapter_id: chapterObj.id, unit_id: null, name: lessonName, page_count: pageVal, complexity: complexityVal }
                : { id: newId, unit_id: unitObj.id, chapter_id: null, name: lessonName, page_count: pageVal, complexity: complexityVal };
            }
            currentLessons.push(lessonObj);
          } else {
            // Update Lesson optional fields if provided
            if (isSupabaseMode) {
              const updates = {};
              let needsUpdate = false;
              if (pageIdx !== -1 && lessonObj.page_count !== pageVal) {
                updates.page_count = pageVal;
                needsUpdate = true;
              }
              if (complexityIdx !== -1 && lessonObj.complexity !== complexityVal) {
                updates.complexity = complexityVal;
                needsUpdate = true;
              }
              if (needsUpdate) {
                const { error } = await supabase
                  .from('syllabus_lessons')
                  .update(updates)
                  .eq('id', lessonObj.id);
                if (error) throw error;
                lessonObj.page_count = pageVal;
                lessonObj.complexity = complexityVal;
              }
            } else {
              if (pageIdx !== -1) lessonObj.page_count = pageVal;
              if (complexityIdx !== -1) lessonObj.complexity = complexityVal;
            }
          }
        }
        
        rowsImported++;
      }

      // Save state to sync component
      saveState({
        units: currentUnits,
        chapters: currentChapters,
        lessons: currentLessons
      });

      // Fetch fresh data if live database is connected
      if (isSupabaseMode) {
        await loadData();
      }

      showToast(`Successfully processed CSV. Imported/Consumed ${rowsImported} rows of curriculum!`, "success");
    } catch (err) {
      showToast("CSV Import Error: " + err.message, "error");
    } finally {
      setLoading(false);
      setImportBookId(null);
    }
  };
  
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

  // Modal State
  const [modal, setModal] = useState(null); // { type: 'add'|'edit', level: 'subject'|'book'|'unit'|'chapter'|'lesson', parentId?, node? }

  // Load Data
  const loadData = async () => {
    setLoading(true);
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
      { id: 'book-1', subject_id: 'sub-1', name: 'Grade 10 Algebra', hierarchy_type: 'Book > Unit > Chapter > Lesson' },
      { id: 'book-2', subject_id: 'sub-2', name: 'Biology Part I', hierarchy_type: 'Book > Unit > Chapter > Lesson' },
    ];
    const mockUnits = [
      { id: 'unit-1', book_id: 'book-1', name: 'Unit 1: Quadratic Equations' },
      { id: 'unit-2', book_id: 'book-2', name: 'Unit 2: Cell Structure' },
    ];
    const mockChapters = [
      { id: 'chap-1', unit_id: 'unit-1', book_id: null, name: 'Chapter 1: Factoring' },
      { id: 'chap-2', unit_id: 'unit-2', book_id: null, name: 'Chapter 3: Cell Wall' },
    ];
    const mockLessons = [
      { id: 'less-1', chapter_id: 'chap-1', unit_id: null, name: 'Factoring Trinomials', page_count: 12, complexity: 'Moderate' },
      { id: 'less-2', chapter_id: 'chap-1', unit_id: null, name: 'Quadratic Formula Method', page_count: 15, complexity: 'Complex' },
      { id: 'less-3', chapter_id: 'chap-2', unit_id: null, name: 'Cell Wall Components', page_count: 8, complexity: 'Easy' },
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
    const { level, type, name, classificationId, pageCount, complexity, parentId, node, unitsList, chaptersList, lessonsList, hierarchyType } = formData;
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
          payload.hierarchy_type = hierarchyType || 'Book > Unit > Chapter > Lesson';
          let updatedList = [...books, { id: newId, subject_id: parentId, name, hierarchy_type: payload.hierarchy_type }];
          if (isSupabaseMode) {
            const { data, error } = await supabase.from('syllabus_books').insert([payload]).select();
            if (error) throw error;
            updatedList = [...books, data[0]];
          }
          saveState({ books: updatedList });
        } else if (level === 'unit') {
          let currentUnits = [...units];
          let currentChapters = [...chapters];
          let currentLessons = [...lessons];

          for (const unit of unitsList) {
            if (!unit.name.trim()) continue;

            // Check if Unit already exists under this Book
            let unitObj = currentUnits.find(
              u => String(u.book_id) === String(parentId) && u.name.toLowerCase().trim() === unit.name.toLowerCase().trim()
            );

            if (!unitObj) {
              const newId = generateLocalId();
              if (isSupabaseMode) {
                const { data, error } = await supabase
                  .from('syllabus_units')
                  .insert([{ book_id: parentId, name: unit.name.trim() }])
                  .select();
                if (error) throw error;
                unitObj = data[0];
              } else {
                unitObj = { id: newId, book_id: parentId, name: unit.name.trim() };
              }
              currentUnits.push(unitObj);
            }

            // Process Chapters under this Unit if they exist
            if (unit.chapters && unit.chapters.length > 0) {
              for (const chap of unit.chapters) {
                if (!chap.name.trim()) continue;

                let chapterObj = currentChapters.find(
                  c => String(c.unit_id) === String(unitObj.id) && c.name.toLowerCase().trim() === chap.name.toLowerCase().trim()
                );

                if (!chapterObj) {
                  const newId = generateLocalId();
                  if (isSupabaseMode) {
                    const { data, error } = await supabase
                      .from('syllabus_chapters')
                      .insert([{ unit_id: unitObj.id, book_id: null, name: chap.name.trim() }])
                      .select();
                    if (error) throw error;
                    chapterObj = data[0];
                  } else {
                    chapterObj = { id: newId, unit_id: unitObj.id, book_id: null, name: chap.name.trim() };
                  }
                  currentChapters.push(chapterObj);
                }

                // Process Lessons under this Chapter if they exist
                if (chap.lessons && chap.lessons.length > 0) {
                  for (const less of chap.lessons) {
                    if (!less.name || !less.name.trim()) continue;
                    let lessonObj = currentLessons.find(
                      l => String(l.chapter_id) === String(chapterObj.id) && (l.name || '').toLowerCase().trim() === (less.name || '').toLowerCase().trim()
                    );

                    const pageVal = Number(less.pageCount || 0);
                    let complexityVal = less.complexity || 'Easy';
                    if (complexityVal) {
                      complexityVal = complexityVal.charAt(0).toUpperCase() + complexityVal.slice(1).toLowerCase();
                      if (!['Easy', 'Moderate', 'Complex'].includes(complexityVal)) {
                        complexityVal = 'Easy';
                      }
                    } else {
                      complexityVal = 'Easy';
                    }

                    if (!lessonObj) {
                      const newId = generateLocalId();
                      if (isSupabaseMode) {
                        const { data, error } = await supabase
                          .from('syllabus_lessons')
                          .insert([{
                            chapter_id: chapterObj.id,
                            unit_id: null,
                            name: less.name.trim(),
                            page_count: pageVal,
                            complexity: complexityVal
                          }])
                          .select();
                        if (error) throw error;
                        lessonObj = data[0];
                      } else {
                        lessonObj = {
                          id: newId,
                          chapter_id: chapterObj.id,
                          unit_id: null,
                          name: less.name.trim(),
                          page_count: pageVal,
                          complexity: complexityVal
                        };
                      }
                      currentLessons.push(lessonObj);
                    } else {
                      if (isSupabaseMode) {
                        const updates = {};
                        let needsUpdate = false;
                        if (lessonObj.page_count !== pageVal) {
                          updates.page_count = pageVal;
                          needsUpdate = true;
                        }
                        if (lessonObj.complexity !== complexityVal) {
                          updates.complexity = complexityVal;
                          needsUpdate = true;
                        }
                        if (needsUpdate) {
                          const { error } = await supabase
                            .from('syllabus_lessons')
                            .update(updates)
                            .eq('id', lessonObj.id);
                          if (error) throw error;
                          lessonObj.page_count = pageVal;
                          lessonObj.complexity = complexityVal;
                        }
                      } else {
                        lessonObj.page_count = pageVal;
                        lessonObj.complexity = complexityVal;
                      }
                    }
                  }
                }
              }
            }

            // Process Lessons directly under this Unit (hierarchy: Book > Unit > Lesson)
            if (unit.lessons && unit.lessons.length > 0) {
              for (const less of unit.lessons) {
                if (!less.name || !less.name.trim()) continue;
                let lessonObj = currentLessons.find(
                  l => String(l.unit_id) === String(unitObj.id) && (l.name || '').toLowerCase().trim() === (less.name || '').toLowerCase().trim()
                );

                const pageVal = Number(less.pageCount || 0);
                let complexityVal = less.complexity || 'Easy';
                if (complexityVal) {
                  complexityVal = complexityVal.charAt(0).toUpperCase() + complexityVal.slice(1).toLowerCase();
                  if (!['Easy', 'Moderate', 'Complex'].includes(complexityVal)) {
                    complexityVal = 'Easy';
                  }
                } else {
                  complexityVal = 'Easy';
                }

                if (!lessonObj) {
                  const newId = generateLocalId();
                  if (isSupabaseMode) {
                    const { data, error } = await supabase
                      .from('syllabus_lessons')
                      .insert([{
                        unit_id: unitObj.id,
                        chapter_id: null,
                        name: less.name.trim(),
                        page_count: pageVal,
                        complexity: complexityVal
                      }])
                      .select();
                    if (error) throw error;
                    lessonObj = data[0];
                  } else {
                    lessonObj = {
                      id: newId,
                      unit_id: unitObj.id,
                      chapter_id: null,
                      name: less.name.trim(),
                      page_count: pageVal,
                      complexity: complexityVal
                    };
                  }
                  currentLessons.push(lessonObj);
                } else {
                  if (isSupabaseMode) {
                    const updates = {};
                    let needsUpdate = false;
                    if (lessonObj.page_count !== pageVal) {
                      updates.page_count = pageVal;
                      needsUpdate = true;
                    }
                    if (lessonObj.complexity !== complexityVal) {
                      updates.complexity = complexityVal;
                      needsUpdate = true;
                    }
                    if (needsUpdate) {
                      const { error } = await supabase
                        .from('syllabus_lessons')
                        .update(updates)
                        .eq('id', lessonObj.id);
                      if (error) throw error;
                      lessonObj.page_count = pageVal;
                      lessonObj.complexity = complexityVal;
                    }
                  } else {
                    lessonObj.page_count = pageVal;
                    lessonObj.complexity = complexityVal;
                  }
                }
              }
            }
          }

          saveState({
            units: currentUnits,
            chapters: currentChapters,
            lessons: currentLessons
          });
          if (isSupabaseMode) {
            await loadData();
          }
        } else if (level === 'chapter') {
          let currentChapters = [...chapters];
          let currentLessons = [...lessons];

          const isParentBook = books.some(b => String(b.id) === String(parentId));

          for (const chap of chaptersList) {
            if (!chap.name.trim()) continue;

            let chapterObj = currentChapters.find(c => {
              if (isParentBook) {
                return String(c.book_id) === String(parentId) && c.name.toLowerCase().trim() === chap.name.toLowerCase().trim();
              } else {
                return String(c.unit_id) === String(parentId) && c.name.toLowerCase().trim() === chap.name.toLowerCase().trim();
              }
            });

            if (!chapterObj) {
              const newId = generateLocalId();
              if (isSupabaseMode) {
                const insertData = isParentBook
                  ? { book_id: parentId, unit_id: null, name: chap.name.trim() }
                  : { unit_id: parentId, book_id: null, name: chap.name.trim() };
                const { data, error } = await supabase
                  .from('syllabus_chapters')
                  .insert([insertData])
                  .select();
                if (error) throw error;
                chapterObj = data[0];
              } else {
                chapterObj = isParentBook
                  ? { id: newId, book_id: parentId, unit_id: null, name: chap.name.trim() }
                  : { id: newId, unit_id: parentId, book_id: null, name: chap.name.trim() };
              }
              currentChapters.push(chapterObj);
            }

            if (chap.lessons && chap.lessons.length > 0) {
              for (const less of chap.lessons) {
                if (!less.name || !less.name.trim()) continue;
                let lessonObj = currentLessons.find(
                  l => String(l.chapter_id) === String(chapterObj.id) && (l.name || '').toLowerCase().trim() === (less.name || '').toLowerCase().trim()
                );

                const pageVal = Number(less.pageCount || 0);
                let complexityVal = less.complexity || 'Easy';
                if (complexityVal) {
                  complexityVal = complexityVal.charAt(0).toUpperCase() + complexityVal.slice(1).toLowerCase();
                  if (!['Easy', 'Moderate', 'Complex'].includes(complexityVal)) {
                    complexityVal = 'Easy';
                  }
                } else {
                  complexityVal = 'Easy';
                }

                if (!lessonObj) {
                  const newId = generateLocalId();
                  if (isSupabaseMode) {
                    const { data, error } = await supabase
                      .from('syllabus_lessons')
                      .insert([{
                        chapter_id: chapterObj.id,
                        unit_id: null,
                        name: less.name.trim(),
                        page_count: pageVal,
                        complexity: complexityVal
                      }])
                      .select();
                    if (error) throw error;
                    lessonObj = data[0];
                  } else {
                    lessonObj = {
                      id: newId,
                      chapter_id: chapterObj.id,
                      unit_id: null,
                      name: less.name.trim(),
                      page_count: pageVal,
                      complexity: complexityVal
                    };
                  }
                  currentLessons.push(lessonObj);
                } else {
                  if (isSupabaseMode) {
                    const updates = {};
                    let needsUpdate = false;
                    if (lessonObj.page_count !== pageVal) {
                      updates.page_count = pageVal;
                      needsUpdate = true;
                    }
                    if (lessonObj.complexity !== complexityVal) {
                      updates.complexity = complexityVal;
                      needsUpdate = true;
                    }
                    if (needsUpdate) {
                      const { error } = await supabase
                        .from('syllabus_lessons')
                        .update(updates)
                        .eq('id', lessonObj.id);
                      if (error) throw error;
                      lessonObj.page_count = pageVal;
                      lessonObj.complexity = complexityVal;
                    }
                  } else {
                    lessonObj.page_count = pageVal;
                    lessonObj.complexity = complexityVal;
                  }
                }
              }
            }
          }

          saveState({
            chapters: currentChapters,
            lessons: currentLessons
          });
          if (isSupabaseMode) {
            await loadData();
          }
        } else if (level === 'lesson') {
          let currentLessons = [...lessons];
          const isParentChapter = chapters.some(c => String(c.id) === String(parentId));

          for (const less of lessonsList) {
            if (!less.name || !less.name.trim()) continue;
            let lessonObj = currentLessons.find(l => {
              if (isParentChapter) {
                return String(l.chapter_id) === String(parentId) && (l.name || '').toLowerCase().trim() === (less.name || '').toLowerCase().trim();
              } else {
                return String(l.unit_id) === String(parentId) && (l.name || '').toLowerCase().trim() === (less.name || '').toLowerCase().trim();
              }
            });

            const pageVal = Number(less.pageCount || 0);
            let complexityVal = less.complexity || 'Easy';
            if (complexityVal) {
              complexityVal = complexityVal.charAt(0).toUpperCase() + complexityVal.slice(1).toLowerCase();
              if (!['Easy', 'Moderate', 'Complex'].includes(complexityVal)) {
                complexityVal = 'Easy';
              }
            } else {
              complexityVal = 'Easy';
            }

            if (!lessonObj) {
              const newId = generateLocalId();
              if (isSupabaseMode) {
                const insertData = isParentChapter
                  ? { chapter_id: parentId, unit_id: null, name: less.name.trim(), page_count: pageVal, complexity: complexityVal }
                  : { unit_id: parentId, chapter_id: null, name: less.name.trim(), page_count: pageVal, complexity: complexityVal };
                const { data, error } = await supabase
                  .from('syllabus_lessons')
                  .insert([insertData])
                  .select();
                if (error) throw error;
                lessonObj = data[0];
              } else {
                lessonObj = isParentChapter
                  ? { id: newId, chapter_id: parentId, unit_id: null, name: less.name.trim(), page_count: pageVal, complexity: complexityVal }
                  : { id: newId, unit_id: parentId, chapter_id: null, name: less.name.trim(), page_count: pageVal, complexity: complexityVal };
              }
              currentLessons.push(lessonObj);
            } else {
              if (isSupabaseMode) {
                const updates = {};
                let needsUpdate = false;
                if (lessonObj.page_count !== pageVal) {
                  updates.page_count = pageVal;
                  needsUpdate = true;
                }
                if (lessonObj.complexity !== complexityVal) {
                  updates.complexity = complexityVal;
                  needsUpdate = true;
                }
                if (needsUpdate) {
                  const { error } = await supabase
                    .from('syllabus_lessons')
                    .update(updates)
                    .eq('id', lessonObj.id);
                  if (error) throw error;
                  lessonObj.page_count = pageVal;
                  lessonObj.complexity = complexityVal;
                }
              } else {
                lessonObj.page_count = pageVal;
                lessonObj.complexity = complexityVal;
              }
            }
          }

          saveState({
            lessons: currentLessons
          });
          if (isSupabaseMode) {
            await loadData();
          }
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
          let updatedList = books.map(b => String(b.id) === String(targetId) ? { ...b, name, hierarchy_type: hierarchyType } : b);
          if (isSupabaseMode && !startLocal) {
            const { error } = await supabase.from('syllabus_books').update({ name, hierarchy_type: hierarchyType }).eq('id', targetId);
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
      showToast(`Saved syllabus level successfully.`, `success`);
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
            const nextChapters = chapters.filter(c => !deletedUnitIds.includes(c.unit_id) && !deletedBookIds.includes(c.book_id));
            const deletedChapterIds = chapters.filter(c => deletedUnitIds.includes(c.unit_id) || deletedBookIds.includes(c.book_id)).map(c => c.id);
            const nextLessons = lessons.filter(l => !deletedChapterIds.includes(l.chapter_id) && !deletedUnitIds.includes(l.unit_id));

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
            const nextChapters = chapters.filter(c => !deletedUnitIds.includes(c.unit_id) && String(c.book_id) !== String(id));
            const deletedChapterIds = chapters.filter(c => deletedUnitIds.includes(c.unit_id) || String(c.book_id) === String(id)).map(c => c.id);
            const nextLessons = lessons.filter(l => !deletedChapterIds.includes(l.chapter_id) && !deletedUnitIds.includes(l.unit_id));

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
            const nextLessons = lessons.filter(l => !deletedChapterIds.includes(l.chapter_id) && String(l.unit_id) !== String(id));

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
          showToast(`Deleted syllabus node successfully.`, `success`);
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

  const renderLessonRow = (less) => {
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
            {less.page_count || 0} pages
          </span>
          <span className={`text-[8px] font-bold px-1.5 py-0.5 border rounded-full shrink-0 ${compColor}`}>
            {less.complexity || 'Easy'}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setModal({ type: 'edit', level: 'lesson', node: less })}
            className="p-1 text-blue-500 hover:bg-blue-50 rounded"
          >
            <i className="fas fa-edit text-[10px]"></i>
          </button>
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
  };

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
                    const hierarchy = book.hierarchy_type || 'Book > Unit > Chapter > Lesson';
                    const hasUnits = hierarchy.includes('Unit');
                    const hasChapters = hierarchy.includes('Chapter');
                    const hasLessons = hierarchy.includes('Lesson');

                    const bookUnits = hasUnits ? units.filter(u => String(u.book_id) === String(book.id)) : [];
                    const bookChapters = !hasUnits && hasChapters ? chapters.filter(c => String(c.book_id) === String(book.id)) : [];

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
                              {hasUnits ? `${bookUnits.length} Units` : `${bookChapters.length} Chapters`}
                            </span>
                            <span className="text-[9px] text-brand-primary bg-brand-lbg/30 border border-brand-soft/20 px-2 py-0.5 rounded-full font-semibold ml-1.5 shrink-0">
                              {hierarchy}
                            </span>
                          </button>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5">
                            {hasUnits ? (
                              <button
                                onClick={() => setModal({ type: 'add', level: 'unit', parentId: book.id })}
                                className="p-1.5 rounded-lg text-[10px] font-bold bg-white border border-light-border hover:bg-brand-lbg/10 hover:text-brand-primary hover:border-brand-soft transition-all"
                                title="Add Unit"
                              >
                                <i className="fas fa-plus"></i> Add Unit
                              </button>
                            ) : (
                              <button
                                onClick={() => setModal({ type: 'add', level: 'chapter', parentId: book.id })}
                                className="p-1.5 rounded-lg text-[10px] font-bold bg-white border border-light-border hover:bg-brand-lbg/10 hover:text-brand-primary hover:border-brand-soft transition-all"
                                title="Add Chapter"
                              >
                                <i className="fas fa-plus"></i> Add Chapter
                              </button>
                            )}
                            <button
                              onClick={() => handleCsvClick(book.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center"
                              title="Import CSV Curriculum"
                            >
                              <i className="fas fa-file-csv text-sm"></i>
                            </button>
                            <button
                              onClick={() => setModal({ type: 'edit', level: 'book', node: book })}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Rename/Edit Book"
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

                        {/* Units / Chapters Container */}
                        {!isBookCollapsed && (
                          <div className="p-4 bg-white border-t border-light-border space-y-4">
                            {/* Case A: Book has Units */}
                            {hasUnits && (
                              bookUnits.length === 0 ? (
                                <div className="text-[10px] italic text-dark-muted pl-6 py-2">
                                  No units added under this book.
                                </div>
                              ) : (
                                bookUnits.map((unit) => {
                                  const isUnitCollapsed = collapsedNodes[unit.id];
                                  const unitChapters = hasChapters ? chapters.filter(c => String(c.unit_id) === String(unit.id)) : [];
                                  const unitLessons = !hasChapters && hasLessons ? lessons.filter(l => String(l.unit_id) === String(unit.id)) : [];

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
                                            {hasChapters ? `${unitChapters.length} Chapters` : `${unitLessons.length} Lessons`}
                                          </span>
                                        </button>

                                        <div className="flex items-center gap-1.5">
                                          {hasChapters ? (
                                            <button
                                              onClick={() => setModal({ type: 'add', level: 'chapter', parentId: unit.id })}
                                              className="px-2 py-1 rounded-md text-[9px] font-bold bg-white border border-light-border hover:bg-orange-50 hover:text-orange-primary hover:border-orange-200 transition-all"
                                            >
                                              <i className="fas fa-plus"></i> Add Chapter
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => setModal({ type: 'add', level: 'lesson', parentId: unit.id })}
                                              className="px-2 py-1 rounded-md text-[9px] font-bold bg-white border border-light-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
                                            >
                                              <i className="fas fa-plus"></i> Add Lesson
                                            </button>
                                          )}
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

                                      {/* Chapters or Lessons under Unit */}
                                      {!isUnitCollapsed && (
                                        <div className="p-3 bg-white space-y-3">
                                          {/* Case A1: Render Chapters under Unit */}
                                          {hasChapters && (
                                            unitChapters.length === 0 ? (
                                              <div className="text-[10px] italic text-dark-muted pl-6 py-1">
                                                No chapters added under this unit.
                                              </div>
                                            ) : (
                                              unitChapters.map((chap) => {
                                                const isChapCollapsed = collapsedNodes[chap.id];
                                                const chapLessons = lessons.filter(l => String(l.chapter_id) === String(chap.id));
                                                const visibleLessons = chapLessons.filter(l => l.name && l.name.trim() !== '');
                                                const totalPages = chapLessons.reduce((sum, l) => sum + (l.page_count || 0), 0);
                                                const rolledUpComp = getRolledUpComplexity(chapLessons);

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
                                                        {hasLessons && (
                                                          visibleLessons.length > 0 ? (
                                                            <span className="text-[9px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold">
                                                              {visibleLessons.length} Lessons
                                                            </span>
                                                          ) : (
                                                            <span className="text-[9px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold">
                                                              No lessons
                                                            </span>
                                                          )
                                                        )}
                                                        {hasLessons && visibleLessons.length === 0 && totalPages > 0 && (
                                                          <span className="text-[9px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold ml-1">
                                                            <i className="far fa-file-lines mr-1" />
                                                            {totalPages} pages
                                                          </span>
                                                        )}
                                                        {hasLessons && visibleLessons.length === 0 && rolledUpComp && (
                                                          <span className={`text-[8px] font-bold px-1.5 py-0.5 border rounded-full shrink-0 ml-1 ${
                                                            rolledUpComp === 'Complex' ? 'bg-red-100 text-red-700 border-red-200' :
                                                            rolledUpComp === 'Moderate' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                            'bg-green-100 text-green-700 border-green-200'
                                                          }`}>
                                                            {rolledUpComp}
                                                          </span>
                                                        )}
                                                      </button>

                                                      <div className="flex items-center gap-1">
                                                        {hasLessons && (
                                                          <button
                                                            onClick={() => setModal({ type: 'add', level: 'lesson', parentId: chap.id })}
                                                            className="px-2 py-0.5 rounded text-[8px] font-bold bg-white border border-light-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
                                                          >
                                                            <i className="fas fa-plus"></i> Add Lesson
                                                          </button>
                                                        )}
                                                        <button
                                                          onClick={() => setModal({ type: 'edit', level: 'chapter', node: chap })}
                                                          className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                        >
                                                          <i className="fas fa-edit text-[10px]"></i>
                                                        </button>
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
                                                    {!isChapCollapsed && hasLessons && (
                                                      <div className="p-2 bg-white space-y-1.5">
                                                        {visibleLessons.length === 0 ? (
                                                          chapLessons.length === 0 ? (
                                                            <div className="text-[10px] italic text-dark-muted pl-6 py-1">
                                                              No lessons added under this chapter.
                                                            </div>
                                                          ) : null
                                                        ) : (
                                                          visibleLessons.map((less) => renderLessonRow(less))
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })
                                            )
                                          )}

                                          {/* Case A2: Render Lessons directly under Unit (Book > Unit > Lesson) */}
                                          {!hasChapters && hasLessons && (
                                            unitLessons.length === 0 ? (
                                              <div className="text-[10px] italic text-dark-muted pl-6 py-1">
                                                No lessons added under this unit.
                                              </div>
                                            ) : (
                                              <div className="space-y-1.5">
                                                {unitLessons.map((less) => renderLessonRow(less))}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )
                            )}

                            {/* Case B: Book has Chapters directly (Book > Chapter > Lesson) */}
                            {!hasUnits && hasChapters && (
                              bookChapters.length === 0 ? (
                                <div className="text-[10px] italic text-dark-muted pl-6 py-2">
                                  No chapters added under this book.
                                </div>
                              ) : (
                                bookChapters.map((chap) => {
                                  const isChapCollapsed = collapsedNodes[chap.id];
                                  const chapLessons = lessons.filter(l => String(l.chapter_id) === String(chap.id));
                                  const visibleLessons = chapLessons.filter(l => l.name && l.name.trim() !== '');
                                  const totalPages = chapLessons.reduce((sum, l) => sum + (l.page_count || 0), 0);
                                  const rolledUpComp = getRolledUpComplexity(chapLessons);

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
                                          {hasLessons && (
                                            visibleLessons.length > 0 ? (
                                              <span className="text-[9px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold">
                                                {visibleLessons.length} Lessons
                                              </span>
                                            ) : (
                                              <span className="text-[9px] text-dark-muted bg-white border border-light-border px-1.5 py-0.5 rounded-full font-bold">
                                                No lessons
                                              </span>
                                            )
                                          )}
                                        </button>

                                        <div className="flex items-center gap-1">
                                          {hasLessons && (
                                            <button
                                              onClick={() => setModal({ type: 'add', level: 'lesson', parentId: chap.id })}
                                              className="px-2 py-0.5 rounded text-[8px] font-bold bg-white border border-light-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
                                            >
                                              <i className="fas fa-plus"></i> Add Lesson
                                            </button>
                                          )}
                                          <button
                                            onClick={() => setModal({ type: 'edit', level: 'chapter', node: chap })}
                                            className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                          >
                                            <i className="fas fa-edit text-[10px]"></i>
                                          </button>
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
                                      {!isChapCollapsed && hasLessons && (
                                        <div className="p-2 bg-white space-y-1.5">
                                          {visibleLessons.length === 0 ? (
                                            chapLessons.length === 0 ? (
                                              <div className="text-[10px] italic text-dark-muted pl-6 py-1">
                                                No lessons added under this chapter.
                                              </div>
                                            ) : null
                                          ) : (
                                            visibleLessons.map((less) => renderLessonRow(less))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )
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
          books={books}
          units={units}
          chapters={chapters}
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

      {/* CSV Column Mapping Modal */}
      <SyllabusCsvMappingModal
        isOpen={isCsvMappingOpen}
        headers={csvHeaders}
        previewRows={csvRows.slice(0, 5)}
        onClose={() => setIsCsvMappingOpen(false)}
        onImport={handleExecuteCsvImport}
        hierarchy={books.find(b => String(b.id) === String(importBookId))?.hierarchy_type || 'Book > Unit > Chapter > Lesson'}
      />

      {/* Hidden File Input for CSV Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

// Internal Modal Form Component
const SyllabusFormModal = ({ modal, classifications = [], books = [], units = [], chapters = [], onClose, onSave }) => {
  const { type, level, parentId, node } = modal;
  const isEdit = type === 'edit';

  const [name, setName] = useState(isEdit ? node.name : '');
  const [classificationId, setClassificationId] = useState(isEdit && level === 'subject' ? (node.classification_id || '') : '');
  const [pageCount, setPageCount] = useState(isEdit && level === 'lesson' ? node.page_count : 5);
  const [complexity, setComplexity] = useState(isEdit && level === 'lesson' ? node.complexity : 'Easy');

  const [hierarchyType, setHierarchyType] = useState(isEdit && level === 'book' ? (node.hierarchy_type || 'Book > Unit > Chapter > Lesson') : 'Book > Unit > Chapter > Lesson');

  // Determine parent book hierarchy
  const getHierarchy = () => {
    if (level === 'subject' || level === 'book') return 'Book > Unit > Chapter > Lesson';
    if (level === 'unit') {
      const parentBook = books.find(b => String(b.id) === String(parentId));
      return parentBook?.hierarchy_type || 'Book > Unit > Chapter > Lesson';
    }
    if (level === 'chapter') {
      const parentBook = books.find(b => String(b.id) === String(parentId));
      if (parentBook) return parentBook.hierarchy_type;
      const parentUnit = units.find(u => String(u.id) === String(parentId));
      const pb = parentUnit ? books.find(b => String(b.id) === String(parentUnit.book_id)) : null;
      return pb?.hierarchy_type || 'Book > Unit > Chapter > Lesson';
    }
    if (level === 'lesson') {
      const parentUnit = units.find(u => String(u.id) === String(parentId));
      if (parentUnit) {
        const pb = books.find(b => String(b.id) === String(parentUnit.book_id));
        return pb?.hierarchy_type || 'Book > Unit > Chapter > Lesson';
      }
      const parentChap = chapters.find(c => String(c.id) === String(parentId));
      if (parentChap) {
        if (parentChap.book_id) {
          const pb = books.find(b => String(b.id) === String(parentChap.book_id));
          return pb?.hierarchy_type || 'Book > Unit > Chapter > Lesson';
        }
        if (parentChap.unit_id) {
          const pu = units.find(u => String(u.id) === String(parentChap.unit_id));
          const pb = pu ? books.find(b => String(b.id) === String(pu.book_id)) : null;
          return pb?.hierarchy_type || 'Book > Unit > Chapter > Lesson';
        }
      }
    }
    return 'Book > Unit > Chapter > Lesson';
  };

  const hierarchy = getHierarchy();

  // Multi-entry initializers based on hierarchy
  const initialUnits = () => {
    if (hierarchy === 'Book > Unit > Lesson') {
      return [{
        tempId: 'u-1',
        name: '',
        lessons: [{ tempId: 'l-1', name: '', pageCount: 5, complexity: 'Easy' }]
      }];
    }
    if (hierarchy === 'Book > Unit > Chapter') {
      return [{
        tempId: 'u-1',
        name: '',
        chapters: [{ tempId: 'c-1', name: '' }]
      }];
    }
    return [{
      tempId: 'u-1',
      name: '',
      chapters: [
        {
          tempId: 'c-1',
          name: '',
          lessons: [
            { tempId: 'l-1', name: '', pageCount: 5, complexity: 'Easy' }
          ]
        }
      ]
    }];
  };

  const initialChapters = () => {
    if (hierarchy === 'Book > Unit > Chapter') {
      return [{
        tempId: 'c-1',
        name: ''
      }];
    }
    return [{
      tempId: 'c-1',
      name: '',
      lessons: [
        { tempId: 'l-1', name: '', pageCount: 5, complexity: 'Easy' }
      ]
    }];
  };

  const [unitsList, setUnitsList] = useState(initialUnits);
  const [chaptersList, setChaptersList] = useState(initialChapters);
  const [lessonsList, setLessonsList] = useState([
    { tempId: 'l-1', name: '', pageCount: 5, complexity: 'Easy' }
  ]);

  // Unit builders
  const addUnit = () => {
    const newUnitId = 'u-' + Math.random().toString(36).substr(2, 9);
    let newUnit = {
      tempId: newUnitId,
      name: '',
    };
    if (hierarchy === 'Book > Unit > Lesson') {
      newUnit.lessons = [{ tempId: 'l-' + Math.random().toString(36).substr(2, 9), name: '', pageCount: 5, complexity: 'Easy' }];
    } else if (hierarchy === 'Book > Unit > Chapter') {
      newUnit.chapters = [{ tempId: 'c-' + Math.random().toString(36).substr(2, 9), name: '' }];
    } else {
      newUnit.chapters = [
        {
          tempId: 'c-' + Math.random().toString(36).substr(2, 9),
          name: '',
          lessons: [
            { tempId: 'l-' + Math.random().toString(36).substr(2, 9), name: '', pageCount: 5, complexity: 'Easy' }
          ]
        }
      ];
    }
    setUnitsList([...unitsList, newUnit]);
  };

  const removeUnit = (uId) => {
    if (unitsList.length > 1) {
      setUnitsList(unitsList.filter(u => u.tempId !== uId));
    }
  };

  const updateUnitName = (uId, val) => {
    setUnitsList(unitsList.map(u => u.tempId === uId ? { ...u, name: val } : u));
  };

  const addChapterToUnit = (uId) => {
    setUnitsList(unitsList.map(u => {
      if (u.tempId === uId) {
        let newChap = {
          tempId: 'c-' + Math.random().toString(36).substr(2, 9),
          name: '',
        };
        if (hierarchy !== 'Book > Unit > Chapter') {
          newChap.lessons = [{ tempId: 'l-' + Math.random().toString(36).substr(2, 9), name: '', pageCount: 5, complexity: 'Easy' }];
        }
        return {
          ...u,
          chapters: [
            ...u.chapters,
            newChap
          ]
        };
      }
      return u;
    }));
  };

  const removeChapterFromUnit = (uId, cId) => {
    setUnitsList(unitsList.map(u => {
      if (u.tempId === uId) {
        return {
          ...u,
          chapters: u.chapters.filter(c => c.tempId !== cId)
        };
      }
      return u;
    }));
  };

  const updateChapterNameInUnit = (uId, cId, val) => {
    setUnitsList(unitsList.map(u => {
      if (u.tempId === uId) {
        return {
          ...u,
          chapters: u.chapters.map(c => c.tempId === cId ? { ...c, name: val } : c)
        };
      }
      return u;
    }));
  };

  const addLessonToChapterInUnit = (uId, cId) => {
    setUnitsList(unitsList.map(u => {
      if (u.tempId === uId) {
        return {
          ...u,
          chapters: u.chapters.map(c => {
            if (c.tempId === cId) {
              return {
                ...c,
                lessons: [
                  ...c.lessons,
                  { tempId: 'l-' + Math.random().toString(36).substr(2, 9), name: '', pageCount: 5, complexity: 'Easy' }
                ]
              };
            }
            return c;
          })
        };
      }
      return u;
    }));
  };

  const removeLessonFromChapterInUnit = (uId, cId, lId) => {
    setUnitsList(unitsList.map(u => {
      if (u.tempId === uId) {
        return {
          ...u,
          chapters: u.chapters.map(c => {
            if (c.tempId === cId) {
              return {
                ...c,
                lessons: c.lessons.filter(l => l.tempId !== lId)
              };
            }
            return c;
          })
        };
      }
      return u;
    }));
  };

  const updateLessonFieldInUnit = (uId, cId, lId, field, val) => {
    setUnitsList(unitsList.map(u => {
      if (u.tempId === uId) {
        return {
          ...u,
          chapters: u.chapters.map(c => {
            if (c.tempId === cId) {
              return {
                ...c,
                lessons: c.lessons.map(l => l.tempId === lId ? { ...l, [field]: val } : l)
              };
            }
            return c;
          })
        };
      }
      return u;
    }));
  };

  // Unit Direct Lesson builders (for Book > Unit > Lesson)
  const addLessonToUnitDirect = (uId) => {
    setUnitsList(unitsList.map(u => {
      if (u.tempId === uId) {
        return {
          ...u,
          lessons: [
            ...u.lessons,
            { tempId: 'l-' + Math.random().toString(36).substr(2, 9), name: '', pageCount: 5, complexity: 'Easy' }
          ]
        };
      }
      return u;
    }));
  };

  const removeLessonFromUnitDirect = (uId, lId) => {
    setUnitsList(unitsList.map(u => {
      if (u.tempId === uId) {
        return {
          ...u,
          lessons: u.lessons.filter(l => l.tempId !== lId)
        };
      }
      return u;
    }));
  };

  const updateLessonFieldInUnitDirect = (uId, lId, field, val) => {
    setUnitsList(unitsList.map(u => {
      if (u.tempId === uId) {
        return {
          ...u,
          lessons: u.lessons.map(l => l.tempId === lId ? { ...l, [field]: val } : l)
        };
      }
      return u;
    }));
  };

  // Chapter builders
  const addChapter = () => {
    let newChap = {
      tempId: 'c-' + Math.random().toString(36).substr(2, 9),
      name: '',
    };
    if (hierarchy !== 'Book > Unit > Chapter') {
      newChap.lessons = [{ tempId: 'l-' + Math.random().toString(36).substr(2, 9), name: '', pageCount: 5, complexity: 'Easy' }];
    }
    setChaptersList([
      ...chaptersList,
      newChap
    ]);
  };

  const removeChapter = (cId) => {
    if (chaptersList.length > 1) {
      setChaptersList(chaptersList.filter(c => c.tempId !== cId));
    }
  };

  const updateChapterName = (cId, val) => {
    setChaptersList(chaptersList.map(c => c.tempId === cId ? { ...c, name: val } : c));
  };

  const addLessonToChapter = (cId) => {
    setChaptersList(chaptersList.map(c => {
      if (c.tempId === cId) {
        return {
          ...c,
          lessons: [
            ...c.lessons,
            { tempId: 'l-' + Math.random().toString(36).substr(2, 9), name: '', pageCount: 5, complexity: 'Easy' }
          ]
        };
      }
      return c;
    }));
  };

  const removeLessonFromChapter = (cId, lId) => {
    setChaptersList(chaptersList.map(c => {
      if (c.tempId === cId) {
        return {
          ...c,
          lessons: c.lessons.filter(l => l.tempId !== lId)
        };
      }
      return c;
    }));
  };

  const updateLessonFieldInChapter = (cId, lId, field, val) => {
    setChaptersList(chaptersList.map(c => {
      if (c.tempId === cId) {
        return {
          ...c,
          lessons: c.lessons.map(l => l.tempId === lId ? { ...l, [field]: val } : l)
        };
      }
      return c;
    }));
  };

  // Lesson builders
  const addLesson = () => {
    setLessonsList([
      ...lessonsList,
      { tempId: 'l-' + Math.random().toString(36).substr(2, 9), name: '', pageCount: 5, complexity: 'Easy' }
    ]);
  };

  const removeLesson = (lId) => {
    if (lessonsList.length > 1) {
      setLessonsList(lessonsList.filter(l => l.tempId !== lId));
    }
  };

  const updateLessonField = (lId, field, val) => {
    setLessonsList(lessonsList.map(l => l.tempId === lId ? { ...l, [field]: val } : l));
  };

  const title = `${isEdit ? 'Edit' : 'Add'} ${level.charAt(0).toUpperCase() + level.slice(1)}${!isEdit && (level === 'unit' || level === 'chapter' || level === 'lesson') ? 's Builder' : ''}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
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
        hierarchyType,
      });
    } else {
      // Bulk add mode
      if (level === 'subject' || level === 'book') {
        if (!name.trim()) {
          showToast('Name field cannot be empty.', 'error');
          return;
        }
        onSave({
          level,
          type,
          name: name.trim(),
          classificationId,
          parentId,
          hierarchyType,
        });
      } else if (level === 'unit') {
        if (unitsList.some(u => !u.name.trim())) {
          showToast('All unit names must be filled, or remove empty unit rows.', 'error');
          return;
        }
        if (hierarchy === 'Book > Unit > Chapter' || hierarchy === 'Book > Unit > Chapter > Lesson') {
          if (unitsList.some(u => u.chapters.some(c => !c.name.trim()))) {
            showToast('All chapter names must be filled, or remove empty chapter rows.', 'error');
            return;
          }
        }
        if (hierarchy === 'Book > Unit > Chapter > Lesson') {
          if (unitsList.some(u => u.chapters.some(c => c.lessons.some(l => !l.name.trim())))) {
            showToast('All lesson names must be filled, or remove empty lesson rows.', 'error');
            return;
          }
        }
        if (hierarchy === 'Book > Unit > Lesson') {
          if (unitsList.some(u => u.lessons.some(l => !l.name.trim()))) {
            showToast('All lesson names must be filled, or remove empty lesson rows.', 'error');
            return;
          }
        }
        onSave({
          level,
          type,
          parentId,
          unitsList,
        });
      } else if (level === 'chapter') {
        if (chaptersList.some(c => !c.name.trim())) {
          showToast('All chapter names must be filled, or remove empty chapter rows.', 'error');
          return;
        }
        if (hierarchy !== 'Book > Unit > Chapter') {
          if (chaptersList.some(c => c.lessons.some(l => !l.name.trim()))) {
            showToast('All lesson names must be filled, or remove empty lesson rows.', 'error');
            return;
          }
        }
        onSave({
          level,
          type,
          parentId,
          chaptersList,
        });
      } else if (level === 'lesson') {
        if (lessonsList.some(l => !l.name.trim())) {
          showToast('All lesson names must be filled, or remove empty lesson rows.', 'error');
          return;
        }
        onSave({
          level,
          type,
          parentId,
          lessonsList,
        });
      }
    }
  };

  const modalWidth = (!isEdit && (level === 'unit' || level === 'chapter')) ? 'max-w-2xl' : 'max-w-md';

  return (
    <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-3xl border border-light-border shadow-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 ${modalWidth}`}>
        
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
          
          {/* Simple Single Fields for Edit OR Subject/Book Add */}
          {(isEdit || level === 'subject' || level === 'book') && (
            <>
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

              {level === 'book' && (
                <div>
                  <label className="block text-xs font-bold text-dark-soft uppercase tracking-wider mb-1.5">
                    Hierarchy Configuration
                  </label>
                  <select
                    value={hierarchyType}
                    onChange={(e) => setHierarchyType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-light-bg/25 border border-light-border rounded-xl focus:border-brand-primary focus:ring-2 focus:ring-brand-soft outline-none text-sm font-semibold text-dark-primary transition-all"
                  >
                    <option value="Book > Unit > Chapter > Lesson">Book &gt; Unit &gt; Chapter &gt; Lesson</option>
                    <option value="Book > Unit > Chapter">Book &gt; Unit &gt; Chapter</option>
                    <option value="Book > Chapter > Lesson">Book &gt; Chapter &gt; Lesson</option>
                    <option value="Book > Unit > Lesson">Book &gt; Unit &gt; Lesson</option>
                  </select>
                </div>
              )}

              {/* Lesson specifics (Edit mode only) */}
              {isEdit && level === 'lesson' && (
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
            </>
          )}

          {/* Bulk Unit Builder */}
          {!isEdit && level === 'unit' && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-dark-deepblue uppercase tracking-wider">Units & Sub-levels</span>
                <button
                  type="button"
                  onClick={addUnit}
                  className="bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                >
                  <i className="fas fa-plus text-[10px]"></i> Add Unit
                </button>
              </div>

              {unitsList.map((unit, uIdx) => (
                <div key={unit.tempId} className="border border-brand-soft/20 rounded-2xl p-4 bg-brand-lbg/5 space-y-4 animate-in fade-in duration-200">
                  {/* Unit Title Row */}
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-primary text-white w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                      U{uIdx + 1}
                    </span>
                    <input
                      type="text"
                      required
                      value={unit.name}
                      placeholder="Enter Unit Name (e.g. Unit 1: Introduction)..."
                      onChange={(e) => updateUnitName(unit.tempId, e.target.value)}
                      className="flex-1 bg-white border border-light-border rounded-xl px-3 py-1.5 text-xs font-semibold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft"
                    />
                    {unitsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUnit(unit.tempId)}
                        className="p-1.5 text-red-primary hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Remove Unit"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    )}
                  </div>

                  {/* Chapters Area (when hierarchy has Chapters under Unit) */}
                  {(hierarchy === 'Book > Unit > Chapter' || hierarchy === 'Book > Unit > Chapter > Lesson') && (
                    <div className="pl-6 border-l border-dashed border-light-border ml-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-dark-soft uppercase tracking-wider">Chapters under Unit {uIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => addChapterToUnit(unit.tempId)}
                          className="bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-all"
                        >
                          <i className="fas fa-plus text-[9px]"></i> Add Chapter
                        </button>
                      </div>

                      {unit.chapters.map((chap, cIdx) => (
                        <div key={chap.tempId} className="border border-dashed border-amber-200/50 rounded-xl p-3 bg-amber-50/10 space-y-3 animate-in fade-in duration-200">
                          {/* Chapter Title Row */}
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-500 text-white w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0">
                              C{cIdx + 1}
                            </span>
                            <input
                              type="text"
                              required
                              value={chap.name}
                              placeholder="Enter Chapter Name (e.g. Chapter 1)..."
                              onChange={(e) => updateChapterNameInUnit(unit.tempId, chap.tempId, e.target.value)}
                              className="flex-1 bg-white border border-light-border rounded-lg px-2.5 py-1 text-xs font-semibold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft"
                            />
                            {unit.chapters.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeChapterFromUnit(unit.tempId, chap.tempId)}
                                className="p-1 text-red-primary hover:bg-red-50 rounded shrink-0"
                                title="Remove Chapter"
                              >
                                <i className="fas fa-times text-[10px]"></i>
                              </button>
                            )}
                          </div>

                          {/* Lessons Area (under Chapters in Book > Unit > Chapter > Lesson) */}
                          {hierarchy === 'Book > Unit > Chapter > Lesson' && (
                            <div className="pl-6 border-l border-dashed border-amber-200 ml-2 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] font-bold text-dark-muted uppercase tracking-wider text-[7.5px]">Lessons for Chapter {cIdx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => addLessonToChapterInUnit(unit.tempId, chap.tempId)}
                                  className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5 transition-all"
                                >
                                  <i className="fas fa-plus text-[7px]"></i> Add Lesson
                                </button>
                              </div>

                              {chap.lessons.map((less, lIdx) => (
                                <div key={less.tempId} className="flex flex-wrap items-center gap-2 bg-light-lbg/10 border border-light-border/40 p-2 rounded-lg text-xs font-semibold animate-in fade-in duration-200">
                                  <span className="text-dark-muted text-[9px] font-bold shrink-0">L{lIdx + 1}</span>
                                  
                                  <input
                                    type="text"
                                    required
                                    value={less.name}
                                    placeholder="Lesson Name..."
                                    onChange={(e) => updateLessonFieldInUnit(unit.tempId, chap.tempId, less.tempId, 'name', e.target.value)}
                                    className="flex-1 min-w-[120px] bg-white border border-light-border rounded px-2 py-0.5 text-xs outline-none"
                                  />

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <input
                                      type="number"
                                      min="1"
                                      value={less.pageCount}
                                      placeholder="Pages"
                                      title="Page Count"
                                      onChange={(e) => updateLessonFieldInUnit(unit.tempId, chap.tempId, less.tempId, 'pageCount', parseInt(e.target.value) || 0)}
                                      className="w-12 bg-white border border-light-border rounded px-1.5 py-0.5 text-center text-xs outline-none"
                                    />
                                    
                                    <select
                                      value={less.complexity}
                                      onChange={(e) => updateLessonFieldInUnit(unit.tempId, chap.tempId, less.tempId, 'complexity', e.target.value)}
                                      className="bg-white border border-light-border rounded px-1 py-0.5 text-xs outline-none"
                                    >
                                      <option value="Easy">Easy</option>
                                      <option value="Moderate">Mod</option>
                                      <option value="Complex">Comp</option>
                                    </select>

                                    {chap.lessons.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeLessonFromChapterInUnit(unit.tempId, chap.tempId, less.tempId)}
                                        className="text-red-primary hover:text-red-dark p-0.5 shrink-0"
                                        title="Remove Lesson"
                                      >
                                        <i className="fas fa-times text-[9px]"></i>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Lessons directly under Unit (when hierarchy is Book > Unit > Lesson) */}
                  {hierarchy === 'Book > Unit > Lesson' && (
                    <div className="pl-6 border-l border-dashed border-light-border ml-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-dark-soft uppercase tracking-wider">Lessons under Unit {uIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => addLessonToUnitDirect(unit.tempId)}
                          className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-all"
                        >
                          <i className="fas fa-plus text-[9px]"></i> Add Lesson
                        </button>
                      </div>

                      {unit.lessons.map((less, lIdx) => (
                        <div key={less.tempId} className="flex flex-wrap items-center gap-2 bg-light-lbg/10 border border-light-border/40 p-2.5 rounded-xl text-xs font-semibold animate-in fade-in duration-200">
                          <span className="text-dark-muted text-[9px] font-bold shrink-0">L{lIdx + 1}</span>
                          
                          <input
                            type="text"
                            required
                            value={less.name}
                            placeholder="Lesson Name..."
                            onChange={(e) => updateLessonFieldInUnitDirect(unit.tempId, less.tempId, 'name', e.target.value)}
                            className="flex-1 min-w-[120px] bg-white border border-light-border rounded-xl px-3 py-1.5 text-xs outline-none"
                          />

                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              min="1"
                              value={less.pageCount}
                              placeholder="Pages"
                              title="Page Count"
                              onChange={(e) => updateLessonFieldInUnitDirect(unit.tempId, less.tempId, 'pageCount', parseInt(e.target.value) || 0)}
                              className="w-12 bg-white border border-light-border rounded-xl px-2 py-1.5 text-center text-xs outline-none"
                            />
                            
                            <select
                              value={less.complexity}
                              onChange={(e) => updateLessonFieldInUnitDirect(unit.tempId, less.tempId, 'complexity', e.target.value)}
                              className="bg-white border border-light-border rounded-xl px-2 py-1.5 text-xs outline-none"
                            >
                              <option value="Easy">Easy</option>
                              <option value="Moderate">Moderate</option>
                              <option value="Complex">Complex</option>
                            </select>

                            {unit.lessons.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLessonFromUnitDirect(unit.tempId, less.tempId)}
                                className="text-red-primary hover:text-red-dark p-1.5 rounded-lg hover:bg-red-50 shrink-0"
                                title="Remove Lesson"
                              >
                                <i className="fas fa-times text-[10px]"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bulk Chapter Builder */}
          {!isEdit && level === 'chapter' && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-dark-deepblue uppercase tracking-wider">Chapters & Sub-levels</span>
                <button
                  type="button"
                  onClick={addChapter}
                  className="bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                >
                  <i className="fas fa-plus text-[10px]"></i> Add Chapter
                </button>
              </div>

              {chaptersList.map((chap, cIdx) => (
                <div key={chap.tempId} className="border border-amber-200/50 rounded-2xl p-4 bg-amber-50/5 space-y-4 animate-in fade-in duration-200">
                  {/* Chapter Header Row */}
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-white w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                      C{cIdx + 1}
                    </span>
                    <input
                      type="text"
                      required
                      value={chap.name}
                      placeholder="Enter Chapter Name (e.g. Chapter 1: Fractions)..."
                      onChange={(e) => updateChapterName(chap.tempId, e.target.value)}
                      className="flex-1 bg-white border border-light-border rounded-xl px-3 py-1.5 text-xs font-semibold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft"
                    />
                    {chaptersList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChapter(chap.tempId)}
                        className="p-1.5 text-red-primary hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Remove Chapter"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    )}
                  </div>

                  {/* Lessons Area (if hierarchy has lessons under chapters) */}
                  {hierarchy !== 'Book > Unit > Chapter' && (
                    <div className="pl-6 border-l border-dashed border-light-border ml-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-dark-soft uppercase tracking-wider">Lessons for Chapter {cIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => addLessonToChapter(chap.tempId)}
                          className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-all"
                        >
                          <i className="fas fa-plus text-[9px]"></i> Add Lesson
                        </button>
                      </div>

                      {chap.lessons.map((less, lIdx) => (
                        <div key={less.tempId} className="flex flex-wrap items-center gap-2 bg-light-lbg/10 border border-light-border/40 p-2 rounded-lg text-xs font-semibold animate-in fade-in duration-200">
                          <span className="text-dark-muted text-[9px] font-bold shrink-0">L{lIdx + 1}</span>
                          
                          <input
                            type="text"
                            required
                            value={less.name}
                            placeholder="Lesson Name..."
                            onChange={(e) => updateLessonFieldInChapter(chap.tempId, less.tempId, 'name', e.target.value)}
                            className="flex-1 min-w-[120px] bg-white border border-light-border rounded px-2 py-0.5 text-xs outline-none"
                          />

                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              min="1"
                              value={less.pageCount}
                              placeholder="Pages"
                              title="Page Count"
                              onChange={(e) => updateLessonFieldInChapter(chap.tempId, less.tempId, 'pageCount', parseInt(e.target.value) || 0)}
                              className="w-12 bg-white border border-light-border rounded px-1.5 py-0.5 text-center text-xs outline-none"
                            />
                            
                            <select
                              value={less.complexity}
                              onChange={(e) => updateLessonFieldInChapter(chap.tempId, less.tempId, 'complexity', e.target.value)}
                              className="bg-white border border-light-border rounded px-1 py-0.5 text-xs outline-none"
                            >
                              <option value="Easy">Easy</option>
                              <option value="Moderate">Mod</option>
                              <option value="Complex">Comp</option>
                            </select>

                            {chap.lessons.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLessonFromChapter(chap.tempId, less.tempId)}
                                className="text-red-primary hover:text-red-dark p-0.5 shrink-0"
                                title="Remove Lesson"
                              >
                                <i className="fas fa-times text-[9px]"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bulk Lesson Builder */}
          {!isEdit && level === 'lesson' && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-dark-deepblue uppercase tracking-wider">Lessons List</span>
                <button
                  type="button"
                  onClick={addLesson}
                  className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                >
                  <i className="fas fa-plus text-[10px]"></i> Add Lesson
                </button>
              </div>

              <div className="space-y-2">
                {lessonsList.map((less, lIdx) => (
                  <div key={less.tempId} className="flex flex-wrap items-center gap-2 bg-light-lbg/10 border border-light-border/40 p-2.5 rounded-xl text-xs font-semibold animate-in fade-in duration-200">
                    <span className="bg-emerald-600 text-white w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                      L{lIdx + 1}
                    </span>
                    
                    <input
                      type="text"
                      required
                      value={less.name}
                      placeholder="Enter Lesson Name..."
                      onChange={(e) => updateLessonField(less.tempId, 'name', e.target.value)}
                      className="flex-1 min-w-[150px] bg-white border border-light-border rounded-xl px-3 py-1.5 text-xs outline-none"
                    />

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          value={less.pageCount}
                          placeholder="Pages"
                          title="Page Count"
                          onChange={(e) => updateLessonField(less.tempId, 'pageCount', parseInt(e.target.value) || 0)}
                          className="w-full bg-white border border-light-border rounded-xl px-2 py-1.5 text-center text-xs outline-none"
                        />
                      </div>
                      
                      <select
                        value={less.complexity}
                        onChange={(e) => updateLessonField(less.tempId, 'complexity', e.target.value)}
                        className="bg-white border border-light-border rounded-xl px-2 py-1.5 text-xs outline-none"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Complex">Complex</option>
                      </select>

                      {lessonsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLesson(less.tempId)}
                          className="text-red-primary hover:text-red-dark p-1.5 rounded-lg hover:bg-red-50 shrink-0"
                          title="Remove Lesson"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
              {isEdit ? 'Save Changes' : 'Save Curriculum'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 6. CSV COLUMN MAPPING MODAL
// ==========================================
const SyllabusCsvMappingModal = ({ isOpen, headers, previewRows, onClose, onImport, hierarchy = 'Book > Unit > Chapter > Lesson' }) => {
  const [unitCol, setUnitCol] = useState("");
  const [chapterCol, setChapterCol] = useState("");
  const [lessonCol, setLessonCol] = useState("");
  const [complexityCol, setComplexityCol] = useState("");
  const [pageCol, setPageCol] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const hasUnits = hierarchy.includes('Unit');
  const hasChapters = hierarchy.includes('Chapter');
  const hasLessons = hierarchy.includes('Lesson');

  // Auto-map columns on headers load
  useEffect(() => {
    if (headers && headers.length > 0) {
      // Helper to find matching column
      const findMatch = (keys) => {
        return headers.find(h => {
          const lower = h.toLowerCase().trim();
          return keys.includes(lower);
        }) || "";
      };

      setUnitCol(hasUnits ? findMatch(["unit", "units", "unit name", "unit_name", "section", "sections"]) : "");
      setChapterCol(hasChapters ? findMatch(["chapter", "chapters", "chapter name", "chapter_name", "topic", "topics"]) : "");
      setLessonCol(hasLessons ? findMatch(["lesson", "lessons", "lesson name", "lesson_name", "class", "classes"]) : "");
      setComplexityCol(hasLessons ? findMatch(["complexity", "complex", "difficulty", "level"]) : "");
      setPageCol(hasLessons ? findMatch(["page", "pages", "page_count", "page count", "pages count"]) : "");
    }
  }, [headers, hierarchy, hasUnits, hasChapters, hasLessons]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate mappings based on what levels are active
    if (hasUnits && !unitCol) {
      setErrorMsg("Please map the mandatory Unit column.");
      return;
    }
    if (hasChapters && !chapterCol) {
      setErrorMsg("Please map the mandatory Chapter column.");
      return;
    }
    if (hasLessons && !lessonCol) {
      setErrorMsg("Please map the mandatory Lesson column.");
      return;
    }

    // Ensure no duplicate mappings among targets
    const mapped = [];
    if (hasUnits && unitCol) mapped.push(unitCol);
    if (hasChapters && chapterCol) mapped.push(chapterCol);
    if (hasLessons && lessonCol) mapped.push(lessonCol);
    if (hasLessons && complexityCol) mapped.push(complexityCol);
    if (hasLessons && pageCol) mapped.push(pageCol);

    const uniqueMapped = new Set(mapped);
    if (uniqueMapped.size !== mapped.length) {
      setErrorMsg("Duplicate column mappings detected. Each target field must map to a unique column.");
      return;
    }

    setErrorMsg("");
    onImport({ unitCol, chapterCol, lessonCol, complexityCol, pageCol });
  };

  return (
    <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] border border-light-border shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="bg-brand-primary p-5 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <i className="fas fa-file-import"></i>
              CSV Column Mapping & Preview
            </h3>
            <p className="text-[10px] text-brand-lbg/80 mt-0.5 flex items-center flex-wrap gap-1">
              Confirm which CSV columns map to the active book hierarchy: <span className="font-bold text-white bg-white/20 px-1.5 py-0.5 rounded text-[9px]">{hierarchy}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-all text-xl outline-none p-1">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-5 min-h-0 flex flex-col">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-xs font-bold flex items-center gap-2">
              <i className="fas fa-exclamation-circle text-sm shrink-0"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mappings Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
            {/* Mandatory */}
            <div className="space-y-4 border-r border-light-border/40 pr-0 md:pr-4">
              <h4 className="text-[10px] font-bold text-dark-deepblue uppercase tracking-wider">Mandatory Columns</h4>
              
              {hasUnits && (
                <div>
                  <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">Unit Column *</label>
                  <select
                    value={unitCol}
                    onChange={(e) => setUnitCol(e.target.value)}
                    required
                    className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}

              {hasChapters && (
                <div>
                  <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">Chapter Column *</label>
                  <select
                    value={chapterCol}
                    onChange={(e) => setChapterCol(e.target.value)}
                    required
                    className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}

              {hasLessons && (
                <div>
                  <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">Lesson Column *</label>
                  <select
                    value={lessonCol}
                    onChange={(e) => setLessonCol(e.target.value)}
                    required
                    className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Optional */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-dark-deepblue uppercase tracking-wider">Optional Columns</h4>

              {hasLessons ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">Complexity Column</label>
                    <select
                      value={complexityCol}
                      onChange={(e) => setComplexityCol(e.target.value)}
                      className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                    >
                      <option value="">-- None (Defaults to 'Easy') --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">Page Count Column</label>
                    <select
                      value={pageCol}
                      onChange={(e) => setPageCol(e.target.value)}
                      className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                    >
                      <option value="">-- None (Defaults to 0) --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div className="text-xs text-dark-muted font-medium bg-light-lbg/10 p-3 rounded-xl border border-dashed border-light-border/40">
                  No optional fields are available for the selected book hierarchy.
                </div>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div className="flex-1 flex flex-col min-h-[150px]">
            <h4 className="text-[10px] font-bold text-dark-deepblue uppercase tracking-wider mb-2 shrink-0">CSV Data Preview (First 5 rows)</h4>
            <div className="flex-1 overflow-auto border border-light-border/40 rounded-2xl bg-light-lbg/10 p-2 text-[10px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-light-border/60 text-dark-soft">
                    {headers.map(h => (
                      <th key={h} className="py-2 px-3 text-left font-bold truncate max-w-[120px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border/30 text-dark-primary font-semibold">
                  {previewRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-white/50">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 truncate max-w-[120px]">{cell || <span className="text-dark-muted italic">empty</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-light-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="bg-light-ui text-dark-soft hover:bg-light-border px-4 py-2 rounded-xl text-xs font-bold transition-all outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm outline-none flex items-center gap-1.5"
            >
              <i className="fas fa-check-circle"></i>
              Import Curriculum
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SyllabusManager;
