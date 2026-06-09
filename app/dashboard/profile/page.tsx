// app\dashboard\profile\page.tsx
"use client";

import { useState } from "react";
import MyProfile from "@/components/dashboard/Profile/MyProfile";
import BusinessProfile from "@/components/dashboard/Profile/BusinessProfile";
import MyPermissions from "@/components/dashboard/Profile/MyPermissions";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

type TabType = "my-profile" | "business-profile" | "my-permissions";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>("my-profile");
  const { isOwner } = useUser();

  const tabs = [
    { id: "my-profile", label: "My Profile" },
    ...(isOwner ? [{ id: "business-profile", label: "Business Profile" }] : []),
    { id: "my-permissions", label: "My Permissions" },
  ];

  return (
    <div className="min-h-screen pb-10">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0 ">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 sticky top-24 h-full">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              General Settings
            </h2>
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    activeTab === tab.id
                      ? "bg-gray-primary text-text-primary"
                      : "text-text-primary hover:bg-gray-secondary hover:text-text-primary focus:bg-gray-secondary focus:text-text-primary"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full rounded-2xl bg-white">
          <h1 className="text-2xl font-semibold text-text-primary mb-5 px-6 py-3 border-b border-border-2">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h1>
          
          <div className="px-6">
          {activeTab === "my-profile" && <MyProfile />}

          {activeTab === "business-profile" && <BusinessProfile />}

          {activeTab === "my-permissions" && <MyPermissions />}
          </div>
        </div>
      </div>
    </div>
  );
}
