import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomeGrid from './layout/HomeGrid';
import DynamicForm from './DynamicForm';
import { CARD_THEMES } from '../utils/cardTheme';
import Translate from './Translate';
import TVDisplayDashboard from './dashboard/TVDisplayDashboard';
import UnifiedPortal from './auth/UnifiedPortal';

import StandaloneFormPage from './forms/StandaloneFormPage';

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
  isHeaderVisible,
  onShowHeader,
  onHideHeader,
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
        isHeaderVisible={isHeaderVisible}
        onShowHeader={onShowHeader}
        onHideHeader={onHideHeader}
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
      <Route path="/portal/:featureId" element={renderUnifiedPortal()} />

      {/* Standalone Display Board & Career Pages */}
      <Route path="/portal/display" element={<TVDisplayDashboard />} />
      <Route
        path="/career"
        element={<StandaloneFormPage user={user} userRoles={userRoles} formUuid="career" />}
      />

      {/* Public Dynamic Form Direct Link: baseurl/<form_name> */}
      <Route
        path="/:formName"
        element={<StandaloneFormPage user={user} userRoles={userRoles} />}
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
