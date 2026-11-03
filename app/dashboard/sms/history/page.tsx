"use client";

import { useState } from "react";
import { toast } from "sonner";
import SmsHistoryTable from "@/components/dashboard/SMS/SmsHistoryTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSmsAccess } from "@/hooks/useSmsAccess";
import { formatBdDateTime } from "@/lib/utils";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useGetSmsBatchesQuery,
  useGetSmsHistoryQuery,
  useRetrySmsBatchMutation,
} from "@/redux/features/sms/smsApi";
import { SMS_KIND_LABELS, type SmsBatch } from "@/types/sms";

export default function SmsHistoryPage() {
  const { businessId, branchId } = useSmsAccess();
  const scope = { businessId, branchId };

  const [page, setPage] = useState(1);
  const [templateKey, setTemplateKey] = useState("");
  const [open, setOpen] = useState<SmsBatch | null>(null);

  const { data, isLoading } = useGetSmsBatchesQuery({
    ...scope,
    page,
    limit: 15,
    ...(templateKey ? { templateKey } : {}),
  });
  const { data: rows, isLoading: isRowsLoading } = useGetSmsHistoryQuery(
    { ...scope, requestId: open?.requestId, page: 1, limit: 200 },
    { skip: !open },
  );
  const [retry, { isLoading: isRetrying }] = useRetrySmsBatchMutation();

  const totalPages = Math.max(Math.ceil((data?.meta.total ?? 0) / 15), 1);

  const handleRetry = async () => {
    if (!open) return;
    try {
      const result = await retry({ ...scope, requestId: open.requestId }).unwrap();
      toast.success(result.message);
      setOpen(null);
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          &quot;Sent&quot; means your SMS provider accepted the message. It does not prove the phone received it.
        </p>
        <select
          value={templateKey}
          onChange={(event) => {
            setTemplateKey(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All messages</option>
          {Object.entries(SMS_KIND_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <Card className="border-border shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : data?.data.length ? (
            <ul className="divide-y divide-gray-100">
              {data.data.map((batch) => (
                <li key={batch.requestId}>
                  <button
                    type="button"
                    onClick={() => setOpen(batch)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {batch.templateKey ? SMS_KIND_LABELS[batch.templateKey] : "SMS"}
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                          {batch.sendMode === "auto" ? "Automatic" : "By hand"}
                        </span>
                        {batch.simulated > 0 ? (
                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            Test only
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-gray-500">{formatBdDateTime(batch.createdAt)}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-gray-500">{batch.sampleMessage}</p>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>
                        <b className="text-green-700">{batch.sent}</b> sent
                        {batch.failed > 0 ? <b className="ml-2 text-red-600">{batch.failed} failed</b> : null}
                        {batch.skipped > 0 ? <span className="ml-2 text-amber-700">{batch.skipped} skipped</span> : null}
                      </p>
                      <p className="text-xs text-gray-500">{batch.credits} credits</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm text-gray-500">No messages yet.</p>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      ) : null}

      <Sheet open={Boolean(open)} onOpenChange={(value) => !value && setOpen(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{open?.templateKey ? SMS_KIND_LABELS[open.templateKey] : "SMS"}</SheetTitle>
            <SheetDescription>{open ? formatBdDateTime(open.createdAt) : ""}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 p-4 pt-0">
            {open && open.retryable > 0 ? (
              <Button onClick={handleRetry} disabled={isRetrying}>
                {isRetrying ? "Retrying..." : `Retry ${open.retryable} failed`}
              </Button>
            ) : null}
            <SmsHistoryTable records={rows?.data || []} isLoading={isRowsLoading} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
