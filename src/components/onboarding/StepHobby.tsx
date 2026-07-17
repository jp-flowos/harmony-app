"use client";

import {
  Airplane,
  ArrowCounterClockwise,
  BookOpen,
  ForkKnife,
  Heart,
  MusicNote,
  Palette,
  SoccerBall,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Greeting } from "@/components/ui/greeting";

// Task 1 마이그레이션의 6대분류와 1:1 — hobby id는 DB seed(20260528000000)와 동일
const HOBBY_GROUPS = [
  {
    category: "운동/스포츠",
    icon: <SoccerBall size={30} weight="duotone" />,
    hobbies: [
      { id: "hb_hiking", label: "등산" },
      { id: "hb_golf", label: "골프" },
      { id: "hb_swim", label: "수영" },
      { id: "hb_yoga", label: "요가" },
      { id: "hb_badminton", label: "배드민턴" },
      { id: "hb_tabletennis", label: "탁구" },
      { id: "hb_walking", label: "걷기" },
      { id: "hb_dance", label: "댄스" },
    ],
  },
  {
    category: "예술/공예",
    icon: <Palette size={30} weight="duotone" />,
    hobbies: [
      { id: "hb_art", label: "미술" },
      { id: "hb_calligraphy", label: "서예" },
      { id: "hb_photo", label: "사진" },
      { id: "hb_movie", label: "영화" },
    ],
  },
  {
    category: "요리/맛집",
    icon: <ForkKnife size={30} weight="duotone" />,
    hobbies: [{ id: "hb_cooking", label: "요리" }],
  },
  {
    category: "음악/악기",
    icon: <MusicNote size={30} weight="duotone" />,
    hobbies: [
      { id: "hb_music", label: "음악감상" },
      { id: "hb_instrument", label: "악기연주" },
    ],
  },
  {
    category: "여행/아웃도어",
    icon: <Airplane size={30} weight="duotone" />,
    hobbies: [
      { id: "hb_travel", label: "여행" },
      { id: "hb_fishing", label: "낚시" },
      { id: "hb_gardening", label: "원예" },
    ],
  },
  {
    category: "독서/자기계발",
    icon: <BookOpen size={30} weight="duotone" />,
    hobbies: [
      { id: "hb_reading", label: "독서" },
      { id: "hb_baduk", label: "바둑" },
      { id: "hb_language", label: "외국어" },
      { id: "hb_computer", label: "컴퓨터" },
      { id: "hb_history", label: "역사탐방" },
    ],
  },
] as const;

const MAX_HOBBIES = 3;

interface StepHobbyProps {
  category: string;
  onCategoryChange: (category: string) => void;
  hobbyIds: string[];
  onChange: (hobbyIds: string[]) => void;
  onNext: () => void;
}

export function StepHobby({
  category,
  onCategoryChange,
  hobbyIds,
  onChange,
  onNext,
}: StepHobbyProps) {
  const group = HOBBY_GROUPS.find((g) => g.category === category);

  function toggleHobby(id: string) {
    if (hobbyIds.includes(id)) {
      onChange(hobbyIds.filter((h) => h !== id));
    } else if (hobbyIds.length < MAX_HOBBIES) {
      onChange([...hobbyIds, id]);
    }
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <Greeting
          icon={<Heart size={32} weight="duotone" />}
          title="관심 있는 취미를 선택해주세요."
          subtitle="분류를 고르면 세부 취미가 나와요"
        />

        <div className="grid grid-cols-2 gap-3">
          {HOBBY_GROUPS.map((g) => (
            <button
              key={g.category}
              type="button"
              onClick={() => onCategoryChange(g.category)}
              className="flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-mocha-200 bg-white p-4 text-lg font-extrabold text-mocha-900 transition-all duration-150 hover:border-coral-400 hover:bg-coral-50 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-coral-200"
            >
              <span className="text-coral-600">{g.icon}</span>
              {g.category}
            </button>
          ))}
        </div>

        {hobbyIds.length > 0 && (
          <Button className="w-full" size="lg" onClick={onNext}>
            계속 ({hobbyIds.length}/{MAX_HOBBIES}개 선택됨)
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Greeting
        icon={<span className="text-coral-600">{group.icon}</span>}
        title={`${group.category} 취미를 골라주세요.`}
        subtitle={`최대 ${MAX_HOBBIES}개까지 선택할 수 있어요 (${hobbyIds.length}/${MAX_HOBBIES})`}
      />

      <div className="flex flex-wrap gap-2.5">
        {group.hobbies.map((hobby) => {
          const isSelected = hobbyIds.includes(hobby.id);
          const isFull = !isSelected && hobbyIds.length >= MAX_HOBBIES;

          return (
            <button
              key={hobby.id}
              type="button"
              onClick={() => toggleHobby(hobby.id)}
              aria-pressed={isSelected}
              disabled={isFull}
              className={`min-h-[52px] rounded-full border-2 px-5 text-lg font-extrabold transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-coral-200 disabled:opacity-40 ${
                isSelected
                  ? "border-coral-500 bg-coral-500 text-white shadow-warm"
                  : "border-mocha-200 bg-white text-mocha-900 hover:border-coral-400 hover:bg-coral-50"
              }`}
            >
              {hobby.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onCategoryChange("")}
        className="flex items-center gap-1.5 text-base font-bold text-mocha-500 underline underline-offset-2"
      >
        <ArrowCounterClockwise size={18} weight="bold" />
        다른 분류 보기
      </button>

      <Button className="w-full" size="lg" onClick={onNext} disabled={hobbyIds.length === 0}>
        계속 ({hobbyIds.length}/{MAX_HOBBIES})
      </Button>
    </div>
  );
}
