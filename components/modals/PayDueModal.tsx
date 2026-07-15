"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { useCollectBillMutation } from "@/redux/features/member/memberApi";
import type {
  CollectBillDueItem,
  DuePaymentSummary,
  PaymentMethod,
} from "@/types/member";
import DuePaymentDetailsModal from "./DuePaymentDetailsModal";

interface PayDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  memberId: string;
  admissionDueItems: CollectBillDueItem[];
  duePayments: DuePaymentSummary[];
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

export default function PayDueModal({
  isOpen,
  onClose,
  branchId,
  memberId,
  admissionDueItems,
  duePayments,
}: PayDueModalProps) {
  const [collectBill, { isLoading }] = useCollectBillMutation();

  const hasAdmissionDue = admissionDueItems.length > 0;
  const [activeTab, setActiveTab] = useState<"admission" | "payment">(
    hasAdmissionDue ? "admission" : "payment",
  );

  // Admission Due state
  const [itemAmounts, setItemAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      admissionDueItems.map((item) => [
        item.ledgerItemId,
        String(item.remainingAmount),
      ]),
    ),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(() => toInputDate(new Date()));
  const [note, setNote] = useState("");

  // Payment Due state
  const [selectedDuePayment, setSelectedDuePayment] =
    useState<DuePaymentSummary | null>(null);

  const admissionValidItems = useMemo(
    () =>
      admissionDueItems.flatMap((item) => {
        const amt = normalizeMoney(parseAmount(itemAmounts[item.ledgerItemId] || ""));
        if (amt <= 0 || amt > item.remainingAmount) return [];
        return [{ ...item, requestedAmount: amt }];
      }),
    [admissionDueItems, itemAmounts],
  );

  const admissionTotalToPay = normalizeMoney(
    admissionValidItems.reduce((s, i) => s + i.requestedAmount, 0),
  );

  const paymentDueTotal = normalizeMoney(
    duePayments.reduce((s, d) => s + d.remainingDue, 0),
  );

  const handleAdmissionSave = async () => {
    if (admissionValidItems.length === 0) {
      toast.error("Enter a valid amount for at least one admission due item");
      return;
    }

    try {
      const result = await collectBill({
        branchId,
        payload: {
          memberId,
          collectionMode: "due_only",
          selectedDueItems: admissionValidItems.map((i) => ({
            ledgerItemId: i.ledgerItemId,
            amount: i.requestedAmount,
          })),
          paidTotal: admissionTotalToPay,
          paymentMethod,
          paymentDate: new Date(paymentDate).toISOString(),
          note: note.trim() || undefined,
        },
      }).unwrap();

      toast.success(
        result.payment.invoiceNo
          ? `Invoice ${result.payment.invoiceNo} saved`
          : "Admission due collected successfully",
      );

      // Reset form
      setItemAmounts(
        Object.fromEntries(
          admissionDueItems.map((item) => [item.ledgerItemId, "0"]),
        ),
      );
      setNote("");

      // If no more dues, close
      if (duePayments.length === 0) {
        onClose();
      }
    } catch (err) {
      const apiError = err as { data?: { message?: string } };
      toast.error(apiError.data?.message || "Failed to collect admission due");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Pay Due
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Settle admission or payment dues for this member.
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

          {/* Tabs */}
          <div className="flex shrink-0 border-b border-gray-200">
            {hasAdmissionDue && (
              <button
                type="button"
                onClick={() => setActiveTab("admission")}
                className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === "admission"
                    ? "text-violet-700 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-violet-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Admission Due
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                  {formatCurrency(
                    admissionDueItems.reduce(
                      (s, i) => s + i.remainingAmount,
                      0,
                    ),
                  )}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("payment")}
              className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === "payment"
                  ? "text-violet-700 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-violet-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Payment Due
              {duePayments.length > 0 && (
                <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                  {duePayments.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Admission Due Tab */}
            {activeTab === "admission" && hasAdmissionDue && (
              <div className="space-y-4">
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
                        const isInvalid =
                          raw !== "" &&
                          (amt <= 0 || amt > item.remainingAmount);
                        return (
                          <tr
                            key={item.ledgerItemId}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="px-4 py-3 text-gray-700">
                              {item.label}
                            </td>
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

                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold">
                  <span className="text-gray-600">Total to pay</span>
                  <span className="text-violet-700">
                    {formatCurrency(admissionTotalToPay)} TK
                  </span>
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
                    onClick={handleAdmissionSave}
                    disabled={isLoading || admissionValidItems.length === 0}
                    className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                  >
                    {isLoading ? "Saving..." : "Collect Payment"}
                  </button>
                </div>
              </div>
            )}

            {/* Payment Due Tab */}
            {activeTab === "payment" && (
              <div className="space-y-3">
                {duePayments.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">
                    No payment dues found.
                  </div>
                ) : (
                  <>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                              Date
                            </th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                              Type
                            </th>
                            <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                              Bill
                            </th>
                            <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                              Paid
                            </th>
                            <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                              Remaining
                            </th>
                            <th className="px-4 py-2.5 text-center font-medium text-gray-600">
                              Note
                            </th>
                            <th className="px-4 py-2.5 text-center font-medium text-gray-600">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {duePayments.map((dueItem) => {
                            const p = dueItem.payment;
                            const payDate = p.paymentDate
                              ? format(new Date(p.paymentDate), "dd MMM yyyy")
                              : "—";
                            const typeLabel =
                              PAYMENT_TYPE_LABELS[p.paymentType || ""] ||
                              "Other";
                            const billAmt = p.billAmount ?? 0;
                            const paidAmt = p.paidTotal ?? 0;
                            const noteText =
                              (p.metadata?.note as string) || "";

                            return (
                              <tr
                                key={String(p._id)}
                                className="border-b border-gray-100 last:border-0"
                              >
                                <td className="px-4 py-3 text-gray-700">
                                  {payDate}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {typeLabel}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700">
                                  {formatCurrency(billAmt)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700">
                                  {formatCurrency(paidAmt)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-red-600">
                                  {formatCurrency(dueItem.remainingDue)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {noteText ? (
                                    <span
                                      title={noteText}
                                      className="inline-block max-w-[100px] truncate text-xs text-gray-500"
                                    >
                                      {noteText}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-300">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedDuePayment(dueItem)
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
                                  >
                                    Pay
                                    <ChevronRight className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold">
                      <span className="text-gray-600">
                        Total remaining ({duePayments.length}{" "}
                        {duePayments.length === 1 ? "payment" : "payments"})
                      </span>
                      <span className="text-red-600">
                        {formatCurrency(paymentDueTotal)} TK
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Due Payment Details Modal */}
      {selectedDuePayment && (
        <DuePaymentDetailsModal
          isOpen={!!selectedDuePayment}
          onClose={() => setSelectedDuePayment(null)}
          branchId={branchId}
          memberId={memberId}
          duePaymentSummary={selectedDuePayment}
        />
      )}
    </>
  );
}
