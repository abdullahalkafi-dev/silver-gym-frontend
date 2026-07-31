// components/dashboard/Income/CategoryFilter.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import { useGetIncomeCategoriesQuery } from "@/redux/features/incomeCategory/incomeCategoryApi";

interface CategoryFilterProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

const DEFAULT_CATEGORIES = [
  { value: "package", label: "Package" },
  { value: "monthly", label: "Monthly" },
  { value: "admission", label: "Admission" },
  { value: "registration", label: "Registration" },
  { value: "locker", label: "Locker" },
  { value: "custom", label: "Custom Income" },
];

export default function CategoryFilter({
  selectedCategory,
  setSelectedCategory,
}: CategoryFilterProps) {
  const { activeBranchId } = useUser();

  const { data: customCategories = [] } = useGetIncomeCategoriesQuery(
    { branchId: activeBranchId! },
    { skip: !activeBranchId },
  );

  const selectedLabel =
    DEFAULT_CATEGORIES.find((c) => c.value === selectedCategory)?.label ||
    customCategories.find((c) => c._id === selectedCategory)?.title ||
    selectedCategory ||
    "Filter by Category";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-w-[100px] justify-between h-10 bg-gray-primary! hover:bg-gray-200! cursor-pointer">
          <HugeiconsIcon icon={FilterHorizontalIcon} size={24} />
          <span>{selectedLabel}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px] max-h-[300px] overflow-y-auto">
        <DropdownMenuItem
          onClick={() => setSelectedCategory("")}
          className="cursor-pointer font-medium"
        >
          All Categories
        </DropdownMenuItem>

        <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          System Types
        </div>
        {DEFAULT_CATEGORIES.map((cat) => (
          <DropdownMenuItem
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className="cursor-pointer text-xs"
          >
            {cat.label}
          </DropdownMenuItem>
        ))}

        {customCategories.length > 0 && (
          <>
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1 pt-1 border-t border-gray-100">
              Custom Categories
            </div>
            {customCategories.map((cat) => (
              <DropdownMenuItem
                key={cat._id}
                onClick={() => setSelectedCategory(cat._id)}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color || "#10B981" }}
                />
                <span>{cat.title}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
