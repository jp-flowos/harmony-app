"use client";

import { X } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type CardId, dismiss, isDismissed } from "@/lib/onboarding/storage";
import { cn } from "@/lib/utils";
import { CohortCard } from "./CohortCard";
import { FirstClubCard } from "./FirstClubCard";
import { OperatorCard } from "./OperatorCard";

type CarouselCardId = Extract<CardId, "operator" | "cohort" | "first-club">;

interface CardConfig {
  id: CarouselCardId;
  label: string;
  render: (props: { onEmpty: () => void }) => React.ReactNode;
}

const CARDS: CardConfig[] = [
  {
    id: "operator",
    label: "운영자 소개",
    render: () => <OperatorCard />,
  },
  {
    id: "cohort",
    label: "새 이웃",
    render: ({ onEmpty }) => <CohortCard onEmpty={onEmpty} />,
  },
  {
    id: "first-club",
    label: "첫 모임 추천",
    render: ({ onEmpty }) => <FirstClubCard onEmpty={onEmpty} />,
  },
];

export function OnboardingCarousel() {
  const [hiddenIds, setHiddenIds] = useState<CarouselCardId[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHiddenIds(CARDS.filter((card) => isDismissed(card.id)).map((card) => card.id));
    setReady(true);
  }, []);

  const visibleCards = useMemo(
    () => CARDS.filter((card) => !hiddenIds.includes(card.id)),
    [hiddenIds]
  );

  useEffect(() => {
    if (activeIndex >= visibleCards.length) {
      setActiveIndex(Math.max(0, visibleCards.length - 1));
    }
  }, [activeIndex, visibleCards.length]);

  const hideCard = useCallback((id: CarouselCardId, persist: boolean) => {
    if (persist) dismiss(id);
    setHiddenIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const activeCard = visibleCards[activeIndex] ?? visibleCards[0];
  const handleEmptyCard = useCallback(() => {
    if (!activeCard) return;
    hideCard(activeCard.id, false);
  }, [activeCard, hideCard]);

  if (!ready) return null;
  if (!activeCard) return null;

  return (
    <section className="space-y-3" aria-label="처음 시작 안내">
      <div className="relative">
        {activeCard.render({ onEmpty: handleEmptyCard })}
        <button
          type="button"
          onClick={() => hideCard(activeCard.id, true)}
          className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-mocha-700 shadow-soft transition-all hover:bg-cream-100 focus:outline-none focus:ring-4 focus:ring-coral-200"
          aria-label={`${activeCard.label} 카드 닫기`}
        >
          <X size={24} weight="bold" aria-hidden="true" />
        </button>
      </div>

      {visibleCards.length > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="안내 카드 선택">
          {visibleCards.map((card, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-all focus:outline-none focus:ring-4 focus:ring-coral-200",
                  "after:block after:h-4 after:rounded-full after:content-['']",
                  isActive
                    ? "after:w-8 after:bg-coral-500"
                    : "after:w-4 after:bg-mocha-200 hover:after:bg-mocha-300"
                )}
                aria-label={`${card.label} 카드 보기`}
                aria-current={isActive ? "true" : undefined}
              />
            );
          })}
        </nav>
      )}
    </section>
  );
}
