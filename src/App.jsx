import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "./utils/supabase";
import useGoogleTranslate from "./hooks/useGoogleTranslate";
import LoginPortal from "./components/LoginPortal";
import _4Ts from "./components/homepage/about-us/4Ts";
import { getCards, TAB_GROUPS, GROUPED_IDS, getGroupByName, getGroupById, HOME_CARD_SEQUENCE } from "./components/homepage/CardsData";
import Header from "./components/layout/Header";
import ModalContainer from "./components/layout/ModalContainer";
import HomeGrid from "./components/layout/HomeGrid";
import RoleSelectionDashboard from "./components/RoleSelectionDashboard";
import AdminPortal from "./components/portals/AdminPortal";
import RolePortal from "./components/portals/RolePortal";
import DynamicForm from "./components/DynamicForm";
import { CARD_THEMES } from "./utils/cardTheme";



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

  const fetchRoles = async (userId, authEvent) => {
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
        fetchRoles(currentUser.id, _event);
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
    currentUser: user,
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

  const gridCards = cards
    .filter(
      (c) =>
        c.showAtHome === true ||
        c.isGroupEntry === true ||
        (user && c.id === "my-portal"),
    )
    .sort((a, b) => {
      const indexA = HOME_CARD_SEQUENCE.indexOf(a.id);
      const indexB = HOME_CARD_SEQUENCE.indexOf(b.id);
      // Fallback if an ID is missing from sequence: append to the end
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

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
              <AdminPortal
                userRoles={userRoles}
                subView={adminSubView}
                onSetSubView={setAdminSubView}
              />
            ) : <Navigate to="/" replace />
          } />

          {["teacher", "parent", "management"].map(role => {
            const tiles = [
              {
                id: "complaint-register",
                title: "Complaint Register",
                description: "Submit and track your requests or complaints directly with the administration.",
                icon: "fa-clipboard-list",
                buttonColor: "bg-orange-primary text-white",
                onClick: () => openModal("complaint-register")
              }
            ];
            
            return (
              <Route key={role} path={`/portal/${role}`} element={
                user && userRoles.includes(role) ? (
                  <RolePortal 
                    userRoles={userRoles}
                    role={role}
                    tiles={tiles}
                    openModal={openModal}
                  />
                ) : <Navigate to="/" replace />
              } />
            );
          })}
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
