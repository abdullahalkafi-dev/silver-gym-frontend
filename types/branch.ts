export interface Branch {
  id: string;
  businessId: string;
  branchName: string;
  branchAddress?: string;
  monthlyFeeAmount?: number | null;
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
}
