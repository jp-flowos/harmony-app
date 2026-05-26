"use client";

import {
  ArrowLeft,
  ChatCircle,
  Check,
  Crown,
  MapPin,
  ShieldCheck,
  Star,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlanFeature {
  label: string;
  free: boolean;
  premium: boolean;
}

const features: PlanFeature[] = [
  { label: "클럽 가입 (3개)", free: true, premium: true },
  { label: "클럽 가입 (무제한)", free: false, premium: true },
  { label: "모임 참여", free: true, premium: true },
  { label: "1:1 채팅 (3회/일)", free: true, premium: true },
  { label: "1:1 채팅 (무제한)", free: false, premium: true },
  { label: "프리미엄 배지", free: false, premium: true },
  { label: "프로필 상단 노출", free: false, premium: true },
  { label: "모임 후기 사진 등록", free: false, premium: true },
  { label: "광고 제거", free: false, premium: true },
  { label: "정보 콘텐츠 전체 열람", free: false, premium: true },
];

const premiumBenefits = [
  { icon: Crown, label: "프리미엄 배지", desc: "프로필에 프리미엄 배지가 표시됩니다" },
  { icon: ChatCircle, label: "무제한 1:1 채팅", desc: "하루 제한 없이 대화할 수 있어요" },
  { icon: Star, label: "상단 노출", desc: "클럽과 모임에서 프로필이 먼저 보여요" },
  { icon: MapPin, label: "프리미엄 장소 정보", desc: "추가 장소 정보와 리뷰를 볼 수 있어요" },
  { icon: ShieldCheck, label: "인증 우선 처리", desc: "인증 요청이 빠르게 처리됩니다" },
];

export default function SubscribePage() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">프리미엄 구독</h1>
      </div>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 p-6 text-white text-center">
        <Crown size={48} weight="fill" className="mx-auto" />
        <h2 className="mt-3 text-2xl font-bold">하모니 프리미엄</h2>
        <p className="mt-2 text-lg opacity-90">더 풍성한 시니어 라이프를 위해</p>
        <div className="mt-4">
          <span className="text-4xl font-bold">39,000</span>
          <span className="text-lg">원/월</span>
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-900">프리미엄 혜택</h3>
        {premiumBenefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <div
              key={benefit.label}
              className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <Icon size={20} className="text-orange-500" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900">{benefit.label}</h4>
                <p className="text-sm text-gray-500">{benefit.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">무료 vs 프리미엄</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            <div className="grid grid-cols-[1fr_60px_60px] gap-2 border-b border-gray-200 pb-2 mb-2">
              <span className="text-sm font-medium text-gray-500">기능</span>
              <span className="text-sm font-medium text-gray-500 text-center">무료</span>
              <span className="text-sm font-medium text-orange-500 text-center">프리미엄</span>
            </div>
            {features.map((f) => (
              <div
                key={f.label}
                className="grid grid-cols-[1fr_60px_60px] gap-2 py-2 border-b border-gray-50"
              >
                <span className="text-sm text-gray-700">{f.label}</span>
                <div className="flex justify-center">
                  {f.free ? (
                    <Check size={18} className="text-green-500" />
                  ) : (
                    <X size={18} className="text-gray-300" />
                  )}
                </div>
                <div className="flex justify-center">
                  {f.premium ? (
                    <Check size={18} className="text-orange-500" />
                  ) : (
                    <X size={18} className="text-gray-300" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA — 결제 시스템 준비 전이므로 비활성 */}
      <div className="sticky bottom-20 -mx-4 border-t border-mocha-100 bg-white/95 p-4 backdrop-blur-sm">
        <div className="rounded-2xl border-2 border-coral-200 bg-coral-50 p-4 text-center">
          <p className="text-lg font-bold text-coral-700">결제 시스템 준비 중이에요</p>
          <p className="mt-1 text-base text-mocha-700">
            곧 프리미엄 구독을 시작할 수 있도록 준비하고 있어요
          </p>
        </div>
      </div>
    </div>
  );
}
