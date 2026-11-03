import { useUser } from "@/hooks/useUser";

/**
 * Who can do what in the SMS section (the backend enforces the same rules):
 * - canAccess: owner, an admin role, or staff with the "Send SMS" permission
 * - canManage: owner or an admin role (master switch, automatic messages, sender name)
 */
export const useSmsAccess = () => {
  const { isOwner, role, hasPermission, activeBranchId, user } = useUser();
  const isAdminRole = String(role || "").toLowerCase().includes("admin");

  const canManage = isOwner || isAdminRole;
  const canAccess = canManage || hasPermission("sms:send");
  const businessId = user?.businessProfile?.id || "";

  return { canAccess, canManage, businessId, branchId: activeBranchId || "" };
};
