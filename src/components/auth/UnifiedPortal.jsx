// src/components/auth/UnifiedPortal.jsx
import React, { useState, useMemo } from 'react';
import useViewConfig from '../../hooks/useViewConfig';
import PortalLayout from '../layout/PortalLayout';
import Translate from '../Translate';

// Subview components
import EmployeeRecordsView from '../employees/EmployeeRecordsView';
import AdminStudentsView from '../students/AdminStudentsView';
import TeacherStudentsViewer from '../students/TeacherStudentsViewer';
import TimetableManager from '../timetable/TimetableManager';
import TeacherTimetableViewer from '../timetable/TeacherTimetableViewer';
import ParentTimetableViewer from '../timetable/ParentTimetableViewer';
import SyllabusManager from '../syllabus/SyllabusManager';
import SyllabusTrackerPortal from '../syllabus/SyllabusTrackerPortal';
import AcademicCalendarView from '../academic-calendar/AcademicCalendarView';
import ReporterTicketsView from '../tickets/ReporterTicketsView';
import DynamicForm from '../DynamicForm';
import AddWorkExceptionsModal from '../syllabus/AddWorkExceptionsModal';
import LessonManager from '../syllabus/lesson-manager/LessonManager';
import ViewControllerManager from '../admin-settings/ViewControllerManager';

// Shared subview containers
import TimetableAdminViewContainer from '../portal-shared/TimetableAdminViewContainer';
import AdminFormConfigsContainer from '../portal-shared/AdminFormConfigsContainer';
import CandidateTestAccessManager from '../portal-shared/CandidateTestAccessManager';
import SubmissionsTableView from '../portal-shared/SubmissionsTableView';

const ROLE_PRIORITY = ['admin', 'management', 'teacher', 'parent', 'candidate', 'staff', 'guest'];

export const UnifiedPortal = ({
  user,
  userRoles = [],
  fullName = '',
  teacherRecord = null,
  openModal = () => {},
  initialSubView = null,
}) => {
  const [subView, setSubView] = useState(initialSubView);
  const [isExceptionsModalOpen, setIsExceptionsModalOpen] = useState(false);

  const {
    viewConfigs,
    loading,
    error,
    tableMissing,
    refreshConfigs,
    getVisibleTiles,
  } = useViewConfig();

  // Determine effective primary role for portal theming
  const effectiveRole = useMemo(() => {
    const rolesLower = (userRoles || []).map((r) => String(r).toLowerCase().trim());
    return ROLE_PRIORITY.find((p) => rolesLower.includes(p)) || 'management';
  }, [userRoles]);

  const isAdmin = userRoles.includes('admin');
  const isManagement = userRoles.includes('management');
  const isTeacher = userRoles.includes('teacher');
  const isParent = userRoles.includes('parent');

  // Compute all visible tiles permitted for user roles
  const allPermittedTiles = useMemo(() => {
    return getVisibleTiles(userRoles);
  }, [getVisibleTiles, userRoles]);

  const displayedTiles = allPermittedTiles;

  const activeTile = useMemo(() => {
    return allPermittedTiles.find(
      (t) => t.id === subView || t.component_name === subView
    );
  }, [allPermittedTiles, subView]);

  const subViewTitle =
    activeTile?.title ||
    (subView ? subView.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');

  // Tile click handler
  const handleTileClick = (tile) => {
    if (tile.action === 'open_window') {
      window.open(tile.actionTarget || '/portal/display', '_blank');
      return;
    }

    if (tile.action === 'open_modal') {
      if (tile.actionTarget === 'requests-exceptions') {
        setIsExceptionsModalOpen(true);
      } else {
        openModal(tile.actionTarget || tile.id);
      }
      return;
    }

    // Default: switch subview
    setSubView(tile.id);
  };

  // Subview component registry
  const renderSubViewContent = () => {
    switch (subView) {
      case 'employee-management':
      case 'employee-records':
      case 'user-management':
        return (
          <div data-feature="employee-management">
            <EmployeeRecordsView
              role={isAdmin ? 'admin' : isManagement ? 'management' : 'employee'}
              user={user}
              userRoles={userRoles}
              teacherRecord={teacherRecord}
              initialTab="records"
            />
          </div>
        );

      case 'salary-tracker':
        return (
          <div data-feature="salary-tracker">
            <EmployeeRecordsView
              role={isAdmin ? 'admin' : 'management'}
              user={user}
              userRoles={userRoles}
              initialTab="salary"
            />
          </div>
        );

      case 'personal-info':
        return (
          <div data-feature="personal-info">
            <EmployeeRecordsView
              role="employee"
              user={user}
              userRoles={userRoles}
              teacherRecord={teacherRecord}
            />
          </div>
        );

      case 'student-records':
        return (
          <div data-feature="student-records">
            <AdminStudentsView
              role={isManagement && !isAdmin ? 'management' : 'admin'}
              user={user}
            />
          </div>
        );

      case 'students-viewer':
        return (
          <div data-feature="students-viewer">
            <TeacherStudentsViewer />
          </div>
        );

      case 'form-configurations':
        return (
          <div data-feature="form-configurations">
            <AdminFormConfigsContainer onBack={() => setSubView(null)} />
          </div>
        );

      case 'timetable-planner':
      case 'timetable-viewer':
        return (
          <div data-feature="timetable-planner">
            <TimetableManager userRoles={userRoles} user={user} />
          </div>
        );

      case 'class-schedule':
        return (
          <div data-feature="class-schedule">
            <ParentTimetableViewer student={user?.student} />
          </div>
        );

      case 'syllabus-manager':
      case 'syllabus':
        return (
          <div data-feature="syllabus-manager">
            <SyllabusManager
              role={isAdmin ? 'admin' : isManagement ? 'management' : 'teacher'}
              user={user}
              teacherRecord={teacherRecord}
            />
          </div>
        );

      case 'lesson-planner-tracker':
      case 'syllabus-progress':
        return (
          <div data-feature="lesson-planner-tracker">
            <SyllabusTrackerPortal
              role={
                isAdmin
                  ? 'admin'
                  : isManagement
                    ? 'management'
                    : isTeacher
                      ? 'teacher'
                      : 'parent'
              }
              user={user}
              teacherRecord={teacherRecord}
              student={user?.student}
            />
          </div>
        );

      case 'dashboard':
        return (
          <div data-feature="dashboard">
            <SyllabusTrackerPortal
              role={isAdmin ? 'admin' : isManagement ? 'management' : 'teacher'}
              user={user}
              teacherRecord={teacherRecord}
              dashboardOnly
            />
          </div>
        );

      case 'academic-calendar':
        return (
          <div data-feature="academic-calendar">
            <AcademicCalendarView canEdit={isAdmin || isManagement} />
          </div>
        );

      case 'my-tickets':
      case 'track-tickets':
        return (
          <div data-feature="my-tickets">
            <ReporterTicketsView user={user} fullName={fullName} />
          </div>
        );

      case 'take-test':
        return (
          <div data-feature="take-test" className="p-4 sm:p-8 max-w-4xl mx-auto">
            <div className="bg-white border border-light-border rounded-[2rem] p-6 sm:p-10 shadow-sm">
              <DynamicForm uuid="online-teacher-test" textColor="text-teal-600" />
            </div>
          </div>
        );

      case 'take-test-management':
        return (
          <div data-feature="take-test-management">
            <CandidateTestAccessManager />
          </div>
        );

      case 'job-applications':
        return (
          <div data-feature="job-applications">
            <SubmissionsTableView
              formUuid="career"
              title="Job Application Details"
              user={user}
              fullName={fullName}
              userRoles={userRoles}
            />
          </div>
        );

      case 'registered-complaints':
        return (
          <div data-feature="registered-complaints">
            <SubmissionsTableView
              formUuid="complaint"
              title="Complaint Details"
              user={user}
              fullName={fullName}
              userRoles={userRoles}
            />
          </div>
        );

      case 'lesson-planner':
        return (
          <div data-feature="lesson-planner">
            <LessonManager
              role={isAdmin ? 'admin' : isManagement ? 'management' : 'teacher'}
              user={user}
              teacherRecord={teacherRecord}
            />
          </div>
        );

      case 'avc-admin-manager':
      case 'view-controller-manager':
        return (
          <div data-feature="avc-admin-manager">
            <ViewControllerManager onBack={() => setSubView(null)} />
          </div>
        );

      default:
        return (
          <div className="text-center py-16 bg-white rounded-3xl border border-light-border p-8 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl mx-auto mb-4">
              <i className="fas fa-layer-group"></i>
            </div>
            <h3 className="text-lg font-bold text-dark-deepblue mb-2">
              Viewing Component: <span className="font-mono text-purple-700">{subView}</span>
            </h3>
            <p className="text-xs text-dark-muted mb-6">
              This feature component is registered in the view controller registry.
            </p>
            <button
              onClick={() => setSubView(null)}
              className="px-5 py-2.5 rounded-xl bg-orange-primary text-white text-xs font-bold hover:bg-orange-dark transition-all"
            >
              <i className="fas fa-arrow-left mr-2"></i>Back to Portal
            </button>
          </div>
        );
    }
  };

  return (
    <PortalLayout
      userRoles={userRoles}
      roleName={effectiveRole}
      subView={subView}
      onSetSubView={setSubView}
      subViewTitle={subViewTitle}
    >
      <div className="w-full">
        {/* Active SubView Content */}
        {subView ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 w-full">
            {renderSubViewContent()}
          </div>
        ) : (
          /* Dashboard Tiles View */
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-in fade-in duration-300">
            {/* Tiles Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-10 h-10 border-4 border-orange-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayedTiles.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-light-border p-8">
                <i className="fas fa-cubes text-3xl text-dark-muted mb-3"></i>
                <p className="text-sm font-bold text-dark-deepblue">No features available</p>
                <p className="text-xs text-dark-muted mt-1">
                  No active tiles are currently assigned to your account roles.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 animate-in fade-in duration-300">
                {displayedTiles.map((tile) => {
                  const topBarClass =
                    (tile.buttonColor &&
                      tile.buttonColor.split(' ').find((c) => c.startsWith('bg-'))) ||
                    'bg-orange-primary';

                  const hoverBorderClass = topBarClass
                    ? topBarClass.replace('bg-', 'hover:border-')
                    : 'hover:border-orange-primary';

                  return (
                    <button
                      key={tile.id}
                      onClick={() => handleTileClick(tile)}
                      className={`group pt-5 pb-3.5 px-3.5 sm:pt-7 sm:pb-5 sm:px-5 lg:pt-8 lg:pb-6 lg:px-6 bg-white border border-light-border rounded-2xl sm:rounded-[1.75rem] ${hoverBorderClass} hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center sm:items-center gap-2.5 sm:gap-3.5 text-center sm:text-left w-full shadow-sm relative overflow-hidden`}
                    >
                      {/* Top colored accent bar */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 sm:h-2 ${topBarClass}`} />

                      {/* Icon badge */}
                      <div
                        className={`w-10 h-10 sm:w-14 lg:w-16 sm:h-14 lg:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl lg:text-2xl shadow-md sm:shadow-lg ${tile.shadow || ''} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shrink-0 ${tile.buttonColor || 'bg-orange-primary text-white'}`}
                      >
                        <i className={`fas ${tile.icon}`}></i>
                      </div>

                      {/* Title & Description */}
                      <div className="w-full">
                        <div className="flex items-center justify-center sm:justify-start gap-1.5">
                          <h5 className="font-bold text-xs sm:text-base lg:text-xl text-dark-deepblue sm:mb-1 group-hover:text-orange-primary transition-colors leading-tight">
                            {tile.titleKey ? (
                              <Translate id={tile.titleKey}>{tile.title}</Translate>
                            ) : (
                              tile.title
                            )}
                          </h5>
                          {tile.isDynamic && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase">
                              Form
                            </span>
                          )}
                        </div>
                        <p className="hidden sm:block text-dark-muted text-xs lg:text-sm leading-relaxed">
                          {tile.descriptionKey ? (
                            <Translate id={tile.descriptionKey}>{tile.description}</Translate>
                          ) : (
                            tile.description
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Requests & Exceptions Modal */}
      <AddWorkExceptionsModal
        isOpen={isExceptionsModalOpen}
        onClose={() => setIsExceptionsModalOpen(false)}
        user={user}
        fullName={fullName}
      />
    </PortalLayout>
  );
};

export default UnifiedPortal;
