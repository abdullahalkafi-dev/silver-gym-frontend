// app/dashboard/expense/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ExpenseList from "@/components/dashboard/Expense/ExpenseList";
import { useUser } from "@/hooks/useUser";

export default function ExpensePage() {
  const router = useRouter();
  const { isOwner, hasPermission } = useUser();

  useEffect(() => {
    if (!isOwner && !hasPermission("billing:view")) {
      router.replace("/dashboard/branch-dashboard");
    }
  }, [isOwner, hasPermission, router]);

  if (!isOwner && !hasPermission("billing:view")) return null;

  return <ExpenseList />;
}
