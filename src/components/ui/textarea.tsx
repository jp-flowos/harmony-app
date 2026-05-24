"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[140px] w-full rounded-2xl border-2 border-mocha-200 bg-white px-5 py-4",
        "text-xl leading-relaxed text-mocha-900",
        "placeholder:text-mocha-300 placeholder:font-normal",
        "transition-all duration-150",
        "focus:border-coral-500 focus:ring-4 focus:ring-coral-100 focus:outline-none",
        "disabled:cursor-not-allowed disabled:bg-cream-50 disabled:opacity-70",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
