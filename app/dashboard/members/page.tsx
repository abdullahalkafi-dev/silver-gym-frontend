// app/dashboard/members/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import MemberStatsCards from "@/components/dashboard/Members/MemberStatsCards";
import MemberTable from "@/components/dashboard/Members/MemberTable";
import {
  MemberListPaymentFilter,
  MemberListStatusFilter,
  MemberListBillingFilter,
} from "@/types/member";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserAdd02Icon,
  Search01Icon,
  FilterHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import { useBranchFeeSetupGuard } from "@/components/dashboard/BranchFeeSetupGuard";
import {
  useGetBranchMembersQuery,
  useGetDashboardSummaryQuery,
} from "@/redux/features/member/memberApi";

const STATUS_FILTER_OPTIONS: Array<{
  value: MemberListStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All members" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const PAYMENT_FILTER_OPTIONS: Array<{
  value: MemberListPaymentFilter;
  label: string;
}> = [
  { value: "all", label: "All payments" },
  { value: "due", label: "Due" },
  { value: "complete", label: "Complete" },
  { value: "monthly_due", label: "Monthly Due" },
  { value: "admission_due", label: "Admission Due" },
];

const BILLING_FILTER_OPTIONS: Array<{
  value: MemberListBillingFilter;
  label: string;
}> = [
  { value: "all", label: "All billing" },
  { value: "custom", label: "Custom" },
  { value: "system", label: "System" },
];

export default function MembersPage() {
  const router = useRouter();
  const { isOwner, activeBranchId } = useUser();
  const { isFeeStatusKnown, hasMissingFees, requestFeeSetup } =
    useBranchFeeSetupGuard();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<MemberListStatusFilter>("all");
  const [paymentFilter, setPaymentFilter] =
    useState<MemberListPaymentFilter>("all");
  const [billingFilter, setBillingFilter] =
    useState<MemberListBillingFilter>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!showFilterDropdown) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target as Node)
      ) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilterDropdown]);

  // Build query params for API
  const queryArgs = {
    branchId: activeBranchId || "",
    ...(debouncedSearch ? { searchTerm: debouncedSearch } : {}),
    ...(statusFilter === "all" || statusFilter === "inactive"
      ? { includeInactive: "true" as const }
      : {}),
    ...(statusFilter === "inactive" ? { isActive: "false" as const } : {}),
    ...(paymentFilter !== "all" ? { paymentStatus: paymentFilter } : {}),
    ...(billingFilter !== "all" ? { billingPlan: billingFilter } : {}),
    page: currentPage,
    limit: 20,
  };

  const {
    data: memberData,
    isLoading: membersLoading,
    isFetching: membersFetching,
  } = useGetBranchMembersQuery(queryArgs, {
    skip: !activeBranchId,
  });

  const { data: dashboardSummary, isLoading: dashboardLoading } =
    useGetDashboardSummaryQuery(
      { branchId: activeBranchId || "" },
      { skip: !activeBranchId }
    );

  // Map dashboard summary to stats card shape
  const stats = dashboardSummary
    ? {
        totalMembers: dashboardSummary.members.members.totalMembers,
        totalMembersUnit: "/Person",
        totalMembersDescription: "Total registered members",
        newAdmission: dashboardSummary.members.members.newMembersInWindow,
        newAdmissionUnit: "/Person",
        newAdmissionDescription: "New members this week",
        newAdmissionBadge: `${dashboardSummary.members.windowDays}d`,
        activeMembers: dashboardSummary.members.members.activeMembers,
        activeMembersUnit: "/Person",
        activeMembersDescription: "Currently active members",
      }
    : null;

  const members = memberData?.data || [];
  const meta = memberData?.meta;
  const totalPages = meta?.totalPage || 1;
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (paymentFilter !== "all" ? 1 : 0) +
    (billingFilter !== "all" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const handleSendSMS = (memberId: string) => {
    router.push(`/dashboard/send-sms?memberId=${memberId}`);
  };

  const handleStatusFilterSelect = (nextFilter: MemberListStatusFilter) => {
    setStatusFilter(nextFilter);
    setCurrentPage(1);
  };

  const handlePaymentFilterSelect = (nextFilter: MemberListPaymentFilter) => {
    setPaymentFilter(nextFilter);
    setCurrentPage(1);
  };

  const handleBillingFilterSelect = (nextFilter: MemberListBillingFilter) => {
    setBillingFilter(nextFilter);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setPaymentFilter("all");
    setBillingFilter("all");
    setCurrentPage(1);
  };

  const handleImportClick = () => {
    router.push("/dashboard/members/import-old-members");
  };

  const handleCreateMember = () => {
    if (isFeeStatusKnown && hasMissingFees) {
      requestFeeSetup("member-create");
      return;
    }
    router.push("/dashboard/members/add-member");
  };

  return (
    <div className="min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-1">
              Member Details
            </h1>
            <p className="text-sm text-gray-500">
              Effortlessly manage and oversee your organization&apos;s member
              details.
            </p>
          </div>
          <button
              type="button"
              onClick={handleCreateMember}
              className="px-4 py-2.5 bg-purple text-white text-sm rounded-md hover:bg-[#6A3FE0] transition-colors flex items-center justify-center gap-2 cursor-pointer md:text-base"
            >
              <HugeiconsIcon icon={UserAdd02Icon} size={20} />
              Add New Member
            </button>
        </div>

        {/* Stats Cards */}
        {dashboardLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg p-4 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-100 rounded mb-3" />
                <div className="h-8 bg-gray-200 rounded w-24" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <MemberStatsCards stats={stats} onImportClick={handleImportClick} />
        ) : null}

        {/* Member List Section */}
        <div className="bg-white rounded-2xl border border-border p-6">
          {/* Member List Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <h2 className="text-xl font-semibold text-gray-medium">
              Member List
              {meta?.total != null && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({meta.total})
                </span>
              )}
            </h2>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial">
                <input
                  type="text"
                  placeholder="Search ID/Name/Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>

              {/* Filter */}
              <div ref={filterPanelRef} className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    hasActiveFilters
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <HugeiconsIcon icon={FilterHorizontalIcon} size={18} />
                  Filter
                  {hasActiveFilters && (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-[320px] bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-4">
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Member Status
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_FILTER_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleStatusFilterSelect(option.value)}
                              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                statusFilter === option.value
                                  ? "bg-primary text-white"
                                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Payment Status
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {PAYMENT_FILTER_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handlePaymentFilterSelect(option.value)}
                              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                paymentFilter === option.value
                                  ? "bg-primary text-white"
                                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Billing Plan
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {BILLING_FILTER_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleBillingFilterSelect(option.value)}
                              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                billingFilter === option.value
                                  ? "bg-primary text-white"
                                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                        <button
                          onClick={handleResetFilters}
                          disabled={!hasActiveFilters}
                          className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => setShowFilterDropdown(false)}
                          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Member Table */}
          <MemberTable
            members={members}
            onSendSMS={(member) => handleSendSMS(member._id)}
            isLoading={membersLoading || membersFetching}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}