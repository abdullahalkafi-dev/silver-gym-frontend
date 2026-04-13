import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import type { Branch, CreateBranchPayload } from "@/types/branch";

type RawBranch = {
  _id?: string;
  id?: string;
  businessId?: string;
  branchName?: string;
  branchAddress?: string;
  monthlyFeeAmount?: number | null;
  logo?: string | null;
  favicon?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const normalizeBranch = (rawBranch: RawBranch): Branch => {
  const id = String(rawBranch.id || rawBranch._id || "");
  const businessId = String(rawBranch.businessId || "");

  return {
    id,
    businessId,
    branchName: rawBranch.branchName || "Untitled Branch",
    branchAddress: rawBranch.branchAddress,
    monthlyFeeAmount: rawBranch.monthlyFeeAmount ?? null,
    logo: rawBranch.logo ?? null,
    favicon: rawBranch.favicon ?? null,
    isDefault: Boolean(rawBranch.isDefault),
    isActive: rawBranch.isActive ?? true,
    createdAt: rawBranch.createdAt,
    updatedAt: rawBranch.updatedAt,
  };
};

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
  }),
});

export const {
  useGetOwnerBranchesQuery,
  useGetOwnerDefaultBranchQuery,
  useLazyGetOwnerDefaultBranchQuery,
  useCreateOwnerBranchMutation,
} = branchApi;
