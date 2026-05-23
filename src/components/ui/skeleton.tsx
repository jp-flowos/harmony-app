import { cn } from "@/lib/utils";

const listSkeletonItems = [
  "list-item-1",
  "list-item-2",
  "list-item-3",
  "list-item-4",
  "list-item-5",
];

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-gray-200", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

export function ClubCardSkeleton() {
  return (
    <div className="min-w-[160px] rounded-xl border border-gray-200 bg-white p-4 text-center space-y-2">
      <Skeleton className="mx-auto h-10 w-10 rounded-full" />
      <Skeleton className="mx-auto h-4 w-20" />
      <Skeleton className="mx-auto h-5 w-16 rounded-full" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="space-y-3">
      {listSkeletonItems.map((item) => (
        <ListItemSkeleton key={item} />
      ))}
    </div>
  );
}
