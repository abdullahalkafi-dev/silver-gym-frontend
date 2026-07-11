// app\ClientLayout.tsx
"use client";
import React, { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ui/theme-provider";
import AuthChecker from "@/components/auth/AuthChecker";
import { ReduxProvider } from "@/redux/providers/ReduxProvider";

/**
 * ✅ Client layout with stable Suspense + Theme handling
 */
export default function ClientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    const preventWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" && (target as HTMLInputElement).type === "number") {
        e.preventDefault();
      }
    };
    document.addEventListener("wheel", preventWheel, { passive: false });
    return () => document.removeEventListener("wheel", preventWheel);
  }, []);

  return (
    <Suspense fallback={<div className="hidden" />}>
      <ReduxProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
          disableTransitionOnChange={true}
        >
          <AuthChecker>{children}</AuthChecker>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </ReduxProvider>
    </Suspense>
  );
}
