"use client";

import { Bell } from "@phosphor-icons/react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const NOTIFICATIONS = [
  { key: "chat" as const, label: "채팅 알림", desc: "새 메시지가 오면 알려드려요" },
  { key: "meeting" as const, label: "모임 알림", desc: "모임 일정을 미리 알려드려요" },
  { key: "club" as const, label: "클럽 알림", desc: "클럽의 새 글과 공지" },
  { key: "marketing" as const, label: "이벤트 안내", desc: "혜택과 이벤트 소식" },
];

// Note: toggles are local state only. Persistence is Phase 3 (needs h_push_subscriptions wire-up).
export function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    chat: true,
    meeting: true,
    club: false,
    marketing: false,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Bell size={24} weight="duotone" className="text-coral-600" />
          알림 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {NOTIFICATIONS.map((item) => (
          <div key={item.key} className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-lg">{item.label}</Label>
              <p className="mt-0.5 text-base text-mocha-700">{item.desc}</p>
            </div>
            <Switch
              checked={notifications[item.key]}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, [item.key]: checked })
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
