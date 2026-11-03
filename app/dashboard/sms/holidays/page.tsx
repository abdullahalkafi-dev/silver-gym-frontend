"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import SmsSendPanel from "@/components/dashboard/SMS/SmsSendPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSmsAccess } from "@/hooks/useSmsAccess";
import { formatHolidayDates, isPlainSmsText } from "@/lib/sms";
import { formatBdDateTime } from "@/lib/utils";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useCreateSmsHolidayMutation,
  useDeleteSmsHolidayMutation,
  useGetSmsHolidaysQuery,
  useGetSmsSettingsQuery,
} from "@/redux/features/sms/smsApi";
import type { SmsHoliday } from "@/types/sms";

const todayInput = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
const toIso = (dateInput: string) => `${dateInput}T06:00:00+06:00`;

export default function SmsHolidaysPage() {
  const { businessId, branchId, canManage } = useSmsAccess();
  const scope = { businessId, branchId };

  const { data: settings } = useGetSmsSettingsQuery(scope);
  const { data: holidays, isLoading } = useGetSmsHolidaysQuery(scope);
  const [createHoliday, { isLoading: isCreating }] = useCreateSmsHolidayMutation();
  const [deleteHoliday] = useDeleteSmsHolidayMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [fromDate, setFromDate] = useState(todayInput());
  const [toDate, setToDate] = useState(todayInput());
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [sendTarget, setSendTarget] = useState<SmsHoliday | null>(null);

  const reasons = holidays?.reasons ?? [];
  const finalReason = reason === "Other" ? otherReason.trim() : reason;
  const reasonError =
    reason === "Other" && otherReason
      ? !isPlainSmsText(otherReason) || otherReason.length > 40
        ? "English only, up to 40 characters."
        : null
      : null;
  const dateError = toDate < fromDate ? "The last day cannot be before the first day." : null;
  const canSave = Boolean(finalReason) && !reasonError && !dateError;

  const preview = canSave
    ? `Dear Member, Silver Gym will remain closed on ${formatHolidayDates(toIso(fromDate), toIso(toDate))} due to ${finalReason}. Thank you.`
    : "";

  const resetForm = () => {
    setReason("");
    setOtherReason("");
    setIncludeInactive(false);
    setFromDate(todayInput());
    setToDate(todayInput());
  };

  const save = async () => {
    try {
      const holiday = await createHoliday({
        ...scope,
        payload: {
          fromDate: toIso(fromDate),
          toDate: toIso(toDate),
          reason,
          ...(reason === "Other" ? { otherReason: otherReason.trim() } : {}),
          includeInactive: canManage && includeInactive,
        },
      }).unwrap();
      setFormOpen(false);
      resetForm();
      return holiday;
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteHoliday({ ...scope, holidayId: id }).unwrap();
      toast.success("Draft deleted");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  if (settings && !settings.smsSettings.enabled) {
    return (
      <Card className="border-border shadow-none">
        <CardContent className="space-y-3 pt-6 text-sm text-gray-600">
          <p className="text-lg font-semibold text-gray-900">SMS is off for this branch</p>
          {canManage ? (
            <Link href="/dashboard/sms/auto">
              <Button>Go to Auto Messages</Button>
            </Link>
          ) : (
            <p>Ask the owner or an admin to turn SMS on.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Closed for a day or more? Write down the dates and the reason. The message wording is fixed.
        </p>
        <Button onClick={() => setFormOpen(true)}>+ New holiday notice</Button>
      </div>

      <Card className="border-border shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : holidays?.data.length ? (
            <ul className="divide-y divide-gray-100">
              {holidays.data.map((holiday) => (
                <li key={holiday.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {holiday.reason} - {formatHolidayDates(holiday.fromDate, holiday.toDate)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{holiday.previewMessage}</p>
                    {holiday.status === "sent" ? (
                      <p className="mt-1 text-xs text-green-700">
                        Sent {formatBdDateTime(holiday.sentAt)} - {holiday.sentCount} delivered to provider
                        {holiday.failedCount ? `, ${holiday.failedCount} failed` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-700">Draft - not sent yet</p>
                    )}
                  </div>
                  {holiday.status === "draft" ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setSendTarget(holiday)}>
                        Send
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => remove(holiday.id)}>
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm text-gray-500">No holiday notices yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New holiday notice</DialogTitle>
            <DialogDescription>For a single day, choose the same date twice.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-gray-700">
                First day
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </label>
              <label className="space-y-1 text-sm font-medium text-gray-700">
                Last day
                <Input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
              </label>
            </div>
            {dateError ? <p className="text-xs text-red-600">{dateError}</p> : null}

            <label className="block space-y-1 text-sm font-medium text-gray-700">
              Reason
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Choose a reason</option>
                {reasons.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                <option value="Other">Other...</option>
              </select>
            </label>
            {reason === "Other" ? (
              <div className="space-y-1">
                <Input
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  maxLength={40}
                  placeholder="Short reason, in English"
                />
                {reasonError ? <p className="text-xs text-red-600">{reasonError}</p> : null}
              </div>
            ) : null}

            {canManage ? (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <Checkbox
                  checked={includeInactive}
                  onCheckedChange={(checked) => setIncludeInactive(Boolean(checked))}
                />
                Also send to inactive members
              </label>
            ) : null}

            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message</p>
              <p className="mt-1">{preview || "Choose the dates and a reason to see the message."}</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!canSave || isCreating}
                onClick={async () => {
                  const holiday = await save();
                  if (holiday) toast.success("Saved as draft. Press Send when ready.");
                }}
              >
                {isCreating ? "Saving..." : "Save as draft"}
              </Button>
              <Button
                disabled={!canSave || isCreating}
                onClick={async () => {
                  const holiday = await save();
                  if (holiday) setSendTarget(holiday);
                }}
              >
                Save and send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(sendTarget)} onOpenChange={(open) => !open && setSendTarget(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send holiday notice</DialogTitle>
            <DialogDescription>{sendTarget?.previewMessage}</DialogDescription>
          </DialogHeader>
          {sendTarget ? (
            <SmsSendPanel
              payload={{ kind: "holiday", holidayId: sendTarget.id }}
              actionLabel="Send holiday notice"
              onBack={() => setSendTarget(null)}
              onSent={() => setSendTarget(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
