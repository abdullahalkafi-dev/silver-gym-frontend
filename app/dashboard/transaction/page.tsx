// app/dashboard/transaction/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import TransactionList from "@/components/dashboard/Transaction/TransactionList";
import { useUser } from "@/hooks/useUser";

export default function TransactionPage() {
  const router = useRouter();
  const { isOwner, hasPermission } = useUser();

  useEffect(() => {
    if (!isOwner && !hasPermission("transaction:view")) {
      router.replace("/dashboard");
    }
  }, [isOwner, hasPermission, router]);

  if (!isOwner && !hasPermission("transaction:view")) return null;

  return <TransactionList />;
}
