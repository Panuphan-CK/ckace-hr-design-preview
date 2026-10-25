import { describe, expect, it } from "vitest";

import {
  accountStateInfo,
  containsSearch,
  matchesStateFilter,
  sectionFromValue,
} from "./management-helpers";

describe("management helpers", () => {
  it("falls back to users for unknown hash", () => {
    expect(sectionFromValue("roles")).toBe("roles");
    expect(sectionFromValue("nope")).toBe("users");
  });
  it("searches case-insensitively and accepts empty query", () => {
    expect(containsSearch(["Somchai"], "som")).toBe(true);
    expect(containsSearch([null, undefined], "x")).toBe(false);
    expect(containsSearch(["a"], "")).toBe(true);
  });
  it("maps account state to dot tones", () => {
    expect(accountStateInfo("ACTIVE").tone).toBe("ok");
    expect(accountStateInfo("PENDING").tone).toBe("wait");
    expect(accountStateInfo("RESIGNED").tone).toBe("bad");
    expect(accountStateInfo(null).tone).toBe("muted");
  });
  it("filters by state group", () => {
    expect(matchesStateFilter("RESIGNED", "OTHER")).toBe(true);
    expect(matchesStateFilter("ACTIVE", "OTHER")).toBe(false);
    expect(matchesStateFilter(null, "all")).toBe(true);
  });
});
