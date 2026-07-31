// components/accounts/AddDetails.tsx
"use client";

import { PackageTab } from "./tabs/PackageTab";
import { ExpenseTab } from "./tabs/ExpenseTab";
import { IncomeCategoryTab } from "./tabs/IncomeCategoryTab";

interface AddDetailsProps {
  activeTab: "package" | "expense" | "income";
  setActiveTab: (tab: "package" | "expense" | "income") => void;
  showPackageTab: boolean;
  showExpenseTab: boolean;
}

export const AddDetails = ({
  activeTab,
  setActiveTab,
  showPackageTab,
  showExpenseTab,
}: AddDetailsProps) => {
  return (
    <div className="p-5 border-8 border-gray-secondary rounded-2xl space-y-4 shadow-none bg-white">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Add Details & Categories</h2>
      </div>

      <div className="flex p-2 bg-gray-primary rounded-lg mb-4 gap-4">
        {showPackageTab && (
          <button
            onClick={() => setActiveTab("package")}
            className={`flex-1 px-6 py-3 text-center font-medium transition-colors cursor-pointer rounded-lg ${
              activeTab === "package"
                ? "bg-purple hover:bg-purple/90 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Package
          </button>
        )}
        {showExpenseTab && (
          <button
            onClick={() => setActiveTab("expense")}
            className={`flex-1 px-6 py-3 text-center font-medium transition-colors cursor-pointer rounded-lg ${
              activeTab === "expense"
                ? "bg-purple hover:bg-purple/90 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Expense
          </button>
        )}
        <button
          onClick={() => setActiveTab("income")}
          className={`flex-1 px-6 py-3 text-center font-medium transition-colors cursor-pointer rounded-lg ${
            activeTab === "income"
              ? "bg-purple hover:bg-purple/90 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Income Category
        </button>
      </div>

      <div>
        {activeTab === "package" ? (
          <PackageTab />
        ) : activeTab === "expense" ? (
          <ExpenseTab />
        ) : (
          <IncomeCategoryTab />
        )}
      </div>
    </div>
  );
};
