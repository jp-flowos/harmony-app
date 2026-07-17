"use client";

import { Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppliedFilterChips } from "@/components/club/applied-filter-chips";
import { ClubCard } from "@/components/club/club-card";
import { FilterSheet } from "@/components/club/filter-sheet";
import { SearchBar } from "@/components/club/search-bar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  type ClubFilters,
  type ClubTab,
  countActiveFilters,
  serializeClubFilters,
} from "@/lib/club-filters";
import type { ClubListEntry } from "@/lib/queries/clubs";
import { cn } from "@/lib/utils";

const TAB_ITEMS: { value: ClubTab; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "nearby", label: "근처" },
  { value: "hobby", label: "취미별" },
  { value: "popular", label: "인기" },
  { value: "mine", label: "내 클럽" },
];

export function ClubListClient({
  clubs,
  filters,
  tab,
  nearbyUnavailable,
  isLoggedIn,
}: {
  clubs: ClubListEntry[];
  filters: ClubFilters;
  tab: ClubTab;
  nearbyUnavailable: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  function navigate(next: ClubFilters, nextTab: ClubTab = tab) {
    const qs = serializeClubFilters(next, nextTab !== "all" ? { tab: nextTab } : undefined);
    router.push(qs ? `/club?${qs}` : "/club");
  }

  function onTabClick(value: ClubTab) {
    if (value === "hobby") {
      // "취미별"은 카테고리 필터 시트를 여는 프리셋 (시안 동작)
      setSheetOpen(true);
      return;
    }
    navigate(filters, value);
  }

  let empty: { title: string; description: string; icon: "search" | "users" } | null = null;
  if (nearbyUnavailable) {
    empty = {
      icon: "search",
      title: "활동 지역을 설정해주세요",
      description: "내 정보에서 지역을 설정하면 근처 클럽을 보여드려요",
    };
  } else if (tab === "mine" && !isLoggedIn) {
    empty = {
      icon: "users",
      title: "로그인이 필요해요",
      description: "로그인하면 가입한 클럽을 볼 수 있어요",
    };
  } else if (clubs.length === 0) {
    const hasCondition = Boolean(filters.q) || countActiveFilters(filters) > 0;
    empty =
      tab === "mine"
        ? {
            icon: "users",
            title: "아직 가입한 클럽이 없어요",
            description: "관심있는 클럽을 찾아 가입해보세요",
          }
        : hasCondition
          ? {
              icon: "search",
              title: "조건에 맞는 클럽이 없어요",
              description: "필터를 줄이거나 다른 단어로 검색해보세요",
            }
          : {
              icon: "search",
              title: "아직 클럽이 없어요",
              description: "첫 클럽을 만들어보세요",
            };
  }

  return (
    <div className="space-y-5 p-5">
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-mocha-900">클럽</h1>
          <p className="mt-1 text-base text-mocha-700">같은 취미를 가진 사람들과 함께해보세요</p>
        </div>
        <Link href="/club/create">
          <Button size="sm">
            <Plus size={22} weight="bold" />
            클럽 만들기
          </Button>
        </Link>
      </header>

      <SearchBar
        initialValue={filters.q ?? ""}
        placeholder="클럽 이름이나 취미로 검색해보세요"
        filterCount={countActiveFilters(filters)}
        onSearch={(q) => navigate({ ...filters, q: q || undefined })}
        onFilterOpen={() => setSheetOpen(true)}
      />

      <AppliedFilterChips
        filters={filters}
        onRemove={(next) => navigate(next)}
        onReset={() => navigate({ q: filters.q, sort: "recent", scope: "all" })}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TAB_ITEMS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onTabClick(item.value)}
            aria-pressed={tab === item.value}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-base font-bold transition-colors",
              tab === item.value
                ? "bg-coral-500 text-white"
                : "border border-mocha-200 bg-white text-mocha-700"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {empty ? (
        <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
      ) : (
        <div className="stagger-children space-y-3">
          {clubs.map((club) => (
            <div key={club.id} className="animate-fade-up">
              <ClubCard club={club} />
            </div>
          ))}
        </div>
      )}

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        applied={filters}
        onApply={(next) => {
          setSheetOpen(false);
          navigate(next);
        }}
      />
    </div>
  );
}
