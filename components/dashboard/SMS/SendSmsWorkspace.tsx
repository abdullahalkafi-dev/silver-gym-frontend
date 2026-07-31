"use client";

import { useDeferredValue, useEffect, useMemo, useState, startTransition, type SetStateAction } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  MailSend01Icon,
  Search01Icon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import SmsHistoryTable from "@/components/dashboard/SMS/SmsHistoryTable";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/hooks/useUser";
import { isBangladeshPhone } from "@/lib/bangladeshPhone";
import { formatBdDateTime } from "@/lib/utils";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import { useGetBranchMembersQuery } from "@/redux/features/member/memberApi";
import {
  useGetBranchSmsSettingsQuery,
  useGetDueSmsMembersQuery,
  useGetMemberSmsHistoryQuery,
  useGetSmsBalanceQuery,
  useGetSmsHistoryQuery,
  usePreviewSmsMutation,
  useSendSmsMutation,
  useUpdateBranchSmsSettingsMutation,
} from "@/redux/features/sms/smsApi";
import type { BackendMember } from "@/types/member";
import type {
  BranchSmsSettings,
  PreviewSmsPayload,
  SmsAudience,
  SmsDeliveryMode,
  SmsDueDuration,
  SmsMemberStatusFilter,
  SmsMessageTypeSummary,
  SmsPreviewResponse,
  SmsPreviewSummary,
  SmsTemplateCategory,
} from "@/types/sms";

const stepDefinitions = [
  {
    title: "Choose Audience",
    description: "Select members manually or target due members with timeline filters.",
  },
  {
    title: "Write Message",
    description: "Use a custom English message or load a saved masking template.",
  },
  {
    title: "Final Review",
    description: "Check recipients, message cost, and balance before sending the batch.",
  },
] as const;

const dueDurationOptions: Array<{
  value: SmsDueDuration;
  label: string;
  helper: string;
}> = [
  { value: "thisMonth", label: "This Month", helper: "Only members due for the current billing month" },
  { value: "last2Months", label: "Last 2 Months", helper: "Members due within the last 2 months" },
  { value: "last3Months", label: "Last 3 Months", helper: "Members due within the last 3 months" },
  { value: "allDue", label: "All Due", helper: "Every member who still has monthly dues" },
];

const templateOptions: Array<{
  value: SmsTemplateCategory;
  label: string;
  helper: string;
}> = [
  { value: "custom", label: "Custom Message", helper: "Write an English one-off message without using a saved template." },
  { value: "occasion", label: "Occasion Greeting", helper: "Use for Eid, celebrations, and branch greetings." },
  { value: "promotion", label: "Promotion", helper: "Use for offers, discounts, and announcement campaigns." },
];

const memberStatusOptions: Array<{
  value: SmsMemberStatusFilter;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const formatAmount = (amount?: number | null) => `৳${Number(amount || 0).toLocaleString()}`;

const formatNumber = (value?: number | null) => Number(value || 0).toLocaleString();

const countPreviewCharacters = (value?: string | null) => Array.from(value || "").length;

const formatDeliveryModeLabel = (mode: SmsDeliveryMode) =>
  mode === "masking" ? "Masking SMS" : "Non-Masking SMS";

const formatDueDurationLabel = (dueDuration: SmsDueDuration) => {
  const matchingOption = dueDurationOptions.find((option) => option.value === dueDuration);
  return matchingOption?.label || "All Due";
};

const formatMessageTypeLabel = (messageType?: SmsMessageTypeSummary) => {
  switch (messageType) {
    case "unicode":
      return "Unicode SMS";
    case "mixed":
      return "Mixed (Text + Unicode)";
    case "text":
    default:
      return "Text SMS";
  }
};

const formatTemplateCategoryLabel = (templateCategory: SmsTemplateCategory) => {
  switch (templateCategory) {
    case "custom":
      return "Custom Message";
    case "occasion":
      return "Occasion Greeting";
    case "promotion":
      return "Promotion";
    case "due":
    default:
      return "Due Reminder";
  }
};

const resolveTemplateFromSettings = (
  settings: BranchSmsSettings,
  templateCategory: SmsTemplateCategory,
) => {
  switch (templateCategory) {
    case "occasion":
      return settings.occasionTemplateBangla || settings.occasionTemplate;
    case "promotion":
      return settings.promotionTemplateBangla || settings.promotionTemplate;
    case "custom":
      return "";
    case "due":
    default:
      return settings.templateBangla || settings.template;
  }
};

const resolveTemplatePlaceholderText = (templateCategory: SmsTemplateCategory) => {
  if (templateCategory === "due") {
    return "Placeholders: {memberName}, {dueMonth}, {branchName}. Unicode SMS uses 70 chars per unit.";
  }

  if (templateCategory === "custom") {
    return "Write a message for the selected members. English (160 chars) or Bangla (70 chars) per SMS unit.";
  }

  return "Placeholders: {memberName}, {branchName}. English or Bangla text supported.";
};

type HistoryTarget = {
  id: string;
  name: string;
};

type SmsPreviewState = {
  key: string;
  data: SmsPreviewResponse | null;
  error: string | null;
};

export default function SendSmsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, activeBranchId, isAdmin, isOwner } = useUser();
  const businessId = user?.businessProfile?.id || "";

  const [stepIndex, setStepIndex] = useState(0);
  const [audience, setAudience] = useState<SmsAudience>("selected");
  const [dueDuration, setDueDuration] = useState<SmsDueDuration>("thisMonth");
  const [memberStatusFilter, setMemberStatusFilter] =
    useState<SmsMemberStatusFilter>("active");
  const [selectedTemplateCategory, setSelectedTemplateCategory] =
    useState<SmsTemplateCategory>("custom");
  const [searchQuery, setSearchQuery] = useState("");
  const [manualPage, setManualPage] = useState(1);
  const [duePage, setDuePage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [templateDraft, setTemplateDraft] = useState("");
  const [settingsDraftState, setSettingsDraftState] = useState<{
    branchId: string | null;
    value: BranchSmsSettings | null;
  } | null>(null);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);
  const [targetDate, setTargetDate] = useState(todayInputValue);
  const [previewState, setPreviewState] = useState<SmsPreviewState | null>(null);

  const deferredSearch = useDeferredValue(searchQuery);
  const deliveryMode: SmsDeliveryMode = "masking";
  const activeTemplateCategory =
    audience === "due" ? "due" : selectedTemplateCategory;
  const canEditSavedTemplates = true;
  const canEditDueTemplate = isOwner || isAdmin;
  const canManageAnyTemplate = canEditSavedTemplates || canEditDueTemplate;

  const scopedArg = businessId && activeBranchId
    ? { businessId, branchId: activeBranchId }
    : skipToken;

  const { data: smsSettings, isLoading: isSettingsLoading } =
    useGetBranchSmsSettingsQuery(scopedArg);
  const { data: balanceData } = useGetSmsBalanceQuery(scopedArg);
  const { data: globalHistory, isLoading: isHistoryLoading } =
    useGetSmsHistoryQuery(
      scopedArg === skipToken
        ? skipToken
        : { ...scopedArg, page: 1, limit: 10 },
    );

  const settingsDraft =
    settingsDraftState?.branchId === activeBranchId
      ? settingsDraftState.value
      : smsSettings?.smsSettings || null;

  const updateSettingsDraft = (value: SetStateAction<BranchSmsSettings | null>) => {
    setSettingsDraftState((currentState) => {
      const currentDraft =
        currentState?.branchId === activeBranchId
          ? currentState.value
          : smsSettings?.smsSettings || null;

      return {
        branchId: activeBranchId || null,
        value:
          typeof value === "function"
            ? (value as (currentDraft: BranchSmsSettings | null) => BranchSmsSettings | null)(currentDraft)
            : value,
      };
    });
  };

  useEffect(() => {
    const preselectedMemberId = searchParams.get("memberId");

    if (!preselectedMemberId) {
      return;
    }

    startTransition(() => {
      setAudience("selected");
      setSelectedIds((currentIds) =>
        currentIds.includes(preselectedMemberId)
          ? currentIds
          : [...currentIds, preselectedMemberId],
      );
    });
  }, [searchParams]);

  const manualMembersArgs = activeBranchId
    ? {
        branchId: activeBranchId,
        ...(memberStatusFilter === "active" ? { isActive: "true" as const } : {}),
        ...(memberStatusFilter === "inactive"
          ? { isActive: "false" as const, includeInactive: "true" as const }
          : {}),
        ...(memberStatusFilter === "all" ? { includeInactive: "true" as const } : {}),
        ...(deferredSearch ? { searchTerm: deferredSearch } : {}),
        page: manualPage,
        limit: 20,
      }
    : null;

  const {
    data: memberList,
    isLoading: isMembersLoading,
    isFetching: isMembersFetching,
  } = useGetBranchMembersQuery(manualMembersArgs || { branchId: "" }, {
    skip: !manualMembersArgs || audience !== "selected",
  });

  const dueMembersArgs = scopedArg === skipToken
    ? skipToken
    : {
        ...scopedArg,
        targetDate,
        dueDuration,
        page: duePage,
        limit: 20,
        ...(deferredSearch ? { searchTerm: deferredSearch } : {}),
      };

  const {
    data: dueMembersData,
    isLoading: isDueLoading,
    isFetching: isDueFetching,
  } = useGetDueSmsMembersQuery(dueMembersArgs, {
    skip: dueMembersArgs === skipToken || audience !== "due",
  });

  const historyArgs = scopedArg === skipToken || !historyTarget
    ? skipToken
    : {
        ...scopedArg,
        memberId: historyTarget.id,
        page: 1,
        limit: 20,
      };

  const { data: memberHistory, isLoading: isMemberHistoryLoading } =
    useGetMemberSmsHistoryQuery(historyArgs);

  const [updateSettings, { isLoading: isSavingSettings }] =
    useUpdateBranchSmsSettingsMutation();
  const [previewSms] = usePreviewSmsMutation();
  const [sendSms, { isLoading: isSending }] = useSendSmsMutation();

  const canRequestPreview =
    Boolean(businessId && activeBranchId && templateDraft.trim()) &&
    (audience !== "selected" || selectedIds.length > 0);

  const previewRequestKey = useMemo(() => {
    if (!canRequestPreview) {
      return null;
    }

    return JSON.stringify({
      businessId,
      branchId: activeBranchId,
      audience,
      templateDraft,
      templateCategory: activeTemplateCategory,
      selectedIds,
      dueDuration,
      targetDate,
      settingsVersion: settingsDraft?.updatedAt || null,
    });
  }, [
    activeBranchId,
    activeTemplateCategory,
    audience,
    businessId,
    canRequestPreview,
    dueDuration,
    selectedIds,
    settingsDraft?.updatedAt,
    targetDate,
    templateDraft,
  ]);

  useEffect(() => {
    if (!previewRequestKey || !businessId || !activeBranchId) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const payload: PreviewSmsPayload = {
        audience,
        template: templateDraft,
        templateCategory: activeTemplateCategory,
        ...(audience === "selected" ? { memberIds: selectedIds } : {}),
        ...(audience === "due" ? { dueDuration } : {}),
        ...(targetDate ? { targetDate } : {}),
      };

      try {
        const nextPreview = await previewSms({
          businessId,
          branchId: activeBranchId,
          payload,
        }).unwrap();
        setPreviewState({ key: previewRequestKey, data: nextPreview, error: null });
      } catch (error) {
        setPreviewState({
          key: previewRequestKey,
          data: null,
          error: extractApiErrorMessage(error),
        });
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeBranchId,
    activeTemplateCategory,
    audience,
    businessId,
    dueDuration,
    previewRequestKey,
    previewSms,
    selectedIds,
    targetDate,
    templateDraft,
  ]);

  const currentMembers = useMemo(() => memberList?.data || [], [memberList?.data]);
  const currentPreview =
    previewRequestKey && previewState?.key === previewRequestKey
      ? previewState.data
      : null;
  const previewError =
    previewRequestKey && previewState?.key === previewRequestKey
      ? previewState.error
      : null;
  const summary: SmsPreviewSummary | undefined =
    currentPreview?.summary || dueMembersData?.summary;
  const headlineBalance = Number(balanceData?.maskingBalance || 0);
  const isDryRunMode = Boolean(balanceData?.dryRun);
  const selectedPreviewRecipients = currentPreview?.recipients || [];
  const previewMessage =
    selectedPreviewRecipients[0]?.renderedMessage ||
    dueMembersData?.recipients[0]?.renderedMessage ||
    "";
  const previewCharacterCount = countPreviewCharacters(previewMessage);
  const previewCharacterLimit = Number(summary?.singleSmsCharacterLimit || 160);
  const smsModeBannerText = isDryRunMode
    ? "Dry-run mode is active. Balance is live, but SMS sends are simulated."
    : "Live send mode is active. Balance is live, and approved SMS requests will be sent to the provider.";
  const sendButtonLabel = isDryRunMode ? "Send Dry-Run SMS" : "Send SMS";
  const allCurrentMembersSelected =
    currentMembers.length > 0 &&
    currentMembers.every((member) => selectedIds.includes(member._id));
  const dueDurationCounts = dueMembersData?.dueDurationCounts;
  const canAdvanceFromAudience =
    audience === "selected"
      ? selectedIds.length > 0
      : Number(dueMembersData?.summary.totalRecipients || 0) > 0;
  const canAdvanceFromTemplate = Boolean(templateDraft.trim());
  const canSend = Boolean(currentPreview?.summary.canSend) && !previewError;

  const handleAudienceChange = (nextAudience: SmsAudience) => {
    setAudience(nextAudience);
    setSearchQuery("");
    setManualPage(1);
    setDuePage(1);

    if (!settingsDraft) {
      return;
    }

    const nextCategory = nextAudience === "due" ? "due" : "custom";

    setSelectedTemplateCategory(nextCategory);
    setTemplateDraft(
      nextAudience === "due"
        ? resolveTemplateFromSettings(settingsDraft, "due")
        : "",
    );
  };

  const handleTemplateCategoryChange = (nextCategory: SmsTemplateCategory) => {
    if (!settingsDraft) {
      return;
    }

    setSelectedTemplateCategory(nextCategory);
    setTemplateDraft(
      nextCategory === "custom"
        ? ""
        : resolveTemplateFromSettings(settingsDraft, nextCategory),
    );
  };

  const toggleSelectedMember = (memberId: string, checked: boolean) => {
    setSelectedIds((currentIds) => {
      if (checked) {
        return currentIds.includes(memberId) ? currentIds : [...currentIds, memberId];
      }

      return currentIds.filter((currentId) => currentId !== memberId);
    });
  };

  const toggleSelectAllCurrentPage = (checked: boolean) => {
    if (checked) {
      setSelectedIds((currentIds) => {
        const mergedIds = new Set(currentIds);
        currentMembers.forEach((member) => mergedIds.add(member._id));
        return Array.from(mergedIds);
      });
      return;
    }

    const currentPageIds = new Set(currentMembers.map((member) => member._id));
    setSelectedIds((currentIds) =>
      currentIds.filter((currentId) => !currentPageIds.has(currentId)),
    );
  };

  const openHistory = (
    member:
      | { _id: string; fullName: string }
      | { memberId: string; memberName: string },
  ) => {
    if ("_id" in member) {
      setHistoryTarget({ id: member._id, name: member.fullName });
      return;
    }

    setHistoryTarget({ id: member.memberId, name: member.memberName });
  };

  const handleSaveSettings = async () => {
    if (!settingsDraft || !businessId || !activeBranchId) {
      return;
    }

    try {
      const payload: {
        autoSendEnabled: boolean;
        reminderDayOfMonth: number;
        maskingSender: string | null;
        template?: string;
        templateBangla?: string;
        occasionTemplate?: string;
        occasionTemplateBangla?: string;
        promotionTemplate?: string;
        promotionTemplateBangla?: string;
      } = {
        autoSendEnabled: settingsDraft.autoSendEnabled,
        reminderDayOfMonth: Number(settingsDraft.reminderDayOfMonth),
        maskingSender: settingsDraft.maskingSender?.trim()
          ? settingsDraft.maskingSender.trim()
          : null,
      };

      if (canEditDueTemplate) {
        payload.template = settingsDraft.template;
        payload.templateBangla = settingsDraft.templateBangla;
      }

      if (canEditSavedTemplates) {
        payload.occasionTemplate = settingsDraft.occasionTemplate;
        payload.occasionTemplateBangla = settingsDraft.occasionTemplateBangla;
        payload.promotionTemplate = settingsDraft.promotionTemplate;
        payload.promotionTemplateBangla = settingsDraft.promotionTemplateBangla;
      }

      const savedSettingsSnapshot = await updateSettings({
        businessId,
        branchId: activeBranchId,
        payload,
      }).unwrap();

      setSettingsDraftState({
        branchId: activeBranchId,
        value: savedSettingsSnapshot.smsSettings,
      });

      if (audience === "due") {
        setTemplateDraft(savedSettingsSnapshot.smsSettings.templateBangla || savedSettingsSnapshot.smsSettings.template);
      } else if (activeTemplateCategory !== "custom") {
        setTemplateDraft(
          resolveTemplateFromSettings(
            savedSettingsSnapshot.smsSettings,
            activeTemplateCategory,
          ),
        );
      }

      toast.success("Branch SMS settings updated");
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  const handleSend = async () => {
    if (!businessId || !activeBranchId) {
      toast.error("Select a branch before sending SMS");
      return;
    }

    if (!templateDraft.trim()) {
      toast.error("Write a message template before sending");
      return;
    }

    if (audience === "selected" && selectedIds.length === 0) {
      toast.error("Select at least one member");
      return;
    }

    try {
      const result = await sendSms({
        businessId,
        branchId: activeBranchId,
        payload: {
          audience,
          template: templateDraft,
          templateCategory: activeTemplateCategory,
          ...(audience === "selected" ? { memberIds: selectedIds } : {}),
          ...(audience === "due" ? { dueDuration } : {}),
          ...(targetDate ? { targetDate } : {}),
        },
      }).unwrap();

      toast.success(result.message || "SMS request processed successfully");

      if (audience === "selected") {
        setSelectedIds([]);
      }

      setStepIndex(0);
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  if (!businessId || !activeBranchId) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Send SMS</h1>
          <p className="text-sm text-gray-500">
            Select a branch to manage SMS settings and SMS reminders.
          </p>
        </div>
        <Card className="border-none shadow-none">
          <CardContent className="pt-6 text-sm text-gray-600">
            A branch must be selected before SMS tools are available.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Send SMS</h1>
          <p className="text-sm text-gray-500">
            Phone-only bulk SMS flow for branch reminders, greetings, offers, and campaign checks.
          </p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {smsModeBannerText}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border shadow-none">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Masking Balance
            </p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">
              {formatNumber(headlineBalance)}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Usable provider units for English masking SMS.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Audience Size</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">
              {formatNumber(
                audience === "selected"
                  ? selectedIds.length
                  : currentPreview?.summary.totalRecipients || dueMembersData?.summary.totalRecipients || 0,
              )}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {audience === "selected" ? "Selected members" : "Eligible due members in the current filter"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ready Recipients</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">
              {formatNumber(summary?.readyRecipients || 0)}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Members with valid Bangladesh mobile numbers.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estimated SMS Units</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">
              {formatNumber(summary?.requiredUnits || 0)}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Messages over the character limit use extra masking units.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_360px]">
        <Card className="border-border shadow-none">
          <CardHeader>
            <CardTitle>Bulk SMS Stepper</CardTitle>
            <CardDescription>
              Follow each step in order before sending the batch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stepDefinitions.map((step, index) => {
              const isCurrent = index === stepIndex;
              const isComplete = index < stepIndex;

              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className={`flex w-full items-center gap-3  rounded-2xl border-2  px-4 py-4 text-left transition-colors ${
                    isCurrent
                      ? "border-primary/20 bg-primary/5"
                      : isComplete
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-white"
                  }`}
                >
                  <span
                    className={`mt-1  inline-flex h-8 w-8 p-4 items-center justify-center rounded-full text-sm font-semibold ${
                      isCurrent
                        ? "bg-primary text-white"
                        : isComplete
                          ? "bg-green-600 text-white"
                          : "border border-gray-300 text-gray-500"
                    }`}
                  >
                    {isComplete ? "✓" : index + 1}
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-gray-900">{step.title}</span>
                    <span className="block text-xs text-gray-500">{step.description}</span>
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardHeader>
            <CardTitle>{stepDefinitions[stepIndex]?.title}</CardTitle>
            <CardDescription>{stepDefinitions[stepIndex]?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stepIndex === 0 ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-gray-700">
                  This screen uses English masking SMS only. Save one approved sender text in Branch SMS Settings and the system will reuse that same text for every masking SMS sent from this branch.
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleAudienceChange("selected")}
                    className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                      audience === "selected"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="font-semibold text-gray-900">Selected Members</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Search, filter, and choose specific members for one-off messages.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAudienceChange("due")}
                    className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                      audience === "due"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="font-semibold text-gray-900">Due Members</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Target active members who still have monthly dues for the chosen timeframe.
                    </p>
                  </button>
                </div>

                {audience === "selected" ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {memberStatusOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setMemberStatusFilter(option.value);
                            setManualPage(1);
                          }}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                            memberStatusFilter === option.value
                              ? "bg-primary text-white"
                              : "bg-gray-primary text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="relative w-full md:max-w-sm">
                        <Input
                          value={searchQuery}
                          onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setManualPage(1);
                          }}
                          placeholder="Search member name, ID, or phone"
                          className="pl-10"
                        />
                        <HugeiconsIcon
                          icon={Search01Icon}
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatNumber(selectedIds.length)} member(s) selected
                      </div>
                    </div>

                    <div className="overflow-auto rounded-2xl border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-4 py-3">
                              <Checkbox
                                checked={allCurrentMembersSelected}
                                onCheckedChange={(checked) =>
                                  toggleSelectAllCurrentPage(Boolean(checked))
                                }
                                aria-label="Select all current members"
                              />
                            </th>
                            <th className="px-4 py-3">Member</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Current Due</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {isMembersLoading || isMembersFetching ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                                Loading members...
                              </td>
                            </tr>
                          ) : currentMembers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                                No members matched this filter.
                              </td>
                            </tr>
                          ) : (
                            currentMembers.map((member: BackendMember) => {
                              const validPhone = isBangladeshPhone(member.contact);
                              const isSelected = selectedIds.includes(member._id);

                              return (
                                <tr key={member._id}>
                                  <td className="px-4 py-3 align-top">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) =>
                                        toggleSelectedMember(member._id, Boolean(checked))
                                      }
                                      aria-label={`Select ${member.fullName}`}
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-800">{member.fullName}</div>
                                    <div className="text-xs text-gray-500">
                                      {member.memberId || "N/A"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className={validPhone ? "text-gray-700" : "text-red-600"}>
                                      {member.contact || "No phone number"}
                                    </div>
                                    {!validPhone ? (
                                      <div className="text-xs text-red-500">
                                        Invalid Bangladesh number
                                      </div>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${member.isActive === false ? "bg-gray-200 text-gray-600" : "bg-blue-100 text-blue-700"}`}>
                                      {member.isActive === false ? "Inactive" : "Active"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-gray-700">
                                    {formatAmount(member.currentDueAmount || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openHistory(member)}
                                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                                      >
                                        History
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          router.push(`/dashboard/members/details/${member._id}`)
                                        }
                                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                                      >
                                        View
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                      <div className="flex flex-wrap gap-2">
                        {dueDurationOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setDueDuration(option.value);
                              setDuePage(1);
                            }}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                              dueDuration === option.value
                                ? "bg-primary text-white"
                                : "bg-gray-primary text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700">
                        <HugeiconsIcon icon={Calendar03Icon} size={18} className="text-gray-400" />
                        <input
                          type="date"
                          value={targetDate}
                          onChange={(event) => {
                            setTargetDate(event.target.value);
                            setDuePage(1);
                          }}
                          className="w-full bg-transparent outline-none"
                        />
                      </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {dueDurationOptions.map((option) => (
                        <div key={option.value} className="rounded-2xl border border-gray-200 bg-white p-4">
                          <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                          <p className="mt-1 text-2xl font-semibold text-gray-900">
                            {formatNumber(dueDurationCounts?.[option.value] || 0)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">{option.helper}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="relative w-full md:max-w-sm">
                        <Input
                          value={searchQuery}
                          onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setDuePage(1);
                          }}
                          placeholder="Search due members"
                          className="pl-10"
                        />
                        <HugeiconsIcon
                          icon={Search01Icon}
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                      <div className="text-sm text-gray-500">
                        Due reminders remain active-only in this release.
                      </div>
                    </div>

                    <div className="overflow-auto rounded-2xl border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-4 py-3">Member</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3">Due Month</th>
                            <th className="px-4 py-3">Overdue</th>
                            <th className="px-4 py-3">Monthly Due</th>
                            <th className="px-4 py-3">Total Due</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {isDueLoading || isDueFetching ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                                Loading due members...
                              </td>
                            </tr>
                          ) : dueMembersData?.recipients.length ? (
                            dueMembersData.recipients.map((recipient) => (
                              <tr key={recipient.memberId}>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-800">{recipient.memberName}</div>
                                  <div className="text-xs text-gray-500">
                                    {recipient.memberIdentifier || recipient.memberId.slice(-8)}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className={recipient.status === "ready" ? "text-gray-700" : "text-red-600"}>
                                    {recipient.recipientPhone || "No valid phone"}
                                  </div>
                                  {recipient.reason ? (
                                    <div className="text-xs text-red-500">{recipient.reason}</div>
                                  ) : null}
                                </td>
                                <td className="px-4 py-3 text-gray-700">{recipient.dueMonthLabel}</td>
                                <td className="px-4 py-3 text-gray-700">
                                  {recipient.overdueMonths} month(s)
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {formatAmount(recipient.monthlyDueAmount)}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-800">
                                  {formatAmount(recipient.totalDueAmount)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openHistory({
                                        memberId: recipient.memberId,
                                        memberName: recipient.memberName,
                                      })
                                    }
                                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                                  >
                                    History
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                                No due members matched the selected month and duration.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end border-t border-gray-100 pt-4">
                  <Button onClick={() => setStepIndex(1)} disabled={!canAdvanceFromAudience || !settingsDraft?.maskingSender}>
                    Next Step
                  </Button>
                </div>
              </div>
            ) : null}

            {stepIndex === 1 ? (
              <div className="space-y-5">
                {audience === "selected" ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    {templateOptions.map((option) => {
                      const isSelected = activeTemplateCategory === option.value;
                      const previewText =
                        option.value === "custom"
                          ? "Write a one-off English message without changing the saved templates."
                          : settingsDraft
                            ? resolveTemplateFromSettings(settingsDraft, option.value)
                            : "";

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleTemplateCategoryChange(option.value)}
                          className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <p className="font-semibold text-gray-900">{option.label}</p>
                          <p className="mt-1 text-xs text-gray-500">{option.helper}</p>
                          <p className="mt-3 line-clamp-3 text-sm text-gray-600">{previewText}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-gray-700">
                    Due reminders use the saved due template so the month label stays consistent. Edit that template from the template manager only.
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTemplateManagerOpen(true)}
                    disabled={!canManageAnyTemplate}
                  >
                    Manage Saved Templates
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      settingsDraft &&
                      setTemplateDraft(
                        resolveTemplateFromSettings(settingsDraft, activeTemplateCategory),
                      )
                    }
                    disabled={!settingsDraft || activeTemplateCategory === "custom"}
                  >
                    Load Saved Template
                  </Button>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_320px]">
                  <div className="space-y-3 rounded-2xl bg-gray-primary p-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Message Draft</h3>
                      <p className="text-sm text-gray-500">
                        {resolveTemplatePlaceholderText(activeTemplateCategory)}
                      </p>
                    </div>
                    <Textarea
                      value={templateDraft}
                      onChange={(event) => setTemplateDraft(event.target.value)}
                      className="min-h-52 bg-white"
                      placeholder="Write the SMS content for this batch"
                      readOnly={audience === "due"}
                    />
                    {audience === "due" ? (
                      <p className="text-xs text-gray-500">
                        Due reminder text is fixed in the send flow. Update it from the template manager if you have admin access.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Live Preview</h3>
                      <p className="text-sm text-gray-500">
                        Preview uses the backend validation flow and masking SMS cost estimation.
                      </p>
                    </div>
                    {previewError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {previewError}
                      </div>
                    ) : null}
                    {currentPreview?.summary.messagesOverSingleSmsLimit && activeTemplateCategory !== "due" ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        {currentPreview.summary.messagesOverSingleSmsLimit} preview message(s) exceed {currentPreview.summary.singleSmsCharacterLimit} characters, so the send will use multiple SMS units.
                      </div>
                    ) : null}
                    <div className="rounded-xl bg-gray-primary p-3 text-sm text-gray-700">
                      <p className="min-h-28 whitespace-pre-line">
                        {previewMessage || "Choose a recipient set and message to see a live preview."}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Detected SMS type</span>
                        <span className="font-semibold text-gray-900">
                          {formatMessageTypeLabel(currentPreview?.summary.messageType)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Character count</span>
                        <span className="font-semibold text-gray-900">
                          {formatNumber(previewCharacterCount)} / {formatNumber(previewCharacterLimit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Estimated units</span>
                        <span className="font-semibold text-gray-900">
                          {formatNumber(currentPreview?.summary.requiredUnits || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Ready recipients</span>
                        <span className="font-semibold text-gray-900">
                          {formatNumber(currentPreview?.summary.readyRecipients || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <Button variant="outline" onClick={() => setStepIndex(0)}>
                    Back
                  </Button>
                  <Button onClick={() => setStepIndex(2)} disabled={!canAdvanceFromTemplate}>
                    Next Step
                  </Button>
                </div>
              </div>
            ) : null}

            {stepIndex === 2 ? (
              <div className="space-y-5">
                {previewError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {previewError}
                  </div>
                ) : null}

                {summary?.insufficientBalance ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Estimated SMS units exceed the remaining masking balance. The backend will block the whole batch.
                  </div>
                ) : null}

                {summary?.blockedRecipients ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {summary.blockedRecipients} recipient(s) are blocked because they do not have a valid phone number or the message cannot be sent as English text SMS.
                  </div>
                ) : null}

                {summary?.messagesOverSingleSmsLimit && activeTemplateCategory !== "due" ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {summary.messagesOverSingleSmsLimit} message(s) exceed {summary.singleSmsCharacterLimit} characters. This is allowed, but it will consume extra masking SMS units.
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {formatDeliveryModeLabel(deliveryMode)}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Usable balance: {formatNumber(summary?.availableBalance || headlineBalance)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Audience</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {audience === "selected" ? "Selected Members" : "Due Members"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {audience === "due" ? formatDueDurationLabel(dueDuration) : `${formatNumber(selectedIds.length)} chosen member(s)`}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message Format</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {formatMessageTypeLabel(summary?.messageType)}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Over limit: {formatNumber(summary?.messagesOverSingleSmsLimit || 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estimated Units</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {formatNumber(summary?.requiredUnits || 0)}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Remaining after send: {formatNumber(summary?.remainingBalance || 0)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div>
                      <p className="text-base font-semibold text-gray-900">Final Message Preview</p>
                      <p className="text-sm text-gray-500">
                        {formatTemplateCategoryLabel(activeTemplateCategory)}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {summary?.readyRecipients || 0} ready recipient(s)
                    </div>
                  </div>
                  <div className="pt-4 text-sm leading-6 text-gray-700 whitespace-pre-line">
                    {previewMessage || "No preview available yet."}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <Button variant="outline" onClick={() => setStepIndex(1)}>
                    Back
                  </Button>
                  <Button onClick={handleSend} disabled={isSending || !canSend}>
                    <HugeiconsIcon icon={MailSend01Icon} size={18} />
                    {isSending ? "Processing..." : sendButtonLabel}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle>Branch SMS Settings</CardTitle>
              <CardDescription>
                  Save the branch-level masking sender text, auto reminders, and saved templates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSettingsLoading || !settingsDraft ? (
                <div className="text-sm text-gray-500">Loading branch SMS settings...</div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 rounded-2xl bg-gray-primary p-4">
                    <div>
                      <p className="font-medium text-gray-900">Auto-send due reminder</p>
                      <p className="text-sm text-gray-500">
                        Runs once on the selected calendar day using Bangladesh time.
                      </p>
                    </div>
                    <Switch
                      checked={settingsDraft.autoSendEnabled}
                      onCheckedChange={(checked) =>
                        updateSettingsDraft((currentDraft) =>
                          currentDraft
                            ? { ...currentDraft, autoSendEnabled: checked }
                            : currentDraft,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Reminder day of month</label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={settingsDraft.reminderDayOfMonth}
                      onChange={(event) =>
                        updateSettingsDraft((currentDraft) =>
                          currentDraft
                            ? {
                                ...currentDraft,
                                reminderDayOfMonth: Number(event.target.value || 1),
                              }
                            : currentDraft,
                        )
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Last auto run: {formatBdDateTime(settingsDraft.lastAutoReminderRunDate || null)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Masking sender text</label>
                    <Input
                      value={settingsDraft.maskingSender || ""}
                      onChange={(event) =>
                        updateSettingsDraft((currentDraft) =>
                          currentDraft
                            ? { ...currentDraft, maskingSender: event.target.value }
                            : currentDraft,
                        )
                      }
                      placeholder="Example: SILVERGYM"
                    />
                    <p className="text-xs text-gray-500">
                      Enter the approved sender text from your SMS provider. After you save it, this branch will use the same text automatically for every masking SMS.
                    </p>
                    {settingsDraft.maskingSender?.trim() ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        Current saved sender text: {settingsDraft.maskingSender}
                      </div>
                    ) : null}
                    {!settingsDraft.maskingSender?.trim() ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        No masking sender text is saved yet. Preview and send will stay blocked until you save one here.
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTemplateManagerOpen(true)}
                      disabled={!canManageAnyTemplate}
                    >
                      Manage Saved Templates
                    </Button>
                    {!canManageAnyTemplate ? (
                      <p className="text-xs text-gray-500">
                        You can send SMS, but saved template changes require admin access or the SMS template permission.
                      </p>
                    ) : null}
                    <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                      {isSavingSettings ? "Saving..." : "Save SMS Settings"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle>Provider Snapshot</CardTitle>
              <CardDescription>
                  Live Wintel balance for the masking-only rollout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between rounded-xl bg-gray-primary px-4 py-3">
                <span>Masking balance</span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(balanceData?.maskingBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gray-primary px-4 py-3">
                <span>Last balance sync</span>
                <span className="font-semibold text-gray-900">
                  {formatBdDateTime(balanceData?.fetchedAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border shadow-none">
        <CardHeader>
          <CardTitle>Recent SMS History</CardTitle>
          <CardDescription>
            Branch-level history for sent, blocked, and simulated SMS activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SmsHistoryTable
            records={globalHistory?.data || []}
            isLoading={isHistoryLoading}
            emptyMessage="No branch SMS history has been recorded yet."
          />
        </CardContent>
      </Card>

      <Sheet open={Boolean(historyTarget)} onOpenChange={(open) => !open && setHistoryTarget(null)}>
        <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{historyTarget?.name || "Member"} SMS History</SheetTitle>
            <SheetDescription>
              Review per-user SMS activity and add this member to the current selected list if needed.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 p-4 pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!historyTarget) return;
                setAudience("selected");
                setSelectedIds((currentIds) =>
                  currentIds.includes(historyTarget.id)
                    ? currentIds
                    : [...currentIds, historyTarget.id],
                );
              }}
            >
              <HugeiconsIcon icon={UserGroup02Icon} size={18} />
              Add To Selected Members
            </Button>

            <SmsHistoryTable
              records={memberHistory?.data || []}
              isLoading={isMemberHistoryLoading}
              emptyMessage="No SMS history found for this member yet."
              showMemberColumn={false}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={templateManagerOpen} onOpenChange={setTemplateManagerOpen}>
        <SheetContent side="right" className="w-full max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Manage Saved Templates</SheetTitle>
            <SheetDescription>
              Due reminders are admin-only. Greeting and promotion templates require the SMS template permission.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 p-4 pt-0">
            {!settingsDraft ? null : (
              <>
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
                  <div className="w-[300px] flex-shrink-0 snap-start space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-sm font-medium text-gray-700">Due Reminder (English)</label>
                    <Textarea
                      value={settingsDraft.template}
                      onChange={(event) =>
                        updateSettingsDraft((currentDraft) =>
                          currentDraft
                            ? { ...currentDraft, template: event.target.value }
                            : currentDraft,
                        )
                      }
                      className="min-h-32"
                      disabled={!canEditDueTemplate}
                    />
                    <p className="text-xs text-gray-500">
                      {settingsDraft.template.length}/160 characters (English SMS)
                    </p>
                  </div>
                  <div className="w-[300px] flex-shrink-0 snap-start space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-sm font-medium text-gray-700">Due Reminder (Bangla)</label>
                    <Textarea
                      value={settingsDraft.templateBangla}
                      onChange={(event) =>
                        updateSettingsDraft((currentDraft) =>
                          currentDraft
                            ? { ...currentDraft, templateBangla: event.target.value }
                            : currentDraft,
                        )
                      }
                      className="min-h-32"
                      disabled={!canEditDueTemplate}
                    />
                    <p className="text-xs text-gray-500">
                      {settingsDraft.templateBangla.length}/70 characters (Unicode SMS)
                    </p>
                  </div>
                  <div className="w-[300px] flex-shrink-0 snap-start space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-sm font-medium text-gray-700">Occasion Greeting (English)</label>
                    <Textarea
                      value={settingsDraft.occasionTemplate}
                      onChange={(event) =>
                        updateSettingsDraft((currentDraft) =>
                          currentDraft
                            ? { ...currentDraft, occasionTemplate: event.target.value }
                            : currentDraft,
                        )
                      }
                      className="min-h-32"
                      disabled={!canEditSavedTemplates}
                    />
                  </div>
                  <div className="w-[300px] flex-shrink-0 snap-start space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-sm font-medium text-gray-700">Occasion Greeting (Bangla)</label>
                    <Textarea
                      value={settingsDraft.occasionTemplateBangla}
                      onChange={(event) =>
                        updateSettingsDraft((currentDraft) =>
                          currentDraft
                            ? { ...currentDraft, occasionTemplateBangla: event.target.value }
                            : currentDraft,
                        )
                      }
                      className="min-h-32"
                      disabled={!canEditSavedTemplates}
                    />
                  </div>
                  <div className="w-[300px] flex-shrink-0 snap-start space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-sm font-medium text-gray-700">Promotion (English)</label>
                    <Textarea
                      value={settingsDraft.promotionTemplate}
                      onChange={(event) =>
                        updateSettingsDraft((currentDraft) =>
                          currentDraft
                            ? { ...currentDraft, promotionTemplate: event.target.value }
                            : currentDraft,
                        )
                      }
                      className="min-h-32"
                      disabled={!canEditSavedTemplates}
                    />
                  </div>
                  <div className="w-[300px] flex-shrink-0 snap-start space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-sm font-medium text-gray-700">Promotion (Bangla)</label>
                    <Textarea
                      value={settingsDraft.promotionTemplateBangla}
                      onChange={(event) =>
                        updateSettingsDraft((currentDraft) =>
                          currentDraft
                            ? { ...currentDraft, promotionTemplateBangla: event.target.value }
                            : currentDraft,
                        )
                      }
                      className="min-h-32"
                      disabled={!canEditSavedTemplates}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                  <Button variant="outline" onClick={() => setTemplateManagerOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={handleSaveSettings} disabled={isSavingSettings || !canManageAnyTemplate}>
                    {isSavingSettings ? "Saving..." : "Save Templates"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
