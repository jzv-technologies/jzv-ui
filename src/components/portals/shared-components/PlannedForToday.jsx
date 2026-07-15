import React, { useState } from 'react';

const PlannedForToday = ({
  todaysPlans = [],
  handleSubmitPlannedLesson = () => {},
  handleCarryForward = () => {},
}) => {
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [newDate, setNewDate] = useState('');
  if (!todaysPlans || todaysPlans.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-sm font-black text-dark-primary mb-4 flex items-center gap-2 text-left">
        <i className="fas fa-calendar-check text-brand-primary"></i> Planned for Today
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {todaysPlans.map((plan) => {
          const title = [plan.lesson?.level1, plan.lesson?.level2, plan.lesson?.level3]
            .filter(Boolean)
            .join(' > ');
          return (
            <div
              key={plan.id}
              className="bg-white border border-brand-primary/20 rounded-xl p-4 shadow-sm flex flex-col justify-between"
            >
              <div className="text-left">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-extrabold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full uppercase">
                    {plan.class?.name || plan.class?.class_name}
                  </span>
                  {plan.carry_forward_count > 0 && (
                    <span
                      className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full"
                      title="Carried Forward"
                    >
                      CF x{plan.carry_forward_count}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-sm text-dark-primary mb-1 line-clamp-2">{title}</h4>
                <p className="text-[11px] text-gray-500 font-semibold mb-3">
                  {plan.subject?.name} • {plan.book?.name}
                </p>
              </div>
              {editingPlanId === plan.id ? (
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
                      className="bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded text-[10px]"
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
                      className="flex-1 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-750 transition-colors cursor-pointer"
                    >
                      <i className="fas fa-check mr-1"></i> Add Progress
                    </button>
                  )}
                  {plan.status === 'in_progress' && (
                    <button
                      onClick={() => handleSubmitPlannedLesson(plan)}
                      className="flex-1 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-750 transition-colors cursor-pointer"
                    >
                      <i className="fas fa-check mr-1"></i> Update Progress
                    </button>
                  )}
                  {plan.status === 'completed' && (
                    <button
                      onClick={() => handleSubmitPlannedLesson(plan)}
                      className="flex-1 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-750 transition-colors cursor-pointer"
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
                      className="flex-1 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <i className="fas fa-edit mr-1"></i> Change Plan
                    </button>
                  ) : plan.status === 'in_progress' ? (
                    <button
                      onClick={() => {
                        setEditingPlanId(plan.id);
                        setNewDate(plan.target_end_date || plan.target_start_date || new Date().toISOString().split('T')[0]);
                      }}
                      className="flex-1 py-1.5 bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold rounded-lg hover:bg-pink-100 transition-colors cursor-pointer"
                    >
                      <i className="fas fa-edit mr-1"></i> Change End Date
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlannedForToday;
