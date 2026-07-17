"use client";

import { ChatCircle, EnvelopeSimple, Hand, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "@/components/ui/greeting";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [kakaoLoading, setKakaoLoading] = useState(false);

  const handleKakaoLogin = async () => {
    if (kakaoLoading) return;
    setError("");
    setKakaoLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding` },
      });
      if (error) {
        console.error("Failed to start Kakao OAuth", error);
        setError("카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("Failed to start Kakao OAuth", error);
      setError("카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setKakaoLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <Greeting
          icon={<Hand size={32} weight="duotone" />}
          title="다시 만나서 반가워요"
          subtitle="편한 방법으로 시작해보세요"
          className="mb-7"
        />

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-4 text-base font-medium text-[var(--color-danger)]"
          >
            <WarningCircle size={26} weight="fill" className="mt-0.5 shrink-0" />
            <span className="pt-0.5">{error}</span>
          </div>
        )}

        <div className="stagger-children space-y-3">
          <Button
            variant="kakao"
            className="mb-6 w-full animate-fade-up text-lg font-extrabold"
            size="lg"
            type="button"
            onClick={handleKakaoLogin}
            disabled={kakaoLoading}
          >
            <ChatCircle size={28} weight="fill" />
            {kakaoLoading ? "카카오로 연결 중..." : "카카오로 로그인하기"}
          </Button>

          <div className="mb-6 flex items-center gap-3 text-mocha-500" aria-hidden="true">
            <hr className="flex-1 border-mocha-200" />
            <span className="text-sm">또는 이메일로</span>
            <hr className="flex-1 border-mocha-200" />
          </div>

          <Link href="/login/email" className="block">
            <Button variant="outline" className="w-full animate-fade-up" size="lg" type="button">
              <EnvelopeSimple size={26} weight="duotone" />
              이메일로 로그인
            </Button>
          </Link>
        </div>

        <div className="mt-7 border-t border-mocha-100 pt-6 text-center">
          <p className="text-lg text-mocha-700">
            아직 회원이 아니신가요?{" "}
            <Link
              href="/register"
              className="font-bold text-coral-700 underline decoration-2 underline-offset-4 hover:text-coral-800"
            >
              회원가입
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
