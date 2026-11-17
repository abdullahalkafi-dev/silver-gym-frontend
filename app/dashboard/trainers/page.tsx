"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  Edit02Icon,
  Task01Icon,
  UserAdd01Icon,
  UserBlock01Icon,
  UserCheck01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import TrainerFormModal, {
  type TrainerFormValues,
} from "@/components/modals/TrainerFormModal";
import { useUser } from "@/hooks/useUser";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useCreateTrainerMutation,
  useDeleteTrainerMutation,
  useGetTrainersQuery,
  useUpdateTrainerMutation,
  type Trainer,
} from "@/redux/features/trainer/trainerApi";
import { useGetTrainerPlanSummaryQuery } from "@/redux/features/trainerPlan/trainerPlanApi";

const formatDate = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function TrainersPage() {
  const router = useRouter();
  const { activeBranchId, activeBranchName } = useUser();
  const { data: trainers = [], isLoading } = useGetTrainersQuery(activeBranchId || "", {
    skip: !activeBranchId,
  });
  const { data: planSummary = {} } = useGetTrainerPlanSummaryQuery(activeBranchId || "", {
    skip: !activeBranchId,
  });
  const [createTrainer] = useCreateTrainerMutation();
  const [updateTrainer] = useUpdateTrainerMutation();
  const [deleteTrainer, { isLoading: isDeleting }] = useDeleteTrainerMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [selected, setSelected] = useState<Trainer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Trainer | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const openAdd = () => {
    setMode("add");
    setSelected(null);
    setFormOpen(true);
  };

  const openEdit = (trainer: Trainer) => {
    setMode("edit");
    setSelected(trainer);
    setFormOpen(true);
  };

  const handleSubmit = async (values: TrainerFormValues) => {
    if (!activeBranchId) return;
    try {
      if (mode === "add") {
        await createTrainer({
          branchId: activeBranchId,
          payload: {
            username: values.username.trim().toLowerCase(),
            displayName: values.displayName.trim(),
            phone: values.phone.trim() || undefined,
            password: values.password,
          },
        }).unwrap();
        toast.success("Trainer created");
      } else if (selected) {
        await updateTrainer({
          branchId: activeBranchId,
          trainerId: selected.id,
          payload: {
            displayName: values.displayName.trim(),
            phone: values.phone.trim(),
            ...(values.password ? { password: values.password } : {}),
          },
        }).unwrap();
        toast.success("Trainer updated");
      }
    } catch (error) {
      throw new Error(extractApiErrorMessage(error));
    }
  };

  const handleToggle = async (trainer: Trainer) => {
    if (!activeBranchId) return;
    setTogglingId(trainer.id);
    try {
      await updateTrainer({
        branchId: activeBranchId,
        trainerId: trainer.id,
        payload: { isActive: !trainer.isActive },
      }).unwrap();
      toast.success(trainer.isActive ? "Trainer deactivated" : "Trainer activated");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!activeBranchId || !deleteTarget) return;
    try {
      await deleteTrainer({ branchId: activeBranchId, trainerId: deleteTarget.id }).unwrap();
      toast.success("Trainer deleted");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full space-y-6">
        <div className="mb-2">
          <h1 className="mb-1 text-2xl font-semibold text-gray-800">Trainers</h1>
          <p className="text-sm text-gray-500">
            Create trainer logins for {activeBranchName || "this branch"}. Trainers sign in
            at the member portal.
          </p>
        </div>

        <div className="rounded-2xl border-8 border-gray-secondary bg-white p-5">
          <div className="flex items-center justify-between pb-5">
            <h2 className="text-xl font-semibold text-gray-900">
              Trainer List{" "}
              <span className="text-sm font-normal text-gray-500">({trainers.length})</span>
            </h2>
            <Button
              onClick={openAdd}
              disabled={!activeBranchId}
              className="bg-purple text-white hover:bg-[#6527e0]"
            >
              <HugeiconsIcon icon={UserAdd01Icon} size={20} />
              Add Trainer
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 rounded-lg border border-border-2 p-2">
              <thead>
                <tr>
                  {["Name", "Username", "Phone", "Plan Requests", "Last Login", "Status", "Action"].map((h) => (
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
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                      Loading trainers...
                    </td>
                  </tr>
                ) : trainers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                      No trainers yet. Click &quot;Add Trainer&quot; to create the first one.
                    </td>
                  </tr>
                ) : (
                  trainers.map((trainer, index) => (
                    <tr
                      key={trainer.id}
                      className={`rounded-md transition-colors hover:bg-[#F2EEFF] ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-primary"
                      }`}
                    >
                      <td className="rounded-l-md px-6 py-4 text-sm font-medium text-gray-900">
                        <Link
                          href={`/dashboard/trainers/${trainer.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {trainer.displayName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{trainer.username}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {trainer.phone || "Not added"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {(() => {
                          const c = planSummary[trainer.id];
                          if (!c?.total) return <span className="text-gray-400">None yet</span>;
                          return (
                            <Link
                              href={`/dashboard/trainers/${trainer.id}`}
                              className="inline-flex items-center gap-2 hover:underline"
                            >
                              <span className="font-medium text-gray-900">{c.total}</span>
                              {c.pending ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  {c.pending} waiting
                                </span>
                              ) : null}
                            </Link>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(trainer.lastLogin)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            trainer.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {trainer.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="rounded-r-md px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer rounded p-1 transition-colors hover:bg-gray-100">
                              <MoreVertical className="h-5 w-5 text-gray-600" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/trainers/${trainer.id}`)}
                              className="cursor-pointer"
                            >
                              <HugeiconsIcon icon={Task01Icon} className="text-black" />
                              View activity
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEdit(trainer)}
                              className="cursor-pointer"
                            >
                              <HugeiconsIcon icon={Edit02Icon} className="text-black" />
                              Edit / Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggle(trainer)}
                              disabled={togglingId === trainer.id}
                              className="cursor-pointer"
                            >
                              <HugeiconsIcon
                                icon={trainer.isActive ? UserBlock01Icon : UserCheck01Icon}
                                className="text-black"
                              />
                              {trainer.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(trainer)}
                              className="cursor-pointer"
                            >
                              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 text-red-600" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <TrainerFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        mode={mode}
        initialData={selected}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Trainer"
        description="Are you sure you want to delete"
        itemName={deleteTarget?.displayName || ""}
        isLoading={isDeleting}
        confirmText="Delete Trainer"
      />
    </div>
  );
}
