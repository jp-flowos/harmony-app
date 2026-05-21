"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const regions = [
  "서울", "경기", "인천", "부산", "대구", "대전", "광주",
  "울산", "세종", "강원", "충북", "충남", "전북", "전남",
  "경북", "경남", "제주",
];

const hobbyCategories = [
  { category: "운동", items: ["등산", "골프", "수영", "요가", "배드민턴", "탁구", "걷기"] },
  { category: "문화", items: ["독서", "영화", "음악감상", "미술", "사진", "서예"] },
  { category: "생활", items: ["요리", "원예", "여행", "낚시", "바둑", "댄스"] },
  { category: "교육", items: ["외국어", "컴퓨터", "악기연주", "역사탐방"] },
];

const sampleClubs = [
  { id: "1", name: "서울 등산 모임", category: "등산", members: 45, description: "매주 토요일 서울 근교 산행" },
  { id: "2", name: "골프 친구들", category: "골프", members: 32, description: "월 2회 정기 라운딩" },
  { id: "3", name: "독서 클럽", category: "독서", members: 28, description: "매월 1권 완독 후 토론" },
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
        <CardTitle className="text-center text-2xl">
          {step === "region" && "지역을 선택해주세요"}
          {step === "hobby" && "취미를 선택해주세요"}
          {step === "club" && "추천 클럽"}
        </CardTitle>
        <div className="flex justify-center gap-2 pt-2">
          {(["region", "hobby", "club"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full ${
                i <= ["region", "hobby", "club"].indexOf(step) ? "bg-orange-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {step === "region" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {regions.map((region) => (
                <Button
                  key={region}
                  variant={selectedRegion === region ? "default" : "outline"}
                  onClick={() => setSelectedRegion(region)}
                  className="text-base"
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
            <p className="text-center text-base text-gray-500">3개 이상 선택해주세요</p>
            {hobbyCategories.map((cat) => (
              <div key={cat.category} className="space-y-2">
                <h4 className="text-base font-semibold text-gray-700">{cat.category}</h4>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((hobby) => (
                    <button
                      key={hobby}
                      type="button"
                      onClick={() => toggleHobby(hobby)}
                      className={`rounded-full px-4 py-2 text-base font-medium transition-colors ${
                        selectedHobbies.includes(hobby)
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {hobby}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("region")}>
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
            <p className="text-center text-base text-gray-500">
              관심사에 맞는 클럽을 추천해드려요
            </p>
            {sampleClubs.map((club) => (
              <div
                key={club.id}
                className="rounded-xl border border-gray-200 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">{club.name}</h4>
                  <Badge variant="secondary">{club.category}</Badge>
                </div>
                <p className="text-base text-gray-500">{club.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">멤버 {club.members}명</span>
                  <Button size="sm">가입하기</Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-4">
              <Button variant="ghost" className="flex-1" onClick={() => router.push("/club")}>
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
