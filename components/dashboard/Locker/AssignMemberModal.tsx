"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useGetBranchMembersQuery } from "@/redux/features/member/memberApi";
import { useAssignMemberMutation, useGetLockerFeeQuery } from "@/redux/features/locker/lockerApi";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import type { Locker } from "@/types/locker";
import type { BackendMember } from "@/types/member";

interface AssignMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  locker: Locker | null;
}

export const AssignMemberModal = ({
  isOpen,
  onClose,
  branchId,
  locker,
}: AssignMemberModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<BackendMember | null>(
    null
  );
  const [months, setMonths] = useState(1);
  const [useSystemPrice, setUseSystemPrice] = useState(true);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState<string>("");

  const [assignMember, { isLoading }] = useAssignMemberMutation();

  const { data: lockerFee } = useGetLockerFeeQuery(
    { branchId },
    { skip: !branchId }
  );

  const systemPrice = lockerFee?.lockerFeeAmount || 0;
  const effectivePrice = locker?.isCustomPrice ? locker.customPrice : systemPrice;

  const { data: memberData, isLoading: membersLoading } =
    useGetBranchMembersQuery(
      {
        branchId: branchId || "",
        ...(searchQuery ? { searchTerm: searchQuery } : {}),
        page: 1,
        limit: 20,
      },
      { skip: !branchId || !isOpen }
    );

  const members = memberData?.data || [];

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedMember(null);
      setMonths(1);
      setUseSystemPrice(true);
      setCustomAmount("");
      setPaymentMethod("cash");
      setDiscount("");
    }
  }, [isOpen]);

  if (!isOpen || !locker) return null;

  const paymentAmount = useSystemPrice ? effectivePrice : (Number(customAmount) || 0);
  const totalDue = Math.max(0, paymentAmount * months - (Number(discount) || 0));
  const paidAmount = totalDue;

  const handleAssign = async () => {
    if (!selectedMember) {
      toast.error("Please select a member");
      return;
    }
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    try {
      await assignMember({
        branchId,
        lockerId: locker.id,
        payload: {
          memberId: selectedMember._id,
          months,
          paymentAmount,
          paymentMethod,
          discount: Number(discount) || 0,
        },
      }).unwrap();
      toast.success(
        `${selectedMember.fullName} assigned to Locker #${locker.lockerNumber}`
      );
      onClose();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to assign member");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          Assign Member to Locker #{locker.lockerNumber}
        </h2>

        {/* Member Search */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Search Member
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-primary w-full pl-10"
            />
            <HugeiconsIcon
              icon={Search01Icon}
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
          </div>
        </div>

        {/* Member List */}
        {!selectedMember && (
          <div className="mb-4 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
            {membersLoading ? (
              <div className="p-4 text-center text-sm text-text-secondary">
                Searching...
              </div>
            ) : members.length === 0 ? (
              <div className="p-4 text-center text-sm text-text-secondary">
                {searchQuery ? "No members found" : "Type to search members"}
              </div>
            ) : (
              members.map((member) => (
                <button
                  key={member._id}
                  onClick={() => setSelectedMember(member)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0">
                    {member.photo ? (
                      <Image
                        src={member.photo}
                        alt={member.fullName}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      member.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {member.fullName}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {member.memberId || member.contact || "N/A"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Selected Member */}
        {selectedMember && (
          <div className="mb-4 flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
                {selectedMember.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {selectedMember.fullName}
                </p>
                <p className="text-xs text-text-secondary">
                  {selectedMember.memberId || selectedMember.contact}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMember(null)}
              className="text-xs text-primary hover:underline"
            >
              Change
            </button>
          </div>
        )}

        {/* Months */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Months
          </label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="input-primary w-full"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                {m} {m === 1 ? "Month" : "Months"}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Amount */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Payment Amount
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={useSystemPrice}
                onChange={() => setUseSystemPrice(true)}
                className="text-primary"
              />
              <span className="text-sm text-text-primary">
                System Price (৳{effectivePrice})
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!useSystemPrice}
                onChange={() => setUseSystemPrice(false)}
                className="text-primary"
              />
              <span className="text-sm text-text-primary">Custom Amount</span>
            </label>
            {!useSystemPrice && (
              <input
                type="number"
                min={0}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="input-primary w-full"
                placeholder="Enter custom amount"
              />
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="input-primary w-full"
          >
            <option value="cash">Cash</option>
            <option value="bkash">Bkash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Discount */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Discount (৳)
          </label>
          <input
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="input-primary w-full"
            placeholder="0"
          />
        </div>

        {/* Summary */}
        <div className="mb-6 bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Amount/month</span>
            <span className="font-medium">৳{paymentAmount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Months</span>
            <span className="font-medium">×{months}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Subtotal</span>
            <span className="font-medium">৳{paymentAmount * months}</span>
          </div>
          {Number(discount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Discount</span>
              <span className="font-medium text-green-600">-৳{Number(discount)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
            <span>Total Amount</span>
            <span>৳{totalDue}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-primary">
            <span>Paid</span>
            <span>৳{paidAmount}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={isLoading || !selectedMember}
            className="btn-primary px-4 py-2 disabled:opacity-50"
          >
            {isLoading ? "Assigning..." : "Assign & Collect"}
          </button>
        </div>
      </div>
    </div>
  );
};
