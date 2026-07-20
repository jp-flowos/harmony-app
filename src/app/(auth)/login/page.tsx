"use client";

import { ArrowLeft, ChatCircle, DeviceMobile, Hand, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneInput } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/client";
import { KEEP_SIGNIN_COOKIE } from "@/lib/supabase/cookie-policy";

type Stage = "phone" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  // 인증 전에 유지 정책 쿠키를 기록해 두면 이후 발급되는 auth 쿠키에 적용된다.
  function markKeepSignedIn() {
    // biome-ignore lint/suspicious/noDocumentCookie: 인증 전에 유지 정책 쿠키를 동기적으로 선기록해야 함
    document.cookie = `${KEEP_SIGNIN_COOKIE}=1; Max-Age=31536000; Path=/`;
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      markKeepSignedIn();
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "잠시 후 다시 시도해주세요.");
        return;
      }
      setCode("");
      setStage("code");
    } catch {
      setError("잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "잠시 후 다시 시도해주세요.");
        return;
      }
      router.push(json.data?.isNewUser ? "/onboarding" : "/");
      router.refresh();
    } catch {
      setError("잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 번호를 바꾸면 이전 인증 상태를 버린다.
  function backToPhone() {
    setStage("phone");
    setCode("");
    setError("");
  }

  const handleKakaoLogin = async () => {
    if (kakaoLoading) return;
    setError("");
    setKakaoLoading(true);
    try {
      markKeepSignedIn();
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
          subtitle={
            stage === "phone" ? "휴대폰 번호로 시작해보세요" : "문자로 받은 인증번호를 입력해주세요"
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

        {stage === "phone" ? (
          <>
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

            <p className="mb-6 rounded-2xl bg-cream-100 p-4 text-base leading-relaxed text-mocha-700">
              이전에 카카오로 시작하셨다면 위의 카카오 버튼을 눌러주세요.
            </p>

            <div className="mb-6 flex items-center gap-3 text-mocha-500" aria-hidden="true">
              <hr className="flex-1 border-mocha-200" />
              <span className="text-sm">또는 휴대폰 번호로</span>
              <hr className="flex-1 border-mocha-200" />
            </div>

            <form className="space-y-6" onSubmit={handleSend} noValidate>
              <div className="space-y-2">
                <Label htmlFor="phone">휴대폰 번호</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  autoComplete="tel"
                  maxLength={13}
                  required
                  leadingIcon={<DeviceMobile size={26} weight="duotone" />}
                />
              </div>
              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading ? "보내는 중이에요..." : "인증번호 받기"}
              </Button>
            </form>
          </>
        ) : (
          <form className="space-y-6" onSubmit={handleVerify} noValidate>
            <button
              type="button"
              onClick={backToPhone}
              className="inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
            >
              <ArrowLeft size={20} />
              번호 다시 입력하기
            </button>

            <p className="text-lg text-mocha-800">
              <span className="font-bold">{phone}</span> 으로 보냈어요
            </p>

            <div className="space-y-2">
              <Label htmlFor="code">인증번호 6자리</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
                maxLength={6}
                required
                className="text-center text-2xl tracking-[0.4em]"
              />
            </div>

            <Button className="w-full" size="lg" type="submit" disabled={loading}>
              {loading ? "확인 중이에요..." : "확인"}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              type="button"
              onClick={handleSend}
              disabled={loading}
            >
              인증번호 다시 받기
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
