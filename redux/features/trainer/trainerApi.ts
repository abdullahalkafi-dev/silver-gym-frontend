import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";

export interface Trainer {
  id: string;
  branchId: string;
  username: string;
  displayName: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt?: string;
}

type RawTrainer = Partial<Trainer> & { _id?: string };

const normalizeTrainer = (raw: RawTrainer): Trainer => ({
  id: String(raw._id || raw.id || ""),
  branchId: String(raw.branchId || ""),
  username: raw.username || "",
  displayName: raw.displayName || raw.username || "",
  phone: raw.phone || undefined,
  isActive: raw.isActive !== false,
  lastLogin: raw.lastLogin ?? null,
  createdAt: raw.createdAt,
});

export interface CreateTrainerPayload {
  username: string;
  displayName: string;
  phone?: string;
  password: string;
}

export interface UpdateTrainerPayload {
  displayName?: string;
  phone?: string;
  isActive?: boolean;
  password?: string;
}

export const trainerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTrainers: builder.query<Trainer[], string>({
      query: (branchId) => ({ url: `/trainers/${branchId}`, method: "GET" }),
      transformResponse: (response: ApiSuccessResponse<RawTrainer[]>) =>
        (Array.isArray(response.data) ? response.data : []).map(normalizeTrainer),
      providesTags: (_result, _error, branchId) => [{ type: "Trainer", id: branchId }],
    }),

    checkTrainerUsername: builder.query<
      { username: string; isAvailable: boolean },
      string
    >({
      query: (username) => ({
        url: `/trainers/check-username`,
        method: "GET",
        params: { username },
      }),
      transformResponse: (
        response: ApiSuccessResponse<{ username: string; isAvailable: boolean }>,
      ) => response.data,
    }),

    createTrainer: builder.mutation<
      Trainer,
      { branchId: string; payload: CreateTrainerPayload }
    >({
      query: ({ branchId, payload }) => ({
        url: `/trainers/${branchId}`,
        method: "POST",
        body: payload,
      }),
      transformResponse: (response: ApiSuccessResponse<RawTrainer>) =>
        normalizeTrainer(response.data),
      invalidatesTags: (_r, _e, { branchId }) => [{ type: "Trainer", id: branchId }],
    }),

    updateTrainer: builder.mutation<
      Trainer,
      { branchId: string; trainerId: string; payload: UpdateTrainerPayload }
    >({
      query: ({ branchId, trainerId, payload }) => ({
        url: `/trainers/${branchId}/${trainerId}`,
        method: "PATCH",
        body: payload,
      }),
      transformResponse: (response: ApiSuccessResponse<RawTrainer>) =>
        normalizeTrainer(response.data),
      invalidatesTags: (_r, _e, { branchId }) => [{ type: "Trainer", id: branchId }],
    }),

    deleteTrainer: builder.mutation<void, { branchId: string; trainerId: string }>({
      query: ({ branchId, trainerId }) => ({
        url: `/trainers/${branchId}/${trainerId}`,
        method: "DELETE",
      }),
      // Deleting a trainer also closes their waiting plan requests.
      invalidatesTags: (_r, _e, { branchId }) => [
        { type: "Trainer", id: branchId },
        { type: "TrainerPlan", id: branchId },
      ],
    }),
  }),
});

export const {
  useGetTrainersQuery,
  useLazyCheckTrainerUsernameQuery,
  useCreateTrainerMutation,
  useUpdateTrainerMutation,
  useDeleteTrainerMutation,
} = trainerApi;
