import React from 'react';

const SyllabusTeacherAdherence = ({
  teachers = [],
  lessonPlans = [],
  assignments = [],
  books = [],
  subjects = [],
}) => {
  const bookSubjectMap = new Map((books || []).map((b) => [String(b.id), String(b.subject_id)]));

  // Mapping of (class_id + subject_id) -> teacher_id
  const assignmentTeacherMap = new Map();
  (assignments || []).forEach((a) => {
    assignmentTeacherMap.set(`${a.class_id}-${a.subject_id}`, String(a.teacher_id));
  });

  const getPlanTeacherId = (plan) => {
    if (plan.teacher_id) return String(plan.teacher_id);
    const subjectId = plan.subject_id || bookSubjectMap.get(String(plan.book_id));
    if (plan.class_id && subjectId) {
      return assignmentTeacherMap.get(`${plan.class_id}-${subjectId}`);
    }
    return null;
  };

  const teacherStats = teachers
    .map((t) => {
      const teacherId = String(t.teacher_id || t.id);
      const tPlans = lessonPlans.filter((p) => {
        const planTeacherId = getPlanTeacherId(p);
        return planTeacherId === teacherId;
      });

      const totalPlans = tPlans.length;
      const completedPlans = tPlans.filter(
        (p) => p.status === 'completed' || Number(p.completion_percentage || p.progress || 0) >= 100
      ).length;
      const inProgressPlans = tPlans.filter(
        (p) =>
          (p.status === 'in_progress' || p.status === 'active') &&
          Number(p.completion_percentage || p.progress || 0) < 100
      ).length;
      const pendingPlans = Math.max(0, totalPlans - completedPlans - inProgressPlans);
      const completionRate = totalPlans > 0 ? ((completedPlans / totalPlans) * 100).toFixed(0) : '-';

      return {
        ...t,
        teacherId,
        totalPlans,
        completedPlans,
        inProgressPlans,
        pendingPlans,
        completionRate,
      };
    })
    .filter((stat) => stat.totalPlans > 0 || (assignments || []).some((a) => String(a.teacher_id) === stat.teacherId))
    .sort((a, b) => b.totalPlans - a.totalPlans || Number(b.completionRate || 0) - Number(a.completionRate || 0));

  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 sm:p-5 text-left overflow-x-auto">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-dark-primary text-sm flex items-center gap-2">
            <i className="fas fa-user-check text-brand-primary"></i>
            Teacher Planning Adherence
          </h3>
          <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
            Lesson plan execution and completion breakdown per assigned teacher.
          </p>
        </div>
        <div className="text-xs text-gray-500 font-semibold bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
          {teacherStats.length} Assigned Teachers
        </div>
      </div>

      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-gray-50 border-y border-light-border text-dark-muted font-extrabold text-[10px] uppercase tracking-wider">
            <th className="px-4 py-3 border-r border-light-border">Teacher</th>
            <th className="px-4 py-3 text-center">Total Planned</th>
            <th className="px-4 py-3 text-center">Completed</th>
            <th className="px-4 py-3 text-center">In Progress</th>
            <th className="px-4 py-3 text-center">Pending</th>
            <th className="px-4 py-3 text-center">Completion Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {teacherStats.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center py-8 text-gray-400 font-medium">
                No teacher lesson plans found.
              </td>
            </tr>
          ) : (
            teacherStats.map((stat) => (
              <tr key={stat.teacherId} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-bold text-dark-primary border-r border-light-border">
                  {stat.name || `Teacher ${stat.teacherId}`}
                </td>
                <td className="px-4 py-3 text-center font-bold text-gray-700">{stat.totalPlans}</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-bold">
                  {stat.completedPlans}
                </td>
                <td className="px-4 py-3 text-center text-blue-600 font-semibold">
                  {stat.inProgressPlans}
                </td>
                <td className="px-4 py-3 text-center text-amber-600 font-semibold">
                  {stat.pendingPlans > 0 ? stat.pendingPlans : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {stat.completionRate === '-' ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                        Number(stat.completionRate) >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : Number(stat.completionRate) >= 50
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {stat.completionRate}%
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
