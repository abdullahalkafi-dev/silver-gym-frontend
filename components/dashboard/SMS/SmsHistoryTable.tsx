"use client";

import { formatBdDateTime } from "@/lib/utils";
import { SMS_STATUS_LABEL, SMS_STATUS_STYLE } from "@/lib/sms";
import { SMS_KIND_LABELS, type SmsHistoryRecord } from "@/types/sms";

type SmsHistoryTableProps = {
  records: SmsHistoryRecord[];
  isLoading?: boolean;
  emptyMessage?: string;
  showMemberColumn?: boolean;
};

export default function SmsHistoryTable({
  records,
  isLoading,
  emptyMessage = "No SMS history found yet.",
  showMemberColumn = true,
}: SmsHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Loading SMS history...
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Date</th>
            {showMemberColumn ? <th className="px-4 py-3">Member</th> : null}
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Message</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {records.map((record) => (
            <tr key={record.id}>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                {formatBdDateTime(record.createdAt)}
              </td>
              {showMemberColumn ? (
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{record.memberName}</div>
                  <div className="text-xs text-gray-500">
                    {record.templateKey ? SMS_KIND_LABELS[record.templateKey] : "SMS"}
                  </div>
                </td>
              ) : null}
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{record.recipientPhone || "-"}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${SMS_STATUS_STYLE[record.status]}`}
                >
                  {SMS_STATUS_LABEL[record.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                <p className="line-clamp-2 max-w-[320px] text-sm text-gray-700">
                  {record.renderedMessage}
                </p>
                {record.reason ? <p className="mt-1 text-xs text-amber-700">{record.reason}</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
