// components/dashboard/Transaction/TransactionList.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DateFilterType } from "@/types/income";
import DateFilterDropdown from "../Income/DateFilterDropdown";
import SummaryViewToggle from "../Income/SummaryViewToggle";
import ExportReportModal from "@/components/modals/ExportReportModal";
import { ImageIcon } from "@/components/utils/ImageIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import {
  useGetTransactionsByBranchQuery,
  useGetTransactionsWithBalanceQuery,
  TransactionItem,
  type TransactionWithBalance,
} from "@/redux/features/transaction/transactionApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ExportColumn } from "@/lib/exportUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expense",
};

const toDateKey = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Dhaka",
    });
  } catch {
    return iso;
  }
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function TransactionDetailModal({
  transaction,
  onClose,
}: {
  transaction: TransactionItem;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    const printWindow = window.open("", "_blank", "width=700,height=900");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Transaction – ${transaction.invoiceNo}</title>
          <style>
            body { font-family: sans-serif; padding: 32px; color: #111; }
            h2 { margin-bottom: 4px; }
            .badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:12px; background:#ede9fe; color:#5b21b6; }
            table { width:100%; border-collapse:collapse; margin-top:24px; }
            td { padding:10px 0; border-bottom:1px solid #e5e7eb; font-size:14px; }
            td:first-child { color:#6b7280; width:40%; }
            td:last-child { font-weight:600; }
            .total td { font-size:16px; font-weight:700; border-bottom:none; padding-top:16px; }
            .income { color: #4A9FF5; }
            .expense { color: #e16349; }
          </style>
        </head>
        <body>
          <h2>Transaction Receipt</h2>
          <span class="badge">${transaction.invoiceNo}</span>
          <table>
            <tr><td>Date &amp; Time</td><td>${transaction.date}</td></tr>
            <tr><td>Type</td><td>${TYPE_LABELS[transaction.type] ?? transaction.type}</td></tr>
            <tr><td>Category</td><td>${transaction.category}</td></tr>
            <tr><td>Description</td><td>${transaction.description}</td></tr>
            ${transaction.memberCustomId ? `<tr><td>Member ID</td><td>${transaction.memberCustomId}</td></tr>` : ""}
            <tr><td>Payment Method</td><td>${transaction.paymentMethod}</td></tr>
            <tr class="total"><td>Amount</td><td class="${transaction.type}">${transaction.amount.toFixed(2)} TK</td></tr>
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
              Transaction Detail
            </h2>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple/10 text-purple">
              {transaction.invoiceNo}
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
          <DetailRow label="Date &amp; Time" value={transaction.date} />
          <DetailRow
            label="Type"
            value={TYPE_LABELS[transaction.type] ?? transaction.type}
          />
          <DetailRow label="Category" value={transaction.category} />
          <DetailRow label="Description" value={transaction.description} />
          {transaction.memberCustomId && (
            <DetailRow label="Member ID" value={transaction.memberCustomId} />
          )}
          <DetailRow label="Payment Method" value={transaction.paymentMethod} />
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-base font-semibold text-gray-700">Amount</span>
            <span
              className={`text-base font-bold ${
                transaction.type === "expense" ? "text-primary-500" : "text-[#4A9FF5]"
              }`}
            >
              {transaction.amount.toFixed(2)} TK
            </span>
          </div>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span
        className="text-sm text-gray-500 min-w-[130px]"
        dangerouslySetInnerHTML={{ __html: label }}
      />
      <span className="text-sm font-medium text-gray-800 text-right">
        {value}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TransactionList() {
  const { activeBranchId } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [showSummaryOnly, setShowSummaryOnly] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [viewTarget, setViewTarget] = useState<TransactionItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBalanceView, setShowBalanceView] = useState(true);

  // ── Export columns ────────────────────────────────────────────────────────
  const transactionColumns: ExportColumn[] = [
    {
      header: "Date & Time",
      key: "date",
    },
    { header: "Invoice No", key: "invoiceNo" },
    {
      header: "Type",
      key: "type",
      formatter: (v) => TYPE_LABELS[v as string] ?? (v as string) ?? "—",
    },
    { header: "Category", key: "category" },
    { header: "Description", key: "description" },
    { header: "Member ID", key: "memberCustomId" },
    { header: "Payment Method", key: "paymentMethod" },
    {
      header: "Amount",
      key: "amount",
      formatter: (v) => Number(v ?? 0).toFixed(2),
    },
  ];

  const handleExportClick = (format: "pdf" | "excel") => {
    setExportFormat(format);
    setShowExportModal(true);
  };

  // ── Build API query params ────────────────────────────────────────────────
  const dateParams = useMemo(() => {
    const now = new Date();
    if (dateFilter === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
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
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (dateFilter === "custom" && customStartDate && customEndDate) {
      return {
        startDate: new Date(customStartDate).toISOString(),
        endDate: new Date(customEndDate + "T23:59:59").toISOString(),
      };
    }
    return {};
  }, [dateFilter, customStartDate, customEndDate]);

  const exportDateRange = useMemo(() => {
    if (dateParams.startDate && dateParams.endDate) {
      return {
        startDate: new Date(dateParams.startDate),
        endDate: new Date(dateParams.endDate),
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [dateParams]);

  // Regular paginated query
  const { data: transactionResponse, isLoading } = useGetTransactionsByBranchQuery(
    {
      branchId: activeBranchId!,
      searchTerm: searchQuery || undefined,
      type: selectedType || undefined,
      paymentMethod: selectedMethod || undefined,
      ...dateParams,
      page: currentPage,
      limit: 20,
    },
    { skip: !activeBranchId || showBalanceView },
  );

  // Balance query (no pagination, grouped by day)
  const { data: balanceResponse, isLoading: isBalanceLoading } = useGetTransactionsWithBalanceQuery(
    {
      branchId: activeBranchId!,
      type: selectedType || undefined,
      paymentMethod: selectedMethod || undefined,
      ...dateParams,
    },
    { skip: !activeBranchId || !showBalanceView },
  );

  const transactions = useMemo(
    () => transactionResponse?.data ?? [],
    [transactionResponse],
  );

  const meta = transactionResponse?.meta;

  const totalAmount = useMemo(
    () => transactions.reduce((sum, t) => {
      if (t.type === "expense") return sum - t.amount;
      return sum + t.amount;
    }, 0),
    [transactions],
  );

  // Balance view data
  const balanceData = useMemo(() => balanceResponse?.data ?? [], [balanceResponse]);
  const overallClosingBalance = balanceResponse?.closingBalance ?? 0;

  // Flatten transactions from balance view for export
  const balanceTransactions = useMemo(
    () => balanceData.flatMap((day) => day.transactions),
    [balanceData],
  );

  // ── Group by date (for summary / custom view) ─────────────────────────────
  const groupedByDate = useMemo(() => {
    const groups: { [key: string]: { records: TransactionItem[]; total: number } } = {};
    transactions.forEach((t) => {
      const key = toDateKey(t.dateISO);
      if (!groups[key]) groups[key] = { records: [], total: 0 };
      groups[key].records.push(t);
      groups[key].total += t.type === "expense" ? -t.amount : t.amount;
    });
    return groups;
  }, [transactions]);

  // ── Reset page on filter change ───────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleMethodChange = (method: string) => {
    setSelectedMethod(method);
    setCurrentPage(1);
  };

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
          Type
        </th>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          Category
        </th>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          Description
        </th>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          Member ID
        </th>
        <th className="px-6 py-4 text-center text-base font-semibold text-text-primary border-b">
          Payment
        </th>
        <th className="px-6 py-4 text-right text-base font-semibold text-text-primary border-b">
          Amount
        </th>
        <th className="px-6 py-4 text-center text-base font-semibold text-text-primary border-b">
          View
        </th>
      </tr>
    </thead>
  );

  // ── Row renderer ──────────────────────────────────────────────────────────
  const renderRow = (t: TransactionItem, index: number) => (
    <tr
      key={t.id}
      className={`transition-colors ${
        index % 2 === 0 ? "bg-white" : "bg-gray-primary"
      } hover:bg-[#F2EEFF] rounded-md`}
    >
      <td className="px-6 py-4 text-sm text-gray-medium rounded-l-md whitespace-nowrap">
        {t.date}
      </td>
      <td className="px-6 py-4 text-sm text-gray-medium">
        {t.invoiceNo}
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            t.type === "income"
              ? "bg-blue-50 text-[#4A9FF5]"
              : "bg-red-50 text-primary-500"
          }`}
        >
          {TYPE_LABELS[t.type] ?? t.type}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-medium">
        {t.category}
      </td>
      <td className="px-6 py-4 text-sm text-gray-medium max-w-[200px] truncate">
        {t.description}
      </td>
      <td className="px-6 py-4 text-sm text-gray-medium">
        {t.memberCustomId || "—"}
      </td>
      <td className="px-6 py-4 text-center text-sm text-gray-medium">
        {t.paymentMethod}
      </td>
      <td className="px-6 py-4 text-right">
        <span
          className={`text-sm font-medium ${
            t.type === "expense" ? "text-primary-500" : "text-[#4A9FF5]"
          }`}
        >
          {t.amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </td>
      <td className="px-6 py-4 text-center rounded-r-md">
        <button
          onClick={() => setViewTarget(t)}
          className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer hover:scale-110"
          title="View details"
        >
          <ImageIcon activeImage="/icons/edit.svg" size={20} />
        </button>
      </td>
    </tr>
  );

  // ── Card-based balance view helpers ─────────────────────────────────────
  const cardTableHead = (
    <thead>
      <tr>
        <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 border-b border-gray-100">
          Invoice No
        </th>
        <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 border-b border-gray-100">
          Type
        </th>
        <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 border-b border-gray-100">
          Category
        </th>
        <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 border-b border-gray-100">
          Description
        </th>
        <th className="px-5 py-3 text-center text-sm font-semibold text-gray-600 border-b border-gray-100">
          Payment
        </th>
        <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600 border-b border-gray-100">
          Amount
        </th>
        <th className="px-5 py-3 text-center text-sm font-semibold text-gray-600 border-b border-gray-100 w-12">
          View
        </th>
      </tr>
    </thead>
  );

  const renderCardRow = (t: TransactionWithBalance, index: number) => (
    <tr
      key={t.id}
      className={`transition-colors ${
        index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
      } hover:bg-purple/5`}
    >
      <td className="px-5 py-3 text-sm text-gray-700 font-medium">
        {t.invoiceNo}
      </td>
      <td className="px-5 py-3">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            t.type === "income"
              ? "bg-blue-50 text-[#4A9FF5]"
              : "bg-red-50 text-primary-500"
          }`}
        >
          {TYPE_LABELS[t.type] ?? t.type}
        </span>
      </td>
      <td className="px-5 py-3 text-sm text-gray-600">
        {t.category}
      </td>
      <td className="px-5 py-3 text-sm text-gray-600 max-w-[180px] truncate">
        {t.description}
      </td>
      <td className="px-5 py-3 text-center text-sm text-gray-500">
        {t.paymentMethod}
      </td>
      <td className="px-5 py-3 text-right">
        <span
          className={`text-sm font-semibold ${
            t.type === "expense" ? "text-primary-500" : "text-[#4A9FF5]"
          }`}
        >
          {t.type === "expense" ? "-" : "+"}
          {t.amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </td>
      <td className="px-5 py-3 text-center">
        <button
          onClick={() => setViewTarget(t)}
          className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer hover:scale-110"
          title="View details"
        >
          <ImageIcon activeImage="/icons/edit.svg" size={18} />
        </button>
      </td>
    </tr>
  );

  // ── Pagination controls ──────────────────────────────────────────────────
  const paginationControls = meta && meta.totalPage > 1 ? (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage <= 1}
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        Prev
      </button>
      {Array.from({ length: Math.min(meta.totalPage, 5) }, (_, i) => {
        const page = i + 1;
        return (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
              currentPage === page
                ? "bg-purple text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {page}
          </button>
        );
      })}
      {meta.totalPage > 5 && (
        <span className="text-sm text-gray-400 px-1">...</span>
      )}
      <button
        onClick={() => setCurrentPage((p) => Math.min(meta.totalPage, p + 1))}
        disabled={currentPage >= meta.totalPage}
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  return (
    <div className="min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-1">
              Transaction List
            </h1>
            <p className="text-sm text-gray-500">
              View all income and expense transactions in one place.
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
                  placeholder="Search INV/Name/Description..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 h-10 border-gray-300 focus:border-primary focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <DateFilterDropdown
                dateFilter={dateFilter}
                setDateFilter={(f) => { setDateFilter(f); setCurrentPage(1); }}
                customStartDate={customStartDate}
                setCustomStartDate={(v) => { setCustomStartDate(v); setCurrentPage(1); }}
                customEndDate={customEndDate}
                setCustomEndDate={(v) => { setCustomEndDate(v); setCurrentPage(1); }}
              />

              {/* Type filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-primary rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors min-w-25 justify-between h-10 cursor-pointer">
                    <HugeiconsIcon icon={FilterHorizontalIcon} size={24} />
                    <span className="truncate max-w-30">
                      {selectedType ? TYPE_LABELS[selectedType] : "All Types"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => handleTypeChange("")}
                    className="cursor-pointer"
                  >
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleTypeChange("income")}
                    className="cursor-pointer"
                  >
                    Income
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleTypeChange("expense")}
                    className="cursor-pointer"
                  >
                    Expense
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Payment method filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-primary rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors min-w-25 justify-between h-10 cursor-pointer">
                    <HugeiconsIcon icon={FilterHorizontalIcon} size={24} />
                    <span className="truncate max-w-30">
                      {selectedMethod || "All Methods"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {["", "Cash", "Bkash", "Nagad", "Card", "Bank", "Other"].map(
                    (method) => (
                      <DropdownMenuItem
                        key={method}
                        onClick={() => handleMethodChange(method)}
                        className="cursor-pointer"
                      >
                        {method || "All Methods"}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {meta && !showBalanceView && (
              <p className="text-sm text-gray-400">
                {meta.total} transaction{meta.total !== 1 ? "s" : ""} found
              </p>
            )}
            {showBalanceView && balanceData.length > 0 && (
              <p className="text-sm text-gray-400">
                {balanceTransactions.length} transaction{balanceTransactions.length !== 1 ? "s" : ""} found
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBalanceView(!showBalanceView)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  showBalanceView
                    ? "bg-purple text-white"
                    : "bg-gray-primary text-gray-700 hover:bg-gray-200"
                }`}
              >
                {showBalanceView ? "Balance View" : "Simple View"}
              </button>
              {!showBalanceView && (
                <SummaryViewToggle
                  showSummaryOnly={showSummaryOnly}
                  setShowSummaryOnly={setShowSummaryOnly}
                />
              )}
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {(isLoading || isBalanceLoading) && (
          <div className="bg-white rounded-2xl border-8 border-gray-secondary p-6 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        )}

        {/* Balance View - Card-based layout */}
        {!isLoading && !isBalanceLoading && showBalanceView && balanceData.length > 0 && (
          <div className="space-y-5">
            {balanceData.map((day) => {
              const dailyIncome = day.transactions
                .filter((t) => t.type === "income")
                .reduce((sum, t) => sum + t.amount, 0);
              const dailyExpense = day.transactions
                .filter((t) => t.type === "expense")
                .reduce((sum, t) => sum + t.amount, 0);
              const dailyNet = dailyIncome - dailyExpense;

              return (
                <div
                  key={day.dateISO}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b bg-gray-50 border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-purple/10 text-purple">
                          📅
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-800">
                            {day.date.split(",")[0]}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Opening Balance:
                            <span className={`ml-1 font-semibold ${
                              day.openingBalance >= 0 ? "text-[#4A9FF5]" : "text-primary-500"
                            }`}>
                              {day.openingBalance.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} TK
                            </span>
                          </p>
                        </div>
                      </div>
                      <div>
                        {day.isToday ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple/10 text-purple">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse" />
                            Current
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple/10 text-purple">
                            ✓ Closed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body - Transaction Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      {cardTableHead}
                      <tbody className="divide-y divide-gray-100">
                        {day.transactions.map((t, i) => renderCardRow(t, i))}
                      </tbody>
                    </table>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 border-t bg-gray-50 border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#4A9FF5]" />
                          <span className="text-xs text-gray-500">Income</span>
                          <span className="text-xs font-semibold text-[#4A9FF5]">
                            +{dailyIncome.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary-500" />
                          <span className="text-xs text-gray-500">Expense</span>
                          <span className="text-xs font-semibold text-primary-500">
                            -{dailyExpense.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200">
                          <span className="text-xs text-gray-500 font-medium">Net</span>
                          <span className={`text-xs font-bold ${
                            dailyNet >= 0 ? "text-[#4A9FF5]" : "text-primary-500"
                          }`}>
                            {dailyNet >= 0 ? "+" : ""}
                            {dailyNet.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">
                          {day.isToday ? "Current Balance" : "Closing Balance"}
                        </span>
                        <p className={`text-sm font-bold ${
                          day.closingBalance >= 0 ? "text-[#4A9FF5]" : "text-primary-500"
                        }`}>
                          {day.closingBalance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} TK
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Overall Summary */}
            <div className="rounded-xl border border-purple/20 bg-purple/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-gray-700">
                  {dateFilter === "today" ? "Current Balance" : "Closing Balance"}
                </span>
                <span
                  className={`text-xl font-bold ${
                    overallClosingBalance >= 0 ? "text-[#4A9FF5]" : "text-primary-500"
                  }`}
                >
                  {overallClosingBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} TK
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Balance View - Empty state */}
        {!isLoading && !isBalanceLoading && showBalanceView && balanceData.length === 0 && (
          <div className="bg-white rounded-2xl border-8 border-gray-secondary p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <ImageIcon activeImage="/icons/document.svg" size={56} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No Transactions Found
              </h3>
              <p className="text-sm text-gray-500">
                No transaction records found for this period.
              </p>
            </div>
          </div>
        )}

        {/* Regular View (without balance) */}
        {!isLoading && !showBalanceView && showSummaryOnly ? (
          // Summary View
          <div className="bg-white rounded-2xl border-8 border-gray-secondary overflow-hidden p-3">
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-medium">
                Transaction Summary
              </h3>
            </div>
            <div className="overflow-auto">
              <table className="w-full border-separate border-spacing-y-0.5 border border-border-2 rounded-lg px-2">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-base font-semibold text-text-primary border-b">
                      Balance
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
                        No transaction records found for this period.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedByDate).map(
                      ([date, data], index) => (
                        <tr
                          key={date}
                          className={`transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-primary"
                          } hover:bg-[#F2EEFF] rounded-md`}
                        >
                          <td className="px-6 py-4 text-sm text-gray-medium rounded-l-md">
                            {date}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium rounded-r-md">
                            <span
                              className={
                                data.total >= 0 ? "text-[#4A9FF5]" : "text-primary-500"
                              }
                            >
                              {data.total.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
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
                Net Balance
              </span>
              <span
                className={`text-lg font-semibold ${
                  totalAmount >= 0 ? "text-[#4A9FF5]" : "text-primary-500"
                }`}
              >
                {totalAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        ) : !isLoading && !showBalanceView && transactions.length === 0 ? (
          // Empty state
          <div className="bg-white rounded-2xl border-8 border-gray-secondary p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <ImageIcon activeImage="/icons/document.svg" size={56} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No Transactions Found
              </h3>
              <p className="text-sm text-gray-500">
                No transaction records found for this period.
              </p>
            </div>
          </div>
        ) : !isLoading && !showBalanceView ? (
          // Regular table view
          <div className="bg-white rounded-2xl border-8 border-gray-secondary overflow-hidden p-3">
            <div className="pb-4">
              <h3 className="text-lg font-semibold text-gray-medium">
                Transactions
              </h3>
            </div>
            <div className="overflow-auto">
              <table className="w-full border-separate border-spacing-y-0.5 border border-border-2 rounded-lg px-2">
                {tableHead}
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((t, i) => renderRow(t, i))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4 bg-gray-primary p-4 rounded-lg">
              <span className="text-lg font-semibold text-gray-medium">
                {dateFilter === "today" ? "Today Balance" : "Net Balance"}
              </span>
              <span
                className={`text-lg font-semibold ${
                  totalAmount >= 0 ? "text-[#4A9FF5]" : "text-primary-500"
                }`}
              >
                {totalAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            {paginationControls}
          </div>
        ) : null}
      </div>

      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportFormat={exportFormat}
        data={(showBalanceView ? balanceTransactions : transactions) as unknown as Record<string, unknown>[]}
        reportType="Transaction"
        columns={transactionColumns}
        defaultStartDate={exportDateRange.startDate}
        defaultEndDate={exportDateRange.endDate}
        dateField="dateISO"
        amountField="amount"
      />

      {viewTarget && (
        <TransactionDetailModal
          transaction={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}
