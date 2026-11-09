"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSmsAccess } from "@/hooks/useSmsAccess";
import { isBangladeshPhone } from "@/lib/bangladeshPhone";
import { formatTaka } from "@/lib/sms";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useGetSmsSettingsQuery,
  useSendTestSmsMutation,
  useUpdateSmsSettingsMutation,
} from "@/redux/features/sms/smsApi";
import type { SmsAutoToggleKey, SmsTemplateInfo } from "@/types/sms";

const hourLabel = (hour: number) => `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? "AM" : "PM"}`;
const hours = Array.from({ length: 12 }, (_, i) => i + 9); // 9 AM - 8 PM

export default function SmsAutoPage() {
  const { businessId, branchId, canManage } = useSmsAccess();
  const scope = { businessId, branchId };

  const { data: settings, isLoading } = useGetSmsSettingsQuery(scope);
  const [updateSettings, { isLoading: isSaving }] = useUpdateSmsSettingsMutation();
  const [sendTest, { isLoading: isTesting }] = useSendTestSmsMutation();

  const [confirmSender, setConfirmSender] = useState<"masking" | "nonMasking" | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ template: SmsTemplateInfo; next: boolean } | null>(null);
  const [confirmMaster, setConfirmMaster] = useState<boolean | null>(null);
  const [viewing, setViewing] = useState<SmsTemplateInfo | null>(null);
  const [testing, setTesting] = useState<SmsTemplateInfo | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [scheduling, setScheduling] = useState<SmsTemplateInfo | null>(null);
  const [dayDraft, setDayDraft] = useState(5);
  const [hourDraft, setHourDraft] = useState(10);

  if (!canManage) {
    return (
      <Card className="border-border shadow-none">
        <CardContent className="pt-6 text-sm text-gray-600">
          Only the owner or an admin can change automatic messages.
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !settings) return <p className="text-sm text-gray-500">Loading...</p>;

  const s = settings.smsSettings;
  const usingMasking = s.senderType !== "nonMasking";

  const save = async (payload: Parameters<typeof updateSettings>[0]["payload"], success: string) => {
    try {
      await updateSettings({ ...scope, payload }).unwrap();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
      return false;
    }
  };

  const scheduleText = (template: SmsTemplateInfo) => {
    if (template.key === "dueReminder") {
      return `Day ${s.reminderDayOfMonth} of every month, from ${hourLabel(s.reminderHour)}`;
    }
    if (template.key === "birthday") return `Every day from ${hourLabel(s.birthdayHour)}`;
    return template.whenSent;
  };

  const openSchedule = (template: SmsTemplateInfo) => {
    setDayDraft(s.reminderDayOfMonth);
    setHourDraft(template.key === "birthday" ? s.birthdayHour : s.reminderHour);
    setScheduling(template);
  };

  const automatic = settings.templates.filter((template) => template.automatic);
  const holidayTemplate = settings.templates.find((template) => template.key === "holiday");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-border shadow-none">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">SMS for {settings.branchName}</p>
              <p className="text-sm text-gray-500">
                {s.enabled
                  ? "SMS is on. Messages you turn on below are sent automatically."
                  : "SMS is off. Nothing is sent, not even by hand, until you turn it on."}
              </p>
            </div>
            <Switch
              checked={s.enabled}
              disabled={isSaving}
              onCheckedChange={(checked) => setConfirmMaster(checked)}
              aria-label="Turn SMS on or off"
            />
          </div>

          <div className="border-t border-gray-100 pt-4" data-testid="sms-sender-style">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Use masking (brand name)</p>
                <p className="mt-1 text-xs text-gray-500">
                  {usingMasking
                    ? `Members see "${settings.senders.masking.id}" as the sender. Costs ${formatTaka(settings.senders.masking.pricePerSms)} per SMS.`
                    : `Members see the number ${settings.senders.nonMasking.id} as the sender. Costs ${formatTaka(settings.senders.nonMasking.pricePerSms)} per SMS (cheaper).`}
                </p>
              </div>
              <Switch
                checked={usingMasking}
                disabled={isSaving}
                onCheckedChange={(checked) => setConfirmSender(checked ? "masking" : "nonMasking")}
                aria-label="Use masking name on or off"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              The sender names are fixed for the whole app. Each branch only chooses masking or non-masking.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={`border-border shadow-none ${s.enabled ? "" : "opacity-60"}`}>
        <CardContent className="p-0">
          <ul className="divide-y divide-gray-100">
            {automatic.map((template) => (
              <li key={template.key} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{template.label}</p>
                  <p className="text-xs text-gray-500">{scheduleText(template)}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-primary">
                    <button type="button" onClick={() => setViewing(template)}>
                      View message
                    </button>
                    {template.key === "dueReminder" || template.key === "birthday" ? (
                      <button type="button" onClick={() => openSchedule(template)}>
                        Change time
                      </button>
                    ) : null}
                    <button type="button" onClick={() => { setTestPhone(""); setTesting(template); }}>
                      Send a test
                    </button>
                  </div>
                </div>
                <Switch
                  checked={Boolean(template.enabled)}
                  disabled={!s.enabled || isSaving}
                  onCheckedChange={(checked) => setConfirmToggle({ template, next: checked })}
                  aria-label={`${template.label} on or off`}
                />
              </li>
            ))}
            {holidayTemplate ? (
              <li className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-gray-900">{holidayTemplate.label}</p>
                  <p className="text-xs text-gray-500">Sent only when you send it, from the Holidays tab.</p>
                  <div className="mt-2 flex gap-3 text-xs font-medium text-primary">
                    <button type="button" onClick={() => setViewing(holidayTemplate)}>
                      View message
                    </button>
                    <button type="button" onClick={() => { setTestPhone(""); setTesting(holidayTemplate); }}>
                      Send a test
                    </button>
                  </div>
                </div>
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-500">
        Message wording is fixed so nothing can break. To change the wording, ask your developer.
      </p>

      {/* master switch confirmation */}
      <AlertDialog open={confirmMaster !== null} onOpenChange={(open) => !open && setConfirmMaster(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmMaster ? "Turn SMS on?" : "Turn SMS off?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMaster
                ? "Every automatic message is still off until you switch it on below. You can then send messages by hand."
                : "No SMS will be sent from this branch, automatic or by hand."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={async () => {
                const next = confirmMaster as boolean;
                setConfirmMaster(null);
                await save({ enabled: next }, next ? "SMS is on" : "SMS is off");
              }}
            >
              {confirmMaster ? "Turn on" : "Turn off"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* masking on / off confirmation */}
      <AlertDialog open={Boolean(confirmSender)} onOpenChange={(open) => !open && setConfirmSender(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmSender === "masking" ? "Turn masking on?" : "Turn masking off?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmSender === "masking"
                ? `Messages from this branch will show "${settings.senders.masking.id}" as the sender. Each SMS costs ${formatTaka(settings.senders.masking.pricePerSms)}.`
                : `Messages from this branch will show the number ${settings.senders.nonMasking.id} as the sender. Each SMS costs ${formatTaka(settings.senders.nonMasking.pricePerSms)}. Check on your own phone that these messages arrive.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={async () => {
                const next = confirmSender;
                setConfirmSender(null);
                if (!next) return;
                await save({ senderType: next }, next === "masking" ? "Masking is on" : "Masking is off");
              }}
            >
              Yes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* per-message confirmation */}
      <AlertDialog open={Boolean(confirmToggle)} onOpenChange={(open) => !open && setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.next ? "Turn on" : "Turn off"} {confirmToggle?.template.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.next
                ? `${confirmToggle.template.whenSent}. Goes to: ${confirmToggle.template.whoReceives.toLowerCase()}. Each message costs ${formatTaka(settings.sender.pricePerSms)} (${settings.sender.label.toLowerCase()}).`
                : "This message will stop being sent automatically."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={async () => {
                const target = confirmToggle;
                setConfirmToggle(null);
                if (!target) return;
                await save(
                  { toggles: { [target.template.key as SmsAutoToggleKey]: target.next } },
                  `${target.template.label} ${target.next ? "on" : "off"}`,
                );
              }}
            >
              Yes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* view message */}
      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.label}</DialogTitle>
            <DialogDescription>This wording is fixed.</DialogDescription>
          </DialogHeader>
          {viewing ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-3 text-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Example</p>
                <p className="mt-1">{viewing.example}</p>
              </div>
              <dl className="space-y-1 text-gray-600">
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-gray-500">When</dt><dd>{viewing.whenSent}</dd></div>
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-gray-500">Who gets it</dt><dd>{viewing.whoReceives}</dd></div>
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-gray-500">Cost</dt><dd>{viewing.units} SMS credit{viewing.units === 1 ? "" : "s"} per member (never more than {viewing.maxCredits ?? 2}; a member whose name makes it longer is skipped)</dd></div>
              </dl>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* test message */}
      <Dialog open={Boolean(testing)} onOpenChange={(open) => !open && setTesting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a test: {testing?.label}</DialogTitle>
            <DialogDescription>
              Sends the example message to one phone number. Use your own number. It uses a small amount of credit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={testPhone}
              onChange={(event) => setTestPhone(event.target.value)}
              placeholder="01XXXXXXXXX"
              inputMode="tel"
            />
            {testPhone && !isBangladeshPhone(testPhone) ? (
              <p className="text-xs text-red-600">Enter a valid Bangladesh mobile number.</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTesting(null)}>
                Cancel
              </Button>
              <Button
                disabled={!isBangladeshPhone(testPhone) || isTesting}
                onClick={async () => {
                  if (!testing) return;
                  try {
                    const result = await sendTest({ ...scope, templateKey: testing.key, phone: testPhone }).unwrap();
                    if (result.failed > 0) toast.error(result.message);
                    else toast.success(result.message);
                    setTesting(null);
                  } catch (error) {
                    toast.error(extractApiErrorMessage(error));
                  }
                }}
              >
                {isTesting ? "Sending..." : "Send test"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* schedule */}
      <Dialog open={Boolean(scheduling)} onOpenChange={(open) => !open && setScheduling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{scheduling?.label}: when to send</DialogTitle>
            <DialogDescription>Times are Bangladesh time. Messages are never sent before 9 AM.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {scheduling?.key === "dueReminder" ? (
              <label className="block space-y-1 text-sm font-medium text-gray-700">
                Day of the month
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={dayDraft}
                  onChange={(event) => setDayDraft(Number(event.target.value || 1))}
                />
                <span className="block text-xs font-normal text-gray-500">
                  If a month is shorter (for example 31 in April), it is sent on the last day.
                </span>
              </label>
            ) : null}
            <label className="block space-y-1 text-sm font-medium text-gray-700">
              Time
              <select
                value={hourDraft}
                onChange={(event) => setHourDraft(Number(event.target.value))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {hourLabel(hour)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setScheduling(null)}>
                Cancel
              </Button>
              <Button
                disabled={isSaving || dayDraft < 1 || dayDraft > 31}
                onClick={async () => {
                  const target = scheduling;
                  if (!target) return;
                  const ok = await save(
                    target.key === "dueReminder"
                      ? { reminderDayOfMonth: dayDraft, reminderHour: hourDraft }
                      : { birthdayHour: hourDraft },
                    "Time saved",
                  );
                  if (ok) setScheduling(null);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
