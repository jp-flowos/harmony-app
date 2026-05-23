import type { NextRequest } from "next/server";
import { serverError, successResponse, unauthorizedError } from "@/lib/api-response";

interface FollowState {
  followerId: string;
  followingId: string;
}

// In-memory mock — in production, use DB (user_follows table)
const follows: FollowState[] = [];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;

    // In production: get from session
    const currentUserId = request.headers.get("x-user-id");
    if (!currentUserId) return unauthorizedError();

    if (currentUserId === targetUserId) {
      return successResponse({ error: "자기 자신을 팔로우할 수 없습니다" }, 400);
    }

    const existing = follows.find(
      (f) => f.followerId === currentUserId && f.followingId === targetUserId
    );

    if (existing) {
      // Unfollow
      const idx = follows.indexOf(existing);
      follows.splice(idx, 1);
      return successResponse({ following: false, message: "팔로우를 취소했습니다" });
    }

    // Follow
    follows.push({ followerId: currentUserId, followingId: targetUserId });
    return successResponse({ following: true, message: "팔로우했습니다" });
  } catch (err) {
    console.error("[follow]", err);
    return serverError();
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;

    const followers = follows.filter((f) => f.followingId === userId);
    const following = follows.filter((f) => f.followerId === userId);

    return successResponse({
      userId,
      followersCount: followers.length,
      followingCount: following.length,
      followers: followers.map((f) => f.followerId),
      following: following.map((f) => f.followingId),
    });
  } catch (err) {
    console.error("[follow:get]", err);
    return serverError();
  }
}
