import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import HomeGrid from "./layout/HomeGrid";
import RoleSelectionDashboard from "./RoleSelectionDashboard";
import AdminPortal from "./portals/AdminPortal";
import ManagementPortal from "./portals/ManagementPortal";
import RolePortal from "./portals/RolePortal";
import DynamicForm from "./DynamicForm";
import { CARD_THEMES } from "../utils/cardTheme";
import Translate from "./Translate";
import TeacherTimetableViewer from "./portals/teacher/TeacherTimetableViewer";
import TeacherStudentsViewer from "./portals/teacher/TeacherStudentsViewer";
import ParentTimetableViewer from "./portals/parent/ParentTimetableViewer";
import SyllabusManager from "./portals/admin/syllabus/SyllabusManager";

const portalRouteFallback = (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const AppRoutes = ({
  user,
  userRoles,
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
}) => {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route
        path="/"
        element={<HomeGrid gridCards={gridCards} openModal={openModal} />}
      />
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
            ) : userRoles.includes("admin") ? (
              <AdminPortal
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
            ) : userRoles.includes("management") ? (
              <ManagementPortal
                userRoles={userRoles}
                subView={managementSubView}
                onSetSubView={setManagementSubView}
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
            ) : userRoles.includes("parent") ? (
              <RolePortal
                userRoles={userRoles}
                role="parent"
                tiles={[
                  {
                    id: "complaint-register",
                    title: "Complaint Register",
                    titleKey: "role_portal.complaint_register.title",
                    description:
                      "Submit and track your requests or complaints directly with the administration.",
                    descriptionKey: "role_portal.complaint_register.description",
                    icon: "fa-clipboard-list",
                    buttonColor: "bg-orange-primary text-white",
                    onClick: () => openModal("complaint-register"),
                  },
                  {
                    id: "view-timetable",
                    title: "Class Schedule",
                    titleKey: "role_portal.class_schedule.title",
                    description: "View the weekly class schedule/timetable for your child.",
                    descriptionKey: "role_portal.class_schedule.description",
                    icon: "fa-calendar-alt",
                    buttonColor: "bg-emerald-600 text-white",
                    shadow: "shadow-emerald-200",
                    onClick: () => setParentSubView("timetable"),
                  },
                ]}
                subView={parentSubView}
                onSetSubView={setParentSubView}
                openModal={openModal}
              >
                {parentSubView === "timetable" && (
                  <ParentTimetableViewer student={user?.student} />
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
            ) : userRoles.includes("teacher") ? (
              <RolePortal
                userRoles={userRoles}
                role="teacher"
                tiles={[
                  {
                    id: "complaint-register",
                    title: "Complaint Register",
                    titleKey: "role_portal.complaint_register.title",
                    description:
                      "Submit and track your requests or complaints directly with the administration.",
                    descriptionKey: "role_portal.complaint_register.description",
                    icon: "fa-clipboard-list",
                    buttonColor: "bg-orange-primary text-white",
                    onClick: () => openModal("complaint-register"),
                  },
                  {
                    id: "view-timetable",
                    title: "View Timetable",
                    titleKey: "role_portal.view_timetable.title",
                    description: "View weekly timetables by class or search schedules by teacher.",
                    icon: "fa-calendar-alt",
                    buttonColor: "bg-emerald-600 text-white",
                    shadow: "shadow-emerald-200",
                    onClick: () => setTeacherSubView("timetable"),
                  },
                  {
                    id: "students",
                    title: "Student Records",
                    description: "Browse student list and search details.",
                    icon: "fa-user-graduate",
                    buttonColor: "bg-brand-primary text-white",
                    shadow: "shadow-brand-lbg",
                    onClick: () => setTeacherSubView("students"),
                  },
                  {
                    id: "syllabus",
                    title: "Syllabus Manager",
                    description: "Manage syllabus books, units, chapters, and lessons.",
                    icon: "fa-book-open",
                    buttonColor: "bg-emerald-600 text-white",
                    shadow: "shadow-emerald-200",
                    onClick: () => setTeacherSubView("syllabus"),
                  },
                ]}
                subView={teacherSubView}
                onSetSubView={setTeacherSubView}
                openModal={openModal}
              >
                {teacherSubView === "timetable" && (
                  <TeacherTimetableViewer />
                )}
                {teacherSubView === "students" && (
                  <TeacherStudentsViewer />
                )}
                {teacherSubView === "syllabus" && (
                  <SyllabusManager role="teacher" />
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
                <Translate id="home.career.title">
                  Career Opportunities
                </Translate>
              </h1>
              <DynamicForm
                uuid="career"
                textColor={CARD_THEMES.blueDark.textColor}
              />
            </div>
          </div>
        }
      />
    </Routes>
  );
};

// Note: navigate is not defined in this component. We'll pass it as a prop from App.
// For simplicity, we can wrap the whole Routes in a <NavigateSetter> or just import useNavigate inside.
// Better to pass navigate as a prop.
