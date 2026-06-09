// config/sidebarConfig.tsx
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  UserAccountIcon,
  Analytics01Icon,
  UserMultiple02Icon,
  MoneyReceiveSquareIcon,
  MoneySendSquareIcon,
  Invoice01Icon,
  UserLock01Icon,
  MailSend01Icon,
  Locker01Icon,
} from "@hugeicons/core-free-icons";
import { ReactNode } from "react";

export interface SidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  roles: string[];
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
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: <HugeiconsIcon icon={Analytics01Icon} size={24} />,
          path: "/dashboard/branch-dashboard/analytics",
          roles: ["branch"],
        },
        {
          id: "members",
          label: "Members",
          icon: <HugeiconsIcon icon={UserMultiple02Icon} size={24} />,
          path: "/dashboard/members",
          roles: ["branch"],
        },
        {
          id: "lockers",
          label: "Locker Management",
          icon: <HugeiconsIcon icon={Locker01Icon} size={24} />,
          path: "/dashboard/lockers",
          roles: ["branch"],
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
        },
        {
          id: "expense",
          label: "Expense",
          icon: <HugeiconsIcon icon={MoneySendSquareIcon} size={24} />,
          path: "/dashboard/expense",
          roles: ["branch"],
        },
        {
          id: "transaction",
          label: "Transaction",
          icon: <HugeiconsIcon icon={Invoice01Icon} size={24} />,
          path: "/dashboard/transaction",
          roles: ["branch"],
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
        },
        {
          id: "send-sms",
          label: "Send SMS",
          icon: <HugeiconsIcon icon={MailSend01Icon} size={24} />,
          path: "/dashboard/send-sms",
          roles: ["branch"],
        },
      ],
      divider: false,
    },
  ],
};

/**
 * Get sidebar configuration for a role
 * All features are now open to all staff by default
 * @param role - Role name
 * @returns Sidebar sections for the role
 */
export const getSidebarForRole = (
  role: string,
): SidebarSection[] => {
  const sidebarRole = role === "admin" || role === "manager" ? "branch" : role;
  return sidebarConfig[sidebarRole] || sidebarConfig.branch;
};
