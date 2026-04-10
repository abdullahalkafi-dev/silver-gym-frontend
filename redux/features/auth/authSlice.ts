// redux/features/auth/authSlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { ApiSuccessResponse, AuthState, LoginResponse, User } from "@/redux/types/auth";
import { cookieUtils } from "@/redux/utils/cookies";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  role: null,
  isLoading: false,
  error: null,
  permissions: [],
  customRoleId: undefined,
};

const refreshAccessToken = async (refreshToken: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/refresh-access-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  const payload = (await response.json()) as ApiSuccessResponse<{
    accessToken: string;
  }> & { message?: string };

  if (!response.ok || !payload?.data?.accessToken) {
    throw new Error(payload?.message || "Session expired. Please login again.");
  }

  return payload.data.accessToken;
};

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      cookieUtils.clearAll();
      return true;
    } catch {
      return rejectWithValue("Logout failed");
    }
  }
);

export const checkAuthStatus = createAsyncThunk<LoginResponse>(
  "auth/checkAuthStatus",
  async (_, { rejectWithValue }) => {
    try {
      let accessToken = cookieUtils.getAccessToken();
      const refreshToken = cookieUtils.getRefreshToken();
      const userData = cookieUtils.getUserData();

      if (!refreshToken || !userData) {
        throw new Error("No valid authentication found");
      }

      if (!accessToken) {
        accessToken = await refreshAccessToken(refreshToken);
        cookieUtils.setAccessToken(accessToken, true);
      }

      return {
        user: userData as unknown as User,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      cookieUtils.clearAll();
      return rejectWithValue(
        error instanceof Error ? error.message : "Auth check failed"
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (
      state,
      action: PayloadAction<{ session: LoginResponse; rememberMe?: boolean }>
    ) => {
      const { session, rememberMe = false } = action.payload;

      cookieUtils.setAccessToken(session.accessToken, rememberMe);
      cookieUtils.setRefreshToken(session.refreshToken, rememberMe);
      cookieUtils.setUserData(session.user as unknown as Record<string, unknown>, rememberMe);
      cookieUtils.setUserRole(session.user.role, rememberMe);

      state.user = session.user;
      state.accessToken = session.accessToken;
      state.refreshToken = session.refreshToken;
      state.isAuthenticated = true;
      state.role = session.user.role;
      state.permissions = session.user.permissions || [];
      state.customRoleId = session.user.customRoleId;
      state.error = null;
      state.isLoading = false;
    },

    clearSession: (state) => {
      cookieUtils.clearAll();
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.role = null;
      state.permissions = [];
      state.customRoleId = undefined;
      state.error = null;
      state.isLoading = false;
    },

    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      cookieUtils.setAccessToken(action.payload, true);
    },

    clearError: (state) => {
      state.error = null;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.role = null;
        state.permissions = [];
        state.customRoleId = undefined;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.role = action.payload.user.role;
        state.permissions = action.payload.user.permissions || [];
        state.customRoleId = action.payload.user.customRoleId;
        state.error = null;
        state.isLoading = false;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.role = null;
        state.permissions = [];
        state.customRoleId = undefined;
        state.error = (action.payload as string) || "Authentication failed";
        state.isLoading = false;
      });
  },
});

export const {
  setSession,
  clearSession,
  setAccessToken,
  clearError,
  setLoading,
} = authSlice.actions;

export default authSlice.reducer;
