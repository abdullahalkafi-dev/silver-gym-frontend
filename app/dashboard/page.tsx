// app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import OwnerBranchLanding from "@/components/dashboard/Branches/OwnerBranchLanding";
import { useUser } from "@/hooks/useUser";

export default function DashboardPage() {
  const router = useRouter();
  const { user, activeBranchId } = useUser();

  // Staff always belong to a specific branch — redirect them straight to the branch dashboard.
  useEffect(() => {
    if (user?.actorType === "staff" && activeBranchId) {
      router.replace("/dashboard/branch-dashboard");
    }
  }, [activeBranchId, router, user?.actorType]);

  if (user?.actorType === "staff") {
    // Render nothing while the redirect fires.
    return null;
  }

  // Owner: show the branch-selection landing page.
  return <OwnerBranchLanding />;
}
