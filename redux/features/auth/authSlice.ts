// redux/features/auth/authSlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { ApiSuccessResponse, AuthState, LoginResponse, User } from "@/redux/types/auth";
import { cookieUtils } from "@/redux/utils/cookies";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5004/api/v1";

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  role: null,
  activeBranchId: null,
  activeBranchName: null,
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

const normalizeStoredBusinessProfile = (
  businessProfile: unknown
): { id: string } | null | undefined => {
  if (businessProfile === undefined) {
    return undefined;
  }

  if (businessProfile === null || typeof businessProfile !== "object") {
    return null;
  }

  const maybeProfile = businessProfile as { id?: unknown; _id?: unknown };
  const rawId = maybeProfile.id ?? maybeProfile._id;

  if (typeof rawId !== "string") {
    return null;
  }

  const id = rawId.trim();
  return id ? { id } : null;
};

const fetchBusinessProfileId = async (
  accessToken: string
): Promise<string | null | undefined> => {
  try {
    const response = await fetch(`${API_BASE_URL}/business-profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as ApiSuccessResponse<
      Record<string, unknown>
    >;
    const profile = payload?.data;
    const rawId = profile?._id ?? profile?.id;

    if (typeof rawId !== "string") {
      return null;
    }

    const id = rawId.trim();
    return id || null;
  } catch {
    // Non-blocking: fall back to existing session data when reconciliation fails.
    return undefined;
  }
};

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      // Clear cookies
      cookieUtils.clearAll();
      
      // Clear business setup related localStorage/sessionStorage
      localStorage.removeItem("businessInfo");
      localStorage.removeItem("contactInfo");
      localStorage.removeItem("verification_state");
      localStorage.removeItem("verification_complete");
      localStorage.removeItem("signupData");
      
      sessionStorage.removeItem("businessLogo_data");
      sessionStorage.removeItem("businessLogo_name");
      sessionStorage.removeItem("businessLogo_type");
      sessionStorage.removeItem("passwordResetUser");
      
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
      const rememberMe = Boolean(
        (userData as { rememberMe?: unknown } | null)?.rememberMe
      );

      if (!refreshToken || !userData) {
        throw new Error("No valid authentication found");
      }

      if (!accessToken) {
        accessToken = await refreshAccessToken(refreshToken);
        cookieUtils.setAccessToken(accessToken, rememberMe);
      }

      const storedUser = userData as unknown as User;
      const initialBusinessProfile = (
        storedUser as User & { businessProfile?: unknown }
      ).businessProfile;
      let normalizedUser: User = {
        ...storedUser,
        businessProfile: normalizeStoredBusinessProfile(initialBusinessProfile),
      };

      const shouldSyncLegacyOwnerProfile =
        normalizedUser.actorType === "owner" &&
        normalizedUser.businessProfile === undefined;

      if (shouldSyncLegacyOwnerProfile) {
        const businessProfileId = await fetchBusinessProfileId(accessToken);

        if (businessProfileId !== undefined) {
          normalizedUser = {
            ...normalizedUser,
            businessProfile: businessProfileId ? { id: businessProfileId } : null,
          };
        }
      }

      if (normalizedUser.businessProfile !== initialBusinessProfile) {
        cookieUtils.setUserData(
          normalizedUser as unknown as Record<string, unknown>,
          rememberMe
        );
      }

      return {
        user: normalizedUser,
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
      const sessionUser: User = {
        ...session.user,
        rememberMe,
      };

      cookieUtils.setAccessToken(session.accessToken, rememberMe);
      cookieUtils.setRefreshToken(session.refreshToken, rememberMe);
      cookieUtils.setUserData(
        sessionUser as unknown as Record<string, unknown>,
        rememberMe
      );
      cookieUtils.setUserRole(sessionUser.role, rememberMe);

      state.user = sessionUser;
      state.accessToken = session.accessToken;
      state.refreshToken = session.refreshToken;
      state.isAuthenticated = true;
      state.role = sessionUser.role;
      state.activeBranchId = sessionUser.branchId || null;
      state.permissions = sessionUser.permissions || [];
      state.customRoleId = sessionUser.customRoleId;
      state.error = null;
      state.isLoading = false;
    },

    setUserBusinessProfile: (
      state,
      action: PayloadAction<{ id: string | null }>
    ) => {
      if (!state.user) {
        return;
      }

      state.user = {
        ...state.user,
        businessProfile: action.payload.id ? { id: action.payload.id } : null,
      };

      cookieUtils.setUserData(
        state.user as unknown as Record<string, unknown>,
        Boolean(state.user.rememberMe)
      );
    },

    clearSession: (state) => {
      cookieUtils.clearAll();
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.role = null;
      state.activeBranchId = null;
      state.activeBranchName = null;
      state.permissions = [];
      state.customRoleId = undefined;
      state.error = null;
      state.isLoading = false;
    },

    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      cookieUtils.setAccessToken(action.payload, true);
    },

    setActiveBranchId: (
      state,
      action: PayloadAction<{ id: string | null; name?: string | null } | string | null>
    ) => {
      const payload = action.payload;
      let id: string | null;
      let name: string | null = null;

      if (payload === null || typeof payload === "string") {
        id = typeof payload === "string" ? payload : null;
      } else {
        id = payload.id;
        name = payload.name ?? null;
      }

      state.activeBranchId = id;
      state.activeBranchName = name;

      if (id) {
        cookieUtils.setActiveBranchId(
          id,
          Boolean(state.user?.rememberMe)
        );
        if (name) {
          cookieUtils.setActiveBranchName(
            name,
            Boolean(state.user?.rememberMe)
          );
        }
      } else {
        cookieUtils.deleteActiveBranchId();
        cookieUtils.deleteActiveBranchName();
      }
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
        state.activeBranchId = null;
        state.activeBranchName = null;
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
        // For staff, branchId comes from their token. For owners, branchId is
        // null in the token — fall back to the persisted cookie so that the
        // last-selected branch survives a page reload.
        state.activeBranchId =
          action.payload.user.branchId ||
          cookieUtils.getActiveBranchId() ||
          null;
        state.activeBranchName =
          action.payload.user.branchId
            ? null
            : cookieUtils.getActiveBranchName() || null;
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
        state.activeBranchId = null;
        state.activeBranchName = null;
        state.permissions = [];
        state.customRoleId = undefined;
        state.error = (action.payload as string) || "Authentication failed";
        state.isLoading = false;
      });
  },
});

export const {
  setSession,
  setUserBusinessProfile,
  clearSession,
  setAccessToken,
  setActiveBranchId,
  clearError,
  setLoading,
} = authSlice.actions;

export default authSlice.reducer;
