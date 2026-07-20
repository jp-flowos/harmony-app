import Link from "next/link";

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-cream-100 pb-28">
      <header className="flex items-center justify-center border-b border-mocha-100 bg-white py-4">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-coral-600">
          하모니
        </Link>
      </header>
      {children}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-mocha-100 bg-white p-4">
        <div className="mx-auto max-w-lg">
          <Link
            href="/login"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-coral-500 text-xl font-extrabold text-white shadow-warm active:scale-[0.98]"
          >
            하모니 시작하기
          </Link>
        </div>
      </div>
    </div>
  );
}
