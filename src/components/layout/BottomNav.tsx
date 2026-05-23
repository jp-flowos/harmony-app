"use client";

import {
  ChatsCircle,
  House,
  MagnifyingGlass,
  MapPin,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "홈", icon: House },
  { href: "/club", label: "클럽", icon: UsersThree },
  { href: "/search", label: "검색", icon: MagnifyingGlass },
  { href: "/map", label: "지도", icon: MapPin },
  { href: "/chat", label: "채팅", icon: ChatsCircle },
  { href: "/mypage", label: "내정보", icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-gray-200 bg-white safe-area-bottom shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[64px] transition-colors",
                isActive
                  ? "text-orange-600"
                  : "text-gray-700 hover:text-gray-900 active:text-gray-900"
              )}
            >
              <Icon size={28} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
              <span className="text-sm font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
