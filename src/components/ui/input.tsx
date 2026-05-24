"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Icon shown inside the input on the left (decorative, ~24px). */
  leadingIcon?: React.ReactNode;
  /** Action button shown on the right (e.g. password visibility toggle). Should be a `<button>`. */
  trailingAction?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leadingIcon, trailingAction, ...props }, ref) => {
    const hasAffix = Boolean(leadingIcon || trailingAction);

    const inputEl = (
      <input
        type={type}
        className={cn(
          "flex h-[60px] w-full rounded-2xl border-2 bg-white text-xl text-mocha-900",
          "border-mocha-200 placeholder:text-mocha-300 placeholder:font-normal",
          "transition-all duration-150",
          "focus:border-coral-500 focus:ring-4 focus:ring-coral-100 focus:outline-none",
          "disabled:cursor-not-allowed disabled:bg-cream-50 disabled:opacity-70",
          leadingIcon ? "pl-13" : "px-5",
          trailingAction ? "pr-13" : !leadingIcon ? "px-5" : "pr-5",
          className
        )}
        ref={ref}
        {...props}
      />
    );

    if (!hasAffix) return inputEl;

    return (
      <div className="relative">
        {leadingIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-mocha-500"
          >
            {leadingIcon}
          </span>
        )}
        {inputEl}
        {trailingAction && (
          <span className="absolute right-2 top-1/2 z-10 -translate-y-1/2">{trailingAction}</span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
