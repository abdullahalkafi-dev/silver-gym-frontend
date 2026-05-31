"use client";

import type { Locker } from "@/types/locker";
import { LockerCard } from "./LockerCard";

interface LockerGridProps {
  lockers: Locker[];
  systemPrice: number;
  onLockerClick: (locker: Locker) => void;
}

export const LockerGrid = ({ lockers, systemPrice, onLockerClick }: LockerGridProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {lockers.map((locker) => (
        <LockerCard
          key={locker.id}
          locker={locker}
          systemPrice={systemPrice}
          onClick={() => onLockerClick(locker)}
        />
      ))}
    </div>
  );
};
