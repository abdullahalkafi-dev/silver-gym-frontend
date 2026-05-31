"use client";

import { useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  Archive,
  FileText,
  LoaderCircle,
  PencilLine,
  RotateCcw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignSquareIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { PackageModal } from "../modals/PackageModal";
import { useUser } from "@/hooks/useUser";
import { useBranchFeeSetupGuard } from "@/components/dashboard/BranchFeeSetupGuard";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useArchiveBranchPackageMutation,
  useCreateBranchPackageMutation,
  useGetBranchPackagesQuery,
  useRestoreBranchPackageMutation,
  useUpdateBranchPackageMutation,
} from "@/redux/features/package/packageApi";
import type {
  GymPackage,
  PackageDurationType,
  PackageFormPayload,
} from "@/types/package";

const currencyFormatter = new Intl.NumberFormat("en-BD", {
  maximumFractionDigits: 0,
});

const durationTypeLabelMap: Record<PackageDurationType, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
};

const formatAmount = (amount: number) => `৳${currencyFormatter.format(amount)}`;

const formatDuration = (
  duration: number,
  durationType: PackageDurationType,
) => {
  const label = durationTypeLabelMap[durationType];
  return `${duration} ${label}${duration === 1 ? "" : "s"}`;
};

export const PackageTab = () => {
  const { activeBranchId, isOwner, hasPermission } = useUser();
  const { isFeeStatusKnown, hasMissingFees, requestFeeSetup } =
    useBranchFeeSetupGuard();
  const [packageView, setPackageView] = useState<"active" | "archived">("active");
  const [editingPackage, setEditingPackage] = useState<GymPackage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canCreatePackage = isOwner || hasPermission("package:create");
  const canEditPackage = isOwner || hasPermission("package:edit");
  const canDeletePackage = isOwner || hasPermission("package:delete");
  const showArchivedPackages = packageView === "archived";

  const packageQueryArg = activeBranchId
    ? { branchId: activeBranchId, isActive: !showArchivedPackages }
    : skipToken;

  const packagesQuery = useGetBranchPackagesQuery(packageQueryArg);
  const [createBranchPackage, { isLoading: isCreatingPackage }] =
    useCreateBranchPackageMutation();
  const [updateBranchPackage, { isLoading: isUpdatingPackage }] =
    useUpdateBranchPackageMutation();
  const [archiveBranchPackage, { isLoading: isArchivingPackage }] =
    useArchiveBranchPackageMutation();
  const [restoreBranchPackage, { isLoading: isRestoringPackage }] =
    useRestoreBranchPackageMutation();

  const packages = packagesQuery.data?.data ?? [];
  const isMutatingPackage =
    isCreatingPackage ||
    isUpdatingPackage ||
    isArchivingPackage ||
    isRestoringPackage;

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPackage(null);
  };

  const handleOpenCreateModal = () => {
    if (isFeeStatusKnown && hasMissingFees && requestFeeSetup("package-create")) {
      return;
    }

    setEditingPackage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg: GymPackage) => {
    setEditingPackage(pkg);
    setIsModalOpen(true);
  };

  const handleSubmit = async (payload: PackageFormPayload) => {
    if (!activeBranchId) {
      toast.error("Select a branch before managing packages");
      return;
    }

    try {
      if (editingPackage) {
        await updateBranchPackage({
          branchId: activeBranchId,
          packageId: editingPackage.id,
          payload,
        }).unwrap();
        toast.success("Package updated successfully");
      } else {
        await createBranchPackage({
          branchId: activeBranchId,
          payload,
        }).unwrap();
        toast.success("Package created successfully");
      }

      closeModal();
    } catch (error) {
      const message = extractApiErrorMessage(error);
      toast.error(message);

      if (
        message.toLowerCase().includes("configure branch monthly fee and admission fee")
      ) {
        requestFeeSetup("package-create");
      }
    }
  };

  const handleArchive = async (packageId: string) => {
    if (!activeBranchId) {
      return;
    }

    try {
      await archiveBranchPackage({
        branchId: activeBranchId,
        packageId,
      }).unwrap();
      toast.success("Package archived successfully");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  const handleRestore = async (packageId: string) => {
    if (!activeBranchId) {
      return;
    }

    try {
      await restoreBranchPackage({
        branchId: activeBranchId,
        packageId,
      }).unwrap();
      toast.success("Package restored successfully");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  if (!activeBranchId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        Select a branch to manage package details.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md bg-gray-secondary p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-secondary">
            Package Titles
          </h2>
          <p className="text-sm text-gray-500">
            Manage active and archived membership packages for the current branch.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-lg bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setPackageView("active")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                !showArchivedPackages
                  ? "bg-purple text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setPackageView("archived")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                showArchivedPackages
                  ? "bg-purple text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Archived
            </button>
          </div>

          {canCreatePackage && !showArchivedPackages ? (
            <Button
              type="button"
              onClick={handleOpenCreateModal}
              disabled={isMutatingPackage}
              className="bg-[#E1E1E1] text-text-primary hover:bg-gray-200"
            >
              <HugeiconsIcon icon={PlusSignSquareIcon} size={18} />
              Add New
            </Button>
          ) : null}
        </div>
      </div>

      {packagesQuery.isLoading || packagesQuery.isFetching ? (
        <div className="flex min-h-55 items-center justify-center rounded-xl bg-white">
          <LoaderCircle className="h-8 w-8 animate-spin text-purple" />
        </div>
      ) : packagesQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load packages. Please refresh and try again.
        </div>
      ) : packages.length === 0 ? (
        <div className="flex min-h-65 flex-col items-center justify-center rounded-xl bg-white px-6 text-center">
          <div className="text-gray-400">
            <FileText size={56} />
          </div>
          <p className="mt-4 text-base font-medium text-gray-700">
            {showArchivedPackages
              ? "No archived packages found"
              : "No packages available yet"}
          </p>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            {showArchivedPackages
              ? "Archived packages will appear here once a package is removed from the active list."
              : "Create the first package to start assigning memberships from this branch."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white p-2">
          <Table className="w-full border-separate border-spacing-y-1">
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="rounded-l-md px-4 py-4 font-semibold text-text-primary">
                  Title
                </TableHead>
                <TableHead className="py-4 font-semibold text-text-primary">
                  Duration
                </TableHead>
                <TableHead className="py-4 font-semibold text-text-primary">
                  Amount
                </TableHead>
                <TableHead className="py-4 font-semibold text-text-primary">
                  Admission Fee
                </TableHead>
                <TableHead className="rounded-r-md py-4 font-semibold text-text-primary">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id} className="bg-white hover:bg-primary/10">
                  <TableCell className="rounded-l-md px-4 align-top text-text-primary">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1 inline-flex h-3 w-3 rounded-full"
                        style={{ backgroundColor: pkg.color }}
                      />
                      <div>
                        <p className="font-medium">{pkg.title}</p>
                        {pkg.description ? (
                          <p className="mt-1 text-xs text-gray-500">{pkg.description}</p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-text-primary">
                    {formatDuration(pkg.duration, pkg.durationType)}
                  </TableCell>
                  <TableCell className="align-top text-text-primary">
                    {formatAmount(pkg.amount)}
                  </TableCell>
                  <TableCell className="align-top text-text-primary">
                    {pkg.includeAdmissionFee ? "Included" : "Not included"}
                  </TableCell>
                  <TableCell className="rounded-r-md align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      {!showArchivedPackages && canEditPackage ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(pkg)}
                          className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
                        >
                          <PencilLine className="h-4 w-4" />
                          Edit
                        </button>
                      ) : null}

                      {!showArchivedPackages && canDeletePackage ? (
                        <button
                          type="button"
                          onClick={() => handleArchive(pkg.id)}
                          disabled={isArchivingPackage}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Archive className="h-4 w-4" />
                          Archive
                        </button>
                      ) : null}

                      {showArchivedPackages && canEditPackage ? (
                        <button
                          type="button"
                          onClick={() => handleRestore(pkg.id)}
                          disabled={isRestoringPackage}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restore
                        </button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isModalOpen ? (
        <PackageModal
          isOpen={isModalOpen}
          onClose={closeModal}
          package={editingPackage}
          onSubmit={handleSubmit}
          isSubmitting={isCreatingPackage || isUpdatingPackage}
        />
      ) : null}
    </div>
  );
};