"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from "@/hooks/useUser";
import { useAppDispatch } from "@/redux/hooks";
import { setActiveBranchId } from "@/redux/features/auth/authSlice";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useCreateOwnerBranchMutation,
  useGetOwnerBranchesQuery,
  useLazyGetOwnerDefaultBranchQuery,
} from "@/redux/features/branch/branchApi";
import { useGetBranchTodaySummaryQuery } from "@/redux/features/analytics/analyticsApi";
import type { Branch, CreateBranchPayload } from "@/types/branch";

const DEFAULT_BRANCH_LOOKUP_ATTEMPTS = 3;

type DefaultLookupState = "idle" | "loading" | "ready" | "missing" | "error";

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });

const getErrorStatus = (error: unknown): number | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as { status?: unknown };
  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  return null;
};

const isDefaultNotFoundError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  if (status === 404) {
    return true;
  }

  const message = extractApiErrorMessage(error).toLowerCase();
  return message.includes("default branch not found");
};

const getBranchInitials = (branchName: string) => {
  return branchName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("");
};

const formatAmount = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function AddBranchCard({
  onCreateClick,
}: {
  onCreateClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCreateClick}
      className="flex min-h-55 w-full flex-col rounded-2xl border border-[#E1E1E1] bg-[#F2F2F2] p-4 text-left transition-all hover:border-primary/40 hover:bg-[#ECECEC]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#6C6C6C] shadow-sm">
        <Plus className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-[#2F2F2F]">Add Branch</p>
      <p className="mt-1 text-xs text-[#7A7A7A]">
        Create a new branch to continue scaling your business.
      </p>
    </button>
  );
}

function BranchCardSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-[#E1E1E1] bg-[#F2F2F2] p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-xl" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
    </div>
  );
}

function BranchPreviewCard({
  branch,
  isSelected,
  onOpen,
}: {
  branch: Branch;
  isSelected: boolean;
  onOpen: () => void;
}) {
  const { data: todaySummary, isLoading } = useGetBranchTodaySummaryQuery({
    branchId: branch.id,
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        isSelected
          ? "border-primary/50 bg-[#F2F2F2]"
          : "border-[#E1E1E1] bg-[#F2F2F2] hover:border-primary/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#24135A] text-base font-semibold text-[#5DF0D4]">
          {getBranchInitials(branch.branchName) || "BR"}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[36px]/[44px] font-semibold text-[#4A4A4A] md:text-[22px]/[28px]">
            {branch.branchName}
          </h3>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-base text-[#8A8A8A] md:text-[13px]">
        {branch.branchAddress || "Address not added for this branch yet."}
      </p>

      <div className="mt-4 rounded-2xl bg-[#ECECEC] p-3">
        <p className="text-sm font-semibold text-[#2C2C2C]">Today&apos;s Report</p>

        {isLoading ? (
          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-full rounded-xl" />
            <Skeleton className="h-4 w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-[#F4F4F4] px-3 py-2">
              <span className="text-xs text-[#727272]">Opening Balance</span>
              <span className="text-sm font-semibold text-[#4A4A4A]">
                {formatAmount(todaySummary?.openingBalance ?? 0)} TK
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#F4F4F4] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#727272]">Income</span>
                  <span className="text-sm font-semibold text-[#36A86B]">
                    {formatAmount(todaySummary?.todayIncome ?? 0)}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-[#9A9A9A]">
                  {todaySummary?.todayIncomeCount ?? 0} transactions
                </p>
              </div>
              <div className="rounded-xl bg-[#F4F4F4] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#727272]">Expense</span>
                  <span className="text-sm font-semibold text-[#F16464]">
                    {formatAmount(todaySummary?.todayExpense ?? 0)}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-[#9A9A9A]">
                  {todaySummary?.todayExpenseCount ?? 0} transactions
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </button>
  );
}

export default function OwnerBranchLanding() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, activeBranchId } = useUser();

  const businessId = user?.businessProfile?.id;

  const [defaultLookupState, setDefaultLookupState] =
    useState<DefaultLookupState>("idle");
  const [defaultLookupError, setDefaultLookupError] = useState<string | null>(
    null
  );
  const [defaultLookupAttempts, setDefaultLookupAttempts] = useState(0);
  const [defaultBranchId, setDefaultBranchId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    activeBranchId || null
  );
  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    branchName: "",
    branchAddress: "",
    monthlyFeeAmount: "",
  });

  const {
    data: branches = [],
    isFetching: isBranchesFetching,
    refetch: refetchBranches,
  } = useGetOwnerBranchesQuery(businessId || "", {
    skip: !businessId,
  });
  const [fetchDefaultBranch] = useLazyGetOwnerDefaultBranchQuery();
  const [createOwnerBranch, { isLoading: isCreatingBranch }] =
    useCreateOwnerBranchMutation();

  useEffect(() => {
    if (!businessId) {
      return;
    }

    let cancelled = false;

    const resolveDefaultBranch = async () => {
      setDefaultLookupState("loading");
      setDefaultLookupError(null);
      setDefaultLookupAttempts(0);

      for (let attempt = 1; attempt <= DEFAULT_BRANCH_LOOKUP_ATTEMPTS; attempt += 1) {
        if (cancelled) {
          return;
        }

        setDefaultLookupAttempts(attempt);

        try {
          const branch = await fetchDefaultBranch(businessId, true).unwrap();

          if (cancelled) {
            return;
          }

          setDefaultBranchId(branch.id);
          setSelectedBranchId((currentValue) => currentValue || branch.id);
          dispatch(setActiveBranchId({ id: branch.id, name: branch.branchName }));
          setDefaultLookupState("ready");
          return;
        } catch (error) {
          if (attempt < DEFAULT_BRANCH_LOOKUP_ATTEMPTS) {
            await wait(350 * attempt);
            continue;
          }

          if (cancelled) {
            return;
          }

          setDefaultLookupError(extractApiErrorMessage(error));

          if (isDefaultNotFoundError(error)) {
            setDefaultLookupState("missing");
            setIsCreateBranchModalOpen(true);
          } else {
            setDefaultLookupState("error");
          }
        }
      }
    };

    void resolveDefaultBranch();

    return () => {
      cancelled = true;
    };
  }, [businessId, dispatch, fetchDefaultBranch]);

  const effectiveSelectedBranchId =
    selectedBranchId || activeBranchId || defaultBranchId || branches[0]?.id || null;

  const selectedBranch = useMemo(() => {
    return branches.find((branch) => branch.id === effectiveSelectedBranchId) || null;
  }, [branches, effectiveSelectedBranchId]);

  const handleCreateBranch = async () => {
    if (!businessId) {
      toast.error("Business profile is required before creating branches.");
      return;
    }

    const branchName = createForm.branchName.trim();
    if (branchName.length < 2) {
      toast.error("Branch name must be at least 2 characters.");
      return;
    }

    let monthlyFeeAmount: number | undefined;
    const monthlyFeeInput = createForm.monthlyFeeAmount.trim();

    if (monthlyFeeInput) {
      const parsedFee = Number(monthlyFeeInput);
      if (Number.isNaN(parsedFee) || parsedFee < 0) {
        toast.error("Monthly fee must be a positive number or zero.");
        return;
      }

      monthlyFeeAmount = parsedFee;
    }

    const payload: CreateBranchPayload = {
      branchName,
      branchAddress: createForm.branchAddress.trim() || undefined,
      monthlyFeeAmount,
    };

    try {
      const newBranch = await createOwnerBranch({
        businessId,
        payload,
      }).unwrap();

      dispatch(setActiveBranchId({ id: newBranch.id, name: newBranch.branchName }));
      setSelectedBranchId(newBranch.id);
      setIsCreateBranchModalOpen(false);
      setCreateForm({
        branchName: "",
        branchAddress: "",
        monthlyFeeAmount: "",
      });
      await refetchBranches();
      toast.success("Branch created successfully.");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  const handleOpenBranchDashboard = (branch: Branch | null) => {
    if (!branch) {
      toast.error("Select a branch before opening branch dashboard.");
      return;
    }

    dispatch(setActiveBranchId({ id: branch.id, name: branch.branchName }));
    setSelectedBranchId(branch.id);
    router.push("/dashboard/branch-dashboard");
  };

  if (!businessId) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-foreground">Business Profile Needed</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your owner account is missing business profile information. Complete
          onboarding first, then return to branch selection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold text-[#2F2F2F]">Company Name</h1>
            <p className="mt-1 text-sm text-[#7E7E7E]">
              Choose a branch first. Then open the branch dashboard.
            </p>
          </div>
        </div>

        {selectedBranch && (
          <p className="mt-3 text-sm text-[#666666]">
            Active branch: <span className="font-semibold text-[#2F2F2F]">{selectedBranch.branchName}</span>
          </p>
        )}

        {defaultLookupState === "loading" && (
          <p className="mt-2 text-sm text-[#7A7A7A]">
            Checking default branch, attempt {defaultLookupAttempts} of {DEFAULT_BRANCH_LOOKUP_ATTEMPTS}.
          </p>
        )}

        {defaultLookupState === "missing" && (
          <p className="mt-2 text-sm text-[#B4661F]">
            Default branch was not found after retries. Create one from the Add Branch card.
          </p>
        )}

        {defaultLookupState === "error" && (
          <p className="mt-2 text-sm text-[#BE3F3F]">
            Could not load default branch.
            {defaultLookupError ? ` ${defaultLookupError}` : ""}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 md:p-6">
        {isBranchesFetching && branches.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3].map((item) => (
              <BranchCardSkeleton key={item} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => {
              const isSelected = effectiveSelectedBranchId === branch.id;

              return (
                <BranchPreviewCard
                  key={branch.id}
                  branch={branch}
                  isSelected={isSelected}
                  onOpen={() => handleOpenBranchDashboard(branch)}
                />
              );
            })}

            <AddBranchCard onCreateClick={() => setIsCreateBranchModalOpen(true)} />
          </div>
        )}
      </div>

      <Dialog
        open={isCreateBranchModalOpen}
        onOpenChange={setIsCreateBranchModalOpen}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Branch</DialogTitle>
            <DialogDescription>
              Add a branch to continue with owner flow and dashboard navigation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-[#4A4A4A]">Branch Name</label>
              <Input
                value={createForm.branchName}
                onChange={(event) =>
                  setCreateForm((previous) => ({
                    ...previous,
                    branchName: event.target.value,
                  }))
                }
                placeholder="Enter branch name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#4A4A4A]">Branch Address</label>
              <Input
                value={createForm.branchAddress}
                onChange={(event) =>
                  setCreateForm((previous) => ({
                    ...previous,
                    branchAddress: event.target.value,
                  }))
                }
                placeholder="Enter branch address"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#4A4A4A]">Monthly Fee</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={createForm.monthlyFeeAmount}
                onChange={(event) =>
                  setCreateForm((previous) => ({
                    ...previous,
                    monthlyFeeAmount: event.target.value,
                  }))
                }
                placeholder="Optional monthly fee"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateBranchModalOpen(false)}
              disabled={isCreatingBranch}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateBranch} disabled={isCreatingBranch}>
              {isCreatingBranch ? "Creating..." : "Save Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
