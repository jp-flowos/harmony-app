import { BotanicalBackdrop } from "@/components/brand/BotanicalBackdrop";
import { BrandMark } from "@/components/brand/BrandMark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-10"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <BotanicalBackdrop />
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <BrandMark size="lg" tagline="함께 만드는 즐거운 일상" className="mb-8" />
        {children}
      </div>
    </div>
  );
}
