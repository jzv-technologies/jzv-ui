// src/hooks/useAuth.js
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../utils/supabase";
import {
  getUserDataCookie,
  setUserDataCookie,
  clearUserDataCookie,
} from "../utils/cookies";
import { showToast } from "../utils/toast";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [studentIds, setStudentIds] = useState("");
  const [fullName, setFullName] = useState("");
  const [rolesLoading, setRolesLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const rolesFetchedRef = useRef(false);
  const fetchingRef = useRef(false);
  const currentUserIdRef = useRef(null);
  const authListenerRef = useRef(null);

  // Use refs to avoid dependency loops in callbacks
  const userRolesRef = useRef([]);
  const studentIdsRef = useRef("");

  const updateRoles = (roles) => {
    userRolesRef.current = roles || [];
    setUserRoles(roles || []);
  };

  const updateStudentIds = (ids) => {
    studentIdsRef.current = ids || "";
    setStudentIds(ids || "");
  };

  const fetchTeacherName = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("name")
        .eq("auth_id", userId)
        .maybeSingle();
      if (data && data.name) {
        setFullName(data.name);
        return data.name;
      }
    } catch (err) {
      console.warn("Could not load teacher name from Supabase, checking LocalStorage fallback:", err);
      const raw = localStorage.getItem('jzv_timetable_data');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const t = (parsed.teachers || []).find(t => String(t.auth_id) === String(userId));
          if (t && t.name) {
            setFullName(t.name);
            return t.name;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return null;
  };

  const forceLogout = useCallback(async (userId, reason) => {
    if (userId) clearUserDataCookie(userId);
    await supabase.auth.signOut();
    showToast(reason, "error");
  }, []);

  const fetchRoles = useCallback(
    async (userId, authEvent, initialRolesFromCookie = []) => {
      // Prevent concurrent fetches
      if (fetchingRef.current) return { success: false, cancelled: true };
      // Don't fetch if roles already fetched for this user
      if (rolesFetchedRef.current && currentUserIdRef.current === userId) {
        return { success: true, roles: userRolesRef.current, studentIds: studentIdsRef.current };
      }

      fetchingRef.current = true;
      setRolesLoading(true);
      console.log(
        `[fetchRoles] Fetching roles for user: ${userId}, event: ${authEvent}`,
      );

      try {
        const { data, error } = await supabase
          .from("admin_users_view")
          .select("role")
          .eq("user_id", userId)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No roles found
            updateRoles([]);
            updateStudentIds("");
            clearUserDataCookie(userId);
            setRolesLoading(false);
            rolesFetchedRef.current = true;
            currentUserIdRef.current = userId;
            fetchingRef.current = false;
            return { success: true, roles: [], studentIds: "" };
          }
          throw error;
        }

        let roles = [];
        if (data?.role) {
          const sumValue = parseInt(data.role, 10);
          if (!isNaN(sumValue)) {
            // Bitwise integer sum format
            const bitwiseRoles = [
              { id: 1, name: "guest" },
              { id: 2, name: "parent" },
              { id: 4, name: "staff" },
              { id: 8, name: "teacher" },
              { id: 16, name: "management" },
              { id: 32, name: "admin" },
            ];
            roles = bitwiseRoles
              .filter((r) => (sumValue & r.id) !== 0)
              .map((r) => r.name);
          } else {
            // Fallback for legacy format
            const roleMap = {
              A: "admin",
              M: "management",
              T: "teacher",
              P: "parent",
              G: "guest",
              S: "staff",
            };
            roles = data.role
              .split(",")
              .map((code) => roleMap[code.trim().toUpperCase()])
              .filter(Boolean);
          }
        }

        // Save to cookie
        setUserDataCookie(userId, { roles });

        // Validate against initial cookie roles (if provided)
        if (initialRolesFromCookie.length > 0) {
          const cookieSet = new Set(initialRolesFromCookie);
          const dbSet = new Set(roles);
          const isEqual =
            initialRolesFromCookie.length === roles.length &&
            [...cookieSet].every((r) => dbSet.has(r));
          if (!isEqual) {
            await forceLogout(
              userId,
              "Your permissions have changed. Please log in again.",
            );
            setRolesLoading(false);
            fetchingRef.current = false;
            return { success: false, mismatch: true };
          }
        }

        updateRoles(roles);
        updateStudentIds("");
        setRolesLoading(false);
        rolesFetchedRef.current = true;
        currentUserIdRef.current = userId;
        fetchingRef.current = false;
        return { success: true, roles, studentIds: "" };
      } catch (err) {
        console.error("[fetchRoles] Error:", err);
        showToast(
          "Could not verify permissions. Some features may be unavailable.",
          "error",
        );
        setRolesLoading(false);
        fetchingRef.current = false;
        return { success: false, error: err };
      }
    },
    [forceLogout],
  );
  const handleLogout = useCallback(async () => {
    localStorage.removeItem("jzv_parent_session");
    localStorage.removeItem("jzv_admin_session");
    if (supabase.rest.headers) {
      delete supabase.rest.headers['x-parent-mobile'];
    }
    if (user && !user.parentMode) {
      clearUserDataCookie(user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    updateRoles([]);
    updateStudentIds("");
    setFullName("");
    currentUserIdRef.current = null;
  }, [user]);
  const loginAsParent = useCallback((student, students = []) => {
    const parentMobile = (student.mobile1 || student.mobile2 || "").replace(/\D/g, "");
    const parentSession = {
      user: {
        id: "parent-" + student.admission_no,
        email: student.student_name + " (" + student.admission_no + ")",
        full_name: student.student_name,
        parentMode: true,
        student,
        students: students.length > 0 ? students : [student],
        parentMobile,
      },
      fullName: student.student_name,
      studentIds: student.admission_no,
    };
    localStorage.setItem("jzv_parent_session", JSON.stringify(parentSession));
    if (parentMobile) {
      if (!supabase.rest.headers) supabase.rest.headers = {};
      supabase.rest.headers['x-parent-mobile'] = parentMobile;
    }
    setUser(parentSession.user);
    updateRoles(["parent"]);
    updateStudentIds(parentSession.studentIds);
    setFullName(parentSession.fullName);
    setAuthLoading(false);
  }, []);

  const switchParentStudent = useCallback((student, allStudents) => {
    const parentMobile = (student.mobile1 || student.mobile2 || "").replace(/\D/g, "");
    const parentSession = {
      user: {
        id: "parent-" + student.admission_no,
        email: student.student_name + " (" + student.admission_no + ")",
        full_name: student.student_name,
        parentMode: true,
        student,
        students: allStudents || (user && user.students) || [student],
        parentMobile,
      },
      fullName: student.student_name,
      studentIds: student.admission_no,
    };
    localStorage.setItem("jzv_parent_session", JSON.stringify(parentSession));
    if (parentMobile) {
      if (!supabase.rest.headers) supabase.rest.headers = {};
      supabase.rest.headers['x-parent-mobile'] = parentMobile;
    }
    setUser(parentSession.user);
    updateRoles(["parent"]);
    updateStudentIds(parentSession.studentIds);
    setFullName(parentSession.fullName);
  }, [user]);

  // Setup auth state listener only once
  useEffect(() => {
    // Check if there is a local parent session first
    const savedParent = localStorage.getItem("jzv_parent_session");
    if (savedParent) {
      try {
        const parsed = JSON.parse(savedParent);
        const parentMobile = parsed.user?.parentMobile || parsed.user?.student?.mobile1 || parsed.user?.student?.mobile2 || "";
        if (parentMobile) {
          if (!supabase.rest.headers) supabase.rest.headers = {};
          supabase.rest.headers['x-parent-mobile'] = parentMobile.replace(/\D/g, "");
        }
        setUser(parsed.user);
        updateRoles(["parent"]);
        updateStudentIds(parsed.studentIds);
        setFullName(parsed.fullName);
        setAuthLoading(false);
        return;
      } catch (e) {
        console.error(e);
      }
    }

    // Check if there is a mock admin/staff session
    const savedAdmin = localStorage.getItem("jzv_admin_session");
    if (savedAdmin) {
      try {
        const parsed = JSON.parse(savedAdmin);
        setUser(parsed.user);
        updateRoles(parsed.roles || ["admin"]);
        updateStudentIds("");
        setFullName(parsed.fullName);
        setAuthLoading(false);
        return;
      } catch (e) {
        console.error(e);
      }
    }

    // Safety timeout to avoid infinite loading
    const safetyTimeout = setTimeout(() => {
      setAuthLoading(false);
    }, 5000);

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If parent session is active, ignore Supabase session events
        if (localStorage.getItem("jzv_parent_session")) {
          setAuthLoading(false);
          return;
        }

        const currentUser = session?.user ?? null;

        // Avoid duplicate processing if user hasn't changed
        if (
          currentUser?.id === currentUserIdRef.current &&
          event !== "SIGNED_IN"
        ) {
          return;
        }

        setUser(currentUser);

        if (currentUser) {
          setFullName(currentUser.user_metadata?.full_name || "");

          // Load cached roles from cookie
          const cached = getUserDataCookie(currentUser.id);
          let cookieRoles = cached?.roles || [];
          let cookieStudentIds = cached?.studentIds || "";

          if (cookieRoles.length > 0) {
            console.log("[Auth] Using cached roles from cookie");
            updateRoles(cookieRoles);
            updateStudentIds(cookieStudentIds);
            rolesFetchedRef.current = true;
            currentUserIdRef.current = currentUser.id;
            if (cookieRoles.includes("teacher")) {
              fetchTeacherName(currentUser.id);
            }
          } else {
            updateRoles([]);
            updateStudentIds("");
          }

          // Hide loading spinner immediately
          setAuthLoading(false);

          // Fetch fresh roles only if:
          // - New sign in, OR
          // - No cached roles and INITIAL_SESSION (first load)
          const shouldFetch =
            event === "SIGNED_IN" ||
            (event === "INITIAL_SESSION" && cookieRoles.length === 0);

          if (shouldFetch) {
            console.log("[Auth] Fetching fresh roles from DB");
            const res = await fetchRoles(currentUser.id, event, cookieRoles);
            
            // Allow only existing users added by admin (must have roles)
            if (res && res.success && (!res.roles || res.roles.length === 0)) {
              await forceLogout(
                currentUser.id,
                "Access Denied: Your account has not been registered by an administrator."
              );
            } else if (res && res.success && res.roles.includes("teacher")) {
              fetchTeacherName(currentUser.id);
            }
          }
        } else {
          // No user – reset everything
          updateRoles([]);
          setFullName("");
          updateStudentIds("");
          setAuthLoading(false);
          rolesFetchedRef.current = false;
          fetchingRef.current = false;
          currentUserIdRef.current = null;
        }
      },
    );

    authListenerRef.current = subscription;

    return () => {
      clearTimeout(safetyTimeout);
      subscription?.subscription.unsubscribe();
    };
  }, [fetchRoles, forceLogout]);

  return {
    user,
    userRoles,
    studentIds,
    fullName,
    rolesLoading,
    authLoading,
    handleLogout,
    fetchRoles,
    loginAsParent,
    switchParentStudent,
  };
};


