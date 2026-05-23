"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[140px] w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-lg leading-relaxed text-gray-900 transition-colors placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
