"use client";

import { ChatCircleDots, LinkSimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { initKakao, shareToKakao } from "@/lib/kakao/share";

interface ShareBarProps {
  title: string;
  description: string;
  path: string;
  imagePath?: string;
}

export function ShareBar({ title, description, path, imagePath }: ShareBarProps) {
  const [kakaoReady, setKakaoReady] = useState(false);
  const [copied, setCopied] = useState(false);

  // SDK 스크립트(afterInteractive)가 마운트보다 늦게 로드될 수 있어 최대 5초 폴링
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      initKakao();
      if (window.Kakao?.isInitialized()) {
        setKakaoReady(true);
        clearInterval(timer);
      } else if (++tries >= 10) {
        clearInterval(timer);
      }
    }, 500);
    return () => clearInterval(timer);
  }, []);

  function absolute(p: string): string {
    return `${window.location.origin}${p}`;
  }

  function handleKakao() {
    shareToKakao({
      title,
      description,
      imageUrl: absolute(imagePath ?? `${path}/opengraph-image`),
      link: absolute(path),
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(absolute(path));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 미지원 브라우저 — 버튼 동작 없음
    }
  }

  return (
    <div className="flex gap-2">
      {kakaoReady && (
        <Button
          size="lg"
          className="flex-1 bg-[#FEE500] text-[#191919] hover:bg-[#FDD800]"
          onClick={handleKakao}
        >
          <ChatCircleDots size={24} weight="fill" />
          카카오톡으로 공유
        </Button>
      )}
      <Button size="lg" variant="outline" className="flex-1" onClick={handleCopy}>
        <LinkSimple size={24} weight="bold" />
        {copied ? "복사됐어요!" : "링크 복사"}
      </Button>
    </div>
  );
}
