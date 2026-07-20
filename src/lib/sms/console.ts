import "server-only";
import type { SmsSender } from "./types";

// 전화번호 뒤 4자리만 남기고 마스킹한다 — 로그 시스템에 전체 번호가 평문으로
// 남지 않도록 하기 위함이다.
function maskPhone(to: string): string {
  return `****${to.slice(-4)}`;
}

// 개발용. 실제 발송 없이 서버 로그에만 출력한다.
// text(OTP 포함)는 로컬 로그인 확인을 위해 그대로 남기되, 번호는 마스킹한다.
export const consoleSender: SmsSender = {
  async send(to, text) {
    console.info(`[sms:console] to=${maskPhone(to)} text=${text}`);
  },
};
