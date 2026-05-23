"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">
          {step === "region" && "지역을 선택해주세요"}
          {step === "hobby" && "취미를 선택해주세요"}
          {step === "club" && "추천 클럽"}
        </CardTitle>
        <div
          className="flex justify-center gap-2 pt-3"
          role="progressbar"
          aria-valuenow={["region", "hobby", "club"].indexOf(step) + 1}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-label="시작하기 진행 단계"
        >
          {(["region", "hobby", "club"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-2.5 w-16 rounded-full transition-colors ${
                i <= ["region", "hobby", "club"].indexOf(step) ? "bg-orange-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {step === "region" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {regions.map((region) => (
                <Button
                  key={region}
                  variant={selectedRegion === region ? "default" : "outline"}
                  onClick={() => setSelectedRegion(region)}
                  aria-pressed={selectedRegion === region}
                >
                  {region}
                </Button>
              ))}
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={!selectedRegion}
              onClick={() => setStep("hobby")}
            >
              다음
            </Button>
          </div>
        )}

        {step === "hobby" && (
          <div className="space-y-6">
            <p className="text-center text-lg text-gray-700 font-medium">3개 이상 선택해주세요</p>
            {hobbyCategories.map((cat) => (
              <div key={cat.category} className="space-y-3">
                <h4 className="text-lg font-bold text-gray-900">{cat.category}</h4>
                <div className="flex flex-wrap gap-3">
                  {cat.items.map((hobby) => {
                    const isSelected = selectedHobbies.includes(hobby);
                    return (
                      <button
                        key={hobby}
                        type="button"
                        onClick={() => toggleHobby(hobby)}
                        aria-pressed={isSelected}
                        className={`min-h-[48px] rounded-full px-5 py-3 text-lg font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-orange-200 ${
                          isSelected
                            ? "bg-orange-500 text-white border-2 border-orange-500"
                            : "bg-white text-gray-900 border-2 border-gray-300 hover:border-orange-400 hover:bg-orange-50"
                        }`}
                      >
                        {hobby}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep("region")}
              >
                이전
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={selectedHobbies.length < 3}
                onClick={() => setStep("club")}
              >
                다음 ({selectedHobbies.length}/3)
              </Button>
            </div>
          </div>
        )}

        {step === "club" && (
          <div className="space-y-4">
            <p className="text-center text-lg text-gray-700 font-medium">
              관심사에 맞는 클럽을 추천해드려요
            </p>
            {sampleClubs.map((club) => (
              <div
                key={club.id}
                className="rounded-2xl border-2 border-gray-200 p-5 space-y-3 hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-xl font-bold text-gray-900 leading-snug">{club.name}</h4>
                  <Badge variant="secondary">{club.category}</Badge>
                </div>
                <p className="text-lg text-gray-700 leading-relaxed">{club.description}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-base text-gray-700 font-medium">멤버 {club.members}명</span>
                  <Button size="sm">가입하기</Button>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => router.push("/club")}
              >
                건너뛰기
              </Button>
              <Button className="flex-1" size="lg" onClick={() => router.push("/club")}>
                완료
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
