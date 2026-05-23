import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

interface CommunityPostData {
  id: string;
  category: string;
  userId: string;
  title: string;
  content: string;
  imageUrls: string[];
  tags: string[];
  likeCount: number;
  commentCount: number;
  region: string;
  createdAt: string;
}

// Mock data (would use DB in production)
const posts: CommunityPostData[] = [
  {
    id: "1",
    category: "free",
    userId: "u1",
    title: "오늘 날씨가 정말 좋네요",
    content: "산책하기 딱 좋은 날입니다.",
    imageUrls: [],
    tags: ["일상"],
    likeCount: 15,
    commentCount: 6,
    region: "서울",
    createdAt: "2024-03-02T10:00:00Z",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") ?? "latest";

  const result = category ? posts.filter((p) => p.category === category) : [...posts];
  if (sort === "popular") {
    result.sort((a, b) => b.likeCount - a.likeCount);
  } else {
    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return jsonResponse(result);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const title = body.title as string | undefined;
  const content = body.content as string | undefined;
  const category = body.category as string | undefined;

  if (!title || !content || !category) {
    return errorResponse("title, content, category are required");
  }

  const post: CommunityPostData = {
    id: crypto.randomUUID(),
    category,
    userId: "anonymous",
    title,
    content,
    imageUrls: (body.imageUrls as string[] | undefined) ?? [],
    tags: (body.tags as string[] | undefined) ?? [],
    likeCount: 0,
    commentCount: 0,
    region: (body.region as string | undefined) ?? "",
    createdAt: new Date().toISOString(),
  };
  posts.push(post);
  return jsonResponse(post, 201);
}
