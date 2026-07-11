"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RsvpStatus = "joined" | "declined";

interface StoredRsvp {
  name: string;
  status: RsvpStatus;
}

function storageKey(meetingId: string): string {
  return `harmony.rsvp.${meetingId}`;
}

export function RsvpForm({ meetingId, isFull }: { meetingId: string; isFull: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState<StoredRsvp | null>(null);
  const [status, setStatus] = useState<RsvpStatus | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(meetingId));
      if (raw) setDone(JSON.parse(raw));
    } catch {
      // localStorage 접근 불가 — 폼 그대로 노출
    }
  }, [meetingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/meetings/${meetingId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName: name, guestPhone: phone || undefined, status }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "응답을 보내지 못했어요. 다시 시도해주세요");
        return;
      }
      const stored: StoredRsvp = { name, status };
      try {
        localStorage.setItem(storageKey(meetingId), JSON.stringify(stored));
      } catch {
        // 저장 실패해도 응답 자체는 완료
      }
      setDone(stored);
      router.refresh();
    } catch {
      setError("응답을 보내지 못했어요. 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="border-coral-100 bg-coral-50">
        <CardContent className="space-y-1 p-5 text-center">
          <p className="text-xl font-extrabold text-mocha-900">
            {done.name}님, {done.status === "joined" ? "참석" : "불참"}으로 응답하셨어요
          </p>
          <p className="text-base text-mocha-700">변경은 총무님께 말씀해주세요</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <p className="text-center text-xl font-extrabold text-mocha-900">참석하시나요?</p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="lg"
            className="flex-1"
            variant={status === "joined" ? "default" : "outline"}
            disabled={isFull}
            onClick={() => setStatus("joined")}
          >
            참석해요
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1"
            variant={status === "declined" ? "default" : "outline"}
            onClick={() => setStatus("declined")}
          >
            못 가요
          </Button>
        </div>
        {isFull && (
          <p className="text-center text-base font-semibold text-mocha-500">
            정원이 가득 찼어요. 불참 응답만 보낼 수 있어요
          </p>
        )}
        {status && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rsvp-name">이름</Label>
              <Input
                id="rsvp-name"
                placeholder="이름을 입력해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rsvp-phone">전화번호 (선택)</Label>
              <Input
                id="rsvp-phone"
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {error && <p className="text-base font-semibold text-red-600">{error}</p>}
            <Button className="w-full" size="lg" type="submit" disabled={submitting}>
              {submitting ? "보내는 중..." : "응답 보내기"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
