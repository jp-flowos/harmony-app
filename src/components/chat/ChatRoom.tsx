"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type ChatMessage, sendMessage, subscribeToMessages } from "@/lib/chat/realtime";

interface ChatRoomProps {
  roomId: string;
  currentUserId: string;
  currentUserNickname: string;
}

export function ChatRoom({ roomId, currentUserId, currentUserNickname }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageCount = messages.length;

  useEffect(() => {
    const unsubscribe = subscribeToMessages(roomId, 50, (msgs) => {
      setMessages(msgs);
    });
    return unsubscribe;
  }, [roomId]);

  useEffect(() => {
    if (messageCount > 0) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(roomId, {
      senderId: currentUserId,
      senderNickname: currentUserNickname,
      content: input.trim(),
    });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
                {!isMe && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{msg.senderNickname[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div>
                  {!isMe && <p className="mb-1 text-xs text-gray-400">{msg.senderNickname}</p>}
                  <div
                    className={`rounded-2xl px-4 py-3 text-base ${
                      isMe
                        ? "bg-orange-500 text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-900 rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
            <PaperPlaneRight size={20} weight="fill" />
          </Button>
        </div>
      </div>
    </div>
  );
}
