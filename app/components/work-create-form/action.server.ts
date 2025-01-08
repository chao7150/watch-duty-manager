import { data } from "@remix-run/node";

import * as E from "fp-ts/lib/Either.js";
import * as F from "fp-ts/lib/function.js";

import { nonEmptyStringOrUndefined } from "~/utils/type";
import { isNonEmptyString } from "~/utils/validator";

export const serverValidator = (formData: FormData) => {
  return F.pipe(
    formData,
    (formData) => {
      const title = formData.get("title");
      return isNonEmptyString(title)
        ? E.right({ formData, title })
        : E.left("title must not be empty");
    },
    E.chain(({ formData, ...rest }) => {
      const episodeDate = formData.get("episodeDate");
      return isNonEmptyString(episodeDate)
        ? E.right({
            formData,
            episodeDate: episodeDate.split(",").map((d) => new Date(d)),
            ...rest,
          })
        : E.left("episodeDate must not be empty");
    }),
    E.bimap(
      (l) => data({ errorMessage: l }, { status: 400 }),
      ({ title, episodeDate, formData }) => {
        const optionals = nonEmptyStringOrUndefined(
          Object.fromEntries(formData),
          ["officialSiteUrl", "twitterId", "hashtag", "durationMin"],
        );
        return {
          title,
          episodeDate,
          ...optionals,
          durationMin:
            optionals.durationMin && optionals.durationMin !== ""
              ? Number(optionals.durationMin)
              : undefined,
        };
      },
    ),
  );
};
