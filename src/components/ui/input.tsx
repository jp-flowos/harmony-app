"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-14 w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-lg text-gray-900 transition-colors placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
