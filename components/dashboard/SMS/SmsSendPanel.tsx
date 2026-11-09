"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSmsAccess } from "@/hooks/useSmsAccess";
import { formatNumber } from "@/lib/sms";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import { usePreviewSmsMutation, useSendSmsMutation } from "@/redux/features/sms/smsApi";
import type { SendSmsPayload, SmsPreviewResponse } from "@/types/sms";

type Props = {
  payload: SendSmsPayload;
  /** Shown on the send button, e.g. "Send holiday notice". */
  actionLabel?: string;
  onSent?: () => void;
  onBack?: () => void;
};

/**
 * The last step of every manual send: shows exactly who gets the message and what it costs,
 * lists who is skipped (and why), and asks for one clear confirmation.
 */
export default function SmsSendPanel({ payload, actionLabel = "Send SMS", onSent, onBack }: Props) {
  const { businessId, branchId } = useSmsAccess();
  const [previewSms] = usePreviewSmsMutation();
  const [sendSms, { isLoading: isSending }] = useSendSmsMutation();

  const [state, setState] = useState<{ key: string; data?: SmsPreviewResponse; error?: string } | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const key = useMemo(() => JSON.stringify(payload), [payload]);

  useEffect(() => {
    let cancelled = false;
    previewSms({ businessId, branchId, payload })
      .unwrap()
      .then((data) => !cancelled && setState({ key, data }))
      .catch((error) => !cancelled && setState({ key, error: extractApiErrorMessage(error) }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, businessId, branchId]);

  const current = state?.key === key ? state : null;
  const summary = current?.data?.summary;
  const dryRun = Boolean(current?.data?.balance.dryRun);

  const handleSend = async () => {
    setConfirmOpen(false);
    try {
      const result = await sendSms({ businessId, branchId, payload }).unwrap();
      if (result.sent === 0 && result.failed > 0) {
        toast.error("Nothing was sent. The SMS provider did not accept the message. Open History to see the reason and retry.");
      } else if (result.failed > 0) {
        toast.warning(`${result.sent} sent, ${result.failed} failed. Open History to retry the failed ones.`);
      } else {
        toast.success(result.message);
      }
      onSent?.();
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  if (!current) {
    return <p className="text-sm text-gray-500">Checking who will receive this message...</p>;
  }

  if (current.error || !current.data || !summary) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {current.error ?? "Could not prepare this message."}
        </div>
        {onBack ? (
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {dryRun ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Test mode is on. Nothing will really be sent.
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">This message will be sent to</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">
          {formatNumber(summary.readyRecipients)}{" "}
          <span className="text-base font-normal text-gray-500">
            {summary.readyRecipients === 1 ? "member" : "members"}
          </span>
        </p>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-gray-500">SMS credits needed</p>
            <p className="font-semibold text-gray-900">{formatNumber(summary.requiredUnits)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-gray-500">Credits you have</p>
            <p className="font-semibold text-gray-900">{formatNumber(summary.availableBalance)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-gray-500">Left after sending</p>
            <p className="font-semibold text-gray-900">{formatNumber(summary.remainingBalance)}</p>
          </div>
        </div>

        {summary.insufficientBalance ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            You do not have enough SMS credits for this message. Top up your SMS balance or choose fewer members.
          </p>
        ) : null}

        {summary.skippedRecipients > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">{formatNumber(summary.skippedRecipients)} will be skipped</p>
            <p className="mt-1">
              {summary.skippedBreakdown.map((item) => `${item.count} - ${item.reason}`).join(" | ")}
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-medium underline"
              onClick={() => setShowSkipped(true)}
            >
              See who
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900">Message example</p>
        <p className="mt-2 whitespace-pre-line rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          {current.data.sampleMessage || "-"}
        </p>
        {summary.unicodeRecipients > 0 ? (
          <p className="mt-2 text-xs text-amber-700">
            {summary.unicodeRecipients} message(s) contain non-English characters (for example a Bangla name) and use more credits.
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        {onBack ? (
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={() => setConfirmOpen(true)} disabled={isSending || !summary.canSend}>
          {isSending ? "Sending..." : actionLabel}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Send to {formatNumber(summary.readyRecipients)} {summary.readyRecipients === 1 ? "member" : "members"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will use {formatNumber(summary.requiredUnits)} SMS credits.
              {dryRun ? " Test mode is on, so nothing is really sent." : " It cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleSend}>Yes, send</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSkipped} onOpenChange={setShowSkipped}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Skipped members</DialogTitle>
            <DialogDescription>These members will not receive this message.</DialogDescription>
          </DialogHeader>
          <ul className="divide-y divide-gray-100 text-sm">
            {current.data.skipped.map((row) => (
              <li key={`${row.memberId}-${row.reason}`} className="flex items-start justify-between gap-3 py-2">
                <span className="font-medium text-gray-800">{row.memberName}</span>
                <span className="text-right text-xs text-amber-700">{row.reason}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
