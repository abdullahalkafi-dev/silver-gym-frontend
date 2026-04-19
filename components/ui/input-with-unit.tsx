"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface UnitOption {
  value: string;
  label: string;
}

interface InputWithUnitProps {
  value: string;
  onChange: (value: string) => void;
  unit: string;
  onUnitChange: (unit: string) => void;
  units: UnitOption[];
  placeholder?: string;
  className?: string;
  type?: string;
  min?: string;
  step?: string;
  error?: boolean;
}

function InputWithUnit({
  value,
  onChange,
  unit,
  onUnitChange,
  units,
  placeholder,
  className,
  type = "number",
  min = "0",
  step = "any",
  error,
}: InputWithUnitProps) {
  return (
    <div
      className={cn(
        "flex items-center border rounded-lg overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-purple h-[42px]",
        error
          ? "border-red-500 focus-within:ring-red-500 bg-red-50"
          : "border-gray-300",
        className
      )}
    >
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <div className="border-l border-gray-300 h-full flex items-center">
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
          className="h-full px-2 text-sm text-gray-600 bg-gray-50 outline-none cursor-pointer border-none appearance-none pr-5 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_4px_center]"
        >
          {units.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export { InputWithUnit };
export type { UnitOption, InputWithUnitProps };
