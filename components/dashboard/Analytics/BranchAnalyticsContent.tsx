"use client";

import { useState } from "react";
import MemberAnalytics from "@/components/dashboard/Analytics/MemberAnalytics";
import FinancialAnalytics from "@/components/dashboard/Analytics/FinancialAnalytics";
import CostAnalytics from "@/components/dashboard/Analytics/CostAnalytics";
import PackagesAnalytics from "@/components/dashboard/Analytics/PackagesAnalytics";
import CompareAnalyticsModal from "@/components/dashboard/Analytics/CompareAnalyticsModal";
import FinancialsCompare from "@/components/dashboard/Analytics/FinancialsCompare";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnalyticsDownIcon } from "@hugeicons/core-free-icons";

export default function BranchAnalyticsContent() {
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showCompareView, setShowCompareView] = useState(false);
  const [compareConfig, setCompareConfig] = useState({
    options: [] as string[],
    startYear: 2020,
    endYear: 2024,
  });

  const handleStartCompare = (
    options: string[],
    startYear: number,
    endYear: number
  ) => {
    setCompareConfig({ options, startYear, endYear });
    setShowCompareView(true);
  };

  const handleNewCompare = () => {
    setShowCompareModal(true);
  };

  return (
    <div className="min-h-screen">
      <div className="w-full">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-1">Analytics</h1>
            <p className="text-sm text-gray-500">
              Analyze member trends, financial performance, and cost breakdowns.
            </p>
          </div>
          {!showCompareView && (
            <button
              onClick={() => setShowCompareModal(true)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-purple px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#6A3FE0] md:text-base"
            >
              <HugeiconsIcon icon={AnalyticsDownIcon} />
              Compare Analytics
            </button>
          )}
        </div>

        {showCompareView ? (
          <FinancialsCompare
            onNewCompare={handleNewCompare}
            selectedOptions={compareConfig.options}
            startYear={compareConfig.startYear}
            endYear={compareConfig.endYear}
          />
        ) : (
          <div className="mb-20 space-y-6">
            <MemberAnalytics />
            <FinancialAnalytics />
            <CostAnalytics />
            <PackagesAnalytics />
          </div>
        )}

        <CompareAnalyticsModal
          isOpen={showCompareModal}
          onClose={() => setShowCompareModal(false)}
          onStartCompare={handleStartCompare}
        />
      </div>
    </div>
  );
}