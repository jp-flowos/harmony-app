"use client";

import { ChatCircle, DotsThreeOutline, Prohibit, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const REPORT_REASONS = [
  "부적절한 사진·프로필",
  "욕설·비방·혐오 표현",
  "사기·광고·홍보",
  "사칭",
  "기타",
] as const;

interface UserProfileActionsProps {
  targetId: string;
  nickname: string;
  mode: "normal" | "blocked-by-me";
}

export function UserProfileActions({ targetId, nickname, mode }: UserProfileActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "report">("menu");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestChat() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/chat/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: targetId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error?.message ?? "채팅 요청을 보내지 못했어요. 다시 시도해주세요");
        return;
      }
      setNotice(json.data?.deduped ? "이미 채팅 요청을 보냈어요" : "채팅 요청을 보냈어요");
    } catch {
      setError("채팅 요청을 보내지 못했어요. 다시 시도해주세요");
    } finally {
      setBusy(false);
    }
  }

  async function submitReport(reason: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "user", targetId, reason }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error?.message ?? "신고를 접수하지 못했어요. 다시 시도해주세요");
        return;
      }
      setOpen(false);
      setView("menu");
      setNotice("신고가 접수되었습니다");
    } catch {
      setError("신고를 접수하지 못했어요. 다시 시도해주세요");
    } finally {
      setBusy(false);
    }
  }

  async function blockUser() {
    if (busy) return;
    if (!window.confirm(`${nickname}님을 차단할까요? 서로 프로필과 채팅을 볼 수 없게 돼요.`))
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${targetId}/block`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error?.message ?? "차단하지 못했어요. 다시 시도해주세요");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("차단하지 못했어요. 다시 시도해주세요");
    } finally {
      setBusy(false);
    }
  }

  async function unblockUser() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${targetId}/block`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error?.message ?? "차단을 해제하지 못했어요. 다시 시도해주세요");
        return;
      }
      router.refresh();
    } catch {
      setError("차단을 해제하지 못했어요. 다시 시도해주세요");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "blocked-by-me") {
    return (
      <div className="space-y-2">
        <Button
          className="w-full"
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={unblockUser}
        >
          {busy ? "처리 중..." : "차단 해제"}
        </Button>
        {error && <p className="text-base font-semibold text-red-600">{error}</p>}
      </div>
    );
  }

  const menuItemClass =
    "flex w-full items-center gap-3 rounded-2xl border-2 border-mocha-200 px-4 py-4 text-left text-lg font-semibold text-mocha-900 transition-colors hover:border-coral-400 hover:bg-coral-50 disabled:opacity-50";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button className="flex-1" size="lg" disabled={busy} onClick={requestChat}>
          <ChatCircle size={22} weight="fill" />
          1:1 채팅
        </Button>
        <Button
          size="lg"
          variant="outline"
          aria-label="더보기"
          onClick={() => {
            setView("menu");
            setOpen(true);
          }}
        >
          <DotsThreeOutline size={24} weight="fill" />
        </Button>
      </div>
      {notice && <p className="text-base font-semibold text-coral-700">{notice}</p>}
      {error && <p className="text-base font-semibold text-red-600">{error}</p>}

      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setView("menu");
        }}
      >
        <SheetContent side="bottom" className="pb-8">
          {view === "menu" ? (
            <>
              <SheetHeader>
                <SheetTitle>{nickname}님</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                <button type="button" className={menuItemClass} onClick={() => setView("report")}>
                  <WarningCircle size={24} weight="fill" className="text-mocha-500" />
                  신고하기
                </button>
                <button type="button" className={menuItemClass} disabled={busy} onClick={blockUser}>
                  <Prohibit size={24} weight="fill" className="text-red-500" />
                  차단하기
                </button>
              </div>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>신고 사유를 선택해주세요</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className={menuItemClass}
                    disabled={busy}
                    onClick={() => submitReport(reason)}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
