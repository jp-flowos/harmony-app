import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-orange-100 text-orange-800",
        secondary: "bg-gray-100 text-gray-800",
        success: "bg-green-100 text-green-800",
        destructive: "bg-red-100 text-red-800",
        outline: "border-2 border-gray-300 text-gray-900",
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
