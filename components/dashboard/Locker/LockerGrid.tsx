"use client";

import type { Locker } from "@/types/locker";
import { LockerCard } from "./LockerCard";
import { LockerTable } from "./LockerTable";

interface LockerGridProps {
  lockers: Locker[];
  systemPrice: number;
  onLockerClick: (locker: Locker) => void;
  onAssignMember: (locker: Locker) => void;
  onCollectPayment: (locker: Locker) => void;
  onEditPrice: (locker: Locker) => void;
}

export const LockerGrid = ({
  lockers,
  systemPrice,
  onLockerClick,
  onAssignMember,
  onCollectPayment,
  onEditPrice,
}: LockerGridProps) => {
  return (
    <>
      {/* Desktop: Table */}
      <LockerTable
        lockers={lockers}
        systemPrice={systemPrice}
        onLockerClick={onLockerClick}
        onAssignMember={onAssignMember}
        onCollectPayment={onCollectPayment}
        onEditPrice={onEditPrice}
      />

      {/* Mobile: Cards */}
      <div className="lg:hidden grid grid-cols-2 sm:grid-cols-3 gap-3">
        {lockers.map((locker) => (
          <LockerCard
            key={locker.id}
            locker={locker}
            systemPrice={systemPrice}
            onClick={() => onLockerClick(locker)}
          />
        ))}
      </div>
    </>
  );
};
