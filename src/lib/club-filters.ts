import { z } from "zod";

// 클럽 카테고리 프리셋 — club/create 폼과 필터 칩 공용 (h_clubs.category 값과 일치)
export const CLUB_CATEGORIES = [
  "등산",
  "골프",
  "독서",
  "요리",
  "사진",
  "여행",
  "음악",
  "댄스",
  "낚시",
  "바둑",
  "원예",
  "수영",
] as const;
export const ETC_CATEGORY = "기타";

export const CLUB_TABS = ["all", "nearby", "hobby", "popular", "mine"] as const;
export type ClubTab = (typeof CLUB_TABS)[number];

export const DAY_OPTIONS = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" },
] as const;

export const MEETING_TYPE_OPTIONS = [
  { value: "regular", label: "정기 모임" },
  { value: "flash", label: "번개 모임" },
  { value: "social", label: "친목 위주" },
  { value: "study", label: "스터디/학습" },
] as const;

export const AGE_RANGE_OPTIONS = [
  { value: "50s", label: "50대" },
  { value: "60s", label: "60대" },
  { value: "70plus", label: "70대 이상" },
] as const;

export const MEMBER_RANGE_OPTIONS = [
  { value: "lte5", label: "5명 이하" },
  { value: "6to15", label: "6~15명" },
  { value: "16to30", label: "16~30명" },
  { value: "gte30", label: "30명+" },
] as const;

const dayValues = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const clubFilterSchema = z.object({
  q: z.string().trim().min(1).max(50).optional(),
  sido: z.string().trim().min(1).max(10).optional(),
  sigungu: z.string().trim().min(1).max(20).optional(),
  categories: z.array(z.string().trim().min(1).max(20)).min(1).max(13).optional(),
  days: z.array(z.enum(dayValues)).min(1).max(7).optional(),
  meetingType: z.enum(["regular", "flash", "social", "study"]).optional(),
  ageRange: z.enum(["50s", "60s", "70plus"]).optional(),
  members: z.enum(["lte5", "6to15", "16to30", "gte30"]).optional(),
  sort: z.enum(["recent", "popular"]).default("recent"),
  scope: z.enum(["all", "mine"]).default("all"),
});

export type ClubFilters = z.infer<typeof clubFilterSchema>;

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function firstValue(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function csvSource(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    const all = params.getAll(key);
    return all.length > 0 ? all.join(",") : undefined;
  }
  const value = params[key];
  return Array.isArray(value) ? value.join(",") : value;
}

function csv(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

const DEFAULT_FILTERS: ClubFilters = { sort: "recent", scope: "all" };

export function parseClubFilters(params: RawParams): ClubFilters {
  const parsed = clubFilterSchema.safeParse({
    q: firstValue(params, "q") || undefined,
    sido: firstValue(params, "sido") || undefined,
    sigungu: firstValue(params, "sigungu") || undefined,
    categories: csv(csvSource(params, "categories")),
    days: csv(csvSource(params, "days")),
    meetingType: firstValue(params, "meetingType") || undefined,
    ageRange: firstValue(params, "ageRange") || undefined,
    members: firstValue(params, "members") || undefined,
    sort: firstValue(params, "sort") || undefined,
    scope: firstValue(params, "scope") || undefined,
  });
  return parsed.success ? parsed.data : { ...DEFAULT_FILTERS };
}

export function serializeClubFilters(filters: ClubFilters, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.sido) params.set("sido", filters.sido);
  if (filters.sigungu) params.set("sigungu", filters.sigungu);
  if (filters.categories?.length) params.set("categories", filters.categories.join(","));
  if (filters.days?.length) params.set("days", filters.days.join(","));
  if (filters.meetingType) params.set("meetingType", filters.meetingType);
  if (filters.ageRange) params.set("ageRange", filters.ageRange);
  if (filters.members) params.set("members", filters.members);
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  if (filters.scope !== "all") params.set("scope", filters.scope);
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, value);
  return params.toString();
}

export function countActiveFilters(filters: ClubFilters): number {
  let count = 0;
  if (filters.sido || filters.sigungu) count++;
  if (filters.categories?.length) count++;
  if (filters.days?.length) count++;
  if (filters.meetingType) count++;
  if (filters.ageRange) count++;
  if (filters.members) count++;
  return count;
}

export type FilterChip = { key: string; label: string; removed: ClubFilters };

function labelFor<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function filterChips(filters: ClubFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.sido || filters.sigungu) {
    chips.push({
      key: "region",
      label: [filters.sido, filters.sigungu].filter(Boolean).join(" "),
      removed: { ...filters, sido: undefined, sigungu: undefined },
    });
  }
  if (filters.categories?.length) {
    const [first, ...rest] = filters.categories;
    chips.push({
      key: "categories",
      label: rest.length > 0 ? `${first} 외 ${rest.length}` : first,
      removed: { ...filters, categories: undefined },
    });
  }
  if (filters.days?.length) {
    chips.push({
      key: "days",
      label: filters.days.map((d) => labelFor(DAY_OPTIONS, d)).join("·"),
      removed: { ...filters, days: undefined },
    });
  }
  if (filters.meetingType) {
    chips.push({
      key: "meetingType",
      label: labelFor(MEETING_TYPE_OPTIONS, filters.meetingType),
      removed: { ...filters, meetingType: undefined },
    });
  }
  if (filters.ageRange) {
    chips.push({
      key: "ageRange",
      label: labelFor(AGE_RANGE_OPTIONS, filters.ageRange),
      removed: { ...filters, ageRange: undefined },
    });
  }
  if (filters.members) {
    chips.push({
      key: "members",
      label: labelFor(MEMBER_RANGE_OPTIONS, filters.members),
      removed: { ...filters, members: undefined },
    });
  }
  return chips;
}
