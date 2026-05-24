import React from 'react';
import { useNavigate } from 'react-router-dom';

const PortalLayout = ({ children, userRoles, roleName, subView, onSetSubView }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (userRoles && userRoles.length > 1) {
      navigate("/portal");
    } else {
      navigate("/");
    }
  };

  const Breadcrumbs = () => (
    <div className="w-full bg-gradient-to-r from-orange-100/80 via-white to-green-100/80 border-b border-light-border px-6 py-4 flex items-center text-sm text-dark-muted shadow-md sticky top-[88px] sm:top-[96px] z-30 backdrop-blur-md bg-opacity-95">
      <div className={isFullWidth ? "w-full flex items-center gap-2" : "max-w-7xl mx-auto w-full flex items-center gap-2"}>
        <button onClick={handleGoHome} className="hover:text-orange-primary flex items-center gap-1 transition-colors font-semibold">
          <i className="fas fa-home"></i> Home
        </button>
        <i className="fas fa-chevron-right text-[10px] opacity-30"></i>
        <button 
          onClick={() => {
            if (onSetSubView) onSetSubView(null);
          }} 
          className={`${!subView ? 'text-orange-primary font-bold underline decoration-2' : 'hover:text-orange-primary'} transition-colors capitalize font-semibold`}
        >
          {roleName} Portal
        </button>
        {subView && (
          <>
            <i className="fas fa-chevron-right text-[10px] opacity-30"></i>
            <span className="text-orange-primary font-bold capitalize">{subView}</span>
          </>
        )}
      </div>
    </div>
  );

  const isFullWidth = roleName === "management" && !!subView;

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Breadcrumbs />
      <main className={isFullWidth ? "flex-1 w-full max-w-none p-0 m-0" : "flex-1 w-full max-w-7xl mx-auto px-6 py-12"}>
        {children}
      </main>
    </div>
  );
};

export default PortalLayout;
