import React from 'react';

const PlannedForToday = ({
  todaysPlans = [],
  handleSubmitPlannedLesson = () => {},
  handleCarryForward = () => {},
}) => {
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
              <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleSubmitPlannedLesson(plan)}
                  className="flex-1 py-1.5 bg-brand-primary text-white text-[10px] font-bold rounded-lg hover:bg-brand-primary/90 transition-colors cursor-pointer"
                >
                  <i className="fas fa-check mr-1"></i> Submit Log
                </button>
                <button
                  onClick={() => handleCarryForward(plan)}
                  className="flex-1 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
                >
                  <i className="fas fa-forward mr-1"></i> Carry Forward
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlannedForToday;
