"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatCircle, Envelope } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"social" | "email">("social");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        setError(error.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : error.message);
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
        <CardTitle className="text-center text-2xl">로그인</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {mode === "social" ? (
          <>
            <Button
              variant="kakao"
              className="w-full"
              size="lg"
              onClick={handleKakaoLogin}
            >
              <ChatCircle size={24} weight="fill" />
              카카오로 시작하기
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-400">또는</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => setMode("email")}
            >
              <Envelope size={24} />
              이메일로 로그인
            </Button>
          </>
        ) : (
          <form className="space-y-4" onSubmit={handleEmailLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button className="w-full" size="lg" type="submit" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setMode("social")}>
              다른 방법으로 로그인
            </Button>
          </form>
        )}
        <div className="mt-6 text-center">
          <p className="text-base text-gray-500">
            아직 회원이 아니신가요?{" "}
            <Link href="/register" className="font-medium text-orange-500 hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
