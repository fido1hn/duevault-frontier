"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";

import type { OperationStep } from "@/features/umbra/operation-steps";

type UmbraOperationProgressProps<Id extends string> = {
  steps: OperationStep<Id>[];
  currentStep: Id | null;
  retryAttempt?: number;
  retryMax?: number;
};

export function UmbraOperationProgress<Id extends string>({
  steps,
  currentStep,
  retryAttempt,
  retryMax,
}: UmbraOperationProgressProps<Id>) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const isError = currentStep === ("error" as Id);
  const isComplete = currentStep === ("complete" as Id);

  return (
    <div className="flex flex-col gap-2">
      {steps
        .filter((step) => step.id !== ("error" as Id))
        .map((step, index) => {
          const stepIsActive = currentStep === step.id && !isComplete;
          const stepIsComplete =
            isComplete ||
            (currentIndex > index && currentIndex !== -1 && !isError);

          return (
            <div
              key={step.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/10 p-3"
            >
              <div className="mt-0.5">
                {stepIsComplete ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : stepIsActive ? (
                  <Loader2 className="size-4 animate-spin text-emerald-600" />
                ) : (
                  <Circle className="size-4 text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium leading-snug text-foreground">
                  {step.label}
                  {stepIsActive &&
                    typeof retryAttempt === "number" &&
                    retryAttempt > 1 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (attempt {retryAttempt}
                        {retryMax ? ` of ${retryMax}` : ""})
                      </span>
                    )}
                </p>
                {stepIsActive && step.hint && (
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {step.hint}
                  </p>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
