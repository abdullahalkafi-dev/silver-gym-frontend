import { PERMISSION_DEFINITIONS } from "@/types/permissions";
import type { LoginResponse, User } from "@/redux/types/auth";

type StaffPermissionSnapshot = Record<string, boolean | undefined>;

const STAFF_PERMISSION_MAP: Record<string, string[]> = {
  canViewMembers: ["member:view"],
  canAddMember: ["member:create"],
  canEditMember: ["member:edit"],
  canDeleteMember: ["member:delete"],
  canViewPackages: ["package:view"],
  canAddPackage: ["package:create"],
  canEditPackage: ["package:edit"],
  canDeletePackage: ["package:delete"],
  canViewBilling: ["billing:view"],
  canAddBilling: ["billing:create"],
  canEditBilling: ["billing:edit"],
  canDeleteBilling: ["billing:delete"],
  canViewPayments: ["billing:view"],
  canAddPayment: ["billing:create"],
  canEditPayment: ["billing:edit"],
  canDeletePayment: ["billing:delete"],
  canRefundPayment: ["billing:edit"],
  canViewAnalytics: ["analytics:view"],
  canExportAnalytics: ["analytics:export"],
  canViewSMS: ["sms:view"],
  canSendSMS: ["sms:send"],
};

const OWNER_DEFAULT_PERMISSIONS = Object.keys(PERMISSION_DEFINITIONS);

const normalizeBusinessProfile = (
  businessProfile?: { id?: string; _id?: string } | null
): { id: string } | null => {
  if (!businessProfile || typeof businessProfile !== "object") {
    return null;
  }

  const rawId =
    typeof businessProfile.id === "string"
      ? businessProfile.id
      : businessProfile._id;

  if (typeof rawId !== "string") {
    return null;
  }

  const id = rawId.trim();
  return id ? { id } : null;
};

export const hasBusinessProfileId = (
  user: User | null | undefined
): boolean => {
  return Boolean(normalizeBusinessProfile(user?.businessProfile)?.id);
};

export const requiresBusinessProfileSetup = (
  user: User | null | undefined
): boolean => {
  if (!user || user.actorType !== "owner") {
    return false;
  }

  // Undefined is treated as unknown/legacy state and reconciled during auth bootstrap.
  if (user.businessProfile === undefined) {
    return false;
  }

  return !hasBusinessProfileId(user);
};

const getName = (obj: Record<string, unknown>) => {
  const firstName = typeof obj.firstName === "string" ? obj.firstName : "";
  const lastName = typeof obj.lastName === "string" ? obj.lastName : "";
  const displayName =
    typeof obj.displayName === "string" ? obj.displayName : "";
  const fallbackName = typeof obj.name === "string" ? obj.name : "";

  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || displayName || fallbackName || "User";
};

const toRole = (roleName: string | undefined) => {
  const normalized = (roleName || "").toLowerCase();

  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("manager")) return "manager";
  if (normalized.includes("member")) return "member";

  return "manager";
};

export const mapStaffPermissionSnapshot = (snapshot?: StaffPermissionSnapshot) => {
  if (!snapshot) return [];

  const resolvedPermissions = new Set<string>();

  Object.entries(snapshot).forEach(([key, enabled]) => {
    if (!enabled) return;
    const mapped = STAFF_PERMISSION_MAP[key] || [];
    mapped.forEach((permission) => resolvedPermissions.add(permission));
  });

  return Array.from(resolvedPermissions);
};

export const normalizeOwnerLoginResponse = (payload: {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
  businessProfile?: { id?: string; _id?: string } | null;
}): LoginResponse => {
  const user = payload.user;

  const normalizedUser: User = {
    id: String(user._id || user.id || ""),
    role: "admin",
    actorType: "owner",
    email: (user.email as string | undefined) || "",
    phone: user.phone as string | undefined,
    name: getName(user),
    profileImage:
      (user.profilePicture as string | undefined) ||
      (user.profileImage as string | undefined),
    loginTime: new Date().toISOString(),
    permissions: OWNER_DEFAULT_PERMISSIONS,
    customRoleId: user.customRoleId as string | undefined,
    businessProfile: normalizeBusinessProfile(payload.businessProfile),
  };

  return {
    user: normalizedUser,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
};

export const normalizeStaffLoginResponse = (payload: {
  accessToken: string;
  refreshToken: string;
  staff: Record<string, unknown>;
  permissions?: StaffPermissionSnapshot;
  businessProfile?: { id?: string; _id?: string } | null;
}): LoginResponse => {
  const staff = payload.staff;
  const backendRoleName =
    (staff.roleName as string | undefined) ||
    ((staff.roleId as { roleName?: string } | undefined)?.roleName as
      | string
      | undefined);

  const normalizedPermissions = mapStaffPermissionSnapshot(payload.permissions);

  const normalizedUser: User = {
    id: String(staff._id || staff.id || ""),
    role: toRole(backendRoleName),
    actorType: "staff",
    email: (staff.email as string | undefined) ||
      (staff.username as string | undefined) ||
      "",
    phone: staff.phone as string | undefined,
    name: getName(staff),
    profileImage:
      (staff.profilePicture as string | undefined) ||
      (staff.profileImage as string | undefined),
    loginTime: new Date().toISOString(),
    permissions: normalizedPermissions,
    branchId: staff.branchId ? String(staff.branchId) : undefined,
    backendRoleName,
    businessProfile: normalizeBusinessProfile(payload.businessProfile),
  };

  return {
    user: normalizedUser,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
};

export const extractApiErrorMessage = (error: unknown): string => {
  const fallback = "Request failed. Please try again.";

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const maybeError = error as {
    data?: { message?: string; errorSources?: Array<{ message?: string }> };
    message?: string;
  };

  if (maybeError.data?.errorSources?.[0]?.message) {
    return maybeError.data.errorSources[0].message || fallback;
  }

  if (maybeError.data?.message) {
    return maybeError.data.message;
  }

  if (maybeError.message) {
    return maybeError.message;
  }

  return fallback;
};
