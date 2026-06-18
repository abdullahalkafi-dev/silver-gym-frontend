"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  getBranchFeeAccessState,
  getMissingBranchFeeItems,
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

type BranchFeeSetupContextValue = {
  branchId: string | null;
  businessId: string | null;
  isFeeStatusKnown: boolean;
  hasMissingFees: boolean;
  canManageFees: boolean;
  requestFeeSetup: (reason?: string) => boolean;
};

const BranchFeeSetupContext = createContext<BranchFeeSetupContextValue | null>(null);

const OWNER_CONTEXT_FREE_PATHS = new Set(["/dashboard", "/dashboard/analytics"]);

const getAccessHelperText = (access: BranchFeeAccessState) => {
  return access.isConfigured
    ? `You can edit this ${access.label.toLowerCase()}.`
    : `You can add this ${access.label.toLowerCase()} here.`;
};

const BranchFeeFieldCard = ({
  title,
  description,
  value,
  access,
  isSaving,
  onChange,
}: {
  title: string;
  description: string;
  value: string;
  access: BranchFeeAccessState;
  isSaving: boolean;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="space-y-3 rounded-xl border border-[#E7E7E7] bg-[#FAFAFA] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#2F2F2F]">{title}</h3>
          <p className="mt-1 text-xs text-[#6F6F6F]">{description}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#6F6F6F]">
          {access.isConfigured ? "Configured" : "Missing"}
        </span>
      </div>

      <Input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={!access.canManage || isSaving}
        placeholder={`Enter ${title.toLowerCase()}`}
      />

      <p className="text-xs text-[#6F6F6F]">{getAccessHelperText(access)}</p>
    </div>
  );
};

const BranchFeeSetupModal = ({
  isOpen,
  branchName,
  missingItems,
  monthlyValue,
  admissionValue,
  monthlyAccess,
  admissionAccess,
  canManageFees,
  hasChanges,
  isSaving,
  onFieldChange,
  onSave,
  onClose,
}: {
  isOpen: boolean;
  branchName: string;
  missingItems: string[];
  monthlyValue: string;
  admissionValue: string;
  monthlyAccess: BranchFeeAccessState;
  admissionAccess: BranchFeeAccessState;
  canManageFees: boolean;
  hasChanges: boolean;
  isSaving: boolean;
  onFieldChange: (field: BranchFeeFieldKey, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Branch Fees Need Setup</DialogTitle>
          <DialogDescription>
            {branchName
              ? `${branchName} is missing required branch fee settings.`
              : "This branch is missing required fee settings."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {canManageFees ? (
            <>
              <p className="font-medium">Complete these settings before creating packages or members:</p>
              <ul className="mt-3 space-y-2">
                {missingItems.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="font-medium">Please contact the admin to configure the missing branch fee settings: {missingItems.join(", ")}.</p>
          )}
        </div>

        {canManageFees ? (
          <div className="grid gap-4 md:grid-cols-2">
            <BranchFeeFieldCard
              title="Admission Fee"
              description="This is the one-time fee new members pay when they join."
              value={admissionValue}
              access={admissionAccess}
              isSaving={isSaving}
              onChange={(value) => onFieldChange("admission", value)}
            />
            <BranchFeeFieldCard
              title="Monthly Fee"
              description="This is the recurring monthly fee unless a package overrides it."
              value={monthlyValue}
              access={monthlyAccess}
              isSaving={isSaving}
              onChange={(value) => onFieldChange("monthly", value)}
            />
          </div>
        ) : null}



        <DialogFooter className="sm:justify-between gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {canManageFees ? (
            <Button type="button" onClick={onSave} disabled={!hasChanges || isSaving}>
              {isSaving ? "Saving..." : "Save Fee Values"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function BranchFeeSetupProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, activeBranchId, isOwner } = useUser();
  const [dismissedBranchId, setDismissedBranchId] = useState<string | null>(null);
  const [forcedReason, setForcedReason] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<
    Partial<Record<BranchFeeFieldKey, string>>
  >({});

  const businessId = user?.businessProfile?.id || null;
  const isOwnerContextFreeRoute = isOwner && OWNER_CONTEXT_FREE_PATHS.has(pathname);
  const shouldTrackFeeStatus = Boolean(
    businessId && activeBranchId && !isOwnerContextFreeRoute,
  );

  const feeQueryArg =
    shouldTrackFeeStatus && businessId && activeBranchId
      ? { businessId, branchId: activeBranchId }
      : skipToken;

  const monthlyFeeQuery = useGetBranchMonthlyFeeQuery(feeQueryArg);
  const admissionFeeQuery = useGetBranchAdmissionFeeQuery(feeQueryArg);
  const [updateMonthlyFee, { isLoading: isUpdatingMonthlyFee }] =
    useUpdateBranchMonthlyFeeMutation();
  const [updateAdmissionFee, { isLoading: isUpdatingAdmissionFee }] =
    useUpdateBranchAdmissionFeeMutation();

  const isFeeStatusKnown =
    feeQueryArg !== skipToken &&
    !monthlyFeeQuery.isLoading &&
    !monthlyFeeQuery.isFetching &&
    !admissionFeeQuery.isLoading &&
    !admissionFeeQuery.isFetching &&
    !monthlyFeeQuery.isError &&
    !admissionFeeQuery.isError;

  const monthlyFeeAmount = monthlyFeeQuery.data?.monthlyFeeAmount ?? null;
  const admissionFeeAmount = admissionFeeQuery.data?.admissionFeeAmount ?? null;
  const monthlyAccess = getBranchFeeAccessState("monthly", monthlyFeeAmount, {
    isOwner,
  });
  const admissionAccess = getBranchFeeAccessState("admission", admissionFeeAmount, {
    isOwner,
  });
  const monthlyValue = draftValues.monthly ?? toBranchFeeDisplayValue(monthlyFeeAmount);
  const admissionValue =
    draftValues.admission ?? toBranchFeeDisplayValue(admissionFeeAmount);
  const branchName =
    monthlyFeeQuery.data?.branchName || admissionFeeQuery.data?.branchName || "";
  const hasMissingFees =
    isFeeStatusKnown &&
    (monthlyFeeAmount === null || admissionFeeAmount === null);
  const canManageFees =
    (monthlyFeeAmount === null && monthlyAccess.canManage) ||
    (admissionFeeAmount === null && admissionAccess.canManage);
  const isSaving = isUpdatingMonthlyFee || isUpdatingAdmissionFee;
  const hasChanges =
    draftValues.monthly !== undefined || draftValues.admission !== undefined;
  const isDismissedForCurrentBranch = dismissedBranchId === activeBranchId;
  const isModalOpen =
    hasMissingFees && (!isDismissedForCurrentBranch || Boolean(forcedReason));

  const missingItems = getMissingBranchFeeItems({
    monthlyFeeAmount,
    admissionFeeAmount,
  });

  const requestFeeSetup = (reason = "manual") => {
    if (!hasMissingFees) {
      return false;
    }

    setDismissedBranchId(null);
    setForcedReason(reason);
    return true;
  };

  const handleFieldChange = (field: BranchFeeFieldKey, value: string) => {
    setDraftValues((currentValues) => ({
      ...currentValues,
      [field]: value,
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
        const monthlyFeeValue = parseBranchFeeInput(monthlyValue, monthlyAccess.label);

        if (monthlyFeeValue !== monthlyFeeAmount) {
          updateRequests.push(
            updateMonthlyFee({
              businessId,
              branchId: activeBranchId,
              monthlyFeeAmount: monthlyFeeValue,
            }).unwrap(),
          );
        }
      }

      if (draftValues.admission !== undefined) {
        const admissionFeeValue = parseBranchFeeInput(
          admissionValue,
          admissionAccess.label,
        );

        if (admissionFeeValue !== admissionFeeAmount) {
          updateRequests.push(
            updateAdmissionFee({
              businessId,
              branchId: activeBranchId,
              admissionFeeAmount: admissionFeeValue,
            }).unwrap(),
          );
        }
      }

      if (updateRequests.length === 0) {
        toast.info("No fee changes to save");
        return;
      }

      await Promise.all(updateRequests);
      setDraftValues({});
      setForcedReason(null);
      toast.success("Branch fees updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : extractApiErrorMessage(error);
      toast.error(message);
    }
  };

  const handleClose = () => {
    if (activeBranchId) {
      setDismissedBranchId(activeBranchId);
    }
    setForcedReason(null);
  };

  const value = {
    branchId: activeBranchId,
    businessId,
    isFeeStatusKnown,
    hasMissingFees,
    canManageFees,
    requestFeeSetup,
  };

  return (
    <BranchFeeSetupContext.Provider value={value}>
      {children}
      <BranchFeeSetupModal
        isOpen={isModalOpen}
        branchName={branchName}
        missingItems={missingItems}
        monthlyValue={monthlyValue}
        admissionValue={admissionValue}
        monthlyAccess={monthlyAccess}
        admissionAccess={admissionAccess}
        canManageFees={canManageFees}
        hasChanges={hasChanges}
        isSaving={isSaving}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
        onClose={handleClose}
      />
    </BranchFeeSetupContext.Provider>
  );
}

export function useBranchFeeSetupGuard() {
  const context = useContext(BranchFeeSetupContext);

  if (!context) {
    throw new Error("useBranchFeeSetupGuard must be used within BranchFeeSetupProvider");
  }

  return context;
}