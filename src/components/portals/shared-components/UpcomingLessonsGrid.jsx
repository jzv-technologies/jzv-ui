import React, { useState } from 'react';
import { CARD_THEMES } from '../../../utils/cardTheme';

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
  const upcoming = lessonPlans.filter((p) => {
    // Date boundary
    if (!p.target_date || p.target_date < upcomingStartDate || p.target_date > upcomingEndDate) {
      return false;
    }
    // Status planned, in_progress or completed
    if (p.status !== 'planned' && p.status !== 'in_progress' && p.status !== 'completed') {
      return false;
    }

    // Find the teacher ID for this class and subject from assignments
    const assignment = assignments.find(
      (a) =>
        String(a.class_id) === String(p.class_id) && String(a.subject_id) === String(p.subject_id)
    );
    const planTeacherId = assignment ? String(assignment.teacher_id) : null;

    // Role constraints
    if (role === 'parent') {
      return String(p.class_id) === String(student?.class_id);
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
  });

  const renderCard = (plan) => {
    const title = [plan.lesson?.level1, plan.lesson?.level2, plan.lesson?.level3]
      .filter(Boolean)
      .join(' > ');

    const classificationId = plan.subject?.classification_id;
    const classification = classifications.find((c) => String(c.id) === String(classificationId));
    const themeStyles =
      classification?.theme && CARD_THEMES[classification.theme]
        ? CARD_THEMES[classification.theme]
        : CARD_THEMES.charcoal;

    return (
      <div
        key={plan.id}
        className={`bg-white border border-light-border border-l-[6px] rounded-xl p-4 shadow-sm flex flex-col justify-between border-l-${themeStyles.color} text-left`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className={`rounded-md bg-${themeStyles.bg} text-${themeStyles.color} px-2 py-0.5`}>
            {role !== 'parent' && `${plan.class?.name || plan.class?.class_name || '—'} `}
          </div>
          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            Planned for {new Date(plan.target_date).toLocaleDateString()}
          </span>
          <div className="flex gap-1">
            {plan.status === 'in_progress' && (
              <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                In Progress
              </span>
            )}
            {plan.status === 'completed' && (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                Completed
              </span>
            )}
            {plan.carry_forward_count > 0 && (
              <span className="text-[10px] text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded">
                Delayed
              </span>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-500 font-semibold mt-1 mb-3">
          {role !== 'parent' &&
            role !== 'teacher' &&
            plan.teacher?.name &&
            ` • ${plan.teacher.name}`}
        </p>
        <h4 className="font-bold text-sm text-dark-primary mb-1 line-clamp-2" title={title}>
          {plan.subject?.name} <i className={`text-${themeStyles.color} fa fa-arrow-right`}></i>{' '}
          {plan.book?.name} <i className={`text-${themeStyles.color} fa fa-arrow-right`}></i>{' '}
          {title}
        </h4>

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
    );
  };

  if (upcoming.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
        No upcoming lessons planned matching your filters.
      </div>
    );
  }

  if (upcomingGroupingMode === 'subject_date') {
    // Group by Subject and sort by date ascending
    const sortedPlans = [...upcoming].sort((a, b) => a.target_date.localeCompare(b.target_date));
    const grouped = {};
    sortedPlans.forEach((plan) => {
      const key = plan.subject?.name || 'Other / General';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(plan);
    });
    const sortedSubjs = Object.keys(grouped).sort();

    return (
      <div className="space-y-8 text-left">
        {sortedSubjs.map((subjName) => (
          <div key={subjName} className="space-y-4">
            <h3 className="text-sm font-black text-dark-soft border-l-[3px] border-brand-primary pl-2 uppercase tracking-wider">
              {subjName}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {grouped[subjName].map((plan) => renderCard(plan))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Group by Date and sort by subject name
  const sortedPlans = [...upcoming].sort((a, b) => {
    const nameA = a.subject?.name || '';
    const nameB = b.subject?.name || '';
    return nameA.localeCompare(nameB);
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
      {sortedDates.map((dateKey) => {
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
      })}
    </div>
  );
};

export default UpcomingLessonsGrid;
