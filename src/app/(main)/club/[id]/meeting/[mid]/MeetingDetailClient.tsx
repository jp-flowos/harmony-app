"use client";

import { ArrowLeft, CalendarDots, MapPin, Users } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShareBar } from "@/components/share/ShareBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MeetingInfo {
  id: string;
  title: string;
  clubName: string;
  dateLabel: string;
  location: string;
  description: string;
  maxParticipants: number;
  joinedCount: number;
}

interface GuestItem {
  id: string;
  name: string;
  status: "joined" | "declined";
  phone: string | null;
}

export function MeetingDetailClient({
  clubId,
  meeting,
  viewerJoined,
  participants,
  guests,
  isOwnerAdmin,
  isPast,
}: {
  clubId: string;
  meeting: MeetingInfo;
  viewerJoined: boolean;
  participants: { userId: string; nickname: string }[];
  guests: GuestItem[];
  isOwnerAdmin: boolean;
  isPast: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleJoin() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/meetings/${meeting.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: viewerJoined ? "cancel" : "join" }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "요청에 실패했어요. 다시 시도해주세요");
        return;
      }
      router.refresh();
    } catch {
      setError("요청에 실패했어요. 다시 시도해주세요");
    } finally {
      setPending(false);
    }
  }

  const joinedGuests = guests.filter((g) => g.status === "joined");

  return (
    <div className="space-y-4 p-4">
      <Link
        href={`/club/${clubId}`}
        className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={20} />
        뒤로가기
      </Link>

      <Card>
        <CardHeader>
          <p className="text-base font-semibold text-coral-600">{meeting.clubName}</p>
          <CardTitle className="text-2xl">{meeting.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="flex items-center gap-2 text-lg text-gray-700">
            <CalendarDots size={22} weight="duotone" />
            {meeting.dateLabel}
          </p>
          <p className="flex items-center gap-2 text-lg text-gray-700">
            <MapPin size={22} weight="duotone" />
            {meeting.location}
          </p>
          <p className="flex items-center gap-2 text-lg text-gray-700">
            <Users size={22} weight="duotone" />
            {meeting.joinedCount}명 참여 중 (최대 {meeting.maxParticipants}명)
          </p>
          {meeting.description && (
            <p className="border-t border-gray-100 pt-3 text-base text-gray-700">
              {meeting.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 카톡 초대장 공유 — 이 기능이 이 페이지의 핵심 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">카톡으로 초대장 보내기</CardTitle>
          <p className="text-base text-gray-500">
            회원이 아니어도 초대장에서 바로 참석 응답할 수 있어요
          </p>
        </CardHeader>
        <CardContent>
          <ShareBar
            title={`${meeting.clubName} · ${meeting.title}`}
            description={`${meeting.dateLabel} · ${meeting.location}`}
            path={`/s/meeting/${meeting.id}`}
          />
        </CardContent>
      </Card>

      {!isPast && (
        <div className="space-y-2">
          {error && <p className="text-base font-semibold text-red-600">{error}</p>}
          <Button
            className="w-full"
            size="lg"
            variant={viewerJoined ? "outline" : "default"}
            disabled={pending || (!viewerJoined && meeting.joinedCount >= meeting.maxParticipants)}
            onClick={toggleJoin}
          >
            {viewerJoined
              ? "참석 취소하기"
              : meeting.joinedCount >= meeting.maxParticipants
                ? "정원이 가득 찼어요"
                : "참석하기"}
          </Button>
        </div>
      )}
      {isPast && <p className="text-center text-base text-gray-400">지난 모임이에요</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">참석자 ({meeting.joinedCount}명)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {participants.map((p) => (
            <div key={p.userId} className="flex items-center gap-2">
              <span className="text-base font-medium text-gray-900">{p.nickname}</span>
              <Badge variant="secondary">회원</Badge>
            </div>
          ))}
          {joinedGuests.map((g) => (
            <div key={g.id} className="flex items-center gap-2">
              <span className="text-base font-medium text-gray-900">{g.name}</span>
              <Badge variant="cream">초대 손님</Badge>
              {isOwnerAdmin && g.phone && <span className="text-sm text-gray-400">{g.phone}</span>}
            </div>
          ))}
          {meeting.joinedCount === 0 && (
            <p className="text-base text-gray-400">아직 참석자가 없어요</p>
          )}
        </CardContent>
      </Card>

      {isOwnerAdmin && guests.some((g) => g.status === "declined") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">불참 응답</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {guests
              .filter((g) => g.status === "declined")
              .map((g) => (
                <div key={g.id} className="flex items-center gap-2">
                  <span className="text-base text-gray-500">{g.name}</span>
                  {g.phone && <span className="text-sm text-gray-400">{g.phone}</span>}
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
