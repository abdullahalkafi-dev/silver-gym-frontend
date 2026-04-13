import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import type { RootState } from "@/redux/store";
import { cookieUtils } from "@/redux/utils/cookies";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

type RefreshTokenResponse = {
  success: boolean;
  data?: {
    accessToken?: string;
  };
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = cookieUtils.getAccessToken() || state.auth.accessToken;

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    headers.set("Accept", "application/json");
    return headers;
  },
});

const baseQueryWithReAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  const isRefreshRequest =
    typeof args !== "string" && args.url === "/auth/refresh-access-token";

  if (result.error?.status === 401 && !isRefreshRequest) {
    const refreshToken =
      cookieUtils.getRefreshToken() ||
      (api.getState() as RootState).auth.refreshToken;

    if (!refreshToken) {
      cookieUtils.clearAll();
      return result;
    }

    const refreshResult = await rawBaseQuery(
      {
        url: "/auth/refresh-access-token",
        method: "POST",
        body: { refreshToken },
      },
      api,
      extraOptions
    );

    const refreshData = refreshResult.data as RefreshTokenResponse | undefined;
    const nextAccessToken = refreshData?.data?.accessToken;

    if (nextAccessToken) {
      cookieUtils.setAccessToken(nextAccessToken, true);
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      cookieUtils.clearAll();
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReAuth,
  tagTypes: ["Auth", "Profile", "Role", "Branch"],
  endpoints: () => ({}),
});
