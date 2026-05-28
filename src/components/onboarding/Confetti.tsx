"use client";

import type { CSSProperties } from "react";

const COLORS = ["#ec6a52", "#6b8e5a", "#d88c2f", "#3e6b7a", "#f3e6cf", "#b83f2a"];
const SHAPES = ["rounded-sm", "rounded-full", "rounded-[2px]"];

interface ConfettiProps {
  count?: number;
}

interface ConfettiStyle extends CSSProperties {
  "--confetti-x": string;
  "--confetti-drift": string;
  "--confetti-rotate": string;
}

function valueFor(index: number, modulo: number): number {
  return (index * 37 + 17) % modulo;
}

export function Confetti({ count = 24 }: ConfettiProps) {
  const pieces = Array.from({ length: count }, (_, index) => ({
    id: `confetti-${index}`,
    index,
  }));

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes harmony-confetti-fall {
          0% {
            opacity: 0;
            transform: translate3d(var(--confetti-x), -14vh, 0) rotate(0deg);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(
              calc(var(--confetti-x) + var(--confetti-drift)),
              110vh,
              0
            ) rotate(var(--confetti-rotate));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .harmony-confetti-piece {
            animation: none !important;
            opacity: 0.45;
            transform: translate3d(var(--confetti-x), 18vh, 0) rotate(18deg);
          }
        }
      `}</style>
      {pieces.map(({ id, index }) => {
        const width = 8 + valueFor(index, 9);
        const height = 12 + valueFor(index + 5, 14);
        const delay = -valueFor(index + 2, 3200) / 1000;
        const duration = 4.8 + valueFor(index + 7, 2400) / 1000;
        const x = 4 + valueFor(index, 92);
        const drift = valueFor(index + 3, 25) - 12;
        const rotate = 180 + valueFor(index + 11, 540);

        const style: ConfettiStyle = {
          "--confetti-x": `${x}vw`,
          "--confetti-drift": `${drift}vw`,
          "--confetti-rotate": `${rotate}deg`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          animationIterationCount: "infinite",
          animationName: "harmony-confetti-fall",
          animationTimingFunction: "linear",
          backgroundColor: COLORS[index % COLORS.length],
          height,
          left: 0,
          top: 0,
          width,
        };

        return (
          <span
            key={id}
            className={`harmony-confetti-piece absolute ${SHAPES[index % SHAPES.length]}`}
            style={style}
          />
        );
      })}
    </div>
  );
}
