import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PermissionToggle from "./PermissionToggle";
import { PermissionCategory } from "@/types/staff";

interface PermissionCategoryCardProps {
  category: PermissionCategory;
  onUpdate: (category: PermissionCategory) => void;
}

const PermissionCategoryCard: React.FC<PermissionCategoryCardProps> = ({
  category,
  onUpdate,
}) => {
  const toggleMaster = () => {
    const newMasterState = !category.masterEnabled;
    onUpdate({
      ...category,
      masterEnabled: newMasterState,
      permissions: category.permissions.map((p) => ({
        ...p,
        enabled: newMasterState,
      })),
    });
  };

  const togglePermission = (permissionId: string) => {
    const updatedPermissions = category.permissions.map((p) =>
      p.id === permissionId ? { ...p, enabled: !p.enabled } : p
    );

    const allEnabled = updatedPermissions.every((p) => p.enabled);

    onUpdate({
      ...category,
      permissions: updatedPermissions,
      masterEnabled: allEnabled,
    });
  };

  return (
    <Card className="bg-gray-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {category.title}
          </CardTitle>
          <PermissionToggle
            checked={category.masterEnabled}
            onToggle={toggleMaster}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {category.permissions.map((permission) => (
          <div
            key={permission.id}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex-1">
              <span className="text-sm text-gray-600 block">{permission.label}</span>
              <span className="text-xs text-gray-400 block">{permission.description}</span>
            </div>
            <PermissionToggle
              checked={permission.enabled}
              onToggle={() => togglePermission(permission.id)}
              size="sm"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PermissionCategoryCard;
