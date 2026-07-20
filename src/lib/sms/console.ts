import "server-only";
import type { SmsSender } from "./types";

// 개발용. 실제 발송 없이 서버 로그에만 출력한다.
export const consoleSender: SmsSender = {
  async send(to, text) {
    console.info(`[sms:console] to=${to} text=${text}`);
  },
};
