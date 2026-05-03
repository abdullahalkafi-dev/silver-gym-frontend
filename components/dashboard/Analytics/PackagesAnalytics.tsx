// components/dashboard/Analytics/PackagesAnalytics.tsx
"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useGetAnalyticsPackagesSummaryQuery } from "@/redux/features/analytics/analyticsApi";

const monthShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHLY_COLOR = "#9AC1AE";

const FALLBACK_COLORS = [
  "#E16349", "#4A9FF5", "#F9A826", "#7C3AED",
  "#E6957F", "#B7B976", "#64667C", "#F1EBCC",
  "#0BA6DF", "#67C090",
];

interface ActivePackage {
  title: string;
  color: string;
}

const PackagesAnalytics = () => {
  const { activeBranchId } = useUser();
  const [selectedTab, setSelectedTab] = useState<string>("All");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isYearOpen, setIsYearOpen] = useState(false);

  const { data: response, isLoading } = useGetAnalyticsPackagesSummaryQuery(
    {
      branchId: activeBranchId || "",
      year: selectedYear,
    },
    {
      skip: !activeBranchId,
    }
  );

  const data = response?.data ?? {
    year: String(selectedYear),
    chartData: [],
    stats: [
      { label: "Total Members", count: 0, unit: "Person", percentage: "0.0%" },
    ],
    packagesList: [],
    packageRows: [],
    memberPackageSummary: [],
  };

  const years = response?.availableYears?.length
    ? response.availableYears
    : [selectedYear];

  const activePackages = useMemo((): ActivePackage[] => {
    const result: ActivePackage[] = [];
    const seen = new Set<string>();
    let fallbackIdx = 0;

    // Primary source: packagesList (all currently active packages with canonical colors)
    data.packagesList?.forEach((pkg) => {
      if (!seen.has(pkg.title)) {
        seen.add(pkg.title);
        result.push({ title: pkg.title, color: pkg.color || FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length] });
      }
    });

    // Secondary: packages that appear in join data but are no longer in packagesList (archived)
    data.packageRows?.forEach((row) => {
      if (row.packageTitle && !seen.has(row.packageTitle)) {
        seen.add(row.packageTitle);
        result.push({ title: row.packageTitle, color: FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length] });
      }
    });

    return result;
  }, [data.packageRows, data.packagesList]);

  const chartData = useMemo(() => {
    if (selectedTab === "Monthly") {
      return data.chartData.map((item) => ({
        month: item.month,
        Monthly: item.Monthly,
      }));
    }

    if (selectedTab === "All") {
      const packageDataMap = new Map<string, number[]>();
      activePackages.forEach((pkg) => {
        packageDataMap.set(pkg.title, new Array(12).fill(0));
      });

      data.packageRows?.forEach((row) => {
        if (row.packageTitle && packageDataMap.has(row.packageTitle)) {
          const arr = packageDataMap.get(row.packageTitle)!;
          const idx = row.month - 1;
          if (idx >= 0 && idx < 12) {
            arr[idx] += row.count;
          }
        }
      });

      return data.chartData.map((item, idx) => {
        const point: Record<string, string | number> = { month: item.month, Monthly: item.Monthly };
        activePackages.forEach((pkg) => {
          point[pkg.title] = packageDataMap.get(pkg.title)?.[idx] ?? 0;
        });
        return point;
      });
    }

    const selectedPkg = activePackages.find((p) => p.title === selectedTab);
    if (!selectedPkg) return [];

    const pkgData = new Array(12).fill(0);
    data.packageRows?.forEach((row) => {
      if (row.packageTitle === selectedTab) {
        const idx = row.month - 1;
        if (idx >= 0 && idx < 12) {
          pkgData[idx] += row.count;
        }
      }
    });

    return monthShort.map((month, idx) => ({
      month,
      [selectedTab]: pkgData[idx],
    }));
  }, [selectedTab, data.chartData, data.packageRows, activePackages]);

  const dynamicStats = useMemo(() => {
    // Use actual active member counts from memberPackageSummary (not payment records).
    const summary = data.memberPackageSummary ?? [];
    const totalMembers = data.stats[0]?.count ?? 0;

    if (summary.length === 0) return [];

    const stats: Array<{ label: string; count: number; unit: string; percentage: string }> = [];

    // Members with no currentPackageId (packageTitle === "") → "Monthly"
    const monthlyCount = summary
      .filter((r) => !r.packageTitle)
      .reduce((sum, r) => sum + r.count, 0);

    if (monthlyCount > 0) {
      const pct = totalMembers > 0 ? ((monthlyCount / totalMembers) * 100).toFixed(1) : "0.0";
      stats.push({ label: "Monthly", count: monthlyCount, unit: "/per", percentage: `${pct}%` });
    }

    // Build a map: packageTitle → total count from memberPackageSummary
    const titleCountMap = new Map<string, number>();
    summary
      .filter((r) => !!r.packageTitle)
      .forEach((r) => {
        titleCountMap.set(r.packageTitle, (titleCountMap.get(r.packageTitle) ?? 0) + r.count);
      });

    // Show packages in the order they appear in packagesList (active packages)
    const shownTitles = new Set<string>();
    data.packagesList?.forEach((pkg) => {
      const count = titleCountMap.get(pkg.title) ?? 0;
      if (count > 0) {
        const pct = totalMembers > 0 ? ((count / totalMembers) * 100).toFixed(1) : "0.0";
        stats.push({ label: pkg.title, count, unit: "/per", percentage: `${pct}%` });
        shownTitles.add(pkg.title);
      }
    });

    // Fallback: show any titled packages not in packagesList (e.g. archived packages still assigned)
    titleCountMap.forEach((count, title) => {
      if (!shownTitles.has(title) && count > 0) {
        const pct = totalMembers > 0 ? ((count / totalMembers) * 100).toFixed(1) : "0.0";
        stats.push({ label: title, count, unit: "/per", percentage: `${pct}%` });
      }
    });

    return stats;
  }, [data.stats, data.memberPackageSummary, data.packagesList]);

  const legendItems = useMemo(() => {
    const items: Array<{ label: string; color: string }> = [];

    if (selectedTab === "Monthly") {
      if (chartData.some((d) => (d as Record<string, unknown>)["Monthly"] as number > 0)) {
        items.push({ label: "Monthly", color: MONTHLY_COLOR });
      }
    }

    if (selectedTab === "All") {
      if (chartData.some((d) => (d as Record<string, unknown>)["Monthly"] as number > 0)) {
        items.push({ label: "Monthly", color: MONTHLY_COLOR });
      }
      activePackages.forEach((pkg) => {
        if (chartData.some((d) => (d as Record<string, unknown>)[pkg.title] as number > 0)) {
          items.push({ label: pkg.title, color: pkg.color });
        }
      });
    } else if (selectedTab !== "Monthly") {
      const pkg = activePackages.find((p) => p.title === selectedTab);
      if (pkg) {
        items.push({ label: pkg.title, color: pkg.color });
      }
    }

    return items;
  }, [selectedTab, chartData, activePackages]);

  const tabOptions = useMemo(() => {
    const tabs: string[] = ["All", "Monthly"];
    activePackages.forEach((pkg) => {
      if (!tabs.includes(pkg.title)) {
        tabs.push(pkg.title);
      }
    });
    return tabs;
  }, [activePackages]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6">
        <p className="text-sm text-gray-medium">Loading package analytics...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Packages Analytics
        </h2>
        <div className="relative">
          <button
            onClick={() => setIsYearOpen(!isYearOpen)}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md flex items-center gap-2 hover:bg-gray-200 transition-colors min-w-[100px] justify-between"
          >
            {selectedYear}
            <ChevronDown className="w-4 h-4" />
          </button>
          {isYearOpen && (
            <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[100px] z-10">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year);
                    setIsYearOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                    selectedYear === year
                      ? "text-gray-800 font-semibold"
                      : "text-gray-medium"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Package Tabs and Legend */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full lg:w-auto">
          {tabOptions.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 text-sm rounded-md whitespace-nowrap transition-colors ${
                selectedTab === tab
                  ? "bg-gray-medium text-white"
                  : "text-gray-medium hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="hidden lg:block"></div>

        <div className="flex items-center gap-4 flex-wrap">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-xs"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm text-gray-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart and Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 md:border-r border-border-2 pr-0 md:pr-4">
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                  tickFormatter={(value) => `${value / 1000}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                  }}
                />
                {selectedTab === "Monthly" &&
                  chartData.some((d) => (d as Record<string, unknown>)["Monthly"] as number > 0) && (
                    <Bar
                      dataKey="Monthly"
                      fill={MONTHLY_COLOR}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                    />
                  )}
                {selectedTab === "All" && (
                  <>
                    <Bar
                      dataKey="Monthly"
                      fill={MONTHLY_COLOR}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                    />
                    {activePackages.map((pkg) => (
                      <Bar
                        key={pkg.title}
                        dataKey={pkg.title}
                        fill={pkg.color}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={20}
                      />
                    ))}
                  </>
                )}
                {selectedTab !== "All" && selectedTab !== "Monthly" && (() => {
                  const pkg = activePackages.find((p) => p.title === selectedTab);
                  return pkg ? (
                    <Bar
                      dataKey={selectedTab}
                      fill={pkg.color}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                    />
                  ) : null;
                })()}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-text-primary mb-1">Total Members</p>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xl md:text-2xl font-bold text-text-primary">
                {data.stats[0].count}
                <span className="text-sm font-normal text-gray-medium ml-1">
                  {data.stats[0].unit}s
                </span>
              </p>
            </div>
          </div>
          {dynamicStats.map((stat, index) => (
            <div
              key={index}
              className="border-b border-border-2 last:border-b-0 px-4 py-3 flex items-center justify-between gap-2"
            >
              <p className="text-sm text-gray-medium mb-1">{stat.label}</p>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-xl md:text-2xl font-bold text-text-primary">
                  {stat.count}
                  <span className="text-sm font-normal text-gray-medium ml-1">
                    {stat.unit}
                  </span>
                </p>
                {stat.percentage && (
                  <p className="text-sm text-gray-medium bg-gray-100 px-2 py-1 rounded">
                    {stat.percentage}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PackagesAnalytics;
