import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { db } from "@/db";
import { chatRoomMembers, profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

interface ChatDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatDetailPage({ params }: ChatDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [me] = await db
    .select({ nickname: profiles.nickname })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const [membership] = await db
    .select({ userId: chatRoomMembers.userId })
    .from(chatRoomMembers)
    .where(and(eq(chatRoomMembers.roomId, id), eq(chatRoomMembers.userId, user.id)))
    .limit(1);
  if (!membership) redirect("/chat");

  await db
    .update(chatRoomMembers)
    .set({ lastReadAt: new Date() })
    .where(and(eq(chatRoomMembers.roomId, id), eq(chatRoomMembers.userId, user.id)));

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/chat" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">채팅방</h1>
      </div>
      <ChatRoom roomId={id} currentUserId={user.id} currentUserNickname={me?.nickname ?? "회원"} />
    </div>
  );
}
