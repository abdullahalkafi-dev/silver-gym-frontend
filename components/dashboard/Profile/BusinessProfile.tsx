"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useGetBusinessProfileQuery,
  useUpdateBusinessProfileMutation,
  type BusinessProfileResponse,
} from "@/redux/features/profile/profileApi";

type EditableField =
  | "name"
  | "phone"
  | "businessEmail"
  | "companyAddress"
  | "country"
  | "postalCode"
  | "cityState"
  | "businessCategory"
  | "registrationNumber";

const BUSINESS_TYPES: BusinessProfileResponse["businessType"][] = [
  "gym",
  "fitness",
  "studio",
  "other",
];

export default function BusinessProfile() {
  const [isEditing, setIsEditing] = useState<EditableField | null>(null);
  const [tempValue, setTempValue] = useState("");

  const {
    data,
    isLoading,
    isError,
    error,
  } = useGetBusinessProfileQuery();

  const [updateBusinessProfile, { isLoading: isUpdating }] =
    useUpdateBusinessProfileMutation();

  const displayData = useMemo(
    () => ({
      name: data?.businessName || "",
      email: data?.businessEmail || "",
      logo: data?.logo,
      phone: data?.businessPhoneNumber || "",
      businessEmail: data?.businessEmail || "",
      companyAddress: data?.businessAddress || "",
      country: data?.country || "",
      postalCode: data?.zip || "",
      cityState: data?.city || "",
      businessCategory: data?.businessType || "other",
      registrationNumber: data?.registrationNumber || "",
      defaultCurrency: "Coming soon",
    }),
    [data]
  );

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
      if (field === "name") {
        await updateBusinessProfile({ businessName: tempValue.trim() }).unwrap();
      }

      if (field === "phone") {
        await updateBusinessProfile({ businessPhoneNumber: tempValue.trim() }).unwrap();
      }

      if (field === "businessEmail") {
        await updateBusinessProfile({ businessEmail: tempValue.trim() }).unwrap();
      }

      if (field === "companyAddress") {
        await updateBusinessProfile({ businessAddress: tempValue.trim() }).unwrap();
      }

      if (field === "country") {
        await updateBusinessProfile({ country: tempValue.trim() }).unwrap();
      }

      if (field === "postalCode") {
        await updateBusinessProfile({ zip: tempValue.trim() }).unwrap();
      }

      if (field === "cityState") {
        await updateBusinessProfile({ city: tempValue.trim() }).unwrap();
      }

      if (field === "registrationNumber") {
        await updateBusinessProfile({ registrationNumber: tempValue.trim() }).unwrap();
      }

      if (field === "businessCategory") {
        const normalizedType = tempValue.trim().toLowerCase();
        if (!BUSINESS_TYPES.includes(normalizedType as BusinessProfileResponse["businessType"])) {
          toast.error("Business category must be gym, fitness, studio, or other");
          return;
        }

        await updateBusinessProfile({
          businessType: normalizedType as BusinessProfileResponse["businessType"],
        }).unwrap();
      }

      toast.success("Business profile updated successfully");
      setIsEditing(null);
      setTempValue("");
    } catch (saveError) {
      toast.error(extractApiErrorMessage(saveError));
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

  const handleLogoUpload = () => {
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
        await updateBusinessProfile({ logo: file }).unwrap();
        toast.success("Logo updated successfully");
      } catch (uploadError) {
        toast.error(extractApiErrorMessage(uploadError));
      }
    };

    input.click();
  };

  const renderEditableField = (
    label: string,
    field: EditableField,
    value: string,
    placeholder = ""
  ) => {
    const isFieldEditing = isEditing === field;

    return (
      <div className="mb-6 last:mb-0">
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
                placeholder={placeholder}
              />
              <button
                onClick={() => void handleSave(field)}
                disabled={isUpdating}
                className="px-3 py-2 bg-purple text-white rounded-sm text-sm whitespace-nowrap hover:bg-purple-600 transition-colors disabled:opacity-60"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                disabled={isUpdating}
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 mb-6 text-center text-gray-500">
        Loading business profile...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-red-100 mb-6 text-center">
        <p className="text-red-600 mb-3">{extractApiErrorMessage(error)}</p>
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
            <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center relative">
              {displayData.logo ? (
                <Image
                  src={displayData.logo}
                  alt={displayData.name || "Business Logo"}
                  width={64}
                  height={64}
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {(displayData.name || "B").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{displayData.name || "Business"}</h2>
              <p className="text-sm text-gray-500 mt-1">{displayData.email || "N/A"}</p>
            </div>
          </div>
          <button
            onClick={handleLogoUpload}
            disabled={isUpdating}
            className="px-4 py-2 bg-gray-50 text-text-primary border border-border-2 text-sm font-medium rounded-sm hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-60"
          >
            Upload Logo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Professional Contact</h3>

        <div className="space-y-6">
          {renderEditableField("Phone number", "phone", displayData.phone, "Add phone number")}
          {renderEditableField("E-mail", "businessEmail", displayData.businessEmail, "Add business email")}
          {renderEditableField(
            "Company Address",
            "companyAddress",
            displayData.companyAddress,
            "Add company address"
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Address</h3>

        <div className="space-y-6">
          {renderEditableField("Country", "country", displayData.country, "Add country")}
          {renderEditableField("Postal Code", "postalCode", displayData.postalCode, "Add postal code")}
          {renderEditableField("City/State", "cityState", displayData.cityState, "Add city or state")}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Business Information</h3>

        <div className="space-y-6">
          <div className="mb-6">
            <label className="block text-sm text-gray-500 mb-1.5">Default Currency</label>
            <p className="text-base text-gray-800 font-medium">{displayData.defaultCurrency}</p>
          </div>
          {renderEditableField(
            "Business Category",
            "businessCategory",
            displayData.businessCategory,
            "gym | fitness | studio | other"
          )}
          {renderEditableField(
            "Registration / Trade License Number",
            "registrationNumber",
            displayData.registrationNumber,
            "Add registration number"
          )}
        </div>
      </div>
    </div>
  );
}
