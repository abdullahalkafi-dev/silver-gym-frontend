// components/auth/VerifyOTPForm.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import type { PasswordResetUser } from "@/types/auth";
import { toast } from "sonner";
import {
  useResendOtpMutation,
  useVerifyResetOtpMutation,
} from "@/redux/features/auth/authApi";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";

function getInitialPasswordResetUser(): PasswordResetUser | null {
  if (typeof window === "undefined") return null;

  const storedData = sessionStorage.getItem("passwordResetUser");
  if (!storedData) return null;

  try {
    return JSON.parse(storedData) as PasswordResetUser;
  } catch {
    return null;
  }
}

export default function VerifyOTPForm() {
  const router = useRouter();
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [userData, setUserData] = useState<PasswordResetUser | null>(
    getInitialPasswordResetUser
  );
  const [error, setError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [verifyResetOtpMutation, { isLoading: isVerifying }] =
    useVerifyResetOtpMutation();
  const [resendOtpMutation, { isLoading: isResending }] = useResendOtpMutation();

  useEffect(() => {
    if (!userData) {
      router.push("/forgot-password");
      return;
    }

    if (!userData.verificationMethod) {
      router.push("/verification-method");
    }
  }, [router, userData]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    setIsVerified(false);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus last filled input or next empty
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleResend = async () => {
    if (!userData) return;

    const method = userData.verificationMethod;
    const identifier = method === "email" ? userData.email : userData.phone;

    if (!method || !identifier) {
      setError("Verification channel not found. Please restart the process.");
      return;
    }

    try {
      await resendOtpMutation(
        method === "email"
          ? { email: identifier.toLowerCase(), type: "password_reset" }
          : { phone: identifier, type: "password_reset" }
      ).unwrap();

      setOtp(["", "", "", "", "", ""]);
      setError("");
      setIsVerified(false);
      toast.success("OTP resent successfully");
    } catch (apiError) {
      setError(extractApiErrorMessage(apiError));
    }
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      setError("Please enter complete code");
      return;
    }

    if (!userData || !userData.verificationMethod) {
      setError("Verification session expired. Please start again.");
      return;
    }

    const method = userData.verificationMethod;
    const identifier = method === "email" ? userData.email : userData.phone;

    if (!identifier) {
      setError("Verification channel not found. Please restart the process.");
      return;
    }

    try {
      const response = await verifyResetOtpMutation(
        method === "email"
          ? { email: identifier.toLowerCase(), otp: enteredOtp }
          : { phone: identifier, otp: enteredOtp }
      ).unwrap();

      const updatedData: PasswordResetUser = {
        ...userData,
        otpVerified: true,
        resetToken: response.data.resetToken,
      };

      sessionStorage.setItem("passwordResetUser", JSON.stringify(updatedData));
      setUserData(updatedData);
      setIsVerified(true);
      setError("");
      toast.success("OTP verified successfully");

      router.push("/reset-password");
    } catch (apiError) {
      setError(extractApiErrorMessage(apiError));
      setIsVerified(false);
    }
  };

  if (!userData) return null;

  const isComplete = otp.every((digit) => digit !== "");
  const displayContact =
    (userData.verificationMethod === "email"
      ? userData.maskedEmail || userData.email
      : userData.maskedPhone || userData.phone) || userData.identifier;

  return (
    <div className="flex items-center justify-center min-h-screen p-4 relative w-full overflow-hidden bg-white">
      {/* Background decoration */}
      <div className="absolute top-[-65px] left-[1236px] w-[501px] h-[234px] bg-white rounded-[250.46px/117.05px] -rotate-45 blur-[234px]" />

      {/* Partial border wrapper */}
      <div className="relative w-full max-w-2xl bg-[#EEEEEE4D] rounded-4xl overflow-visible">
        {/* Top-right corner */}
        <div className="absolute top-0 right-0 w-full h-full rounded-4xl p-px z-0 backdrop-blur-sm opacity-90 bg-[linear-gradient(225deg,rgba(103,56,41,0.25)_0%,rgba(255,255,255,0)_65%,rgba(103,56,41,0.25)_100%)]">
          <div className="w-full h-full rounded-4xl bg-[#EEEEEE4D]" />
        </div>

        {/* Bottom-left corner */}
        <div className="absolute bottom-0 left-0 w-full h-full rounded-4xl p-px z-0 backdrop-blur-sm opacity-90 bg-[linear-gradient(45deg,rgba(103,56,41,0.25)_0%,rgba(255,255,255,0)_65%,rgba(103,56,41,0.25)_100%)]">
          <div className="w-full h-full rounded-4xl bg-[#EEEEEE4D]" />
        </div>

        {/* Main card */}
        <Card className="relative z-20 bg-white rounded-2xl shadow-[-76px_59px_212px_#ff73001a,-305px_235px_250px_#ff730017,-687px_529px_250px_#ff73000d,-1221px_940px_250px_#ff730003,-1908px_1469px_250px_transparent] border-none m-4">
          <CardContent className="p-8">
            <div className="flex flex-col gap-6">
              {/* Title */}
              <div className="flex flex-col items-center justify-center gap-1">
                <h1 className="font-semibold text-gray-medium text-2xl text-center leading-9">
                  Enter Verification Code
                </h1>
              </div>

              {/* Description */}
              <div className="flex flex-col items-center justify-center">
                <p className="w-full max-w-lg font-normal text-gray-medium text-base text-center leading-6">
                  We&apos;ve sent a 6-digit OTP to{" "}
                  <span className="font-semibold">{displayContact}</span>.
                  Please enter the code to continue.
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className={`w-14 h-14 sm:w-16 sm:h-16 text-center text-2xl font-semibold rounded-lg border-2 transition-colors
                      ${
                        error && !isVerified
                          ? "border-[#FC5555] text-[#FC5555] focus:border-[#FC5555] focus:ring-[#FC5555]"
                          : isVerified
                          ? "border-purple text-purple focus:border-purple focus:ring-purple"
                          : "border-border-2 text-gray-medium focus:border-[#E97451] focus:ring-[#E97451]"
                      }
                      focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                  />
                ))}
              </div>

              {/* Resend Link */}
              <div className="text-center">
                <p className="text-[#9CA3AF] text-sm">
                  Don&apos;t received the code?{" "}
                  <button
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-purple hover:underline font-medium"
                  >
                    {isResending ? "Resending..." : "Resend"}
                  </button>
                </p>
              </div>

              {/* Verify Button */}
              <Button
                onClick={handleVerify}
                disabled={!isComplete || isVerifying || isResending}
                className={`w-full h-14 rounded-lg text-xl font-medium transition-colors duration-300 
                  ${
                    isComplete && !isVerifying && !isResending
                      ? "bg-[#E97451] hover:bg-[#d66542] text-white"
                      : "bg-[#D9D9D9] text-[#9CA3AF] cursor-not-allowed hover:bg-[#D9D9D9]"
                  }`}
              >
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>

              {/* Error Message */}
              {error && !isVerified && (
                <p className="text-[#FC5555] text-sm text-center">{error}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
