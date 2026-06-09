// components/modals/EditMemberModal.tsx
"use client";

import { startTransition, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { BackendMember, TrainingGoal } from "@/types/member";
import { useUpdateMemberMutation } from "@/redux/features/member/memberApi";

const TRAINING_GOALS: TrainingGoal[] = [
  "Yoga",
  "Cardio Endurance",
  "Bodybuilding",
  "Muscle Gain",
  "Flexibility & Mobility",
  "General Fitness",
  "Strength Training",
];

const HEIGHT_UNITS = ["cm", "in", "ft"] as const;
const WEIGHT_UNITS = ["kg", "lb"] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+()\-\s]{7,20}$/;
const NID_REGEX = /^[0-9A-Za-z-]{6,25}$/;

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: BackendMember;
  branchId: string;
}

type FormState = {
  memberId: string;
  contact: string;
  fullName: string;
  email: string;
  dateOfBirth: string;
  emergencyContact: string;
  nid: string;
  height: string;
  heightUnit: "cm" | "in" | "ft";
  gender: string;
  weight: string;
  weightUnit: "kg" | "lb";
  address: string;
  trainingGoals: TrainingGoal[];
};

type ValidatedField =
  | "fullName"
  | "email"
  | "dateOfBirth"
  | "emergencyContact"
  | "nid"
  | "height"
  | "weight";

type FormErrors = Partial<Record<ValidatedField, string>>;

const VALIDATED_FIELDS: ValidatedField[] = [
  "fullName",
  "email",
  "dateOfBirth",
  "emergencyContact",
  "nid",
  "height",
  "weight",
];

const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  branchId,
}) => {
  const [updateMember, { isLoading }] = useUpdateMemberMutation();

  const [form, setForm] = useState<FormState>({
    memberId: "",
    contact: "",
    fullName: "",
    email: "",
    dateOfBirth: "",
    emergencyContact: "",
    nid: "",
    height: "",
    heightUnit: "cm",
    gender: "",
    weight: "",
    weightUnit: "kg",
    address: "",
    trainingGoals: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form with member data whenever modal opens
  useEffect(() => {
    if (isOpen && member) {
      startTransition(() => {
        setForm({
          memberId: member.memberId || "",
          contact: member.contact || "",
          fullName: member.fullName || "",
          email: member.email || "",
          dateOfBirth: member.dateOfBirth
            ? member.dateOfBirth.slice(0, 10)
            : "",
          emergencyContact: member.emergencyContact?.contactNumber || "",
          nid: member.nid || "",
          height: member.height != null ? String(member.height) : "",
          heightUnit: member.heightUnit || "cm",
          gender: member.gender || "",
          weight: member.weight != null ? String(member.weight) : "",
          weightUnit: member.weightUnit || "kg",
          address: member.address || "",
          trainingGoals: (member.trainingGoals as TrainingGoal[]) || [],
        });
        setErrors({});
        setPhotoFile(null);
        setPhotoPreview(null);
      });
    }
  }, [isOpen, member]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const validateField = (
    field: ValidatedField,
    nextForm: FormState = form
  ): string | undefined => {
    const fullName = nextForm.fullName.trim();
    const email = nextForm.email.trim();
    const dateOfBirth = nextForm.dateOfBirth.trim();
    const emergencyContact = nextForm.emergencyContact.trim();
    const nid = nextForm.nid.trim();
    const height = nextForm.height.trim();
    const weight = nextForm.weight.trim();

    switch (field) {
      case "fullName":
        if (!fullName) {
          return "Full name is required";
        }
        if (fullName.length < 2) {
          return "Full name must be at least 2 characters";
        }
        return undefined;
      case "email":
        if (email && !EMAIL_REGEX.test(email)) {
          return "Enter a valid email address";
        }
        return undefined;
      case "dateOfBirth":
        if (!dateOfBirth) {
          return undefined;
        }

        {
          const parsedDate = new Date(dateOfBirth);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (Number.isNaN(parsedDate.getTime())) {
            return "Enter a valid date of birth";
          }

          if (parsedDate > today) {
            return "Date of birth cannot be in the future";
          }
        }

        return undefined;
      case "emergencyContact":
        if (emergencyContact && !PHONE_REGEX.test(emergencyContact)) {
          return "Enter a valid emergency contact number";
        }
        return undefined;
      case "nid":
        if (nid && !NID_REGEX.test(nid)) {
          return "NID can only contain letters, numbers, and hyphens";
        }
        return undefined;
      case "height":
        if (!height) {
          return undefined;
        }

        {
          const parsedHeight = Number(height);
          if (!Number.isFinite(parsedHeight)) {
            return "Height must be a number";
          }
          if (parsedHeight <= 0) {
            return "Height must be greater than 0";
          }
        }

        return undefined;
      case "weight":
        if (!weight) {
          return undefined;
        }

        {
          const parsedWeight = Number(weight);
          if (!Number.isFinite(parsedWeight)) {
            return "Weight must be a number";
          }
          if (parsedWeight <= 0) {
            return "Weight must be greater than 0";
          }
        }

        return undefined;
      default:
        return undefined;
    }
  };

  const updateFieldErrors = (
    fields: ValidatedField[],
    nextForm: FormState = form
  ) => {
    setErrors((prev) => {
      const nextErrors = { ...prev };

      fields.forEach((field) => {
        const message = validateField(field, nextForm);
        if (message) {
          nextErrors[field] = message;
        } else {
          delete nextErrors[field];
        }
      });

      return nextErrors;
    });
  };

  const validateForm = (nextForm: FormState = form) => {
    const nextErrors: FormErrors = {};

    VALIDATED_FIELDS.forEach((field) => {
      const message = validateField(field, nextForm);
      if (message) {
        nextErrors[field] = message;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleBlur = (field: ValidatedField) => {
    updateFieldErrors([field]);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormState;
    const nextForm = { ...form, [fieldName]: value };

    setForm(nextForm);

    if (
      [
        "fullName",
        "email",
        "dateOfBirth",
        "emergencyContact",
        "nid",
        "height",
        "weight",
      ].includes(fieldName) &&
      errors[fieldName as ValidatedField]
    ) {
      updateFieldErrors([fieldName as ValidatedField], nextForm);
    }
  };

  const toggleGoal = (goal: TrainingGoal) => {
    setForm((prev) => ({
      ...prev,
      trainingGoals: prev.trainingGoals.includes(goal)
        ? prev.trainingGoals.filter((g) => g !== goal)
        : [...prev.trainingGoals, goal],
    }));
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please correct the highlighted fields");
      return;
    }

    const trimmedFullName = form.fullName.trim();
    const trimmedMemberId = form.memberId.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    const trimmedEmergencyContact = form.emergencyContact.trim();
    const trimmedNid = form.nid.trim();
    const trimmedAddress = form.address.trim();

    const payload = {
      contact: form.contact.trim() || undefined,
      memberId: trimmedMemberId || undefined,
      fullName: trimmedFullName,
      email: trimmedEmail || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      emergencyContact: trimmedEmergencyContact
        ? {
            relationship: member.emergencyContact?.relationship || "Other",
            contactNumber: trimmedEmergencyContact,
          }
        : undefined,
      nid: trimmedNid || undefined,
      height: form.height.trim() ? Number(form.height) : undefined,
      heightUnit: form.height.trim() ? form.heightUnit : undefined,
      gender: form.gender || undefined,
      weight: form.weight.trim() ? Number(form.weight) : undefined,
      weightUnit: form.weight.trim() ? form.weightUnit : undefined,
      address: trimmedAddress || undefined,
      trainingGoals: form.trainingGoals,
    };

    try {
      await updateMember({
        branchId,
        memberId: member._id,
        payload,
        photo: photoFile || undefined,
      }).unwrap();
      toast.success("Member updated successfully");
      onClose();
    } catch (err: any) {
      const message =
        err?.data?.errorSources?.[0]?.message ||
        err?.data?.message ||
        "Failed to update member. Please try again.";
      toast.error(message);
    }
  };

  const getInputCls = (field?: ValidatedField) =>
    `w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm bg-white ${
      field && errors[field]
        ? "border-red-400 focus:ring-red-100"
        : "border-gray-300 focus:ring-purple"
    }`;
  const getSelectCls = (field?: ValidatedField) =>
    `px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm bg-white ${
      field && errors[field]
        ? "border-red-400 focus:ring-red-100"
        : "border-gray-300 focus:ring-purple"
    }`;
  const labelCls = "block text-sm text-gray-500 mb-1.5";

  const avatarSrc = photoPreview || member.photo || null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/30 backdrop-blur-sm" />
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            {/* Clickable avatar with camera overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-12 h-12 rounded-full bg-orange-400 flex items-center justify-center overflow-hidden shrink-0 group cursor-pointer"
              title="Change photo"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={member.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-lg font-bold">
                  {member.fullName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {member.fullName}
              </h2>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  member.isActive !== false
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {member.isActive !== false ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="ml-auto text-sm text-gray-500">
              ID:{" "}
              <span className="font-mono font-medium text-gray-700">
                {member.memberId || "N/A"}
              </span>
            </div>
          </div>
          <h3 className="text-base font-semibold text-gray-800 mt-3">
            Personal Information
          </h3>
        </div>

        {/* Form Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Row 0: Member ID + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Member ID</label>
              <input
                name="memberId"
                value={form.memberId}
                onChange={handleChange}
                placeholder="e.g. MEM-001"
                className={getInputCls()}
              />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="e.g. 01XXXXXXXXX"
                className={getInputCls()}
              />
            </div>
          </div>

          {/* Row 1: Full Name */}
          <div>
            <label className={labelCls}>
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              onBlur={() => handleBlur("fullName")}
              aria-invalid={Boolean(errors.fullName)}
              className={getInputCls("fullName")}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
            )}
          </div>

          {/* Row 2: Email + Date of Birth */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>E-mail</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                onBlur={() => handleBlur("email")}
                aria-invalid={Boolean(errors.email)}
                className={getInputCls("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
                onBlur={() => handleBlur("dateOfBirth")}
                aria-invalid={Boolean(errors.dateOfBirth)}
                className={getInputCls("dateOfBirth")}
              />
              {errors.dateOfBirth && (
                <p className="mt-1 text-xs text-red-500">{errors.dateOfBirth}</p>
              )}
            </div>
          </div>

          {/* Row 3: Emergency Contact + NID */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Emergency Contact</label>
              <input
                name="emergencyContact"
                value={form.emergencyContact}
                onChange={handleChange}
                onBlur={() => handleBlur("emergencyContact")}
                aria-invalid={Boolean(errors.emergencyContact)}
                className={getInputCls("emergencyContact")}
              />
              {errors.emergencyContact && (
                <p className="mt-1 text-xs text-red-500">{errors.emergencyContact}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>NID</label>
              <input
                name="nid"
                value={form.nid}
                onChange={handleChange}
                onBlur={() => handleBlur("nid")}
                aria-invalid={Boolean(errors.nid)}
                className={getInputCls("nid")}
              />
              {errors.nid && (
                <p className="mt-1 text-xs text-red-500">{errors.nid}</p>
              )}
            </div>
          </div>

          {/* Row 4: Height + Gender + Weight */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Height</label>
              <div className="flex gap-2">
                <input
                  name="height"
                  value={form.height}
                  onChange={handleChange}
                  onBlur={() => handleBlur("height")}
                  aria-invalid={Boolean(errors.height)}
                  className={`${getInputCls("height")} flex-1`}
                  placeholder="0"
                />
                <select
                  name="heightUnit"
                  value={form.heightUnit}
                  onChange={handleChange}
                  className={getSelectCls()}
                >
                  {HEIGHT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              {errors.height && (
                <p className="mt-1 text-xs text-red-500">{errors.height}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={`${getSelectCls()} w-full`}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Weight</label>
              <div className="flex gap-2">
                <input
                  name="weight"
                  value={form.weight}
                  onChange={handleChange}
                  onBlur={() => handleBlur("weight")}
                  aria-invalid={Boolean(errors.weight)}
                  className={`${getInputCls("weight")} flex-1`}
                  placeholder="0"
                />
                <select
                  name="weightUnit"
                  value={form.weightUnit}
                  onChange={handleChange}
                  className={getSelectCls()}
                >
                  {WEIGHT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              {errors.weight && (
                <p className="mt-1 text-xs text-red-500">{errors.weight}</p>
              )}
            </div>
          </div>

          {/* Row 5: Address */}
          <div>
            <label className={labelCls}>Address</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className={getInputCls()}
            />
          </div>

          {/* Training Goals */}
          <div>
            <label className={labelCls}>Training Goals</label>
            <div className="grid grid-cols-3 gap-3">
              {TRAINING_GOALS.map((goal) => (
                <label
                  key={goal}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.trainingGoals.includes(goal)}
                    onChange={() => toggleGoal(goal)}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  <span className="text-sm text-gray-700">{goal}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2.5 text-sm bg-purple text-white rounded-lg hover:bg-purple/90 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberModal;
