"use client";

import { ArrowLeft, ArrowRight, MapPin } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Greeting } from "@/components/ui/greeting";
import { Input } from "@/components/ui/input";
import { SIDOS } from "@/lib/region/sido";

interface StepRegionProps {
  sido: string;
  sigungu: string;
  onSidoChange: (value: string) => void;
  onSigunguChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepRegion({
  sido,
  sigungu,
  onSidoChange,
  onSigunguChange,
  onNext,
  onBack,
}: StepRegionProps) {
  return (
    <div className="space-y-6">
      <Greeting
        icon={<MapPin size={32} weight="duotone" />}
        title="어디에 살고 계신가요?"
        subtitle="가까운 지역의 모임을 추천해드려요"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SIDOS.map((option) => {
          const isSelected = sido === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onSidoChange(option)}
              aria-pressed={isSelected}
              className={`min-h-[56px] rounded-2xl border-2 px-3 text-base font-extrabold transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-coral-200 ${
                isSelected
                  ? "border-coral-500 bg-coral-500 text-white shadow-warm"
                  : "border-mocha-200 bg-white text-mocha-900 hover:border-coral-400 hover:bg-coral-50"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <Input
          value={sigungu}
          onChange={(event) => onSigunguChange(event.target.value)}
          placeholder="시·군·구 입력 (선택)"
          autoComplete="address-level2"
          leadingIcon={<MapPin size={26} weight="duotone" />}
          aria-label="시군구 입력"
        />
        <p className="px-1 text-base text-mocha-700">예: 강남구, 수원시, 제주시</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>
          <ArrowLeft size={24} weight="bold" />
          이전
        </Button>
        <Button className="flex-1" size="lg" onClick={onNext} disabled={!sido}>
          다음
          <ArrowRight size={24} weight="bold" />
        </Button>
      </div>
    </div>
  );
}
