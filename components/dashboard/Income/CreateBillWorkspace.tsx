"use client";

import { startTransition, useMemo, useState, useRef, useEffect } from "react";
import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import {
  MonthGrid,
  buildRange,
  type MonthYear,
} from "@/components/dashboard/Members/MonthGrid";
import { cn } from "@/lib/utils";
import { useCollectBillMutation } from "@/redux/features/member/memberApi";
import PayAdmissionDueModal from "@/components/modals/PayAdmissionDueModal";
import type {
  CollectBillContext,
  CollectBillDueItem,
  CollectBillMode,
  CollectBillResult,
  PaymentMethod,
  PaymentRecord,
} from "@/types/member";
import type { GymPackage } from "@/types/package";

interface CreateBillWorkspaceProps {
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

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bkash", label: "Bkash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

const normalizeMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const formatCurrency = (amount: number) =>
  normalizeMoney(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseAmount = (value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, "");
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseInputDate = (value?: string) => {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

// Combine selected date with current time so paymentDate is not stored as midnight
const buildPaymentDateISO = (dateStr: string): string => {
  const now = new Date();
  const selected = parseInputDate(dateStr);
  selected.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return selected.toISOString();
};

const toCalendarDateISO = (date: Date): string => {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);
  return normalizedDate.toISOString();
};

const toInputDate = (value?: string | Date) => {
  const d = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return format(new Date(), "yyyy-MM-dd");
  return format(d, "yyyy-MM-dd");
};

const formatDateLabel = (value?: string | Date) => {
  if (!value) return "Not scheduled";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "Not scheduled";
  return format(d, "dd/MM/yyyy");
};

const getReferenceDate = (value?: string) => {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const toMonthYear = (date: Date): MonthYear => ({
  month: date.getMonth(),
  year: date.getFullYear(),
});

const getPackageCharge = (pkg?: GymPackage) => {
  if (!pkg) return 0;
  const admissionFee = pkg.includeAdmissionFee ? (pkg.admissionFeeAmount ?? 0) : 0;
  return normalizeMoney(pkg.amount + admissionFee);
};

const getPackageNextPaymentDate = (startDate: Date, pkg?: GymPackage) => {
  if (!pkg) return undefined;
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

const isShortTermDuration = (durationType?: GymPackage["durationType"]) =>
  durationType === "day" || durationType === "week";

const isLongTermDuration = (durationType?: GymPackage["durationType"]) =>
  durationType === "month" || durationType === "year";

// Union type for billing mode selection
type BillingSelection =
  | { mode: "monthly" }
  | { mode: "package"; packageId: string }
  | { mode: "due_only" };

const resolveBillingSelection = (value: string): BillingSelection => {
  if (value === "monthly") return { mode: "monthly" };
  if (value === "due_only") return { mode: "due_only" };
  return { mode: "package", packageId: value };
};

const getDropdownValue = (sel: BillingSelection): string => {
  if (sel.mode === "monthly") return "monthly";
  if (sel.mode === "due_only") return "due_only";
  return sel.packageId;
};

export default function CreateBillWorkspace({
  branchId,
  memberId,
  context,
  packages,
  isPackagesLoading = false,
  paymentHistory,
  isPaymentHistoryLoading = false,
  canViewPayments,
  onCancel,
}: CreateBillWorkspaceProps) {
  const [collectBill, { isLoading: isCollecting }] = useCollectBillMutation();

  const member = context.member;
  const dueBreakdown = context.billing.dueBreakdown;

  // Separate admission dues from regular (monthly/carry-forward) dues
  const admissionDueItems = useMemo(
    () => dueBreakdown.filter((item) => item.type === "admission_due"),
    [dueBreakdown]
  );
  const nonAdmissionDueItems = useMemo(
    () => dueBreakdown.filter((item) => item.type !== "admission_due"),
    [dueBreakdown]
  );

  const [showAdmissionModal, setShowAdmissionModal] = useState(false);

  const branchMonthlyFee = normalizeMoney(context.billing.monthlyFeeAmount ?? 0);
  const nonAdmissionCurrentDue = normalizeMoney(
    nonAdmissionDueItems.reduce((s, i) => s + i.remainingAmount, 0)
  );
  const memberDisplayId = member.memberId || member._id.slice(-8).toUpperCase();
  const currentPackage = useMemo(
    () => packages.find((pkg) => pkg.id === member.currentPackageId),
    [packages, member.currentPackageId],
  );
  const restrictPackageOptionsToLongTerm =
    !member.currentPackageId || isLongTermDuration(currentPackage?.durationType);
  const blockShortTermPackageSelection =
    isShortTermDuration(currentPackage?.durationType) && member.isActive !== false;
  const visiblePackages = useMemo(
    () =>
      restrictPackageOptionsToLongTerm
        ? packages.filter((pkg) => isLongTermDuration(pkg.durationType))
        : packages,
    [packages, restrictPackageOptionsToLongTerm],
  );
  const firstSelectablePackage = useMemo(
    () =>
      visiblePackages.find(
        (pkg) =>
          !(
            blockShortTermPackageSelection &&
            isShortTermDuration(pkg.durationType)
          ),
      ),
    [visiblePackages, blockShortTermPackageSelection],
  );

  // Billing selection
  const defaultSelection = (): BillingSelection => {
    if (branchMonthlyFee > 0) return { mode: "monthly" };
    if (firstSelectablePackage)
      return { mode: "package", packageId: firstSelectablePackage.id };
    return { mode: "due_only" };
  };

  const [billingSelection, setBillingSelection] = useState<BillingSelection>(defaultSelection);

  const effectiveBillingSelection = useMemo(() => {
    if (billingSelection.mode !== "package") {
      return billingSelection;
    }

    const packageStillVisible = visiblePackages.some(
      (pkg) => pkg.id === billingSelection.packageId,
    );

    const currentSelection = packages.find(
      (pkg) => pkg.id === billingSelection.packageId,
    );
    const isCurrentSelectionShortTerm = currentSelection
      ? isShortTermDuration(currentSelection.durationType)
      : false;

    const blockedSelection =
      packageStillVisible &&
      blockShortTermPackageSelection &&
      isCurrentSelectionShortTerm;

    if (packageStillVisible && !blockedSelection) {
      return billingSelection;
    }

    if (firstSelectablePackage) {
      return { mode: "package", packageId: firstSelectablePackage.id } as const;
    }

    if (branchMonthlyFee > 0) {
      return { mode: "monthly" } as const;
    }

    return { mode: "due_only" } as const;
  }, [
    billingSelection,
    blockShortTermPackageSelection,
    branchMonthlyFee,
    firstSelectablePackage,
    packages,
    visiblePackages,
  ]);

  const collectionMode: CollectBillMode =
    effectiveBillingSelection.mode === "monthly"
      ? "monthly"
      : effectiveBillingSelection.mode === "package"
        ? "package"
        : "due_only";

  const selectedPackageId =
    effectiveBillingSelection.mode === "package"
      ? effectiveBillingSelection.packageId
      : "";

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId),
    [packages, selectedPackageId],
  );
  const selectedPackageBlocked =
    Boolean(selectedPackage) &&
    blockShortTermPackageSelection &&
    isShortTermDuration(selectedPackage?.durationType);

  // Custom monthly fee toggle
  const [useCustomMonthlyFee, setUseCustomMonthlyFee] = useState(
    member.isCustomMonthlyFee === true,
  );
  const [customFeeInput, setCustomFeeInput] = useState(
    member.isCustomMonthlyFee && member.customMonthlyFeeAmount
      ? String(member.customMonthlyFeeAmount)
      : "",
  );

  const effectiveMonthlyFee = useMemo(() => {
    if (useCustomMonthlyFee) {
      const parsed = parseAmount(customFeeInput);
      return parsed > 0 ? parsed : branchMonthlyFee;
    }
    return branchMonthlyFee;
  }, [useCustomMonthlyFee, customFeeInput, branchMonthlyFee]);

  const requiredStartDate = useMemo(
    () =>
      getReferenceDate(
        context.billing.requiredStartDate ||
        context.billing.recommendedStartDate ||
          context.billing.nextPaymentDate ||
          member.nextPaymentDate,
      ),
    [
      context.billing.requiredStartDate,
      context.billing.recommendedStartDate,
      context.billing.nextPaymentDate,
      member.nextPaymentDate,
    ],
  );

  const monthlyMinMonth = useMemo(
    () => toMonthYear(requiredStartDate),
    [requiredStartDate],
  );

  const [monthlyMonths, setMonthlyMonths] = useState<MonthYear[]>(() => {
    const start = toMonthYear(requiredStartDate);
    return buildRange(start, start);
  });

  useEffect(() => {
    if (collectionMode !== "monthly") {
      return;
    }

    const anchoredStart = toMonthYear(requiredStartDate);
    startTransition(() => {
      setMonthlyMonths((current) => {
        const firstMonth = current[0];
        if (
          firstMonth &&
          firstMonth.month === anchoredStart.month &&
          firstMonth.year === anchoredStart.year
        ) {
          return current;
        }

        return buildRange(anchoredStart, anchoredStart);
      });
    });
  }, [collectionMode, requiredStartDate]);

  const monthlyStartDate = useMemo(() => {
    const firstMonth = monthlyMonths[0] || toMonthYear(requiredStartDate);
    const lastDay = new Date(firstMonth.year, firstMonth.month + 1, 0).getDate();
    const day = Math.min(requiredStartDate.getDate(), lastDay);
    return new Date(firstMonth.year, firstMonth.month, day);
  }, [monthlyMonths, requiredStartDate]);

  const packageStart = requiredStartDate;

  // Due items (non-admission only — admission dues go through the modal)
  const [selectedDueAmounts, setSelectedDueAmounts] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      nonAdmissionDueItems.map((item) => [
        item.ledgerItemId,
        String(item.remainingAmount),
      ]),
    ),
  );

  const toggleDueItem = (item: CollectBillDueItem) => {
    setSelectedDueAmounts((prev) => {
      const next = { ...prev };
      if (Object.prototype.hasOwnProperty.call(next, item.ledgerItemId)) {
        delete next[item.ledgerItemId];
      } else {
        next[item.ledgerItemId] = String(item.remainingAmount);
      }
      return next;
    });
  };

  const validSelectedDueItems = useMemo(
    () =>
      nonAdmissionDueItems.flatMap((item) => {
        if (
          !Object.prototype.hasOwnProperty.call(
            selectedDueAmounts,
            item.ledgerItemId,
          )
        )
          return [];
        const amount = normalizeMoney(
          parseAmount(selectedDueAmounts[item.ledgerItemId] || ""),
        );
        if (amount <= 0 || amount > item.remainingAmount) return [];
        return [{ ...item, requestedAmount: amount }];
      }),
    [nonAdmissionDueItems, selectedDueAmounts],
  );

  const selectedDueAmount = normalizeMoney(
    validSelectedDueItems.reduce((t, i) => t + i.requestedAmount, 0),
  );

  // Payment fields
  const [discount, setDiscount] = useState("");
  const [paidTotal, setPaidTotal] = useState("");
  const [paymentDate, setPaymentDate] = useState(() =>
    toInputDate(new Date()),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [lastSavedBill, setLastSavedBill] =
    useState<CollectBillResult | null>(null);

  // Track if user has manually edited paid amount
  const hasUserEditedPaidRef = useRef(false);

  const paidNow = normalizeMoney(parseAmount(paidTotal));
  const rawDiscount = normalizeMoney(parseAmount(discount));

  // Cycle charge
  const cycleCharge = useMemo(() => {
    if (collectionMode === "monthly") {
      return normalizeMoney(effectiveMonthlyFee * monthlyMonths.length);
    }
    if (collectionMode === "package") {
      return getPackageCharge(selectedPackage);
    }
    return 0;
  }, [
    collectionMode,
    effectiveMonthlyFee,
    monthlyMonths.length,
    selectedPackage,
  ]);

  const projectedNextPaymentDate = useMemo(() => {
    if (collectionMode === "monthly") {
      return monthlyMonths.length > 0
        ? addMonths(monthlyStartDate, monthlyMonths.length)
        : undefined;
    }
    if (collectionMode === "package") {
      return getPackageNextPaymentDate(packageStart, selectedPackage);
    }
    return member.nextPaymentDate
      ? new Date(member.nextPaymentDate)
      : undefined;
  }, [
    collectionMode,
    member.nextPaymentDate,
    monthlyMonths.length,
    monthlyStartDate,
    packageStart,
    selectedPackage,
  ]);

  // Summary
  const subTotal = normalizeMoney(selectedDueAmount + cycleCharge);
  const appliedDiscount = normalizeMoney(Math.min(rawDiscount, subTotal));
  const billableAmount = Math.max(0, subTotal - appliedDiscount);
  const dueAmount = normalizeMoney(Math.max(0, billableAmount - paidNow));
  const exchangeAmount = normalizeMoney(Math.max(0, paidNow - billableAmount));
  const paidTotalFinal = paidNow;

  // Auto-fill paid amount when billable amount changes (unless user has manually edited it)
  useEffect(() => {
    if (!hasUserEditedPaidRef.current && billableAmount > 0) {
      startTransition(() => {
        setPaidTotal(String(billableAmount));
      });
    }
  }, [billableAmount]);

  // Save
  const handleSave = async () => {
    if (collectionMode === "monthly" && effectiveMonthlyFee <= 0) {
      toast.error("Monthly fee is not configured for this member or branch");
      return;
    }
    if (collectionMode === "monthly" && monthlyMonths.length === 0) {
      toast.error("Select at least one month before saving");
      return;
    }
    if (collectionMode === "package" && !selectedPackage) {
      toast.error("Select a package before saving the bill");
      return;
    }
    if (
      collectionMode === "package" &&
      restrictPackageOptionsToLongTerm &&
      selectedPackage &&
      !isLongTermDuration(selectedPackage.durationType)
    ) {
      toast.error(
        "Monthly and yearly members can only switch to monthly or yearly packages",
      );
      return;
    }
    if (collectionMode === "package" && selectedPackageBlocked) {
      toast.error(
        "Active day or weekly packages must finish before another day or weekly package can start",
      );
      return;
    }
    if (collectionMode === "due_only" && validSelectedDueItems.length === 0) {
      toast.error("Select at least one due item");
      return;
    }
    if (rawDiscount > subTotal) {
      toast.error("Discount cannot exceed the bill total");
      return;
    }

    const payload = {
      memberId,
      collectionMode,
      selectedDueItems:
        validSelectedDueItems.length > 0
          ? validSelectedDueItems.map((i) => ({
              ledgerItemId: i.ledgerItemId,
              amount: i.requestedAmount,
            }))
          : undefined,
      paidTotal: paidNow,
      paymentMethod,
      paymentDate: buildPaymentDateISO(paymentDate),
      discount: rawDiscount > 0 ? rawDiscount : undefined,
      startDate:
        collectionMode === "monthly"
          ? toCalendarDateISO(monthlyStartDate)
          : collectionMode === "package"
            ? toCalendarDateISO(packageStart)
            : undefined,
      paidMonths:
        collectionMode === "monthly" ? monthlyMonths.length : undefined,
      packageId:
        collectionMode === "package" ? selectedPackage?.id : undefined,
      note: note.trim() || undefined,
      useCustomMonthlyFee: useCustomMonthlyFee || undefined,
      customMonthlyFeeAmount:
        useCustomMonthlyFee && parseAmount(customFeeInput) > 0
          ? parseAmount(customFeeInput)
          : undefined,
    };

    try {
      const result = await collectBill({ branchId, payload }).unwrap();
      setLastSavedBill(result);
      setDiscount("");
      setPaidTotal("");
      hasUserEditedPaidRef.current = false;
      setPaymentDate(toInputDate(new Date()));
      setNote("");
      toast.success(
        result.payment.invoiceNo
          ? `Invoice ${result.payment.invoiceNo} saved`
          : "Bill collected successfully",
      );
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      toast.error(apiError.data?.message || "Failed to collect bill");
    }
  };

  const handlePrint = () => window.print();

  const dueMonthCount = nonAdmissionDueItems.length;

  return (
    <div className="grid gap-2 lg:grid-cols-[1fr_480px]">
      {/* LEFT: Payment List */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Member header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-800 text-base font-semibold text-white">
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
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-semibold text-gray-900">
                {member.fullName}
              </p>
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {member.isActive === false ? "inactive" : "active"}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              ID: {memberDisplayId}
              {member.contact ? ` | ${member.contact}` : ""}
            </p>
          </div>
        </div>

        {/* Pay Admission Due button — shown only when admission dues exist */}
        {admissionDueItems.length > 0 && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowAdmissionModal(true)}
              className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">
                {admissionDueItems.length}
              </span>
              Pay Admission Due
              <span className="ml-auto text-amber-700">
                TK{" "}
                {formatCurrency(
                  admissionDueItems.reduce(
                    (s, i) => s + i.remainingAmount,
                    0
                  )
                )}
              </span>
            </button>
          </div>
        )}

        {/* Table header */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Payment List</p>
          {dueMonthCount > 0 && (
            <span className="text-xs font-semibold text-red-500">
              Due: {dueMonthCount}{" "}
              {dueMonthCount === 1 ? "month" : "months"}
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Month
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Package
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Amount
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Non-admission due rows */}
              {nonAdmissionDueItems.map((item) => {
                const isSelected = Object.prototype.hasOwnProperty.call(
                  selectedDueAmounts,
                  item.ledgerItemId,
                );
                return (
                  <tr
                    key={item.ledgerItemId}
                    className={cn(
                      "border-b border-gray-100 transition-colors",
                      isSelected
                        ? "bg-orange-50/60"
                        : "bg-white hover:bg-gray-50",
                    )}
                  >
                    <td className="px-4 py-3 text-gray-700">{item.label}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.type === "carry_forward"
                        ? "Carry Forward"
                        : item.type === "package_due"
                          ? "Package Due"
                          : "Monthly"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(item.remainingAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleDueItem(item)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                          isSelected
                            ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                            : "bg-red-100 text-red-600 hover:bg-red-200",
                        )}
                      >
                        {isSelected ? "Selected" : "Pay"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Payment history rows */}
              {canViewPayments &&
                paymentHistory.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 bg-white">
                    <td className="px-4 py-3 text-gray-500">{record.month}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {record.package}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {record.amount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          record.status === "Due"
                            ? "bg-red-100 text-red-600"
                            : record.status === "Partial"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}

              {nonAdmissionDueItems.length === 0 &&
                !isPaymentHistoryLoading &&
                paymentHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      No payment records found.
                    </td>
                  </tr>
                )}

              {isPaymentHistoryLoading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-gray-400"
                  >
                    Loading history...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total due footer */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <span className="text-gray-600">
            Total Due ({dueMonthCount}{" "}
            {dueMonthCount === 1 ? "month" : "months"})
          </span>
          <span className="font-semibold text-red-600">
            {formatCurrency(nonAdmissionCurrentDue)} TK
          </span>
        </div>

        {/* Invoice saved banner */}
        {lastSavedBill && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="font-semibold">
              Invoice {lastSavedBill.payment.invoiceNo || "saved"} -
            </span>{" "}
            Paid {formatCurrency(lastSavedBill.payment.paidTotal || 0)} TK
            {(lastSavedBill.payment.exchange ?? 0) > 0 && (
              <span className="ml-2 font-semibold text-emerald-700">
                · Exchange {formatCurrency(lastSavedBill.payment.exchange!)} TK
              </span>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Membership Details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-base font-semibold text-gray-900">
          Membership Details
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          Package selection and payment calculation
        </p>

        <div className="mt-5 space-y-5">
          {/* Package / mode dropdown */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Select Package
            </label>
            <select
              value={getDropdownValue(effectiveBillingSelection)}
              onChange={(e) =>
                setBillingSelection(resolveBillingSelection(e.target.value))
              }
              className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-400"
            >
              {branchMonthlyFee > 0 && (
                <option value="monthly">Monthly</option>
              )}
              {visiblePackages.map((pkg) => (
                <option
                  key={pkg.id}
                  value={pkg.id}
                  disabled={
                    blockShortTermPackageSelection &&
                    isShortTermDuration(pkg.durationType)
                  }
                >
                  {pkg.title}
                </option>
              ))}
              {nonAdmissionDueItems.length > 0 && (
                <option value="due_only">Due only</option>
              )}
              {!isPackagesLoading &&
                visiblePackages.length === 0 &&
                branchMonthlyFee <= 0 &&
                nonAdmissionDueItems.length > 0 && (
                  <option value="due_only">Due only</option>
                )}
            </select>
            {restrictPackageOptionsToLongTerm && (
              <p className="mt-2 text-xs text-gray-500">
                This member is on monthly or yearly billing, so only monthly and yearly packages are available.
              </p>
            )}
            {!restrictPackageOptionsToLongTerm && blockShortTermPackageSelection && (
              <p className="mt-2 text-xs text-amber-600">
                An active day or weekly package must finish before another day or weekly package can start.
              </p>
            )}
          </div>

          {/* Monthly fee with override toggle */}
          {collectionMode === "monthly" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Monthly Fee
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                  <span>Override</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useCustomMonthlyFee}
                    onClick={() => setUseCustomMonthlyFee((v) => !v)}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
                      useCustomMonthlyFee ? "bg-orange-500" : "bg-gray-300",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200",
                        useCustomMonthlyFee ? "translate-x-4" : "translate-x-0.5",
                      )}
                    />
                  </button>
                </label>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    useCustomMonthlyFee
                      ? customFeeInput
                      : String(branchMonthlyFee)
                  }
                  readOnly={!useCustomMonthlyFee}
                  onChange={(e) =>
                    useCustomMonthlyFee && setCustomFeeInput(e.target.value)
                  }
                  placeholder="Monthly Amount"
                  className={cn(
                    "h-10 w-full rounded-xl border px-3 text-sm text-gray-700 outline-none",
                    useCustomMonthlyFee
                      ? "border-orange-300 bg-white focus:border-orange-400"
                      : "border-gray-200 bg-gray-50 text-gray-500",
                  )}
                />
              </div>
            </div>
          )}

          {/* Package admission fee note */}
          {collectionMode === "package" && selectedPackage && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
              {selectedPackage.includeAdmissionFee
                ? `Includes admission fee (TK ${selectedPackage.admissionFeeAmount ?? 0})`
                : "Admission fee not included for this package"}
            </div>
          )}

          {/* Month grid */}
          {collectionMode === "monthly" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Select Months
              </label>
              <MonthGrid
                selectedMonths={monthlyMonths}
                onSelectionChange={setMonthlyMonths}
                minMonth={monthlyMinMonth}
                lockedStartMonth={monthlyMinMonth}
              />
            </div>
          )}

          {/* Package start date */}
          {collectionMode === "package" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Billing Start Date
              </label>
              <div className="flex h-10 w-full items-center rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm font-medium text-gray-700">
                {formatDateLabel(packageStart)}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Billing starts from the next payable date and cannot skip ahead.
              </p>
            </div>
          )}

          {/* Next payment date */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Next Payment Date
            </span>
            <span className="text-sm font-semibold text-gray-800">
              {formatDateLabel(projectedNextPaymentDate)}
            </span>
          </div>

          {/* Summary */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Sub Total</span>
              <span className="font-semibold text-gray-800">
                {formatCurrency(subTotal)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-sm text-gray-500">
                Discount
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="00.00"
                className="h-8 flex-1 rounded-lg border border-gray-200 px-2 text-right text-sm text-gray-700 outline-none focus:border-gray-400"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {exchangeAmount > 0 ? "Exchange" : "Due Amount"}
              </span>
              <span
                className={cn(
                  "font-semibold",
                  exchangeAmount > 0
                    ? "text-emerald-600"
                    : dueAmount > 0
                      ? "text-red-600"
                      : "text-gray-800",
                )}
              >
                {exchangeAmount > 0
                  ? formatCurrency(exchangeAmount)
                  : formatCurrency(dueAmount)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-sm text-gray-500">
                Paid Total
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paidTotal}
                onChange={(e) => {
                  hasUserEditedPaidRef.current = true;
                  setPaidTotal(e.target.value);
                }}
                placeholder="00.00"
                className="h-8 flex-1 rounded-lg border border-gray-200 px-2 text-right text-sm text-gray-700 outline-none focus:border-gray-400"
              />
            </div>

            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-gray-700">Paid Total</span>
              <span className="text-gray-900">
                {formatCurrency(paidTotalFinal)}
              </span>
            </div>
          </div>

          {/* Payment date + method */}
          <div className="space-y-3">
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-400"
            />

            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-gray-500">
                Payment Method
              </span>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className="h-9 flex-1 rounded-xl border border-gray-200 bg-white px-2 text-sm text-gray-700 outline-none focus:border-gray-400"
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional note"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-400"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1 print:hidden">
            <button
              type="button"
              onClick={onCancel}
              disabled={isCollecting}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isCollecting}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
            >
              {isCollecting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Printer className="h-4 w-4" />
                Print
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Admission Due Modal */}
      {showAdmissionModal && (
        <PayAdmissionDueModal
          isOpen={showAdmissionModal}
          onClose={() => setShowAdmissionModal(false)}
          branchId={branchId}
          memberId={memberId}
          admissionDueItems={admissionDueItems}
        />
      )}
    </div>
  );
}
