import * as E from "fp-ts/lib/Either.js";

import { db } from "~/utils/db.server";

export const serverAction = async (
  workId: number,
  formData: FormData,
): Promise<
  E.Either<
    { errorMessage: string; status: number },
    { successMessage: string; status: number }
  >
> => {
  const title = formData.get("title");
  if (typeof title !== "string" || title === "") {
    return E.left({ errorMessage: "title must not be empty", status: 400 });
  }
  const officialSiteUrl = resolveFormDataEntryValueToNonEmptyStringOrNull(
    formData.get("officialSiteUrl"),
  );
  const twitterId = resolveFormDataEntryValueToNonEmptyStringOrNull(
    formData.get("twitterId"),
  );
  const hashtag = resolveFormDataEntryValueToNonEmptyStringOrNull(
    formData.get("hashtag"),
  );
  const _durationMin = formData.get("durationMin");
  if (typeof _durationMin !== "string") {
    return E.left({
      errorMessage: "durationMin must not be empty",
      status: 400,
    });
  }
  const durationMin = _durationMin === "" ? undefined : Number(_durationMin);
  if (durationMin !== undefined && Number.isNaN(durationMin)) {
    return E.left({
      errorMessage: "durationMin must be a number",
      status: 400,
    });
  }

  try {
    const work = await db.work.update({
      where: { id: workId },
      data: {
        title,
        officialSiteUrl,
        twitterId,
        hashtag,
        durationMin,
      },
    });

    return E.right({
      successMessage: `${work.title} is successfully updated`,
      status: 200,
    });
  } catch (e) {
    console.log(e);
    return E.left({ errorMessage: "internal server error", status: 500 });
  }
};

const resolveFormDataEntryValueToNonEmptyStringOrNull = (
  v: FormDataEntryValue | null,
): string | null => {
  if (typeof v !== "string") {
    return null;
  }
  if (v === "") {
    return null;
  }
  return v;
};
