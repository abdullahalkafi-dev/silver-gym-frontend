"use client";

import {
  useUnassignMemberMutation,
} from "@/redux/features/locker/lockerApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { Locker } from "@/types/locker";

interface LockerTableProps {
  lockers: Locker[];
  systemPrice: number;
  onLockerClick: (locker: Locker) => void;
  onAssignMember: (locker: Locker) => void;
  onCollectPayment: (locker: Locker) => void;
  onEditPrice: (locker: Locker) => void;
}

const statusConfig = {
  available: {
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
    label: "Available",
  },
  occupied: {
    bg: "bg-primary-100",
    text: "text-primary-700",
    dot: "bg-primary",
    label: "Occupied",
  },
  maintenance: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
    label: "Maintenance",
  },
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const LockerTable = ({
  lockers,
  systemPrice,
  onLockerClick,
  onAssignMember,
  onCollectPayment,
  onEditPrice,
}: LockerTableProps) => {
  const [unassignMember] = useUnassignMemberMutation();

  const handleUnassign = async (e: React.MouseEvent, locker: Locker) => {
    e.stopPropagation();
    try {
      await unassignMember({
        branchId: locker.branchId,
        lockerId: locker.id,
      }).unwrap();
      toast.success("Member unassigned from locker");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to unassign member");
    }
  };

  return (
    <div className="hidden lg:block overflow-x-auto rounded-xl bg-white border border-gray-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="font-semibold text-text-primary px-4 py-3">
              Locker #
            </TableHead>
            <TableHead className="font-semibold text-text-primary py-3">
              Price
            </TableHead>
            <TableHead className="font-semibold text-text-primary py-3">
              Member
            </TableHead>
            <TableHead className="font-semibold text-text-primary py-3">
              Member ID
            </TableHead>
            <TableHead className="font-semibold text-text-primary py-3">
              Next Billing
            </TableHead>
            <TableHead className="font-semibold text-text-primary py-3">
              Status
            </TableHead>
            <TableHead className="font-semibold text-text-primary py-3 text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lockers.map((locker) => {
            const config = statusConfig[locker.status];
            const price = locker.isCustomPrice
              ? locker.customPrice
              : systemPrice;

            return (
              <TableRow
                key={locker.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onLockerClick(locker)}
              >
                <TableCell className="px-4 py-3 font-bold text-text-primary">
                  #{locker.lockerNumber}
                </TableCell>
                <TableCell className="py-3 text-text-primary">
                  <span className="font-medium">৳{price}</span>
                  {locker.isCustomPrice && (
                    <span className="text-xs text-text-secondary ml-1">
                      (custom)
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-3 text-text-primary">
                  {locker.assignedMemberName || (
                    <span className="text-text-secondary">{"\u2014"}</span>
                  )}
                </TableCell>
                <TableCell className="py-3 text-text-primary">
                  {locker.assignedMemberCode || (
                    <span className="text-text-secondary">{"\u2014"}</span>
                  )}
                </TableCell>
                <TableCell className="py-3 text-text-primary">
                  {formatDate(locker.nextBillingDate)}
                </TableCell>
                <TableCell className="py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
                    />
                    {config.label}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {locker.status === "available" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssignMember(locker);
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-primary bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
                      >
                        Assign
                      </button>
                    )}
                    {locker.status === "occupied" && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCollectPayment(locker);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
                        >
                          Pay
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPrice(locker);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-text-primary bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleUnassign(e, locker)}
                          className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                        >
                          Unassign
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
