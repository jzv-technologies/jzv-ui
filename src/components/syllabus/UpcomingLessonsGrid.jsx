import React, { useState } from 'react';
import { CARD_THEMES } from '../../utils/cardTheme';

const UpcomingLessonsGrid = ({
  role,
  student,
  teacher,
  upcomingGroupingMode = 'subject_date',
  upcomingStartDate,
  upcomingEndDate,
  upFilterTeachers = [],
  upFilterClasses = [],
  upFilterClassifications = [],
  upFilterSubjects = [],
  upFilterBooks = [],
  lessonPlans = [],
  classifications = [],
  teachers = [],
  assignments = [],
  subjects = [],
  handleSubmitPlannedLesson = () => {},
  handleCarryForward = () => {},
}) => {
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];

  const getPlanTeacherId = (p) => {
    const assignment = assignments.find(
      (a) =>
        String(a.class_id) === String(p.class_id) && String(a.subject_id) === String(p.subject_id)
    );
    return assignment ? String(assignment.teacher_id) : null;
  };

  const matchesMetadataFilters = (p) => {
    const planTeacherId = getPlanTeacherId(p);

    // Role constraints
    if (role === 'parent') {
      if (String(p.class_id) !== String(student?.class_id)) return false;
    }
    if (role === 'teacher') {
      if (!teacher || String(planTeacherId) !== String(teacher.id)) {
        return false;
      }
    }

    if (
      upFilterTeachers.length > 0 &&
      (!planTeacherId || !upFilterTeachers.includes(String(planTeacherId)))
    ) {
      return false;
    }
    if (upFilterClasses.length > 0 && !upFilterClasses.includes(String(p.class_id))) {
      return false;
    }
    if (upFilterClassifications.length > 0) {
      const subj = subjects.find((s) => String(s.id) === String(p.subject_id));
      if (!subj || !upFilterClassifications.includes(String(subj.classification_id))) {
        return false;
      }
    }
    if (upFilterSubjects.length > 0 && !upFilterSubjects.includes(String(p.subject_id))) {
      return false;
    }
    if (upFilterBooks.length > 0 && !upFilterBooks.includes(String(p.book_id))) {
      return false;
    }

    return true;
  };

  // 1. Get Delayed plans (Start Delayed & Completion Delayed) for Teachers, Management, Admin
  const isEligibleForActionRequired =
    role === 'teacher' || role === 'management' || role === 'admin';

  const startDelayedLessons = isEligibleForActionRequired
    ? lessonPlans.filter((p) => {
        if (p.status !== 'planned' || !p.target_date || p.target_date >= todayStr) {
          return false;
        }
        return matchesMetadataFilters(p);
      })
    : [];

  const completionDelayedLessons = isEligibleForActionRequired
    ? lessonPlans.filter((p) => {
        if (p.status !== 'in_progress') return false;
        const endDate = p.target_end_date || p.target_date;
        if (!endDate || endDate >= todayStr) return false;
        return matchesMetadataFilters(p);
      })
    : [];

  // 2. Get normal upcoming plans (filtered by date range)
  const upcoming = lessonPlans.filter((p) => {
    // Date boundary
    if (!p.target_date || p.target_date < upcomingStartDate || p.target_date > upcomingEndDate) {
      return false;
    }
    // Status planned, in_progress or completed
    if (p.status !== 'planned' && p.status !== 'in_progress' && p.status !== 'completed') {
      return false;
    }
    if (!matchesMetadataFilters(p)) {
      return false;
    }

    // Exclude if already shown in Action Required section to avoid duplicates
    const isStartDelayed = p.status === 'planned' && p.target_date < todayStr;
    const endDate = p.target_end_date || p.target_date;
    const isCompletionDelayed = p.status === 'in_progress' && endDate && endDate < todayStr;
    if (isEligibleForActionRequired && (isStartDelayed || isCompletionDelayed)) {
      return false;
    }

    return true;
  });

  const renderCard = (plan, delayedType = null) => {
    const title = [plan.lesson?.level1, plan.lesson?.level2, plan.lesson?.level3]
      .filter(Boolean)
      .join(' > ');

    const planTeacherId = getPlanTeacherId(plan);
    const teacherRecord = planTeacherId
      ? teachers.find((t) => String(t.id) === String(planTeacherId))
      : null;
    const teacherName = teacherRecord ? teacherRecord.name : '';

    const classificationId = plan.subject?.classification_id;
    const classification = classifications.find((c) => String(c.id) === String(classificationId));
    const themeStyles =
      classification?.theme && CARD_THEMES[classification.theme]
        ? CARD_THEMES[classification.theme]
        : CARD_THEMES.charcoal;

    const CLASS_THEME_KEYS = [
      'blue',
      'teal',
      'pink',
      'green',
      'orange',
      'purple',
      'pine',
      'olive',
      'indigo',
      'amber',
      'emerald',
      'rose',
      'cyan',
    ];
    const classNameStr = String(plan.class?.name || plan.class?.class_name || '');
    let hash = 0;
    for (let i = 0; i < classNameStr.length; i++) {
      hash = classNameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const classThemeIndex = Math.abs(hash) % CLASS_THEME_KEYS.length;
    const classThemeKey = CLASS_THEME_KEYS[classThemeIndex];
    const classStyles = CARD_THEMES[classThemeKey] || CARD_THEMES.charcoal;

    const dateObj = new Date(plan.target_date);
    const weekday = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
    const dayVal = String(dateObj.getDate()).padStart(2, '0');
    const monthVal = dateObj.toLocaleDateString(undefined, { month: 'short' });
    const formattedDate = `${weekday}, ${dayVal}/${monthVal}`;

    return (
      <div
        key={plan.id}
        className={`bg-white border border-light-border border-${themeStyles.color} border-l-[6px] rounded-xl p-4 shadow-sm flex flex-col justify-between border-l-${themeStyles.color} text-left`}
      >
        <div className="flex justify-between items-start mb-2">
          <div
            className={`rounded-md bg-${classStyles.color} text-${classStyles.bg} text-xs font-bold px-2 py-0.5`}
          >
            {role !== 'parent' && `${plan.class?.name || plan.class?.class_name || '—'} `}
          </div>
          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {formattedDate}
          </span>
          <div className="flex flex-wrap gap-1">
            {delayedType === 'start_delayed' && (
              <span className="text-[10px] text-amber-900 font-extrabold bg-amber-200/90 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                <i className="fas fa-hourglass-start text-[9px]" /> Start Delayed
              </span>
            )}
            {delayedType === 'completion_delayed' && (
              <span className="text-[10px] text-rose-900 font-extrabold bg-rose-200/90 px-2 py-0.5 rounded border border-rose-300 flex items-center gap-1">
                <i className="fas fa-hourglass-half text-[9px]" /> Completion Delayed
              </span>
            )}
            {!delayedType && plan.status === 'in_progress' && (
              <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                In Progress
              </span>
            )}
            {!delayedType && plan.status === 'completed' && (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                Completed
              </span>
            )}
            {plan.replan_counter > 0 && (
              <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">
                Replan x{plan.replan_counter}
              </span>
            )}
            {plan.carry_forward_counter > 0 && (
              <span className="text-[10px] text-orange-650 font-bold bg-orange-50 px-2 py-0.5 rounded">
                CF x{plan.carry_forward_counter}
              </span>
            )}
            {!plan.replan_counter &&
              !plan.carry_forward_counter &&
              plan.carry_forward_count > 0 &&
              !delayedType && (
                <span className="text-[10px] text-orange-650 font-bold bg-orange-50 px-2 py-0.5 rounded">
                  Delayed
                </span>
              )}
          </div>
        </div>
        <div className="flex-1 min-h-[4.5rem]">
          <p className="text-[10px] text-gray-450 font-bold mb-2 uppercase">
            {plan.subject?.name} • {plan.book?.name}
          </p>
          <h2 className="font-bold text-md text-dark-primary mb-1 line-clamp-2">{title}</h2>
          <p className={`text-xs text-${themeStyles.color} font-bold mb-2 uppercase`}>
            {role !== 'parent' && role !== 'teacher' && teacherName && `${teacherName}`}
          </p>

          {role === 'teacher' &&
            (editingPlanId === plan.id ? (
              <div className="flex flex-col gap-1.5 mt-auto pt-3 border-t border-gray-100">
                <span className="text-[10px] font-bold text-gray-500">
                  {plan.status === 'planned' ? 'New Start Date:' : 'New End Date:'}
                </span>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="flex-1 text-[11px] border border-gray-300 rounded px-1.5 py-0.5 outline-none font-semibold text-gray-700 bg-white"
                  />
                  <button
                    onClick={() => {
                      if (!newDate) return;
                      if (plan.status === 'planned') {
                        handleCarryForward(plan, newDate, null);
                      } else {
                        handleCarryForward(plan, null, newDate);
                      }
                      setEditingPlanId(null);
                    }}
                    className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold px-2 py-0.5 rounded text-[10px]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPlanId(null)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                {plan.status === 'planned' && (
                  <button
                    onClick={() => handleSubmitPlannedLesson(plan)}
                    className="flex-1 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-750 transition-colors cursor-pointer text-center"
                  >
                    <i className="fas fa-check mr-1"></i> Add Progress
                  </button>
                )}
                {plan.status === 'in_progress' && (
                  <button
                    onClick={() => handleSubmitPlannedLesson(plan)}
                    className="flex-1 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-750 transition-colors cursor-pointer text-center"
                  >
                    <i className="fas fa-check mr-1"></i> Update Progress
                  </button>
                )}
                {plan.status === 'completed' && (
                  <button
                    onClick={() => handleSubmitPlannedLesson(plan)}
                    className="flex-1 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-750 transition-colors cursor-pointer text-center"
                  >
                    <i className="fas fa-history mr-1"></i> Add Revision
                  </button>
                )}
                {plan.status === 'planned' ? (
                  <button
                    onClick={() => {
                      setEditingPlanId(plan.id);
                      setNewDate(plan.target_date || new Date().toISOString().split('T')[0]);
                    }}
                    className="flex-1 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-center"
                  >
                    <i className="fas fa-edit mr-1"></i> Change Plan
                  </button>
                ) : plan.status === 'in_progress' ? (
                  <button
                    onClick={() => {
                      setEditingPlanId(plan.id);
                      setNewDate(
                        plan.target_end_date ||
                          plan.target_start_date ||
                          new Date().toISOString().split('T')[0]
                      );
                    }}
                    className="flex-1 py-1.5 bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold rounded-lg hover:bg-pink-100 transition-colors cursor-pointer text-center"
                  >
                    <i className="fas fa-edit mr-1"></i> Change End Date
                  </button>
                ) : null}
              </div>
            ))}
        </div>
      </div>
    );
  };

  const hasActionRequired = startDelayedLessons.length > 0 || completionDelayedLessons.length > 0;

  // Group by Date (ascending) and sort by sub-filters
  const sortedPlans = [...upcoming].sort((a, b) => {
    if (upcomingGroupingMode === 'subject_class') {
      const subjA = a.subject?.name || '';
      const subjB = b.subject?.name || '';
      const compSubj = subjA.localeCompare(subjB);
      if (compSubj !== 0) return compSubj;

      const classA = a.class?.name || a.class?.class_name || '';
      const classB = b.class?.name || b.class?.class_name || '';
      return classA.localeCompare(classB);
    } else {
      // Default: class_subject
      const classA = a.class?.name || a.class?.class_name || '';
      const classB = b.class?.name || b.class?.class_name || '';
      const compClass = classA.localeCompare(classB);
      if (compClass !== 0) return compClass;

      const subjA = a.subject?.name || '';
      const subjB = b.subject?.name || '';
      return subjA.localeCompare(subjB);
    }
  });

  const grouped = {};
  sortedPlans.forEach((plan) => {
    const key = plan.target_date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(plan);
  });
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-8 text-left">
      {hasActionRequired && (
        <div className="p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-rose-500/10 border border-amber-200/80 rounded-2xl space-y-4">
          <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
            <i className="fas fa-exclamation-triangle text-amber-600 animate-pulse"></i> Action
            Required
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {startDelayedLessons.length > 0 && (
              <div className="space-y-3 p-4 bg-amber-100/80 border border-amber-300/80 rounded-2xl">
                <div className="flex items-center gap-2 text-[10px] font-black text-amber-950 uppercase tracking-wider">
                  <span className="w-2 h-2 bg-amber-600 rounded-full animate-ping"></span>
                  <i className="fas fa-hourglass-start text-amber-700 text-xs"></i>
                  Start Delayed ({startDelayedLessons.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  {startDelayedLessons.map((plan) => renderCard(plan, 'start_delayed'))}
                </div>
              </div>
            )}

            {completionDelayedLessons.length > 0 && (
              <div className="space-y-3 p-4 bg-rose-100/80 border border-rose-300/80 rounded-2xl">
                <div className="flex items-center gap-2 text-[10px] font-black text-rose-950 uppercase tracking-wider">
                  <span className="w-2 h-2 bg-rose-600 rounded-full animate-ping"></span>
                  <i className="fas fa-hourglass-half text-rose-700 text-xs"></i>
                  Completion Delayed ({completionDelayedLessons.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  {completionDelayedLessons.map((plan) => renderCard(plan, 'completion_delayed'))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {upcoming.length === 0 && !hasActionRequired ? (
        <div className="text-center py-12 bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
          No upcoming lessons planned matching your filters.
        </div>
      ) : (
        sortedDates.map((dateKey) => {
          const dateDisplay = new Date(dateKey).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          return (
            <div key={dateKey} className="space-y-4">
              <h3 className="text-sm font-black text-dark-soft border-l-[3px] border-brand-primary pl-2 uppercase tracking-wider">
                {dateDisplay}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {grouped[dateKey].map((plan) => renderCard(plan))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default UpcomingLessonsGrid;
