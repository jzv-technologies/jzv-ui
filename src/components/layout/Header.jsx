import React from "react";
const Header = ({
  user,
  userRoles,
  fullName,
  onLogout,
  onLoginClick,
  onLogoClick,
}) => {
  return (
    <header className="bg-light-white shadow-sm sticky top-0 z-40 border-b border-light-border">
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & tagline */}
        <div
          className="flex flex-col sm:flex-row items-center gap-4 flex-1 min-w-0 cursor-pointer group"
          onClick={onLogoClick}
        >
          <img
            src="/media/jzv-rectangle-tranparent.png"
            alt="JZV Logo"
            className="h-14 sm:h-16 shrink-0 group-hover:opacity-80 transition-opacity"
          />
           <div className="border-l-8 border-pink-primary pl-5 sm:pl-6 lg:pl-8 bg-light-white shadow-sm rounded-r-xl py-1 text-sm sm:text-lg leading-relaxed text-dark-charcoal">
              <p className="text-teal-dark">
                a modern madrasa system integrated with 21st-century
                competencies
              </p>
              <p className="text-blue-dark">
                preparing your child to succeed in this Life and the Hereafter.
              </p>
            </div>
        </div>

        {/* Right side: Auth & Google Translate (Vertical Stack) */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-bold text-dark-muted uppercase tracking-wider">
                  {fullName || "User"}
                </span>
                <span className="text-sm font-bold text-dark-deepblue">
                  {user.email}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-dark-charcoal hover:bg-dark-almostblack text-white font-bold rounded-lg transition-all duration-200 ease-out active:scale-95 min-h-[44px]"
                title="Logout"
              >
                <i className="fas fa-sign-out-alt text-lg"></i>
                <span className="hidden sm:inline text-sm sm:text-base">
                  Logout
                </span>
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-orange-primary hover:bg-orange-600 text-white font-bold rounded-lg transition-all duration-200 ease-out active:scale-95 min-h-[44px]"
              title="Portal Login"
            >
              <i className="fas fa-sign-in-alt text-lg"></i>
              <span className="hidden sm:inline text-sm sm:text-base">
                Portal Login
              </span>
            </button>
          )}

          {/* Google Translate dropdown positioned below */}
          <div
            id="google_translate_element"
            className="translate-selector h-px w-[70px]"
          ></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
