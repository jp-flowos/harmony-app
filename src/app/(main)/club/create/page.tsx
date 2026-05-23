"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const categories = [
  "등산",
  "골프",
  "독서",
  "요리",
  "사진",
  "여행",
  "음악",
  "댄스",
  "낚시",
  "바둑",
  "원예",
  "수영",
];
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
const joinTypes = [
  { value: "open", label: "자유 가입" },
  { value: "approval", label: "승인 후 가입" },
];

export default function CreateClubPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [joinType, setJoinType] = useState("open");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: API call
    router.push("/club");
  };

  return (
    <div className="space-y-4 p-4">
      <Link
        href="/club"
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        뒤로가기
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">클럽 만들기</CardTitle>
          <p className="text-base text-gray-500">실명인증 완료 후 클럽을 만들 수 있습니다</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="club-name">클럽 이름</Label>
              <Input
                id="club-name"
                placeholder="클럽 이름을 입력해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>지역</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="지역 선택" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">클럽 소개</Label>
              <Textarea
                id="description"
                placeholder="클럽을 소개해주세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>가입 방식</Label>
              <Select value={joinType} onValueChange={setJoinType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {joinTypes.map((j) => (
                    <SelectItem key={j.value} value={j.value}>
                      {j.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" size="lg" type="submit">
              클럽 만들기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
