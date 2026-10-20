// components/dashboard/Members/MemberActivitiesCalendar.tsx
"use client";

import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMemberAttendanceQuery } from "@/redux/features/access/accessApi";
import type { AccessDecision, AttendanceDay } from "@/types/access";

interface MemberActivitiesCalendarProps {
  /** Database id of the member (the id in the details page URL). */
  memberId?: string;
  branchId?: string | null;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** "2026-10-17" -> local Date at midnight (no timezone shift). */
const parseDay = (value: string) => {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toDayKey = (date: Date) =>
  `${toMonthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
  });

const formatDay = (value: string) =>
  parseDay(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const MODE_LABEL: Record<string, string> = {
  fingerprint: "Fingerprint",
  card: "Card",
  other: "Other",
};

const describeAccess = (access: AccessDecision) => {
  const blockedWhy: Record<string, string> = {
    inactive: "Member is inactive",
    monthly_due: "Monthly fee unpaid",
    override_block: "Blocked by admin",
  };

  if (access.status === "log_only") {
    const would =
      access.wouldBe === "blocked"
        ? `would be blocked (${blockedWhy[access.reason] ?? "unpaid"})`
        : access.wouldBe === "grace"
          ? `in grace until ${access.graceUntil ? formatDay(access.graceUntil) : "-"}`
          : "would be allowed";
    return {
      label: "Door not enforced yet",
      detail: `If switched on: ${would}`,
      tone: "bg-gray-100 text-gray-700 border-gray-200",
    };
  }

  if (access.status === "grace") {
    return {
      label: "Door open (grace)",
      detail: `Unpaid monthly fee. Open until ${access.graceUntil ? formatDay(access.graceUntil) : "-"}`,
      tone: "bg-amber-50 text-amber-800 border-amber-200",
    };
  }

  if (access.status === "blocked") {
    return {
      label: "Door blocked",
      detail: blockedWhy[access.reason] ?? "Blocked",
      tone: "bg-red-50 text-red-700 border-red-200",
    };
  }

  return {
    label: "Door open",
    detail:
      access.reason === "override_allow"
        ? "Allowed by admin"
        : "No monthly fee due",
    tone: "bg-green-50 text-green-700 border-green-200",
  };
};

const MemberActivitiesCalendar: React.FC<MemberActivitiesCalendarProps> = ({
  memberId,
  branchId,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const month = toMonthKey(currentMonth);

  const { data, isLoading, isFetching, isError } = useGetMemberAttendanceQuery(
    branchId && memberId ? { branchId, memberId, month } : skipToken,
  );

  const presentByDate = useMemo(() => {
    const map = new Map<string, AttendanceDay>();
    data?.presentDays.forEach((day) => map.set(day.date, day));
    return map;
  }, [data]);

  const presentDates = useMemo(
    () => (data?.presentDays ?? []).map((day) => parseDay(day.date)),
    [data],
  );
  const absentDates = useMemo(
    () => (data?.absentDates ?? []).map(parseDay),
    [data],
  );

  const selectedKey = selectedDate ? toDayKey(selectedDate) : null;
  const selectedPresent = selectedKey ? presentByDate.get(selectedKey) : undefined;
  const selectedAbsent = selectedKey
    ? (data?.absentDates ?? []).includes(selectedKey)
    : false;

  const handleMonthClick = (monthIndex: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex));
  };

  const access = data ? describeAccess(data.access) : null;

  return (
    <div className="space-y-4">
      {/* Door status */}
      {access && (
        <div className={`rounded-lg border p-3 ${access.tone}`}>
          <p className="text-sm font-semibold">{access.label}</p>
          <p className="text-xs">{access.detail}</p>
        </div>
      )}

      {/* Months Grid */}
      <div className="grid grid-cols-6 gap-2">
        {MONTHS.map((label, index) => (
          <button
            key={label}
            onClick={() => handleMonthClick(index)}
            className={`px-3 py-2 text-sm rounded-md transition-colors ${
              currentMonth.getMonth() === index
                ? "bg-purple text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Month summary */}
      {isLoading ? (
        <Skeleton className="h-14 w-full rounded-lg" />
      ) : data ? (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-green-50 p-2">
            <p className="text-lg font-semibold text-green-700">
              {data.summary.presentCount}
            </p>
            <p className="text-[11px] text-green-700">Days came</p>
          </div>
          <div className="rounded-lg bg-red-50 p-2">
            <p className="text-lg font-semibold text-red-600">
              {data.summary.absentCount}
            </p>
            <p className="text-[11px] text-red-600">Days missed</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2">
            <p className="text-sm font-semibold text-gray-700">
              {data.summary.lastVisit
                ? new Date(data.summary.lastVisit).toLocaleDateString("en-GB", {
                    timeZone: "Asia/Dhaka",
                    day: "numeric",
                    month: "short",
                  })
                : "-"}
            </p>
            <p className="text-[11px] text-gray-600">Last visit</p>
          </div>
        </div>
      ) : isError ? (
        <p className="text-xs text-red-600">Could not load attendance.</p>
      ) : null}

      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        captionLayout="dropdown"
        startMonth={new Date(2025, 0)}
        endMonth={new Date(2100, 11)}
        className={`rounded-xl border w-full ${isFetching ? "opacity-70" : ""}`}
        modifiers={{ present: presentDates, absent: absentDates }}
        modifiersClassNames={{
          present:
            "bg-green-100 text-green-700 font-semibold hover:bg-green-200 rounded-md mx-2",
          absent: "bg-red-50 text-red-500 hover:bg-red-100 rounded-md mx-2",
        }}
      />

      {/* Selected day */}
      {selectedPresent && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-800">
            Came on {formatDay(selectedPresent.date)}
          </p>
          <p className="text-xs text-green-700">
            First scan {formatTime(selectedPresent.firstScan)}
            {selectedPresent.scans > 1
              ? ` · last scan ${formatTime(selectedPresent.lastScan)}`
              : ""}
            {" · "}
            {selectedPresent.modes.map((m) => MODE_LABEL[m] ?? m).join(", ")}
          </p>
        </div>
      )}
      {selectedAbsent && selectedKey && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">
            Did not come on {formatDay(selectedKey)}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">Came</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-xs text-gray-600">Did not come</span>
        </div>
      </div>
      {data && !data.trackingStart && (
        <p className="text-xs text-gray-500">
          No door scans recorded for this branch yet.
        </p>
      )}
      {data?.trackingStart && (
        <p className="text-xs text-gray-500">
          Attendance is tracked from {formatDay(data.trackingStart)}. Red days
          only count days when the gym had scans.
        </p>
      )}
    </div>
  );
};

export default MemberActivitiesCalendar;
