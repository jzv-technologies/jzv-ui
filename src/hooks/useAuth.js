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
          .select("role_ids, student_ids")
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
        let studentIdsValue = data?.student_ids || "";
        if (data?.role_ids) {
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
        }

        // Save to cookie
        setUserDataCookie(userId, { roles, studentIds: studentIdsValue });

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
        updateStudentIds(studentIdsValue);
        setRolesLoading(false);
        rolesFetchedRef.current = true;
        currentUserIdRef.current = userId;
        fetchingRef.current = false;
        return { success: true, roles, studentIds: studentIdsValue };
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
    if (user && !user.parentMode) clearUserDataCookie(user.id);
    rolesFetchedRef.current = false;
    fetchingRef.current = false;
    currentUserIdRef.current = null;
    await supabase.auth.signOut();
  }, [user]);

  const loginAsParent = useCallback((student) => {
    const parentSession = {
      user: {
        id: "parent-" + student.admission_no,
        email: student.mobile1 || "parent@jzv.com",
        full_name: student.father_name || "Parent",
        parentMode: true,
        student,
      },
      fullName: student.father_name || "Parent",
      studentIds: student.admission_no,
    };
    localStorage.setItem("jzv_parent_session", JSON.stringify(parentSession));
    setUser(parentSession.user);
    updateRoles(["parent"]);
    updateStudentIds(parentSession.studentIds);
    setFullName(parentSession.fullName);
    setAuthLoading(false);
  }, []);

  // Setup auth state listener only once
  useEffect(() => {
    // Check if there is a local parent session first
    const savedParent = localStorage.getItem("jzv_parent_session");
    if (savedParent) {
      try {
        const parsed = JSON.parse(savedParent);
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
  };
};


