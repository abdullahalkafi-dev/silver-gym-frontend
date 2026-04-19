// app/dashboard/income/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import IncomeList from "@/components/dashboard/Income/IncomeList";
import { useUser } from "@/hooks/useUser";

export default function IncomePage() {
  const router = useRouter();
  const { isOwner, hasPermission } = useUser();

  useEffect(() => {
    if (!isOwner && !hasPermission("billing:view")) {
      router.replace("/dashboard/branch-dashboard");
    }
  }, [isOwner, hasPermission, router]);

  if (!isOwner && !hasPermission("billing:view")) return null;

  return <IncomeList />;
}

