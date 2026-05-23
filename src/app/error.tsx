"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <WarningCircle size={32} weight="light" className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">문제가 발생했습니다</h2>
        <p className="mt-2 text-sm text-gray-500">
          일시적인 오류가 발생했습니다. 다시 시도해 주세요.
        </p>
        {error.digest && <p className="mt-1 text-xs text-gray-400">오류 코드: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset} variant="default">
            다시 시도
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline">
            홈으로
          </Button>
        </div>
      </div>
    </div>
  );
}
