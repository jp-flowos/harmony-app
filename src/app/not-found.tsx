import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
          <MagnifyingGlass size={32} weight="light" className="text-orange-500" />
        </div>
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <h2 className="mt-2 text-xl font-bold text-gray-900">페이지를 찾을 수 없습니다</h2>
        <p className="mt-2 text-sm text-gray-500">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/">
            <Button>홈으로</Button>
          </Link>
          <Link href="/search">
            <Button variant="outline">검색하기</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
