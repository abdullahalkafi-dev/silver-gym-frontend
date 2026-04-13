import React from "react";

interface RoleTab {
  id: string;
  label: string;
  count: number;
}

interface RoleTabButtonsProps {
  activeTab: string;
  tabs: RoleTab[];
  onTabChange: (tab: string) => void;
}

const RoleTabButtons: React.FC<RoleTabButtonsProps> = ({
  activeTab,
  tabs,
  onTabChange,
}) => {
  return (
    <div className="flex gap-3 overflow-x-auto p-2 bg-gray-primary rounded-lg mb-3">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center justify-center gap-2 px-5 py-3 text-center font-medium transition-colors cursor-pointer rounded-lg whitespace-nowrap ${
              isActive
                ? "bg-purple hover:bg-purple/90 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs ${
                isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default RoleTabButtons;
