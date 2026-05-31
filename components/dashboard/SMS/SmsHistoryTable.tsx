"use client";

import { formatBdDateTime } from "@/lib/utils";
import { SmsHistoryRecord } from "@/types/sms";

type SmsHistoryTableProps = {
  records: SmsHistoryRecord[];
  isLoading?: boolean;
  emptyMessage?: string;
  showMemberColumn?: boolean;
};

const statusStyles: Record<SmsHistoryRecord["status"], string> = {
  simulated: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  blocked: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
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
            <th className="px-4 py-3">Mode</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Message</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {records.map((record) => (
            <tr key={record.id}>
              <td className="px-4 py-3 text-gray-600">{formatBdDateTime(record.createdAt)}</td>
              {showMemberColumn ? (
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{record.memberName}</div>
                  <div className="text-xs text-gray-500">{record.requestId.slice(0, 8)}</div>
                </td>
              ) : null}
              <td className="px-4 py-3 text-gray-600">{record.recipientPhone || "—"}</td>
              <td className="px-4 py-3 text-gray-600">
                <span className="capitalize">{record.sendMode}</span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[record.status]}`}>
                  {record.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                <p className="line-clamp-2 max-w-[320px] text-sm text-gray-700">
                  {record.renderedMessage}
                </p>
                {record.reason ? (
                  <p className="mt-1 text-xs text-amber-700">{record.reason}</p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
