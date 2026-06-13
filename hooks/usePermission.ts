// hooks/usePermission.ts
import { useAppSelector } from "@/redux/hooks";

/**
 * Custom hook for permission checking
 * Used to check if current user has specific permissions
 */
export const usePermission = () => {
  const { permissions = [] } = useAppSelector((state) => state.auth);

  /**
   * Check if user has a single permission
   * @param permission - Permission string (e.g., "member:manage", "billing:manage")
   * @returns true if user has the permission
   */
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  /**
   * Check if user has ANY of the provided permissions
   * @param permissionsList - Array of permission strings
   * @returns true if user has at least one permission
   */
  const hasAnyPermission = (permissionsList: string[]): boolean => {
    return permissionsList.some((perm) => permissions.includes(perm));
  };

  /**
   * Check if user has ALL of the provided permissions
   * @param permissionsList - Array of permission strings
   * @returns true if user has all permissions
   */
  const hasAllPermissions = (permissionsList: string[]): boolean => {
    return permissionsList.every((perm) => permissions.includes(perm));
  };

  /**
   * Get all permissions for current user
   * @returns Array of all user permissions
   */
  const getAllPermissions = (): string[] => {
    return permissions;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getAllPermissions,
    permissions,
  };
};
