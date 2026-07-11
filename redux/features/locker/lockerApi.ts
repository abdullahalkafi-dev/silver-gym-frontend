import { baseApi } from "@/redux/api/baseApi";
import type {
  Locker,
  LockerStats,
  LockerPayment,
  CreateLockersPayload,
  SetPricePayload,
  AssignMemberPayload,
  CollectPaymentPayload,
} from "@/types/locker";
import type { BranchLockerFee } from "@/types/branch";

type RawLocker = Record<string, unknown>;

const normalizeLocker = (raw: RawLocker): Locker => ({
  id: String(raw.id || raw._id || ""),
  branchId: String(raw.branchId || ""),
  lockerNumber: Number(raw.lockerNumber || 0),
  status: (raw.status as Locker["status"]) || "available",
  isCustomPrice: Boolean(raw.isCustomPrice),
  customPrice: raw.customPrice != null ? Number(raw.customPrice) : 0,
  assignedMemberId: (raw.assignedMemberId as string) || null,
  assignedMemberName: (raw.assignedMemberName as string) || null,
  assignedMemberCode: (raw.assignedMemberCode as string) || null,
  assignedAt: (raw.assignedAt as string) || null,
  nextBillingDate: (raw.nextBillingDate as string) || null,
  isDeleted: Boolean(raw.isDeleted),
  deletedAt: (raw.deletedAt as string) || null,
  createdAt: String(raw.createdAt || ""),
  updatedAt: String(raw.updatedAt || ""),
});

const normalizePayment = (raw: Record<string, unknown>): LockerPayment => ({
  _id: String(raw._id || raw.id || ""),
  id: String(raw.id || raw._id || ""),
  branchId: String(raw.branchId || ""),
  invoiceNo: String(raw.invoiceNo || ""),
  memberId: String(raw.memberId || ""),
  memberName: String(raw.memberName || ""),
  paymentType: String(raw.paymentType || ""),
  periodStart: String(raw.periodStart || ""),
  periodEnd: String(raw.periodEnd || ""),
  paidMonths: Number(raw.paidMonths || 0),
  subTotal: Number(raw.subTotal || 0),
  discount: Number(raw.discount || 0),
  billAmount: Number(raw.billAmount || 0),
  dueAmount: Number(raw.dueAmount || 0),
  paidTotal: Number(raw.paidTotal || 0),
  exchange: Number(raw.exchange || 0),
  paymentMethod: String(raw.paymentMethod || ""),
  paymentDate: String(raw.paymentDate || ""),
  nextPaymentDate: String(raw.nextPaymentDate || ""),
  status: String(raw.status || ""),
  source: String(raw.source || ""),
  metadata: (raw.metadata as LockerPayment["metadata"]) || {
    lockerId: "",
    lockerNumber: 0,
    isCustomPrice: false,
    months: 0,
  },
});

type BranchArg = { branchId: string };
type LockerArg = BranchArg & { lockerId: string };

export const lockerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLockers: builder.query<Locker[], BranchArg & { status?: string; search?: string }>({
      query: ({ branchId, ...params }) => ({
        url: `/lockers/${branchId}`,
        method: "GET",
        params,
      }),
      transformResponse: (response: { data: RawLocker[] }) =>
        response.data.map(normalizeLocker),
      providesTags: (_result, _error, { branchId }) => [
        { type: "Locker", id: `LIST-${branchId}` },
      ],
    }),

    getLockerStats: builder.query<LockerStats, BranchArg>({
      query: ({ branchId }) => ({
        url: `/lockers/${branchId}/stats`,
        method: "GET",
      }),
      transformResponse: (response: { data: LockerStats }) => response.data,
      providesTags: (_result, _error, { branchId }) => [
        { type: "Locker", id: `STATS-${branchId}` },
      ],
    }),

    getLockerById: builder.query<Locker, LockerArg>({
      query: ({ branchId, lockerId }) => ({
        url: `/lockers/${branchId}/${lockerId}`,
        method: "GET",
      }),
      transformResponse: (response: { data: RawLocker }) =>
        normalizeLocker(response.data),
      providesTags: (_result, _error, { lockerId }) => [
        { type: "Locker", id: lockerId },
      ],
    }),

    createLockers: builder.mutation<Locker[], BranchArg & { payload: CreateLockersPayload }>({
      query: ({ branchId, payload }) => ({
        url: `/lockers/${branchId}`,
        method: "POST",
        body: { data: payload },
      }),
      transformResponse: (response: { data: RawLocker[] }) =>
        response.data.map(normalizeLocker),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "Locker", id: `LIST-${branchId}` },
        { type: "Locker", id: `STATS-${branchId}` },
      ],
    }),

    updateLocker: builder.mutation<Locker, LockerArg & { payload: { status?: string; lockerNumber?: number } }>({
      query: ({ branchId, lockerId, payload }) => ({
        url: `/lockers/${branchId}/${lockerId}`,
        method: "PATCH",
        body: { data: payload },
      }),
      transformResponse: (response: { data: RawLocker }) =>
        normalizeLocker(response.data),
      invalidatesTags: (_result, _error, { branchId, lockerId }) => [
        { type: "Locker", id: `LIST-${branchId}` },
        { type: "Locker", id: `STATS-${branchId}` },
        { type: "Locker", id: lockerId },
      ],
    }),

    deleteLocker: builder.mutation<void, LockerArg>({
      query: ({ branchId, lockerId }) => ({
        url: `/lockers/${branchId}/${lockerId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "Locker", id: `LIST-${branchId}` },
        { type: "Locker", id: `STATS-${branchId}` },
      ],
    }),

    setBranchLockerPrice: builder.mutation<void, BranchArg & { payload: SetPricePayload }>({
      query: ({ branchId, payload }) => ({
        url: `/lockers/${branchId}/pricing`,
        method: "PATCH",
        body: { data: payload },
      }),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "Locker", id: `LIST-${branchId}` },
        { type: "Locker", id: `STATS-${branchId}` },
        { type: "Branch", id: branchId },
      ],
    }),

    setCustomLockerPrice: builder.mutation<Locker, LockerArg & { payload: SetPricePayload }>({
      query: ({ branchId, lockerId, payload }) => ({
        url: `/lockers/${branchId}/${lockerId}/pricing`,
        method: "PATCH",
        body: { data: payload },
      }),
      transformResponse: (response: { data: RawLocker }) =>
        normalizeLocker(response.data),
      invalidatesTags: (_result, _error, { branchId, lockerId }) => [
        { type: "Locker", id: `LIST-${branchId}` },
        { type: "Locker", id: `STATS-${branchId}` },
        { type: "Locker", id: lockerId },
      ],
    }),

    resetToSystemPrice: builder.mutation<Locker, LockerArg>({
      query: ({ branchId, lockerId }) => ({
        url: `/lockers/${branchId}/${lockerId}/pricing/reset`,
        method: "POST",
      }),
      transformResponse: (response: { data: RawLocker }) =>
        normalizeLocker(response.data),
      invalidatesTags: (_result, _error, { branchId, lockerId }) => [
        { type: "Locker", id: `LIST-${branchId}` },
        { type: "Locker", id: `STATS-${branchId}` },
        { type: "Locker", id: lockerId },
      ],
    }),

    assignMember: builder.mutation<
      { locker: Locker; payment: LockerPayment },
      LockerArg & { payload: AssignMemberPayload }
    >({
      query: ({ branchId, lockerId, payload }) => ({
        url: `/lockers/${branchId}/${lockerId}/assign`,
        method: "POST",
        body: { data: payload },
      }),
      transformResponse: (response: {
        data: { locker: RawLocker; payment: Record<string, unknown> };
      }) => ({
        locker: normalizeLocker(response.data.locker),
        payment: normalizePayment(response.data.payment),
      }),
      invalidatesTags: (_result, _error, { branchId, lockerId }) => [
        { type: "Locker", id: `LIST-${branchId}` },
        { type: "Locker", id: `STATS-${branchId}` },
        { type: "Locker", id: lockerId },
        { type: "Payment" },
        { type: "Transaction" },
      ],
    }),

    collectLockerPayment: builder.mutation<
      { locker: Locker; payment: LockerPayment },
      LockerArg & { payload: CollectPaymentPayload }
    >({
      query: ({ branchId, lockerId, payload }) => ({
        url: `/lockers/${branchId}/${lockerId}/collect`,
        method: "POST",
        body: { data: payload },
      }),
      transformResponse: (response: {
        data: { locker: RawLocker; payment: Record<string, unknown> };
      }) => ({
        locker: normalizeLocker(response.data.locker),
        payment: normalizePayment(response.data.payment),
      }),
      invalidatesTags: (_result, _error, { branchId, lockerId }) => [
        { type: "Locker", id: `LIST-${branchId}` },
        { type: "Locker", id: `STATS-${branchId}` },
        { type: "Locker", id: lockerId },
        { type: "Payment" },
        { type: "Transaction" },
      ],
    }),

    unassignMember: builder.mutation<Locker, LockerArg>({
      query: ({ branchId, lockerId }) => ({
        url: `/lockers/${branchId}/${lockerId}/unassign`,
        method: "POST",
      }),
      transformResponse: (response: { data: RawLocker }) =>
        normalizeLocker(response.data),
      invalidatesTags: (_result, _error, { branchId, lockerId }) => [
        { type: "Locker", id: `LIST-${branchId}` },
        { type: "Locker", id: `STATS-${branchId}` },
        { type: "Locker", id: lockerId },
        { type: "Payment" },
        { type: "Transaction" },
      ],
    }),

    getLockerPaymentHistory: builder.query<LockerPayment[], LockerArg>({
      query: ({ branchId, lockerId }) => ({
        url: `/lockers/${branchId}/${lockerId}/payments`,
        method: "GET",
      }),
      transformResponse: (response: { data: Record<string, unknown>[] }) =>
        response.data.map(normalizePayment),
      providesTags: (_result, _error, { lockerId }) => [
        { type: "Locker", id: `PAYMENTS-${lockerId}` },
      ],
    }),

    getLockerFee: builder.query<BranchLockerFee, { branchId: string }>({
      query: ({ branchId }) => ({
        url: `/lockers/${branchId}/fee`,
        method: "GET",
      }),
      transformResponse: (response: { data: Record<string, unknown> }) => ({
        branchId: String(response.data.branchId || ""),
        branchName: String(response.data.branchName || ""),
        lockerFeeAmount:
          typeof response.data.lockerFeeAmount === "number"
            ? response.data.lockerFeeAmount
            : null,
      }),
      providesTags: (_result, _error, { branchId }) => [
        { type: "Branch", id: branchId },
      ],
    }),
  }),
});

export const {
  useGetLockersQuery,
  useGetLockerStatsQuery,
  useGetLockerByIdQuery,
  useCreateLockersMutation,
  useUpdateLockerMutation,
  useDeleteLockerMutation,
  useSetBranchLockerPriceMutation,
  useSetCustomLockerPriceMutation,
  useResetToSystemPriceMutation,
  useAssignMemberMutation,
  useCollectLockerPaymentMutation,
  useUnassignMemberMutation,
  useGetLockerPaymentHistoryQuery,
  useGetLockerFeeQuery,
} = lockerApi;
