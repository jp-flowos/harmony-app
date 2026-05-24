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

const ICONS: Record<
  string,
  ComponentType<{ size: number; className: string; weight: "duotone" }>
> = {
  search: MagnifyingGlass,
  users: UsersThree,
  chat: ChatCircle,
  article: Article,
  sparkle: Sparkle,
};

export function EmptyState({ icon = "sparkle", title, description, action }: EmptyStateProps) {
  const Icon = ICONS[icon] ?? Sparkle;

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-coral-50">
        <Icon size={40} className="text-coral-500" weight="duotone" />
      </div>
      <h3 className="text-xl font-extrabold text-mocha-900 tracking-tight">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-lg text-mocha-700 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
