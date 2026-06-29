// src/components/layout/PortalLayout.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Translate from "../Translate";

// Role‑specific style configurations
const roleStyles = {
  admin: {
    bgGradient: "from-orange-50 via-white to-orange-100",
    textColor: "text-orange-700",
    activeTextColor: "text-orange-800",
    hoverColor: "hover:text-orange-800",
    chevronColor: "text-orange-300",
    borderColor: "border-orange-200",
  },
  management: {
    bgGradient: "from-purple-50 via-white to-purple-100",
    textColor: "text-purple-700",
    activeTextColor: "text-purple-800",
    hoverColor: "hover:text-purple-800",
    chevronColor: "text-purple-300",
    borderColor: "border-purple-200",
  },
  teacher: {
    bgGradient: "from-green-50 via-white to-green-100",
    textColor: "text-green-700",
    activeTextColor: "text-green-800",
    hoverColor: "hover:text-green-800",
    chevronColor: "text-green-300",
    borderColor: "border-green-200",
  },
  parent: {
    bgGradient: "from-blue-50 via-white to-blue-100",
    textColor: "text-blue-700",
    activeTextColor: "text-blue-800",
    hoverColor: "hover:text-blue-800",
    chevronColor: "text-blue-300",
    borderColor: "border-blue-200",
  },
};

// Fallback for unknown roles (e.g., when roleName is not one of the four)
const defaultStyles = {
  bgGradient: "from-gray-50 via-white to-gray-50/50",
  textColor: "text-gray-700",
  activeTextColor: "text-gray-800",
  hoverColor: "hover:text-gray-800",
  chevronColor: "text-gray-300",
  borderColor: "border-gray-200",
};

const PortalLayout = ({
  children,
  userRoles,
  roleName,
  subView,
  onSetSubView,
}) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (userRoles && userRoles.length > 1) {
      navigate("/portal");
    } else {
      navigate("/");
    }
  };

  const styles = roleStyles[roleName] || defaultStyles;

  const Breadcrumbs = () => (
    <div
      className={`
        w-full bg-gradient-to-r ${styles.bgGradient}
        border-b ${styles.borderColor}
        px-6 py-4 flex items-center text-sm
        shadow-md sticky top-[88px] sm:top-[96px] z-30 backdrop-blur-md bg-opacity-95 print:hidden
      `}
    >
      <div
        className={
          isFullWidth
            ? "w-full flex items-center gap-2"
            : "max-w-7xl mx-auto w-full flex items-center gap-2"
        }
      >
        <button
          onClick={handleGoHome}
          className={`${styles.textColor} ${styles.hoverColor} flex items-center gap-1 transition-colors font-semibold`}
        >
          <i className="fas fa-home"></i>{" "}
          <Translate id="portal_layout.home">Home</Translate>
        </button>
        <i
          className={`fas fa-chevron-right text-[10px] ${styles.chevronColor}`}
        ></i>
        <button
          onClick={() => {
            if (onSetSubView) onSetSubView(null);
          }}
          className={`
            ${!subView ? `${styles.activeTextColor} font-bold underline decoration-2` : styles.textColor}
            ${styles.hoverColor} transition-colors capitalize font-semibold
          `}
        >
          {roleName} Portal
        </button>
        {subView && (
          <>
            <i
              className={`fas fa-chevron-right text-[10px] ${styles.chevronColor}`}
            ></i>
            <span className={`${styles.activeTextColor} font-bold capitalize`}>
              {subView}
            </span>
          </>
        )}
      </div>
    </div>
  );

  // const isFullWidth = roleName === "management" && !!subView;
  const isFullWidth = true;

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Breadcrumbs />
      <main
        className={
          isFullWidth
            ? "flex-1 w-full max-w-none p-0 m-0"
            : "flex-1 w-full max-w-7xl mx-auto px-6 py-12"
        }
      >
        {children}
      </main>
    </div>
  );
};

export default PortalLayout;
