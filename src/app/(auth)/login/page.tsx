"use client";

import {
  ChatCircle,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Hand,
  Lock,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"social" | "email">("social");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "이메일 또는 비밀번호가 일치하지 않아요"
            : error.message
        );
        return;
      }

      router.push("/club");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding` },
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <Greeting
          icon={<Hand size={32} weight="duotone" />}
          title={mode === "social" ? "다시 만나서 반가워요" : "이메일로 로그인"}
          subtitle={
            mode === "social" ? "편한 방법으로 시작해보세요" : "가입하신 정보를 입력해주세요"
          }
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

        {mode === "social" ? (
          <div className="stagger-children space-y-3">
            <Button
              variant="kakao"
              className="mb-6 w-full animate-fade-up text-lg font-extrabold"
              size="lg"
              type="button"
              onClick={handleKakaoLogin}
            >
              <ChatCircle size={28} weight="fill" />
              카카오로 로그인하기
            </Button>

            <div className="mb-6 flex items-center gap-3 text-mocha-500" aria-hidden="true">
              <hr className="flex-1 border-mocha-200" />
              <span className="text-sm">또는 이메일로</span>
              <hr className="flex-1 border-mocha-200" />
            </div>

            <Button
              variant="outline"
              className="w-full animate-fade-up"
              size="lg"
              onClick={() => setMode("email")}
            >
              <EnvelopeSimple size={26} weight="duotone" />
              이메일로 로그인
            </Button>
          </div>
        ) : (
          <form className="stagger-children space-y-6" onSubmit={handleEmailLogin} noValidate>
            <div className="space-y-2 animate-fade-up">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                leadingIcon={<EnvelopeSimple size={26} weight="duotone" />}
              />
            </div>
            <div className="space-y-2 animate-fade-up">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호를 입력해주세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                leadingIcon={<Lock size={26} weight="duotone" />}
                trailingAction={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                    aria-pressed={showPassword}
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-mocha-700 transition-colors hover:bg-cream-100 active:bg-cream-200 focus:outline-none focus:ring-4 focus:ring-coral-200"
                  >
                    {showPassword ? <EyeSlash size={24} /> : <Eye size={24} />}
                  </button>
                }
              />
            </div>
            <div className="space-y-3 animate-fade-up pt-1">
              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading ? "로그인 중이에요..." : "로그인"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMode("social")}
              >
                다른 방법으로 로그인
              </Button>
            </div>
          </form>
        )}

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
