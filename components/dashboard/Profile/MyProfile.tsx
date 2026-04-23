"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  Logout01Icon,
  PencilEdit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/redux/hooks";
import { logoutUser } from "@/redux/features/auth/authSlice";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useGetBusinessProfileQuery,
  useGetMyProfileQuery,
  useUpdateBusinessProfileMutation,
  useUpdateMyProfileMutation,
} from "@/redux/features/profile/profileApi";
import { useUser } from "@/hooks/useUser";
import LogoutConfirmModal from "@/components/modals/LogoutConfirmModal";
import DeleteAccountModal from "@/components/modals/DeleteAccountModal";

type EditableField = "phone" | "companyAddress";

export default function MyProfile() {
  const [isEditing, setIsEditing] = useState<EditableField | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useUser();

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
  } = useGetMyProfileQuery();

  const { data: businessProfile } = useGetBusinessProfileQuery();

  const [updateMyProfile, { isLoading: isUpdatingProfile }] =
    useUpdateMyProfileMutation();
  const [updateBusinessProfile, { isLoading: isUpdatingBusiness }] =
    useUpdateBusinessProfileMutation();

  const isSaving = isUpdatingProfile || isUpdatingBusiness;

  const displayData = useMemo(() => {
    const fallbackName = user?.name || "User";

    return {
      name: profile?.fullName || fallbackName,
      role: user?.role || "admin",
      avatar: profile?.profilePicture || user?.profileImage || "/images/avatar.png",
      email: profile?.email || user?.email || "",
      phone: profile?.phone || user?.phone || "",
      companyAddress: businessProfile?.businessAddress || "",
    };
  }, [businessProfile?.businessAddress, profile, user?.email, user?.name, user?.phone, user?.profileImage, user?.role]);

  const handleEditClick = (field: EditableField, value: string) => {
    setIsEditing(field);
    setTempValue(value || "");
  };

  const handleCancel = () => {
    setIsEditing(null);
    setTempValue("");
  };

  const handleSave = async (field: EditableField) => {
    if (!tempValue.trim()) {
      toast.error("Field cannot be empty");
      return;
    }

    try {
      if (field === "phone") {
        await updateMyProfile({ phone: tempValue.trim() }).unwrap();
      }

      if (field === "companyAddress") {
        await updateBusinessProfile({ businessAddress: tempValue.trim() }).unwrap();
      }

      toast.success("Profile updated successfully");
      setIsEditing(null);
      setTempValue("");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: EditableField
  ) => {
    if (e.key === "Enter") {
      void handleSave(field);
    }

    if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleProfileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];

      if (!file) {
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }

      try {
        await updateMyProfile({ profilePicture: file }).unwrap();
        toast.success("Profile picture updated successfully");
      } catch (error) {
        toast.error(extractApiErrorMessage(error));
      }
    };

    input.click();
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);

    try {
      await dispatch(logoutUser()).unwrap();
      toast.success("Logged out successfully");
      router.push("/sign-in");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    toast.success("Account deletion endpoint is coming soon");
  };

  const renderEditableField = (
    label: string,
    field: EditableField,
    value: string,
    placeholder = ""
  ) => {
    const isFieldEditing = isEditing === field;

    return (
      <div className="mb-5 last:mb-0">
        <label className="block text-sm text-gray-500 mb-1.5">{label}</label>
        <div className="relative">
          {isFieldEditing ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, field)}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              <button
                onClick={() => void handleSave(field)}
                disabled={isSaving}
                className="px-3 py-2 bg-purple text-white rounded-sm text-sm whitespace-nowrap hover:bg-purple-600 transition-colors disabled:opacity-60"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-sm text-sm whitespace-nowrap hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between group">
              <p className="text-base text-gray-800 font-medium">{value || placeholder}</p>
              <button
                onClick={() => handleEditClick(field, value)}
                className="text-gray-400 hover:text-purple transition-colors p-1 rounded-md hover:bg-purple/5"
              >
                <HugeiconsIcon icon={PencilEdit02Icon} size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isProfileLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 mb-6 text-center text-gray-500">
        Loading profile...
      </div>
    );
  }

  if (isProfileError) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-red-100 mb-6 text-center">
        <p className="text-red-600 mb-3">{extractApiErrorMessage(profileError)}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-gray-200 rounded-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 relative">
              <Image
                src={displayData.avatar}
                alt={displayData.name}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{displayData.name}</h2>
              <span className="inline-block px-3 py-1 bg-gray-secondary rounded-sm border border-border-2 text-xs font-medium text-gray-600 capitalize mt-1">
                {displayData.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleProfileUpload}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-50 text-text-primary border border-border-2 text-sm font-medium rounded-sm hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-60"
          >
            Upload Profile
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Professional Contact</h3>

        <div className="space-y-6">
          {renderEditableField("Phone number", "phone", displayData.phone)}

          <div className="mb-5">
            <label className="block text-sm text-gray-500 mb-1.5">E-mail</label>
            <p className="text-base text-gray-800 font-medium">{displayData.email || "N/A"}</p>
          </div>

          {renderEditableField(
            "Company Address",
            "companyAddress",
            displayData.companyAddress,
            "Add business address"
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={() => toast.info("Additional addresses can be managed in Business Profile")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-sm text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} />
            Add Address
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Support Access</h3>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-1">Log out from this devices</h4>
              <p className="text-sm text-gray-500">
                End your current session and securely log out from this device to keep your account safe
              </p>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={Logout01Icon} size={20} />
              Logout
            </button>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <div>
              <h4 className="text-base font-semibold text-red-500 mb-1">Delete my account</h4>
              <p className="text-sm text-gray-500">
                Permanently delete the account and remove access from all workspaces.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-100 bg-red-50 text-red-600 rounded-sm text-sm font-medium hover:bg-red-100 transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={Delete02Icon} size={20} />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
