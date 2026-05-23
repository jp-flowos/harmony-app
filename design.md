# 하모니 디자인 시스템 (Senior-First Design)

> **타겟 사용자**: 55-70세 액티브 시니어
> **핵심 원칙**: 큰 글씨 · 높은 대비 · 넓은 터치 영역 · 명확한 시각적 위계
> **참고**: WCAG 2.2 AAA, NIA(한국지능정보사회진흥원) 고령자 친화 가이드, JMIR mHealth 시니어 모바일 앱 가이드라인

---

## 1. 디자인 원칙 (Why this exists)

시니어 사용자의 신체적 특성에서 출발합니다:

| 특성 | 디자인 대응 |
|---|---|
| 노안 / 시력 저하 (presbyopia) | 본문 18px+, 대비 7:1+, 진한 텍스트 색상 |
| 손떨림 / 관절염 | 터치 타겟 56-64px, 요소 간 12px+ 간격 |
| 색맹 (특히 적/녹) | 색만으로 정보 전달 금지, 아이콘+텍스트 병행 |
| 단기 기억 부담 | 한 화면 = 한 작업, 진행 단계 시각화 |
| 새 기술 학습 부담 | 익숙한 비유(전화/우편함), 한국어 명료, 영어 약어 지양 |

**금지**: 회색 텍스트(`text-gray-400`/`text-gray-500`)를 본문에 사용, placeholder 색상과 입력 텍스트 색상이 같음, `text-xs`/`text-[10px]` 같은 작은 폰트, 호버에만 의존하는 인터랙션.

---

## 2. 컬러 토큰

### 브랜드
| 토큰 | HEX | 용도 |
|---|---|---|
| `orange-500` | `#F97316` | Primary CTA, 활성 상태, 브랜드 |
| `orange-600` | `#EA580C` | Primary hover |
| `orange-700` | `#C2410C` | Primary active (pressed) |
| `orange-50`  | `#FFF7ED` | 강조 배경, badge |

### 텍스트 (대비 우선)
| 토큰 | HEX | 대비(흰 배경) | 용도 |
|---|---|---|---|
| `gray-900` | `#111827` | 17.74:1 (AAA) | **본문 기본**, 입력 텍스트, 제목 |
| `gray-700` | `#374151` | 10.31:1 (AAA) | 보조 본문, label |
| `gray-500` | `#6B7280` | 4.83:1 (AA only) | 메타 정보(날짜, 카운트) — 본문 금지 |
| `gray-400` | `#9CA3AF` | 2.84:1 (FAIL)  | **Placeholder 전용** — 어디에도 사용 금지 |

### 상태
| 의미 | 토큰 | 비고 |
|---|---|---|
| 성공 | `green-600` `#16A34A` | 아이콘 + 텍스트 병행 |
| 경고 | `amber-600` `#D97706` | |
| 오류 | `red-600` `#DC2626` | 아이콘 + "오류" 텍스트 병행 |
| 정보 | `blue-600` `#2563EB` | |

---

## 3. 타이포그래피 스케일

베이스 사이즈를 **18px**로 끌어올립니다 (Tailwind 기본 `text-base` 16px → 18px).

| 클래스 | px | 용도 |
|---|---|---|
| `text-3xl` (30px) | 30 | 페이지 타이틀 (`하모니`, `회원가입`) |
| `text-2xl` (24px) | 24 | 섹션 헤드라인 |
| `text-xl` (20px) | 20 | 카드 제목, 강조 본문 |
| `text-lg` (18px) | 18 | **본문 기본** — 모든 일반 텍스트 |
| `text-base` (18px ✅ overridden) | 18 | Input/Button 내부 텍스트 |
| `text-sm` (16px) | 16 | 보조 정보 (최소 허용) |
| `text-xs` | 사용 금지 | — |

**규칙**:
- Font family: `'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif` (한국어 가독성 최우선)
- Line height: 본문 `leading-relaxed` (1.625), 짧은 라벨 `leading-snug` (1.375)
- Font weight: 본문 400, 강조/제목 600+ (italic 절대 금지 — 한글 가독성 저해)

---

## 4. 간격 & 레이아웃

| 항목 | 값 |
|---|---|
| 컨테이너 max-width | `max-w-lg` (512px) — 모바일 우선 |
| 페이지 좌우 패딩 | `px-4` (16px) 최소 |
| 섹션 간 간격 | `space-y-6` (24px) |
| 폼 필드 간격 | `space-y-5` (20px) — 필드 사이 충분한 분리 |
| 버튼 사이 간격 | `gap-3` (12px) 이상 (오탭 방지) |

---

## 5. 터치 타겟

| 종류 | 최소 높이 | 권장 | Tailwind |
|---|---|---|---|
| Primary CTA | 56px | **60px** | `h-15` (custom) 또는 `h-14`+`py-1` |
| 보조 버튼 | 48px | 56px | `h-14` |
| 입력 필드 | 56px | 60px | `h-14` |
| 아이콘 버튼 | 48px×48px | 56px×56px | `h-14 w-14` |
| 하단 네비 아이템 | 64px 세로 | — | `py-3` + 아이콘 28px + 라벨 14px |

**규칙**: 인접 터치 타겟 간 최소 `gap-3` (12px). 작은 텍스트 링크(`text-sm` 이하) 단독 사용 금지 — 항상 버튼/카드 안에.

---

## 6. 컴포넌트 가이드

### Input / Textarea / Select
```
height: 56px (h-14)
border: 2px solid gray-300 (기본) → orange-500 (focus)
padding: px-4 py-3
font-size: 18px (text-lg)
text-color: gray-900   ← 핵심: 입력한 텍스트가 진하게 보이도록
placeholder-color: gray-400
rounded: rounded-xl (12px)
```

**필수**: 모든 입력에 명시적 `<Label>` 연결, 에러 시 빨강 테두리 + 아이콘 + 한국어 메시지.

### Button
```
default size: h-14 px-6, text-lg, font-semibold
large size:   h-15 px-8, text-xl, font-bold (Primary CTA)
variant default: bg-orange-500 text-white
variant outline: border-2 border-gray-300 text-gray-900 (← gray-700 아님)
focus ring: ring-4 ring-orange-200 (시니어가 포커스 위치 인지 쉽게)
```

### Card
```
배경: bg-white
테두리: border border-gray-200
모서리: rounded-2xl (16px) — 친근한 인상
그림자: shadow-sm 정도 (과한 그림자는 노안에 어른거림)
내부 패딩: p-5 또는 p-6
```

### BottomNav
```
아이콘 크기: 28px (기본 24px → 상향)
라벨 폰트: text-sm (14px) — 절대 text-xs 금지
세로 패딩: py-3 (충분한 터치 영역)
활성 색: text-orange-500 + 아이콘 fill weight
비활성 색: text-gray-600 (← gray-400 아님 — 대비 부족)
```

---

## 7. 인터랙션 & 피드백

- **즉시 피드백**: 모든 버튼 누름에 0.1s 내 시각 변화(`active:bg-orange-700`)
- **로딩 상태**: `로그인 중...` 처럼 한국어 진행 텍스트, 빈 스피너만 두지 않기
- **에러 메시지**: 입력 필드 바로 아래, 빨강 + 아이콘 + 구체적 한국어
  - ❌ "Invalid input" / "오류가 발생했습니다"
  - ✅ "이메일 주소에 @가 포함되어야 합니다"
- **확인 다이얼로그**: 되돌릴 수 없는 작업(탈퇴, 삭제)은 반드시 확인 단계

---

## 8. 접근성 체크리스트

- [ ] 모든 본문 텍스트 18px 이상
- [ ] 텍스트/배경 대비 7:1 이상 (본문), 4.5:1 이상 (UI)
- [ ] 모든 터치 타겟 48×48px 이상, 권장 56×56px
- [ ] 색 단독으로 정보 전달하지 않음 (아이콘/텍스트 병행)
- [ ] Focus visible (키보드 사용자) — `ring-4` 권장
- [ ] 한국어 콘텐츠에 `lang="ko"`, 영어 약어 풀어서 표기
- [ ] 폼 입력에 `<Label htmlFor>` 연결, `aria-describedby`로 도움말/에러 연결
- [ ] 자동 재생/움직이는 요소 없음 (또는 사용자가 멈출 수 있음)

---

## 9. 사용 예시 (Before / After)

### 회원가입 닉네임 입력 (이번 수정 사례)
**Before** — 입력 텍스트가 placeholder와 거의 같은 회색:
```tsx
<input className="... text-base placeholder:text-gray-400" />
// ↑ text-color 미지정 → 브라우저 기본(연한 회색)으로 렌더링
```

**After** — 명시적 진한 텍스트 색:
```tsx
<input className="... text-lg text-gray-900 placeholder:text-gray-400" />
// ↑ 입력 텍스트 18px gray-900 (17.74:1 대비)
```
