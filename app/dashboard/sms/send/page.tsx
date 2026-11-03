"use client";

import Link from "next/link";
import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import SmsSendPanel from "@/components/dashboard/SMS/SmsSendPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useSmsAccess } from "@/hooks/useSmsAccess";
import {
  CUSTOM_MESSAGE_MAX_CHARS,
  estimateCredits,
  formatNumber,
  isPlainSmsText,
} from "@/lib/sms";
import { isBangladeshPhone } from "@/lib/bangladeshPhone";
import { useGetBranchMembersQuery } from "@/redux/features/member/memberApi";
import { useGetSmsDueOverviewQuery, useGetSmsSettingsQuery } from "@/redux/features/sms/smsApi";
import type { BackendMember } from "@/types/member";
import type { SendSmsPayload, SmsDueDuration } from "@/types/sms";

type Kind = "dueReminder" | "custom";
type CustomAudience = "selected" | "active" | "inactive" | "all";

const dueOptions: Array<{ value: SmsDueDuration; label: string; help: string }> = [
  { value: "allDue", label: "Everyone who owes", help: "All active members with any due" },
  { value: "thisMonth", label: "1 month due", help: "Owe only the current month" },
  { value: "last2Months", label: "Up to 2 months", help: "Owe 1 or 2 months" },
  { value: "last3Months", label: "Up to 3 months", help: "Owe 1, 2 or 3 months" },
];

function SendFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { businessId, branchId, canManage } = useSmsAccess();
  const scope = { businessId, branchId };

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<Kind>(searchParams.get("kind") === "dueReminder" ? "dueReminder" : "custom");
  const [dueDuration, setDueDuration] = useState<SmsDueDuration>("allDue");
  const [audience, setAudience] = useState<CustomAudience>("selected");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const preselected = searchParams.get("memberId");
    return preselected ? [preselected] : [];
  });
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  const { data: settings } = useGetSmsSettingsQuery(scope);
  const { data: due } = useGetSmsDueOverviewQuery({ ...scope, dueDuration }, { skip: kind !== "dueReminder" });
  const { data: memberList, isFetching } = useGetBranchMembersQuery(
    {
      branchId,
      ...(canManage ? { includeInactive: "true" as const } : { isActive: "true" as const }),
      ...(deferredSearch ? { searchTerm: deferredSearch } : {}),
      page,
      limit: 15,
    },
    { skip: !pickerOpen || !branchId },
  );
  const members = useMemo(() => (memberList?.data || []) as BackendMember[], [memberList?.data]);

  const dueTemplate = settings?.templates.find((template) => template.key === "dueReminder");

  const toggleMember = (id: string, checked: boolean) =>
    setSelectedIds((ids) => (checked ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((x) => x !== id)));

  if (settings && !settings.smsSettings.enabled) {
    return (
      <Card className="border-border shadow-none">
        <CardContent className="space-y-3 pt-6 text-sm text-gray-600">
          <p className="text-lg font-semibold text-gray-900">SMS is off for this branch</p>
          <p>{canManage ? "Turn it on under Auto Messages first." : "Ask the owner or an admin to turn SMS on."}</p>
          {canManage ? (
            <Link href="/dashboard/sms/auto">
              <Button>Go to Auto Messages</Button>
            </Link>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const messageError =
    kind === "custom" && message
      ? !isPlainSmsText(message)
        ? "Use English letters, numbers and normal punctuation only."
        : message.length > CUSTOM_MESSAGE_MAX_CHARS
          ? `Too long. The limit is ${CUSTOM_MESSAGE_MAX_CHARS} characters (2 SMS).`
          : null
      : null;

  const canGoNext1 =
    kind === "dueReminder" ? (due?.total ?? 0) > 0 : audience !== "selected" || selectedIds.length > 0;
  const canGoNext2 = kind === "dueReminder" || (message.trim().length > 0 && !messageError);

  const payload: SendSmsPayload =
    kind === "dueReminder"
      ? { kind: "dueReminder", dueDuration }
      : {
          kind: "custom",
          audience,
          message: message.trim(),
          ...(audience === "selected" ? { memberIds: selectedIds } : {}),
        };

  const stepTitles = ["Who", "Message", "Check and send"];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ol className="flex items-center gap-2 text-sm">
        {stepTitles.map((title, index) => {
          const number = index + 1;
          return (
            <li key={title} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  number === step
                    ? "bg-primary text-white"
                    : number < step
                      ? "bg-green-600 text-white"
                      : "border border-gray-300 text-gray-500"
                }`}
              >
                {number < step ? "✓" : number}
              </span>
              <span className={number === step ? "font-medium text-gray-900" : "text-gray-500"}>{title}</span>
              {number < 3 ? <span className="mx-1 text-gray-300">/</span> : null}
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <Card className="border-border shadow-none">
          <CardHeader>
            <CardTitle>Who do you want to message?</CardTitle>
            <CardDescription>Pick the kind of message first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { value: "dueReminder", title: "Due reminder", text: "Active members who owe money" },
                  { value: "custom", title: "Custom message", text: "Write your own message" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setKind(option.value)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                    kind === option.value ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                  }`}
                >
                  <p className="font-semibold text-gray-900">{option.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{option.text}</p>
                </button>
              ))}
            </div>

            {kind === "dueReminder" ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Only <b>active</b> members who have dues will get this reminder.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {dueOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDueDuration(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                        dueDuration === option.value ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{option.label}</p>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                          {formatNumber(due?.dueDurationCounts[option.value])}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{option.help}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {(
                  [
                    { value: "selected", label: "Choose members" },
                    { value: "active", label: "All active members" },
                    ...(canManage
                      ? ([
                          { value: "inactive", label: "Inactive members (marketing)" },
                          { value: "all", label: "Every member" },
                        ] as const)
                      : []),
                  ] as Array<{ value: CustomAudience; label: string }>
                ).map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  >
                    <input
                      type="radio"
                      name="audience"
                      checked={audience === option.value}
                      onChange={() => setAudience(option.value)}
                    />
                    <span className="font-medium text-gray-900">{option.label}</span>
                  </label>
                ))}
                {audience === "selected" ? (
                  <Button variant="outline" onClick={() => setPickerOpen(true)}>
                    {selectedIds.length > 0
                      ? `${formatNumber(selectedIds.length)} selected - change`
                      : "Choose members"}
                  </Button>
                ) : null}
              </div>
            )}

            <div className="flex justify-end border-t border-gray-100 pt-4">
              <Button onClick={() => setStep(2)} disabled={!canGoNext1}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="border-border shadow-none">
          <CardHeader>
            <CardTitle>{kind === "dueReminder" ? "This is the message" : "Write your message"}</CardTitle>
            <CardDescription>
              {kind === "dueReminder"
                ? "The due reminder text is fixed so every member gets the same clear message."
                : "English only. Type {Member_Name} where you want each member's name."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {kind === "dueReminder" ? (
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Example</p>
                <p className="mt-2">{dueTemplate?.example}</p>
              </div>
            ) : (
              <>
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="min-h-40"
                  placeholder="Example: Dear {Member_Name}, we have a new offer at Silver Gym. Visit us for details."
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className={messageError ? "text-red-600" : ""}>
                    {messageError ?? "English letters, numbers and normal punctuation only."}
                  </span>
                  <span>
                    {message.length}/{CUSTOM_MESSAGE_MAX_CHARS} characters - about {estimateCredits(message)} credit
                    {estimateCredits(message) === 1 ? "" : "s"} each
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canGoNext2}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <SmsSendPanel
          payload={payload}
          onBack={() => setStep(2)}
          onSent={() => {
            toast.success("Done. You can see it in History.");
            router.push("/dashboard/sms/history");
          }}
        />
      ) : null}

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Choose members</SheetTitle>
            <SheetDescription>{formatNumber(selectedIds.length)} selected</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 p-4 pt-0">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, ID or phone"
            />
            <ul className="divide-y divide-gray-100 text-sm">
              {isFetching && members.length === 0 ? (
                <li className="py-6 text-center text-gray-500">Loading...</li>
              ) : members.length === 0 ? (
                <li className="py-6 text-center text-gray-500">No members found.</li>
              ) : (
                members.map((member) => {
                  const validPhone = isBangladeshPhone(member.contact);
                  return (
                    <li key={member._id} className="flex items-center gap-3 py-2">
                      <Checkbox
                        checked={selectedIds.includes(member._id)}
                        onCheckedChange={(checked) => toggleMember(member._id, Boolean(checked))}
                        aria-label={`Select ${member.fullName}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-800">
                          {member.fullName}
                          {member.isActive === false ? (
                            <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-600">
                              Inactive
                            </span>
                          ) : null}
                        </p>
                        <p className={`text-xs ${validPhone ? "text-gray-500" : "text-red-500"}`}>
                          {member.contact ? (validPhone ? member.contact : `${member.contact} (invalid number)`) : "No phone number"}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={members.length < 15}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
            <Button className="w-full" onClick={() => setPickerOpen(false)}>
              Done ({formatNumber(selectedIds.length)} selected)
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function SmsSendPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading...</p>}>
      <SendFlow />
    </Suspense>
  );
}
