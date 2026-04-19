// app/dashboard/members/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import MemberStatsCards from "@/components/dashboard/Members/MemberStatsCards";
import MemberTable from "@/components/dashboard/Members/MemberTable";
import { memberStatsData } from "@/data/memberData";
import { BackendMember } from "@/types/member";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserAdd02Icon,
  Search01Icon,
  FilterHorizontalIcon,
  UserBlock01Icon,
  UserCheck01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import { CanAccess } from "@/components/shared/CanAccess";
import { useBranchFeeSetupGuard } from "@/components/dashboard/BranchFeeSetupGuard";
import {
  useGetBranchMembersQuery,
  useGetDashboardSummaryQuery,
} from "@/redux/features/member/memberApi";

export default function MembersPage() {
  const router = useRouter();
  const { isOwner, hasPermission, activeBranchId } = useUser();
  const { isFeeStatusKnown, hasMissingFees, requestFeeSetup } =
    useBranchFeeSetupGuard();

  // Block staff who lack member view permission before any API call.
  useEffect(() => {
    if (!isOwner && !hasPermission("member:view")) {
      router.replace("/dashboard/branch-dashboard");
    }
  }, [isOwner, hasPermission, router]);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<BackendMember | null>(null);
  const [showSMSModal, setShowSMSModal] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build query params for API
  const queryArgs = {
    branchId: activeBranchId || "",
    ...(debouncedSearch ? { searchTerm: debouncedSearch } : {}),
    ...(filterType === "all" ? { includeInactive: "true" } : {}),
    ...(filterType === "inactive"
      ? { includeInactive: "true" }
      : {}),
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

  const { data: dashboardSummary } = useGetDashboardSummaryQuery(
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
    : memberStatsData;

  const members = memberData?.data || [];
  const meta = memberData?.meta;
  const totalPages = meta?.totalPage || 1;

  const handleSendSMS = useCallback((member: BackendMember) => {
    setSelectedMember(member);
    setShowSMSModal(true);
  }, []);

  const handleCloseSMSModal = () => {
    setShowSMSModal(false);
    setSelectedMember(null);
  };

  const handleFilterSelect = (type: string) => {
    setFilterType(type);
    setShowFilterDropdown(false);
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

  if (!isOwner && !hasPermission("member:view")) return null;

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
          <CanAccess resource="member" action="create">
            <button
              type="button"
              onClick={handleCreateMember}
              className="px-4 py-2.5 bg-purple text-white text-sm rounded-md hover:bg-[#6A3FE0] transition-colors flex items-center justify-center gap-2 cursor-pointer md:text-base"
            >
              <HugeiconsIcon icon={UserAdd02Icon} size={20} />
              Add New Member
            </button>
          </CanAccess>
        </div>

        {/* Stats Cards */}
        <MemberStatsCards stats={stats} onImportClick={handleImportClick} />

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
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    filterType !== "all"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <HugeiconsIcon icon={FilterHorizontalIcon} size={18} />
                  Filter
                  {filterType !== "all" && (
                    <span className="ml-1 w-2 h-2 bg-primary rounded-full"></span>
                  )}
                </button>

                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="py-2">
                      <button
                        onClick={() => handleFilterSelect("all")}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                          filterType === "all"
                            ? "bg-primary/5 text-primary"
                            : "text-gray-700"
                        }`}
                      >
                        <HugeiconsIcon icon={UserGroupIcon} size={18} />
                        All Members
                      </button>
                      <button
                        onClick={() => handleFilterSelect("active")}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                          filterType === "active"
                            ? "bg-primary/5 text-primary"
                            : "text-gray-700"
                        }`}
                      >
                        <HugeiconsIcon icon={UserCheck01Icon} size={18} />
                        Active Members
                      </button>
                      <button
                        onClick={() => handleFilterSelect("inactive")}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                          filterType === "inactive"
                            ? "bg-primary/5 text-primary"
                            : "text-gray-700"
                        }`}
                      >
                        <HugeiconsIcon icon={UserBlock01Icon} size={18} />
                        Inactive Members
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Member Table */}
          <MemberTable
            members={members}
            onSendSMS={handleSendSMS}
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

        {/* SMS Modal */}
        {selectedMember && showSMSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-2">Send SMS</h3>
              <p className="text-sm text-gray-600 mb-4">
                Send SMS to {selectedMember.fullName}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={handleCloseSMSModal}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}