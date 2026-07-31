// components/dashboard/Income/AddIncomeModal.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AddIncomeMemberSearchModal from "./AddIncomeMemberSearchModal";
import CustomIncomeForm from "./CustomIncomeForm";
import { UserIcon, BanknoteIcon } from "lucide-react";

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddIncomeModal({
  isOpen,
  onClose,
}: AddIncomeModalProps) {
  const [activeTab, setActiveTab] = useState<"member" | "custom">("member");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-gray-100">
          <DialogTitle className="text-xl font-bold text-gray-900">
            Record Income
          </DialogTitle>
        </DialogHeader>

        {/* Modal Tab Controls */}
        <div className="flex p-1.5 bg-gray-100 rounded-xl my-3">
          <button
            type="button"
            onClick={() => setActiveTab("member")}
            className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "member"
                ? "bg-white text-purple shadow-sm font-bold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Member Income</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "custom"
                ? "bg-white text-emerald-700 shadow-sm font-bold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <BanknoteIcon className="w-4 h-4" />
            <span>Custom Income Entry</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div>
          {activeTab === "member" ? (
            <AddIncomeMemberSearchModal
              isOpen={true}
              onClose={onClose}
              isEmbedded={true}
            />
          ) : (
            <CustomIncomeForm
              onSuccess={onClose}
              onCancel={onClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
