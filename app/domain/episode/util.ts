import { addMinutes } from "date-fns";

import { get4OriginDate } from "~/utils/date";

export const getStatus = (
  publishedAt: Date,
  now: Date
): "published" | "onair" | "today" | "tomorrow" => {
  if (addMinutes(publishedAt, 30) < now) {
    return "published";
  }
  if (publishedAt < now) {
    return "onair";
  }
  if (get4OriginDate(publishedAt) === get4OriginDate(now)) {
    return "today";
  }
  return "tomorrow";
};
