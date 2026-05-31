// app/dashboard/accounts/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AutoDeactivationSetup } from "@/components/accounts/AutoDeactivationSetup";
import { BaseFeesSetup } from "@/components/accounts/BaseFeesSetup";
import { StartingBalanceSetup } from "@/components/accounts/StartingBalanceSetup";
import { AddDetails } from "@/components/accounts/AddDetails";
import { useUser } from "@/hooks/useUser";
import { ACCOUNTS_ACCESS_PERMISSIONS } from "@/lib/branchFees";

export default function AccountsPage() {
  const router = useRouter();
  const { isOwner, hasPermission, hasAnyPermission } = useUser();
  const canViewPackageSection = isOwner || hasPermission("package:view");
  const canViewBillingSection = isOwner || hasPermission("billing:view");
  const canViewFeeSection = isOwner || hasAnyPermission(ACCOUNTS_ACCESS_PERMISSIONS);
  const canAccessAccounts =
    isOwner || hasAnyPermission(ACCOUNTS_ACCESS_PERMISSIONS);
  const [activeTab, setActiveTab] = useState<"package" | "expense">(
    canViewPackageSection ? "package" : "expense"
  );

  useEffect(() => {
    if (!canAccessAccounts) {
      router.replace("/dashboard/branch-dashboard");
    }
  }, [canAccessAccounts, router]);

  if (!canAccessAccounts) return null;

  return (
    <div className="min-h-screen">
      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {canViewFeeSection ? <div className="lg:col-span-2"><BaseFeesSetup /></div> : null}
          <StartingBalanceSetup />
          <AutoDeactivationSetup />
        </div>

        <AddDetails
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showPackageTab={canViewPackageSection}
          showExpenseTab={canViewBillingSection}
        />
      </div>
    </div>
  );
}
