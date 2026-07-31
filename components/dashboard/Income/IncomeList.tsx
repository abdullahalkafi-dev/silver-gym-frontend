// components/dashboard/Income/IncomeList.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DateFilterType } from "@/types/income";
import DateFilterDropdown from "./DateFilterDropdown";
import CategoryFilter from "./CategoryFilter";
import SummaryViewToggle from "./SummaryViewToggle";
import AddIncomeModal from "./AddIncomeModal";
import ExportReportModal from "@/components/modals/ExportReportModal";
import { ImageIcon } from "@/components/utils/ImageIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignSquareIcon } from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import {
  useGetPaymentsByBranchQuery,
  Payment,
} from "@/redux/features/payment/paymentApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import type { ExportColumn } from "@/lib/exportUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  package: "Package",
  monthly: "Monthly",
  admission: "Admission",
  registration: "Registration",
  locker: "Locker",
  other: "Other",
  custom: "Custom Income",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  bkash: "Bkash",
  nagad: "Nagad",
  rocket: "Rocket",
  bank_transfer: "Bank",
  other: "Other",
};

const PAYMENT_TYPES = Object.keys(PAYMENT_TYPE_LABELS);

const formatPaymentDate = (iso?: string): string => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Dhaka",
    });
  } catch {
    return iso;
  }
};

const toDateKey = (iso?: string): string => {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

// ─── Payment Detail Modal ─────────────────────────────────────────────────────

function PaymentDetailModal({
  payment,
  onClose,
}: {
  payment: Payment;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const isCustom = payment.paymentType === "custom";
  const categoryTitle =
    isCustom && payment.metadata?.categoryTitle
      ? (payment.metadata.categoryTitle as string)
      : PAYMENT_TYPE_LABELS[payment.paymentType ?? ""] ?? payment.paymentType ?? "—";
  const noteValue = (payment.metadata?.note as string) || undefined;

  const handleDownloadPdf = () => {
    const printWindow = window.open("", "_blank", "width=700,height=900");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Income Receipt – ${payment.invoiceNo ?? "N/A"}</title>
          <style>
            body { font-family: sans-serif; padding: 32px; color: #111; }
            h2 { margin-bottom: 4px; }
            .badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:12px; background:#ede9fe; color:#5b21b6; }
            table { width:100%; border-collapse:collapse; margin-top:24px; }
            td { padding:10px 0; border-bottom:1px solid #e5e7eb; font-size:14px; }
            td:first-child { color:#6b7280; width:40%; }
            td:last-child { font-weight:600; }
            .total td { font-size:16px; font-weight:700; border-bottom:none; padding-top:16px; }
          </style>
        </head>
        <body>
          <h2>Income Receipt</h2>
          <span class="badge">${payment.invoiceNo ?? "N/A"}</span>
          <table>
            <tr><td>Date &amp; Time</td><td>${formatPaymentDate(payment.paymentDate)}</td></tr>
            ${
              isCustom
                ? `<tr><td>Note / Description</td><td>${noteValue || categoryTitle}</td></tr>`
                : `<tr><td>Member Name</td><td>${payment.memberName ?? "—"}</td></tr>
                   <tr><td>Member ID</td><td>${payment.memberFacingId ?? "—"}</td></tr>`
            }
            <tr><td>Category</td><td>${categoryTitle}</td></tr>
            <tr><td>Payment Method</td><td>${PAYMENT_METHOD_LABELS[payment.paymentMethod ?? ""] ?? payment.paymentMethod ?? "—"}</td></tr>
            ${payment.discount ? `<tr><td>Discount</td><td>${Number(payment.discount).toFixed(2)} TK</td></tr>` : ""}
            ${payment.dueAmount ? `<tr><td>Due Amount</td><td>${Number(payment.dueAmount).toFixed(2)} TK</td></tr>` : ""}
            <tr class="total"><td>Bill Amount</td><td>${Number(payment.billAmount ?? payment.paidTotal ?? 0).toFixed(2)} TK</td></tr>
            <tr><td>Cash Paid</td><td>${Number(payment.paidTotal ?? 0).toFixed(2)} TK</td></tr>
            ${(payment.exchange ?? 0) > 0 ? `<tr><td>Exchange (Change)</td><td>${Number(payment.exchange).toFixed(2)} TK</td></tr>` : ""}
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => {
      try { printWindow.close(); } catch { /* already closed */ }
    };
    printWindow.print();
    // Fallback: close after 30s if onafterprint never fires (some browsers)
    setTimeout(() => {
      try { printWindow.close(); } catch { /* already closed */ }
    }, 30000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 z-10">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Income Detail
            </h2>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple/10 text-purple">
              {payment.invoiceNo ?? "N/A"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div ref={printRef} className="px-6 py-5 space-y-3">
          <DetailRow
            label="Date &amp; Time"
            value={formatPaymentDate(payment.paymentDate)}
          />
          {isCustom ? (
            <DetailRow
              label="Note / Description"
              value={noteValue || categoryTitle}
            />
          ) : (
            <>
              <DetailRow label="Member Name" value={payment.memberName ?? "—"} />
              <DetailRow
                label="Member ID"
                value={payment.memberFacingId ?? "—"}
              />
            </>
          )}
          <DetailRow
            label="Category"
            value={categoryTitle}
          />
          <DetailRow
            label="Payment Method"
            value={
              PAYMENT_METHOD_LABELS[payment.paymentMethod ?? ""] ??
              payment.paymentMethod ??
              "—"
            }
          />
          {payment.discount ? (
            <DetailRow
              label="Discount"
              value={`${Number(payment.discount).toFixed(2)} TK`}
            />
          ) : null}
          {payment.dueAmount ? (
            <DetailRow
              label="Due Amount"
              value={`${Number(payment.dueAmount).toFixed(2)} TK`}
            />
          ) : null}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-base font-semibold text-gray-700">
              Bill Amount
            </span>
            <span className="text-base font-bold text-gray-900">
              {Number(payment.billAmount ?? payment.paidTotal ?? 0).toFixed(2)} TK
            </span>
          </div>
          <DetailRow
            label="Cash Paid"
            value={`${Number(payment.paidTotal ?? 0).toFixed(2)} TK`}
          />
          {(payment.exchange ?? 0) > 0 ? (
            <DetailRow
              label="Exchange (Change)"
              value={`${Number(payment.exchange).toFixed(2)} TK`}
            />
          ) : null}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleDownloadPdf}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple text-white rounded-lg text-sm font-medium hover:bg-purple/90 transition-colors cursor-pointer"
          >
            <ImageIcon activeImage="/icons/pdf.svg" size={18} />
            Download as PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IncomeList() {
  const { activeBranchId } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [showSummaryOnly, setShowSummaryOnly] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [viewTarget, setViewTarget] = useState<Payment | null>(null);
  const [showMemberSearchModal, setShowMemberSearchModal] = useState(false);

  const incomeColumns: ExportColumn[] = [
    {
      header: "Date & Time",
      key: "paymentDate",
      formatter: (v) => formatPaymentDate(v as string | undefined),
    },
    { header: "Invoice No", key: "invoiceNo" },
    {
      header: "Name / Category",
      key: "memberName",
      formatter: (v, row) => {
        const p = row as unknown as Payment;
        if (p.paymentType === "custom") {
          return (p.metadata?.categoryTitle as string) || "Custom Income";
        }
        return (v as string) || "—";
      },
    },
    { header: "Member ID", key: "memberFacingId" },
    {
      header: "Discount",
      key: "discount",
      formatter: (v) => (v ? Number(v).toFixed(2) : "0.00"),
    },
    {
      header: "Category",
      key: "paymentType",
      formatter: (v, row) => {
        const p = row as unknown as Payment;
        if (p.paymentType === "custom" && p.metadata?.categoryTitle) {
          return p.metadata.categoryTitle as string;
        }
        return PAYMENT_TYPE_LABELS[v as string] ?? (v as string) ?? "—";
      },
    },
    {
      header: "Payment",
      key: "paymentMethod",
      formatter: (v) =>
        PAYMENT_METHOD_LABELS[v as string] ?? (v as string) ?? "—",
    },
    {
      header: "Total Bill",
      key: "billAmount",
      formatter: (v, row) => Number((v as number | undefined) ?? ((row as unknown as Payment).billAmount ?? 0)).toFixed(2),
    },
    {
      header: "Amount Paid",
      key: "paidTotal",
      formatter: (v, row) => Number((v as number | undefined) ?? ((row as unknown as Payment).paidTotal ?? 0)).toFixed(2),
    },
  ];

  const handleExportClick = (format: "pdf" | "excel") => {
    setExportFormat(format);
    setShowExportModal(true);
  };

  // ── Build API query params ────────────────────────────────────────────────
  const dateParams = useMemo(() => {
    const toDateString = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const now = new Date();
    if (dateFilter === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { startDate: toDateString(start), endDate: toDateString(end) };
    }
    if (dateFilter === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
      return { startDate: toDateString(start), endDate: toDateString(end) };
    }
    if (dateFilter === "custom" && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }
    return {};
  }, [dateFilter, customStartDate, customEndDate]);

  // ── Derive Date objects for the export modal pre-fill ─────────────────────
  const exportDateRange = useMemo(() => {
    if (dateParams.startDate && dateParams.endDate) {
      return {
        startDate: new Date(dateParams.startDate),
        endDate: new Date(dateParams.endDate),
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [dateParams]);

  const isStandardType = [
    "package",
    "monthly",
    "admission",
    "registration",
    "locker",
    "other",
    "custom",
  ].includes(selectedType);

  const { data: paymentsResponse, isLoading } = useGetPaymentsByBranchQuery(
    {
      branchId: activeBranchId!,
      searchTerm: searchQuery || undefined,
      paymentType: isStandardType ? selectedType || undefined : undefined,
      categoryId: !isStandardType && selectedType ? selectedType : undefined,
      ...dateParams,
      limit: 200,
    },
    { skip: !activeBranchId },
  );

  const payments = useMemo(
    () => paymentsResponse?.data ?? [],
    [paymentsResponse],
  );

  const totalIncome = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.paidTotal ?? 0), 0),
    [payments],
  );

  // ── Group by date ──────────────────────────────────────────────────────────
  const groupedByDate = useMemo(() => {
    const groups: { [key: string]: { records: Payment[]; total: number } } =
      {};
    payments.forEach((p) => {
      const key = toDateKey(p.paymentDate);
      if (!groups[key]) groups[key] = { records: [], total: 0 };
      groups[key].records.push(p);
      groups[key].total += Number(p.paidTotal ?? 0);
    });
    return groups;
  }, [payments]);

  // ── Shared table head ──────────────────────────────────────────────────────
  const tableHead = (
    <thead>
      <tr>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          Date &amp; Time
        </th>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          INV-NO
        </th>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          Name
        </th>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          Member ID
        </th>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          Category
        </th>
        <th className="px-6 py-4 text-center text-base font-semibold text-text-primary border-b">
          Payment
        </th>
        <th className="px-6 py-4 text-right text-base font-semibold text-text-primary border-b">
          Discount
        </th>
        <th className="px-6 py-4 text-right text-base font-semibold text-text-primary border-b">
          Total Bill
        </th>
        <th className="px-6 py-4 text-right text-base font-semibold text-text-primary border-b">
          Amount Paid
        </th>
        <th className="px-6 py-4 text-center text-base font-semibold text-text-primary border-b">
          View
        </th>
      </tr>
    </thead>
  );

  // ── Row renderer ──────────────────────────────────────────────────────────
  const renderRow = (p: Payment, index: number) => (
    <tr
      key={p.id}
      className={`transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-primary"
        } hover:bg-[#F2EEFF] rounded-md`}
    >
      <td className="px-6 py-4 text-sm text-gray-medium rounded-l-md">
        {formatPaymentDate(p.paymentDate)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-medium">
        {p.invoiceNo ?? "—"}
      </td>
      <td
        className="px-6 py-4 text-sm text-gray-medium"
        title={
          p.paymentType === "custom" && p.metadata?.note
            ? (p.metadata.note as string)
            : undefined
        }
      >
        {p.paymentType === "custom"
          ? ((p.metadata?.categoryTitle as string) || "Custom Income")
          : p.memberName ?? "—"}
      </td>
      <td className="px-6 py-4 text-sm text-gray-medium">
        {p.memberFacingId ?? "—"}
      </td>
      <td className="px-6 py-4 text-sm text-gray-medium">
        {p.paymentType === "custom" && p.metadata?.categoryTitle
          ? (p.metadata.categoryTitle as string)
          : PAYMENT_TYPE_LABELS[p.paymentType ?? ""] ?? p.paymentType ?? "—"}
      </td>
      <td className="px-6 py-4 text-center text-sm text-gray-medium">
        {PAYMENT_METHOD_LABELS[p.paymentMethod ?? ""] ??
          p.paymentMethod ??
          "—"}
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-medium">
        {p.discount ? Number(p.discount).toFixed(2) : "—"}
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-medium">
        {Number(p.billAmount ?? 0).toFixed(2)}
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-medium">
        {Number(p.paidTotal ?? 0).toFixed(2)}
      </td>
      <td className="px-6 py-4 text-center text-sm text-gray-medium rounded-r-md">
        <button
          onClick={() => setViewTarget(p)}
          className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer hover:scale-110"
          title="View details"
        >
          <ImageIcon activeImage="/icons/edit.svg" size={20} />
        </button>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-1">
              Income List
            </h1>
            <p className="text-sm text-gray-500">
              Easily review and control your company&apos;s income records.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleExportClick("pdf")}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <ImageIcon activeImage="/icons/pdf.svg" size={24} />
              Download
            </button>
            <button
              onClick={() => handleExportClick("excel")}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <ImageIcon activeImage="/icons/excel.svg" size={24} />
              Download
            </button>
            <button
              onClick={() => setShowMemberSearchModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple text-white rounded-md hover:bg-[#6A3FE0] transition-colors text-sm md:text-base cursor-pointer"
            >
              <HugeiconsIcon icon={PlusSignSquareIcon} size={24} />
              Add Income
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border-8 border-gray-secondary p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4 justify-between">
            <div className="flex-1 max-w-75 h-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search INV/Name/Member ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-gray-300 focus:border-primary focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <DateFilterDropdown
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                customStartDate={customStartDate}
                setCustomStartDate={setCustomStartDate}
                customEndDate={customEndDate}
                setCustomEndDate={setCustomEndDate}
              />

              <CategoryFilter
                selectedCategory={selectedType}
                setSelectedCategory={setSelectedType}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <SummaryViewToggle
              showSummaryOnly={showSummaryOnly}
              setShowSummaryOnly={setShowSummaryOnly}
            />
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="bg-white rounded-2xl border-8 border-gray-secondary p-6 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        )}

        {/* Content */}
        {!isLoading && showSummaryOnly ? (
          // Summary View
          <div className="bg-white rounded-2xl border-8 border-gray-secondary overflow-hidden p-3">
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-medium">
                Income Summary
              </h3>
            </div>
            <div className="overflow-auto">
              <table className="w-full border-separate border-spacing-y-0.5 border border-border-2 rounded-lg px-2">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
                      Date &amp; Time
                    </th>
                    <th className="px-6 py-4 text-right text-base font-semibold text-text-primary border-b">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.keys(groupedByDate).length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No income records found for this period.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedByDate).map(
                      ([date, data], index) => (
                        <tr
                          key={date}
                          className={`transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-primary"
                            } hover:bg-[#F2EEFF] rounded-md`}
                        >
                          <td className="px-6 py-4 text-sm text-gray-medium rounded-l-md">
                            {date}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-medium rounded-r-md">
                            {data.total.toFixed(2)}
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4 bg-gray-primary p-4 rounded-lg">
              <span className="text-lg font-semibold text-gray-medium">
                Total Income
              </span>
              <span className="text-lg font-semibold text-gray-medium">
                {totalIncome.toFixed(2)}
              </span>
            </div>
          </div>
        ) : !isLoading &&
          dateFilter === "custom" &&
          customStartDate &&
          customEndDate ? (
          // Grouped by date view
          <div className="bg-white rounded-2xl border-8 border-gray-secondary overflow-hidden p-3">
            <div className="pb-4">
              <h3 className="text-lg font-semibold text-gray-medium">
                Income Source
              </h3>
            </div>
            <div className="space-y-6">
              {Object.keys(groupedByDate).length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <h3 className="text-sm font-medium text-gray-900">
                    No Records Found
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    No income records found for the selected date range.
                  </p>
                </div>
              ) : (
                Object.entries(groupedByDate).map(([date, data]) => (
                  <div key={date}>
                    <div className="px-6 py-2 bg-gray-primary rounded-lg mb-2">
                      <h4 className="text-sm font-semibold text-gray-medium">
                        {date}
                      </h4>
                    </div>
                    <div className="overflow-auto">
                      <table className="w-full border-separate border-spacing-y-0.5 border border-border-2 rounded-lg px-2">
                        {tableHead}
                        <tbody className="divide-y divide-gray-200">
                          {data.records.map((p, i) => renderRow(p, i))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between items-center mt-2 bg-gray-primary p-4 rounded-lg">
                      <span className="text-sm font-semibold text-gray-medium">
                        Total
                      </span>
                      <span className="text-sm font-semibold text-gray-medium">
                        {data.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-between items-center mt-4 bg-gray-primary p-4 rounded-lg">
              <span className="text-lg font-semibold text-gray-medium">
                Total Income
              </span>
              <span className="text-lg font-semibold text-gray-medium">
                {totalIncome.toFixed(2)}
              </span>
            </div>
          </div>
        ) : !isLoading && payments.length === 0 ? (
          // Empty state
          <div className="bg-white rounded-2xl border-8 border-gray-secondary p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <HugeiconsIcon icon={PlusSignSquareIcon} size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No Income Records
              </h3>
              <p className="text-sm text-gray-500">
                No payment records found for this period.
              </p>
            </div>
          </div>
        ) : !isLoading ? (
          // Regular table view
          <div className="bg-white rounded-2xl border-8 border-gray-secondary overflow-hidden p-3">
            <div className="pb-4">
              <h3 className="text-lg font-semibold text-gray-medium">
                Income Source
              </h3>
            </div>
            <div className="overflow-auto">
              <table className="w-full border-separate border-spacing-y-0.5 border border-border-2 rounded-lg px-2">
                {tableHead}
                <tbody className="divide-y divide-gray-200">
                  {payments.map((p, i) => renderRow(p, i))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4 bg-gray-primary p-4 rounded-lg">
              <span className="text-lg font-semibold text-gray-medium">
                {dateFilter === "today" ? "Today Income" : "Total Income"}
              </span>
              <span className="text-lg font-semibold text-gray-medium">
                {totalIncome.toFixed(2)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportFormat={exportFormat}
        data={payments as unknown as Record<string, unknown>[]}
        reportType="Income"
        columns={incomeColumns}
        defaultStartDate={exportDateRange.startDate}
        defaultEndDate={exportDateRange.endDate}
        dateField="paymentDate"
        amountField="paidTotal"
      />

      {viewTarget && (
        <PaymentDetailModal
          payment={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}

      {showMemberSearchModal && (
        <AddIncomeModal
          isOpen={showMemberSearchModal}
          onClose={() => setShowMemberSearchModal(false)}
        />
      )}
    </div>
  );
}

