"use client";

import { ChatCircleDots, HandWaving } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME ?? "운영팀 김미경";
const KAKAO = process.env.NEXT_PUBLIC_OPERATOR_KAKAO_CHANNEL_URL ?? "";

export function OperatorCard() {
  return (
    <Card className="border-coral-200 bg-gradient-to-br from-white to-coral-50">
      <CardContent className="space-y-4 p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-coral-500 shadow-soft">
          <HandWaving size={32} weight="duotone" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-mocha-900 leading-snug tracking-tight">
            안녕하세요, 저는 {NAME}입니다
          </h3>
          <p className="text-lg text-mocha-700 leading-relaxed">
            처음이 어려울 수 있어요. 언제든 카톡으로 물어보세요.
          </p>
        </div>
        {KAKAO && (
          <Button asChild variant="kakao" size="lg" className="w-full sm:w-auto">
            <a href={KAKAO} target="_blank" rel="noreferrer">
              <ChatCircleDots size={24} weight="fill" aria-hidden="true" />
              카카오상담 열기
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
