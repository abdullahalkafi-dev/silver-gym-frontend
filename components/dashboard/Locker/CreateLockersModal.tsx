"use client";

import { useState } from "react";
import { useCreateLockersMutation } from "@/redux/features/locker/lockerApi";
import { toast } from "sonner";

interface CreateLockersModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
}

export const CreateLockersModal = ({
  isOpen,
  onClose,
  branchId,
}: CreateLockersModalProps) => {
  const [count, setCount] = useState<number>(50);
  const [createLockers, { isLoading }] = useCreateLockersMutation();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!count || count < 1) {
      toast.error("Please enter a valid number of lockers");
      return;
    }

    try {
      await createLockers({ branchId, payload: { count } }).unwrap();
      toast.success(`${count} locker(s) created successfully`);
      setCount(50);
      onClose();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to create lockers");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          Create Lockers
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Number of Lockers
          </label>
          <input
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="input-primary w-full"
            placeholder="e.g., 50"
          />
          <p className="text-xs text-text-secondary mt-2">
            This will create {count} lockers numbered sequentially from the next
            available number.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-primary px-4 py-2 disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Lockers"}
          </button>
        </div>
      </div>
    </div>
  );
};
