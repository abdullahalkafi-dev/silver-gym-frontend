export type SmsTemplateKey =
  | "dueReminder"
  | "holiday"
  | "birthday"
  | "paymentConfirmation"
  | "membershipExpired"
  | "welcome";

export type SmsMessageKind = SmsTemplateKey | "custom";

export type SmsAutoToggleKey = Exclude<SmsTemplateKey, "holiday">;

export type SmsDueDuration = "thisMonth" | "last2Months" | "last3Months" | "allDue";

export type SmsAudience = "due" | "selected" | "active" | "inactive" | "all";

export type SmsHistoryStatus = "simulated" | "sent" | "blocked" | "failed" | "skipped";

/** masking = brand name (costs more); nonMasking = the approved number (cheaper). */
export type SmsSenderType = "masking" | "nonMasking";

export interface SmsSenderInfo {
  type: SmsSenderType;
  /** What the member sees as the sender. */
  id: string;
  label: string;
  /** Taka per SMS. */
  pricePerSms: number;
}

export interface SmsBalance {
  /** Provider balance in taka (the field name is historical). */
  maskingBalance: number | null;
  nonMaskingBalance: number;
  fetchedAt: string;
  dryRun: boolean;
  senderType?: SmsSenderType;
  senderName?: string;
  pricePerSms?: number;
  /** One-part messages the balance covers at this branch's price. */
  messagesLeft?: number;
}

export interface SmsSettings {
  enabled: boolean;
  senderType: SmsSenderType;
  reminderDayOfMonth: number;
  reminderHour: number;
  birthdayHour: number;
  toggles: Record<SmsAutoToggleKey, boolean>;
  lastAutoReminderRunDate?: string | null;
  lastBirthdayRunDate?: string | null;
  updatedAt?: string | null;
}

export interface SmsTemplateInfo {
  key: SmsTemplateKey;
  label: string;
  text: string;
  example: string;
  units: number;
  /** Most credits one message of this kind may ever cost (longer ones are skipped, never sent). */
  maxCredits?: number;
  placeholders: string[];
  whenSent: string;
  whoReceives: string;
  automatic: boolean;
  enabled: boolean | null;
}

export interface SmsSettingsSnapshot {
  branchId: string;
  branchName: string;
  smsSettings: SmsSettings;
  /** The sender this branch uses now. */
  sender: SmsSenderInfo;
  /** Both fixed sender IDs of the app, for the masking switch. */
  senders: { masking: SmsSenderInfo; nonMasking: SmsSenderInfo };
  templates: SmsTemplateInfo[];
  dryRun: boolean;
}

export type UpdateSmsSettingsPayload = Partial<{
  enabled: boolean;
  senderType: SmsSenderType;
  reminderDayOfMonth: number;
  reminderHour: number;
  birthdayHour: number;
  toggles: Partial<Record<SmsAutoToggleKey, boolean>>;
}>;

export interface SmsDueDurationCounts {
  thisMonth: number;
  last2Months: number;
  last3Months: number;
  allDue: number;
}

export interface SmsDueOverview {
  dueDurationCounts: SmsDueDurationCounts;
  total: number;
  members: Array<{
    memberId: string;
    memberName: string;
    memberIdentifier?: string;
    phone: string | null;
    dueMonthLabel?: string;
    overdueMonths?: number;
    totalDueAmount?: number;
  }>;
}

export interface SendSmsPayload {
  kind: "dueReminder" | "holiday" | "custom";
  audience?: "selected" | "active" | "inactive" | "all";
  memberIds?: string[];
  dueDuration?: SmsDueDuration;
  targetDate?: string;
  message?: string;
  holidayId?: string;
}

export interface SmsRecipientView {
  memberId: string;
  memberName: string;
  memberIdentifier?: string;
  phone: string | null;
  message: string;
  units: number;
  status: "ready" | "skipped";
  reason?: string;
}

export interface SmsPreviewSummary {
  totalRecipients: number;
  readyRecipients: number;
  skippedRecipients: number;
  requiredUnits: number;
  /** Taka this send will cost at the branch's sender price. */
  requiredCost: number;
  pricePerSms: number;
  senderType: SmsSenderType;
  senderName: string;
  /** Taka. */
  availableBalance: number;
  /** Taka. */
  remainingBalance: number;
  insufficientBalance: boolean;
  canSend: boolean;
  needsConfirmation: boolean;
  unicodeRecipients: number;
  skippedBreakdown: Array<{ reason: string; count: number }>;
}

export interface SmsPreviewResponse {
  templateKey: SmsMessageKind;
  audience: SmsAudience;
  dueDuration?: SmsDueDuration;
  dueDurationCounts?: SmsDueDurationCounts;
  balance: SmsBalance;
  summary: SmsPreviewSummary;
  sampleMessage: string;
  recipients: SmsRecipientView[];
  skipped: SmsRecipientView[];
}

export interface SendSmsResponse {
  requestId: string;
  sent: number;
  failed: number;
  skipped: number;
  dryRun: boolean;
  status: "sent" | "simulated";
  message: string;
}

export interface SmsHoliday {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string;
  includeInactive: boolean;
  status: "draft" | "sent";
  sentAt?: string | null;
  sentCount: number;
  failedCount: number;
  previewMessage: string;
}

export interface SmsHolidayList {
  reasons: string[];
  data: SmsHoliday[];
}

export interface CreateSmsHolidayPayload {
  fromDate: string;
  toDate?: string;
  reason: string;
  otherReason?: string;
  includeInactive?: boolean;
}

export interface SmsHistoryRecord {
  id: string;
  requestId: string;
  memberId?: string | null;
  memberName: string;
  recipientPhone?: string | null;
  templateKey?: SmsMessageKind;
  renderedMessage: string;
  sendMode: "manual" | "auto";
  status: SmsHistoryStatus;
  reason?: string;
  units: number;
  senderType?: SmsSenderType;
  createdAt: string;
}

export interface SmsHistoryListResponse {
  meta: { page: number; limit: number; total: number };
  data: SmsHistoryRecord[];
}

export interface SmsBatch {
  requestId: string;
  createdAt: string;
  templateKey?: SmsMessageKind;
  sendMode: "manual" | "auto";
  sampleMessage: string;
  total: number;
  sent: number;
  failed: number;
  retryable: number;
  skipped: number;
  credits: number;
  senderType?: SmsSenderType;
  simulated: number;
}

export interface SmsBatchListResponse {
  meta: { page: number; limit: number; total: number };
  data: SmsBatch[];
}

export const SMS_KIND_LABELS: Record<SmsMessageKind, string> = {
  dueReminder: "Due Reminder",
  holiday: "Holiday Notice",
  birthday: "Birthday Wishes",
  paymentConfirmation: "Payment Confirmation",
  membershipExpired: "Membership Expired",
  welcome: "Welcome SMS",
  custom: "Custom Message",
};
