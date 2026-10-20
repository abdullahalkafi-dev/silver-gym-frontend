import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import type {
  AccessDevice,
  AccessSettings,
  CreateAccessDevicePayload,
  DayAttendance,
  DoorPlan,
  MemberAttendance,
} from "@/types/access";

type BranchArg = { branchId: string };

export const accessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAccessSettings: builder.query<AccessSettings, BranchArg>({
      query: ({ branchId }) => ({
        url: `/access/${branchId}/settings`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<AccessSettings>) =>
        response.data,
      providesTags: (_r, _e, { branchId }) => [
        { type: "Access", id: `SETTINGS-${branchId}` },
      ],
    }),

    updateAccessSettings: builder.mutation<
      AccessSettings,
      BranchArg & { enabled?: boolean; graceDays?: number }
    >({
      query: ({ branchId, ...data }) => ({
        url: `/access/${branchId}/settings`,
        method: "PATCH",
        body: { data },
      }),
      transformResponse: (response: ApiSuccessResponse<AccessSettings>) =>
        response.data,
      invalidatesTags: (_r, _e, { branchId }) => [
        { type: "Access", id: `SETTINGS-${branchId}` },
        { type: "Access", id: `ATTENDANCE-${branchId}` },
      ],
    }),

    getAccessDevices: builder.query<AccessDevice[], BranchArg>({
      query: ({ branchId }) => ({
        url: `/access/${branchId}/devices`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<AccessDevice[]>) =>
        response.data,
      providesTags: (_r, _e, { branchId }) => [
        { type: "Access", id: `DEVICES-${branchId}` },
      ],
    }),

    createAccessDevice: builder.mutation<
      AccessDevice,
      BranchArg & CreateAccessDevicePayload
    >({
      query: ({ branchId, ...data }) => ({
        url: `/access/${branchId}/devices`,
        method: "POST",
        body: { data },
      }),
      transformResponse: (response: ApiSuccessResponse<AccessDevice>) =>
        response.data,
      invalidatesTags: (_r, _e, { branchId }) => [
        { type: "Access", id: `DEVICES-${branchId}` },
      ],
    }),

    testAccessDevice: builder.mutation<
      { ok: boolean; error?: string; userCount?: number; logCount?: number },
      BranchArg & { deviceId: string }
    >({
      query: ({ branchId, deviceId }) => ({
        url: `/access/${branchId}/devices/${deviceId}/test`,
        method: "POST",
      }),
      transformResponse: (
        response: ApiSuccessResponse<{
          ok: boolean;
          error?: string;
          userCount?: number;
          logCount?: number;
        }>,
      ) => response.data,
      invalidatesTags: (_r, _e, { branchId }) => [
        { type: "Access", id: `DEVICES-${branchId}` },
      ],
    }),

    syncAccessDevice: builder.mutation<
      { fetched: number; inserted: number },
      BranchArg & { deviceId: string }
    >({
      query: ({ branchId, deviceId }) => ({
        url: `/access/${branchId}/devices/${deviceId}/sync`,
        method: "POST",
      }),
      transformResponse: (
        response: ApiSuccessResponse<{ fetched: number; inserted: number }>,
      ) => response.data,
      invalidatesTags: (_r, _e, { branchId }) => [
        { type: "Access", id: `DEVICES-${branchId}` },
        { type: "Access", id: `ATTENDANCE-${branchId}` },
      ],
    }),

    updateAccessDevice: builder.mutation<
      AccessDevice,
      BranchArg & {
        deviceId: string;
        writeEnabled?: boolean;
        blockGroup?: number | null;
        allowGroup?: number;
        isActive?: boolean;
      }
    >({
      query: ({ branchId, deviceId, ...data }) => ({
        url: `/access/${branchId}/devices/${deviceId}`,
        method: "PATCH",
        body: { data },
      }),
      transformResponse: (response: ApiSuccessResponse<AccessDevice>) =>
        response.data,
      invalidatesTags: (_r, _e, { branchId }) => [
        { type: "Access", id: `DEVICES-${branchId}` },
      ],
    }),

    getDoorPlan: builder.query<DoorPlan, BranchArg & { deviceId: string }>({
      query: ({ branchId, deviceId }) => ({
        url: `/access/${branchId}/devices/${deviceId}/access-plan`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<DoorPlan>) =>
        response.data,
    }),

    syncDoorAccess: builder.mutation<DoorPlan, BranchArg & { deviceId: string }>({
      query: ({ branchId, deviceId }) => ({
        url: `/access/${branchId}/devices/${deviceId}/access-sync`,
        method: "POST",
        body: { data: {} },
      }),
      transformResponse: (response: ApiSuccessResponse<DoorPlan>) =>
        response.data,
      invalidatesTags: (_r, _e, { branchId }) => [
        { type: "Access", id: `DEVICES-${branchId}` },
      ],
    }),

    testDoorUser: builder.mutation<
      DoorPlan,
      BranchArg & { deviceId: string; memberId: string; state: "blocked" | "allowed" }
    >({
      query: ({ branchId, deviceId, memberId, state }) => ({
        url: `/access/${branchId}/devices/${deviceId}/test-user`,
        method: "POST",
        body: { data: { memberId, state } },
      }),
      transformResponse: (response: ApiSuccessResponse<DoorPlan>) =>
        response.data,
    }),

    releaseEveryone: builder.mutation<DoorPlan, BranchArg & { deviceId: string }>({
      query: ({ branchId, deviceId }) => ({
        url: `/access/${branchId}/devices/${deviceId}/release-all`,
        method: "POST",
      }),
      transformResponse: (response: ApiSuccessResponse<DoorPlan>) =>
        response.data,
    }),

    getDayAttendance: builder.query<DayAttendance, BranchArg & { date: string }>({
      query: ({ branchId, date }) => ({
        url: `/access/${branchId}/attendance`,
        method: "GET",
        params: { date },
      }),
      transformResponse: (response: ApiSuccessResponse<DayAttendance>) =>
        response.data,
      providesTags: (_r, _e, { branchId }) => [
        { type: "Access", id: `ATTENDANCE-${branchId}` },
      ],
    }),

    getMemberAttendance: builder.query<
      MemberAttendance,
      BranchArg & { memberId: string; month: string }
    >({
      query: ({ branchId, memberId, month }) => ({
        url: `/access/${branchId}/members/${memberId}/attendance`,
        method: "GET",
        params: { month },
      }),
      transformResponse: (response: ApiSuccessResponse<MemberAttendance>) =>
        response.data,
      providesTags: (_r, _e, { branchId, memberId }) => [
        { type: "Access", id: `ATTENDANCE-${branchId}` },
        { type: "Access", id: `MEMBER-${memberId}` },
      ],
    }),
  }),
});

export const {
  useGetAccessSettingsQuery,
  useUpdateAccessSettingsMutation,
  useGetAccessDevicesQuery,
  useCreateAccessDeviceMutation,
  useTestAccessDeviceMutation,
  useSyncAccessDeviceMutation,
  useGetMemberAttendanceQuery,
  useUpdateAccessDeviceMutation,
  useLazyGetDoorPlanQuery,
  useSyncDoorAccessMutation,
  useTestDoorUserMutation,
  useReleaseEveryoneMutation,
  useGetDayAttendanceQuery,
} = accessApi;
