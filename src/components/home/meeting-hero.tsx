"use client";

import { CalendarBlank, MapPin } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryEmoji } from "@/lib/club-emoji";
import { dDayLabel, formatMeetingDateShort } from "@/lib/format-date";
import type { HomeMeeting } from "@/lib/queries/home";
import { cn } from "@/lib/utils";

// "내 다음 모임" 히어로 캐러셀 (시안: D-day + 일시/장소 + 자세히 보기 + 페이지 인디케이터)
export function MeetingHero({ meetings }: { meetings: HomeMeeting[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (meetings.length === 0) return null;

  function onScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.min(meetings.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
  }

  return (
    <section aria-label="내 다음 모임">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl"
      >
        {meetings.map((m) => (
          <article
            key={m.id}
            className="w-full shrink-0 snap-center overflow-hidden rounded-3xl border border-coral-100 bg-gradient-to-br from-cream-50 to-coral-50"
          >
            <div className="flex items-stretch">
              <div className="min-w-0 flex-1 space-y-2 p-5">
                <p className="text-sm font-extrabold text-coral-700">내 다음 모임</p>
                <h2 className="truncate text-xl font-extrabold leading-snug text-mocha-900">
                  {m.title}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 text-base font-semibold text-mocha-800">
                  <Badge variant="default">{dDayLabel(m.date)}</Badge>
                  <CalendarBlank size={16} weight="duotone" />
                  {formatMeetingDateShort(m.date)}
                </div>
                <p className="flex items-center gap-1 text-base font-semibold text-mocha-700">
                  <MapPin size={16} weight="duotone" className="shrink-0" />
                  <span className="truncate">{m.location}</span>
                </p>
                <div className="pt-1">
                  <Link href={`/club/${m.clubId}/meeting/${m.id}`}>
                    <Button size="sm">모임 자세히 보기</Button>
                  </Link>
                </div>
              </div>
              {m.coverImage ? (
                // biome-ignore lint/performance/noImgElement: coverImage가 remotePatterns에 보장되지 않는 임의 URL일 수 있음
                <img src={m.coverImage} alt="" className="w-2/5 object-cover" />
              ) : (
                <div className="flex w-2/5 items-center justify-center bg-cream-100 text-6xl">
                  {categoryEmoji(m.category)}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {meetings.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {meetings.map((m, i) => (
            <span
              key={m.id}
              className={cn("h-2 w-2 rounded-full", i === index ? "bg-coral-500" : "bg-mocha-200")}
            />
          ))}
          <span className="ml-1 text-xs font-bold text-mocha-500">
            {index + 1}/{meetings.length}
          </span>
        </div>
      )}
    </section>
  );
}
