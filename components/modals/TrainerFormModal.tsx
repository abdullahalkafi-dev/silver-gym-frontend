"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useLazyCheckTrainerUsernameQuery,
  type Trainer,
} from "@/redux/features/trainer/trainerApi";

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

export interface TrainerFormValues {
  username: string;
  displayName: string;
  phone: string;
  password: string;
}

interface TrainerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initialData?: Trainer | null;
  onSubmit: (values: TrainerFormValues) => Promise<void> | void;
}

const TrainerFormModal: React.FC<TrainerFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialData,
  onSubmit,
}) => {
  const [form, setForm] = useState<TrainerFormValues>({
    username: "",
    displayName: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameState, setUsernameState] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [checkUsername] = useLazyCheckTrainerUsernameQuery();

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      username: initialData?.username || "",
      displayName: initialData?.displayName || "",
      phone: initialData?.phone || "",
      password: "",
    });
    setError(null);
    setUsernameState("idle");
  }, [isOpen, initialData]);

  // Check the username as the user types (new trainers only)
  useEffect(() => {
    if (mode !== "add") return;
    const value = form.username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(value)) {
      setUsernameState("idle");
      return;
    }
    setUsernameState("checking");
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsername(value).unwrap();
        setUsernameState(result.isAvailable ? "available" : "taken");
      } catch {
        setUsernameState("idle");
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [form.username, mode, checkUsername]);

  const set = (key: keyof TrainerFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.displayName.trim()) return setError("Name is required");
    if (mode === "add") {
      if (!USERNAME_PATTERN.test(form.username.trim().toLowerCase()))
        return setError("Username: 3-30 letters, numbers, dot, dash or underscore");
      if (usernameState === "taken") return setError("This username is already taken");
      if (form.password.length < 6) return setError("Password must be at least 6 characters");
    } else if (form.password && form.password.length < 6) {
      return setError("New password must be at least 6 characters");
    }

    setIsSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the trainer");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Trainer" : "Edit Trainer"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="trainer-name">Name</Label>
            <Input
              id="trainer-name"
              value={form.displayName}
              onChange={set("displayName")}
              placeholder="Trainer full name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trainer-username">Username</Label>
            <Input
              id="trainer-username"
              value={form.username}
              onChange={set("username")}
              disabled={mode === "edit"}
              placeholder="e.g. rahim.trainer"
              autoComplete="off"
            />
            {mode === "add" && usernameState !== "idle" ? (
              <p
                className={`text-xs ${
                  usernameState === "available"
                    ? "text-green-600"
                    : usernameState === "taken"
                      ? "text-red-600"
                      : "text-gray-500"
                }`}
              >
                {usernameState === "checking"
                  ? "Checking..."
                  : usernameState === "available"
                    ? "Username is available"
                    : "Username is taken"}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trainer-phone">Phone (optional)</Label>
            <Input
              id="trainer-phone"
              value={form.phone}
              onChange={set("phone")}
              placeholder="01XXXXXXXXX"
              inputMode="tel"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trainer-password">
              {mode === "add" ? "Password" : "New password (leave empty to keep)"}
            </Label>
            <Input
              id="trainer-password"
              type="text"
              value={form.password}
              onChange={set("password")}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500">
              Share the username and password with the trainer. They sign in at the member portal.
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-purple text-white hover:bg-[#6527e0]"
            >
              {isSaving ? "Saving..." : mode === "add" ? "Create Trainer" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TrainerFormModal;
