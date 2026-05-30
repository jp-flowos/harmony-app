# 독립 시니어 시스템 MVP 설계

- 작성일: 2026-05-30
- 대상 프로젝트명: `harmony-system-lab`
- 기준 결정: 하모니 본앱에 즉시 흡수하지 않고, 독립 MVP로 검증한 뒤 연동 여부를 판단한다.

---

## 1. 배경

하모니 본앱은 이미 클럽, 채팅, 커뮤니티, 콘텐츠, 추천, 결제, 관리자 기능이 함께 움직인다. 새 시스템을 바로 본앱에 넣으면 제품 방향과 코드 경계가 동시에 복잡해진다.

따라서 새 시스템은 별도 프로젝트에서 검증한다. 단, 나중에 하모니에 붙일 수 있도록 결과 데이터 계약은 처음부터 하모니 친화적으로 설계한다.

## 2. 목표

- 시니어 사용자의 입력을 짧은 흐름으로 수집한다.
- 입력값을 바탕으로 “다음 행동”을 추천한다.
- 운영자가 추천 결과와 사용자 상태를 빠르게 검토할 수 있게 한다.
- 검증된 결과를 하모니가 가져갈 수 있는 JSON 계약으로 내보낸다.
- 본앱 DB, 채팅, 클럽, 결제와 직접 결합하지 않는다.

## 3. 비목표

- 하모니 본앱의 클럽, 채팅, 커뮤니티를 새 프로젝트에 복제하지 않는다.
- 결제, 구독, 공개 프로필, 소셜 기능은 MVP 범위가 아니다.
- 처음부터 하모니 DB에 직접 쓰지 않는다.
- 추천 품질 검증 전에 자동 운영 메시지나 자동 상담을 붙이지 않는다.

## 4. MVP 사용자 흐름

```
[시작 링크]
  |
  v
[간단 입력]
  - 지역
  - 관심사
  - 모임 선호
  - 이동 가능 범위
  - 도움 필요 영역
  - 연락 동의
  |
  v
[시스템 결과]
  - 사용자 요약
  - 추천 다음 행동
  - 신뢰도
  - 운영자 확인 필요 여부
  |
  v
[운영자 검토]
  - 승인
  - 보류
  - 메모
  |
  v
[하모니 연동용 결과]
```

## 5. 핵심 화면

### 사용자 입력 화면

모바일 우선으로 만든다. 한 화면에 하나의 질문만 보여준다. 선택지는 큰 버튼으로 제공하고, 직접 입력은 필요한 질문에만 둔다.

### 결과 화면

사용자에게는 복잡한 점수 대신 이해 가능한 다음 행동을 보여준다.

예:

```text
가까운 걷기 모임을 먼저 추천드려요.
처음 참여라면 운영자가 한 번 안내드리는 방식이 좋습니다.
```

### 운영자 화면

운영자는 최근 완료된 입력을 보고, 추천 결과를 승인하거나 보류한다. 운영자 메모는 하모니로 넘길 수 있지만 사용자에게 바로 공개하지 않는다.

## 6. 아키텍처

- 새 Next.js App Router 프로젝트를 만든다.
- Supabase 프로젝트와 DB는 하모니와 분리한다.
- 추천 로직은 규칙 기반 엔진으로 먼저 만든다.
- AI 요약은 provider 인터페이스 뒤에 숨겨서 나중에 Gemini 또는 다른 모델로 교체 가능하게 둔다.
- 하모니 연동은 DB 직접 연결이 아니라 JSON export 계약으로 시작한다.

```
harmony-system-lab
  |
  +-- intake UI
  +-- API routes
  +-- isolated Supabase DB
  +-- recommendation engine
  +-- operator review UI
  +-- Harmony export contract
```

## 7. 데이터 모델

### `participants`

익명 또는 최소 식별 사용자 단위다.

- `id`
- `nickname`
- `phone`
- `region_sido`
- `region_sigungu`
- `consent_contact`
- `created_at`

### `intake_sessions`

사용자 입력 흐름의 상태다.

- `id`
- `participant_id`
- `status`: `draft | completed | reviewed | archived`
- `answers_json`
- `completed_at`
- `created_at`

### `recommendation_results`

추천 결과와 근거다.

- `id`
- `intake_session_id`
- `summary`
- `next_action`
- `confidence`
- `needs_operator_review`
- `reasons_json`
- `created_at`

### `operator_reviews`

운영자 판단 기록이다.

- `id`
- `recommendation_result_id`
- `status`: `approved | held | rejected`
- `operator_note`
- `reviewed_at`

## 8. 하모니 연동 계약

MVP export payload는 다음 형태로 고정한다.

```json
{
  "source": "harmony-system-lab",
  "externalParticipantId": "uuid",
  "nickname": "행복한봄",
  "region": {
    "sido": "서울특별시",
    "sigungu": "강남구"
  },
  "interests": ["걷기", "건강"],
  "summary": "가까운 야외 활동을 선호하고 처음 모임 참여에는 안내가 필요합니다.",
  "nextAction": {
    "type": "recommend_club",
    "label": "가까운 걷기 모임 추천",
    "reason": "지역과 관심사가 모두 일치합니다."
  },
  "operatorReview": {
    "status": "approved",
    "note": "첫 참여 전 전화 안내 권장"
  },
  "createdAt": "2026-05-30T00:00:00.000Z"
}
```

## 9. 성공 기준

- 새 프로젝트를 하모니 코드 변경 없이 로컬에서 실행할 수 있다.
- 사용자가 입력을 완료하면 추천 결과가 저장된다.
- 운영자가 결과를 승인하거나 보류할 수 있다.
- 승인된 결과를 하모니 연동 JSON으로 확인할 수 있다.
- 핵심 흐름은 모바일 브라우저에서 끊기지 않는다.

## 10. 위험

- “추천”의 범위가 커지면 상담, 복지, 의료, 모임 추천이 뒤섞일 수 있다. MVP는 모임 또는 운영자 안내 같은 낮은 위험의 다음 행동으로 제한한다.
- 시니어 개인정보를 다루므로 연락처는 선택 입력으로 두고, 연락 동의 없이는 운영자 연락 대상에 올리지 않는다.
- AI 요약을 바로 사용자에게 노출하면 과신 위험이 있다. MVP에서는 운영자 화면 중심으로 노출한다.

## 11. 이후 판단 지점

MVP 검증 후 세 가지 중 하나를 선택한다.

1. 하모니 온보딩 일부로 흡수한다.
2. 운영자용 별도 도구로 유지한다.
3. 별도 서비스로 확장한다.
