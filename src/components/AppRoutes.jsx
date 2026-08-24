import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import HomeGrid from './layout/HomeGrid';
import RoleSelectionDashboard from './auth/RoleSelectionDashboard';
import AdminPortal from './auth/AdminPortal';
import ManagementPortal from './auth/ManagementPortal';
import RolePortal from './auth/RolePortal';
import DynamicForm from './DynamicForm';
import { CARD_THEMES } from '../utils/cardTheme';
import { supabase } from '../utils/supabase';
import Translate from './Translate';
import TeacherTimetableViewer from './timetable/TeacherTimetableViewer';
import TeacherStudentsViewer from './students/TeacherStudentsViewer';
import ParentTimetableViewer from './timetable/ParentTimetableViewer';
import SyllabusManager from './syllabus/SyllabusManager';
import ReporterTicketsView from './tickets/ReporterTicketsView';
import LessonManager from './syllabus/lesson-manager/LessonManager';
import EmployeeRecordsView from './employees/EmployeeRecordsView';
import SyllabusTrackerPortal from './syllabus/SyllabusTrackerPortal';
import CandidatePortal from './auth/CandidatePortal';
import TVDisplayDashboard from './dashboard/TVDisplayDashboard';
import AcademicCalendarView from './academic-calendar/AcademicCalendarView';

const portalRouteFallback = (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const AppRoutes = ({
  user,
  userRoles,
  fullName,
  rolesLoading,
  gridCards,
  openModal,
  adminSubView,
  setAdminSubView,
  managementSubView,
  setManagementSubView,
  teacherSubView,
  setTeacherSubView,
  parentSubView,
  setParentSubView,
  candidateSubView,
  setCandidateSubView,
  teacherRecord,
}) => {
  const navigate = useNavigate();
  const [dynamicConfigs, setDynamicConfigs] = useState([]);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const { data, error } = await supabase.from('dynamic_form_configs').select('*');
        if (!error && data) {
          setDynamicConfigs(data);
        }
      } catch (err) {
        console.error('Failed to fetch configs in AppRoutes:', err);
      }
    };
    fetchConfigs();
  }, []);

  const getPortalTiles = (portalRole, baseTiles) => {
    const filteredBase = baseTiles.filter((tile) => tile.id !== 'complaint-register');

    const dynamicTiles = dynamicConfigs
      .filter((config) => {
        if (!config.form_visibility) return false;
        const roles = config.form_visibility.split(',').map((r) => r.trim().toLowerCase());
        return roles.includes(portalRole.toLowerCase()) || roles.includes('all');
      })
      .map((config) => {
        const themeKey = config.card_theme || 'orange';
        const theme = CARD_THEMES[themeKey] || CARD_THEMES.orange;
        let shadowClass = 'shadow-orange-200';
        if (themeKey.startsWith('pink')) shadowClass = 'shadow-pink-200';
        else if (themeKey.startsWith('blue')) shadowClass = 'shadow-blue-200';
        else if (themeKey.startsWith('teal')) shadowClass = 'shadow-teal-200';
        else if (themeKey === 'green') shadowClass = 'shadow-green-200';
        else if (themeKey === 'red') shadowClass = 'shadow-red-200';
        else if (themeKey === 'dark' || themeKey === 'charcoal') shadowClass = 'shadow-gray-200';

        return {
          id: config.form_name,
          title: config.display_name || config.form_name,
          description:
            config.description || `Fill out the ${config.display_name || config.form_name} form.`,
          icon: config.icon || 'fa-clipboard-list',
          buttonColor: theme.color ? `bg-${theme.color} text-white` : 'bg-orange-dark text-white',
          shadow: shadowClass,
          onClick: () => openModal(config.form_name),
        };
      });

    return [...filteredBase, ...dynamicTiles];
  };

  return (
    <Routes>
      <Route path="/" element={<HomeGrid gridCards={gridCards} openModal={openModal} />} />
      <Route
        path="/portal"
        element={
          user ? (
            rolesLoading ? (
              portalRouteFallback
            ) : userRoles.length > 1 ? (
              <RoleSelectionDashboard
                userRoles={userRoles}
                onSelectView={(view) => navigate(`/portal/${view}`)}
              />
            ) : userRoles.length === 1 ? (
              <Navigate to={`/portal/${userRoles[0]}`} replace />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/portal/admin"
        element={
          user ? (
            rolesLoading ? (
              portalRouteFallback
            ) : userRoles.includes('admin') ? (
              <AdminPortal
                user={user}
                userRoles={userRoles}
                subView={adminSubView}
                onSetSubView={setAdminSubView}
              />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/portal/management"
        element={
          user ? (
            rolesLoading ? (
              portalRouteFallback
            ) : userRoles.includes('management') ? (
              <ManagementPortal
                user={user}
                fullName={fullName}
                userRoles={userRoles}
                subView={managementSubView}
                onSetSubView={setManagementSubView}
                openModal={openModal}
              />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/portal/parent"
        element={
          user ? (
            rolesLoading ? (
              portalRouteFallback
            ) : userRoles.includes('parent') ? (
              <RolePortal
                userRoles={userRoles}
                role="parent"
                tiles={getPortalTiles('parent', [
                  {
                    id: 'academic-calendar',
                    title: 'Academic Calendar',
                    description:
                      'View holidays, examinations, preparation days, and teaching days.',
                    icon: 'fa-calendar-days',
                    buttonColor: 'bg-teal-600 text-white',
                    shadow: 'shadow-teal-200',
                    onClick: () => setParentSubView('academic-calendar'),
                  },
                  {
                    id: 'view-timetable',
                    title: 'Class Schedule',
                    titleKey: 'role_portal.class_schedule.title',
                    description: 'View the weekly class schedule/timetable for your child.',
                    descriptionKey: 'role_portal.class_schedule.description',
                    icon: 'fa-calendar-alt',
                    buttonColor: 'bg-emerald-600 text-white',
                    shadow: 'shadow-emerald-200',
                    onClick: () => setParentSubView('timetable'),
                  },
                  {
                    id: 'track-tickets',
                    title: 'My Tickets',
                    description: 'View status and update comments on your submitted tickets.',
                    icon: 'fa-comments',
                    buttonColor: 'bg-indigo-600 text-white',
                    shadow: 'shadow-indigo-200',
                    onClick: () => setParentSubView('tickets'),
                  },
                  {
                    id: 'lesson-planner-tracker',
                    title: 'Syllabus Progress',
                    description: "View syllabus progress and activity logs for your child's class.",
                    icon: 'fa-book-reader',
                    buttonColor: 'bg-purple-600 text-white',
                    shadow: 'shadow-purple-200',
                    onClick: () => setParentSubView('lesson-planner-tracker'),
                  },
                ])}
                subView={parentSubView}
                onSetSubView={setParentSubView}
                openModal={openModal}
              >
                {parentSubView === 'timetable' && (
                  <div data-timetable="true">
                    <ParentTimetableViewer student={user?.student} />
                  </div>
                )}
                {parentSubView === 'tickets' && (
                  <div data-tickets="true">
                    <ReporterTicketsView user={user} fullName={fullName} />
                  </div>
                )}
                {parentSubView === 'lesson-planner-tracker' && (
                  <div data-lesson-planner-tracker="true">
                    <SyllabusTrackerPortal role="parent" student={user?.student} />
                  </div>
                )}
                {parentSubView === 'academic-calendar' && (
                  <div data-academic-calendar="true">
                    <AcademicCalendarView canEdit={false} />
                  </div>
                )}
              </RolePortal>
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/portal/teacher"
        element={
          user ? (
            rolesLoading ? (
              portalRouteFallback
            ) : userRoles.includes('teacher') ? (
              <RolePortal
                userRoles={userRoles}
                role="teacher"
                tiles={getPortalTiles('teacher', [
                  {
                    id: 'academic-calendar',
                    title: 'Academic Calendar',
                    description:
                      'View holidays, examinations, preparation days, and teaching days.',
                    icon: 'fa-calendar-days',
                    buttonColor: 'bg-teal-600 text-white',
                    shadow: 'shadow-teal-200',
                    onClick: () => setTeacherSubView('academic-calendar'),
                  },
                  {
                    id: 'dashboard',
                    title: 'Dashboard',
                    description:
                      'View syllabus progress, activity, and attention-required insights.',
                    icon: 'fa-gauge-high',
                    buttonColor: 'bg-indigo-600 text-white',
                    shadow: 'shadow-indigo-200',
                    onClick: () => setTeacherSubView('dashboard'),
                  },
                  {
                    id: 'view-timetable',
                    title: 'View Timetable',
                    titleKey: 'role_portal.view_timetable.title',
                    description: 'View weekly timetables by class or search schedules by teacher.',
                    icon: 'fa-calendar-alt',
                    buttonColor: 'bg-orange-600 text-white',
                    shadow: 'shadow-orange-200',
                    onClick: () => setTeacherSubView('timetable'),
                  },
                  {
                    id: 'lesson-planner-tracker',
                    title: 'Lesson Planner & Tracker',
                    description:
                      'Log daily teaching progress, track syllabus completion, and carry forward lessons.',
                    icon: 'fa-chart-line',
                    buttonColor: 'bg-blue-600 text-white',
                    shadow: 'shadow-blue-200',
                    onClick: () => setTeacherSubView('lesson-planner-tracker'),
                  },
                  {
                    id: 'syllabus',
                    title: 'Syllabus Manager',
                    description: 'Manage syllabus books, units, chapters, and lessons.',
                    icon: 'fa-book-open',
                    buttonColor: 'bg-purple-600 text-white',
                    shadow: 'shadow-purple-200',
                    onClick: () => setTeacherSubView('syllabus'),
                  },
                  {
                    id: 'students',
                    title: 'Students Record',
                    description: 'Browse student list and search details.',
                    icon: 'fa-user-graduate',
                    buttonColor: 'bg-brand-primary text-white',
                    shadow: 'shadow-brand-lbg',
                    onClick: () => setTeacherSubView('students'),
                  },
                  {
                    id: 'personal-info',
                    title: 'Personal Info',
                    description:
                      'View your employee profile, designation, and update contact information.',
                    icon: 'fa-id-card',
                    buttonColor: 'bg-emerald-600 text-white',
                    shadow: 'shadow-emerald-200',
                    onClick: () => setTeacherSubView('personal-info'),
                  },
                  {
                    id: 'track-tickets',
                    title: 'My Tickets',
                    description: 'View status and update comments on your submitted tickets.',
                    icon: 'fa-comments',
                    buttonColor: 'bg-red-600 text-white',
                    shadow: 'shadow-red-200',
                    onClick: () => setTeacherSubView('tickets'),
                  },
                ])}
                subView={teacherSubView}
                onSetSubView={setTeacherSubView}
                openModal={openModal}
              >
                {teacherSubView === 'personal-info' && (
                  <div data-personal-info="true">
                    <EmployeeRecordsView
                      role="employee"
                      user={user}
                      teacherRecord={teacherRecord}
                    />
                  </div>
                )}
                {teacherSubView === 'timetable' && (
                  <div data-timetable="true">
                    <TeacherTimetableViewer user={user} />
                  </div>
                )}
                {teacherSubView === 'students' && (
                  <div data-students="true">
                    <TeacherStudentsViewer />
                  </div>
                )}
                {teacherSubView === 'syllabus' && (
                  <div data-syllabus="true">
                    <SyllabusManager role="teacher" user={user} teacherRecord={teacherRecord} />
                  </div>
                )}
                {teacherSubView === 'lesson-planner' && (
                  <div data-lesson-planner="true">
                    <LessonManager user={user} teacherRecord={teacherRecord} />
                  </div>
                )}
                {teacherSubView === 'lesson-planner-tracker' && (
                  <div data-lesson-planner-tracker="true">
                    <SyllabusTrackerPortal
                      role="teacher"
                      user={user}
                      teacherRecord={teacherRecord}
                    />
                  </div>
                )}
                {teacherSubView === 'dashboard' && (
                  <div data-dashboard="true">
                    <SyllabusTrackerPortal
                      role="teacher"
                      user={user}
                      teacherRecord={teacherRecord}
                      dashboardOnly
                    />
                  </div>
                )}
                {teacherSubView === 'tickets' && (
                  <div data-tickets="true">
                    <ReporterTicketsView user={user} fullName={fullName} />
                  </div>
                )}
                {teacherSubView === 'academic-calendar' && (
                  <div data-academic-calendar="true">
                    <AcademicCalendarView canEdit={false} />
                  </div>
                )}
              </RolePortal>
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/career"
        element={
          <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-2xl">
              <h1 className="text-white text-2xl">
                <Translate id="home.career.title">Career Opportunities</Translate>
              </h1>
              <DynamicForm
                uuid="career"
                textColor={CARD_THEMES.blueDark.textColor}
                userRoles={userRoles}
              />
            </div>
          </div>
        }
      />
      <Route path="/portal/display" element={<TVDisplayDashboard />} />
      <Route
        path="/portal/candidate"
        element={
          user ? (
            rolesLoading ? (
              portalRouteFallback
            ) : userRoles.includes('candidate') ? (
              <CandidatePortal
                user={user}
                userRoles={userRoles}
                subView={candidateSubView}
                onSetSubView={setCandidateSubView}
              />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
};

// Note: navigate is not defined in this component. We'll pass it as a prop from App.
// For simplicity, we can wrap the whole Routes in a <NavigateSetter> or just import useNavigate inside.
// Better to pass navigate as a prop.
