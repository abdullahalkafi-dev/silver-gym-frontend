"use client";

import type { Locker } from "@/types/locker";

interface LockerCardProps {
  locker: Locker;
  systemPrice: number;
  onClick: () => void;
}

const statusConfig = {
  available: {
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "bg-green-500",
    label: "Available",
    labelColor: "text-green-700",
  },
  occupied: {
    bg: "bg-primary-50",
    border: "border-primary-200",
    dot: "bg-primary",
    label: "Occupied",
    labelColor: "text-primary-700",
  },
  maintenance: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    dot: "bg-yellow-500",
    label: "Maintenance",
    labelColor: "text-yellow-700",
  },
};

export const LockerCard = ({ locker, systemPrice, onClick }: LockerCardProps) => {
  const config = statusConfig[locker.status];

  return (
    <button
      onClick={onClick}
      className={`${config.bg} ${config.border} border rounded-xl p-4 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold text-text-primary">
          #{locker.lockerNumber}
        </span>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${config.labelColor}`}>
          <span className={`w-2 h-2 rounded-full ${config.dot}`} />
          {config.label}
        </span>
      </div>

      <p className="text-sm font-semibold text-text-primary">
        ৳{locker.isCustomPrice ? locker.customPrice : systemPrice}
        {locker.isCustomPrice && (
          <span className="text-xs text-text-secondary font-normal ml-1">(custom)</span>
        )}
      </p>

      {locker.assignedMemberName && (
        <p className="text-xs text-text-secondary mt-1 truncate">
          {locker.assignedMemberName}
        </p>
      )}
    </button>
  );
};
