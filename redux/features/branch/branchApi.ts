import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import type {
  Branch,
  BranchAdmissionFee,
  BranchAutoDeactivationSettings,
  BranchMonthlyFee,
  BranchStartingBalance,
  CreateBranchPayload,
} from "@/types/branch";
import { DEFAULT_AUTO_DEACTIVATE_AFTER_UNPAID_MONTHS } from "@/types/branch";

type BranchFeeQueryArgs = {
  businessId: string;
  branchId: string;
};

type UpdateBranchMonthlyFeePayload = BranchFeeQueryArgs & {
  monthlyFeeAmount: number;
};

type UpdateBranchAdmissionFeePayload = BranchFeeQueryArgs & {
  admissionFeeAmount: number;
};

type UpdateBranchAutoDeactivationSettingsPayload = BranchFeeQueryArgs & {
  autoDeactivateAfterUnpaidMonths: number;
};

type SetBranchStartingBalancePayload = BranchFeeQueryArgs & {
  startingBalance: number;
};

type RawBranch = {
  _id?: string;
  id?: string;
  businessId?: string;
  branchName?: string;
  branchAddress?: string;
  monthlyFeeAmount?: number | null;
  admissionFeeAmount?: number | null;
  autoDeactivateAfterUnpaidMonths?: number | null;
  logo?: string | null;
  favicon?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type RawBranchMonthlyFee = {
  branchId?: string;
  branchName?: string;
  monthlyFeeAmount?: number | null;
};

type RawBranchAdmissionFee = {
  branchId?: string;
  branchName?: string;
  admissionFeeAmount?: number | null;
};

type RawBranchAutoDeactivationSettings = {
  branchId?: string;
  branchName?: string;
  autoDeactivateAfterUnpaidMonths?: number | null;
};

type RawBranchStartingBalance = {
  branchId?: string;
  branchName?: string;
  startingBalance?: number | null;
  startingBalanceSetAt?: string | null;
};

const normalizeBranch = (rawBranch?: RawBranch | null): Branch => {
  const safeBranch = rawBranch || {};
  const id = String(safeBranch.id || safeBranch._id || "");
  const businessId = String(safeBranch.businessId || "");

  return {
    id,
    businessId,
    branchName: safeBranch.branchName || "Untitled Branch",
    branchAddress: safeBranch.branchAddress,
    monthlyFeeAmount: safeBranch.monthlyFeeAmount ?? null,
    admissionFeeAmount: safeBranch.admissionFeeAmount ?? null,
    autoDeactivateAfterUnpaidMonths:
      typeof safeBranch.autoDeactivateAfterUnpaidMonths === "number" &&
      Number.isFinite(safeBranch.autoDeactivateAfterUnpaidMonths) &&
      safeBranch.autoDeactivateAfterUnpaidMonths >= 1
        ? Math.floor(safeBranch.autoDeactivateAfterUnpaidMonths)
        : DEFAULT_AUTO_DEACTIVATE_AFTER_UNPAID_MONTHS,
    logo: safeBranch.logo ?? null,
    favicon: safeBranch.favicon ?? null,
    isDefault: Boolean(safeBranch.isDefault),
    isActive: safeBranch.isActive ?? true,
    createdAt: safeBranch.createdAt,
    updatedAt: safeBranch.updatedAt,
  };
};

const normalizeMonthlyFee = (
  rawFee: RawBranchMonthlyFee,
): BranchMonthlyFee => ({
  branchId: String(rawFee.branchId || ""),
  branchName: rawFee.branchName || "Untitled Branch",
  monthlyFeeAmount: rawFee.monthlyFeeAmount ?? null,
});

const normalizeAdmissionFee = (
  rawFee: RawBranchAdmissionFee,
): BranchAdmissionFee => ({
  branchId: String(rawFee.branchId || ""),
  branchName: rawFee.branchName || "Untitled Branch",
  admissionFeeAmount: rawFee.admissionFeeAmount ?? null,
});

const normalizeAutoDeactivationSettings = (
  rawSettings: RawBranchAutoDeactivationSettings,
): BranchAutoDeactivationSettings => ({
  branchId: String(rawSettings.branchId || ""),
  branchName: rawSettings.branchName || "Untitled Branch",
  autoDeactivateAfterUnpaidMonths:
    typeof rawSettings.autoDeactivateAfterUnpaidMonths === "number" &&
    Number.isFinite(rawSettings.autoDeactivateAfterUnpaidMonths) &&
    rawSettings.autoDeactivateAfterUnpaidMonths >= 1
      ? Math.floor(rawSettings.autoDeactivateAfterUnpaidMonths)
      : DEFAULT_AUTO_DEACTIVATE_AFTER_UNPAID_MONTHS,
});

const normalizeStartingBalance = (
  raw: RawBranchStartingBalance,
): BranchStartingBalance => ({
  branchId: String(raw.branchId || ""),
  branchName: raw.branchName || "Untitled Branch",
  startingBalance:
    typeof raw.startingBalance === "number" && Number.isFinite(raw.startingBalance)
      ? raw.startingBalance
      : null,
  startingBalanceSetAt: raw.startingBalanceSetAt ?? null,
});

export const branchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOwnerBranches: builder.query<Branch[], string>({
      query: (businessId) => ({
        url: `/branches/${businessId}/branches`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<RawBranch[]>) => {
        const items = Array.isArray(response.data) ? response.data : [];
        return items.map(normalizeBranch);
      },
      providesTags: (result, _error, businessId) => {
        const baseTags: Array<{ type: "Branch"; id: string }> = [
          { type: "Branch", id: `LIST-${businessId}` },
        ];

        if (!result || result.length === 0) {
          return baseTags;
        }

        return [
          ...baseTags,
          ...result.map((branch) => ({ type: "Branch" as const, id: branch.id })),
        ];
      },
    }),

    getOwnerDefaultBranch: builder.query<Branch, string>({
      query: (businessId) => ({
        url: `/branches/${businessId}/default`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<RawBranch>) => {
        return normalizeBranch(response.data);
      },
      providesTags: (result, _error, businessId) => {
        const defaultTag = { type: "Branch" as const, id: `DEFAULT-${businessId}` };
        if (!result) {
          return [defaultTag];
        }

        return [
          defaultTag,
          { type: "Branch" as const, id: result.id },
        ];
      },
    }),

    createOwnerBranch: builder.mutation<
      Branch,
      { businessId: string; payload: CreateBranchPayload }
    >({
      query: ({ businessId, payload }) => ({
        url: `/branches/${businessId}/branches`,
        method: "POST",
        body: {
          data: payload,
        },
      }),
      transformResponse: (response: ApiSuccessResponse<RawBranch>) => {
        return normalizeBranch(response.data);
      },
      invalidatesTags: (_result, _error, { businessId }) => [
        { type: "Branch", id: `LIST-${businessId}` },
        { type: "Branch", id: `DEFAULT-${businessId}` },
      ],
    }),

    getBranchMonthlyFee: builder.query<BranchMonthlyFee, BranchFeeQueryArgs>({
      query: ({ businessId, branchId }) => ({
        url: `/branches/${businessId}/branches/${branchId}/monthly-fee`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<RawBranchMonthlyFee>) => {
        return normalizeMonthlyFee(response.data);
      },
      providesTags: (_result, _error, { branchId }) => [
        { type: "BranchFee", id: `MONTHLY-${branchId}` },
        { type: "Branch", id: branchId },
      ],
    }),

    updateBranchMonthlyFee: builder.mutation<Branch, UpdateBranchMonthlyFeePayload>({
      query: ({ businessId, branchId, monthlyFeeAmount }) => ({
        url: `/branches/${businessId}/branches/${branchId}/monthly-fee`,
        method: "PATCH",
        body: {
          data: { monthlyFeeAmount },
        },
      }),
      transformResponse: (response: ApiSuccessResponse<RawBranch>) => {
        return normalizeBranch(response.data);
      },
      invalidatesTags: (_result, _error, { businessId, branchId }) => [
        { type: "BranchFee", id: `MONTHLY-${branchId}` },
        { type: "Branch", id: branchId },
        { type: "Branch", id: `LIST-${businessId}` },
        { type: "Branch", id: `DEFAULT-${businessId}` },
      ],
    }),

    getBranchAdmissionFee: builder.query<
      BranchAdmissionFee,
      BranchFeeQueryArgs
    >({
      query: ({ businessId, branchId }) => ({
        url: `/branches/${businessId}/branches/${branchId}/admission-fee`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<RawBranchAdmissionFee>) => {
        return normalizeAdmissionFee(response.data);
      },
      providesTags: (_result, _error, { branchId }) => [
        { type: "BranchFee", id: `ADMISSION-${branchId}` },
        { type: "Branch", id: branchId },
      ],
    }),

    updateBranchAdmissionFee: builder.mutation<
      Branch,
      UpdateBranchAdmissionFeePayload
    >({
      query: ({ businessId, branchId, admissionFeeAmount }) => ({
        url: `/branches/${businessId}/branches/${branchId}/admission-fee`,
        method: "PATCH",
        body: {
          data: { admissionFeeAmount },
        },
      }),
      transformResponse: (response: ApiSuccessResponse<RawBranch>) => {
        return normalizeBranch(response.data);
      },
      invalidatesTags: (_result, _error, { businessId, branchId }) => [
        { type: "BranchFee", id: `ADMISSION-${branchId}` },
        { type: "Branch", id: branchId },
        { type: "Branch", id: `LIST-${businessId}` },
        { type: "Branch", id: `DEFAULT-${businessId}` },
      ],
    }),

    getBranchAutoDeactivationSettings: builder.query<
      BranchAutoDeactivationSettings,
      BranchFeeQueryArgs
    >({
      query: ({ businessId, branchId }) => ({
        url: `/branches/${businessId}/branches/${branchId}/auto-deactivation-settings`,
        method: "GET",
      }),
      transformResponse: (
        response: ApiSuccessResponse<RawBranchAutoDeactivationSettings>,
      ) => {
        return normalizeAutoDeactivationSettings(response.data);
      },
      providesTags: (_result, _error, { branchId }) => [
        { type: "BranchFee", id: `AUTO-DEACTIVATE-${branchId}` },
        { type: "Branch", id: branchId },
      ],
    }),

    updateBranchAutoDeactivationSettings: builder.mutation<
      BranchAutoDeactivationSettings,
      UpdateBranchAutoDeactivationSettingsPayload
    >({
      query: ({ businessId, branchId, autoDeactivateAfterUnpaidMonths }) => ({
        url: `/branches/${businessId}/branches/${branchId}/auto-deactivation-settings`,
        method: "PATCH",
        body: {
          data: { autoDeactivateAfterUnpaidMonths },
        },
      }),
      transformResponse: (
        response: ApiSuccessResponse<RawBranchAutoDeactivationSettings>,
      ) => {
        return normalizeAutoDeactivationSettings(response.data);
      },
      invalidatesTags: (_result, _error, { businessId, branchId }) => [
        { type: "BranchFee", id: `AUTO-DEACTIVATE-${branchId}` },
        { type: "Branch", id: branchId },
        { type: "Branch", id: `LIST-${businessId}` },
        { type: "Branch", id: `DEFAULT-${businessId}` },
      ],
    }),

    getBranchStartingBalance: builder.query<
      BranchStartingBalance,
      BranchFeeQueryArgs
    >({
      query: ({ businessId, branchId }) => ({
        url: `/branches/${businessId}/branches/${branchId}/starting-balance`,
        method: "GET",
      }),
      transformResponse: (
        response: ApiSuccessResponse<RawBranchStartingBalance>,
      ) => {
        return normalizeStartingBalance(response.data);
      },
      providesTags: (_result, _error, { branchId }) => [
        { type: "BranchFee", id: `STARTING-BALANCE-${branchId}` },
        { type: "Branch", id: branchId },
      ],
    }),

    setBranchStartingBalance: builder.mutation<
      BranchStartingBalance,
      SetBranchStartingBalancePayload
    >({
      query: ({ businessId, branchId, startingBalance }) => ({
        url: `/branches/${businessId}/branches/${branchId}/starting-balance`,
        method: "PATCH",
        body: {
          data: { startingBalance },
        },
      }),
      transformResponse: (
        response: ApiSuccessResponse<RawBranchStartingBalance>,
      ) => {
        return normalizeStartingBalance(response.data);
      },
      invalidatesTags: (_result, _error, { businessId, branchId }) => [
        { type: "BranchFee", id: `STARTING-BALANCE-${branchId}` },
        { type: "Branch", id: branchId },
        { type: "Branch", id: `LIST-${businessId}` },
        { type: "Branch", id: `DEFAULT-${businessId}` },
        { type: "Analytics", id: `OVERVIEW-${branchId}` },
      ],
    }),
  }),
});

export const {
  useGetOwnerBranchesQuery,
  useGetOwnerDefaultBranchQuery,
  useLazyGetOwnerDefaultBranchQuery,
  useCreateOwnerBranchMutation,
  useGetBranchMonthlyFeeQuery,
  useUpdateBranchMonthlyFeeMutation,
  useGetBranchAdmissionFeeQuery,
  useUpdateBranchAdmissionFeeMutation,
  useGetBranchAutoDeactivationSettingsQuery,
  useUpdateBranchAutoDeactivationSettingsMutation,
  useGetBranchStartingBalanceQuery,
  useSetBranchStartingBalanceMutation,
} = branchApi;
export type {
  BranchFeeQueryArgs,
  UpdateBranchAdmissionFeePayload,
  UpdateBranchAutoDeactivationSettingsPayload,
  UpdateBranchMonthlyFeePayload,
  SetBranchStartingBalancePayload,
};
