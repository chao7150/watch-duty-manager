import { expect, test } from "vitest";
import { get4OriginDate, startOf4OriginDay } from "../date";

test("get4OriginDate", () => {
  expect(get4OriginDate(new Date("2022-06-09T22:00:00+0900"))).toBe(9);
  expect(get4OriginDate(new Date("2022-06-10T00:00:00+0900"))).toBe(9);
  expect(get4OriginDate(new Date("2022-06-10T03:59:00+0900"))).toBe(9);
  expect(get4OriginDate(new Date("2022-06-10T04:00:00+0900"))).toBe(10);
  // 1日の場合は前月最終日に戻る
  expect(get4OriginDate(new Date("2022-06-01T03:59:00+0900"))).toBe(31);
});

test("startOf4OriginDay", () => {
  expect(startOf4OriginDay(new Date("2022-06-09T22:00:00+0900"))).toStrictEqual(
    new Date("2022-06-09T04:00:00+0900")
  );
  expect(startOf4OriginDay(new Date("2022-06-09T22:00:01+0900"))).toStrictEqual(
    new Date("2022-06-09T04:00:00+0900")
  );
  expect(startOf4OriginDay(new Date("2022-06-10T00:00:00+0900"))).toStrictEqual(
    new Date("2022-06-09T04:00:00+0900")
  );
  expect(startOf4OriginDay(new Date("2022-06-10T03:59:00+0900"))).toStrictEqual(
    new Date("2022-06-09T04:00:00+0900")
  );
});
expect(startOf4OriginDay(new Date("2022-06-10T04:00:00+0900"))).toStrictEqual(
  new Date("2022-06-10T04:00:00+0900")
);
