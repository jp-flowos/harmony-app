import {
  Article,
  ChatCircle,
  MagnifyingGlass,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";

interface EmptyStateProps {
  icon?: "search" | "users" | "chat" | "article" | "sparkle";
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const ICONS: Record<string, ComponentType<{ size: number; className: string; weight: "light" }>> = {
  search: MagnifyingGlass,
  users: UsersThree,
  chat: ChatCircle,
  article: Article,
  sparkle: Sparkle,
};

export function EmptyState({ icon = "sparkle", title, description, action }: EmptyStateProps) {
  const Icon = ICONS[icon] ?? Sparkle;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <Icon size={32} className="text-gray-400" weight="light" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      {description && <p className="mt-2 max-w-xs text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
