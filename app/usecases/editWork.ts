import type { WorkRepository } from "~/domain/work/repository";
import type { AppError, Result } from "~/utils/result";
import { Err, Ok } from "~/utils/result";

type EditWorkInput = {
  title: string;
  officialSiteUrl: string | null;
  twitterId: string | null;
  hashtag: string | null;
  durationMin: number | undefined;
};

type EditWorkResult = { successMessage: string };

const resolveFormDataEntryValueToNonEmptyStringOrNull = (
  v: FormDataEntryValue | null,
): string | null => {
  if (typeof v !== "string") return null;
  if (v === "") return null;
  return v;
};

const parseFormData = (formData: FormData): Result<EditWorkInput, AppError> => {
  const title = formData.get("title");
  if (typeof title !== "string" || title === "") {
    return Err({ type: "validation", message: "title must not be empty" });
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
      type: "validation",
      message: "durationMin must not be empty",
    });
  }
  const durationMin = _durationMin === "" ? undefined : Number(_durationMin);
  if (durationMin !== undefined && Number.isNaN(durationMin)) {
    return Err({ type: "validation", message: "durationMin must be a number" });
  }

  return Ok({ title, officialSiteUrl, twitterId, hashtag, durationMin });
};

export const editWork =
  (repos: { workRepo: WorkRepository }) =>
  async (
    workId: number,
    formData: FormData,
  ): Promise<Result<EditWorkResult, AppError>> => {
    const parsed = parseFormData(formData);
    if (parsed.err) return parsed;

    const updateResult = await repos.workRepo.update(workId, parsed.ok);
    if (updateResult.err) return updateResult;

    return Ok({
      successMessage: `${updateResult.ok.title} is successfully updated`,
    });
  };
