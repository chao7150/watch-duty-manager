import type { Result } from "~/utils/result";
import { Err, Ok } from "~/utils/result";
import { nonEmptyStringOrUndefined } from "~/utils/type";
import { isNonEmptyString } from "~/utils/validator";

type ValidationResult = {
  title: string;
  episodeDate: Date[];
  officialSiteUrl: string | null;
  twitterId: string | null;
  hashtag: string | null;
  durationMin: number | undefined;
};

export const serverValidator = (
  formData: FormData,
): Result<ValidationResult, { type: "validation"; message: string }> => {
  const title = formData.get("title");
  if (!isNonEmptyString(title)) {
    return Err({ type: "validation", message: "title must not be empty" });
  }

  const episodeDate = formData.get("episodeDate");
  if (!isNonEmptyString(episodeDate)) {
    return Err({
      type: "validation",
      message: "episodeDate must not be empty",
    });
  }

  const optionals = nonEmptyStringOrUndefined(Object.fromEntries(formData), [
    "officialSiteUrl",
    "twitterId",
    "hashtag",
    "durationMin",
  ]);

  return Ok({
    title,
    episodeDate: episodeDate.split(",").map((d) => new Date(d)),
    officialSiteUrl: optionals.officialSiteUrl ?? null,
    twitterId: optionals.twitterId ?? null,
    hashtag: optionals.hashtag ?? null,
    durationMin:
      optionals.durationMin && optionals.durationMin !== ""
        ? Number(optionals.durationMin)
        : undefined,
  });
};
