import { baseApi } from "@/redux/api/baseApi";
import type {
  ApiSuccessResponse,
  LoginResponse,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyAccountPayload,
} from "@/redux/types/auth";
import {
  normalizeOwnerLoginResponse,
  normalizeStaffLoginResponse,
} from "@/redux/features/auth/authMappers";

type LoginUserRequest = {
  email?: string;
  phone?: string;
  password: string;
};

type StaffLoginRequest = {
  username: string;
  password: string;
};

type ResendOtpPayload = {
  email?: string;
  phone?: string;
  type: "account_verification" | "password_reset" | "two_factor";
};

type ForgotPasswordPayload = {
  email?: string;
  phone?: string;
};

type VerifyResetOtpPayload = {
  email?: string;
  phone?: string;
  otp: string;
};

type CreateBusinessProfilePayload = {
  businessName: string;
  businessType: string;
  registrationNumber?: string;
  businessAddress?: string;
  city?: string;
  country?: string;
  zip?: string;
  businessPhoneNumber?: string;
  businessEmail?: string;
};

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    loginUser: builder.mutation<LoginResponse, LoginUserRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      transformResponse: (
        response: ApiSuccessResponse<{
          accessToken: string;
          refreshToken: string;
          user: Record<string, unknown>;
        }>
      ) => normalizeOwnerLoginResponse(response.data),
      invalidatesTags: ["Auth"],
    }),

    staffLogin: builder.mutation<LoginResponse, StaffLoginRequest>({
      query: (credentials) => ({
        url: "/auth/staff/login",
        method: "POST",
        body: credentials,
      }),
      transformResponse: (
        response: ApiSuccessResponse<{
          accessToken: string;
          refreshToken: string;
          staff: Record<string, unknown>;
          permissions?: Record<string, boolean>;
        }>
      ) => normalizeStaffLoginResponse(response.data),
      invalidatesTags: ["Auth"],
    }),

    register: builder.mutation<ApiSuccessResponse<Record<string, unknown>>, RegisterPayload>({
      query: (payload) => ({
        url: "/auth/register",
        method: "POST",
        body: payload,
      }),
    }),

    verifyAccount: builder.mutation<
      ApiSuccessResponse<Record<string, unknown>>,
      VerifyAccountPayload
    >({
      query: (payload) => ({
        url: "/auth/verify-account",
        method: "POST",
        body: payload,
      }),
    }),

    resendOtp: builder.mutation<
      ApiSuccessResponse<Record<string, unknown>>,
      ResendOtpPayload
    >({
      query: (payload) => ({
        url: "/auth/resend-otp",
        method: "POST",
        body: payload,
      }),
    }),

    forgotPassword: builder.mutation<
      ApiSuccessResponse<Record<string, unknown>>,
      ForgotPasswordPayload
    >({
      query: (payload) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: payload,
      }),
    }),

    verifyResetOtp: builder.mutation<
      ApiSuccessResponse<{ resetToken: string }>,
      VerifyResetOtpPayload
    >({
      query: (payload) => ({
        url: "/auth/verify-reset-otp",
        method: "POST",
        body: payload,
      }),
    }),

    resetPassword: builder.mutation<
      ApiSuccessResponse<null>,
      ResetPasswordPayload
    >({
      query: (payload) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: payload,
      }),
    }),

    refreshAccessToken: builder.mutation<
      ApiSuccessResponse<{ accessToken: string }>,
      { refreshToken: string }
    >({
      query: (payload) => ({
        url: "/auth/refresh-access-token",
        method: "POST",
        body: payload,
      }),
    }),

    createBusinessProfile: builder.mutation<
      ApiSuccessResponse<Record<string, unknown>>,
      CreateBusinessProfilePayload
    >({
      query: (payload) => ({
        url: "/business-profile",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Profile"],
    }),
  }),
});

export const {
  useLoginUserMutation,
  useStaffLoginMutation,
  useRegisterMutation,
  useVerifyAccountMutation,
  useResendOtpMutation,
  useForgotPasswordMutation,
  useVerifyResetOtpMutation,
  useResetPasswordMutation,
  useRefreshAccessTokenMutation,
  useCreateBusinessProfileMutation,
} = authApi;
