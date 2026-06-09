// types/permissions.ts

/**
 * Global permission definitions for the entire application
 * Used to define all available permissions that can be assigned to roles
 */

export const PERMISSION_DEFINITIONS = {
  // Member Management - only edit/delete needs permission (view+add is open)
  "member:manage": {
    label: "Manage Members",
    category: "Member Access",
    description: "Edit and delete member profiles",
  },

  // Package Management - admin only
  "package:manage": {
    label: "Manage Packages",
    category: "Package Access",
    description: "Create, edit, and delete gym packages",
  },

  // Payment Management - edit/delete/refund needs permission (view+add is open)
  "payment:manage": {
    label: "Manage Payments",
    category: "Payment Access",
    description: "Edit, delete, and refund payment records",
  },

  // Billing Management - edit/delete needs permission (view+add is open)
  "billing:manage": {
    label: "Manage Billing",
    category: "Billing Access",
    description: "Edit and delete billing records",
  },

  // Expense Management - edit/delete needs permission (view+add is open)
  "expense:manage": {
    label: "Manage Expenses",
    category: "Expense Access",
    description: "Edit and delete expenses and categories",
  },

  // Locker Management - create/edit/delete needs permission
  "locker:manage": {
    label: "Manage Lockers",
    category: "Locker Access",
    description: "Create, edit, delete lockers and set pricing",
  },
} as const;

export type PermissionKey = keyof typeof PERMISSION_DEFINITIONS;

/**
 * Predefined role templates with default permissions
 */
export const ROLE_TEMPLATES = {
  admin: {
    roleName: "Admin",
    description: "Full access to all features",
    permissions: Object.keys(PERMISSION_DEFINITIONS) as PermissionKey[],
  },
  staff: {
    roleName: "Staff",
    description: "View and add access only (no edit/delete)",
    permissions: [] as PermissionKey[],
  },
};

/**
 * Permission groups for easier management
 */
export const PERMISSION_GROUPS = {
  MEMBER_MANAGEMENT: ["member:manage"],
  PACKAGE_MANAGEMENT: ["package:manage"],
  PAYMENT_MANAGEMENT: ["payment:manage"],
  BILLING_MANAGEMENT: ["billing:manage"],
  EXPENSE_MANAGEMENT: ["expense:manage"],
  LOCKER_MANAGEMENT: ["locker:manage"],
};
