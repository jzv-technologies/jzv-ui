import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';
import { getNonTeachingEventForDate } from '../../../utils/academicEventsUtils';

const AssignLessonsModal = ({
  onClose,
  lessons,
  allLessons = [],
  availableBooks = [],
  classId,
  subjectId,
  progressRecords,
  setProgressRecords,
  academicEvents = [],
  directMode,
  directTarget,
}) => {
  const [selectedLessons, setSelectedLessons] = useState(lessons || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedL1, setSelectedL1] = useState('');
  const [planningMode, setPlanningMode] = useState(directMode || 'date');
  const [targetDate, setTargetDate] = useState(directMode === 'date' && directTarget ? directTarget : '');
  const [targetEndDate, setTargetEndDate] = useState(directMode === 'date' && directTarget ? directTarget : '');
  const [weekDate, setWeekDate] = useState(directMode === 'week' && directTarget ? directTarget : '');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const nonTeachingEvent =
    planningMode === 'date' && targetDate
      ? getNonTeachingEventForDate(targetDate, academicEvents)
      : null;

  const handleAssign = async () => {
    if (planningMode === 'date' && !targetDate) {
      showToast('Please select a target date.', 'error');
      return;
    }
    if (planningMode === 'date' && nonTeachingEvent) {
      showToast(
        `Cannot plan lessons on ${targetDate}: Non-teaching day (${nonTeachingEvent.event_name})`,
        'error'
      );
      return;
    }
    if (planningMode === 'week' && !weekDate) {
      showToast('Please select a date for the week.', 'error');
      return;
    }

    setSaving(true);
    try {
      const upsertData = selectedLessons.map(lesson => {
        // Find existing record if any to preserve it
        const existing = progressRecords.find(p => 
          String(p.class_id) === String(classId) && 
          String(p.lesson_id) === String(lesson.id)
        );

        let startD, endD;
        if (planningMode === 'date') {
          startD = targetDate;
          endD = targetEndDate || targetDate;
        } else {
          // Compute Monday and Saturday of the selected weekDate
          const d = new Date(weekDate);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(d.setDate(diff));
          
          const saturday = new Date(monday);
          saturday.setDate(monday.getDate() + 5);
          
          startD = monday.toISOString().split('T')[0];
          endD = saturday.toISOString().split('T')[0];
        }

        let calcDue = dueDate || endD;
        if (dueDate && new Date(dueDate) < new Date(endD)) {
          calcDue = endD;
        }

        const book = availableBooks.find(b => String(b.id) === String(lesson.book_id));
        const derivedSubjectId = book ? book.subject_id : null;

        return {
          id: existing ? existing.id : undefined,
          class_id: classId,
          subject_id: subjectId || derivedSubjectId || lesson.subject_id,
          book_id: lesson.book_id,
          lesson_id: lesson.id,
          target_start_date: startD,
          target_end_date: endD,
          due_date: calcDue,
          academic_week: existing ? existing.academic_week : null,
          status: existing && existing.status !== 'not_started' ? existing.status : 'planned'
        };
      });

      // Remove id from new records so Postgres uses its bigint sequence default
      upsertData.forEach(d => {
        if (!d.id) delete d.id;
      });

      const { data, error } = await supabase
        .from('trk_lesson_level_progress')
        .upsert(upsertData, { onConflict: 'class_id, lesson_id', ignoreDuplicates: false })
        .select('id, class_id, subject_id, book_id, lesson_id, target_start_date, target_end_date, due_date, academic_week, status, completion_percentage, replan_counter, carry_forward_counter, carry_forward_count, delay_start, delay_end');

      if (error) throw error;

      // Update local state
      const updatedRecords = [...progressRecords];
      data.forEach(newRec => {
        const index = updatedRecords.findIndex(r => String(r.id) === String(newRec.id));
        if (index >= 0) {
          updatedRecords[index] = newRec;
        } else {
          updatedRecords.push(newRec);
        }
      });
      setProgressRecords(updatedRecords);

      let overwrittenCount = 0;
      selectedLessons.forEach(lesson => {
        const existing = progressRecords.find(p => String(p.class_id) === String(classId) && String(p.lesson_id) === String(lesson.id));
        if (existing && existing.target_start_date) {
           overwrittenCount++;
        }
      });

      if (overwrittenCount > 0) {
        showToast(`Successfully planned ${selectedLessons.length} lesson(s)! (${overwrittenCount} were re-planned from previous dates)`, 'success');
      } else {
        showToast(`Successfully planned ${selectedLessons.length} lesson(s)!`, 'success');
      }
      onClose();
    } catch (err) {
      showToast('Failed to assign lessons: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getFullLessonPath = (lesson) => {
    const parts = [];
    if (lesson.level1) parts.push(lesson.level1);
    if (lesson.level2) parts.push(lesson.level2);
    if (lesson.level3) parts.push(lesson.level3);
    return parts.join(' > ');
  };

  const renderLessonHierarchy = (l) => {
    return (
      <div className="flex flex-col flex-1 min-w-0 pr-2">
        <span className="text-gray-800 font-bold text-[11px] truncate" title={l.level1}>{l.level1}</span>
        {(l.level2 || l.level3) && (
          <span className="text-gray-500 font-medium text-[10px] truncate" title={`${l.level2 || ''} ${l.level3 ? '> ' + l.level3 : ''}`}>
            {l.level2} {l.level3 ? <span className="mx-1 text-gray-300">&gt;</span> : ''} {l.level3}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-primary/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-black text-dark-primary">Plan Lessons</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            {lessons && lessons.length > 0 ? (
              <>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Selected Lessons ({selectedLessons.length})</h3>
                <div className="max-h-32 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-1">
                  {selectedLessons.map(l => (
                    <div key={l.id} className="bg-white border border-gray-100 px-2 py-1.5 rounded flex items-center">
                      {renderLessonHierarchy(l)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Lessons ({selectedLessons.length})</h3>
                  <input 
                    type="text"
                    placeholder="Search lessons..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 outline-none w-40"
                  />
                </div>
                
                {(() => {
                  const filteredLessons = allLessons
                    .filter(l => availableBooks.some(b => String(b.id) === String(l.book_id)))
                    .filter(l => getFullLessonPath(l).toLowerCase().includes(searchQuery.toLowerCase()));

                  const availableL1s = Array.from(new Set(filteredLessons.map(l => l.level1).filter(Boolean)));
                  
                  // Auto-select first L1 if none selected or if selected is no longer in list
                  if (availableL1s.length > 0 && (!selectedL1 || !availableL1s.includes(selectedL1))) {
                    setTimeout(() => setSelectedL1(availableL1s[0]), 0);
                  }

                  const l1Lessons = filteredLessons.filter(l => l.level1 === selectedL1);
                  const groupedByL2 = l1Lessons.reduce((acc, l) => {
                    const l2 = l.level2 || 'General';
                    if (!acc[l2]) acc[l2] = [];
                    acc[l2].push(l);
                    return acc;
                  }, {});

                  return (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Select Topic (Level 1)</label>
                        <select 
                          value={selectedL1} 
                          onChange={e => setSelectedL1(e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-semibold outline-none bg-white"
                        >
                          {availableL1s.length === 0 && <option value="">No topics found</option>}
                          {availableL1s.map(l1 => (
                            <option key={l1} value={l1}>{l1}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex flex-col bg-gray-50 border border-gray-200 rounded-lg overflow-hidden h-48">
                        <div className="bg-gray-100 text-[10px] font-bold text-gray-500 uppercase px-2 py-1 border-b border-gray-200 flex justify-between">
                          <span>Lessons</span>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-2">
                          {Object.keys(groupedByL2).length === 0 ? (
                            <div className="text-center text-xs text-gray-400 py-4">Select a topic to view lessons.</div>
                          ) : (
                            Object.entries(groupedByL2).map(([l2, items]) => {
                              const hasLevel3 = items.some(l => l.level3);
                              
                              if (!hasLevel3) {
                                return items.map(l => {
                                  const isSelected = selectedLessons.some(sl => sl.id === l.id);
                                  return (
                                    <div
                                      key={l.id}
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedLessons(prev => prev.filter(sl => sl.id !== l.id));
                                        } else {
                                          setSelectedLessons(prev => [...prev, l]);
                                        }
                                      }}
                                      className={`cursor-pointer px-2 py-1 rounded border flex items-center justify-between transition-colors ${
                                        isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 hover:bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      <span className={`text-[11px] truncate pr-2 ${isSelected ? 'font-bold' : 'font-medium'}`} title={l.level2}>
                                        {l.level2}
                                      </span>
                                      {isSelected && <i className="fas fa-check text-indigo-600 flex-shrink-0 text-[10px]"></i>}
                                    </div>
                                  );
                                });
                              }

                              return (
                                <div key={l2} className="space-y-1">
                                  <div className="text-[11px] font-bold text-gray-800 bg-gray-200 px-2 py-0.5 rounded truncate" title={l2}>{l2}</div>
                                  <div className="pl-3 space-y-1">
                                    {items.map(l => {
                                      const isSelected = selectedLessons.some(sl => sl.id === l.id);
                                      return (
                                        <div
                                          key={l.id}
                                          onClick={() => {
                                            if (isSelected) {
                                              setSelectedLessons(prev => prev.filter(sl => sl.id !== l.id));
                                            } else {
                                              setSelectedLessons(prev => [...prev, l]);
                                            }
                                          }}
                                          className={`cursor-pointer px-2 py-1 rounded border flex items-center justify-between transition-colors ${
                                            isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 hover:bg-gray-100 text-gray-600'
                                          }`}
                                        >
                                          <span className={`text-[11px] truncate pr-2 ${isSelected ? 'font-bold' : 'font-medium'}`} title={l.level3}>
                                            {l.level3}
                                          </span>
                                          {isSelected && <i className="fas fa-check text-indigo-600 flex-shrink-0 text-[10px]"></i>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="flex bg-gray-100 rounded-lg p-1 mb-4 w-full">
              <button
                onClick={() => setPlanningMode('date')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${planningMode === 'date' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Plan by Date
              </button>
              <button
                onClick={() => setPlanningMode('week')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${planningMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Plan by Week
              </button>
            </div>

            {planningMode === 'date' ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Target Start Date</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => {
                        setTargetDate(e.target.value);
                        if (!isMultiDay) setTargetEndDate(e.target.value);
                      }}
                      className="w-full bg-white border border-gray-300 text-gray-800 text-sm font-semibold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {isMultiDay && (
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Target End Date</label>
                      <input
                        type="date"
                        value={targetEndDate}
                        min={targetDate}
                        onChange={(e) => setTargetEndDate(e.target.value)}
                        className="w-full bg-white border border-gray-300 text-gray-800 text-sm font-semibold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                {nonTeachingEvent && (
                  <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-2">
                    <i className="fas fa-triangle-exclamation text-amber-600 text-sm shrink-0"></i>
                    <span>
                      Planning disabled: <strong>{nonTeachingEvent.event_name}</strong> is a designated non-teaching day.
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100">
                  <input 
                    type="checkbox" 
                    id="multiday" 
                    checked={isMultiDay} 
                    onChange={e => {
                      setIsMultiDay(e.target.checked);
                      if (!e.target.checked) setTargetEndDate(targetDate);
                    }} 
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                  />
                  <label htmlFor="multiday" className="text-xs font-bold text-indigo-900 cursor-pointer flex items-center gap-1.5 select-none">
                    <i className="fas fa-calendar-week text-indigo-600"></i> Plan for Multi-days (Date Range)
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Any Date in Week</label>
                <input
                  type="date"
                  value={weekDate}
                  onChange={(e) => setWeekDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-800 text-sm font-semibold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
                <p className="text-[10px] text-gray-400 mt-1">Lesson will be planned from Monday to Saturday of the selected date's week.</p>
              </div>
            )}
            
            <div className="mt-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">Due Date <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-800 text-sm font-semibold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
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
            onClick={handleAssign}
            disabled={
              saving ||
              selectedLessons.length === 0 ||
              (!targetDate && planningMode === 'date') ||
              (planningMode === 'date' && !!nonTeachingEvent) ||
              (!weekDate && planningMode === 'week')
            }
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-calendar-check"></i>}
            {nonTeachingEvent ? 'Planning Disabled' : 'Assign Lessons'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignLessonsModal;
