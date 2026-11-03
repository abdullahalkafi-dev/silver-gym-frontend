"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSmsAccess } from "@/hooks/useSmsAccess";
import { formatNumber } from "@/lib/sms";
import { formatBdDateTime } from "@/lib/utils";
import {
  useGetSmsBalanceQuery,
  useGetSmsBatchesQuery,
  useGetSmsSettingsQuery,
} from "@/redux/features/sms/smsApi";
import { SMS_KIND_LABELS } from "@/types/sms";

const actions = [
  {
    href: "/dashboard/sms/send?kind=dueReminder",
    title: "Send Due Reminder",
    text: "Remind active members who owe money.",
  },
  {
    href: "/dashboard/sms/holidays",
    title: "Holiday Notice",
    text: "Tell members the gym is closed.",
  },
  {
    href: "/dashboard/sms/send?kind=custom",
    title: "Custom Message",
    text: "Write your own message for chosen members.",
  },
];

export default function SmsHomePage() {
  const { businessId, branchId, canManage } = useSmsAccess();
  const scope = { businessId, branchId };

  const { data: settings, isLoading } = useGetSmsSettingsQuery(scope);
  const { data: balance } = useGetSmsBalanceQuery(scope, { skip: !settings?.smsSettings.enabled });
  const { data: batches } = useGetSmsBatchesQuery({ ...scope, page: 1, limit: 5 });

  if (isLoading || !settings) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  const { smsSettings, templates } = settings;
  const runningAuto = templates.filter((template) => template.automatic && template.enabled);

  if (!smsSettings.enabled) {
    return (
      <Card className="border-border shadow-none">
        <CardContent className="space-y-3 pt-6">
          <p className="text-lg font-semibold text-gray-900">SMS is off for this branch</p>
          <p className="text-sm text-gray-600">
            {canManage
              ? "Turn SMS on and set your sender name to start sending messages."
              : "Ask the owner or an admin to turn SMS on."}
          </p>
          {canManage ? (
            <Link href="/dashboard/sms/auto">
              <Button>Set up SMS</Button>
            </Link>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-none">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              SMS is ON
            </span>
            {settings.dryRun ? (
              <span className="ml-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Test mode - nothing is really sent
              </span>
            ) : null}
            <p className="mt-2 text-sm text-gray-500">Sender name: {smsSettings.maskingSender}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">SMS credits left</p>
            <p className="text-3xl font-semibold text-gray-900">{formatNumber(balance?.maskingBalance)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="h-full border-border shadow-none transition-colors hover:border-primary">
              <CardContent className="pt-6">
                <p className="font-semibold text-gray-900">{action.title}</p>
                <p className="mt-1 text-sm text-gray-500">{action.text}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-border shadow-none">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Automatic messages</CardTitle>
          {canManage ? (
            <Link href="/dashboard/sms/auto" className="text-sm font-medium text-primary">
              Manage
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          {runningAuto.length > 0
            ? `Running: ${runningAuto.map((template) => template.label).join(", ")}`
            : "No automatic messages are turned on."}
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent sends</CardTitle>
          <Link href="/dashboard/sms/history" className="text-sm font-medium text-primary">
            See all
          </Link>
        </CardHeader>
        <CardContent>
          {batches?.data.length ? (
            <ul className="divide-y divide-gray-100 text-sm">
              {batches.data.map((batch) => (
                <li key={batch.requestId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {batch.templateKey ? SMS_KIND_LABELS[batch.templateKey] : "SMS"}
                    </p>
                    <p className="text-xs text-gray-500">{formatBdDateTime(batch.createdAt)}</p>
                  </div>
                  <p className="text-gray-600">
                    {batch.sent} sent
                    {batch.failed > 0 ? <span className="text-red-600"> - {batch.failed} failed</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Nothing sent yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
