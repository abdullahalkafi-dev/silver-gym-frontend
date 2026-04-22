// components/dashboard/Expense/ExpenseList.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Expense } from "@/types/expense-category";
import { DateFilterType } from "@/types/income";
import DateFilterDropdown from "../Income/DateFilterDropdown";
import SummaryViewToggle from "../Income/SummaryViewToggle";
import AddExpenseModal from "@/components/modals/AddExpenseModal";
import ExportReportModal from "@/components/modals/ExportReportModal";
import { ImageIcon } from "@/components/utils/ImageIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignSquareIcon } from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import {
  useGetExpensesByBranchQuery,
  useGetCategoriesByBranchQuery,
} from "@/redux/features/expense/expenseApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank",
  bkash: "Bkash",
  due: "Due",
};

const formatExpenseDate = (isoDate: string): string => {
  try {
    const d = new Date(isoDate);
    return (
      d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " " +
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  } catch {
    return isoDate;
  }
};

const toDateKey = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
};

// ─── Expense Detail Modal ─────────────────────────────────────────────────────

function ExpenseDetailModal({
  expense,
  onClose,
}: {
  expense: Expense;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    const el = printRef.current;
    if (!el) return;
    const printWindow = window.open("", "_blank", "width=700,height=900");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Expense – ${expense.invoiceNo}</title>
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
          <h2>Expense Receipt</h2>
          <span class="badge">${expense.invoiceNo}</span>
          <table>
            <tr><td>Date &amp; Time</td><td>${formatExpenseDate(expense.expenseDate)}</td></tr>
            <tr><td>Category</td><td>${expense.categoryTitle}</td></tr>
            <tr><td>Subcategory</td><td>${expense.subcategoryTitle ?? "—"}</td></tr>
            <tr><td>Description</td><td>${expense.description ?? "—"}</td></tr>
            <tr><td>Payment Method</td><td>${PAYMENT_LABELS[expense.paymentMethod] ?? expense.paymentMethod}</td></tr>
            <tr class="total"><td>Amount</td><td>${expense.amount.toFixed(2)} TK</td></tr>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Expense Detail</h2>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple/10 text-purple">
              {expense.invoiceNo}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div ref={printRef} className="px-6 py-5 space-y-3">
          <Row label="Date &amp; Time" value={formatExpenseDate(expense.expenseDate)} />
          <Row label="Category" value={expense.categoryTitle} />
          <Row label="Subcategory" value={expense.subcategoryTitle ?? "—"} />
          <Row label="Description" value={expense.description ?? "—"} />
          <Row
            label="Payment Method"
            value={PAYMENT_LABELS[expense.paymentMethod] ?? expense.paymentMethod}
          />
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-base font-semibold text-gray-700">Amount</span>
            <span className="text-base font-bold text-gray-900">
              {expense.amount.toFixed(2)} TK
            </span>
          </div>
        </div>

        {/* Footer */}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 min-w-[130px]" dangerouslySetInnerHTML={{ __html: label }} />
      <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExpenseList() {
  const { activeBranchId } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string>("");
  const [showSummaryOnly, setShowSummaryOnly] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [viewTarget, setViewTarget] = useState<Expense | null>(null);

  // ── Category data for filter dropdown ─────────────────────────────────────
  const { data: categories = [] } = useGetCategoriesByBranchQuery(
    { branchId: activeBranchId! },
    { skip: !activeBranchId },
  );
  const categoryTitles = useMemo(
    () => categories.map((c) => c.title),
    [categories],
  );
  const selectedCategoryObj = categories.find(
    (c) => c.title === selectedCategoryTitle,
  );

  // ── Build API query params ────────────────────────────────────────────────
  const dateParams = useMemo(() => {
    const now = new Date();
    if (dateFilter === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
    }
    if (dateFilter === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
    }
    if (dateFilter === "custom" && customStartDate && customEndDate) {
      return {
        dateFrom: new Date(customStartDate).toISOString(),
        dateTo: new Date(customEndDate + "T23:59:59").toISOString(),
      };
    }
    return {};
  }, [dateFilter, customStartDate, customEndDate]);

  const { data: expenseResponse, isLoading } = useGetExpensesByBranchQuery(
    {
      branchId: activeBranchId!,
      searchTerm: searchQuery || undefined,
      categoryId: selectedCategoryObj?.id || undefined,
      ...dateParams,
      limit: 200,
    },
    { skip: !activeBranchId },
  );

  const expenses = useMemo(
    () => expenseResponse?.data ?? [],
    [expenseResponse],
  );
  const totalAmount = expenseResponse?.totalAmount ?? 0;

  const expenseColumns = [
    { header: "Date & Time", key: "expenseDate" },
    { header: "Invoice No", key: "invoiceNo" },
    { header: "Category", key: "categoryTitle" },
    { header: "Description", key: "description" },
    { header: "Payment", key: "paymentMethod" },
    { header: "Amount", key: "amount" },
  ];

  // ── Group by date for custom/summary view ─────────────────────────────────
  const groupedByDate = useMemo(() => {
    const groups: {
      [key: string]: { records: Expense[]; total: number };
    } = {};
    expenses.forEach((expense) => {
      const key = toDateKey(expense.expenseDate);
      if (!groups[key]) groups[key] = { records: [], total: 0 };
      groups[key].records.push(expense);
      groups[key].total += expense.amount;
    });
    return groups;
  }, [expenses]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleExportClick = (format: "pdf" | "excel") => {
    setExportFormat(format);
    setShowExportModal(true);
  };

  // ── Row renderer ──────────────────────────────────────────────────────────
  const renderRow = (expense: Expense, index: number) => (
    <tr
      key={expense.id}
      className={`transition-colors ${
        index % 2 === 0 ? "bg-white" : "bg-gray-primary"
      } hover:bg-[#F2EEFF] rounded-md`}
    >
      <td className="px-6 py-4 text-sm text-gray-medium rounded-l-md">
        {formatExpenseDate(expense.expenseDate)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-medium">
        {expense.invoiceNo}
      </td>
      <td className="px-6 py-4 text-sm text-gray-medium">
        {expense.categoryTitle}
      </td>
      <td className="px-6 py-4 text-sm text-gray-medium max-w-xs truncate">
        {expense.description || "—"}
      </td>
      <td className="px-6 py-4 text-center text-sm text-gray-medium">
        {PAYMENT_LABELS[expense.paymentMethod] ?? expense.paymentMethod}
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-medium">
        {expense.amount.toFixed(2)}
      </td>
      <td className="px-6 py-4 text-center rounded-r-md">
        <button
          onClick={() => setViewTarget(expense)}
          className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer hover:scale-110"
          title="View details"
        >
          <ImageIcon activeImage="/icons/edit.svg" size={20} />
        </button>
      </td>
    </tr>
  );

  const tableHead = (
    <thead>
      <tr>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          Date &amp; Time
        </th>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          INV: NO:
        </th>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          Category Title
        </th>
        <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
          Description
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

  return (
    <div className="min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-1">
              Expense List
            </h1>
            <p className="text-sm text-gray-500">
              Easily review and control your company&apos;s spending records.
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
              onClick={() => setShowAddExpenseModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple text-white rounded-md hover:bg-[#6A3FE0] transition-colors text-sm md:text-base cursor-pointer"
            >
              <HugeiconsIcon icon={PlusSignSquareIcon} size={24} />
              Add Expense
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
                  placeholder="Search ID/Name/Title..."
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

              {/* Expense-specific category filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-primary rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors min-w-25 justify-between h-10 cursor-pointer">
                    <HugeiconsIcon icon={FilterHorizontalIcon} size={24} />
                    <span className="truncate max-w-30">
                      {selectedCategoryTitle || "Filter by Category"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-50">
                  <DropdownMenuItem
                    onClick={() => setSelectedCategoryTitle("")}
                    className="cursor-pointer"
                  >
                    All Categories
                  </DropdownMenuItem>
                  {categoryTitles.map((title) => (
                    <DropdownMenuItem
                      key={title}
                      onClick={() => setSelectedCategoryTitle(title)}
                      className="cursor-pointer"
                    >
                      {title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
                Expense Summary
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
                        No expense records found for this period.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedByDate).map(([date, data], index) => (
                      <tr
                        key={date}
                        className={`transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-primary"
                        } hover:bg-[#F2EEFF] rounded-md`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-medium rounded-l-md">
                          {date}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-medium rounded-r-md">
                          {data.total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4 bg-gray-primary p-4 rounded-lg">
              <span className="text-lg font-semibold text-gray-medium">
                Total Expense
              </span>
              <span className="text-lg font-semibold text-gray-medium">
                {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        ) : !isLoading && dateFilter === "custom" && customStartDate && customEndDate ? (
          // Grouped by date view
          <div className="bg-white rounded-2xl border-8 border-gray-secondary overflow-hidden p-3">
            <div className="pb-4">
              <h3 className="text-lg font-semibold text-gray-medium">
                Expense List
              </h3>
            </div>
            <div className="space-y-6">
              {Object.keys(groupedByDate).length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <h3 className="text-sm font-medium text-gray-900">
                    No Records Found
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    No expense records found for the selected date range.
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
                          {data.records.map((expense, index) =>
                            renderRow(expense, index),
                          )}
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
                Total Expense
              </span>
              <span className="text-lg font-semibold text-gray-medium">
                {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        ) : !isLoading && expenses.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-2xl border-8 border-gray-secondary p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <HugeiconsIcon icon={PlusSignSquareIcon} size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No Expense Records
              </h3>
              <p className="text-sm text-gray-500">
                No expense records found for this period. Add one to get
                started.
              </p>
            </div>
          </div>
        ) : !isLoading ? (
          // Regular table view
          <div className="bg-white rounded-2xl border-8 border-gray-secondary overflow-hidden p-3">
            <div className="pb-4">
              <h3 className="text-lg font-semibold text-gray-medium">
                Expense List
              </h3>
            </div>
            <div className="overflow-auto">
              <table className="w-full border-separate border-spacing-y-0.5 border border-border-2 rounded-lg px-2">
                {tableHead}
                <tbody className="divide-y divide-gray-200">
                  {expenses.map((expense, index) =>
                    renderRow(expense, index),
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4 bg-gray-primary p-4 rounded-lg">
              <span className="text-lg font-semibold text-gray-medium">
                {dateFilter === "today" ? "Today Expense" : "Total Expense"}
              </span>
              <span className="text-lg font-semibold text-gray-medium">
                {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <AddExpenseModal
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
      />

      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportFormat={exportFormat}
        data={expenses as unknown as Record<string, unknown>[]}
        reportType="Expense"
        columns={expenseColumns}
      />

      {viewTarget && (
        <ExpenseDetailModal
          expense={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}

