"use client";

import { ChatCircle, Envelope, Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            ? "이메일 또는 비밀번호가 올바르지 않습니다."
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
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">로그인</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4 text-base font-medium text-red-700"
          >
            <WarningCircle size={24} weight="fill" className="mt-0.5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {mode === "social" ? (
          <>
            <Button variant="kakao" className="w-full" size="lg" onClick={handleKakaoLogin}>
              <ChatCircle size={26} weight="fill" />
              카카오로 시작하기
            </Button>

            <div className="relative my-4" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t-2 border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-base text-gray-600 font-medium">또는</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" size="lg" onClick={() => setMode("email")}>
              <Envelope size={26} />
              이메일로 로그인
            </Button>
          </>
        ) : (
          <form className="space-y-5" onSubmit={handleEmailLogin} noValidate>
            <div className="space-y-2">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력해주세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-orange-100"
                >
                  {showPassword ? <EyeSlash size={24} /> : <Eye size={24} />}
                </button>
              </div>
            </div>
            <Button className="w-full" size="lg" type="submit" disabled={loading}>
              {loading ? "로그인 중입니다..." : "로그인"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setMode("social")}
            >
              다른 방법으로 로그인
            </Button>
          </form>
        )}

        <div className="mt-6 border-t border-gray-100 pt-6 text-center">
          <p className="text-lg text-gray-700">
            아직 회원이 아니신가요?{" "}
            <Link
              href="/register"
              className="font-bold text-orange-600 underline underline-offset-4 hover:text-orange-700"
            >
              회원가입
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
