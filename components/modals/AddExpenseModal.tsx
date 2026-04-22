// components/modals/AddExpenseModal.tsx
"use client";

import { useMemo, useState } from "react";
import Modal from "../ui/modal";
import { Input } from "../ui/input";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import {
  useGetCategoriesByBranchQuery,
  useCreateExpenseMutation,
} from "@/redux/features/expense/expenseApi";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddExpenseModal({
  isOpen,
  onClose,
}: AddExpenseModalProps) {
  const { activeBranchId } = useUser();

  const { data: categories = [] } = useGetCategoriesByBranchQuery(
    { branchId: activeBranchId! },
    { skip: !activeBranchId || !isOpen },
  );

  const [createExpense, { isLoading }] = useCreateExpenseMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<{
    id: string;
    name: string;
    category: string;
  } | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Flatten all subcategories from all categories
  const allSubcategories = useMemo(
    () =>
      categories.flatMap((cat) =>
        cat.subcategories.map((sub) => ({
          id: sub.id,
          name: sub.title,
          category: cat.title,
        })),
      ),
    [categories],
  );

  const filteredSubcategories = allSubcategories.filter((sub) =>
    sub.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSubcategorySelect = (sub: {
    id: string;
    name: string;
    category: string;
  }) => {
    setSelectedSubcategory(sub);
    setSearchQuery(sub.name);
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedSubcategory(null);
    setDescription("");
    setAmount("");
    setPaymentMethod("cash");
    onClose();
  };

  const handleSave = async () => {
    if (!selectedSubcategory) {
      toast.error("Please select a subcategory");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!activeBranchId) {
      toast.error("No active branch selected");
      return;
    }

    try {
      await createExpense({
        branchId: activeBranchId,
        payload: {
          subcategoryId: selectedSubcategory.id,
          description: description.trim() || undefined,
          amount: parseFloat(amount),
          paymentMethod,
        },
      }).unwrap();

      toast.success(
        `Expense of ${parseFloat(amount).toLocaleString()} TK saved successfully!`,
      );
      handleClose();
    } catch (err: unknown) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ??
        "Failed to save expense";
      toast.error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Daily Expense"
      className="max-w-2xl"
    >
      <div>
        {/* Search Subcategory */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Subcategory
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Type subcategory name"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedSubcategory(null);
              }}
              className="w-full"
            />

            {/* Subcategory Dropdown */}
            {searchQuery && !selectedSubcategory && filteredSubcategories.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredSubcategories.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => handleSubcategorySelect(sub)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 flex justify-between items-center"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {sub.name}
                    </span>
                    <span className="text-xs text-gray-500">{sub.category}</span>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && !selectedSubcategory && filteredSubcategories.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="px-4 py-3 text-sm text-gray-500">
                  No subcategories found
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            placeholder="Type about your expense as description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent resize-none"
          />
        </div>

        {/* Amount and Payment Method */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <Input
              type="number"
              placeholder="Ex: 550"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="relative">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-purple focus:border-transparent"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank</option>
                <option value="bkash">Bkash</option>
                <option value="due">Due</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2.5 bg-purple text-white rounded-lg text-sm font-medium hover:bg-purple/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              "Save Expense"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

