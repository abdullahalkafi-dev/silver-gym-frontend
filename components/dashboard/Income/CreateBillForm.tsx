"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  parseISO,
} from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Printer,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import PaymentHistoryTable from "@/components/dashboard/Members/PaymentHistoryTable";
import { Input } from "@/components/ui/input";
import { useCollectBillMutation } from "@/redux/features/member/memberApi";
import type {
  CollectBillContext,
  CollectBillMode,
  CollectBillResult,
  PaymentMethod,
  PaymentRecord,
} from "@/types/member";
import type { GymPackage } from "@/types/package";

interface CreateBillFormProps {
  branchId: string;
  memberId: string;
  context: CollectBillContext;
  packages: GymPackage[];
  isPackagesLoading?: boolean;
  paymentHistory: PaymentRecord[];
  isPaymentHistoryLoading?: boolean;
  canViewPayments: boolean;
  onCancel: () => void;
}

const MONTHLY_OPTIONS = [1, 2, 3, 6, 12] as const;

const MODE_OPTIONS: Array<{
  value: CollectBillMode;
  title: string;
  description: string;
}> = [
  {
    value: "due_only",
    title: "Due only",
    description: "Pay part or all of the old due without starting a new cycle.",
  },
  {
    value: "monthly",
    title: "Monthly renewal",
    description: "Start a new monthly cycle and move the next payment date forward.",
  },
  {
    value: "package",
    title: "Move to package",
    description: "Assign a package and reactivate the member from the selected start date.",
  },
];

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bkash", label: "Bkash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

const formatCurrency = (amount: number) => `৳${amount.toLocaleString()}`;

const parseAmount = (value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, "");
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toInputDate = (value?: string) => {
  if (!value) {
    return format(new Date(), "yyyy-MM-dd");
  }

  const nextDate = new Date(value);
  if (Number.isNaN(nextDate.getTime())) {
    return format(new Date(), "yyyy-MM-dd");
  }

  return format(nextDate, "yyyy-MM-dd");
};

const formatDateLabel = (value?: string | Date) => {
  if (!value) {
    return "Not scheduled";
  }

  const nextDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(nextDate.getTime())) {
    return "Not scheduled";
  }

  return format(nextDate, "dd MMM yyyy");
};

const getPackageCharge = (pkg?: GymPackage) => {
  if (!pkg) {
    return 0;
  }

  const admissionFee = pkg.includeAdmissionFee ? pkg.admissionFeeAmount ?? 0 : 0;
  return pkg.amount + admissionFee;
};

const getPackageNextPaymentDate = (startDate: Date, pkg?: GymPackage) => {
  if (!pkg) {
    return undefined;
  }

  switch (pkg.durationType) {
    case "day":
      return addDays(startDate, pkg.duration);
    case "week":
      return addWeeks(startDate, pkg.duration);
    case "year":
      return addYears(startDate, pkg.duration);
    case "month":
    default:
      return addMonths(startDate, pkg.duration);
  }
};

const getInitialMode = (context: CollectBillContext): CollectBillMode => {
  if (context.member.currentPackageId) {
    return "package";
  }

  if (context.billing.monthlyFeeAmount) {
    return "monthly";
  }

  return "due_only";
};

export default function CreateBillForm({
  branchId,
  memberId,
  context,
  packages,
  isPackagesLoading = false,
  paymentHistory,
  isPaymentHistoryLoading = false,
  canViewPayments,
  onCancel,
}: CreateBillFormProps) {
  const [collectBill, { isLoading: isCollecting }] = useCollectBillMutation();

  const [mode, setMode] = useState<CollectBillMode>(getInitialMode(context));
  const [selectedPackageId, setSelectedPackageId] = useState(
    context.member.currentPackageId || "",
  );
  const [paidMonths, setPaidMonths] = useState(1);
  const [startDate, setStartDate] = useState(
    toInputDate(context.billing.recommendedStartDate),
  );
  const [requestedDuePayment, setRequestedDuePayment] = useState("");
  const [discount, setDiscount] = useState("");
  const [paidTotal, setPaidTotal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [lastSavedBill, setLastSavedBill] = useState<CollectBillResult | null>(null);

  const member = context.member;
  const resolvedSelectedPackageId =
    selectedPackageId || context.member.currentPackageId || packages[0]?.id || "";
  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === resolvedSelectedPackageId),
    [packages, resolvedSelectedPackageId],
  );
  const currentDue = context.billing.currentDueAmount;
  const currentAdvance = context.billing.currentAdvanceAmount;
  const monthlyFee = context.billing.monthlyFeeAmount ?? 0;
  const duePaymentNow = parseAmount(requestedDuePayment);
  const discountAmount = parseAmount(discount);
  const paidNow = parseAmount(paidTotal);
  const cycleStartDate = useMemo(() => parseISO(startDate), [startDate]);

  const cycleCharge = useMemo(() => {
    if (mode === "monthly") {
      return monthlyFee * paidMonths;
    }

    if (mode === "package") {
      return getPackageCharge(selectedPackage);
    }

    return 0;
  }, [mode, monthlyFee, paidMonths, selectedPackage]);

  const projectedNextPaymentDate = useMemo(() => {
    if (mode === "monthly") {
      return addMonths(cycleStartDate, paidMonths);
    }

    if (mode === "package") {
      return getPackageNextPaymentDate(cycleStartDate, selectedPackage);
    }

    return member.nextPaymentDate ? new Date(member.nextPaymentDate) : undefined;
  }, [cycleStartDate, member.nextPaymentDate, mode, paidMonths, selectedPackage]);

  const remainingCycleChargeAfterDiscount = Math.max(cycleCharge - discountAmount, 0);
  const overflowIntoDue = Math.max(paidNow - remainingCycleChargeAfterDiscount, 0);
  const effectiveDuePayment = Math.min(
    currentDue,
    Math.max(duePaymentNow, overflowIntoDue),
  );
  const subTotal = effectiveDuePayment + cycleCharge;
  const invoiceNet = subTotal - discountAmount - paidNow;
  const invoiceDue = Math.max(invoiceNet, 0);
  const invoiceAdvance = Math.max(-invoiceNet, 0);
  const finalNetBalance =
    currentDue - currentAdvance - effectiveDuePayment + invoiceNet;
  const finalDue = Math.max(finalNetBalance, 0);
  const finalAdvance = Math.max(-finalNetBalance, 0);
  const modeRequiresPackage = mode === "package";
  const modeRequiresMonthly = mode === "monthly";
  const canUseMonthly = monthlyFee > 0;
  const statusTone = member.isActive === false ? "Inactive" : "Active";

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    if (modeRequiresMonthly && !canUseMonthly) {
      toast.error("Monthly fee is not configured for this member or branch");
      return;
    }

    if (modeRequiresPackage && !resolvedSelectedPackageId) {
      toast.error("Select a package before saving the bill");
      return;
    }

    if (discountAmount > subTotal) {
      toast.error("Discount cannot be higher than the selected bill total");
      return;
    }

    if (duePaymentNow > currentDue) {
      toast.error("Old due payment cannot exceed the current due amount");
      return;
    }

    const payload = {
      memberId,
      collectionMode: mode,
      duePaymentAmount: duePaymentNow,
      paidTotal: paidNow,
      paymentMethod,
      discount: discountAmount,
      startDate,
      ...(modeRequiresMonthly ? { paidMonths } : {}),
      ...(modeRequiresPackage ? { packageId: resolvedSelectedPackageId } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };

    try {
      const result = await collectBill({ branchId, payload }).unwrap();
      setLastSavedBill(result);
      toast.success(
        result.payment.invoiceNo
          ? `Invoice ${result.payment.invoiceNo} saved successfully`
          : "Bill collected successfully",
      );
      setRequestedDuePayment("");
      setDiscount("");
      setPaidTotal("");
      setNote("");
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      toast.error(apiError?.data?.message || "Failed to collect bill");
    }
  };

  return (
    <div className="space-y-6 print:bg-white">
      <section className="overflow-hidden rounded-[32px] border border-orange-100 bg-[radial-gradient(circle_at_top_left,_rgba(255,245,235,0.95),_rgba(255,255,255,1)_55%)] p-6 shadow-sm print:border-0 print:bg-white print:p-0">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-orange-100 text-2xl font-semibold text-orange-700 ring-1 ring-orange-200">
              {member.photo ? (
                <div
                  role="img"
                  aria-label={member.fullName}
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${member.photo})` }}
                />
              ) : (
                member.fullName.charAt(0).toUpperCase()
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
                  Collect Bill
                </p>
                <h1 className="mt-1 text-3xl font-semibold text-gray-900">
                  {member.fullName}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full px-3 py-1 font-medium ${member.isActive === false ? "bg-gray-200 text-gray-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {statusTone}
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-gray-600 ring-1 ring-gray-200">
                  ID {member.memberId || member._id.slice(-8).toUpperCase()}
                </span>
                {lastSavedBill?.payment.invoiceNo && (
                  <span className="rounded-full bg-purple/10 px-3 py-1 font-medium text-purple ring-1 ring-purple/20">
                    {lastSavedBill.payment.invoiceNo}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                <span>{member.contact || "No contact number"}</span>
                <span>{member.email || "No email address"}</span>
                <span>
                  Current plan {member.currentPackageName || (monthlyFee ? "Monthly billing" : "Not assigned")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
            <div className="rounded-[22px] bg-white/80 p-4 ring-1 ring-gray-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Current Due
              </p>
              <p className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(currentDue)}</p>
            </div>
            <div className="rounded-[22px] bg-white/80 p-4 ring-1 ring-gray-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Advance
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">{formatCurrency(currentAdvance)}</p>
            </div>
            <div className="rounded-[22px] bg-white/80 p-4 ring-1 ring-gray-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Overdue Months
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{context.billing.overdueMonths}</p>
            </div>
            <div className="rounded-[22px] bg-white/80 p-4 ring-1 ring-gray-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Next Payment
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {formatDateLabel(member.nextPaymentDate)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.92fr] print:grid-cols-1">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm print:border print:border-gray-200">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Billing Snapshot</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Old due stays on the member account unless you cover it here. Starting a new cycle reactivates inactive members.
                </p>
              </div>
              {lastSavedBill && (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right text-sm text-emerald-700">
                  <p className="font-semibold">Latest save confirmed</p>
                  <p className="mt-1">{formatDateLabel(lastSavedBill.payment.paymentDate)}</p>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                  <Wallet className="h-4 w-4" />
                  Old due
                </div>
                <p className="mt-3 text-2xl font-semibold text-red-700">{formatCurrency(currentDue)}</p>
                <p className="mt-2 text-xs leading-5 text-red-600">
                  This balance remains due if you do not settle it now.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CreditCard className="h-4 w-4" />
                  Advance credit
                </div>
                <p className="mt-3 text-2xl font-semibold text-emerald-700">{formatCurrency(currentAdvance)}</p>
                <p className="mt-2 text-xs leading-5 text-emerald-600">
                  Existing advance automatically offsets the account after this bill.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <Clock3 className="h-4 w-4" />
                  Overdue added
                </div>
                <p className="mt-3 text-2xl font-semibold text-amber-800">{formatCurrency(context.billing.accruedAmount)}</p>
                <p className="mt-2 text-xs leading-5 text-amber-700">
                  Auto-added from {context.billing.overdueMonths} overdue month{context.billing.overdueMonths === 1 ? "" : "s"}.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <CalendarDays className="h-4 w-4" />
                  Monthly fee
                </div>
                <p className="mt-3 text-2xl font-semibold text-gray-900">
                  {monthlyFee ? formatCurrency(monthlyFee) : "Not set"}
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Monthly renewal is available only when a member or branch monthly fee exists.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm print:border print:border-gray-200">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Recent invoices for this member, including imported opening balances.
                </p>
              </div>

              {canViewPayments && (
                <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {paymentHistory.length} entries
                </div>
              )}
            </div>

            {canViewPayments ? (
              <PaymentHistoryTable
                records={paymentHistory}
                isLoading={isPaymentHistoryLoading}
                memberDisplayId={member.memberId || member._id.slice(-8).toUpperCase()}
                emptyMessage="No payment history is available for this member yet."
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                You can collect bills, but payment history is hidden because your role does not include billing:view.
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 print:mt-6">
          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm print:border print:border-gray-200">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Collect Bill</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Settle old due, start a new cycle, or both in one save.
                </p>
              </div>
              <div className="rounded-2xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600">
                Member {member.isActive === false ? "will reactivate on new cycle" : "stays active"}
              </div>
            </div>

            <div className="space-y-3">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                    mode === option.value
                      ? "border-purple bg-purple/5 ring-1 ring-purple/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{option.title}</p>
                      <p className="mt-1 text-sm text-gray-500">{option.description}</p>
                    </div>
                    {mode === option.value && <CheckCircle2 className="h-5 w-5 text-purple" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-5 border-t border-gray-100 pt-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Old due to cover now
                </label>
                <Input
                  inputMode="decimal"
                  value={requestedDuePayment}
                  onChange={(event) => setRequestedDuePayment(event.target.value)}
                  placeholder="0.00"
                  className="h-11 rounded-xl border-gray-200"
                />
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Remaining old due after this bill: {formatCurrency(Math.max(currentDue - effectiveDuePayment, 0))}
                </p>
              </div>

              {modeRequiresMonthly && (
                <div className="space-y-4 rounded-[24px] border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Monthly renewal</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Use the member custom rate first, otherwise the branch monthly fee.
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                      {canUseMonthly ? formatCurrency(monthlyFee) : "Fee missing"}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Months to activate
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {MONTHLY_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setPaidMonths(option)}
                          className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                            paidMonths === option
                              ? "bg-purple text-white"
                              : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {option}M
                        </button>
                      ))}
                    </div>
                  </div>

                  {!canUseMonthly && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      Monthly fee is missing, so you can collect due only or move the member to a package.
                    </div>
                  )}
                </div>
              )}

              {modeRequiresPackage && (
                <div className="space-y-4 rounded-[24px] border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Package move</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Pick an active package. The package duration sets the next payment date.
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                      {isPackagesLoading ? "Loading..." : `${packages.length} active`}
                    </div>
                  </div>

                  <div className="relative">
                    <select
                      value={resolvedSelectedPackageId}
                      onChange={(event) => setSelectedPackageId(event.target.value)}
                      className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none transition-colors focus:border-purple"
                    >
                      {!packages.length && <option value="">No active package found</option>}
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.title} · {formatCurrency(getPackageCharge(pkg))}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>

                  {selectedPackage && (
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-900">{selectedPackage.title}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {selectedPackage.duration} {selectedPackage.durationType}
                            {selectedPackage.duration > 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Charge</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(getPackageCharge(selectedPackage))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Cycle start date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-11 rounded-xl border-gray-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Payment method
                  </label>
                  <div className="relative">
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                      className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none transition-colors focus:border-purple"
                    >
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Discount
                  </label>
                  <Input
                    inputMode="decimal"
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                    placeholder="0.00"
                    className="h-11 rounded-xl border-gray-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Paid now
                  </label>
                  <Input
                    inputMode="decimal"
                    value={paidTotal}
                    onChange={(event) => setPaidTotal(event.target.value)}
                    placeholder="0.00"
                    className="h-11 rounded-xl border-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Internal note
                </label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Optional note for this collection"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-purple"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm print:border print:border-gray-200">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Settlement Preview</h2>
                <p className="mt-1 text-sm text-gray-500">
                  This preview mirrors the backend calculation used when the bill is saved.
                </p>
              </div>

              <div className="rounded-full bg-purple/10 px-3 py-1 text-xs font-semibold text-purple">
                {mode === "due_only"
                  ? "Due only"
                  : mode === "monthly"
                    ? "Monthly renewal"
                    : "Package move"}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                <span className="text-gray-600">Old due covered now</span>
                <span className="font-semibold text-gray-900">{formatCurrency(effectiveDuePayment)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                <span className="text-gray-600">New cycle charge</span>
                <span className="font-semibold text-gray-900">{formatCurrency(cycleCharge)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                <span className="text-gray-600">Discount</span>
                <span className="font-semibold text-gray-900">{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-gray-900 px-4 py-3 text-white">
                <span>Bill total</span>
                <span className="text-lg font-semibold">{formatCurrency(subTotal)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-dashed border-gray-200 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Projected next payment</span>
                <span className="font-semibold text-gray-900">{formatDateLabel(projectedNextPaymentDate)}</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-red-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    Invoice Due
                  </p>
                  <p className="mt-2 text-xl font-semibold text-red-700">{formatCurrency(invoiceDue)}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Invoice Advance
                  </p>
                  <p className="mt-2 text-xl font-semibold text-emerald-700">{formatCurrency(invoiceAdvance)}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-red-100 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Account Due After Save
                  </p>
                  <p className="mt-2 text-xl font-semibold text-red-700">{formatCurrency(finalDue)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Account Advance After Save
                  </p>
                  <p className="mt-2 text-xl font-semibold text-emerald-700">{formatCurrency(finalAdvance)}</p>
                </div>
              </div>

              {overflowIntoDue > duePaymentNow && currentDue > 0 && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Because the paid amount is higher than the new cycle charge, {formatCurrency(effectiveDuePayment - duePaymentNow)} extra is automatically applied to old due.
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3 print:hidden">
              <button
                type="button"
                onClick={onCancel}
                disabled={isCollecting}
                className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  isCollecting ||
                  (modeRequiresMonthly && !canUseMonthly) ||
                  (modeRequiresPackage && !resolvedSelectedPackageId)
                }
                className="flex-1 rounded-2xl bg-purple px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCollecting ? "Saving..." : "Save Bill"}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#E25C3C] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#d14c2f]"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>

            {lastSavedBill && (
              <div className="mt-6 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700 print:border-0 print:bg-transparent print:p-0">
                <div className="flex items-center gap-2 font-semibold">
                  <ReceiptText className="h-4 w-4" />
                  Latest saved invoice {lastSavedBill.payment.invoiceNo || "recorded"}
                </div>
                <p className="mt-2">
                  Paid {formatCurrency(lastSavedBill.payment.paidTotal || 0)} on {formatDateLabel(lastSavedBill.payment.paymentDate)}.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}