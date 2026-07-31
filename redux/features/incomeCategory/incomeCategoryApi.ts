// redux/features/incomeCategory/incomeCategoryApi.ts
import { baseApi } from "@/redux/api/baseApi";

export interface IncomeCategory {
  _id: string;
  branchId: string;
  title: string;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIncomeCategoryPayload {
  title: string;
  description?: string;
  color?: string;
}

export interface UpdateIncomeCategoryPayload {
  title?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

const incomeCategoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getIncomeCategories: builder.query<IncomeCategory[], { branchId: string; includeInactive?: boolean }>({
      query: ({ branchId, includeInactive }) => ({
        url: `/income-categories/${branchId}`,
        params: includeInactive ? { includeInactive: "true" } : undefined,
      }),
      transformResponse: (res: { data: IncomeCategory[] }) => res.data ?? [],
      providesTags: (_res, _err, { branchId }) => [{ type: "IncomeCategory", id: `LIST-${branchId}` }],
    }),

    createIncomeCategory: builder.mutation<IncomeCategory, { branchId: string; payload: CreateIncomeCategoryPayload }>({
      query: ({ branchId, payload }) => ({
        url: `/income-categories/${branchId}`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (_res, _err, { branchId }) => [
        { type: "IncomeCategory", id: `LIST-${branchId}` },
        { type: "Payment", id: `LIST-${branchId}` },
        { type: "Analytics" },
        { type: "Transaction" },
      ],
    }),

    updateIncomeCategory: builder.mutation<IncomeCategory, { branchId: string; categoryId: string; payload: UpdateIncomeCategoryPayload }>({
      query: ({ branchId, categoryId, payload }) => ({
        url: `/income-categories/${branchId}/${categoryId}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: (_res, _err, { branchId }) => [
        { type: "IncomeCategory", id: `LIST-${branchId}` },
        { type: "Payment", id: `LIST-${branchId}` },
        { type: "Analytics" },
        { type: "Transaction" },
      ],
    }),

    deleteIncomeCategory: builder.mutation<void, { branchId: string; categoryId: string }>({
      query: ({ branchId, categoryId }) => ({
        url: `/income-categories/${branchId}/${categoryId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, { branchId }) => [
        { type: "IncomeCategory", id: `LIST-${branchId}` },
        { type: "Payment", id: `LIST-${branchId}` },
        { type: "Analytics" },
        { type: "Transaction" },
      ],
    }),
  }),
});

export const {
  useGetIncomeCategoriesQuery,
  useCreateIncomeCategoryMutation,
  useUpdateIncomeCategoryMutation,
  useDeleteIncomeCategoryMutation,
} = incomeCategoryApi;
