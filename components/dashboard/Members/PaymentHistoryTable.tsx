// components/dashboard/Members/PaymentHistoryTable.tsx
"use client";

import { PaymentRecord } from "@/types/member";

interface PaymentHistoryTableProps {
  records: PaymentRecord[];
  isLoading?: boolean;
  emptyMessage?: string;
  memberDisplayId?: string;
}

const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
  records,
  isLoading = false,
  emptyMessage = "No payment history available yet.",
  memberDisplayId,
}) => {
  const getStatusClasses = (status: string) => {
    switch (status.toLowerCase()) {
      case "due":
        return "bg-red-100 text-red-600";
      case "partial":
        return "bg-orange-100 text-orange-700";
      case "cancelled":
      case "refunded":
        return "bg-gray-200 text-gray-600";
      default:
        return "bg-green-100 text-green-600";
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Date & Time
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Invoice NO
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Member ID
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Period
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Entry
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                Loading payment history...
              </td>
            </tr>
          ) : records.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            records.map((record) => (
              <tr
                key={record.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-4 text-sm text-gray-700">
                  {record.dateTime}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700">
                  {record.isImportedOpeningBalance ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      Imported
                    </span>
                  ) : (
                    record.invoiceNo
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700">
                  {memberDisplayId || record.memberId}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700">
                  {record.month}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700">
                  {record.package}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700">
                  {record.amount}
                </td>
                <td className="px-4 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                      record.status
                    )}`}
                  >
                    {record.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentHistoryTable;
