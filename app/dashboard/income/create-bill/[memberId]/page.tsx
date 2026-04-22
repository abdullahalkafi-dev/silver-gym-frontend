"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import CreateBillWorkspace from "@/components/dashboard/Income/CreateBillWorkspace";
import { useUser } from "@/hooks/useUser";
import {
  useGetCollectBillContextQuery,
  useGetMemberPaymentHistoryQuery,
} from "@/redux/features/member/memberApi";
import { useGetBranchPackagesQuery } from "@/redux/features/package/packageApi";

export default function CreateBillPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;
  const { activeBranchId, hasPermission, isOwner } = useUser();
  const canCollectBills = isOwner || hasPermission("canAddPayment");
  const canViewPayments = isOwner || hasPermission("canViewPayments");

  const {
    data: collectBillContext,
    isLoading: isContextLoading,
    isError: isContextError,
  } = useGetCollectBillContextQuery(
    { branchId: activeBranchId || "", memberId },
    { skip: !activeBranchId || !memberId || !canCollectBills },
  );

  const { data: packageResponse, isLoading: isPackagesLoading } =
    useGetBranchPackagesQuery(
      { branchId: activeBranchId || "", isActive: true },
      { skip: !activeBranchId || !canCollectBills },
    );

  const {
    data: paymentHistory = [],
    isLoading: isPaymentHistoryLoading,
  } = useGetMemberPaymentHistoryQuery(
    { branchId: activeBranchId || "", memberId, limit: 200 },
    {
      skip: !activeBranchId || !memberId || !canViewPayments,
    },
  );

  if (!canCollectBills) {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Billing access required</h1>
        <p className="mt-2 text-sm text-gray-500">
          You do not have permission to collect bills for members in this branch.
        </p>
      </div>
    );
  }

  if (!activeBranchId) {
    return (
      <div className="rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Select a branch first</h1>
        <p className="mt-2 text-sm text-gray-500">
          Collect bill needs an active branch to load package and member billing data.
        </p>
      </div>
    );
  }

  if (isContextError) {
    return (
      <div className="space-y-4 rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Unable to load billing context</h1>
        <p className="text-sm text-gray-500">
          The member billing screen could not be prepared. Check access and try again.
        </p>
        <button
          onClick={() => router.back()}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
      </div>
    );
  }

  if (isContextLoading) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-6">
            <div className="h-56 animate-pulse rounded-[28px] bg-white shadow-sm" />
            <div className="h-105 animate-pulse rounded-[28px] bg-white shadow-sm" />
          </div>
          <div className="h-160 animate-pulse rounded-[28px] bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  if (!collectBillContext) {
    return (
      <div className="space-y-4 rounded-3xl border border-amber-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Member billing context is unavailable</h1>
        <p className="text-sm text-gray-500">
          The member billing screen returned no data. Refresh or go back to the member profile and try again.
        </p>
        <button
          onClick={() => router.back()}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push(`/dashboard/members/details/${memberId}`)}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Member Profile
      </button>

      <CreateBillWorkspace
        key={`${collectBillContext.member._id}-${collectBillContext.billing.currentDueAmount}-${collectBillContext.billing.nextPaymentDate || "none"}-${collectBillContext.member.updatedAt || "na"}`}
        branchId={activeBranchId}
        memberId={memberId}
        context={collectBillContext}
        packages={packageResponse?.data || []}
        isPackagesLoading={isPackagesLoading}
        paymentHistory={paymentHistory}
        isPaymentHistoryLoading={isPaymentHistoryLoading}
        canViewPayments={canViewPayments}
        onCancel={() => router.push(`/dashboard/members/details/${memberId}`)}
      />
    </div>
  );
}
