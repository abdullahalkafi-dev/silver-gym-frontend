"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { skipToken } from "@reduxjs/toolkit/query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { useGetDayAttendanceQuery } from "@/redux/features/access/accessApi";
import type { DayAbsent, DayScanner } from "@/types/access";

type Tab = "present" | "absent" | "staff" | "unknown";

const todayInDhaka = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
  });

const MODE_LABEL: Record<string, string> = {
  fingerprint: "Fingerprint",
  card: "Card",
  other: "Other",
};

const memberLink = (memberRef?: string) =>
  memberRef ? `/dashboard/members/details/${memberRef}` : undefined;

export default function AttendancePage() {
  const { activeBranchId } = useUser();
  const [date, setDate] = useState(todayInDhaka());
  const [tab, setTab] = useState<Tab>("present");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, isFetching } = useGetDayAttendanceQuery(
    activeBranchId && date ? { branchId: activeBranchId, date } : skipToken,
    { pollingInterval: date === todayInDhaka() ? 60_000 : 0 },
  );

  const needle = search.trim().toLowerCase();
  const matches = (name?: string | null, id?: string | null) =>
    !needle ||
    (name ?? "").toLowerCase().includes(needle) ||
    (id ?? "").toLowerCase().includes(needle);

  const present = useMemo(
    () => (data?.present ?? []).filter((p) => matches(p.fullName, p.memberId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, needle],
  );
  const absent = useMemo(
    () => (data?.absent ?? []).filter((p) => matches(p.fullName, p.memberId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, needle],
  );

  const tabs: Array<{ id: Tab; label: string; count: number; tone: string }> = [
    { id: "present", label: "Came", count: data?.counts.present ?? 0, tone: "text-green-700" },
    { id: "absent", label: "Did not come", count: data?.counts.absent ?? 0, tone: "text-red-600" },
    { id: "staff", label: "Staff", count: data?.counts.staff ?? 0, tone: "text-blue-700" },
    { id: "unknown", label: "Unknown scans", count: data?.counts.unknown ?? 0, tone: "text-amber-700" },
  ];

  const renderScanRow = (row: DayScanner, key: string, label: string) => {
    const href = memberLink(row.memberRef);
    const content = (
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">
            {row.memberId ? `ID ${row.memberId} · ` : ""}
            {MODE_LABEL[row.verifyMode] ?? row.verifyMode}
          </p>
        </div>
        <div className="shrink-0 text-right text-xs text-gray-600">
          <p>In {formatTime(row.firstScan)}</p>
          {row.scans > 1 ? <p>Last {formatTime(row.lastScan)}</p> : null}
        </div>
      </div>
    );

    return href ? (
      <Link key={key} href={href} className="block hover:bg-gray-50">
        {content}
      </Link>
    ) : (
      <div key={key}>{content}</div>
    );
  };

  const renderAbsentRow = (row: DayAbsent) => (
    <Link
      key={row.memberRef}
      href={`/dashboard/members/details/${row.memberRef}`}
      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
    >
      <p className="truncate text-sm font-medium text-gray-900">{row.fullName}</p>
      <p className="shrink-0 text-xs text-gray-500">
        {row.memberId ? `ID ${row.memberId}` : ""}
      </p>
    </Link>
  );

  const rows = (() => {
    if (!data) return [];
    if (tab === "present") {
      return present.map((p) =>
        renderScanRow(p, p.memberRef ?? "", p.fullName || p.memberId || "Member"),
      );
    }
    if (tab === "absent") return absent.map(renderAbsentRow);
    if (tab === "staff") {
      return data.staff.map((s) =>
        renderScanRow(s, `staff-${s.deviceUserId}`, `Staff · device ID ${s.deviceUserId}`),
      );
    }
    return data.unknown.map((s) =>
      renderScanRow(s, `unknown-${s.deviceUserId}`, `Unknown · device ID ${s.deviceUserId}`),
    );
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500">
            Who scanned at the door. Days are counted in Dhaka time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            max={todayInDhaka()}
            onChange={(event) => event.target.value && setDate(event.target.value)}
            className="w-44"
          />
          <button
            type="button"
            onClick={() => setDate(todayInDhaka())}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Today
          </button>
        </div>
      </div>

      {!activeBranchId ? (
        <Card className="p-5 shadow-none">
          <p className="text-sm text-gray-600">Select a branch to see attendance.</p>
        </Card>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : isError || !data ? (
        <Card className="p-5 shadow-none">
          <p className="text-sm text-red-600">Could not load attendance.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  tab === item.id
                    ? "border-purple bg-purple/5"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <p className={`text-2xl font-semibold ${item.tone}`}>{item.count}</p>
                <p className="text-xs text-gray-600">{item.label}</p>
              </button>
            ))}
          </div>

          {(tab === "present" || tab === "absent") && (
            <Input
              placeholder="Search by name or member ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-sm"
            />
          )}

          <Card className={`overflow-hidden p-0 shadow-none ${isFetching ? "opacity-80" : ""}`}>
            {rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">
                {tab === "present" && "Nobody has scanned on this day."}
                {tab === "absent" && "Everyone active has scanned."}
                {tab === "staff" && "No staff scans on this day."}
                {tab === "unknown" && "No unknown scans. Every scan matched a member or staff."}
              </p>
            ) : (
              <div className="divide-y divide-gray-100">{rows}</div>
            )}
          </Card>

          {tab === "absent" && (
            <p className="text-xs text-gray-500">
              &quot;Did not come&quot; lists active members with no scan that day. Members who
              are not enrolled on the door device yet will appear here too.
            </p>
          )}
        </>
      )}
    </div>
  );
}
