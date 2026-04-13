export interface RolePermissions {
  canViewMembers: boolean;
  canAddMember: boolean;
  canEditMember: boolean;
  canDeleteMember: boolean;
  canViewPackages: boolean;
  canAddPackage: boolean;
  canEditPackage: boolean;
  canDeletePackage: boolean;
  canViewBilling: boolean;
  canAddBilling: boolean;
  canEditBilling: boolean;
  canDeleteBilling: boolean;
  canViewAnalytics: boolean;
  canExportAnalytics: boolean;
  canViewSMS: boolean;
  canSendSMS: boolean;
  canViewEmail: boolean;
  canSendEmail: boolean;
}

export type RolePermissionKey = keyof RolePermissions;

export interface PermissionToggleItem {
  id: RolePermissionKey;
  label: string;
  enabled: boolean;
}

export interface PermissionCategory {
  title: string;
  permissions: PermissionToggleItem[];
  masterEnabled: boolean;
}

export interface BranchRole {
  id: string;
  branchId: string;
  roleName: string;
  permissions: RolePermissions;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffMember {
  id: string;
  branchId: string;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  profilePicture?: string | null;
  lastLogin?: string | null;
  assignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive: boolean;
  roleId: string;
  roleTitle: string;
  roleKey: string;
  permissions: RolePermissions;
  permissionList: string;
}

export interface StaffFormValues {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  password: string;
  roleId: string;
}

export interface StaffUpdateValues {
  displayName: string;
  email: string;
  phone: string;
  roleId: string;
}

type RolePermissionMeta = {
  label: string;
  category: string;
};

export const ROLE_PERMISSION_META: Record<RolePermissionKey, RolePermissionMeta> = {
  canViewMembers: { label: "View Members", category: "Member Access" },
  canAddMember: { label: "Add Member", category: "Member Access" },
  canEditMember: { label: "Edit Member", category: "Member Access" },
  canDeleteMember: { label: "Delete Member", category: "Member Access" },
  canViewPackages: { label: "View Packages", category: "Packages Access" },
  canAddPackage: { label: "Add Packages", category: "Packages Access" },
  canEditPackage: { label: "Edit Packages", category: "Packages Access" },
  canDeletePackage: { label: "Delete Packages", category: "Packages Access" },
  canViewBilling: { label: "View Billing", category: "Billing Access" },
  canAddBilling: { label: "Add Billing", category: "Billing Access" },
  canEditBilling: { label: "Edit Billing", category: "Billing Access" },
  canDeleteBilling: { label: "Delete Billing", category: "Billing Access" },
  canViewAnalytics: { label: "View Analytics", category: "Analytics Access" },
  canExportAnalytics: { label: "Export Analytics", category: "Analytics Access" },
  canViewSMS: { label: "View SMS", category: "SMS Access" },
  canSendSMS: { label: "Send SMS", category: "SMS Access" },
  canViewEmail: { label: "View Email", category: "Email Access" },
  canSendEmail: { label: "Send Email", category: "Email Access" },
};

export const EMPTY_ROLE_PERMISSIONS: RolePermissions = {
  canViewMembers: false,
  canAddMember: false,
  canEditMember: false,
  canDeleteMember: false,
  canViewPackages: false,
  canAddPackage: false,
  canEditPackage: false,
  canDeletePackage: false,
  canViewBilling: false,
  canAddBilling: false,
  canEditBilling: false,
  canDeleteBilling: false,
  canViewAnalytics: false,
  canExportAnalytics: false,
  canViewSMS: false,
  canSendSMS: false,
  canViewEmail: false,
  canSendEmail: false,
};

export const normalizeRolePermissions = (
  permissions?: Partial<RolePermissions> | null,
): RolePermissions => ({
  canViewMembers: Boolean(permissions?.canViewMembers),
  canAddMember: Boolean(permissions?.canAddMember),
  canEditMember: Boolean(permissions?.canEditMember),
  canDeleteMember: Boolean(permissions?.canDeleteMember),
  canViewPackages: Boolean(permissions?.canViewPackages),
  canAddPackage: Boolean(permissions?.canAddPackage),
  canEditPackage: Boolean(permissions?.canEditPackage),
  canDeletePackage: Boolean(permissions?.canDeletePackage),
  canViewBilling: Boolean(permissions?.canViewBilling),
  canAddBilling: Boolean(permissions?.canAddBilling),
  canEditBilling: Boolean(permissions?.canEditBilling),
  canDeleteBilling: Boolean(permissions?.canDeleteBilling),
  canViewAnalytics: Boolean(permissions?.canViewAnalytics),
  canExportAnalytics: Boolean(permissions?.canExportAnalytics),
  canViewSMS: Boolean(permissions?.canViewSMS),
  canSendSMS: Boolean(permissions?.canSendSMS),
  canViewEmail: Boolean(permissions?.canViewEmail),
  canSendEmail: Boolean(permissions?.canSendEmail),
});

export const countEnabledPermissions = (
  permissions?: Partial<RolePermissions> | null,
): number => {
  return Object.values(normalizeRolePermissions(permissions)).filter(Boolean).length;
};

export const getPermissionListLabel = (
  permissions?: Partial<RolePermissions> | null,
): string => {
  const total = Object.keys(EMPTY_ROLE_PERMISSIONS).length;
  const enabled = countEnabledPermissions(permissions);

  if (enabled === 0) {
    return "No permissions";
  }

  if (enabled === total) {
    return "Full access";
  }

  return `${enabled} permissions`;
};

export const getRoleFilterKey = (roleName: string): string => {
  return roleName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
};

export const buildPermissionCategories = (
  permissions?: Partial<RolePermissions> | null,
): PermissionCategory[] => {
  const normalized = normalizeRolePermissions(permissions);
  const grouped = new Map<string, PermissionToggleItem[]>();

  (Object.keys(ROLE_PERMISSION_META) as RolePermissionKey[]).forEach((key) => {
    const meta = ROLE_PERMISSION_META[key];
    const items = grouped.get(meta.category) || [];

    items.push({
      id: key,
      label: meta.label,
      enabled: normalized[key],
    });

    grouped.set(meta.category, items);
  });

  return Array.from(grouped.entries()).map(([title, items]) => ({
    title,
    permissions: items,
    masterEnabled: items.every((item) => item.enabled),
  }));
};

export const categoriesToRolePermissions = (
  categories: PermissionCategory[],
): RolePermissions => {
  const next = { ...EMPTY_ROLE_PERMISSIONS };

  categories.forEach((category) => {
    category.permissions.forEach((permission) => {
      next[permission.id] = permission.enabled;
    });
  });

  return next;
};

export const formatDateLabel = (value?: string): string => {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
};