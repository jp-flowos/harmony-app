"use client";

import { ArrowRight, CheckCircle, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Confetti } from "@/components/onboarding/Confetti";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApiResponse } from "@/lib/api-response";
import { speak } from "@/lib/voice/speak";

interface PeerSample {
  nickname: string;
  avatarUrl?: string | null;
}

interface WelcomeData {
  regionLabel: string;
  regionMemberCount: number;
  peerSamples: PeerSample[];
}

type LoadState = "loading" | "ready" | "error";

const FALLBACK_DATA: WelcomeData = {
  regionLabel: "하모니",
  regionMemberCount: 0,
  peerSamples: [],
};

export default function WelcomePage() {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<WelcomeData>(FALLBACK_DATA);

  useEffect(() => {
    let ignore = false;

    async function loadWelcome() {
      try {
        const response = await fetch("/api/onboarding/welcome");
        const payload = (await response
          .json()
          .catch(() => null)) as ApiResponse<WelcomeData> | null;

        if (ignore) return;

        if (!response.ok || !payload?.success) {
          setState("error");
          return;
        }

        setData(payload.data);
        setState("ready");
        speak(`${payload.data.regionLabel}의 ${payload.data.regionMemberCount}명이 환영합니다`);
      } catch {
        if (!ignore) {
          setState("error");
        }
      }
    }

    loadWelcome();

    return () => {
      ignore = true;
    };
  }, []);

  const hasPeers = data.peerSamples.length > 0;
  const countText =
    state === "ready" && data.regionMemberCount > 0
      ? `${data.regionMemberCount.toLocaleString("ko-KR")}명`
      : "새로운 이웃";

  return (
    <section className="fixed inset-0 z-[60] flex min-h-screen items-center justify-center overflow-hidden bg-cream-50 px-5 py-8">
      <Confetti count={32} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,106,82,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(107,142,90,0.16),transparent_46%)]" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <Badge variant="success" className="mb-5 gap-1.5 px-4 py-2 text-base">
          <CheckCircle size={20} weight="fill" />첫 모임 배지가 준비됐어요
        </Badge>

        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lifted">
          <UsersThree size={54} weight="duotone" className="text-coral-600" />
        </div>

        <p className="text-lg font-bold text-coral-700">
          {state === "loading" ? "환영 인사를 준비하고 있어요" : data.regionLabel}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-mocha-900">
          {countText}이
          <br />
          환영합니다
        </h1>

        <p className="mt-5 max-w-sm text-lg leading-relaxed text-mocha-700">
          {state === "error"
            ? "환영 정보를 불러오지 못했지만 가입은 계속 진행할 수 있어요."
            : "이제 관심사에 맞는 모임과 이웃을 둘러볼 수 있어요."}
        </p>

        {hasPeers && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex -space-x-3">
              {data.peerSamples.map((peer) => (
                <Avatar key={peer.nickname} className="h-14 w-14 border-4 border-cream-50">
                  {peer.avatarUrl && <AvatarImage src={peer.avatarUrl} alt="" />}
                  <AvatarFallback>{peer.nickname.slice(0, 1)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <p className="text-base font-semibold text-mocha-700">
              {data.peerSamples.map((peer) => peer.nickname).join(", ")} 님도 함께하고 있어요
            </p>
          </div>
        )}

        <Button asChild size="lg" className="mt-10 h-18 w-full rounded-2xl text-2xl">
          <Link href="/">
            다음
            <ArrowRight size={28} weight="bold" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
