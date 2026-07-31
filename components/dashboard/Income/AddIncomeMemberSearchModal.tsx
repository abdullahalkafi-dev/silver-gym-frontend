// components/dashboard/Income/AddIncomeMemberSearchModal.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useGetBranchMembersQuery } from "@/redux/features/member/memberApi";
import type { BackendMember } from "@/types/member";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Compute months overdue from nextPaymentDate.
 * Returns e.g. "3 Months" if 3+ months overdue, otherwise "—".
 */
function computeDueDuration(member: BackendMember): string {
  if (!member.currentDueAmount || member.currentDueAmount <= 0) return "—";
  if (!member.nextPaymentDate) return "—";

  const today = new Date();
  const nextPayment = new Date(member.nextPaymentDate);
  if (nextPayment >= today) return "—";

  const diffMs = today.getTime() - nextPayment.getTime();
  const months = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  if (months <= 0) return "—";
  return `${months} Month${months > 1 ? "s" : ""}`;
}

// ─── Simple debounce hook ────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Skeleton row ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-3.5 w-16 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3.5 w-24 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-200 rounded-full" /></td>
      <td className="px-4 py-3"><div className="h-3.5 w-14 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-200 rounded-full" /></td>
    </tr>
  );
}

// ─── Member row ──────────────────────────────────────────────────────────────

function MemberRow({
  member,
  onClick,
}: {
  member: BackendMember;
  onClick: (m: BackendMember) => void;
}) {
  const dueDuration = computeDueDuration(member);
  const hasDue =
    member.currentDueAmount !== undefined && member.currentDueAmount > 0;

  return (
    <tr
      className="hover:bg-[#F2EEFF] cursor-pointer transition-colors border-b border-gray-100 last:border-0"
      onClick={() => onClick(member)}
    >
      {/* Name + avatar */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {member.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.photo}
              alt={member.fullName}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-purple/10 text-purple text-xs font-bold flex items-center justify-center shrink-0">
              {getInitials(member.fullName)}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 leading-snug">
              {member.fullName}
            </p>
            {member.email && (
              <p className="text-xs text-gray-400 leading-snug">
                {member.email}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Member ID */}
      <td className="px-4 py-3 text-sm text-gray-600">
        {member.memberId || "—"}
      </td>

      {/* Phone */}
      <td className="px-4 py-3 text-sm text-gray-600">
        {member.contact ?? "—"}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            member.isActive
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-gray-100 text-gray-600 border border-gray-200"
          }`}
        >
          {member.isActive ? "Active" : "Inactive"}
        </span>
      </td>

      {/* Due Duration */}
      <td className="px-4 py-3 text-sm text-gray-600">{dueDuration}</td>

      {/* Payment badge */}
      <td className="px-4 py-3">
        <span
          className={`text-sm font-medium ${
            hasDue ? "text-red-500" : "text-green-600"
          }`}
        >
          {hasDue ? "Due" : "Complete"}
        </span>
      </td>
    </tr>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

interface AddIncomeMemberSearchModalProps {
  onClose: () => void;
  isOpen?: boolean;
  isEmbedded?: boolean;
}

export default function AddIncomeMemberSearchModal({
  onClose,
  isEmbedded = false,
}: AddIncomeMemberSearchModalProps) {
  const router = useRouter();
  const { activeBranchId } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data, isLoading, isFetching } = useGetBranchMembersQuery(
    {
      branchId: activeBranchId!,
      searchTerm: debouncedSearch || undefined,
      includeInactive: "true",
      limit: 20,
    },
    { skip: !activeBranchId || debouncedSearch.trim().length === 0 },
  );

  const members = data?.data ?? [];
  const showSkeleton =
    debouncedSearch.trim().length > 0 && (isLoading || isFetching);

  const handleMemberClick = useCallback(
    (member: BackendMember) => {
      router.push(`/dashboard/income/create-bill/${member._id}`);
      onClose();
    },
    [router, onClose],
  );

  const modalBodyContent = (
    <div className="flex flex-col space-y-4 pt-1">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search By User ID / Name / Phone Number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 h-11 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple transition-colors"
        />
      </div>

      {/* Body */}
      <div className="overflow-y-auto max-h-[50vh]">
        {debouncedSearch.trim().length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center">
              <Search className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">
                Start Billing by Searching Records
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Type member name, ID, or phone number above
              </p>
            </div>
          </div>
        )}

        {debouncedSearch.trim().length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {showSkeleton ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                      No members found matching &quot;{debouncedSearch}&quot;
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <MemberRow
                      key={member._id}
                      member={member}
                      onClick={handleMemberClick}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return modalBodyContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 z-10 flex flex-col max-h-[85vh] p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Member Income</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {modalBodyContent}
      </div>
    </div>
  );
}
