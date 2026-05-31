// app/dashboard/members/details/[id]/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  PencilEdit02Icon,
  SmartPhone01Icon,
  Mail01Icon,
  FileIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import {
  useGetMemberByIdQuery,
  useGetMemberPaymentHistoryQuery,
  useUpdateMemberMutation,
} from "@/redux/features/member/memberApi";
import DeactivateMemberModal from "@/components/modals/DeactivateMemberModal";
import EditMemberModal from "@/components/modals/EditMemberModal";
import MemberImageViewModal from "@/components/modals/MemberImageViewModal";
import PaymentHistoryTable from "@/components/dashboard/Members/PaymentHistoryTable";
import MemberActivitiesCalendar from "@/components/dashboard/Members/MemberActivitiesCalendar";
import SmsHistoryTable from "@/components/dashboard/SMS/SmsHistoryTable";
import { useGetMemberSmsHistoryQuery } from "@/redux/features/sms/smsApi";

const formatDisplayDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calculateAge = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return String(age);
};

const trainingGoalOptions = [
  "Yoga",
  "Cardio Endurance",
  "Bodybuilding",
  "Muscle Gain",
  "Flexibility & Mobility",
  "General Fitness",
  "Strength Training",
] as const;

export default function MemberDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;
  const { user, activeBranchId, hasPermission, isOwner } = useUser();
  const canViewPayments = isOwner || hasPermission("canViewPayments");
  const canCollectBills = isOwner || hasPermission("canAddPayment");
  const canSendSms = isOwner || hasPermission("sms:send");
  const businessId = user?.businessProfile?.id || "";

  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageToView, setImageToView] = useState<string>("");

  const {
    data: member,
    isLoading,
    isError,
  } = useGetMemberByIdQuery(
    { branchId: activeBranchId || "", memberId },
    { skip: !activeBranchId || !memberId }
  );

  const {
    data: paymentHistory = [],
    isLoading: isPaymentHistoryLoading,
    isError: isPaymentHistoryError,
  } = useGetMemberPaymentHistoryQuery(
    { branchId: activeBranchId || "", memberId, limit: 50 },
    { skip: !canViewPayments || !activeBranchId || !memberId }
  );

  const [updateMember] = useUpdateMemberMutation();
  const {
    data: smsHistory,
    isLoading: isSmsHistoryLoading,
  } = useGetMemberSmsHistoryQuery(
    {
      businessId,
      branchId: activeBranchId || "",
      memberId,
      page: 1,
      limit: 5,
    },
    { skip: !canSendSms || !businessId || !activeBranchId || !memberId }
  );

  const handleStatusToggle = async () => {
    if (!member || !activeBranchId) return;
    try {
      await updateMember({
        branchId: activeBranchId,
        memberId: member._id,
        payload: { isActive: !member.isActive },
      }).unwrap();
      toast.success(
        member.isActive
          ? "Member deactivated successfully"
          : "Member reactivated successfully"
      );
      setShowStatusModal(false);
    } catch {
      toast.error("Failed to update member status. Please try again.");
    }
  };

  // ── Loading ──────────────────────────────────────────────────────
  if (!activeBranchId || isLoading) {
    return (
      <div className="min-h-screen">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
          <span className="text-lg font-medium">Member Profile</span>
        </button>
        <div className="animate-pulse space-y-4 rounded-2xl bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 rounded bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────
  if (isError || !member) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <p className="text-lg text-gray-500">Member not found.</p>
          <button
            onClick={() => router.push("/dashboard/members")}
            className="rounded-lg bg-violet-600 px-6 py-2 text-sm text-white hover:bg-violet-700"
          >
            Back to Members
          </button>
        </div>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────
  const isActive = member.isActive !== false;
  const displayId = member.memberId || member._id.slice(-8).toUpperCase();
  const isImportedMember =
    Boolean(member.source) &&
    !["app", "manual"].includes(String(member.source).toLowerCase());

  const heightValue =
    member.height != null
      ? `${member.height}${member.heightUnit ? ` ${member.heightUnit}` : ""}`.trim()
      : "—";
  const weightValue =
    member.weight != null
      ? `${member.weight}${member.weightUnit ? ` ${member.weightUnit}` : ""}`.trim()
      : "—";

  const totalPaid = paymentHistory.reduce((sum, r) => {
    const num = parseFloat(r.amount.replace(/[^0-9.]/g, ""));
    return sum + (Number.isFinite(num) ? num : 0);
  }, 0);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen space-y-5">
      {/* Page header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-700 transition-colors hover:text-gray-900"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
        <span className="text-lg font-medium">Member Profile</span>
      </button>

      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
        {/* ── LEFT COLUMN ───────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Member header card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-400 text-xl font-bold text-white cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    if (member.photo) {
                      setImageToView(member.photo);
                      setShowImageModal(true);
                    }
                  }}>
                  {member.photo ? (
                    <Image
                      src={member.photo}
                      alt={member.fullName}
                      width={56}
                      height={56}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    member.fullName.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Name + status badge */}
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {member.fullName}
                  </h1>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      onClick={() => setShowStatusModal(true)}
                      title="Click to change status"
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${
                        isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </button>
                    {isImportedMember && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Imported
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ID + Edit Profile */}
              <div className="flex shrink-0 items-center gap-3 text-sm text-gray-500">
                <span className="font-mono font-medium text-gray-700">
                  ID: {displayId}
                </span>
                {canSendSms && (
                  <button
                    onClick={() => router.push(`/dashboard/send-sms?memberId=${memberId}`)}
                    className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100"
                  >
                    Send SMS
                  </button>
                )}
                <button
                  onClick={() => setShowEditModal(true)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Personal Contact */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Personal Contact
              </h2>
              <button
                onClick={() => setShowEditModal(true)}
                className="text-gray-400 transition-colors hover:text-gray-600"
                aria-label="Edit personal contact"
              >
                <HugeiconsIcon icon={PencilEdit02Icon} size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Phone number */}
              <div>
                <p className="mb-1 text-xs text-gray-400">Phone number</p>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <HugeiconsIcon
                    icon={SmartPhone01Icon}
                    size={14}
                    className="shrink-0 text-gray-400"
                  />
                  <span className="truncate text-sm text-gray-700">
                    {member.contact || "—"}
                  </span>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <p className="mb-1 text-xs text-gray-400">Emergency Contact</p>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <HugeiconsIcon
                    icon={SmartPhone01Icon}
                    size={14}
                    className="shrink-0 text-gray-400"
                  />
                  <span className="truncate text-sm text-gray-700">
                    {member.emergencyContact?.contactNumber || "—"}
                  </span>
                </div>
              </div>

              {/* E-mail */}
              <div>
                <p className="mb-1 text-xs text-gray-400">E-mail</p>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <HugeiconsIcon
                    icon={Mail01Icon}
                    size={14}
                    className="shrink-0 text-gray-400"
                  />
                  <span className="truncate text-sm text-gray-700">
                    {member.email || "—"}
                  </span>
                </div>
              </div>

              {/* Address */}
              <div>
                <p className="mb-1 text-xs text-gray-400">Address</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <span className="text-sm text-gray-700">
                    {member.address || "—"}
                  </span>
                </div>
              </div>

              {/* Birthday */}
              <div>
                <p className="mb-1 text-xs text-gray-400">Birthday</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <span className="text-sm text-gray-700">
                    {formatDisplayDate(member.dateOfBirth)}
                  </span>
                </div>
              </div>

              {/* Gender */}
              <div>
                <p className="mb-1 text-xs text-gray-400">Gender</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <span className="text-sm text-gray-700">
                    {member.gender || "—"}
                  </span>
                </div>
              </div>

              {/* NID */}
              <div>
                <p className="mb-1 text-xs text-gray-400">NID</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <span className="text-sm text-gray-700">
                    {member.nid || "—"}
                  </span>
                </div>
              </div>

              {/* Country */}
              <div>
                <p className="mb-1 text-xs text-gray-400">Country</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <span className="text-sm text-gray-700">
                    {member.country || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Height / Age / Weight row */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <p className="mb-1 text-xs text-gray-400">Height</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <span className="text-sm text-gray-700">{heightValue}</span>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-400">Age</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <span className="text-sm text-gray-700">
                    {calculateAge(member.dateOfBirth)}
                  </span>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-400">Weight</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <span className="text-sm text-gray-700">{weightValue}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Training Goals */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Training Goals
            </h2>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              {trainingGoalOptions.map((goal) => {
                const isSelected =
                  member.trainingGoals?.includes(goal as never) ?? false;
                return (
                  <label
                    key={goal}
                    className="flex cursor-default items-center gap-2 text-sm text-gray-700"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? "border-orange-500 bg-orange-500"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          viewBox="0 0 10 8"
                          fill="none"
                          className="h-2.5 w-2.5"
                        >
                          <path
                            d="M1 4l3 3 5-6"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {goal}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Payment History */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-gray-900">
                Payment History
              </h2>
              <div className="flex items-center gap-3">
                {canViewPayments && paymentHistory.length > 0 && (
                  <span className="text-sm font-semibold text-gray-700">
                    Total pay: {totalPaid.toLocaleString()}TK
                  </span>
                )}
                {canCollectBills && (
                  <button
                    onClick={() =>
                      router.push(`/dashboard/income/create-bill/${memberId}`)
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
                  >
                    <HugeiconsIcon icon={FileIcon} size={14} />
                    Collect Bill
                  </button>
                )}
              </div>
            </div>

            <PaymentHistoryTable
              records={paymentHistory}
              isLoading={isPaymentHistoryLoading}
              memberDisplayId={displayId}
              emptyMessage={
                !canViewPayments
                  ? "You do not have permission to view payment history."
                  : isPaymentHistoryError
                    ? "Failed to load payment history."
                    : "No payment history found for this member yet."
              }
            />
          </div>

          {canSendSms && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">SMS History</h2>
                  <p className="text-sm text-gray-500">
                    Recent dry-run and blocked SMS activity for this member.
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/send-sms?memberId=${memberId}`)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Open SMS Workspace
                </button>
              </div>

              <SmsHistoryTable
                records={smsHistory?.data || []}
                isLoading={isSmsHistoryLoading}
                emptyMessage="No SMS history found for this member yet."
                showMemberColumn={false}
              />
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ─────────────────────────────────────── */}
        <div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Member Activities
            </h2>
            <MemberActivitiesCalendar memberId={memberId} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEditModal && activeBranchId && (
        <EditMemberModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          member={member}
          branchId={activeBranchId}
        />
      )}

      <DeactivateMemberModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onConfirm={handleStatusToggle}
        memberName={member.fullName}
        isCurrentlyActive={isActive}
      />

      <MemberImageViewModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        imageSrc={imageToView}
        memberName={member.fullName}
      />
    </div>
  );
}
