export type SmsAudience = "selected" | "due";
export type SmsSendMode = "manual" | "auto";
export type SmsHistoryStatus = "simulated" | "sent" | "blocked" | "failed";
export type SmsDeliveryMode = "nonMasking" | "masking";
export type SmsTemplateCategory = "due" | "occasion" | "promotion" | "custom";
export type SmsDueDuration = "thisMonth" | "last2Months" | "last3Months" | "allDue";
export type SmsMessageType = "text" | "unicode";
export type SmsMessageTypeSummary = SmsMessageType | "mixed";
export type SmsBalanceBucket = "nonMasking" | "masking";
export type SmsMemberStatusFilter = "active" | "inactive" | "all";

export interface BranchSmsSettings {
  autoSendEnabled: boolean;
  reminderDayOfMonth: number;
  template: string;
  templateBangla: string;
  occasionTemplate: string;
  occasionTemplateBangla: string;
  promotionTemplate: string;
  promotionTemplateBangla: string;
  defaultDeliveryMode: SmsDeliveryMode;
  maskingSender?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  lastAutoReminderRunDate?: string | null;
}

export interface BranchSmsSettingsSnapshot {
  branchId: string;
  branchName: string;
  smsSettings: BranchSmsSettings;
}

export interface SmsBalance {
  nonMaskingBalance: number;
  maskingBalance: number | null;
  fetchedAt: string;
  dryRun: boolean;
}

export interface SmsRecipientPreview {
  memberId: string;
  memberName: string;
  memberIdentifier?: string;
  recipientPhone: string | null;
  dueMonthLabel: string;
  overdueMonths: number;
  monthlyDueAmount: number;
  totalDueAmount: number;
  renderedMessage: string;
  messageType: SmsMessageType;
  units: number;
  status: "ready" | "blocked";
  reason?: string;
}

export interface SmsPreviewSummary {
  totalRecipients: number;
  readyRecipients: number;
  blockedRecipients: number;
  requiredUnits: number;
  availableBalance: number;
  remainingBalance: number;
  canSend: boolean;
  insufficientBalance: boolean;
  deliveryMode: SmsDeliveryMode;
  balanceBucket: SmsBalanceBucket;
  messageType: SmsMessageTypeSummary;
  textRecipients: number;
  unicodeRecipients: number;
  messagesOverSingleSmsLimit: number;
  singleSmsCharacterLimit: number;
}

export interface SmsDueDurationCounts {
  thisMonth: number;
  last2Months: number;
  last3Months: number;
  allDue: number;
}

export interface SmsPreviewResponse {
  branchId: string;
  branchName: string;
  targetDate: string;
  template: string;
  templateCategory: SmsTemplateCategory;
  deliveryMode: SmsDeliveryMode;
  dueDuration?: SmsDueDuration;
  dueDurationCounts?: SmsDueDurationCounts;
  balance: SmsBalance;
  summary: SmsPreviewSummary;
  recipients: SmsRecipientPreview[];
}

export interface DueSmsRecipientsResponse extends SmsPreviewResponse {
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface SmsHistoryRecord {
  id: string;
  requestId: string;
  branchId: string;
  memberId?: string | null;
  memberName: string;
  recipientPhone?: string | null;
  template: string;
  templateCategory: SmsTemplateCategory;
  renderedMessage: string;
  audience: SmsAudience;
  sendMode: SmsSendMode;
  deliveryMode: SmsDeliveryMode;
  messageType: SmsMessageType;
  balanceBucket?: SmsBalanceBucket;
  status: SmsHistoryStatus;
  reason?: string;
  units: number;
  dueMonthLabel?: string;
  overdueMonths?: number;
  monthlyDueAmount?: number;
  totalDueAmount?: number;
  requestedByUserId?: string | null;
  requestedByStaffId?: string | null;
  targetDate?: string;
  provider: "fastsmsbd";
  availableBalance?: number | null;
  remainingBalance?: number | null;
  providerReference?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmsHistoryListResponse {
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  data: SmsHistoryRecord[];
}

export interface PreviewSmsPayload {
  audience?: SmsAudience;
  memberIds?: string[];
  template?: string;
  templateCategory?: SmsTemplateCategory;
  deliveryMode?: SmsDeliveryMode;
  dueDuration?: SmsDueDuration;
  targetDate?: string;
}

export interface SendSmsResponse extends SmsPreviewResponse {
  requestId: string;
  status: string;
  message: string;
}
