// redux/types/auth.ts
export type AuthActorType = "owner" | "staff";

export interface User {
  id: string;
  role: string;
  actorType: AuthActorType;
  email: string;
  phone?: string;
  name?: string;
  profileImage?: string;
  avatar?: string;
  rememberMe?: boolean;
  loginTime: string;
  customRoleId?: string;
  permissions?: string[];
  branchId?: string;
  backendRoleName?: string;
  businessProfile?: { id: string } | null;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  role: string | null;
  isLoading: boolean;
  error: string | null;
  permissions: string[];
  customRoleId?: string;
}

export interface LoginCredentials {
  email?: string;
  phone?: string;
  username?: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorSource {
  path: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errorSources?: ApiErrorSource[];
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password?: string;
  countryCode?: string;
  loginProvider: "email" | "google" | "phone";
  googleId?: string;
  profilePicture?: string;
}

export interface VerifyAccountPayload {
  email?: string;
  phone?: string;
  otp: string;
}

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}
