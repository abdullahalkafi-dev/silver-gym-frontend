// components/modals/AddIncomeModal.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "../ui/input";
import Modal from "../ui/modal";
import { BackendMember } from "@/types/member";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import { useGetBranchMembersQuery } from "@/redux/features/member/memberApi";

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddIncomeModal({
  isOpen,
  onClose,
}: AddIncomeModalProps) {
  const router = useRouter();
  const { activeBranchId } = useUser();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch members from API
  const { data: memberData, isLoading: membersLoading } =
    useGetBranchMembersQuery(
      {
        branchId: activeBranchId || "",
        ...(searchQuery ? { searchTerm: searchQuery } : {}),
        page: 1,
        limit: 50,
      },
      { skip: !activeBranchId || !isOpen }
    );

  const members = memberData?.data || [];

  const handleMemberSelect = (member: BackendMember) => {
    onClose();
    router.push(`/dashboard/income/create-bill/${member._id}`);
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Income"
      className="max-w-4xl"
    >
      <div>
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search by User ID / Name / Phone Number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-12"
          />
        </div>

        {searchQuery === "" ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full text-gray-medium flex items-center justify-center">
              <HugeiconsIcon icon={Search01Icon} size={64} />
            </div>
            <h3 className="text-lg font-semibold text-gray-medium mb-2">
              Start Billing by Searching Records
            </h3>
            <p className="text-sm text-gray-500">
              Start typing a member&apos;s name, phone number or ID to quickly
              <br />
              find the right person and continue billing
            </p>
          </div>
        ) : membersLoading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <p className="text-sm text-gray-500 mt-4">Searching members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <HugeiconsIcon icon={Search01Icon} size={48} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Members Found
            </h3>
            <p className="text-sm text-gray-500 mb-1">
              We couldn&apos;t find any members matching &quot;{searchQuery}&quot;
            </p>
            <p className="text-xs text-gray-400">
              Try searching with a different name, phone number, or member ID
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-6 gap-4 px-4 py-2 text-xs font-semibold text-gray-600 border-b border-gray-200">
              <div className="col-span-2">Name</div>
              <div>Member ID</div>
              <div>Phone</div>
              <div>Status</div>
              <div>Payment</div>
            </div>
            {members.map((member) => (
              <div
                key={member._id}
                onClick={() => handleMemberSelect(member)}
                className="grid grid-cols-6 gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 items-center"
              >
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
                    {member.photo ? (
                      <Image
                        src={member.photo}
                        alt={member.fullName}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      member.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {member.fullName}
                    </p>
                    <p className="text-xs text-gray-500">{member.email || "N/A"}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-700">{member.memberId || "N/A"}</div>
                <div className="text-sm text-gray-700">{member.contact || "N/A"}</div>
                <div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      member.isActive
                        ? "bg-blue-50 text-blue-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {member.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div>
                  <span
                    className={`text-xs font-medium ${
                      (member.currentDueAmount ?? 0) > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {(member.currentDueAmount ?? 0) > 0 ? "Due" : "Complete"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}


