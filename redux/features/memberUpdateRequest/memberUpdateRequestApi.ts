import { baseApi } from "@/redux/api/baseApi";
import type { ApiSuccessResponse } from "@/redux/types/auth";

export type RequestFieldKey =
  | "fullName"
  | "email"
  | "dateOfBirth"
  | "country"
  | "nid"
  | "gender"
  | "bloodGroup"
  | "address"
  | "height"
  | "weight"
  | "emergencyContact"
  | "trainingGoals";

export interface ReviewField {
  field: RequestFieldKey;
  requested: unknown;
  current: unknown;
  /** What the member saw when they asked (only differs from `current` if staff edited since). */
  atRequestTime: unknown;
  /** add = field is empty now, change = replaces a value, same = already applied. */
  kind: "add" | "change" | "same";
  changedSinceRequest: boolean;
}

export interface MemberUpdateRequestReview {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
  fields: ReviewField[];
  photo: { requested: string; current: string | null } | null;
}

export const memberUpdateRequestApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPendingRequestMemberIds: builder.query<string[], string>({
      query: (branchId) => ({
        url: `/member-update-requests/${branchId}/pending-members`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<string[]>) =>
        Array.isArray(response.data) ? response.data : [],
      providesTags: ["UpdateRequest"],
    }),

    getMemberUpdateRequest: builder.query<
      MemberUpdateRequestReview | null,
      { branchId: string; memberId: string }
    >({
      query: ({ branchId, memberId }) => ({
        url: `/member-update-requests/${branchId}/member/${memberId}`,
        method: "GET",
      }),
      transformResponse: (response: ApiSuccessResponse<MemberUpdateRequestReview | null>) =>
        response.data ?? null,
      providesTags: (_r, _e, { memberId }) => [{ type: "UpdateRequest", id: memberId }],
    }),

    reviewMemberUpdateRequest: builder.mutation<
      unknown,
      {
        branchId: string;
        requestId: string;
        accept: string[];
        overrides?: Record<string, unknown>;
        note?: string;
      }
    >({
      query: ({ branchId, requestId, ...body }) => ({
        url: `/member-update-requests/${branchId}/${requestId}/review`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["UpdateRequest", "Member"],
    }),
  }),
});

export const {
  useGetPendingRequestMemberIdsQuery,
  useGetMemberUpdateRequestQuery,
  useReviewMemberUpdateRequestMutation,
} = memberUpdateRequestApi;
