export interface RolePermissions {
  canManageMembers: boolean;
  canManagePackages: boolean;
  canManagePayments: boolean;
  canManageBilling: boolean;
  canManageExpenses: boolean;
  canManageLockers: boolean;
}

export type RolePermissionKey = keyof RolePermissions;

export interface PermissionToggleItem {
  id: RolePermissionKey;
  label: string;
  description: string;
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
  description: string;
};

export const ROLE_PERMISSION_META: Record<RolePermissionKey, RolePermissionMeta> = {
  canManageMembers: {
    label: "Manage Members",
    description: "Edit and delete member profiles",
  },
  canManagePackages: {
    label: "Manage Packages",
    description: "Create, edit, and delete gym packages (Admin only)",
  },
  canManagePayments: {
    label: "Manage Payments",
    description: "Edit, delete, and refund payment records",
  },
  canManageBilling: {
    label: "Manage Billing",
    description: "Edit and delete billing records",
  },
  canManageExpenses: {
    label: "Manage Expenses",
    description: "Edit and delete expenses and categories",
  },
  canManageLockers: {
    label: "Manage Lockers",
    description: "Create, edit, delete lockers and set pricing",
  },
};

export const EMPTY_ROLE_PERMISSIONS: RolePermissions = {
  canManageMembers: false,
  canManagePackages: false,
  canManagePayments: false,
  canManageBilling: false,
  canManageExpenses: false,
  canManageLockers: false,
};

export const normalizeRolePermissions = (
  permissions?: Partial<RolePermissions> | null,
): RolePermissions => {
  return {
    canManageMembers: Boolean(permissions?.canManageMembers),
    canManagePackages: Boolean(permissions?.canManagePackages),
    canManagePayments: Boolean(permissions?.canManagePayments),
    canManageBilling: Boolean(permissions?.canManageBilling),
    canManageExpenses: Boolean(permissions?.canManageExpenses),
    canManageLockers: Boolean(permissions?.canManageLockers),
  };
};

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

  const categoryMap = [
    {
      title: "Member Access",
      permissions: ["canManageMembers"] as RolePermissionKey[],
    },
    {
      title: "Package Access",
      permissions: ["canManagePackages"] as RolePermissionKey[],
    },
    {
      title: "Payment Access",
      permissions: ["canManagePayments"] as RolePermissionKey[],
    },
    {
      title: "Billing Access",
      permissions: ["canManageBilling"] as RolePermissionKey[],
    },
    {
      title: "Expense Access",
      permissions: ["canManageExpenses"] as RolePermissionKey[],
    },
    {
      title: "Locker Access",
      permissions: ["canManageLockers"] as RolePermissionKey[],
    },
  ];

  return categoryMap.map((cat) => {
    const items: PermissionToggleItem[] = cat.permissions.map((key) => ({
      id: key,
      label: ROLE_PERMISSION_META[key].label,
      description: ROLE_PERMISSION_META[key].description,
      enabled: normalized[key],
    }));

    return {
      title: cat.title,
      permissions: items,
      masterEnabled: items.every((item) => item.enabled),
    };
  });
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
