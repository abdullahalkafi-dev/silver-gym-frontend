// app/dashboard/members/import-old-members/page.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FileUploadIcon,
  ArrowLeft02Icon,
  Delete02Icon,
  InformationCircleIcon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { useUser } from "@/hooks/useUser";
import { CanAccess } from "@/components/shared/CanAccess";
import {
  useImportCSVMutation,
  useGetImportBatchStatusQuery,
} from "@/redux/features/member/memberApi";

const EXPECTED_COLUMNS = [
  { name: "full_name / name", required: true, description: "Member's full name" },
  { name: "contact / phone", required: true, description: "Phone number" },
  { name: "next_payment_date", required: true, description: "Next due date (YYYY-MM-DD)" },
  { name: "monthly_fee", required: false, description: "Monthly fee amount" },
  { name: "due_amount", required: false, description: "Current due amount" },
  { name: "status", required: false, description: "active / inactive" },
  { name: "member_id", required: false, description: "Legacy member ID" },
];

type ImportState = "idle" | "uploading" | "processing" | "complete" | "error";

export default function ImportOldMembersPage() {
  const router = useRouter();
  const { isOwner, hasPermission, activeBranchId } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [importCSV] = useImportCSVMutation();

  // Poll batch status when processing
  const { data: batchStatus } = useGetImportBatchStatusQuery(
    { branchId: activeBranchId || "", batchId: batchId || "" },
    {
      skip: !batchId || !activeBranchId || importState !== "processing",
      pollingInterval: 2000,
    }
  );

  // Update state when batch completes
  useEffect(() => {
    if (!batchStatus) return;
    if (batchStatus.status === "completed" || batchStatus.status === "failed") {
      setImportState("complete");
    }
  }, [batchStatus]);

  // Block unauthorized access
  useEffect(() => {
    if (!isOwner && !hasPermission("member:create")) {
      router.replace("/dashboard/members");
    }
  }, [isOwner, hasPermission, router]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (f: File): string | null => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      return "Only CSV files are accepted.";
    }
    if (f.size > 5 * 1024 * 1024) {
      return "File size must be under 5MB.";
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    const err = validateFile(droppedFile);
    if (err) {
      setErrorMessage(err);
      return;
    }
    setErrorMessage(null);
    setFile(droppedFile);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const err = validateFile(selectedFile);
    if (err) {
      setErrorMessage(err);
      return;
    }
    setErrorMessage(null);
    setFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setErrorMessage(null);
    setImportState("idle");
    setBatchId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStartImport = async () => {
    if (!file || !activeBranchId) return;

    setImportState("uploading");
    setErrorMessage(null);

    try {
      const result = await importCSV({
        branchId: activeBranchId,
        file,
      }).unwrap();

      if (result._id) {
        setBatchId(result._id);
        setImportState("processing");
      } else {
        setImportState("complete");
      }
    } catch (err: unknown) {
      setImportState("error");
      const apiErr = err as { data?: { message?: string } };
      setErrorMessage(
        apiErr?.data?.message || "Import failed. Please check your CSV format and try again."
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOwner && !hasPermission("member:create")) return null;

  return (
    <div className="min-h-screen">
      <div className="w-full max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/dashboard/members")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Import Old Members
            </h1>
            <p className="text-sm text-gray-500">
              Upload a CSV file to bulk-import existing members
            </p>
          </div>
        </div>

        {/* Expected Columns Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2 mb-3">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={20}
              className="text-blue-600 mt-0.5 flex-shrink-0"
            />
            <div>
              <h3 className="text-sm font-semibold text-blue-800">
                Expected CSV Columns
              </h3>
              <p className="text-xs text-blue-600 mt-0.5">
                Your CSV file should include the following columns. The first row
                must be headers.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXPECTED_COLUMNS.map((col) => (
              <div
                key={col.name}
                className="flex items-start gap-2 text-sm"
              >
                <span
                  className={`inline-block mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    col.required ? "bg-red-500" : "bg-gray-400"
                  }`}
                />
                <div>
                  <span className="font-medium text-gray-700">{col.name}</span>
                  {col.required && (
                    <span className="text-red-500 ml-1 text-xs">*</span>
                  )}
                  <span className="text-gray-500 ml-1 text-xs">
                    — {col.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-6">
          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-purple bg-purple/5"
                  : "border-gray-300 hover:border-purple/50 hover:bg-gray-50"
              }`}
            >
              <HugeiconsIcon
                icon={FileUploadIcon}
                size={48}
                className="text-gray-400 mx-auto mb-4"
              />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Drag & drop your CSV file here
              </p>
              <p className="text-xs text-gray-500 mb-3">or click to browse</p>
              <span className="inline-block px-4 py-2 bg-purple text-white text-sm rounded-md">
                Choose File
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div>
              {/* Selected File */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple/10 rounded-lg flex items-center justify-center">
                    <HugeiconsIcon
                      icon={FileUploadIcon}
                      size={20}
                      className="text-purple"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {importState === "idle" && (
                  <button
                    onClick={handleRemoveFile}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <HugeiconsIcon
                      icon={Delete02Icon}
                      size={18}
                      className="text-gray-500"
                    />
                  </button>
                )}
              </div>

              {/* Progress / Status */}
              {importState === "uploading" && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={20}
                    className="text-blue-600 animate-spin"
                  />
                  <span className="text-sm text-blue-700">
                    Uploading CSV file...
                  </span>
                </div>
              )}

              {importState === "processing" && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      size={20}
                      className="text-blue-600 animate-spin"
                    />
                    <span className="text-sm text-blue-700">
                      Processing import...
                    </span>
                  </div>
                  {batchStatus && (
                    <div className="text-xs text-blue-600">
                      {batchStatus.processedRows != null && (
                        <span>
                          Processed: {batchStatus.processedRows} /{" "}
                          {batchStatus.totalRows || "—"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {importState === "complete" && batchStatus && (
                <div
                  className={`p-4 rounded-xl ${
                    batchStatus.status === "failed"
                      ? "bg-red-50"
                      : "bg-green-50"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <HugeiconsIcon
                      icon={
                        batchStatus.status === "failed"
                          ? AlertCircleIcon
                          : CheckmarkCircle02Icon
                      }
                      size={20}
                      className={
                        batchStatus.status === "failed"
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    />
                    <span
                      className={`text-sm font-medium ${
                        batchStatus.status === "failed"
                          ? "text-red-700"
                          : "text-green-700"
                      }`}
                    >
                      {batchStatus.status === "failed"
                        ? "Import Failed"
                        : "Import Complete"}
                    </span>
                  </div>
                  <div className="text-sm space-y-1 ml-8">
                    {batchStatus.totalRows != null && (
                      <p className="text-gray-600">
                        Total rows: {batchStatus.totalRows}
                      </p>
                    )}
                    {batchStatus.successRows != null && (
                      <p className="text-green-600">
                        Successfully imported: {batchStatus.successRows}
                      </p>
                    )}
                    {batchStatus.failedRows != null &&
                      batchStatus.failedRows > 0 && (
                        <p className="text-red-600">
                          Failed: {batchStatus.failedRows}
                        </p>
                      )}
                  </div>
                  {batchStatus.failuresPreview && batchStatus.failuresPreview.length > 0 && (
                    <div className="mt-3 ml-8">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Failed Rows:
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {batchStatus.failuresPreview.map(
                          (f, idx) => (
                            <p key={idx} className="text-xs text-red-600">
                              Row {f.rowIndex}: {f.reason || "Unknown error"}
                              {f.memberName ? ` (${f.memberName})` : ""}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {importState === "complete" && !batchStatus && (
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      size={20}
                      className="text-green-600"
                    />
                    <span className="text-sm font-medium text-green-700">
                      Import completed successfully
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-red-50 rounded-lg">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                size={18}
                className="text-red-600 mt-0.5 flex-shrink-0"
              />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => router.push("/dashboard/members")}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
          >
            {importState === "complete" ? "Back to Members" : "Cancel"}
          </button>
          {importState === "idle" && file && (
            <CanAccess resource="member" action="create">
              <button
                onClick={handleStartImport}
                className="px-5 py-2.5 bg-purple text-white text-sm rounded-md hover:bg-[#6A3FE0] transition-colors flex items-center gap-2"
              >
                <HugeiconsIcon icon={FileUploadIcon} size={18} />
                Start Import
              </button>
            </CanAccess>
          )}
          {importState === "error" && (
            <button
              onClick={handleRemoveFile}
              className="px-5 py-2.5 bg-purple text-white text-sm rounded-md hover:bg-[#6A3FE0] transition-colors"
            >
              Try Again
            </button>
          )}
          {importState === "complete" && (
            <button
              onClick={() => router.push("/dashboard/members")}
              className="px-5 py-2.5 bg-purple text-white text-sm rounded-md hover:bg-[#6A3FE0] transition-colors"
            >
              View Members
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
