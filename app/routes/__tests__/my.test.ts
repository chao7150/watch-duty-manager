import { describe, expect, it } from "vitest";
import { createQueries } from "../my";

describe("createQueries", () => {
  it("", () => {
    expect(
      createQueries({ onairOnly: false, filterConditionStartDate: undefined })
    ).toBe("");
    expect(
      createQueries({ onairOnly: true, filterConditionStartDate: undefined })
    ).toBe("onairOnly=true");
  });
});
