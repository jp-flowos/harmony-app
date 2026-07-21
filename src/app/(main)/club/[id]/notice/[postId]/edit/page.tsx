import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { NoticeForm } from "@/components/club/NoticeForm";
import { db } from "@/db";
import { clubMembers, clubPosts } from "@/db/schema";
import { requireUser } from "@/lib/auth-session";
import { kstDateString } from "@/lib/format-date";

// 공지 수정 페이지 — 서버에서 owner/admin 권한 + 대상이 이 클럽의 공지인지 확인(완료조건 #5).
export default async function EditNoticePage({
  params,
}: {
  params: Promise<{ id: string; postId: string }>;
}) {
  const { id, postId } = await params;
  const user = await requireUser();

  const [membership] = await db
    .select({ role: clubMembers.role, status: clubMembers.status })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
    .limit(1);
  const role = membership?.status === "active" ? (membership.role ?? "member") : null;
  if (role !== "owner" && role !== "admin") notFound();

  const [post] = await db
    .select({
      clubId: clubPosts.clubId,
      type: clubPosts.type,
      title: clubPosts.title,
      content: clubPosts.content,
      isPinned: clubPosts.isPinned,
      publishedAt: clubPosts.publishedAt,
      imageUrls: clubPosts.imageUrls,
    })
    .from(clubPosts)
    .where(eq(clubPosts.id, postId))
    .limit(1);
  if (!post || post.clubId !== id || post.type !== "notice") notFound();

  return (
    <NoticeForm
      clubId={id}
      mode="edit"
      postId={postId}
      initial={{
        title: post.title ?? "",
        content: post.content,
        isPinned: post.isPinned,
        publishedAt: kstDateString(post.publishedAt),
        imageUrl: post.imageUrls?.[0] ?? null,
      }}
    />
  );
}
