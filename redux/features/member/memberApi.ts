import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import { resolveUploadAssetUrl } from "@/lib/assetUrl";
import type {
  BackendMember,
  BackendPaymentRecord,
  CollectBillContext,
  CollectBillPayload,
  CollectBillResult,
  MemberListMeta,
  MemberListResponse,
  MemberPaymentHistoryArgs,
  MemberQueryArgs,
  CreateMemberPayload,
  DashboardMemberSummary,
  ImportBatch,
  PaymentRecord,
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

type RawPayment = Record<string, unknown> & {
  _id?: string;
  id?: string;
  metadata?: Record<string, unknown>;
};

type RawPaymentListResponse = ApiSuccessResponse<RawPayment[]> & {
  meta?: MemberListMeta;
};

type RawDashboardResponse = ApiSuccessResponse<DashboardMemberSummary>;

type RawCollectBillContextResponse = ApiSuccessResponse<{
  member: RawMember;
  billing: Record<string, unknown>;
}>;

type RawCollectBillResponse = ApiSuccessResponse<{
  member: RawMember;
  payment: RawPayment;
  billing: Record<string, unknown>;
}>;

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
  payload: Partial<CreateMemberPayload> & { isActive?: boolean };
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

type CollectBillContextArgs = {
  branchId: string;
  memberId: string;
};

type CollectBillArgs = {
  branchId: string;
  payload: CollectBillPayload;
};

const formatCurrency = (amount?: number) => `৳${(amount ?? 0).toLocaleString()}`;

const formatDateTime = (value?: string) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka",
  });
};

const formatPeriodPoint = (value?: string) => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
};

const formatExactPeriodPoint = (value?: string) => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  package: "Package",
  monthly: "Monthly",
  admission: "Admission",
  registration: "Registration",
  locker: "Locker",
  other: "Other",
};

const normalizePayment = (raw: RawPayment): BackendPaymentRecord => ({
  _id: String(raw._id || raw.id || ""),
  branchId: String(raw.branchId || ""),
  invoiceNo: raw.invoiceNo as string | undefined,
  memberId: raw.memberId as string | undefined,
  memberName: raw.memberName as string | undefined,
  packageId: raw.packageId as string | undefined,
  packageName: raw.packageName as string | undefined,
  paymentType: raw.paymentType as BackendPaymentRecord["paymentType"],
  periodStart: raw.periodStart as string | undefined,
  periodEnd: raw.periodEnd as string | undefined,
  paidMonths: raw.paidMonths as number | undefined,
  year: raw.year as number | undefined,
  subTotal: raw.subTotal as number | undefined,
  discount: raw.discount as number | undefined,
  dueAmount: raw.dueAmount as number | undefined,
  paidTotal: raw.paidTotal as number | undefined,
  billAmount: raw.billAmount as number | undefined,
  admissionFee: raw.admissionFee as number | undefined,
  exchange: raw.exchange as number | undefined,
  paymentMethod: raw.paymentMethod as BackendPaymentRecord["paymentMethod"],
  paymentDate: raw.paymentDate as string | undefined,
  nextPaymentDate: raw.nextPaymentDate as string | undefined,
  status: raw.status as BackendPaymentRecord["status"],
  source: raw.source as string | undefined,
  importBatchId: raw.importBatchId as string | undefined,
  metadata: raw.metadata as Record<string, unknown> | undefined,
  createdAt: raw.createdAt as string | undefined,
  updatedAt: raw.updatedAt as string | undefined,
});

const normalizePaymentRecord = (raw: RawPayment): PaymentRecord => {
  const payment = normalizePayment(raw);
  const metadata = payment.metadata;
  const isImportedOpeningBalance =
    metadata?.entryKind === "opening_import_balance";
  const dueAmount = payment.dueAmount ?? 0;
  const paidTotal = payment.paidTotal ?? 0;
  const billAmount = payment.billAmount ?? paidTotal;
  const startLabel = formatPeriodPoint(payment.periodStart);
  // periodEnd is exclusive (start of next cycle), so subtract 1 day to get the last covered day
  const adjustedPeriodEnd =
    payment.periodEnd
      ? new Date(new Date(payment.periodEnd).getTime() - 24 * 60 * 60 * 1000).toISOString()
      : undefined;
  const endLabel = formatPeriodPoint(adjustedPeriodEnd);
  const exactStartLabel = formatExactPeriodPoint(payment.periodStart);
  const exactEndLabel = formatExactPeriodPoint(adjustedPeriodEnd);
  const isShortTermPackage =
    payment.paymentType === "package" &&
    (payment.packageDurationType === "day" || payment.packageDurationType === "week");

  let month = "—";
  if (isImportedOpeningBalance) {
    month = "Imported opening balance";
  } else if (isShortTermPackage && exactStartLabel && exactEndLabel && exactStartLabel !== exactEndLabel) {
    month = `${exactStartLabel} - ${exactEndLabel}`;
  } else if (isShortTermPackage && exactStartLabel) {
    month = exactStartLabel;
  } else if (startLabel && endLabel && startLabel !== endLabel) {
    month = `${startLabel} - ${endLabel}`;
  } else if (startLabel) {
    month = startLabel;
  } else if ((payment.paidMonths ?? 0) > 1) {
    month = `${payment.paidMonths} months`;
  } else if (payment.nextPaymentDate) {
    month = `Next ${formatPeriodPoint(payment.nextPaymentDate) || "cycle"}`;
  }

  const packageLabel = isImportedOpeningBalance
    ? "Opening Balance"
    : payment.packageName ||
      PAYMENT_TYPE_LABELS[payment.paymentType || ""] ||
      "Other";

  const settledAmount = payment.billAmount ?? 0;
  const receivedAmount = payment.paidTotal ?? 0;
  const amount = isImportedOpeningBalance
    ? dueAmount > 0
      ? `Opening due ${formatCurrency(dueAmount)}`
      : formatCurrency(billAmount)
    : settledAmount > 0
      ? formatCurrency(settledAmount)
      : receivedAmount > 0
        ? formatCurrency(receivedAmount)
      : dueAmount > 0
        ? `Due ${formatCurrency(dueAmount)}`
        : formatCurrency(0);

  let status = "Paid";
  if (payment.status === "cancelled") {
    status = "Cancelled";
  } else if (payment.status === "refunded") {
    status = "Refunded";
  } else if (payment.status === "partial") {
    status = "Partial";
  } else if (dueAmount > 0 || payment.status === "due") {
    status = "Due";
  }

  return {
    id: payment._id,
    dateTime: formatDateTime(payment.paymentDate || payment.createdAt),
    invoiceNo:
      payment.invoiceNo || (isImportedOpeningBalance ? "Imported" : "—"),
    memberId: payment.memberId || "—",
    month,
    package: packageLabel,
    amount,
    status,
    exchange: payment.exchange,
    isImportedOpeningBalance,
  };
};

const normalizeCollectBillDueItem = (raw: Record<string, unknown>) => ({
  ledgerItemId: String(raw.ledgerItemId || raw.key || ""),
  type: String(raw.type || "carry_forward") as CollectBillContext["billing"]["dueBreakdown"][number]["type"],
  label: String(raw.label || "Outstanding due"),
  originalAmount: Number(raw.originalAmount ?? raw.remainingAmount ?? 0),
  remainingAmount: Number(raw.remainingAmount ?? 0),
  dueDate: typeof raw.dueDate === "string" ? raw.dueDate : undefined,
  periodStart: typeof raw.periodStart === "string" ? raw.periodStart : undefined,
  periodEnd: typeof raw.periodEnd === "string" ? raw.periodEnd : undefined,
  packageId: typeof raw.packageId === "string" ? raw.packageId : undefined,
});

const normalizeCollectBillBilling = (
  raw: Record<string, unknown> | undefined,
): CollectBillContext["billing"] => {
  const transitionRaw =
    raw?.transitionToMonthly && typeof raw.transitionToMonthly === "object"
      ? (raw.transitionToMonthly as Record<string, unknown>)
      : undefined;

  return {
    currentDueAmount: Number(raw?.currentDueAmount ?? 0),
    overdueMonths: Number(raw?.overdueMonths ?? 0),
    accruedAmount: Number(raw?.accruedAmount ?? 0),
    monthlyFeeAmount:
      typeof raw?.monthlyFeeAmount === "number"
        ? raw.monthlyFeeAmount
        : undefined,
    branchMonthlyFeeAmount:
      typeof raw?.branchMonthlyFeeAmount === "number"
        ? raw.branchMonthlyFeeAmount
        : undefined,
    nextPaymentDate:
      typeof raw?.nextPaymentDate === "string" ? raw.nextPaymentDate : undefined,
    requiredStartDate:
      typeof raw?.requiredStartDate === "string"
        ? raw.requiredStartDate
        : undefined,
    recommendedStartDate:
      typeof raw?.recommendedStartDate === "string"
        ? raw.recommendedStartDate
        : undefined,
    monthlyStartDate:
      typeof raw?.monthlyStartDate === "string" ? raw.monthlyStartDate : undefined,
    transitionToMonthly: transitionRaw
      ? {
          packageExpiryDate:
            typeof transitionRaw.packageExpiryDate === "string"
              ? transitionRaw.packageExpiryDate
              : undefined,
          suggestedDiscountAmount: Number(
            transitionRaw.suggestedDiscountAmount ?? 0,
          ),
          coveredDaysInAnchorMonth: Number(
            transitionRaw.coveredDaysInAnchorMonth ?? 0,
          ),
          daysInAnchorMonth: Number(transitionRaw.daysInAnchorMonth ?? 0),
        }
      : undefined,
    isActive: raw?.isActive !== false,
    dueBreakdown: Array.isArray(raw?.dueBreakdown)
      ? raw.dueBreakdown
          .filter((item): item is Record<string, unknown> => Boolean(item))
          .map(normalizeCollectBillDueItem)
      : [],
  };
};

const normalizeCollectBillResultBilling = (
  raw: Record<string, unknown> | undefined,
): CollectBillResult["billing"] => ({
  currentDueAmount: Number(raw?.currentDueAmount ?? 0),
  nextPaymentDate:
    typeof raw?.nextPaymentDate === "string" ? raw.nextPaymentDate : undefined,
  monthlyFeeAmount:
    typeof raw?.monthlyFeeAmount === "number"
      ? raw.monthlyFeeAmount
      : undefined,
  overdueMonths: Number(raw?.overdueMonths ?? 0),
  effectiveDuePaymentAmount: Number(raw?.effectiveDuePaymentAmount ?? 0),
  waivedDueAmount: Number(raw?.waivedDueAmount ?? 0),
  waivedDueItemCount: Number(raw?.waivedDueItemCount ?? 0),
  waivedDueLabels: Array.isArray(raw?.waivedDueLabels)
    ? raw.waivedDueLabels.filter(
        (label): label is string => typeof label === "string" && label.length > 0,
      )
    : [],
  discountedCycleAmount: Number(raw?.discountedCycleAmount ?? 0),
  paidDueAmount: Number(raw?.paidDueAmount ?? 0),
  paidDueItemCount: Number(raw?.paidDueItemCount ?? 0),
});

// ─── Normalizer ─────────────────────────────────────────────────────

/**
 * The backend occasionally returns a raw Mongoose document where the persisted
 * fields live inside `_doc` and a few computed fields (e.g. currentDueAmount)
 * are hoisted to the top level.  Unwrap that structure so the rest of the
 * normalizer can work against a plain object.
 */
const unwrapMongooseDoc = (raw: RawMember): RawMember => {
  if (raw._doc && typeof raw._doc === "object") {
    const doc = raw._doc as RawMember;
    // Prefer top-level computed values when they exist
    const topLevelOverrides: Partial<RawMember> = {};
    for (const key of ["currentDueAmount", "nextPaymentDate", "metadata"] as const) {
      if (raw[key] !== undefined) topLevelOverrides[key] = raw[key];
    }
    return { ...doc, ...topLevelOverrides };
  }
  return raw;
};

const normalizeMember = (raw: RawMember): BackendMember => {
  const r = unwrapMongooseDoc(raw);

  const rawPhoto = r.photo as string | undefined;
  const photo = resolveUploadAssetUrl(rawPhoto);

  return {
    _id: String(r._id || r.id || ""),
    branchId: String(r.branchId || ""),
    systemMemberId: r.systemMemberId as number | undefined,
    memberId: r.memberId as string | undefined,
    barcode: r.barcode as string | undefined,
    fullName: (r.fullName as string) || "Unknown",
    contact: r.contact as string | undefined,
    email: r.email as string | undefined,
    dateOfBirth: r.dateOfBirth as string | undefined,
    country: r.country as string | undefined,
    nid: r.nid as string | undefined,
    gender: r.gender as string | undefined,
    bloodGroup: r.bloodGroup as string | undefined,
    height: r.height as number | undefined,
    heightUnit: r.heightUnit as BackendMember["heightUnit"],
    weight: r.weight as number | undefined,
    weightUnit: r.weightUnit as BackendMember["weightUnit"],
    address: r.address as string | undefined,
    photo: photo,
    emergencyContact: r.emergencyContact as BackendMember["emergencyContact"],
    trainingGoals: r.trainingGoals as BackendMember["trainingGoals"],
    currentPackageId: r.currentPackageId as string | undefined,
    currentPackageName: r.currentPackageName as string | undefined,
    membershipStartDate: r.membershipStartDate as string | undefined,
    membershipEndDate: r.membershipEndDate as string | undefined,
    nextPaymentDate: r.nextPaymentDate as string | undefined,
    isActive: r.isActive as boolean | undefined,
    isCustomMonthlyFee: r.isCustomMonthlyFee as boolean | undefined,
    customMonthlyFeeAmount: r.customMonthlyFeeAmount as number | undefined,
    paidMonths: r.paidMonths as number | undefined,
    currentDueAmount: r.currentDueAmount as number | undefined,
    source: r.source as string | undefined,
    importBatchId: r.importBatchId as string | undefined,
    createdAt: r.createdAt as string | undefined,
    updatedAt: r.updatedAt as string | undefined,
  };
};

// ─── API slice ──────────────────────────────────────────────────────

export const memberApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── List members ────────────────────────────────────────────────
    getBranchMembers: builder.query<MemberListResponse, MemberQueryArgs>({
      query: ({
        branchId,
        searchTerm,
        isActive,
        includeInactive,
        paymentStatus,
        billingPlan,
        page,
        limit,
        sort,
      }) => ({
        url: `/members/${branchId}`,
        method: "GET",
        params: {
          ...(searchTerm ? { searchTerm } : {}),
          ...(typeof isActive !== "undefined" ? { isActive } : {}),
          ...(typeof includeInactive !== "undefined" ? { includeInactive } : {}),
          ...(typeof paymentStatus !== "undefined" ? { paymentStatus } : {}),
          ...(typeof billingPlan !== "undefined" ? { billingPlan } : {}),
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

    getMemberPaymentHistory: builder.query<PaymentRecord[], MemberPaymentHistoryArgs>({
      query: ({ branchId, memberId, limit = 50 }) => ({
        url: `/payments/${branchId}`,
        method: "GET",
        params: {
          memberId,
          limit: String(limit),
        },
      }),
      transformResponse: (response: RawPaymentListResponse) =>
        Array.isArray(response.data)
          ? response.data.map(normalizePaymentRecord)
          : [],
      providesTags: (_result, _error, { branchId, memberId }) => [
        { type: "Payment", id: `LIST-${branchId}` },
        { type: "Payment", id: `MEMBER-${memberId}` },
      ],
    }),

    getCollectBillContext: builder.query<CollectBillContext, CollectBillContextArgs>({
      query: ({ branchId, memberId }) => ({
        url: `/payments/${branchId}/collect-bill/${memberId}`,
        method: "GET",
      }),
      transformResponse: (response: RawCollectBillContextResponse) => ({
        member: normalizeMember(response.data.member),
        billing: normalizeCollectBillBilling(response.data.billing),
      }),
      providesTags: (_result, _error, { memberId }) => [
        { type: "Member", id: memberId },
      ],
    }),

    collectBill: builder.mutation<CollectBillResult, CollectBillArgs>({
      query: ({ branchId, payload }) => ({
        url: `/payments/${branchId}/collect-bill`,
        method: "POST",
        body: { data: payload },
      }),
      transformResponse: (response: RawCollectBillResponse) => ({
        member: normalizeMember(response.data.member),
        payment: normalizePayment(response.data.payment),
        billing: normalizeCollectBillResultBilling(response.data.billing),
      }),
      invalidatesTags: (_result, _error, { branchId, payload }) => [
        { type: "Member", id: `LIST-${branchId}` },
        { type: "Member", id: `SUMMARY-${branchId}` },
        { type: "Member", id: payload.memberId },
        { type: "Payment", id: `LIST-${branchId}` },
        { type: "Payment", id: `MEMBER-${payload.memberId}` },
        { type: "Analytics" },
      ],
    }),

    // ── Create member ───────────────────────────────────────────────
    createMember: builder.mutation<
      BackendMember & { invoiceNo?: string },
      CreateMemberArgs
    >({
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
      transformResponse: (response: RawSingleMemberResponse) => ({
        ...normalizeMember(response.data.member),
        invoiceNo: (response.data.payment as Record<string, unknown>)
          ?.invoiceNo as string | undefined,
      }),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "Member", id: `LIST-${branchId}` },
        { type: "Payment", id: `LIST-${branchId}` },
        { type: "Analytics" },
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
        { type: "Analytics" },
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
        { type: "Analytics" },
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
        { type: "Analytics" },
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
        { type: "Payment", id: `LIST-${branchId}` },
        { type: "Analytics" },
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
  useGetMemberPaymentHistoryQuery,
  useGetCollectBillContextQuery,
  useCollectBillMutation,
  useCreateMemberMutation,
  useUpdateMemberMutation,
  useDeleteMemberMutation,
  useRestoreMemberMutation,
  useImportCSVMutation,
  useGetImportBatchStatusQuery,
  useGetImportBatchesQuery,
  useGetDashboardSummaryQuery,
} = memberApi;
