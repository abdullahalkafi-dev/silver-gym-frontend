// components/dashboard/Sidebar/Sidebar.tsx
"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import { getSidebarForRole } from "@/config/sidebarConfig";
import { cn } from "@/lib/utils";
import LogoutConfirmModal from "@/components/modals/LogoutConfirmModal";
import Link from "next/link";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { logoutUser, setActiveBranchId } from "@/redux/features/auth/authSlice";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const permissions = useAppSelector((state) => state.auth.permissions);
  const activeBranchId = useAppSelector((state) => state.auth.activeBranchId);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!user) return null;

  // Owner sees the "owner" sidebar only on the branch-list and analytics pages;
  // everywhere else (branch context) both owner and staff use the shared "branch" sidebar.
  const isOwnerModePath =
    pathname === "/dashboard" || pathname === "/dashboard/analytics";
  const sidebarRole =
    user.actorType === "owner" && (isOwnerModePath || !activeBranchId)
      ? "owner"
      : "branch";
  const sidebarSections = getSidebarForRole(sidebarRole, permissions);

  const handleNavClick = () => {
    setIsOpen(false);
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success("Logged out successfully");
      router.push("/sign-in");
    } catch (error) {
      toast.error("Failed to logout");
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-70 bg-white  flex flex-col z-50 transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="h-20 flex items-center justify-center px-6">
          <div className="flex items-center gap-2">
            <Image src="/silver-gym.png" alt="Logo" width={200} height={200} />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4">
          {/* Back to Branches button — shown when owner is inside a specific branch */}
          {user.actorType === "owner" && sidebarRole === "branch" && (
            <button
              type="button"
              onClick={() => {
                dispatch(setActiveBranchId(null));
                router.push("/dashboard");
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 mb-4 rounded-lg text-sm font-medium text-[#6C6C6C] hover:bg-primary-200 hover:text-gray-900 transition-all duration-200"
            >
              <span className="text-base leading-none">←</span>
              <span>Back to Branches</span>
            </button>
          )}
          <div className="space-y-1">
            {sidebarSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                {section.items.map((item) => {
                  // Exact match for root pages; prefix match for all others
                  const isActive =
                    item.path === "/dashboard"
                      ? pathname === "/dashboard"
                      : item.path === "/dashboard/branch-dashboard"
                        ? pathname === "/dashboard/branch-dashboard"
                        : pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.id}
                      href={item.path}
                      onClick={handleNavClick}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 mb-1",
                        isActive
                          ? "bg-linear-to-r bg-primary text-white shadow-md"
                          : "text-gray-600 hover:bg-primary-200 hover:text-gray-900"
                      )}
                    >
                      <span
                        className={cn(
                          isActive ? "text-white" : "text-gray-500"
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}

                {sectionIndex < sidebarSections.length - 1 &&
                  section.divider && (
                    <div className="my-4 border-t border-dashed border-gray-300" />
                  )}
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Link 
            href="/dashboard/profile"
            onClick={handleNavClick}
            className="flex items-center gap-3 mb-4 px-2 hover:bg-gray-50 rounded-lg p-2 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center">
              {user.avatar || user.profileImage ? (
                <Image
                  src={
                    user.avatar ||
                    user.profileImage ||
                    "/images/avatar.png"
                  }
                  alt={user.name || "User"}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-lg font-semibold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {user.role || "Member"}
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-[15px] font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <HugeiconsIcon icon={Logout01Icon} size={24} />
            <span className="truncate">Logout</span>
          </button>
        </div>
      </aside>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
