export interface Branch {
  id: string;
  businessId: string;
  branchName: string;
  branchAddress?: string;
  monthlyFeeAmount?: number | null;
  admissionFeeAmount?: number | null;
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
