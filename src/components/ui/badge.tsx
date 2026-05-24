import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-sm font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-coral-100 text-coral-800",
        secondary: "bg-sage-100 text-sage-700",
        cream: "bg-cream-100 text-mocha-800",
        success: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
        warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
        destructive: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
        outline: "border-2 border-mocha-200 text-mocha-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
