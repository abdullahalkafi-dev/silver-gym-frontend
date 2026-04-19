"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerPopoverProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  error?: boolean;
  disabled?: boolean;
  formatStr?: string;
}

function DatePickerPopover({
  value,
  onChange,
  placeholder = "Pick a date",
  minDate,
  maxDate,
  className,
  error,
  disabled,
  formatStr = "MM/dd/yyyy",
}: DatePickerPopoverProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10.5 w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2",
            error
              ? "border-red-500 focus:ring-red-500 bg-red-50"
              : "border-gray-300 focus:ring-purple",
            !value && "text-gray-400",
            value && "text-gray-900",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <span className="truncate">
            {value ? format(value, formatStr) : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          defaultMonth={value || minDate || new Date()}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePickerPopover };
