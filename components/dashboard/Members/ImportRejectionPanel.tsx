// components/dashboard/Members/ImportRejectionPanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";

interface ImportRejectionPanelProps {
  message: string;
  fileName?: string;
}

type DuplicateEntry = { value: string; rows: number[] };

type ParsedRejection =
  | {
      kind: "duplicates";
      label: string; // e.g. "phone number" | "Member ID"
      columnHint: string;
      entries: DuplicateEntry[];
    }
  | { kind: "generic" };

// Matches `"value" (rows 7, 1625, 1968)` produced by the backend pre-validation.
const DUPLICATE_ENTRY_PATTERN = /"([^"]+)"\s*\(rows?\s+([\d,\s]+)\)/g;

const parseRejection = (message: string): ParsedRejection => {
  const isPhone = /duplicate phone numbers/i.test(message);
  const isMemberId = /duplicate member ids?/i.test(message);
  if (!isPhone && !isMemberId) return { kind: "generic" };

  const entries: DuplicateEntry[] = [];
  for (const match of message.matchAll(DUPLICATE_ENTRY_PATTERN)) {
    const rows = match[2]
      .split(",")
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (rows.length > 1) entries.push({ value: match[1], rows });
  }

  if (entries.length === 0) return { kind: "generic" };

  return isPhone
    ? {
        kind: "duplicates",
        label: "phone number",
        columnHint: "contact / phone",
        entries,
      }
    : {
        kind: "duplicates",
        label: "Member ID",
        columnHint: "member_id",
        entries,
      };
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const ImportRejectionPanel: React.FC<ImportRejectionPanelProps> = ({
  message,
  fileName,
}) => {
  const [copied, setCopied] = useState(false);
  const parsed = useMemo(() => parseRejection(message), [message]);

  const handleCopy = async () => {
    if (parsed.kind !== "duplicates") return;
    const text = parsed.entries
      .map((e) => `${e.value}\trows ${e.rows.join(", ")}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context / permissions); the list is still visible.
    }
  };

  if (parsed.kind === "generic") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-start gap-3">
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={20}
            className="text-red-600 mt-0.5 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-700">
              Import could not be started
            </p>
            <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap wrap-break-word">
              {message}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              No members were imported. Fix the issue in your file and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalRows = parsed.entries.reduce((sum, e) => sum + e.rows.length, 0);

  return (
    <div className="border border-red-200 rounded-xl overflow-hidden bg-white">
      <div className="p-4 bg-red-50">
        <div className="flex items-start gap-3">
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={20}
            className="text-red-600 mt-0.5 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-700">
              File rejected — duplicate {parsed.label}s found
            </p>
            <p className="text-sm text-red-700 mt-1">
              {plural(parsed.entries.length, `${parsed.label} appears`)} more than once,
              across {plural(totalRows, "row")}
              {fileName ? ` in ${fileName}` : ""}.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Nothing was imported. Every {parsed.label} must be unique within a
              branch.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
          Duplicates to fix
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs text-purple hover:underline"
        >
          {copied ? "Copied" : "Copy list"}
        </button>
      </div>

      <div className="m-4 mt-2 rounded-xl border border-red-200 overflow-hidden">
        <div className="max-h-72 overflow-auto">
          <table className="min-w-full divide-y divide-red-100 text-left text-sm">
            <thead className="sticky top-0 bg-red-50 text-xs uppercase tracking-wide text-red-700">
              <tr>
                <th className="px-3 py-2 font-semibold capitalize">{parsed.label}</th>
                <th className="px-3 py-2 font-semibold">Used</th>
                <th className="px-3 py-2 font-semibold">Spreadsheet rows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-50 bg-white">
              {parsed.entries.map((entry) => (
                <tr key={entry.value} className="align-top odd:bg-white even:bg-red-50/30">
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-800">
                    {entry.value}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-red-700">
                    {entry.rows.length}×
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {entry.rows.map((row) => (
                        <span
                          key={row}
                          className="px-1.5 py-0.5 rounded bg-gray-100 text-xs text-gray-700"
                        >
                          {row}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="text-xs font-semibold text-gray-700 mb-1">How to fix</p>
        <ol className="list-decimal list-inside text-xs text-gray-600 space-y-0.5">
          <li>
            Open the file and go to the <b>{parsed.columnHint}</b> column.
          </li>
          <li>
            Row numbers match your spreadsheet (row 1 is the header row).
          </li>
          <li>
            Keep one row per {parsed.label} — correct the wrong entries or
            remove the repeated rows.
          </li>
          <li>Save the file and upload it again with “Try Again”.</li>
        </ol>
      </div>
    </div>
  );
};

export default ImportRejectionPanel;
