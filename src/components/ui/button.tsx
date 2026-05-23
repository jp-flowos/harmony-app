"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700",
        destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        outline:
          "border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
        ghost: "text-gray-900 hover:bg-gray-100 active:bg-gray-200",
        link: "text-orange-600 underline-offset-4 hover:underline font-semibold",
        kakao: "bg-[#FEE500] text-[#191919] hover:bg-[#FDD835] active:bg-[#FBC02D] font-bold",
      },
      size: {
        default: "h-14 px-6 py-3 text-lg",
        sm: "h-11 px-4 py-2 text-base",
        lg: "h-16 px-8 py-4 text-xl",
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
