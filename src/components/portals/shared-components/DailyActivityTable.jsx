import React from 'react';
import MultiSelectDropdown from './MultiSelectDropdown';
import { CARD_THEMES } from '../../../utils/cardTheme';

const getStatusBadge = (status, isRev = false) => {
  if (isRev)
    return (
      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">
        Revision
      </span>
    );
  if (status === 'completed')
    return (
      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
        Completed
      </span>
    );
  if (status === 'in_progress')
    return (
      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
        In Progress
      </span>
    );
  return (
    <span className="bg-gray-150 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border">
      Not Started
    </span>
  );
};

const DailyActivityTable = ({
  role,
  student,
  activeTab,
  dailyEntries = [],
  dailyLoading = false,
  classes = [],
  subjects = [],
  books = [],
  teachers = [],
  classifications = [],
  filterClasses = [],
  setFilterClasses = () => {},
  filterSubjects = [],
  setFilterSubjects = () => {},
  filterBooks = [],
  setFilterBooks = () => {},
  filterTeachers = [],
  setFilterTeachers = () => {},
  filterTopic = '',
  setFilterTopic = () => {},
  filterStatus = '',
  setFilterStatus = () => {},
  clearDailyFilters = () => {},
  filteredDailyEntries = [],
  handleDeleteClick,
  isCreatedToday, // optional teacher callback to restrict deletes
}) => {
  const renderDailyActivityTiles = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDailyEntries.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white border border-dashed rounded-2xl text-gray-500 font-semibold text-sm">
            {activeTab === 'today-class'
              ? 'No class logs recorded for today.'
              : 'No class logs recorded for the last 2 weeks.'}
          </div>
        ) : (
          filteredDailyEntries.map((entry) => {
            const rawPct = Number(entry.progress);
            const pct = Number.isNaN(rawPct) ? 0 : rawPct;
            const status = entry.current_status || 'not_started';

            // Resolve subject colors for left border
            const classificationId = entry.subject?.classification_id;
            const classification = classifications.find(
              (c) => String(c.id) === String(classificationId)
            );
            const themeStyles =
              classification?.theme && CARD_THEMES[classification.theme]
                ? CARD_THEMES[classification.theme]
                : CARD_THEMES.charcoal;

            return (
              <div
                key={entry.id}
                className={`p-5 bg-white border border-light-border border-l-[6px] border-l-${themeStyles.color} rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2 text-left">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block mb-0.5">
                        {entry.subject?.name || 'Subject'}
                      </span>
                      <h4
                        className="text-sm font-black text-dark-primary truncate"
                        title={entry.book?.name || ''}
                      >
                        {entry.book?.name || 'Syllabus Book'}
                      </h4>
                    </div>
                    {getStatusBadge(status, entry.isRevision)}
                  </div>

                  <div className="space-y-2 mb-4 text-left">
                    <div className="text-xs">
                      <span className="text-gray-400 font-medium block">Topic / Path</span>
                      <span
                        className="font-bold text-dark-charcoal line-clamp-2"
                        title={entry.lessonPath}
                      >
                        {entry.lessonPath || '—'}
                      </span>
                    </div>

                    {entry.comments && (
                      <div className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-2">
                        <span className="text-gray-400 font-medium block text-[10px] uppercase tracking-wider mb-0.5">
                          Teacher's Remarks
                        </span>
                        <p className="font-bold text-gray-600 text-xs leading-relaxed italic">
                          "{entry.comments}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-3 mt-auto flex flex-col gap-2 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                        <i className="fas fa-user-tie"></i>
                      </div>
                      <span
                        className="font-extrabold text-blue-600 truncate"
                        title={entry.teacher?.name || ''}
                      >
                        {entry.teacher?.name || '—'}
                      </span>
                    </div>

                    {!entry.isRevision && (
                      <span className="font-black text-dark-primary bg-gray-100 px-2 py-0.5 rounded text-[10px]">
                        Progress: {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {!entry.isRevision && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-0.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500 bg-brand-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  if (dailyLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white border border-light-border rounded-2xl shadow-sm">
        <div className="w-6 h-6 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mr-2" />
        <span className="text-xs font-bold text-gray-500">
          {role === 'parent' ? "Loading today's class..." : 'Loading daily activity...'}
        </span>
      </div>
    );
  }

  if (role === 'parent' && activeTab === 'today-class') {
    return renderDailyActivityTiles();
  }

  // Options mapping for MultiSelectDropdowns
  const classOpts = classes.map((c) => ({ id: String(c.id), label: c.name || c.class_name }));
  const subjectOpts = subjects.map((s) => ({ id: String(s.id), label: s.name }));
  const bookOpts = books.map((b) => ({ id: String(b.id), label: b.name }));
  const teacherOpts = teachers.map((t) => ({ id: String(t.id), label: t.name }));
  const isParent = role === 'parent';

  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden space-y-4 p-4 text-left">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            {isParent ? (
              <tr className="bg-gray-50 border-b border-light-border text-dark-muted font-extrabold text-[10px] uppercase tracking-wider whitespace-nowrap">
                <th className="px-4 py-3 min-w-[90px]">Date</th>
                <th className="px-4 py-3 min-w-[150px]">Subject \ Book</th>
                <th className="px-4 py-3 min-w-[180px]">Topic</th>
                <th className="px-4 py-3 min-w-[95px]">Status</th>
                <th className="px-4 py-3 min-w-[115px]">Teacher</th>
              </tr>
            ) : (
              <>
                <tr className="bg-gray-50 border-b border-light-border text-dark-muted font-extrabold text-[10px] uppercase tracking-wider whitespace-nowrap">
                  <th className="px-4 py-3 min-w-[90px]">Date</th>
                  <th className="px-4 py-3 min-w-[80px]">Class</th>
                  <th className="px-4 py-3 min-w-[150px]">Subject \ Book</th>
                  {role !== 'teacher' && <th className="px-4 py-3 min-w-[115px]">Teacher</th>}
                  <th className="px-4 py-3 min-w-[140px]">Topic / Path</th>
                  <th className="px-4 py-3 min-w-[95px]">Status</th>
                  <th className="px-4 py-3 min-w-[70px]">Progress</th>
                  <th className="px-4 py-3 min-w-[140px]">Comments</th>
                  <th className="px-4 py-3 min-w-[60px] text-center">Action</th>
                </tr>
                {/* Filter inputs row (only for non-teachers) */}

              </>
            )}
          </thead>
          <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
            {filteredDailyEntries.length === 0 ? (
              <tr>
                <td
                  colSpan={isParent ? 5 : (role === 'teacher' ? 8 : 9)}
                  className="text-center py-6 text-gray-400 font-semibold"
                >
                  No entries match your search filters.
                </td>
              </tr>
            ) : (
              filteredDailyEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50/40">
                  {isParent ? (
                    <>
                      <td className="px-4 py-3 text-dark-primary whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-brand-primary">
                            {entry.subject?.name || '—'}
                          </span>
                          <span className="text-gray-300 font-normal">\</span>
                          <span className="font-semibold text-gray-500">
                            {entry.book?.name || '—'}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 font-semibold text-gray-600 max-w-[250px] truncate whitespace-nowrap"
                        title={entry.lessonPath}
                      >
                        {entry.lessonPath}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(entry.current_status, entry.isRevision)}
                      </td>
                      <td className="px-4 py-3 text-blue-600 font-extrabold whitespace-nowrap">
                        {entry.teacher?.name || '—'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-dark-primary whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString()}
                        {entry.late_reporting === 'Y' && (
                          <span className="ml-1 text-red-500 text-[8px] font-bold bg-red-50 px-1 py-0.5 rounded border border-red-100">
                            Late
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-brand-primary whitespace-nowrap">
                        {entry.class?.name || entry.class?.class_name || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-brand-primary">
                            {entry.subject?.name || '—'}
                          </span>
                          <span className="text-gray-300 font-normal">\</span>
                          <span className="font-semibold text-gray-500">
                            {entry.book?.name || '—'}
                          </span>
                        </div>
                      </td>
                      {role !== 'teacher' && (
                        <td className="px-4 py-3 text-blue-600 font-extrabold whitespace-nowrap">
                          {entry.teacher?.name || '—'}
                        </td>
                      )}
                      <td
                        className="px-4 py-3 font-semibold text-gray-600 max-w-[250px] truncate whitespace-nowrap"
                        title={entry.lessonPath}
                      >
                        {entry.lessonPath}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(entry.current_status, entry.isRevision)}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                        {entry.isRevision
                          ? '—'
                          : `${(Number.isNaN(Number(entry.progress)) ? 0 : Number(entry.progress)).toFixed(0)}%`}
                      </td>
                      <td
                        className="px-4 py-3 text-gray-500 max-w-[200px] truncate whitespace-nowrap"
                        title={entry.comments || ''}
                      >
                        {entry.comments || '—'}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {(() => {
                          const canDelete = isCreatedToday ? isCreatedToday(entry.created_at) : true;
                          return canDelete && handleDeleteClick ? (
                            <button
                              onClick={() => handleDeleteClick(entry)}
                              className="p-1 text-red-primary hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete Log Entry"
                            >
                              <i className="fas fa-trash-alt text-xs"></i>
                            </button>
                          ) : null;
                        })()}
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DailyActivityTable;
