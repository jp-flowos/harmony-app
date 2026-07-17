import { Faders, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

// 홈 검색바 — 실제 입력이 아니라 /search 진입점 (시안: 탭 시 검색 화면 이동)
export function SearchEntry() {
  return (
    <Link
      href="/search"
      aria-label="클럽, 모임, 정보 검색"
      className="flex items-center gap-2 rounded-2xl border border-mocha-200 bg-white p-2 pl-4 shadow-soft transition-all hover:border-coral-300"
    >
      <MagnifyingGlass size={24} weight="bold" className="shrink-0 text-mocha-500" />
      <span className="min-w-0 flex-1 truncate text-lg text-mocha-500">
        클럽, 모임, 정보를 검색해보세요
      </span>
      <span className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-cream-100 px-3 text-base font-bold text-mocha-700">
        <Faders size={18} weight="bold" />
        필터
      </span>
    </Link>
  );
}
