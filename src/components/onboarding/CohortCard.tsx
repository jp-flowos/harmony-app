"use client";

import { UsersThree } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Peer {
  nickname: string | null;
  joinedAgo: string;
}

interface CohortCardProps {
  onEmpty?: () => void;
}

function isPeer(value: unknown): value is Peer {
  if (!value || typeof value !== "object") return false;

  const peer = value as Partial<Peer>;
  const hasValidNickname = typeof peer.nickname === "string" || peer.nickname === null;
  return hasValidNickname && typeof peer.joinedAgo === "string";
}

export function CohortCard({ onEmpty }: CohortCardProps) {
  const [peers, setPeers] = useState<Peer[] | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;

    async function loadPeers() {
      try {
        const res = await fetch("/api/onboarding/cohort");
        const j = await res.json();
        const nextPeers =
          j.success && Array.isArray(j.data?.peers) ? j.data.peers.filter(isPeer) : [];

        if (!alive) return;
        if (nextPeers.length === 0) {
          setPeers(null);
          onEmpty?.();
          return;
        }

        setPeers(nextPeers);
      } catch {
        if (alive) {
          setPeers(null);
          onEmpty?.();
        }
      }
    }

    loadPeers();

    return () => {
      alive = false;
    };
  }, [onEmpty]);

  if (peers === undefined) {
    return (
      <Card className="border-sage-200 bg-gradient-to-br from-white to-sage-50">
        <CardContent className="space-y-4 p-6" aria-label="새 이웃 정보를 불러오는 중">
          <div className="h-14 w-14 animate-pulse rounded-2xl bg-sage-100" />
          <div className="space-y-3">
            <div className="h-6 w-2/3 animate-pulse rounded-full bg-mocha-100" />
            <div className="h-5 w-full animate-pulse rounded-full bg-mocha-100" />
            <div className="h-5 w-4/5 animate-pulse rounded-full bg-mocha-100" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (peers === null) return null;

  return (
    <Card className="border-sage-200 bg-gradient-to-br from-white to-sage-50">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-sage-700 shadow-soft">
            <UsersThree size={32} weight="duotone" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <Badge variant="secondary">새 이웃</Badge>
            <h3 className="mt-2 text-xl font-extrabold text-mocha-900 leading-snug tracking-tight">
              근처에서 새로 시작한 분들이 있어요
            </h3>
            <p className="mt-1 text-lg text-mocha-700 leading-relaxed">
              같은 지역의 새 회원들과 천천히 인사를 나눠보세요.
            </p>
          </div>
        </div>

        <ul className="space-y-3">
          {peers.map((peer) => (
            <li
              key={`${peer.nickname ?? "하모니 회원"}-${peer.joinedAgo}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-mocha-100 bg-white px-4 py-3"
            >
              <span className="min-w-0 truncate text-lg font-extrabold text-mocha-900">
                {peer.nickname ?? "하모니 회원"}
              </span>
              <span className="shrink-0 text-base font-semibold text-mocha-700">
                {peer.joinedAgo}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
