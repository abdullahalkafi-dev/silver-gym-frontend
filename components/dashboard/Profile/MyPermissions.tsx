"use client";

import { useUser } from "@/hooks/useUser";
import {
  ROLE_PERMISSION_META,
  type RolePermissionKey,
} from "@/types/staff";

const ALL_PERMISSIONS: RolePermissionKey[] = [
  "canManageMembers",
  "canManagePackages",
  "canManagePayments",
  "canManageBilling",
  "canManageExpenses",
  "canManageLockers",
];

export default function MyPermissions() {
  const { permissions } = useUser();

  const hasPermission = (perm: string): boolean => {
    return permissions.includes(perm);
  };

  const enabledCount = ALL_PERMISSIONS.filter((p) => hasPermission(p)).length;

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
        {ALL_PERMISSIONS.map((permKey) => {
          const meta = ROLE_PERMISSION_META[permKey];
          const hasAccess = hasPermission(permKey);

          return (
            <div
              key={permKey}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                hasAccess
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {meta.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {meta.description}
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
