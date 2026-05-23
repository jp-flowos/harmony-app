import type { NextRequest } from "next/server";
import { serverError, successResponse, unauthorizedError } from "@/lib/api-response";
import {
  type ClubForRecommendation,
  scoreClubs,
  scoreInfoContents,
  type UserProfile,
} from "@/lib/recommendation";

// Mock data — in production, query DB
const mockUser: UserProfile = {
  id: "user1",
  region: "서울",
  birthYear: 1962,
  hobbies: ["등산", "골프", "독서"],
};

const mockClubs: ClubForRecommendation[] = [
  {
    id: "c1",
    name: "서울 등산 모임",
    category: "등산",
    region: "서울",
    memberCount: 45,
    members: ["u2", "u3"],
  },
  {
    id: "c2",
    name: "골프 친구들",
    category: "골프",
    region: "서울",
    memberCount: 32,
    members: ["u2", "u4"],
  },
  {
    id: "c3",
    name: "부산 낚시 클럽",
    category: "낚시",
    region: "부산",
    memberCount: 18,
    members: ["u5"],
  },
  {
    id: "c4",
    name: "서울 독서 모임",
    category: "독서",
    region: "서울",
    memberCount: 28,
    members: ["u3", "u6"],
  },
  {
    id: "c5",
    name: "대전 등산회",
    category: "등산",
    region: "대전",
    memberCount: 22,
    members: ["u7"],
  },
];

const mockInfoContents = [
  { id: "i1", tags: ["등산", "건강", "봄"], category: "health", viewCount: 520 },
  { id: "i2", tags: ["정부지원", "연금"], category: "gov", viewCount: 1200 },
  { id: "i3", tags: ["골프", "레슨"], category: "hobby", viewCount: 350 },
  { id: "i4", tags: ["여행", "제주도"], category: "travel", viewCount: 890 },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "clubs";
    const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 20);

    // In production: get user from session
    const user = mockUser;
    if (!user) return unauthorizedError();

    if (type === "clubs") {
      const recommendations = scoreClubs(user, mockClubs).slice(0, limit);
      return successResponse({
        type: "clubs",
        items: recommendations.map((r) => {
          const club = mockClubs.find((c) => c.id === r.id);
          return {
            ...r,
            name: club?.name ?? "",
            category: club?.category ?? "",
            region: club?.region ?? "",
            memberCount: club?.memberCount ?? 0,
          };
        }),
      });
    }

    if (type === "info") {
      const recommendations = scoreInfoContents(user.hobbies, mockInfoContents).slice(0, limit);
      return successResponse({
        type: "info",
        items: recommendations,
      });
    }

    return successResponse({ type, items: [] });
  } catch (err) {
    console.error("[recommendations]", err);
    return serverError();
  }
}
