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
