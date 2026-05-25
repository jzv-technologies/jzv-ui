import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "./utils/supabase";
import useGoogleTranslate from "./hooks/useGoogleTranslate";
import LoginPortal from "./components/LoginPortal";
import {
  getCards,
  getGroupByName,
  HOME_CARD_SEQUENCE,
} from "./components/homepage/CardsData";
import Header from "./components/layout/Header";
import ModalContainer from "./components/layout/ModalContainer";
import HomeGrid from "./components/layout/HomeGrid";
import RoleSelectionDashboard from "./components/RoleSelectionDashboard";
import AdminPortal from "./components/portals/AdminPortal";
import RolePortal from "./components/portals/RolePortal";
import ManagementPortal from "./components/portals/ManagementPortal";
import DynamicForm from "./components/DynamicForm";
import { CARD_THEMES } from "./utils/cardTheme";

// Cookie helper functions for roles and permissions persistence (SWR pattern)
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

const setCookie = (name, value, days = 7) => {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax; Secure`;
};

const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

const getUserDataCookie = (userId) => {
  try {
    const raw = getCookie(`jzv_user_data_${userId}`);
    return raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch (e) {
    console.error("[Cookie] Error parsing user data cookie:", e);
    return null;
  }
};

const setUserDataCookie = (userId, data, days = 7) => {
  setCookie(`jzv_user_data_${userId}`, encodeURIComponent(JSON.stringify(data)), days);
};

const clearUserDataCookie = (userId) => {
  deleteCookie(`jzv_user_data_${userId}`);
};

const App = () => {
  useGoogleTranslate();

  const [activeModal, setActiveModal] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [showLoginPortal, setShowLoginPortal] = useState(false);
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const userRolesRef = useRef([]);
  const showLoginPortalRef = useRef(false);

  useEffect(() => {
    userRolesRef.current = userRoles;
  }, [userRoles]);

  useEffect(() => {
    showLoginPortalRef.current = showLoginPortal;
  }, [showLoginPortal]);

  const [fullName, setFullName] = useState("");
  const [studentIds, setStudentIds] = useState("");
  const [rolesLoading, setRolesLoading] = useState(false);

  // Navigation State
  const navigate = useNavigate();
  const location = useLocation();
  const [adminSubView, setAdminSubView] = useState(null); // users, students
  const [managementSubView, setManagementSubView] = useState(null); // resumes, complaints
  const [authLoading, setAuthLoading] = useState(true);

  const fetchCountRef = useRef(0);

  const fetchRoles = async (userId, authEvent) => {
    const fetchId = ++fetchCountRef.current;
    setRolesLoading(true);
    console.log(`[fetchRoles] Fetching roles for user: ${userId}, event: ${authEvent}, fetchId: ${fetchId}`);
    try {
      // Add a tiny delay if this is the initial session boot or SIGNED_IN event to let Supabase client stabilize
      if (authEvent === "INITIAL_SESSION" || authEvent === "SIGNED_IN") {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      if (fetchId !== fetchCountRef.current) {
        console.log(`[fetchRoles] Fetch ${fetchId} cancelled before query (newer fetch active)`);
        return { success: false, cancelled: true };
      }

      // Query admin_users_view directly to bypass RLS limitations and speed up page load
      const queryPromise = supabase
        .from("admin_users_view")
        .select("role_ids, student_ids")
        .eq("user_id", userId)
        .single();

      // Increased timeout to 15 seconds to prevent cold start query failures
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database query timeout")), 15000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (fetchId !== fetchCountRef.current) {
        console.log(`[fetchRoles] Fetch ${fetchId} ignored (newer fetch active)`);
        return { success: false, cancelled: true };
      }

      if (error) {
        if (error.code === "PGRST116") {
          console.log("[fetchRoles] No roles record found in admin_users_view (PGRST116)");
          setUserRoles([]);
          setStudentIds("");
          clearUserDataCookie(userId);
          return { success: true, roles: [], studentIds: "" };
        }
        throw error;
      }

      let roles = [];
      let studentIdsValue = "";
      if (data) {
        console.log("[fetchRoles] Roles data retrieved:", data);
        studentIdsValue = data.student_ids || "";
        setStudentIds(studentIdsValue);

        if (data.role_ids) {
          const roleMap = {
            A: "admin",
            M: "management",
            T: "teacher",
            P: "parent",
          };
          roles = data.role_ids
            .split(",")
            .map((code) => roleMap[code.trim().toUpperCase()])
            .filter(Boolean);
          setUserRoles(roles);
          console.log("[fetchRoles] Parsed roles:", roles);
        } else {
          setUserRoles([]);
        }
        
        // Save to cookie for fast subsequent loads
        setUserDataCookie(userId, { roles, studentIds: studentIdsValue });
      }
      return { success: true, roles, studentIds: studentIdsValue };
    } catch (err) {
      console.error("[fetchRoles] Error fetching roles:", err);
      // If we already have roles from the cache, keep them to avoid a broken UI state
      const cached = getUserDataCookie(userId);
      if (!cached && fetchId === fetchCountRef.current) {
        setUserRoles([]);
        setStudentIds("");
      }
      return { success: false, error: err };
    } finally {
      if (fetchId === fetchCountRef.current) {
        setRolesLoading(false);
      }
    }
  };

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 400 });

    let isMounted = true;
    let rolesFetched = false;
    let justSignedIn = false;

    // Safety timeout to ensure the loading screen is always dismissed
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn("[Auth] safety timeout triggered. Forcing authLoading to false.");
        setAuthLoading(false);
      }
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      console.log(`[Auth Event] ${event}`, session?.user?.email);

      if (event === "SIGNED_IN") {
        justSignedIn = true;
      }

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      let fetchSuccess = true;

      if (currentUser) {
        setFullName(currentUser.user_metadata?.full_name || "");
        
        // Stale-While-Revalidate: load roles and student ids from cookie cache immediately
        const cached = getUserDataCookie(currentUser.id);
        if (cached) {
          console.log("[Auth] Loaded roles and student IDs from cookie cache:", cached);
          setUserRoles(cached.roles || []);
          setStudentIds(cached.studentIds || "");
          fetchSuccess = true; // Dismiss authLoading spinner immediately since we have cached roles
        } else {
          fetchSuccess = false; // Need to wait for background fetch on initial load
        }

        // Fetch roles if not already fetched for this session, or retry on SIGNED_IN
        if (!rolesFetched || (userRolesRef.current.length === 0 && event === "SIGNED_IN")) {
          const res = await fetchRoles(currentUser.id, event);
          if (res.success) {
            rolesFetched = true;
            fetchSuccess = true;

            // If the user just completed a login, redirect them to the appropriate portal
            if (justSignedIn) {
              justSignedIn = false; // Reset the redirect flag
              if (res.roles && res.roles.length > 0) {
                if (window.location.pathname === "/" || showLoginPortalRef.current) {
                  setShowLoginPortal(false);
                  if (res.roles.length === 1) {
                    navigate(`/portal/${res.roles[0]}`);
                  } else {
                    navigate("/portal");
                  }
                }
              }
            }
          } else if (res.cancelled) {
            // Cancelled by a newer fetch, do not override fetchSuccess if it was set by cookie
          } else {
            // Failed: do not prevent future retries (rolesFetched = false)
            rolesFetched = false;
            fetchSuccess = true; // Still allow app loading to finish
          }
        }
      } else {
        setUserRoles([]);
        setFullName("");
        setStudentIds("");
        setAdminSubView(null);
        setManagementSubView(null);
        rolesFetched = false;
      }

      if (isMounted && fetchSuccess) {
        setAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (user) {
      clearUserDataCookie(user.id);
    }
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
  const openModal = async (id) => {
    if (id === "my-portal") {
      if (userRoles.length > 1) {
        navigate("/portal");
      } else if (userRoles.length === 1) {
        navigate(`/portal/${userRoles[0]}`);
      } else {
        // If logged in but no roles are assigned or loaded, open the login portal
        setShowLoginPortal(true);
        // Retry/force-fetch roles in the background in case previous fetch timed out/failed
        if (user) {
          const res = await fetchRoles(user.id, "MY_PORTAL_CLICK");
          if (res && res.success && res.roles && res.roles.length > 0) {
            if (res.roles.length === 1) {
              navigate(`/portal/${res.roles[0]}`);
              setShowLoginPortal(false);
            } else if (res.roles.length > 1) {
              navigate("/portal");
              setShowLoginPortal(false);
            }
          }
        }
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-white font-medium">Loading session...</p>
      </div>
    );
  }

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
          setManagementSubView(null);
        }}
      />

      {/* ── Dynamic View Content ────────────────────────────────────────────── */}
      <main className="relative">
        <Routes>
          <Route
            path="/"
            element={<HomeGrid gridCards={gridCards} openModal={openModal} />}
          />

          <Route
            path="/portal"
            element={
              user && userRoles.length > 1 ? (
                <RoleSelectionDashboard
                  userRoles={userRoles}
                  onSelectView={(view) => navigate(`/portal/${view}`)}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/portal/admin"
            element={
              user && userRoles.includes("admin") ? (
                <AdminPortal
                  userRoles={userRoles}
                  subView={adminSubView}
                  onSetSubView={setAdminSubView}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/portal/management"
            element={
              user && userRoles.includes("management") ? (
                <ManagementPortal
                  userRoles={userRoles}
                  subView={managementSubView}
                  onSetSubView={setManagementSubView}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {["teacher", "parent"].map((role) => {
            const tiles = [
              {
                id: "complaint-register",
                title: "Complaint Register",
                description:
                  "Submit and track your requests or complaints directly with the administration.",
                icon: "fa-clipboard-list",
                buttonColor: "bg-orange-primary text-white",
                onClick: () => openModal("complaint-register"),
              },
            ];

            return (
              <Route
                key={role}
                path={`/portal/${role}`}
                element={
                  user && userRoles.includes(role) ? (
                    <RolePortal
                      userRoles={userRoles}
                      role={role}
                      tiles={tiles}
                      openModal={openModal}
                    />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
            );
          })}

          <Route
            path="/career"
            element={
              <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
                <div className="w-full max-w-2xl">
                  <h1 className="text-white text-2xl">Career Opportunities</h1>
                  <DynamicForm
                    uuid="career"
                    textColor={CARD_THEMES.blueDark.textColor}
                  />
                </div>
              </div>
            }
          />
        </Routes>
      </main>

      {/* ── Modals (Login & Static Content) ─────────────────────────────────── */}
      {showLoginPortal && (
        <LoginPortal
          isOpen={showLoginPortal}
          onClose={() => setShowLoginPortal(false)}
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
        currentUser={user}
      />
    </div>
  );
};

export default App;
