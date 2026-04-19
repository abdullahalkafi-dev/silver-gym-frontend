import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RoleTabButtons from "./RoleTabButtons";
import {
  BranchRole,
  StaffFormValues,
  StaffMember,
  StaffUpdateValues,
  formatDateLabel,
} from "@/types/staff";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Navigation03Icon,
  Delete02Icon,
  Edit02Icon,
  UserBlock01Icon,
  UserCheck01Icon,
} from "@hugeicons/core-free-icons";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import UserFormModal from "@/components/modals/UserFormModal";

interface UserAccessTableProps {
  staffMembers: StaffMember[];
  roles: BranchRole[];
  isLoading?: boolean;
  onDeleteStaff: (staffId: string) => Promise<void> | void;
  onEditStaff: (
    staffId: string,
    data: StaffUpdateValues,
  ) => Promise<void> | void;
  onAddStaff: (data: StaffFormValues) => Promise<void> | void;
  onToggleStaffStatus: (staff: StaffMember) => Promise<void> | void;
}

const UserAccessTable: React.FC<UserAccessTableProps> = ({
  staffMembers,
  roles,
  isLoading = false,
  onDeleteStaff,
  onEditStaff,
  onAddStaff,
  onToggleStaffStatus,
}) => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUserFormModalOpen, setIsUserFormModalOpen] = useState(false);
  const [userFormMode, setUserFormMode] = useState<"add" | "edit">("add");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const roleTabs = useMemo(() => {
    const counts = staffMembers.reduce<Record<string, number>>((acc, staff) => {
      acc[staff.roleId] = (acc[staff.roleId] || 0) + 1;
      return acc;
    }, {});

    const tabs = roles.map((role) => ({
      id: role.id,
      label: role.roleName,
      count: counts[role.id] || 0,
    }));

    const existingIds = new Set(tabs.map((tab) => tab.id));
    staffMembers.forEach((staff) => {
      if (staff.roleId && !existingIds.has(staff.roleId)) {
        existingIds.add(staff.roleId);
        tabs.push({
          id: staff.roleId,
          label: staff.roleTitle,
          count: counts[staff.roleId] || 0,
        });
      }
    });

    return [
      { id: "all", label: "All Staff", count: staffMembers.length },
      ...tabs,
    ];
  }, [roles, staffMembers]);

  const filteredUsers = useMemo(() => {
    if (activeTab === "all") {
      return staffMembers;
    }

    return staffMembers.filter((staff) => staff.roleId === activeTab);
  }, [activeTab, staffMembers]);

  const handleAssignRole = () => {
    setUserFormMode("add");
    setSelectedUserId(null);
    setIsUserFormModalOpen(true);
  };

  const handleDeleteClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedUserId) {
      setIsDeleting(true);
      try {
        await onDeleteStaff(selectedUserId);
        setIsDeleteModalOpen(false);
        setSelectedUserId(null);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleEditClick = (userId: string) => {
    const user = staffMembers.find((u) => u.id === userId);
    if (user) {
      setUserFormMode("edit");
      setIsUserFormModalOpen(true);
      setSelectedUserId(userId);
    }
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    setStatusUpdatingId(staff.id);

    try {
      await onToggleStaffStatus(staff);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleUserFormSubmit = async (
    data: StaffFormValues | StaffUpdateValues,
  ) => {
    if (userFormMode === "add") {
      await onAddStaff(data as StaffFormValues);
    } else if (selectedUserId) {
      await onEditStaff(selectedUserId, data as StaffUpdateValues);
    }
    setSelectedUserId(null);
  };

  const selectedUser = staffMembers.find((user) => user.id === selectedUserId);

  return (
    <div className="bg-white rounded-2xl p-5 border-8 border-gray-secondary">
      <div className="pb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Staff Access List
        </h2>
        <Button
          onClick={handleAssignRole}
          disabled={!roles.length || isLoading}
          className="bg-purple hover:bg-[#6527e0] text-white"
        >
          <HugeiconsIcon icon={Navigation03Icon} size={24} />
          Add Staff
        </Button>
      </div>

      <RoleTabButtons
        activeTab={activeTab}
        tabs={roleTabs}
        onTabChange={setActiveTab}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-2 border border-border-2 rounded-lg p-2">
          <thead>
            <tr>
              <th className="px-6 pt-3 pb-5 text-left text-base font-semibold text-text-primary border-b">
                Assign Date
              </th>       
              <th className="px-6 pt-3 pb-5 text-left text-base font-semibold text-text-primary border-b">
                Username
              </th>
              <th className="px-6 pt-3 pb-5 text-left text-base font-semibold text-text-primary border-b">
                Staff Name
              </th>
              <th className="px-6 pt-3 pb-5 text-left text-base font-semibold text-text-primary border-b">
                Contact
              </th>
              <th className="px-6 pt-3 pb-5 text-left text-base font-semibold text-text-primary border-b">
                Role Title
              </th>
              <th className="px-6 pt-3 pb-5 text-left text-base font-semibold text-text-primary border-b">
                Status
              </th>
              <th className="px-6 pt-3 pb-5 text-left text-base font-semibold text-text-primary border-b">
                Permission List
              </th>
              <th className="px-6 pt-3 pb-5 text-left text-base font-semibold text-text-primary border-b">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                  Loading branch staff access...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                  No staff members match the selected role filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user.id || index} className={`transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-primary"
                  } hover:bg-[#F2EEFF] rounded-md`}>
                  <td className="px-6 py-4 text-sm text-gray-600 rounded-l-md">
                    {formatDateLabel(user.assignedAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {user.displayName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.email || user.phone || "Not added"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {user.roleTitle}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        user.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.permissionList}
                  </td>
                  <td className="px-6 py-4 rounded-r-md">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer">
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => handleEditClick(user.id)}
                          className="cursor-pointer"
                        >
                          <HugeiconsIcon icon={Edit02Icon} className="text-black" />
                          Edit Staff
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(user)}
                          disabled={statusUpdatingId === user.id}
                          className="cursor-pointer"
                        >
                          <HugeiconsIcon
                            icon={user.isActive ? UserBlock01Icon : UserCheck01Icon}
                            className="text-black"
                          />
                          {statusUpdatingId === user.id
                            ? "Updating..."
                            : user.isActive
                              ? "Deactivate"
                              : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(user.id)}
                          className="cursor-pointer"
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="w-4 h-4 text-red-600 focus:text-red-600"
                          />
                          Delete Staff
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Staff"
        description="Are you sure you want to delete"
        itemName={selectedUser?.displayName || selectedUser?.username || ""}
        isLoading={isDeleting}
        confirmText="Delete Staff"
      />

      <UserFormModal
        key={`${userFormMode}-${selectedUser?.id || "new"}-${
          isUserFormModalOpen ? "open" : "closed"
        }`}
        isOpen={isUserFormModalOpen}
        onClose={() => setIsUserFormModalOpen(false)}
        mode={userFormMode}
        initialData={selectedUser}
        roles={roles}
        onSubmit={handleUserFormSubmit}
      />
    </div>
  );
};

export default UserAccessTable;