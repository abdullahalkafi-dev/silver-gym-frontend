"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import StepIndicator from "@/components/auth/StepIndicator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateBusinessProfileMutation } from "@/redux/features/auth/authApi";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setUserBusinessProfile } from "@/redux/features/auth/authSlice";

const schema = z.object({
  country: z.string().min(1, "Please select a country"),
  businessAddress: z.string().min(1, "Business address is required"),
  businessPhone: z
    .string()
    .min(1, "Business phone number is required")
    .regex(/^\+?\d{10,15}$/, "Please enter a valid phone number"),
  businessEmail: z
    .string()
    .min(1, "Business email is required")
    .email("Please enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ContactInfoForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [createBusinessProfileMutation, { isLoading }] =
    useCreateBusinessProfileMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: "",
      businessAddress: "",
      businessPhone: "",
      businessEmail: "",
    },
  });

  // Guard route by auth state and enforce onboarding step order.
  useEffect(() => {
    const businessInfo = localStorage.getItem("businessInfo");

    if (!isAuthenticated) {
      router.push("/sign-in");
      return;
    }

    if (user?.actorType !== "owner") {
      router.push("/dashboard");
      return;
    }

    if (user.businessProfile?.id) {
      router.push("/dashboard");
      return;
    }

    if (!businessInfo) {
      // Clear contact info if restarting the flow
      localStorage.removeItem("contactInfo");
      router.push("/business-info");
      return;
    }

    const savedData = localStorage.getItem("contactInfo");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setValue("country", parsed.country || "");
      setValue("businessAddress", parsed.businessAddress || "");
      setValue("businessPhone", parsed.businessPhone || "");
      setValue("businessEmail", parsed.businessEmail || "");
    }
  }, [isAuthenticated, router, setValue, user]);

  // Helper to reconstruct File from sessionStorage
  const getLogoFileFromSession = (): File | null => {
    const logoData = sessionStorage.getItem("businessLogo_data");
    const logoName = sessionStorage.getItem("businessLogo_name");
    const logoType = sessionStorage.getItem("businessLogo_type");

    if (!logoData || !logoName || !logoType) return null;

    try {
      const binaryString = atob(logoData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new File([bytes], logoName, { type: logoType });
    } catch {
      return null;
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      localStorage.setItem("contactInfo", JSON.stringify(data));

      const businessInfo = JSON.parse(
        localStorage.getItem("businessInfo") || "{}"
      ) as {
        businessName?: string;
        businessType?: string;
        registrationNumber?: string;
      };

      if (!businessInfo.businessName || !businessInfo.businessType) {
        toast.error("Business information is missing. Please complete step 1.");
        router.push("/business-info");
        return;
      }

      // Retrieve logo file from sessionStorage if available
      const logoFile = getLogoFileFromSession();

      const createdProfileResponse = await createBusinessProfileMutation({
        businessName: businessInfo.businessName,
        businessType: businessInfo.businessType,
        registrationNumber: businessInfo.registrationNumber,
        businessAddress: data.businessAddress,
        country: data.country,
        businessPhoneNumber: data.businessPhone,
        businessEmail: data.businessEmail.toLowerCase(),
        ...(logoFile && { businessLogo: logoFile }),
      }).unwrap();

      const rawProfileId =
        createdProfileResponse.data?._id ?? createdProfileResponse.data?.id;

      if (typeof rawProfileId === "string" && rawProfileId.trim()) {
        dispatch(setUserBusinessProfile({ id: rawProfileId.trim() }));
      }

      // Clear session storage after successful submission
      sessionStorage.removeItem("businessLogo_data");
      sessionStorage.removeItem("businessLogo_name");
      sessionStorage.removeItem("businessLogo_type");

      toast.success("Business profile created successfully");
      router.push("/success");
    } catch (apiError) {
      toast.error(extractApiErrorMessage(apiError));
    }
  };

  return (
    <div className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-white p-3 md:p-6">
      {/* Background decoration */}
      <div className="absolute top-[-65px] left-[1236px] w-[501px] h-[234px] bg-white rounded-[250.46px/117.05px] -rotate-45 blur-[234px]" />

      {/* Partial border wrapper */}
      <div className="relative w-full max-w-2xl bg-[#EEEEEE4D] rounded-4xl overflow-visible">
        {/* Top-right corner */}
        <div className="absolute top-0 right-0 w-full h-full rounded-4xl p-px z-0 backdrop-blur-sm opacity-90 bg-[linear-gradient(225deg,rgba(103,56,41,0.25)_0%,rgba(255,255,255,0)_65%,rgba(103,56,41,0.25)_100%)]">
          <div className="w-full h-full rounded-4xl bg-[#EEEEEE4D]" />
        </div>

        {/* Bottom-left corner */}
        <div className="absolute bottom-0 left-0 w-full h-full rounded-4xl p-px z-0 backdrop-blur-sm opacity-90 bg-[linear-gradient(45deg,rgba(103,56,41,0.25)_0%,rgba(255,255,255,0)_65%,rgba(103,56,41,0.25)_100%)]">
          <div className="w-full h-full rounded-4xl bg-[#EEEEEE4D]" />
        </div>

        {/* Main card */}
        <Card className="relative z-20 bg-white rounded-2xl shadow-[-76px_59px_212px_#ff73001a,-305px_235px_250px_#ff730017,-687px_529px_250px_#ff73000d,-1221px_940px_250px_#ff730003,-1908px_1469px_250px_transparent] border-none m-3 md:m-4">
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-col gap-4 md:gap-5">
              {/* Step Indicator */}
              <StepIndicator currentStep={2} />

              {/* Title and Step Counter */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <h1 className="font-semibold text-foreground text-[30px] leading-tight md:text-[32px]">
                      Contact Info
                    </h1>
                    <p className="font-normal text-muted-foreground text-base leading-6">
                      Provide your official phone number and email for
                      communication
                    </p>
                  </div>
                  <span className="text-sm font-medium text-[#9CA3AF] bg-[#F3F4F6] px-3 py-1 rounded-full">
                    2/2
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 md:gap-5">
                {/* Country */}
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="country"
                    className="text-sm font-medium text-gray-medium"
                  >
                    Country
                  </Label>
                  <div className="relative">
                    <select
                      id="country"
                      className="w-full h-14 appearance-none rounded-lg border-2 border-border-2 bg-white px-4 py-3 pr-11 text-base text-gray-medium transition-all focus:border-[#E97451] focus:outline-none focus:ring-2 focus:ring-[#E97451] focus:ring-opacity-50"
                      {...register("country")}
                    >
                      <option value="">Select Your Country</option>
                      <option value="bd">Bangladesh</option>
                      <option value="in">India</option>
                      <option value="pk">Pakistan</option>
                      <option value="us">United States</option>
                      <option value="uk">United Kingdom</option>
                      <option value="ca">Canada</option>
                      <option value="au">Australia</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                  </div>
                  {errors.country && (
                    <span className="text-sm text-[#FC5555]">
                      {errors.country.message}
                    </span>
                  )}
                </div>

                {/* Business Address */}
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="businessAddress"
                    className="text-sm font-medium text-gray-medium"
                  >
                    Business Address
                  </Label>
                  <Input
                    id="businessAddress"
                    type="text"
                    placeholder="Enter your business address"
                    className="h-14 rounded-lg text-base border-border-2 focus:border-[#E97451] focus:ring-[#E97451] focus:ring-2 focus:ring-opacity-50"
                    {...register("businessAddress")}
                  />
                  {errors.businessAddress && (
                    <span className="text-sm text-[#FC5555]">
                      {errors.businessAddress.message}
                    </span>
                  )}
                </div>

                {/* Business Phone Number */}
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="businessPhone"
                    className="text-sm font-medium text-gray-medium"
                  >
                    Business Phone Number
                  </Label>
                  <Input
                    id="businessPhone"
                    type="tel"
                    placeholder="Enter your business phone number"
                    className="h-14 rounded-lg text-base border-border-2 focus:border-[#E97451] focus:ring-[#E97451] focus:ring-2 focus:ring-opacity-50"
                    {...register("businessPhone")}
                  />
                  {errors.businessPhone && (
                    <span className="text-sm text-[#FC5555]">
                      {errors.businessPhone.message}
                    </span>
                  )}
                </div>

                {/* Business Email Address */}
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="businessEmail"
                    className="text-sm font-medium text-gray-medium"
                  >
                    Business Email Address
                  </Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    placeholder="Enter your business email address"
                    className="h-14 rounded-lg text-base border-border-2 focus:border-[#E97451] focus:ring-[#E97451] focus:ring-2 focus:ring-opacity-50"
                    {...register("businessEmail")}
                  />
                  {errors.businessEmail && (
                    <span className="text-sm text-[#FC5555]">
                      {errors.businessEmail.message}
                    </span>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={isLoading}
                  className={`w-full h-14 rounded-lg text-xl font-medium transition-colors duration-300 
                    ${
                      isLoading
                        ? "bg-[#D9D9D9] text-[#9CA3AF] cursor-not-allowed hover:bg-[#D9D9D9]"
                        : "bg-[#E97451] hover:bg-[#d66542] text-white"
                    }`}
                >
                  {isLoading ? "Submitting..." : "Next"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
