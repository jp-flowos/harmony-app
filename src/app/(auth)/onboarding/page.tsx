"use client";

import { ArrowLeft, ArrowRight, Heart, MapPin, Sparkle, UsersThree } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "@/components/ui/greeting";
import { StepIndicator } from "@/components/ui/step-indicator";

const regions = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

const hobbyCategories = [
  { category: "운동", items: ["등산", "골프", "수영", "요가", "배드민턴", "탁구", "걷기"] },
  { category: "문화", items: ["독서", "영화", "음악감상", "미술", "사진", "서예"] },
  { category: "생활", items: ["요리", "원예", "여행", "낚시", "바둑", "댄스"] },
  { category: "교육", items: ["외국어", "컴퓨터", "악기연주", "역사탐방"] },
];

const sampleClubs = [
  {
    id: "1",
    name: "서울 등산 모임",
    category: "등산",
    members: 45,
    description: "매주 토요일 서울 근교 산행",
  },
  {
    id: "2",
    name: "골프 친구들",
    category: "골프",
    members: 32,
    description: "월 2회 정기 라운딩",
  },
  {
    id: "3",
    name: "독서 클럽",
    category: "독서",
    members: 28,
    description: "매월 1권 완독 후 토론",
  },
];

type Step = "region" | "hobby" | "club";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("region");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);

  const toggleHobby = (hobby: string) => {
    setSelectedHobbies((prev) =>
      prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
    );
  };

  const currentNum = step === "region" ? 1 : step === "hobby" ? 2 : 3;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <div className="mb-7 flex justify-center">
          <StepIndicator
            steps={[{ label: "지역" }, { label: "취미" }, { label: "클럽" }]}
            current={currentNum}
            ariaLabel="시작하기 진행 단계"
          />
        </div>

        {step === "region" && (
          <>
            <Greeting
              icon={<MapPin size={32} weight="duotone" />}
              title="어디에 살고 계신가요?"
              subtitle="가까운 지역의 모임을 추천해드려요"
              className="mb-6"
            />
            <div className="grid grid-cols-3 gap-3">
              {regions.map((region) => {
                const isActive = selectedRegion === region;
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setSelectedRegion(region)}
                    aria-pressed={isActive}
                    className={`min-h-[56px] rounded-2xl border-2 text-lg font-bold transition-all duration-150 active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-coral-200 ${
                      isActive
                        ? "bg-coral-500 border-coral-500 text-white shadow-warm"
                        : "bg-white border-mocha-200 text-mocha-900 hover:border-coral-400 hover:bg-coral-50"
                    }`}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
            <div className="mt-7">
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedRegion}
                onClick={() => setStep("hobby")}
              >
                다음 단계로
                <ArrowRight size={24} weight="bold" />
              </Button>
            </div>
          </>
        )}

        {step === "hobby" && (
          <>
            <Greeting
              icon={<Heart size={32} weight="duotone" />}
              title="어떤 활동을 좋아하시나요?"
              subtitle={`관심 있는 활동을 3개 이상 골라주세요 · ${selectedHobbies.length}개 선택됨`}
              className="mb-6"
            />
            <div className="space-y-6">
              {hobbyCategories.map((cat) => (
                <div key={cat.category} className="space-y-3">
                  <h4 className="flex items-center gap-2 text-lg font-extrabold text-mocha-900">
                    <span className="h-5 w-1 rounded-full bg-coral-500" />
                    {cat.category}
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {cat.items.map((hobby) => {
                      const isSelected = selectedHobbies.includes(hobby);
                      return (
                        <button
                          key={hobby}
                          type="button"
                          onClick={() => toggleHobby(hobby)}
                          aria-pressed={isSelected}
                          className={`min-h-[52px] rounded-full border-2 px-5 text-lg font-bold transition-all duration-150 active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-coral-200 ${
                            isSelected
                              ? "bg-coral-500 border-coral-500 text-white shadow-warm"
                              : "bg-white border-mocha-200 text-mocha-900 hover:border-coral-400 hover:bg-coral-50"
                          }`}
                        >
                          {hobby}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep("region")}
              >
                <ArrowLeft size={24} weight="bold" />
                이전
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={selectedHobbies.length < 3}
                onClick={() => setStep("club")}
              >
                다음 ({selectedHobbies.length}/3)
                <ArrowRight size={24} weight="bold" />
              </Button>
            </div>
          </>
        )}

        {step === "club" && (
          <>
            <Greeting
              icon={<UsersThree size={32} weight="duotone" />}
              title="이런 모임은 어떠세요?"
              subtitle="관심사에 맞춰 추천해드린 모임이에요"
              className="mb-6"
            />
            <div className="stagger-children space-y-3">
              {sampleClubs.map((club) => (
                <div
                  key={club.id}
                  className="animate-fade-up rounded-2xl border-2 border-mocha-100 bg-white p-5 transition-all hover:border-coral-300 hover:shadow-soft"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h4 className="text-xl font-extrabold text-mocha-900 leading-snug tracking-tight">
                      {club.name}
                    </h4>
                    <Badge variant="secondary">{club.category}</Badge>
                  </div>
                  <p className="mb-4 text-lg text-mocha-700 leading-relaxed">{club.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-base font-semibold text-mocha-700">
                      <UsersThree size={20} weight="duotone" className="text-coral-500" />
                      멤버 {club.members}명
                    </span>
                    <Button size="sm">가입하기</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <Button
                variant="ghost"
                size="lg"
                className="flex-1"
                onClick={() => router.push("/club")}
              >
                건너뛰기
              </Button>
              <Button className="flex-1" size="lg" onClick={() => router.push("/club")}>
                <Sparkle size={24} weight="fill" />
                완료
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
