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
      return consoleSender;
    default:
      throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
  }
}
