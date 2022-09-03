import { describe, expect, it } from "vitest";
import { createQueries } from "../my";

describe("createQueries", () => {
  it("", () => {
    expect(createQueries({ onairOnly: false })).toBe("onairOnly=false");
    expect(createQueries({ onairOnly: true })).toBe("");
  });
});
