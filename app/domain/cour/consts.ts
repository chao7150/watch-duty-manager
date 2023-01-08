type Digits = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
// 型チェックの負担軽減のために2000以降に絞っている
export type Year = `20${Digits}${Digits}`;
export const Season = ["winter", "spring", "summer", "autumn"] as const;
export type Season = typeof Season[number];
export type Cour = `${Year}${Season}`;

export const SeasonExpression = {
  winter: "冬",
  spring: "春",
  summer: "夏",
  autumn: "秋",
} as const;

export const SeasonStartMonth = {
  winter: "01-01T04:00:00+0900",
  spring: "04-01T04:00:00+0900",
  summer: "07-01T04:00:00+0900",
  autumn: "10-01T04:00:00+0900",
} as const;
