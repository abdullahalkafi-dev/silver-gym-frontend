// redux/features/payment/paymentApi.ts
import { baseApi } from "@/redux/api/baseApi";

export interface Payment {
  id: string;
  branchId: string;
  invoiceNo?: string;
  memberId?: string;
  memberSystemId?: number;
  memberFacingId?: string;
  memberName?: string;
  packageId?: string;
  packageName?: string;
  paymentType?: string;
  paidTotal?: number;
  subTotal?: number;
  discount?: number;
  dueAmount?: number;
  admissionFee?: number;
  paymentMethod?: string;
  paymentDate?: string;
  nextPaymentDate?: string;
  status?: string;
  periodStart?: string;
  periodEnd?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface GetPaymentsArgs {
  branchId: string;
  searchTerm?: string;
  paymentType?: string;
  paymentMethod?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

interface GetPaymentsResponse {
  data: Payment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentsByBranch: builder.query<GetPaymentsResponse, GetPaymentsArgs>({
      query: ({ branchId, ...params }) => {
        const cleanParams: Record<string, string> = {};
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") {
            cleanParams[k] = String(v);
          }
        });
        return {
          url: `/payments/${branchId}`,
          params: cleanParams,
        };
      },
      transformResponse: (raw: {
        data: Array<Record<string, unknown>>;
        meta: GetPaymentsResponse["meta"];
      }) => ({
        data: (raw.data ?? []).map((p) => ({
          ...(p as Omit<Payment, "id">),
          id: String(p._id ?? p.id ?? ""),
        })) as Payment[],
        meta: raw.meta,
      }),
      providesTags: (_result, _err, { branchId }) => [
        { type: "Payment", id: `LIST-${branchId}` },
      ],
    }),
  }),
});

export const { useGetPaymentsByBranchQuery } = paymentApi;
