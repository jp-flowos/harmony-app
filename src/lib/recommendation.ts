/**
 * 개인화 추천 알고리즘
 * - 콘텐츠 기반 필터링 (취미/지역/나이 매칭)
 * - 협업 필터링 (비슷한 취미 사용자가 참여한 모임)
 */

export interface UserProfile {
  id: string;
  region: string;
  birthYear: number | null;
  hobbies: string[]; // hobby category names
}

export interface ClubForRecommendation {
  id: string;
  name: string;
  category: string;
  region: string;
  memberCount: number;
  members: string[]; // user IDs of members
}

export interface RecommendationScore {
  id: string;
  score: number;
  reasons: string[];
}

// Weight constants for scoring
const WEIGHTS = {
  hobbyMatch: 40,
  regionMatch: 25,
  ageGroupMatch: 15,
  collaborativeBoost: 20,
  popularityBonus: 5,
} as const;

/**
 * 콘텐츠 기반 필터링: 사용자 프로필과 클럽 속성 비교
 */
function contentBasedScore(
  user: UserProfile,
  club: ClubForRecommendation
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 취미 매칭
  if (user.hobbies.includes(club.category)) {
    score += WEIGHTS.hobbyMatch;
    reasons.push("관심 취미와 일치");
  }

  // 지역 매칭
  if (user.region === club.region) {
    score += WEIGHTS.regionMatch;
    reasons.push("같은 지역");
  } else if (user.region && club.region && user.region.slice(0, 2) === club.region.slice(0, 2)) {
    score += WEIGHTS.regionMatch * 0.5;
    reasons.push("인근 지역");
  }

  // 인기도 보너스 (member count)
  if (club.memberCount > 20) {
    score += WEIGHTS.popularityBonus;
    reasons.push("인기 모임");
  }

  return { score, reasons };
}

/**
 * 협업 필터링: 비슷한 취미를 가진 사용자들이 참여한 모임 추천
 */
function collaborativeScore(
  user: UserProfile,
  club: ClubForRecommendation,
  allClubs: ClubForRecommendation[]
): number {
  // 이미 가입한 클럽의 멤버들이 이 클럽에도 참여하고 있는지
  const userClubs = allClubs.filter((c) => c.members.includes(user.id));
  const coMembers = new Set<string>();
  for (const uc of userClubs) {
    for (const memberId of uc.members) {
      if (memberId !== user.id) coMembers.add(memberId);
    }
  }

  // 동료 멤버 중 해당 클럽에 가입한 사람 비율
  if (coMembers.size === 0) return 0;

  let overlap = 0;
  for (const memberId of club.members) {
    if (coMembers.has(memberId)) overlap++;
  }

  const ratio = overlap / coMembers.size;
  return Math.round(ratio * WEIGHTS.collaborativeBoost);
}

/**
 * 모임 추천 스코어 계산
 */
export function scoreClubs(
  user: UserProfile,
  clubs: ClubForRecommendation[]
): RecommendationScore[] {
  const scores: RecommendationScore[] = [];

  for (const club of clubs) {
    // 이미 가입한 클럽은 제외
    if (club.members.includes(user.id)) continue;

    const content = contentBasedScore(user, club);
    const collaborative = collaborativeScore(user, club, clubs);

    const totalScore = content.score + collaborative;

    if (totalScore > 0) {
      if (collaborative > 0) {
        content.reasons.push("비슷한 취미 회원들이 활동 중");
      }
      scores.push({
        id: club.id,
        score: totalScore,
        reasons: content.reasons,
      });
    }
  }

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * 태그 기반 정보글 추천
 */
export function scoreInfoContents(
  userHobbies: string[],
  contents: { id: string; tags: string[]; category: string; viewCount: number }[]
): RecommendationScore[] {
  const scores: RecommendationScore[] = [];

  for (const content of contents) {
    let score = 0;
    const reasons: string[] = [];

    // 태그 매칭
    const tagOverlap = content.tags.filter((t) =>
      userHobbies.some(
        (h) =>
          h.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(h.toLowerCase())
      )
    );
    if (tagOverlap.length > 0) {
      score += 30 * tagOverlap.length;
      reasons.push("관심사 관련 콘텐츠");
    }

    // 카테고리 매칭
    if (userHobbies.some((h) => h === content.category)) {
      score += 20;
      reasons.push("관심 카테고리");
    }

    // 인기도
    if (content.viewCount > 100) {
      score += 10;
      reasons.push("인기 콘텐츠");
    }

    if (score > 0) {
      scores.push({ id: content.id, score, reasons });
    }
  }

  return scores.sort((a, b) => b.score - a.score);
}
