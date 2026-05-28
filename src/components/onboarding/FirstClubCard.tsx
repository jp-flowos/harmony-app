"use client";

import { ArrowRight, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Club {
  id: string;
  name: string;
  category: string;
  description: string | null;
  memberCount: number;
}

interface FirstClubCardProps {
  onEmpty?: () => void;
}

export function FirstClubCard({ onEmpty }: FirstClubCardProps) {
  const [club, setClub] = useState<Club | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;

    async function loadClub() {
      try {
        const res = await fetch("/api/onboarding/first-club");
        const j = await res.json();
        const nextClub = j.success ? (j.data.club as Club | null) : null;

        if (!alive) return;
        if (!nextClub) {
          setClub(null);
          onEmpty?.();
          return;
        }

        setClub(nextClub);
      } catch {
        if (alive) {
          setClub(null);
          onEmpty?.();
        }
      }
    }

    loadClub();

    return () => {
      alive = false;
    };
  }, [onEmpty]);

  if (club === undefined) {
    return (
      <Card className="border-coral-200 bg-gradient-to-br from-white to-cream-100">
        <CardContent className="space-y-4 p-6" aria-label="추천 모임 정보를 불러오는 중">
          <div className="h-14 w-14 animate-pulse rounded-2xl bg-coral-100" />
          <div className="space-y-3">
            <div className="h-6 w-2/3 animate-pulse rounded-full bg-mocha-100" />
            <div className="h-5 w-full animate-pulse rounded-full bg-mocha-100" />
            <div className="h-5 w-4/5 animate-pulse rounded-full bg-mocha-100" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (club === null) return null;

  return (
    <Card className="border-coral-200 bg-gradient-to-br from-white to-cream-100">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-coral-600 shadow-soft">
            <UsersThree size={32} weight="duotone" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <Badge variant="default">{club.category}</Badge>
            <h3 className="mt-2 text-xl font-extrabold text-mocha-900 leading-snug tracking-tight">
              {club.name}
            </h3>
            {club.description && (
              <p className="mt-2 line-clamp-3 text-lg text-mocha-700 leading-relaxed">
                {club.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-base font-semibold text-mocha-700">
            <UsersThree size={20} weight="duotone" aria-hidden="true" />
            회원 {club.memberCount}명
          </span>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={`/club/${club.id}`}>
              모임 보러가기
              <ArrowRight size={24} weight="bold" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
