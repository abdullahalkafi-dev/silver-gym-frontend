// app/dashboard/accounts/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BaseFeesSetup } from "@/components/accounts/BaseFeesSetup";
import { AddDetails } from "@/components/accounts/AddDetails";
import { useUser } from "@/hooks/useUser";

export default function AccountsPage() {
  const router = useRouter();
  const { isOwner, hasPermission } = useUser();
  const [activeTab, setActiveTab] = useState<"package" | "expense">("package");

  useEffect(() => {
    if (!isOwner && !hasPermission("billing:view")) {
      router.replace("/dashboard/branch-dashboard");
    }
  }, [isOwner, hasPermission, router]);

  if (!isOwner && !hasPermission("billing:view")) return null;

  return (
      <div className="min-h-screen">
        <div className="w-full space-y-6">
          {/* Base Fees Setup */}
          <BaseFeesSetup />

          {/* Add Details Section */}
          <AddDetails activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
  );
}
