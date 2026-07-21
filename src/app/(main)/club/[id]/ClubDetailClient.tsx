"use client";

import {
  Bell,
  CalendarDots,
  ChatCircle,
  ImageSquare,
  MapPin,
  Plus,
  PushPin,
  Users,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClubInfo {
  id: string;
  name: string;
  category: string;
  region: string;
  description: string;
  memberCount: number;
}

interface MeetingItem {
  id: string;
  title: string;
  dateLabel: string;
  location: string;
  joinedCount: number;
  maxParticipants: number;
}

interface NoticeItem {
  id: string;
  title: string | null;
  content: string;
  imageUrl: string | null;
  isPinned: boolean;
  dateLabel: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  등산: "⛰️",
  골프: "⛳",
  독서: "📚",
  요리: "🍳",
  사진: "📷",
  여행: "✈️",
  음악: "🎵",
  댄스: "💃",
  낚시: "🎣",
  바둑: "⚫",
  원예: "🌿",
  수영: "🏊",
};

// Mock data — to be replaced when respective domains are wired (Phase 3+):
//   posts ← h_club_posts, members ← h_club_members (notices are now real data)
const posts = [
  {
    id: "1",
    author: "산사랑",
    content: "지난주 관악산 후기입니다 🏔️",
    likes: 12,
    comments: 3,
    date: "2024-03-02",
  },
  {
    id: "2",
    author: "등산매니아",
    content: "등산화 추천 부탁드려요",
    likes: 5,
    comments: 8,
    date: "2024-03-01",
  },
];
const members = [
  { id: "u1", nickname: "산사랑", role: "owner" as const },
  { id: "u2", nickname: "등산매니아", role: "admin" as const },
  { id: "u3", nickname: "건강한인생", role: "member" as const },
  { id: "u4", nickname: "행복한시니어", role: "member" as const },
];
const photoSlots = ["photo-1", "photo-2", "photo-3", "photo-4", "photo-5", "photo-6"] as const;
const roleLabels: Record<string, string> = { owner: "모임장", admin: "운영진", member: "멤버" };

export function ClubDetailClient({
  club,
  meetings,
  notices,
  canManageNotices,
  canDeleteNotices,
  canCreateMeeting,
  myRole,
}: {
  club: ClubInfo;
  meetings: MeetingItem[];
  notices: NoticeItem[];
  canManageNotices: boolean;
  canDeleteNotices: boolean;
  canCreateMeeting: boolean;
  myRole: "owner" | "admin" | "member" | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const joined = myRole !== null;

  async function handleDeleteNotice(noticeId: string) {
    if (!window.confirm("이 공지를 삭제할까요?")) return;
    setDeletingId(noticeId);
    setNoticeError(null);
    try {
      const res = await fetch(`/api/clubs/${club.id}/notices/${noticeId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setNoticeError(json?.error?.message ?? "공지를 삭제하지 못했어요. 다시 시도해주세요");
        return;
      }
      router.refresh();
    } catch {
      setNoticeError("공지를 삭제하지 못했어요. 다시 시도해주세요");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleJoinToggle() {
    if (joined && !window.confirm("클럽에서 탈퇴할까요?")) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${club.id}/join`, {
        method: joined ? "DELETE" : "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "요청에 실패했어요. 다시 시도해주세요");
        return;
      }
      router.refresh();
    } catch {
      setError("요청에 실패했어요. 다시 시도해주세요");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Club Header */}
      <div className="bg-gradient-to-b from-orange-100 to-white p-6 text-center">
        <div className="text-5xl mb-3">{CATEGORY_EMOJI[club.category] ?? "🌼"}</div>
        <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Badge>{club.category}</Badge>
          <Badge variant="secondary">{club.region}</Badge>
          <span className="text-sm text-gray-400">멤버 {club.memberCount}명</span>
        </div>
        <p className="mt-3 text-base text-gray-600">{club.description}</p>
        {myRole === "owner" ? (
          <p className="mt-4 text-base font-medium text-orange-600">내가 만든 클럽이에요</p>
        ) : (
          <Button
            className="mt-4 w-full max-w-xs"
            size="lg"
            variant={joined ? "outline" : "default"}
            disabled={pending}
            onClick={handleJoinToggle}
          >
            {pending ? "처리 중..." : joined ? "가입됨 ✓ (누르면 탈퇴)" : "클럽 가입하기"}
          </Button>
        )}
        {error && <p className="mt-2 text-base text-red-600">{error}</p>}
      </div>

      {/* 지도에서 보기 — Phase 2 cross-link */}
      <div className="px-4">
        <Link href="/map" className="block">
          <Card className="transition-all hover:border-sage-200 hover:shadow-soft">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-50">
                <MapPin size={24} weight="duotone" className="text-sage-700" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-mocha-900">지도에서 보기</p>
                <p className="text-base text-mocha-700">모임 장소와 주변 정보를 확인해보세요</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs defaultValue="notice">
          <TabsList>
            <TabsTrigger value="notice">
              <Bell size={18} className="mr-1" /> 공지
            </TabsTrigger>
            <TabsTrigger value="board">게시판</TabsTrigger>
            <TabsTrigger value="meeting">
              <CalendarDots size={18} className="mr-1" /> 일정
            </TabsTrigger>
            <TabsTrigger value="photo">
              <ImageSquare size={18} className="mr-1" /> 사진
            </TabsTrigger>
            <TabsTrigger value="chat">
              <ChatCircle size={18} className="mr-1" /> 채팅
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users size={18} className="mr-1" /> 멤버
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notice" className="space-y-3">
            {canManageNotices && (
              <Link href={`/club/${club.id}/notice/create`} className="block">
                <Button className="w-full" size="lg" variant="outline">
                  <Plus size={22} weight="bold" />
                  공지 등록
                </Button>
              </Link>
            )}
            {noticeError && (
              <p className="text-base font-semibold text-red-600">{noticeError}</p>
            )}
            {notices.length === 0 && (
              <p className="py-8 text-center text-base text-gray-400">아직 등록된 공지가 없어요</p>
            )}
            {notices.map((n) => (
              <Card key={n.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {n.isPinned && (
                        <Badge className="mb-1">
                          <PushPin size={14} weight="fill" className="mr-1" /> 중요
                        </Badge>
                      )}
                      {n.title && (
                        <h3 className="text-lg font-bold text-gray-900 leading-snug">{n.title}</h3>
                      )}
                    </div>
                    <span className="shrink-0 text-sm text-gray-400">{n.dateLabel}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-base text-gray-700">{n.content}</p>
                  {n.imageUrl && (
                    // biome-ignore lint/performance/noImgElement: 스토리지 public URL — next/image 도메인 보장 불가
                    <img
                      src={n.imageUrl}
                      alt=""
                      className="max-h-72 w-full rounded-xl object-cover"
                    />
                  )}
                  {(canManageNotices || canDeleteNotices) && (
                    <div className="flex gap-2 pt-1">
                      {canManageNotices && (
                        <Link href={`/club/${club.id}/notice/${n.id}/edit`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            수정
                          </Button>
                        </Link>
                      )}
                      {canDeleteNotices && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600"
                          disabled={deletingId === n.id}
                          onClick={() => handleDeleteNotice(n.id)}
                        >
                          {deletingId === n.id ? "삭제 중..." : "삭제"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="board" className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">{post.author[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-base font-medium">{post.author}</span>
                    <span className="text-sm text-gray-400">{post.date}</span>
                  </div>
                  <p className="text-base text-gray-700">{post.content}</p>
                  <div className="mt-2 flex gap-3 text-sm text-gray-400">
                    <span>❤️ {post.likes}</span>
                    <span>💬 {post.comments}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="meeting" className="space-y-3">
            {canCreateMeeting && (
              <Link href={`/club/${club.id}/meeting/create`} className="block">
                <Button className="w-full" size="lg" variant="outline">
                  <Plus size={22} weight="bold" />
                  모임 만들기
                </Button>
              </Link>
            )}
            {meetings.length === 0 && (
              <p className="py-8 text-center text-base text-gray-400">아직 예정된 모임이 없어요</p>
            )}
            {meetings.map((m) => (
              <Link key={m.id} href={`/club/${club.id}/meeting/${m.id}`} className="block">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900">{m.title}</h3>
                    <p className="mt-1 text-base text-gray-500">📅 {m.dateLabel}</p>
                    <p className="text-base text-gray-500">📍 {m.location}</p>
                    <p className="mt-2 text-sm text-gray-400">
                      {m.joinedCount}/{m.maxParticipants}명 참여
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </TabsContent>

          <TabsContent value="photo">
            <div className="grid grid-cols-3 gap-2">
              {photoSlots.map((photoId) => (
                <div
                  key={photoId}
                  className="aspect-square rounded-xl bg-gray-200 flex items-center justify-center text-2xl"
                >
                  📷
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <div className="py-8 text-center">
              <ChatCircle size={48} className="mx-auto text-gray-300" />
              <p className="mt-3 text-base text-gray-400">클럽 채팅방</p>
              <Button className="mt-3" onClick={() => {}}>
                채팅 참여하기
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-white p-3">
                <Avatar>
                  <AvatarFallback>{m.nickname[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <span className="text-base font-medium text-gray-900">{m.nickname}</span>
                </div>
                <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                  {roleLabels[m.role]}
                </Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
