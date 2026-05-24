/**
 * Subtle decorative botanical SVG that floats behind auth pages.
 * Pure decoration — no semantic value, hidden from a11y tree.
 * Positioned absolutely; parent must be `relative`.
 */
export function BotanicalBackdrop() {
  return (
    <>
      <svg
        aria-hidden="true"
        className="botanical-decoration -right-12 -top-16"
        width="220"
        height="220"
        viewBox="0 0 220 220"
        fill="none"
      >
        <title>장식 잎사귀</title>
        <path
          d="M110 20 C 60 50, 30 110, 50 200 C 100 170, 130 110, 110 20 Z"
          fill="var(--color-sage-300)"
        />
        <path
          d="M110 20 L 80 195"
          stroke="var(--color-sage-700)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* sub-veins */}
        <path d="M100 60 L 75 80" stroke="var(--color-sage-700)" strokeWidth="1" opacity="0.4" />
        <path d="M95 95 L 65 115" stroke="var(--color-sage-700)" strokeWidth="1" opacity="0.4" />
        <path d="M90 130 L 60 150" stroke="var(--color-sage-700)" strokeWidth="1" opacity="0.4" />
      </svg>

      <svg
        aria-hidden="true"
        className="botanical-decoration -bottom-20 -left-16"
        width="200"
        height="200"
        viewBox="0 0 200 200"
        fill="none"
      >
        <title>장식 꽃</title>
        {/* petal cluster */}
        <ellipse cx="100" cy="60" rx="22" ry="38" fill="var(--color-coral-300)" />
        <ellipse
          cx="140"
          cy="100"
          rx="22"
          ry="38"
          fill="var(--color-coral-300)"
          transform="rotate(60 140 100)"
        />
        <ellipse
          cx="140"
          cy="140"
          rx="22"
          ry="38"
          fill="var(--color-coral-300)"
          transform="rotate(120 140 140)"
        />
        <ellipse
          cx="100"
          cy="180"
          rx="22"
          ry="38"
          fill="var(--color-coral-300)"
          transform="rotate(180 100 180)"
        />
        <ellipse
          cx="60"
          cy="140"
          rx="22"
          ry="38"
          fill="var(--color-coral-300)"
          transform="rotate(240 60 140)"
        />
        <ellipse
          cx="60"
          cy="100"
          rx="22"
          ry="38"
          fill="var(--color-coral-300)"
          transform="rotate(300 60 100)"
        />
        {/* center */}
        <circle cx="100" cy="120" r="18" fill="var(--color-cream-100)" />
        <circle cx="100" cy="120" r="10" fill="var(--color-coral-500)" />
      </svg>
    </>
  );
}
