import React, { useState } from "react";

const LoginPortal = ({
  isOpen,
  onClose,
  selectedLoginType,
  setSelectedLoginType,
}) => {
  if (!isOpen) return null;

  const loginTypes = [
    {
      type: "parent",
      title: "Parent Login",
      icon: "fa-home",
      description: "Access your child's progress and updates",
      color: "bg-blue-50 border-blue-light",
      buttonColor: "bg-blue-primary hover:bg-blue-600",
      textColor: "text-blue-dark",
    },
    {
      type: "teacher",
      title: "Teacher Login",
      icon: "fa-chalkboard-user",
      description: "Manage classes and student records",
      color: "bg-green-50 border-green-light",
      buttonColor: "bg-green-primary hover:bg-green-600",
      textColor: "text-green-dark",
    },
    {
      type: "admin",
      title: "Admin Login",
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
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 lg:p-8 bg-orange-primary border-b border-light-border shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl shadow-inner bg-white bg-opacity-20">
              <i className="fas fa-sign-in-alt"></i>
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight leading-tight">
              Portal Login
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 active:scale-[0.95] text-white transition-all duration-200 ease-out flex items-center justify-center text-xl sm:text-2xl shrink-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-secondary"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Login Type Selection */}
        {!selectedLoginType ? (
          <div className="p-5 sm:p-8 lg:p-12 overflow-y-auto flex-1 text-dark-charcoal leading-relaxed">
            <p className="text-base sm:text-lg font-bold text-dark-deepblue mb-6">
              Select your login type:
            </p>
            <div className="space-y-4">
              {loginTypes.map((login) => (
                <div
                  key={login.type}
                  className={`${login.color} p-5 sm:p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${login.buttonColor.split(" ")[0]}`}
                    >
                      <i className={`fas ${login.icon}`}></i>
                    </div>
                    <div>
                      <h4
                        className={`font-bold text-base sm:text-lg ${login.textColor}`}
                      >
                        {login.title}
                      </h4>
                      <p className="text-sm sm:text-base text-dark-charcoal">
                        {login.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLoginType(login.type)}
                    className={`w-full ${login.buttonColor} text-white font-bold py-2 sm:py-3 rounded-lg transition-all duration-200 ease-out active:scale-95 min-h-[44px]`}
                  >
                    Login as {login.title.split(" ")[0]}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="p-5 sm:p-8 lg:p-12 overflow-y-auto flex-1 text-dark-charcoal leading-relaxed">
            <div className="mb-6">
              <button
                onClick={() => setSelectedLoginType(null)}
                className="text-orange-primary hover:text-orange-600 font-bold text-base flex items-center gap-2 mb-6 active:scale-95 transition-all duration-200"
              >
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <h4 className="font-bold text-base sm:text-lg lg:text-xl mb-2">
                {selectedLoginType === "parent"
                  ? "Parent Portal"
                  : selectedLoginType === "teacher"
                    ? "Teacher Portal"
                    : "Admin Portal"}
              </h4>
              <p className="text-sm sm:text-base text-dark-muted mb-6">
                Enter your credentials to login
              </p>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block font-bold text-sm sm:text-base text-dark-deepblue mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 sm:py-3 border border-light-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary focus:border-transparent text-base sm:text-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-sm sm:text-base text-dark-deepblue mb-2">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2 sm:py-3 border border-light-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary focus:border-transparent text-base sm:text-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded"
                />
                <label
                  htmlFor="remember"
                  className="text-sm sm:text-base text-dark-charcoal cursor-pointer"
                >
                  Remember me
                </label>
              </div>
              <button
                type="submit"
                className="w-full bg-orange-primary hover:bg-orange-600 text-white font-bold py-2 sm:py-3 rounded-lg transition-all duration-200 ease-out active:scale-95 min-h-[44px] text-base sm:text-lg"
              >
                Login
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-light-border">
              <p className="text-sm sm:text-base text-dark-muted text-center mb-3">
                {selectedLoginType === "parent"
                  ? "Don't have an account? "
                  : "Contact administrator for access. "}
                <a
                  href="#"
                  className="text-orange-primary hover:text-orange-600 font-bold"
                >
                  {selectedLoginType === "parent" ? "Register here" : "Support"}
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPortal;
