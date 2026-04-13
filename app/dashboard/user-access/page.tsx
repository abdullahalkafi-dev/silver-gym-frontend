// app/dashboard/user-access/page.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RoleStatsCards from "@/components/dashboard/UserAccess/RoleStatsCards";
import UserAccessTable from "@/components/dashboard/UserAccess/UserAccessTable";
import CreateCustomRoleModal from "@/components/modals/CreateCustomRoleModal";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import {
  useActivateBranchStaffMutation,
  useCreateBranchStaffMutation,
  useDeactivateBranchStaffMutation,
  useDeleteBranchStaffMutation,
  useGetBranchRolesQuery,
  useGetBranchStaffQuery,
  useInitializeBranchRolesMutation,
  useUpdateBranchRolePermissionsMutation,
  useUpdateBranchStaffMutation,
} from "@/redux/features/staff/staffApi";
import {
  RolePermissions,
  StaffFormValues,
  StaffMember,
  StaffUpdateValues,
} from "@/types/staff";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";

const UserAccessPage = () => {
  const router = useRouter();
  const { isOwner, activeBranchId } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const initializedBranchRef = useRef<Record<string, boolean>>({});

  const {
    data: staffMembers = [],
    isLoading: isStaffLoading,
    error: staffError,
  } = useGetBranchStaffQuery(activeBranchId || "", {
    skip: !activeBranchId,
  });
  const {
    data: roles = [],
    isLoading: isRolesLoading,
    error: rolesError,
  } = useGetBranchRolesQuery(activeBranchId || "", {
    skip: !activeBranchId,
  });

  const [initializeBranchRoles, { isLoading: isInitializingRoles }] =
    useInitializeBranchRolesMutation();
  const [createBranchStaff] = useCreateBranchStaffMutation();
  const [updateBranchStaff] = useUpdateBranchStaffMutation();
  const [deleteBranchStaff] = useDeleteBranchStaffMutation();
  const [activateBranchStaff] = useActivateBranchStaffMutation();
  const [deactivateBranchStaff] = useDeactivateBranchStaffMutation();
  const [updateBranchRolePermissions] = useUpdateBranchRolePermissionsMutation();

  useEffect(() => {
    if (!isOwner) {
      router.replace("/dashboard/branch-dashboard");
      return;
    }

    if (!activeBranchId) {
      router.replace("/dashboard");
    }
  }, [activeBranchId, isOwner, router]);

  useEffect(() => {
    if (!activeBranchId || !rolesError || initializedBranchRef.current[activeBranchId]) {
      return;
    }

    const status =
      typeof rolesError === "object" && rolesError && "status" in rolesError
        ? rolesError.status
        : undefined;

    if (status !== 404) {
      return;
    }

    initializedBranchRef.current[activeBranchId] = true;
    initializeBranchRoles(activeBranchId)
      .unwrap()
      .catch(() => {
      initializedBranchRef.current[activeBranchId] = false;
      });
  }, [activeBranchId, initializeBranchRoles, rolesError]);

  const loadErrorMessage = useMemo(() => {
    if (staffError) {
      return extractApiErrorMessage(staffError);
    }

    if (rolesError) {
      const status =
        typeof rolesError === "object" && rolesError && "status" in rolesError
          ? rolesError.status
          : undefined;

      if (status !== 404) {
        return extractApiErrorMessage(rolesError);
      }
    }

    return null;
  }, [rolesError, staffError]);

  const stats = useMemo(() => {
    const activeStaffCount = staffMembers.filter((staff) => staff.isActive).length;
    const inactiveStaffCount = staffMembers.length - activeStaffCount;

    return [
      {
        title: "Total Staff",
        count: staffMembers.length,
        description: "All branch staff accounts assigned to this branch.",
      },
      {
        title: "Active Staff",
        count: activeStaffCount,
        description: "Staff members currently allowed to sign in.",
      },
      {
        title: "Inactive Staff",
        count: inactiveStaffCount,
        description: "Staff members currently blocked from branch access.",
      },
    ];
  }, [staffMembers]);

  const isPageLoading = isStaffLoading || isRolesLoading || isInitializingRoles;

  if (!isOwner || !activeBranchId) return null;

  const handleAddUser = async (data: StaffFormValues) => {
    try {
      await createBranchStaff({
        branchId: activeBranchId,
        payload: data,
      }).unwrap();
      toast.success("Staff member created successfully!");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
      throw error;
    }
  };

  const handleEditUser = async (staffId: string, data: StaffUpdateValues) => {
    try {
      await updateBranchStaff({
        branchId: activeBranchId,
        staffId,
        payload: data,
      }).unwrap();
      toast.success("Staff member updated successfully!");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
      throw error;
    }
  };

  const handleDeleteUser = async (staffId: string) => {
    try {
      await deleteBranchStaff({ branchId: activeBranchId, staffId }).unwrap();
      toast.success("Staff member deleted successfully!");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
      throw error;
    }
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    try {
      if (staff.isActive) {
        await deactivateBranchStaff({
          branchId: activeBranchId,
          staffId: staff.id,
        }).unwrap();
        toast.success("Staff member deactivated successfully!");
      } else {
        await activateBranchStaff({
          branchId: activeBranchId,
          staffId: staff.id,
        }).unwrap();
        toast.success("Staff member activated successfully!");
      }
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
      throw error;
    }
  };

  const handleSaveRolePermissions = async (
    roleId: string,
    payload: RolePermissions,
  ) => {
    try {
      await updateBranchRolePermissions({
        branchId: activeBranchId,
        roleId,
        payload,
      }).unwrap();
      toast.success("Role permissions updated successfully!");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
      throw error;
    }
  };

  return (
    <div className="min-h-screen ">
      <div className="w-full mx-auto space-y-6">
        {loadErrorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {loadErrorMessage}
          </div>
        ) : null}

        <RoleStatsCards
          stats={stats}
          onManageRole={() => setIsModalOpen(true)}
          actionDisabled={!roles.length || isPageLoading}
        />
        <UserAccessTable
          staffMembers={staffMembers}
          roles={roles}
          isLoading={isPageLoading}
          onDeleteStaff={handleDeleteUser}
          onEditStaff={handleEditUser}
          onAddStaff={handleAddUser}
          onToggleStaffStatus={handleToggleStatus}
        />
      </div>
      <CreateCustomRoleModal
        key={`${activeBranchId}-${isModalOpen ? "open" : "closed"}-${roles
          .map((role) => `${role.id}:${role.updatedAt || ""}`)
          .join("-")}`}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roles={roles}
        onSave={handleSaveRolePermissions}
      />
    </div>
  );
};

export default UserAccessPage;