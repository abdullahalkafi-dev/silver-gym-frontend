// components/modals/PayAdmissionDueModal.tsx
"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useCollectBillMutation } from "@/redux/features/member/memberApi";
import type {
  CollectBillDueItem,
  PaymentMethod,
} from "@/types/member";

interface PayAdmissionDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  memberId: string;
  admissionDueItems: CollectBillDueItem[];
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

export default function PayAdmissionDueModal({
  isOpen,
  onClose,
  branchId,
  memberId,
  admissionDueItems,
}: PayAdmissionDueModalProps) {
  const [collectBill, { isLoading }] = useCollectBillMutation();

  // Each item gets an input amount (defaults to full remaining)
  const [itemAmounts, setItemAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      admissionDueItems.map((item) => [
        item.ledgerItemId,
        String(item.remainingAmount),
      ])
    )
  );

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(() => toInputDate(new Date()));
  const [note, setNote] = useState("");

  const validItems = useMemo(
    () =>
      admissionDueItems.flatMap((item) => {
        const amt = normalizeMoney(
          parseAmount(itemAmounts[item.ledgerItemId] || "")
        );
        if (amt <= 0 || amt > item.remainingAmount) return [];
        return [{ ...item, requestedAmount: amt }];
      }),
    [admissionDueItems, itemAmounts]
  );

  const totalToPay = normalizeMoney(
    validItems.reduce((s, i) => s + i.requestedAmount, 0)
  );

  const handleSave = async () => {
    if (validItems.length === 0) {
      toast.error("Enter a valid amount for at least one admission due item");
      return;
    }

    try {
      const result = await collectBill({
        branchId,
        payload: {
          memberId,
          collectionMode: "due_only",
          selectedDueItems: validItems.map((i) => ({
            ledgerItemId: i.ledgerItemId,
            amount: i.requestedAmount,
          })),
          paidTotal: totalToPay,
          paymentMethod,
          paymentDate: new Date(paymentDate).toISOString(),
          note: note.trim() || undefined,
        },
      }).unwrap();

      toast.success(
        result.payment.invoiceNo
          ? `Invoice ${result.payment.invoiceNo} saved`
          : "Admission due collected successfully"
      );
      onClose();
    } catch (err) {
      const apiError = err as { data?: { message?: string } };
      toast.error(apiError.data?.message || "Failed to collect admission due");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Pay Admission Due
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Enter partial or full amounts for each admission due item.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Due items table */}
        <div className="px-6 pt-4">
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                    Description
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                    Outstanding
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                    Pay Now
                  </th>
                </tr>
              </thead>
              <tbody>
                {admissionDueItems.map((item) => {
                  const raw = itemAmounts[item.ledgerItemId] ?? "";
                  const amt = normalizeMoney(parseAmount(raw));
                  const isInvalid = raw !== "" && (amt <= 0 || amt > item.remainingAmount);
                  return (
                    <tr
                      key={item.ledgerItemId}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-4 py-3 text-gray-700">{item.label}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.remainingAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          max={item.remainingAmount}
                          value={raw}
                          onChange={(e) =>
                            setItemAmounts((prev) => ({
                              ...prev,
                              [item.ledgerItemId]: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className={`h-8 w-28 rounded-lg border px-2 text-right text-sm outline-none ${
                            isInvalid
                              ? "border-red-400 bg-red-50 focus:border-red-500"
                              : "border-gray-200 focus:border-violet-400"
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Total row */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold">
            <span className="text-gray-600">Total to pay</span>
            <span className="text-violet-700">{formatCurrency(totalToPay)} TK</span>
          </div>
        </div>

        {/* Payment details */}
        <div className="space-y-3 px-6 pt-4 pb-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-violet-400"
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-violet-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
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
              disabled={isLoading || validItems.length === 0}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
            >
              {isLoading ? "Saving..." : "Collect Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
