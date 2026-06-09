"use client";

import { useState, useEffect } from "react";
import {
  useSetBranchLockerPriceMutation,
  useSetCustomLockerPriceMutation,
  useResetToSystemPriceMutation,
} from "@/redux/features/locker/lockerApi";
import { toast } from "sonner";
import type { Locker } from "@/types/locker";

interface LockerPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  locker?: Locker | null;
  systemPrice: number;
}

export const LockerPricingModal = ({
  isOpen,
  onClose,
  branchId,
  locker,
  systemPrice,
}: LockerPricingModalProps) => {
  const [price, setPrice] = useState<number>(systemPrice || 200);
  const isCustomMode = !!locker;

  const [setBranchPrice, { isLoading: isSettingBranch }] =
    useSetBranchLockerPriceMutation();
  const [setCustomPrice, { isLoading: isSettingCustom }] =
    useSetCustomLockerPriceMutation();
  const [resetPrice, { isLoading: isResetting }] =
    useResetToSystemPriceMutation();

  useEffect(() => {
    if (locker) {
      setPrice(locker.isCustomPrice ? locker.customPrice : systemPrice || 200);
    } else {
      setPrice(systemPrice || 200);
    }
  }, [locker, isOpen, systemPrice]);

  if (!isOpen) return null;

  const isLoading = isSettingBranch || isSettingCustom || isResetting;

  const handleSubmit = async () => {
    if (!branchId) {
      toast.error("No branch selected. Please select a branch first.");
      return;
    }
    if (!price || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      if (isCustomMode && locker) {
        await setCustomPrice({
          branchId,
          lockerId: locker.id,
          payload: { price },
        }).unwrap();
        toast.success(`Custom price set for Locker #${locker.lockerNumber}`);
      } else {
        await setBranchPrice({
          branchId,
          payload: { price },
        }).unwrap();
        toast.success("Default locker price updated");
      }
      onClose();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to update price");
    }
  };

  const handleResetToSystem = async () => {
    if (!locker) return;
    try {
      await resetPrice({
        branchId,
        lockerId: locker.id,
      }).unwrap();
      toast.success("Locker reset to system price");
      onClose();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to reset price");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          {isCustomMode
            ? `Set Price for Locker #${locker?.lockerNumber}`
            : "Set Default Locker Price"}
        </h2>

        {isCustomMode && locker && !locker.isCustomPrice && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700">
              Currently using system price. Setting a custom price will override
              it for this locker.
            </p>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            {isCustomMode ? "Custom Price (৳)" : "Default Price (৳)"}
          </label>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="input-primary w-full"
            placeholder="e.g., 200"
          />
        </div>

        <div className="flex items-center justify-between">
          {isCustomMode && locker?.isCustomPrice && (
            <button
              onClick={handleResetToSystem}
              disabled={isLoading}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              Reset to System Price
            </button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onClose} className="btn-secondary px-4 py-2">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="btn-primary px-4 py-2 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Price"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
