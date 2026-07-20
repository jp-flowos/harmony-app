// SMS 발송 추상화. 공급자가 정해지면 이 인터페이스를 구현한 어댑터 파일만 추가한다.
export interface SmsSender {
  // to는 E.164 형식(+821012345678)
  send(to: string, text: string): Promise<void>;
}
