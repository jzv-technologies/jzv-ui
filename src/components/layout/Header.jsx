import React from "react";
import Translate from "../Translate";

const Header = ({ user, fullName, onLogout, onLoginClick, onLogoClick }) => {
  return (
    <header className="bg-light-white shadow-sm sticky top-0 z-40 border-b border-light-border">
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Mobile row: Logo + (if logged in) Logout button on the right */}
        <div className="flex items-center justify-between sm:justify-start sm:gap-4 sm:hidden">
          <div className="cursor-pointer shrink-0" onClick={onLogoClick}>
            <img
              src="/media/jzv-rectangle-tranparent.png"
              alt="JZV Logo"
              className="h-14 sm:h-16 group-hover:opacity-80 transition-opacity"
            />
          </div>
          {user && (
            <button
              onClick={onLogout}
              className="sm:hidden flex items-center gap-2 px-4 py-2 bg-dark-charcoal hover:bg-dark-almostblack text-white font-bold rounded-lg transition-all active:scale-95"
            >
              <i className="fas fa-sign-out-alt text-lg"></i>
              <span className="text-sm">
                <Translate id="header.logout">Logout</Translate>
              </span>
            </button>
          )}
        </div>

        {/* Mobile logged‑out content: tagline + login button (stacked) */}
        {!user && (
          <div className="mt-3 space-y-3 sm:hidden">
            <div className="border-l-8 border-pink-primary pl-5 bg-light-white shadow-sm rounded-r-xl py-1 text-sm leading-relaxed text-dark-charcoal">
              <p className="text-teal-dark">
                <Translate id="header.tagline_line1">
                  a modern madrasa system integrated with 21st-century
                  competencies
                </Translate>
              </p>
              <p className="text-blue-dark">
                <Translate id="header.tagline_line2">
                  preparing your child to succeed in this Life and the
                  Hereafter.
                </Translate>
              </p>
            </div>
            <button
              onClick={onLoginClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-primary hover:bg-orange-600 text-white font-bold rounded-lg transition-all active:scale-95"
            >
              <i className="fas fa-sign-in-alt text-lg"></i>
              <span>
                <Translate id="header.portal_login">Portal Login</Translate>
              </span>
            </button>
          </div>
        )}

        {/* Desktop layout (sm and up) – original horizontal row */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="cursor-pointer shrink-0" onClick={onLogoClick}>
              <img
                src="/media/jzv-rectangle-tranparent.png"
                alt="JZV Logo"
                className="h-16 group-hover:opacity-80 transition-opacity"
              />
            </div>
            <div className="border-l-8 border-pink-primary pl-5 lg:pl-8 bg-light-white shadow-sm rounded-r-xl py-1 text-sm lg:text-lg leading-relaxed text-dark-charcoal">
              <p className="text-teal-dark">
                <Translate id="header.tagline_line1">
                  a modern madrasa system integrated with 21st-century
                  competencies
                </Translate>
              </p>
              <p className="text-blue-dark">
                <Translate id="header.tagline_line2">
                  preparing your child to succeed in this Life and the
                  Hereafter.
                </Translate>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
                  className="flex items-center gap-2 px-6 py-3 bg-dark-charcoal hover:bg-dark-almostblack text-white font-bold rounded-lg transition-all active:scale-95"
                >
                  <i className="fas fa-sign-out-alt text-lg"></i>
                  <span className="text-sm sm:text-base">
                    <Translate id="header.logout">Logout</Translate>
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 px-6 py-3 bg-orange-primary hover:bg-orange-600 text-white font-bold rounded-lg transition-all active:scale-95"
              >
                <i className="fas fa-sign-in-alt text-lg"></i>
                <span className="text-sm sm:text-base">
                  <Translate id="header.portal_login">Portal Login</Translate>
                </span>
              </button>
            )}
            <div
              id="google_translate_element"
              className="translate-selector relative h-10 w-[70px] overflow-hidden 
               [&_.goog-te-gadget]:text-[0px] 
               [&_.goog-te-combo]:w-[70px] [&_.goog-te-combo]:max-w-[70px] [&_.goog-te-combo]:m-0 [&_.goog-te-combo]:text-sm"
            ></div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
