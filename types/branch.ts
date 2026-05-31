export const DEFAULT_AUTO_DEACTIVATE_AFTER_UNPAID_MONTHS = 6;

export interface Branch {
  id: string;
  businessId: string;
  branchName: string;
  branchAddress?: string;
  monthlyFeeAmount?: number | null;
  admissionFeeAmount?: number | null;
  autoDeactivateAfterUnpaidMonths?: number;
  startingBalance?: number | null;
  startingBalanceSetAt?: string | null;
  logo?: string | null;
  favicon?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBranchPayload {
  branchName: string;
  branchAddress?: string;
  monthlyFeeAmount?: number;
  admissionFeeAmount?: number;
}

export interface BranchMonthlyFee {
  branchId: string;
  branchName: string;
  monthlyFeeAmount: number | null;
}

export interface BranchAdmissionFee {
  branchId: string;
  branchName: string;
  admissionFeeAmount: number | null;
}

export interface BranchAutoDeactivationSettings {
  branchId: string;
  branchName: string;
  autoDeactivateAfterUnpaidMonths: number;
}

export interface BranchStartingBalance {
  branchId: string;
  branchName: string;
  startingBalance: number | null;
  startingBalanceSetAt: string | null;
}

export interface BranchLockerFee {
  branchId: string;
  branchName: string;
  lockerFeeAmount: number | null;
}
