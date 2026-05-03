// components/dashboard/Overview/OverviewPage.tsx
"use client";

import StatsCard from "../Common/StatsCard";
import PieChartCard from "../Common/PieChartCard";
import BarChartCard from "../Common/BarChartCard";
import LineChartCard from "../Common/LineChartCard";
import TransactionTable from "../Common/TransactionTable";
import { useUser } from "@/hooks/useUser";
import { useGetAnalyticsOverviewQuery } from "@/redux/features/analytics/analyticsApi";

export default function OverviewPage() {
  const { activeBranchId } = useUser();

  const { data, isLoading } = useGetAnalyticsOverviewQuery(
    {
      branchId: activeBranchId || "",
      transactionLimit: 20,
    },
    {
      skip: !activeBranchId,
    }
  );

  // Generate current month and year dynamically using BD timezone
  const bdMonth = new Date().toLocaleString("en-US", { month: "long", timeZone: "Asia/Dhaka" });
  const bdYear = new Date().toLocaleString("en-US", { year: "numeric", timeZone: "Asia/Dhaka" });
  const currentMonthYear = `${data?.selectedMonth || bdMonth} ${data?.selectedYear || bdYear}`;

  if (isLoading) {
    return (
      <main className="w-full space-y-6">
        <div className="rounded-2xl bg-white p-6">
          <p className="text-sm text-gray-medium">Loading overview analytics...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full space-y-6">
      {/* Stats Card */}

      {/* Grid Layout for Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Progress Analytics */}
        <div className="col-span-1 md:col-span-2 space-y-5">
          <StatsCard
            title="Monthly Transaction"
            date={currentMonthYear}
            stats={data?.stats || []}
          />
          <BarChartCard
            title="Progress Analytics"
            yearlyData={data?.progress.yearlyData || []}
            monthlyData={data?.progress.monthlyData || []}
            totalValue={data?.progress.totalValue || "$0.00"}
            subtitle={data?.progress.subtitle || "No data available for the selected period"}
            showToggle={true}
          />
        </div>

        {/* Pie Chart and Line Chart Container */}
        <div className="space-y-4 border-border  rounded-[20px] p-3 bg-white">
          {/* Pie Chart - This Month */}
          <PieChartCard
            title="This Month"
            data={data?.pie.data || []}
            centerValue={data?.pie.centerValue || "0K"}
            description={data?.pie.description || "No expenses recorded for this period"}
          />

          {/* Line Chart - Analytics */}
          <LineChartCard
            title="Analytics"
            data={data?.line.data || []}
            percentage={data?.line.percentage || "0.0%"}
          />
        </div>
      </div>
      <TransactionTable title="Today Transaction" data={data?.transactions || []} />
    </main>
  );
}
