"use client";

import { useUser } from "@/hooks/useUser";

const ALL_PERMISSIONS = [
  { key: "member:manage", label: "Manage Members", description: "Edit and delete member profiles" },
  { key: "package:manage", label: "Manage Packages", description: "Create, edit, and delete gym packages" },
  { key: "payment:manage", label: "Manage Payments", description: "Edit, delete, and refund payment records" },
  { key: "billing:manage", label: "Manage Billing", description: "Edit and delete billing records" },
  { key: "expense:manage", label: "Manage Expenses", description: "Edit and delete expenses and categories" },
  { key: "locker:manage", label: "Manage Lockers", description: "Create, edit, delete lockers and set pricing" },
];

export default function MyPermissions() {
  const { permissions } = useUser();

  const hasPermission = (perm: string): boolean => {
    return permissions.includes(perm);
  };

  const enabledCount = ALL_PERMISSIONS.filter((p) => hasPermission(p.key)).length;

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Your Permissions
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {enabledCount} of {ALL_PERMISSIONS.length} permissions enabled
            </p>
          </div>
        </div>
      </div>

      {/* Note about default access */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
        <p className="text-sm text-green-800">
          <span className="font-semibold">Default Access:</span> All staff can view and add records for all modules. Only
          edit/delete operations require special permissions listed below.
        </p>
      </div>

      {/* Permissions List */}
      <div className="space-y-3">
        {ALL_PERMISSIONS.map((perm) => {
          const hasAccess = hasPermission(perm.key);

          return (
            <div
              key={perm.key}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                hasAccess
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {perm.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {perm.description}
                </p>
              </div>
              <div
                className={`w-3 h-3 rounded-full ml-4 ${
                  hasAccess ? "bg-green-500" : "bg-gray-300"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
