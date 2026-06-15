import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useLanguage from "../hooks/useLanguage";
import Translate from "./Translate";
import { supabase } from "../utils/supabase";

const DEFAULT_MOCK_STUDENTS = [
  {
    id: 1,
    admission_no: "101",
    edsoft_id: "ED-10001",
    student_name: "Zayd Ahmed",
    birth_date: "2015-05-12",
    age: 11,
    gender: "Male",
    father_name: "Abdur Rahman",
    class_id: "c-1",
    mobile1: "9876543210",
    mobile2: "9876543220",
    enrollment: "Active",
    hostel: "Yes",
    transport_point: "Point A",
  },
  {
    id: 2,
    admission_no: "102",
    edsoft_id: "ED-10002",
    student_name: "Fatima Patel",
    birth_date: "2016-08-20",
    age: 9,
    gender: "Female",
    father_name: "Imran Patel",
    class_id: "c-2",
    mobile1: "9876543211",
    mobile2: "",
    enrollment: "Active",
    hostel: "No",
    transport_point: "Point B",
  },
  {
    id: 3,
    admission_no: "103",
    edsoft_id: "ED-10003",
    student_name: "Mohammed Siddique",
    birth_date: "2015-11-05",
    age: 10,
    gender: "Male",
    father_name: "Yusuf Siddique",
    class_id: "c-3",
    mobile1: "9876543212",
    mobile2: "",
    enrollment: "Active",
    hostel: "No",
    transport_point: "",
  },
];

const LoginPortal = ({ isOpen, onClose, user, userRoles, rolesLoading, loginAsParent }) => {
  // authMode: 'main' | 'parent-login' | 'selection' | 'pending'
  const [authMode, setAuthMode] = useState("main");
  const [admissionNo, setAdmissionNo] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAuthMode("main");
      setAdmissionNo("");
      setMobileNo("");
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
    if (!admissionNo.trim() || !mobileNo.trim()) {
      setMessage({ type: "error", text: "Please enter both fields." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      let student = null;

      // 1. Try calling the secure verify_parent_login RPC function (Option B)
      try {
        const { data, error } = await supabase.rpc("verify_parent_login", {
          p_admission_no: admissionNo.trim(),
          p_mobile: mobileNo.trim()
        });

        if (!error && data && data.length > 0) {
          student = data[0];
        } else if (error) {
          console.warn("verify_parent_login RPC failed, trying Option A fallback:", error);
        }
      } catch (err) {
        console.warn("verify_parent_login RPC exception, trying Option A fallback:", err);
      }

      // 2. Fallback: Try Option A direct table select
      if (!student) {
        try {
          const { data, error } = await supabase
            .from("students")
            .select("*")
            .ilike("admission_no", admissionNo.trim())
            .limit(1);

          if (!error && data && data.length > 0) {
            const potentialStudent = data[0];
            // Validate mobile since option A select returns student data without filtering by mobile on DB
            const cleanInputMobile = mobileNo.replace(/\D/g, "");
            const cleanDbMobile1 = (potentialStudent.mobile1 || "").replace(/\D/g, "");
            const cleanDbMobile2 = (potentialStudent.mobile2 || "").replace(/\D/g, "");
            if (cleanInputMobile === cleanDbMobile1 || cleanInputMobile === cleanDbMobile2) {
              student = potentialStudent;
            }
          }
        } catch (err) {
          console.warn("Direct Supabase query failed:", err);
        }
      }

      // 3. Fallback to LocalStorage
      if (!student) {
        let raw = localStorage.getItem("jzv_students_local_data");
        if (!raw) {
          localStorage.setItem("jzv_students_local_data", JSON.stringify(DEFAULT_MOCK_STUDENTS));
          raw = JSON.stringify(DEFAULT_MOCK_STUDENTS);
        }
        if (raw) {
          try {
            const parsed = JSON.parse(raw) || [];
            student = parsed.find(
              (s) => String(s.admission_no).trim().toLowerCase() === admissionNo.trim().toLowerCase()
            );
          } catch (e) {
            console.error(e);
          }
        }

        if (student) {
          // Check if mobile1 or mobile2 matches for local storage fallback
          const cleanInputMobile = mobileNo.replace(/\D/g, "");
          const cleanDbMobile1 = (student.mobile1 || "").replace(/\D/g, "");
          const cleanDbMobile2 = (student.mobile2 || "").replace(/\D/g, "");

          if (cleanInputMobile !== cleanDbMobile1 && cleanInputMobile !== cleanDbMobile2) {
            throw new Error("Invalid Admission Number or Mobile Number.");
          }
        }
      }

      if (!student) {
        throw new Error("Invalid Admission Number or Mobile Number.");
      }

      // Success! Log in parent session
      loginAsParent(student);
      navigate("/portal/parent");
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
        className="bg-light-soft w-full h-full sm:w-[95vw] sm:max-w-md lg:w-auto flex flex-col relative sm:border sm:border-light-border overflow-hidden rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {renderHeader()}

        <div className="p-5 sm:p-8 lg:p-12 overflow-y-auto flex-1 text-dark-charcoal leading-relaxed">
          {/* Main Portal Selection Dashboard */}
          {authMode === "main" && (
            <div className="flex flex-col gap-6 py-4">
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
                  Verify Admission Number and registered parent Mobile Number.
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
                    Admission Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2022/0051"
                    value={admissionNo}
                    onChange={(e) => setAdmissionNo(e.target.value)}
                    className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-orange-primary focus:ring-4 focus:ring-orange-50 outline-none transition-all text-sm font-semibold text-dark-primary"
                  />
                </div>
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
