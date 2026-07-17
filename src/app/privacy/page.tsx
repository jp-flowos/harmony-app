import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export const metadata = { title: "개인정보 처리방침 | 하모니" };

// 표준 초안 — 운영(법무) 검토 후 개정 시 src/lib/auth-utils.ts의 CONSENT_VERSION을 함께 올릴 것
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <Link
        href="/register"
        className="inline-flex items-center gap-1 text-base font-semibold text-mocha-700"
      >
        <ArrowLeft size={20} />
        돌아가기
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-mocha-900">
        개인정보 처리방침
      </h1>
      <p className="mt-1 text-sm text-mocha-500">시행일: 2026년 7월 17일 (v2026-07-17)</p>

      <div className="mt-6 space-y-6 text-base leading-relaxed text-mocha-800">
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">1. 수집하는 개인정보</h2>
          <p>
            회원 가입 시 이름, 휴대폰 번호, 이메일, 비밀번호를 수집합니다. 프로필 설정 시 닉네임,
            지역, 취미, 프로필 사진을 추가로 수집할 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">2. 이용 목적</h2>
          <p>
            회원 식별과 로그인, 아이디 찾기 등 본인 확인, 맞춤 모임 추천, 서비스 공지 전달에
            이용합니다. 목적 외 이용 시 별도 동의를 받습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">3. 보유 기간</h2>
          <p>
            회원 탈퇴 시 지체 없이 파기합니다. 다만 관계 법령에 따라 보존이 필요한 정보는 해당 기간
            동안 분리 보관합니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">4. 제3자 제공</h2>
          <p>
            법령에 근거하거나 회원의 별도 동의가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지
            않습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">5. 이용자의 권리</h2>
          <p>
            회원은 언제든지 자신의 개인정보를 조회·수정하거나 삭제(탈퇴)를 요청할 수 있습니다. 내
            정보 &gt; 설정에서 직접 처리할 수 있습니다.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-extrabold text-mocha-900">6. 안전성 확보 조치</h2>
          <p>
            비밀번호는 복호화 불가능한 방식으로 저장되며, 개인정보 접근 권한을 최소화하고 접근
            통제를 시행합니다.
          </p>
        </section>
      </div>
    </div>
  );
}
