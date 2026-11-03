import type { SmsHistoryStatus } from "@/types/sms";

export const CUSTOM_MESSAGE_MAX_CHARS = 306;

export const isPlainSmsText = (value: string) => /^[\x20-\x7E\r\n]*$/.test(value);

/** Same rule the server uses: 160 characters for the first SMS, then 153 per extra part. */
export const estimateCredits = (message: string) => {
  const length = Array.from(message).length;
  if (length === 0) return 0;
  return length <= 160 ? 1 : Math.ceil(length / 153);
};

export const formatNumber = (value?: number | null) => Number(value || 0).toLocaleString();

/** "6-8 Jun" / "16 Dec" / "30 Dec-2 Jan" (matches the SMS that is sent). */
export const formatHolidayDates = (from: string, to: string) => {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", ...opts }).format(new Date(iso));
  const key = (iso: string) => fmt(iso, { day: "numeric", month: "short", year: "numeric" });
  const monthKey = (iso: string) => fmt(iso, { month: "short", year: "numeric" });

  if (key(from) === key(to)) return fmt(from, { day: "numeric", month: "short" });
  if (monthKey(from) === monthKey(to)) {
    return `${fmt(from, { day: "numeric" })}-${fmt(to, { day: "numeric", month: "short" })}`;
  }
  return `${fmt(from, { day: "numeric", month: "short" })}-${fmt(to, { day: "numeric", month: "short" })}`;
};

export const SMS_STATUS_LABEL: Record<SmsHistoryStatus, string> = {
  sent: "Sent",
  simulated: "Test only",
  failed: "Failed",
  skipped: "Skipped",
  blocked: "Blocked",
};

export const SMS_STATUS_STYLE: Record<SmsHistoryStatus, string> = {
  sent: "bg-green-100 text-green-700",
  simulated: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-amber-100 text-amber-700",
  blocked: "bg-amber-100 text-amber-700",
};
