"use client";

import { ArrowRight, Clock, MagnifyingGlass, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SearchResult {
  id: string;
  type: "club" | "meeting" | "info" | "community";
  title: string;
  description: string;
  category?: string;
  region?: string;
}

interface SearchResponse {
  success: boolean;
  data: {
    query: string;
    total: number;
    results: SearchResult[];
    grouped: {
      clubs: SearchResult[];
      meetings: SearchResult[];
      info: SearchResult[];
      community: SearchResult[];
    };
  };
}

const RECENT_KEY = "harmony_recent_searches";
const MAX_RECENT = 10;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  const recent = getRecentSearches().filter((q) => q !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

const TYPE_LABELS: Record<string, string> = {
  club: "클럽",
  meeting: "모임",
  info: "정보",
  community: "커뮤니티",
};

const TYPE_BADGE: Record<string, string> = {
  club: "bg-coral-100 text-coral-800",
  meeting: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
  info: "bg-sage-100 text-sage-700",
  community: "bg-cream-100 text-mocha-800",
};

function getResultHref(result: SearchResult): string {
  switch (result.type) {
    case "club":
      return `/club/${result.id}`;
    case "meeting":
      return `/club`;
    case "info":
      return `/info/${result.id}`;
    case "community":
      return `/community/${result.id}`;
    default:
      return "/";
  }
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse["data"] | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    addRecentSearch(searchQuery.trim());
    setRecentSearches(getRecentSearches());

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = (await res.json()) as SearchResponse;
      if (data.success) {
        setResults(data.data);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const handleRecentClick = (q: string) => {
    setQuery(q);
    doSearch(q);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const renderResults = (items: SearchResult[]) => {
    if (items.length === 0) {
      return (
        <EmptyState
          icon="search"
          title="검색 결과가 없어요"
          description="다른 단어로 검색해 보세요"
        />
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item) => (
          <Link key={`${item.type}-${item.id}`} href={getResultHref(item)} className="block">
            <Card className="transition-all hover:border-coral-200 hover:shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${TYPE_BADGE[item.type] ?? ""}`}
                      >
                        {TYPE_LABELS[item.type]}
                      </span>
                      {item.category && <Badge variant="outline">{item.category}</Badge>}
                    </div>
                    <h3 className="text-lg font-extrabold text-mocha-900 truncate tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-base text-mocha-700 leading-relaxed line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight size={20} weight="bold" className="mt-2 shrink-0 text-coral-500" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 p-5">
      <h1 className="pt-2 text-3xl font-extrabold text-mocha-900 tracking-tight">검색</h1>

      {/* Search input */}
      <form onSubmit={handleSubmit}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="클럽, 모임, 정보를 검색"
          autoFocus
          leadingIcon={<MagnifyingGlass size={26} weight="bold" />}
          trailingAction={
            query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults(null);
                }}
                aria-label="검색어 지우기"
                className="flex h-12 w-12 items-center justify-center rounded-xl text-mocha-700 transition-colors hover:bg-cream-100 active:bg-cream-200 focus:outline-none focus:ring-4 focus:ring-coral-200"
              >
                <X size={22} weight="bold" />
              </button>
            ) : null
          }
        />
      </form>

      {/* Recent searches */}
      {!results && recentSearches.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-mocha-900">최근 검색어</h2>
            <button
              type="button"
              onClick={handleClearRecent}
              className="text-base font-semibold text-mocha-700 hover:text-mocha-900"
            >
              전체 삭제
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => handleRecentClick(q)}
                className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-cream-100 px-4 text-base font-semibold text-mocha-900 transition-colors hover:bg-cream-200 active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-coral-200"
              >
                <Clock size={18} weight="duotone" className="text-mocha-700" />
                {q}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <output
            aria-label="검색 중"
            className="block h-10 w-10 animate-spin rounded-full border-4 border-coral-500 border-t-transparent"
          />
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div>
          <p className="mb-3 text-base font-semibold text-mocha-700">
            <strong className="font-extrabold text-mocha-900">&quot;{results.query}&quot;</strong>{" "}
            검색 결과 {results.total}건
          </p>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="all">전체 ({results.total})</TabsTrigger>
              <TabsTrigger value="clubs">클럽 ({results.grouped.clubs.length})</TabsTrigger>
              <TabsTrigger value="info">정보 ({results.grouped.info.length})</TabsTrigger>
              <TabsTrigger value="community">
                커뮤니티 ({results.grouped.community.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">{renderResults(results.results)}</TabsContent>
            <TabsContent value="clubs">{renderResults(results.grouped.clubs)}</TabsContent>
            <TabsContent value="info">{renderResults(results.grouped.info)}</TabsContent>
            <TabsContent value="community">{renderResults(results.grouped.community)}</TabsContent>
          </Tabs>
        </div>
      )}

      {/* Initial empty state */}
      {!results && !loading && recentSearches.length === 0 && (
        <EmptyState
          icon="search"
          title="무엇을 찾고 계신가요?"
          description="클럽, 모임, 정보를 한 번에 검색하세요"
        />
      )}
    </div>
  );
}
