"use client";

import { useState, useEffect } from "react";
import {
  useCollectLockerPaymentMutation,
  useGetLockerFeeQuery,
} from "@/redux/features/locker/lockerApi";
import { openLockerInvoice } from "@/lib/lockerInvoice";
import { toast } from "sonner";
import type { Locker } from "@/types/locker";

interface LockerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  locker: Locker | null;
}

export const LockerPaymentModal = ({
  isOpen,
  onClose,
  branchId,
  locker,
}: LockerPaymentModalProps) => {
  const [months, setMonths] = useState(1);
  const [useSystemPrice, setUseSystemPrice] = useState(true);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [autoFillPaid, setAutoFillPaid] = useState(true);

  const [collectPayment, { isLoading }] = useCollectLockerPaymentMutation();

  const { data: lockerFee } = useGetLockerFeeQuery(
    { branchId },
    { skip: !branchId }
  );

  const systemPrice = lockerFee?.lockerFeeAmount || 0;
  const effectivePrice = locker?.isCustomPrice ? locker.customPrice : systemPrice;

  useEffect(() => {
    if (isOpen) {
      setMonths(1);
      setUseSystemPrice(true);
      setCustomAmount("");
      setPaymentMethod("cash");
      setDiscount("");
      setPaidAmount("");
      setAutoFillPaid(true);
    }
  }, [isOpen]);

  const paymentAmount = useSystemPrice ? effectivePrice : (Number(customAmount) || 0);
  const subTotal = paymentAmount * months;
  const totalDue = Math.max(0, subTotal - (Number(discount) || 0));
  const exchange = Math.max(0, (Number(paidAmount) || 0) - totalDue);

  useEffect(() => {
    if (autoFillPaid) {
      setPaidAmount(String(totalDue));
    }
  }, [totalDue, autoFillPaid]);

  if (!isOpen || !locker) return null;

  const handleSave = async (print: boolean = false) => {
    if (!paidAmount || Number(paidAmount) <= 0) {
      toast.error("Please enter a valid paid amount");
      return;
    }

    try {
      const result = await collectPayment({
        branchId,
        lockerId: locker.id,
        payload: {
          months,
          paymentAmount: useSystemPrice ? undefined : (Number(customAmount) || 0),
          paymentMethod,
          discount: Number(discount) || 0,
        },
      }).unwrap();

      toast.success("Locker payment collected successfully");

      if (print) {
        openLockerInvoice({
          lockerNumber: locker.lockerNumber,
          memberName: locker.assignedMemberName || "Member",
          invoiceNo: result.payment.invoiceNo,
          months,
          amountPerMonth: paymentAmount,
          subTotal,
          discount: Number(discount) || 0,
          totalDue,
          paidAmount: Number(paidAmount) || 0,
          exchange,
          paymentMethod,
          periodStart: result.payment.periodStart,
          periodEnd: result.payment.periodEnd,
        });
      }

      onClose();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to collect payment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-text-primary mb-1">
          Collect Locker Payment
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Locker #{locker.lockerNumber} — {locker.assignedMemberName}
        </p>

        {/* Months */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Months
          </label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="input-primary w-full"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                {m} {m === 1 ? "Month" : "Months"}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Amount */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Payment Amount
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={useSystemPrice}
                onChange={() => setUseSystemPrice(true)}
                className="text-primary"
              />
              <span className="text-sm text-text-primary">
                System Price (৳{effectivePrice})
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!useSystemPrice}
                onChange={() => setUseSystemPrice(false)}
                className="text-primary"
              />
              <span className="text-sm text-text-primary">Custom Amount</span>
            </label>
            {!useSystemPrice && (
              <input
                type="number"
                min={0}
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setAutoFillPaid(true);
                }}
                className="input-primary w-full"
                placeholder="Enter custom amount"
              />
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="input-primary w-full"
          >
            <option value="cash">Cash</option>
            <option value="bkash">Bkash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Discount */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Discount (৳)
          </label>
          <input
            type="number"
            min={0}
            value={discount}
            onChange={(e) => {
              setDiscount(e.target.value);
              setAutoFillPaid(true);
            }}
            className="input-primary w-full"
            placeholder="0"
          />
        </div>

        {/* Summary */}
        <div className="mb-4 bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Amount/month</span>
            <span className="font-medium">৳{paymentAmount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Months</span>
            <span className="font-medium">×{months}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Subtotal</span>
            <span className="font-medium">৳{subTotal}</span>
          </div>
          {Number(discount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Discount</span>
              <span className="font-medium text-green-600">-৳{Number(discount)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
            <span>Total Due</span>
            <span>৳{totalDue}</span>
          </div>
        </div>

        {/* Paid Amount */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Paid Amount (৳)
          </label>
          <input
            type="number"
            min={0}
            value={paidAmount}
            onChange={(e) => {
              setPaidAmount(e.target.value);
              setAutoFillPaid(false);
            }}
            className="input-primary w-full"
          />
          {exchange > 0 && (
            <p className="text-xs text-green-600 mt-1">
              Exchange: ৳{exchange}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={isLoading}
            className="btn-primary px-4 py-2 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={isLoading}
            className="btn-primary px-4 py-2 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save & Print"}
          </button>
        </div>
      </div>
    </div>
  );
};
