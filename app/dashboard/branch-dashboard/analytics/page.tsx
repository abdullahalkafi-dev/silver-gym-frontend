"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import BranchAnalyticsContent from "@/components/dashboard/Analytics/BranchAnalyticsContent";
import { useUser } from "@/hooks/useUser";

export default function BranchAnalyticsPage() {
  const router = useRouter();
  const { user, activeBranchId } = useUser();

  useEffect(() => {
    if (user?.actorType === "owner" && !activeBranchId) {
      toast.info("Please select a branch first.");
      router.replace("/dashboard");
    }
  }, [activeBranchId, router, user?.actorType]);

  if (user?.actorType === "owner" && !activeBranchId) {
    return null;
  }

  return <BranchAnalyticsContent />;
}