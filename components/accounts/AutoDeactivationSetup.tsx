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
  useGetBranchAutoDeactivationSettingsQuery,
  useUpdateBranchAutoDeactivationSettingsMutation,
} from "@/redux/features/branch/branchApi";

const parseAutoDeactivationMonths = (value: string) => {
  if (value.trim() === "") {
    throw new Error("Auto-deactivation months is required");
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error("Auto-deactivation months must be a whole number of at least 1");
  }

  return parsedValue;
};

export const AutoDeactivationSetup = () => {
  const { user, activeBranchId, isOwner } = useUser();
  const [draftValue, setDraftValue] = useState<string | undefined>(undefined);
  const businessId = user?.businessProfile?.id || null;

  const queryArg =
    businessId && activeBranchId
      ? { businessId, branchId: activeBranchId }
      : skipToken;

  const autoDeactivationQuery = useGetBranchAutoDeactivationSettingsQuery(queryArg);
  const [updateAutoDeactivationSettings, { isLoading: isSaving }] =
    useUpdateBranchAutoDeactivationSettingsMutation();

  const liveValue = autoDeactivationQuery.data?.autoDeactivateAfterUnpaidMonths ?? 6;
  const displayedValue = draftValue ?? String(liveValue);
  const hasChanges = draftValue !== undefined;

  const handleSave = async () => {
    if (!businessId || !activeBranchId) {
      toast.error("Select a branch before editing auto-deactivation settings");
      return;
    }

    if (!isOwner) {
      toast.error("Only the owner can update this setting");
      return;
    }

    try {
      const autoDeactivateAfterUnpaidMonths = parseAutoDeactivationMonths(
        displayedValue,
      );

      if (autoDeactivateAfterUnpaidMonths === liveValue) {
        toast.info("No auto-deactivation changes to save");
        return;
      }

      await updateAutoDeactivationSettings({
        businessId,
        branchId: activeBranchId,
        autoDeactivateAfterUnpaidMonths,
      }).unwrap();

      setDraftValue(undefined);
      toast.success("Auto-deactivation setting updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : extractApiErrorMessage(error);
      toast.error(message);
    }
  };

  if (autoDeactivationQuery.isLoading || autoDeactivationQuery.isFetching) {
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
          <h2 className="text-lg font-semibold text-gray-900">
            Auto Deactivate Members
          </h2>
          <p className="text-sm text-gray-600">
            Select a branch to review how many overdue months trigger automatic member deactivation.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full p-5 shadow-none border-none">
      <div>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Auto Deactivate Members
          </h2>
          {isOwner ? (
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? "Saving..." : "Save Rule"}
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Members will be automatically deactivated after this many full overdue months without payment.
        </p>
      </div>

      <div className="space-y-3 bg-gray-primary p-3 rounded-md">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-700 font-medium">Unpaid Threshold</h3>
          <span className="text-xs font-medium text-gray-500">Branch Level</span>
        </div>
        <p className="text-xs text-gray-500">
          The system counts full overdue months only. If a member remains unpaid up to this threshold, the branch automation will mark them inactive.
        </p>
        <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded font-semibold text-text-primary">
          <p className="text-sm">Months</p>
          <div className="bg-gray-secondary rounded-lg">
            <Input
              type="number"
              min="1"
              step="1"
              value={displayedValue}
              onChange={(event) => setDraftValue(event.target.value)}
              className="w-28 text-right"
              disabled={!isOwner || isSaving}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {isOwner
            ? "Only the owner can change this rule for the selected branch."
            : "Read only. Only the owner can change this rule."}
        </p>
      </div>
    </Card>
  );
};