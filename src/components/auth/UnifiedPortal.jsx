// src/components/auth/UnifiedPortal.jsx
import React, { useState, useMemo, useCallback } from 'react';
import useViewConfig from '../../hooks/useViewConfig';
import PortalLayout from '../layout/PortalLayout';
import Translate from '../Translate';
import { resolveGroupInfo, TILE_METADATA_REGISTRY } from '../../utils/tileRegistry';

// Subview components
import EmployeeRecordsView from '../employees/EmployeeRecordsView';
import AdminStudentsView from '../students/AdminStudentsView';
import TimetableManager from '../timetable/TimetableManager';
import TeacherTimetableViewer from '../timetable/TeacherTimetableViewer';
import ParentTimetableViewer from '../timetable/ParentTimetableViewer';
import ParentExamTimetableView from '../examinations/ParentExamTimetableView';
import ParentProgressReportView from '../examinations/ParentProgressReportView';
import SyllabusManager from '../syllabus/SyllabusManager';
import SyllabusTrackerPortal from '../syllabus/SyllabusTrackerPortal';
import AcademicCalendarView from '../academic-calendar/AcademicCalendarView';
import ReporterTicketsView from '../tickets/ReporterTicketsView';
import DynamicForm from '../DynamicForm';
import AddWorkExceptionsModal from '../syllabus/AddWorkExceptionsModal';
import LessonManager from '../syllabus/lesson-manager/LessonManager';
import ViewControllerManager from '../admin-settings/ViewControllerManager';
import ManagePortalUserRolesView from '../admin-settings/ManagePortalUserRolesView';
import ExamScheduleManager from '../examinations/ExamScheduleManager';
import ExamScheduleViewer from '../examinations/ExamScheduleViewer';
import ExamResultsManager from '../examinations/ExamResultsManager';
import ReportCardDesigner from '../examinations/ReportCardDesigner';
import ExamAnalysisManager from '../examinations/ExamAnalysisManager';
import ConditionalBlock from '../portal-shared/ConditionalBlock';

// Shared subview containers
import TimetableAdminViewContainer from '../portal-shared/TimetableAdminViewContainer';
import AdminFormConfigsContainer from '../portal-shared/AdminFormConfigsContainer';
import CandidateTestAccessManager from '../portal-shared/CandidateTestAccessManager';
import SubmissionsTableView from '../portal-shared/SubmissionsTableView';
import { getEffectiveRole } from '../../utils/roleUtils';

// Memoized tile components
import TileButton from '../portal-shared/TileButton';
import GroupCard from '../portal-shared/GroupCard';
import DirectTile from '../portal-shared/DirectTile';

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

  const { viewConfigs, loading, error, refreshConfigs, getVisibleTiles } = useViewConfig(userRoles);

  // Determine effective primary role using centralized priority hierarchy:
  // admin -> management -> teacher -> staff -> custom -> parent -> candidate -> guest
  const effectiveRole = useMemo(() => {
    return getEffectiveRole(userRoles);
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

  // Nested navigation states
  const [activeGroup, setActiveGroup] = useState(null);
  const [isCategoryView, setIsCategoryView] = useState(true);

  const handleCategoryViewChange = (enabled) => {
    setIsCategoryView(enabled);
    if (!enabled) {
      setActiveGroup(null);
      setSubView(null);
    }
  };

  // Group tiles by their parent_name
  // Group tiles under their respective Parent container based on app_view_controller configuration
  const { multiTileGroups, directTiles } = useMemo(() => {
    if (!displayedTiles || displayedTiles.length === 0) {
      return { multiTileGroups: [], directTiles: [] };
    }

    const groupMap = new Map();
    const direct = [];

    displayedTiles.forEach((tile) => {
      const rawParent = tile.parent_name ? String(tile.parent_name).trim() : '';
      const lowerParent = rawParent.toLowerCase();

      // If tile has explicitly no parent or is designated direct/standalone
      if (!rawParent || lowerParent === 'direct' || lowerParent === 'none') {
        direct.push(tile);
        return;
      }

      const groupInfo = resolveGroupInfo(rawParent);
      const groupKey = groupInfo.key;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          info: groupInfo,
          tiles: [],
          minDisplayOrder: tile.display_order ?? 50,
        });
      }

      const entry = groupMap.get(groupKey);
      entry.tiles.push(tile);
      if ((tile.display_order ?? 50) < entry.minDisplayOrder) {
        entry.minDisplayOrder = tile.display_order ?? 50;
      }
    });

    const multi = [];

    // All tiles configured under a Parent container are displayed under their respective Parent container
    groupMap.forEach((entry) => {
      entry.tiles.sort((a, b) => (a.display_order ?? 50) - (b.display_order ?? 50));
      multi.push(entry);
    });

    // Sort parent groups by configured group order or min display_order
    multi.sort((a, b) => (a.info.order ?? a.minDisplayOrder) - (b.info.order ?? b.minDisplayOrder));

    // Sort direct tiles by display_order
    direct.sort((a, b) => (a.display_order ?? 50) - (b.display_order ?? 50));

    return { multiTileGroups: multi, directTiles: direct };
  }, [displayedTiles]);

  // Active Group Info for current drill-down
  const currentGroupEntry = useMemo(() => {
    if (!activeGroup) return null;
    return multiTileGroups.find((g) => g.info.key === activeGroup) || null;
  }, [activeGroup, multiTileGroups]);

  const activeTile = useMemo(() => {
    return allPermittedTiles.find((t) => t.id === subView || t.component_name === subView);
  }, [allPermittedTiles, subView]);

  // Derived active group title for breadcrumbs
  const activeGroupTitle = useMemo(() => {
    if (currentGroupEntry) {
      return currentGroupEntry.info.label;
    }
    if (subView && activeTile?.parent_name) {
      const gInfo = resolveGroupInfo(activeTile.parent_name);
      if (multiTileGroups.some((g) => g.info.key === gInfo.key)) {
        return gInfo.label;
      }
    }
    return null;
  }, [currentGroupEntry, subView, activeTile, multiTileGroups]);

  const subViewTitle =
    activeTile?.title ||
    TILE_METADATA_REGISTRY[subView]?.title ||
    (subView ? subView.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');

  // Tile click handler
  const handleTileClick = useCallback(
    (tile) => {
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
      const groupInfo = resolveGroupInfo(tile.parent_name);
      if (
        isCategoryView &&
        groupInfo &&
        multiTileGroups.some((g) => g.info.key === groupInfo.key)
      ) {
        setActiveGroup(groupInfo.key);
      }
      setSubView(tile.id);
    },
    [isCategoryView, multiTileGroups, openModal]
  );

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
              mode="records"
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
              initialTab="salary_dashboard"
              mode="salary"
            />
          </div>
        );

      case 'personal-info':
        return (
          <div data-feature="personal-info">
            <EmployeeRecordsView
              role="self"
              mode="self"
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
              role={
                isAdmin ? 'admin' : isManagement ? 'management' : isTeacher ? 'teacher' : 'viewer'
              }
              user={user}
              userRoles={userRoles}
              mode="records"
              initialTab="records"
            />
          </div>
        );

      case 'student-fees':
        return (
          <div data-feature="student-fees">
            <AdminStudentsView
              role={isManagement && !isAdmin ? 'management' : 'admin'}
              user={user}
              userRoles={userRoles}
              mode="fees"
              initialTab="fees"
            />
          </div>
        );

      case 'form-configurations':
        return (
          <div data-feature="form-configurations">
            <AdminFormConfigsContainer onBack={() => setSubView(null)} />
          </div>
        );

      case 'timetable-planner':
        if (!isAdmin && !isManagement && !userRoles.includes('coordinator')) {
          return (
            <div data-feature="timetable-viewer">
              <TeacherTimetableViewer user={user} />
            </div>
          );
        }
        return (
          <div data-feature="timetable-planner">
            <TimetableManager userRoles={userRoles} user={user} initialTab="scheduler" />
          </div>
        );

      case 'timetable-viewer':
        return (
          <div data-feature="timetable-viewer">
            <TeacherTimetableViewer user={user} />
          </div>
        );

      case 'class-schedule':
        return (
          <div data-feature="class-schedule">
            <ParentTimetableViewer student={user?.student} />
          </div>
        );

      case 'ward-exam-timetable':
        return (
          <div data-feature="ward-exam-timetable">
            <ParentExamTimetableView
              user={user}
              classes={[]}
              subjects={[]}
              onNavigate={(view) => setSubView(view)}
            />
          </div>
        );

      case 'ward-progress-report':
      case 'parent-progress-report':
        return (
          <div data-feature="ward-progress-report">
            <ParentProgressReportView
              user={user}
              userRoles={userRoles}
              onNavigate={(view) => setSubView(view)}
            />
          </div>
        );

      case 'syllabus-manager':
      case 'syllabus':
        return (
          <div data-feature="syllabus-manager">
            <SyllabusManager
              role={isAdmin ? 'admin' : isManagement ? 'management' : 'teacher'}
              user={user}
              userRoles={userRoles}
              teacherRecord={teacherRecord}
            />
          </div>
        );

      case 'my-activity':
        return (
          <div data-feature="my-activity">
            <SyllabusTrackerPortal
              role={
                isTeacher ? 'teacher' : isAdmin ? 'admin' : isManagement ? 'management' : 'parent'
              }
              user={user}
              userRoles={userRoles}
              teacherRecord={teacherRecord}
              student={user?.student}
              initialTab="my-activity"
            />
          </div>
        );

      case 'teacher-activity':
        return (
          <div data-feature="teacher-activity">
            <SyllabusTrackerPortal
              role={
                isAdmin ? 'admin' : isManagement ? 'management' : isTeacher ? 'teacher' : 'parent'
              }
              user={user}
              userRoles={userRoles}
              teacherRecord={teacherRecord}
              student={user?.student}
              initialTab="teacher-activity"
              singleTab="teacher-activity"
            />
          </div>
        );

      case 'syllabus-progress-tracker':
      case 'syllabus-progress':
        return (
          <div data-feature="syllabus-progress-tracker">
            <SyllabusTrackerPortal
              role={
                isAdmin ? 'admin' : isManagement ? 'management' : isTeacher ? 'teacher' : 'parent'
              }
              user={user}
              userRoles={userRoles}
              teacherRecord={teacherRecord}
              student={user?.student}
              initialTab="syllabus-progress"
            />
          </div>
        );

      case 'dashboard':
        return (
          <div data-feature="dashboard">
            <SyllabusTrackerPortal
              role={isAdmin ? 'admin' : isManagement ? 'management' : 'teacher'}
              user={user}
              userRoles={userRoles}
              teacherRecord={teacherRecord}
              dashboardOnly
            />
          </div>
        );

      case 'academic-calendar':
        return (
          <div data-feature="academic-calendar">
            <AcademicCalendarView canEdit={isAdmin || isManagement} userRoles={userRoles} />
          </div>
        );

      case 'my-tickets':
      case 'track-tickets':
        return (
          <div data-feature="my-tickets">
            <ReporterTicketsView user={user} fullName={fullName} userRoles={userRoles} />
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

      case 'view-complaints':
      case 'registered-complaints':
        return (
          <div data-feature="view-complaints">
            <SubmissionsTableView
              formUuid="complaint"
              title="View Complaints"
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
              role={
                isAdmin
                  ? 'admin'
                  : isManagement
                    ? 'management'
                    : isTeacher
                      ? 'teacher'
                      : 'management'
              }
              user={user}
              userRoles={userRoles}
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

      case 'manage-user-roles':
      case 'portal-user-roles':
        return (
          <div data-feature="manage-user-roles">
            <ManagePortalUserRolesView currentUser={user} onBack={() => setSubView(null)} />
          </div>
        );

      case 'exam-schedule':
        return (
          <div data-feature="exam-schedule">
            <ExamScheduleManager user={user} userRoles={userRoles} teacherRecord={teacherRecord} />
          </div>
        );

      case 'exam-schedule-viewer':
        return (
          <div data-feature="exam-schedule-viewer">
            <ExamScheduleViewer user={user} userRoles={userRoles} teacherRecord={teacherRecord} />
          </div>
        );

      case 'exam-results':
        return (
          <div data-feature="exam-results">
            <ExamResultsManager
              user={user}
              userRoles={userRoles}
              teacherRecord={teacherRecord}
              allowedTabs={['entry', 'summary', 'attendance', 'remarks']}
            />
          </div>
        );

      case 'exam-progress-report':
      case 'progress-report':
      case 'progress-reports':
      case 'exam-report':
        if (isParent && !isAdmin && !isManagement && !isTeacher) {
          return (
            <div data-feature="ward-progress-report">
              <ParentProgressReportView
                user={user}
                userRoles={userRoles}
                onNavigate={(view) => setSubView(view)}
              />
            </div>
          );
        }
        return (
          <div data-feature="exam-progress-report">
            <ExamResultsManager
              user={user}
              userRoles={userRoles}
              teacherRecord={teacherRecord}
              allowedTabs={['report']}
              initialTab="report"
            />
          </div>
        );

      case 'exam-analysis':
      case 'exam-report-analysis':
        return (
          <div data-feature="exam-analysis" className="w-full">
            <ExamAnalysisManager
              user={user}
              userRoles={userRoles}
              onBack={() => setSubView(null)}
            />
          </div>
        );

      case 'report-card-designer':
      case 'exam-report-designer':
        return (
          <div data-feature="report-card-designer" className="w-full">
            <ConditionalBlock
              name="report-card-designer"
              roles={userRoles}
              fallback={
                <div className="text-center py-16 bg-white rounded-3xl border border-light-border p-8 max-w-xl mx-auto shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto mb-4">
                    <i className="fas fa-lock" />
                  </div>
                  <h3 className="text-lg font-bold text-dark-deepblue mb-2">Access Restricted</h3>
                  <p className="text-xs text-dark-muted mb-6">
                    You do not have permission to access the Report Card Designer.
                  </p>
                  <button
                    onClick={() => setSubView(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <i className="fas fa-arrow-left mr-2" />
                    Back to Portal
                  </button>
                </div>
              }
            >
              <ReportCardDesigner userRoles={userRoles} onClose={() => setSubView(null)} />
            </ConditionalBlock>
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
      activeGroup={activeGroup}
      onSetActiveGroup={setActiveGroup}
      activeGroupTitle={activeGroupTitle}
      groups={multiTileGroups}
      isCategoryView={isCategoryView}
      onCategoryViewChange={handleCategoryViewChange}
    >
      <div className="w-full">
        {/* Active SubView Content */}
        {subView ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 w-full">
            {renderSubViewContent()}
          </div>
        ) : (
          /* Dashboard View */
          <div className="w-full max-w-7xl mx-auto px-2 sm:px-3 py-6 sm:py-8 animate-in fade-in duration-300">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-10 h-10 border-4 border-orange-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-red-200 p-8 max-w-xl mx-auto">
                <i className="fas fa-triangle-exclamation text-3xl text-red-500 mb-3"></i>
                <p className="text-sm font-bold text-dark-deepblue">
                  Failed to Load View Configuration
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {error.message || 'Unable to load app_view_controller from database.'}
                </p>
                <button
                  onClick={() => refreshConfigs()}
                  className="mt-4 px-4 py-2 rounded-xl bg-orange-primary text-white text-xs font-bold hover:bg-orange-dark transition-all"
                >
                  <i className="fas fa-sync-alt mr-2"></i>Retry
                </button>
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
              <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
                {/* ── Level 2: Group Drill-down View (when activeGroup is selected) ── */}
                {!isCategoryView ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 animate-in fade-in duration-300">
                    {displayedTiles.map((tile) => (
                      <TileButton
                        key={tile.id}
                        tile={tile}
                        onClick={handleTileClick}
                        isCategoryView={false}
                      />
                    ))}
                  </div>
                ) : activeGroup && currentGroupEntry ? (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Tiles Grid for this group */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                      {currentGroupEntry.tiles.map((tile) => (
                        <TileButton
                          key={tile.id}
                          tile={tile}
                          onClick={handleTileClick}
                          isCategoryView={false}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ── Level 1: Landing Page (Group Cards + Standalone Direct Tiles) ── */
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* 1. Group Cards Grid (Nesting Level 1) */}
                    {multiTileGroups.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {multiTileGroups.map((group) => (
                          <GroupCard key={group.info.key} group={group} onClick={setActiveGroup} />
                        ))}
                      </div>
                    )}

                    {/* 2. Direct Tiles (Standalone Features from single-tile groups) */}
                    {directTiles.length > 0 && (
                      <div className="pt-2 sm:pt-4">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                          {directTiles.map((tile) => (
                            <DirectTile key={tile.id} tile={tile} onClick={handleTileClick} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
