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

  const fetchRoles = useCallback(
    async (userId, authEvent, initialRolesFromCookie = []) => {
      // Prevent concurrent fetches
      if (fetchingRef.current) return { success: false, cancelled: true };
      // Don't fetch if roles already fetched for this user
      if (rolesFetchedRef.current && currentUserIdRef.current === userId) {
        return { success: true, roles: userRoles, studentIds };
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
            setUserRoles([]);
            setStudentIds("");
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

        setUserRoles(roles);
        setStudentIds(studentIdsValue);
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
    [userRoles, studentIds],
  ); // include dependencies for the returned object, though we'll ensure it's stable

  const forceLogout = useCallback(async (userId, reason) => {
    if (userId) clearUserDataCookie(userId);
    await supabase.auth.signOut();
    showToast(reason, "error");
  }, []);

  const handleLogout = useCallback(async () => {
    if (user) clearUserDataCookie(user.id);
    rolesFetchedRef.current = false;
    fetchingRef.current = false;
    currentUserIdRef.current = null;
    await supabase.auth.signOut();
  }, [user]);

  // Setup auth state listener only once
  useEffect(() => {
    // Safety timeout to avoid infinite loading
    const safetyTimeout = setTimeout(() => {
      setAuthLoading(false);
    }, 5000);

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
            setUserRoles(cookieRoles);
            setStudentIds(cookieStudentIds);
            rolesFetchedRef.current = true;
            currentUserIdRef.current = currentUser.id;
          } else {
            setUserRoles([]);
            setStudentIds("");
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
            await fetchRoles(currentUser.id, event, cookieRoles);
          }
        } else {
          // No user – reset everything
          setUserRoles([]);
          setFullName("");
          setStudentIds("");
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
  }, [fetchRoles]); // fetchRoles is now stable due to useCallback

  return {
    user,
    userRoles,
    studentIds,
    fullName,
    rolesLoading,
    authLoading,
    handleLogout,
    fetchRoles, // expose if needed elsewhere
  };
};
