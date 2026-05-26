"use client";

import { ChatsCircle, House, Newspaper, UserCircle, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "홈", icon: House },
  { href: "/club", label: "클럽", icon: UsersThree },
  { href: "/info", label: "정보", icon: Newspaper },
  { href: "/chat", label: "채팅", icon: ChatsCircle },
  { href: "/mypage", label: "내정보", icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-mocha-100 bg-white/95 backdrop-blur-md safe-area-bottom shadow-[0_-2px_12px_rgba(61,46,34,0.06)]"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
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
                "group relative flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[68px] transition-colors",
                isActive ? "text-coral-600" : "text-mocha-600 hover:text-mocha-900"
              )}
            >
              {/* Active indicator pill behind icon */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-2 h-9 w-12 rounded-full transition-all duration-200",
                  isActive
                    ? "bg-coral-100 scale-100 opacity-100"
                    : "bg-transparent scale-75 opacity-0"
                )}
              />
              <Icon
                size={30}
                weight={isActive ? "fill" : "regular"}
                aria-hidden="true"
                className="relative z-10"
              />
              <span
                className={cn(
                  "relative z-10 text-sm leading-none",
                  isActive ? "font-extrabold" : "font-semibold"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
