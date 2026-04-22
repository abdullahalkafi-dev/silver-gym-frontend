// app/dashboard/members/details/[id]/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  PencilEdit02Icon,
  Upload04Icon,
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
import PaymentHistoryTable from "@/components/dashboard/Members/PaymentHistoryTable";
import MemberActivitiesCalendar from "@/components/dashboard/Members/MemberActivitiesCalendar";

export default function MemberDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;
  const { activeBranchId, hasPermission, isOwner } = useUser();
  const canViewPayments = isOwner || hasPermission("canViewPayments");
  const canCollectBills = isOwner || hasPermission("canAddPayment");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

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

  // ── Loading ─────────────────────────────────────────────────────
  if (!activeBranchId || isLoading) {
    return (
      <div className="min-h-screen">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
            <span className="text-lg font-medium">Member Profile</span>
          </button>
        </div>
        <div className="bg-white rounded-2xl p-6 animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────
  if (isError || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-500 text-lg">Member not found.</p>
          <button
            onClick={() => router.push("/dashboard/members")}
            className="px-6 py-2 bg-purple text-white rounded-lg hover:bg-purple/90 text-sm"
          >
            Back to Members
          </button>
        </div>
      </div>
    );
  }

  const isActive = member.isActive !== false;
  const displayId = member.memberId || member._id.slice(-8).toUpperCase();
  const isImportedMember =
    Boolean(member.source) && !["app", "manual"].includes(String(member.source).toLowerCase());
  const currentDueAmount = member.currentDueAmount ?? 0;
  const currentAdvanceAmount = member.currentAdvanceAmount ?? 0;

  const readFieldCls =
    "w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm";

  const trainingGoalOptions = [
    "Yoga",
    "Cardio Endurance",
    "Bodybuilding",
    "Muscle Gain",
    "Flexibility & Mobility",
    "General Fitness",
    "Strength Training",
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
          <span className="text-lg font-medium">Member Profile</span>
        </button>

        <div className="bg-white rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-400 flex items-center justify-center overflow-hidden">
              {member.photo ? (
                <div
                  role="img"
                  aria-label={member.fullName}
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${member.photo})` }}
                />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {member.fullName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                {member.fullName}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => setShowStatusModal(true)}
                  title="Click to change status"
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${
                    isActive
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </button>
                {isImportedMember && (
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    Imported
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-sm text-gray-500">ID: </span>
              <span className="text-sm font-medium font-mono text-gray-700">
                {displayId}
              </span>
            </div>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm">
              <HugeiconsIcon icon={Upload04Icon} size={18} />
              Upload Profile
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Contact — read-only with pencil opening modal */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">
                Personal Contact
              </h2>
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit member info"
              >
                <HugeiconsIcon
                  icon={PencilEdit02Icon}
                  size={20}
                  className="text-gray-600"
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-500 mb-2">Phone number</label>
                <div className={readFieldCls}>{member.contact || "—"}</div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">Emergency Contact</label>
                <div className={readFieldCls}>
                  {member.emergencyContact?.contactNumber || "—"}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">E-mail</label>
                <div className={readFieldCls}>{member.email || "—"}</div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">Address</label>
                <div className={readFieldCls}>{member.address || "—"}</div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">Birthday</label>
                <div className={readFieldCls}>
                  {member.dateOfBirth
                    ? new Date(member.dateOfBirth).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">Gender</label>
                <div className={readFieldCls}>{member.gender || "—"}</div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">NID</label>
                <div className={readFieldCls}>{member.nid || "—"}</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Height</label>
                  <div className={readFieldCls}>
                    {member.height != null
                      ? `${member.height} ${member.heightUnit || ""}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Age</label>
                  <div className={readFieldCls}>
                    {member.dateOfBirth
                      ? String(
                          new Date().getFullYear() -
                            new Date(member.dateOfBirth).getFullYear()
                        )
                      : "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Weight</label>
                  <div className={readFieldCls}>
                    {member.weight != null
                      ? `${member.weight} ${member.weightUnit || ""}`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Training Goals */}
          <div className="bg-white rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">
              Training Goals
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {trainingGoalOptions.map((goal) => (
                <label key={goal} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={member.trainingGoals?.includes(goal as never) ?? false}
                    readOnly
                    className="w-5 h-5 accent-orange-500 rounded"
                  />
                  <span className="text-sm text-gray-700">{goal}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">
                Payment History
              </h2>
              <div className="flex items-center gap-3">
                {currentDueAmount > 0 && (
                    <span className="text-sm text-red-600 font-medium">
                      Due: ৳{currentDueAmount.toLocaleString()}
                    </span>
                  )}
                {currentAdvanceAmount > 0 && (
                    <span className="text-sm text-amber-700 font-medium">
                      Advance: ৳{currentAdvanceAmount.toLocaleString()}
                    </span>
                  )}
                {canCollectBills && (
                  <button
                    onClick={() => router.push(`/dashboard/income/create-bill/${memberId}`)}
                    className="px-4 py-2 bg-purple text-white rounded-md hover:bg-purple/90 text-sm"
                  >
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
        </div>

        {/* Right Column - Member Activities */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 sticky top-6">
            <MemberActivitiesCalendar />
          </div>
        </div>
      </div>

      {/* Edit Member Modal */}
      {showEditModal && activeBranchId && (
        <EditMemberModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          member={member}
          branchId={activeBranchId}
        />
      )}

      {/* Status Toggle Modal */}
      <DeactivateMemberModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onConfirm={handleStatusToggle}
        memberName={member.fullName}
        isCurrentlyActive={isActive}
      />
    </div>
  );
}