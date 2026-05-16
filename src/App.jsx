import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "./utils/supabase";
import useGoogleTranslate from "./hooks/useGoogleTranslate";
import LoginPortal from "./components/LoginPortal";
import _4Ts from "./components/homepage/about-us/4Ts";
import { getCards } from "./data/cards";
import Header from "./components/layout/Header";
import ModalContainer from "./components/layout/ModalContainer";
import HomeGrid from "./components/layout/HomeGrid";
import AdminView from "./components/AdminView";
import RoleSelectionDashboard from "./components/RoleSelectionDashboard";

// ─── Tab groups ────────────────────────────────────────────────────────────────
const TAB_GROUPS = [
  { name: "about-us", ids: ["why-jzv", "vision", "system-4t"] },
  { name: "academic", ids: ["courses", "streams", "nios", "hifz"] },
  { name: "campus-life", ids: ["schedule", "extracurricular", "sports"] },
  { name: "policy", ids: ["admission-process", "policies"] },
  {
    name: "admission",
    ids: ["new-admission", "check-admission-status", "fees"],
  },
];

const GROUPED_IDS = new Set(TAB_GROUPS.flatMap((g) => g.ids));

const getGroupByName = (name) =>
  TAB_GROUPS.find((g) => g.name === name) ?? null;
const getGroupById = (id) => TAB_GROUPS.find((g) => g.ids.includes(id)) ?? null;

const App = () => {
  useGoogleTranslate();

  const [activeModal, setActiveModal] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [showLoginPortal, setShowLoginPortal] = useState(false);
  const [selectedLoginType, setSelectedLoginType] = useState(null);
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [fullName, setFullName] = useState("");
  const [studentIds, setStudentIds] = useState("");
  const [rolesLoading, setRolesLoading] = useState(false);
  
  // Navigation State
  const navigate = useNavigate();
  const location = useLocation();
  const [adminSubView, setAdminSubView] = useState(null); // users, students

  const fetchRoles = async (userId) => {
    setRolesLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role_ids, student_ids")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setUserRoles([]);
          setStudentIds("");
          return;
        }
        throw error;
      }

      if (data) {
        setStudentIds(data.student_ids || "");

        if (data.role_ids) {
          const roleMap = {
            A: "admin",
            M: "management",
            T: "teacher",
            P: "parent",
          };
          const roles = data.role_ids
            .split(",")
            .map((code) => roleMap[code.trim().toUpperCase()])
            .filter(Boolean);
          setUserRoles(roles);

          // Auto-redirect after roles are fetched
          if (roles.length === 1) {
            navigate(`/portal/${roles[0]}`);
          } else if (roles.length > 1) {
            navigate("/portal");
          }
        } else {
          setUserRoles([]);
        }
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      setUserRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 400 });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setFullName(currentUser.user_metadata?.full_name || "");
        fetchRoles(currentUser.id);
      } else {
        setUserRoles([]);
        setFullName("");
        setStudentIds("");
        setSelectedLoginType(null);
        // Navigation handles views now
        setAdminSubView(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (activeModal) closeModal();
        if (showLoginPortal) {
          setShowLoginPortal(false);
          setSelectedLoginType(null);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeModal, showLoginPortal]);

  // Per-card sub-states
  const [courseView, setCourseView] = useState("main");
  const [niosTab, setNiosTab] = useState("overview");
  const [streamView, setStreamView] = useState("main");
  const [galleryIndex, setGalleryIndex] = useState("1");
  const [galleryTitle, setGalleryTitle] = useState("Classrooms");
  const [visionLang, setVisionLang] = useState("en");

  const resetCardState = (id) => {
    if (id === "courses") setCourseView("main");
    if (id === "streams") setStreamView("main");
    if (id === "gallery") {
      setGalleryIndex("1");
      setGalleryTitle("Classrooms");
    }
    if (id === "vision") setVisionLang("en");
    if (id === "nios") setNiosTab("overview");
  };

  const cards = getCards({
    courseView,
    setCourseView,
    streamView,
    setStreamView,
    niosTab,
    setNiosTab,
    galleryIndex,
    galleryTitle,
    setGalleryIndex,
    setGalleryTitle,
    visionLang,
    setVisionLang,
  });

  const getCard = (id) => cards.find((c) => c.id === id);

  // ─── Open modal ─────────────────────────────────────────────────────────────
  const openModal = (id) => {
    if (id === "my-portal") {
      if (userRoles.length > 1) {
        navigate("/portal");
      } else if (userRoles.length === 1) {
        navigate(`/portal/${userRoles[0]}`);
      }
      return;
    }

    const card = getCard(id);
    if (!card) return;
    if (card.external) {
      window.open(card.link, "_blank");
      return;
    }

    if (card.isGroupEntry) {
      const grp = getGroupByName(card.groupName);
      const firstTab = grp?.ids[0];
      if (!grp || !firstTab) return;
      resetCardState(firstTab);
      setActiveModal(card.groupName);
      setActiveTab(firstTab);
    } else {
      resetCardState(id);
      setActiveModal(id);
      setActiveTab(null);
    }

    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    setActiveModal(null);
    setActiveTab(null);
    document.body.classList.remove("modal-open");
  };

  // ─── Derive render props ────────────────────────────────────────────────────
  const activeGroup = activeModal ? getGroupByName(activeModal) : null;
  const isTabbed = !!activeGroup;
  const activeCard = isTabbed ? getCard(activeTab) : getCard(activeModal);

  const gridCards = cards.filter(
    (c) => c.showAtHome === true || c.isGroupEntry === true || (user && c.id === "my-portal"),
  );

  return (
    <div id="dashboard-section" className="min-h-screen pb-16">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Header
        user={user}
        userRoles={userRoles}
        fullName={fullName}
        onLogout={handleLogout}
        onLoginClick={() => setShowLoginPortal(true)}
        onLogoClick={() => {
          navigate("/");
          setAdminSubView(null);
        }}
      />

      {/* ── Dynamic View Content ────────────────────────────────────────────── */}
      <main className="relative">
        <Routes>
          <Route path="/" element={
            <HomeGrid gridCards={gridCards} openModal={openModal} />
          } />

          <Route path="/portal" element={
            user && userRoles.length > 1 ? (
              <RoleSelectionDashboard
                userRoles={userRoles}
                onSelectView={(view) => navigate(`/portal/${view}`)}
              />
            ) : <Navigate to="/" replace />
          } />

          <Route path="/portal/admin" element={
            user && userRoles.includes("admin") ? (
              <AdminView
                currentView="admin"
                subView={adminSubView}
                onSetSubView={setAdminSubView}
                onGoHome={() => {
                  navigate("/");
                  setAdminSubView(null);
                }}
              />
            ) : <Navigate to="/" replace />
          } />

          {["teacher", "parent", "management"].map(role => (
            <Route key={role} path={`/portal/${role}`} element={
              user && userRoles.includes(role) ? (
                <div className="max-w-6xl mx-auto px-6 py-20 text-center">
                  <div className="w-24 h-24 bg-orange-50 text-orange-primary rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-xl">
                    <i className={`fas ${
                      role === 'teacher' ? 'fa-chalkboard-user' : 
                      role === 'parent' ? 'fa-home' : 'fa-users-gear'
                    }`}></i>
                  </div>
                  <h2 className="text-3xl font-bold text-dark-deepblue mb-4 capitalize">
                    {role} Portal
                  </h2>
                  <p className="text-dark-muted text-lg mb-10 max-w-xl mx-auto">
                    Welcome to the {role} portal. This section is currently being prepared.
                  </p>
                  <button
                    onClick={() => navigate("/")}
                    className="px-8 py-3 bg-orange-primary text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg"
                  >
                    Go Back Home
                  </button>
                </div>
              ) : <Navigate to="/" replace />
            } />
          ))}
        </Routes>
      </main>

      {/* ── Modals (Login & Static Content) ─────────────────────────────────── */}
      {showLoginPortal && (
        <LoginPortal
          isOpen={showLoginPortal}
          onClose={() => setShowLoginPortal(false)}
          selectedLoginType={selectedLoginType}
          setSelectedLoginType={setSelectedLoginType}
          user={user}
          userRoles={userRoles}
          rolesLoading={rolesLoading}
        />
      )}

      <ModalContainer
        activeModal={activeModal}
        activeCard={activeCard}
        activeGroup={activeGroup}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isTabbed={isTabbed}
        getCard={getCard}
        closeModal={closeModal}
      />
    </div>
  );
};

export default App;
