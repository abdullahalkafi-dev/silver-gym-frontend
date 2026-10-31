"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useGetBranchImportSettingsQuery,
  useUpdateBranchImportSettingsMutation,
} from "@/redux/features/branch/branchApi";

export const ImportSettingsSetup = () => {
  const { user, activeBranchId, isOwner } = useUser();
  const businessId = user?.businessProfile?.id || null;

  const queryArg =
    businessId && activeBranchId
      ? { businessId, branchId: activeBranchId }
      : skipToken;

  const importSettingsQuery = useGetBranchImportSettingsQuery(queryArg);
  const [updateImportSettings, { isLoading: isSaving }] =
    useUpdateBranchImportSettingsMutation();

  const allowDuplicates =
    importSettingsQuery.data?.allowDuplicatePhoneOnImport ?? false;

  const handleToggle = async (next: boolean) => {
    if (!businessId || !activeBranchId) {
      toast.error("Select a branch before editing import settings");
      return;
    }

    if (!isOwner) {
      toast.error("Only the owner can update this setting");
      return;
    }

    try {
      await updateImportSettings({
        businessId,
        branchId: activeBranchId,
        allowDuplicatePhoneOnImport: next,
      }).unwrap();
      toast.success(
        next
          ? "Duplicate phone numbers are now allowed on import"
          : "Duplicate phone numbers are now blocked on import",
      );
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  if (importSettingsQuery.isLoading) {
    return (
      <Card className="h-full p-5 shadow-none border-none space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-24 rounded-xl" />
      </Card>
    );
  }

  return (
    <Card className="h-full p-5 shadow-none border-none">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Member Import</h2>
        <p className="text-sm text-gray-600 mt-1">
          Control how this branch handles repeated phone numbers when importing
          members from a file.
        </p>
      </div>

      <div className="space-y-3 bg-gray-primary p-3 rounded-md">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-700 font-medium">
            Allow duplicate phone numbers on import
          </h3>
          <span className="text-xs font-medium text-gray-500">Branch Level</span>
        </div>
        <p className="text-xs text-gray-500">
          When on, the import accepts files where several members share one
          phone number. Adding a member or changing a phone number later is
          still blocked if the number is already used in this branch.
        </p>
        <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded">
          <p className="text-sm font-semibold text-text-primary">
            {allowDuplicates ? "Allowed" : "Blocked"}
          </p>
          <Switch
            checked={allowDuplicates}
            onCheckedChange={handleToggle}
            disabled={!isOwner || isSaving || !businessId || !activeBranchId}
            aria-label="Allow duplicate phone numbers on import"
          />
        </div>
        <p className="text-xs text-amber-700">
          Members sharing a number will all receive SMS sent to it. Keep
          automatic SMS turned off for this branch until the numbers are fixed.
        </p>
        <p className="text-xs text-gray-500">
          {isOwner
            ? "Only the owner can change this setting for the selected branch."
            : "Read only. Only the owner can change this setting."}
        </p>
      </div>
    </Card>
  );
};
