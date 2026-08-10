import React, { useState, useEffect, useRef } from 'react';
import Translate from '../Translate';
import { supabase } from '../../utils/supabase';
import AddWorkExceptionsModal from '../portals/admin/AddWorkExceptionsModal';

const Header = ({
  user,
  fullName,
  teacherRecord,
  onLogout,
  onLoginClick,
  onLogoClick,
  switchParentStudent,
}) => {
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [pendingExceptionsCount, setPendingExceptionsCount] = useState(0);
  const [isExceptionsModalOpen, setIsExceptionsModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  const isManagementOrAdmin = (() => {
    if (!user) return false;
    const roles = user.userRoles || user.roles || user.user_metadata?.roles || [];
    const rolesLower = Array.isArray(roles) ? roles.map((r) => String(r).toLowerCase()) : [];
    const userRoleStr = String(user.role || '').toLowerCase();
    return (
      rolesLower.includes('management') ||
      rolesLower.includes('admin') ||
      userRoleStr === 'management' ||
      userRoleStr === 'admin'
    );
  })();

  const fetchPendingExceptions = async () => {
    if (!isManagementOrAdmin) return;
    try {
      const { count, error } = await supabase
        .from('request_tracker')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!error && count !== null) {
        setPendingExceptionsCount(count);
      } else {
        setPendingExceptionsCount(0);
      }
    } catch (err) {
      console.warn('Failed to fetch pending exceptions:', err);
    }
  };

  useEffect(() => {
    if (isManagementOrAdmin) {
      fetchPendingExceptions();
      const interval = setInterval(fetchPendingExceptions, 30000);
      return () => clearInterval(interval);
    }
  }, [isManagementOrAdmin]);

  const teacherId =
    teacherRecord?.teacher_id ||
    teacherRecord?.id ||
    user?.teacher_id ||
    user?.teacherId ||
    user?.user_metadata?.teacher_id;

  const empId = (() => {
    if (teacherRecord?.emp_id) return teacherRecord.emp_id;
    if (teacherRecord?.employee_id) return teacherRecord.employee_id;
    if (user?.emp_id) return user.emp_id;
    if (user?.employee_id) return user.employee_id;
    if (user?.user_metadata?.emp_id) return user.user_metadata.emp_id;

    // Check local storage for cached employees table record
    try {
      const localEmpsRaw = localStorage.getItem('jzv_employees_local_data');
      if (localEmpsRaw) {
        const localEmps = JSON.parse(localEmpsRaw);
        const matched = localEmps.find(
          (e) =>
            (user?.id && String(e.auth_id) === String(user.id)) ||
            (user?.email && e.email && e.email.toLowerCase() === user.email.toLowerCase())
        );
        if (matched?.emp_id) return matched.emp_id;
      }
    } catch (e) {}

    return null;
  })();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowStudentDropdown(false);
      }
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target)) {
        setShowMobileDropdown(false);
      }
    };
    if (showStudentDropdown || showMobileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStudentDropdown, showMobileDropdown]);

  return (
    <header className="bg-light-white shadow-sm sticky top-0 z-40 border-b border-light-border print:hidden">
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-4 mr-2">
        {/* Mobile row: Logo + (if logged in) user info + logout button on the right */}
        <div className="flex items-center justify-between sm:justify-start sm:gap-4 sm:hidden">
          <div className="cursor-pointer shrink-0" onClick={onLogoClick}>
            <img
              src={
                user ? '/media/jzv-round-round-white-bg.png' : '/media/jzv-rectangle-tranparent.png'
              }
              alt="JZV Logo"
              className="h-14 block sm:hidden group-hover:opacity-80 transition-opacity"
            />

            {/* Desktop Logo */}
            <img
              src="/media/jzv-rectangle-tranparent.png"
              alt="JZV Logo"
              className="h-14 sm:h-16 hidden sm:block group-hover:opacity-80 transition-opacity"
            />
          </div>

          {/* Mobile user info – for staff/teachers (non-parentMode) */}
          {user && !user.parentMode && (
            <div className="flex flex-col items-end mr-2 text-right">
              <span className="text-xs font-bold text-dark-muted uppercase tracking-wider">
                {fullName || 'User'}
              </span>
              <span className="text-sm font-bold text-dark-deepblue">{user.email}</span>
              {(teacherId || empId) && (
                <span className="text-[10px] font-semibold text-dark-soft mt-0.5">
                  {teacherId ? `Teacher ID: ${teacherId}` : ''}
                  {teacherId && empId ? ' • ' : ''}
                  {empId ? `Emp ID: ${empId}` : ''}
                </span>
              )}
            </div>
          )}

          {/* Mobile student selector – for parentMode with student list */}
          {user && user.parentMode && (
            <div
              className="flex items-center gap-1.5 ml-auto mr-2 relative"
              ref={mobileDropdownRef}
            >
              {/* Student selector – always shows name + ID, with dropdown if multiple */}
              <div className="relative">
                <div
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-bold shadow-sm shrink-0 transition-all duration-300 ${
                    user.students && user.students.length > 1
                      ? 'cursor-pointer hover:bg-blue-lbg hover:border-blue-primary'
                      : 'cursor-default'
                  }`}
                  onClick={
                    user.students && user.students.length > 1
                      ? () => setShowMobileDropdown(!showMobileDropdown)
                      : undefined
                  }
                >
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold text-dark-muted uppercase truncate max-w-[90vw]">
                      {user.student?.student_name}
                    </div>
                    <div className="text-[9px] text-dark-soft truncate max-w-[90vw]">
                      JZV ID: {user.student?.admission_no}
                    </div>
                  </div>
                  {user.students && user.students.length > 1 && (
                    <i
                      className={`fas fa-chevron-down text-[9px] text-blue-primary transition-transform duration-200 ${
                        showMobileDropdown ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </div>

                {/* Dropdown – only shown when multiple students and chevron clicked */}
                {showMobileDropdown && user.students && user.students.length > 1 && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-light-border rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-1 border-b border-light-border/60 text-[9px] font-bold text-dark-muted uppercase tracking-wider">
                      Select Profile
                    </div>
                    {user.students.map((std) => {
                      const isActive = std.admission_no === user.student?.admission_no;
                      return (
                        <button
                          key={std.admission_no}
                          type="button"
                          onClick={() => {
                            switchParentStudent(std, user.students);
                            setShowMobileDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors duration-150 flex flex-col ${
                            isActive
                              ? 'bg-blue-primary text-white'
                              : 'text-dark-charcoal hover:bg-blue-lbg hover:text-blue-dark'
                          }`}
                        >
                          <div className="text-right shrink-0">
                            <div className="text-[10px] font-bold text-dark-muted uppercase truncate max-w-full">
                              {std.student_name}
                            </div>
                            <div className="text-[9px] text-dark-soft truncate max-w-full">
                              JZV ID: {std.admission_no}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile logout button – always shown when logged in */}
          {user && (
            <button
              onClick={onLogout}
              className={`flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-700 text-white font-bold rounded-lg transition-all active:scale-95 shrink-0 ${!user.parentMode ? '' : ''}`}
            >
              <i className="fas fa-sign-out-alt text-base"></i>
              <span className="hidden sm:inline text-base">
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
                  a modern madrasa system integrated with 21st-century competencies
                </Translate>
              </p>
              <p className="text-blue-dark">
                <Translate id="header.tagline_line2">
                  preparing your child to succeed in this Life and the Hereafter.
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
                  a modern madrasa system integrated with 21st-century competencies
                </Translate>
              </p>
              <p className="text-blue-dark">
                <Translate id="header.tagline_line2">
                  preparing your child to succeed in this Life and the Hereafter.
                </Translate>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                {user.parentMode && user.students && user.students.length > 1 ? (
                  <div className="hidden md:flex flex-col items-end relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowStudentDropdown(!showStudentDropdown)}
                      className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-light-border hover:border-blue-primary bg-white hover:bg-blue-lbg transition-all duration-300 shadow-sm text-right cursor-pointer group"
                    >
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-blue-dark group-hover:text-blue-primary uppercase tracking-wider">
                          {fullName || 'User'}
                        </span>
                        <span className="text-[10px] text-dark-muted font-semibold mt-0.5">
                          JZV ID: {user.student?.admission_no}
                        </span>
                      </div>
                      <i
                        className={`fas fa-chevron-down text-xs text-blue-primary transition-transform duration-200 ${showStudentDropdown ? 'rotate-180' : ''}`}
                      ></i>
                    </button>
                    {showStudentDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-light-border rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-1.5 border-b border-light-border/60 text-[10px] font-bold text-dark-muted uppercase tracking-wider">
                          Select Profile
                        </div>
                        {user.students.map((std) => {
                          const isActive = std.admission_no === user.student?.admission_no;
                          return (
                            <button
                              key={std.admission_no}
                              type="button"
                              onClick={() => {
                                switchParentStudent(std, user.students);
                                setShowStudentDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors duration-150 flex flex-col ${
                                isActive
                                  ? 'bg-blue-primary text-white'
                                  : 'text-dark-charcoal hover:bg-blue-lbg hover:text-blue-dark'
                              }`}
                            >
                              <span>{std.student_name}</span>
                              <span
                                className={`text-[9px] ${isActive ? 'text-blue-100' : 'text-dark-muted'}`}
                              >
                                Admission ID: {std.admission_no}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs font-bold text-dark-muted uppercase tracking-wider">
                      {fullName || 'User'}
                    </span>
                    <span className="text-sm font-bold text-dark-deepblue">{user.email}</span>
                    {(teacherId || empId) && (
                      <span className="text-[10px] font-semibold text-dark-soft mt-0.5">
                        {teacherId ? `Teacher ID: ${teacherId}` : ''}
                        {teacherId && empId ? ' • ' : ''}
                        {empId ? `Emp ID: ${empId}` : ''}
                      </span>
                    )}
                  </div>
                )}
                {isManagementOrAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsExceptionsModalOpen(true)}
                    className="relative p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-800 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                    title="Requests & Exception Approvals"
                  >
                    <i className="fas fa-comment-dots text-base" />
                    {pendingExceptionsCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                        {pendingExceptionsCount}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-red-500 hover:bg-red-700 text-white font-bold rounded-lg transition-all active:scale-95 mr-10"
                >
                  <i className="fas fa-sign-out-alt text-lg"></i>

                  <span className="hidden sm:inline text-base">
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

      <AddWorkExceptionsModal
        isOpen={isExceptionsModalOpen}
        onClose={() => setIsExceptionsModalOpen(false)}
        onUpdate={fetchPendingExceptions}
        user={user}
        fullName={fullName}
      />
    </header>
  );
};

export default Header;
