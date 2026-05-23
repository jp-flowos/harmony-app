"use client";

import { ChatsCircle, MagnifyingGlass, UserCircle, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatRoom {
  id: string;
  name: string;
  type: "club" | "private";
  lastMessage: string;
  time: string;
  unread: number;
  avatarEmoji?: string;
}

const clubRooms: ChatRoom[] = [
  {
    id: "1",
    name: "서울 등산 모임",
    type: "club",
    lastMessage: "내일 몇 시에 모이나요?",
    time: "오후 3:24",
    unread: 5,
    avatarEmoji: "⛰️",
  },
  {
    id: "2",
    name: "골프 친구들",
    type: "club",
    lastMessage: "다음 주 라운딩 확정!",
    time: "오전 11:02",
    unread: 0,
    avatarEmoji: "⛳",
  },
  {
    id: "3",
    name: "독서 클럽",
    type: "club",
    lastMessage: "이번 달 책 선정 투표합시다",
    time: "어제",
    unread: 2,
    avatarEmoji: "📚",
  },
];

const privateRooms: ChatRoom[] = [
  {
    id: "dm1",
    name: "산사랑",
    type: "private",
    lastMessage: "등산화 정보 감사합니다",
    time: "어제",
    unread: 1,
  },
  {
    id: "dm2",
    name: "건강한인생",
    type: "private",
    lastMessage: "다음에 같이 산행해요!",
    time: "3일 전",
    unread: 0,
  },
];

function ChatRoomCard({ room }: { room: ChatRoom }) {
  return (
    <Link href={`/chat/${room.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="flex items-center gap-3 p-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">{room.avatarEmoji ?? room.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 truncate">{room.name}</h3>
              {room.type === "club" && (
                <Badge variant="secondary" className="text-xs">
                  클럽
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate">{room.lastMessage}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-gray-400">{room.time}</span>
            {room.unread > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                {room.unread}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  message: string;
}) {
  return (
    <div className="py-16 text-center">
      <Icon size={64} className="mx-auto text-gray-300" />
      <p className="mt-4 text-base text-gray-400">{message}</p>
    </div>
  );
}

export default function ChatListPage() {
  const [search, setSearch] = useState("");

  const filterRooms = (rooms: ChatRoom[]) =>
    rooms.filter((r) => !search || r.name.includes(search) || r.lastMessage.includes(search));

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold text-gray-900">채팅</h1>

      <div className="relative">
        <MagnifyingGlass
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <Input
          className="pl-10"
          placeholder="채팅방 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="club">
        <TabsList>
          <TabsTrigger value="club">
            <UsersThree size={16} className="mr-1" />
            클럽 채팅
          </TabsTrigger>
          <TabsTrigger value="private">
            <UserCircle size={16} className="mr-1" />
            1:1 채팅
          </TabsTrigger>
        </TabsList>

        <TabsContent value="club" className="space-y-2">
          {filterRooms(clubRooms).length === 0 ? (
            <EmptyState icon={ChatsCircle} message="클럽 채팅방이 없어요" />
          ) : (
            filterRooms(clubRooms).map((room) => <ChatRoomCard key={room.id} room={room} />)
          )}
        </TabsContent>

        <TabsContent value="private" className="space-y-2">
          {filterRooms(privateRooms).length === 0 ? (
            <EmptyState icon={UserCircle} message="1:1 채팅이 없어요" />
          ) : (
            filterRooms(privateRooms).map((room) => <ChatRoomCard key={room.id} room={room} />)
          )}
          <p className="text-center text-sm text-gray-400 mt-4">
            동일 모임 멤버나 상호 관심을 표시한 분과 채팅할 수 있어요
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
