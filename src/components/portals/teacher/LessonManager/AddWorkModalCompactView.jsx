import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';

const AddWorkModalCompactView = ({
  onClose,
  classes,
  subjects,
  books,
  bookClasses,
  allLessons,
  progressRecords,
  setProgressRecords,
  initialClassId,
  initialSubjectId,
  initialBookId,
  teacherId,
  initialRecord,
  onSuccess,
}) => {
  const [classId, setClassId] = useState(
    initialRecord ? String(initialRecord.class_id) : initialClassId || ''
  );
  const [subjectId, setSubjectId] = useState(
    initialRecord ? String(initialRecord.subject_id) : initialSubjectId || ''
  );
  const [bookId, setBookId] = useState(
    initialRecord ? String(initialRecord.book_id) : initialBookId || ''
  );
  const [lessonId, setLessonId] = useState(
    initialRecord && initialRecord.status !== 'completed' ? String(initialRecord.lesson_id) : ''
  );
  const [level1Filter, setLevel1Filter] = useState(() => {
    if (initialRecord?.status === 'completed') {
      return '_Revision';
    }
    return '';
  });

  const getLocalToday = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getLocalToday());
  const [progress, setProgress] = useState(10);

  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedRecord = useMemo(() => {
    if (initialRecord) return initialRecord;
    if (classId && lessonId) {
      return progressRecords.find(
        (p) => String(p.class_id) === String(classId) && String(p.lesson_id) === String(lessonId)
      );
    }
    return null;
  }, [initialRecord, classId, lessonId, progressRecords]);

  useEffect(() => {
    if (selectedRecord) {
      if (selectedRecord.completion_percentage > 0 && selectedRecord.completion_percentage < 100) {
        setProgress(Math.floor(selectedRecord.completion_percentage));
      } else if (selectedRecord.completion_percentage >= 100) {
        setProgress(100);
      } else {
        setProgress(10);
      }
    } else {
      setProgress(10);
    }
  }, [selectedRecord]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const availableSubjects = useMemo(() => {
    if (!classId) return [];
    return subjects;
  }, [subjects, classId]);

  const availableBooks = useMemo(() => {
    if (!classId || !subjectId) return [];
    return books.filter((b) => {
      const matchSubject = String(b.subject_id) === String(subjectId);
      const matchClass = bookClasses.some(
        (bc) => String(bc.book_id) === String(b.id) && String(bc.class_id) === String(classId)
      );
      return matchSubject && matchClass;
    });
  }, [books, bookClasses, classId, subjectId]);

  const availableLessons = useMemo(() => {
    if (!bookId) return [];
    return allLessons.filter((l) => String(l.book_id) === String(bookId));
  }, [allLessons, bookId]);

  useEffect(() => {
    if (availableBooks.length === 1 && String(availableBooks[0].id) !== bookId) {
      setBookId(String(availableBooks[0].id));
    }
  }, [availableBooks, bookId]);

  const availableLevel1s = useMemo(() => {
    const l1s = new Set();
    availableLessons.forEach((l) => {
      if (l.level1) l1s.add(l.level1);
      else l1s.add('General');
    });
    return Array.from(l1s);
  }, [availableLessons]);

  const groupedLevel2Lessons = useMemo(() => {
    if (!level1Filter) return {};
    const filtered = availableLessons.filter((l) => (l.level1 || 'General') === level1Filter);
    const groups = {};
    filtered.forEach((l) => {
      const l2 = l.level2 || 'General';
      if (!groups[l2]) groups[l2] = [];
      groups[l2].push(l);
    });
    return groups;
  }, [availableLessons, level1Filter]);

  const isRevisionItem = useMemo(() => {
    if (initialRecord) {
      const lesson = allLessons.find((l) => String(l.id) === String(initialRecord.lesson_id));
      return lesson?.level1?.toLowerCase().includes('_revision');
    }
    const lesson = allLessons.find((l) => String(l.id) === String(lessonId));
    return lesson?.level1?.toLowerCase().includes('_revision');
  }, [initialRecord, allLessons, lessonId]);

  const getFullLessonPath = (lesson) => {
    if (!lesson) return '';
    const parts = [];
    if (lesson.level1) parts.push(lesson.level1);
    if (lesson.level2) parts.push(lesson.level2);
    if (lesson.level3) parts.push(lesson.level3);
    return parts.join(' > ');
  };

  const isForceRevision = useMemo(() => {
    return selectedRecord?.status === 'completed' && !isRevisionItem;
  }, [selectedRecord, isRevisionItem]);

  const handleSave = async () => {
    if (!classId || !subjectId || !bookId || !lessonId) {
      showToast('Please select all hierarchy fields.', 'error');
      return;
    }
    if (!date) {
      showToast('Please select a date.', 'error');
      return;
    }

    setSaving(true);
    try {
      let progressId = initialRecord?.id;

      // 1. If we don't have a progressId, ensure the lesson_progress row exists
      if (!progressId) {
        const existing = progressRecords.find(
          (p) => String(p.class_id) === String(classId) && String(p.lesson_id) === String(lessonId)
        );
        if (existing) {
          progressId = existing.id;
        } else {
          const { data: upsertData, error: upsertErr } = await supabase
            .from('lesson_progress')
            .upsert(
              {
                class_id: Number(classId),
                subject_id: Number(subjectId),
                book_id: Number(bookId),
                lesson_id: Number(lessonId),
                status: 'in_progress',
              },
              { onConflict: 'class_id, lesson_id' }
            )
            .select()
            .single();

          if (upsertErr) throw upsertErr;
          progressId = upsertData.id;
        }
      }

      const selectedLesson = allLessons.find((l) => String(l.id) === String(lessonId));
      const isRevision =
        selectedLesson?.level1?.toLowerCase().includes('_revision') || isForceRevision ? 'Y' : 'N';

      // 2. Insert into lesson_progress_items
      const { error: insertErr } = await supabase.from('lesson_progress_items').insert({
        progress_id: progressId,
        teacher_id: teacherId || null,
        date: date,
        progress: Number(progress),
        is_revision: isRevision,
        comments: remarks.trim(),
      });

      if (insertErr) throw insertErr;

      // 3. Fetch the updated lesson_progress row (triggers have run)
      const { data: updatedRow, error: fetchErr } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('id', progressId)
        .single();

      if (fetchErr) throw fetchErr;

      // Update local state
      const updatedRecords = [...progressRecords];
      const index = updatedRecords.findIndex((r) => String(r.id) === String(progressId));
      if (index >= 0) {
        updatedRecords[index] = updatedRow;
      } else {
        updatedRecords.push(updatedRow);
      }
      setProgressRecords(updatedRecords);

      if (onSuccess) {
        await onSuccess();
      }

      showToast('Work logged successfully!', 'success');
      onClose();
    } catch (err) {
      showToast('Failed to log work: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-primary/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-black text-dark-primary flex items-center gap-2">
            <i className="fas fa-clipboard-check text-brand-primary"></i> Update Lesson Progress
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
          {/* Context Selectors */}
          {!initialRecord && (
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase">Class</label>
                <select
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setSubjectId('');
                    setBookId('');
                    setLessonId('');
                  }}
                  className="w-full bg-white border border-gray-300 text-xs font-bold rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase">
                  Subject
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    setBookId('');
                    setLessonId('');
                  }}
                  disabled={!classId}
                  className="w-full bg-white border border-gray-300 text-xs font-bold rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">Select...</option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase">Book</label>
                <select
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  disabled={!subjectId}
                  className="w-full bg-white border border-gray-300 text-xs font-bold rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">Select...</option>
                  {availableBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase">
                  Level 1
                </label>
                <select
                  value={level1Filter}
                  onChange={(e) => {
                    setLevel1Filter(e.target.value);
                    setLessonId('');
                  }}
                  disabled={!bookId}
                  className="w-full bg-white border border-gray-300 text-xs font-bold rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">Select...</option>
                  {availableLevel1s.map((l1) => (
                    <option key={l1} value={l1}>
                      {l1 === '_Revision' ? 'Revision' : l1}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase">
                  Lesson (Level 2/3)
                </label>
                <select
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  disabled={!level1Filter}
                  className="w-full bg-white border border-gray-300 text-xs font-bold rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">Select...</option>
                  {Object.entries(groupedLevel2Lessons).map(([l2, lessons]) => {
                    if (lessons.length === 1 && !lessons[0].level3) {
                      return (
                        <option key={lessons[0].id} value={lessons[0].id}>
                          {lessons[0].level2 || lessons[0].level1}
                        </option>
                      );
                    }
                    return (
                      <optgroup key={l2} label={l2}>
                        {lessons.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.level3 || l.level2 || l.level1}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {selectedRecord && (
            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl">
              <div className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider mb-1">
                Logging work for
              </div>
              <div className="text-sm font-bold text-indigo-900 break-words">
                {getFullLessonPath(
                  allLessons.find((l) => String(l.id) === String(selectedRecord.lesson_id))
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-full bg-white rounded-full h-2 shadow-inner border border-gray-100 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, selectedRecord.completion_percentage || 0)}%`,
                    }}
                  ></div>
                </div>
                <span className="text-xs font-bold text-emerald-700">
                  {selectedRecord.completion_percentage || 0}%
                </span>
              </div>
              {selectedRecord.revision_counter > 0 && (
                <div className="mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-max">
                  Completed {selectedRecord.revision_counter} Revision(s)
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-700">Date Completed</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-gray-300 text-sm font-semibold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            {!isRevisionItem && !isForceRevision ? (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-end mb-1">
                  <label className="text-xs font-bold text-gray-700">Progress Up To (%)</label>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="w-16 text-center text-sm font-black text-indigo-600 bg-indigo-50 rounded-lg py-1 border border-indigo-100">
                    {progress}%
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">Status:</span>
                  {progress >= 100 ? (
                    <span className="bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      <i className="fas fa-check-circle mr-1"></i> Completed
                    </span>
                  ) : progress > 0 ? (
                    <span className="bg-amber-100 border border-amber-200 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      <i className="fas fa-spinner fa-spin mr-1"></i> In Progress
                    </span>
                  ) : (
                    <span className="bg-gray-100 border border-gray-200 text-gray-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      <i className="fas fa-pause-circle mr-1"></i> Not Started
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700">Status</label>
                {isForceRevision ? (
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-history text-orange-500"></i>
                      <span className="text-orange-700 font-bold text-sm">Logging as Revision</span>
                    </div>
                    <span className="text-[10px] text-orange-600">
                      This lesson is already completed. New logs will be recorded as revisions.
                    </span>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center gap-2">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span className="text-emerald-700 font-bold text-sm">Completed (Revision)</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-700">Remarks / Notes</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows="3"
                placeholder="Any notes about this session?"
                className="w-full bg-white border border-gray-300 text-sm font-semibold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200 disabled:opacity-50"
          >
            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
            Update Progress
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddWorkModalCompactView;
