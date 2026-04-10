// types/auth.ts

export interface PasswordResetUser {
  identifier: string;
  email?: string;
  phone?: string;
  maskedEmail?: string;
  maskedPhone?: string;
  verificationMethod?: "email" | "phone";
  otpVerified?: boolean;
  resetToken?: string;
}

export type VerificationMethod = "email" | "phone";
