// components/shared/CanAccess.tsx
"use client";

import React from "react";
import { usePermission } from "@/hooks/usePermission";

interface CanAccessProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * CanAccess Component
 * Check if current user has a specific permission
 *
 * @example
 * <CanAccess permission="member:manage">
 *   <EditMemberButton />
 * </CanAccess>
 *
 * <CanAccess
 *   permission="billing:manage"
 *   fallback={<button disabled>No Permission</button>}
 * >
 *   <DeleteBillingButton />
 * </CanAccess>
 */
export const CanAccess: React.FC<CanAccessProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { hasPermission } = usePermission();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default CanAccess;
