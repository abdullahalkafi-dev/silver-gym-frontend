import type { PermissionKey } from "@/types/permissions";

export type BranchFeeFieldKey = "monthly" | "admission";

export type BranchFeeAccessState = {
  label: string;
  isConfigured: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canManage: boolean;
};

export const BRANCH_FEE_PERMISSION_KEYS: Record<
  BranchFeeFieldKey,
  { label: string }
> = {
  monthly: {
    label: "Monthly fee",
  },
  admission: {
    label: "Admission fee",
  },
};

export const ACCOUNTS_ACCESS_PERMISSIONS: PermissionKey[] = [];

export const parseBranchFeeInput = (value: string, label: string) => {
  if (value.trim() === "") {
    throw new Error(`${label} is required`);
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`${label} must be a valid non-negative number`);
  }

  return parsedValue;
};

export const toBranchFeeDisplayValue = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

export const getBranchFeeAccessState = (
  field: BranchFeeFieldKey,
  currentValue: number | null | undefined,
  options: {
    isOwner: boolean;
  },
): BranchFeeAccessState => {
  const meta = BRANCH_FEE_PERMISSION_KEYS[field];
  const isConfigured = typeof currentValue === "number";

  return {
    label: meta.label,
    isConfigured,
    canAdd: true,
    canEdit: true,
    canManage: true,
  };
};

export const getMissingBranchFeeItems = (fees: {
  monthlyFeeAmount: number | null | undefined;
  admissionFeeAmount: number | null | undefined;
}) => {
  const items: string[] = [];

  if (fees.monthlyFeeAmount === null || fees.monthlyFeeAmount === undefined) {
    items.push(BRANCH_FEE_PERMISSION_KEYS.monthly.label);
  }

  if (fees.admissionFeeAmount === null || fees.admissionFeeAmount === undefined) {
    items.push(BRANCH_FEE_PERMISSION_KEYS.admission.label);
  }

  return items;
};
