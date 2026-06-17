// app/dashboard/members/add-member/page.tsx
"use client";

import { startTransition, useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Upload04Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { addDays, addWeeks, addYears, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { InputWithUnit } from "@/components/ui/input-with-unit";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import {
  MonthGrid,
  type MonthYear,
  toIndex,
  fromIndex,
  buildRange,
} from "@/components/dashboard/Members/MonthGrid";
import { DurationCalendar } from "@/components/dashboard/Members/DurationCalendar";
import { useBranchFeeSetupGuard } from "@/components/dashboard/BranchFeeSetupGuard";
import { useUser } from "@/hooks/useUser";
import { useCreateMemberMutation } from "@/redux/features/member/memberApi";
import {
  useGetBranchPackagesQuery,
  useCreateBranchPackageMutation,
} from "@/redux/features/package/packageApi";
import { PackageModal } from "@/components/accounts/modals/PackageModal";
import type { PackageFormPayload } from "@/types/package";
import {
  useGetBranchAdmissionFeeQuery,
  useGetBranchMonthlyFeeQuery,
} from "@/redux/features/branch/branchApi";
import type {
  CreateMemberPayload,
  PaymentMethod,
  TrainingGoal,
} from "@/types/member";
import type { GymPackage } from "@/types/package";
import { useGetBusinessProfileQuery } from "@/redux/features/profile/profileApi";
import { openMemberInvoice } from "@/lib/memberInvoice";

// ─── Constants ──────────────────────────────────────────────────────

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

const TRAINING_GOALS: TrainingGoal[] = [
  "Yoga",
  "Cardio Endurance",
  "Bodybuilding",
  "Muscle Gain",
  "Flexibility & Mobility",
  "General Fitness",
  "Strength Training",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const HEIGHT_UNITS = [
  { value: "cm", label: "cm" },
  { value: "in", label: "In" },
  { value: "ft", label: "ft" },
];

const WEIGHT_UNITS = [
  { value: "kg", label: "KG" },
  { value: "lb", label: "LB" },
];

const RELATIONSHIPS = [
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Spouse",
  "Friend",
  "Other",
];

const COUNTRIES = ["Bangladesh", "India", "Pakistan", "Nepal", "Other"];

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Next payment = 1st of the renewal month after the current package/selection window.
 * Month-based selections renew on the month after the last selected month, while
 * yearly packages renew on the first day of the same month after N years.
 */
function computeNextPaymentDate(
  membershipType: "package" | "monthly",
  selectedPackage: GymPackage | undefined,
  selectedMonths: MonthYear[],
  selectedDates: Date[],
): Date | null {
  if (membershipType === "package" && selectedPackage) {
    const { durationType } = selectedPackage;
    const selectedStartDate = selectedDates[0];

    if (
      (durationType === "day" || durationType === "week" || durationType === "year") &&
      selectedStartDate
    ) {
      switch (durationType) {
        case "day":
          return addDays(selectedStartDate, selectedPackage.duration);
        case "week":
          return addWeeks(selectedStartDate, selectedPackage.duration);
        case "year":
          return addYears(selectedStartDate, selectedPackage.duration);
        default:
          return null;
      }
    }
  }

  // Month-based packages or monthly flow: use selected months directly
  if (selectedMonths.length > 0) {
    const last = selectedMonths[selectedMonths.length - 1];
    const nextMonth = last.month + 1;
    if (nextMonth > 11) {
      return new Date(last.year + 1, 0, 1);
    }
    return new Date(last.year, nextMonth, 1);
  }

  return null;
}

function getCurrentMonthStart(value = new Date()): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function getNextMonthStart(value = new Date()): Date {
  return new Date(value.getFullYear(), value.getMonth() + 1, 1);
}

function getLatestAllowedNewMemberStartDate(value = new Date()): Date {
  return new Date(value.getFullYear(), value.getMonth() + 2, 0);
}

function toMonthYearValue(date: Date): MonthYear {
  return { month: date.getMonth(), year: date.getFullYear() };
}

function toCalendarDateISOString(date: Date): string {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);
  return normalizedDate.toISOString();
}

function resolvePackageStartDate(
  selectedPackage: GymPackage | undefined,
  selectedMonths: MonthYear[],
  selectedDates: Date[],
): Date | null {
  if (!selectedPackage) {
    return null;
  }

  if (selectedPackage.durationType === "month") {
    if (selectedMonths.length === 0) {
      return null;
    }

    const firstMonth = selectedMonths[0];
    return new Date(firstMonth.year, firstMonth.month, 1);
  }

  return selectedDates[0] ? new Date(selectedDates[0]) : null;
}

// ─── Component ──────────────────────────────────────────────────────

export default function AddMemberPage() {
  const router = useRouter();
  const { activeBranchId } = useUser();
  const {
    isFeeStatusKnown,
    hasMissingFees,
    canManageFees,
    requestFeeSetup,
    businessId,
  } = useBranchFeeSetupGuard();

  // Fetch branch-level fees
  const { data: branchAdmissionFee } = useGetBranchAdmissionFeeQuery(
    businessId && activeBranchId
      ? { businessId, branchId: activeBranchId }
      : { businessId: "", branchId: "" },
    { skip: !businessId || !activeBranchId },
  );

  const { data: branchMonthlyFee } = useGetBranchMonthlyFeeQuery(
    businessId && activeBranchId
      ? { businessId, branchId: activeBranchId }
      : { businessId: "", branchId: "" },
    { skip: !businessId || !activeBranchId },
  );

  const [createMember, { isLoading: isCreating }] = useCreateMemberMutation();
  const [createBranchPackage, { isLoading: isCreatingPackage }] =
    useCreateBranchPackageMutation();

  const { data: businessProfile } = useGetBusinessProfileQuery();

  const { data: packagesData, isLoading: packagesLoading } =
    useGetBranchPackagesQuery(
      { branchId: activeBranchId || "", isActive: true },
      { skip: !activeBranchId },
    );

  const packages = useMemo(() => packagesData?.data || [], [packagesData?.data]);

  const [showPackageModal, setShowPackageModal] = useState(false);

  const handleCreatePackage = async (payload: PackageFormPayload) => {
    if (!activeBranchId) {
      toast.error("Select a branch before creating a package");
      return;
    }
    try {
      await createBranchPackage({
        branchId: activeBranchId,
        payload,
      }).unwrap();
      toast.success("Package created successfully");
      setShowPackageModal(false);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to create package");
    }
  };

  // ── Profile photo ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // ── Personal info ──
  const [fullName, setFullName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [gender, setGender] = useState("");
  const [nid, setNid] = useState("");
  const [country, setCountry] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [height, setHeight] = useState("");
  const [heightUnit, setHeightUnit] = useState("in");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("kg");

  // ── Emergency contact ──
  const [emergencyContactNumber, setEmergencyContactNumber] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");

  // ── Training goals ──
  const [trainingGoals, setTrainingGoals] = useState<TrainingGoal[]>([]);

  // ── Membership type ──
  const [membershipType, setMembershipType] = useState<"package" | "monthly">(
    "package",
  );

  // ── Package state ──
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [pkgSelectedMonths, setPkgSelectedMonths] = useState<MonthYear[]>([]);
  const [pkgSelectedDates, setPkgSelectedDates] = useState<Date[]>([]);
  const [pkgSelectedYear, setPkgSelectedYear] = useState<number | null>(null);

  // ── Custom monthly fee (applies to both flows) ──
  const [customMonthlyFee, setCustomMonthlyFee] = useState(false);
  const [customMonthlyFeeAmount, setCustomMonthlyFeeAmount] = useState("");

  // ── Monthly (no package) state ──
  const [monthlySelectedMonths, setMonthlySelectedMonths] = useState<
    MonthYear[]
  >([]);

  // ── Payment ──
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    "amount",
  );
  const [admissionFee, setAdmissionFee] = useState("");
  const [paidTotal, setPaidTotal] = useState("");
  
  // Track if user has manually edited paid amount
  const hasUserEditedPaidRef = useRef(false);

  // ── Errors ──
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Derived values ──
  const selectedPackage: GymPackage | undefined = useMemo(
    () => packages.find((p) => p.id === selectedPackageId),
    [packages, selectedPackageId],
  );
  const newMemberReferenceDate = useMemo(() => new Date(), []);
  const earliestStartMonth = useMemo(
    () => toMonthYearValue(getCurrentMonthStart(newMemberReferenceDate)),
    [newMemberReferenceDate],
  );
  const latestStartMonth = useMemo(
    () => toMonthYearValue(getNextMonthStart(newMemberReferenceDate)),
    [newMemberReferenceDate],
  );
  const latestAllowedPackageStartDate = useMemo(
    () => getLatestAllowedNewMemberStartDate(newMemberReferenceDate),
    [newMemberReferenceDate],
  );

  const branchMonthlyFeeAmount = branchMonthlyFee?.monthlyFeeAmount ?? null;

  const effectiveMonthlyFee = useMemo(() => {
    if (customMonthlyFee && customMonthlyFeeAmount) {
      return Number(customMonthlyFeeAmount);
    }
    return branchMonthlyFeeAmount ?? 0;
  }, [customMonthlyFee, customMonthlyFeeAmount, branchMonthlyFeeAmount]);

  // Auto-fill admission fee
  const prevPackageIdRef = useRef(selectedPackageId);
  const prevMembershipTypeRef = useRef(membershipType);

  useEffect(() => {
    if (membershipType === "monthly") {
      if (prevMembershipTypeRef.current !== "monthly" || !admissionFee) {
        const fee = branchAdmissionFee?.admissionFeeAmount;
        startTransition(() => {
          setAdmissionFee(fee != null ? String(fee) : "");
        });
      }
      prevMembershipTypeRef.current = membershipType;
      return;
    }

    prevMembershipTypeRef.current = membershipType;

    if (selectedPackageId !== prevPackageIdRef.current) {
      prevPackageIdRef.current = selectedPackageId;
      if (selectedPackage?.includeAdmissionFee) {
        const feeAmount =
          selectedPackage.admissionFeeAmount != null
            ? selectedPackage.admissionFeeAmount
            : (branchAdmissionFee?.admissionFeeAmount ?? null);
        startTransition(() => {
          setAdmissionFee(feeAmount != null ? String(feeAmount) : "");
        });
      } else {
        startTransition(() => {
          setAdmissionFee("");
        });
      }
    }
  }, [
    selectedPackageId,
    selectedPackage,
    branchAdmissionFee,
    membershipType,
    admissionFee,
  ]);

  // Auto-initialize month grid for package when package selected
  useEffect(() => {
    if (
      membershipType === "package" &&
      selectedPackage &&
      selectedPackage.durationType === "month" &&
      pkgSelectedMonths.length === 0
    ) {
      const endIdx = toIndex(earliestStartMonth) + selectedPackage.duration - 1;
      startTransition(() => {
        setPkgSelectedMonths(buildRange(earliestStartMonth, fromIndex(endIdx)));
      });
    }
  }, [earliestStartMonth, membershipType, selectedPackage, pkgSelectedMonths.length]);

  // Subtotal calculation
  const subtotal = useMemo(() => {
    if (membershipType === "package" && selectedPackage) {
      return selectedPackage.amount;
    }
    if (membershipType === "monthly") {
      const fee = effectiveMonthlyFee;
      const monthCount = monthlySelectedMonths.length || 1;
      return fee * monthCount;
    }
    return 0;
  }, [
    membershipType,
    selectedPackage,
    effectiveMonthlyFee,
    monthlySelectedMonths.length,
  ]);

  const admissionFeeNum = Number(admissionFee) || 0;
  const discountBase = subtotal + admissionFeeNum;
  const discountRaw = Number(discount) || 0;
  const discountNum =
    discountType === "percent"
      ? Math.min(
          Math.round((discountRaw / 100) * discountBase * 100) / 100,
          discountBase,
        )
      : Math.min(discountRaw, discountBase);
  const totalDue = Math.max(0, discountBase - discountNum);
  const paidNum = Number(paidTotal) || 0;
  const remaining = Math.max(0, totalDue - paidNum);
  const overpaidAmount = Math.max(0, paidNum - totalDue);

  // Auto-fill paid amount when total due changes (unless user has manually edited it)
  useEffect(() => {
    if (!hasUserEditedPaidRef.current && totalDue > 0) {
      startTransition(() => {
        setPaidTotal(String(totalDue));
      });
    }
  }, [totalDue]);

  // Next payment date
  const nextPaymentDate = useMemo(() => {
    return computeNextPaymentDate(
      membershipType,
      selectedPackage,
      membershipType === "monthly" ? monthlySelectedMonths : pkgSelectedMonths,
      membershipType === "package" ? pkgSelectedDates : [],
    );
  }, [
    membershipType,
    selectedPackage,
    monthlySelectedMonths,
    pkgSelectedMonths,
    pkgSelectedDates,
  ]);

  // ── Photo handling ──
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Validation ──
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Full name is required";
    if (!contact.trim()) errs.contact = "Phone number is required";

    if (membershipType === "package" && !selectedPackageId) {
      errs.package = "Please select a package";
    }
    if (membershipType === "package" && selectedPackage) {
      if (
        selectedPackage.durationType === "month" &&
        pkgSelectedMonths.length === 0
      ) {
        errs.packageStart = "Select a package start month";
      }

      if (
        selectedPackage.durationType !== "month" &&
        pkgSelectedDates.length === 0
      ) {
        errs.packageStart = "Select a package start date";
      }
    }
    if (membershipType === "monthly") {
      if (monthlySelectedMonths.length === 0) {
        errs.months = "Select at least one month";
      }
    }
    if (
      customMonthlyFee &&
      (!customMonthlyFeeAmount || Number(customMonthlyFeeAmount) <= 0)
    ) {
      errs.customFee = "Custom monthly fee amount is required";
    }
    if (!paymentMethod) errs.paymentMethod = "Select a payment method";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──
  const submitMember = async (
    payload: CreateMemberPayload,
    onSuccess?: (result: { invoiceNo?: string }) => void,
  ) => {
    if (!activeBranchId) {
      toast.error("No branch selected");
      return;
    }

    try {
      const result = await createMember({
        branchId: activeBranchId,
        payload,
        photo: photoFile || undefined,
      }).unwrap();

      toast.success("Member created successfully!", {
        description: `${fullName} has been added`,
      });
      if (onSuccess) {
        onSuccess({ invoiceNo: result.invoiceNo });
      } else {
        router.push("/dashboard/members");
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message || "Failed to create member");
    }
  };

  const buildPayload = (): CreateMemberPayload => {
    const payload: CreateMemberPayload = {
      memberId: memberId.trim() || undefined,
      fullName: fullName.trim(),
      contact: contact.trim() || undefined,
      email: email.trim() || undefined,
      dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : undefined,
      gender: gender || undefined,
      nid: nid.trim() || undefined,
      address: address.trim() || undefined,
      country: country.trim() || undefined,
      bloodGroup: bloodGroup || undefined,
      height: height ? Number(height) : undefined,
      heightUnit: height ? (heightUnit as "cm" | "in" | "ft") : undefined,
      weight: weight ? Number(weight) : undefined,
      weightUnit: weight ? (weightUnit as "kg" | "lb") : undefined,
      emergencyContact: emergencyContactNumber.trim()
        ? {
            relationship: emergencyRelationship || "Other",
            contactNumber: emergencyContactNumber.trim(),
          }
        : undefined,
      trainingGoals: trainingGoals.length > 0 ? trainingGoals : undefined,
      payment: {
        paymentMethod,
        paidTotal: paidNum,
        discount: discountNum > 0 ? discountNum : undefined,
        admissionFee: admissionFeeNum > 0 ? admissionFeeNum : undefined,
      },
    };

    // Custom monthly fee (applies to both flows: stored as personal rate override)
    if (customMonthlyFee) {
      payload.isCustomMonthlyFee = true;
      payload.customMonthlyFeeAmount = Number(customMonthlyFeeAmount);
    }

    // Membership type specifics
    if (membershipType === "package") {
      payload.currentPackageId = selectedPackageId;
      const packageStartDate = resolvePackageStartDate(
        selectedPackage,
        pkgSelectedMonths,
        pkgSelectedDates,
      );
      payload.membershipStartDate = toCalendarDateISOString(
        packageStartDate || new Date(),
      );
    } else {
      // Monthly (no package) — backend triggers monthly mode from paidMonths alone
      payload.paidMonths = monthlySelectedMonths.length;
      if (monthlySelectedMonths.length > 0) {
        const first = monthlySelectedMonths[0];
        payload.membershipStartDate = toCalendarDateISOString(new Date(
          first.year,
          first.month,
          1,
        ));
      }
    }

    return payload;
  };

  const MONTH_NAMES_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const getSelectedMonthLabels = (): string[] => {
    const months =
      membershipType === "monthly" ? monthlySelectedMonths : pkgSelectedMonths;
    return months.map((m) => `${MONTH_NAMES_SHORT[m.month]} ${m.year}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload = buildPayload();
    await submitMember(payload);
  };

  // ── Save & Print handler ──
  const handleSaveAndPrint = async () => {
    if (!validate()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload = buildPayload();

    await submitMember(payload, (result) => {
      openMemberInvoice({
        fullName: fullName.trim(),
        memberId: memberId.trim() || undefined,
        contact: contact.trim() || undefined,
        membershipType,
        packageName: selectedPackage?.title,
        monthlyFee: effectiveMonthlyFee,
        selectedMonthLabels: getSelectedMonthLabels(),
        membershipStartDate: payload.membershipStartDate,
        nextPaymentDate: nextPaymentDate
          ? nextPaymentDate.toISOString()
          : undefined,
        admissionFee: admissionFeeNum,
        discount: discountNum,
        subtotal,
        totalDue,
        paidAmount: paidNum,
        paymentMethod,
        invoiceNo: result.invoiceNo,
        businessName: businessProfile?.businessName,
        branchName: branchAdmissionFee?.branchName || branchMonthlyFee?.branchName,
      });

      // Redirect after a short delay so the print window has time to open
      setTimeout(() => {
        router.push("/dashboard/members");
      }, 800);
    });
  };

  // ── Fee setup guard ──
  if (isFeeStatusKnown && hasMissingFees) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">
            Complete Branch Fees First
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Member creation stays blocked until the branch monthly fee and
            admission fee are configured.
            {canManageFees
              ? " Use the fee setup modal to add the missing values, then come back here."
              : " Ask an owner or staff member with fee add access to complete the setup."}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {canManageFees && (
              <Button
                type="button"
                onClick={() => requestFeeSetup("member-create")}
              >
                Reopen Fee Setup
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/members")}
            >
              Back to Members
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = (field?: string) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors h-[42px] ${
      field && errors[field]
        ? "border-red-500 focus:ring-red-500 bg-red-50"
        : "border-gray-300 focus:ring-purple"
    }`;

  const selectClass = (field?: string) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors h-[42px] bg-white appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] pr-8 ${
      field && errors[field]
        ? "border-red-500 focus:ring-red-500 bg-red-50"
        : "border-gray-300 focus:ring-purple"
    }`;

  const labelClass = "block text-sm text-gray-500 mb-1.5";

  return (
    <div className="min-h-screen">
      {/* ─── Header ─── */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
          <span className="text-lg font-semibold">Add New Member</span>
        </button>
      </div>

      {/* ─── Form ─── */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ════════════════════ LEFT COLUMN ════════════════════ */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Personal Information ── */}
            <div className="bg-white rounded-2xl p-6">
              {/* Header row: avatar + name + upload */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden shrink-0">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-lg font-bold">
                        {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      {fullName || "New Member"}
                    </h2>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      New
                    </span>
                  </div>
                </div>

                <div className="flex items-center  gap-2">
                  {/* Member ID input */}
                  <div className="flex   items-center  gap-0.5">
                    <label className="text-xs text-gray-500">
                      Member ID :{" "}
                    </label>
                    <input
                      type="text"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      placeholder="e.g. GYM-001"
                      className="w-32 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  {photoFile && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm"
                  >
                    <HugeiconsIcon icon={Upload04Icon} size={14} />
                    Upload Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                {/* Full Name */}
                <div>
                  <label className={labelClass}>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass("fullName")}
                    placeholder="Ex: Mahdee Rashid"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* Contact */}
                <div>
                  <label className={labelClass}>
                    Contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className={inputClass("contact")}
                    placeholder="Ex: (480) 555-0103"
                  />
                  {errors.contact && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.contact}
                    </p>
                  )}
                </div>

                {/* E-mail */}
                <div>
                  <label className={labelClass}>E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass()}
                    placeholder="email@example.com"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <DatePickerPopover
                    value={dateOfBirth}
                    onChange={setDateOfBirth}
                    placeholder="DD/MM/YY"
                    formatStr="dd/MM/yyyy"
                    maxDate={new Date()}
                  />
                </div>

                {/* Country */}
                <div>
                  <label className={labelClass}>Country</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={selectClass()}
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* NID */}
                <div>
                  <label className={labelClass}>NID</label>
                  <input
                    type="text"
                    value={nid}
                    onChange={(e) => setNid(e.target.value)}
                    className={inputClass()}
                    placeholder="National ID"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className={labelClass}>Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={selectClass()}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Blood Group */}
                <div>
                  <label className={labelClass}>Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className={selectClass()}
                  >
                    <option value="">Select your blood group</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Height */}
                <div>
                  <label className={labelClass}>Height</label>
                  <InputWithUnit
                    value={height}
                    onChange={setHeight}
                    unit={heightUnit}
                    onUnitChange={setHeightUnit}
                    units={HEIGHT_UNITS}
                    placeholder="e.g: 5.8"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className={labelClass}>Weight</label>
                  <InputWithUnit
                    value={weight}
                    onChange={setWeight}
                    unit={weightUnit}
                    onUnitChange={setWeightUnit}
                    units={WEIGHT_UNITS}
                    placeholder="e.g 70"
                  />
                </div>

                {/* Address (Optional) — full width */}
                <div className="col-span-2">
                  <label className={labelClass}>Address (Optional)</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple resize-none"
                    rows={3}
                    placeholder="Type your permanent address..."
                  />
                </div>
              </div>
            </div>

            {/* ── Emergency Contact ── */}
            <div className="bg-white rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-5">
                Emergency Contact
              </h2>
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                {/* Relation */}
                <div>
                  <label className={labelClass}>Relation</label>
                  <select
                    value={emergencyRelationship}
                    onChange={(e) => setEmergencyRelationship(e.target.value)}
                    className={selectClass()}
                  >
                    <option value="">Select Relation</option>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className={labelClass}>Emergency Contact</label>
                  <input
                    type="text"
                    value={emergencyContactNumber}
                    onChange={(e) => setEmergencyContactNumber(e.target.value)}
                    className={inputClass()}
                    placeholder="Type your emergency contact"
                  />
                </div>
              </div>
            </div>

            {/* ── Training Goals ── */}
            <div className="bg-white rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-5">
                Training Goals
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {TRAINING_GOALS.map((goal) => (
                  <label
                    key={goal}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={trainingGoals.includes(goal)}
                      onChange={() =>
                        setTrainingGoals((prev) =>
                          prev.includes(goal)
                            ? prev.filter((g) => g !== goal)
                            : [...prev, goal],
                        )
                      }
                      className="w-4 h-4 text-purple border-gray-300 rounded focus:ring-purple accent-purple"
                    />
                    <span className="text-sm text-gray-700">{goal}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ════════════════════ RIGHT COLUMN ════════════════════ */}
          <div className="lg:col-span-1 space-y-6">
            {/* ── Membership Details ── */}
            <div className="bg-white rounded-2xl p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-800">
                  Membership Details
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Package selection and payment calculation
                </p>
              </div>

              {/* Membership type toggle */}
              <div className="flex gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => setMembershipType("package")}
                  className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg transition-colors ${
                    membershipType === "package"
                      ? "bg-purple text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Package
                </button>
                <button
                  type="button"
                  onClick={() => setMembershipType("monthly")}
                  className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg transition-colors ${
                    membershipType === "monthly"
                      ? "bg-purple text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Monthly (No Package)
                </button>
              </div>

              {/* ── PACKAGE FLOW ── */}
              {membershipType === "package" && (
                <div className="space-y-4">
                  {/* Select Package */}
                  <div>
                    <label className={labelClass}>
                      Select Package <span className="text-red-500">*</span>
                    </label>
                    {packagesLoading ? (
                      <div className="text-sm text-gray-400 py-2">
                        Loading packages...
                      </div>
                    ) : packages.length === 0 ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm text-amber-700">
                          No active packages found. Create a package first.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowPackageModal(true)}
                          className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap"
                        >
                          + Create Package
                        </button>
                      </div>
                    ) : (
                      <select
                        value={selectedPackageId}
                        onChange={(e) => {
                          setSelectedPackageId(e.target.value);
                          setPkgSelectedMonths([]);
                          setPkgSelectedDates([]);
                          setPkgSelectedYear(null);
                        }}
                        className={selectClass("package")}
                      >
                        <option value="">Choose a package...</option>
                        {packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.title} — ৳{pkg.amount} / {pkg.duration}{" "}
                            {pkg.durationType}
                            {pkg.duration > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.package && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.package}
                      </p>
                    )}
                  </div>

                  {/* Package details card */}
                  {selectedPackage && (
                    <div className="p-3 bg-purple/5 rounded-lg border border-purple/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {selectedPackage.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {selectedPackage.duration}{" "}
                            {selectedPackage.durationType}
                            {selectedPackage.duration > 1 ? "s" : ""}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">
                          ৳{selectedPackage.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Custom Monthly Fee toggle */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Custom Monthly Fee
                      </p>
                      <p className="text-xs text-gray-400">
                        Override monthly fee after package ends
                      </p>
                    </div>
                    <Switch
                      checked={customMonthlyFee}
                      onCheckedChange={setCustomMonthlyFee}
                    />
                  </div>

                  {/* Custom monthly amount input */}
                  {customMonthlyFee && (
                    <div>
                      <label className={labelClass}>Monthly Amount</label>
                      <input
                        type="number"
                        min="0"
                        value={customMonthlyFeeAmount}
                        onChange={(e) =>
                          setCustomMonthlyFeeAmount(e.target.value)
                        }
                        className={inputClass("customFee")}
                        placeholder="00.00"
                      />
                      {errors.customFee && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.customFee}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Duration Calendar */}
                  {selectedPackage && (
                    <DurationCalendar
                      durationType={selectedPackage.durationType}
                      durationCount={selectedPackage.duration}
                      selectedMonths={pkgSelectedMonths}
                      onMonthsChange={setPkgSelectedMonths}
                      selectedDates={pkgSelectedDates}
                      onDatesChange={setPkgSelectedDates}
                      selectedYear={pkgSelectedYear}
                      onYearChange={setPkgSelectedYear}
                      minMonth={earliestStartMonth}
                      maxStartMonth={latestStartMonth}
                      minDate={newMemberReferenceDate}
                      maxDate={latestAllowedPackageStartDate}
                      fixedCount
                    />
                  )}
                  {errors.packageStart && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.packageStart}
                    </p>
                  )}

                  {/* Next Payment Date */}
                  {nextPaymentDate && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-sm text-gray-600">
                        Next Payment Date
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        {format(nextPaymentDate, "dd-MMM-yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── MONTHLY (NO PACKAGE) FLOW ── */}
              {membershipType === "monthly" && (
                <div className="space-y-4">
                  {/* Branch monthly fee display */}
                  {branchMonthlyFeeAmount != null && !customMonthlyFee && (
                    <div className="p-3 bg-purple/5 rounded-lg border border-purple/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            Monthly Fee
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Branch default rate
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">
                          ৳{branchMonthlyFeeAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Custom Monthly Fee toggle */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Custom Monthly Fee
                      </p>
                      <p className="text-xs text-gray-400">
                        Override the branch default monthly fee
                      </p>
                    </div>
                    <Switch
                      checked={customMonthlyFee}
                      onCheckedChange={setCustomMonthlyFee}
                    />
                  </div>

                  {/* Custom monthly amount input */}
                  {customMonthlyFee && (
                    <div>
                      <label className={labelClass}>Monthly Amount</label>
                      <input
                        type="number"
                        min="0"
                        value={customMonthlyFeeAmount}
                        onChange={(e) =>
                          setCustomMonthlyFeeAmount(e.target.value)
                        }
                        className={inputClass("customFee")}
                        placeholder="00.00"
                      />
                      {errors.customFee && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.customFee}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Month Grid */}
                  <MonthGrid
                    selectedMonths={monthlySelectedMonths}
                    onSelectionChange={setMonthlySelectedMonths}
                    minMonth={earliestStartMonth}
                    maxStartMonth={latestStartMonth}
                  />
                  {errors.months && (
                    <p className="text-xs text-red-500">{errors.months}</p>
                  )}

                  {/* Next Payment Date */}
                  {nextPaymentDate && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-sm text-gray-600">
                        Next Payment Date
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        {format(nextPaymentDate, "dd-MMM-yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Payment Section ── */}
            <div className="bg-white rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Payment
              </h2>

              <div className="space-y-3">
                {/* Admission Fee — read-only display */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600">Admission Fee</span>
                  <span className="text-sm font-medium text-gray-800">
                    ৳{admissionFeeNum.toLocaleString()}
                  </span>
                </div>

                {/* Discount — ৳ / % toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Discount</span>
                  <div className="flex items-center gap-1.5">
                    {/* pill toggle */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountType("amount");
                          setDiscount("");
                        }}
                        className={`px-2 py-1.5 transition-colors ${
                          discountType === "amount"
                            ? "bg-purple text-white"
                            : "bg-white text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        ৳
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountType("percent");
                          setDiscount("");
                        }}
                        className={`px-2 py-1.5 transition-colors ${
                          discountType === "percent"
                            ? "bg-purple text-white"
                            : "bg-white text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        %
                      </button>
                    </div>
                    {/* value input */}
                    <div className="relative w-24">
                      <input
                        type="number"
                        min="0"
                        max={discountType === "percent" ? 100 : undefined}
                        value={discount}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (discountType === "percent" && Number(v) > 100)
                            return;
                          setDiscount(v);
                        }}
                        className="w-full pr-6 pl-2 py-2 text-sm text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple/40 focus:border-purple/40"
                        placeholder="0"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                        {discountType === "percent" ? "%" : "৳"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sub Total</span>
                    <span className="text-gray-800 font-medium">
                      ৳{subtotal.toLocaleString()}
                    </span>
                  </div>
                  {admissionFeeNum > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Admission Fee</span>
                      <span className="text-gray-800">
                        +৳{admissionFeeNum.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {discountNum > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Discount
                        {discountType === "percent" && discountRaw > 0
                          ? ` (${discountRaw}%)`
                          : ""}
                      </span>
                      <span className="text-green-600">
                        -৳{discountNum.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2">
                    <span className="text-gray-700">Total Amount</span>
                    <span className="text-gray-900">
                      ৳{totalDue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Paid Amount — inline row */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Paid Amount
                  </span>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      ৳
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={paidTotal}
                      onChange={(e) => {
                        hasUserEditedPaidRef.current = true;
                        setPaidTotal(e.target.value);
                      }}
                      className={`w-full pl-7 pr-3 py-2 text-sm text-right border rounded-lg focus:outline-none focus:ring-1 focus:border-purple/40 ${
                        errors.paidTotal
                          ? "border-red-300 focus:ring-red-300"
                          : "border-gray-200 focus:ring-purple/40"
                      }`}
                      placeholder="0"
                    />
                  </div>
                </div>

                {errors.paidTotal && (
                  <p className="text-xs text-red-600">{errors.paidTotal}</p>
                )}

                {overpaidAmount > 0 ? (
                  <div className="flex justify-between text-sm px-3 py-2 bg-blue-50 rounded-lg">
                    <span className="text-blue-600 font-medium">Exchange</span>
                    <span className="text-blue-700 font-semibold">
                      ৳{overpaidAmount.toLocaleString()}
                    </span>
                  </div>
                ) : remaining > 0 ? (
                  <div className="flex justify-between text-sm px-3 py-2 bg-red-50 rounded-lg">
                    <span className="text-red-600 font-medium">Remaining</span>
                    <span className="text-red-700 font-semibold">
                      ৳{remaining.toLocaleString()}
                    </span>
                  </div>
                ) : null}

                {/* Payment Method */}
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className={selectClass("paymentMethod")}
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.value} value={pm.value}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 px-4 py-3 bg-purple text-white rounded-lg hover:bg-purple/90 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {isCreating ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                disabled={isCreating}
                onClick={handleSaveAndPrint}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {isCreating ? "Saving..." : "Save & Print"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {showPackageModal && (
        <PackageModal
          isOpen={showPackageModal}
          onClose={() => setShowPackageModal(false)}
          onSubmit={handleCreatePackage}
          isSubmitting={isCreatingPackage}
        />
      )}
    </div>
  );
}
