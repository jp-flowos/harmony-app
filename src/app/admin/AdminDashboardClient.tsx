"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// --- Stats ---
const stats = {
  totalUsers: 1234,
  newUsersToday: 15,
  totalClubs: 89,
  activeClubs: 67,
  pendingReports: 5,
  processedReports: 42,
  premiumSubscribers: 156,
  monthlyRevenue: 1560000,
};

// --- Reports ---
interface Report {
  id: string;
  type: string;
  reason: string;
  status: "pending" | "processed";
  date: string;
  targetId: string;
}

const initialReports: Report[] = [
  {
    id: "1",
    type: "post",
    reason: "부적절한 게시글",
    status: "pending",
    date: "2024-03-02",
    targetId: "p1",
  },
  {
    id: "2",
    type: "comment",
    reason: "스팸 댓글",
    status: "pending",
    date: "2024-03-02",
    targetId: "c1",
  },
  {
    id: "3",
    type: "user",
    reason: "욕설/비방",
    status: "processed",
    date: "2024-03-01",
    targetId: "u1",
  },
  {
    id: "4",
    type: "post",
    reason: "허위 정보",
    status: "pending",
    date: "2024-03-01",
    targetId: "p2",
  },
];

// --- Info Contents ---
interface InfoContent {
  id: string;
  title: string;
  category: string;
  status: "published" | "draft";
  date: string;
}

const initialContents: InfoContent[] = [
  {
    id: "1",
    title: "봄철 건강 관리 가이드",
    category: "건강",
    status: "published",
    date: "2024-03-01",
  },
  {
    id: "2",
    title: "2024 정부 지원금 총정리",
    category: "정부지원",
    status: "published",
    date: "2024-02-28",
  },
  { id: "3", title: "시니어 여행지 TOP 10", category: "여행", status: "draft", date: "2024-02-27" },
];

// --- Subscription Stats ---
const subscriptionStats = [
  { month: "2024-01", count: 120, revenue: 1200000 },
  { month: "2024-02", count: 145, revenue: 1450000 },
  { month: "2024-03", count: 156, revenue: 1560000 },
];

export default function AdminDashboardClient() {
  const [reports, setReports] = useState(initialReports);
  const [contents, setContents] = useState(initialContents);
  const [newContentTitle, setNewContentTitle] = useState("");
  const [newContentCategory, setNewContentCategory] = useState("건강");
  const [newContentBody, setNewContentBody] = useState("");
  const [fortuneEditZodiac, setFortuneEditZodiac] = useState("");
  const [fortuneEditContent, setFortuneEditContent] = useState("");

  const handleProcessReport = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "processed" as const } : r))
    );
  };

  const handleAddContent = () => {
    if (!newContentTitle.trim()) return;
    const content: InfoContent = {
      id: crypto.randomUUID(),
      title: newContentTitle,
      category: newContentCategory,
      status: "draft",
      date: new Date().toISOString().slice(0, 10),
    };
    setContents([content, ...contents]);
    setNewContentTitle("");
    setNewContentBody("");
  };

  const handleDeleteContent = (id: string) => {
    setContents((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-orange-500">
                {stats.totalUsers.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-gray-500">전체 회원</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-green-500">+{stats.newUsersToday}</p>
              <p className="mt-1 text-sm text-gray-500">오늘 가입</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-blue-500">{stats.premiumSubscribers}</p>
              <p className="mt-1 text-sm text-gray-500">프리미엄 구독</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-red-500">{stats.pendingReports}</p>
              <p className="mt-1 text-sm text-gray-500">미처리 신고</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reports">
          <TabsList>
            <TabsTrigger value="reports">신고 관리</TabsTrigger>
            <TabsTrigger value="contents">콘텐츠 관리</TabsTrigger>
            <TabsTrigger value="subscriptions">구독 현황</TabsTrigger>
            <TabsTrigger value="fortune">운세 편집</TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4 space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>커뮤니티 신고 처리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={report.status === "pending" ? "destructive" : "secondary"}>
                          {report.status === "pending" ? "미처리" : "처리됨"}
                        </Badge>
                        <Badge variant="outline">{report.type}</Badge>
                      </div>
                      <p className="text-base text-gray-700">{report.reason}</p>
                      <p className="text-sm text-gray-400">{report.date}</p>
                    </div>
                    {report.status === "pending" && (
                      <Button size="sm" onClick={() => handleProcessReport(report.id)}>
                        처리
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contents Tab */}
          <TabsContent value="contents" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>정보글 작성</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="제목"
                  value={newContentTitle}
                  onChange={(e) => setNewContentTitle(e.target.value)}
                />
                <select
                  className="w-full rounded-md border p-2 text-sm"
                  value={newContentCategory}
                  onChange={(e) => setNewContentCategory(e.target.value)}
                >
                  <option value="건강">건강</option>
                  <option value="재테크">재테크</option>
                  <option value="여행">여행</option>
                  <option value="취미">취미</option>
                  <option value="정부지원">정부지원</option>
                </select>
                <Textarea
                  placeholder="내용"
                  value={newContentBody}
                  onChange={(e) => setNewContentBody(e.target.value)}
                  rows={5}
                />
                <Button onClick={handleAddContent}>작성</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>콘텐츠 목록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contents.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.status === "published" ? "default" : "secondary"}>
                          {c.status === "published" ? "게시됨" : "임시저장"}
                        </Badge>
                        <Badge variant="outline">{c.category}</Badge>
                      </div>
                      <p className="mt-1 text-base font-medium text-gray-700">{c.title}</p>
                      <p className="text-sm text-gray-400">{c.date}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteContent(c.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>월별 구독 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subscriptionStats.map((s) => (
                    <div
                      key={s.month}
                      className="flex items-center justify-between rounded-xl bg-gray-50 p-4"
                    >
                      <div>
                        <p className="text-base font-medium text-gray-700">{s.month}</p>
                        <p className="text-sm text-gray-400">구독자 {s.count}명</p>
                      </div>
                      <p className="text-lg font-bold text-orange-500">
                        ₩{s.revenue.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-orange-50 p-4 text-center">
                  <p className="text-sm text-gray-500">이번 달 총 매출</p>
                  <p className="text-2xl font-bold text-orange-500">
                    ₩{stats.monthlyRevenue.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fortune Edit Tab */}
          <TabsContent value="fortune" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>운세 콘텐츠 편집 (관리자 전용)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-500">
                  기본 운세는 알고리즘으로 생성됩니다. 특별 메시지를 추가하려면 아래에서 편집하세요.
                </p>
                <select
                  className="w-full rounded-md border p-2 text-sm"
                  value={fortuneEditZodiac}
                  onChange={(e) => setFortuneEditZodiac(e.target.value)}
                >
                  <option value="">띠 선택</option>
                  {[
                    "쥐",
                    "소",
                    "호랑이",
                    "토끼",
                    "용",
                    "뱀",
                    "말",
                    "양",
                    "원숭이",
                    "닭",
                    "개",
                    "돼지",
                  ].map((z) => (
                    <option key={z} value={z}>
                      {z}띠
                    </option>
                  ))}
                </select>
                <Textarea
                  placeholder="특별 운세 메시지 (비우면 기본 알고리즘 사용)"
                  value={fortuneEditContent}
                  onChange={(e) => setFortuneEditContent(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={() => {
                    setFortuneEditZodiac("");
                    setFortuneEditContent("");
                  }}
                >
                  저장
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
