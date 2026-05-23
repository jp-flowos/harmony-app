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

const TYPE_COLORS: Record<string, string> = {
  club: "bg-orange-100 text-orange-700",
  meeting: "bg-blue-100 text-blue-700",
  info: "bg-green-100 text-green-700",
  community: "bg-purple-100 text-purple-700",
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
          title="검색 결과가 없습니다"
          description="다른 키워드로 검색해 보세요"
        />
      );
    }

    return (
      <div className="space-y-2">
        {items.map((item) => (
          <Link key={`${item.type}-${item.id}`} href={getResultHref(item)}>
            <Card className="hover:shadow-sm transition-shadow mb-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[item.type]}`}
                      >
                        {TYPE_LABELS[item.type]}
                      </span>
                      {item.category && (
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 truncate">{item.title}</h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-1">{item.description}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 mt-2 shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">검색</h1>

      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <MagnifyingGlass
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="클럽, 모임, 정보글 검색..."
          className="pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {/* Recent Searches */}
      {!results && recentSearches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-500">최근 검색어</h2>
            <button
              type="button"
              onClick={handleClearRecent}
              className="text-xs text-gray-400 hover:text-gray-600"
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
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <Clock size={12} />
                {q}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            &quot;{results.query}&quot; 검색 결과 {results.total}건
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

            <TabsContent value="all" className="mt-3">
              {renderResults(results.results)}
            </TabsContent>
            <TabsContent value="clubs" className="mt-3">
              {renderResults(results.grouped.clubs)}
            </TabsContent>
            <TabsContent value="info" className="mt-3">
              {renderResults(results.grouped.info)}
            </TabsContent>
            <TabsContent value="community" className="mt-3">
              {renderResults(results.grouped.community)}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Initial State */}
      {!results && !loading && recentSearches.length === 0 && (
        <EmptyState
          icon="search"
          title="무엇을 찾고 계신가요?"
          description="클럽, 모임, 정보글을 한 번에 검색하세요"
        />
      )}
    </div>
  );
}
