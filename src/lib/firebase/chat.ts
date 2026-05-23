/**
 * 채팅 추상화 인터페이스
 * Firebase 의존성을 이 파일로 격리 → 이관 시 내부만 교체
 */
import { limitToLast, off, onValue, push, query, ref, serverTimestamp } from "firebase/database";
import { getFirebaseDb } from "./client";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderNickname: string;
  content: string;
  createdAt: number;
  isDeleted?: boolean;
}

export function sendMessage(roomId: string, message: Omit<ChatMessage, "id" | "createdAt">) {
  const db = getFirebaseDb();
  const messagesRef = ref(db, `rooms/${roomId}/messages`);
  return push(messagesRef, {
    ...message,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToMessages(
  roomId: string,
  limit: number,
  callback: (messages: ChatMessage[]) => void
) {
  const db = getFirebaseDb();
  const messagesRef = query(ref(db, `rooms/${roomId}/messages`), limitToLast(limit));

  onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    const messages = Object.entries(data).map(([id, msg]) => ({
      id,
      ...(msg as Omit<ChatMessage, "id">),
    }));
    callback(messages);
  });

  return () => off(messagesRef);
}
