import React, { useEffect, useRef, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BranchRole,
  StaffFormValues,
  StaffMember,
  StaffUpdateValues,
} from "@/types/staff";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useLazyCheckStaffUsernameAvailabilityQuery,
  useLazySuggestStaffUsernamesQuery,
} from "@/redux/features/staff/staffApi";

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
const USERNAME_LOOKUP_DEBOUNCE_MS = 350;

type UsernameLookupStatus = "idle" | "checking" | "available" | "taken" | "error";

interface UsernameLookupState {
  value: string;
  status: UsernameLookupStatus;
  message: string | null;
}

interface UserFormData {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  password: string;
  roleId: string;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initialData?: StaffMember | null;
  roles: BranchRole[];
  onSubmit: (
    data: StaffFormValues | StaffUpdateValues,
  ) => Promise<void> | void;
}

const createInitialFormData = (
  mode: "add" | "edit",
  initialData?: StaffMember | null,
): UserFormData => ({
  username: mode === "edit" ? initialData?.username || "" : "",
  displayName: initialData?.displayName || "",
  email: initialData?.email || "",
  phone: initialData?.phone || "",
  password: "",
  roleId: initialData?.roleId || "",
});

const createInitialUsernameLookupState = (): UsernameLookupState => ({
  value: "",
  status: "idle",
  message: null,
});

const normalizeUsername = (value: string): string => value.trim().toLowerCase();

const getUsernameSuggestionBase = (value: string): string => {
  return normalizeUsername(value).replace(/[^a-z0-9]/g, "").slice(0, 15);
};

const getUsernameFormatMessage = (username: string): string | null => {
  if (!username) {
    return null;
  }

  if (username.length < 3) {
    return "Keep typing to check availability.";
  }

  if (username.length > 30) {
    return "Username can be at most 30 characters.";
  }

  if (!USERNAME_PATTERN.test(username)) {
    return "Use lowercase letters, numbers, dots, underscores, or hyphens only.";
  }

  return null;
};

const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialData,
  roles,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<UserFormData>(() =>
    createInitialFormData(mode, initialData),
  );

  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormData, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameLookupState, setUsernameLookupState] =
    useState<UsernameLookupState>(createInitialUsernameLookupState);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameLookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const usernameLookupRequestRef = useRef(0);
  const [triggerSuggestStaffUsernames] = useLazySuggestStaffUsernamesQuery();
  const [triggerCheckStaffUsernameAvailability] =
    useLazyCheckStaffUsernameAvailabilityQuery();

  useEffect(() => {
    return () => {
      if (usernameLookupTimerRef.current !== null) {
        clearTimeout(usernameLookupTimerRef.current);
      }
    };
  }, []);

  const clearUsernameLookupTimer = () => {
    if (usernameLookupTimerRef.current !== null) {
      clearTimeout(usernameLookupTimerRef.current);
      usernameLookupTimerRef.current = null;
    }
  };

  const resetUsernameFeedback = () => {
    usernameLookupRequestRef.current += 1;
    clearUsernameLookupTimer();
    setUsernameLookupState(createInitialUsernameLookupState());
    setUsernameSuggestions([]);
  };

  const setSuggestionItems = (suggestions: string[], username: string) => {
    setUsernameSuggestions(
      Array.from(
        new Set(
          suggestions.filter((item) => item && item.toLowerCase() !== username),
        ),
      ).slice(0, 6),
    );
  };

  const runUsernameLookup = async (
    rawValue: string,
    options: {
      includeSuggestions?: boolean;
      showChecking?: boolean;
    } = {},
  ): Promise<boolean | null> => {
    const username = normalizeUsername(rawValue);
    const suggestionBase = getUsernameSuggestionBase(rawValue);
    const formatMessage = getUsernameFormatMessage(username);
    const requestId = ++usernameLookupRequestRef.current;

    if (!username) {
      if (requestId === usernameLookupRequestRef.current) {
        setUsernameLookupState(createInitialUsernameLookupState());
        setUsernameSuggestions([]);
      }
      return null;
    }

    if (formatMessage) {
      setUsernameLookupState({
        value: username,
        status: "idle",
        message: formatMessage,
      });
    } else if (options.showChecking) {
      setUsernameLookupState({
        value: username,
        status: "checking",
        message: "Checking availability...",
      });
    }

    const [suggestionsResult, availabilityResult] = await Promise.allSettled([
      options.includeSuggestions && suggestionBase.length >= 2
        ? triggerSuggestStaffUsernames({
            base: suggestionBase,
            limit: 6,
          }).unwrap()
        : Promise.resolve<string[]>([]),
      formatMessage
        ? Promise.resolve<{
            username: string;
            isAvailable: boolean;
          } | null>(null)
        : triggerCheckStaffUsernameAvailability(username).unwrap(),
    ]);

    if (requestId !== usernameLookupRequestRef.current) {
      return null;
    }

    if (suggestionsResult.status === "fulfilled") {
      setSuggestionItems(suggestionsResult.value, username);
    } else {
      setUsernameSuggestions([]);
    }

    if (formatMessage) {
      return null;
    }

    if (
      availabilityResult.status === "fulfilled" &&
      availabilityResult.value
    ) {
      const isAvailable = availabilityResult.value.isAvailable;

      setUsernameLookupState({
        value: username,
        status: isAvailable ? "available" : "taken",
        message: isAvailable
          ? "Username is available."
          : "Username is already taken.",
      });

      return isAvailable;
    }

    setUsernameLookupState({
      value: username,
      status: "error",
      message:
        availabilityResult.status === "rejected"
          ? extractApiErrorMessage(availabilityResult.reason)
          : "Could not verify username availability right now.",
    });

    return null;
  };

  const scheduleUsernameLookup = (value: string) => {
    clearUsernameLookupTimer();
    usernameLookupRequestRef.current += 1;

    const username = normalizeUsername(value);
    const formatMessage = getUsernameFormatMessage(username);

    if (!username) {
      resetUsernameFeedback();
      return;
    }

    setUsernameLookupState({
      value: username,
      status: formatMessage ? "idle" : "checking",
      message: formatMessage || "Checking availability...",
    });

    if (getUsernameSuggestionBase(value).length < 2) {
      setUsernameSuggestions([]);
    }

    usernameLookupTimerRef.current = setTimeout(() => {
      void runUsernameLookup(value, {
        includeSuggestions: true,
      });
    }, USERNAME_LOOKUP_DEBOUNCE_MS);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UserFormData, string>> = {};

    if (mode === "add") {
      const normalizedUsername = normalizeUsername(formData.username);

      if (!normalizedUsername) {
        newErrors.username = "Username is required";
      } else if (normalizedUsername.length < 3) {
        newErrors.username = "Username must be at least 3 characters";
      } else if (normalizedUsername.length > 30) {
        newErrors.username = "Username can be at most 30 characters";
      } else if (!USERNAME_PATTERN.test(normalizedUsername)) {
        newErrors.username =
          "Use lowercase letters, numbers, dots, underscores, or hyphens only";
      } else if (
        usernameLookupState.value === normalizedUsername &&
        usernameLookupState.status === "taken"
      ) {
        newErrors.username = "Username is already taken";
      }

      if (!formData.password.trim()) {
        newErrors.password = "Password is required";
      } else if (formData.password.trim().length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.roleId) {
      newErrors.roleId = "Branch role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = (): StaffFormValues | StaffUpdateValues => {
    const displayName = formData.displayName.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();
    const optionalFields = {
      ...(displayName ? { displayName } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    };

    if (mode === "add") {
      return {
        username: normalizeUsername(formData.username),
        password: formData.password.trim(),
        roleId: formData.roleId,
        ...optionalFields,
      };
    }

    return {
      roleId: formData.roleId,
      ...optionalFields,
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (mode === "add") {
        clearUsernameLookupTimer();
        const usernameAvailable = await runUsernameLookup(formData.username, {
          includeSuggestions: true,
          showChecking: true,
        });

        if (usernameAvailable === false) {
          setErrors((prev) => ({
            ...prev,
            username: "Username is already taken",
          }));
          return;
        }
      }

      await onSubmit(buildPayload());
      onClose();
    } catch (error) {
      setSubmitError(extractApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof UserFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleUsernameChange = (value: string) => {
    const normalizedValue = value.toLowerCase();
    handleChange("username", normalizedValue);
    scheduleUsernameLookup(normalizedValue);
  };

  const handleUsernameSuggestionSelect = (suggestion: string) => {
    clearUsernameLookupTimer();
    handleChange("username", suggestion);
    void runUsernameLookup(suggestion, {
      includeSuggestions: true,
      showChecking: true,
    });
  };

  const usernameHelperClassName =
    errors.username || usernameLookupState.status === "taken" || usernameLookupState.status === "error"
      ? "text-red-500"
      : usernameLookupState.status === "available"
        ? "text-emerald-600"
        : usernameLookupState.status === "checking"
          ? "text-amber-600"
          : "text-gray-500";

  const usernameHelperMessage = errors.username
    ? errors.username
    : usernameLookupState.message ||
      "Staff members will use this username to sign in. Use 3-30 lowercase characters.";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {mode === "add" ? "Add Staff Member" : "Edit Staff Member"}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                {mode === "add"
                  ? "Create a branch staff account with a role and login credentials."
                  : "Update staff profile information and role assignment."}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {mode === "edit" ? (
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Username
              </Label>
              <Input
                id="username"
                value={formData.username}
                disabled
                className="h-11 bg-gray-100"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium text-gray-700">
              Staff Name
            </Label>
            <Input
              id="displayName"
              placeholder="Type staff name"
              value={formData.displayName}
              onChange={(e) => handleChange("displayName", e.target.value)}
              className={`h-11 ${errors.displayName ? "border-red-500" : ""}`}
            />
            {errors.displayName && (
              <p className="text-xs text-red-500">{errors.displayName}</p>
            )}
          </div>

          {mode === "add" ? (
            <div className="space-y-2">
              <Label htmlFor="staff-username" className="text-sm font-medium text-gray-700">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="staff-username"
                placeholder="Type username"
                value={formData.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`h-11 ${errors.username ? "border-red-500" : ""}`}
              />
              <p className={`text-xs ${usernameHelperClassName}`}>
                {usernameHelperMessage}
              </p>
              {usernameSuggestions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">
                    Suggested available usernames
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {usernameSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleUsernameSuggestionSelect(suggestion)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          suggestion === normalizeUsername(formData.username)
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-gray-50 text-gray-700 hover:border-purple hover:text-purple"
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Type mail"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className={`h-11 ${errors.email ? "border-red-500" : ""}`}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Phone
            </Label>
            <Input
              id="phone"
              placeholder="Type phone number"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className={`h-11 ${errors.phone ? "border-red-500" : ""}`}
            />
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone}</p>
            )}
          </div>

          {mode === "add" ? (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className={`h-11 ${errors.password ? "border-red-500" : ""}`}
              />
              {errors.password ? (
                <p className="text-xs text-red-500">{errors.password}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  Password must be at least 6 characters.
                </p>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium text-gray-700">
              Select Branch Role <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.roleId}
              onValueChange={(value) => handleChange("roleId", value)}
            >
              <SelectTrigger
                className={`h-11 ${errors.roleId ? "border-red-500" : ""}`}
              >
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && (
              <p className="text-xs text-red-500">{errors.roleId}</p>
            )}
          </div>

          {submitError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {submitError}
            </div>
          ) : null}

          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !roles.length}
              className="w-full h-11 bg-purple hover:bg-[#6527e0] text-white"
            >
              {isSubmitting
                ? mode === "add"
                  ? "Creating Staff..."
                  : "Saving Changes..."
                : mode === "add"
                  ? "Create Staff"
                  : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormModal;
