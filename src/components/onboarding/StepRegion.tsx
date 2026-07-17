"use client";

import { MapPin } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Greeting } from "@/components/ui/greeting";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REGIONS, SIDO_LIST } from "@/lib/regions";

interface StepRegionProps {
  sido: string;
  sigungu: string;
  onSidoChange: (sido: string) => void;
  onSigunguChange: (sigungu: string) => void;
  onNext: () => void;
}

export function StepRegion({
  sido,
  sigungu,
  onSidoChange,
  onSigunguChange,
  onNext,
}: StepRegionProps) {
  const sigunguList = sido ? (REGIONS[sido] ?? []) : [];
  const canProceed = Boolean(sido) && (sigunguList.length === 0 || Boolean(sigungu));

  return (
    <div className="space-y-6">
      <Greeting
        icon={<MapPin size={32} weight="duotone" />}
        title="활동하시는 지역을 선택해주세요."
        subtitle="가까운 모임을 추천해드릴게요"
      />

      <div className="space-y-2">
        <Label>지역</Label>
        <div className="flex gap-2">
          <Select
            value={sido}
            onValueChange={(v) => {
              onSidoChange(v);
              onSigunguChange("");
            }}
          >
            <SelectTrigger className="flex-1" aria-label="시/도 선택">
              <SelectValue placeholder="시/도 선택" />
            </SelectTrigger>
            <SelectContent>
              {SIDO_LIST.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sigungu}
            onValueChange={onSigunguChange}
            disabled={sigunguList.length === 0}
          >
            <SelectTrigger className="flex-1" aria-label="시/군/구 선택">
              <SelectValue placeholder="시/군/구 선택" />
            </SelectTrigger>
            <SelectContent>
              {sigunguList.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button className="w-full" size="lg" onClick={onNext} disabled={!canProceed}>
        계속
      </Button>
    </div>
  );
}
