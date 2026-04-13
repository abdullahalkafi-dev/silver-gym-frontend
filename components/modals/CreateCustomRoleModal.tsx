import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PermissionCategoryCard from "./PermissionCategoryCard";
import {
  BranchRole,
  PermissionCategory,
  RolePermissions,
  buildPermissionCategories,
  categoriesToRolePermissions,
  countEnabledPermissions,
} from "@/types/staff";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";

interface CreateCustomRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: BranchRole[];
  initialRoleId?: string;
  onSave: (roleId: string, payload: RolePermissions) => Promise<void> | void;
}

const getInitialRole = (roles: BranchRole[], initialRoleId?: string) => {
  return roles.find((role) => role.id === initialRoleId) || roles[0] || null;
};

const CreateCustomRoleModal: React.FC<CreateCustomRoleModalProps> = ({
  isOpen,
  onClose,
  roles,
  initialRoleId,
  onSave,
}) => {
  const initialRole = getInitialRole(roles, initialRoleId);
  const [selectedRoleId, setSelectedRoleId] = useState(initialRole?.id || "");
  const [categories, setCategories] = useState<PermissionCategory[]>(() =>
    buildPermissionCategories(initialRole?.permissions),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedRole =
    roles.find((role) => role.id === selectedRoleId) || initialRole;

  const handleCategoryUpdate = (
    index: number,
    updatedCategory: PermissionCategory
  ) => {
    const newCategories = [...categories];
    newCategories[index] = updatedCategory;
    setCategories(newCategories);
  };

  const handleRoleChange = (roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    setSelectedRoleId(roleId);
    setCategories(buildPermissionCategories(role?.permissions));
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!selectedRoleId) {
      setErrorMessage("No branch role is available to update.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSave(selectedRoleId, categoriesToRolePermissions(categories));
      onClose();
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full md:min-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Role Permissions</DialogTitle>
          <p className="text-sm text-gray-500">
            Update permissions on an existing branch role.
          </p>
        </DialogHeader>

        {!roles.length ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No branch roles are available yet.
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="role-select">
                  Select Branch Role <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedRoleId} onValueChange={handleRoleChange}>
                  <SelectTrigger id="role-select" className="focus:ring-purple focus:border-purple">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-border bg-gray-primary px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Enabled Permissions
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {countEnabledPermissions(categoriesToRolePermissions(categories))}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedRole?.roleName || "Selected role"}
                </p>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category, index) => (
                <PermissionCategoryCard
                  key={category.title}
                  category={category}
                  onUpdate={(updatedCategory) =>
                    handleCategoryUpdate(index, updatedCategory)
                  }
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!roles.length || !selectedRoleId || isSaving}
            className="bg-purple hover:bg-[#6527e0] text-white"
          >
            {isSaving ? "Saving..." : "Save Permissions"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCustomRoleModal;
