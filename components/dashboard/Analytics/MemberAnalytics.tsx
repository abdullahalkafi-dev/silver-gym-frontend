// components/dashboard/Analytics/MemberAnalytics.tsx
"use client";

import { useMemo } from "react";
import MemberStatsChart from "@/components/dashboard/Analytics/MemberStatsChart";
import { useUser } from "@/hooks/useUser";
import { useGetAnalyticsMemberSummaryQuery } from "@/redux/features/analytics/analyticsApi";

const emptyMemberAnalyticsData = {
  totalMembers: 0,
  totalMembersUnit: "/Person",
  totalMembersDescription: "Total overall number of registered members in your gym",
  newAdmissions: 0,
  newAdmissionsUnit: "/Person",
  newAdmissionsDescription: "Members who joined during the selected window",
  activeMembers: 0,
  activeMembersUnit: "/Person",
  activeMembersDescription: "Members with valid packages and ongoing gym access",
  admissionChart: [],
  admissionChartPeriod: "Last six month",
  currentAdmissions: 0,
  admissionGrowth: "+0.0%",
};

const MemberAnalytics = () => {
  const { activeBranchId } = useUser();

  const { data: response, isLoading } = useGetAnalyticsMemberSummaryQuery(
    {
      branchId: activeBranchId || "",
    },
    {
      skip: !activeBranchId,
    }
  );

  const data = useMemo(() => response?.data ?? emptyMemberAnalyticsData, [response]);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-6">
        <p className="text-sm text-gray-medium">Loading member analytics...</p>
      </div>
    );
  }

  return (
    <div className="md:space-y-6">
      {/* Single Card with Stats and Chart */}
      <MemberStatsChart data={data} title="Member Analytics" />
    </div>
  );
};

export default MemberAnalytics;