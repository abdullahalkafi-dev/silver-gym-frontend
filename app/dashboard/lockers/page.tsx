"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import {
  useGetLockersQuery,
  useGetLockerStatsQuery,
  useGetLockerFeeQuery,
} from "@/redux/features/locker/lockerApi";
import { LockerGrid } from "@/components/dashboard/Locker/LockerGrid";
import { CreateLockersModal } from "@/components/dashboard/Locker/CreateLockersModal";
import { LockerPricingModal } from "@/components/dashboard/Locker/LockerPricingModal";
import { AssignMemberModal } from "@/components/dashboard/Locker/AssignMemberModal";
import { LockerDetailDrawer } from "@/components/dashboard/Locker/LockerDetailDrawer";
import { LockerPaymentModal } from "@/components/dashboard/Locker/LockerPaymentModal";
import type { Locker, LockerStatus } from "@/types/locker";
import { HugeiconsIcon } from "@hugeicons/react";
import { Locker01Icon } from "@hugeicons/core-free-icons";

export default function LockersPage() {
  const { activeBranchId } = useUser();

  const [statusFilter, setStatusFilter] = useState<LockerStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: lockers = [],
    isLoading,
    isFetching,
  } = useGetLockersQuery(
    {
      branchId: activeBranchId || "",
      status: statusFilter === "all" ? undefined : statusFilter,
      search: debouncedSearch || undefined,
    },
    { skip: !activeBranchId }
  );

  const { data: stats } = useGetLockerStatsQuery(
    { branchId: activeBranchId || "" },
    { skip: !activeBranchId }
  );

  const { data: lockerFee } = useGetLockerFeeQuery(
    { branchId: activeBranchId || "" },
    { skip: !activeBranchId }
  );

  const systemPrice = lockerFee?.lockerFeeAmount || 0;

  if (!activeBranchId) {
    return (
      <div className="p-4 md:px-6">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HugeiconsIcon
            icon={Locker01Icon}
            size={64}
            className="text-gray-300 mb-4"
          />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            No Branch Selected
          </h2>
          <p className="text-text-secondary">
            Please select a branch from the dashboard first.
          </p>
        </div>
      </div>
    );
  }

  const handleLockerClick = (locker: Locker) => {
    setSelectedLocker(locker);
    setShowDetailDrawer(true);
  };

  const handleCollectPayment = (locker: Locker) => {
    setSelectedLocker(locker);
    setShowDetailDrawer(false);
    setShowPaymentModal(true);
  };

  const handleEditPrice = (locker: Locker) => {
    setSelectedLocker(locker);
    setShowDetailDrawer(false);
    setShowPricingModal(true);
  };

  const handleAssignMember = (locker: Locker) => {
    setSelectedLocker(locker);
    setShowDetailDrawer(false);
    setShowAssignModal(true);
  };

  return (
    <div className="p-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <HugeiconsIcon icon={Locker01Icon} size={28} className="text-primary" />
          <h1 className="text-2xl font-bold text-text-primary">Locker Management</h1>
        </div>
        <div className="flex items-center gap-2">
          {!systemPrice && (
            <button
              onClick={() => setShowPricingModal(true)}
              className="btn-secondary text-sm px-4 py-2"
            >
              Set Default Price
            </button>
          )}
          {systemPrice > 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-sm px-4 py-2"
            >
              + Create Lockers
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-text-secondary">Total Lockers</p>
            <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-text-secondary">Available</p>
            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-text-secondary">Occupied</p>
            <p className="text-2xl font-bold text-primary">{stats.occupied}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-text-secondary">Maintenance</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {stats && stats.total > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by locker number, member name, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-primary w-full pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LockerStatus | "all")}
            className="input-primary w-full sm:w-40"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      )}

      {/* Content */}
      {isLoading || isFetching ? (
        <>
          {/* Desktop skeleton: table */}
          <div className="hidden lg:block overflow-x-auto rounded-xl bg-white border border-gray-200">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-100 border-b border-gray-200" />
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 border-b border-gray-100 flex items-center px-4 gap-4"
                >
                  <div className="h-4 bg-gray-200 rounded w-10" />
                  <div className="h-4 bg-gray-200 rounded w-14" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-5 bg-gray-200 rounded-full w-20" />
                  <div className="flex gap-1.5 ml-auto">
                    <div className="h-7 bg-gray-200 rounded w-14" />
                    <div className="h-7 bg-gray-200 rounded w-14" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile skeleton: cards */}
          <div className="lg:hidden grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-16 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-12 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        </>
      ) : !stats?.total ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HugeiconsIcon
            icon={Locker01Icon}
            size={64}
            className="text-gray-300 mb-4"
          />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            No Lockers Yet
          </h2>
          {!systemPrice ? (
            <>
              <p className="text-text-secondary mb-6 max-w-md">
                Set a default locker price first, then create lockers for your branch.
              </p>
              <button
                onClick={() => setShowPricingModal(true)}
                className="btn-primary px-6 py-2.5"
              >
                Set Default Price
              </button>
            </>
          ) : (
            <>
              <p className="text-text-secondary mb-6 max-w-md">
                Create your first locker to get started. Default price: ৳{systemPrice}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary px-6 py-2.5"
              >
                + Create Lockers
              </button>
            </>
          )}
        </div>
      ) : (
        <LockerGrid
          lockers={lockers}
          systemPrice={systemPrice}
          onLockerClick={handleLockerClick}
          onAssignMember={handleAssignMember}
          onCollectPayment={handleCollectPayment}
          onEditPrice={handleEditPrice}
        />
      )}

      {/* Modals */}
      <CreateLockersModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        branchId={activeBranchId || ""}
      />

      <LockerPricingModal
        isOpen={showPricingModal}
        onClose={() => {
          setShowPricingModal(false);
          setSelectedLocker(null);
        }}
        branchId={activeBranchId || ""}
        locker={selectedLocker}
        systemPrice={systemPrice}
      />

      <AssignMemberModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedLocker(null);
        }}
        branchId={activeBranchId || ""}
        locker={selectedLocker}
      />

      <LockerDetailDrawer
        isOpen={showDetailDrawer}
        onClose={() => {
          setShowDetailDrawer(false);
          setSelectedLocker(null);
        }}
        branchId={activeBranchId || ""}
        locker={selectedLocker}
        systemPrice={systemPrice}
        onCollectPayment={handleCollectPayment}
        onEditPrice={handleEditPrice}
        onAssignMember={handleAssignMember}
      />

      <LockerPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedLocker(null);
        }}
        branchId={activeBranchId || ""}
        locker={selectedLocker}
      />
    </div>
  );
}
