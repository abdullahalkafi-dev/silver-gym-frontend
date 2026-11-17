import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";

/** Read-only view of portal "Ask a trainer" requests (backend docs/trainer-plans.md). */

export type PlanStatus = "pending" | "answered" | "declined" | "cancelled";

export type PlanCounts = Record<PlanStatus | "total", number>;

export const PLAN_TOPICS = [
  "Weight loss",
  "Weight gain",
  "Muscle building",
  "Diet plan",
  "Workout plan",
  "Stay fit",
] as const;

export const CUSTOM_TOPIC_FILTER = "__custom";

export interface PlanRequest {
  _id: string;
  trainerName?: string;
  topic: string;
  isCustomTopic?: boolean;
  note?: string;
  memberId: string;
  memberSnapshot: {
    fullName?: string;
    memberId?: string;
    photo?: string;
    gender?: string;
    age?: number;
    bloodGroup?: string;
    height?: number;
    heightUnit?: string;
    weight?: number;
    weightUnit?: string;
    trainingGoals?: string[];
  };
  status: PlanStatus;
  reply?: { title?: string; content: string; sentAt: string; editedAt?: string };
  declineReason?: string;
  closedAt?: string;
  createdAt: string;
}

export interface TrainerPlanFilters {
  status?: PlanStatus | "all";
  topic?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface TrainerPlanList {
  trainer: { _id: string; displayName: string; username: string; isActive: boolean; lastLogin?: string };
  items: PlanRequest[];
  counts: PlanCounts;
  meta: { page: number; limit: number; total: number; totalPage: number };
}

type ListResponse = ApiSuccessResponse<Omit<TrainerPlanList, "meta">> & {
  meta?: TrainerPlanList["meta"];
};

export const trainerPlanApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTrainerPlanSummary: builder.query<Record<string, PlanCounts>, string>({
      query: (branchId) => ({ url: `/trainer-plans/${branchId}/summary`, method: "GET" }),
      transformResponse: (response: ApiSuccessResponse<Record<string, PlanCounts>>) =>
        response.data ?? {},
      providesTags: (_r, _e, branchId) => [{ type: "TrainerPlan", id: branchId }],
    }),

    getTrainerPlanRequests: builder.query<
      TrainerPlanList,
      { branchId: string; trainerId: string } & TrainerPlanFilters
    >({
      query: ({ branchId, trainerId, ...filters }) => {
        const params: Record<string, string> = {};
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== "") params[key] = String(value);
        }
        return {
          url: `/trainer-plans/${branchId}/trainer/${trainerId}/requests`,
          method: "GET",
          params,
        };
      },
      transformResponse: (response: ListResponse) => ({
        ...response.data,
        meta: response.meta ?? { page: 1, limit: 20, total: 0, totalPage: 1 },
      }),
      providesTags: (_r, _e, { branchId }) => [{ type: "TrainerPlan", id: branchId }],
    }),
  }),
});

export const { useGetTrainerPlanSummaryQuery, useGetTrainerPlanRequestsQuery } = trainerPlanApi;
