// components/dashboard/Income/DateFilterDropdown.tsx
"use client";

import { useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import { format } from "date-fns";
import { DateFilterType } from "@/types/income";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DateFilterDropdownProps {
  dateFilter: DateFilterType;
  setDateFilter: (filter: DateFilterType) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
}

export default function DateFilterDropdown({
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}: DateFilterDropdownProps) {
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [pendingStart, setPendingStart] = useState<Date | undefined>(
    customStartDate ? new Date(customStartDate) : undefined,
  );
  const [pendingEnd, setPendingEnd] = useState<Date | undefined>(
    customEndDate ? new Date(customEndDate) : undefined,
  );

  const getDisplayText = () => {
    if (dateFilter === "today") return "Today";
    if (dateFilter === "thisMonth") return "This Month";
    if (dateFilter === "custom" && customStartDate && customEndDate) {
      const s = format(new Date(customStartDate), "dd/MM/yyyy");
      const e = format(new Date(customEndDate), "dd/MM/yyyy");
      return `${s} – ${e}`;
    }
    return "Today";
  };

  const handleSelectPreset = (filter: DateFilterType) => {
    setDateFilter(filter);
    setShowCustomPanel(false);
  };

  const handleCustomDateClick = () => {
    // Reset pending to whatever is already applied
    setPendingStart(customStartDate ? new Date(customStartDate) : undefined);
    setPendingEnd(customEndDate ? new Date(customEndDate) : undefined);
    setShowCustomPanel(true);
  };

  const handleApply = () => {
    if (!pendingStart || !pendingEnd) return;
    // Store as YYYY-MM-DD strings (same format as before for IncomeList compatibility)
    setCustomStartDate(format(pendingStart, "yyyy-MM-dd"));
    setCustomEndDate(format(pendingEnd, "yyyy-MM-dd"));
    setDateFilter("custom");
    setShowCustomPanel(false);
  };

  const handleCancelPanel = () => {
    setShowCustomPanel(false);
  };

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-primary rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors min-w-[100px] justify-between h-10 cursor-pointer">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="truncate max-w-[180px]">{getDisplayText()}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem
            onClick={() => handleSelectPreset("today")}
            className="cursor-pointer"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Today
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSelectPreset("thisMonth")}
            className="cursor-pointer"
          >
            <Calendar className="w-4 h-4 mr-2" />
            This Month
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleCustomDateClick}
            className="cursor-pointer"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Custom Date
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom date picker panel (inline popover below the button) */}
      {showCustomPanel && (
        <>
          {/* Invisible overlay to close on outside click */}
          <div
            className="fixed inset-0 z-30"
            onClick={handleCancelPanel}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-12 z-40 bg-white rounded-xl shadow-xl border border-gray-100 p-5 w-[360px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Select date range
              </h3>
              <button
                onClick={handleCancelPanel}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Start date
                </label>
                <DatePickerPopover
                  value={pendingStart}
                  onChange={setPendingStart}
                  placeholder="DD MMM YYYY"
                  maxDate={pendingEnd}
                  formatStr="dd MMM yyyy"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  End date
                </label>
                <DatePickerPopover
                  value={pendingEnd}
                  onChange={setPendingEnd}
                  placeholder="DD MMM YYYY"
                  minDate={pendingStart}
                  formatStr="dd MMM yyyy"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCancelPanel}
                className="flex-1 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!pendingStart || !pendingEnd}
                className="flex-1 px-3 py-2 text-sm text-white bg-purple rounded-lg hover:bg-purple/90 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

