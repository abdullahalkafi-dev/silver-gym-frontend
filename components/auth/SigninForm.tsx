// components/auth/SigninForm.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthHero from "@/components/auth/AuthHero";
import GoogleButton from "@/components/auth/GoogleButton";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { clearError, setSession } from "@/redux/features/auth/authSlice";
import {
  useLoginUserMutation,
  useStaffLoginMutation,
} from "@/redux/features/auth/authApi";
import {
  extractApiErrorMessage,
  requiresBusinessProfileSetup,
} from "@/redux/features/auth/authMappers";

type AuthMode = "user" | "staff";

interface UserSignInFormValues {
  emailOrPhone: string;
  password: string;
  rememberMe: boolean;
}

interface StaffSignInFormValues {
  username: string;
  password: string;
  rememberMe: boolean;
}

export default function SignInForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isLoading, error, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );
  const [authMode, setAuthMode] = useState<AuthMode>("user");

  const [loginUserMutation, { isLoading: isUserLoginLoading }] =
    useLoginUserMutation();
  const [staffLoginMutation, { isLoading: isStaffLoginLoading }] =
    useStaffLoginMutation();

  const isSubmitting = isLoading || isUserLoginLoading || isStaffLoginLoading;

  const userForm = useForm<UserSignInFormValues>({
    defaultValues: {
      emailOrPhone: "",
      password: "",
      rememberMe: false,
    },
  });

  const staffForm = useForm<StaffSignInFormValues>({
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const heading = useMemo(
    () => (authMode === "user" ? "Welcome Back" : "Staff Sign In"),
    [authMode]
  );

  const subHeading = useMemo(
    () =>
      authMode === "user"
        ? "Sign in to manage your gym management system"
        : "Sign in with your staff username and password",
    [authMode]
  );

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (requiresBusinessProfileSetup(user)) {
      router.replace("/business-info");
      return;
    }

    router.replace("/dashboard");
  }, [isAuthenticated, router, user]);

  useEffect(() => {
    if (error && error !== "No valid authentication found") {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const onUserSubmit = async (data: UserSignInFormValues) => {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailRegex.test(data.emailOrPhone);

      const session = await loginUserMutation({
        ...(isEmail
          ? { email: data.emailOrPhone.trim().toLowerCase() }
          : { phone: data.emailOrPhone.trim() }),
        password: data.password,
      }).unwrap();

      dispatch(setSession({ session, rememberMe: data.rememberMe }));
      toast.success("Login successful");
    } catch (apiError) {
      toast.error(extractApiErrorMessage(apiError));
    }
  };

  const onStaffSubmit = async (data: StaffSignInFormValues) => {
    try {
      const session = await staffLoginMutation({
        username: data.username.trim().toLowerCase(),
        password: data.password,
      }).unwrap();

      dispatch(setSession({ session, rememberMe: data.rememberMe }));
      toast.success("Staff login successful");
    } catch (apiError) {
      toast.error(extractApiErrorMessage(apiError));
    }
  };

  return (
    <div className="min-h-screen w-full flex overflow-x-hidden">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-5 lg:p-10">
        <div className="w-full max-w-xl">
          <div className="mb-5 md:mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-3 leading-tight">
              {heading}
            </h1>
            <p className="text-muted-foreground text-[16px]">
              {subHeading}
            </p>
          </div>

          <div className="mb-6 rounded-lg border border-gray-200 p-1 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setAuthMode("user")}
              className={`h-11 rounded-md text-sm font-medium transition-colors ${
                authMode === "user"
                  ? "bg-primary text-white"
                  : "bg-transparent text-foreground hover:bg-gray-100"
              }`}
            >
              User
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("staff")}
              className={`h-11 rounded-md text-sm font-medium transition-colors ${
                authMode === "staff"
                  ? "bg-primary text-white"
                  : "bg-transparent text-foreground hover:bg-gray-100"
              }`}
            >
              Staff
            </button>
          </div>

          <form
            onSubmit={
              authMode === "user"
                ? userForm.handleSubmit(onUserSubmit)
                : staffForm.handleSubmit(onStaffSubmit)
            }
            className="space-y-6"
          >
            {authMode === "user" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="emailOrPhone" className="text-sm font-medium">
                    Email or phone
                  </Label>
                  <Input
                    id="emailOrPhone"
                    type="text"
                    placeholder="Enter your email or phone number"
                    className={`h-14 rounded-lg text-base ${
                      userForm.formState.errors.emailOrPhone
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    {...userForm.register("emailOrPhone", {
                      required: "Email or phone number is required",
                      validate: (value) => {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
                        if (!emailRegex.test(value) && !phoneRegex.test(value)) {
                          return "Enter a valid email or phone number";
                        }
                        return true;
                      },
                    })}
                  />
                  {userForm.formState.errors.emailOrPhone && (
                    <p className="text-red-500 text-sm">
                      {userForm.formState.errors.emailOrPhone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="userPassword" className="text-sm font-medium">
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-[#8b5cf6] hover:underline"
                    >
                      Forget Password?
                    </Link>
                  </div>
                  <Input
                    id="userPassword"
                    type="password"
                    placeholder="Enter your password"
                    className="h-14 rounded-lg text-base"
                    {...userForm.register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                    })}
                  />
                  {userForm.formState.errors.password && (
                    <p className="text-red-500 text-sm">
                      {userForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="userRememberMe"
                    className="w-4 h-4 rounded border-gray-300 mb-1"
                    {...userForm.register("rememberMe")}
                  />
                  <Label
                    htmlFor="userRememberMe"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your staff username"
                    className={`h-14 rounded-lg text-base ${
                      staffForm.formState.errors.username
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    {...staffForm.register("username", {
                      required: "Username is required",
                      minLength: {
                        value: 3,
                        message: "Username must be at least 3 characters",
                      },
                    })}
                  />
                  {staffForm.formState.errors.username && (
                    <p className="text-red-500 text-sm">
                      {staffForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staffPassword" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="staffPassword"
                    type="password"
                    placeholder="Enter your password"
                    className="h-14 rounded-lg text-base"
                    {...staffForm.register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                  />
                  {staffForm.formState.errors.password && (
                    <p className="text-red-500 text-sm">
                      {staffForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="staffRememberMe"
                    className="w-4 h-4 rounded border-gray-300 mb-1"
                    {...staffForm.register("rememberMe")}
                  />
                  <Label
                    htmlFor="staffRememberMe"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary h-14 text-base rounded-lg w-full"
            >
              {isSubmitting
                ? authMode === "user"
                  ? "Signing In..."
                  : "Signing Staff In..."
                : "Sign In"}
            </Button>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative bg-background px-4">
                <span className="text-sm text-muted-foreground">or</span>
              </div>
            </div>

            {authMode === "user" && <GoogleButton text="Sign in with Google" />}
          </form>

          <p className="mt-8 text-center text-base text-foreground">
            {authMode === "user" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  href="/sign-up"
                  className="text-[#8b5cf6] font-medium hover:underline"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              "Contact your admin to create a staff account."
            )}
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 w-full bg-primary overflow-hidden">
        <AuthHero />
      </div>
    </div>
  );
}
