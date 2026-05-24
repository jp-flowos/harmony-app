import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, { wrap: string; mark: number; text: string; tagline: string }> = {
  sm: { wrap: "gap-2", mark: 26, text: "text-2xl", tagline: "text-base" },
  md: { wrap: "gap-3", mark: 36, text: "text-3xl", tagline: "text-lg" },
  lg: { wrap: "gap-3", mark: 48, text: "text-4xl", tagline: "text-xl" },
};

interface BrandMarkProps {
  size?: Size;
  tagline?: string;
  className?: string;
}

/**
 * Hand-drawn leaf glyph + 하모니 wordmark.
 * The leaf nods to nature / harmony / growth without being saccharine.
 */
export function BrandMark({ size = "md", tagline, className }: BrandMarkProps) {
  const s = sizeMap[size];
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className={cn("flex items-center", s.wrap)}>
        <LeafMark size={s.mark} />
        <span className={cn("font-extrabold text-coral-600 tracking-tight", s.text)}>하모니</span>
      </div>
      {tagline && <p className={cn("mt-3 font-medium text-mocha-700", s.tagline)}>{tagline}</p>}
    </div>
  );
}

function LeafMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      role="presentation"
    >
      <title>하모니 로고</title>
      {/* Two leaves embracing — represents "harmony" (조화) */}
      <path d="M24 6 C 14 12, 8 22, 12 36 C 18 32, 22 24, 24 14 Z" fill="var(--color-sage-400)" />
      <path d="M24 6 C 34 12, 40 22, 36 36 C 30 32, 26 24, 24 14 Z" fill="var(--color-coral-400)" />
      {/* Center vein */}
      <path
        d="M24 6 L 24 38"
        stroke="var(--color-mocha-700)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Tiny stem */}
      <path
        d="M24 38 L 24 44"
        stroke="var(--color-sage-700)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
