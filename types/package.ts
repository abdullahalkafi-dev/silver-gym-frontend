export type PackageDurationType = "day" | "week" | "month" | "year" | "custom";

export interface GymPackage {
  id: string;
  branchId: string;
  title: string;
  duration: number;
  durationType: PackageDurationType;
  description?: string;
  color: string;
  amount: number;
  includeAdmissionFee: boolean;
  admissionFeeAmount: number | null;
  isActive: boolean;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageFormPayload {
  title: string;
  duration: number;
  durationType: PackageDurationType;
  description?: string;
  color: string;
  amount: number;
  includeAdmissionFee?: boolean;
}

export interface PackageQueryArgs {
  branchId: string;
  isActive?: boolean;
  searchTerm?: string;
}

export interface PackageListMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPage?: number;
  [key: string]: unknown;
}

export interface PackageListResponse {
  data: GymPackage[];
  meta?: PackageListMeta;
}