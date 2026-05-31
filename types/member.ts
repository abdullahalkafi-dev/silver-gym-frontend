// types/member.ts

export type MemberStatus = "Active" | "Inactive";
export type PaymentStatus = "Complete" | "Due";
export type SMSDeliveryMethod = "email" | "phone" | "both";
export type MemberListStatusFilter = "all" | "active" | "inactive";
export type MemberListPaymentFilter = "all" | "due" | "complete";
export type MemberPaymentQueryStatus = Exclude<MemberListPaymentFilter, "all">;
export type MemberListBillingFilter = "all" | "custom" | "system";
export type MemberBillingQueryPlan = Exclude<MemberListBillingFilter, "all">;

// ─── Backend-aligned types ──────────────────────────────────────────

export type TrainingGoal =
  | "Yoga"
  | "Cardio Endurance"
  | "Bodybuilding"
  | "Muscle Gain"
  | "Flexibility & Mobility"
  | "General Fitness"
  | "Strength Training";

export type PaymentMethod =
  | "cash"
  | "card"
  | "bkash"
  | "nagad"
  | "rocket"
  | "bank_transfer"
  | "other";

export type BackendPaymentStatus =
  | "pending"
  | "paid"
  | "partial"
  | "due"
  | "cancelled"
  | "refunded";

export type BackendPaymentType =
  | "package"
  | "monthly"
  | "admission"
  | "registration"
  | "locker"
  | "other";

export type CollectBillMode = "due_only" | "monthly" | "package";

export type CollectBillDueItemType =
  | "admission_due"
  | "monthly_due"
  | "monthly_cycle_due"
  | "package_due"
  | "carry_forward";

export interface CollectBillDueItem {
  ledgerItemId: string;
  type: CollectBillDueItemType;
  label: string;
  originalAmount: number;
  remainingAmount: number;
  dueDate?: string;
  periodStart?: string;
  periodEnd?: string;
  packageId?: string;
}

export interface CollectBillSelectedDueItem {
  ledgerItemId: string;
  amount: number;
}

export interface BackendPaymentRecord {
  _id: string;
  branchId: string;
  invoiceNo?: string;
  memberId?: string;
  memberName?: string;
  packageId?: string;
  packageName?: string;
  packageDuration?: number;
  packageDurationType?: string;
  paymentType?: BackendPaymentType;
  periodStart?: string;
  periodEnd?: string;
  paidMonths?: number;
  year?: number;
  subTotal?: number;
  discount?: number;
  billAmount?: number;
  dueAmount?: number;
  paidTotal?: number;
  admissionFee?: number;
  exchange?: number;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  nextPaymentDate?: string;
  status?: BackendPaymentStatus;
  source?: string;
  importBatchId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemberPaymentHistoryArgs {
  branchId: string;
  memberId: string;
  limit?: number;
}

export interface CollectBillContext {
  member: BackendMember;
  billing: {
    currentDueAmount: number;
    overdueMonths: number;
    accruedAmount: number;
    monthlyFeeAmount?: number;
    branchMonthlyFeeAmount?: number;
    nextPaymentDate?: string;
    requiredStartDate?: string;
    recommendedStartDate?: string;
    monthlyStartDate?: string;
    transitionToMonthly?: {
      packageExpiryDate?: string;
      suggestedDiscountAmount: number;
      coveredDaysInAnchorMonth: number;
      daysInAnchorMonth: number;
    };
    isActive: boolean;
    dueBreakdown: CollectBillDueItem[];
  };
}

export interface CollectBillPayload {
  memberId: string;
  collectionMode: CollectBillMode;
  duePaymentAmount?: number;
  selectedDueItems?: CollectBillSelectedDueItem[];
  paidTotal: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  discount?: number;
  startDate?: string;
  paidMonths?: number;
  packageId?: string;
  note?: string;
  useCustomMonthlyFee?: boolean;
  customMonthlyFeeAmount?: number;
}

export interface CollectBillResult {
  member: BackendMember;
  payment: BackendPaymentRecord;
  billing: {
    currentDueAmount: number;
    nextPaymentDate?: string;
    monthlyFeeAmount?: number;
    overdueMonths: number;
    effectiveDuePaymentAmount: number;
    waivedDueAmount: number;
    waivedDueItemCount: number;
    waivedDueLabels: string[];
    discountedCycleAmount: number;
    paidDueAmount: number;
    paidDueItemCount: number;
  };
}

export interface BackendMember {
  _id: string;
  branchId: string;
  systemMemberId?: number;
  memberId?: string;
  barcode?: string;
  fullName: string;
  contact?: string;
  email?: string;
  dateOfBirth?: string;
  country?: string;
  nid?: string;
  gender?: string;
  bloodGroup?: string;
  height?: number;
  heightUnit?: "cm" | "in" | "ft";
  weight?: number;
  weightUnit?: "kg" | "lb";
  address?: string;
  photo?: string;
  emergencyContact?: { relationship: string; contactNumber: string };
  trainingGoals?: TrainingGoal[];
  currentPackageId?: string;
  currentPackageName?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  nextPaymentDate?: string;
  isActive?: boolean;
  isCustomMonthlyFee?: boolean;
  customMonthlyFeeAmount?: number;
  paidMonths?: number;
  currentDueAmount?: number;
  source?: string;
  importBatchId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMemberPaymentPayload {
  paymentMethod: PaymentMethod;
  paidTotal: number;
  discount?: number;
  admissionFee?: number;
  paymentDate?: string;
  status?: BackendPaymentStatus;
}

export interface CreateMemberPayload {
  memberId?: string;
  fullName: string;
  contact?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  nid?: string;
  address?: string;
  country?: string;
  bloodGroup?: string;
  height?: number;
  heightUnit?: "cm" | "in" | "ft";
  weight?: number;
  weightUnit?: "kg" | "lb";
  emergencyContact?: { relationship: string; contactNumber: string };
  trainingGoals?: TrainingGoal[];
  currentPackageId?: string;
  membershipStartDate?: string;
  isCustomMonthlyFee?: boolean;
  customMonthlyFeeAmount?: number;
  paidMonths?: number;
  payment: CreateMemberPaymentPayload;
}

export interface MemberQueryArgs {
  branchId: string;
  searchTerm?: string;
  isActive?: "true" | "false";
  includeInactive?: "true";
  paymentStatus?: MemberPaymentQueryStatus;
  billingPlan?: MemberBillingQueryPlan;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface MemberListMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPage?: number;
}

export interface MemberListResponse {
  data: BackendMember[];
  meta?: MemberListMeta;
}

export interface DashboardMemberSummary {
  members: {
    windowDays: number;
    members: {
      totalMembers: number;
      activeMembers: number;
      inactiveMembers: number;
      importDraftMembers: number;
      newMembersInWindow: number;
    };
    billing: {
      paymentDueNow: number;
      paymentDueSoon: number;
    };
  };
  imports: {
    totalBatches: number;
    successRate: number;
  };
}

export interface ImportBatch {
  _id: string;
  branchId: string;
  source: "google_sheet" | "csv_upload";
  fileName?: string;
  status: "pending" | "processing" | "completed" | "partial_failed" | "failed" | "cancelled";
  errorMessage?: string;
  totalRows?: number;
  processedRows?: number;
  successRows?: number;
  failedRows?: number;
  warningRows?: number;
  failuresPreview?: { rowIndex: number; reason: string; memberName?: string }[];
  failedRowsData?: {
    rowIndex: number;
    reason: string;
    memberName?: string;
    raw?: Record<string, unknown>;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

// ─── Legacy types (used by existing UI, kept for compat) ────────────

export interface MemberProfile {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  dateOfBirth?: string;
  nid?: string;
  address?: string;
  gender?: "Male" | "Female" | "Other";
  height?: string;
  weight?: string;
  age?: string;
  profileImage?: string;
  avatar?: string;
  status: MemberStatus;
  trainingGoals?: string[];
  joinDate?: string;
  membershipExpiry?: string;
  assignDate?: string;
  serialNo?: string;
  roleTitle?: string;
  permissionList?: string;
  role?: string;
}

export interface Member {
  id: string;
  memberId: string;
  name: string;
  email: string;
  phone: string;
  profileImage?: string;
  avatar?: string;
  status: MemberStatus;
  dueDate: string | null;
  payment: PaymentStatus;
  assignDate: string;
  serialNo: string;
  roleTitle: string;
  permissionList: string;
  role: string;
  emergencyContact?: string;
  address?: string;
  birthday?: string;
  gender?: string;
  nid?: string;
  height?: string;
  age?: string;
  weight?: string;
  trainingGoals?: string[];
}

export interface MemberStats {
  totalMembers: number;
  totalMembersUnit: string;
  totalMembersDescription: string;
  newAdmission: number;
  newAdmissionUnit: string;
  newAdmissionDescription: string;
  newAdmissionBadge: string;
  activeMembers: number;
  activeMembersUnit: string;
  activeMembersDescription: string;
}

export interface SMSTemplate {
  id: string;
  title: string;
  message: string;
  type: "reminder" | "renewal" | "greeting";
}

export interface SMSSchedule {
  date: Date;
  time: string;
}

export interface PaymentRecord {
  id: string;
  dateTime: string;
  invoiceNo: string;
  memberId: string;
  month: string;
  package: string;
  amount: string;
  status: string;
  exchange?: number;
  isImportedOpeningBalance?: boolean;
}

export interface MemberActivity {
  date: Date;
  hasActivity: boolean;
  type?: "workout" | "payment" | "attendance";
  description?: string;
}

export interface CustomFormField {
  id: string;
  label: string;
  type: "text" | "email" | "number" | "date" | "select" | "checkbox";
  required: boolean;
  options?: string[];
}