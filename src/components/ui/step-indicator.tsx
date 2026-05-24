import { Check } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface Step {
  /** Short label shown under the number (e.g. "정보", "완료"). Keep to 2-3 chars. */
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  /** 1-based current step index. Past steps render as completed. */
  current: number;
  ariaLabel?: string;
  className?: string;
}

/**
 * Numbered step indicator. Past steps show a check; current is a filled circle; future is hollow.
 * Connecting lines convey progress.
 *
 * Per Toss senior research: explicit numbered states are clearer than bare progress bars.
 */
export function StepIndicator({
  steps,
  current,
  ariaLabel = "진행 단계",
  className,
}: StepIndicatorProps) {
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-label={ariaLabel}
      className={cn("flex items-center justify-center", className)}
    >
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isPast = stepNum < current;
        const isCurrent = stepNum === current;
        const isLast = i === steps.length - 1;

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors",
                  isPast && "bg-coral-500 border-coral-500 text-white",
                  isCurrent && "bg-coral-500 border-coral-500 text-white shadow-warm",
                  !isPast && !isCurrent && "bg-white border-mocha-200 text-mocha-400"
                )}
              >
                {isPast ? (
                  <Check size={22} weight="bold" />
                ) : (
                  <span className="text-base font-extrabold leading-none">{stepNum}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-bold leading-none",
                  isCurrent ? "text-coral-700" : isPast ? "text-mocha-800" : "text-mocha-500"
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-2 mb-5 h-1 w-12 rounded-full transition-colors",
                  isPast ? "bg-coral-500" : "bg-mocha-200"
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
