// components/modals/ExportReportModal.tsx
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ImageIcon } from "@/components/utils/ImageIcon";
import { toast } from "sonner";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import {
  exportToPDF,
  exportToExcel,
  type ExportColumn,
} from "@/lib/exportUtils";

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportFormat: "pdf" | "excel";
  data: Record<string, unknown>[];
  reportType: "Income" | "Expense" | "Transaction";
  columns: ExportColumn[];
  /** Pre-fill the start date from the page's current date filter */
  defaultStartDate?: Date;
  /** Pre-fill the end date from the page's current date filter */
  defaultEndDate?: Date;
  /** ISO field name on each row used for date-range filtering (e.g. "paymentDate") */
  dateField?: string;
  /** Numeric field name on each row to sum as total (e.g. "paidTotal") */
  amountField?: string;
}

export default function ExportReportModal({
  isOpen,
  onClose,
  exportFormat,
  data,
  reportType,
  columns,
  defaultStartDate,
  defaultEndDate,
  dateField,
  amountField,
}: ExportReportModalProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultEndDate);
  const [isExporting, setIsExporting] = useState(false);

  // Sync when defaults change (e.g. user changes page filter then opens modal again)
  useEffect(() => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
  }, [defaultStartDate, defaultEndDate]);

  if (!isOpen) return null;

  const handleExport = () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    setIsExporting(true);

    try {
      const config = {
        data,
        columns,
        title: `${reportType} Report`,
        dateField,
        amountField,
        startDate,
        endDate,
      };

      if (exportFormat === "pdf") {
        exportToPDF(config);
      } else {
        exportToExcel(config);
      }

      toast.success(
        `Report exported successfully as ${exportFormat.toUpperCase()}!`,
        { duration: 3000 },
      );
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-50">
            <ImageIcon
              activeImage={
                exportFormat === "pdf" ? "/icons/pdf.svg" : "/icons/excel.svg"
              }
              size={32}
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800">
              Export Your Report
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Download your {reportType.toLowerCase()} records by selecting a start and end date.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start date
              </label>
              <DatePickerPopover
                value={startDate}
                onChange={setStartDate}
                placeholder="Pick start date"
                maxDate={endDate}
                formatStr="dd MMM yyyy"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End date
              </label>
              <DatePickerPopover
                value={endDate}
                onChange={setEndDate}
                placeholder="Pick end date"
                minDate={startDate}
                formatStr="dd MMM yyyy"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={!startDate || !endDate || isExporting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-purple hover:bg-[#6A3FE0] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              "Download Now"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}