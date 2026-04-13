"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import OverviewPage from "@/components/dashboard/Overview/OverviewPage";
import { useUser } from "@/hooks/useUser";

export default function BranchDashboardPage() {
  const router = useRouter();
  const { user, activeBranchId } = useUser();

  // Owner without an active branch selected should go back to branch selection.
  // Staff always have activeBranchId set from their login token — no guard needed for them.
  useEffect(() => {
    if (user?.actorType === "owner" && !activeBranchId) {
      toast.info("Please select a branch first.");
      router.replace("/dashboard");
    }
  }, [activeBranchId, router, user?.actorType]);

  if (user?.actorType === "owner" && !activeBranchId) {
    return null;
  }

  return (
    <div className="space-y-6">
      <OverviewPage />
    </div>
  );
}
