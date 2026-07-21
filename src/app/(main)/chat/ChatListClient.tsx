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
import { relativeTimeLabel } from "@/lib/format-date";
import type { ChatRoomSummary } from "@/lib/queries/chat";

function ChatRoomCard({ room }: { room: ChatRoomSummary }) {
  return (
    <Link href={`/chat/${room.id}`} className="block">
      <Card className="cursor-pointer transition-all hover:border-coral-200 hover:shadow-soft">
        <CardContent className="flex items-center gap-3 p-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-2xl">{room.name[0] ?? "💬"}</AvatarFallback>
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
            <span className="text-sm font-semibold text-mocha-500">
              {room.lastMessageAt ? relativeTimeLabel(room.lastMessageAt) : ""}
            </span>
            {room.unread && (
              <output
                aria-label="안 읽은 메시지 있음"
                className="h-3 w-3 rounded-full bg-coral-500 shadow-warm"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ChatListClient({ rooms }: { rooms: ChatRoomSummary[] }) {
  const [search, setSearch] = useState("");

  const filterRooms = (list: ChatRoomSummary[]) =>
    list.filter((r) => !search || r.name.includes(search) || r.lastMessage.includes(search));

  const clubRooms = filterRooms(rooms.filter((r) => r.type === "club"));
  const privateRooms = filterRooms(rooms.filter((r) => r.type !== "club"));

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
          {clubRooms.length === 0 ? (
            <EmptyState
              icon="chat"
              title="클럽 채팅방이 없어요"
              description="클럽에 가입하면 채팅방이 자동으로 생겨요"
            />
          ) : (
            clubRooms.map((room) => <ChatRoomCard key={room.id} room={room} />)
          )}
        </TabsContent>

        <TabsContent value="private" className="space-y-3">
          {privateRooms.length === 0 ? (
            <EmptyState
              icon="chat"
              title="1:1 채팅이 없어요"
              description="같은 모임 멤버나 친구와 채팅을 시작해보세요"
            />
          ) : (
            <>
              {privateRooms.map((room) => (
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
