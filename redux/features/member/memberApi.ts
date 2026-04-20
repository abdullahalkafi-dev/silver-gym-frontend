import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import type {
  BackendMember,
  MemberListMeta,
  MemberListResponse,
  MemberQueryArgs,
  CreateMemberPayload,
  DashboardMemberSummary,
  ImportBatch,
} from "@/types/member";

// ─── Raw API response shapes ────────────────────────────────────────

type RawMember = Record<string, unknown> & {
  _id?: string;
  id?: string;
};

type RawMemberListResponse = ApiSuccessResponse<{
  meta: MemberListMeta;
  data: RawMember[];
}>;

type RawSingleMemberResponse = ApiSuccessResponse<{
  member: RawMember;
  payment?: Record<string, unknown>;
}>;

type RawDashboardResponse = ApiSuccessResponse<DashboardMemberSummary>;

type RawImportBatchResponse = ApiSuccessResponse<ImportBatch>;

type RawImportBatchListResponse = ApiSuccessResponse<ImportBatch[]> & {
  meta?: MemberListMeta;
};

// ─── Arg types ──────────────────────────────────────────────────────

type CreateMemberArgs = {
  branchId: string;
  payload: CreateMemberPayload;
  photo?: File;
};

type UpdateMemberArgs = {
  branchId: string;
  memberId: string;
  payload: Partial<CreateMemberPayload>;
  photo?: File;
};

type MemberActionArgs = {
  branchId: string;
  memberId: string;
};

type ImportCSVArgs = {
  branchId: string;
  file: File;
};

type ImportBatchQueryArgs = {
  branchId: string;
  batchId: string;
};

type ImportBatchListArgs = {
  branchId: string;
  page?: number;
  limit?: number;
  status?: string;
};

type DashboardSummaryArgs = {
  branchId: string;
  days?: number;
};

// ─── Normalizer ─────────────────────────────────────────────────────

const normalizeMember = (raw: RawMember): BackendMember => ({
  _id: String(raw._id || raw.id || ""),
  branchId: String(raw.branchId || ""),
  legacyId: raw.legacyId as string | undefined,
  memberId: raw.memberId as string | undefined,
  barcode: raw.barcode as string | undefined,
  fullName: (raw.fullName as string) || "Unknown",
  contact: raw.contact as string | undefined,
  email: raw.email as string | undefined,
  dateOfBirth: raw.dateOfBirth as string | undefined,
  country: raw.country as string | undefined,
  nid: raw.nid as string | undefined,
  gender: raw.gender as string | undefined,
  bloodGroup: raw.bloodGroup as string | undefined,
  height: raw.height as number | undefined,
  heightUnit: raw.heightUnit as BackendMember["heightUnit"],
  weight: raw.weight as number | undefined,
  weightUnit: raw.weightUnit as BackendMember["weightUnit"],
  address: raw.address as string | undefined,
  photo: raw.photo as string | undefined,
  emergencyContact: raw.emergencyContact as BackendMember["emergencyContact"],
  trainingGoals: raw.trainingGoals as BackendMember["trainingGoals"],
  currentPackageId: raw.currentPackageId as string | undefined,
  currentPackageName: raw.currentPackageName as string | undefined,
  membershipStartDate: raw.membershipStartDate as string | undefined,
  membershipEndDate: raw.membershipEndDate as string | undefined,
  nextPaymentDate: raw.nextPaymentDate as string | undefined,
  isActive: raw.isActive as boolean | undefined,
  isCustomMonthlyFee: raw.isCustomMonthlyFee as boolean | undefined,
  customMonthlyFeeAmount: raw.customMonthlyFeeAmount as number | undefined,
  paidMonths: raw.paidMonths as number | undefined,
  currentDueAmount: raw.currentDueAmount as number | undefined,
  source: raw.source as string | undefined,
  importBatchId: raw.importBatchId as string | undefined,
  createdAt: raw.createdAt as string | undefined,
  updatedAt: raw.updatedAt as string | undefined,
});

// ─── API slice ──────────────────────────────────────────────────────

export const memberApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── List members ────────────────────────────────────────────────
    getBranchMembers: builder.query<MemberListResponse, MemberQueryArgs>({
      query: ({ branchId, searchTerm, isActive, includeInactive, page, limit, sort }) => ({
        url: `/members/${branchId}`,
        method: "GET",
        params: {
          ...(searchTerm ? { searchTerm } : {}),
          ...(isActive ? { isActive } : {}),
          ...(includeInactive ? { includeInactive } : {}),
          ...(page ? { page: String(page) } : {}),
          ...(limit ? { limit: String(limit) } : {}),
          sort: sort || "-createdAt",
        },
      }),
      transformResponse: (response: RawMemberListResponse) => ({
        data: Array.isArray(response.data?.data)
          ? response.data.data.map(normalizeMember)
          : [],
        meta: response.data?.meta,
      }),
      providesTags: (result, _error, { branchId }) => {
        const baseTags: Array<{ type: "Member"; id: string }> = [
          { type: "Member", id: `LIST-${branchId}` },
        ];
        if (!result?.data.length) return baseTags;
        return [
          ...baseTags,
          ...result.data.map((m) => ({ type: "Member" as const, id: m._id })),
        ];
      },
    }),

    // ── Get single member ───────────────────────────────────────────
    getMemberById: builder.query<BackendMember, MemberActionArgs>({
      query: ({ branchId, memberId }) => ({
        url: `/members/${branchId}/${memberId}`,
        method: "GET",
        params: { includeInactive: "true" },
      }),
      transformResponse: (response: ApiSuccessResponse<RawMember>) =>
        normalizeMember(response.data),
      providesTags: (_result, _error, { memberId }) => [
        { type: "Member", id: memberId },
      ],
    }),

    // ── Create member ───────────────────────────────────────────────
    createMember: builder.mutation<BackendMember, CreateMemberArgs>({
      query: ({ branchId, payload, photo }) => {
        if (photo) {
          const formData = new FormData();
          formData.append("image", photo);
          formData.append("data", JSON.stringify(payload));
          return {
            url: `/members/${branchId}`,
            method: "POST",
            body: formData,
          };
        }
        return {
          url: `/members/${branchId}`,
          method: "POST",
          body: { data: payload },
        };
      },
      transformResponse: (response: RawSingleMemberResponse) =>
        normalizeMember(response.data.member),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "Member", id: `LIST-${branchId}` },
      ],
    }),

    // ── Update member ───────────────────────────────────────────────
    updateMember: builder.mutation<BackendMember, UpdateMemberArgs>({
      query: ({ branchId, memberId, payload, photo }) => {
        if (photo) {
          const formData = new FormData();
          formData.append("image", photo);
          formData.append("data", JSON.stringify(payload));
          return {
            url: `/members/${branchId}/${memberId}`,
            method: "PATCH",
            body: formData,
          };
        }
        return {
          url: `/members/${branchId}/${memberId}`,
          method: "PATCH",
          body: { data: payload },
        };
      },
      transformResponse: (response: ApiSuccessResponse<RawMember>) =>
        normalizeMember(response.data),
      invalidatesTags: (_result, _error, { branchId, memberId }) => [
        { type: "Member", id: `LIST-${branchId}` },
        { type: "Member", id: memberId },
      ],
    }),

    // ── Delete member (soft) ────────────────────────────────────────
    deleteMember: builder.mutation<BackendMember, MemberActionArgs>({
      query: ({ branchId, memberId }) => ({
        url: `/members/${branchId}/${memberId}`,
        method: "DELETE",
      }),
      transformResponse: (response: ApiSuccessResponse<RawMember>) =>
        normalizeMember(response.data),
      invalidatesTags: (_result, _error, { branchId, memberId }) => [
        { type: "Member", id: `LIST-${branchId}` },
        { type: "Member", id: memberId },
      ],
    }),

    // ── Restore member ──────────────────────────────────────────────
    restoreMember: builder.mutation<BackendMember, MemberActionArgs>({
      query: ({ branchId, memberId }) => ({
        url: `/members/${branchId}/${memberId}/restore`,
        method: "PATCH",
      }),
      transformResponse: (response: ApiSuccessResponse<RawMember>) =>
        normalizeMember(response.data),
      invalidatesTags: (_result, _error, { branchId, memberId }) => [
        { type: "Member", id: `LIST-${branchId}` },
        { type: "Member", id: memberId },
      ],
    }),

    // ── CSV Import ──────────────────────────────────────────────────
    importCSV: builder.mutation<ImportBatch, ImportCSVArgs>({
      query: ({ branchId, file }) => {
        const formData = new FormData();
        formData.append("csv", file);
        return {
          url: `/members/import/${branchId}/csv`,
          method: "POST",
          body: formData,
        };
      },
      transformResponse: (response: RawImportBatchResponse) => response.data,
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "Member", id: `LIST-${branchId}` },
      ],
    }),

    // ── Import batch status ─────────────────────────────────────────
    getImportBatchStatus: builder.query<ImportBatch, ImportBatchQueryArgs>({
      query: ({ branchId, batchId }) => ({
        url: `/members/import/${branchId}/batches/${batchId}`,
        method: "GET",
      }),
      transformResponse: (response: RawImportBatchResponse) => response.data,
    }),

    // ── List import batches ─────────────────────────────────────────
    getImportBatches: builder.query<{ data: ImportBatch[]; meta?: MemberListMeta }, ImportBatchListArgs>({
      query: ({ branchId, page, limit, status }) => ({
        url: `/members/import/${branchId}/batches`,
        method: "GET",
        params: {
          ...(page ? { page: String(page) } : {}),
          ...(limit ? { limit: String(limit) } : {}),
          ...(status ? { status } : {}),
        },
      }),
      transformResponse: (response: RawImportBatchListResponse) => ({
        data: Array.isArray(response.data) ? response.data : [],
        meta: response.meta,
      }),
    }),

    // ── Dashboard summary ───────────────────────────────────────────
    getDashboardSummary: builder.query<DashboardMemberSummary, DashboardSummaryArgs>({
      query: ({ branchId, days }) => ({
        url: `/members/import/${branchId}/dashboard-summary`,
        method: "GET",
        params: days ? { days: String(days) } : {},
      }),
      transformResponse: (response: RawDashboardResponse) => response.data,
      providesTags: (_result, _error, { branchId }) => [
        { type: "Member", id: `SUMMARY-${branchId}` },
      ],
    }),
  }),
});

export const {
  useGetBranchMembersQuery,
  useGetMemberByIdQuery,
  useCreateMemberMutation,
  useUpdateMemberMutation,
  useDeleteMemberMutation,
  useRestoreMemberMutation,
  useImportCSVMutation,
  useGetImportBatchStatusQuery,
  useGetImportBatchesQuery,
  useGetDashboardSummaryQuery,
} = memberApi;
