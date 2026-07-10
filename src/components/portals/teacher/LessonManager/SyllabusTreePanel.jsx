import React, { useMemo, useState } from 'react';

const SyllabusTreePanel = ({
  selectedClassId,
  selectedSubjectId,
  selectedBookId,
  allLessons,
  progressRecords,
  selectedLessonIds,
  setSelectedLessonIds,
  onAssign
}) => {
  const [userToggledNodes, setUserToggledNodes] = useState(new Set());

  const [filterStatus, setFilterStatus] = useState('all');

  // 1. Data Processing
  const currentBookLessons = useMemo(() => {
    if (!selectedBookId) return [];
    let lessons = allLessons.filter(l => String(l.book_id) === String(selectedBookId));
    
    if (filterStatus !== 'all') {
      lessons = lessons.filter(lesson => {
        const record = progressRecords.find(p => String(p.lesson_id) === String(lesson.id) && String(p.class_id) === String(selectedClassId));
        const status = record ? record.status : 'not_started';
        let isViolated = false;
        
        if (record && status !== 'completed') {
           const today = new Date();
           today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
           const todayStr = today.toISOString().split('T')[0];
           const endD = record.target_end_date ? String(record.target_end_date).split('T')[0] : (record.target_start_date ? String(record.target_start_date).split('T')[0] : null);
           if ((record.due_date && todayStr > String(record.due_date).split('T')[0]) || (endD && todayStr > endD)) {
             isViolated = true;
           }
        }
        
        if (filterStatus === 'violated') return isViolated;
        if (filterStatus === 'not_planned') return status === 'not_started' && !isViolated;
        if (filterStatus === 'planned') return status === 'planned' && !isViolated;
        if (filterStatus === 'in_progress') return status === 'in_progress' && !isViolated;
        if (filterStatus === 'completed') return status === 'completed';
        
        return true;
      });
    }
    
    return lessons;
  }, [selectedBookId, allLessons, progressRecords, selectedClassId, filterStatus]);

  const syllabusTree = useMemo(() => {
    const tree = {};
    currentBookLessons.forEach(lesson => {
      const l1 = lesson.level1 || 'General';
      if (!tree[l1]) {
        tree[l1] = { name: l1, lessons: [], level2s: {} };
      }
      
      const l2 = lesson.level2;
      const l3 = lesson.level3;
      
      if (!l2 && !l3) {
        tree[l1].lessons.push(lesson);
      } else if (l2) {
        if (!tree[l1].level2s[l2]) {
          tree[l1].level2s[l2] = { name: l2, lessons: [], level3s: [] };
        }
        if (!l3) {
          tree[l1].level2s[l2].lessons.push(lesson);
        } else {
          tree[l1].level2s[l2].level3s.push(lesson);
        }
      }
    });
    return Object.values(tree);
  }, [currentBookLessons]);

  const leafLessons = useMemo(() => {
    const leaves = [];
    syllabusTree.forEach(l1Node => {
      leaves.push(...l1Node.lessons);
      Object.values(l1Node.level2s).forEach(l2Node => {
        leaves.push(...l2Node.lessons);
        leaves.push(...l2Node.level3s);
      });
    });
    return leaves;
  }, [syllabusTree]);

  // 2. Helpers
  const getIndexColorClass = (index) => {
    const classes = [
      'border-l-4 border-l-rose-500',
      'border-l-4 border-l-indigo-500',
      'border-l-4 border-l-emerald-500',
      'border-l-4 border-l-amber-500',
      'border-l-4 border-l-purple-500',
      'border-l-4 border-l-cyan-500',
    ];
    return classes[index % classes.length];
  };

  const getProgressRecord = (lessonId) => {
    if (!selectedClassId) return null;
    return progressRecords.find(p => String(p.lesson_id) === String(lessonId) && String(p.class_id) === String(selectedClassId));
  };

  const getLeafLessonsForLevel1 = (l1Node) => {
    const leaves = [...l1Node.lessons];
    Object.values(l1Node.level2s).forEach(l2Node => {
      leaves.push(...l2Node.lessons);
      leaves.push(...l2Node.level3s);
    });
    return leaves;
  };

  const getLevel1CheckState = (l1Node) => {
    const leaves = getLeafLessonsForLevel1(l1Node);
    if (leaves.length === 0) return 'none';
    const checkedCount = leaves.filter(l => selectedLessonIds.has(String(l.id))).length;
    if (checkedCount === 0) return 'none';
    if (checkedCount === leaves.length) return 'all';
    return 'some';
  };

  const handleLevel1CheckboxToggle = (l1Node) => {
    const checkState = getLevel1CheckState(l1Node);
    const leaves = getLeafLessonsForLevel1(l1Node);
    setSelectedLessonIds(prev => {
      const next = new Set(prev);
      if (checkState === 'all') {
        leaves.forEach(l => next.delete(String(l.id)));
      } else {
        leaves.forEach(l => next.add(String(l.id)));
      }
      return next;
    });
  };

  const handleLeafCheckboxToggle = (lessonId) => {
    setSelectedLessonIds(prev => {
      const next = new Set(prev);
      const strId = String(lessonId);
      if (next.has(strId)) next.delete(strId);
      else next.add(strId);
      return next;
    });
  };

  const toggleCollapse = (path) => {
    setUserToggledNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // 3. UI Status Badges
  const renderStatusBadge = (progress, lesson) => {
    const isRevision = lesson?.level1?.toLowerCase().includes('_revision');
    
    // Check violation
    let isViolated = false;
    if (progress && progress.status !== 'completed') {
      const today = new Date();
      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      const todayStr = today.toISOString().split('T')[0];
      const endD = progress.target_end_date ? String(progress.target_end_date).split('T')[0] : (progress.target_start_date ? String(progress.target_start_date).split('T')[0] : null);
      if ((progress.due_date && todayStr > String(progress.due_date).split('T')[0]) || (endD && todayStr > endD)) {
         isViolated = true;
      }
    }

    if (isViolated) {
      return <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm"><i className="fas fa-exclamation-triangle"></i> Violated</span>;
    }
    
    return (isRevision && progress?.status === 'completed') ? (
      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm"><i className="fas fa-check-circle"></i> Revision</span>
    ) : progress?.status === 'completed' ? (
      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm"><i className="fas fa-check-circle"></i> Completed</span>
    ) : progress?.status === 'in_progress' ? (
      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm"><i className="fas fa-spinner fa-spin"></i> In Progress ({progress.completion_percentage}%)</span>
    ) : progress?.status === 'planned' ? (
      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm"><i className="fas fa-calendar-alt"></i> Planned</span>
    ) : null;
  };

  // 4. Render Action Button or Badge
  const renderActionOrBadge = (lesson) => {
    const record = getProgressRecord(lesson.id);
    if (record && record.status !== 'not_started') {
      return renderStatusBadge(record, lesson);
    }
    return (
      <button
        draggable="true"
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', String(lesson.id));
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onClick={() => onAssign([lesson])}
        className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors text-xs cursor-grab active:cursor-grabbing flex items-center gap-1 border border-indigo-200"
        title="Drag lesson to card or click to assign"
      >
        <i className="fas fa-grip-vertical text-gray-400"></i>
        <i className="fas fa-arrow-right"></i>
      </button>
    );
  };

  if (!selectedClassId || !selectedSubjectId || !selectedBookId) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <i className="fas fa-book text-4xl text-gray-300 mb-3"></i>
        <h3 className="text-sm font-bold text-gray-500">Lessons Explorer</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Select a class, subject, and book from the top menu to view the syllabus tree here.
        </p>
      </div>
    );
  }

  const isBulkAssignEnabled = selectedLessonIds.size > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Panel Header */}
      <div className="p-3 bg-white border-b flex justify-between items-center shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-dark-primary uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-list-tree text-brand-primary"></i>
            Lessons
          </h2>
          
          {/* Status Filters */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setFilterStatus('all')} className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all ${filterStatus === 'all' ? 'bg-white shadow text-gray-400' : 'text-gray-700 hover:bg-gray-200'}`} title="All">
              <i className="fas fa-border-all"></i>
            </button>
            <button onClick={() => setFilterStatus('not_planned')} className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all ${filterStatus === 'not_planned' ? 'bg-white shadow text-gray-400' : 'text-gray-500 hover:bg-gray-200'}`} title="Not Planned">
              <i className="fas fa-circle text-[8px]"></i>
            </button>
            <button onClick={() => setFilterStatus('planned')} className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all ${filterStatus === 'planned' ? 'bg-white shadow text-gray-400' : 'text-indigo-600 hover:bg-indigo-50'}`} title="Planned">
              <i className="fas fa-calendar-alt"></i>
            </button>
            <button onClick={() => setFilterStatus('in_progress')} className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all ${filterStatus === 'in_progress' ? 'bg-white shadow text-gray-400' : 'text-amber-600 hover:bg-amber-50'}`} title="In Progress">
              <i className="fas fa-spinner"></i>
            </button>
            <button onClick={() => setFilterStatus('completed')} className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all ${filterStatus === 'completed' ? 'bg-white shadow text-gray-400' : 'text-emerald-600 hover:bg-emerald-50'}`} title="Completed">
              <i className="fas fa-check-circle"></i>
            </button>
            <button onClick={() => setFilterStatus('violated')} className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all ${filterStatus === 'violated' ? 'bg-white shadow text-gray-400' : 'text-red-600 hover:bg-red-50'}`} title="Violated">
              <i className="fas fa-exclamation-triangle"></i>
            </button>
          </div>
        </div>
        <button
          onClick={() => isBulkAssignEnabled && onAssign(leafLessons.filter(l => selectedLessonIds.has(String(l.id))))}
          disabled={!isBulkAssignEnabled}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
            isBulkAssignEnabled 
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          <i className="fas fa-layer-group"></i>
          Bulk Assign ({selectedLessonIds.size})
        </button>
      </div>

      {/* Scrollable Tree Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24 relative">
        {syllabusTree.length === 0 ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <i className="fas fa-folder-open text-4xl text-gray-300 mb-3"></i>
            <p className="text-sm text-gray-500 font-bold">{filterStatus !== 'all' ? 'No lessons match filter' : 'No Lessons Found'}</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              {filterStatus !== 'all' ? 'Try changing or clearing your status filter.' : 'There are no lessons registered for this book yet.'}
            </p>
          </div>
        ) : syllabusTree.map((l1Node, idx) => {
            const l1Path = l1Node.name;
            const isRevision = l1Path.toLowerCase().includes('_revision');
            const isL1Collapsed = isRevision ? !userToggledNodes.has(l1Path) : userToggledNodes.has(l1Path);
            const l1CheckState = getLevel1CheckState(l1Node);
            
            const l1CheckIcon = l1CheckState === 'all' 
              ? 'fa-check-square text-brand-primary' 
              : l1CheckState === 'some' 
              ? 'fa-minus-square text-brand-primary' 
              : 'fa-square text-gray-400';

            const hasChildren = Object.keys(l1Node.level2s).length > 0;

          return (
            <div key={l1Node.name} className={`bg-white rounded-xl border border-gray-200 p-2 shadow-sm space-y-1 ${getIndexColorClass(idx)} transition-all hover:shadow-md`}>
              {/* Level 1 Header */}
              <div className="flex items-center justify-between py-1.5 bg-gray-50/50 rounded pr-2">
                <div className="flex items-center min-w-0 flex-1">
                  {hasChildren ? (
                    <button 
                      onClick={() => toggleCollapse(l1Path)} 
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors mr-1"
                    >
                      <i className={`fas fa-chevron-${isL1Collapsed ? 'right' : 'down'} text-[10px] w-3`}></i>
                    </button>
                  ) : <div className="w-5 mr-1" />}
                  
                  <button 
                    onClick={() => handleLevel1CheckboxToggle(l1Node)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors mr-1.5 flex-shrink-0"
                  >
                    <i className={`far ${l1CheckIcon} text-base`}></i>
                  </button>

                  <span className={`font-bold text-sm truncate ${l1CheckState !== 'none' ? 'bg-brand-primary text-white px-1.5 rounded' : 'text-gray-800'}`} title={l1Node.name}>
                    {l1Node.name}
                  </span>
                </div>

                {!hasChildren && l1Node.lessons[0] && (
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {renderActionOrBadge(l1Node.lessons[0])}
                  </div>
                )}
              </div>

              {/* Level 1 Children Content */}
              {!isL1Collapsed && hasChildren && (
                <div className="pl-4 border-l-2 border-gray-100 ml-2 mt-1 space-y-1 pb-1">
                  {Object.values(l1Node.level2s).map(l2Node => {
                    const l2Path = `${l1Path}/${l2Node.name}`;
                    const isL2Revision = l2Node.name.toLowerCase().includes('_revision');
                    const isL2Collapsed = isL2Revision ? !userToggledNodes.has(l2Path) : userToggledNodes.has(l2Path);
                    const hasL3 = l2Node.level3s.length > 0;
                    
                    const isL2Selected = !hasL3 && l2Node.lessons[0] && selectedLessonIds.has(String(l2Node.lessons[0].id));
                    
                    return (
                      <div key={l2Node.name} className="space-y-1">
                        {/* Level 2 Header */}
                        <div className="flex items-center justify-between py-1 hover:bg-gray-50 rounded pr-2 transition-colors">
                          <div className="flex items-center min-w-0 flex-1">
                            {hasL3 ? (
                              <button 
                                onClick={() => toggleCollapse(l2Path)} 
                                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors mr-1"
                              >
                                <i className={`fas fa-chevron-${isL2Collapsed ? 'right' : 'down'} text-[9px] w-3`}></i>
                              </button>
                            ) : (
                              <i className="fas fa-level-up-alt rotate-90 text-gray-300 ml-1 mr-2 text-[10px]"></i>
                            )}

                            {!hasL3 && l2Node.lessons[0] && (
                              <button 
                                onClick={() => handleLeafCheckboxToggle(l2Node.lessons[0].id)}
                                className="p-0.5 hover:bg-gray-200 rounded transition-colors mr-1 flex-shrink-0"
                              >
                                <i className={`far ${isL2Selected ? 'fa-check-square text-brand-primary' : 'fa-square text-gray-400'} text-sm`}></i>
                              </button>
                            )}

                            <span className={`text-xs font-semibold truncate ${isL2Selected ? 'bg-brand-primary text-white px-1.5 rounded py-0.5' : 'text-gray-700'}`} title={l2Node.name}>
                              {l2Node.name}
                            </span>
                          </div>

                          {!hasL3 && l2Node.lessons[0] && (
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {renderActionOrBadge(l2Node.lessons[0])}
                            </div>
                          )}
                        </div>

                        {/* Level 3 Content */}
                        {!isL2Collapsed && hasL3 && (
                          <div className="pl-4 border-l border-gray-200 ml-2 space-y-1 py-1">
                            {l2Node.level3s.map(l3Lesson => {
                              const isL3Selected = selectedLessonIds.has(String(l3Lesson.id));
                              return (
                              <div key={l3Lesson.id} className="flex items-center justify-between py-1 hover:bg-gray-50 rounded pr-2 transition-colors">
                                <div className="flex items-center min-w-0 flex-1">
                                  <i className="fas fa-level-up-alt rotate-90 text-gray-200 mr-2 text-[9px] ml-1"></i>
                                  
                                  <button 
                                    onClick={() => handleLeafCheckboxToggle(l3Lesson.id)}
                                    className="p-0.5 hover:bg-gray-200 rounded transition-colors mr-1 flex-shrink-0"
                                  >
                                    <i className={`far ${isL3Selected ? 'fa-check-square text-brand-primary' : 'fa-square text-gray-400'} text-xs`}></i>
                                  </button>

                                  <span className={`text-[11px] truncate ${isL3Selected ? 'font-bold bg-brand-primary text-white px-1.5 rounded py-0.5' : 'font-medium text-gray-600'}`} title={l3Lesson.level3}>
                                    {l3Lesson.level3}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  {renderActionOrBadge(l3Lesson)}
                                </div>
                              </div>
                            )})}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SyllabusTreePanel;
