import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import type {
  BranchSmsSettingsSnapshot,
  DueSmsRecipientsResponse,
  PreviewSmsPayload,
  SmsBalance,
  SmsDeliveryMode,
  SmsDueDuration,
  SmsDueDurationCounts,
  SmsHistoryListResponse,
  SmsHistoryRecord,
  SmsMessageType,
  SmsMessageTypeSummary,
  SmsPreviewResponse,
  SmsRecipientPreview,
  SmsPreviewSummary,
  SmsTemplateCategory,
  SendSmsResponse,
} from "@/types/sms";

type BranchScopedArgs = {
  businessId: string;
  branchId: string;
};

type GetDueSmsMembersArgs = BranchScopedArgs & {
  targetDate?: string;
  dueDuration?: SmsDueDuration;
  page?: number;
  limit?: number;
  searchTerm?: string;
};

type GetSmsHistoryArgs = BranchScopedArgs & {
  page?: number;
  limit?: number;
  status?: string;
  sendMode?: string;
  searchTerm?: string;
};

type GetMemberSmsHistoryArgs = GetSmsHistoryArgs & {
  memberId: string;
};

type UpdateBranchSmsSettingsPayload = BranchScopedArgs & {
  payload: Partial<{
    autoSendEnabled: boolean;
    reminderDayOfMonth: number;
    template: string;
    occasionTemplate: string;
    promotionTemplate: string;
    defaultDeliveryMode: SmsDeliveryMode;
    maskingSender: string | null;
  }>;
};

type PreviewSmsArgs = BranchScopedArgs & {
  payload: PreviewSmsPayload;
};

type RawSmsSettingsSnapshot = {
  branchId?: string;
  branchName?: string;
  smsSettings?: {
    autoSendEnabled?: boolean;
    reminderDayOfMonth?: number;
    template?: string;
    occasionTemplate?: string;
    promotionTemplate?: string;
    defaultDeliveryMode?: SmsDeliveryMode;
    maskingSender?: string | null;
    updatedAt?: string | null;
    updatedBy?: string | null;
    lastAutoReminderRunDate?: string | null;
  };
};

type RawSmsPreviewSummary = {
  totalRecipients?: number;
  readyRecipients?: number;
  blockedRecipients?: number;
  requiredUnits?: number;
  availableBalance?: number;
  remainingBalance?: number;
  canSend?: boolean;
  insufficientBalance?: boolean;
  deliveryMode?: SmsDeliveryMode;
  balanceBucket?: "nonMasking" | "masking";
  messageType?: SmsMessageTypeSummary;
  textRecipients?: number;
  unicodeRecipients?: number;
  messagesOverSingleSmsLimit?: number;
  singleSmsCharacterLimit?: number;
};

type RawSmsRecipientPreview = {
  memberId?: string;
  memberName?: string;
  memberIdentifier?: string;
  recipientPhone?: string | null;
  dueMonthLabel?: string;
  overdueMonths?: number;
  monthlyDueAmount?: number;
  totalDueAmount?: number;
  renderedMessage?: string;
  messageType?: SmsMessageType;
  units?: number;
  status?: "ready" | "blocked";
  reason?: string;
};

type RawSmsPreviewResponse = {
  branchId?: string;
  branchName?: string;
  targetDate?: string;
  template?: string;
  templateCategory?: SmsTemplateCategory;
  deliveryMode?: SmsDeliveryMode;
  dueDuration?: SmsDueDuration;
  dueDurationCounts?: Partial<SmsDueDurationCounts>;
  balance?: SmsBalance;
  summary?: RawSmsPreviewSummary;
  recipients?: RawSmsRecipientPreview[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
};

type RawSmsHistoryRecord = {
  _id?: string;
  id?: string;
  requestId?: string;
  branchId?: string;
  memberId?: string | null;
  memberName?: string;
  recipientPhone?: string | null;
  template?: string;
  templateCategory?: SmsTemplateCategory;
  renderedMessage?: string;
  audience?: "selected" | "due";
  sendMode?: "manual" | "auto";
  deliveryMode?: SmsDeliveryMode;
  messageType?: SmsMessageType;
  balanceBucket?: "nonMasking" | "masking";
  status?: "simulated" | "sent" | "blocked" | "failed";
  reason?: string;
  units?: number;
  dueMonthLabel?: string;
  overdueMonths?: number;
  monthlyDueAmount?: number;
  totalDueAmount?: number;
  requestedByUserId?: string | null;
  requestedByStaffId?: string | null;
  targetDate?: string;
  provider?: "wintel";
  availableBalance?: number | null;
  remainingBalance?: number | null;
  providerReference?: string;
  createdAt?: string;
  updatedAt?: string;
};

const normalizeSmsBalance = (rawBalance?: Partial<SmsBalance> | null): SmsBalance => ({
  nonMaskingBalance: Number(rawBalance?.nonMaskingBalance || 0),
  maskingBalance:
    rawBalance?.maskingBalance == null ? null : Number(rawBalance.maskingBalance),
  fetchedAt: rawBalance?.fetchedAt || new Date().toISOString(),
  dryRun: Boolean(rawBalance?.dryRun),
});

const normalizeSmsSettingsSnapshot = (
  rawSnapshot?: RawSmsSettingsSnapshot | null,
): BranchSmsSettingsSnapshot => ({
  branchId: String(rawSnapshot?.branchId || ""),
  branchName: rawSnapshot?.branchName || "Untitled Branch",
  smsSettings: {
    autoSendEnabled: Boolean(rawSnapshot?.smsSettings?.autoSendEnabled),
    reminderDayOfMonth: Number(rawSnapshot?.smsSettings?.reminderDayOfMonth || 5),
    template: rawSnapshot?.smsSettings?.template || "",
    occasionTemplate: rawSnapshot?.smsSettings?.occasionTemplate || "",
    promotionTemplate: rawSnapshot?.smsSettings?.promotionTemplate || "",
    defaultDeliveryMode:
      rawSnapshot?.smsSettings?.defaultDeliveryMode || "masking",
    maskingSender: rawSnapshot?.smsSettings?.maskingSender ?? null,
    updatedAt: rawSnapshot?.smsSettings?.updatedAt ?? null,
    updatedBy: rawSnapshot?.smsSettings?.updatedBy ?? null,
    lastAutoReminderRunDate:
      rawSnapshot?.smsSettings?.lastAutoReminderRunDate ?? null,
  },
});

const normalizePreviewSummary = (
  rawSummary?: RawSmsPreviewSummary | null,
): SmsPreviewSummary => ({
  totalRecipients: Number(rawSummary?.totalRecipients || 0),
  readyRecipients: Number(rawSummary?.readyRecipients || 0),
  blockedRecipients: Number(rawSummary?.blockedRecipients || 0),
  requiredUnits: Number(rawSummary?.requiredUnits || 0),
  availableBalance: Number(rawSummary?.availableBalance || 0),
  remainingBalance: Number(rawSummary?.remainingBalance || 0),
  canSend: Boolean(rawSummary?.canSend),
  insufficientBalance: Boolean(rawSummary?.insufficientBalance),
  deliveryMode: rawSummary?.deliveryMode || "masking",
  balanceBucket: rawSummary?.balanceBucket || "masking",
  messageType: rawSummary?.messageType || "text",
  textRecipients: Number(rawSummary?.textRecipients || 0),
  unicodeRecipients: Number(rawSummary?.unicodeRecipients || 0),
  messagesOverSingleSmsLimit: Number(rawSummary?.messagesOverSingleSmsLimit || 0),
  singleSmsCharacterLimit: Number(rawSummary?.singleSmsCharacterLimit || 160),
});

const normalizeRecipientPreview = (
  rawRecipient?: RawSmsRecipientPreview | null,
): SmsRecipientPreview => ({
  memberId: String(rawRecipient?.memberId || ""),
  memberName: rawRecipient?.memberName || "Unknown member",
  memberIdentifier: rawRecipient?.memberIdentifier,
  recipientPhone: rawRecipient?.recipientPhone ?? null,
  dueMonthLabel: rawRecipient?.dueMonthLabel || "—",
  overdueMonths: Number(rawRecipient?.overdueMonths || 0),
  monthlyDueAmount: Number(rawRecipient?.monthlyDueAmount || 0),
  totalDueAmount: Number(rawRecipient?.totalDueAmount || 0),
  renderedMessage: rawRecipient?.renderedMessage || "",
  messageType: rawRecipient?.messageType || "text",
  units: Number(rawRecipient?.units || 0),
  status: rawRecipient?.status || "blocked",
  reason: rawRecipient?.reason,
});

const normalizeDueDurationCounts = (
  rawCounts?: Partial<SmsDueDurationCounts> | null,
): SmsDueDurationCounts => ({
  thisMonth: Number(rawCounts?.thisMonth || 0),
  last2Months: Number(rawCounts?.last2Months || 0),
  last3Months: Number(rawCounts?.last3Months || 0),
  allDue: Number(rawCounts?.allDue || 0),
});

const normalizePreviewResponse = (
  rawPreview?: RawSmsPreviewResponse | null,
): SmsPreviewResponse => ({
  branchId: String(rawPreview?.branchId || ""),
  branchName: rawPreview?.branchName || "Untitled Branch",
  targetDate: rawPreview?.targetDate || new Date().toISOString(),
  template: rawPreview?.template || "",
  templateCategory: rawPreview?.templateCategory || "custom",
  deliveryMode: rawPreview?.deliveryMode || "masking",
  dueDuration: rawPreview?.dueDuration,
  dueDurationCounts: rawPreview?.dueDurationCounts
    ? normalizeDueDurationCounts(rawPreview.dueDurationCounts)
    : undefined,
  balance: normalizeSmsBalance(rawPreview?.balance),
  summary: normalizePreviewSummary(rawPreview?.summary),
  recipients: Array.isArray(rawPreview?.recipients)
    ? rawPreview.recipients.map(normalizeRecipientPreview)
    : [],
});

const normalizeSmsHistoryRecord = (
  rawRecord?: RawSmsHistoryRecord | null,
): SmsHistoryRecord => ({
  id: String(rawRecord?.id || rawRecord?._id || ""),
  requestId: rawRecord?.requestId || "",
  branchId: String(rawRecord?.branchId || ""),
  memberId: rawRecord?.memberId ?? null,
  memberName: rawRecord?.memberName || "Unknown member",
  recipientPhone: rawRecord?.recipientPhone ?? null,
  template: rawRecord?.template || "",
  templateCategory: rawRecord?.templateCategory || "due",
  renderedMessage: rawRecord?.renderedMessage || "",
  audience: rawRecord?.audience || "selected",
  sendMode: rawRecord?.sendMode || "manual",
  deliveryMode: rawRecord?.deliveryMode || "nonMasking",
  messageType: rawRecord?.messageType || "text",
  balanceBucket: rawRecord?.balanceBucket,
  status: rawRecord?.status || "blocked",
  reason: rawRecord?.reason,
  units: Number(rawRecord?.units || 0),
  dueMonthLabel: rawRecord?.dueMonthLabel,
  overdueMonths:
    rawRecord?.overdueMonths == null ? undefined : Number(rawRecord.overdueMonths),
  monthlyDueAmount:
    rawRecord?.monthlyDueAmount == null ? undefined : Number(rawRecord.monthlyDueAmount),
  totalDueAmount:
    rawRecord?.totalDueAmount == null ? undefined : Number(rawRecord.totalDueAmount),
  requestedByUserId: rawRecord?.requestedByUserId ?? null,
  requestedByStaffId: rawRecord?.requestedByStaffId ?? null,
  targetDate: rawRecord?.targetDate,
  provider: rawRecord?.provider || "wintel",
  availableBalance:
    rawRecord?.availableBalance == null ? null : Number(rawRecord.availableBalance),
  remainingBalance:
    rawRecord?.remainingBalance == null ? null : Number(rawRecord.remainingBalance),
  providerReference: rawRecord?.providerReference,
  createdAt: rawRecord?.createdAt,
  updatedAt: rawRecord?.updatedAt,
});

export const smsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBranchSmsSettings: builder.query<BranchSmsSettingsSnapshot, BranchScopedArgs>({
      query: ({ businessId, branchId }) => ({
        url: `/branches/${businessId}/branches/${branchId}/sms-settings`,
        method: "GET",
      }),
      transformResponse: (
        response: ApiSuccessResponse<RawSmsSettingsSnapshot>,
      ) => normalizeSmsSettingsSnapshot(response.data),
      providesTags: (_result, _error, { branchId }) => [
        { type: "SMS", id: `SETTINGS-${branchId}` },
      ],
    }),

    updateBranchSmsSettings: builder.mutation<
      BranchSmsSettingsSnapshot,
      UpdateBranchSmsSettingsPayload
    >({
      query: ({ businessId, branchId, payload }) => ({
        url: `/branches/${businessId}/branches/${branchId}/sms-settings`,
        method: "PATCH",
        body: {
          data: payload,
        },
      }),
      transformResponse: (
        response: ApiSuccessResponse<RawSmsSettingsSnapshot>,
      ) => normalizeSmsSettingsSnapshot(response.data),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "SMS", id: `SETTINGS-${branchId}` },
        { type: "SMS", id: `BALANCE-${branchId}` },
        { type: "SMS", id: `DUE-${branchId}` },
      ],
    }),

    getSmsBalance: builder.query<SmsBalance, BranchScopedArgs>({
      query: ({ businessId, branchId }) => ({
        url: `/sms/${businessId}/branches/${branchId}/balance`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<Partial<SmsBalance>>) =>
        normalizeSmsBalance(response.data),
      providesTags: (_result, _error, { branchId }) => [
        { type: "SMS", id: `BALANCE-${branchId}` },
      ],
    }),

    getDueSmsMembers: builder.query<DueSmsRecipientsResponse, GetDueSmsMembersArgs>({
      query: ({ businessId, branchId, targetDate, dueDuration, page, limit, searchTerm }) => ({
        url: `/sms/${businessId}/branches/${branchId}/due-members`,
        method: "GET",
        params: {
          ...(targetDate ? { targetDate } : {}),
          ...(dueDuration ? { dueDuration } : {}),
          ...(page ? { page } : {}),
          ...(limit ? { limit } : {}),
          ...(searchTerm ? { searchTerm } : {}),
        },
      }),
      transformResponse: (response: ApiSuccessResponse<RawSmsPreviewResponse>) => {
        const preview = normalizePreviewResponse(response.data);

        return {
          ...preview,
          meta: {
            page: Number(response.data.meta?.page || 1),
            limit: Number(response.data.meta?.limit || 25),
            total: Number(response.data.meta?.total || 0),
          },
        };
      },
      providesTags: (_result, _error, { branchId }) => [
        { type: "SMS", id: `DUE-${branchId}` },
      ],
    }),

    previewSms: builder.mutation<SmsPreviewResponse, PreviewSmsArgs>({
      query: ({ businessId, branchId, payload }) => ({
        url: `/sms/${businessId}/branches/${branchId}/preview`,
        method: "POST",
        body: {
          data: payload,
        },
      }),
      transformResponse: (response: ApiSuccessResponse<RawSmsPreviewResponse>) =>
        normalizePreviewResponse(response.data),
    }),

    sendSms: builder.mutation<SendSmsResponse, PreviewSmsArgs>({
      query: ({ businessId, branchId, payload }) => ({
        url: `/sms/${businessId}/branches/${branchId}/send`,
        method: "POST",
        body: {
          data: payload,
        },
      }),
      transformResponse: (
        response: ApiSuccessResponse<RawSmsPreviewResponse & { requestId?: string; status?: string; message?: string }>,
      ) => ({
        ...normalizePreviewResponse(response.data),
        requestId: String(response.data.requestId || ""),
        status: response.data.status || "simulated",
        message: response.data.message || response.message,
      }),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "SMS", id: `BALANCE-${branchId}` },
        { type: "SMS", id: `HISTORY-${branchId}` },
        { type: "SMS", id: `DUE-${branchId}` },
      ],
    }),

    getSmsHistory: builder.query<SmsHistoryListResponse, GetSmsHistoryArgs>({
      query: ({ businessId, branchId, page, limit, status, sendMode, searchTerm }) => ({
        url: `/sms/${businessId}/branches/${branchId}/history`,
        method: "GET",
        params: {
          ...(page ? { page } : {}),
          ...(limit ? { limit } : {}),
          ...(status ? { status } : {}),
          ...(sendMode ? { sendMode } : {}),
          ...(searchTerm ? { searchTerm } : {}),
        },
      }),
      transformResponse: (
        response: ApiSuccessResponse<{ meta?: SmsHistoryListResponse["meta"]; data?: RawSmsHistoryRecord[] }>,
      ) => ({
        meta: {
          page: Number(response.data.meta?.page || 1),
          limit: Number(response.data.meta?.limit || 20),
          total: Number(response.data.meta?.total || 0),
        },
        data: Array.isArray(response.data.data)
          ? response.data.data.map(normalizeSmsHistoryRecord)
          : [],
      }),
      providesTags: (_result, _error, { branchId }) => [
        { type: "SMS", id: `HISTORY-${branchId}` },
      ],
    }),

    getMemberSmsHistory: builder.query<SmsHistoryListResponse, GetMemberSmsHistoryArgs>({
      query: ({ businessId, branchId, memberId, page, limit, status, sendMode, searchTerm }) => ({
        url: `/sms/${businessId}/branches/${branchId}/members/${memberId}/history`,
        method: "GET",
        params: {
          ...(page ? { page } : {}),
          ...(limit ? { limit } : {}),
          ...(status ? { status } : {}),
          ...(sendMode ? { sendMode } : {}),
          ...(searchTerm ? { searchTerm } : {}),
        },
      }),
      transformResponse: (
        response: ApiSuccessResponse<{ meta?: SmsHistoryListResponse["meta"]; data?: RawSmsHistoryRecord[] }>,
      ) => ({
        meta: {
          page: Number(response.data.meta?.page || 1),
          limit: Number(response.data.meta?.limit || 20),
          total: Number(response.data.meta?.total || 0),
        },
        data: Array.isArray(response.data.data)
          ? response.data.data.map(normalizeSmsHistoryRecord)
          : [],
      }),
      providesTags: (_result, _error, { memberId }) => [
        { type: "SMS", id: `MEMBER-HISTORY-${memberId}` },
      ],
    }),
  }),
});

export const {
  useGetBranchSmsSettingsQuery,
  useUpdateBranchSmsSettingsMutation,
  useGetSmsBalanceQuery,
  useGetDueSmsMembersQuery,
  usePreviewSmsMutation,
  useSendSmsMutation,
  useGetSmsHistoryQuery,
  useGetMemberSmsHistoryQuery,
} = smsApi;
