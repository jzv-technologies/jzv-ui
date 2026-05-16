import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

const LoginPortal = ({
  isOpen,
  onClose,
  selectedLoginType,
  setSelectedLoginType,
  user,
  userRoles,
  rolesLoading,
}) => {
  // authMode: 'main' | 'login' | 'register' | 'selection' | 'pending'
  const [authMode, setAuthMode] = useState("main");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!isOpen) {
      setAuthMode("main");
      setEmail("");
      setName("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setMessage({ type: "", text: "" });
    }
  }, [isOpen]);

  // Handle mode transition when user logs in (e.g. via Social redirect)
  useEffect(() => {
    if (user && isOpen && authMode !== "selection" && authMode !== "pending") {
      if (userRoles.length > 0) {
        setAuthMode("selection");
      } else if (!rolesLoading) {
        setAuthMode("pending");
      }
    }
  }, [user, userRoles, rolesLoading, isOpen, authMode]);

  if (!isOpen) return null;

  const loginTypes = [
    {
      type: "parent",
      title: "Parent Portal",
      icon: "fa-home",
      description: "Access your child's progress and updates",
      color: "bg-blue-50 border-blue-light",
      buttonColor: "bg-blue-primary hover:bg-blue-600",
      textColor: "text-blue-dark",
    },
    {
      type: "teacher",
      title: "Teacher Portal",
      icon: "fa-chalkboard-user",
      description: "Manage classes and student records",
      color: "bg-green-50 border-green-light",
      buttonColor: "bg-green-primary hover:bg-green-600",
      textColor: "text-green-dark",
    },
    {
      type: "management",
      title: "Management Portal",
      icon: "fa-users-gear",
      description: "Institute management and operations",
      color: "bg-purple-50 border-purple-light",
      buttonColor: "bg-purple-primary hover:bg-purple-600",
      textColor: "text-purple-dark",
    },
    {
      type: "admin",
      title: "Admin Portal",
      icon: "fa-shield-alt",
      description: "Manage institute administration",
      color: "bg-red-50 border-red-light",
      buttonColor: "bg-red-primary hover:bg-red-600",
      textColor: "text-red-dark",
    },
  ];

  const handleClose = () => {
    setSelectedLoginType(null);
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

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      if (authMode === "register") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (authError) throw authError;

        if (authData.user) {
          // Initialize user_roles record (only IDs and roles, no name)
          const { error: profileError } = await supabase
            .from("user_roles")
            .insert([
              {
                user_id: authData.user.id,
                role_ids: "", // Pending assignment
                student_ids: "",
              },
            ]);
          if (profileError) throw profileError;
        }

        setAuthMode("pending");
        setMessage({
          type: "success",
          text: "Registration successful! Your account is pending administrator approval for role assignment.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Role check is handled by useEffect and App.jsx subscription
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <div className="flex justify-between items-center p-4 sm:p-6 lg:p-8 bg-orange-primary border-b border-light-border shrink-0 gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl shadow-inner bg-white bg-opacity-20">
          <i
            className={`fas ${authMode === "register" ? "fa-user-plus" : "fa-sign-in-alt"}`}
          ></i>
        </div>
        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight leading-tight">
          {authMode === "register"
            ? "Create Account"
            : authMode === "selection"
              ? "Select Portal"
              : authMode === "pending"
                ? "Access Pending"
                : "Portal Access"}
        </h3>
      </div>
      <button
        onClick={handleClose}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 active:scale-[0.95] text-white transition-all duration-200 ease-out flex items-center justify-center text-xl sm:text-2xl shrink-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-secondary"
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
          {/* Main Options: Login or Register */}
          {authMode === "main" && (
            <div className="flex flex-col gap-6 py-4">
              <div className="text-center mb-4">
                <h4 className="text-xl font-bold text-dark-deepblue mb-2">
                  Welcome to JZV Portal
                </h4>
                <p className="text-dark-muted">
                  Please login or create an account to continue.
                </p>
              </div>

              {/* Google Login Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white border border-light-border text-dark-charcoal font-bold py-4 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg disabled:opacity-50"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="w-6 h-6"
                />
                Continue with Google
              </button>

              <div className="flex items-center gap-4">
                <div className="h-px bg-light-border flex-1"></div>
                <span className="text-dark-muted font-medium text-sm">
                  OR USE EMAIL
                </span>
                <div className="h-px bg-light-border flex-1"></div>
              </div>

              <button
                onClick={() => setAuthMode("login")}
                className="w-full bg-orange-primary hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
              >
                <i className="fas fa-sign-in-alt"></i> Login with Email
              </button>
              <button
                onClick={() => setAuthMode("register")}
                className="w-full bg-white border-2 border-orange-primary text-orange-primary hover:bg-orange-50 font-bold py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
              >
                <i className="fas fa-user-plus"></i> New User? Register
              </button>
            </div>
          )}

          {/* Login or Register Form */}
          {(authMode === "login" || authMode === "register") && (
            <>
              <div className="mb-6">
                <button
                  onClick={() => setAuthMode("main")}
                  className="text-orange-primary hover:text-orange-600 font-bold text-base flex items-center gap-2 mb-6 active:scale-95 transition-all duration-200"
                >
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                <h4 className="font-bold text-base sm:text-lg lg:text-xl mb-2">
                  {authMode === "login" ? "Login" : "Register"}
                </h4>
                <p className="text-sm sm:text-base text-dark-muted">
                  {authMode === "login"
                    ? "Enter your credentials to access the portal"
                    : "Create an account. Roles will be assigned by admin."}
                </p>
              </div>

              {message.text && (
                <div
                  className={`p-4 rounded-lg mb-6 text-sm font-medium ${
                    message.type === "error"
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-green-50 text-green-600 border border-green-100"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleAuth}>
                {authMode === "register" && (
                  <div>
                    <label className="block font-bold text-sm sm:text-base text-dark-deepblue mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-2 sm:py-3 border border-light-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary focus:border-transparent text-base sm:text-lg"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-bold text-sm sm:text-base text-dark-deepblue mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 sm:py-3 border border-light-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary focus:border-transparent text-base sm:text-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-sm sm:text-base text-dark-deepblue mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 sm:py-3 border border-light-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary focus:border-transparent text-base sm:text-lg pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-charcoal transition-colors"
                    >
                      <i
                        className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                      ></i>
                    </button>
                  </div>
                </div>

                {authMode === "register" && (
                  <div>
                    <label className="block font-bold text-sm sm:text-base text-dark-deepblue mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2 sm:py-3 border border-light-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary focus:border-transparent text-base sm:text-lg pr-12"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-charcoal transition-colors"
                      >
                        <i
                          className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}
                        ></i>
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-primary hover:bg-orange-600 text-white font-bold py-4 rounded-lg transition-all duration-200 ease-out active:scale-95 min-h-[44px] text-lg disabled:opacity-50 mt-4"
                >
                  {loading
                    ? "Processing..."
                    : authMode === "login"
                      ? "Sign In"
                      : "Create Account"}
                </button>
              </form>
            </>
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
                            setSelectedLoginType(login.type);
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
                              {login.title}
                            </h4>
                            <p className="text-sm text-dark-charcoal">
                              {login.description}
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
