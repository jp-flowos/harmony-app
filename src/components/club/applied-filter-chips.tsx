"use client";

import { X } from "@phosphor-icons/react";
import { type ClubFilters, filterChips } from "@/lib/club-filters";

const MAX_VISIBLE = 3;

export function AppliedFilterChips({
  filters,
  onRemove,
  onReset,
}: {
  filters: ClubFilters;
  onRemove: (next: ClubFilters) => void;
  onReset: () => void;
}) {
  const chips = filterChips(filters);
  if (chips.length === 0) return null;
  const visible = chips.slice(0, MAX_VISIBLE);
  const hiddenCount = chips.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove(chip.removed)}
          aria-label={`${chip.label} 필터 제거`}
          className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-3 py-1.5 text-sm font-bold text-coral-700"
        >
          {chip.label}
          <X size={14} weight="bold" />
        </button>
      ))}
      {hiddenCount > 0 && (
        <span className="text-sm font-semibold text-mocha-500">외 {hiddenCount}개</span>
      )}
      <button
        type="button"
        onClick={onReset}
        className="ml-1 text-sm font-bold text-mocha-500 underline underline-offset-2"
      >
        초기화
      </button>
    </div>
  );
}
