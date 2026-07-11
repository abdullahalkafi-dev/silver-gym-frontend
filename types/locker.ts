export type LockerStatus = "available" | "occupied" | "maintenance";

export interface Locker {
  id: string;
  branchId: string;
  lockerNumber: number;
  status: LockerStatus;
  isCustomPrice: boolean;
  customPrice: number;
  assignedMemberId: string | null;
  assignedMemberName: string | null;
  assignedMemberCode: string | null;
  assignedAt: string | null;
  nextBillingDate: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LockerStats {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
}

export interface LockerPayment {
  _id: string;
  id: string;
  branchId: string;
  invoiceNo: string;
  memberId: string;
  memberName: string;
  paymentType: string;
  periodStart: string;
  periodEnd: string;
  paidMonths: number;
  subTotal: number;
  discount: number;
  billAmount: number;
  dueAmount: number;
  paidTotal: number;
  exchange: number;
  paymentMethod: string;
  paymentDate: string;
  nextPaymentDate: string;
  status: string;
  source: string;
  metadata: {
    lockerId: string;
    lockerNumber: number;
    isCustomPrice: boolean;
    months: number;
    note?: string;
  };
}

export interface CreateLockersPayload {
  count: number;
}

export interface SetPricePayload {
  price: number;
}

export interface AssignMemberPayload {
  memberId: string;
  months: number;
  paymentAmount: number;
  paymentMethod: string;
  discount: number;
  paidAmount: number;
  note?: string;
}

export interface CollectPaymentPayload {
  months: number;
  paymentAmount?: number;
  paymentMethod: string;
  discount: number;
  paidAmount: number;
  note?: string;
}
