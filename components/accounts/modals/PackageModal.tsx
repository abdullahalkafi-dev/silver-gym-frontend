"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { colorPalette } from "@/lib/utils";
import type {
  GymPackage,
  PackageDurationType,
  PackageFormPayload,
} from "@/types/package";

const durationTypeOptions: Array<{
  value: PackageDurationType;
  label: string;
}> = [
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
  { value: "month", label: "Months" },
  { value: "year", label: "Years" },
];

type PackageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  package?: GymPackage | null;
  onSubmit: (payload: PackageFormPayload) => void | Promise<void>;
  isSubmitting?: boolean;
};

type PackageFormState = {
  title: string;
  description: string;
  duration: string;
  durationType: PackageDurationType;
  amount: string;
  color: string;
  includeAdmissionFee: boolean;
};

const buildInitialState = (pkg?: GymPackage | null): PackageFormState => ({
  title: pkg?.title || "",
  description: pkg?.description || "",
  duration: pkg ? String(pkg.duration) : "",
  durationType: pkg?.durationType || "month",
  amount: pkg ? String(pkg.amount) : "",
  color: pkg?.color || "#7C3AED",
  includeAdmissionFee: pkg?.includeAdmissionFee || false,
});

export const PackageModal = ({
  isOpen,
  onClose,
  package: pkg,
  onSubmit,
  isSubmitting = false,
}: PackageModalProps) => {
  const [formState, setFormState] = useState<PackageFormState>(() =>
    buildInitialState(pkg),
  );
  const [isColorSelectOpen, setIsColorSelectOpen] = useState(false);
  const isEditMode = Boolean(pkg);

  const updateField = <T extends keyof PackageFormState>(
    field: T,
    value: PackageFormState[T],
  ) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.title.trim()) {
      toast.error("Package title is required");
      return;
    }

    const duration = Number(formState.duration);
    if (!Number.isFinite(duration) || duration < 1) {
      toast.error("Duration must be at least 1");
      return;
    }

    const amount = Number(formState.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Amount must be a valid non-negative number");
      return;
    }

    await onSubmit({
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      duration,
      durationType: formState.durationType,
      amount,
      color: formState.color,
      includeAdmissionFee: formState.includeAdmissionFee,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Package" : "Create Package"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the package details used for branch memberships."
              : "Create a new branch package with pricing, duration, and whether the branch admission fee should apply."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="package-title">Title</Label>
            <Input
              id="package-title"
              value={formState.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Type package name"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="package-description">Description</Label>
            <Textarea
              id="package-description"
              value={formState.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Add a short description for this package"
              className="mt-1.5 min-h-24"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="package-duration">Duration</Label>
              <Input
                id="package-duration"
                type="number"
                min="1"
                value={formState.duration}
                onChange={(event) => updateField("duration", event.target.value)}
                placeholder="Enter duration"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="package-duration-type">Duration Type</Label>
              <Select
                value={formState.durationType}
                onValueChange={(value) =>
                  updateField("durationType", value as PackageDurationType)
                }
              >
                <SelectTrigger id="package-duration-type" className="mt-1.5 w-full">
                  <SelectValue placeholder="Select duration type" />
                </SelectTrigger>
                <SelectContent>
                  {durationTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="package-amount">Amount</Label>
              <Input
                id="package-amount"
                type="number"
                min="0"
                value={formState.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                placeholder="Type package amount"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Select Color</Label>
              <div className="relative mt-1.5">
                <button
                  type="button"
                  onClick={() => setIsColorSelectOpen((open) => !open)}
                  className="flex h-10 w-full items-center gap-3 rounded-md border border-input bg-background px-3 text-left"
                >
                  <span
                    className="inline-flex h-5 w-5 rounded border border-gray-200"
                    style={{ backgroundColor: formState.color }}
                  />
                  <span className="truncate text-sm">{formState.color}</span>
                  <span className="ml-auto text-xs text-gray-500">Select</span>
                </button>

                {isColorSelectOpen ? (
                  <div className="absolute z-50 mt-2 w-full rounded-md border bg-white p-3 shadow-lg">
                    <div className="grid grid-cols-9 gap-2">
                      {colorPalette.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            updateField("color", color);
                            setIsColorSelectOpen(false);
                          }}
                          className={`h-8 w-8 rounded transition-transform hover:scale-110 ${
                            formState.color === color ? "ring-2 ring-gray-900 ring-offset-2" : ""
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="include-admission-fee">Include Admission Fee</Label>
                <p className="mt-1 text-xs text-gray-500">
                  Choose whether this package should include the admission fee.
                </p>
              </div>
              <Switch
                id="include-admission-fee"
                checked={formState.includeAdmissionFee}
                onCheckedChange={(checked) =>
                  updateField("includeAdmissionFee", checked)
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                  ? "Save Changes"
                  : "Create Package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
