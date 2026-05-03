"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  MonthGrid,
  type MonthYear,
} from "@/components/dashboard/Members/MonthGrid";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import type { PackageDurationType } from "@/types/package";
import {
  addMonths,
  addDays,
  endOfMonth,
  endOfWeek,
  isAfter,
  isSameDay,
} from "date-fns";
import { DayButton } from "react-day-picker";

// ─── Year Grid (for year duration type) ─────────────────────────────

interface YearGridProps {
  selectedYear: number | null;
  onSelect: (year: number) => void;
  minYear?: number;
  className?: string;
}

function YearGrid({ selectedYear, onSelect, minYear, className }: YearGridProps) {
  const currentYear = new Date().getFullYear();
  const effectiveMin = minYear || currentYear;
  const years = React.useMemo(() => {
    const arr: number[] = [];
    for (let y = effectiveMin; y <= effectiveMin + 5; y++) {
      arr.push(y);
    }
    return arr;
  }, [effectiveMin]);

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => onSelect(y)}
          className={cn(
            "px-3 py-3 rounded-lg text-sm font-medium border transition-all",
            y === selectedYear
              ? "border-purple bg-purple text-white shadow-sm"
              : "border-gray-200 bg-white text-gray-600 hover:border-purple/40 hover:bg-purple/5"
          )}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

// ─── Day/Week Calendar ──────────────────────────────────────────────

interface DayCalendarProps {
  selectedDates: Date[];
  onSelect: (dates: Date[]) => void;
  minDate?: Date;
  maxDate?: Date;
  /** For week mode: snap selection to 7-day ranges */
  weekMode?: boolean;
  /** Number of days/weeks to select (from package duration) */
  duration?: number;
  className?: string;
}

function MembershipCalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus();
    }
  }, [modifiers.focused]);

  const isRangeStart = Boolean(modifiers.rangeStart);
  const isRangeEnd = Boolean(modifiers.rangeEnd);
  const isRangeMiddle = Boolean(modifiers.inRange);
  const isBoundary = isRangeStart || isRangeEnd;
  const isSingleSelection =
    Boolean(modifiers.selected) && !isBoundary && !isRangeMiddle;
  const isOutside = Boolean(modifiers.outside);
  const isDisabled = Boolean(modifiers.disabled);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      className={cn(
        "flex size-auto h-(--cell-size) w-full min-w-0 items-center justify-center border border-transparent p-0 text-sm font-semibold leading-none shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-purple/30 focus-visible:ring-offset-0",
        !isOutside &&
          !isDisabled &&
          !isBoundary &&
          !isRangeMiddle &&
          !isSingleSelection &&
          "rounded-xl text-[#4D4958] hover:bg-[#F5F0FF]",
        isRangeMiddle &&
          "rounded-none border-transparent bg-[#F3ECFF] text-[#7B45F4] hover:bg-[#F3ECFF]",
        (isBoundary || isSingleSelection) &&
          "bg-purple text-white hover:bg-purple rounded-xl",
        isRangeStart && !isRangeEnd && "rounded-r-none",
        isRangeEnd && !isRangeStart && "rounded-l-none",
        isOutside && !isBoundary && !isRangeMiddle && "text-[#CAC7D2]",
        isDisabled && !isBoundary && !isRangeMiddle && "text-[#D6D3DE] opacity-100",
        className
      )}
      {...props}
    />
  );
}

function DayCalendar({
  selectedDates,
  onSelect,
  minDate,
  maxDate,
  weekMode = false,
  duration = 1,
  className,
}: DayCalendarProps) {
  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;

    const dates: Date[] = [];
    const totalDays = weekMode ? duration * 7 : duration;

    for (let i = 0; i < totalDays; i++) {
      dates.push(addDays(day, i));
    }

    onSelect(dates);
  };

  const rangeStart = selectedDates.length > 0 ? selectedDates[0] : undefined;
  const rangeEnd =
    selectedDates.length > 0
      ? selectedDates[selectedDates.length - 1]
      : undefined;
  const displayMonth = rangeStart || minDate || new Date();
  const lastVisibleDay = endOfWeek(endOfMonth(displayMonth), {
    weekStartsOn: 1,
  });
  const needsExtraWeekRow =
    selectedDates.length > 1 &&
    !!rangeEnd &&
    isAfter(rangeEnd, lastVisibleDay);

  return (
    <div className={cn("w-full", className)}>
      <Calendar
        mode="single"
        captionLayout="dropdown"
        showOutsideDays
        fixedWeeks={needsExtraWeekRow}
        weekStartsOn={1}
        selected={rangeStart}
        onSelect={handleDayClick}
        disabled={(date) => {
          if (minDate && date < minDate) return true;
          if (maxDate && date > maxDate) return true;
          return false;
        }}
        modifiers={{
          rangeStart: (date: Date) =>
            !!rangeStart && isSameDay(date, rangeStart),
          rangeEnd: (date: Date) =>
            !!rangeEnd && isSameDay(date, rangeEnd),
          inRange: (date: Date) =>
            selectedDates.some((selectedDate) =>
              isSameDay(selectedDate, date)
            ) &&
            !(rangeStart && isSameDay(date, rangeStart)) &&
            !(rangeEnd && isSameDay(date, rangeEnd)),
        }}
        defaultMonth={displayMonth}
        components={{
          DayButton: MembershipCalendarDayButton,
        }}
        className="w-full rounded-[28px] border border-[#ECE7F4] bg-white p-4 shadow-[0_6px_18px_rgba(17,24,39,0.04)] [--cell-size:2.5rem]"
        classNames={{
          root: "w-full",
          months: "block w-full",
          month: "w-full",
          month_grid: "w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-1.5",
          table: "w-full",
          weekdays: "flex w-full",
          weekday:
            "flex-1 h-9 px-0 text-center text-sm font-semibold text-[#8A8793]",
          week: "flex w-full mt-1.5",
          day: "relative h-(--cell-size) flex-1 p-0 text-center",
          today: "bg-transparent text-[#3E3A46] font-semibold",
          outside: "text-[#CBC8D2] aria-selected:text-[#CBC8D2]",
          disabled: "text-[#D6D3DE] opacity-100",
        }}
      />
      {selectedDates.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          {selectedDates.length} day{selectedDates.length > 1 ? "s" : ""}{" "}
          selected
        </p>
      )}
    </div>
  );
}

// ─── Main DurationCalendar ──────────────────────────────────────────

interface DurationCalendarProps {
  durationType: PackageDurationType;
  /** Package duration count (e.g. 3 months, 7 days, 2 weeks, 1 year) */
  durationCount: number;
  /** For month type: selected months */
  selectedMonths: MonthYear[];
  onMonthsChange: (months: MonthYear[]) => void;
  /** For day/week type: selected dates */
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  /** For year type: selected year */
  selectedYear: number | null;
  onYearChange: (year: number) => void;
  minMonth?: MonthYear;
  maxStartMonth?: MonthYear;
  minDate?: Date;
  maxDate?: Date;
  /** Whether the count is fixed (package mode) or free (monthly mode) */
  fixedCount?: boolean;
  /** Max months for free selection */
  maxMonths?: number;
  className?: string;
}

function DurationCalendar({
  durationType,
  durationCount,
  selectedMonths,
  onMonthsChange,
  selectedDates,
  onDatesChange,
  selectedYear,
  onYearChange,
  minMonth,
  maxStartMonth,
  minDate,
  maxDate,
  fixedCount = false,
  maxMonths = 0,
  className,
}: DurationCalendarProps) {
  const now = new Date();
  const currentMonth: MonthYear =
    minMonth || {
      month: now.getMonth(),
      year: now.getFullYear(),
    };
  const earliestDate = minDate || now;
  const latestDate = maxDate || endOfMonth(addMonths(earliestDate, 1));

  switch (durationType) {
    case "month":
      return (
        <MonthGrid
          selectedMonths={selectedMonths}
          onSelectionChange={onMonthsChange}
          minMonth={currentMonth}
          maxStartMonth={maxStartMonth}
          maxMonths={fixedCount ? durationCount : maxMonths}
          fixedCount={fixedCount}
          className={className}
        />
      );

    case "day":
      return (
        <DayCalendar
          selectedDates={selectedDates}
          onSelect={onDatesChange}
          minDate={earliestDate}
          maxDate={latestDate}
          duration={durationCount}
          className={className}
        />
      );

    case "week":
      return (
        <DayCalendar
          selectedDates={selectedDates}
          onSelect={onDatesChange}
          minDate={earliestDate}
          maxDate={latestDate}
          weekMode
          duration={durationCount}
          className={className}
        />
      );

    case "year":
      return (
        <DayCalendar
          selectedDates={selectedDates}
          onSelect={onDatesChange}
          minDate={earliestDate}
          maxDate={latestDate}
          duration={1}
          className={className}
        />
      );

    default:
      return (
        <MonthGrid
          selectedMonths={selectedMonths}
          onSelectionChange={onMonthsChange}
          minMonth={currentMonth}
          maxStartMonth={maxStartMonth}
          fixedCount={fixedCount}
          maxMonths={fixedCount ? durationCount : maxMonths}
          className={className}
        />
      );
  }
}

export { DurationCalendar, YearGrid, DayCalendar };
