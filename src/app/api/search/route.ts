import type { NextRequest } from "next/server";
import { serverError, successResponse, validationError } from "@/lib/api-response";

// Search result types
interface SearchResult {
  id: string;
  type: "club" | "meeting" | "info" | "community";
  title: string;
  description: string;
  category?: string;
  region?: string;
}

// Mock search data — in production use PostgreSQL full-text search (to_tsvector/to_tsquery)
const mockData: SearchResult[] = [
  {
    id: "c1",
    type: "club",
    title: "서울 등산 모임",
    description: "매주 주말 서울 근교 등산",
    category: "등산",
    region: "서울",
  },
  {
    id: "c2",
    type: "club",
    title: "골프 친구들",
    description: "경기도 골프 라운딩 모임",
    category: "골프",
    region: "경기",
  },
  {
    id: "c3",
    type: "club",
    title: "독서 클럽",
    description: "월 2회 독서 토론",
    category: "독서",
    region: "서울",
  },
  {
    id: "m1",
    type: "meeting",
    title: "북한산 봄맞이 등산",
    description: "3월 첫째 주 토요일 북한산",
  },
  { id: "m2", type: "meeting", title: "골프 초보 레슨", description: "프로 강사와 함께하는 레슨" },
  {
    id: "i1",
    type: "info",
    title: "봄철 건강 관리 가이드",
    description: "환절기 건강 관리법 총정리",
    category: "건강",
  },
  {
    id: "i2",
    type: "info",
    title: "2024 정부 지원금 총정리",
    description: "시니어를 위한 정부 혜택 안내",
    category: "정부지원",
  },
  {
    id: "i3",
    type: "info",
    title: "시니어 스마트폰 활용법",
    description: "기초부터 배우는 스마트폰 사용법",
    category: "정보",
  },
  {
    id: "p1",
    type: "community",
    title: "봄 등산 코스 추천합니다",
    description: "서울 근교 초보 등산 코스",
  },
  {
    id: "p2",
    type: "community",
    title: "퇴직 후 재테크 팁 공유",
    description: "안전한 투자 방법 모음",
  },
  {
    id: "p3",
    type: "community",
    title: "제주도 여행 후기",
    description: "3박4일 시니어 여행 코스",
  },
];

function simpleSearch(query: string, items: SearchResult[]): SearchResult[] {
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.category?.toLowerCase().includes(q) ?? false)
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const type = searchParams.get("type"); // club | meeting | info | community | null (all)
    const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

    if (!query) {
      return validationError("검색어를 입력해주세요");
    }

    let results = simpleSearch(query, mockData);

    if (type) {
      results = results.filter((r) => r.type === type);
    }

    results = results.slice(0, limit);

    // Group by type for tab display
    const grouped = {
      clubs: results.filter((r) => r.type === "club"),
      meetings: results.filter((r) => r.type === "meeting"),
      info: results.filter((r) => r.type === "info"),
      community: results.filter((r) => r.type === "community"),
    };

    return successResponse({
      query,
      total: results.length,
      results,
      grouped,
    });
  } catch (err) {
    console.error("[search]", err);
    return serverError();
  }
}
