"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-semibold transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral-200",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary: warm coral with subtle hover lift
        default: [
          "bg-coral-500 text-white shadow-soft rounded-2xl",
          "hover:bg-coral-600 hover:shadow-warm",
          "active:bg-coral-700",
        ].join(" "),
        // Secondary: sage (calm action, e.g. confirm/save)
        secondary: [
          "bg-sage-500 text-white shadow-soft rounded-2xl",
          "hover:bg-sage-600",
          "active:bg-sage-700",
        ].join(" "),
        // Outline: explicit boxed button — never just "text"
        outline: [
          "border-2 border-mocha-200 bg-white text-mocha-900 rounded-2xl",
          "hover:border-coral-400 hover:bg-coral-50",
          "active:bg-coral-100",
        ].join(" "),
        // Ghost: still clearly a button (cream hover bg, not transparent)
        ghost: [
          "bg-transparent text-mocha-800 rounded-2xl",
          "hover:bg-cream-100",
          "active:bg-cream-200",
        ].join(" "),
        destructive: [
          "bg-[var(--color-danger)] text-white shadow-soft rounded-2xl",
          "hover:opacity-90",
        ].join(" "),
        link: "text-coral-600 underline underline-offset-4 font-bold rounded-md",
        kakao: [
          "bg-[#FEE500] text-[#191919] font-bold shadow-soft rounded-2xl",
          "hover:bg-[#FDD835]",
          "active:bg-[#FBC02D]",
        ].join(" "),
      },
      size: {
        default: "h-14 px-6 text-lg",
        sm: "h-11 px-4 text-base rounded-xl",
        lg: "h-16 px-8 text-xl font-bold",
        icon: "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
