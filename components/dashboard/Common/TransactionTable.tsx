// components/dashboard/Common/TransactionTable.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import { FileText, Search } from "lucide-react";
import type { OverviewTransaction as Transaction } from "@/types/analytics";
import { ImageIcon } from "@/components/utils/ImageIcon";

interface TransactionTableProps {
  title?: string;
  data: Transaction[];
  openingBalance?: number;
  runningBalance?: number | null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 min-w-[130px]">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}

function TransactionDetailModal({
  transaction,
  onClose,
}: {
  transaction: Transaction;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const TYPE_LABELS: Record<string, string> = {
    income: "Income",
    expense: "Expense",
  };

  const handleDownloadPdf = () => {
    const printWindow = window.open("", "_blank", "width=700,height=900");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Transaction – ${transaction.id}</title>
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
          <span class="badge">${transaction.id}</span>
          <table>
            <tr><td>Date &amp; Time</td><td>${transaction.date}</td></tr>
            <tr><td>Type</td><td>${TYPE_LABELS[transaction.type] ?? transaction.type}</td></tr>
            <tr><td>Category</td><td>${transaction.category}</td></tr>
            <tr><td>Description</td><td>${transaction.description}</td></tr>
            ${transaction.memberCustomId ? `<tr><td>Member ID</td><td>${transaction.memberCustomId}</td></tr>` : ""}
            <tr><td>Payment Method</td><td>${transaction.payment}</td></tr>
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
              {transaction.id}
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
          <DetailRow label="Date & Time" value={transaction.date} />
          <DetailRow
            label="Type"
            value={TYPE_LABELS[transaction.type] ?? transaction.type}
          />
          <DetailRow label="Category" value={transaction.category} />
          <DetailRow label="Description" value={transaction.description || "—"} />
          {transaction.memberCustomId && (
            <DetailRow label="Member ID" value={transaction.memberCustomId} />
          )}
          <DetailRow label="Payment Method" value={transaction.payment} />
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

const TransactionTable: React.FC<TransactionTableProps> = ({
  title = "Today Transaction",
  data,
  openingBalance = 0,
  runningBalance,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTarget, setViewTarget] = useState<Transaction | null>(null);

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((t) =>
      t.id.toLowerCase().includes(q) ||
      t.categoryName.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.memberCustomId?.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const totalIncome = useMemo(
    () => filteredData.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0),
    [filteredData]
  );
  const totalExpense = useMemo(
    () => filteredData.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0),
    [filteredData]
  );
  const netBalance = totalIncome - totalExpense;

  const currentBalance = runningBalance ?? (openingBalance + netBalance);

  const dateDisplay = useMemo(() => {
    if (filteredData.length === 0) {
      return new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Dhaka",
      });
    }
    const raw = filteredData[0].date;
    const parts = raw.split(",");
    return parts[0]?.trim() ?? raw;
  }, [filteredData]);

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-medium">
          {title}
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search ID/Name/Title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-medium placeholder:text-text-secondary focus:outline-none focus:border-[#AA81FE] transition-colors w-[250px]"
          />
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-4 border-b bg-gray-50 border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-purple/10 text-purple">
                📅
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  {dateDisplay}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Opening Balance:{" "}
                  <span
                    className={`font-semibold ${
                      openingBalance >= 0 ? "text-[#4A9FF5]" : "text-primary-500"
                    }`}
                  >
                    {openingBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    TK
                  </span>
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple/10 text-purple">
              <span className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse" />
              Current
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
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
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((t, index) => (
                  <tr
                    key={t.id + index}
                    className={`transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    } hover:bg-purple/5`}
                  >
                    <td className="px-5 py-3 text-sm text-gray-700 font-medium">
                      {t.id}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.type === "income"
                            ? "bg-blue-50 text-[#4A9FF5]"
                            : "bg-red-50 text-primary-500"
                        }`}
                      >
                        {t.type === "income" ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {t.category}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 max-w-[180px] truncate">
                      {t.description || "—"}
                    </td>
                    <td className="px-5 py-3 text-center text-sm text-gray-500">
                      {t.payment}
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
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12">
                    {data.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 h-[20vh]">
                        <FileText size={56} />
                        <div className="text-center">
                          <p className="text-base font-medium text-text-primary mb-1">
                            No data available yet
                          </p>
                          <p className="text-sm text-text-secondary max-w-md">
                            Once you start adding members, packages, or transactions,
                            <br />
                            everything will appear here.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 h-[20vh]">
                        <ImageIcon activeImage="/icons/sleep.svg" size={56} />
                        <div className="text-center">
                          <p className="text-base">
                            <span className="text-primary-500">Oops!</span>{" "}
                            <span className="text-gray-medium">Nothing matches</span>
                          </p>
                          <p className="text-sm text-gray-medium">your search</p>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer */}
        {filteredData.length > 0 && (
          <div className="px-5 py-3 border-t bg-gray-50 border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4A9FF5]" />
                  <span className="text-xs text-gray-500">Income</span>
                  <span className="text-xs font-semibold text-[#4A9FF5]">
                    +{totalIncome.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary-500" />
                  <span className="text-xs text-gray-500">Expense</span>
                  <span className="text-xs font-semibold text-primary-500">
                    -{totalExpense.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Net</span>
                  <span className={`text-xs font-bold ${
                    netBalance >= 0 ? "text-[#4A9FF5]" : "text-primary-500"
                  }`}>
                    {netBalance >= 0 ? "+" : ""}
                    {netBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">Current Balance</span>
                <p className={`text-sm font-bold ${
                  currentBalance >= 0 ? "text-[#4A9FF5]" : "text-primary-500"
                }`}>
                  {currentBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  TK
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overall Bottom Bar */}
      {filteredData.length > 0 && (
        <div className="mt-4 rounded-xl border border-purple/20 bg-purple/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-gray-700">
              Current Balance
            </span>
            <span
              className={`text-xl font-bold ${
                currentBalance >= 0 ? "text-[#4A9FF5]" : "text-primary-500"
              }`}
            >
              {currentBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              TK
            </span>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {viewTarget && (
        <TransactionDetailModal
          transaction={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
};

export default TransactionTable;
