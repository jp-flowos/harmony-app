import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { NoticeForm } from "@/components/club/NoticeForm";
import { db } from "@/db";
import { clubMembers, clubs } from "@/db/schema";
import { requireUser } from "@/lib/auth-session";

// 공지 등록 페이지 — 서버에서 owner/admin 권한을 강제한다(무권한 직접 URL 접근 차단, 완료조건 #5).
export default async function CreateNoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const [club] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.id, id)).limit(1);
  if (!club) notFound();

  const [membership] = await db
    .select({ role: clubMembers.role, status: clubMembers.status })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.userId, user.id)))
    .limit(1);
  const role = membership?.status === "active" ? (membership.role ?? "member") : null;
  if (role !== "owner" && role !== "admin") notFound();

  return <NoticeForm clubId={id} mode="create" />;
}
