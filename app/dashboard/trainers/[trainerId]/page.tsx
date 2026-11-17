"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Search01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@/hooks/useUser";
import { resolveUploadAssetUrl } from "@/lib/assetUrl";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  CUSTOM_TOPIC_FILTER,
  PLAN_TOPICS,
  useGetTrainerPlanRequestsQuery,
  type PlanRequest,
  type PlanStatus,
} from "@/redux/features/trainerPlan/trainerPlanApi";

const STATUS_LABEL: Record<PlanStatus, string> = {
  pending: "Waiting",
  answered: "Answered",
  declined: "Declined",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<PlanStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  answered: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const STATS: { key: PlanStatus | "all"; label: string; countKey: PlanStatus | "total" }[] = [
  { key: "all", label: "Total requests", countKey: "total" },
  { key: "pending", label: "Waiting", countKey: "pending" },
  { key: "answered", label: "Answered", countKey: "answered" },
  { key: "declined", label: "Declined", countKey: "declined" },
  { key: "cancelled", label: "Cancelled by member", countKey: "cancelled" },
];

const fmtDate = (value?: string | null, withTime = false) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Asia/Dhaka",
  });
};

const StatusBadge = ({ status }: { status: PlanStatus }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
    {STATUS_LABEL[status]}
  </span>
);

export default function TrainerActivityPage() {
  const router = useRouter();
  const { trainerId } = useParams<{ trainerId: string }>();
  const { activeBranchId } = useUser();

  const [status, setStatus] = useState<PlanStatus | "all">("all");
  const [topic, setTopic] = useState("");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PlanRequest | null>(null);

  // Search after a short pause in typing.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data, isFetching, isLoading, error } = useGetTrainerPlanRequestsQuery(
    {
      branchId: activeBranchId || "",
      trainerId,
      status,
      topic: topic || undefined,
      search: search || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      limit: 20,
    },
    { skip: !activeBranchId || !trainerId, refetchOnMountOrArgChange: true },
  );

  const hasFilters = status !== "all" || topic || search || from || to;
  const clearFilters = () => {
    setStatus("all");
    setTopic("");
    setSearchText("");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const trainer = data?.trainer;
  const counts = data?.counts;
  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/dashboard/trainers")}
            className="mt-1 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Back to trainers"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={22} />
          </button>
          <div className="min-w-0">
            <h1 className="mb-1 text-2xl font-semibold text-gray-800">
              {trainer?.displayName || "Trainer"}
              {trainer ? (
                <span
                  className={`ml-3 inline-flex rounded-full px-3 py-1 align-middle text-xs font-medium ${
                    trainer.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {trainer.isActive ? "Active" : "Inactive"}
                </span>
              ) : null}
            </h1>
            <p className="text-sm text-gray-500">
              {trainer ? `@${trainer.username} · Last login ${fmtDate(trainer.lastLogin, true)} · ` : ""}
              Diet and workout plan requests from members (read only).
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
            {extractApiErrorMessage(error)}
          </div>
        ) : null}

        {/* Stats: click to filter */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map(({ key, label, countKey }) => (
            <button
              key={key}
              onClick={() => {
                setStatus(key);
                setPage(1);
              }}
              className={`rounded-2xl border bg-white p-4 text-left transition-colors hover:border-primary ${
                status === key ? "border-primary ring-2 ring-primary/15" : "border-border"
              }`}
            >
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{counts ? counts[countKey] : "—"}</p>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="rounded-2xl border-8 border-gray-secondary bg-white p-5">
          <div className="flex flex-col gap-3 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Requests{" "}
              {meta ? <span className="text-sm font-normal text-gray-500">({meta.total})</span> : null}
            </h2>

            <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
              <div className="relative">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search member name / ID / topic"
                  className="input-primary w-full pl-10 lg:w-64"
                />
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as PlanStatus | "all");
                  setPage(1);
                }}
                className="input-primary w-full lg:w-40"
                aria-label="Status"
              >
                <option value="all">All status</option>
                {(Object.keys(STATUS_LABEL) as PlanStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <select
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setPage(1);
                }}
                className="input-primary w-full lg:w-44"
                aria-label="Topic"
              >
                <option value="">All topics</option>
                {PLAN_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value={CUSTOM_TOPIC_FILTER}>Custom titles</option>
              </select>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                From
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                  className="input-primary w-full lg:w-40"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                To
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                  className="input-primary w-full lg:w-40"
                />
              </label>
              {hasFilters ? (
                <Button variant="outline" onClick={clearFilters} className="h-[42px]">
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table
              className={`w-full border-separate border-spacing-y-2 rounded-lg border border-border-2 p-2 transition-opacity ${
                isFetching && !isLoading ? "opacity-60" : ""
              }`}
            >
              <thead>
                <tr>
                  {["Asked on", "Member", "Topic", "Status", "Answered on", ""].map((h) => (
                    <th
                      key={h}
                      className="border-b px-6 pb-5 pt-3 text-left text-base font-semibold text-text-primary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                      Loading requests...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                      {hasFilters ? "No requests match these filters." : "No member has asked this trainer yet."}
                    </td>
                  </tr>
                ) : (
                  items.map((r, index) => (
                    <tr
                      key={r._id}
                      onClick={() => setSelected(r)}
                      className={`cursor-pointer rounded-md transition-colors hover:bg-primary/5 ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-primary"
                      }`}
                    >
                      <td className="whitespace-nowrap rounded-l-md px-6 py-4 text-sm text-gray-600">
                        {fmtDate(r.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p className="font-medium text-gray-900">{r.memberSnapshot.fullName || "Member"}</p>
                        <p className="text-xs text-gray-500">ID {r.memberSnapshot.memberId || "—"}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {r.topic}
                        {r.isCustomTopic ? <span className="ml-1 text-xs text-gray-400">(custom)</span> : null}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {r.status === "answered" ? fmtDate(r.reply?.sentAt) : "—"}
                      </td>
                      <td className="rounded-r-md px-6 py-4 text-right">
                        <span className="text-sm font-medium text-primary">View</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPage > 1 ? (
            <div className="flex items-center justify-end gap-3 pt-4 text-sm text-gray-600">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span>
                Page {meta.page} of {meta.totalPage}
              </span>
              <Button
                variant="outline"
                disabled={page >= meta.totalPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <RequestDialog request={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function RequestDialog({ request, onClose }: { request: PlanRequest | null; onClose: () => void }) {
  const r = request;
  const s = r?.memberSnapshot;
  const photo = resolveUploadAssetUrl(s?.photo);

  return (
    <Dialog open={Boolean(r)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {r && s ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-3">
                {r.topic}
                <StatusBadge status={r.status} />
              </DialogTitle>
            </DialogHeader>

            {/* Member */}
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
                  {(s.fullName || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{s.fullName || "Member"}</p>
                <p className="text-sm text-gray-500">Member ID {s.memberId || "—"}</p>
              </div>
              <Link
                href={`/dashboard/members/details/${r.memberId}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Open profile
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                ["Height", s.height ? `${s.height} ${s.heightUnit || "cm"}` : "—"],
                ["Weight", s.weight ? `${s.weight} ${s.weightUnit || "kg"}` : "—"],
                ["Age", s.age !== undefined ? `${s.age} years` : "—"],
                ["Gender", s.gender || "—"],
                ["Blood group", s.bloodGroup || "—"],
                ["Asked on", fmtDate(r.createdAt, true)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-medium text-gray-900">{value}</p>
                </div>
              ))}
              {s.trainingGoals?.length ? (
                <div className="col-span-2 rounded-lg bg-gray-50 px-3 py-2 sm:col-span-3">
                  <p className="text-xs text-gray-500">Goals</p>
                  <p className="font-medium text-gray-900">{s.trainingGoals.join(", ")}</p>
                </div>
              ) : null}
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold text-gray-700">What the member wrote</p>
              <p className="whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-800">
                {r.note || "No note."}
              </p>
            </div>

            {r.status === "answered" && r.reply ? (
              <div>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Trainer&apos;s plan{r.reply.title ? `: ${r.reply.title}` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    Sent {fmtDate(r.reply.sentAt, true)}
                    {r.reply.editedAt ? ` · Edited ${fmtDate(r.reply.editedAt, true)}` : ""}
                  </p>
                </div>
                {/* Cleaned on the server (formatting tags only), safe to render. */}
                <div
                  className="plan-content rounded-xl border border-gray-200 p-4"
                  dangerouslySetInnerHTML={{ __html: r.reply.content }}
                />
              </div>
            ) : r.status === "declined" ? (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <p className="font-semibold">Declined {fmtDate(r.closedAt, true)}</p>
                {r.declineReason ? <p className="mt-1">{r.declineReason}</p> : null}
              </div>
            ) : r.status === "cancelled" ? (
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                The member cancelled this request on {fmtDate(r.closedAt, true)}.
              </p>
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Waiting for the trainer to answer.
              </p>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
