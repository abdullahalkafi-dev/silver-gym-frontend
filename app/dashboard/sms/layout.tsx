"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useSmsAccess } from "@/hooks/useSmsAccess";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard/sms", label: "Home", exact: true, manageOnly: false },
  { href: "/dashboard/sms/send", label: "Send", exact: false, manageOnly: false },
  { href: "/dashboard/sms/holidays", label: "Holidays", exact: false, manageOnly: false },
  { href: "/dashboard/sms/auto", label: "Auto Messages", exact: false, manageOnly: true },
  { href: "/dashboard/sms/history", label: "History", exact: false, manageOnly: false },
];

export default function SmsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { canAccess, canManage, businessId, branchId } = useSmsAccess();

  const notice = !branchId || !businessId
    ? "Select a branch to use SMS."
    : !canAccess
      ? "You do not have permission to use SMS. Ask the owner to turn on \"Send SMS\" for your role."
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">SMS</h1>
        <p className="text-sm text-gray-500">Message your members. Pick what you want to do.</p>
      </div>

      {notice ? (
        <Card className="border-none shadow-none">
          <CardContent className="pt-6 text-sm text-gray-600">{notice}</CardContent>
        </Card>
      ) : (
        <>
          <nav className="flex gap-1 overflow-x-auto border-b border-gray-200" aria-label="SMS sections">
            {tabs
              .filter((tab) => !tab.manageOnly || canManage)
              .map((tab) => {
                const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-800",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
          </nav>
          {children}
        </>
      )}
    </div>
  );
}
