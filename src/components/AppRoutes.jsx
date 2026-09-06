import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomeGrid from './layout/HomeGrid';
import DynamicForm from './DynamicForm';
import { CARD_THEMES } from '../utils/cardTheme';
import Translate from './Translate';
import TVDisplayDashboard from './dashboard/TVDisplayDashboard';
import UnifiedPortal from './auth/UnifiedPortal';

const portalRouteFallback = (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const AppRoutes = ({
  user,
  userRoles = [],
  fullName,
  rolesLoading,
  gridCards,
  openModal,
  teacherRecord,
}) => {
  const renderUnifiedPortal = () => {
    if (!user) return <Navigate to="/" replace />;
    if (rolesLoading) return portalRouteFallback;
    return (
      <UnifiedPortal
        user={user}
        userRoles={userRoles}
        fullName={fullName}
        teacherRecord={teacherRecord}
        openModal={openModal}
      />
    );
  };

  return (
    <Routes>
      {/* Public Home Grid */}
      <Route path="/" element={<HomeGrid gridCards={gridCards} openModal={openModal} />} />

      {/* Primary Unified Portal Routes */}
      <Route path="/portal" element={renderUnifiedPortal()} />
      <Route path="/portal/v2" element={renderUnifiedPortal()} />

      {/* Phase 5 Cutover Redirects: All legacy portal routes redirect to Unified Portal */}
      <Route path="/portal/admin" element={<Navigate to="/portal" replace />} />
      <Route path="/portal/management" element={<Navigate to="/portal" replace />} />
      <Route path="/portal/parent" element={<Navigate to="/portal" replace />} />
      <Route path="/portal/teacher" element={<Navigate to="/portal" replace />} />
      <Route path="/portal/candidate" element={<Navigate to="/portal" replace />} />

      {/* Standalone Display Board & Career Pages */}
      <Route path="/portal/display" element={<TVDisplayDashboard />} />
      <Route
        path="/career"
        element={
          <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-2xl">
              <h1 className="text-white text-2xl mb-4 font-bold">
                <Translate id="home.career.title">Career Opportunities</Translate>
              </h1>
              <DynamicForm
                uuid="career"
                textColor={CARD_THEMES.blueDark.textColor}
                userRoles={userRoles}
              />
            </div>
          </div>
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
