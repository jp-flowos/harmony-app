"use client";

import { CalendarDots, MapPin, SquaresFour, Users, UsersThree } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  AGE_RANGE_OPTIONS,
  CLUB_CATEGORIES,
  type ClubFilters,
  countActiveFilters,
  DAY_OPTIONS,
  ETC_CATEGORY,
  MEETING_TYPE_OPTIONS,
  MEMBER_RANGE_OPTIONS,
} from "@/lib/club-filters";
import { REGIONS, SIDO_LIST } from "@/lib/regions";
import { cn } from "@/lib/utils";

const ALL_VALUE = "_all"; // Radix Select는 빈 문자열 value를 허용하지 않음

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-4 py-2.5 text-base font-semibold transition-colors",
        selected
          ? "border-coral-500 bg-coral-50 text-coral-700"
          : "border-mocha-200 bg-white text-mocha-700"
      )}
    >
      {children}
    </button>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-1.5 text-lg font-extrabold text-mocha-900">
      {icon}
      {children}
    </h3>
  );
}

export function FilterSheet({
  open,
  onOpenChange,
  applied,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applied: ClubFilters;
  onApply: (next: ClubFilters) => void;
}) {
  const [draft, setDraft] = useState<ClubFilters>(applied);

  useEffect(() => {
    if (open) setDraft(applied);
  }, [open, applied]);

  const sigunguList = draft.sido ? (REGIONS[draft.sido] ?? []) : [];
  const categoryOptions = [...CLUB_CATEGORIES, ETC_CATEGORY];

  function toggleCategory(category: string) {
    const current = draft.categories ?? [];
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    setDraft({ ...draft, categories: next.length > 0 ? next : undefined });
  }

  function toggleDay(day: NonNullable<ClubFilters["days"]>[number]) {
    const current = draft.days ?? [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    setDraft({ ...draft, days: next.length > 0 ? next : undefined });
  }

  function reset() {
    setDraft({ q: draft.q, sort: draft.sort, scope: draft.scope });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto pb-28">
        <div className="flex items-center justify-between">
          <SheetTitle className="text-2xl font-extrabold text-mocha-900">필터</SheetTitle>
          <button
            type="button"
            onClick={reset}
            className="mr-10 text-base font-bold text-coral-600 underline underline-offset-2"
          >
            초기화
          </button>
        </div>

        <div className="mt-5 space-y-7">
          <section className="space-y-3">
            <SectionTitle icon={<MapPin size={20} weight="duotone" className="text-coral-600" />}>
              지역
            </SectionTitle>
            <div className="flex gap-2">
              <Select
                value={draft.sido ?? ALL_VALUE}
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    sido: v === ALL_VALUE ? undefined : v,
                    sigungu: undefined,
                  })
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="시/도 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>전체</SelectItem>
                  {SIDO_LIST.map((sido) => (
                    <SelectItem key={sido} value={sido}>
                      {sido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={draft.sigungu ?? ALL_VALUE}
                onValueChange={(v) =>
                  setDraft({ ...draft, sigungu: v === ALL_VALUE ? undefined : v })
                }
                disabled={sigunguList.length === 0}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="시/군/구 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>전체</SelectItem>
                  {sigunguList.map((sigungu) => (
                    <SelectItem key={sigungu} value={sigungu}>
                      {sigungu}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle
              icon={<SquaresFour size={20} weight="duotone" className="text-coral-600" />}
            >
              카테고리{" "}
              <span className="text-sm font-semibold text-mocha-500">(복수 선택 가능)</span>
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={!draft.categories?.length}
                onClick={() => setDraft({ ...draft, categories: undefined })}
              >
                전체
              </Chip>
              {categoryOptions.map((category) => (
                <Chip
                  key={category}
                  selected={draft.categories?.includes(category) ?? false}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Chip>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle
              icon={<CalendarDots size={20} weight="duotone" className="text-coral-600" />}
            >
              활동 요일
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => (
                <Chip
                  key={day.value}
                  selected={draft.days?.includes(day.value) ?? false}
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle
              icon={<UsersThree size={20} weight="duotone" className="text-coral-600" />}
            >
              모임 유형
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={!draft.meetingType}
                onClick={() => setDraft({ ...draft, meetingType: undefined })}
              >
                전체
              </Chip>
              {MEETING_TYPE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={draft.meetingType === option.value}
                  onClick={() => setDraft({ ...draft, meetingType: option.value })}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle icon={<Users size={20} weight="duotone" className="text-coral-600" />}>
              연령대
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={!draft.ageRange}
                onClick={() => setDraft({ ...draft, ageRange: undefined })}
              >
                전체
              </Chip>
              {AGE_RANGE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={draft.ageRange === option.value}
                  onClick={() => setDraft({ ...draft, ageRange: option.value })}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle
              icon={<UsersThree size={20} weight="duotone" className="text-coral-600" />}
            >
              멤버 수
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={!draft.members}
                onClick={() => setDraft({ ...draft, members: undefined })}
              >
                전체
              </Chip>
              {MEMBER_RANGE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={draft.members === option.value}
                  onClick={() => setDraft({ ...draft, members: option.value })}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-mocha-100 bg-white p-4">
          <Button className="w-full" size="lg" onClick={() => onApply(draft)}>
            적용하기{countActiveFilters(draft) > 0 ? ` (${countActiveFilters(draft)})` : ""}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
