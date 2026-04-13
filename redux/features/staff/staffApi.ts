import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import {
  type BranchRole,
  type RolePermissions,
  type StaffFormValues,
  type StaffMember,
  type StaffUpdateValues,
  getPermissionListLabel,
  getRoleFilterKey,
  normalizeRolePermissions,
} from "@/types/staff";

type RawRole = Partial<RolePermissions> & {
  _id?: string;
  id?: string;
  branchId?: string;
  roleName?: string;
  createdAt?: string;
  updatedAt?: string;
};

type RawStaffPermissionTree = {
  members?: {
    canView?: boolean;
    canAdd?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
  };
  packages?: {
    canView?: boolean;
    canAdd?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
  };
  billing?: {
    canView?: boolean;
    canAdd?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
  };
  fees?: {
    monthly?: {
      canAdd?: boolean;
      canEdit?: boolean;
    };
    admission?: {
      canAdd?: boolean;
      canEdit?: boolean;
    };
  };
  analytics?: {
    canView?: boolean;
    canExport?: boolean;
  };
  communications?: {
    sms?: {
      canView?: boolean;
      canSend?: boolean;
    };
    email?: {
      canView?: boolean;
      canSend?: boolean;
    };
  };
};

type RawStaffRolePermissions = {
  roleId?: string;
  roleName?: string;
  permissions?: RawStaffPermissionTree;
};

type RawStaff = {
  _id?: string;
  id?: string;
  branchId?: string;
  username?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  profilePicture?: string | null;
  lastLogin?: string | null;
  assignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  roleId?: string | RawRole;
  rolePermissions?: RawStaffRolePermissions | null;
};

const normalizeRole = (rawRole: RawRole): BranchRole => ({
  id: String(rawRole._id || rawRole.id || ""),
  branchId: String(rawRole.branchId || ""),
  roleName: rawRole.roleName || "Untitled Role",
  permissions: normalizeRolePermissions(rawRole),
  createdAt: rawRole.createdAt,
  updatedAt: rawRole.updatedAt,
});

const normalizePermissionsFromTree = (
  tree?: RawStaffPermissionTree,
): RolePermissions => {
  return normalizeRolePermissions({
    canViewMembers: tree?.members?.canView,
    canAddMember: tree?.members?.canAdd,
    canEditMember: tree?.members?.canEdit,
    canDeleteMember: tree?.members?.canDelete,
    canViewPackages: tree?.packages?.canView,
    canAddPackage: tree?.packages?.canAdd,
    canEditPackage: tree?.packages?.canEdit,
    canDeletePackage: tree?.packages?.canDelete,
    canViewBilling: tree?.billing?.canView,
    canAddBilling: tree?.billing?.canAdd,
    canEditBilling: tree?.billing?.canEdit,
    canDeleteBilling: tree?.billing?.canDelete,
    canAddMonthlyFee: tree?.fees?.monthly?.canAdd,
    canEditMonthlyFee: tree?.fees?.monthly?.canEdit,
    canAddAdmissionFee: tree?.fees?.admission?.canAdd,
    canEditAdmissionFee: tree?.fees?.admission?.canEdit,
    canViewAnalytics: tree?.analytics?.canView,
    canExportAnalytics: tree?.analytics?.canExport,
    canViewSMS: tree?.communications?.sms?.canView,
    canSendSMS: tree?.communications?.sms?.canSend,
    canViewEmail: tree?.communications?.email?.canView,
    canSendEmail: tree?.communications?.email?.canSend,
  });
};

const normalizeStaff = (rawStaff: RawStaff): StaffMember => {
  const rawRole = typeof rawStaff.roleId === "object" ? rawStaff.roleId : undefined;
  const roleTitle =
    rawStaff.rolePermissions?.roleName || rawRole?.roleName || "Unassigned";
  const permissions = rawRole
    ? normalizeRolePermissions(rawRole)
    : normalizePermissionsFromTree(rawStaff.rolePermissions?.permissions);

  return {
    id: String(rawStaff._id || rawStaff.id || ""),
    branchId: String(rawStaff.branchId || ""),
    username: rawStaff.username || "",
    displayName: rawStaff.displayName || rawStaff.username || "Unnamed Staff",
    email: rawStaff.email,
    phone: rawStaff.phone,
    profilePicture: rawStaff.profilePicture ?? null,
    lastLogin: rawStaff.lastLogin ?? null,
    assignedAt: rawStaff.assignedAt || rawStaff.createdAt,
    createdAt: rawStaff.createdAt,
    updatedAt: rawStaff.updatedAt,
    isActive: rawStaff.isActive ?? true,
    roleId: String(
      rawStaff.rolePermissions?.roleId ||
        rawRole?._id ||
        (typeof rawStaff.roleId === "string" ? rawStaff.roleId : ""),
    ),
    roleTitle,
    roleKey: getRoleFilterKey(roleTitle),
    permissions,
    permissionList: getPermissionListLabel(permissions),
  };
};

type CreateBranchStaffArgs = {
  branchId: string;
  payload: StaffFormValues;
};

type UpdateBranchStaffArgs = {
  branchId: string;
  staffId: string;
  payload: StaffUpdateValues;
};

type UpdateBranchRolePermissionsArgs = {
  branchId: string;
  roleId: string;
  payload: Partial<RolePermissions>;
};

type StaffStatusMutationArgs = {
  branchId: string;
  staffId: string;
};

type SuggestStaffUsernamesArgs = {
  base: string;
  limit?: number;
};

type CheckStaffUsernameAvailabilityResult = {
  username: string;
  isAvailable: boolean;
};

export const staffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    suggestStaffUsernames: builder.query<string[], SuggestStaffUsernamesArgs>({
      query: ({ base, limit = 6 }) => ({
        url: "/staff/usernames/suggest",
        method: "GET",
        params: { base, limit },
      }),
      transformResponse: (
        response: ApiSuccessResponse<{ suggestions?: string[] }>,
      ) => {
        const suggestions = response.data?.suggestions;
        return Array.isArray(suggestions) ? suggestions : [];
      },
    }),

    checkStaffUsernameAvailability: builder.query<
      CheckStaffUsernameAvailabilityResult,
      string
    >({
      query: (username) => ({
        url: "/staff/usernames/check",
        method: "GET",
        params: { username },
      }),
      transformResponse: (
        response: ApiSuccessResponse<{
          username?: string;
          isAvailable?: boolean;
        }>,
      ) => ({
        username: response.data?.username || "",
        isAvailable: Boolean(response.data?.isAvailable),
      }),
    }),

    getBranchStaff: builder.query<StaffMember[], string>({
      query: (branchId) => ({
        url: `/staff/${branchId}/staff`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<RawStaff[]>) => {
        const items = Array.isArray(response.data) ? response.data : [];
        return items.map(normalizeStaff);
      },
      providesTags: (result, _error, branchId) => {
        const baseTags: Array<{ type: "Staff"; id: string }> = [
          { type: "Staff", id: `LIST-${branchId}` },
        ];

        if (!result || result.length === 0) {
          return baseTags;
        }

        return [
          ...baseTags,
          ...result.map((staff) => ({ type: "Staff" as const, id: staff.id })),
        ];
      },
    }),

    getBranchRoles: builder.query<BranchRole[], string>({
      query: (branchId) => ({
        url: `/roles/${branchId}`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<RawRole[]>) => {
        const items = Array.isArray(response.data) ? response.data : [];
        return items.map(normalizeRole);
      },
      providesTags: (result, _error, branchId) => {
        const baseTags: Array<{ type: "Role"; id: string }> = [
          { type: "Role", id: `LIST-${branchId}` },
        ];

        if (!result || result.length === 0) {
          return baseTags;
        }

        return [
          ...baseTags,
          ...result.map((role) => ({ type: "Role" as const, id: role.id })),
        ];
      },
    }),

    initializeBranchRoles: builder.mutation<BranchRole[], string>({
      query: (branchId) => ({
        url: `/roles/${branchId}/initialize`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<RawRole[]>) => {
        const items = Array.isArray(response.data) ? response.data : [];
        return items.map(normalizeRole);
      },
      invalidatesTags: (_result, _error, branchId) => [
        { type: "Role", id: `LIST-${branchId}` },
      ],
    }),

    createBranchStaff: builder.mutation<Record<string, unknown>, CreateBranchStaffArgs>({
      query: ({ branchId, payload }) => ({
        url: `/staff/${branchId}/staff`,
        method: "POST",
        body: payload,
      }),
      transformResponse: (response: ApiSuccessResponse<Record<string, unknown>>) => {
        return response.data;
      },
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "Staff", id: `LIST-${branchId}` },
      ],
    }),

    updateBranchStaff: builder.mutation<Record<string, unknown>, UpdateBranchStaffArgs>({
      query: ({ branchId, staffId, payload }) => ({
        url: `/staff/${branchId}/staff/${staffId}`,
        method: "PATCH",
        body: payload,
      }),
      transformResponse: (response: ApiSuccessResponse<Record<string, unknown>>) => {
        return response.data;
      },
      invalidatesTags: (_result, _error, { branchId, staffId }) => [
        { type: "Staff", id: `LIST-${branchId}` },
        { type: "Staff", id: staffId },
      ],
    }),

    activateBranchStaff: builder.mutation<Record<string, unknown>, StaffStatusMutationArgs>({
      query: ({ branchId, staffId }) => ({
        url: `/staff/${branchId}/staff/${staffId}/activate`,
        method: "PATCH",
      }),
      transformResponse: (response: ApiSuccessResponse<Record<string, unknown>>) => {
        return response.data;
      },
      invalidatesTags: (_result, _error, { branchId, staffId }) => [
        { type: "Staff", id: `LIST-${branchId}` },
        { type: "Staff", id: staffId },
      ],
    }),

    deactivateBranchStaff: builder.mutation<Record<string, unknown>, StaffStatusMutationArgs>({
      query: ({ branchId, staffId }) => ({
        url: `/staff/${branchId}/staff/${staffId}/deactivate`,
        method: "PATCH",
      }),
      transformResponse: (response: ApiSuccessResponse<Record<string, unknown>>) => {
        return response.data;
      },
      invalidatesTags: (_result, _error, { branchId, staffId }) => [
        { type: "Staff", id: `LIST-${branchId}` },
        { type: "Staff", id: staffId },
      ],
    }),

    deleteBranchStaff: builder.mutation<Record<string, unknown>, StaffStatusMutationArgs>({
      query: ({ branchId, staffId }) => ({
        url: `/staff/${branchId}/staff/${staffId}`,
        method: "DELETE",
      }),
      transformResponse: (response: ApiSuccessResponse<Record<string, unknown>>) => {
        return response.data;
      },
      invalidatesTags: (_result, _error, { branchId, staffId }) => [
        { type: "Staff", id: `LIST-${branchId}` },
        { type: "Staff", id: staffId },
      ],
    }),

    updateBranchRolePermissions: builder.mutation<BranchRole, UpdateBranchRolePermissionsArgs>({
      query: ({ branchId, roleId, payload }) => ({
        url: `/roles/${branchId}/role/${roleId}`,
        method: "PATCH",
        body: { data: payload },
      }),
      transformResponse: (response: ApiSuccessResponse<RawRole>) => {
        return normalizeRole(response.data);
      },
      invalidatesTags: (_result, _error, { branchId, roleId }) => [
        { type: "Role", id: `LIST-${branchId}` },
        { type: "Role", id: roleId },
        { type: "Staff", id: `LIST-${branchId}` },
      ],
    }),
  }),
});

export const {
  useLazySuggestStaffUsernamesQuery,
  useLazyCheckStaffUsernameAvailabilityQuery,
  useGetBranchRolesQuery,
  useGetBranchStaffQuery,
  useInitializeBranchRolesMutation,
  useCreateBranchStaffMutation,
  useUpdateBranchStaffMutation,
  useActivateBranchStaffMutation,
  useDeactivateBranchStaffMutation,
  useDeleteBranchStaffMutation,
  useUpdateBranchRolePermissionsMutation,
} = staffApi;