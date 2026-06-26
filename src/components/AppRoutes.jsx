import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import HomeGrid from "./layout/HomeGrid";
import RoleSelectionDashboard from "./RoleSelectionDashboard";
import AdminPortal from "./portals/AdminPortal";
import ManagementPortal from "./portals/ManagementPortal";
import RolePortal from "./portals/RolePortal";
import DynamicForm from "./DynamicForm";
import { CARD_THEMES } from "../utils/cardTheme";
import { supabase } from "../utils/supabase";
import Translate from "./Translate";
import TeacherTimetableViewer from "./portals/teacher/TeacherTimetableViewer";
import TeacherStudentsViewer from "./portals/teacher/TeacherStudentsViewer";
import ParentTimetableViewer from "./portals/parent/ParentTimetableViewer";
import SyllabusManager from "./portals/admin/syllabus/SyllabusManager";
import SyllabusTracker from "./portals/teacher/SyllabusTracker";
import ReporterTicketsView from "./portals/ReporterTicketsView";

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
}) => {
  const navigate = useNavigate();
  const [dynamicConfigs, setDynamicConfigs] = useState([]);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const { data, error } = await supabase
          .from("dynamic_form_configs")
          .select("*");
        if (!error && data) {
          setDynamicConfigs(data);
        }
      } catch (err) {
        console.error("Failed to fetch configs in AppRoutes:", err);
      }
    };
    fetchConfigs();
  }, []);

  const getPortalTiles = (portalRole, baseTiles) => {
    const filteredBase = baseTiles.filter(tile => tile.id !== "complaint-register");

    const dynamicTiles = dynamicConfigs
      .filter((config) => {
        if (!config.form_visibility) return false;
        const roles = config.form_visibility
          .split(",")
          .map((r) => r.trim().toLowerCase());
        return roles.includes(portalRole.toLowerCase()) || roles.includes("all");
      })
      .map((config) => {
        const themeKey = config.card_theme || "orange";
        const theme = CARD_THEMES[themeKey] || CARD_THEMES.orange;
        let shadowClass = "shadow-orange-200";
        if (themeKey.startsWith("pink")) shadowClass = "shadow-pink-200";
        else if (themeKey.startsWith("blue")) shadowClass = "shadow-blue-200";
        else if (themeKey.startsWith("teal")) shadowClass = "shadow-teal-200";
        else if (themeKey === "green") shadowClass = "shadow-green-200";
        else if (themeKey === "red") shadowClass = "shadow-red-200";
        else if (themeKey === "dark" || themeKey === "charcoal") shadowClass = "shadow-gray-200";

        return {
          id: config.form_name,
          title: config.display_name || config.form_name,
          description: config.description || `Fill out the ${config.display_name || config.form_name} form.`,
          icon: config.icon || "fa-clipboard-list",
          buttonColor: `${theme.color} text-white`,
          shadow: shadowClass,
          onClick: () => openModal(config.form_name),
        };
      });

    return [...filteredBase, ...dynamicTiles];
  };

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
            ) : userRoles.includes("parent") ? (
              <RolePortal
                userRoles={userRoles}
                role="parent"
                tiles={getPortalTiles("parent", [
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
                  {
                    id: "track-tickets",
                    title: "My Tickets",
                    description: "View status and update comments on your submitted tickets.",
                    icon: "fa-comments",
                    buttonColor: "bg-indigo-600 text-white",
                    shadow: "shadow-indigo-200",
                    onClick: () => setParentSubView("tickets"),
                  },
                ])}
                subView={parentSubView}
                onSetSubView={setParentSubView}
                openModal={openModal}
              >
                {parentSubView === "timetable" && (
                  <ParentTimetableViewer student={user?.student} />
                )}
                {parentSubView === "tickets" && (
                  <ReporterTicketsView user={user} fullName={fullName} />
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
                tiles={getPortalTiles("teacher", [
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
                  {
                    id: "syllabus-tracker",
                    title: "Daily Syllabus Tracker",
                    description: "Submit daily reports on progress, mark lessons completed, and log revisions.",
                    icon: "fa-list-check",
                    buttonColor: "bg-blue-600 text-white",
                    shadow: "shadow-blue-200",
                    onClick: () => setTeacherSubView("syllabus-tracker"),
                  },
                  {
                    id: "track-tickets",
                    title: "My Tickets",
                    description: "View status and update comments on your submitted tickets.",
                    icon: "fa-comments",
                    buttonColor: "bg-indigo-600 text-white",
                    shadow: "shadow-indigo-200",
                    onClick: () => setTeacherSubView("tickets"),
                  },
                ])}
                subView={teacherSubView}
                onSetSubView={setTeacherSubView}
                openModal={openModal}
              >
                {teacherSubView === "timetable" && (
                  <TeacherTimetableViewer user={user} />
                )}
                {teacherSubView === "students" && (
                  <TeacherStudentsViewer />
                )}
                {teacherSubView === "syllabus" && (
                  <SyllabusManager role="teacher" />
                )}
                {teacherSubView === "syllabus-tracker" && (
                  <SyllabusTracker user={user} />
                )}
                {teacherSubView === "tickets" && (
                  <ReporterTicketsView user={user} fullName={fullName} />
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
                userRoles={userRoles}
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
