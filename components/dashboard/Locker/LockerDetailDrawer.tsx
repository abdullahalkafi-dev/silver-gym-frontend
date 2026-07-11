"use client";

import {
  useUnassignMemberMutation,
  useUpdateLockerMutation,
  useGetLockerPaymentHistoryQuery,
} from "@/redux/features/locker/lockerApi";
import { HugeiconsIcon } from "@hugeicons/react";
import { Locker01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import type { Locker } from "@/types/locker";
import { useState } from "react";

interface LockerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  locker: Locker | null;
  systemPrice: number;
  onCollectPayment: (locker: Locker) => void;
  onEditPrice: (locker: Locker) => void;
  onAssignMember: (locker: Locker) => void;
}

export const LockerDetailDrawer = ({
  isOpen,
  onClose,
  branchId,
  locker,
  systemPrice,
  onCollectPayment,
  onEditPrice,
  onAssignMember,
}: LockerDetailDrawerProps) => {
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);

  const [unassignMember, { isLoading: isUnassigning }] =
    useUnassignMemberMutation();
  const [updateLocker, { isLoading: isUpdating }] =
    useUpdateLockerMutation();

  const { data: payments = [] } = useGetLockerPaymentHistoryQuery(
    { branchId, lockerId: locker?.id || "" },
    { skip: !locker?.id || !isOpen }
  );

  if (!isOpen || !locker) return null;

  const handleUnassign = async () => {
    try {
      await unassignMember({ branchId, lockerId: locker.id }).unwrap();
      toast.success("Member unassigned from locker");
      setShowUnassignConfirm(false);
      onClose();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to unassign member");
    }
  };

  const handleSetMaintenance = async () => {
    try {
      await updateLocker({
        branchId,
        lockerId: locker.id,
        payload: {
          status: locker.status === "maintenance" ? "available" : "maintenance",
        },
      }).unwrap();
      toast.success(
        locker.status === "maintenance"
          ? "Locker set to available"
          : "Locker set to maintenance"
      );
      onClose();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to update locker");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Locker01Icon}
              size={24}
              className="text-primary"
            />
            <h2 className="text-lg font-bold text-text-primary">
              Locker #{locker.lockerNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Status</span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                locker.status === "available"
                  ? "bg-green-100 text-green-700"
                  : locker.status === "occupied"
                  ? "bg-primary-100 text-primary-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {locker.status.charAt(0).toUpperCase() + locker.status.slice(1)}
            </span>
          </div>

          {/* Member Info (if occupied) */}
          {locker.status === "occupied" && (
            <>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-text-primary mb-3">
                  Assigned Member
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Name</span>
                    <span className="font-medium">
                      {locker.assignedMemberName || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Assigned Date</span>
                    <span className="font-medium">
                      {formatDate(locker.assignedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Next Billing</span>
                    <span className="font-medium">
                      {formatDate(locker.nextBillingDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Price</span>
                  <div className="text-right">
                    <span className="font-medium">
                      ৳{locker.isCustomPrice ? locker.customPrice : systemPrice}
                    </span>
                    {locker.isCustomPrice && (
                      <p className="text-xs text-text-secondary">(custom)</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            {locker.status === "occupied" && (
              <>
                <button
                  onClick={() => onCollectPayment(locker)}
                  className="btn-primary w-full py-2.5"
                >
                  Collect Payment
                </button>
                <button
                  onClick={() => onEditPrice(locker)}
                  className="btn-secondary w-full py-2.5"
                >
                  Edit Price
                </button>
                <button
                  onClick={() => setShowUnassignConfirm(true)}
                  className="w-full py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Unassign Member
                </button>
              </>
            )}
            {locker.status === "available" && (
              <>
                <button
                  onClick={() => onAssignMember(locker)}
                  className="btn-primary w-full py-2.5"
                >
                  Assign Member
                </button>
                <button
                  onClick={handleSetMaintenance}
                  disabled={isUpdating}
                  className="btn-secondary w-full py-2.5"
                >
                  {isUpdating
                    ? "Updating..."
                    : "Set to Maintenance"}
                </button>
              </>
            )}
            {locker.status === "maintenance" && (
              <button
                onClick={handleSetMaintenance}
                disabled={isUpdating}
                className="btn-secondary w-full py-2.5"
              >
                {isUpdating ? "Updating..." : "Set to Available"}
              </button>
            )}
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Payment History
              </h3>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                  >
                    <div>
                      <p className="text-xs font-mono text-text-secondary">
                        {payment.invoiceNo}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatDate(payment.paymentDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-text-primary">
                        ৳{payment.paidTotal}
                      </p>
                      {payment.exchange > 0 && (
                        <p className="text-xs text-green-600">
                          Exchange: ৳{payment.exchange}
                        </p>
                      )}
                      <span
                        className={`text-xs ${
                          payment.status === "paid"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {payment.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Unassign Confirmation */}
        {showUnassignConfirm && (
          <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-text-primary mb-2">
                Unassign Member?
              </h3>
              <p className="text-sm text-text-secondary mb-6">
                This will remove{" "}
                <strong>{locker.assignedMemberName}</strong> from Locker #
                {locker.lockerNumber}. The locker will become available.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowUnassignConfirm(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnassign}
                  disabled={isUnassigning}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isUnassigning ? "Removing..." : "Unassign"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
