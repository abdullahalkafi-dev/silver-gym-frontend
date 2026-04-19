// components/auth/AuthChecker.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { checkAuthStatus } from "@/redux/features/auth/authSlice";
import { requiresBusinessProfileSetup } from "@/redux/features/auth/authMappers";
import { Skeleton } from "@/components/ui/skeleton";

const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-otp",
  "/verification-method",
];

const AUTH_ONLY_REDIRECT_ROUTES = ["/sign-in", "/sign-up"];
const ONBOARDING_ROUTES = ["/business-info", "/contact-info"];

export default function AuthChecker({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAppSelector(
    (state) => state.auth
  );
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const matchesRoute = (route: string) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  };

  const isPublicRoute = PUBLIC_ROUTES.some((route) => matchesRoute(route));
  const isAuthEntryRoute = AUTH_ONLY_REDIRECT_ROUTES.includes(pathname);
  const isOnboardingRoute = ONBOARDING_ROUTES.some((route) =>
    matchesRoute(route)
  );
  const shouldCompleteBusinessProfile = requiresBusinessProfileSetup(user);

  useEffect(() => {
    dispatch(checkAuthStatus()).finally(() => setIsBootstrapping(false));
  }, [dispatch]);

  useEffect(() => {
    if (isBootstrapping || isLoading) return;

    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/sign-in");
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    if (shouldCompleteBusinessProfile && !isOnboardingRoute) {
      router.replace("/business-info");
      return;
    }

    if (
      !shouldCompleteBusinessProfile &&
      (isAuthEntryRoute || isOnboardingRoute)
    ) {
      router.replace("/dashboard");
    }
  }, [
    isAuthenticated,
    isAuthEntryRoute,
    isOnboardingRoute,
    isBootstrapping,
    isLoading,
    isPublicRoute,
    router,
    shouldCompleteBusinessProfile,
  ]);

  if (isBootstrapping || isLoading) {
    return (
      <div className="min-h-screen bg-white p-6 md:p-10">
        <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-12">
          <div className="md:col-span-7 space-y-5">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96 max-w-full" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
          <div className="hidden md:block md:col-span-5">
            <Skeleton className="h-[520px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
