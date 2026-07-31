// components/dashboard/Income/CustomIncomeForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { useUser } from "@/hooks/useUser";
import { useGetIncomeCategoriesQuery } from "@/redux/features/incomeCategory/incomeCategoryApi";
import { useCreateCustomIncomeMutation } from "@/redux/features/payment/paymentApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

interface CustomIncomeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CustomIncomeForm({
  onSuccess,
  onCancel,
}: CustomIncomeFormProps) {
  const { activeBranchId } = useUser();

  const { data: categories = [], isLoading: isLoadingCategories } =
    useGetIncomeCategoriesQuery(
      { branchId: activeBranchId! },
      { skip: !activeBranchId },
    );

  const [createCustomIncome, { isLoading: isSubmitting }] =
    useCreateCustomIncomeMutation();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [note, setNote] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBranchId) {
      toast.error("Please select an active branch first");
      return;
    }

    if (!selectedCategoryId) {
      toast.error("Please select an income category");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select an entry date");
      return;
    }

    const targetCategory = categories.find((c) => c._id === selectedCategoryId);
    const categoryTitle = targetCategory?.title || "Custom Income";

    try {
      await createCustomIncome({
        branchId: activeBranchId,
        payload: {
          categoryId: selectedCategoryId,
          categoryTitle,
          amount: numAmount,
          paymentMethod,
          paymentDate: selectedDate.toISOString(),
          note: note.trim() || undefined,
        },
      }).unwrap();

      toast.success(`Custom income of ${numAmount.toFixed(2)} TK recorded successfully!`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to record custom income");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {/* Category Dropdown */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Income Category <span className="text-red-500">*</span>
        </label>
        {isLoadingCategories ? (
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        ) : categories.length === 0 ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            No custom income categories found. Please add custom categories in{" "}
            <span className="font-semibold">Accounts &gt; Income Category</span>.
          </div>
        ) : (
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            required
            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Entry Date & Amount Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Entry Date */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Entry Date <span className="text-red-500">*</span>
          </label>
          <DatePickerPopover
            value={selectedDate}
            onChange={setSelectedDate}
            maxDate={new Date()}
            formatStr="yyyy-MM-dd"
            placeholder="Select entry date"
          />
          <span className="text-[10px] text-gray-400 mt-1 block">
            Default is Today. Future dates are blocked.
          </span>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Amount (TK) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full h-10 px-3 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-semibold">
              TK
            </span>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Payment Method <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.value}
              type="button"
              onClick={() => setPaymentMethod(pm.value)}
              className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer text-center ${
                paymentMethod === pm.value
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {pm.label}
            </button>
          ))}
        </div>
      </div>

      {/* Note / Description */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Note / Description (Optional)
        </label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason or context for this custom income (e.g. Owner capital investment)..."
          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || categories.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer min-w-[120px]"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </div>
          ) : (
            <span>Save Custom Income</span>
          )}
        </Button>
      </div>
    </form>
  );
}
