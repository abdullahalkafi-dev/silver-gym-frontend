"use client";

import { useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useGetBranchStartingBalanceQuery,
  useSetBranchStartingBalanceMutation,
} from "@/redux/features/branch/branchApi";

const parseStartingBalance = (value: string) => {
  if (value.trim() === "") {
    throw new Error("Starting balance is required");
  }
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    throw new Error("Starting balance must be a valid number");
  }
  return parsedValue;
};

export const StartingBalanceSetup = () => {
  const { user, activeBranchId, isOwner } = useUser();
  const [draftValue, setDraftValue] = useState<string | undefined>(undefined);
  const businessId = user?.businessProfile?.id || null;

  const queryArg =
    businessId && activeBranchId
      ? { businessId, branchId: activeBranchId }
      : skipToken;

  const startingBalanceQuery = useGetBranchStartingBalanceQuery(queryArg);
  const [setStartingBalance, { isLoading: isSaving }] =
    useSetBranchStartingBalanceMutation();

  const liveValue = startingBalanceQuery.data?.startingBalance ?? null;
  const isInitialized = liveValue !== null;
  const displayedValue = draftValue ?? (liveValue !== null ? String(liveValue) : "");
  const hasChanges = draftValue !== undefined;

  const handleSave = async () => {
    if (!businessId || !activeBranchId) {
      toast.error("Select a branch before setting the starting balance");
      return;
    }
    if (!isOwner) {
      toast.error("Only the owner can set the starting balance");
      return;
    }
    try {
      const startingBalance = parseStartingBalance(displayedValue);
      await setStartingBalance({
        businessId,
        branchId: activeBranchId,
        startingBalance,
      }).unwrap();
      setDraftValue(undefined);
      toast.success("Starting balance set successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : extractApiErrorMessage(error);
      toast.error(message);
    }
  };

  if (startingBalanceQuery.isLoading || startingBalanceQuery.isFetching) {
    return (
      <Card className="h-full p-5 shadow-none border-none space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </Card>
    );
  }

  if (!businessId || !activeBranchId) {
    return (
      <Card className="h-full p-5 shadow-none border-none">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Starting Balance</h2>
          <p className="text-sm text-gray-600">
            Select a branch to set the starting balance.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full p-5 shadow-none border-none">
      <div>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Starting Balance</h2>
          {isOwner && !isInitialized ? (
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? "Saving..." : "Set Balance"}
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {isInitialized
            ? "The running balance is tracked from this starting value. It cannot be changed."
            : "Set the initial balance for this branch. This is a one-time action and cannot be undone."}
        </p>
      </div>
      <div className="space-y-3 bg-gray-primary p-3 rounded-md">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-700 font-medium">Initial Balance</h3>
          <span className={`text-xs font-medium ${isInitialized ? "text-green-600" : "text-gray-500"}`}>
            {isInitialized ? "Locked" : "One-time Setup"}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {isInitialized
            ? "Income and expenses continuously adjust this balance. It never resets."
            : "Set the starting balance for this branch. Once set, it cannot be edited."}
        </p>
        <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded font-semibold text-text-primary">
          <p className="text-sm">Amount</p>
          <div className="bg-gray-secondary rounded-lg">
            <Input
              type="number"
              value={displayedValue}
              onChange={(event) => setDraftValue(event.target.value)}
              className="w-36 text-right"
              placeholder="0"
              disabled={!isOwner || isInitialized || isSaving}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {isOwner
            ? isInitialized
              ? "This balance is locked. Only income and expense transactions can change the running balance."
              : "Only the owner can set the starting balance. This action is permanent."
            : "Read only. Only the owner can set the starting balance."}
        </p>
      </div>
    </Card>
  );
};
