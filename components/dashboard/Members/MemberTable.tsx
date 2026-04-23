// components/dashboard/Members/MemberTable.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BackendMember } from "@/types/member";
import { HugeiconsIcon } from "@hugeicons/react";
import { MailSend01Icon, UserGroup02Icon, ViewIcon } from "@hugeicons/core-free-icons";

interface MemberTableProps {
  members: BackendMember[];
  onSendSMS?: (member: BackendMember) => void;
  isLoading?: boolean;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
};

const formatCurrency = (amount?: number) => {
  if (amount == null || amount <= 0) return "—";
  return `৳${amount.toLocaleString()}`;
};

const formatSignedBalance = (amount: number, direction: "due" | "advance") => {
  const prefix = direction === "advance" ? "+" : "-";
  return `${prefix}${formatCurrency(amount)}`;
};

const MemberTable: React.FC<MemberTableProps> = ({ members, onSendSMS, isLoading }) => {
  const router = useRouter();

  const handleRowClick = (memberId: string) => {
    router.push(`/dashboard/members/details/${memberId}`);
  };

  const handleViewClick = (e: React.MouseEvent, memberId: string) => {
    e.stopPropagation();
    router.push(`/dashboard/members/details/${memberId}`);
  };

  const handleSMSClick = (e: React.MouseEvent, member: BackendMember) => {
    e.stopPropagation();
    onSendSMS?.(member);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden p-3">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple" />
          <span className="ml-3 text-gray-500">Loading members...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden p-3">
      <div className="overflow-auto">
        <table className="w-full border-separate border-spacing-y-0.5 border border-border-2 rounded-lg px-2">
          <thead>
            <tr>
              <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
                Name
              </th>
              <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
                Member ID
              </th>
              <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
                Phone
              </th>
              <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
                Status
              </th>
              <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
                Next Payment
              </th>
              <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
                Due
              </th>
              <th className="px-6 py-4 text-left text-base font-semibold text-text-primary border-b">
                Payment
              </th>
              <th className="px-6 py-4 text-center text-base font-semibold text-text-primary border-b">
              Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 overflow-y-auto">
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  <HugeiconsIcon icon={UserGroup02Icon} size={24} />
                  No members found
                </td>
              </tr>
            ) : (
              members.map((member, index) => {
                const isActive = member.isActive !== false;
                const dueAmount = member.currentDueAmount ?? 0;
                const hasDue = dueAmount > 0;
                const isImportedMember =
                  Boolean(member.source) &&
                  !["app", "manual"].includes(String(member.source).toLowerCase());
                const nextPayment = member.nextPaymentDate;
                const isOverdue =
                  nextPayment && new Date(nextPayment) < new Date();

                return (
                  <tr
                    key={member._id}
                    onClick={() => handleRowClick(member._id)}
                    className={`transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-primary"
                    } hover:bg-[#F2EEFF] rounded-md cursor-pointer `}
                  >
                    {/* Name with Avatar & Email */}
                    <td className="px-6 py-4 text-sm rounded-l-md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-gray-300 overflow-hidden flex items-center justify-center shrink-0">
                          {member.photo ? (
                            <img
                              src={member.photo}
                              alt={member.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-sm font-semibold">
                              {member.fullName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">
                              {member.fullName}
                            </span>
                            {isImportedMember && (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                Imported
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {member.email || "Not provided"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Member ID */}
                    <td className="px-6 py-4 text-sm text-gray-medium">
                      {member.memberId || "—"}
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4 text-sm text-gray-medium">
                      {member.contact || "Not provided"}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isActive
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Next Payment Date */}
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={
                          isOverdue ? "text-red-600 font-medium" : "text-gray-medium"
                        }
                      >
                        {formatDate(nextPayment)}
                      </span>
                    </td>

                    {/* Due Amount */}
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`font-medium ${
                          hasDue
                            ? "text-red-600"
                            : "text-gray-700"
                        }`}
                      >
                        {hasDue ? formatSignedBalance(dueAmount, "due") : "—"}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          hasDue
                            ? "bg-red-100 text-red-600"
                            : "bg-green-100 text-green-600"
                        }`}
                      >
                        {hasDue ? "Due" : "Complete"}
                      </span>
                    </td>

                    {/* View — eye icon (profile) + mail icon (SMS) */}
                    <td className="px-6 py-4 text-center rounded-r-md">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => handleViewClick(e, member._id)}
                          className="inline-flex items-center justify-center p-2 hover:bg-purple/10 rounded-lg transition-colors"
                          title="View Profile"
                        >
                          <HugeiconsIcon
                            icon={ViewIcon}
                            size={20}
                            className="text-purple"
                          />
                        </button>
                        <button
                          onClick={(e) => handleSMSClick(e, member)}
                          className="inline-flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Send SMS"
                        >
                          <HugeiconsIcon
                            icon={MailSend01Icon}
                            size={20}
                            className="text-gray-600"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MemberTable;
