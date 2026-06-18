// app/dashboard/accounts/page.tsx
"use client";

import { useState } from "react";
import { AutoDeactivationSetup } from "@/components/accounts/AutoDeactivationSetup";
import { BaseFeesSetup } from "@/components/accounts/BaseFeesSetup";
import { StartingBalanceSetup } from "@/components/accounts/StartingBalanceSetup";
import { AddDetails } from "@/components/accounts/AddDetails";

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<"package" | "expense">("package");

  return (
    <div className="min-h-screen">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">Accounts</h1>
          <p className="text-sm text-gray-500">
            Configure billing fees, starting balances, and auto-deactivation rules.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2"><BaseFeesSetup /></div>
          <StartingBalanceSetup />
          <AutoDeactivationSetup />
        </div>

        <AddDetails
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showPackageTab={true}
          showExpenseTab={true}
        />
      </div>
    </div>
  );
}
