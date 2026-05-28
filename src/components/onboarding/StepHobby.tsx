"use client";

import { ArrowLeft, Heart, Sparkle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Greeting } from "@/components/ui/greeting";

const HOBBY_CATEGORIES = [
  { category: "운동", items: ["등산", "골프", "수영", "요가", "배드민턴", "탁구", "걷기"] },
  { category: "문화", items: ["독서", "영화", "음악감상", "미술", "사진", "서예"] },
  { category: "생활", items: ["요리", "원예", "여행", "낚시", "바둑", "댄스"] },
  { category: "교육", items: ["외국어", "컴퓨터", "악기연주", "역사탐방"] },
] as const;

const HOBBY_IDS_BY_LABEL: Record<string, string> = {
  등산: "hb_hiking",
  골프: "hb_golf",
  수영: "hb_swim",
  요가: "hb_yoga",
  배드민턴: "hb_badminton",
  탁구: "hb_tabletennis",
  걷기: "hb_walking",
  독서: "hb_reading",
  영화: "hb_movie",
  음악감상: "hb_music",
  미술: "hb_art",
  사진: "hb_photo",
  서예: "hb_calligraphy",
  요리: "hb_cooking",
  원예: "hb_gardening",
  여행: "hb_travel",
  낚시: "hb_fishing",
  바둑: "hb_baduk",
  댄스: "hb_dance",
  외국어: "hb_language",
  컴퓨터: "hb_computer",
  악기연주: "hb_instrument",
  역사탐방: "hb_history",
};

interface StepHobbyProps {
  selectedHobbyId: string;
  onChange: (hobbyId: string) => void;
  onBack: () => void;
  onComplete: () => void;
  loading?: boolean;
}

export function StepHobby({
  selectedHobbyId,
  onChange,
  onBack,
  onComplete,
  loading = false,
}: StepHobbyProps) {
  return (
    <div className="space-y-6">
      <Greeting
        icon={<Heart size={32} weight="duotone" />}
        title="좋아하는 활동을 하나 골라주세요"
        subtitle="처음 추천할 모임을 고르는 데 사용할게요"
      />

      <div className="space-y-5">
        {HOBBY_CATEGORIES.map((group) => (
          <section key={group.category} className="space-y-3">
            <Badge variant="cream">{group.category}</Badge>
            <div className="flex flex-wrap gap-2.5">
              {group.items.map((label) => {
                const hobbyId = HOBBY_IDS_BY_LABEL[label];
                const isSelected = selectedHobbyId === hobbyId;

                return (
                  <button
                    key={hobbyId}
                    type="button"
                    onClick={() => onChange(hobbyId)}
                    aria-pressed={isSelected}
                    className={`min-h-[52px] rounded-full border-2 px-5 text-lg font-extrabold transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-coral-200 ${
                      isSelected
                        ? "border-coral-500 bg-coral-500 text-white shadow-warm"
                        : "border-mocha-200 bg-white text-mocha-900 hover:border-coral-400 hover:bg-coral-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack} disabled={loading}>
          <ArrowLeft size={24} weight="bold" />
          이전
        </Button>
        <Button
          className="flex-1"
          size="lg"
          onClick={onComplete}
          disabled={!selectedHobbyId || loading}
        >
          <Sparkle size={24} weight="fill" />
          {loading ? "저장 중..." : "완료"}
        </Button>
      </div>
    </div>
  );
}
