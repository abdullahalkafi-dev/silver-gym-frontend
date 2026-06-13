// components/accounts/BaseFeesSetup.tsx
"use client";
import { useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  getBranchFeeAccessState,
  parseBranchFeeInput,
  toBranchFeeDisplayValue,
  type BranchFeeAccessState,
  type BranchFeeFieldKey,
} from "@/lib/branchFees";
import {
  useGetBranchAdmissionFeeQuery,
  useGetBranchMonthlyFeeQuery,
  useUpdateBranchAdmissionFeeMutation,
  useUpdateBranchMonthlyFeeMutation,
} from "@/redux/features/branch/branchApi";

const getAccessHelperText = (access: BranchFeeAccessState) => {
  return access.isConfigured
    ? `You can edit this ${access.label.toLowerCase()}.`
    : `You can add this ${access.label.toLowerCase()}.`;
};

export const BaseFeesSetup = () => {
  const { user, activeBranchId, isOwner } = useUser();
  const [draftValues, setDraftValues] = useState<
    Partial<Record<BranchFeeFieldKey, string>>
  >({});
  const businessId = user?.businessProfile?.id || null;

  const feeQueryArg =
    businessId && activeBranchId
      ? { businessId, branchId: activeBranchId }
      : skipToken;

  const monthlyFeeQuery = useGetBranchMonthlyFeeQuery(feeQueryArg);
  const admissionFeeQuery = useGetBranchAdmissionFeeQuery(feeQueryArg);
  const [updateMonthlyFee, { isLoading: isUpdatingMonthlyFee }] =
    useUpdateBranchMonthlyFeeMutation();
  const [updateAdmissionFee, { isLoading: isUpdatingAdmissionFee }] =
    useUpdateBranchAdmissionFeeMutation();

  const liveMonthlyFee = monthlyFeeQuery.data?.monthlyFeeAmount ?? null;
  const liveAdmissionFee = admissionFeeQuery.data?.admissionFeeAmount ?? null;
  const monthlyAccess = getBranchFeeAccessState("monthly", liveMonthlyFee, {
    isOwner,
  });
  const admissionAccess = getBranchFeeAccessState("admission", liveAdmissionFee, {
    isOwner,
  });
  const displayedMonthlyFee =
    draftValues.monthly ?? toBranchFeeDisplayValue(liveMonthlyFee);
  const displayedAdmissionFee =
    draftValues.admission ?? toBranchFeeDisplayValue(liveAdmissionFee);
  const isLoadingFees =
    monthlyFeeQuery.isLoading ||
    monthlyFeeQuery.isFetching ||
    admissionFeeQuery.isLoading ||
    admissionFeeQuery.isFetching;
  const isSaving = isUpdatingMonthlyFee || isUpdatingAdmissionFee;
  const canManageAnyFees = monthlyAccess.canManage || admissionAccess.canManage;
  const hasChanges =
    draftValues.monthly !== undefined || draftValues.admission !== undefined;

  const handleAmountChange = (type: BranchFeeFieldKey, value: string) => {
    setDraftValues((currentValues) => ({
      ...currentValues,
      [type]: value,
    }));
  };

  const handleSave = async () => {
    if (!businessId || !activeBranchId) {
      toast.error("Select a branch before editing fees");
      return;
    }

    try {
      const updateRequests: Array<Promise<unknown>> = [];

      if (draftValues.monthly !== undefined) {
        const monthlyFeeAmount = parseBranchFeeInput(
          displayedMonthlyFee,
          monthlyAccess.label,
        );

        if (monthlyFeeAmount !== liveMonthlyFee) {
          updateRequests.push(
            updateMonthlyFee({
              businessId,
              branchId: activeBranchId,
              monthlyFeeAmount,
            }).unwrap()
          );
        }
      }

      if (draftValues.admission !== undefined) {
        const admissionFeeAmount = parseBranchFeeInput(
          displayedAdmissionFee,
          admissionAccess.label,
        );

        if (admissionFeeAmount !== liveAdmissionFee) {
          updateRequests.push(
            updateAdmissionFee({
              businessId,
              branchId: activeBranchId,
              admissionFeeAmount,
            }).unwrap()
          );
        }
      }

      if (updateRequests.length === 0) {
        toast.info("No fee changes to save");
        return;
      }

      await Promise.all(updateRequests);
      setDraftValues({});
      toast.success("Branch fees updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : extractApiErrorMessage(error);
      toast.error(message);
    }
  };

  if (isLoadingFees) {
    return (
      <Card className="h-full p-5 shadow-none border-none space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </Card>
    );
  }

  if (!businessId || !activeBranchId) {
    return (
      <Card className="h-full p-5 shadow-none border-none">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Base Fees Setup</h2>
          <p className="text-sm text-gray-600">
            Select a branch to manage branch-level admission and monthly fees.
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
            Base Fees Setup
          </h2>
          {canManageAnyFees ? (
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? "Saving..." : "Save Fee Settings"}
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Easily manage your gym&apos;s admission and monthly fees in one place
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3 bg-gray-primary p-3 rounded-md">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-700 font-medium">Admission Fee</h3>
            <span className="text-xs font-medium text-gray-500">Required</span>
          </div>
          <p className="text-xs text-gray-500">
            This is a one-time fee for new member must pay
          </p>
          <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded font-semibold text-text-primary">
            <p className="text-sm">Amount</p>
            <div className="bg-gray-secondary rounded-lg">
              <Input
                type="number"
                value={displayedAdmissionFee}
                onChange={(e) => handleAmountChange("admission", e.target.value)}
                className="w-28 text-right"
                min="0"
                disabled={!admissionAccess.canManage || isSaving}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">{getAccessHelperText(admissionAccess)}</p>
        </div>

        <div className="space-y-3 bg-gray-primary p-3 rounded-md">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-700 font-medium">Monthly Fee</h3>
            <span className="text-xs font-medium text-gray-500">Required</span>
          </div>
          <p className="text-xs text-gray-500">
            This fee will apply every month unless a package is selected
          </p>
          <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded font-semibold text-text-primary">
            <p className="text-sm">Amount</p>
            <div className="bg-gray-secondary rounded-lg">
              <Input
                type="number"
                value={displayedMonthlyFee}
                onChange={(e) => handleAmountChange("monthly", e.target.value)}
                className="w-28 text-right"
                min="0"
                disabled={!monthlyAccess.canManage || isSaving}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">{getAccessHelperText(monthlyAccess)}</p>
        </div>
      </div>
    </Card>
  );
};
