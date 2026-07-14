import React from 'react';

const SyllabusTeacherAdherence = ({ teachers = [], lessonPlans = [], carryForwards = [] }) => {
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setDate(now.getDate() - 30);
  const oneYearAgo = new Date(now);
  oneYearAgo.setDate(now.getDate() - 365);

  const teacherStats = teachers
    .map((t) => {
      const tPlans = lessonPlans.filter((p) => String(p.teacher_id) === String(t.id));
      const totalPlans = tPlans.length;
      const completedPlans = tPlans.filter((p) => p.status === 'completed').length;

      const tCarryForwards = carryForwards.filter((c) => String(c.teacher_id) === String(t.id));

      const cfWeek = tCarryForwards.filter((c) => new Date(c.created_at) >= oneWeekAgo).length;
      const cfMonth = tCarryForwards.filter((c) => new Date(c.created_at) >= oneMonthAgo).length;
      const cfYear = tCarryForwards.filter((c) => new Date(c.created_at) >= oneYearAgo).length;

      const carryForwardTotal = tCarryForwards.length;

      const accuracy =
        totalPlans > 0 ? Math.max(0, 100 - (carryForwardTotal / totalPlans) * 20) : 0;
      return {
        ...t,
        totalPlans,
        completedPlans,
        carryForwardTotal,
        cfWeek,
        cfMonth,
        cfYear,
        accuracy: totalPlans > 0 ? accuracy.toFixed(0) : '-',
      };
    })
    .sort((a, b) => b.totalPlans - a.totalPlans);

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-4 text-left overflow-x-auto">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-gray-700 text-sm">Teacher Planning Adherence</h3>
        <div className="text-xs text-gray-500 font-semibold bg-gray-50 px-3 py-1.5 rounded-full border">
          Metrics derived from automated Carry-Forward tracking
        </div>
      </div>
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-gray-50 border-y border-light-border text-dark-muted font-extrabold text-[10px] uppercase tracking-wider">
            <th className="px-4 py-3 border-r">Teacher</th>
            <th className="px-4 py-3 text-center border-r" colSpan="2">
              Overall Planning
            </th>
            <th className="px-4 py-3 text-center border-r" colSpan="4">
              Carry Forward Analytics
            </th>
            <th className="px-4 py-3 text-center">Health</th>
          </tr>
          <tr className="bg-gray-50 border-b border-light-border text-dark-muted font-bold text-[9px] uppercase tracking-wider">
            <th className="px-4 py-2 border-r"></th>
            <th className="px-4 py-2 text-center text-gray-500">Total Planned</th>
            <th className="px-4 py-2 text-center text-gray-500 border-r">Completed</th>

            <th className="px-4 py-2 text-center text-orange-600/80">7 Days</th>
            <th className="px-4 py-2 text-center text-orange-600/80">30 Days</th>
            <th className="px-4 py-2 text-center text-orange-600/80">Year</th>
            <th className="px-4 py-2 text-center text-orange-700 border-r">Lifetime Total</th>

            <th className="px-4 py-2 text-center">Accuracy %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {teacherStats.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center py-8 text-gray-500">
                No teacher data.
              </td>
            </tr>
          ) : (
            teacherStats.map((stat) => (
              <tr key={stat.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-bold text-dark-primary border-r">{stat.name}</td>
                <td className="px-4 py-3 text-center text-gray-600">{stat.totalPlans}</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-bold border-r">
                  {stat.completedPlans}
                </td>

                <td className="px-4 py-3 text-center text-orange-500 font-semibold">
                  {stat.cfWeek}
                </td>
                <td className="px-4 py-3 text-center text-orange-500 font-semibold">
                  {stat.cfMonth}
                </td>
                <td className="px-4 py-3 text-center text-orange-500 font-semibold">
                  {stat.cfYear}
                </td>
                <td className="px-4 py-3 text-center text-orange-600 font-bold border-r">
                  {stat.carryForwardTotal}
                </td>

                <td className="px-4 py-3 text-center bg-gray-50/30">
                  {stat.accuracy === '-' ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${stat.accuracy >= 80 ? 'bg-emerald-100 text-emerald-700' : stat.accuracy >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {stat.accuracy}%
                    </span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SyllabusTeacherAdherence;
