import { getMyChatRooms } from "@/lib/queries/chat";
import { createClient } from "@/lib/supabase/server";
import { ChatListClient } from "./ChatListClient";

export default async function ChatListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rooms = user ? await getMyChatRooms(user.id) : [];

  return <ChatListClient rooms={rooms} />;
}
