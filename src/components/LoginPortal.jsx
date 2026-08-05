import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useLanguage from "../hooks/useLanguage";
import Translate from "./Translate";
import { supabase } from "../utils/supabase";
import { MOCK_STUDENTS as DEFAULT_MOCK_STUDENTS } from "../data/mockStudents";



const LoginPortal = ({ isOpen, onClose, user, userRoles, rolesLoading, loginAsParent, loginAsCandidate }) => {
  // authMode: 'main' | 'parent-login' | 'candidate-login' | 'selection' | 'pending'
  const [authMode, setAuthMode] = useState("main");
  const [mobileNo, setMobileNo] = useState("");
  const [candidateMobileNo, setCandidateMobileNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAuthMode("main");
      setMobileNo("");
      setCandidateMobileNo("");
      setMessage({ type: "", text: "" });
    }
  }, [isOpen]);

  // Handle post-login behaviour: redirect or show selection/pending
  useEffect(() => {
    if (user && isOpen && !rolesLoading) {
      if (userRoles.length === 1) {
        navigate(`/portal/${userRoles[0]}`);
        onClose();
      } else if (userRoles.length > 1) {
        if (authMode !== "selection") {
          setAuthMode("selection");
        }
      } else if (userRoles.length === 0) {
        if (authMode !== "pending") {
          setAuthMode("pending");
        }
      }
    }
  }, [user, userRoles, isOpen, rolesLoading, authMode, navigate, onClose]);

  if (!isOpen) return null;

  const loginTypes = [
    {
      type: "parent",
      title: "Parent Portal",
      titleKey: "login.portal.parent.title",
      icon: "fa-home",
      description: "Access your child's progress and updates",
      descriptionKey: "login.portal.parent.description",
      color: "bg-blue-50 border-blue-light",
      buttonColor: "bg-blue-primary hover:bg-blue-600",
      textColor: "text-blue-dark",
    },
    {
      type: "teacher",
      title: "Teacher Portal",
      titleKey: "login.portal.teacher.title",
      icon: "fa-chalkboard-user",
      description: "Manage classes and student records",
      descriptionKey: "login.portal.teacher.description",
      color: "bg-green-50 border-green-light",
      buttonColor: "bg-green-primary hover:bg-green-600",
      textColor: "text-green-dark",
    },
    {
      type: "management",
      title: "Management Portal",
      titleKey: "login.portal.management.title",
      icon: "fa-users-gear",
      description: "Institute management and operations",
      descriptionKey: "login.portal.management.description",
      color: "bg-purple-50 border-purple-light",
      buttonColor: "bg-purple-primary hover:bg-purple-600",
      textColor: "text-purple-dark",
    },
    {
      type: "admin",
      title: "Admin Portal",
      titleKey: "login.portal.admin.title",
      icon: "fa-shield-alt",
      description: "Manage institute administration",
      descriptionKey: "login.portal.admin.description",
      color: "bg-red-50 border-red-light",
      buttonColor: "bg-red-primary hover:bg-red-600",
      textColor: "text-red-dark",
    },
  ];

  const handleClose = () => {
    onClose();
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
    }
  };

  const handleParentLoginSubmit = async (e) => {
    e.preventDefault();
    if (!mobileNo.trim()) {
      setMessage({ type: "error", text: "Please enter your mobile number." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const cleanInputMobile = mobileNo.replace(/\D/g, "");
      let matchedStudents = [];

      // 1. Try calling the verify_parent_login_by_mobile RPC function (Option B - SECURE BYPASS OF RLS)
      try {
        const { data, error } = await supabase.rpc("verify_parent_login_by_mobile", {
          p_mobile: mobileNo.trim()
        });

        if (!error && data && data.length > 0) {
          matchedStudents = data;
        } else if (error) {
          console.warn("verify_parent_login_by_mobile RPC failed, trying Option A fallback:", error);
        }
      } catch (err) {
        console.warn("verify_parent_login_by_mobile RPC exception, trying Option A fallback:", err);
      }

      // 2. Option A Fallback: Try querying Supabase students table directly by mobile number
      if (matchedStudents.length === 0) {
        try {
          const { data, error } = await supabase
            .from("students")
            .select("*")
            .or(`mobile1.eq.${cleanInputMobile},mobile2.eq.${cleanInputMobile}`);

          if (!error && data && data.length > 0) {
            matchedStudents = data;
          }
        } catch (err) {
          console.warn("Direct query by mobile failed, trying fallback:", err);
        }
      }

      // 2. Fallback: Try LocalStorage
      if (matchedStudents.length === 0) {
        let raw = localStorage.getItem("jzv_students_local_data");
        const hasInMock = DEFAULT_MOCK_STUDENTS.some((s) => {
          const cleanM1 = (s.mobile1 || "").replace(/\D/g, "");
          const cleanM2 = (s.mobile2 || "").replace(/\D/g, "");
          return cleanInputMobile === cleanM1 || cleanInputMobile === cleanM2;
        });
        if (hasInMock) {
          localStorage.setItem("jzv_students_local_data", JSON.stringify(DEFAULT_MOCK_STUDENTS));
          raw = JSON.stringify(DEFAULT_MOCK_STUDENTS);
        } else if (!raw) {
          localStorage.setItem("jzv_students_local_data", JSON.stringify(DEFAULT_MOCK_STUDENTS));
          raw = JSON.stringify(DEFAULT_MOCK_STUDENTS);
        }
        if (raw) {
          try {
            const parsed = JSON.parse(raw) || [];
            matchedStudents = parsed.filter((s) => {
              const cleanDbMobile1 = (s.mobile1 || "").replace(/\D/g, "");
              const cleanDbMobile2 = (s.mobile2 || "").replace(/\D/g, "");
              return cleanInputMobile === cleanDbMobile1 || cleanInputMobile === cleanDbMobile2;
            });
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (matchedStudents.length === 0) {
        throw new Error("No students found registered with this Mobile Number.");
      }

      // Success! Log in parent session
      loginAsParent(matchedStudents[0], matchedStudents);
      navigate("/portal/parent");
      onClose();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const cleanMobile = candidateMobileNo.replace(/\D/g, "");
      if (!cleanMobile) {
        throw new Error("Please enter a valid mobile number.");
      }

      // Query admin_configruation of enable_test using RPC as a guest
      const { data, error } = await supabase.rpc('get_enable_test_config');
      if (error) {
        throw new Error("Failed to verify test status. Please try again later.");
      }

      if (!data || !data[cleanMobile]) {
        throw new Error("This mobile number is not enabled for any tests.");
      }

      const config = data[cleanMobile];
      const expireOn = new Date(config.expire_on);
      if (expireOn <= new Date()) {
        throw new Error("Your access to the tests has expired.");
      }

      // Login as Candidate!
      loginAsCandidate(cleanMobile, config.test, config.expire_on);
      navigate("/portal/candidate");
      onClose();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <div className="flex justify-between items-center p-4 sm:p-6 lg:p-8 bg-orange-primary border-b border-light-border shrink-0 gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl shadow-inner bg-white bg-opacity-20">
          <i className="fas fa-sign-in-alt"></i>
        </div>
        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight leading-tight">
          <Translate id={authMode === "selection" ? "login.header.select_portal" : authMode === "pending" ? "login.header.access_pending" : "login.header.portal_access"}>
            {authMode === "selection" ? "Select Portal" : authMode === "pending" ? "Access Pending" : "Portal Access"}
          </Translate>
        </h3>
      </div>
      <button
        onClick={handleClose}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 active:scale-[0.95] text-white transition-all duration-200 ease-out flex items-center justify-center text-xl sm:text-2xl shrink-0 focus:outline-none"
      >
        <i className="fas fa-times"></i>
      </button>
    </div>
  );

  return (
    <div
      id="login-portal-overlay"
      className="fixed inset-0 bg-dark-almostblack sm:bg-opacity-80 sm:backdrop-blur-sm z-50 flex items-center justify-center sm:p-4 transition-opacity duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-light-soft w-full h-full sm:h-auto sm:max-h-[90vh] sm:w-[95vw] sm:max-w-lg flex flex-col relative sm:border sm:border-light-border overflow-hidden rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {renderHeader()}

        <div className="p-5 sm:p-8 lg:p-12 overflow-y-auto flex-1 text-dark-charcoal leading-relaxed">
          {/* Main Portal Selection Dashboard */}
          {authMode === "main" && (
            <div className="flex flex-col gap-6 py-4">
              {import.meta.env.DEV && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl flex flex-col gap-2 shadow-sm">
                  <span className="text-[10px] font-bold text-yellow-800 uppercase tracking-wider flex items-center gap-1">
                    <i className="fas fa-bug text-yellow-600"></i> Dev Mode - Mock Bypass
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("jzv_admin_session", JSON.stringify({
                          user: { id: "bec0f709-c42e-4172-9672-6e340fda54a7", email: "teacher@test.com" },
                          roles: ["teacher"],
                          fullName: "JZV Teacher"
                        }));
                        window.location.reload();
                      }}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Login as Teacher
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("jzv_admin_session", JSON.stringify({
                          user: { id: "admin-1", email: "admin@test.com" },
                          roles: ["admin"],
                          fullName: "Admin User"
                        }));
                        window.location.reload();
                      }}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Login as Admin
                    </button>
                  </div>
                </div>
              )}

              {/* Associate Login card */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full text-left p-6 bg-pink-lbg border border-pink-soft/40 rounded-[2rem] hover:border-pink-primary hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center gap-6 shadow-sm group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white text-pink-primary flex items-center justify-center text-2xl transition-all duration-300 group-hover:scale-110 shrink-0 shadow-md shadow-pink-100">
                  <i className="fa-solid fa-address-card"></i>
                </div>
                <div>
                  <h5 className="font-bold text-lg text-pink-dark group-hover:text-pink-deep transition-colors">
                    Associate Login
                  </h5>
                  <p className="text-pink-dark/80 text-xs mt-1">
                    For teachers, staff, and administrators. Continue with Google.
                  </p>
                </div>
              </button>

              {/* Parent Login card */}
              <button
                onClick={() => setAuthMode("parent-login")}
                disabled={loading}
                className="w-full text-left p-6 bg-blue-lbg border border-blue-soft/40 rounded-[2rem] hover:border-blue-primary hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center gap-6 shadow-sm group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white text-blue-primary flex items-center justify-center text-2xl transition-all duration-300 group-hover:scale-110 shrink-0 shadow-md shadow-blue-100">
                  <i className="fas fa-user-graduate"></i>
                </div>
                <div>
                  <h5 className="font-bold text-lg text-blue-dark group-hover:text-blue-medium transition-colors">
                    Parent Login
                  </h5>
                  <p className="text-blue-dark/80 text-xs mt-1">
                    For parents and guardians. Login using student details.
                  </p>
                </div>
              </button>

              {/* Interview Candidate Login card */}
              <button
                onClick={() => setAuthMode("candidate-login")}
                disabled={loading}
                className="w-full text-left p-6 bg-teal-lbg border border-teal-soft/40 rounded-[2rem] hover:border-teal-primary hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center gap-6 shadow-sm group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white text-teal-primary flex items-center justify-center text-2xl transition-all duration-300 group-hover:scale-110 shrink-0 shadow-md shadow-teal-100">
                  <i className="fas fa-user-edit"></i>
                </div>
                <div>
                  <h5 className="font-bold text-lg text-teal-dark group-hover:text-teal-medium transition-colors">
                    Interview Candidate
                  </h5>
                  <p className="text-teal-dark/80 text-xs mt-1">
                    For candidates taking evaluation tests. Login using registered Mobile Number.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Parent Login Form */}
          {authMode === "parent-login" && (
            <div className="py-2">
              <button
                onClick={() => {
                  setAuthMode("main");
                  setMessage({ type: "", text: "" });
                }}
                className="text-orange-primary hover:text-orange-600 font-bold text-sm flex items-center gap-2 mb-6 active:scale-95 transition-all duration-200"
              >
                <i className="fas fa-arrow-left"></i> Back
              </button>
              
              <div className="mb-6">
                <h4 className="font-bold text-xl text-dark-deepblue mb-1">
                  Parent Login
                </h4>
                <p className="text-xs text-dark-soft">
                  Verify registered parent Mobile Number.
                </p>
              </div>

              {message.text && (
                <div
                  className={`p-4 rounded-xl mb-6 text-xs font-semibold ${
                    message.type === "error"
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-green-50 text-green-600 border border-green-100"
                  }`}
                >
                  <i className="fas fa-exclamation-circle mr-1.5"></i>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleParentLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                    Parent Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-orange-primary focus:ring-4 focus:ring-orange-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-primary hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-all duration-200 ease-out active:scale-95 flex items-center justify-center gap-2 text-sm shadow-lg shadow-orange-100 disabled:opacity-50 mt-6"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Verifying...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt"></i> Authenticate Login
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Candidate Login Form */}
          {authMode === "candidate-login" && (
            <div className="py-2">
              <button
                onClick={() => {
                  setAuthMode("main");
                  setMessage({ type: "", text: "" });
                }}
                className="text-teal-primary hover:text-teal-600 font-bold text-sm flex items-center gap-2 mb-6 active:scale-95 transition-all duration-200"
              >
                <i className="fas fa-arrow-left"></i> Back
              </button>
              
              <div className="mb-6">
                <h4 className="font-bold text-xl text-dark-deepblue mb-1">
                  Candidate Login
                </h4>
                <p className="text-xs text-dark-soft">
                  Verify registered candidate Mobile Number.
                </p>
              </div>

              {message.text && (
                <div
                  className={`p-4 rounded-xl mb-6 text-xs font-semibold ${
                    message.type === "error"
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-green-50 text-green-600 border border-green-100"
                  }`}
                >
                  <i className="fas fa-exclamation-circle mr-1.5"></i>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleCandidateLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-dark-deepblue mb-1.5">
                    Candidate Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={candidateMobileNo}
                    onChange={(e) => setCandidateMobileNo(e.target.value)}
                    className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-teal-primary focus:ring-4 focus:ring-teal-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-primary hover:bg-teal-600 text-white font-bold py-3.5 rounded-xl transition-all duration-200 ease-out active:scale-95 flex items-center justify-center gap-2 text-sm shadow-lg shadow-teal-100 disabled:opacity-50 mt-6"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Verifying...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt"></i> Authenticate Login
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Role Selection View (for multi-role users) */}
          {authMode === "selection" && (
            <div className="space-y-6">
              {rolesLoading ? (
                <div className="flex flex-col items-center py-12">
                  <div className="w-12 h-12 border-4 border-orange-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-dark-muted font-medium">
                    Loading your portals...
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-base font-bold text-dark-deepblue">
                    You have access to multiple portals. Select one to enter:
                  </p>
                  <div className="space-y-4">
                    {loginTypes
                      .filter((l) => userRoles.includes(l.type))
                      .map((login) => (
                        <button
                          key={login.type}
                          onClick={() => {
                            navigate(`/portal/${login.type}`);
                            handleClose();
                          }}
                          className={`${login.color} w-full p-5 rounded-2xl border text-left hover:shadow-md transition-all group flex items-center gap-4`}
                        >
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${login.buttonColor.split(" ")[0]}`}
                          >
                            <i className={`fas ${login.icon}`}></i>
                          </div>
                          <div className="flex-1">
                            <h4
                              className={`font-bold text-lg ${login.textColor} group-hover:underline`}
                            >
                              <Translate id={login.titleKey}>
                                {login.title}
                              </Translate>
                            </h4>
                            <p className="text-sm text-dark-charcoal">
                              <Translate id={login.descriptionKey}>
                                {login.description}
                              </Translate>
                            </p>
                          </div>
                          <i
                            className={`fas fa-chevron-right ${login.textColor} opacity-50`}
                          ></i>
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Pending Approval View */}
          {authMode === "pending" && (
            <div className="text-center py-8">
              {rolesLoading ? (
                <div className="flex flex-col items-center py-4">
                  <div className="w-12 h-12 border-4 border-orange-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-dark-muted font-medium">
                    Verifying permissions...
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-orange-50 text-orange-primary rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                    <i className="fas fa-clock"></i>
                  </div>
                  <h4 className="text-xl font-bold text-dark-deepblue mb-4">
                    Access Pending
                  </h4>
                  <p className="text-dark-muted mb-8 leading-relaxed">
                    Your account has been created successfully, but you don't
                    have any roles assigned yet. Please wait for an
                    administrator to assign your role (Parent, Teacher, etc.).
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-8 py-3 bg-dark-charcoal text-white font-bold rounded-lg hover:bg-dark-almostblack transition-all"
                  >
                    Got it
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPortal;
