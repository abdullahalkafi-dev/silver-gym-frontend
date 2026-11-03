import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import type {
  CreateSmsHolidayPayload,
  SendSmsPayload,
  SendSmsResponse,
  SmsBalance,
  SmsBatchListResponse,
  SmsDueDuration,
  SmsDueOverview,
  SmsHistoryListResponse,
  SmsHistoryRecord,
  SmsHoliday,
  SmsHolidayList,
  SmsPreviewResponse,
  SmsSettingsSnapshot,
  SmsTemplateKey,
  UpdateSmsSettingsPayload,
} from "@/types/sms";

type BranchScopedArgs = {
  businessId: string;
  branchId: string;
};

type HistoryArgs = BranchScopedArgs & {
  page?: number;
  limit?: number;
  status?: string;
  templateKey?: string;
  requestId?: string;
  searchTerm?: string;
};

type RawHistoryRecord = Omit<SmsHistoryRecord, "id"> & { _id?: string; id?: string };

const normalizeHistory = (
  response: ApiSuccessResponse<{
    meta: SmsHistoryListResponse["meta"];
    data: RawHistoryRecord[];
  }>,
): SmsHistoryListResponse => ({
  meta: response.data.meta,
  data: response.data.data.map((row) => ({
    ...row,
    id: String(row._id ?? row.id ?? ""),
  })),
});

const historyParams = ({ page, limit, status, templateKey, requestId, searchTerm }: HistoryArgs) => ({
  ...(page ? { page } : {}),
  ...(limit ? { limit } : {}),
  ...(status ? { status } : {}),
  ...(templateKey ? { templateKey } : {}),
  ...(requestId ? { requestId } : {}),
  ...(searchTerm ? { searchTerm } : {}),
});

const url = ({ businessId, branchId }: BranchScopedArgs, path: string) =>
  `/sms/${businessId}/branches/${branchId}/${path}`;

export const smsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSmsSettings: builder.query<SmsSettingsSnapshot, BranchScopedArgs>({
      query: (args) => ({ url: url(args, "settings"), method: "GET" }),
      transformResponse: (response: ApiSuccessResponse<SmsSettingsSnapshot>) => response.data,
      providesTags: (_r, _e, { branchId }) => [{ type: "SMS", id: `SETTINGS-${branchId}` }],
    }),

    updateSmsSettings: builder.mutation<
      SmsSettingsSnapshot,
      BranchScopedArgs & { payload: UpdateSmsSettingsPayload }
    >({
      query: ({ payload, ...args }) => ({
        url: url(args, "settings"),
        method: "PATCH",
        body: { data: payload },
      }),
      transformResponse: (response: ApiSuccessResponse<SmsSettingsSnapshot>) => response.data,
      invalidatesTags: (_r, _e, { branchId }) => [
        { type: "SMS", id: `SETTINGS-${branchId}` },
        { type: "SMS", id: `BALANCE-${branchId}` },
      ],
    }),

    sendTestSms: builder.mutation<
      { message: string; sent: number; failed: number; dryRun: boolean },
      BranchScopedArgs & { templateKey: SmsTemplateKey; phone: string }
    >({
      query: ({ templateKey, phone, ...args }) => ({
        url: url(args, "test"),
        method: "POST",
        body: { data: { templateKey, phone } },
      }),
      transformResponse: (response: ApiSuccessResponse<{ message: string; sent: number; failed: number; dryRun: boolean }>) =>
        response.data,
      invalidatesTags: (_r, _e, { branchId }) => [{ type: "SMS", id: `HISTORY-${branchId}` }],
    }),

    getSmsBalance: builder.query<SmsBalance, BranchScopedArgs>({
      query: (args) => ({ url: url(args, "balance"), method: "GET" }),
      transformResponse: (response: ApiSuccessResponse<SmsBalance>) => response.data,
      providesTags: (_r, _e, { branchId }) => [{ type: "SMS", id: `BALANCE-${branchId}` }],
    }),

    getSmsDueOverview: builder.query<
      SmsDueOverview,
      BranchScopedArgs & { dueDuration?: SmsDueDuration }
    >({
      query: ({ dueDuration, ...args }) => ({
        url: url(args, "due-members"),
        method: "GET",
        params: dueDuration ? { dueDuration } : {},
      }),
      transformResponse: (response: ApiSuccessResponse<SmsDueOverview>) => response.data,
      providesTags: (_r, _e, { branchId }) => [{ type: "SMS", id: `DUE-${branchId}` }],
    }),

    previewSms: builder.mutation<SmsPreviewResponse, BranchScopedArgs & { payload: SendSmsPayload }>({
      query: ({ payload, ...args }) => ({
        url: url(args, "preview"),
        method: "POST",
        body: { data: payload },
      }),
      transformResponse: (response: ApiSuccessResponse<SmsPreviewResponse>) => response.data,
    }),

    sendSms: builder.mutation<SendSmsResponse, BranchScopedArgs & { payload: SendSmsPayload }>({
      query: ({ payload, ...args }) => ({
        url: url(args, "send"),
        method: "POST",
        body: { data: payload },
      }),
      transformResponse: (response: ApiSuccessResponse<SendSmsResponse>) => response.data,
      invalidatesTags: (_r, _e, { branchId }) => [
        { type: "SMS", id: `BALANCE-${branchId}` },
        { type: "SMS", id: `HISTORY-${branchId}` },
        { type: "SMS", id: `HOLIDAYS-${branchId}` },
      ],
    }),

    getSmsHolidays: builder.query<SmsHolidayList, BranchScopedArgs>({
      query: (args) => ({ url: url(args, "holidays"), method: "GET" }),
      transformResponse: (response: ApiSuccessResponse<SmsHolidayList>) => response.data,
      providesTags: (_r, _e, { branchId }) => [{ type: "SMS", id: `HOLIDAYS-${branchId}` }],
    }),

    createSmsHoliday: builder.mutation<
      SmsHoliday,
      BranchScopedArgs & { payload: CreateSmsHolidayPayload }
    >({
      query: ({ payload, ...args }) => ({
        url: url(args, "holidays"),
        method: "POST",
        body: { data: payload },
      }),
      transformResponse: (response: ApiSuccessResponse<SmsHoliday>) => response.data,
      invalidatesTags: (_r, _e, { branchId }) => [{ type: "SMS", id: `HOLIDAYS-${branchId}` }],
    }),

    deleteSmsHoliday: builder.mutation<{ id: string }, BranchScopedArgs & { holidayId: string }>({
      query: ({ holidayId, ...args }) => ({
        url: url(args, `holidays/${holidayId}`),
        method: "DELETE",
      }),
      transformResponse: (response: ApiSuccessResponse<{ id: string }>) => response.data,
      invalidatesTags: (_r, _e, { branchId }) => [{ type: "SMS", id: `HOLIDAYS-${branchId}` }],
    }),

    getSmsBatches: builder.query<SmsBatchListResponse, HistoryArgs>({
      query: (args) => ({
        url: url(args, "history/batches"),
        method: "GET",
        params: historyParams(args),
      }),
      transformResponse: (response: ApiSuccessResponse<SmsBatchListResponse>) => response.data,
      providesTags: (_r, _e, { branchId }) => [{ type: "SMS", id: `HISTORY-${branchId}` }],
    }),

    getSmsHistory: builder.query<SmsHistoryListResponse, HistoryArgs>({
      query: (args) => ({
        url: url(args, "history"),
        method: "GET",
        params: historyParams(args),
      }),
      transformResponse: normalizeHistory,
      providesTags: (_r, _e, { branchId }) => [{ type: "SMS", id: `HISTORY-${branchId}` }],
    }),

    getMemberSmsHistory: builder.query<SmsHistoryListResponse, HistoryArgs & { memberId: string }>({
      query: ({ memberId, ...args }) => ({
        url: url(args, `members/${memberId}/history`),
        method: "GET",
        params: historyParams(args),
      }),
      transformResponse: normalizeHistory,
      providesTags: (_r, _e, { branchId, memberId }) => [
        { type: "SMS", id: `HISTORY-${branchId}` },
        { type: "SMS", id: `MEMBER-${memberId}` },
      ],
    }),

    retrySmsBatch: builder.mutation<
      { message: string; sent: number; failed: number },
      BranchScopedArgs & { requestId: string }
    >({
      query: ({ requestId, ...args }) => ({
        url: url(args, `history/batches/${requestId}/retry`),
        method: "POST",
      }),
      transformResponse: (response: ApiSuccessResponse<{ message: string; sent: number; failed: number }>) =>
        response.data,
      invalidatesTags: (_r, _e, { branchId }) => [
        { type: "SMS", id: `HISTORY-${branchId}` },
        { type: "SMS", id: `BALANCE-${branchId}` },
      ],
    }),
  }),
});

export const {
  useGetSmsSettingsQuery,
  useUpdateSmsSettingsMutation,
  useSendTestSmsMutation,
  useGetSmsBalanceQuery,
  useGetSmsDueOverviewQuery,
  usePreviewSmsMutation,
  useSendSmsMutation,
  useGetSmsHolidaysQuery,
  useCreateSmsHolidayMutation,
  useDeleteSmsHolidayMutation,
  useGetSmsBatchesQuery,
  useGetSmsHistoryQuery,
  useGetMemberSmsHistoryQuery,
  useRetrySmsBatchMutation,
} = smsApi;
