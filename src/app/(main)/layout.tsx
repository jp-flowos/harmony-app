import { BottomNav } from "@/components/layout/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <main className="mx-auto max-w-lg">{children}</main>
      <BottomNav />
    </div>
  );
}
