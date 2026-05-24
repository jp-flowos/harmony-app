import { BottomNav } from "@/components/layout/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-24" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <main className="mx-auto max-w-lg">{children}</main>
      <BottomNav />
    </div>
  );
}
