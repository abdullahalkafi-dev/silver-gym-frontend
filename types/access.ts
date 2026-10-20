export type AccessStatus = "allowed" | "grace" | "blocked" | "log_only";

export type AccessReason =
  | "access_control_disabled"
  | "override_allow"
  | "override_block"
  | "inactive"
  | "no_monthly_due"
  | "in_grace"
  | "monthly_due";

export interface AccessSettings {
  enabled: boolean;
  graceDays: number;
  debounceMinutes: number;
  updatedAt: string | null;
}

export interface AccessDecision {
  allowed: boolean;
  status: AccessStatus;
  reason: AccessReason;
  /** What the door would do if access control were switched on. */
  wouldBe: AccessStatus;
  unpaidSince?: string;
  graceUntil?: string;
}

export interface AttendanceDay {
  date: string; // YYYY-MM-DD (Dhaka)
  firstScan: string;
  lastScan: string;
  scans: number;
  modes: string[];
}

export interface MemberAttendance {
  month: string;
  memberId: string | null;
  trackingStart: string | null;
  presentDays: AttendanceDay[];
  absentDates: string[];
  summary: {
    presentCount: number;
    absentCount: number;
    lastVisit: string | null;
  };
  access: AccessDecision;
  settings: AccessSettings;
}

export interface AccessDevice {
  _id: string;
  name: string;
  host: string;
  port: number;
  deviceModel?: string;
  serialNumber?: string;
  isActive: boolean;
  lastSeenAt: string | null;
  lastPullAt: string | null;
  lastError: string | null;
  writeEnabled?: boolean;
  blockGroup?: number | null;
  allowGroup?: number;
  lastAccessSyncAt?: string | null;
  lastAccessSyncSummary?: string | null;
}

export interface CreateAccessDevicePayload {
  name: string;
  host: string;
  port: number;
}

export interface DayScanner {
  memberRef?: string;
  memberId?: string | null;
  fullName?: string | null;
  deviceUserId?: string;
  firstScan: string;
  lastScan: string;
  scans: number;
  verifyMode: string;
}

export interface DayAbsent {
  memberRef: string;
  memberId: string | null;
  fullName: string;
}

export interface DayAttendance {
  date: string;
  present: DayScanner[];
  staff: DayScanner[];
  unknown: DayScanner[];
  absent: DayAbsent[];
  counts: { present: number; staff: number; unknown: number; absent: number };
}

export interface DoorPlan {
  dryRun: boolean;
  applied: number;
  summary: string;
  counts: {
    deviceUsers: number;
    linked: number;
    alreadyCorrect: number;
    toBlock: number;
    toAllow: number;
  };
  changes: Array<{
    userId: string;
    memberRef: string;
    to: "blocked" | "allowed";
    reason: string;
  }>;
  skipped: Array<{ userId: string; why: string }>;
  safety: { ok: boolean; limit: number; toBlock: number };
  blockedFromWriting: string[];
}
