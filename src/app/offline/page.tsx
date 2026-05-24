import { CloudArrowDown } from "@phosphor-icons/react/dist/ssr";
import { BrandMark } from "@/components/brand/BrandMark";

export const metadata = {
  title: "오프라인",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center">
      <BrandMark size="md" className="mb-10" />
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-coral-50">
        <CloudArrowDown size={56} weight="duotone" className="text-coral-500" />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold text-mocha-900 tracking-tight">
        잠시 연결이 끊겼어요
      </h1>
      <p className="mt-4 text-lg text-mocha-700 leading-relaxed">
        인터넷 연결을 확인하고
        <br />
        다시 시도해 주세요
      </p>
      <p className="mt-8 text-base text-mocha-500">와이파이 또는 데이터가 켜져 있는지 확인하세요</p>
    </div>
  );
}
