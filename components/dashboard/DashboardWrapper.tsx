// components/dashboard/DashboardWrapper.tsx
"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BranchFeeSetupProvider } from "@/components/dashboard/BranchFeeSetupGuard";
import DashboardHeader from "@/components/dashboard/Header/DashboardHeader";
import Sidebar from "@/components/dashboard/Sidebar/Sidebar";
import { getSidebarForRole } from "@/config/sidebarConfig";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/redux/hooks";
import { logoutUser } from "@/redux/features/auth/authSlice";
import { toast } from "sonner";

export default function DashboardWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, permissions, activeBranchId } = useUser();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const hasDashboardAccess = useMemo(() => {
    if (!user) return true;
    const isOwnerModePath =
      pathname === "/dashboard" || pathname === "/dashboard/analytics";
    const sidebarRole =
      user.actorType === "owner" && (isOwnerModePath || !activeBranchId)
        ? "owner"
        : "branch";
    const sections = getSidebarForRole(sidebarRole, permissions);
    return sections.some((section) => section.items.length > 0);
  }, [activeBranchId, pathname, permissions, user]);

  const handleSignOut = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success("Logged out successfully");
      router.push("/sign-in");
    } catch {
      toast.error("Failed to logout");
    }
  };

  if (user && !hasDashboardAccess) {
    return (
      <div className="min-h-screen bg-gray-primary flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-2xl bg-white shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-3">
            Access Restricted
          </h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Your staff account is active, but no dashboard permissions are
            currently assigned. Please contact your admin to grant access.
          </p>
          <Button onClick={handleSignOut} className="btn-primary h-11 px-6">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-primary">
      <BranchFeeSetupProvider>
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="md:pl-70">
          <DashboardHeader
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
          />
          <main className="p-4 md:px-6 pt-24 md:pt-28 ">{children}</main>
        </div>
      </BranchFeeSetupProvider>
    </div>
  );
}
