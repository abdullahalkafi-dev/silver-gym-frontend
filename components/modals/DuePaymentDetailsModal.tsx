"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useSettleDuePaymentMutation } from "@/redux/features/member/memberApi";
import type {
  DuePaymentSummary,
  PaymentMethod,
} from "@/types/member";

interface DuePaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  memberId: string;
  duePaymentSummary: DuePaymentSummary;
}

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bkash", label: "Bkash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

const normalizeMoney = (v: number) =>
  Math.round((v + Number.EPSILON) * 100) / 100;

const parseAmount = (v: string) => {
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (v: number) =>
  normalizeMoney(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toInputDate = (d: Date) => format(d, "yyyy-MM-dd");

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  package: "Package",
  monthly: "Monthly",
  admission: "Admission",
  registration: "Registration",
  locker: "Locker",
  other: "Other",
};

export default function DuePaymentDetailsModal({
  isOpen,
  onClose,
  branchId,
  memberId,
  duePaymentSummary,
}: DuePaymentDetailsModalProps) {
  const [settleDue, { isLoading }] = useSettleDuePaymentMutation();

  const [payAmount, setPayAmount] = useState(() =>
    String(duePaymentSummary.remainingDue),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(() => toInputDate(new Date()));
  const [note, setNote] = useState("");

  const { payment, settlements, remainingDue } = duePaymentSummary;
  const payAmountNum = normalizeMoney(parseAmount(payAmount));
  const isInvalidAmount = payAmount !== "" && (payAmountNum <= 0 || payAmountNum > remainingDue);

  const payDate = payment.paymentDate
    ? format(new Date(payment.paymentDate), "dd MMM yyyy")
    : "—";
  const typeLabel =
    PAYMENT_TYPE_LABELS[payment.paymentType || ""] || "Other";
  const billAmount = payment.billAmount ?? 0;
  const paidTotal = payment.paidTotal ?? 0;

  const handleSave = async () => {
    if (payAmountNum <= 0) {
      toast.error("Enter a valid amount greater than 0");
      return;
    }
    if (payAmountNum > remainingDue) {
      toast.error("Amount cannot exceed the remaining due");
      return;
    }

    try {
      const result = await settleDue({
        branchId,
        payload: {
          parentPaymentId: String(payment._id),
          paidTotal: payAmountNum,
          paymentMethod,
          paymentDate: new Date(paymentDate).toISOString(),
          note: note.trim() || undefined,
        },
      }).unwrap();

      toast.success(
        result.settlementPayment.invoiceNo
          ? `Invoice ${result.settlementPayment.invoiceNo} saved`
          : "Due settled successfully",
      );
      onClose();
    } catch (err) {
      const apiError = err as { data?: { message?: string } };
      toast.error(apiError.data?.message || "Failed to settle due");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Payment Details
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {payment.invoiceNo || "Payment"} — {typeLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Original Payment Info */}
          <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Date</p>
                <p className="font-medium text-gray-700">{payDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Type</p>
                <p className="font-medium text-gray-700">{typeLabel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Bill Amount</p>
                <p className="font-medium text-gray-700">
                  {formatCurrency(billAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Paid</p>
                <p className="font-medium text-gray-700">
                  {formatCurrency(paidTotal)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Remaining</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(remainingDue)} TK
                </p>
              </div>
            </div>
          </div>

          {/* Settlement History */}
          <div className="mb-5">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Settlement History
            </h3>
            {settlements.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">
                No payments made yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                        Date
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                        Method
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                        Invoice
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => (
                      <tr
                        key={String(s._id)}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-3 py-2 text-gray-600">
                          {s.paymentDate
                            ? format(new Date(s.paymentDate), "dd MMM yyyy")
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-700">
                          {formatCurrency(s.paidTotal ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {s.paymentMethod || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {s.invoiceNo || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pay More Form */}
          <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
            <h3 className="text-sm font-semibold text-violet-800">
              Pay More
            </h3>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                max={remainingDue}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                className={`h-9 w-full rounded-lg border px-3 text-sm text-gray-700 outline-none ${
                  isInvalidAmount
                    ? "border-red-400 bg-red-50 focus:border-red-500"
                    : "border-gray-200 bg-white focus:border-violet-400"
                }`}
              />
              {isInvalidAmount && (
                <p className="mt-1 text-xs text-red-500">
                  Must be between 0 and {formatCurrency(remainingDue)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-violet-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-violet-400"
                >
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add a note..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-violet-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || payAmountNum <= 0 || isInvalidAmount}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
          >
            {isLoading ? "Saving..." : `Pay ${formatCurrency(payAmountNum)} TK`}
          </button>
        </div>
      </div>
    </div>
  );
}
