"use client";

import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type BillConfirmRow = {
  label: string;
  value: string;
  /** Visual weight: "strong" for totals, "danger" for due, "muted" for secondary info. */
  tone?: "default" | "strong" | "danger" | "muted";
};

interface BillConfirmModalProps {
  isOpen: boolean;
  title?: string;
  memberName?: string;
  memberDisplayId?: string;
  /** Short line under the member name, e.g. "Monthly · Dec 2027". */
  summary?: string;
  /** Sections of label/value rows; a divider is drawn between sections. */
  sections: BillConfirmRow[][];
  warnings?: string[];
  confirmLabel: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Final review step before any bill / due payment is written.
 * Billing entries cannot be edited or deleted from the UI, so the admin
 * must see exactly what will be saved before the API is called.
 */
export default function BillConfirmModal({
  isOpen,
  title = "Confirm Bill",
  memberName,
  memberDisplayId,
  summary,
  sections,
  warnings = [],
  confirmLabel,
  isLoading = false,
  onConfirm,
  onClose,
}: BillConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={isLoading ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-confirm-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id="bill-confirm-title" className="text-base font-semibold text-gray-900">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Please check the details. Saved bills cannot be changed later.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {(memberName || memberDisplayId) && (
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{memberName || "Member"}</p>
              <p className="mt-0.5 text-xs text-gray-600">
                {memberDisplayId ? `ID: ${memberDisplayId}` : null}
                {memberDisplayId && summary ? " · " : null}
                {summary}
              </p>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((warning) => (
                <div
                  key={warning}
                  className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {sections
            .filter((rows) => rows.length > 0)
            .map((rows, sectionIndex) => (
              <dl
                key={sectionIndex}
                className={cn(
                  "space-y-2",
                  sectionIndex > 0 && "border-t border-gray-100 pt-4",
                )}
              >
                {rows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                    <dt className={cn("text-gray-500", row.tone === "strong" && "font-semibold text-gray-700")}>
                      {row.label}
                    </dt>
                    <dd
                      className={cn(
                        "text-right font-medium text-gray-800",
                        row.tone === "strong" && "font-semibold text-gray-900",
                        row.tone === "danger" && "font-semibold text-red-600",
                        row.tone === "muted" && "font-normal text-gray-600",
                      )}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ))}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
          >
            {isLoading ? "Saving..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
