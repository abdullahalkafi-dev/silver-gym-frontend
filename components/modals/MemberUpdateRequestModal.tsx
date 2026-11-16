"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveUploadAssetUrl } from "@/lib/assetUrl";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useGetMemberUpdateRequestQuery,
  useReviewMemberUpdateRequestMutation,
  type RequestFieldKey,
  type ReviewField,
} from "@/redux/features/memberUpdateRequest/memberUpdateRequestApi";

const FIELD_LABELS: Record<RequestFieldKey, string> = {
  fullName: "Full name",
  email: "Email",
  dateOfBirth: "Date of birth",
  country: "Country",
  nid: "NID",
  gender: "Gender",
  bloodGroup: "Blood group",
  address: "Address",
  height: "Height",
  weight: "Weight",
  emergencyContact: "Emergency contact",
  trainingGoals: "Training goals",
};

const formatValue = (field: RequestFieldKey, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "Empty";

  switch (field) {
    case "dateOfBirth": {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime())
        ? "Empty"
        : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
    case "height":
    case "weight": {
      const v = value as { value: number; unit: string };
      return `${v.value} ${v.unit}`;
    }
    case "emergencyContact": {
      const v = value as { relationship?: string; contactNumber?: string };
      return [v.relationship, v.contactNumber].filter(Boolean).join(" - ") || "Empty";
    }
    case "trainingGoals":
      return (value as string[]).join(", ") || "Empty";
    default:
      return String(value);
  }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  memberId: string;
  memberName?: string;
}

const MemberUpdateRequestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  branchId,
  memberId,
  memberName,
}) => {
  const { data: request, isLoading } = useGetMemberUpdateRequestQuery(
    { branchId, memberId },
    { skip: !isOpen || !branchId || !memberId },
  );
  const [review, { isLoading: isSaving }] = useReviewMemberUpdateRequestMutation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Pre-select everything that would actually change something.
  useEffect(() => {
    if (!request) return;
    const next = new Set<string>();
    request.fields.forEach((f) => f.kind !== "same" && next.add(f.field));
    if (request.photo) next.add("photo");
    setSelected(next);
  }, [request]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const rowCount = useMemo(
    () => (request?.fields.length ?? 0) + (request?.photo ? 1 : 0),
    [request],
  );

  const submit = async (accept: string[]) => {
    if (!request) return;
    try {
      await review({ branchId, requestId: request._id, accept }).unwrap();
      toast.success(
        accept.length === 0
          ? "Request rejected"
          : `Profile updated (${accept.length} change${accept.length > 1 ? "s" : ""})`,
      );
      onClose();
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  const renderField = (item: ReviewField) => {
    const isSame = item.kind === "same";
    return (
      <label
        key={item.field}
        className={`flex items-start gap-3 rounded-xl border p-4 ${
          isSame ? "border-gray-100 bg-gray-50 opacity-70" : "border-gray-200 bg-white"
        }`}
      >
        <Checkbox
          checked={selected.has(item.field)}
          disabled={isSame || isSaving}
          onCheckedChange={() => toggle(item.field)}
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {FIELD_LABELS[item.field]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                item.kind === "add"
                  ? "bg-blue-100 text-blue-700"
                  : item.kind === "change"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-200 text-gray-600"
              }`}
            >
              {item.kind === "add"
                ? "New value"
                : item.kind === "change"
                  ? "Change"
                  : "Already up to date"}
            </span>
          </div>

          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Current</p>
              <p
                className={
                  item.current == null ? "italic text-gray-400" : "text-gray-800"
                }
              >
                {formatValue(item.field, item.current)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Requested</p>
              <p className="font-medium text-purple">
                {formatValue(item.field, item.requested)}
              </p>
            </div>
          </div>

          {item.changedSinceRequest && !isSame ? (
            <p className="mt-2 text-xs text-amber-700">
              This field was edited after the member sent the request (they saw:{" "}
              {formatValue(item.field, item.atRequestTime)}).
            </p>
          ) : null}
        </div>
      </label>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Profile update request{memberName ? ` - ${memberName}` : ""}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-500">Loading request...</p>
        ) : !request || rowCount === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            There is no pending update request for this member.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Tick the changes you want to apply to the member&apos;s profile. Unticked
              changes are rejected. The phone number can never be changed from here.
            </p>

            {request.fields.map(renderField)}

            {request.photo ? (
              <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <Checkbox
                  checked={selected.has("photo")}
                  disabled={isSaving}
                  onCheckedChange={() => toggle("photo")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-900">Profile photo</span>
                  <div className="mt-2 flex gap-6">
                    {[
                      { label: "Current", src: request.photo.current },
                      { label: "Requested", src: request.photo.requested },
                    ].map((p) => (
                      <div key={p.label}>
                        <p className="mb-1 text-xs text-gray-500">{p.label}</p>
                        {p.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveUploadAssetUrl(p.src)}
                            alt={`${p.label} photo`}
                            className="h-24 w-24 rounded-xl border object-cover"
                          />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed text-xs italic text-gray-400">
                            No photo
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </label>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => submit([])}
                disabled={isSaving}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Reject all
              </Button>
              <Button
                onClick={() => submit(Array.from(selected))}
                disabled={isSaving || selected.size === 0}
                className="bg-purple text-white hover:bg-[#6527e0]"
              >
                {isSaving ? "Applying..." : `Apply selected (${selected.size})`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MemberUpdateRequestModal;
