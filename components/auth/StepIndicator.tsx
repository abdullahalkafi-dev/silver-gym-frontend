"use client";

import { Check, Loader2 } from "lucide-react";

interface StepIndicatorProps {
  currentStep: 1 | 2;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { id: 1, label: "Business Information" },
    { id: 2, label: "Contact Info" },
  ];

  return (
    <div className="grid w-full grid-cols-2 gap-3">
      {steps.map((step) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
        <div
          key={step.id}
          className={`flex h-12 items-center gap-3 rounded-xl border px-4 transition-all duration-200 ${
            isActive
              ? "border-[#E5E7EB] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.07)]"
              : "border-[#E5E7EB] bg-white"
          }`}
        >
          <div
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
              isCompleted
                ? "border-[#E97451] bg-[#E97451]"
                : isActive
                ? "border-[#C7CCD3] bg-[#F8F9FB]"
                : "border-[#C7CCD3] bg-white"
            }`}
          >
            {isCompleted ? (
              <Check className="h-4 w-4 text-white" strokeWidth={3} />
            ) : isActive ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#6B7280]" />
            ) : null}
          </div>

          <span
            className={`truncate text-sm font-medium ${
              isActive || isCompleted ? "text-[#3F3F46]" : "text-[#8E939B]"
            }`}
          >
            {step.label}
          </span>
        </div>
      );
      })}
    </div>
  );
}
