"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { use } from "react";
import { ChatRoom } from "@/components/chat/ChatRoom";

interface ChatDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ChatDetailPage({ params }: ChatDetailPageProps) {
  const { id } = use(params);

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/chat" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">채팅방</h1>
      </div>
      <ChatRoom roomId={id} currentUserId="demo-user" currentUserNickname="활기찬시니어" />
    </div>
  );
}
