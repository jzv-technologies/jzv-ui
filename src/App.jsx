import React, { useState, useEffect, useRef } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import useGoogleTranslate from "./hooks/useGoogleTranslate";
import LoginPortal from "./components/LoginPortal";
import Header from "./components/layout/Header";
import ModalContainer from "./components/layout/ModalContainer";
import { HOME_CARD_SEQUENCE } from "./components/homepage/CardsData";
import { useAuth } from "./hooks/useAuth";
import { useModal } from "./hooks/useModal";
import { AppRoutes } from "./components/AppRoutes";
import { LoadingFallback } from "./components/LoadingFallback";
import { useNavigate, useLocation } from "react-router-dom";

const App = () => {
  useGoogleTranslate();

  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirectedRef = useRef(false);

  const { user, userRoles, fullName, rolesLoading, authLoading, handleLogout, loginAsParent, loginAsCandidate, switchParentStudent, teacherRecord } =
    useAuth();

  const [showLoginPortal, setShowLoginPortal] = useState(false);
  const [adminSubView, setAdminSubView] = useState(null);
  const [managementSubView, setManagementSubView] = useState(null);
  const [teacherSubView, setTeacherSubView] = useState(null);
  const [parentSubView, setParentSubView] = useState(null);
  const [candidateSubView, setCandidateSubView] = useState(null);

  const {
    cards,
    activeModal,
    activeTab,
    setActiveTab,
    activeCard,
    activeGroup,
    isTabbed,
    openModal,
    closeModal,
    getCard,
  } = useModal(user, userRoles);

  // Close modal on Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (activeModal) closeModal();
        if (showLoginPortal) setShowLoginPortal(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeModal, showLoginPortal, closeModal]);

  // Redirect after login (only once per session)
  useEffect(() => {
    const isNowLoggedIn = user !== null;
    const rolesReady = !rolesLoading;

    if (isNowLoggedIn && rolesReady && !hasRedirectedRef.current) {
      // If already on a deep link/portal page (like /portal/display), don't force redirect
      if (location.pathname !== '/' && location.pathname !== '/portal') {
        hasRedirectedRef.current = true;
        return;
      }

      if (userRoles.length === 1) {
        hasRedirectedRef.current = true;
        navigate(`/portal/${userRoles[0]}`, { replace: true });
      } else if (userRoles.length > 1) {
        hasRedirectedRef.current = true;
        navigate("/portal", { replace: true });
      } else {
        // No roles assigned – stay on home page but mark as attempted
        hasRedirectedRef.current = true;
      }
    }
  }, [user, userRoles, rolesLoading, navigate, location.pathname]);

  // Reset redirect flag on logout
  useEffect(() => {
    if (!user) {
      hasRedirectedRef.current = false;
    }
  }, [user]);



  // Reset portal subview states when navigating to main selection portal or homepage
  useEffect(() => {
    if (location.pathname === "/portal" || location.pathname === "/") {
      setAdminSubView(null);
      setManagementSubView(null);
      setTeacherSubView(null);
      setParentSubView(null);
    }
  }, [location.pathname]);

  // Custom handler for card clicks (fixes "My Portal" navigation)
  const handleCardClick = (id) => {
    if (id === "my-portal") {
      if (userRoles.length > 1) {
        navigate("/portal");
      } else if (userRoles.length === 1) {
        navigate(`/portal/${userRoles[0]}`);
      } else {
        setShowLoginPortal(true);
      }
    } else {
      openModal(id);
    }
  };

  // Prepare grid cards for homepage
  const gridCards = cards
    .filter(
      (c) => {
        if (c.id === "useful-links") {
          if (!user && !userRoles.includes("parent")) {
            return false;
          }
        }
        return (
          c.showAtHome === true ||
          c.isGroupEntry === true ||
          (user && c.id === "my-portal")
        );
      },
    )
    .sort((a, b) => {
      const indexA = HOME_CARD_SEQUENCE.indexOf(a.id);
      const indexB = HOME_CARD_SEQUENCE.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

  if (authLoading) return <LoadingFallback />;

  const isDisplayBoard = location.pathname === '/portal/display';


  return (
    <div id="dashboard-section" className={isDisplayBoard ? "min-h-screen bg-[#064e3b]" : "min-h-screen pb-16"}>
      {!isDisplayBoard && (
        <Header
          user={user}
          userRoles={userRoles}
          fullName={fullName}
          teacherRecord={teacherRecord}
          onLogout={handleLogout}
          onLoginClick={() => setShowLoginPortal(true)}
          onLogoClick={() => {
            navigate("/");
            setAdminSubView(null);
            setManagementSubView(null);
            setTeacherSubView(null);
            setParentSubView(null);
          }}
          switchParentStudent={switchParentStudent}
        />
      )}


      <main className="relative">
        <AppRoutes
          user={user}
          userRoles={userRoles}
          fullName={fullName}
          rolesLoading={rolesLoading}
          gridCards={gridCards}
          openModal={handleCardClick}
          adminSubView={adminSubView}
          setAdminSubView={setAdminSubView}
          managementSubView={managementSubView}
          setManagementSubView={setManagementSubView}
          teacherSubView={teacherSubView}
          setTeacherSubView={setTeacherSubView}
          parentSubView={parentSubView}
          setParentSubView={setParentSubView}
          candidateSubView={candidateSubView}
          setCandidateSubView={setCandidateSubView}
          teacherRecord={teacherRecord}
        />
      </main>

      {showLoginPortal && (
        <LoginPortal
          isOpen={showLoginPortal}
          onClose={() => setShowLoginPortal(false)}
          user={user}
          userRoles={userRoles}
          rolesLoading={rolesLoading}
          loginAsParent={loginAsParent}
          loginAsCandidate={loginAsCandidate}
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
        currentUser={user}
      />
    </div>
  );
};

export default App;
