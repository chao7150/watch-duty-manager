import { db } from "~/utils/db.server";
import type { Result } from "~/utils/result";
import { Err, Ok } from "~/utils/result";

type SuccessResult = { successMessage: string; status: number };
type ErrorResult = { errorMessage: string; status: number };

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

export const serverAction = async (
  workId: number,
  formData: FormData,
): Promise<Result<SuccessResult, ErrorResult>> => {
  const title = formData.get("title");
  if (typeof title !== "string" || title === "") {
    return Err({ errorMessage: "title must not be empty", status: 400 });
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
    return Err({
      errorMessage: "durationMin must not be empty",
      status: 400,
    });
  }
  const durationMin = _durationMin === "" ? undefined : Number(_durationMin);
  if (durationMin !== undefined && Number.isNaN(durationMin)) {
    return Err({
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

    return Ok({
      successMessage: `${work.title} is successfully updated`,
      status: 200,
    });
  } catch (e) {
    console.log(e);
    return Err({ errorMessage: "internal server error", status: 500 });
  }
};
