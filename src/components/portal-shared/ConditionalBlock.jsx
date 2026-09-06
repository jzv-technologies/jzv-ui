// src/components/portal-shared/ConditionalBlock.jsx
import React, { useMemo, useCallback } from 'react';
import { useViewConfig } from '../../hooks/useViewConfig';
import { useAuth } from '../../hooks/useAuth';

/**
 * Custom hook to check if the current user has permission to access a specific
 * component or subview registered in app_view_controller.
 *
 * @param {Array<string>} [overrideRoles] - Optional roles array to override useAuth().userRoles
 * @returns {(componentName: string) => boolean}
 */
export const useCanAccess = (overrideRoles) => {
  const { userRoles: authUserRoles } = useAuth();
  const { isFeatureEnabled } = useViewConfig();

  const effectiveRoles = useMemo(() => {
    return Array.isArray(overrideRoles) ? overrideRoles : authUserRoles || [];
  }, [overrideRoles, authUserRoles]);

  return useCallback(
    (componentName) => {
      if (!componentName) return true;
      return isFeatureEnabled(componentName, effectiveRoles);
    },
    [isFeatureEnabled, effectiveRoles]
  );
};

/**
 * ConditionalBlock component that conditionally renders its children
 * based on whether the current user's roles have access to the specified
 * component/subview in app_view_controller.
 *
 * Usage:
 * <ConditionalBlock name="scheduler-setup" fallback={<p>Access Denied</p>}>
 *   <SchedulerSetupView />
 * </ConditionalBlock>
 */
export const ConditionalBlock = ({ name, roles, fallback = null, children }) => {
  const canAccess = useCanAccess(roles);
  const isAllowed = canAccess(name);

  if (!isAllowed) {
    return fallback;
  }

  return <>{children}</>;
};

export default ConditionalBlock;
