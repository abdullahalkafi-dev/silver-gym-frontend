// config/sidebarConfig.tsx
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  UserAccountIcon,
  Analytics01Icon,
  UserMultiple02Icon,
  MoneyReceive01Icon,
  MoneyReceiveSquareIcon,
  MoneySendSquareIcon,
  Invoice01Icon,
  UserLock01Icon,
  MailSend01Icon,
} from "@hugeicons/core-free-icons";
import { ReactNode } from "react";
import { ACCOUNTS_ACCESS_PERMISSIONS } from "@/lib/branchFees";

export interface SidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  roles: string[];
  // New: Permission-based access
  permissions?: string[]; // e.g., ["member:view", "member:edit"]
  requireAllPermissions?: boolean; // If true, user needs ALL permissions; if false, needs ANY
}

export interface SidebarSection {
  items: SidebarItem[];
  divider?: boolean;
}

export const sidebarConfig: Record<string, SidebarSection[]> = {
  owner: [
    {
      items: [
        {
          id: "branch-root",
          label: "Home",
          icon: <HugeiconsIcon icon={Home01Icon} size={24} />,
          path: "/dashboard",
          roles: ["owner"],
        },
        {
          id: "branch-analytics",
          label: "Analytics",
          icon: <HugeiconsIcon icon={Analytics01Icon} size={24} />,
          path: "/dashboard/analytics",
          roles: ["owner"],
        },
      ],
      divider: false,
    },
  ],
  admin: [
    {
      items: [
        {
          id: "overview",
          label: "Overview",
          icon: <HugeiconsIcon icon={Home01Icon} size={24} />,
          path: "/dashboard",
          roles: ["admin"],
          permissions: ["member:view"],
        },
        {
          id: "accounts",
          label: "Accounts",
          icon: <HugeiconsIcon icon={UserAccountIcon} size={24} />,
          path: "/dashboard/accounts",
          roles: ["admin"],
          permissions: ACCOUNTS_ACCESS_PERMISSIONS,
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: <HugeiconsIcon icon={Analytics01Icon} size={24} />,
          path: "/dashboard/analytics",
          roles: ["admin"],
          permissions: ["analytics:view"],
        },
        {
          id: "members",
          label: "Members",
          icon: <HugeiconsIcon icon={UserMultiple02Icon} size={24} />,
          path: "/dashboard/members",
          roles: ["admin"],
          permissions: ["member:view"],
        },
      ],
      divider: true,
    },
    {
      items: [
        {
          id: "income",
          label: "Income",
          icon: <HugeiconsIcon icon={MoneyReceiveSquareIcon} size={24} />,
          path: "/dashboard/income",
          roles: ["admin"],
          permissions: ["billing:view"],
        },
        {
          id: "expense",
          label: "Expense",
          icon: <HugeiconsIcon icon={MoneySendSquareIcon} size={24} />,
          path: "/dashboard/expense",
          roles: ["admin"],
          permissions: ["billing:view"],
        },
        {
          id: "transaction",
          label: "Transaction",
          icon: <HugeiconsIcon icon={Invoice01Icon} size={24} />,
          path: "/dashboard/transaction",
          roles: ["admin"],
          permissions: ["billing:view"],
        },
      ],
      divider: true,
    },
    {
      items: [
        {
          id: "user-access",
          label: "User Access",
          icon: <HugeiconsIcon icon={UserLock01Icon} size={24} />,
          path: "/dashboard/user-access",
          roles: ["admin"],
          permissions: ["access:view-users"],
        },
        {
          id: "send-sms",
          label: "Send SMS",
          icon: <HugeiconsIcon icon={MailSend01Icon} size={24} />,
          path: "/dashboard/send-sms",
          roles: ["admin"],
          permissions: ["sms:send"],
        },
      ],
      divider: false,
    },
  ],
  manager: [
    {
      items: [
        {
          id: "overview",
          label: "Overview",
          icon: <HugeiconsIcon icon={Home01Icon} size={24} />,
          path: "/dashboard",
          roles: ["manager"],
          permissions: ["member:view"],
        },
        {
          id: "accounts",
          label: "Accounts",
          icon: <HugeiconsIcon icon={UserAccountIcon} size={24} />,
          path: "/dashboard/accounts",
          roles: ["manager"],
          permissions: ACCOUNTS_ACCESS_PERMISSIONS,
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: <HugeiconsIcon icon={Analytics01Icon} size={24} />,
          path: "/dashboard/analytics",
          roles: ["manager"],
          permissions: ["analytics:view"],
        },
        {
          id: "members",
          label: "Members",
          icon: <HugeiconsIcon icon={UserMultiple02Icon} size={24} />,
          path: "/dashboard/members",
          roles: ["manager"],
          permissions: ["member:view"],
        },
      ],
      divider: true,
    },
    {
      items: [
        {
          id: "income",
          label: "Income",
          icon: <HugeiconsIcon icon={MoneyReceive01Icon} size={24} />,
          path: "/dashboard/income",
          roles: ["manager"],
          permissions: ["billing:view"],
        },
        {
          id: "transaction",
          label: "Transaction",
          icon: <HugeiconsIcon icon={Invoice01Icon} size={24} />,
          path: "/dashboard/transaction",
          roles: ["manager"],
          permissions: ["billing:view"],
        },
      ],
      divider: false,
    },
  ],
  member: [
    {
      items: [
        {
          id: "overview",
          label: "Overview",
          icon: <HugeiconsIcon icon={Home01Icon} size={24} />,
          path: "/dashboard",
          roles: ["member"],
          permissions: ["member:view"],
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: <HugeiconsIcon icon={Analytics01Icon} size={24} />,
          path: "/dashboard/analytics",
          roles: ["member"],
          permissions: ["analytics:view"],
        },
      ],
      divider: false,
    },
  ],
  // Shared branch-level sidebar used for both owner (after selecting a branch) and staff
  branch: [
    {
      items: [
        {
          id: "overview",
          label: "Overview",
          icon: <HugeiconsIcon icon={Home01Icon} size={24} />,
          path: "/dashboard/branch-dashboard",
          roles: ["branch"],
        },
        {
          id: "accounts",
          label: "Accounts",
          icon: <HugeiconsIcon icon={UserAccountIcon} size={24} />,
          path: "/dashboard/accounts",
          roles: ["branch"],
          permissions: ACCOUNTS_ACCESS_PERMISSIONS,
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: <HugeiconsIcon icon={Analytics01Icon} size={24} />,
          path: "/dashboard/branch-dashboard/analytics",
          roles: ["branch"],
          permissions: ["analytics:view"],
        },
        {
          id: "members",
          label: "Members",
          icon: <HugeiconsIcon icon={UserMultiple02Icon} size={24} />,
          path: "/dashboard/members",
          roles: ["branch"],
          permissions: ["member:view"],
        },
      ],
      divider: true,
    },
    {
      items: [
        {
          id: "income",
          label: "Income",
          icon: <HugeiconsIcon icon={MoneyReceiveSquareIcon} size={24} />,
          path: "/dashboard/income",
          roles: ["branch"],
          permissions: ["billing:view"],
        },
        {
          id: "expense",
          label: "Expense",
          icon: <HugeiconsIcon icon={MoneySendSquareIcon} size={24} />,
          path: "/dashboard/expense",
          roles: ["branch"],
          permissions: ["billing:view"],
        },
        {
          id: "transaction",
          label: "Transaction",
          icon: <HugeiconsIcon icon={Invoice01Icon} size={24} />,
          path: "/dashboard/transaction",
          roles: ["branch"],
          permissions: ["billing:view"],
        },
      ],
      divider: true,
    },
    {
      items: [
        {
          id: "user-access",
          label: "User Access",
          icon: <HugeiconsIcon icon={UserLock01Icon} size={24} />,
          path: "/dashboard/user-access",
          roles: ["branch"],
          permissions: ["access:view-users"],
        },
        {
          id: "send-sms",
          label: "Send SMS",
          icon: <HugeiconsIcon icon={MailSend01Icon} size={24} />,
          path: "/dashboard/send-sms",
          roles: ["branch"],
          permissions: ["sms:send"],
        },
      ],
      divider: false,
    },
  ],
};

/**
 * Get sidebar configuration for a role
 * @param role - Role name
 * @param userPermissions - Optional: User's specific permissions for filtering
 * @returns Sidebar sections filtered by role and permissions
 */
export const getSidebarForRole = (
  role: string,
  userPermissions?: string[]
): SidebarSection[] => {
  const sections = sidebarConfig[role.toLowerCase()] || sidebarConfig.member;

  // If no user permissions provided, return all sections
  if (!userPermissions || userPermissions.length === 0) {
    return sections;
  }

  // Filter items based on user permissions
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // If no specific permissions required, show item
        if (!item.permissions || item.permissions.length === 0) {
          return true;
        }

        // Check if user has required permissions
        if (item.requireAllPermissions) {
          return item.permissions.every((perm) =>
            userPermissions.includes(perm)
          );
        } else {
          return item.permissions.some((perm) =>
            userPermissions.includes(perm)
          );
        }
      }),
    }))
    .filter((section) => section.items.length > 0); // Remove empty sections
};
