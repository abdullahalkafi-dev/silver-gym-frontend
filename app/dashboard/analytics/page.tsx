// app/dashboard/analytics/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnalyticsDownIcon } from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";

function OwnerComingSoon() {
  return (
    <div className="min-h-[60vh] space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">Analytics</h1>
        <p className="text-sm text-gray-500">
          Cross-branch analytics are on the roadmap. Select a branch from the Home page to view branch-level analytics.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E5E5E5] bg-white p-10 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F2F2F2]">
          <HugeiconsIcon icon={AnalyticsDownIcon} size={32} className="text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-[#2F2F2F]">Coming Soon</h2>
        <p className="mt-3 max-w-sm text-sm text-[#7A7A7A]">
          Cross-branch analytics are on the roadmap. Select a branch from the Home page to view branch-level analytics.
        </p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (user && user.actorType !== "owner") {
      router.replace("/dashboard/branch-dashboard/analytics");
    }
  }, [router, user]);

  if (!user) {
    return null;
  }

  if (user.actorType !== "owner") {
    return null;
  }

  return <OwnerComingSoon />;
}