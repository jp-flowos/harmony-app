import { describe, expect, test } from "bun:test";
import {
  countActiveFilters,
  filterChips,
  parseClubFilters,
  serializeClubFilters,
} from "./club-filters";

describe("parseClubFilters", () => {
  test("빈 파라미터는 기본값", () => {
    expect(parseClubFilters(new URLSearchParams())).toEqual({ sort: "recent", scope: "all" });
  });

  test("csv 파라미터 분해", () => {
    const f = parseClubFilters(new URLSearchParams("categories=등산,골프&days=fri,sat"));
    expect(f.categories).toEqual(["등산", "골프"]);
    expect(f.days).toEqual(["fri", "sat"]);
  });

  test("Next searchParams 객체 입력 지원", () => {
    const f = parseClubFilters({ sido: "서울", sigungu: "강남구", sort: "popular" });
    expect(f.sido).toBe("서울");
    expect(f.sigungu).toBe("강남구");
    expect(f.sort).toBe("popular");
  });

  test("잘못된 enum 값은 전체 기본값으로 폴백", () => {
    expect(parseClubFilters(new URLSearchParams("days=xyz"))).toEqual({
      sort: "recent",
      scope: "all",
    });
  });
});

describe("serializeClubFilters", () => {
  test("기본값은 생략", () => {
    expect(serializeClubFilters({ sort: "recent", scope: "all" })).toBe("");
  });

  test("파싱-직렬화 roundtrip", () => {
    const f = parseClubFilters(
      new URLSearchParams("sido=서울&categories=등산&members=6to15&sort=popular")
    );
    expect(parseClubFilters(new URLSearchParams(serializeClubFilters(f)))).toEqual(f);
  });

  test("extra 파라미터 병합", () => {
    expect(serializeClubFilters({ sort: "recent", scope: "all" }, { tab: "nearby" })).toBe(
      "tab=nearby"
    );
  });
});

describe("countActiveFilters / filterChips", () => {
  const f = parseClubFilters(
    new URLSearchParams(
      "sido=서울&sigungu=강남구&categories=등산,골프,독서&days=fri,sat&ageRange=60s"
    )
  );

  test("그룹 단위 카운트 (지역은 1개 그룹)", () => {
    expect(countActiveFilters(f)).toBe(4);
  });

  test("칩 라벨", () => {
    expect(filterChips(f).map((c) => c.label)).toEqual([
      "서울 강남구",
      "등산 외 2",
      "금·토",
      "60대",
    ]);
  });

  test("칩 제거는 해당 그룹만 지운다", () => {
    const region = filterChips(f).find((c) => c.key === "region");
    expect(region?.removed.sido).toBeUndefined();
    expect(region?.removed.sigungu).toBeUndefined();
    expect(region?.removed.categories).toEqual(["등산", "골프", "독서"]);
  });
});
