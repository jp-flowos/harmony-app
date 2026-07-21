import { getMyChatRooms } from "@/lib/queries/chat";
import { getReceivedChatRequests } from "@/lib/queries/chat-requests";
import { createClient } from "@/lib/supabase/server";
import { ChatListClient } from "./ChatListClient";

export default async function ChatListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ChatListClient rooms={[]} receivedRequests={[]} />;
  }

  const [rooms, receivedRequests] = await Promise.all([
    getMyChatRooms(user.id),
    getReceivedChatRequests(user.id),
  ]);

  return <ChatListClient rooms={rooms} receivedRequests={receivedRequests} />;
}
