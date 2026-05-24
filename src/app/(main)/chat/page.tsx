"use client";

import { MagnifyingGlass, UserCircle, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
    <Link href={`/chat/${room.id}`} className="block">
      <Card className="cursor-pointer transition-all hover:border-coral-200 hover:shadow-soft">
        <CardContent className="flex items-center gap-3 p-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-2xl">{room.avatarEmoji ?? room.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-mocha-900 truncate tracking-tight">
                {room.name}
              </h3>
              {room.type === "club" && <Badge variant="secondary">클럽</Badge>}
            </div>
            <p className="mt-0.5 text-base text-mocha-700 truncate">{room.lastMessage}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-sm font-semibold text-mocha-500">{room.time}</span>
            {room.unread > 0 && (
              <output
                aria-label={`안 읽은 메시지 ${room.unread}개`}
                className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-coral-500 px-2 text-sm font-extrabold text-white shadow-warm"
              >
                {room.unread}
              </output>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ChatListPage() {
  const [search, setSearch] = useState("");

  const filterRooms = (rooms: ChatRoom[]) =>
    rooms.filter((r) => !search || r.name.includes(search) || r.lastMessage.includes(search));

  return (
    <div className="space-y-5 p-5">
      <h1 className="pt-2 text-3xl font-extrabold text-mocha-900 tracking-tight">채팅</h1>

      <Input
        placeholder="대화 내용 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leadingIcon={<MagnifyingGlass size={26} weight="bold" />}
      />

      <Tabs defaultValue="club">
        <TabsList>
          <TabsTrigger value="club">
            <UsersThree size={20} weight="duotone" className="mr-1.5" />
            클럽 채팅
          </TabsTrigger>
          <TabsTrigger value="private">
            <UserCircle size={20} weight="duotone" className="mr-1.5" />
            1:1 채팅
          </TabsTrigger>
        </TabsList>

        <TabsContent value="club" className="space-y-3">
          {filterRooms(clubRooms).length === 0 ? (
            <EmptyState
              icon="chat"
              title="클럽 채팅방이 없어요"
              description="클럽에 가입하면 채팅방이 자동으로 생겨요"
            />
          ) : (
            filterRooms(clubRooms).map((room) => <ChatRoomCard key={room.id} room={room} />)
          )}
        </TabsContent>

        <TabsContent value="private" className="space-y-3">
          {filterRooms(privateRooms).length === 0 ? (
            <EmptyState
              icon="chat"
              title="1:1 채팅이 없어요"
              description="같은 모임 멤버나 친구와 채팅을 시작해보세요"
            />
          ) : (
            <>
              {filterRooms(privateRooms).map((room) => (
                <ChatRoomCard key={room.id} room={room} />
              ))}
              <p className="mt-4 px-2 text-center text-base text-mocha-700 leading-relaxed">
                동일 모임 멤버나 상호 관심을 표시한 분과
                <br />
                채팅할 수 있어요
              </p>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
