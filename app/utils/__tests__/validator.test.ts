import { expect, test } from "vitest";

import { isNonEmptyString } from "../validator";

test("isNonEmptyString", () => {
  expect(isNonEmptyString("hoge")).toBe(true);
  expect(isNonEmptyString("")).toBe(false);
  expect(isNonEmptyString(undefined)).toBe(false);
  expect(isNonEmptyString(null)).toBe(false);
  expect(isNonEmptyString({})).toBe(false);
  expect(isNonEmptyString(1)).toBe(false);
});
