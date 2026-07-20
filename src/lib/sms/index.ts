import "server-only";
import { consoleSender } from "./console";
import type { SmsSender } from "./types";

export type { SmsSender } from "./types";

// 공급자 확정 시 여기에 case를 추가한다.
export function getSmsSender(): SmsSender {
  // 기본값을 두지 않는다. 예전엔 미설정 시 console로 떨어졌는데, 그러면 안전장치가
  // NODE_ENV에 의존하게 된다 — NODE_ENV가 없는 환경에서는 가드가 통째로 무력해지고
  // 다시 콘솔로 열린다. 명시적으로 설정해야만 동작하게 해 fail-closed로 만든다.
  const provider = process.env.SMS_PROVIDER;
  if (!provider) {
    throw new Error("SMS_PROVIDER is not set. Set it explicitly (use 'console' for local dev).");
  }
  switch (provider) {
    case "console":
      // 명시적으로 console을 설정했더라도 운영에서는 막는다 (2차 방어선).
      // 이 어댑터는 문자를 보내지 않고 OTP를 로그에만 남기므로, 운영에 걸리면
      // 사용자는 문자를 못 받고 인증 코드가 로그로 새어나간다.
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
