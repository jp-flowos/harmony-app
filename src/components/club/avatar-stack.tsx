import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function AvatarStack({
  avatarUrls,
  extraCount = 0,
  className,
}: {
  avatarUrls: (string | null)[];
  extraCount?: number;
  className?: string;
}) {
  if (avatarUrls.length === 0 && extraCount === 0) return null;
  return (
    <div className={cn("flex items-center", className)}>
      {avatarUrls.slice(0, 3).map((url, i) => (
        <Avatar
          key={`${i}-${url ?? "none"}`}
          className={cn("h-9 w-9 ring-2 ring-white", i > 0 && "-ml-2.5")}
        >
          {url ? <AvatarImage src={url} alt="" /> : null}
          <AvatarFallback className="text-sm">👤</AvatarFallback>
        </Avatar>
      ))}
      {extraCount > 0 && (
        <span className="-ml-2.5 z-10 flex h-9 min-w-9 items-center justify-center rounded-full bg-cream-100 px-1.5 text-xs font-bold text-mocha-700 ring-2 ring-white">
          +{extraCount}
        </span>
      )}
    </div>
  );
}
