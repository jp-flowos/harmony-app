"use client";

import { ArrowLeft, Bell, CaretRight, FileText, Info, Lock, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { NotificationSettings } from "@/lib/notifications";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/notifications";

const settingsItems = [
  { label: "비밀번호 변경", icon: Lock, href: "#" },
  { label: "개인정보 처리방침", icon: FileText, href: "#" },
  { label: "이용약관", icon: Info, href: "#" },
  { label: "계정 삭제", icon: Trash, href: "#", danger: true },
];

const notificationLabels: Record<keyof NotificationSettings, string> = {
  meetingReminder: "모임 시작 알림",
  newChat: "새 채팅 알림",
  reviewRequest: "후기 요청 알림",
  announcement: "공지사항 알림",
};

export default function SettingsPage() {
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );

  const toggleNotif = (key: keyof NotificationSettings) => {
    setNotifSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell size={20} className="text-orange-500" />
            알림 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(notificationLabels) as Array<keyof NotificationSettings>).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-base text-gray-700">{notificationLabels[key]}</span>
              <Switch checked={notifSettings[key]} onCheckedChange={() => toggleNotif(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Other Settings */}
      <Card>
        <CardContent className="p-0">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 border-b border-gray-100 px-5 py-4 text-base hover:bg-gray-50 last:border-0 ${
                  item.danger ? "text-red-500" : "text-gray-700"
                }`}
              >
                <Icon size={24} className={item.danger ? "text-red-400" : "text-gray-400"} />
                <span className="flex-1 text-left">{item.label}</span>
                <CaretRight size={20} className="text-gray-300" />
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-gray-400">하모니 v1.0.0</p>
    </div>
  );
}
