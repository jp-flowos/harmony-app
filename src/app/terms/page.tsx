import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export const metadata = { title: "이용약관 | 하모니" };

// 표준 초안 — 운영(법무) 검토 후 개정 시 src/lib/auth-utils.ts의 CONSENT_VERSION을 함께 올릴 것
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <Link
        href="/register"
        className="inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
      >
        <ArrowLeft size={20} />
        돌아가기
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-mocha-900">이용약관</h1>
      <p className="mt-1 text-sm text-mocha-500">시행일: 2026년 7월 17일 (v2026-07-17)</p>

      <div className="mt-6 space-y-6 text-base leading-relaxed text-mocha-800">
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제1조 (목적)</h2>
          <p>
            본 약관은 하모니(이하 "서비스")가 제공하는 클럽·모임·커뮤니티 서비스의 이용 조건과 절차,
            회원과 서비스의 권리·의무를 정합니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제2조 (회원 가입)</h2>
          <p>
            회원은 본 약관에 동의하고 서비스가 정한 가입 절차를 완료함으로써 가입됩니다. 서비스는
            타인 명의 도용 등 부정 가입이 확인되면 이용을 제한할 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제3조 (서비스 이용)</h2>
          <p>
            회원은 클럽 개설·가입, 모임 참여, 게시물 작성 등 서비스를 자유롭게 이용할 수 있습니다.
            다만 법령 위반, 타인 권리 침해, 허위 정보 게시 행위는 금지됩니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제4조 (게시물)</h2>
          <p>
            게시물의 저작권은 작성자에게 있으며, 서비스는 서비스 운영·홍보 범위에서 이를 사용할 수
            있습니다. 금지 행위에 해당하는 게시물은 사전 통지 없이 제한될 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제5조 (계약 해지)</h2>
          <p>
            회원은 언제든지 내 정보 &gt; 설정에서 탈퇴를 요청할 수 있습니다. 서비스는 약관 위반이
            중대한 경우 이용 계약을 해지할 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">제6조 (면책)</h2>
          <p>
            서비스는 회원 간 모임·거래에서 발생한 분쟁에 개입하지 않으며, 천재지변 등 불가항력으로
            인한 서비스 중단에 책임지지 않습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">부칙</h2>
          <p>본 약관은 2026년 7월 17일부터 시행합니다.</p>
        </section>
      </div>
    </div>
  );
}
