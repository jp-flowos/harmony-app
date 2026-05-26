/**
 * Supabase Realtime 채팅 클라이언트
 * h_chat_messages 테이블 INSERT + postgres_changes 구독
 */
import { createBrowserClient } from "@supabase/ssr";
import type {
  PostgrestSingleResponse,
  RealtimePostgresInsertPayload,
} from "@supabase/supabase-js";

const SCHEMA = "si_mvp";

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;
function createClient() {
  if (cachedClient) return cachedClient;
  cachedClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key",
    { db: { schema: SCHEMA } }
  );
  return cachedClient;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderNickname: string;
  content: string;
  createdAt: number;
  isDeleted?: boolean;
}

interface ChatMessageRow {
  id: string;
  sender_id: string;
  sender_nickname: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
}

function rowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderNickname: row.sender_nickname,
    content: row.content,
    createdAt: new Date(row.created_at).getTime(),
    isDeleted: row.is_deleted,
  };
}

export async function sendMessage(
  roomId: string,
  message: Omit<ChatMessage, "id" | "createdAt">
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("h_chat_messages").insert({
    room_id: roomId,
    sender_id: message.senderId,
    sender_nickname: message.senderNickname,
    content: message.content,
    is_deleted: message.isDeleted ?? false,
  });
  if (error) throw error;
}

export function subscribeToMessages(
  roomId: string,
  limit: number,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const supabase = createClient();
  let cancelled = false;
  const cache = new Map<string, ChatMessage>();

  const emit = () => {
    if (cancelled) return;
    const sorted = Array.from(cache.values()).sort((a, b) => a.createdAt - b.createdAt);
    callback(sorted);
  };

  supabase
    .from("h_chat_messages")
    .select("id, sender_id, sender_nickname, content, created_at, is_deleted")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .then(({ data, error }: PostgrestSingleResponse<ChatMessageRow[]>) => {
      if (cancelled || error || !data) return;
      for (const row of data) {
        const msg = rowToMessage(row);
        cache.set(msg.id, msg);
      }
      emit();
    });

  const channel = supabase
    .channel(`chat:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "si_mvp",
        table: "h_chat_messages",
        filter: `room_id=eq.${roomId}`,
      },
      (payload: RealtimePostgresInsertPayload<ChatMessageRow>) => {
        const msg = rowToMessage(payload.new);
        cache.set(msg.id, msg);
        emit();
      }
    )
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}
