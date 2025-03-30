import { Temporal } from "temporal-polyfill";

import { get4OriginDateFromTemporal } from "~/utils/date";

export const getStatus = (
  publishedAt: Temporal.ZonedDateTime,
  now: Temporal.ZonedDateTime,
): "published" | "onair" | "today" | "tomorrow" => {
  if (
    Temporal.ZonedDateTime.compare(publishedAt.add({ minutes: 30 }), now) < 0
  ) {
    return "published";
  }
  if (Temporal.ZonedDateTime.compare(publishedAt, now) < 0) {
    return "onair";
  }
  if (
    get4OriginDateFromTemporal(publishedAt) === get4OriginDateFromTemporal(now)
  ) {
    return "today";
  }
  return "tomorrow";
};
