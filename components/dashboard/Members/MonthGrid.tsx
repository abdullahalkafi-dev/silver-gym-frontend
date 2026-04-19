"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface MonthYear {
  month: number; // 0-11
  year: number;
}

/** Convert MonthYear to a comparable number (year * 12 + month) */
function toIndex(my: MonthYear): number {
  return my.year * 12 + my.month;
}

/** Convert comparable number back to MonthYear */
function fromIndex(idx: number): MonthYear {
  return { month: ((idx % 12) + 12) % 12, year: Math.floor(idx / 12) };
}

function isSame(a: MonthYear, b: MonthYear): boolean {
  return a.month === b.month && a.year === b.year;
}

function isInRange(my: MonthYear, range: MonthYear[]): boolean {
  return range.some((r) => isSame(r, my));
}

/** Build consecutive months between start and end (inclusive) */
function buildRange(start: MonthYear, end: MonthYear): MonthYear[] {
  const startIdx = toIndex(start);
  const endIdx = toIndex(end);
  const low = Math.min(startIdx, endIdx);
  const high = Math.max(startIdx, endIdx);
  const result: MonthYear[] = [];
  for (let i = low; i <= high; i++) {
    result.push(fromIndex(i));
  }
  return result;
}

interface MonthGridProps {
  /** Currently selected months (consecutive) */
  selectedMonths: MonthYear[];
  /** Callback when selection changes */
  onSelectionChange: (months: MonthYear[]) => void;
  /** Earliest selectable month (defaults to current month) */
  minMonth?: MonthYear;
  /** Maximum number of months that can be selected (0 = unlimited) */
  maxMonths?: number;
  /** If true, selection count is locked (e.g. package duration) — user can only shift the range */
  fixedCount?: boolean;
  /** Disabled past months are shown with a lighter style */
  className?: string;
}

function MonthGrid({
  selectedMonths,
  onSelectionChange,
  minMonth,
  maxMonths = 0,
  fixedCount = false,
  className,
}: MonthGridProps) {
  const now = new Date();
  const currentMonth: MonthYear = {
    month: now.getMonth(),
    year: now.getFullYear(),
  };
  const effectiveMin = minMonth || currentMonth;

  // Year for the grid display
  const [displayYear, setDisplayYear] = React.useState(() => {
    if (selectedMonths.length > 0) return selectedMonths[0].year;
    return effectiveMin.year;
  });

  // Generate year options (current year - 1 to +5)
  const yearOptions = React.useMemo(() => {
    const years: number[] = [];
    const base = currentMonth.year;
    for (let y = base - 1; y <= base + 5; y++) {
      years.push(y);
    }
    return years;
  }, [currentMonth.year]);

  const handleMonthClick = (clicked: MonthYear) => {
    const clickIdx = toIndex(clicked);
    const minIdx = toIndex(effectiveMin);

    // Can't select past months
    if (clickIdx < minIdx) return;

    // No selection yet — start new
    if (selectedMonths.length === 0) {
      onSelectionChange([clicked]);
      return;
    }

    const firstIdx = toIndex(selectedMonths[0]);
    const lastIdx = toIndex(selectedMonths[selectedMonths.length - 1]);

    // If clicking an already selected month
    if (clickIdx >= firstIdx && clickIdx <= lastIdx) {
      if (fixedCount) {
        // For fixed count, clicking inside the range shifts it to start from clicked
        const count = selectedMonths.length;
        const newEnd = fromIndex(clickIdx + count - 1);
        const newRange = buildRange(clicked, newEnd);
        if (maxMonths > 0 && newRange.length > maxMonths) return;
        onSelectionChange(newRange);
        return;
      }
      // For free selection, clicking a selected month at the edges shrinks the range
      if (clickIdx === firstIdx && selectedMonths.length > 1) {
        onSelectionChange(selectedMonths.slice(1));
      } else if (clickIdx === lastIdx && selectedMonths.length > 1) {
        onSelectionChange(selectedMonths.slice(0, -1));
      } else {
        // Clicking in the middle — shrink to start..clicked
        onSelectionChange(buildRange(selectedMonths[0], clicked));
      }
      return;
    }

    if (fixedCount) {
      // Fixed count: shift entire range to start from clicked
      const count = selectedMonths.length;
      let startIdx = clickIdx;
      // Ensure we don't go before min
      if (startIdx < minIdx) startIdx = minIdx;
      const endIdx = startIdx + count - 1;
      const newRange = buildRange(fromIndex(startIdx), fromIndex(endIdx));
      onSelectionChange(newRange);
      return;
    }

    // Free selection: extend range to include clicked month
    const newStart = Math.min(firstIdx, clickIdx);
    const newEnd = Math.max(lastIdx, clickIdx);

    // Ensure range doesn't go before min
    const clampedStart = Math.max(newStart, minIdx);
    let range = buildRange(fromIndex(clampedStart), fromIndex(newEnd));

    // Apply max limit
    if (maxMonths > 0 && range.length > maxMonths) {
      // Keep the end closest to the clicked month
      if (clickIdx < firstIdx) {
        range = range.slice(0, maxMonths);
      } else {
        range = range.slice(range.length - maxMonths);
      }
    }

    onSelectionChange(range);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Year selector */}
      <select
        value={displayYear}
        onChange={(e) => setDisplayYear(Number(e.target.value))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple"
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {/* Month grid 4×3 */}
      <div className="grid grid-cols-4 gap-2">
        {MONTH_NAMES_SHORT.map((name, monthIndex) => {
          const my: MonthYear = { month: monthIndex, year: displayYear };
          const myIdx = toIndex(my);
          const minIdx = toIndex(effectiveMin);
          const isPast = myIdx < minIdx;
          const isSelected = isInRange(my, selectedMonths);

          return (
            <button
              key={monthIndex}
              type="button"
              disabled={isPast}
              onClick={() => handleMonthClick(my)}
              className={cn(
                "relative flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-all border",
                isPast &&
                  "opacity-40 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400",
                !isPast &&
                  !isSelected &&
                  "border-gray-200 bg-white text-gray-600 hover:border-purple/40 hover:bg-purple/5 cursor-pointer",
                isSelected &&
                  "border-purple bg-purple text-white cursor-pointer shadow-sm"
              )}
            >
              {/* Checkbox indicator */}
              <span
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center k-0",
                  isSelected
                    ? "bg-white border-white"
                    : isPast
                      ? "border-gray-300 bg-gray-100"
                      : "border-gray-300 bg-white"
                )}
              >
                {(isSelected || isPast) && (
                  <svg
                    className={cn(
                      "w-2.5 h-2.5",
                      isSelected ? "text-purple" : "text-gray-400"
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </span>
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { MonthGrid, buildRange, toIndex, fromIndex, isSame, MONTH_NAMES_SHORT };
