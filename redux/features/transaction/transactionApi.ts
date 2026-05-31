import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionItem = {
  id: string;
  invoiceNo: string;
  date: string;
  dateISO: string;
  type: "income" | "expense";
  category: string;
  description: string;
  memberId: string | null;
  memberCustomId: string | null;
  paymentMethod: string;
  amount: number;
};

export type TransactionWithBalance = TransactionItem & {
  runningBalance: number;
};

export type DayBalanceGroup = {
  date: string;
  dateISO: string;
  openingBalance: number;
  closingBalance: number;
  isToday: boolean;
  transactions: TransactionWithBalance[];
};

export type TransactionBalanceResponse = {
  data: DayBalanceGroup[];
  openingBalance: number;
  closingBalance: number;
};

type TransactionMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
};

type TransactionListResponse = {
  data: TransactionItem[];
  meta: TransactionMeta;
};

type GetTransactionsParams = {
  branchId: string;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
};

type GetTransactionsBalanceParams = {
  branchId: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  paymentMethod?: string;
};

// ─── Normalize helper ─────────────────────────────────────────────────────────

const normalizeTransaction = (raw: Record<string, unknown>): TransactionItem => ({
  id: String(raw.id || raw._id || ""),
  invoiceNo: String(raw.invoiceNo || ""),
  date: String(raw.date || ""),
  dateISO: String(raw.dateISO || ""),
  type: (raw.type as "income" | "expense") || "income",
  category: String(raw.category || ""),
  description: String(raw.description || ""),
  memberId: raw.memberId ? String(raw.memberId) : null,
  memberCustomId: raw.memberCustomId ? String(raw.memberCustomId) : null,
  paymentMethod: String(raw.paymentMethod || ""),
  amount: Number(raw.amount || 0),
});

// ─── API slice ────────────────────────────────────────────────────────────────

const transactionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTransactionsByBranch: builder.query<TransactionListResponse, GetTransactionsParams>({
      query: ({ branchId, ...params }) => ({
        url: `/transactions/${branchId}`,
        params,
      }),
      transformResponse: (
        response: ApiSuccessResponse<TransactionItem[]> & { meta?: TransactionMeta },
      ): TransactionListResponse => {
        const rawItems = response.data ?? [];
        const items = rawItems.map((item) =>
          normalizeTransaction(item as unknown as Record<string, unknown>),
        );

        return {
          data: items,
          meta: response.meta ?? {
            page: 1,
            limit: 20,
            total: items.length,
            totalPage: 1,
          },
        };
      },
      providesTags: (_result, _err, { branchId }) => [
        { type: "Payment", id: `LIST-${branchId}` },
        { type: "Expense", id: `LIST-${branchId}` },
      ],
    }),
    getTransactionsWithBalance: builder.query<TransactionBalanceResponse, GetTransactionsBalanceParams>({
      query: ({ branchId, ...params }) => ({
        url: `/transactions/${branchId}/balance`,
        params,
      }),
      transformResponse: (
        response: ApiSuccessResponse<DayBalanceGroup[]> & {
          openingBalance?: number;
          closingBalance?: number;
        },
      ): TransactionBalanceResponse => {
        const rawDays = response.data ?? [];
        const days = rawDays.map((day) => ({
          ...day,
          transactions: day.transactions.map((t) =>
            normalizeTransaction(t as unknown as Record<string, unknown>) as TransactionWithBalance,
          ),
        }));

        return {
          data: days,
          openingBalance: response.openingBalance ?? 0,
          closingBalance: response.closingBalance ?? 0,
        };
      },
      providesTags: (_result, _err, { branchId }) => [
        { type: "Payment", id: `BALANCE-${branchId}` },
        { type: "Expense", id: `BALANCE-${branchId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTransactionsByBranchQuery,
  useGetTransactionsWithBalanceQuery,
} = transactionApi;
