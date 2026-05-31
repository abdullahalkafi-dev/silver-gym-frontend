// types/permissions.ts

/**
 * Global permission definitions for the entire application
 * Used to define all available permissions that can be assigned to roles
 */

export const PERMISSION_DEFINITIONS = {
  // Member Management
  "member:view": { label: "View Members", category: "Member Access" },
  "member:create": { label: "Add Member", category: "Member Access" },
  "member:edit": { label: "Edit Member", category: "Member Access" },
  "member:delete": { label: "Delete Member", category: "Member Access" },

  // Package Management
  "package:view": { label: "View Packages", category: "Packages Access" },
  "package:create": { label: "Add Packages", category: "Packages Access" },
  "package:edit": { label: "Edit Packages", category: "Packages Access" },
  "package:delete": { label: "Delete Packages", category: "Packages Access" },

  // Billing Management
  "billing:view": { label: "View Billing", category: "Billing Access" },
  "billing:create": { label: "Add Billing", category: "Billing Access" },
  "billing:edit": { label: "Edit Billing", category: "Billing Access" },
  "billing:delete": { label: "Delete Billing", category: "Billing Access" },

  // Branch Fee Management
  "monthly-fee:add": {
    label: "Add Monthly Fee",
    category: "Branch Fee Access",
  },
  "monthly-fee:edit": {
    label: "Edit Monthly Fee",
    category: "Branch Fee Access",
  },
  "admission-fee:add": {
    label: "Add Admission Fee",
    category: "Branch Fee Access",
  },
  "admission-fee:edit": {
    label: "Edit Admission Fee",
    category: "Branch Fee Access",
  },

  // Analytics
  "analytics:view": { label: "View Analytics", category: "Analytics Access" },
  "analytics:export": {
    label: "Export Analytics",
    category: "Analytics Access",
  },

  // SMS
  "sms:view": { label: "View SMS", category: "SMS Access" },
  "sms:send": { label: "Send SMS", category: "SMS Access" },
  "sms:template-edit": { label: "Edit SMS Templates", category: "SMS Access" },

  // Email
  "email:view": { label: "View Email", category: "Email Access" },
  "email:send": { label: "Send Email", category: "Email Access" },

  // Expense Management
  "expense-category:view": { label: "View Expense Category", category: "Expense Access" },
  "expense-category:manage": { label: "Manage Expense Category", category: "Expense Access" },
  "expense:view": { label: "View Expense", category: "Expense Access" },
  "expense:create": { label: "Add Expense", category: "Expense Access" },

  // Transaction Access
  "transaction:view": { label: "View Transactions", category: "Transaction Access" },

  // Locker Management
  "locker:view": { label: "View Lockers", category: "Locker Management" },
  "locker:create": { label: "Create Lockers", category: "Locker Management" },
  "locker:delete": { label: "Delete Lockers", category: "Locker Management" },
  "locker:assign": { label: "Assign Members", category: "Locker Management" },
  "locker:collect": { label: "Collect Locker Payment", category: "Locker Management" },

  // User Access Management
  "access:view-users": { label: "View User Access", category: "User Access" },
  "access:create-role": {
    label: "Create Custom Role",
    category: "User Access",
  },
  "access:edit-role": { label: "Edit Custom Role", category: "User Access" },
  "access:delete-role": {
    label: "Delete Custom Role",
    category: "User Access",
  },
  "access:assign-role": {
    label: "Assign Role to User",
    category: "User Access",
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
  manager: {
    roleName: "Manager",
    description: "Access to members, packages, analytics, transactions and lockers",
    permissions: [
      "member:view",
      "member:create",
      "member:edit",
      "package:view",
      "package:create",
      "package:edit",
      "analytics:view",
      "access:view-users",
      "locker:view",
      "locker:create",
      "locker:assign",
      "locker:collect",
    ] as PermissionKey[],
  },
  member: {
    roleName: "Member",
    description: "View-only access to own data",
    permissions: ["member:view", "analytics:view"] as PermissionKey[],
  },
};

/**
 * Permission groups for easier management
 */
export const PERMISSION_GROUPS = {
  MEMBER_MANAGEMENT: [
    "member:view",
    "member:create",
    "member:edit",
    "member:delete",
  ],
  PACKAGE_MANAGEMENT: [
    "package:view",
    "package:create",
    "package:edit",
    "package:delete",
  ],
  BILLING_MANAGEMENT: [
    "billing:view",
    "billing:create",
    "billing:edit",
    "billing:delete",
  ],
  BRANCH_FEE_MANAGEMENT: [
    "monthly-fee:add",
    "monthly-fee:edit",
    "admission-fee:add",
    "admission-fee:edit",
  ],
  EXPENSE_MANAGEMENT: [
    "expense-category:view",
    "expense-category:manage",
    "expense:view",
    "expense:create",
  ],
  TRANSACTION: ["transaction:view"],
  LOCKER_MANAGEMENT: [
    "locker:view",
    "locker:create",
    "locker:delete",
    "locker:assign",
    "locker:collect",
  ],
  ANALYTICS: ["analytics:view", "analytics:export"],
  SMS: ["sms:view", "sms:send", "sms:template-edit"],
  EMAIL: ["email:view", "email:send"],
  USER_ACCESS: [
    "access:view-users",
    "access:create-role",
    "access:edit-role",
    "access:delete-role",
    "access:assign-role",
  ],
};
