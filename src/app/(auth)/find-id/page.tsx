"use client";

import { ArrowLeft, DeviceMobile, ShieldCheck, User, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneInput } from "@/lib/auth-utils";

type Result =
  | { found: false }
  | { found: true; provider: "kakao" }
  | { found: true; maskedEmail: string };

export default function FindIdPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/find-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "잠시 후 다시 시도해주세요.");
        return;
      }
      setResult(json.data as Result);
    } catch {
      setError("잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-7 sm:p-8">
        <Link
          href="/login/email"
          className="mb-4 inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
        >
          <ArrowLeft size={20} />
          로그인으로 돌아가기
        </Link>

        <Greeting
          icon={<User size={32} weight="duotone" />}
          title="아이디 찾기"
          subtitle="가입 시 등록한 이름과 휴대폰 번호를 입력해주세요."
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

        {result && (
          // biome-ignore lint/a11y/useSemanticElements: <output>은 인라인 기본 표시로 카드 레이아웃(padding/text-align)이 깨짐 — 기존 알림 div 패턴 유지
          <div
            role="status"
            className="mb-5 rounded-2xl border border-sage-200 bg-sage-50 p-5 text-center"
          >
            {!result.found ? (
              <p className="text-base leading-relaxed text-mocha-800">
                입력하신 정보와 일치하는 계정을 찾지 못했어요.
                <br />
                가입 시 정보를 다시 확인해주세요.
                <br />
                <span className="text-sm text-mocha-600">
                  (예전에 가입하셨다면 이름·휴대폰이 등록되지 않았을 수 있어요)
                </span>
              </p>
            ) : "provider" in result ? (
              <p className="text-base leading-relaxed text-mocha-800">
                카카오로 가입된 계정이에요.
                <br />
                <Link href="/login" className="font-bold text-coral-700 underline">
                  카카오로 로그인하기
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-base text-mocha-800">회원님의 아이디는</p>
                <p className="text-xl font-extrabold text-mocha-900">{result.maskedEmail}</p>
                <Link href="/login/email" className="block">
                  <Button className="w-full" size="lg" asChild>
                    <span>로그인하러 가기</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        <form className="stagger-children space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2 animate-fade-up">
            <Label htmlFor="find-name">이름</Label>
            <Input
              id="find-name"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={10}
              required
              leadingIcon={<User size={26} weight="duotone" />}
            />
          </div>
          <div className="space-y-2 animate-fade-up">
            <Label htmlFor="find-phone">휴대폰 번호</Label>
            <Input
              id="find-phone"
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

          <div className="flex items-center gap-3 rounded-2xl bg-cream-100 p-4 animate-fade-up">
            <ShieldCheck size={28} weight="duotone" className="shrink-0 text-coral-600" />
            <p className="text-base text-mocha-700">소중한 개인정보는 안전하게 보호됩니다</p>
          </div>

          <Button className="w-full animate-fade-up" size="lg" type="submit" disabled={loading}>
            {loading ? "찾는 중이에요..." : "아이디 찾기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
