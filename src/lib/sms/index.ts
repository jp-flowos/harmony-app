import "server-only";
import { consoleSender } from "./console";
import type { SmsSender } from "./types";

export type { SmsSender } from "./types";

// SMS_PROVIDER가 설정되지 않았거나 "console"이면 콘솔 출력.
// 공급자 확정 시 여기에 case를 추가한다.
export function getSmsSender(): SmsSender {
  const provider = process.env.SMS_PROVIDER ?? "console";
  switch (provider) {
    case "console":
      // console 어댑터는 실제 발송 없이 OTP를 서버 로그에만 남긴다 — 개발용으로만
      // 허용한다. 운영 환경에서 SMS_PROVIDER가 설정되지 않은 채 fail-open으로
      // 여기까지 오면 사용자는 문자를 받지 못하고 인증 코드가 로그로 새어나간다.
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "SMS_PROVIDER must be set to a real provider in production; " +
            "the console adapter never sends SMS and only logs."
        );
      }
      return consoleSender;
    default:
      throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
  }
}
