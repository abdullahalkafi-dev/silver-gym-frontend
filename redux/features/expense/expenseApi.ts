import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";
import type {
  Expense,
  ExpenseCategory,
  ExpenseHistory,
  ExpenseSubcategory,
} from "@/types/expense-category";

// ─── Raw shapes from API ──────────────────────────────────────────────────────

type RawSubcategory = {
  _id?: string;
  id?: string;
  branchId?: string;
  categoryId?: string;
  title?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type RawCategory = {
  _id?: string;
  id?: string;
  branchId?: string;
  title?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  subcategories?: RawSubcategory[];
  createdAt?: string;
  updatedAt?: string;
};

type RawExpense = {
  _id?: string;
  id?: string;
  branchId?: string;
  subcategoryId?: string;
  subcategoryTitle?: string;
  categoryId?: string;
  categoryTitle?: string;
  invoiceNo?: string;
  description?: string;
  amount?: number;
  paymentMethod?: string;
  expenseDate?: string;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type RawExpenseHistory = {
  _id?: string;
  id?: string;
  expenseId?: string;
  branchId?: string;
  snapshot?: Record<string, unknown>;
  changedBy?: string;
  changeType?: "update" | "delete";
  changedAt?: string;
};

// ─── Normalized shapes (what frontend uses) ───────────────────────────────────

type ExpenseListResponse = {
  data: Expense[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
  totalAmount?: number;
};

// ─── Normalize helpers ────────────────────────────────────────────────────────

const normalizeSubcategory = (raw: RawSubcategory): ExpenseSubcategory => ({
  id: String(raw.id || raw._id || ""),
  categoryId: String(raw.categoryId || ""),
  title: raw.title || "",
  isActive: raw.isActive ?? true,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const normalizeCategory = (raw: RawCategory): ExpenseCategory => ({
  id: String(raw.id || raw._id || ""),
  branchId: String(raw.branchId || ""),
  title: raw.title || "",
  description: raw.description,
  color: raw.color || "#7C3AED",
  isActive: raw.isActive ?? true,
  subcategories: Array.isArray(raw.subcategories)
    ? raw.subcategories.map(normalizeSubcategory)
    : [],
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const normalizeExpense = (raw: RawExpense): Expense => ({
  id: String(raw.id || raw._id || ""),
  branchId: String(raw.branchId || ""),
  subcategoryId: String(raw.subcategoryId || ""),
  subcategoryTitle: raw.subcategoryTitle || "",
  categoryId: raw.categoryId,
  categoryTitle: raw.categoryTitle || "",
  invoiceNo: raw.invoiceNo || "",
  description: raw.description,
  amount: Number(raw.amount || 0),
  paymentMethod: (raw.paymentMethod as Expense["paymentMethod"]) || "cash",
  expenseDate: raw.expenseDate || "",
  isActive: raw.isActive ?? true,
  createdBy: raw.createdBy,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const normalizeHistory = (raw: RawExpenseHistory): ExpenseHistory => ({
  id: String(raw.id || raw._id || ""),
  expenseId: String(raw.expenseId || ""),
  branchId: String(raw.branchId || ""),
  snapshot: raw.snapshot || {},
  changedBy: raw.changedBy,
  changeType: raw.changeType || "update",
  changedAt: raw.changedAt || "",
});

// ─── Arg types ────────────────────────────────────────────────────────────────

type BranchArg = { branchId: string };

type CategoryMutationArg = BranchArg & {
  payload: { title: string; description?: string; color?: string };
};

type CategoryUpdateArg = CategoryMutationArg & { categoryId: string };

type CategoryDeleteArg = BranchArg & { categoryId: string };

type SubcategoryCreateArg = BranchArg & {
  categoryId: string;
  payload: { title: string };
};

type SubcategoryUpdateArg = BranchArg & {
  subcategoryId: string;
  payload: { title: string };
};

type SubcategoryDeleteArg = BranchArg & { subcategoryId: string };

type ExpenseCreateArg = BranchArg & {
  payload: {
    subcategoryId: string;
    description?: string;
    amount: number;
    paymentMethod: string;
    expenseDate?: string;
  };
};

type ExpenseUpdateArg = BranchArg & {
  expenseId: string;
  payload: {
    description?: string;
    amount?: number;
    paymentMethod?: string;
    expenseDate?: string;
  };
};

type ExpenseDeleteArg = BranchArg & { expenseId: string };

type ExpenseHistoryArg = BranchArg & { expenseId: string };

type ExpenseQueryArg = BranchArg & {
  searchTerm?: string;
  subcategoryId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

// ─── API Slice ────────────────────────────────────────────────────────────────

export const expenseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Categories ──────────────────────────────────────────────────────────

    getCategoriesByBranch: builder.query<ExpenseCategory[], BranchArg>({
      query: ({ branchId }) => ({
        url: `/expenses/${branchId}/categories`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<RawCategory[]>) =>
        Array.isArray(response.data)
          ? response.data.map(normalizeCategory)
          : [],
      providesTags: (_result, _error, { branchId }) => [
        { type: "ExpenseCategory", id: `LIST-${branchId}` },
      ],
    }),

    createExpenseCategory: builder.mutation<ExpenseCategory, CategoryMutationArg>({
      query: ({ branchId, payload }) => ({
        url: `/expenses/${branchId}/categories`,
        method: "POST",
        body: { data: payload },
      }),
      transformResponse: (response: ApiSuccessResponse<RawCategory>) =>
        normalizeCategory(response.data),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "ExpenseCategory", id: `LIST-${branchId}` },
      ],
    }),

    updateExpenseCategory: builder.mutation<ExpenseCategory, CategoryUpdateArg>({
      query: ({ branchId, categoryId, payload }) => ({
        url: `/expenses/${branchId}/categories/${categoryId}`,
        method: "PATCH",
        body: { data: payload },
      }),
      transformResponse: (response: ApiSuccessResponse<RawCategory>) =>
        normalizeCategory(response.data),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "ExpenseCategory", id: `LIST-${branchId}` },
      ],
    }),

    deleteExpenseCategory: builder.mutation<void, CategoryDeleteArg>({
      query: ({ branchId, categoryId }) => ({
        url: `/expenses/${branchId}/categories/${categoryId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "ExpenseCategory", id: `LIST-${branchId}` },
      ],
    }),

    // ── Subcategories ────────────────────────────────────────────────────────

    createExpenseSubcategory: builder.mutation<ExpenseSubcategory, SubcategoryCreateArg>({
      query: ({ branchId, categoryId, payload }) => ({
        url: `/expenses/${branchId}/categories/${categoryId}/subcategories`,
        method: "POST",
        body: { data: payload },
      }),
      transformResponse: (response: ApiSuccessResponse<RawSubcategory>) =>
        normalizeSubcategory(response.data),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "ExpenseCategory", id: `LIST-${branchId}` },
      ],
    }),

    updateExpenseSubcategory: builder.mutation<ExpenseSubcategory, SubcategoryUpdateArg>({
      query: ({ branchId, subcategoryId, payload }) => ({
        url: `/expenses/${branchId}/subcategories/${subcategoryId}`,
        method: "PATCH",
        body: { data: payload },
      }),
      transformResponse: (response: ApiSuccessResponse<RawSubcategory>) =>
        normalizeSubcategory(response.data),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "ExpenseCategory", id: `LIST-${branchId}` },
      ],
    }),

    deleteExpenseSubcategory: builder.mutation<void, SubcategoryDeleteArg>({
      query: ({ branchId, subcategoryId }) => ({
        url: `/expenses/${branchId}/subcategories/${subcategoryId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "ExpenseCategory", id: `LIST-${branchId}` },
      ],
    }),

    // ── Expenses ─────────────────────────────────────────────────────────────

    getExpensesByBranch: builder.query<ExpenseListResponse, ExpenseQueryArg>({
      query: ({ branchId, ...params }) => ({
        url: `/expenses/${branchId}`,
        method: "GET",
        params,
      }),
      transformResponse: (
        response: ApiSuccessResponse<RawExpense[]> & {
          meta?: ExpenseListResponse["meta"];
          totalAmount?: number;
        },
      ) => ({
        data: Array.isArray(response.data)
          ? response.data.map(normalizeExpense)
          : [],
        meta: response.meta ?? { page: 1, limit: 20, total: 0, totalPage: 0 },
        totalAmount: response.totalAmount ?? 0,
      }),
      providesTags: (_result, _error, { branchId }) => [
        { type: "Expense", id: `LIST-${branchId}` },
      ],
    }),

    createExpense: builder.mutation<Expense, ExpenseCreateArg>({
      query: ({ branchId, payload }) => ({
        url: `/expenses/${branchId}`,
        method: "POST",
        body: { data: payload },
      }),
      transformResponse: (response: ApiSuccessResponse<RawExpense>) =>
        normalizeExpense(response.data),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "Expense", id: `LIST-${branchId}` },
      ],
    }),

    updateExpense: builder.mutation<Expense, ExpenseUpdateArg>({
      query: ({ branchId, expenseId, payload }) => ({
        url: `/expenses/${branchId}/${expenseId}`,
        method: "PATCH",
        body: { data: payload },
      }),
      transformResponse: (response: ApiSuccessResponse<RawExpense>) =>
        normalizeExpense(response.data),
      invalidatesTags: (_result, _error, { branchId, expenseId }) => [
        { type: "Expense", id: `LIST-${branchId}` },
        { type: "Expense", id: expenseId },
      ],
    }),

    deleteExpense: builder.mutation<void, ExpenseDeleteArg>({
      query: ({ branchId, expenseId }) => ({
        url: `/expenses/${branchId}/${expenseId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { branchId }) => [
        { type: "Expense", id: `LIST-${branchId}` },
      ],
    }),

    getExpenseHistory: builder.query<ExpenseHistory[], ExpenseHistoryArg>({
      query: ({ branchId, expenseId }) => ({
        url: `/expenses/${branchId}/${expenseId}/history`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<RawExpenseHistory[]>) =>
        Array.isArray(response.data)
          ? response.data.map(normalizeHistory)
          : [],
    }),
  }),
});

export const {
  useGetCategoriesByBranchQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useCreateExpenseSubcategoryMutation,
  useUpdateExpenseSubcategoryMutation,
  useDeleteExpenseSubcategoryMutation,
  useGetExpensesByBranchQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpenseHistoryQuery,
} = expenseApi;
