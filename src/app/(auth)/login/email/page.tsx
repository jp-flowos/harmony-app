"use client";

import {
  ArrowLeft,
  ChatCircle,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Lock,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { classifyLoginError, loginFailureMessage } from "@/lib/auth-errors";
import { normalizeEmail } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/client";
import { KEEP_SIGNIN_COOKIE } from "@/lib/supabase/cookie-policy";

const CHECKBOX_BRAND =
  "data-[state=checked]:border-coral-500 data-[state=checked]:bg-coral-500 focus-visible:ring-coral-200";

export default function EmailLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState("");
  const [showKakaoWay, setShowKakaoWay] = useState(false);
  const [loading, setLoading] = useState(false);

  // 비밀번호가 없는 소셜 전용 계정인지 확인 — 실패한 뒤에만 호출한다.
  const isKakaoOnlyAccount = async (target: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const json = await res.json();
      return json.success === true && json.data?.provider === "kakao";
    } catch {
      return false;
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowKakaoWay(false);
    setLoading(true);
    try {
      // 모바일 키보드 자동완성이 붙이는 공백/대문자로 정상 계정이 실패하지 않도록 정규화
      const normalizedEmail = normalizeEmail(email);
      // 로그인 전에 유지 정책 쿠키를 먼저 기록 — 이후 발급되는 auth 쿠키에 적용됨
      // biome-ignore lint/suspicious/noDocumentCookie: 로그인 전에 유지 정책 쿠키를 동기적으로 선기록해야 함
      document.cookie = `${KEEP_SIGNIN_COOKIE}=${keepSignedIn ? "1" : "0"}; Max-Age=31536000; Path=/`;
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        const reason = classifyLoginError(error);
        // 자격증명 불일치는 "카카오로만 가입한 계정"일 수도 있어 한 번 더 확인한다
        if (reason === "invalid_credentials" && (await isKakaoOnlyAccount(normalizedEmail))) {
          setError(loginFailureMessage("oauth_only"));
          setShowKakaoWay(true);
          return;
        }
        setError(loginFailureMessage(reason));
        return;
      }
      if (!data.session) {
        setError(loginFailureMessage("unknown"));
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError(loginFailureMessage("unknown"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <Link
          href="/login"
          className="mb-4 inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
        >
          <ArrowLeft size={20} />
          다른 방법으로 로그인
        </Link>

        <Greeting
          icon={<EnvelopeSimple size={32} weight="duotone" />}
          title="이메일 로그인"
          subtitle="하모니에 오신 것을 환영합니다. 이메일과 비밀번호를 입력해주세요."
          className="mb-7"
        />

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border-2 border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-4"
          >
            <div className="flex items-start gap-3 text-base font-medium text-[var(--color-danger)]">
              <WarningCircle size={26} weight="fill" className="mt-0.5 shrink-0" />
              <span className="pt-0.5">{error}</span>
            </div>
            {showKakaoWay && (
              <Link href="/login" className="mt-4 block">
                <Button variant="kakao" className="w-full text-lg font-extrabold" size="lg">
                  <ChatCircle size={26} weight="fill" />
                  카카오로 로그인하러 가기
                </Button>
              </Link>
            )}
          </div>
        )}

        <form className="stagger-children space-y-6" onSubmit={handleEmailLogin} noValidate>
          <div className="space-y-2 animate-fade-up">
            <Label htmlFor="email">이메일 주소</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              placeholder="example@harmony.com"
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
              placeholder="비밀번호를 입력하세요"
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

          <div className="flex items-center justify-between animate-fade-up">
            <label
              htmlFor="keep-signed-in"
              className="flex items-center gap-2 text-base text-mocha-800"
            >
              <Checkbox
                id="keep-signed-in"
                checked={keepSignedIn}
                onCheckedChange={(v) => setKeepSignedIn(v === true)}
                className={CHECKBOX_BRAND}
              />
              로그인 상태 유지
            </label>
            <Link
              href="/find-password"
              className="text-base font-bold text-mocha-700 underline underline-offset-2"
            >
              비밀번호 찾기
            </Link>
          </div>

          <Button className="w-full animate-fade-up" size="lg" type="submit" disabled={loading}>
            {loading ? "로그인 중이에요..." : "로그인"}
          </Button>
        </form>

        <div className="mt-7 border-t border-mocha-100 pt-6 text-center">
          <p className="text-lg text-mocha-700">
            <Link
              href="/find-id"
              className="font-bold text-coral-700 underline decoration-2 underline-offset-4"
            >
              아이디 찾기
            </Link>
            <span className="mx-2 text-mocha-300">|</span>
            <Link
              href="/register"
              className="font-bold text-coral-700 underline decoration-2 underline-offset-4"
            >
              회원가입
            </Link>
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-coral-50 to-cream-100 p-6 text-center">
          <p className="text-lg font-extrabold leading-relaxed text-coral-800">
            당신의 매일이
            <br />
            조화롭고 활기차게
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
