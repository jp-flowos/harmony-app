#!/bin/bash
# ============================================
# Harmony App - Vercel 환경변수 설정 스크립트
# ============================================
#
# 사용법:
#   export SUPABASE_URL=https://xxx.supabase.co
#   export SUPABASE_ANON_KEY=xxx
#   export SUPABASE_SERVICE_ROLE_KEY=xxx
#   export DATABASE_URL=postgresql://...
#   ./scripts/vercel-env-setup.sh
#
# 또는 .env.local에서 로드:
#   set -a; source .env.local; set +a
#   ./scripts/vercel-env-setup.sh

set -euo pipefail

echo "🔧 Vercel 환경변수 설정 시작..."
echo ""

# 환경변수 매핑 (로컬 변수명 → Vercel 변수명)
declare -A ENV_VARS=(
  # 필수
  ["NEXT_PUBLIC_SUPABASE_URL"]="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"
  ["SUPABASE_SERVICE_ROLE_KEY"]="${SUPABASE_SERVICE_ROLE_KEY:-}"
  ["DATABASE_URL"]="${DATABASE_URL:-}"

  # 선택
  ["NEXT_PUBLIC_SITE_URL"]="${NEXT_PUBLIC_SITE_URL:-}"
  ["NEXT_PUBLIC_KAKAO_MAP_KEY"]="${NEXT_PUBLIC_KAKAO_MAP_KEY:-}"
  ["TOSS_PAYMENTS_SECRET_KEY"]="${TOSS_PAYMENTS_SECRET_KEY:-}"
  ["NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY"]="${NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY:-}"
  ["NEXT_PUBLIC_VAPID_PUBLIC_KEY"]="${NEXT_PUBLIC_VAPID_PUBLIC_KEY:-}"
  ["VAPID_PRIVATE_KEY"]="${VAPID_PRIVATE_KEY:-}"
  ["VAPID_EMAIL"]="${VAPID_EMAIL:-}"
  ["GEMINI_API_KEY"]="${GEMINI_API_KEY:-}"
  ["GEMINI_MODEL"]="${GEMINI_MODEL:-gemini-2.0-flash}"
  ["ADMIN_EMAILS"]="${ADMIN_EMAILS:-}"
)

SUCCESS=0
SKIPPED=0
FAILED=0

for key in "${!ENV_VARS[@]}"; do
  value="${ENV_VARS[$key]}"

  if [ -z "$value" ]; then
    echo "⏭️  $key (비어있음 - 건너뜀)"
    ((SKIPPED++))
    continue
  fi

  # production, preview, development 모두에 설정
  if echo "$value" | npx vercel env add "$key" production preview development --yes 2>/dev/null; then
    echo "✅ $key"
    ((SUCCESS++))
  else
    # 이미 존재하면 삭제 후 재설정
    npx vercel env rm "$key" production preview development --yes 2>/dev/null || true
    if echo "$value" | npx vercel env add "$key" production preview development --yes 2>/dev/null; then
      echo "✅ $key (갱신됨)"
      ((SUCCESS++))
    else
      echo "❌ $key (설정 실패)"
      ((FAILED++))
    fi
  fi
done

echo ""
echo "========================================="
echo "✅ 설정: $SUCCESS | ⏭️ 건너뜀: $SKIPPED | ❌ 실패: $FAILED"
echo "========================================="
echo ""
echo "💡 Vercel 대시보드에서 확인: npx vercel env ls"
