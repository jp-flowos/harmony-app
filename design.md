# 하모니 디자인 시스템 v2

> **컨셉**: "Modern Korean Warmth" — 한국 시니어를 위한 따뜻하고 품위 있는 모임 플랫폼
> **타겟**: 55-70세 액티브 시니어
> **핵심 가치**: 명확함 (Clarity) · 따뜻함 (Warmth) · 품위 (Dignity)

---

## 0. 디자인 철학

**"시니어에게 친근함은 귀여움이 아니라 안심이다."** (출처: Toss 시니어 UX 리서치)

이 디자인 시스템은 다음을 의도적으로 피합니다:
- ❌ 카툰풍 일러스트, 과한 이모지 (= 어른을 어린이 취급)
- ❌ 모호한 텍스트 링크, 꺾쇠(>) 의존 (= 시니어는 인지 못함)
- ❌ 질문형 안내 카피 ("어떤 닉네임을 쓰시겠어요?")
- ❌ 애니메이션 가이드 (시니어는 필수 단계로 오인)
- ❌ 파란색을 중요 정보에 사용 (= 노안 시 어두워 보임)
- ❌ 장식 세리프, 멀티 폰트 페어링 (= 한글 가독성 저해)

대신 다음을 추구합니다:
- ✅ 분명한 버튼 폼 (모든 인터랙션은 명시적 컨테이너)
- ✅ 액션 지향 카피 ("닉네임 알려주세요", "취미 선택하기")
- ✅ 정적 번호 단계 (①, ② — 진행을 한눈에)
- ✅ 따뜻하지만 절제된 컬러 (코랄, 세이지, 크림)
- ✅ 보태니컬 모티프의 절제된 사용 (배경 장식, 강조 X)
- ✅ Pretendard 단일 폰트 + 강한 웨이트 대비

---

## 1. 컬러 시스템

### 1.1 브랜드 컬러 (의미 + 감정)

| 토큰 | HEX | 역할 | 감정 |
|---|---|---|---|
| `coral-500` | `#EC6A52` | **Primary** — CTA, 활성, 브랜드 | 따뜻함, 환영, 활기 |
| `coral-600` | `#D9543D` | Primary hover | |
| `coral-700` | `#B83F2A` | Primary active | |
| `coral-50`  | `#FEF1ED` | 강조 배경, hover ghost | |
| `sage-500`  | `#6B8E5A` | **Secondary** — 보조 CTA, 자연/건강 표현 | 안정, 자연, 신뢰 |
| `sage-50`   | `#EEF3EA` | sage 배경 | |
| `cream-50`  | `#FDF8F0` | 페이지 베이스 배경 (순백 X) | 부드러움, 종이 같은 따뜻함 |
| `cream-100` | `#F9F1E3` | 카드 hover 배경, 보조 영역 | |
| `mocha-900` | `#3D2E22` | **본문 텍스트** (순흑 대신 따뜻한 다크 브라운) | 가독성 + 부드러움 |
| `mocha-700` | `#6B5544` | 보조 텍스트 | |
| `mocha-500` | `#8B7665` | 메타 텍스트 (날짜, 카운트) | |
| `mocha-300` | `#C9B8A8` | Placeholder, 비활성 | |

### 1.2 의미 컬러

| 의미 | 토큰 | HEX | 비고 |
|---|---|---|---|
| 성공 | `success` | `#5C8D3F` | sage 계열 — 컬러 시스템과 조화 |
| 경고 | `warning` | `#D88C2F` | 따뜻한 황토 톤 |
| 오류 | `danger` | `#C9472A` | coral 톤 다운 — 너무 튀지 않게 |
| 정보 | `info` | `#3E6B7A` | 다크 틸 — 파란색 회피하면서 정보감 |

### 1.3 컬러 사용 규칙

- **Primary CTA**: 페이지당 1개 원칙 (시니어가 "다음에 할 행동" 즉시 인지)
- **본문**: 항상 `mocha-900` (대비 11:1+, AAA)
- **보조 텍스트**: `mocha-700` (대비 7:1+)
- **메타**: `mocha-500` (대비 4.6:1, 작은 보조 정보만)
- **Placeholder**: `mocha-300` (입력 텍스트와 명확히 구분)
- **파란색 사용 금지**: 정보 아이콘 정도만 `info` 토큰 사용

---

## 2. 타이포그래피

### 2.1 폰트 패밀리

```css
font-family: "Pretendard Variable", Pretendard,
             -apple-system, BlinkMacSystemFont,
             "Apple SD Gothic Neo", "Malgun Gothic",
             system-ui, sans-serif;
```

**단일 폰트 정책** — 시니어 가독성 + 학습 비용 최소화. 멋스러움은 웨이트 대비로 표현.

### 2.2 스케일 (Senior baseline: 18px)

| 클래스 | px | weight | 용도 |
|---|---|---|---|
| `display-xl` | 40 | 800 | 환영 화면 메인 |
| `display-lg` | 32 | 800 | 페이지 타이틀 (브랜드/섹션) |
| `display-md` | 26 | 700 | 카드 큰 제목 |
| `heading` | 22 | 700 | 일반 섹션 헤딩 |
| `body-lg` | 20 | 500 | 강조 본문 |
| `body` | **18** | 400 | **본문 기본** |
| `label` | 18 | 600 | 폼 라벨 |
| `caption` | 16 | 500 | 메타 정보 (최소 허용) |
| `xs` | — | — | **사용 금지** |

`leading-relaxed` (1.7) 본문 · `leading-snug` (1.35) 제목

### 2.3 트래킹
- 디스플레이: `tracking-tight` (-0.02em) — 한글 큰 글자 시각적 결속
- 본문: 기본 (0)

---

## 3. 간격 시스템 (Generous breathing room)

| 토큰 | 값 | 용도 |
|---|---|---|
| `space-card-pad` | 28px | 카드 내부 패딩 |
| `space-card-gap` | 20px | 카드 내부 요소 간 |
| `space-form-field` | 24px | 폼 필드 사이 |
| `space-section` | 40px | 큰 섹션 사이 |
| `space-button-gap` | 12px | 인접 버튼 사이 (오탭 방지) |

페이지 좌우 패딩: `px-5` (20px) 최소.

---

## 4. 모서리 & 그림자 (Soft & Warm)

### 모서리
| 토큰 | 값 | 용도 |
|---|---|---|
| `radius-sm` | 12px | 입력 필드, 작은 버튼 |
| `radius-md` | 16px | 일반 버튼, 칩 |
| `radius-lg` | 20px | 카드 |
| `radius-xl` | 28px | 큰 카드, 시트 |
| `radius-full` | 9999px | 칩 토글, 아바타 |

### 그림자 (Warm, not gray)
```css
--shadow-soft:   0 2px 12px rgba(61, 46, 34, 0.06);   /* 기본 카드 */
--shadow-warm:   0 8px 24px rgba(236, 106, 82, 0.10); /* primary CTA hover */
--shadow-lifted: 0 12px 32px rgba(61, 46, 34, 0.12); /* dialog, sheet */
```

순흑 그림자 대신 **mocha 베이스 그림자** → 종이/원목 느낌

---

## 5. 터치 타겟

| 종류 | 높이 | 비고 |
|---|---|---|
| Primary CTA | **64px** | 모든 화면의 메인 액션 |
| 보조 버튼 | 56px | |
| 입력 필드 | 60px | |
| 칩/토글 | 52px | 손가락 굵기 고려 |
| 아이콘 버튼 | 56×56px | |
| Bottom Nav 아이템 | 68px | 아이콘 30px + 라벨 14px |

---

## 6. 보태니컬 모티프 (절제된 사용)

배경 장식으로만 사용. 강조나 인터랙션 영역에 사용 금지.

```
잎사귀 모티프 (sage-200, opacity 0.15)
- Auth 페이지 우측 상단 / 좌측 하단 (방사형)
- 빈 상태 일러스트
- 완료 화면 축하 배경

원형 그라데이션 (coral-50 → cream-50)
- 페이지 베이스 배경 (방사형 글로우)
```

캐릭터/사람 일러스트는 사용 금지 — 시니어가 "내 모습이 아니다"라고 느끼는 위험.

---

## 7. 컴포넌트 가이드

### Button
- **default**: 56px, coral-500 / 흰 텍스트 / radius-md
- **lg**: 64px, text-xl bold (모든 페이지 메인 액션)
- **secondary**: 56px, sage-500 / 흰 텍스트
- **outline**: 56px, 2px coral-300 / mocha-900 텍스트 / 흰 배경
- **ghost**: 56px, 투명 / mocha-900 / hover시 cream-100
- **kakao**: 56px, #FEE500 — 변경 없음

모든 버튼에 `active:scale-[0.98]` 마이크로 피드백 (0.1s).
포커스: `ring-4 ring-coral-200` (4px, 명확).

### Input
- 60px 높이
- 좌측 옵셔널 아이콘 슬롯 (`leadingIcon` prop)
- 우측 옵셔널 액션 슬롯 (비밀번호 보기 등)
- 기본 테두리: `border-2 border-mocha-300/40`
- 포커스: `border-coral-500 ring-4 ring-coral-100`
- 입력 텍스트: 20px `mocha-900` (시니어용 약간 더 크게)
- Placeholder: 18px `mocha-300`

### Card
- `bg-white rounded-lg shadow-soft`
- 내부 패딩 28px
- hover시 `shadow-warm` 살짝 들리는 효과 (cursor-pointer일 때만)

### StepIndicator (신규)
번호 + 라벨 + 진행선. 막대 두 개로 끝내지 않음.

```
┌────────────────────────────────┐
│  ❶ 정보 ───────── ❷ 완료        │
│                                │
│  (현재 단계: ❶ coral-500 채움)   │
│  (다음 단계: ❷ mocha-300 외곽)   │
└────────────────────────────────┘
```

### BrandMark (신규)
"하모니" 로고 + 작은 보태니컬 마크. 단순 텍스트 아님.

```
   ☘    하모니
   sage  coral-600 bold display-lg
```

### Greeting (신규)
인사 블록. 페이지마다 톤 일관.

```
👋 안녕하세요!     <- Phosphor "Hand" duotone, 28px
환영합니다         <- display-md
```

---

## 8. 카피 가이드

### DO
- "닉네임 알려주세요" (액션 지향)
- "취미 3가지 선택하기"
- "친구들이 보는 이름이에요" (설명형)
- "함께 만드는 즐거운 일상" (희망적, 구체적)

### DON'T
- "어떤 닉네임을 사용하시겠어요?" (질문형 → 모호)
- "Click here" / "여기를 누르세요" (위치 안내 X)
- "행복하세요!" (공허한 응원)
- 영어 약어 (PW, ID 등) — 풀어쓰기

---

## 9. 모션

| 종류 | duration | easing | 용도 |
|---|---|---|---|
| 색 전환 | 150ms | ease-out | hover/active |
| 버튼 누름 | 100ms | ease-out | `scale-[0.98]` |
| 카드 진입 | 300ms | ease-out | 페이지 로드 시 stagger 80ms |
| 시트/다이얼로그 | 250ms | ease-out | 슬라이드+페이드 |

`prefers-reduced-motion: reduce` 시 모두 0.01ms로.

---

## 10. 접근성 (재확인)

- 본문 18px+ / 메타 16px+
- 텍스트 대비 본문 7:1, UI 4.5:1 이상
- 터치 타겟 56×56px+ (메인 액션 64px)
- 모든 버튼 폼이 명시적 — 텍스트 링크는 본문 안에서만, 단독 사용 시 버튼 처리
- 모든 입력 `<Label htmlFor>` + 도움말 `aria-describedby`
- 에러는 빨강 + 아이콘 + 구체적 한국어 + `role="alert"`
- 포커스 링 4px 코랄, 절대 제거 금지
- 폼 진행 단계 `role="progressbar"` + valuenow/min/max
- 모션 감소 환경 준수
